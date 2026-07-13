import express from 'express';
import cors from 'cors';
import signupRouter from './route/signup.js';

const app = express();
const port: number = 5001;

app.use(express.json());

app.use(cors());
app.use(signupRouter);

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});