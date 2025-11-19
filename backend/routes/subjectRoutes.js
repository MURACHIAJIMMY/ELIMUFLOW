const express = require('express');
const router = express.Router();
const {
  createSubject,
  bulkCreateSubjects,
  validateSubjectRegistry,
  getSubjectsByPathwayTrack,
  getAllSubjects,
  getCompulsorySubjects,
  updateSubjectByName,
  bulkUpdateSubjects,
  deleteSubjectByName
} = require('../controllers/subjectController');

const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// 🔒 Create a single subject (admin only)
router.post('/create', verifyToken, checkRole(['admin']), createSubject);

// 📦 Bulk create subjects (admin only)
router.post('/bulk-create', verifyToken, checkRole(['admin']), bulkCreateSubjects);
// ✅ Validate subject registry (admin only)
router.get('/validate/registry', verifyToken, checkRole(['admin']), validateSubjectRegistry);

// 📚 Get subjects by pathway and track
router.get('/filter', verifyToken, getSubjectsByPathwayTrack);

// 📄 Get all subjects (admin dashboard)
router.get('/all', verifyToken, checkRole(['admin']), getAllSubjects);

// 📄 Get compulsory subjects
router.get(
  '/compulsory',
  verifyToken,
  checkRole(['admin', 'teacher']),
  getCompulsorySubjects
);
// 🔧 Update subject by name (admin only)
router.put(
  '/update/:subjectName',
  verifyToken,
  checkRole(['admin']),
  updateSubjectByName
);
// 📦 Bulk update subjects by name (admin only)
router.put(
  '/bulk-update',
  verifyToken,
  checkRole(['admin']),
  bulkUpdateSubjects
);

// 📦 Delete subject by name (admin only)
router.delete(
  '/delete/:name',
  verifyToken,
  checkRole(['admin']),
  deleteSubjectByName
);

module.exports = router;
