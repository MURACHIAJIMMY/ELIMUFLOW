const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
  selectSubjectsByAdmNo,
  getSelectedSubjectsByAdmNo,
  updateSelectedSubjectsByAdmNo,
  deleteSelectedSubjectsByAdmNo,
  validateAllSubjectSelections
} = require('../controllers/subjectSelectionController');

// 📝 Initial subject selection by admission number
router.post(
  '/student/select',
  verifyToken,
  checkRole(['admin']),
  selectSubjectsByAdmNo
);


// 📋 Get selected subjects by admission number
router.get(
  '/student/admno/:admNo',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getSelectedSubjectsByAdmNo
);


// ✏️ Update elective subjects by admission number
router.put(
  '/student/admno/:admNo',
  verifyToken,
  checkRole(['admin']),
  updateSelectedSubjectsByAdmNo
);
// 🗑️ Delete selected elective subjects by admission number
router.delete(
  '/student/admno/:admNo',
  verifyToken,
  checkRole(['admin']),
  deleteSelectedSubjectsByAdmNo
);
// 📊 Validate CBC subject selections across all students
router.get(
  '/validate/cbc-subjects',
  verifyToken,
  checkRole(['admin']),
  validateAllSubjectSelections
);

module.exports = router;
