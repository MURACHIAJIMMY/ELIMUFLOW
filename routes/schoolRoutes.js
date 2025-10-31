const express = require('express');
const router = express.Router();
const { createSchool, updateSchool } = require('../controllers/schoolController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
// 🏫 Create a school
router.post('/create', verifyToken, checkRole(['admin']), createSchool);

// 🛠️ Update a school by code
router.put('/update/:code', verifyToken, checkRole(['admin']), updateSchool);

module.exports = router;
