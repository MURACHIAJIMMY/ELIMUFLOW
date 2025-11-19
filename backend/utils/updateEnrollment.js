const Student = require('../models/student');
const Class = require('../models/class');

const updateEnrollment = async () => {
  try {
    const students = await Student.find({ status: 'active' });
    const academicYear = new Date().getFullYear();

    let updatedCount = 0;
    const auditTrail = [];

    for (const student of students) {
      const grade = student.currentGrade;

      const defaultClass = await Class.findOne({
        grade,
        isDefault: true,
        academicYear
      });

      const previousClass = student.class;
      const previousYear = student.enrollmentYear;

      if (defaultClass) {
        student.class = defaultClass.name;
      }

      student.subjectCount = student.subjects?.length || 0;
      student.enrollmentYear = academicYear;

      await student.save();
      updatedCount++;

      auditTrail.push({
        admNo: student.admNo,
        name: student.fullName || `${student.firstName} ${student.lastName}`,
        fromClass: previousClass,
        toClass: student.class,
        fromYear: previousYear,
        toYear: academicYear
      });
    }

    console.log(`📘 Enrollment sync completed: ${updatedCount} students updated`);
    console.table(auditTrail); // Optional: logs each change in tabular format

    return {
      updatedCount,
      auditTrail
    };
  } catch (err) {
    console.error('[UpdateEnrollment]', err);
    throw err;
  }
};

module.exports = updateEnrollment;
