const Student = require("../models/student");
const Subject = require("../models/subject");
const SubjectSelection = require("../models/subjectSelection");
const StudentSubject = require("../models/studentSubject");
const School = require("../models/school");

// 🧠 Resolve school context from user, query, or body
const resolveSchool = async (req) => {
  const schoolId =
    req.user?.schoolId || req.query.schoolId || req.body.schoolId;
  const schoolCode =
    req.user?.schoolCode || req.query.schoolCode || req.body.schoolCode;

  if (!schoolId && !schoolCode) return null;

  return await School.findOne({
    ...(schoolId && { _id: schoolId }),
    ...(schoolCode && { code: schoolCode }),
  });
};

// 📝 Initial subject selection by admission number
const selectSubjectsByAdmNo = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const {
      admNo,
      electiveNames = [],
      languagePreference = "KISW",
      mathChoice,
    } = req.body;

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: school._id,
    }).populate("pathway");

    if (!student) return res.status(404).json({ error: "Student not found." });

    const pathwayId = student.pathway?._id;
    if (!pathwayId)
      return res
        .status(400)
        .json({ error: "Student has no pathway assigned." });

    const existingLinks = await StudentSubject.find({
      student: student._id,
      school: school._id,
    });

    if (existingLinks.length > 0) {
      await StudentSubject.deleteMany({
        student: student._id,
        category: "Elective",
        school: school._id,
      });

      const oldCodes = ["102", "504", "121", "122"];
      const oldChoiceSubjects = await Subject.find({
        code: { $in: oldCodes },
        school: school._id,
      });
      const oldChoiceIds = oldChoiceSubjects.map((sub) => sub._id);
      await StudentSubject.deleteMany({
        student: student._id,
        subject: { $in: oldChoiceIds },
        school: school._id,
      });
    }

    const pathwayElectives = await Subject.find({
      pathway: pathwayId,
      school: school._id,
    }).select("name _id pathway");

    const selectedElectives = pathwayElectives.filter((sub) =>
      electiveNames.includes(sub.name)
    );

    if (selectedElectives.length !== 3) {
      return res
        .status(400)
        .json({
          error:
            "Exactly 3 valid elective subjects must be selected from the pathway.",
        });
    }

    const fromPathwayCount = selectedElectives.filter(
      (sub) => sub.pathway?._id?.toString() === pathwayId.toString()
    ).length;
    if (fromPathwayCount < 2) {
      return res
        .status(400)
        .json({
          error: "At least 2 electives must be from the student's pathway.",
        });
    }

    const compulsoryCodes = [
      "CSL",
      "101",
      languagePreference === "KSL" ? "504" : "102",
      student.pathway?.name === "STEM"
        ? "121"
        : mathChoice === "core"
        ? "121"
        : "122",
    ];

    const compulsorySubjectsRaw = await Subject.find({
      code: { $in: compulsoryCodes },
      school: school._id,
    });

    const mathSubject = compulsorySubjectsRaw.find(
      (sub) => sub.code === "121" || sub.code === "122"
    );
    if (student.pathway?.name === "STEM" && mathSubject?.code === "122") {
      return res
        .status(400)
        .json({ error: "STEM students must take Core Mathematics." });
    }

    const compulsorySubjects = compulsorySubjectsRaw.map((sub) => sub._id);
    const finalSubjects = [
      ...new Set([
        ...compulsorySubjects,
        ...selectedElectives.map((s) => s._id),
      ]),
    ];

    if (finalSubjects.length !== 7) {
      return res
        .status(400)
        .json({ error: "Total subjects must be exactly 7." });
    }

    student.selectedSubjects = finalSubjects;
    await student.save();

    await SubjectSelection.findOneAndUpdate(
      { student: student._id, school: school._id },
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      const category = isAuto ? "Compulsory" : "Elective";

      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId, school: school._id },
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category,
          term: "Term 1",
          year: new Date().getFullYear(),
          school: school._id,
        },
        { upsert: true, new: true }
      );
    }

    const resolvedSubjects = await Subject.find({
      _id: { $in: finalSubjects },
      school: school._id,
    }).populate(["pathway", "track"]);

    res.status(200).json({
      message: "Subjects selected successfully.",
      student: {
        name: student.name,
        admNo: student.admNo,
        pathway: student.pathway?.name,
      },
      selectedSubjects: resolvedSubjects.map((sub) => ({
        name: sub.name,
        code: sub.code,
        group: sub.group,
        pathway: sub.pathway?.name,
        track: sub.track?.name,
      })),
    });
  } catch (err) {
    console.error("[selectSubjectsByAdmNo]", err);
    res.status(500).json({ error: "Error selecting subjects." });
  }
};

