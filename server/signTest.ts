import { keys } from './db/db/db.json';
import crypto from 'crypto';

const RAW_MESSAGE = 'omg hi';
const PRIVATE_KEY = keys.privateKey;
const PUBLIC_KEY = keys.publicKey;

// Hash message
const HASHED_MESSAGE = crypto.pbkdf2Sync(RAW_MESSAGE, '', 100100, 32, 'sha512');

// Sign message
const sign = crypto.createSign('RSA-SHA256');
sign.update(HASHED_MESSAGE);
const SIGNATURE = sign.sign({
    key: PRIVATE_KEY,
    passphrase: ''
}, 'hex');

console.log(SIGNATURE);

// Verify signature

const verify = crypto.createVerify('RSA-SHA256');
verify.write(HASHED_MESSAGE);
verify.end();
const VERIFIED = verify.verify(PUBLIC_KEY, SIGNATURE, 'hex');

console.log(VERIFIED);