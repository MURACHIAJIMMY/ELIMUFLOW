// backend/controllers/subjectController.js
const Subject = require('../models/subject');
const Pathway = require('../models/pathway');
const Track = require('../models/track');
const { subjectPools } = require('../utils/subjectPools');
// 🔒 Create a single subject
const createSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      group,
      compulsory,
      pathwayName,
      trackCode,
      lessonsPerWeek
    } = req.body;

    const exists = await Subject.findOne({ code: code.toUpperCase() });
    if (exists) return res.status(409).json({ error: 'Subject code already exists.' });

    const pathwayDoc = await Pathway.findOne({ name: pathwayName });
    const trackDoc = await Track.findOne({ code: trackCode });

    if (!pathwayDoc || !trackDoc) {
      return res.status(404).json({ error: 'Pathway or track not found.' });
    }

    const subject = await Subject.create({
      name,
      code: code.toUpperCase(),
      group,
      compulsory,
      pathway: pathwayDoc._id,
      track: trackDoc._id,
      lessonsPerWeek
    });

    const populated = await Subject.findById(subject._id)
      .populate({ path: 'pathway', select: 'name' })
      .populate({ path: 'track', select: 'name code' });

    res.status(201).json({
      message: 'Subject created.',
      subject: {
        LearningArea: populated.name,
        code: populated.code,
        group: populated.group,
        lessonsPerWeek: populated.lessonsPerWeek,
        compulsory: populated.compulsory,
        pathway: populated.pathway?.name || null,
        track: populated.track
          ? { name: populated.track.name, code: populated.track.code }
          : null
      }
    });
  } catch (err) {
    console.error('[createSubject]', err);
    res.status(500).json({ error: 'Failed to create subject.' });
  }
};

// 📦 Bulk create subjects
const bulkCreateSubjects = async (req, res) => {
  try {
    const rawSubjects = req.body;
    if (!Array.isArray(rawSubjects) || rawSubjects.length === 0) {
      return res.status(400).json({ error: 'Provide an array of subject objects.' });
    }

    const defaultPathway = await Pathway.findOne({ name: 'Compulsory' });
    const defaultTrack = await Track.findOne({ code: 'CORE' });

    if (!defaultPathway || !defaultTrack) {
      return res.status(500).json({ error: 'Default pathway or track not found. Please seed them first.' });
    }

    const resolvedSubjects = [];

    for (const raw of rawSubjects) {
      const pathwayDoc = raw.pathwayName
        ? await Pathway.findOne({ name: raw.pathwayName })
        : defaultPathway;

      const trackDoc = raw.trackCode
        ? await Track.findOne({ code: raw.trackCode })
        : defaultTrack;

      if (!pathwayDoc || !trackDoc) {
        console.warn(`Skipping subject: ${raw.name} — missing fallback pathway or track`);
        continue;
      }

      resolvedSubjects.push({
        name: raw.name,
        code: raw.code.toUpperCase(),
        group: raw.group || 'Unclassified',
        compulsory: raw.compulsory ?? false,
        pathway: pathwayDoc._id,
        track: trackDoc._id,
        lessonsPerWeek: raw.lessonsPerWeek || 5
      });
    }

    if (resolvedSubjects.length === 0) {
      return res.status(400).json({ error: 'No valid subjects to insert.' });
    }

    const created = await Subject.insertMany(resolvedSubjects);

    // ✅ Populate for frontend clarity
    const populated = await Subject.find({ _id: { $in: created.map(s => s._id) } })
      .populate({ path: 'pathway', select: 'name' })
      .populate({ path: 'track', select: 'name code' });

    const formatted = populated.map(sub => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      lessonsPerWeek: sub.lessonsPerWeek,
      compulsory: sub.compulsory,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null
    }));

    res.status(201).json({ message: 'Subjects created.', subjects: formatted });
  } catch (err) {
    console.error('[bulkCreateSubjects]', err);
    res.status(500).json({ error: 'Failed to create subjects.' });
  }
};