// ✏️ Get selected subjects by admission number
const getSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { admNo } = req.params;

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: school._id,
    }).populate("pathway");

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    const subjectLinks = await StudentSubject.find({
      student: student._id,
      school: school._id,
    }).populate("subject", "name code group lessonsPerWeek");

    if (!subjectLinks.length) {
      return res.status(200).json({
        admNo,
        studentName: student.name,
        totalSubjects: 0,
        compulsoryCount: 0,
        electiveCount: 0,
        isComplete: false,
        mathCompliance: "unknown",
        subjects: [],
      });
    }

    const subjects = subjectLinks
      .filter((link) => link.subject)
      .map((link) => ({
        subjectId: link.subject._id,
        name: link.subject.name,
        code: link.subject.code,
        group: link.subject.group,
        lessonsPerWeek: link.subject.lessonsPerWeek,
        autoAssigned: link.autoAssigned,
        category: link.category,
        term: link.term,
        year: link.year,
      }));

    const total = subjects.length;
    const compulsoryCount = subjects.filter(
      (s) => s.category === "Compulsory"
    ).length;
    const electiveCount = subjects.filter(
      (s) => s.category === "Elective"
    ).length;
    const isComplete = total === 7;

    const hasCoreMath = subjects.some((s) => s.code === "121");
    const hasEssentialMath = subjects.some((s) => s.code === "122");

    let mathCompliance = "valid";
    if (student.pathway?.name === "STEM" && !hasCoreMath) {
      mathCompliance = "invalid";
    } else if (
      student.pathway?.name !== "STEM" &&
      hasCoreMath &&
      hasEssentialMath
    ) {
      mathCompliance = "conflict";
    }

    res.status(200).json({
      admNo,
      studentName: student.name,
      totalSubjects: total,
      compulsoryCount,
      electiveCount,
      isComplete,
      mathCompliance,
      subjects,
    });
  } catch (err) {
    console.error("[getSelectedSubjectsByAdmNo]", err);
    res.status(500).json({ error: "Error fetching selected subjects." });
  }
};

// ✍️ Update selected subjects by admission number
const updateSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { admNo } = req.params;
    const {
      subjectNames = [],
      languagePreference = "KISW",
      mathChoice,
    } = req.body;

    if (!Array.isArray(subjectNames) || subjectNames.length !== 3) {
      return res
        .status(400)
        .json({ error: "Exactly 3 elective subjects must be selected" });
    }

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: school._id,
    }).populate("pathway");

    if (!student) return res.status(404).json({ error: "Student not found" });

    const pathwayId = student.pathway?._id;
    if (!pathwayId)
      return res.status(400).json({ error: "Student has no pathway assigned" });

    await StudentSubject.deleteMany({
      student: student._id,
      category: "Elective",
      school: school._id,
    });

    const oldCodes = ["102", "504", "121", "122"];
    const oldChoiceSubjects = await Subject.find({
      code: { $in: oldCodes },
      school: school._id,
    });
    const oldChoiceIds = oldChoiceSubjects.map((sub) => sub._id);
    await StudentSubject.deleteMany({
      student: student._id,
      subject: { $in: oldChoiceIds },
      school: school._id,
    });

    const electiveSubjects = await Subject.find({
      name: { $in: subjectNames },
      school: school._id,
    }).populate(["pathway", "track"]);

    if (electiveSubjects.length !== 3) {
      return res
        .status(400)
        .json({ error: "One or more subject names are invalid" });
    }

    const fromPathwayCount = electiveSubjects.filter(
      (sub) => sub.pathway?._id?.toString() === pathwayId.toString()
    ).length;
    if (fromPathwayCount < 2) {
      return res
        .status(400)
        .json({
          error: "At least 2 electives must be from the selected pathway",
        });
    }

    const compulsoryCodes = [
      "CSL",
      "101",
      languagePreference === "KSL" ? "504" : "102",
      student.pathway?.name === "STEM"
        ? "121"
        : mathChoice === "core"
        ? "121"
        : "122",
    ];

    const compulsorySubjectsRaw = await Subject.find({
      code: { $in: compulsoryCodes },
      school: school._id,
    });

    const mathSubject = compulsorySubjectsRaw.find((sub) => sub.code === "122");
    if (student.pathway?.name === "STEM" && mathSubject) {
      return res
        .status(400)
        .json({ error: "STEM students must take Core Mathematics." });
    }

    const compulsorySubjects = compulsorySubjectsRaw.map((sub) => sub._id);
    const finalSubjects = [
      ...new Set([
        ...compulsorySubjects,
        ...electiveSubjects.map((s) => s._id),
      ]),
    ];

    if (finalSubjects.length !== 7) {
      return res
        .status(400)
        .json({ error: "Total subjects must be exactly 7." });
    }

    await SubjectSelection.findOneAndUpdate(
      { student: student._id, school: school._id },
      { selectedSubjects: finalSubjects },
      { upsert: true, new: true }
    );

    student.selectedSubjects = finalSubjects;
    await student.save();

    for (const subjectId of finalSubjects) {
      const isAuto = compulsorySubjects.includes(subjectId);
      const category = isAuto ? "Compulsory" : "Elective";

      await StudentSubject.findOneAndUpdate(
        { student: student._id, subject: subjectId, school: school._id },
        {
          student: student._id,
          subject: subjectId,
          autoAssigned: isAuto,
          category,
          term: "Term 1",
          year: new Date().getFullYear(),
          school: school._id,
        },
        { upsert: true, new: true }
      );
    }

    const resolvedSubjects = await Subject.find({
      _id: { $in: finalSubjects },
      school: school._id,
    }).populate(["pathway", "track"]);

    res.status(200).json({
      message: "Subjects updated successfully.",
      student: {
        name: student.name,
        admNo: student.admNo,
        pathway: student.pathway?.name,
      },
      selectedSubjects: resolvedSubjects.map((sub) => ({
        name: sub.name,
        code: sub.code,
        group: sub.group,
        pathway: sub.pathway?.name,
        track: sub.track?.name,
      })),
    });
  } catch (err) {
    console.error("[updateSelectedSubjectsByAdmNo]", err);
    res.status(500).json({ error: "Server error during subject update." });
  }
};

