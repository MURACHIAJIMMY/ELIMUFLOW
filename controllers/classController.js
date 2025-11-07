const Class = require('../models/class');
const School = require('../models/school');
// 📦 Bulk create classes
const bulkCreateClasses = async (req, res) => {
  try {
    const classes = req.body;

    if (!Array.isArray(classes) || classes.length === 0) {
      return res.status(400).json({ error: 'Provide an array of class objects.' });
    }

    const validGrades = [10, 11, 12];
    for (const cls of classes) {
      if (!cls.name || !cls.grade || !cls.stream) {
        return res.status(400).json({ error: 'Each class must include name, grade, and stream.' });
      }
      if (!validGrades.includes(cls.grade)) {
        return res.status(400).json({ error: `Invalid grade: ${cls.grade}. Only 10, 11, 12 allowed.` });
      }
      cls.school = req.user.schoolId; // ✅ inject school context
    }

    const created = await Class.insertMany(classes);
    res.status(201).json({ message: 'Classes created successfully.', classes: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get class by name (scoped by school)
const getClassByName = async (req, res) => {
  try {
    const { name } = req.params;
    const cls = await Class.findOne({ name, school: req.user.schoolId }); // ✅ scoped

    if (!cls) return res.status(404).json({ error: 'Class not found.' });
    res.status(200).json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📘 Get all classes or filter by grade (scoped by school)
const getClasses = async (req, res) => {
  try {
    const { grade } = req.query;
    const query = {
      school: req.user.schoolId,
      ...(grade && { grade: parseInt(grade) })
    };

    const classes = await Class.find(query);
    res.status(200).json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update class by name (scoped by school)
const updateClassByName = async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    const updatedClass = await Class.findOneAndUpdate(
      { name, school: req.user.schoolId }, // ✅ scoped
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.status(200).json({
      message: 'Class updated successfully',
      class: updatedClass
    });
  } catch (err) {
    console.error('[UpdateClassByName]', err);
    res.status(500).json({ error: 'Failed to update class' });
  }
};

// 🗑️ Delete class by name (scoped by school)
const deleteClassByName = async (req, res) => {
  try {
    const { name } = req.params;

    const deletedClass = await Class.findOneAndDelete({ name, school: req.user.schoolId }); // ✅ scoped

    if (!deletedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error('[DeleteClassByName]', err);
    res.status(500).json({ error: 'Failed to delete class' });
  }
};

// 📊 Get available grades for classes (scoped by school)
const getAvailableGrades = async (req, res) => {
  try {
    const grades = await Class.distinct('grade', { school: req.user.schoolId }); // ✅ scoped
    res.status(200).json(grades.sort());
  } catch (err) {
    console.error('[getAvailableGrades]', err);
    res.status(500).json({ error: 'Failed to fetch grades.' });
  }
};

module.exports = {
  bulkCreateClasses,
  getClassByName,
  getClasses,
  updateClassByName,
  deleteClassByName,
  getAvailableGrades
};
