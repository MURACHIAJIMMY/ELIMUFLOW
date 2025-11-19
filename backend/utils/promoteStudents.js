const Student = require('../models/student');
const promoteStudents = async () => {
  try {
    const students = await Student.find({ status: 'active' });

    for (const student of students) {
      const fromGrade = student.currentGrade;

      if (fromGrade === 12) {
        student.status = 'graduated';
      } else {
        student.currentGrade += 1;
      }

      student.promotionHistory.push({
        year: new Date().getFullYear(),
        fromGrade,
        toGrade: student.currentGrade,
        promotedAt: new Date()
      });

      await student.save();
    }

    console.log('🎓 Promotion cycle completed');
  } catch (err) {
    console.error('[PromoteStudents]', err);
  }
};

module.exports = promoteStudents;
