const School = require('../models/school');
const express = require('express');
const router = express.Router();
const { createSchool, updateSchool } = require('../controllers/schoolController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // import your multer config

// 🏫 Create a new school (admin only)
router.post('/create', verifyToken, checkRole(['admin']), upload.single('logo'), createSchool);

// 🛠️ Update school by code (admin only)
router.put('/update/:code', verifyToken, checkRole(['admin']), upload.single('logo'), updateSchool);
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
// ✅ Proxy to fetch and serve school logo
router.get("/logo/:schoolCode", async (req, res) => {
  try {
    const school = await School.findOne({ code: req.params.schoolCode.toUpperCase() });
    if (!school || !school.logo || !school.logo[0]?.url) {
      return res.status(404).send("Logo not found");
    }

    const imageRes = await fetch(school.logo[0].url);
    const buffer = await imageRes.buffer();
    res.set("Content-Type", "image/jpeg");
    res.send(buffer);
  } catch (err) {
    console.error("[LogoProxy]", err);
    res.status(500).send("Error loading logo");
  }
});

module.exports = router;


