// backend/models/track.js
const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  pathway: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pathway',
    required: true
  },
  school: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'School',
  required: true
}

}, { timestamps: true });

module.exports = mongoose.model('Track', trackSchema);