// ✂️ Delete selected elective subjects by admission number
const deleteSelectedSubjectsByAdmNo = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { admNo } = req.params;

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: school._id,
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const result = await StudentSubject.deleteMany({
      student: student._id,
      category: "Elective",
      school: school._id,
    });

    const remaining = await StudentSubject.find({
      student: student._id,
      category: "Compulsory",
      school: school._id,
    });

    const updatedSubjectIds = remaining.map((s) => s.subject);

    student.selectedSubjects = updatedSubjectIds;
    await student.save();

    await SubjectSelection.findOneAndUpdate(
      { student: student._id, school: school._id },
      { selectedSubjects: updatedSubjectIds },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "Selected elective subjects deleted successfully",
      deletedCount: result.deletedCount,
      remainingCompulsoryCount: updatedSubjectIds.length,
    });
  } catch (err) {
    console.error("[deleteSelectedSubjectsByAdmNo]", err);
    res.status(500).json({ error: "Error deleting selected subjects" });
  }
};
//

// ✅ Validate all students' subject selections for CBC compliance
const validateAllSubjectSelections = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const students = await Student.find({ school: school._id }).populate(
      "pathway"
    );

    const compulsorySubjects = await Subject.find({
      compulsory: true,
      school: school._id,
    });

    const compulsoryMap = Object.fromEntries(
      compulsorySubjects.map((s) => [s.code, s._id.toString()])
    );

    const report = [];

    for (const student of students) {
      const subjectLinks = await StudentSubject.find({
        student: student._id,
        school: school._id,
      }).populate("subject pathway");

      const selected = subjectLinks.map((link) => link.subject._id.toString());
      const total = selected.length;

      const hasEnglish = selected.includes(compulsoryMap["101"]);
      const hasCSL = selected.includes(compulsoryMap["CSL"]);
      const hasLanguage =
        selected.includes(compulsoryMap["102"]) ||
        selected.includes(compulsoryMap["504"]);
      const hasMath =
        selected.includes(compulsoryMap["121"]) ||
        selected.includes(compulsoryMap["122"]);

      const compulsoryValid = hasEnglish && hasCSL && hasLanguage && hasMath;

      const electiveLinks = subjectLinks.filter(
        (link) => link.category === "Elective"
      );
      const electiveSubjects = electiveLinks.map((link) => link.subject);
      const fromPathway = electiveSubjects.filter(
        (sub) =>
          sub.pathway?._id?.toString() === student.pathway?._id?.toString()
      );

      const issues = [];
      if (!compulsoryValid) issues.push("Missing compulsory subjects");
      if (electiveLinks.length !== 3)
        issues.push("Must select exactly 3 electives");
      if (fromPathway.length < 2)
        issues.push("At least 2 electives must be from chosen pathway");
      if (total !== 7) issues.push("Total subjects must be exactly 7");

      report.push({
        admNo: student.admNo,
        name: student.name,
        pathway: student.pathway?.name ?? "—",
        totalSubjects: total,
        electiveCount: electiveLinks.length,
        fromPathwayCount: fromPathway.length,
        compliant: issues.length === 0,
        issues,
      });
    }

    res
      .status(200)
      .json({ message: "CBC subject validation complete.", report });
  } catch (err) {
    console.error("[validateAllSubjectSelections]", err);
    res.status(500).json({ error: "Error validating subject selections." });
  }
};

// 📋 Get available electives for a student's pathway
const getStudentElectivesForPathway = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { admNo } = req.params;

    const student = await Student.findOne({
      admNo: admNo.toUpperCase(),
      school: school._id,
    }).populate("pathway");

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }
    if (!student.pathway?._id) {
      return res
        .status(400)
        .json({ error: "Student has no pathway assigned." });
    }

    const electives = await Subject.find({
      pathway: student.pathway._id,
      compulsory: false,
      school: school._id,
    }).select("name code group lessonsPerWeek");

    res.status(200).json({
      student: {
        admNo: student.admNo,
        name: student.name,
        pathway: student.pathway.name,
      },
      electives,
    });
  } catch (err) {
    console.error("[getStudentElectivesForPathway]", err);
    res.status(500).json({ error: "Error fetching elective options." });
  }
};

module.exports = {
  selectSubjectsByAdmNo,
  getSelectedSubjectsByAdmNo,
  updateSelectedSubjectsByAdmNo,
  deleteSelectedSubjectsByAdmNo,
  validateAllSubjectSelections,
  getStudentElectivesForPathway,
};
