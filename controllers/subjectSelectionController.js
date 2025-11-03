const Student = require('../models/student');
const Subject = require('../models/subject');
const SubjectSelection = require('../models/subjectSelection');
const StudentSubject = require('../models/studentSubject');

// select subjects by admission number
const selectSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo, selectedSubjects = [], languagePreference = 'KISW', mathChoice } = req.body;

    const student = await Student.findOne({ admNo: admNo.toUpperCase() }).populate('pathway');
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    if (student.selectedSubjects?.length === 7) {
      return res.status(400).json({ error: 'Subject selection already completed for this student.' });
    }

    // ✅ Fetch compulsory subjects
    const [english, csl, kiswahili, ksl, coreMath, essentialMath] = await Promise.all([
      Subject.findOne({ code: 'ENG' }),
      Subject.findOne({ code: 'CSL' }),
      Subject.findOne({ code: 'KISW' }),
      Subject.findOne({ code: 'KSL' }),
      Subject.findOne({ code: 'MATH-CORE' }),
      Subject.findOne({ code: 'MATH-ESS' })
    ]);

    // ✅ Enforce CBC math rule
    let mathSubject;
    if (student.pathway?.name === 'STEM') {
      if (mathChoice === 'essential') {
        return res.status(400).json({ error: 'Students in the STEM pathway must take Core Mathematics.' });
      }
      mathSubject = coreMath;
    } else {
      mathSubject = mathChoice === 'core' ? coreMath : essentialMath;
    }

    const compulsorySubjects = [
      english?._id,
      csl?._id,
      languagePreference === 'KSL' ? ksl?._id : kiswahili?._id,
      mathSubject?._id
    ].filter(Boolean);

    // ✅ Validate electives
    if (selectedSubjects.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 elective subjects must be selected.' });
    }

    const electives = await Subject.find({ _id: { $in: selectedSubjects } }).populate('pathway');
    if (electives.length !== 3) {
      return res.status(400).json({ error: 'Some selected subjects are invalid.' });
    }

    const pathwayId = student.pathway?._id?.toString();
    const fromPathway = electives.filter(sub => sub.pathway?._id?.toString() === pathwayId);

    if (fromPathway.length < 2) {
      return res.status(400).json({
        error: 'At least 2 elective subjects must be from the selected pathway.'
      });
    }

    const finalSubjects = [...new Set([...compulsorySubjects, ...selectedSubjects])];
    if (finalSubjects.length !== 7) {
      return res.status(400).json({ error: 'Total subjects must be exactly 7.' });
    }

    // ✅ Save to Student model
    student.selectedSubjects = finalSubjects;
    await student.save();

    // ✅ Sync to SubjectSelection model
    await SubjectSelection.findOneAndUpdate(
      { student: student._id },
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    // ✅ Sync to StudentSubject model
    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId },
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          term: 'Term 1', // You can make this dynamic if needed
          year: new Date().getFullYear()
        },
        { upsert: true, new: true }
      );
    }

    // ✅ Return resolved subject details
    const resolvedSubjects = await Subject.find({ _id: { $in: finalSubjects } }).populate(['pathway', 'track']);

    res.status(200).json({
      message: 'Subjects selected successfully.',
      selectedSubjects: resolvedSubjects.map(sub => ({
        name: sub.name,
        code: sub.code,
        group: sub.group,
        pathway: sub.pathway?.name,
        track: sub.track?.name
      }))
    });
  } catch (err) {
    console.error('[SelectSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Error selecting subjects.' });
  }
};

const getSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;

    const student = await Student.findOne({ admNo: admNo.toUpperCase() })
      .populate('pathway')
      .populate({
        path: 'selectedSubjects',
        select: 'name code group compulsory lessonsPerWeek'
      });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (!student.selectedSubjects || student.selectedSubjects.length === 0) {
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

    const subjects = student.selectedSubjects.map(s => ({
      subjectId: s._id,
      name: s.name,
      code: s.code,
      group: s.group,
      compulsory: s.compulsory,
      lessonsPerWeek: s.lessonsPerWeek
    }));

    const total = subjects.length;
    const compulsoryCount = subjects.filter(s => s.compulsory).length;
    const electiveCount = total - compulsoryCount;
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
    console.error('[GetSelectedSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Error fetching selected subjects.' });
  }
};

