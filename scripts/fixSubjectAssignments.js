require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/student');
const StudentSubject = require('../models/studentSubject');
const Subject = require('../models/subject');

mongoose.connect(process.env.MONGO_URI);

const fixSubjects = async () => {
  try {
    const students = await Student.find();

    for (const student of students) {
      const links = await StudentSubject.find({ student: student._id }).populate('subject');

      const subjectCodes = links.map(link => link.subject.code);

      const keepMath = subjectCodes.includes('CORE-MATH') ? 'CORE-MATH' : 'ESS-MATH';
      const keepLang = subjectCodes.includes('KISW') ? 'KISW' : 'KSL';

      const toRemove = links.filter(link =>
        (['CORE-MATH', 'ESS-MATH'].includes(link.subject.code) && link.subject.code !== keepMath) ||
        (['KISW', 'KSL'].includes(link.subject.code) && link.subject.code !== keepLang)
      );

      for (const link of toRemove) {
        await StudentSubject.deleteOne({ _id: link._id });
      }

      console.log(`✅ Cleaned ${student.name} (${student.admNo})`);
    }

    console.log('🎯 Subject cleanup complete');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  } finally {
    mongoose.disconnect();
  }
};

fixSubjects();
