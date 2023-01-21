// const express = require('express');
import express, { CookieOptions } from 'express';
import db from './db/conn';
const router = express.Router();
import crypto from 'crypto';
import { generateAuthToken, getAuthToken } from './tokenUtils';

const cookieOptions = { secure: true, httpOnly: true, maxAge: 5184000000 /* 60 days */, sameSite: 'none' } as CookieOptions;

router.post('/signUp', async (req, res) => {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
        res.status(400).json({ result: 'Error', message: 'Username and password needed' });
        return false;
    }

    if ((await db.get('users/' + username)) != undefined) {
        res.status(400).json({ result: 'Error', message: 'User already exists' });
        return false;
    }

    const { hashed: hashedPassword, salt } = hashPassword(password);

    const authToken = generateAuthToken();

    const data = {
        username: username,
        displayName: displayName,
        password: hashedPassword,
        salt: salt,
        authToken: authToken,
        inbox: {},
        outbox: {}
    };

    const result = await db.set('users/' + username, data);
    res.status(201).json({ result: 'Success', message: 'Account created', data: result});

});

router.post('/login', async (req, res) => {
    const {username, password} = req.body;

    if (!username || !password) {
        res.status(400).json({result: 'Error', message: 'Username and password needed'});
        return false;
    }    

    const user = await db.get('users/' + username);
    if (!user) {
        res.status(400).json({result: 'Error', message: 'Account does not exist'});
        return false;
    }

    const storedHash = user.password;
    const salt = user.salt;

    const testHash = hashPassword(password, salt);
    if (testHash !== storedHash) {
        res.status(400).json({result: 'Error', message: 'Incorrect password'});
        return false;
    }

    const token = generateAuthToken();
    await db.set('users/' + username + '/authToken', token);

    res.status(200).cookie('AUTH_TOKEN', await getAuthToken(username), cookieOptions).cookie('USERNAME', username, cookieOptions).json({result: 'Success', message: 'Logged in', authToken: token});
    return true;
});

function hashPassword(password: string, salt = (crypto.randomBytes(32).toString('hex')), iterations = 100100) {
    const hashed = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha512');
    return { hashed, salt };
}

export default router;