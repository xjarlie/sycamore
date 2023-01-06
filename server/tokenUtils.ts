import crypto from 'crypto';
import db from './db/conn';
import { User } from './db/schema';

function generateAuthToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function getAuthToken(username: string): Promise<string> {
    const user = await db.get('users/' + username) as User;
    if (!user) return '';

    return user.authToken;
}

async function checkAuthToken(username: string, token: string): Promise<boolean> {
    if (await getAuthToken(username) !== token) return false;

    await db.set('users/' + username + '/authToken', generateAuthToken());

    return true;
}

export {generateAuthToken, getAuthToken, checkAuthToken};