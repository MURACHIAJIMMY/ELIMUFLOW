const Student = require('../models/student');
const Subject = require('../models/subject');
const SubjectSelection = require('../models/subjectSelection');
const StudentSubject = require('../models/studentSubject');
const School = require('../models/school');

// 📝 Controller: Initial subject selection by admission number
const selectSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo, electiveNames = [], languagePreference = 'KISW', mathChoice } = req.body;

    // 🔍 Resolve student and pathway
    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: req.user.schoolId // ✅ scoped by school
    }).populate('pathway');

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const pathwayId = student.pathway?._id;
    if (!pathwayId) return res.status(400).json({ error: 'Student has no pathway assigned.' });

    // 🧠 Check if selection already exists
    const existingLinks = await StudentSubject.find({
      student: student._id,
      school: req.user.schoolId // ✅ scoped by school
    });

    if (existingLinks.length > 0) {
      // 🧹 Clean up old electives
      await StudentSubject.deleteMany({
        student: student._id,
        category: 'Elective',
        school: req.user.schoolId // ✅ scoped
      });

      // 🧹 Clean up old language and math subjects
      const oldCodes = ['102', '504', '121', '122'];
      const oldChoiceSubjects = await Subject.find({
        code: { $in: oldCodes },
        school: req.user.schoolId // ✅ scoped
      });
      const oldChoiceIds = oldChoiceSubjects.map(sub => sub._id);
      await StudentSubject.deleteMany({
        student: student._id,
        subject: { $in: oldChoiceIds },
        school: req.user.schoolId // ✅ scoped
      });
    }

    // 📋 Fetch valid electives from pathway
    const pathwayElectives = await Subject.find({
      pathway: pathwayId,
      school: req.user.schoolId // ✅ scoped
    }).select('name _id pathway');

    const selectedElectives = pathwayElectives.filter(sub => electiveNames.includes(sub.name));

    if (selectedElectives.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 valid elective subjects must be selected from the pathway.' });
    }

    const fromPathwayCount = selectedElectives.filter(sub => sub.pathway?._id?.toString() === pathwayId.toString()).length;
    if (fromPathwayCount < 2) {
      return res.status(400).json({ error: 'At least 2 electives must be from the student\'s pathway.' });
    }

    // ✅ Dynamically resolve compulsory subjects
    const compulsoryCodes = [
      'CSL',
      '101',
      languagePreference === 'KSL' ? '504' : '102',
      student.pathway?.name === 'STEM'
        ? '121'
        : mathChoice === 'core'
        ? '121'
        : '122'
    ];

    const compulsorySubjectsRaw = await Subject.find({
      code: { $in: compulsoryCodes },
      school: req.user.schoolId // ✅ scoped
    });

    const mathSubject = compulsorySubjectsRaw.find(sub => sub.code === '121' || sub.code === '122');
    if (student.pathway?.name === 'STEM' && mathSubject?.code === '122') {
      return res.status(400).json({ error: 'STEM students must take Core Mathematics.' });
    }

    const compulsorySubjects = compulsorySubjectsRaw.map(sub => sub._id);

    // 🧮 Final subject list
    const finalSubjects = [...new Set([...compulsorySubjects, ...selectedElectives.map(s => s._id)])];
    if (finalSubjects.length !== 7) {
      return res.status(400).json({ error: 'Total subjects must be exactly 7.' });
    }

    // 🔁 Sync to Student model
    student.selectedSubjects = finalSubjects;
    await student.save();

    // 🔁 Sync to SubjectSelection
    await SubjectSelection.findOneAndUpdate(
      { student: student._id, school: req.user.schoolId }, // ✅ scoped
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    // 🔁 Sync to StudentSubject
    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      const category = isAuto ? 'Compulsory' : 'Elective';

      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId, school: req.user.schoolId }, // ✅ scoped
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category,
          term: 'Term 1',
          year: new Date().getFullYear(),
          school: req.user.schoolId // ✅ inject school context
        },
        { upsert: true, new: true }
      );
    }

    // 📊 Return resolved subject details
    const resolvedSubjects = await Subject.find({
      _id: { $in: finalSubjects },
      school: req.user.schoolId // ✅ scoped
    }).populate(['pathway', 'track']);

    res.status(200).json({
      message: 'Subjects selected successfully.',
      student: {
        name: student.name,
        admNo: student.admNo,
        pathway: student.pathway?.name
      },
      selectedSubjects: resolvedSubjects.map(sub => ({
        name: sub.name,
        code: sub.code,
        group: sub.group,
        pathway: sub.pathway?.name,
        track: sub.track?.name
      }))
    });
  } catch (err) {
    console.error('[selectSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Error selecting subjects.' });
  }
};

