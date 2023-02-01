import crypto from 'crypto';

import db from './db/conn';

import { keys } from './db/db/db.json';

async function main() {
    const keys = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: ''
        }
    });

    console.log(keys);

    await db.set('/serverInfo/publicKey', keys.publicKey);
    await db.set('keys', keys);
}

if (keys === undefined) {

    main();
}
