const PaperConfig = require('../models/paperConfig');
const Subject = require('../models/subject');

// 🔐 Set paper config (generic)
const setPaperConfig = async (req, res) => {
  try {
    const { subject, grade, term, exam, year, papers } = req.body;

    const exists = await PaperConfig.findOne({ subject, grade, term, exam, year });
    if (exists) return res.status(409).json({ error: 'Paper config already exists for this subject and period.' });

    const config = await PaperConfig.create({ subject, grade, term, exam, year, papers });
    res.status(201).json({ message: 'Paper config created.', config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔐 Set paper config by subject name
const setPaperConfigByName = async (req, res) => {
  try {
    const { subjectName } = req.params;
    const { grade, term, exam, year, papers } = req.body;

    // ✅ Normalize subject name (case-insensitive)
    const subject = await Subject.findOne({ name: new RegExp(`^${subjectName}$`, 'i') });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    // ✅ Validate papers structure
    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: 'Papers must be a non-empty array.' });
    }

    const parsedPapers = papers.map((p, i) => {
      if (!p.name || typeof p.outOf !== 'number') {
        throw new Error('Each paper must include a name and numeric outOf value.');
      }

      // Extract paper number from name (e.g., "Paper 1" → 1)
      const match = p.name.match(/\d+/);
      const paperNo = match ? parseInt(match[0], 10) : i + 1;

      return {
        paperNo,
        total: p.outOf
      };
    });

    // ✅ Check for existing config
    const exists = await PaperConfig.findOne({
      subject: subject._id,
      grade,
      term,
      exam,
      year
    });

    if (exists) {
      return res.status(409).json({
        error: 'Paper config already exists for this subject and period.'
      });
    }

    // ✅ Create config
    const config = await PaperConfig.create({
      subject: subject._id,
      grade,
      term,
      exam,
      year,
      papers: parsedPapers
    });

    res.status(201).json({
      message: 'Paper config created.',
      config: {
        LearningArea: subject.name,
        grade,
        term,
        exam,
        year,
        papers: parsedPapers
      }
    });
  } catch (err) {
    console.error('[setPaperConfigByName]', err);
    res.status(500).json({ error: 'Error creating paper config.' });
  }
};
// 🔍 Get paper config by subject name
const getPaperConfigByName = async (req, res) => {
  try {
    const { subjectName } = req.params;
    const { grade, term, exam, year } = req.query;

    const subject = await Subject.findOne({ name: new RegExp(`^${subjectName}$`, 'i') });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    const query = {
      subject: subject._id,
      ...(grade && { grade }),
      ...(term && { term }),
      ...(exam && { exam }),
      ...(year && { year })
    };

    const config = await PaperConfig.find(query).populate('subject');
    if (!config.length) return res.status(404).json({ error: 'No paper config found.' });

    // ✅ Format output with LearningArea
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
const getPaperConfigs = async (req, res) => {
  try {
    const configs = await PaperConfig.find().populate('subject');

    const formatted = configs.map(cfg => ({
      LearningArea: cfg.subject?.name,
      grade: cfg.grade,
      term: cfg.term,
      exam: cfg.exam,
      year: cfg.year,
      papers: cfg.papers
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('[getPaperConfigs]', err);
    res.status(500).json({ error: 'Error fetching paper configs.' });
  }
};

const updatePaperConfigByName = async (req, res) => {
  try {
    // 🔓 Decode and normalize subject name
    const rawSubject = decodeURIComponent(req.params.subjectName).trim();
    const subjectName = rawSubject.replace(/\s+/g, " "); // collapse multiple spaces

    const { grade, term, exam, year, papers } = req.body;

    // 🔍 Match subject case-insensitively
    const subject = await Subject.findOne({ name: new RegExp(`^${subjectName}$`, 'i') });
    if (!subject) return res.status(404).json({ error: 'Subject not found.' });

    // 🔧 Update config
    const updated = await PaperConfig.findOneAndUpdate(
      { subject: subject._id, grade, term, exam, year },
      { papers },
      { new: true }
    ).populate('subject');

    if (!updated) return res.status(404).json({ error: 'Paper config not found to update.' });

    res.status(200).json({
      message: 'Paper config updated.',
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
    res.status(500).json({ error: 'Error updating paper config.' });
  }
};

module.exports = {
  setPaperConfig,
  setPaperConfigByName,
  getPaperConfigByName,
  getPaperConfigs,
  updatePaperConfigByName
};
