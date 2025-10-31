const mongoose = require('mongoose');
const Student = require('../models/student');
const Subject = require('../models/subject');
const Pathway = require('../models/pathway');
const Track = require('../models/track');

require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('🔌 Connected to MongoDB');

  const students = await Student.find({ status: 'active' }).populate('pathway track');

  for (const student of students) {
    const pathwayId = student.pathway?._id;
    const trackId = student.track?._id;

    if (!pathwayId || !trackId) {
      console.warn(`⚠️ Missing pathway or track for ${student.name} (${student.admNo})`);
      continue;
    }

    // 🎯 Find 3 electives matching both pathway and track
    const electives = await Subject.find({
      pathway: pathwayId,
      track: trackId
    }).limit(3);

    if (electives.length !== 3) {
      console.warn(`⚠️ Found ${electives.length} electives for ${student.name} (${student.admNo}) — expected 3`);
      continue;
    }

    // ✅ Merge electives with existing subjects (compulsories already assigned)
    const existing = student.selectedSubjects.map(id => id.toString());
    const electiveIds = electives.map(s => s._id.toString());

    const newElectives = electiveIds.filter(id => !existing.includes(id));
    const finalSubjects = [...new Set([...existing, ...newElectives])];

    if (finalSubjects.length === existing.length) {
      console.log(`ℹ️ No update needed for ${student.name} (${student.admNo}) — already has all electives`);
      continue;
    }

    if (finalSubjects.length !== 7) {
      console.warn(`⚠️ Subject count mismatch for ${student.name} (${student.admNo})`);
      continue;
    }

    student.selectedSubjects = finalSubjects;
    await student.save();
    console.log(`✅ Updated ${student.name} (${student.admNo})`);
  }

  console.log('🎉 CBC patch complete — pathway + track matched');
  mongoose.disconnect();
});
