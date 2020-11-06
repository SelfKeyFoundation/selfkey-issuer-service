const sk = require('@selfkey/node-lib');
const config = require('./config');

module.exports = sk.kycc.createKYCCIntegrationsClient({
	apiKey: config.kyccApiKey,
	instanceUrl: config.kyccApiUrl
});
