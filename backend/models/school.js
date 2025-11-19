const mongoose = require('mongoose');
const schoolSchema = new mongoose.Schema({
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
  contact: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  motto: {
    type: String,
    trim: true
  },
  logo: [
    {
      url: { type: String, required: true },       // Cloudinary URL
      public_id: { type: String, required: true }  // Cloudinary public_id
    }
  ]
}, { timestamps: true });

module.exports = mongoose.models.School || mongoose.model('School', schoolSchema);
