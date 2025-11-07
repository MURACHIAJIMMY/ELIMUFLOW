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
  ],
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('SubjectSelection', subjectSelectionSchema);
