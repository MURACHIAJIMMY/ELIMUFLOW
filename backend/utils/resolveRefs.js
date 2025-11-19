// utils/resolveRefs.js
const Class = require('../models/class');
const Subject = require('../models/subject');

const resolveClassAndSubject = async ({ classId, className, subjectId, subjectName }) => {
  let resolvedClassId = classId;
  let resolvedSubjectId = subjectId;

  if (!classId && className) {
    const cls = await Class.findOne({ name: className });
    if (!cls) throw new Error(`Class '${className}' not found`);
    resolvedClassId = cls._id;
  }

  if (!subjectId && subjectName) {
    const subject = await Subject.findOne({ name: subjectName });
    if (!subject) throw new Error(`Subject '${subjectName}' not found`);
    resolvedSubjectId = subject._id;
  }

  return { resolvedClassId, resolvedSubjectId };
};

module.exports = resolveClassAndSubject;
