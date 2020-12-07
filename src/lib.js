const config = require('../src/config');
const kyccClient = require('../src/kycc-client');

const {defaultClient} = require('../src/whitelist');

const {didToAddress} = require('../src/utils');

async function fetchApprovedDIDs() {
	let approvedApplications = await kyccClient.applications.list(
		{
			template_id: config.kyccTemplate || undefined,
			current_statuses: [kyccClient.statuses.APPROVED],
			limit: 1000
		},
		['owners', 'currentStatus']
	);

	if (approvedApplications.length === 1000) {
		let hasMore = true;
		let page = 1;
		while (hasMore) {
			let apps = await kyccClient.applications.list(
				{
					template_id: config.kyccTemplate,
					current_statuses: [kyccClient.statuses.APPROVED],
					limit: 1000,
					skip: page * 1000
				},
				['owners', 'currentStatus']
			);
			approvedApplications = approvedApplications.concat(apps);
			if (apps.length < 1000) {
				hasMore = false;
			}
		}
	}

	const approvedApplicationUserIds = approvedApplications
		.filter(a => a.owners && a.owners.length)
		.map(a => a.owners[0]._id);

	const users = await Promise.all(
		approvedApplicationUserIds.map(async id => kyccClient.users.get(id))
	);
	return users.map(u => u.did).filter(u => !!u);
}

async function fetchAllApplications() {
	let applications = await kyccClient.applications.list(
		{
			template_id: config.kyccTemplate,
			limit: 1000
		},
		['id', 'owners', 'currentStatus']
	);

	if (applications.length === 1000) {
		let hasMore = true;
		let page = 1;
		while (hasMore) {
			let apps = await kyccClient.applications.list(
				{
					template_id: config.kyccTemplate,
					limit: 1000,
					skip: page * 1000
				},
				['owners', 'currentStatus']
			);
			applications = applications.concat(apps);
			if (apps.length < 1000) {
				hasMore = false;
			}
		}
	}
	return applications;
}

async function isWhitelistedDid(did) {
	const address = await didToAddress(did);
	return defaultClient.isWhitelisted(address);
}

async function getInfoByEmail(email) {
	let applications = await fetchAllApplications();
	let user = null;
	let whitelisted = false;
	applications = applications.filter(
		a => a.owners[0] && a.owners[0].email.toLowerCase() === email.toLowerCase()
	);
	if (!applications || !applications.length) {
		user = await getUserByEmail(email);
	} else {
		user = await kyccClient.users.get(applications[0].owners[0]._id);
	}
	if (user && user.did) {
		whitelisted = await isWhitelistedDid(user.did);
	}
	return {applications, user, whitelisted};
}

async function getUserByEmail(email) {
	let hasMore = true;
	let page = 0;
	while (hasMore) {
		const users = await kyccClient.users.list({skip: page * 100, limit: 100}, ['id', 'email']);
		const usr = users.find(u => u.email.toLowerCase() === email.toLowerCase());
		if (usr) {
			return kyccClient.users.get(usr.id);
		}
		if (!users.length) {
			hasMore = false;
		}
		page++;
	}
	return null;
}

async function checkWhitelistedDids(dids) {
	return Promise.all(dids.map(async did => ({did, whitelisted: await isWhitelistedDid(did)})));
}

module.exports = {
	fetchApprovedDIDs,
	fetchAllApplications,
	isWhitelistedDid,
	getInfoByEmail,
	getUserByEmail,
	checkWhitelistedDids
};
