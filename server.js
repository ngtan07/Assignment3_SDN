const express = require('express');
const env = require('./config/env');
const connectDB = require('./config/db');
const app = express();
const router = require('./routes/api.routes')

app.use(express.json())

app.use('/api', router);




const PORT = process.env.PORT || 9999;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error("Database connection failed, server not started.");
});