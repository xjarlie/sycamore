import express from 'express';
const router = express.Router();
import db from './db/conn';
import fetch from 'node-fetch';
import crypto, { subtle as subtleCrypto } from 'crypto';
import { User } from './db/schema';

const cookieOptions = { secure: true, httpOnly: true, maxAge: 5184000000 /* 60 days */, sameSite: 'none' };

router.get('/server-info', async (req, res) => {
    const serverInfo = await db.get('serverInfo');
    res.json(serverInfo);
});

import authRouter from './authRouter';
import { checkAuthToken } from './tokenUtils';
router.use('/auth', authRouter);

router.get('/:username/info', async (req, res) => {
    const { username } = req.params;
    const { AUTH_TOKEN, USERNAME } = req.cookies;

    const user = await db.get('users/' + username) as User;
    if (!user) {
        res.status(404).json({result: 'Error', message: 'User does not exist'});
        return false;
    }

    let data;
    if (USERNAME && await checkAuthToken(USERNAME, AUTH_TOKEN) && USERNAME === username) {
        data = user;
    } else {
        data = {
            displayName: user.displayName,
            username: user.username
        }
    }

    res.status(200).json({result: 'Success', message: 'User found', data: data});
    return true;
});

router.post('/sendMessage', async (req, res) => {
    const { AUTH_TOKEN, USERNAME } = req.cookies;
    if (!(await checkAuthToken(USERNAME, AUTH_TOKEN))) {
        res.status(400).json({result: 'Error', message: 'Incorrect credentials'});
        return false;
    }

    const { message, to } = req.body;
    const signedMessage = signMessage(message);
    const id = crypto.randomUUID();

    const data = {
        message: message,
        from: {
            username: USERNAME,
            serverURL: await db.get('server-info/url')
        },
        to: to,
        signedHash: signedMessage,
        id: id,
        status: 'not delivered'
    };

    await db.set('users/' + USERNAME + '/outbox/' + id, data);
    const response = await fetch(to.serverURL)

})

async function signMessage(message: string) {
    const HASHED_MESSAGE = crypto.pbkdf2Sync(message, '', 100100, 64, 'sha512');

    const SIGNED_HASH = crypto.sign('sha512', HASHED_MESSAGE, (await db.get('keys/privateKey')));

    return SIGNED_HASH.toString();
}

// plans: sign and verify messages to ensure origin - sign with private key and verify with public key
// then: wrap that in a standard private-public key encryption 
// or: other way round lol
// need to exchange public keys upon first exchange with another server

router.get('/messages')

export default router;