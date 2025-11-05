const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/years', verifyToken, checkRole(['admin', 'teacher']), (req, res) => {
  const current = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => current - 1 + i); // e.g. [2024, 2025, 2026, 2027]
  res.status(200).json(years);
});

module.exports = router;
