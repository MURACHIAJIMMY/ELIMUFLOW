require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/student');
const StudentSubject = require('../models/StudentSubject');
const Subject = require('../models/subject');

// 🔗 Connect using Atlas URI from .env
mongoose.connect(process.env.MONGO_URI);

const viewSubjects = async () => {
  try {
    const students = await Student.find();

    if (students.length === 0) {
      console.log('⚠️ No students found in the database.');
      return;
    }

    for (const student of students) {
      const links = await StudentSubject.find({ student: student._id }).populate('subject');

      if (links.length === 0) {
        console.log(`📘 ${student.name} (${student.admNo}): No subjects assigned`);
        continue;
      }

      const subjects = links.map(link => ({
        code: link.subject.code,
        name: link.subject.name
      }));

      console.log(`📘 ${student.name} (${student.admNo}):`);
      subjects.forEach(sub => {
        console.log(`   - ${sub.code}: ${sub.name}`);
      });
      console.log('');
    }
  } catch (err) {
    console.error('❌ Error fetching subjects:', err);
  } finally {
    mongoose.disconnect();
  }
};

viewSubjects();
