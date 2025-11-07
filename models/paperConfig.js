const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  paperNo: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

const paperConfigSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  grade: {
    type: Number,
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
  trim: true
}, 
  year: {
    type: Number,
    required: true
  },
  papers: {
    type: [paperSchema],
    validate: v => Array.isArray(v) && v.length > 0
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('PaperConfig', paperConfigSchema);
