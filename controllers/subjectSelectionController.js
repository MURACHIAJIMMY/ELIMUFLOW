const Student = require('../models/student');
const Subject = require('../models/subject');
const SubjectSelection = require('../models/subjectSelection');
const StudentSubject = require('../models/studentSubject');

// 📝 Controller: Initial subject selection by admission number
const selectSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo, electiveNames = [], languagePreference = 'KISW', mathChoice } = req.body;

    // 🔍 Resolve student and pathway
    const student = await Student.findOne({ admNo: admNo.toUpperCase() }).populate('pathway');
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // 🧠 Check if selection already exists
    const existingLinks = await StudentSubject.find({ student: student._id });
    const alreadySelected = existingLinks.length === 7;

    if (alreadySelected) {
      // 🧹 Clean up old electives only — allow re-selection
      await StudentSubject.deleteMany({ student: student._id, category: 'Elective' });
    }

    const pathwayId = student.pathway?._id;
    if (!pathwayId) return res.status(400).json({ error: 'Student has no pathway assigned.' });

    // 📋 Fetch valid electives from pathway
    const pathwayElectives = await Subject.find({ pathway: pathwayId }).select('name _id pathway');
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
      'CSL', // Community Service Learning
      '101', // English
      languagePreference === 'KSL' ? '504' : '102', // Kiswahili or KSL
      student.pathway?.name === 'STEM'
        ? '121'
        : mathChoice === 'core'
        ? '121'
        : '122' // Math logic
    ];

    const compulsorySubjectsRaw = await Subject.find({ code: { $in: compulsoryCodes } });
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
      { student: student._id },
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    // 🔁 Sync to StudentSubject
    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      const category = isAuto ? 'Compulsory' : 'Elective';

      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId },
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category,
          term: 'Term 1',
          year: new Date().getFullYear()
        },
        { upsert: true, new: true }
      );
    }

    // 📊 Return resolved subject details
    const resolvedSubjects = await Subject.find({ _id: { $in: finalSubjects } }).populate(['pathway', 'track']);

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

    const student = await Student.findOne({ admNo: admNo.toUpperCase() })
      .populate('pathway');

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const subjectLinks = await StudentSubject.find({ student: student._id })
      .populate('subject', 'name code group lessonsPerWeek');

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

// ✏️ Update elective subjects by admission number
const updateSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const { subjectNames = [], languagePreference = 'KISW', mathChoice } = req.body;

    if (!Array.isArray(subjectNames) || subjectNames.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 elective subjects must be selected' });
    }

    const student = await Student.findOne({ admNo: admNo.toUpperCase() }).populate('pathway track');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const pathwayId = student.pathway?._id?.toString();
    if (!pathwayId) return res.status(400).json({ error: 'Student has no pathway assigned' });

    // 🧹 Delete existing electives only
    await StudentSubject.deleteMany({ student: student._id, category: 'Elective' });

    // 📋 Resolve elective subjects
    const electiveSubjects = await Subject.find({ name: { $in: subjectNames } }).populate(['pathway', 'track']);
    if (electiveSubjects.length !== 3) {
      return res.status(400).json({ error: 'One or more subject names are invalid' });
    }

    const fromPathway = electiveSubjects.filter(sub => sub.pathway?._id?.toString() === pathwayId);
    if (fromPathway.length < 2) {
      return res.status(400).json({ error: 'At least 2 electives must be from the selected pathway' });
    }

    // ✅ Dynamically resolve compulsory subjects by name
    const compulsorySubjectsRaw = await Subject.find({
      name: {
        $in: [
          'Community Service Learning',
          'English',
          languagePreference === 'KSL' ? 'Kenya Sign Language' : 'Kiswahili',
          student.pathway?.name === 'STEM' || mathChoice === 'core'
            ? 'CORE-Mathematics'
            : 'ESS-Mathematics'
        ]
      }
    });

    const csl = compulsorySubjectsRaw.find(sub => sub.name === 'Community Service Learning');
    const eng = compulsorySubjectsRaw.find(sub => sub.name === 'English');
    const selectedLang = compulsorySubjectsRaw.find(sub =>
      sub.name === (languagePreference === 'KSL' ? 'Kenya Sign Language' : 'Kiswahili')
    );
    const selectedMath = compulsorySubjectsRaw.find(sub =>
      sub.name === (student.pathway?.name === 'STEM' || mathChoice === 'core'
        ? 'CORE-Mathematics'
        : 'ESS-Mathematics')
    );

    if (student.pathway?.name === 'STEM' && selectedMath?.name === 'ESS-Mathematics') {
      return res.status(400).json({ error: 'STEM students must take Core Mathematics' });
    }

    // 🔍 Determine current compulsory subjects
    const currentCompulsories = await StudentSubject.find({
      student: student._id,
      category: 'Compulsory'
    });

    const updatedCompulsories = [];

    // ✅ Always include CSL and ENG
    if (csl?._id) updatedCompulsories.push(csl._id);
    if (eng?._id) updatedCompulsories.push(eng._id);

    // 🔁 Language logic
  const existingLang = currentCompulsories.find(sub =>
  ['Kiswahili', 'Kenya Sign Language'].includes(sub.subjectName)
);

