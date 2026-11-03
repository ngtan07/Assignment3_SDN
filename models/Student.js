const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({
    studentCode: String,
    fullName: String,
    email: String
})

const Student = mongoose.model('Student', studentSchema)
module.exports = Student