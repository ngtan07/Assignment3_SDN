const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    className: String,
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },
    lecturerName: String,
    status: {
        type: String,
        enum: ['OPEN', 'CLOSED']
    },
    enrollments: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        },
        status: {
            type: String,
            enum: ['ENROLLED', 'DROPPED']
        },

    }]
});

const Class = mongoose.model('Class', classSchema);

module.exports = Class