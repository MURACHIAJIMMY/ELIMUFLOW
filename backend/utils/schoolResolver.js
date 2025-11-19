const School = require('../models/school');

const resolveSchool = async (req) => {
  const schoolId = req.user?.schoolId || req.query.schoolId || req.body.schoolId;
  const schoolCode = req.user?.schoolCode || req.query.schoolCode || req.body.schoolCode;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode })
  });
};

module.exports = resolveSchool;
