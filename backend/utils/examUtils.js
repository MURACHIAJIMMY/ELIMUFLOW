const PaperConfig = require('../models/paperConfig');

/**
 * Dynamically get the previous exam for a given term/year/school
 * @param {String} exam - the current exam name (e.g. "Midterm")
 * @param {String} term - the academic term (e.g. "Term 1")
 * @param {Number} year - the academic year (e.g. 2025)
 * @param {ObjectId} schoolId - the school reference
 * @returns {String|null} - the previous exam name or null if none
 */
const getPreviousExam = async (exam, term, year, schoolId) => {
  // Fetch all exam configs for this term/year/school
  const configs = await PaperConfig.find({ term, year, school: schoolId })
    .sort({ sequence: 1, createdAt: 1 }); // ✅ prefer sequence, fallback to createdAt

  if (!configs || configs.length === 0) return null;

  const examNames = configs.map(c => c.exam);

  const index = examNames.indexOf(exam);
  return index > 0 ? examNames[index - 1] : null;
};

/**
 * Get all exams in a term up to and including the selected one
 * Useful for building examScope dynamically
 */
const getExamScope = async (exam, term, year, schoolId) => {
  const configs = await PaperConfig.find({ term, year, school: schoolId })
    .sort({ sequence: 1, createdAt: 1 });

  if (!configs || configs.length === 0) return [exam];

  const examNames = configs.map(c => c.exam);
  const selectedIndex = examNames.indexOf(exam);

  return selectedIndex >= 0 ? examNames.slice(0, selectedIndex + 1) : [exam];
};

module.exports = { getPreviousExam, getExamScope };
