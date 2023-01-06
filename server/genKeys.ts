import crypto from 'crypto';

import db from './db/conn';

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
        passphrase: 'FlUrGeLsLuRpE'
    }
});

db.set('serverInfo/publicKey', keys.publicKey);
db.set('keys', keys);