import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import db from './server/db/conn';
import { rateLimit } from 'express-rate-limit';
import serverRouter from './server/router';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: function (origin, callback) {
        callback(null, true)
    },
    credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
	windowMs: 5 * 1000, // 5 seconds
	max: 4, // Limit each IP to 4 requests per `window`
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use('/outbox', limiter);

if (process.env.USE_CLIENT === 'true') {
    app.use('/app', express.static(path.join(__dirname, 'client')));
    app.get('/app/*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client', 'index.html'));
    });
    console.log('using client');
}
app.use('/', serverRouter);


app.listen(port, async () => {
    await db.set('/serverInfo/url', process.env.SERVER_URL || 'http://localhost');
    console.log('typescript server running on port', port);
});