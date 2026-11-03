const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_SECRET = env.JWT_SECRET

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Missing or invalid authorization header" });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: "Token not found" });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: "Invalid or expired token" });
            }

            req.user = decoded;
            next();
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = verifyToken;