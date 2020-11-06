const Web3 = require('web3');
const axios = require('axios').default;
// const sk = require('@selfkey/node-lib');
const INFURA_WSS_MAINNET = 'wss://mainnet.infura.io/ws/v3/';
const INFURA_WSS_ROPSTEN = 'wss://ropsten.infura.io/ws/v3/';

const fetchGasPrice = async () => {
	const gasStation = await axios.get('https://ethgasstation.info/json/ethgasAPI.json', {
		responseType: 'json'
	});
	return gasStation;
};

const createWeb3Client = opt => {
	const {ethNetworkId, infuraProjectId} = opt || {};
	if (!infuraProjectId) {
		throw new Error('Invalid Config: infura project id is missing');
	}
	const wss = `${ethNetworkId === 1 ? INFURA_WSS_MAINNET : INFURA_WSS_ROPSTEN}${infuraProjectId}`;
	const web3 = new Web3(wss);
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
	return contract;
};

const createWhitelistClient = opt => {
	const web3 = createWeb3Client(opt);
	const wallet = createWeb3Wallet(web3, opt);
	const contract = createEthContract(web3, wallet, opt);

	return {
		_lastPriceUpdate: 0,
		_gasStationPrice: null,
		async getGasPrice() {
			if (Date.now() - this._lastPriceUpdate > 1000 * 60 * 60) {
				this._gasStationPrice = await fetchGasPrice();
				this._lastPriceUpdate = Date.now();
			}

			return this._gasStationPrice.average * 1000000000;
		},
		async isWhitelisted(address) {
			const inWhitelist = await contract.methods.isWhitelisted(address).call();
			return inWhitelist;
		},
		async addWhitelisted(address) {
			const gas = await contract.methods.addWhitelisted(address).estimateGas();
			const gasPrice = await this.getGasPrice();
			await contract.methods.addWhitelisted(address).send({gas, gasPrice});
		},
		async removeWhitelisted(address) {
			const gas = await contract.methods.removeWhitelisted(address).estimateGas();
			const gasPrice = await this.getGasPrice();
			await contract.methods.removeWhitelisted(address).send({gas, gasPrice});
		}
	};
};

module.exports = {createWhitelistClient};
