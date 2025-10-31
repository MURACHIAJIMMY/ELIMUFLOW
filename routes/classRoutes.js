const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const classController = require('../controllers/classController');

// 📦 Bulk create classes
router.post(
  '/bulk',
  verifyToken,
  checkRole(['admin']),
  classController.bulkCreateClasses
);

// 🔍 Get class by name
router.get(
  '/name/:name',
  verifyToken,
  checkRole(['admin', 'teacher']),
  classController.getClassByName
);

// 📘 Get all classes or filter by grade
router.get(
  '/',
  verifyToken,
  checkRole(['admin', 'teacher']),
  classController.getClasses
);
// ✏️ Update class by name
router.put(
  '/update/name/:name',
  verifyToken,
  checkRole(['admin']),
  classController.updateClassByName
);

// 🗑️ Delete class by name
router.delete(
  '/delete/name/:name',
  verifyToken,
  checkRole(['admin']),
  classController.deleteClassByName
);


module.exports = router;
