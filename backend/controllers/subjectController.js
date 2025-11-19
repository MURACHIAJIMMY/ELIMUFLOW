const Subject = require("../models/subject");
const Pathway = require("../models/pathway");
const Track = require("../models/track");
const School = require("../models/school");
const { subjectPools } = require("../utils/subjectPools");

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

// 🔒 Create a single subject
const createSubject = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found." });
    }

    const {
      name,
      code,
      group,
      compulsory,
      pathwayName,
      trackCode,
      lessonsPerWeek,
      shortName,
    } = req.body;

    const exists = await Subject.findOne({
      code: code.toUpperCase(),
      school: school._id,
    });
    if (exists) {
      return res.status(409).json({ error: "Subject code already exists." });
    }

    const pathwayDoc = await Pathway.findOne({
      name: pathwayName,
      school: school._id,
    });
    const trackDoc = await Track.findOne({
      code: trackCode,
      school: school._id,
    });

    if (!pathwayDoc || !trackDoc) {
      return res.status(404).json({ error: "Pathway or track not found." });
    }

    const subject = await Subject.create({
      name,
      code: code.toUpperCase(),
      group,
      compulsory,
      pathway: pathwayDoc._id,
      track: trackDoc._id,
      lessonsPerWeek,
      shortName: shortName?.trim() || name.slice(0, 3),
      school: school._id,
    });

    const populated = await Subject.findById(subject._id)
      .populate({ path: "pathway", select: "name" })
      .populate({ path: "track", select: "name code" });

    res.status(201).json({
      message: "Subject created.",
      subject: {
        LearningArea: populated.name,
        code: populated.code,
        group: populated.group,
        lessonsPerWeek: populated.lessonsPerWeek,
        compulsory: populated.compulsory,
        pathway: populated.pathway?.name || null,
        track: populated.track
          ? { name: populated.track.name, code: populated.track.code }
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create subject." });
  }
};

// 📦 Bulk create subjects
const bulkCreateSubjects = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found." });
    }

    const rawSubjects = req.body;
    if (!Array.isArray(rawSubjects) || rawSubjects.length === 0) {
      return res.status(400).json({ error: "Provide an array of subject objects." });
    }

    const defaultPathway = await Pathway.findOne({
      name: "Compulsory",
      school: school._id,
    });
    const defaultTrack = await Track.findOne({
      code: "CORE",
      school: school._id,
    });

    if (!defaultPathway || !defaultTrack) {
      return res.status(500).json({
        error: "Default pathway or track not found. Please seed them first.",
      });
    }

    const resolvedSubjects = [];
    const skippedSubjects = [];

    for (const raw of rawSubjects) {
      const pathwayDoc = raw.pathwayName
        ? await Pathway.findOne({
            name: new RegExp(`^${raw.pathwayName.trim()}$`, "i"),
            school: school._id,
          })
        : defaultPathway;

      const trackDoc = raw.trackCode
        ? await Track.findOne({
            code: new RegExp(`^${raw.trackCode.trim()}$`, "i"),
            school: school._id,
          })
        : defaultTrack;

      if (!pathwayDoc || !trackDoc) {
        skippedSubjects.push({
          name: raw.name,
          reason: "Missing pathway or track",
        });
        continue;
      }

      resolvedSubjects.push({
        name: raw.name,
        code: raw.code.toUpperCase(),
        group: raw.group || "Unclassified",
        compulsory: raw.compulsory ?? false,
        pathway: pathwayDoc._id,
        track: trackDoc._id,
        lessonsPerWeek: raw.lessonsPerWeek || 5,
        shortName: raw.shortName?.trim() || raw.name.slice(0, 3),
        school: school._id,
      });
    }

    if (resolvedSubjects.length === 0) {
      return res.status(400).json({ error: "No valid subjects to insert." });
    }

    const existing = await Subject.find({
      code: { $in: resolvedSubjects.map((s) => s.code) },
      school: school._id,
    }).select("code");

    if (existing.length > 0) {
      return res.status(409).json({
        error: `Duplicate subject codes: ${existing.map((e) => e.code).join(", ")}`,
      });
    }

    let created = [];
    try {
      created = await Subject.insertMany(resolvedSubjects, { ordered: false });
    } catch (insertErr) {
      if (insertErr.writeErrors) {
        insertErr.writeErrors.forEach((e) => {
          skippedSubjects.push({
            name: e.err.op.name,
            reason: e.err.errmsg || "Insert error",
          });
        });
        created = insertErr.insertedDocs || [];
      } else {
        return res.status(500).json({ error: "Insert failed." });
      }
    }

    const populated = await Subject.find({
      _id: { $in: created.map((s) => s._id) },
    })
      .populate({ path: "pathway", select: "name" })
      .populate({ path: "track", select: "name code" });

    const formatted = populated.map((sub) => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      lessonsPerWeek: sub.lessonsPerWeek,
      compulsory: sub.compulsory,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null,
    }));

    res.status(201).json({
      message: `${formatted.length} subjects created.`,
      subjects: formatted,
      skipped: skippedSubjects,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create subjects." });
  }
};


// ✅ Validate subject registry
const validateSubjectRegistry = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const subjects = await Subject.find({ school: school._id });
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
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { pathwayName, trackCode } = req.query;
    const query = { school: school._id };

    if (pathwayName) {
      const pathwayDoc = await Pathway.findOne({
        name: pathwayName,
        school: school._id,
      });
      if (!pathwayDoc)
        return res.status(404).json({ error: "Pathway not found." });
      query.pathway = pathwayDoc._id;
    }

    if (trackCode) {
      const trackDoc = await Track.findOne({
        code: trackCode,
        school: school._id,
      });
      if (!trackDoc) return res.status(404).json({ error: "Track not found." });
      query.track = trackDoc._id;
    }

    const subjects = await Subject.find(query)
      .select("name code group")
      .populate({ path: "pathway", select: "name" })
      .populate({ path: "track", select: "name code" });

    const formatted = subjects.map((sub) => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("[getSubjectsByPathwayTrack]", err);
    res.status(500).json({ error: "Failed to filter subjects." });
  }
};

