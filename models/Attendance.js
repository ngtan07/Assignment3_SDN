const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    date: Date,
    status: {
        type: String,
        enum: ['PRESENT', 'ABSENT']
    }
});
const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance
