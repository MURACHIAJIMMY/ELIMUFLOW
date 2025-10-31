// backend/models/subjectSelection.js
const mongoose = require('mongoose');

const subjectSelectionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  selectedSubjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('SubjectSelection', subjectSelectionSchema);
