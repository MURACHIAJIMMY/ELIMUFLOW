const express = require('express');
const router = express.Router();
const {
  signup,
  verifySchoolCode,
  loginTeacher
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

module.exports = router;
