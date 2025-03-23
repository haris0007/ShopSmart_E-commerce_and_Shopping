const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMw = () => {
    return async (req, res, next) => {
        let token;
        if (req.headers.authorization) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).send("Unauthorized, login first");
        }

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            if (decoded) {
                req.id = decoded.userId;
                req.role=decoded.role;
                next();
            }
        } catch (err) {
            res.status(401).json({ msg: "Login again" });
        }
    };
};

module.exports = authMw;
