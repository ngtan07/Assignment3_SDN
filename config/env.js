const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

const env = {
    PORT: Number(process.env.PORT) || 8080,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
};

if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured in .env");
}

if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured in .env");
}

module.exports = env;