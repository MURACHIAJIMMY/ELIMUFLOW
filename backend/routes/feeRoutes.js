const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const feeController = require('../controllers/feeController');

// ➕ Record a new fee transaction (partial payments supported)
router.post(
  '/create',
  verifyToken,
  checkRole(['admin', 'accountant']),
  feeController.createFee
);

// 📄 Get latest receipt for a student by AdmNo
router.get(
  '/receipt/:admNo',
  verifyToken,
  checkRole(['admin', 'accountant', 'teacher']),
  feeController.getReceiptByAdmNo
);

// 📊 Get class fees list by class name
router.get(
  '/class/:className',
  verifyToken,
  checkRole(['admin', 'accountant', 'teacher']),
  feeController.getClassFeesListByName
);

module.exports = router;
