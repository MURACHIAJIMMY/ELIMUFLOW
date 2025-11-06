const Student = require('../models/student');
const Class = require('../models/class');
const Subject = require('../models/subject');
const Pathway = require('../models/pathway');
const Track = require('../models/track');
const StudentSubject = require('../models/studentSubject');

// 📝 Register a new student
const registerStudent = async (req, res) => {
  try {
    const {
      admNo,
      name,
      nemisNo,
      gender,
      currentGrade,
      className,
      pathwayName,
      trackName,
      selectedSubjects = [],
      languagePreference = 'KISW',
      mathChoice
    } = req.body;

    const exists = await Student.findOne({ admNo: admNo.toUpperCase() });
    if (exists) return res.status(409).json({ error: 'Admission number already exists.' });

    const pathwayDoc = await Pathway.findOne({ name: pathwayName });
    const trackDoc = trackName ? await Track.findOne({ name: trackName }) : null;
    const classDoc = await Class.findOne({ name: className });

    if (!pathwayDoc || !classDoc) {
      return res.status(400).json({ error: 'Invalid pathway or class name.' });
    }

    const allSubjects = await Subject.find();

const subjectMap = allSubjects.reduce((acc, subj) => {
  acc[subj.code] = subj;
  return acc;
}, {});

const english = subjectMap["101"];
const csl = subjectMap["CSL"];
const kiswahili = subjectMap["102"];
const ksl = subjectMap["504"];
const coreMath = subjectMap["121"];
const essentialMath = subjectMap["122"];


    const mathSubject =
      mathChoice === 'core' ? coreMath :
      mathChoice === 'essential' ? essentialMath :
      pathwayDoc.name === 'STEM' ? coreMath : essentialMath;

    const compulsorySubjects = [
      english?._id,
      csl?._id,
      languagePreference === 'KSL' ? ksl?._id : kiswahili?._id,
      mathSubject?._id
    ].filter(Boolean);

    const subjectsByPathway = allSubjects.reduce((acc, subj) => {
      const key = subj.pathway?.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(subj._id.toString());
      return acc;
    }, {});

    const validOptionalSubjects = selectedSubjects.filter(subjectId =>
      subjectsByPathway[pathwayDoc._id.toString()]?.includes(subjectId.toString())
    );

    const finalSubjects = [...new Set([...compulsorySubjects, ...validOptionalSubjects])];

    const student = await Student.create({
      admNo: admNo.toUpperCase(),
      name,
      nemisNo: nemisNo?.trim() || undefined,
      gender,
      currentGrade,
      class: classDoc._id,
      pathway: pathwayDoc._id,
      track: trackDoc?._id || undefined,
      selectedSubjects: finalSubjects
    });

    await Promise.all(
      finalSubjects.map(subjectId => {
        const isAuto = compulsorySubjects.includes(subjectId);
        const category = isAuto ? 'Compulsory' : 'Elective';
        return StudentSubject.create({
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category
        });
      })
    );

    res.status(201).json({ message: 'Student registered.', student });
  } catch (err) {
    console.error('[registerStudent]', err);
    res.status(500).json({ error: err.message });
  }
};
// 📝 Bulk register students
const bulkRegisterStudents = async (req, res) => {
  try {
    const students = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res
        .status(400)
        .json({ error: "Provide an array of student objects." });
    }

    // 📚 Fetch all subjects once
    const allSubjects = await Subject.find();

    // 🔍 Create subject lookup map
    const subjectMap = allSubjects.reduce((acc, subj) => {
      acc[subj.code] = subj;
      return acc;
    }, {});

    const english = subjectMap["101"]; // English
    const csl = subjectMap["CSL"]; // Community Service Learning
    const kiswahili = subjectMap["102"]; // Kiswahili
    const ksl = subjectMap["504"]; // Kenyan Sign Language
    const coreMath = subjectMap["121"]; // Core Math
    const essentialMath = subjectMap["122"]; // Essential Math

    // 📦 Fetch pathway, track, class
    const [pathwayDocs, trackDocs, classDocs] = await Promise.all([
      Pathway.find(),
      Track.find(),
      Class.find(),
    ]);

    const pathwayMap = Object.fromEntries(
      pathwayDocs.map((p) => [p.name, p._id])
    );
    const trackMap = Object.fromEntries(trackDocs.map((t) => [t.name, t._id]));
    const classMap = Object.fromEntries(classDocs.map((c) => [c.name, c._id]));

    // 🧠 Group subjects by pathway
    const subjectsByPathway = allSubjects.reduce((acc, subj) => {
      const key = subj.pathway?.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(subj._id.toString());
      return acc;
    }, {});

    // 🏗️ Prepare student payloads
    const preparedStudents = await Promise.all(
      students.map(async (student) => {
        const {
          admNo,
          name,
          nemisNo,
          gender,
          currentGrade,
          className,
          pathwayName,
          trackName,
          selectedSubjects = [],
          languagePreference = "KISW",
          mathChoice,
        } = student;

        const exists = await Student.findOne({ admNo: admNo.toUpperCase() });
        if (exists) return null;

        const pathwayId = pathwayMap[pathwayName];
        const trackId = trackMap[trackName];
        const classId = classMap[className];

        if (!pathwayId || !classId) {
          console.warn(`Skipping ${name} — missing required pathway or class`);
          return null;
        }

        const mathSubject =
          mathChoice === "core"
            ? coreMath
            : mathChoice === "essential"
            ? essentialMath
            : pathwayName === "STEM"
            ? coreMath
            : essentialMath;

        const compulsorySubjects = [
          english?._id,
          csl?._id,
          languagePreference === "KSL" ? ksl?._id : kiswahili?._id,
          mathSubject?._id,
        ].filter(Boolean);

        const validOptionalSubjects = selectedSubjects.filter((subjectId) =>
          subjectsByPathway[pathwayId?.toString()]?.includes(
            subjectId.toString()
          )
        );

        const finalSubjects = [
          ...new Set([...compulsorySubjects, ...validOptionalSubjects]),
        ];

        return {
          admNo: admNo.toUpperCase(),
          name,
          nemisNo: nemisNo?.trim() || undefined,
          gender,
          currentGrade,
          class: classId,
          pathway: pathwayId,
          track: trackId || undefined,
          selectedSubjects: finalSubjects,
          compulsorySubjects,
        };
      })
    );

    // 🚀 Create students
    const filtered = preparedStudents.filter(Boolean);
    const created = await Student.insertMany(
      filtered.map((s) => {
        const { compulsorySubjects, ...studentData } = s;
        return studentData;
      })
    );

    // 🔗 Create StudentSubject links
    await Promise.all(
      created.flatMap((student, i) => {
        const { compulsorySubjects, selectedSubjects } = filtered[i];
        return selectedSubjects.map((subjectId) => {
          const isAuto = compulsorySubjects.includes(subjectId);
          const category = isAuto ? "Compulsory" : "Elective";
          return StudentSubject.create({
            student: student._id,
            subject: subjectId,
            autoAssigned: isAuto,
            category,
          });
        });
      })
    );

    res
      .status(201)
      .json({ message: "Students registered.", students: created });
  } catch (err) {
    console.error("[bulkRegisterStudents]", err);
    res.status(500).json({ error: err.message });
  }
};


