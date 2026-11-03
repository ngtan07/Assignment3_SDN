const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const verifyToken = require('../middleware/auth.middleware');
const env = require('../config/env');
const router = express.Router();

const JWT_SECRET = env.JWT_SECRET

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(402).json({ error: "Email and password are required" });
        }

        const student = await Student.findOne({ email });
        if (!student || student.password !== password) {
            return res.status(402).json({ error: "Invalid login credentials" });
        }
        const payload = {
            id: student._id,
            email: student.email,
            studentCode: student.studentCode,
            role: student.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/classes/:classId/students', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        let { status } = req.query;

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({ error: `Invalid classId: ${classId}` });
        }

        if (!status) {
            status = 'enrolled';
        }

        if (!['enrolled', 'dropped'].includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}` });
        }

        const classData = await Class.findById(classId).populate('enrollments.studentId');

        if (!classData) {
            return res.status(404).json({ error: `Class with id=${classId} not found` });
        }

        const students = classData.enrollments
            .filter(e => e.status === status && e.studentId)
            .map(e => ({
                studentId: e.studentId._id,
                studentCode: e.studentId.studentCode,
                fullName: e.studentId.fullName,
                email: e.studentId.email
            }));

        return res.status(200).json(students);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


router.get('/classes/:classId/attendance-summary', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(404).json({ error: `Class with id ${classId} not found` });
        }

        const classData = await Class.findById(classId).populate('enrollments.studentId');

        if (!classData) {
            return res.status(404).json({ error: `Class with id ${classId} not found` });
        }

        const enrolledStudents = classData.enrollments.filter(e => e.status === 'enrolled' && e.studentId);

        const summary = [];

        for (const item of enrolledStudents) {
            const student = item.studentId;

            const attendances = await Attendance.find({
                classId: classId,
                studentId: student._id
            });

            const totalSessions = attendances.length;
            const present = attendances.filter(a => a.status === 'PRESENT').length;
            const absent = attendances.filter(a => a.status === 'ABSENT').length;

            let attendanceRate = 0;
            let warning = true;

            if (totalSessions > 0) {
                attendanceRate = Number(((present / totalSessions) * 100).toFixed(1));
                warning = attendanceRate < 80;
            }

            summary.push({
                studentCode: student.studentCode,
                fullName: student.fullName,
                totalSessions,
                present,
                absent,
                attendanceRate,
                warning
            });
        }

        return res.status(200).json(summary);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.get('/students/:studentId/attendances', verifyToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ error: `Invalid studentId: ${studentId}` });
        }
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: `Student with id ${studentId} not found` });
        }

        const attendances = await Attendance.find({ studentId: studentId })
            .populate({
                path: 'classId',
                populate: { path: 'subjectId' }
            })
            .sort({ date: -1 });

        const result = attendances.map(att => ({
            id: att._id,
            className: att.classId ? att.classId.className : null,
            subjectName: (att.classId && att.classId.subjectId) ? att.classId.subjectId.name : null,
            date: att.date,
            status: att.status
        }));

        return res.status(200).json(result);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


router.post('/classes/:classId/attendances', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const { date, records } = req.body;

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({ error: `Invalid classId: ${classId}` });
        }

        const classData = await Class.findById(classId).populate('enrollments.studentId');

        if (!classData) {
            return res.status(404).json({ error: `Class with id=${classId} not found` });
        }

        if (!date) {
            return res.status(400).json({ error: "Date is required" });
        }

        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inputDate > today) {
            return res.status(400).json({ error: "Date cannot be in the future" });
        }

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: "Records are missing or empty" });
        }

        const enrolledStudents = classData.enrollments.filter(e => e.status === 'enrolled' && e.studentId);
        const enrolledStudentIds = enrolledStudents.map(e => e.studentId._id.toString());

        for (const enrolled of enrolledStudents) {
            const found = records.find(r => r.studentId === enrolled.studentId._id.toString());
            if (!found) {
                return res.status(400).json({
                    error: `Missing attendance for student ${enrolled.studentId.studentCode} (${enrolled.studentId.fullName})`
                });
            }
        }

        let presentCount = 0;
        let absentCount = 0;
        let updatedCount = 0;

        for (const rec of records) {
            if (!enrolledStudentIds.includes(rec.studentId)) {
                return res.status(400).json({ error: `Student ${rec.studentId} does not belong to class` });
            }

            if (!['PRESENT', 'ABSENT'].includes(rec.status)) {
                return res.status(400).json({ error: `Invalid status: ${rec.status}` });
            }

            if (rec.status === 'PRESENT') presentCount++;
            if (rec.status === 'ABSENT') absentCount++;

            const existing = await Attendance.findOne({
                classId: classId,
                studentId: rec.studentId,
                date: inputDate
            });

            if (existing) {
                updatedCount++;
                existing.status = rec.status;
                await existing.save();
            } else {
                await Attendance.create({
                    classId: classId,
                    studentId: rec.studentId,
                    date: inputDate,
                    status: rec.status
                });
            }
        }

        return res.status(201).json({
            message: "Attendance recorded successfully",
            totalRecords: records.length,
            present: presentCount,
            absent: absentCount,
            updatedCount: updatedCount
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router