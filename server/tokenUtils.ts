import crypto from 'crypto';
import db from './db/conn';
import { User } from './db/schema';

export function generateAuthToken() {
    return crypto.randomBytes(64).toString('hex');
}

export async function getAuthToken(username: string): Promise<string|undefined> {
    const user = await db.get('users/' + username) as User;
    if (!user) return '';

    return user.authToken;
}

export async function checkAuthToken(username: string, token: string): Promise<boolean> {
    if (await getAuthToken(username) !== token) return false;

    // await db.set('users/' + username + '/authToken', generateAuthToken());

    return true;
}

export function parseAuth(auth: string) {

    const x = auth?.split('Bearer')[1];
    const token = x?.split('----')[1];
    const id = x?.split('----')[0];

    return {USERNAME: id?.trim(), AUTH_TOKEN: token?.trim()};
}