// 📄 Get individual student profile
const getStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId)
      .populate('class pathway track selectedSubjects');

    if (!student)
      return res.status(404).json({ error: 'Student not found.' });

    res.status(200).json(student);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 📄 Get all students
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate('pathway', 'name')
      .populate('track', 'name')
      .populate('class', 'grade name')
      .populate({
        path: 'selectedSubjects',
        select: 'name code group'
      });

    const formatted = await Promise.all(
      students.map(async s => {
        // 🔄 Load synced subjects from StudentSubject
        let subjectLinks = await StudentSubject.find({ student: s._id })
          .populate('subject', 'name code group');

        // 🧯 Fallback to selectedSubjects if StudentSubject is empty
        if (!subjectLinks.length && s.selectedSubjects?.length) {
          subjectLinks = s.selectedSubjects.map(sub => ({
            subject: sub,
            autoAssigned: false,
            category: 'Elective',
            term: null,
            year: null
          }));
        }

        // 🧠 Format subject metadata
        const subjects = subjectLinks
          .filter(link => link.subject)
          .map(link => ({
            _id: link.subject._id,
            name: link.subject.name,
            code: link.subject.code,
            group: link.subject.group,
            autoAssigned: link.autoAssigned,
            category: link.category,
            term: link.term,
            year: link.year
          }));

        // 📘 Group by category
        const compulsorySubjects = subjects.filter(sub => sub.category === 'Compulsory');
        const electiveSubjects = subjects.filter(sub => sub.category === 'Elective');

        return {
          _id: s._id,
          admNo: s.admNo,
          name: s.name,
          gender: s.gender,
          grade: s.grade,
          currentGrade: s.currentGrade ?? s.class?.grade ?? '—',
          class: s.class?.name ?? '—',
          pathway: s.pathway?.name ?? '—',
          track: s.track?.name ?? '—',
          subjectCount: subjects.length,
          compulsorySubjects,
          electiveSubjects
        };
      })
    );

    res.status(200).json({
      count: formatted.length,
      students: formatted
    });
  } catch (err) {
    console.error('[getAllStudents]', err);
    res.status(500).json({ error: 'Error fetching students' });
  }
};

