const express = require("express");
const UserModel = require("../models/userModel");
require('dotenv').config();
const bcrypt = require("bcrypt");
const saltRounds=10;
var jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const UserRouter = express.Router();
const BASE_URL = process.env.BASE_URL;
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PSWD
    }
  });


UserRouter.post("/register", (req,res)=>{
    try {
        const myPassword = req.body.password;

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(myPassword)) {
        return res.status(400).json({
            msg: "Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character."
        });
    }
        bcrypt.hash(myPassword, saltRounds, async function (err, hash) {
            if (err) {
                console.error("Hashing Error:", err);
                return res.status(500).json({ msg: "Error hashing password", error: err.message });
            }

            try {
                let userData = { ...req.body, password: hash };
                let newUser=await UserModel.create(userData);
                var token = jwt.sign({ userId: newUser._id, role:newUser._id }, process.env.SECRET_KEY);
                const verifyLink = `${BASE_URL}/user/verify_email/${token}`;

               
                const info = await transporter.sendMail({
                    from: "Admin",
                    to: userData.email,
                    subject: "Finance tracker email Verification",
                    text: `Click here for email verification: ${verifyLink}`
                });
                res.status(201).json({ msg: "Signup completed, verify your account (email sent)"});
            } catch (dbError) {
                console.error("Database Error:", dbError);
                res.status(500).json({ msg: "Error creating user", error: dbError.message });
            }
        });
    } catch (err) {
        console.error("Unexpected Error:", err);
        res.status(500).json({ msg: "Cannot register", error: err.message });
    }
});

UserRouter.get("/verify_email/:token", async (req, res) => {
    try {
        let token = req.params.token;
        let decoded = jwt.verify(token, process.env.SECRET_KEY);

        let user = await UserModel.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.verified) {
            return res.status(400).json({ msg: "User already verified" });
        }

        user.verified = true;
        await user.save();

        res.status(200).json({ msg: "Email verification successful. You can now log in." });
    } catch (err) {
        console.error("Email verification error:", err);
        res.status(400).json({ msg: "Invalid or expired token", error: err.message });
    }
});


UserRouter.post("/login", async (req, res) => {
    try {
        let userData = await UserModel.findOne({ email: req.body.email });

        if (!userData) {
            return res.status(404).json({ msg: "User not registered" });
        }

        let hash = userData.password;
        let myPassword = req.body.password;

        bcrypt.compare(myPassword, hash,async function (err, result) {
            if (err) {
                console.error("Bcrypt Error:", err);
                return res.status(500).json({ msg: "Error comparing passwords", error: err.message });
            }

            if (result) {
                if(!userData.verified){
                    var token = jwt.sign({ userId: userData._id ,role: userData.role}, process.env.SECRET_KEY);
                const verifyLink = `${BASE_URL}/user/verify_email/${token}`;

                const info = await transporter.sendMail({
                    from: "Admin",
                    to: userData.email,
                    subject: "Finance tracker email Verification",
                    text: `Click here for email verification: ${verifyLink}`
                });
                    return res.status(400).json({msg:"User not verified check you mail"})
                }
                var token = jwt.sign({ userId: userData._id, role:userData.role }, process.env.SECRET_KEY);
                console.log(userData._id)
                res.status(200).json({ msg: "Logged in", token });
            } else {
                res.status(401).json({ msg: "Wrong password" });
            }
        });
    } catch (err) {
        console.error("Unexpected Error:", err);
        res.status(500).json({ msg: "Login failed", error: err.message });
    }
});

UserRouter.post("/forget_password", async (req, res) => {
    try {
        let user = await UserModel.findOne({ email: req.body.email });
        console.log(user);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        var token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: "15min" });
        const resetLink = `${BASE_URL}/user/reset_password/${token}`;

        const info = await transporter.sendMail({
            from: "Admin",
            to: user.email,
            subject: "Password change",
            text: `Click here for password reset: ${resetLink}`
        });

        res.status(200).send("Password reset link sent");
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

UserRouter.get("/reset_password/:token", (req, res) => {
    let token = req.params.token;
    res.send(`<!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Reset Password</title>
   </head>
   <body>
       <form action="${BASE_URL}/user/reset_password/${token}" method="POST" >
           <input name="password" type="text" placeholder="Enter New Password" />
           <input type="submit" value="Reset Password" />
       </form>
   </body>
   </html>`);
});

UserRouter.post("/reset_password/:token", async (req, res) => {
    try {
        var decoded = jwt.verify(req.params.token, process.env.SECRET_KEY);
        const myPassword = req.body.password;

        bcrypt.hash(myPassword, saltRounds, async function (err, hash) {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: "Error hashing password" });
            } else {
                let update = await UserModel.findOneAndUpdate({ _id: decoded.userId }, { password: hash });
                if (!update) {
                    return res.status(404).send("User not found");
                } else {
                    res.status(200).json({ message: "Password updated successfully" });
                }
            }
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

module.exports = UserRouter;