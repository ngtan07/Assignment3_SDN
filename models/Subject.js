const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    code: String,
    name: String,
    credits: Number,
    status: String
});

const Subject = mongoose.model('Subject', subjectSchema);
module.exports = Subject