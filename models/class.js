const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // e.g., "10N", "11E"
    trim: true
  },
  grade: {
    type: Number,
    enum: [10, 11, 12],
    required: true
  },
  stream: {
    type: String,
    enum: ['NORTH', 'EAST', 'WEST', 'SOUTH'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false // ✅ used for auto-assignment during enrollment sync
  },
  academicYear: {
    type: Number,
    default: new Date().getFullYear() // ✅ ensures year-specific class grouping
  }
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);
