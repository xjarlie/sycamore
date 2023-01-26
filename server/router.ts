import express, { CookieOptions, Response } from 'express';
const router = express.Router();
import db from './db/conn';
import crypto, { KeyObject, subtle as subtleCrypto } from 'crypto';
import { Message, User } from './db/schema';
import authRouter from './authRouter';
import { checkAuthToken, parseAuth } from './tokenUtils';

router.use('/auth', authRouter);

const cookieOptions = { secure: true, httpOnly: true, maxAge: 5184000000 /* 60 days */, sameSite: 'none' } as CookieOptions;
const polls: any = {};

router.post('/test', (req, res) => {
    console.log(req.body);
    res.send('data received:' + req.body);
});

router.get('/server-info', async (req, res) => {
    console.log('Server info requested');
    const serverInfo = await db.get('serverInfo');
    res.json(serverInfo);
});

router.get('/users/:username/info', async (req, res) => {
    const { username } = req.params;


    const user: User = await db.get('users/' + username);
    if (!user) {
        res.status(404).json({ result: 'Error', message: 'User does not exist' });
        return false;
    }

    let data;
    if (req.headers.authorization && await checkAuthToken((parseAuth(req.headers.authorization).USERNAME), (parseAuth(req.headers.authorization).AUTH_TOKEN)) && (parseAuth(req.headers.authorization).USERNAME) === username) {
        data = user;
    } else {
        data = {
            displayName: user.displayName,
            userID: user.userID,
            publicKey: user.publicKey || ''
        }
    }

    res.status(200).json({ result: 'Success', message: 'User found', data: data });
    return true;
});

