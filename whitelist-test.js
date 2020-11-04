const config = require('./src/config');
const {createWhitelistClient} = require('./src/whitelist');

const main = async () => {
	const client = createWhitelistClient(config);
	const address = process.env.TEST_ETH_ADDRESS;
	let isWhitelisted = await client.isWhitelisted(address);

	console.log('is whitelisted', isWhitelisted);

	if (!isWhitelisted) {
		console.log('adding to whitelist');
		await client.addWhitelisted(address);
		isWhitelisted = await client.isWhitelisted(address);
		console.log('is whitelisted after add', isWhitelisted);
	} else {
		console.log('removing from whitelist');
		await client.removeWhitelisted(address);
		isWhitelisted = await client.isWhitelisted(address);
		console.log('is whitelisted after remove', isWhitelisted);
	}
};

main()
	.then(() => {
		console.log('Done');
	})
	.catch(err => {
		console.error(err);
	})
	.finally(() => {
		process.exit();
	});
