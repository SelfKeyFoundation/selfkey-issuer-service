const sk = require('@selfkey/node-lib');
const KYCC_API_KEY = process.env.KYCC_API_KEY;
const KYCC_API_URL = process.env.KYCC_API_URL;

module.exports = sk.kycc.createKYCCIntegrationsClient({
	apiKey: KYCC_API_KEY,
	instanceUrl: KYCC_API_URL
});
