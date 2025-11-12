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
// // 🔍 Teacher or admin fetches distinct exams for a given term and year
// router.get(
//   "/exams",
//   verifyToken,
//   checkRole(["admin", "teacher"]),
//   async (req, res) => {
//     try {
//       const school = await resolveSchool(req);
//       if (!school) return res.status(404).json({ error: "School not found." });

//       const { term, year } = req.query;
//       const exams = await Assessment.distinct("exam", {
//         term,
//         year: parseInt(year),
//         school: school._id
//       });

//       res.json(exams);
//     } catch (err) {
//       console.error("[GET /exams]", err);
//       res.status(500).json({ error: "Failed to fetch exams." });
//     }
//   }
// );



module.exports = router;
