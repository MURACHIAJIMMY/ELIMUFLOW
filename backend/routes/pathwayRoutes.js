const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const pathwayController = require('../controllers/pathwayController');

// 📥 Create a new pathway
router.post(
  '/',
  verifyToken,
  checkRole(['admin']),
  pathwayController.createPathway
);
// 📦 Bulk create pathways
router.post(
  '/bulk-create',
  verifyToken,
  checkRole(['admin']),
  pathwayController.bulkCreatePathways
);


// 📋 Get all pathways
router.get(
  '/',
  verifyToken,
  checkRole(['teacher', 'admin']),
  pathwayController.getAllPathways
);
// 📄 Get pathway by name and populate subjects
router.get(
  '/name/:name',
  verifyToken,
  checkRole(['teacher', 'admin']),
  pathwayController.getPathwayByName
);

// 📄 Get pathway by name with tracks and subjects
router.get(
  '/details/name/:name',
  verifyToken,
  checkRole(['teacher', 'admin']),
  pathwayController.getPathwayDetailsByName
);

// ✏️ Update a pathway
router.put(
  '/:pathwayId',
  verifyToken,
  checkRole(['admin']),
  pathwayController.updatePathway
);

// 🗑️ Delete a pathway
router.delete(
  '/:pathwayId',
  verifyToken,
  checkRole(['admin']),
  pathwayController.deletePathway
);
// 🔧 Unified update by pathway name (single or bulk)
router.put(
  '/update/by-name',
  verifyToken,
  checkRole(['admin']),
  pathwayController.updatePathwaysByName
);

module.exports = router;