// 📄 Get all subjects
// 📄 Get all subjects
const getAllSubjects = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    // Include _id!
    const subjects = await Subject.find({ school: school._id })
      .select("_id name code group lessonsPerWeek compulsory")
      .populate({ path: "pathway", select: "name" })
      .populate({ path: "track", select: "name code" });

    // Keep _id in object!
    const formatted = subjects.map((sub) => ({
      _id: sub._id,                          // <--- add this field
      LearningArea: sub.name,
      name: sub.name,
      code: sub.code,
      group: sub.group,
      compulsory: sub.compulsory ?? false,
      lessonsPerWeek: sub.lessonsPerWeek ?? null,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("[getAllSubjects]", err);
    res.status(500).json({ error: "Failed to fetch subjects." });
  }
};


// 📄 Get compulsory subjects
const getCompulsorySubjects = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const subjects = await Subject.find({
      compulsory: true,
      school: school._id,
    })
      .select("name code group lessonsPerWeek")
      .populate({ path: "pathway", select: "name" })
      .populate({ path: "track", select: "name code" });

    const formatted = subjects.map((sub) => ({
      LearningArea: sub.name,
      code: sub.code,
      group: sub.group,
      lessonsPerWeek: sub.lessonsPerWeek,
      pathway: sub.pathway?.name || null,
      track: sub.track ? { name: sub.track.name, code: sub.track.code } : null,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("[getCompulsorySubjects]", err);
    res.status(500).json({ error: "Failed to fetch compulsory subjects." });
  }
};
// 🔧 Update subject by name
const updateSubjectByName = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { subjectName } = req.params;
    const updates = { ...req.body };

    // Resolve pathway and track if needed
    if (updates.pathway && typeof updates.pathway === "string") {
      const pathwayDoc = await Pathway.findOne({ name: updates.pathway, school: school._id });
      updates.pathway = pathwayDoc?._id;
    }

    if (updates.track && typeof updates.track === "string") {
      const trackDoc = await Track.findOne({ code: updates.track, school: school._id });
      updates.track = trackDoc?._id;
    }

    // Handle optional name change
    if (updates.newName) {
      updates.name = updates.newName.trim();
      delete updates.newName;
    }

    const subject = await Subject.findOneAndUpdate(
      { name: subjectName, school: school._id },
      updates,
      { new: true }
    ).populate([
      { path: "pathway", select: "name" },
      { path: "track", select: "name code" },
    ]);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found." });
    }

    res.status(200).json({
      message: "Subject updated.",
      subject: {
        LearningArea: subject.name,
        code: subject.code,
        group: subject.group,
        lessonsPerWeek: subject.lessonsPerWeek,
        compulsory: subject.compulsory,
        shortName: subject.shortName,
        pathway: subject.pathway?.name || null,
        track: subject.track
          ? { name: subject.track.name, code: subject.track.code }
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update subject." });
  }
};
// bulk update
const bulkUpdateSubjects = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const updates = req.body;

    const resolveRef = async (model, name) => {
      if (!name || typeof name !== "string") return null;
      const doc = await model.findOne({ name, school: school._id });
      return doc?._id || null;
    };

    const results = await Promise.all(
      updates.map(async ({ name, updates }) => {
        // Resolve references
        if (updates.pathway && typeof updates.pathway === "string") {
          updates.pathway = await resolveRef(Pathway, updates.pathway);
        }
        if (updates.track && typeof updates.track === "string") {
          updates.track = await resolveRef(Track, updates.track);
        }

        // Handle optional rename
        if (updates.newName) {
          updates.name = updates.newName.trim();
          delete updates.newName;
        }

        // Ensure shortName fallback
        if (!updates.shortName && typeof name === "string") {
          updates.shortName = name.slice(0, 3);
        }

        const subject = await Subject.findOneAndUpdate(
          { name, school: school._id },
          updates,
          { new: true }
        ).populate([
          { path: "pathway", select: "name" },
          { path: "track", select: "name code" },
        ]);

        return subject
          ? {
              LearningArea: subject.name,
              updated: true,
              subject: {
                code: subject.code,
                group: subject.group,
                lessonsPerWeek: subject.lessonsPerWeek,
                compulsory: subject.compulsory,
                shortName: subject.shortName,
                pathway: subject.pathway?.name || null,
                track: subject.track
                  ? { name: subject.track.name, code: subject.track.code }
                  : null,
              },
            }
          : { LearningArea: name, updated: false };
      })
    );

    res.status(200).json({ message: "Subjects updated.", results });
  } catch (err) {
    console.error("[bulkUpdateSubjects]", err);
    res.status(500).json({ error: "Failed to update subjects." });
  }
};


// ❌ Delete subject by name
const deleteSubjectByName = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: "Subject name is required." });
    }

    const deleted = await Subject.findOneAndDelete({
      name,
      school: school._id,
    });

    if (!deleted) {
      return res.status(404).json({ error: `Subject '${name}' not found.` });
    }

    res.status(200).json({
      message: `Subject '${name}' deleted successfully.`,
      deleted: {
        LearningArea: deleted.name,
        code: deleted.code,
        group: deleted.group,
      },
    });
  } catch (err) {
    console.error("[deleteSubjectByName]", err);
    res.status(500).json({ error: "Failed to delete subject." });
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
  deleteSubjectByName,
};