if (!existingLang || existingLang.subject.toString() !== selectedLang?._id?.toString()) {
  await StudentSubject.deleteMany({
    student: student._id,
    subject: { $in: [kisw?._id, ksl?._id].filter(Boolean) }
  });
  if (selectedLang?._id) updatedCompulsories.push(selectedLang._id);
} else {
  updatedCompulsories.push(existingLang.subject);
}
// 🔁 Mathematics logic
   const existingMath = currentCompulsories.find(sub =>
  ['CORE-Mathematics', 'ESS-Mathematics'].includes(sub.subjectName)
);

if (!existingMath || existingMath.subject.toString() !== selectedMath?._id?.toString()) {
  await StudentSubject.deleteMany({
    student: student._id,
    subject: { $in: [coreMath?._id, essMath?._id].filter(Boolean) }
  });
  if (selectedMath?._id) updatedCompulsories.push(selectedMath._id);
} else {
  updatedCompulsories.push(existingMath.subject);
}
    // 🧮 Final subject list
    const finalSubjects = [...new Set([...updatedCompulsories, ...electiveSubjects.map(s => s._id)])];
    if (finalSubjects.length !== 7) {
      return res.status(400).json({ error: 'Total subjects must be exactly 7' });
    }

    // 🔁 Sync to SubjectSelection
    await SubjectSelection.findOneAndUpdate(
      { student: student._id },
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    // 🔁 Sync to Student model
    student.selectedSubjects = finalSubjects;
    await student.save();

    // 🔁 Sync to StudentSubject model
    for (const subjectId of finalSubjects) {
      const isAuto = updatedCompulsories.includes(subjectId);
      const category = isAuto ? 'Compulsory' : 'Elective';

      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId },
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category,
          term: 'Term 1',
          year: new Date().getFullYear()
        },
        { upsert: true, new: true }
      );
    }

    // 📊 Return resolved subject details
    const resolvedSubjects = await Subject.find({ _id: { $in: finalSubjects } }).populate(['pathway', 'track']);

    res.status(200).json({
      message: 'Subjects updated successfully',
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
    res.status(500).json({ error: 'Server error during subject update' });
  }
};

// ✂️ Delete selected elective subjects by admission number
const deleteSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;

    const student = await Student.findOne({ admNo: admNo.toUpperCase() });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 🚫 Delete only manually selected electives
    const result = await StudentSubject.deleteMany({
      student: student._id,
      category: 'Elective'
    });

    // ✅ Fetch remaining compulsory subjects
    const remaining = await StudentSubject.find({
      student: student._id,
      category: 'Compulsory'
    });

    const updatedSubjectIds = remaining.map(s => s.subject);

    // ✅ Update Student model
    student.selectedSubjects = updatedSubjectIds;
    await student.save();

    // ✅ Update SubjectSelection model
    await SubjectSelection.findOneAndUpdate(
      { student: student._id },
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
    const students = await Student.find().populate('pathway');

    const compulsoryCodes = ['ENG', 'CSL', 'KISW', 'KSL', 'MATH-CORE', 'MATH-ESS'];
    const compulsorySubjects = await Subject.find({ code: { $in: compulsoryCodes } });
    const compulsoryMap = Object.fromEntries(compulsorySubjects.map(s => [s.code, s._id.toString()]));

    const report = [];

    for (const student of students) {
      const subjectLinks = await StudentSubject.find({ student: student._id }).populate('subject pathway');

      const selected = subjectLinks.map(link => link.subject._id.toString());
      const total = selected.length;

      const hasEnglish = selected.includes(compulsoryMap['ENG']);
      const hasCSL = selected.includes(compulsoryMap['CSL']);
      const hasLanguage = selected.includes(compulsoryMap['KISW']) || selected.includes(compulsoryMap['KSL']);
      const hasMath = selected.includes(compulsoryMap['MATH-CORE']) || selected.includes(compulsoryMap['MATH-ESS']);

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

    // Find student and populate pathway
    const student = await Student.findOne({ admNo: admNo.toUpperCase() }).populate('pathway');
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    if (!student.pathway?._id) {
      return res.status(400).json({ error: 'Student has no pathway assigned.' });
    }

    // Fetch subjects for student's pathway that are NOT compulsory (i.e. electives)
    const electives = await Subject.find({
      pathway: student.pathway._id,
      compulsory: false // Only non-compulsory subjects for selection
    }).select('name code group lessonsPerWeek');

    // Optionally, also return student info (useful for frontend)
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
