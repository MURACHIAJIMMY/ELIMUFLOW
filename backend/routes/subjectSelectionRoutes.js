const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
  selectSubjectsByAdmNo,
  getSelectedSubjectsByAdmNo,
  updateSelectedSubjectsByAdmNo,
  deleteSelectedSubjectsByAdmNo,
  validateAllSubjectSelections,
  getStudentElectivesForPathway
} = require('../controllers/subjectSelectionController');

// 📝 Initial subject selection by admission number
router.post(
  '/student/select',
  verifyToken,
  checkRole(['admin', 'teacher']),
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
// 🎯 Get student electives for a specific pathway by admission number
router.get(
  '/student/admno/:admNo/electives',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getStudentElectivesForPathway
);

module.exports = router;
