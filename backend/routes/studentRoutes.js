

// module.exports = router;
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

const {
  registerStudent,
  bulkRegisterStudents,
  auditCBCCompliance,
  getStudentsByClass,
  getStudentProfile,
  getAllStudents,
  getStudentSubjects,
  getAllStudentsWithSubjects,
  getStudentsWithSubjectsByClassName,
  updateStudentByAdmNo,
  deleteStudentByAdmNo,
   getStudentSubjectsByAdmNo
  
} = require('../controllers/studentController');

// 📝 Register a new student (CBC-compliant: auto-assign ENG, CSL, + choice of KISW/KSL and MATH-C/MATH-E)
router.post(
  '/register',
  verifyToken,
  checkRole(['admin']),
  registerStudent
);

// 📦 Bulk register students (CBC-compliant: same logic applied per student)
router.post(
  '/bulk',
  verifyToken,
  checkRole(['admin']),
  bulkRegisterStudents
);

// 📊 Audit CBC pathway compliance
router.get(
  "/audit/cbc-compliance",
  verifyToken,
  checkRole(["admin"]),
  auditCBCCompliance
);

// 📚 Get subjects by admission number
router.get(
  '/admno/:admNo/subjects',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getStudentSubjects
);

// 📚 Get subjects for a specific student
router.get(
  '/:studentId/subjects',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getStudentSubjects
);

// 📘 Get students by class
router.get(
  '/class/:classId',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getStudentsByClass
);

// 📘 Get students by class name
router.get(
  '/class/name/:className',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getStudentsByClass
);

// 📋 Get all students
router.get(
  '/',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getAllStudents
);

// 📄 Get individual student profile
router.get(
  '/profile/:studentId',
  verifyToken,
  checkRole(['admin']),
  getStudentProfile
);

// 📄 Get all students with their subjects
router.get(
  '/students-with-subjects',
  verifyToken,
  checkRole(['admin', 'teacher']),
  getAllStudentsWithSubjects
);

// 📄 Get students with their subjects by class name
router.get(
  '/class/:className/students-with-subjects',
  verifyToken,
  checkRole(['admin', 'teacher']),
  getStudentsWithSubjectsByClassName
);

// 🔧 Update student details by admission number
router.put(
  '/admno/:admNo/update',
  verifyToken,
  checkRole(['admin']),
  updateStudentByAdmNo
);

// 🗑️ Delete student by admission number
router.delete(
  '/admno/:admNo/delete',
  verifyToken,
  checkRole(['admin']),
  deleteStudentByAdmNo
);
// 📚 Get subjects for a student by admission number
router.get(
  '/adm/:admNo/subjects',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getStudentSubjectsByAdmNo
);


module.exports = router;
