import Database from './Database';
import path from 'path';

const db = new Database(path.join(__dirname, 'db.json'));

export default db;