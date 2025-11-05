const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

const {
  setPaperConfig,
  setPaperConfigByName,
  getPaperConfigByName,
  getPaperConfigs,
  updatePaperConfigByName,
  deletePaperConfigByName
} = require('../controllers/setPaperConfig');

// 🔐 Admin sets paper configuration
router.post(
  '/paper-config',
  verifyToken,
  checkRole(['admin']),
  setPaperConfig
);
// 🔐 Admin sets paper configuration by subject name
router.post(
  '/paper-config/:subjectName',
  verifyToken,
  checkRole(['admin']),
  setPaperConfigByName
);

// 🔍 Teacher or admin fetches paper configuration
router.get(
  '/paper-config/:subjectName',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getPaperConfigByName
);

// 🔍 Teacher or admin fetches all paper configurations
router.get(
  '/paper-configs',
  verifyToken,
  checkRole(['teacher', 'admin']),
  getPaperConfigs
);
// 🔐 Admin updates paper configuration by subject name
router.put(
  '/paper-config/:subjectName',
  verifyToken,
  checkRole(['admin']),
  updatePaperConfigByName
);
// 🔐 Admin deletes paper config by subject + grade + term + exam + year
router.delete(
  '/paper-config/:subjectName',
  verifyToken,
  checkRole(['admin']),
  deletePaperConfigByName
);


module.exports = router;
