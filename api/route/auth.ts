import express from 'express';
import  db  from '../model/db.js';

const authRouter = express.Router();



authRouter.post("/auth/signup", (req, res) => {
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

authRouter.post("/auth/login", (req, res) => {
    const { email, password } = req.body;
    
    db.query(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, result) => {      

            if (err) {
                console.error("MYSQL ERROR:", err);
                return res.status(500).json({
                    error: err
                });
            }

            if (Array.isArray(result) && result.length > 0) {
                res.json({ message: "Login successful" });
            } else {
                res.status(401).json({ message: "Invalid email or password" });
            }
        }
    );
});

export default authRouter;