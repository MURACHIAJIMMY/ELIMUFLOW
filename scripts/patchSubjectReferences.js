const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Subject = require('../models/subject');
const Pathway = require('../models/pathway');
const Track = require('../models/track');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

const patchSubjects = async () => {
  try {
    const pathways = await Pathway.find();
    const tracks = await Track.find();

    const pathwayMap = {};
    pathways.forEach(p => (pathwayMap[p.name] = p._id));

    const trackMap = {};
    tracks.forEach(t => (trackMap[t.name] = t._id));

    const subjects = await Subject.find();

    const updates = await Promise.all(
      subjects.map(async subject => {
        const { group } = subject;

        const pathwayId = pathwayMap[group]; // Match by group name
        const trackId = trackMap['Engineering & Technology']; // Default track for STEM

        if (!pathwayId) return { name: subject.name, status: 'No matching pathway' };

        subject.pathway = pathwayId;
        subject.track = group === 'STEM' ? trackId : null;

        await subject.save();
        return { name: subject.name, status: 'Updated' };
      })
    );

    console.table(updates);
    console.log('✅ Subject references patched');
    process.exit(0);
  } catch (err) {
    console.error('❌ Patch failed:', err);
    process.exit(1);
  }
};

connectDB().then(patchSubjects);
