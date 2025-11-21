// A:\ElimuFlow\backend\utils\receipt.js
const Payment = require('../models/fee');

// Generate sequential receipt number per school/year
async function generateReceiptNo(schoolId, year) {
  const count = await Payment.countDocuments({ school: schoolId, academicYear: year });
  const sequence = String(count + 1).padStart(4, '0');
  return `REC-${year}-${sequence}`;
}

module.exports = { generateReceiptNo };
