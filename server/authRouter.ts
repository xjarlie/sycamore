// const express = require('express');
import express, { CookieOptions } from 'express';
import db from './db/conn';
const router = express.Router();
import crypto from 'crypto';
import { generateAuthToken, getAuthToken } from './tokenUtils';
import { User } from './db/schema';

const cookieOptions = { secure: true, httpOnly: true, maxAge: 5184000000 /* 60 days */, sameSite: 'none' } as CookieOptions;

router.get('/checkUsername/:username', async (req, res) => {

    const {username} = req.params;

    console.log('Username checked: ', username);

    const user: User = await db.get(`users/${username}`);
    if (user) {
        res.status(400).json({ message: 'User already exists' });
        return false;
    }

    res.status(200).json({ message: 'Username available' });
    return true;

});

router.post('/signUp', async (req, res) => {
    const { username, password, displayName }: {username: string, password: string, displayName: string} = req.body;

    if (!username || !password || !displayName) {
        res.status(400).json({ result: 'Error', message: 'Username and password needed' });
        return false;
    }

    if ((await db.get('users/' + username)) != undefined) {
        res.status(400).json({ result: 'Error', message: 'User already exists' });
        return false;
    }

    const { hashed: hashedPassword, salt } = hashPassword(password);

    const data: User = {
        userID: username,
        displayName: displayName,
        password: hashedPassword,
        salt: salt,
        inbox: {},
        outbox: {}
    };

    const result = await db.set('users/' + username, data);
    res.status(201).json({ result: 'Success', message: 'Account created', data: result});

});

router.post('/login', async (req, res) => {
    const {username, password}: {username: string, password: string} = req.body;

    if (!username || !password) {
        res.status(400).json({result: 'Error', message: 'Username and password needed'});
        return false;
    }    

    const user: User = await db.get('users/' + username);
    if (!user) {
        res.status(400).json({result: 'Error', message: 'Account does not exist'});
        return false;
    }

    const storedHash = user.password;
    const salt = user.salt;

    const testHash = hashPassword(password, salt);
    if (testHash.hashed !== storedHash) {
        res.status(400).json({result: 'Error', message: 'Incorrect password'});
        return false;
    }

    const token = generateAuthToken();
    await db.set('users/' + username + '/authToken', token);

    res.status(200).json({result: 'Success', message: 'Logged in', authToken: token});
    return true;
});

function hashPassword(password: string, salt = (crypto.randomBytes(32).toString('hex')), iterations = 100100) {
    const hashed = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha512').toString('hex');
    return { hashed, salt };
}

export default router;