const config = require('../src/config');
const debug = require('debug')('issuer:lib');
const _ = require('lodash');
const kyccClient = require('../src/kycc-client');

const {sleep} = require('../src/utils');

async function fetchApprovedDIDs(pageSize = 100, updateLimit = null) {
	const approvedApplications = await fetchApplications(
		{current_statuses: [kyccClient.statuses.APPROVED]},
		['owners'],
		pageSize,
		updateLimit
	);

	return approvedApplications
		.filter(a => a.owners && a.owners.length)
		.map(a => a.owners[0].did)
		.filter(u => !!u);
}

async function fetchApplications(params, fields = [], pageSize = 100, updateLimit = null) {
	let lastUpdateTs = Date.now();
	let maxUpdateTs = 0;
	if (updateLimit) {
		maxUpdateTs = Date.now() - updateLimit;
	}
	params = {
		...params,
		template_id: config.kyccTemplate,
		limit: pageSize
	};
	if (updateLimit) {
		params.sort = '-updatedAt';
	}
	fields = _.uniq(['id', 'owners', 'currentStatus', 'updatedAt', ...fields]);
	debug('Preparing to fetch applications', {params, fields, pageSize, updateLimit});
	let applications = [];
	let hasMore = true;
	let page = 0;
	do {
		debug('Fetching applications page', {
			params: {
				...params,
				skip: page * pageSize
			},
			fields
		});
		let apps = await kyccClient.applications.list(
			{
				...params,
				skip: page * pageSize
			},
			fields
		);
		applications = applications.concat(apps);
		lastUpdateTs = new Date(apps[apps.length - 1].updatedAt).getTime();
		if (apps.length < pageSize || lastUpdateTs - maxUpdateTs < 0) {
			hasMore = false;
		}
		page++;
		if (config.kyccReqDelay) {
			debug('delaying for', config.kyccReqDelay, 'milliseconds');
			await sleep(config.kyccReqDelay);
		}
	} while (hasMore);

	debug('finished application fetch');
	return applications;
}

async function getInfoByEmail(email, pageSize) {
	let applications = await fetchApplications({email}, [], pageSize);
	let user = null;
	if (!applications || !applications.length) {
		debug('no applications for', email, 'fetching user directly');
		user = await getUserByEmail(email);
	} else {
		user = applications[0].owners[0];
	}

	return {applications, user};
}

async function getUserByEmail(email) {
	return kyccClient.users.list({email});
}

module.exports = {
	fetchApprovedDIDs,
	fetchAllApplications: fetchApplications,
	getInfoByEmail,
	getUserByEmail
};