// ✏️ Get selected subjects by admission number
const getSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: req.user.schoolId // ✅ scoped by school
    }).populate('pathway');

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const subjectLinks = await StudentSubject.find({
      student: student._id,
      school: req.user.schoolId // ✅ scoped by school
    }).populate('subject', 'name code group lessonsPerWeek');

    if (!subjectLinks.length) {
      return res.status(200).json({
        admNo,
        studentName: student.name,
        totalSubjects: 0,
        compulsoryCount: 0,
        electiveCount: 0,
        isComplete: false,
        mathCompliance: 'unknown',
        subjects: []
      });
    }

    const subjects = subjectLinks
      .filter(link => link.subject)
      .map(link => ({
        subjectId: link.subject._id,
        name: link.subject.name,
        code: link.subject.code,
        group: link.subject.group,
        lessonsPerWeek: link.subject.lessonsPerWeek,
        autoAssigned: link.autoAssigned,
        category: link.category,
        term: link.term,
        year: link.year
      }));

    const total = subjects.length;
    const compulsoryCount = subjects.filter(s => s.category === 'Compulsory').length;
    const electiveCount = subjects.filter(s => s.category === 'Elective').length;
    const isComplete = total === 7;

    const hasCoreMath = subjects.some(s => s.code === 'MATH-CORE');
    const hasEssentialMath = subjects.some(s => s.code === 'MATH-ESS');

    let mathCompliance = 'valid';
    if (student.pathway?.name === 'STEM' && !hasCoreMath) {
      mathCompliance = 'invalid';
    } else if (student.pathway?.name !== 'STEM' && hasCoreMath && hasEssentialMath) {
      mathCompliance = 'conflict';
    }

    res.status(200).json({
      admNo,
      studentName: student.name,
      totalSubjects: total,
      compulsoryCount,
      electiveCount,
      isComplete,
      mathCompliance,
      subjects
    });
  } catch (err) {
    console.error('[getSelectedSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Error fetching selected subjects.' });
  }
};

