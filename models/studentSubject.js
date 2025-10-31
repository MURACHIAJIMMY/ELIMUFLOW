// models/studentSubject.js
const mongoose = require('mongoose');

const studentSubjectSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  autoAssigned: { type: Boolean, default: false },
  term: { type: String, enum: ['Term 1', 'Term 2', 'Term 3'], default: 'Term 1' },
  year: { type: Number, default: new Date().getFullYear() },
  score: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('StudentSubject', studentSubjectSchema);