// ✏️ Update selected elective subjects by admission number
const updateSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const { subjectNames, languagePreference = 'KISW', mathChoice } = req.body;

    if (!Array.isArray(subjectNames)) {
      return res.status(400).json({ error: 'subjectNames must be an array' });
    }

    const student = await Student.findOne({ admNo: admNo.toUpperCase() }).populate('pathway track');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const subjects = await Subject.find({ name: { $in: subjectNames } }).populate(['pathway', 'track']);
    if (subjects.length !== subjectNames.length) {
      return res.status(400).json({ error: 'One or more subject names are invalid' });
    }

    if (subjects.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 elective subjects must be selected' });
    }

    const pathwayId = student.pathway?._id?.toString();
    const fromPathway = subjects.filter(sub => sub.pathway?._id?.toString() === pathwayId);
    if (fromPathway.length < 2) {
      return res.status(400).json({
        error: 'At least 2 elective subjects must be from the selected pathway'
      });
    }

    const [english, kiswahili, ksl, csl, coreMath, essentialMath] = await Promise.all([
      Subject.findOne({ code: 'ENG' }),
      Subject.findOne({ code: 'KISW' }),
      Subject.findOne({ code: 'KSL' }),
      Subject.findOne({ code: 'CSL' }),
      Subject.findOne({ code: 'MATH-CORE' }),
      Subject.findOne({ code: 'MATH-ESS' })
    ]);

    let mathSubject;
    if (student.pathway?.name === 'STEM') {
      mathSubject = coreMath;
      if (mathChoice === 'essential') {
        return res.status(400).json({ error: 'Students in the STEM pathway must take Core Mathematics.' });
      }
    } else {
      mathSubject = mathChoice === 'core' ? coreMath
        : mathChoice === 'essential' ? essentialMath
        : essentialMath;
    }

    const compulsorySubjects = [
      english?._id,
      csl?._id,
      languagePreference === 'KSL' ? ksl?._id : kiswahili?._id,
      mathSubject?._id
    ].filter(Boolean);

    const finalSubjects = [...new Set([...compulsorySubjects, ...subjects.map(s => s._id)])];

    if (finalSubjects.length !== 7) {
      return res.status(400).json({ error: 'Total subjects must be exactly 7' });
    }

    await SubjectSelection.findOneAndUpdate(
      { student: student._id },
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    student.selectedSubjects = finalSubjects;
    await student.save();

    // ✅ Sync to StudentSubject model
    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId },
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          term: 'Term 1',
          year: new Date().getFullYear()
        },
        { upsert: true, new: true }
      );
    }

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
    console.error('[UpdateSelectedSubjectsByAdmNo]', err);
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
      autoAssigned: { $ne: true }
    });

    // ✅ Fetch remaining compulsory subjects
    const remaining = await StudentSubject.find({
      student: student._id,
      autoAssigned: true
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
    console.error('[DeleteSelectedSubjectsByAdmNo]', err);
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
    const compulsoryIds = Object.values(compulsoryMap);

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

      const electiveLinks = subjectLinks.filter(link => !link.autoAssigned);
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
        pathway: student.pathway?.name,
        totalSubjects: total,
        electiveCount: electiveLinks.length,
        fromPathwayCount: fromPathway.length,
        compliant: issues.length === 0,
        issues
      });
    }

    res.status(200).json({ message: 'CBC subject validation complete.', report });
  } catch (err) {
    console.error('[ValidateAllSubjectSelections]', err);
    res.status(500).json({ error: 'Error validating subject selections.' });
  }
};


module.exports = {
  selectSubjectsByAdmNo,
  getSelectedSubjectsByAdmNo,
  updateSelectedSubjectsByAdmNo,
  deleteSelectedSubjectsByAdmNo,
  validateAllSubjectSelections
};
