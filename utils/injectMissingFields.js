const Student = require('../models/student');

const injectMissingFields = async () => {
  try {
    const students = await Student.find({ status: 'active' });

    let updated = 0;
    const auditTrail = [];

    for (const student of students) {
      let changed = false;

      // ✅ Extract grade from class string like "10N"
      if (!student.currentGrade && typeof student.class === 'string') {
        const match = student.class.match(/^(\d+)/);
        if (match) {
          student.currentGrade = parseInt(match[1]);
          changed = true;
        }
      }

      // ✅ Inject enrollmentYear if missing
      if (!student.enrollmentYear) {
        student.enrollmentYear = new Date().getFullYear();
        changed = true;
      }

      // ✅ Inject subjectCount based on selectedSubjects
      if (!student.subjectCount || student.subjectCount === 0) {
        student.subjectCount = student.selectedSubjects?.length || 0;
        changed = true;
      }

      if (changed) {
        await student.save();
        updated++;
        auditTrail.push({
          admNo: student.admNo,
          name: student.name,
          updatedFields: {
            currentGrade: student.currentGrade,
            enrollmentYear: student.enrollmentYear,
            subjectCount: student.subjectCount
          }
        });
      }
    }

    console.log(`✅ Injected missing fields into ${updated} students`);
    console.table(auditTrail);
    return { updated, auditTrail };
  } catch (err) {
    console.error('[InjectMissingFields]', err);
    throw err;
  }
};

module.exports = injectMissingFields;
