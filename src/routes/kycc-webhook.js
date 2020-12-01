const express = require('express');
const router = express.Router();
const config = require('../config');
const {didToAddress} = require('../utils');
const whitelistClient = require('../whitelist').defaultClient;
const kyccClient = require('../kycc-client');
const Sentry = require('@sentry/node');

router.post('/', async (req, res) => {
	console.log('webhook received', JSON.stringify(req.body, null, 2));

	try {
		const {applicationId, status} = req.body;

		Sentry.addBreadcrumb({
			category: 'kycc-webhook',
			message: `webhook received`,
			data: {applicationId, status},
			level: Sentry.Severity.Info
		});

		if (status !== kyccClient.statuses.APPROVED) {
			console.error(
				`Hook for application id ${applicationId} rejected, only approved applications are handled`
			);
			Sentry.addBreadcrumb({
				category: 'kycc-webhook',
				message: `webhook rejected, ${applicationId}, ${status}, need to be approved`,
				level: Sentry.Severity.Info
			});
			return res.json({
				status: 400,
				message: `Application ${applicationId} was not approved`
			});
		}

		// get full application from kycc
		const application = await kyccClient.applications.get(applicationId, [
			'attributes',
			'owners',
			'template',
			'dataChecks',
			'idVerificationCheck'
		]);

		if (config.kyccTemplate && application.template._id !== config.kyccTemplate) {
			console.error(
				`Hook for application id ${applicationId} rejected, only template ${config.kyccTemplate} is allowed`
			);
			return res.json({
				status: 400,
				message: `Template of application ${applicationId} is not ${config.kyccTemplate}`
			});
		}

		const {owners} = application;

		if (!owners || !owners.length) {
			console.error(`Application ${applicationId} does not have owners`);
			return res.json({
				status: 400,
				message: `Application ${applicationId} does not have owners`
			});
		}

		const user = await kyccClient.users.get(owners[0]._id);

		if (!user || !user.did) {
			console.error(`The owner for application ${applicationId} does not have a DID`);
			return res.json({
				status: 400,
				message: `The owner for application ${applicationId} does not have a DID`
			});
		}

		console.log(`XXX setting flag: user with DID ${user.did} is eligible for KeyFi`);
		Sentry.addBreadcrumb({
			category: 'kycc-webhook',
			message: `converting did to address`,
			data: {did: user.did},
			level: Sentry.Severity.Info
		});
		const address = await didToAddress(user.did);

		Sentry.addBreadcrumb({
			category: 'kycc-webhook',
			message: `Setting address to whitelist`,
			data: {address},
			level: Sentry.Severity.Info
		});
		if (!(await whitelistClient.isWhitelisted(address))) {
			await whitelistClient.addWhitelisted(address);
		}
		res.json({status: 'ok'});
	} catch (error) {
		console.log('XXX', error);
		Sentry.captureException(error);
		res.status(500).json({status: 'error'});
	}
});

module.exports = router;
