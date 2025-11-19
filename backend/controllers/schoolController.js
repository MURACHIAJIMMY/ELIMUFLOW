const School = require('../models/school');
const cloudinary = require('../config/cloudinary'); // Cloudinary config
const upload = require('../middleware/upload');     // multer config

// 🧠 Resolve school context from user, query, or body
const resolveSchool = async (req) => {
  const schoolId = req.user?.schoolId || req.query.schoolId || req.body.schoolId;
  const schoolCode = req.user?.schoolCode || req.query.schoolCode || req.body.schoolCode || req.params.code;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode }),
  });
};

// 🏫 Create a new school (admin only)
const createSchool = async (req, res) => {
  try {
    const { name, code, location, contact, email, motto } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'School name and code are required' });
    }

    const existing = await School.findOne({ code });
    if (existing) {
      return res.status(409).json({ error: 'School with this code already exists' });
    }

    let logo = [];
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { folder: 'school_logos' });
      logo = [{ url: result.secure_url, public_id: result.public_id }];
    }

    const school = new School({ name, code, logo, email, motto, location, contact });
    await school.save();

    res.status(201).json({ message: 'School created successfully', school });
  } catch (err) {
    console.error('[CreateSchool]', err);
    res.status(500).json({ error: 'Error creating school' });
  }
};

// 🔧 Update school by code or context
const updateSchool = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: 'School not found' });

    const updates = { ...req.body };

    // ✅ Remove logo from updates immediately to prevent overwriting
    delete updates.logo;

    // 🔍 Log incoming file
    console.log('[req.file]', req.file);

    if (req.file) {
      // 🔍 Log old logo before deletion
      console.log('[Old logo]', school.logo);

      // ✅ Delete old logo from Cloudinary
      if (school.logo?.[0]?.public_id) {
        try {
          await cloudinary.uploader.destroy(school.logo[0].public_id);
        } catch (err) {
          console.warn('[Cloudinary delete error]', err.message);
        }
      }

      // ✅ Upload new logo
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'school_logos',
      });

      // 🔍 Log Cloudinary result
      console.log('[Cloudinary upload result]', result);

      updates.logo = [
        {
          url: result.secure_url,
          public_id: result.public_id,
        },
      ];
    }

    // ✅ Final safety check
    if (updates.logo && (!updates.logo[0]?.url || !updates.logo[0]?.public_id)) {
      console.warn('[Logo payload invalid]', updates.logo);
      delete updates.logo;
    }

    // 🔍 Log final payload before saving
    console.log('[Final updates]', updates);

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
  updateSchool,
  resolveSchool, // ✅ keep it exported if you want to reuse elsewhere
};
