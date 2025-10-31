const extractLevel = (grade) => {
  if (!grade || typeof grade !== 'string') return null;

  const parts = grade.trim().split(' ');
  const last = parts[parts.length - 1];

  const level = parseInt(last);
  return isNaN(level) ? null : level;
};

module.exports = { extractLevel };
