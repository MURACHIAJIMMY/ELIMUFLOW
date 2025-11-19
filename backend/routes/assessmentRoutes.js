const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/authMiddleware");
const {
  enterMarks,
  updateMarks,
  fetchAssessments,
  generateReportForm,
  generateBroadsheetUnified,
  generateBroadsheetBundle,
  getGradeDistributionUnified,
  rankGradeAndClasses,
  rankSubjectsAndLearningAreas,
  getAssessmentByAdmNo,
} = require("../controllers/assessmentController");

// ✏️ Enter marks for multiple students by teacher/admin and paper config
router.post(
  "/enter-marks",
  verifyToken,
  checkRole(["teacher", "admin"]),
  enterMarks
);

// 📝 Update marks for a single/multiple student
router.put(
  "/update-marks",
  verifyToken,
  checkRole(["admin", "teacher"]),
  updateMarks
);
// 📝 Fetch assessments for students in a class for a specific subject, term, exam, year
router.get(
  "/fetch",
  verifyToken,
  checkRole(["admin", "teacher"]),
  fetchAssessments
);
// 📄 Generate report form for a single student
router.get(
  "/reportform",
  verifyToken,
  checkRole(["admin"]),
  generateReportForm
);

// 📄 Unified broadsheet route (class or grade by name)
router.get(
  "/broadsheet",
  verifyToken,
  checkRole(["teacher", "admin"]),
  generateBroadsheetUnified
);
// 📦 Broadsheet ZIP bundle route (multi-pathway export)
router.get(
  "/broadsheet/bundle",
  verifyToken,
  checkRole(["teacher", "admin"]),
  generateBroadsheetBundle
);

// 📊 Unified CBC Grade Distribution (class, grade, or all)
router.get(
  "/distribution/:level/:term/:year/:exam",
  verifyToken,
  checkRole(["teacher", "admin"]),
  getGradeDistributionUnified
);

// 📊 Unified ranking: classes in a grade + grades across school
router.get(
  "/ranking/:grade/:term/:year/:exam",
  verifyToken,
  checkRole(["teacher", "admin"]),
  rankGradeAndClasses
);

// 📊 Unified subject and learning area ranking by grade and scope
router.get(
  "/learningarea/rank/:grade/:term/:year/:exam",
  verifyToken,
  checkRole(["teacher", "admin"]),
  rankSubjectsAndLearningAreas
);

// 🆕 Get assessment by student admission number and subject name
router.get(
  "/by-adm/:admNo/subject/:subjectName",
  verifyToken,
  checkRole(["admin", "teacher"]),
  getAssessmentByAdmNo
);

module.exports = router;
