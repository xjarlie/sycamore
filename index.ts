import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import serverRouter from './server/router';
import clientRouter from './client/router';

app.use(cors({
    origin: function (origin, callback) {
        callback(null, origin)
    },
    credentials: true
}));
app.use(express.json());

app.use('/app', clientRouter);
app.use('/', serverRouter);

app.get('/', (req, res) => {
    res.redirect('/app');
});

app.listen(port, () => {
    console.log('typescript server running on port', port);
});