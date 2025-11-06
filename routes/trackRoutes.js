const express = require('express');
const mongoose = require("mongoose");
const Track = require("../models/track");
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


// 📤 Get tracks, optionally filtered by pathwayId
router.get("/", async (req, res) => {
  try {
    const { pathwayId } = req.query;
    console.log("[GET /tracks] pathwayId:", pathwayId);

    // ✅ Validate ObjectId
    const isValidId = mongoose.Types.ObjectId.isValid(pathwayId);
    const query = isValidId ? { pathway: pathwayId } : {};

    const tracks = await Track.find(query);
    res.json(tracks);
  } catch (err) {
    console.error("[GET /tracks] Error:", err);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});




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
