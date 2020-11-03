const express = require('express');
const router = express.Router();
const kyccClient = require('../kycc-client');
const KYCC_APPROVED_TEMPLATE = process.env.KYCC_APPROVED_TEMPLATE;

router.post('/', async (req, res) => {
	console.log('webhook received', JSON.stringify(req.body, null, 2));
	try {
		const {applicationId, status} = req.body;

		if (status !== kyccClient.statuses.APPROVED) {
			console.error(
				`Hook for application id ${applicationId} rejected, only approved applications are handled`
			);
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

		if (KYCC_APPROVED_TEMPLATE && application.template._id !== KYCC_APPROVED_TEMPLATE) {
			console.error(
				`Hook for application id ${applicationId} rejected, only template ${KYCC_APPROVED_TEMPLATE} is allowed`
			);
			return res.json({
				status: 400,
				message: `Template of application ${applicationId} is not ${KYCC_APPROVED_TEMPLATE}`
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
		// TODO: call contract to setup the flag

		res.json({status: 'ok'});
	} catch (error) {
		console.log('XXX', error);
		res.status(500).json({status: 'error'});
	}
});

module.exports = router;
