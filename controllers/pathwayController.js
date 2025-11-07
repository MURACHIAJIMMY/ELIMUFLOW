const Pathway = require('../models/pathway');
const Track = require('../models/track');
const Subject = require('../models/subject'); // ✅ Ensure Subject is imported
const School = require('../models/school');

// 📥 Create a new pathway using track codes
const createPathway = async (req, res) => {
  try {
    const { name, description, trackCodes, requiredSubjects, defaultElectives } = req.body;

    const exists = await Pathway.findOne({ name, school: req.user.schoolId });
    if (exists) return res.status(409).json({ error: 'Pathway already exists.' });

    let trackIds = [];
    if (Array.isArray(trackCodes) && trackCodes.length > 0) {
      const tracks = await Track.find({ code: { $in: trackCodes.map(c => c.toUpperCase()) }, school: req.user.schoolId });
      trackIds = tracks.map(t => t._id);
    }

    const pathway = await Pathway.create({
      name,
      description,
      tracks: trackIds,
      requiredSubjects,
      defaultElectives,
      school: req.user.schoolId
    });

    if (trackIds.length > 0) {
      await Track.updateMany(
        { _id: { $in: trackIds } },
        { $set: { pathway: pathway._id } }
      );
    }

    res.status(201).json({ message: 'Pathway created.', pathway });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📦 Bulk create pathways using track codes
const bulkCreatePathways = async (req, res) => {
  try {
    const rawPathways = req.body;

    if (!Array.isArray(rawPathways) || rawPathways.length === 0) {
      return res.status(400).json({ error: "Provide an array of pathway objects." });
    }

    const resolved = [];

    for (const raw of rawPathways) {
      const { name, description, trackCodes = [], requiredSubjects = [], defaultElectives = [] } = raw;

      let trackIds = [];
      if (trackCodes.length > 0) {
        const tracks = await Track.find({ code: { $in: trackCodes.map(c => c.toUpperCase()) }, school: req.user.schoolId });
        trackIds = tracks.map(t => t._id);
      }

      resolved.push({
        name,
        description,
        tracks: trackIds,
        requiredSubjects,
        defaultElectives,
        school: req.user.schoolId
      });
    }

    const created = await Pathway.insertMany(resolved);

    for (const pathway of created) {
      if (Array.isArray(pathway.tracks) && pathway.tracks.length > 0) {
        await Track.updateMany(
          { _id: { $in: pathway.tracks } },
          { $set: { pathway: pathway._id } }
        );
      }
    }

    res.status(201).json({ message: "Pathways created.", pathways: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📋 Get all pathways
const getAllPathways = async (req, res) => {
  try {
    const pathways = await Pathway.find({ school: req.user.schoolId })
      .select('_id name description')
      .populate({
        path: 'tracks',
        select: 'name code description'
      });

    const formatted = pathways.map(pathway => ({
      _id: pathway._id,
      name: pathway.name,
      description: pathway.description,
      tracks: pathway.tracks?.map(track => ({
        name: track.name,
        code: track.code,
        description: track.description
      })) || []
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error('[getAllPathways]', err);
    res.status(500).json({ error: 'Failed to fetch pathways.' });
  }
};

// 📄 Get pathway by name and populate subject names
const getPathwayByName = async (req, res) => {
  try {
    const { name } = req.params;

    const pathway = await Pathway.findOne({ name, school: req.user.schoolId });
    if (!pathway) {
      return res.status(404).json({ error: 'Pathway not found' });
    }

    const subjects = await Subject.find({ pathway: pathway._id }).select('name');

    res.status(200).json({
      pathway: {
        _id: pathway._id,
        name: pathway.name,
        description: pathway.description
      },
      subjects: subjects.map(s => ({ LearningArea: s.name }))
    });
  } catch (err) {
    console.error('[getPathwayByName]', err);
    res.status(500).json({ error: 'Error fetching pathway and subjects' });
  }
};

// 📄 Get pathway by name and populate tracks + subject names
const getPathwayDetailsByName = async (req, res) => {
  try {
    const { name } = req.params;

    const pathway = await Pathway.findOne({ name, school: req.user.schoolId }).select('_id name description');
    if (!pathway) {
      return res.status(404).json({ error: 'Pathway not found' });
    }

    const tracks = await Track.find({ pathway: pathway._id }).select('_id name code description');
    const subjects = await Subject.find({ pathway: pathway._id }).select('name code group track');

    const trackMap = tracks.map(track => {
      const subjectsInTrack = subjects
        .filter(subject => subject.track?.toString() === track._id.toString())
        .map(subject => ({
          LearningArea: subject.name,
          code: subject.code,
          group: subject.group
        }));

      return {
        name: track.name,
        code: track.code,
        description: track.description,
        subjects: subjectsInTrack
      };
    });

    res.status(200).json({
      pathway,
      tracks: trackMap
    });
  } catch (err) {
    console.error('[getPathwayDetailsByName]', err);
    res.status(500).json({ error: 'Error fetching pathway details' });
  }
};

// ✏️ Update a pathway
const updatePathway = async (req, res) => {
  try {
    const { pathwayId } = req.params;
    const updates = req.body;

    const updated = await Pathway.findOneAndUpdate(
      { _id: pathwayId, school: req.user.schoolId },
      updates,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Pathway not found.' });

    res.status(200).json({ message: 'Pathway updated.', pathway: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Delete a pathway using name (not ID)
const deletePathway = async (req, res) => {
  try {
    const { pathwayId } = req.params;
    const deleted = await Pathway.findOneAndDelete({ name: pathwayId, school: req.user.schoolId });

    if (!deleted) return res.status(404).json({ error: "Pathway not found." });
    res.status(200).json({ message: `Deleted pathway: ${pathwayId}`, pathway: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔧 Update single or multiple pathways by name
const updatePathwaysByName = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const results = [];

      for (const item of payload) {
        const { name, newName, ...fields } = item;
        if (!name) continue;
        if (newName) fields.name = newName;

        const updated = await Pathway.findOneAndUpdate(
          { name: new RegExp(`^${name}$`, 'i'), school: req.user.schoolId },
          fields,
          { new: true, runValidators: true }
        ).select('_id name description code');

        if (updated) results.push(updated);
      }

      return res.status(200).json({
        message: 'Bulk update completed',
        updatedCount: results.length,
        pathways: results
      });
    }

    const { name, newName, ...fields } = payload;
    if (!name) {
      return res.status(400).json({ error: 'Missing pathway name' });
    }
    if (newName) {
      fields.name = newName;
    }

    const updated = await Pathway.findOneAndUpdate(
      { name: new RegExp(`^${name}$`, 'i'), school: req.user.schoolId },
      fields,
      { new: true, runValidators: true }
    ).select('_id name description code');

    if (!updated) {
      return res.status(404).json({ error: 'Pathway not found' });
    }

    res.status(200).json({
      message: 'Pathway updated successfully',
      pathway: updated
    });
  } catch (err) {
    console.error('[UpdatePathwaysByName]', err);
    res.status(500).json({ error: 'Update failed' });

  }
};


module.exports = {
  createPathway,
  bulkCreatePathways,
  getAllPathways,
  getPathwayByName,
  getPathwayDetailsByName,
  updatePathway,
  deletePathway,
  updatePathwaysByName
};
