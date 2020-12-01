const config = require('./config');
const pkg = require('../package.json');
const Sentry = require('@sentry/node');

Sentry.init({
	dsn: config.sentryDSN,
	environment: process.env.NODE_ENV || 'development',
	attachStacktrace: true,
	sendDefaultPii: true,
	serverName: config.sentryName,
	release: `${pkg.name}@${pkg.version}`,
	beforeBreadcrumb: b => {
		console.log(b);
		return b;
	},
	tracesSampleRate: 1.0
});

Sentry.setContext('issuer', {
	issuerContractAddress: config.issuerContractAddress,
	ethNetworkId: config.ethNetworkId,
	infuraProjectId: config.infuraProjectId,
	ethAddress: config.ethAddress,
	kyccApiUrl: config.kyccApiUrl,
	kyccTemplate: config.kyccTemplate,
	isWhitelist: true
});

Sentry.setTag('version', pkg.version);