// ✍️ Update selected subjects by admission number
const updateSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const { subjectNames = [], languagePreference = 'KISW', mathChoice } = req.body;

    if (!Array.isArray(subjectNames) || subjectNames.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 elective subjects must be selected' });
    }

    // 🔍 Resolve student and pathway
    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: req.user.schoolId // ✅ scoped by school
    }).populate('pathway');

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const pathwayId = student.pathway?._id;
    if (!pathwayId) return res.status(400).json({ error: 'Student has no pathway assigned' });

    // 🧹 Delete existing electives
    await StudentSubject.deleteMany({
      student: student._id,
      category: 'Elective',
      school: req.user.schoolId // ✅ scoped
    });

    // 🧹 Delete old language and math choices
    const oldCodes = ['102', '504', '121', '122'];
    const oldChoiceSubjects = await Subject.find({
      code: { $in: oldCodes },
      school: req.user.schoolId // ✅ scoped
    });
    const oldChoiceIds = oldChoiceSubjects.map(sub => sub._id);
    await StudentSubject.deleteMany({
      student: student._id,
      subject: { $in: oldChoiceIds },
      school: req.user.schoolId // ✅ scoped
    });

    // 📋 Resolve elective subjects
    const electiveSubjects = await Subject.find({
      name: { $in: subjectNames },
      school: req.user.schoolId // ✅ scoped
    }).populate(['pathway', 'track']);

    if (electiveSubjects.length !== 3) {
      return res.status(400).json({ error: 'One or more subject names are invalid' });
    }

    const fromPathwayCount = electiveSubjects.filter(sub => sub.pathway?._id?.toString() === pathwayId.toString()).length;
    if (fromPathwayCount < 2) {
      return res.status(400).json({ error: 'At least 2 electives must be from the selected pathway' });
    }

    // ✅ Dynamically resolve compulsory subjects
    const compulsoryCodes = [
      'CSL',
      '101',
      languagePreference === 'KSL' ? '504' : '102',
      student.pathway?.name === 'STEM'
        ? '121'
        : mathChoice === 'core'
        ? '121'
        : '122'
    ];

    const compulsorySubjectsRaw = await Subject.find({
      code: { $in: compulsoryCodes },
      school: req.user.schoolId // ✅ scoped
    });

    const mathSubject = compulsorySubjectsRaw.find(sub => sub.code === '122');
    if (student.pathway?.name === 'STEM' && mathSubject) {
      return res.status(400).json({ error: 'STEM students must take Core Mathematics.' });
    }

    const compulsorySubjects = compulsorySubjectsRaw.map(sub => sub._id);

    // 🧮 Final subject list
    const finalSubjects = [...new Set([...compulsorySubjects, ...electiveSubjects.map(s => s._id)])];
    if (finalSubjects.length !== 7) {
      return res.status(400).json({ error: 'Total subjects must be exactly 7.' });
    }

    // 🔁 Sync to SubjectSelection
    await SubjectSelection.findOneAndUpdate(
      { student: student._id, school: req.user.schoolId }, // ✅ scoped
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    // 🔁 Sync to Student model
    student.selectedSubjects = finalSubjects;
    await student.save();

    // 🔁 Sync to StudentSubject
    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      const category = isAuto ? 'Compulsory' : 'Elective';

      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId, school: req.user.schoolId }, // ✅ scoped
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category,
          term: 'Term 1',
          year: new Date().getFullYear(),
          school: req.user.schoolId // ✅ inject school context
        },
        { upsert: true, new: true }
      );
    }

    // 📊 Return resolved subject details
    const resolvedSubjects = await Subject.find({
      _id: { $in: finalSubjects },
      school: req.user.schoolId // ✅ scoped
    }).populate(['pathway', 'track']);

    res.status(200).json({
      message: 'Subjects updated successfully.',
      student: {
        name: student.name,
        admNo: student.admNo,
        pathway: student.pathway?.name
      },
      selectedSubjects: resolvedSubjects.map(sub => ({
        name: sub.name,
        code: sub.code,
        group: sub.group,
        pathway: sub.pathway?.name,
        track: sub.track?.name
      }))
    });
  } catch (err) {
    console.error('[updateSelectedSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Server error during subject update.' });
  }
};

// ✂️ Delete selected elective subjects by admission number
const deleteSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: req.user.schoolId // ✅ scoped by school
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 🚫 Delete only manually selected electives
    const result = await StudentSubject.deleteMany({
      student: student._id,
      category: 'Elective',
      school: req.user.schoolId // ✅ scoped by school
    });

    // ✅ Fetch remaining compulsory subjects
    const remaining = await StudentSubject.find({
      student: student._id,
      category: 'Compulsory',
      school: req.user.schoolId // ✅ scoped by school
    });

    const updatedSubjectIds = remaining.map(s => s.subject);

    // ✅ Update Student model
    student.selectedSubjects = updatedSubjectIds;
    await student.save();

    // ✅ Update SubjectSelection model
    await SubjectSelection.findOneAndUpdate(
      { student: student._id, school: req.user.schoolId }, // ✅ scoped
      { selectedSubjects: updatedSubjectIds },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: 'Selected elective subjects deleted successfully',
      deletedCount: result.deletedCount,
      remainingCompulsoryCount: updatedSubjectIds.length
    });
  } catch (err) {
    console.error('[deleteSelectedSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Error deleting selected subjects' });
  }
};

