const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  paperNo: { type: Number, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  exam: {
    type: String,
    required: true,
    trim: true // ✅ dropped enum for flexibility
  },
  year: {
    type: Number,
    required: true
  },
  papers: {
    type: [paperSchema],
    validate: v => Array.isArray(v) && v.length > 0
  },
  grade: {
    type: String,
    enum: [
      'Emerging 1', 'Emerging 2',
      'Approaching Expectations 1', 'Approaching Expectations 2',
      'Meeting Expectations 1', 'Meeting Expectations 2',
      'Exceeding Expectations 1', 'Exceeding Expectations 2',
      'Exceptional 1', 'Exceptional 2'
    ],
    default: null
  },
  comment: {
    type: String,
    default: ''
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
