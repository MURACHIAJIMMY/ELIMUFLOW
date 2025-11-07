// backend/controllers/trackController.js
const Track = require('../models/track');
const Pathway = require('../models/pathway');
const Subject = require('../models/subject');
const School = require('../models/school');

// 📥 Create a new track using pathway name
const createTrack = async (req, res) => {
  try {
    const { name, code, description, pathwayName } = req.body;

    const exists = await Track.findOne({ code: code.toUpperCase(), school: req.user.schoolId });
    if (exists) return res.status(409).json({ error: 'Track code already exists.' });

    const pathway = await Pathway.findOne({ name: pathwayName, school: req.user.schoolId });
    if (!pathway) return res.status(404).json({ error: 'Pathway not found.' });

    const track = await Track.create({
      name,
      code: code.toUpperCase(),
      description,
      pathway: pathway._id,
      school: req.user.schoolId // ✅ inject school
    });

    await Pathway.findByIdAndUpdate(pathway._id, {
      $addToSet: { tracks: track._id }
    });

    res.status(201).json({ message: 'Track created.', track });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 📦 Bulk create tracks using pathway names
const bulkCreateTracks = async (req, res) => {
  try {
    const rawTracks = req.body;
    if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
      return res.status(400).json({ error: 'Provide an array of track objects.' });
    }

    const resolvedTracks = [];

    for (const raw of rawTracks) {
      const pathway = await Pathway.findOne({ name: raw.pathwayName, school: req.user.schoolId });
      if (!pathway) continue;

      resolvedTracks.push({
        name: raw.name,
        code: raw.code.toUpperCase(),
        description: raw.description,
        pathway: pathway._id,
        school: req.user.schoolId // ✅ inject school
      });
    }

    const created = await Track.insertMany(resolvedTracks);

    for (const track of created) {
      await Pathway.findByIdAndUpdate(track.pathway, {
        $addToSet: { tracks: track._id }
      });
    }

    res.status(201).json({ message: 'Tracks created.', tracks: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📋 Get all tracks with their subjects
const getAllTracks = async (req, res) => {
  try {
    const tracks = await Track.find({ school: req.user.schoolId }).populate('pathway');
    const subjects = await Subject.find({ school: req.user.schoolId }).select('name code group track');

    const trackMap = tracks.map(track => {
      const trackSubjects = subjects
        .filter(sub => sub.track?.toString() === track._id.toString())
        .map(sub => ({
          subjectId: sub._id,
          LearningArea: sub.name,
          code: sub.code,
          group: sub.group
        }));

      return {
        trackId: track._id,
        trackName: track.name,
        trackCode: track.code,
        description: track.description,
        pathwayName: track.pathway?.name || null,
        subjects: trackSubjects
      };
    });

    res.status(200).json(trackMap);
  } catch (err) {
    console.error('[getAllTracks]', err);
    res.status(500).json({ error: 'Error fetching tracks.' });
  }
};


// 📄 Get a single track
const getTrackById = async (req, res) => {
  try {
    const { trackId } = req.params;
    const track = await Track.findOne({
      _id: trackId,
      school: req.user.schoolId // ✅ scoped
    }).populate('pathway');

    if (!track) return res.status(404).json({ error: 'Track not found.' });
    res.status(200).json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update a track by code
const updateTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const updates = req.body;

    const updated = await Track.findOneAndUpdate(
      { code: trackId.toUpperCase(), school: req.user.schoolId }, // ✅ scoped
      updates,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Track not found." });

    res.status(200).json({ message: `Track updated: ${trackId}`, track: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Delete a track by code
const deleteTrack = async (req, res) => {
  try {
    const { trackId } = req.params;

    const deleted = await Track.findOneAndDelete({
      code: trackId.toUpperCase(),
      school: req.user.schoolId // ✅ scoped
    });

    if (!deleted) return res.status(404).json({ error: "Track not found." });

    await Pathway.findByIdAndUpdate(deleted.pathway, {
      $pull: { tracks: deleted._id }
    });

    res.status(200).json({ message: `Track deleted: ${trackId}`, track: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createTrack,
  bulkCreateTracks,
  getAllTracks,
  getTrackById,
  updateTrack,
  deleteTrack
};
