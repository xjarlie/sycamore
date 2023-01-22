import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import db from './server/db/conn';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import serverRouter from './server/router';

app.use(cors({
    origin: function (origin, callback) {
        callback(null, origin)
    },
    credentials: true
}));
app.use(express.json());

app.use('/', serverRouter);

app.listen(port, async () => {
    await db.set('/serverInfo/url', process.env.SERVER_URL || 'http://localhost');
    console.log('typescript server running on port', port);
});