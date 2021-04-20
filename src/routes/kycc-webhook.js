const express = require('express');
const router = express.Router();
const config = require('../config');
const kyccClient = require('../kycc-client');
const Sentry = require('@sentry/node');
const countries = require('i18n-iso-countries');

const FIRST_NAME_ATTRIBUTE = 'http://platform.selfkey.org/schema/attribute/first-name.json';
const MIDDLE_NAME_ATTRIBUTE = 'http://platform.selfkey.org/schema/attribute/middle-name.json';
const LAST_NAME_ATTRIBUTE = 'http://platform.selfkey.org/schema/attribute/last-name.json';
const DOB_ATTRIBUTE = 'http://platform.selfkey.org/schema/attribute/date-of-birth.json';
const NATIONALITY_ATTRIBUTE = 'http://platform.selfkey.org/schema/attribute/nationality.json';

const parseApplicationAttributes = applicationAttributes =>
	Object.keys(applicationAttributes).map(id => {
		const {label, title, optional, schemaId, valid, value, description} = applicationAttributes[
			id
		];
		return {
			id,
			title: label || title,
			required: !optional,
			schemaId,
			valid,
			data: value,
			description
		};
	});

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

		const attributes = parseApplicationAttributes(application.attributes);

		const credentialSubject = attributes.reduce(
			(acc, curr) => {
				if (!curr.data) {
					return acc;
				}
				if (curr.schemaId === FIRST_NAME_ATTRIBUTE) {
					acc.firstName = curr.data;
				}
				if (curr.schemaId === MIDDLE_NAME_ATTRIBUTE) {
					acc.middleName = curr.data;
				}
				if (curr.schemaId === LAST_NAME_ATTRIBUTE) {
					acc.lastName = curr.data;
				}
				if (curr.schemaId === NATIONALITY_ATTRIBUTE) {
					acc.nationality = countries.getName(curr.data.country, 'en', {
						select: 'official'
					});
				}
				if (curr.schemaId === DOB_ATTRIBUTE) {
					acc.dateOfBirth = curr.data;
				}
				return acc;
			},
			{
				id: user.did
			}
		);

		const credential = await req.selfkeyAgent.issueCredential({credentialSubject});

		console.log(credential);

		res.json({status: 'ok'});
	} catch (error) {
		console.error(error);
		Sentry.captureException(error);
		res.status(500).json({status: 'error'});
	}
});

module.exports = router;
