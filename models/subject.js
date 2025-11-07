const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  group: {
    type: String,
    enum: ['Compulsory', 'STEM', 'SOCIAL', 'ARTS', 'OTHER'],
    default: 'OTHER'
  },
  compulsory: {
    type: Boolean,
    default: false
  },
  pathway: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pathway',
    default: null
  },
  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    default: null
  },
  lessonsPerWeek: {
    type: Number,
    default: 5
  },
  shortName: { 
  type: String,
  required: true },
  
  school: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  required: true
}


}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
