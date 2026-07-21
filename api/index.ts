import express from 'express';
import cors from 'cors';
import authRouter from './route/auth.js';
import emailRouter from './route/email.js';
import Organizer_router from './route/organizer.js';
import EventRouter from './route/event.js';

const app = express();
app.use(express.urlencoded({ extended: true }));  
app.use(express.json());
const port: number = 5001;
app.use(cors({
    origin: 'http://localhost:3000', // URL ของฝั่ง Frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token'], // เพิ่ม 'token' ใน allowedHeaders
}));
app.use(emailRouter);
app.use(authRouter);
app.use(Organizer_router);
app.use(EventRouter);
app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});