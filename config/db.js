const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
    try {
        await mongoose.connect(env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error("MongoDB connection failed: ", error);
        process.exit(1);
    }
};

module.exports = connectDB;