// 📄 Get student subjects
const getStudentSubjects = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate('pathway', 'name')
      .populate('track', 'name')
      .populate('class', 'grade name')
      .populate('selectedSubjects', 'name code group');

    if (!student)
      return res.status(404).json({ message: 'Student not found' });

    // 🔄 Load synced subjects from StudentSubject
    let subjectLinks = await StudentSubject.find({ student: student._id })
      .populate('subject', 'name code group');

    // 🧯 Fallback to selectedSubjects if StudentSubject is empty
    if (!subjectLinks.length && student.selectedSubjects?.length) {
      subjectLinks = student.selectedSubjects.map(sub => ({
        subject: sub,
        autoAssigned: false,
        category: 'Elective',
        term: null,
        year: null
      }));
    }

    // 🧠 Format subject metadata
    const subjects = subjectLinks
      .filter(link => link.subject)
      .map(link => ({
        _id: link.subject._id,
        name: link.subject.name,
        code: link.subject.code,
        group: link.subject.group,
        autoAssigned: link.autoAssigned,
        category: link.category,
        term: link.term,
        year: link.year
      }));

    // 📘 Group by category
    const compulsorySubjects = subjects.filter(sub => sub.category === 'Compulsory');
    const electiveSubjects = subjects.filter(sub => sub.category === 'Elective');

    res.status(200).json({
      student: {
        id: student._id,
        name: student.name,
        admNo: student.admNo,
        grade: student.grade,
        class: student.class?.name ?? '—',
        pathway: student.pathway?.name ?? '—',
        track: student.track?.name ?? '—'
      },
      subjectCount: subjects.length,
      compulsorySubjects,
      electiveSubjects
    });
  } catch (err) {
    console.error('[getStudentSubjects]', err);
    res.status(500).json({ error: 'Error fetching student subjects' });
  }
};

// 📄 Get all students with their subjects
const getAllStudentsWithSubjects = async (req, res) => {
  try {
    const students = await Student.find({})
      .populate('selectedSubjects', 'name code group compulsory')
      .populate('class', 'name grade')
      .populate('pathway', 'name')
      .populate('track', 'name')
      .select('admNo name currentGrade class selectedSubjects pathway track');

    res.status(200).json({
      count: students.length,
      students
    });
  } catch (err) {
    console.error('[GetAllStudentsWithSubjects]', err);
    res.status(500).json({ error: 'Error fetching students with subjects' });
  }
};

