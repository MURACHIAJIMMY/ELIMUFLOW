const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const promoteStudents = require('../utils/promoteStudents');
const updateEnrollment = require('../utils/updateEnrollment'); // ✅ NEW
const injectMissingFields = require('../utils/injectMissingFields');
const injectMissingClassFields = require('../utils/injectMissingClassFields');

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

// 🛠️ Inject missing student fields
router.post(
  '/inject-student-fields',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    try {
      await injectMissingFields();
      res.status(200).json({ message: 'Student fields injected successfully' });
    } catch (err) {
      console.error('[InjectStudentFields]', err);
      res.status(500).json({ error: 'Error injecting student fields' });
    }
  }
);

// 🛠️ Inject missing class fields
router.post(
  '/inject-class-fields',
  verifyToken,
  checkRole(['admin']),
  async (req, res) => {
    try {
      const { updated, auditTrail } = await injectMissingClassFields();
      res.status(200).json({
        message: 'Class fields injected successfully',
        updated,
        auditTrail
      });
    } catch (err) {
      console.error('[InjectClassFields]', err);
      res.status(500).json({ error: 'Error injecting class fields' });
    }
  }
);


module.exports = router;