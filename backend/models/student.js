// backend/models/student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admNo: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  school: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  required: true
},
  nemisNo: {
  type: String,
  unique: true,
  sparse: true, // allows nulls without violating uniqueness
  trim: true
},
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  currentGrade: {
    type: Number,
    enum: [10, 11, 12],
    required: true
  },
  enrollmentYear: {
    type: Number,
    default: new Date().getFullYear()
  },
  pathway: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pathway',
    required: true
  },
  track: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: false
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  selectedSubjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    }
  ],
  status: {
    type: String,
    enum: ['active', 'graduated', 'archived'],
    default: 'active'
  },
  promotionHistory: [
    {
      year: Number,
      fromGrade: Number,
      toGrade: Number,
      promotedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);