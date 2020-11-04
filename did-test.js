const {didToAddress} = require('./src/utils');

const main = async () => {
	console.log(
		'did:selfkey:0x50f43322680328a319ff607066367f2ba826215f0718c89358c7f7a376530aa8',
		await didToAddress(
			'did:selfkey:0x50f43322680328a319ff607066367f2ba826215f0718c89358c7f7a376530aa8'
		)
	);

	console.log(
		'did:eth:0xBBc024B6bC7885EC486F6586A25b465Ec59Ede1d',
		await didToAddress('did:eth:0xBBc024B6bC7885EC486F6586A25b465Ec59Ede1d')
	);
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
