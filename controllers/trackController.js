const Track = require("../models/track");
const Pathway = require("../models/pathway");
const Subject = require("../models/subject");
const School = require("../models/school");

// 🧠 Resolve school context from user, query, or body
const resolveSchool = async (req) => {
  const schoolId =
    req.user?.schoolId || req.query.schoolId || req.body.schoolId;
  const schoolCode =
    req.user?.schoolCode || req.query.schoolCode || req.body.schoolCode;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode }),
  });
};

// 📥 Create a new track using pathway name
const createTrack = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { name, code, description, pathwayName } = req.body;

    const exists = await Track.findOne({
      code: code.toUpperCase(),
      school: school._id,
    });
    if (exists)
      return res.status(409).json({ error: "Track code already exists." });

    const pathway = await Pathway.findOne({
      name: pathwayName,
      school: school._id,
    });
    if (!pathway) return res.status(404).json({ error: "Pathway not found." });

    const track = await Track.create({
      name,
      code: code.toUpperCase(),
      description,
      pathway: pathway._id,
      school: school._id,
    });

    await Pathway.findByIdAndUpdate(pathway._id, {
      $addToSet: { tracks: track._id },
    });

    res.status(201).json({ message: "Track created.", track });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📦 Bulk create tracks using pathway names
const bulkCreateTracks = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const rawTracks = req.body;
    if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
      return res
        .status(400)
        .json({ error: "Provide an array of track objects." });
    }

    const resolvedTracks = [];

    for (const raw of rawTracks) {
      const pathway = await Pathway.findOne({
        name: raw.pathwayName,
        school: school._id,
      });
      if (!pathway) continue;

      resolvedTracks.push({
        name: raw.name,
        code: raw.code.toUpperCase(),
        description: raw.description,
        pathway: pathway._id,
        school: school._id,
      });
    }

    const created = await Track.insertMany(resolvedTracks);

    for (const track of created) {
      await Pathway.findByIdAndUpdate(track.pathway, {
        $addToSet: { tracks: track._id },
      });
    }

    res.status(201).json({ message: "Tracks created.", tracks: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📋 Get all tracks with their subjects
const getAllTracks = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const tracks = await Track.find({ school: school._id }).populate("pathway", "name"); // ✅ fixed
    const subjects = await Subject.find({ school: school._id }).select("name code group track");

    const trackMap = tracks.map((track) => {
      const trackSubjects = subjects
        .filter((sub) => sub.track?.toString() === track._id.toString())
        .map((sub) => ({
          subjectId: sub._id,
          LearningArea: sub.name,
          code: sub.code,
          group: sub.group,
        }));

      return {
        trackId: track._id,
        trackName: track.name,
        trackCode: track.code,
        description: track.description,
        pathwayName: track.pathway?.name || null, // ✅ now populated
        subjects: trackSubjects,
      };
    });

    res.status(200).json(trackMap);
  } catch (err) {
    console.error("[getAllTracks]", err);
    res.status(500).json({ error: "Error fetching tracks." });
  }
};

// 📄 Get a single track
const getTrackById = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { trackId } = req.params;
    const track = await Track.findOne({
      _id: trackId,
      school: school._id,
    }).populate("pathway");

    if (!track) return res.status(404).json({ error: "Track not found." });
    res.status(200).json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update a track by code
const updateTrack = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { trackId } = req.params;
    const updates = req.body;

    const updated = await Track.findOneAndUpdate(
      { code: trackId.toUpperCase(), school: school._id },
      updates,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Track not found." });

    res
      .status(200)
      .json({ message: `Track updated: ${trackId}`, track: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Delete a track by code
const deleteTrack = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { trackId } = req.params;

    const deleted = await Track.findOneAndDelete({
      code: trackId.toUpperCase(),
      school: school._id,
    });

    if (!deleted) return res.status(404).json({ error: "Track not found." });

    await Pathway.findByIdAndUpdate(deleted.pathway, {
      $pull: { tracks: deleted._id },
    });

    res
      .status(200)
      .json({ message: `Track deleted: ${trackId}`, track: deleted });
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
  deleteTrack,
};