// 📄 Get students with their subjects by class name
const getStudentsWithSubjectsByClassName = async (req, res) => {
  try {
    const { className } = req.params;
    const cls = await Class.findOne({ name: className });

    if (!cls)
      return res.status(404).json({ message: 'Class not found' });

    const students = await Student.find({ class: cls._id })
      .populate('selectedSubjects', 'name group compulsory')
      .select('admNo name grade selectedSubjects');

    res.status(200).json({
      class: { name: cls.name, grade: cls.grade },
      count: students.length,
      students
    });

  } catch (err) {
    console.error('[GetStudentsWithSubjectsByClassName]', err);
    res.status(500).json({ error: 'Error fetching students by class' });
  }
};


// 📘 Get students by class (ID or name)
const getStudentsByClass = async (req, res) => {
  try {
    const { classId, className } = req.params;
    const classQuery = classId ? { _id: classId } : { name: className.trim() };

    const cls = await Class.findOne(classQuery);
    if (!cls) return res.status(404).json({ error: 'Class not found.' });

    const students = await Student.find({ class: cls._id })
      .select('admNo nemisNo name gender')
      .sort({ admNo: 1 });

    const classList = students.map(s => ({
      admNo: s.admNo,
      nemisNo: s.nemisNo || '--',
      name: s.name,
      gender: s.gender,
      class: cls.name
    }));

    res.status(200).json({
      class: cls.name,
      grade: cls.grade,
      total: classList.length,
      students: classList
    });
  } catch (err) {
    console.error('[getStudentsByClass]', err);
    res.status(500).json({ error: 'Error fetching class list.' });
  }
};

