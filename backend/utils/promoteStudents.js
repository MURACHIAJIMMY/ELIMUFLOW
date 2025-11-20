const Student = require('../models/student');
const Class = require('../models/class');

const promoteStudents = async ({ triggeredBy = 'system' } = {}) => {
  try {
    const academicYear = new Date().getFullYear();

    // Fetch active students and populate their current class to access stream
    const students = await Student.find({ status: 'active' }).populate('class');

    for (const student of students) {
      const fromGrade = student.currentGrade;

      if (fromGrade === 12) {
        // Graduate Grade 12 students
        student.status = 'graduated';
      } else {
        const toGrade = fromGrade + 1;
        student.currentGrade = toGrade;

        // 🔄 Find the matching class in the same stream for the new grade
        const stream = student.class?.stream; // keep same stream (E, N, S, etc.)
        const nextClass = await Class.findOne({
          grade: toGrade,
          stream,
          school: student.school,
          academicYear
        });

        if (nextClass) {
          student.class = nextClass._id;
        } else {
          console.warn(
            `⚠️ No class found for grade ${toGrade}, stream ${stream}, year ${academicYear}`
          );
        }

        // Log promotion history
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

    console.log('🎓 Promotion updated grade + class successfully');
  } catch (err) {
    console.error('[PromoteStudents]', err);
  }
};

module.exports = promoteStudents;
