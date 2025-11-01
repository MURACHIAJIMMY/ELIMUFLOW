const School = require('../models/school');
const Teacher = require('../models/teacher');
const jwt = require('jsonwebtoken');

// ✅ Admin-only signup
const signup = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create accounts' });
    }

    const { name, username, password, school, gender, phone, role = 'teacher', email } = req.body;

    if (!['male', 'female'].includes(gender?.toLowerCase())) {
      return res.status(400).json({ error: 'Gender must be male or female' });
    }

    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    if (!['teacher', 'admin', 'principal'].includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const existing = await Teacher.findOne({ username, school });
    if (existing) {
      return res.status(409).json({ error: 'User already exists for this school' });
    }

    const teacher = new Teacher({
      name,
      username,
      password,
      school,
      gender: gender.toLowerCase(),
      phone,
      role: role.toLowerCase(),
      ...(email && { email })
    });

    await teacher.save();

    res.status(201).json({ message: `${role} created successfully` });
  } catch (err) {
    console.error('[Signup]', err);
    res.status(500).json({ error: 'Signup failed' });
  }
};

// ✅ Verify school code and return branding info
const verifySchoolCode = async (req, res) => {
  try {
    const { schoolCode } = req.body;
    const school = await School.findOne({ code: schoolCode });
    if (!school) {
      return res.status(404).json({ error: 'Invalid school code' });
    }

    res.status(200).json({
      success: true,
      schoolId: school._id,
      name: school.name,
      logo: school.logo,
      motto: school.motto
    });
  } catch (err) {
    console.error('[VerifySchoolCode]', err);
    res.status(500).json({ error: 'Error verifying school code' });
  }
};

// ✅ Login teacher/admin
const loginTeacher = async (req, res) => {
  try {
    const { schoolCode, username, password } = req.body;
    const school = await School.findOne({ code: schoolCode });
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const teacher = await Teacher.findOne({ username, school: school._id });
    if (!teacher) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      {
        teacherId: teacher._id,
        username: teacher.username,
        schoolId: school._id,
        schoolCode: school.code,
        role: teacher.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '360d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      teacher: {
        name: teacher.name,
        username: teacher.username,
        role: teacher.role,
        school: school.name,
        gender: teacher.gender,
        phone: teacher.phone,
        ...(teacher.email && { email: teacher.email })
      }
    });
  } catch (err) {
    console.error('[LoginTeacher]', err);
    res.status(500).json({ error: 'Error logging in' });
  }
};

module.exports = { signup, verifySchoolCode, loginTeacher };