// 🔧 Update student by admission number
const updateStudentByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const updates = { ...req.body };

    // 🔍 Resolve className to class ID
    if (updates.className) {
      const classDoc = await Class.findOne({ name: updates.className });
      if (!classDoc) return res.status(400).json({ error: 'Invalid class name.' });
      updates.class = classDoc._id;
      delete updates.className;
    }

    // 🔍 Resolve pathwayName to pathway ID
    if (updates.pathwayName) {
      const pathwayDoc = await Pathway.findOne({ name: updates.pathwayName });
      if (!pathwayDoc) return res.status(400).json({ error: 'Invalid pathway name.' });
      updates.pathway = pathwayDoc._id;
      delete updates.pathwayName;
    }

    // 🔍 Resolve trackName to track ID
    if (updates.trackName) {
      const trackDoc = await Track.findOne({ name: updates.trackName });
      if (!trackDoc) return res.status(400).json({ error: 'Invalid track name.' });
      updates.track = trackDoc._id;
      delete updates.trackName;
    }

    // 🔄 Update student by admNo
    const student = await Student.findOneAndUpdate(
      { admNo: admNo.toUpperCase() },
      updates,
      { new: true }
    );

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // 🔄 Sync selectedSubjects to StudentSubject if provided
    if (updates.selectedSubjects && Array.isArray(updates.selectedSubjects)) {
      const allSubjects = await Subject.find();
      const subjectMap = Object.fromEntries(allSubjects.map(s => [s._id.toString(), s]));

      const existingLinks = await StudentSubject.find({ student: student._id });
      const existingSubjectIds = existingLinks.map(link => link.subject.toString());

      const newSubjectIds = updates.selectedSubjects.filter(id => !existingSubjectIds.includes(id));

      const newLinks = newSubjectIds.map(subjectId => {
        const subject = subjectMap[subjectId];
        const category = subject?.category || 'Elective'; // fallback if not defined
        return {
          student: student._id,
          subject: subject._id,
          autoAssigned: false,
          category
        };
      });

      if (newLinks.length) {
        await StudentSubject.insertMany(newLinks);
      }
    }

    res.status(200).json({ message: 'Student updated.', student });
  } catch (err) {
    console.error('[updateStudentByAdmNo]', err);
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Delete student by admission number
const deleteStudentByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;

    const student = await Student.findOne({ admNo: admNo.toUpperCase() });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 🧹 Delete linked StudentSubject entries
    await StudentSubject.deleteMany({ student: student._id });

    // 🗑️ Delete the student record
    await Student.deleteOne({ _id: student._id });

    res.status(200).json({ message: 'Student and linked subjects deleted successfully' });
  } catch (err) {
    console.error('[deleteStudentByAdmNo]', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};


// 📊 Audit CBC pathway compliance
const auditCBCCompliance = async (req, res) => {
  try {
    // 🔍 Fetch all students with pathway and track
    const students = await Student.find().populate('pathway track');

    // 📚 Fetch all subjects and build maps
    const allSubjects = await Subject.find();
    const subjectMap = Object.fromEntries(allSubjects.map(s => [s._id.toString(), s.name]));
    const compulsoryIds = allSubjects
      .filter(s => s.isCompulsory) // ✅ dynamic compulsory detection
      .map(s => s._id.toString());

    const report = await Promise.all(students.map(async student => {
      const required = student.pathway?.requiredSubjects?.map(s => s.toString()) || [];

      // ✅ Expected subjects: pathway + compulsory
      const expectedSubjects = [...new Set([...required, ...compulsoryIds])];

      // 🔍 Fetch assigned subjects
      const linkedSubjects = await StudentSubject.find({ student: student._id });
      const assigned = linkedSubjects.map(link => link.subject.toString());

      // 🧠 CBC compliance logic
      const assignedCompulsory = assigned.filter(id => compulsoryIds.includes(id));
      const assignedElectives = assigned.filter(id => !compulsoryIds.includes(id));

      const hasAllCompulsory = assignedCompulsory.length >= 4;
      const hasMinElectives = assignedElectives.length >= 3;
      const hasMinTotal = assigned.length >= 7;

      const compliant = hasAllCompulsory && hasMinElectives && hasMinTotal;

      const missing = expectedSubjects.filter(id => !assigned.includes(id));
      const missingNames = missing.map(id => subjectMap[id]).filter(Boolean);

      return {
        admNo: student.admNo,
        name: student.name,
        pathway: student.pathway?.name ?? '—',
        track: student.track?.name ?? '—',
        assignedCount: assigned.length,
        expectedCount: expectedSubjects.length,
        compliant,
        missingSubjects: missingNames
      };
    }));

    res.status(200).json(report);
  } catch (err) {
    console.error('[auditCBCCompliance]', err);
    res.status(500).json({ error: err.message });
  }
};

// 📚 Get subjects by admission number
const getStudentSubjectsByAdmNo = async (req, res) => {
  try {
    const { admNo } = req.params;
    const student = await Student.findOne({ admNo: admNo.toUpperCase() })
      .populate('pathway', 'name')
      .populate('track', 'name');

    if (!student) 
      return res.status(404).json({ message: 'Student not found' });

    const subjectLinks = await StudentSubject.find({ student: student._id })
      .populate('subject', 'name code group');

    const subjects = subjectLinks
      .filter(link => link.subject)
      .map(link => ({
        _id: link.subject._id,
        name: link.subject.name,
        code: link.subject.code,
        group: link.subject.group,
        autoAssigned: link.autoAssigned,
        category: link.category,
        term: link.term,
        year: link.year
      }));

    const compulsorySubjects = subjects.filter(sub => sub.category === 'Compulsory');
    const electiveSubjects = subjects.filter(sub => sub.category === 'Elective');

    res.status(200).json({
      student: {
        name: student.name,
        admNo: student.admNo,
        grade: student.currentGrade,
        pathway: student.pathway?.name || null,
        track: student.track?.name || null
      },
      subjectCount: subjects.length,
      compulsorySubjects,
      electiveSubjects
    });

  } catch (err) {
    console.error('[getStudentSubjectsByAdmNo]', err);
    res.status(500).json({ error: 'Error fetching student subjects by admNo' });
  }
};


module.exports = {
  registerStudent,
  bulkRegisterStudents,
  auditCBCCompliance,
  getStudentsByClass,
  getStudentProfile,
  getAllStudents,
  getStudentSubjects,
  getAllStudentsWithSubjects,
  getStudentsWithSubjectsByClassName,
  updateStudentByAdmNo,
  deleteStudentByAdmNo,
  getStudentSubjectsByAdmNo
};
