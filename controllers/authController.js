const School = require("../models/school");
const Teacher = require("../models/teacher");
const jwt = require("jsonwebtoken");

// 🧠 Resolve school context from user, query, or body
const resolveSchool = async (req) => {
  const schoolId =
    req.user?.schoolId || req.body.schoolId || req.query.schoolId;
  const schoolCode =
    req.user?.schoolCode || req.body.schoolCode || req.query.schoolCode;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode }),
  });
};

// ✅ Admin-only signup
const signup = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create accounts" });
    }

    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const {
      name,
      username,
      password,
      gender,
      phone,
      role = "teacher",
      email,
    } = req.body;

    if (!["male", "female"].includes(gender?.toLowerCase())) {
      return res.status(400).json({ error: "Gender must be male or female" });
    }

    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: "Valid phone number is required" });
    }

    if (!["teacher", "admin", "principal"].includes(role.toLowerCase())) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const existing = await Teacher.findOne({ username, school: school._id });
    if (existing) {
      return res
        .status(409)
        .json({ error: "User already exists for this school" });
    }

    const teacher = new Teacher({
      name,
      username,
      password,
      school: school._id,
      gender: gender.toLowerCase(),
      phone,
      role: role.toLowerCase(),
      ...(email && { email }),
    });

    await teacher.save();

    res.status(201).json({ message: `${role} created successfully` });
  } catch (err) {
    console.error("[Signup]", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

// ✅ Admin-only update teacher by username
const updateTeacherByUsername = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update accounts" });
    }

    const { username } = req.params;
    const updates = req.body;

    if (
      updates.role &&
      !["teacher", "admin", "principal"].includes(updates.role.toLowerCase())
    ) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { username: username.toLowerCase() },
      updates,
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.status(200).json({ message: "Teacher updated successfully", teacher });
  } catch (err) {
    console.error("[UpdateTeacherByUsername]", err);
    res.status(500).json({ error: "Error updating teacher" });
  }
};

// ✅ Verify school code and return branding info
const verifySchoolCode = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "Invalid school code" });
    }

    res.status(200).json({
      success: true,
      schoolId: school._id,
      name: school.name,
      logo: school.logo,
      motto: school.motto,
      email: school.email,
      location: school.location,
    });
  } catch (err) {
    console.error("[VerifySchoolCode]", err);
    res.status(500).json({ error: "Error verifying school code" });
  }
};

// ✅ Login teacher/admin
const loginTeacher = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const { username, password } = req.body;

    const teacher = await Teacher.findOne({ username, school: school._id });
    if (!teacher) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      {
        teacherId: teacher._id,
        username: teacher.username,
        schoolId: school._id,
        schoolCode: school.code,
        role: teacher.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "360d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      teacher: {
        name: teacher.name,
        username: teacher.username,
        role: teacher.role,
        school: school.name,
        gender: teacher.gender,
        phone: teacher.phone,
        ...(teacher.email && { email: teacher.email }),
      },
    });
  } catch (err) {
    console.error("[LoginTeacher]", err);
    res.status(500).json({ error: "Error logging in" });
  }
};

// ✅ Admin-only delete teacher by username
const deleteTeacherByUsername = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete accounts" });
    }

    const { username } = req.params;

    const deleted = await Teacher.findOneAndDelete({
      username: username.toLowerCase(),
    });

    if (!deleted) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.status(200).json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error("[DeleteTeacherByUsername]", err);
    res.status(500).json({ error: "Error deleting teacher" });
  }
};

module.exports = {
  signup,
  verifySchoolCode,
  loginTeacher,
  updateTeacherByUsername,
  deleteTeacherByUsername,
};
