const Student = require('../models/student');
const Class = require('../models/class');

const promoteStudents = async ({ triggeredBy = 'system' } = {}) => {
  try {
    const academicYear = new Date().getFullYear();
    const students = await Student.find({ status: 'active' });

    for (const student of students) {
      const fromGrade = student.currentGrade;

      if (fromGrade === 12) {
        student.status = 'graduated';
      } else {
        const toGrade = fromGrade + 1;
        student.currentGrade = toGrade;

        // 🔄 Find default class for new grade
        const defaultClass = await Class.findOne({
          grade: toGrade,
          isDefault: true,
          academicYear
        });

        if (defaultClass) {
          student.class = defaultClass._id;
        }

        student.promotionHistory.push({
          year: academicYear,
          fromGrade,
          toGrade,
          promotedAt: new Date(),
          triggeredBy
        });
      }

      await student.save();
    }

    console.log('🎓 Promotion + class reassignment completed');
  } catch (err) {
    console.error('[PromoteStudents]', err);
  }
};

module.exports = promoteStudents;
