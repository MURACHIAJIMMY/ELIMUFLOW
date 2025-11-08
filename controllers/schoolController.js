const School = require('../models/school');

// 🏫 Create a new school (admin only)
const createSchool = async (req, res) => {
  try {
    const { name, code, logo, location, contact } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'School name and code are required' });
    }

    const existing = await School.findOne({ code });
    if (existing) {
      return res.status(409).json({ error: 'School with this code already exists' });
    }

    const school = new School({ name, code, logo, email, motto,location, contact });
    await school.save();

    res.status(201).json({ message: 'School created successfully', school });
  } catch (err) {
    console.error('[CreateSchool]', err);
    res.status(500).json({ error: 'Error creating school' });
  }
};

// 🛠️ Update school by code (admin only)
// 🧠 Resolve school context from user, query, or body
const resolveSchool = async (req) => {
  const schoolId = req.user?.schoolId || req.query.schoolId || req.body.schoolId;
  const schoolCode = req.user?.schoolCode || req.query.schoolCode || req.body.schoolCode || req.params.code;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode })
  });
};

// 🔧 Update school by code or context
const updateSchool = async (req, res) => {
  try {
    const updates = req.body;
    const school = await resolveSchool(req);

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    Object.assign(school, updates);
    await school.save();

    res.status(200).json({ message: 'School updated successfully', school });
  } catch (err) {
    console.error('[UpdateSchool]', err);
    res.status(500).json({ error: 'Error updating school' });
  }
};

module.exports = {
  createSchool,
  updateSchool
};
