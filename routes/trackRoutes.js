const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const trackController = require('../controllers/trackController');

// 📥 Create a new track
router.post(
  '/',
  verifyToken,
  checkRole(['admin']),
  trackController.createTrack
);
// 📦 Bulk create tracks
router.post(
  '/bulk-create',
  verifyToken,
  checkRole(['admin']),
  trackController.bulkCreateTracks
);

// 📋 Get all tracks
router.get(
  '/',
  verifyToken,
  checkRole(['teacher', 'admin']),
  trackController.getAllTracks
);

// 📄 Get a single track
router.get(
  '/:trackId',
  verifyToken,
  checkRole(['teacher', 'admin']),
  trackController.getTrackById
);

// ✏️ Update a track
router.put(
  '/:trackId',
  verifyToken,
  checkRole(['admin']),
  trackController.updateTrack
);

// 🗑️ Delete a track
router.delete(
  '/:trackId',
  verifyToken,
  checkRole(['admin']),
  trackController.deleteTrack
);

module.exports = router;
