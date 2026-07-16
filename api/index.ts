import express from 'express';
import cors from 'cors';
import authRouter from './route/auth.js';
import emailRouter from './route/email.js';

const app = express();
app.use(express.urlencoded({ extended: true }));  
app.use(express.json());
const port: number = 5001;
app.use(cors({
    origin: 'http://localhost:3000', // URL ของฝั่ง Frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(emailRouter);
app.use(authRouter);

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});