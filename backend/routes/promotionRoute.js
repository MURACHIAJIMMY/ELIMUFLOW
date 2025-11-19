const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const promoteStudents = require('../utils/promoteStudents');
const updateEnrollment = require('../utils/updateEnrollment'); // ✅ NEW

// 🎓 Manual promotion trigger
router.post(
  '/trigger-promotion',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    try {
      await promoteStudents();
      res.status(200).json({ message: 'Promotion triggered successfully' });
    } catch (err) {
      console.error('[ManualPromotionTrigger]', err);
      res.status(500).json({ error: 'Error triggering promotion' });
    }
  }
);

// 📘 Enrollment sync trigger
router.post(
  '/sync-enrollment',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    try {
      const { updatedCount, auditTrail } = await updateEnrollment();

      res.status(200).json({
        message: 'Enrollment updated successfully',
        updatedCount,
        auditTrail
      });
    } catch (err) {
      console.error('[SyncEnrollment]', err);
      res.status(500).json({ error: 'Error updating enrollment' });
    }
  }
);

module.exports = router;
