const mongoose = require('mongoose');

const pathwaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  tracks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track'
    }
  ],
  requiredSubjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }
  ],
  defaultElectives: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }
  ], // ✅ this comma was missing
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Pathway', pathwaySchema);
