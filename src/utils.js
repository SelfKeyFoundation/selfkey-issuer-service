const sk = require('@selfkey/node-lib');
const config = require('./config');

const didToAddress = async did => {
	if (!sk.did.isSupported(did)) throw new Error('Cannot resolve address');

	try {
		const parsed = sk.did.parse(did);

		if (+config.ethNetworkId === 3 && parsed.method === 'selfkey') {
			did = `${did};selfkey:chain=ropsten`;
		}

		const keyId = `${did}#keys-1`;

		const didDoc = await sk.did.resolve(did);

		const address = didDoc.publicKey.find(k => k.id === keyId).ethereumAddress;
		return address;
	} catch (err) {
		console.error(err);
		throw new Error('Cannot resolve address');
	}
};

module.exports = {didToAddress};
