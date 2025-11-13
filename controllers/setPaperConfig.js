const PaperConfig = require('../models/paperConfig');
const Subject = require('../models/subject');
const School = require('../models/school');
const Assessment = require('../models/assessment');

// 🧠 Resolve school context from user, query, or body
const resolveSchool = async (req) => {
  const schoolId = req.user?.schoolId || req.query.schoolId || req.body.schoolId;
  const schoolCode = req.user?.schoolCode || req.query.schoolCode || req.body.schoolCode;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode })
  });
};

// 🔐 Set paper config (generic)
const setPaperConfig = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { subject, grade, term, exam, year, papers } = req.body;

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: "Papers must be a non-empty array." });
    }

    // Validate papers - support { name, outOf } or { paperNo, total }
    let parsedPapers;
    try {
      parsedPapers = papers.map((p, i) => {
        if (p.name && typeof p.outOf === "number" && !isNaN(p.outOf)) {
          const match = p.name.match(/\d+/);
          const paperNo = match ? parseInt(match[0], 10) : i + 1;
          return { paperNo, total: p.outOf };
        } else if (typeof p.total === "number" && !isNaN(p.total) && p.paperNo) {
          return { paperNo: p.paperNo, total: p.total };
        } else {
          throw new Error("Each paper must include {name, outOf} OR {paperNo, total}");
        }
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // Conflict check
    const exists = await PaperConfig.findOne({
      subject,
      grade,
      term,
      exam,
      year,
      school: school._id,
    });
    if (exists) {
      return res
        .status(409)
        .json({ error: "Paper config already exists for this subject and period." });
    }

    // Create new PaperConfig
    const config = await PaperConfig.create({
      subject,
      grade,
      term,
      exam,
      year,
      papers: parsedPapers,
      school: school._id,
    });

    // Update all matching Assessments that may already exist
    await Assessment.updateMany(
      {
        subject,
        grade,
        term,
        exam,
        year,
        school: school._id
      },
      { papers: parsedPapers }
    );

    res.status(201).json({
      message: "Paper config created (and all matching assessments updated).",
      config
    });
  } catch (err) {
    console.error("[setPaperConfig]", err);
    res.status(500).json({ error: err.message || "Error creating paper config." });
  }
};




// 🔐 Set paper config by subject name
const setPaperConfigByName = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { subjectName } = req.params;
    const { grade, term, exam, year, papers } = req.body;

    const subject = await Subject.findOne({
      name: new RegExp(`^${subjectName}$`, "i"),
      school: school._id,
    });
    if (!subject) return res.status(404).json({ error: "Subject not found." });

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: "Papers must be a non-empty array." });
    }

    // Validate and parse papers
    let parsedPapers;
    try {
      parsedPapers = papers.map((p, i) => {
        if (p.name && typeof p.outOf === "number" && !isNaN(p.outOf)) {
          const match = p.name.match(/\d+/);
          const paperNo = match ? parseInt(match[0], 10) : i + 1;
          return { paperNo, total: p.outOf };
        } else if (typeof p.total === "number" && !isNaN(p.total) && p.paperNo) {
          return { paperNo: p.paperNo, total: p.total };
        } else {
          throw new Error("Each paper must include {name, outOf} OR {paperNo, total}");
        }
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // Conflict check
    const exists = await PaperConfig.findOne({
      subject: subject._id,
      grade,
      term,
      exam,
      year,
      school: school._id,
    });
    if (exists) {
      return res
        .status(409)
        .json({ error: "Paper config already exists for this subject and period." });
    }

    // Create new PaperConfig
    const config = await PaperConfig.create({
      subject: subject._id,
      grade,
      term,
      exam,
      year,
      papers: parsedPapers,
      school: school._id,
    });

    // Update all matching Assessments to use the new papers schema
    await Assessment.updateMany(
      {
        subject: subject._id,
        grade,
        term,
        exam,
        year,
        school: school._id
      },
      { papers: parsedPapers }
    );

    res.status(201).json({
      message: "Paper config created (and all matching assessments updated).",
      config: {
        LearningArea: subject.name,
        grade,
        term,
        exam,
        year,
        papers: parsedPapers,
      },
    });
  } catch (err) {
    console.error("[setPaperConfigByName]", err);
    res.status(500).json({ error: err.message || "Error creating paper config." });
  }
};

// 🔍 Get paper config by subject name
const getPaperConfigByName = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const { subjectName } = req.params;
    const { grade, term, exam, year } = req.query;

    if (exam && term && year) {
      const validExams = await Assessment.distinct("exam", {
        term,
        year: parseInt(year),
        school: school._id
      });

      if (!validExams.includes(exam)) {
        return res.status(400).json({
          error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(', ')}`
        });
      }
    }

    const subject = await Subject.findOne({ name: new RegExp(`^${subjectName}$`, 'i'), school: school._id });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    const query = {
      subject: subject._id,
      school: school._id,
      ...(grade && { grade }),
      ...(term && { term }),
      ...(exam && { exam }),
      ...(year && { year })
    };

    const config = await PaperConfig.find(query).populate('subject');
    if (!config.length) return res.status(404).json({ error: 'No paper config found.' });

    const formatted = config.map(cfg => ({
      LearningArea: cfg.subject?.name,
      grade: cfg.grade,
      term: cfg.term,
      exam: cfg.exam,
      year: cfg.year,
      papers: cfg.papers
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('[getPaperConfigByName]', err);
    res.status(500).json({ error: 'Error fetching paper config.' });
  }
};

// 🔍 Get all paper configs
// 🔍 Get all paper configs (returns subject _id, name AND school _id)
const getPaperConfigs = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    // Populate subject with _id and name, but also include root subject and school ids
    const configs = await PaperConfig.find({ school: school._id })
      .populate('subject', 'name _id')
      .select('subject grade term exam year papers school'); // Ensure root id fields included

    // Each config object MUST have subject: {_id, name} and school at root
    const formatted = configs.map(cfg => ({
      subject: cfg.subject?._id || cfg.subject,           // _id (ObjectId or string)
      subjectName: cfg.subject?.name || null,             // human name for dropdown/debug
      grade: cfg.grade,
      term: cfg.term,
      exam: cfg.exam,
      year: cfg.year,
      papers: cfg.papers,
      school: cfg.school,                                 // school ObjectId
    }));

    res.status(200).json(formatted);

  } catch (err) {
    console.error('[getPaperConfigs]', err);
    res.status(500).json({ error: 'Error fetching paper configs.' });
  }
};



// ✏️ Update paper config by subject name
const updatePaperConfigByName = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const rawSubject = decodeURIComponent(req.params.subjectName).trim();
    const subjectName = rawSubject.replace(/\s+/g, " ");
    const { grade, term, exam, year, papers } = req.body;

    const subject = await Subject.findOne({
      name: new RegExp(`^${subjectName}$`, 'i'),
      school: school._id
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    // --- Validate and parse papers ---
    let parsedPapers;
    try {
      parsedPapers = papers.map((p, i) => {
        if (p.name && typeof p.outOf === "number" && !isNaN(p.outOf)) {
          const match = p.name.match(/\d+/);
          const paperNo = match ? parseInt(match[0], 10) : i + 1;
          return { paperNo, total: p.outOf };
        } else if (typeof p.total === "number" && !isNaN(p.total) && p.paperNo) {
          return { paperNo: p.paperNo, total: p.total };
        } else {
          throw new Error("Each paper must include {name, outOf} OR {paperNo, total}");
        }
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // --- Update the PaperConfig ---
    const updated = await PaperConfig.findOneAndUpdate(
      { subject: subject._id, grade, term, exam, year, school: school._id },
      { papers: parsedPapers },
      { new: true }
    ).populate('subject');

    if (!updated) return res.status(404).json({ error: 'Paper config not found to update.' });

    // --- Update all matching Assessments (automatic update of exam schema for all marks) ---
    await Assessment.updateMany(
      {
        subject: subject._id,
        grade,
        term,
        exam,
        year,
        school: school._id
      },
      { papers: parsedPapers }
    );

    res.status(200).json({
      message: 'Paper config updated (and all matching assessments updated).',
      config: {
        LearningArea: updated.subject?.name,
        grade: updated.grade,
        term: updated.term,
        exam: updated.exam,
        year: updated.year,
        papers: updated.papers
      }
    });
  } catch (err) {
    console.error('[updatePaperConfigByName]', err);
    res.status(500).json({ error: err.message || 'Error updating paper config.' });
  }
};


// 🗑️ Delete paper config by subject name
const deletePaperConfigByName = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: 'School not found.' });

    const rawSubject = decodeURIComponent(req.params.subjectName).trim();
    const subject = await Subject.findOne({ name: new RegExp(`^${rawSubject}$`, 'i'), school: school._id });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    const { grade, term, exam, year } = req.query;

    // Delete the paper config
    const deletedConfig = await PaperConfig.findOneAndDelete({
      subject: subject._id,
      grade,
      term,
      exam,
      year,
      school: school._id
    });

    if (!deletedConfig) return res.status(404).json({ error: 'Config not found to delete.' });

    // Delete any matching assessments for this context, if you want that autoclean
    await Assessment.deleteMany({
      subject: subject._id,
      grade,
      term,
      exam,
      year,
      school: school._id
    });

    res.status(200).json({ message: 'Paper config and any related assessments deleted.' });
  } catch (err) {
    console.error('[deletePaperConfigByName]', err);
    res.status(500).json({ error: 'Error deleting paper config.' });
  }
};

module.exports = {
  setPaperConfig,
  setPaperConfigByName,
  getPaperConfigByName,
  getPaperConfigs,
  updatePaperConfigByName,
  deletePaperConfigByName
};
