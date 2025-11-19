const express = require('express');
const router = express.Router();
const {
  signup,
  verifySchoolCode,
  loginTeacher,
  updateTeacherByUsername,
  deleteTeacherByUsername
} = require('../controllers/authController');

const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// ✅ Admin-only: create teacher
router.post('/signup', verifyToken, checkRole(['admin']), signup);

// ✅ Admin-only: create another admin
router.post('/admin/signup', verifyToken, checkRole(['admin']), signup); // 🔒 Same controller, different route
// router.post('/admin/signup', signup); // 🔓 Temporarily open

// ✅ Verify school code
router.post('/verify-school', verifySchoolCode);

// ✅ Login teacher
router.post('/login', loginTeacher);
// ✅ Admin-only update teacher by username
router.put('/update/:username', verifyToken, checkRole(['admin']), updateTeacherByUsername);
router.delete('/delete/:username', verifyToken, checkRole(['admin']), deleteTeacherByUsername);

module.exports = router;