router.post('/outbox', async (req, res) => {

    if (!req.headers.authorization || !(await checkAuthToken(parseAuth(req.headers.authorization).USERNAME, (parseAuth(req.headers.authorization).AUTH_TOKEN)))) {
        res.status(400).json({ result: 'Error', message: 'Incorrect credentials' });
        return false;
    }

    const { USERNAME, AUTH_TOKEN } = parseAuth(req.headers.authorization);
    //const USERNAME = 'xjarlie1';

    const message = req.body;

    const to: Message['to'] = req.body.to;

    const isServerKnown = await db.get('knownServers/' + to.url);
    let serverPublicKey: string = '';
    if (isServerKnown === undefined) {
        console.log('not known');

        const serverInfo = await fetch(`${to.url}/server-info`);
        const json = await serverInfo.json();
        if (json) {
            serverPublicKey = json.publicKey;
        }

    } else {
        serverPublicKey = isServerKnown.publicKey;
    }

    console.log(serverPublicKey);

    const signedMessage = await signMessage(message.text);
    const id = crypto.randomUUID();

    const data: Message = {
        text: message.text,
        from: {
            id: USERNAME,
            url: await db.get('serverInfo/url')
        },
        to: to,
        signature: signedMessage,
        id: id,
        status: 'not delivered',
        sentTimestamp: Date.now()
    };

    await db.set('users/' + USERNAME + '/outbox/' + id, data);

    console.log(to.url + '/inbox');

    const response = await fetch(to.url + '/inbox', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    const json = await response.json();
    console.log('JSON', json)
    if (response.status === 201) {
        await db.set(`/users/${USERNAME}/outbox/${id}/status`, 'delivered');
    }

    res.json(data);

});

router.post('/inbox', async (req, res) => {

    const message: Message = req.body;
    console.log('MESSAGE RECEIVED: ', message);

    if (!(message.to && message.from && message.id && message.signature && message.sentTimestamp && message.text)) {
        res.status(400).json({ message: 'Invalid message' });
        return false;
    }

    const thisUrl: string = await db.get('serverInfo/url');
    if (message.to.url !== thisUrl) {
        res.status(400).json({ message: 'Wrong server' });
        return false;
    }

    let fromPublicKey = '';

    // Get sender server public key
    const response = await fetch(`${message.from?.url}/server-info`);
    const json = await response.json();
    fromPublicKey = json.publicKey;


    // Verify signature
    const messageSignature = message.signature || '';

    const verified = await verifyMessage(message.text, fromPublicKey, messageSignature);
    //const verified = true;

    const recipient = message.to.id;
    message.status = 'delivered';

    message.receivedTimestamp = Date.now();
    await db.set(`/users/${recipient}/inbox/${message.id}`, { ...message, verified: verified, timeToReceive: message.receivedTimestamp - message.sentTimestamp });

    if (polls[recipient] !== undefined) {
        console.log(recipient);
        const recipientRes = polls[recipient] as Response;
        recipientRes.status(200).json({ message });
        delete polls[recipient];
    }

    res.status(201).json({ message: 'Message delivered' });
});

router.get('/pollInbox', async (req, res) => {
    if (!req.headers.authorization || !(await checkAuthToken(parseAuth(req.headers.authorization).USERNAME, (parseAuth(req.headers.authorization).AUTH_TOKEN)))) {
        res.status(400).json({ result: 'Error', message: 'Incorrect credentials' });
        return false;
    }

    const username = parseAuth(req.headers.authorization).USERNAME;

    polls[username] = res;

    console.log('pollll', username);
});

router.get('/inbox', async (req, res) => {
    if (!req.headers.authorization || !(await checkAuthToken(parseAuth(req.headers.authorization).USERNAME, (parseAuth(req.headers.authorization).AUTH_TOKEN)))) {
        res.status(400).json({ result: 'Error', message: 'Incorrect credentials' });
        return false;
    }

    const username = parseAuth(req.headers.authorization).USERNAME;

    const user: User = await db.get('/users/' + username);

    res.status(200).json({ inbox: user.inbox });
    return true;
})


async function verifyMessage(message: string, publicKey: string, sig: string) {

    const RAW_MESSAGE = message;
    const SIGNATURE = sig;
    const PUBLIC_KEY = publicKey;

    const HASHED_MESSAGE = crypto.pbkdf2Sync(RAW_MESSAGE, '', 100100, 32, 'sha512');

    const verify = crypto.createVerify('RSA-SHA256');
    verify.write(HASHED_MESSAGE);
    verify.end();
    const VERIFIED = verify.verify(PUBLIC_KEY, SIGNATURE, 'hex');

    console.log('VERIFIED ', VERIFIED);
    return VERIFIED;
}

// https://stackoverflow.com/questions/54146390/nodejs-generate-a-keys-to-sign-a-piece-of-data

async function signMessage(message: string) {

    const RAW_MESSAGE = message;
    const PRIVATE_KEY = await db.get('keys/privateKey');

    // Hash message
    const HASHED_MESSAGE = crypto.pbkdf2Sync(RAW_MESSAGE, '', 100100, 32, 'sha512');

    // Sign message
    const sign = crypto.createSign('RSA-SHA256');
    sign.write(HASHED_MESSAGE);
    sign.end();
    const SIGNATURE = sign.sign({
        key: PRIVATE_KEY,
        passphrase: ''
    }, 'hex');

    console.log(SIGNATURE);
    return SIGNATURE;

    // const HASHED_MESSAGE = crypto.pbkdf2Sync(message, '', 100100, 64, 'sha512').toString('hex');

    // const privateKey = await db.get('keys/privateKey');
    // //console.log('private key: ', privateKey);

    // const sign = crypto.createSign('RSA-SHA256');
    // sign.update(message);
    // const sig = sign.sign({
    //     key: privateKey,
    //     passphrase: ''
    // }, 'hex');
    // //console.log('SIG: ', sig);

    // return sig;
}

// plans: sign and verify messages to ensure origin - sign with private key and verify with public key
// then: wrap that in a standard private-public key encryption 
// or: other way round lol
// need to exchange public keys upon first exchange with another server

router.get('/messages')

export default router;