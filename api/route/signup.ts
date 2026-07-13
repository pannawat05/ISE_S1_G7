import express from 'express';
import  db  from '../model/db.js';

const signupRouter = express.Router();



signupRouter.post("/signup", (req, res) => {
    console.log("Body:", req.body);

    const { fname, lname, email, password } = req.body;

    db.query(
        "INSERT INTO users (f_name, l_name, email, password) VALUES (?, ?, ?, ?)",
        [fname, lname, email, password],
        (err, result) => {

            if (err) {
                console.error("MYSQL ERROR:", err);
                return res.status(500).json({
                    error: err
                });
            }

            res.json(result);
        }
    );
});

export default signupRouter;