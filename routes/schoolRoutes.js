const School = require('../models/school');
const express = require('express');
const router = express.Router();
const { createSchool, updateSchool } = require('../controllers/schoolController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
// 🏫 Create a school
router.post('/create', verifyToken, checkRole(['admin']), createSchool);

// 🛠️ Update a school by code
router.put('/update/:code', verifyToken, checkRole(['admin']), updateSchool);
// routes/school.js

router.get('/:code', async (req, res) => {
  try {
    const school = await School.findOne({ code: req.params.code.toUpperCase() });
    if (!school) return res.status(404).json({ message: 'School not found' });
    res.json(school);
  } catch (err) {
    console.error('[GetSchool]', err);
    res.status(500).json({ error: 'Error fetching school info' });
  }
});

module.exports = router;