// ✅ Validate all students' subject selections for CBC compliance
const validateAllSubjectSelections = async (req, res) => {
  try {
    const students = await Student.find({ school: req.user.schoolId }).populate('pathway');

    // 🧠 Dynamically fetch all compulsory subjects
    const compulsorySubjects = await Subject.find({
      compulsory: true,
      school: req.user.schoolId
    });

    const compulsoryMap = Object.fromEntries(compulsorySubjects.map(s => [s.code, s._id.toString()]));

    const report = [];

    for (const student of students) {
      const subjectLinks = await StudentSubject.find({
        student: student._id,
        school: req.user.schoolId
      }).populate('subject pathway');

      const selected = subjectLinks.map(link => link.subject._id.toString());
      const total = selected.length;

      // ✅ Validate compulsory presence by code
      const hasEnglish = selected.includes(compulsoryMap['101']);
      const hasCSL = selected.includes(compulsoryMap['CSL']);
      const hasLanguage = selected.includes(compulsoryMap['102']) || selected.includes(compulsoryMap['504']);
      const hasMath = selected.includes(compulsoryMap['121']) || selected.includes(compulsoryMap['122']);

      const compulsoryValid = hasEnglish && hasCSL && hasLanguage && hasMath;

      const electiveLinks = subjectLinks.filter(link => link.category === 'Elective');
      const electiveSubjects = electiveLinks.map(link => link.subject);
      const fromPathway = electiveSubjects.filter(sub => sub.pathway?._id?.toString() === student.pathway?._id?.toString());

      const issues = [];
      if (!compulsoryValid) issues.push('Missing compulsory subjects');
      if (electiveLinks.length !== 3) issues.push('Must select exactly 3 electives');
      if (fromPathway.length < 2) issues.push('At least 2 electives must be from chosen pathway');
      if (total !== 7) issues.push('Total subjects must be exactly 7');

      report.push({
        admNo: student.admNo,
        name: student.name,
        pathway: student.pathway?.name ?? '—',
        totalSubjects: total,
        electiveCount: electiveLinks.length,
        fromPathwayCount: fromPathway.length,
        compliant: issues.length === 0,
        issues
      });
    }

    res.status(200).json({ message: 'CBC subject validation complete.', report });
  } catch (err) {
    console.error('[validateAllSubjectSelections]', err);
    res.status(500).json({ error: 'Error validating subject selections.' });
  }
};

// 📋 Controller: Get available electives for a student's pathway
const getStudentElectivesForPathway = async (req, res) => {
  try {
    const { admNo } = req.params;

    // 🔍 Find student scoped by school
    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: req.user.schoolId // ✅ scoped by school
    }).populate('pathway');

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    if (!student.pathway?._id) {
      return res.status(400).json({ error: 'Student has no pathway assigned.' });
    }

    // 📋 Fetch non-compulsory subjects for student's pathway
    const electives = await Subject.find({
      pathway: student.pathway._id,
      compulsory: false,
      school: req.user.schoolId // ✅ scoped by school
    }).select('name code group lessonsPerWeek');

    res.status(200).json({
      student: {
        admNo: student.admNo,
        name: student.name,
        pathway: student.pathway.name
      },
      electives
    });

  } catch (err) {
    console.error('[getStudentElectivesForPathway]', err);
    res.status(500).json({ error: 'Error fetching elective options.' });
  }
};

module.exports = {
  selectSubjectsByAdmNo,
  getSelectedSubjectsByAdmNo,
  updateSelectedSubjectsByAdmNo,
  deleteSelectedSubjectsByAdmNo,
  validateAllSubjectSelections,
  getStudentElectivesForPathway
};
