require('dotenv').config();

module.exports = {
	issuerContractAddress: process.env.SELFKEY_ISSUER_CONTRACT_ADDRESS,
	issuerContractABI: require('./whitelist-abi.json').abi,
	ethNetworkId: process.env.ETH_NETWORK_ID || 1,
	infuraProjectId: process.env.INFURA_PROJECT_ID,
	ethPrivateKey: process.env.ETH_PRIVATE_KEY,
	ethAddress: process.env.ETH_ADDRESS,
	kyccApiUrl: process.env.KYCC_API_URL,
	kyccApiKey: process.env.KYCC_API_KEY,
	kyccTemplate: process.env.KYCC_TEMPLATE || null,
	sentryDSN: process.env.SENTRY_DSN,
	sentryName: process.env.SENTRY_NAME,
	gasCache: +(process.env.GAS_CACHE || 1000 * 60 * 5),
	gasPrice: process.env.GAS_PRICE || 'average',
	ignorePending: !!process.env.IGNORE_PENDING
};