// ✅ Validate subject registry
const validateSubjectRegistry = async (req, res) => {
  try {
    const subjects = await Subject.find();
    const duplicates = [];

    const seenCodes = new Set();
    for (const sub of subjects) {
      if (seenCodes.has(sub.code)) duplicates.push(sub.code);
      seenCodes.add(sub.code);
    }

    res.status(200).json({ total: subjects.length, duplicates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📚 Get subjects by pathway and track

const getSubjectsByPathwayTrack = async (req, res) => {
  try {
    const { pathwayName, trackCode } = req.query;
    const query = {};

    if (pathwayName) {
      const pathwayDoc = await Pathway.findOne({ name: pathwayName });
      if (!pathwayDoc) return res.status(404).json({ error: 'Pathway not found.' });
      query.pathway = pathwayDoc._id;
    }

    if (trackCode) {
      const trackDoc = await Track.findOne({ code: trackCode });
      if (!trackDoc) return res.status(404).json({ error: 'Track not found.' });
      query.track = trackDoc._id;
    }

    const subjects = await Subject.find(query)
      .select('name code group')
      .populate({ path: 'pathway', select: 'name' })
      .populate({ path: 'track', select: 'name code' });

    const formatted = subjects.map(sub => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('[getSubjectsByPathwayTrack]', err);
    res.status(500).json({ error: 'Failed to filter subjects.' });
  }
};

// 📄 Get all subjects
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .select('name code group')
      .populate({ path: 'pathway', select: 'name' })
      .populate({ path: 'track', select: 'name code' });

    const formatted = subjects.map(sub => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('[getAllSubjects]', err);
    res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
};


// 📄 Get compulsory subjects
const getCompulsorySubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ compulsory: true })
      .select('name code group lessonsPerWeek')
      .populate({ path: 'pathway', select: 'name' })
      .populate({ path: 'track', select: 'name code' });

    const formatted = subjects.map(sub => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      lessonsPerWeek: sub.lessonsPerWeek,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('[getCompulsorySubjects]', err);
    res.status(500).json({ error: 'Failed to fetch compulsory subjects.' });
  }
};

// 🔧 Update subject by name
const updateSubjectByName = async (req, res) => {
  try {
    const { subjectName } = req.params;
    const updates = req.body;

    const subject = await Subject.findOneAndUpdate(
      { name: subjectName },
      updates,
      { new: true }
    ).populate([
      { path: 'pathway', select: 'name' },
      { path: 'track', select: 'name code' }
    ]);

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    res.status(200).json({
      message: 'Subject updated.',
      subject: {
        LearningArea: subject.name,
        code: subject.code,
        group: subject.group,
        lessonsPerWeek: subject.lessonsPerWeek,
        pathway: subject.pathway?.name || null,
        track: subject.track
          ? { name: subject.track.name, code: subject.track.code }
          : null
      }
    });
  } catch (err) {
    console.error('[updateSubjectByName]', err);
    res.status(500).json({ error: 'Failed to update subject.' });
  }
};

// 📦 Bulk update subjects
const bulkUpdateSubjects = async (req, res) => {
  try {
    const updates = req.body; // [{ name: 'Biology', updates: { lessonsPerWeek: 6, pathway: 'STEM' } }, ...]

    // Helper to resolve name to ObjectId
    const resolveRef = async (model, name) => {
      if (!name || typeof name !== 'string') return null;
      const doc = await model.findOne({ name });
      return doc?._id || null;
    };

    const results = await Promise.all(
      updates.map(async ({ name, updates }) => {
        // Resolve pathway and track if given as strings
        if (updates.pathway && typeof updates.pathway === 'string') {
          updates.pathway = await resolveRef(Pathway, updates.pathway);
        }
        if (updates.track && typeof updates.track === 'string') {
          updates.track = await resolveRef(Track, updates.track);
        }

        const subject = await Subject.findOneAndUpdate(
          { name },
          updates,
          { new: true }
        ).populate([
          { path: 'pathway', select: 'name' },
          { path: 'track', select: 'name code' }
        ]);

        return subject
          ? {
              LearningArea: subject.name,
              updated: true,
              subject: {
                code: subject.code,
                group: subject.group,
                lessonsPerWeek: subject.lessonsPerWeek,
                pathway: subject.pathway?.name || null,
                track: subject.track
                  ? { name: subject.track.name, code: subject.track.code }
                  : null
              }
            }
          : { LearningArea: name, updated: false };
      })
    );

    res.status(200).json({ message: 'Subjects updated.', results });
  } catch (err) {
    console.error('[bulkUpdateSubjects]', err);
    res.status(500).json({ error: 'Failed to update subjects.' });
  }
};
// ❌ Delete subject by name
const deleteSubjectByName = async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: "Subject name is required." });
    }

    const deleted = await Subject.findOneAndDelete({ name });

    if (!deleted) {
      return res.status(404).json({ error: `Subject '${name}' not found.` });
    }

    res.status(200).json({
      message: `Subject '${name}' deleted successfully.`,
      deleted: {
        LearningArea: deleted.name,
        code: deleted.code,
        group: deleted.group
      }
    });
  } catch (err) {
    console.error('[deleteSubjectByName]', err);
    res.status(500).json({ error: 'Failed to delete subject.' });
  }
};


module.exports = {
  createSubject,
  bulkCreateSubjects,
  validateSubjectRegistry,
  getSubjectsByPathwayTrack,
  getAllSubjects,
  getCompulsorySubjects,
  updateSubjectByName,
  bulkUpdateSubjects,
  deleteSubjectByName
};
