const Web3 = require('web3');
const axios = require('axios').default;
const config = require('./config');
const Sentry = require('@sentry/node');
const {AsyncTaskQueue} = require('./async-task-queue');
const INFURA_WSS_MAINNET = 'wss://mainnet.infura.io/ws/v3/';
const INFURA_WSS_ROPSTEN = 'wss://ropsten.infura.io/ws/v3/';
const GAS_CACHE = config.gasCache;
const MAX_GAS_PRICE = config.maxGasPrice;

const fetchGasPrice = async (attempt = 0) => {
	try {
		const gasStation = await axios.get('https://ethgasstation.info/json/ethgasAPI.json', {
			responseType: 'json'
		});

		return gasStation.data;
	} catch (error) {
		console.error(error);
		if (attempt < 3) {
			console.log('Will retry fetching gas in 1 sec');
			await new Promise(resolve => setTimeout(resolve, 1000));
			console.log('retrying to fetch gas');
			return fetchGasPrice(attempt + 1);
		}
		throw error;
	}
};

const createWeb3Client = opt => {
	const {ethNetworkId, infuraProjectId} = opt || {};
	if (!infuraProjectId) {
		throw new Error('Invalid Config: infura project id is missing');
	}
	const wss = `${
		+ethNetworkId === 1 ? INFURA_WSS_MAINNET : INFURA_WSS_ROPSTEN
	}${infuraProjectId}`;
	const provider = new Web3.providers.WebsocketProvider(wss, {
		clientConfig: {
			keepalive: true,
			keepaliveInterval: 60000
		},
		reconnect: {
			auto: true,
			delay: 1000,
			maxAttempts: 10
		}
	});

	provider.on('error', e => {
		console.error('WS Error', e);
		Sentry.captureException(e);
	});
	provider.on('end', e => {
		console.error('WS End', e);
		Sentry.captureException(e);
	});
	provider.on('close', e => {
		console.error('close', e);
		Sentry.captureException(e);
	});
	const web3 = new Web3(provider);
	return web3;
};

const createWeb3Wallet = (web3, opt) => {
	if (!opt.ethPrivateKey) {
		throw new Error('Invalid Config: Ethereum private key required');
	}
	const wallet = web3.eth.accounts.wallet.add(opt.ethPrivateKey);
	web3.eth.defaultAccount = wallet.address;
	return wallet;
};

const createEthContract = (web3, wallet, opt) => {
	if (!opt.issuerContractAddress) {
		throw new Error('Invalid Config: Contract address required');
	}

	if (!opt.issuerContractABI) {
		throw new Error('Invalid Config: Contract ABI is required');
	}

	const contract = new web3.eth.Contract(opt.issuerContractABI, opt.issuerContractAddress, {
		from: wallet.address
	});
	contract.defaultAccount = wallet.address;
	contract.transactionConfirmationBlocks = 2;
	contract.transactionBlockTimeout = 750;
	return contract;
};

const createWhitelistClient = opt => {
	const web3 = createWeb3Client(opt);
	const wallet = createWeb3Wallet(web3, opt);
	const contract = createEthContract(web3, wallet, opt);
	const TX_INTERVAL_DELAY = opt.txDelay || 500;

	return {
		_lastPriceUpdate: 0,
		_gasStationPrice: null,
		_lastNonce: 0,
		_txQueue: null,
		async getGasPrice() {
			if (!this._gasStationPrice || Date.now() - this._lastPriceUpdate > GAS_CACHE) {
				this._gasStationPrice = await fetchGasPrice();
				this._lastPriceUpdate = Date.now();
			}

			const gasPrice = MAX_GAS_PRICE
				? Math.min(MAX_GAS_PRICE * 10, this._gasStationPrice[config.gasPrice])
				: this._gasStationPrice[config.gasPrice];
			return gasPrice * 100000000;
		},
		async getNonce() {
			const nonce = Math.max(
				await web3.eth.getTransactionCount(
					wallet.address,
					config.ignorePending ? 'pending' : undefined
				),
				this._lastNonce + 1
			);
			this._lastNonce = nonce;
			return nonce;
		},
		async isWhitelisted(address) {
			const inWhitelist = await contract.methods.isWhitelisted(address).call();
			return inWhitelist;
		},
		async handleTicket({contract, method, action, args, opt = {}}) {
			if (!opt.gasPrice) {
				opt.gasPrice = await this.getGasPrice();
			}

			if (!opt.nonce) {
				opt.nonce = await this.getNonce();
			}
			if (!opt.gas) {
				opt.gas = await contract.methods[method](...args).estimateGas(opt);
			}
			try {
				const res = contract.methods[method](...args)[action](opt);
				return {res};
			} catch (error) {
				if (error.message && error.message.indexOf('already known' > -1)) {
					this._lastNonce = 0;
				}
				throw error;
			}
		},
		async enqueue(data) {
			if (!this._txQueue) {
				this._txQueue = new AsyncTaskQueue(this.handleTicket.bind(this), TX_INTERVAL_DELAY);
			}
			if (data.retry > 3) throw data.lastError;

			try {
				const queueRes = await this._txQueue.push(data);
				const txRes = await queueRes.res;
				return txRes;
			} catch (error) {
				console.error('Transaction error', error);
				if (
					error.message &&
					error.message.indexOf('already known') > -1 &&
					data.retry < 3
				) {
					console.log('Retrying transaction');
					return this.enqueue({
						...data,
						opt: {...data.opt, nonce: null},
						retry: (data.retry || 0) + 1,
						lastError: error
					});
				}
				throw error;
			}
		},
		addWhitelisted(address) {
			return this.enqueue({
				contract,
				method: 'addWhitelisted',
				action: 'send',
				args: [address]
			});
		},
		removeWhitelisted(address) {
			return this.enqueue({
				contract,
				method: 'removeWhitelisted',
				action: 'send',
				args: [address]
			});
		},
		destroy() {
			web3.currentProvider.connection.close();
		}
	};
};

module.exports = {createWhitelistClient, defaultClient: createWhitelistClient(config)};
