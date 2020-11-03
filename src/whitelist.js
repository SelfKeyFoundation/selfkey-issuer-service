const Web3 = require('web3');
// const sk = require('@selfkey/node-lib');
const INFURA_WSS_MAINNET = 'wss://mainnet.infura.io/ws/v3/';
const INFURA_WSS_ROPSTEN = 'wss://ropsten.infura.io/ws/v3/';

const createWeb3Client = opt => {
	const {networkId = 1, infuraProjectId} = opt || {};
	if (!infuraProjectId) {
		throw new Error('Invalid Config: infura project id is missing');
	}

	const wss = `${networkId === 1 ? INFURA_WSS_MAINNET : INFURA_WSS_ROPSTEN}${infuraProjectId}`;

	const web3 = new Web3(wss);
	web3.eth.defaultChain = networkId;
	return web3;
};

const createWeb3Wallet = (web3, opt) => {
	if (!opt.privateKey) {
		throw new Error('Invalid Config: Ethereum private key required');
	}
	const wallet = web3.eth.accounts.wallets.add(opt.privateKey);
	web3.eth.defaultAccount = wallet.address;
	return wallet;
};

const createEthContract = (web3, wallet, opt) => {
	if (!opt.contractAddress) {
		throw new Error('Invalid Config: Contract address required');
	}

	if (!opt.contractABI) {
		throw new Error('Invalid Config: Contract ABI is required');
	}

	const contract = new web3.Contract(opt.contractABI, wallet.contractAddress);
	contract.defaultAccount = wallet.address;
};

const createWhitelistClient = opt => {
	const web3 = createWeb3Client(opt);
	const wallet = createWeb3Wallet(web3, opt);
	const contract = createEthContract(web3, wallet, opt);

	return {
		isWhitelisted: async address => {
			const inWhitelist = await contract.methods.isWhitelisted(address).call();
			return inWhitelist;
		},
		addWhitelisted: async address => {
			await contract.methods.addWhitelisted(address).send();
		},
		removeWhitelisted: async address => {
			await contract.methods.removeWhitelisted(address).send();
		}
	};
};

module.exports = {createWhitelistClient};
