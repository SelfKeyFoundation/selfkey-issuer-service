const express = require('express');
const router = express.Router();
const kyccClient = require('../kycc-client');

router.post('/', async (req, res) => {
	console.log('XXX webhook received');
	try {
		const {applicationId, status} = req.body;

		if (status !== kyccClient.statuses.APPROVED) {
			console.log(
				`Hook for application id ${applicationId} rejected, only approved applications are handled`
			);
			return res.json(200, {
				status: 400,
				message: `Application ${applicationId} was not approved`
			});
		}

		// get full application from kycc
		const application = await kyccClient.applications.get(applicationId, [
			'attributes',
			'owners',
			'template'
		]);

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
