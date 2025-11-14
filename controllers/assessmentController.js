const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const path = require("path");

// Models
const Student = require("../models/student");
const Subject = require("../models/subject");
const Class = require("../models/class");
const Assessment = require("../models/assessment");
const PaperConfig = require("../models/paperConfig");
const School = require("../models/school");
const Pathway = require("../models/pathway");
const archiver = require("archiver");
// Utilities
const { computeSubjectScore } = require("../utils/computeSubjectScore");
const { getGradeRemark } = require("../utils/scoreUtils");
const autoCommentByGrade = require("../utils/autoComment");
const { extractLevel } = require("../utils/level");
const { getPreviousExam } = require("../utils/examUtils");
const resolveClassAndSubject = require("../utils/resolveRefs");
const generatePDF = require("../utils/generatePDF");
const generateQRCode = require("../utils/generateQRCode");
const generateBroadsheetPDF = require("../utils/generateBroadsheetPDF");
const generateGradeDistributionPDF = require("../utils/generateGradeDistributionPDF");
const generateRankingPDF = require("../utils/generateRankingPDF");
const generateSubjectRankingPDF = require("../utils/generateSubjectRankingPDF");
// 📝 Bulk enter marks for multiple students
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

// 📝 Bulk enter marks for multiple students
const enterMarks = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    let {
      classId,
      className,
      subjectId,
      subjectName,
      term,
      exam,
      year,
      marks,
      allowUpdate = false,
    } = req.body;

    if (
      (!classId && !className) ||
      (!subjectId && !subjectName) ||
      !term ||
      !exam ||
      !year ||
      !Array.isArray(marks)
    ) {
      return res
        .status(400)
        .json({ error: "Missing required fields or invalid marks format" });
    }

    // const validExams = await Assessment.distinct("exam", {
    //   term,
    //   year: parseInt(year),
    //   school: school._id,
    // });

    // if (!validExams.includes(exam)) {
    //   return res.status(400).json({
    //     error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
    //       ", "
    //     )}`,
    //   });
    // }

    const { resolvedClassId, resolvedSubjectId } = await resolveClassAndSubject(
      {
        classId,
        className,
        subjectId,
        subjectName,
        schoolId: school._id,
      }
    );

    const sampleStudent = await Student.findOne({
      class: resolvedClassId,
      school: school._id,
    });
    if (!sampleStudent)
      return res.status(404).json({ error: "No students found in class" });

    const subject = await Subject.findOne({
      _id: resolvedSubjectId,
      school: school._id,
    }).select("name code");
    if (!subject) return res.status(404).json({ error: "Subject not found" });

    const config = await PaperConfig.findOne({
      subject: resolvedSubjectId,
      grade: sampleStudent.currentGrade,
      term,
      exam,
      year: parseInt(year),
      school: school._id,
    });

    if (!config) {
      return res
        .status(400)
        .json({ error: "Paper configuration not found for this setup" });
    }

    const totalMap = {};
    config.papers.forEach((p) => {
      totalMap[p.paperNo] = Number(p.total);
    });

    const results = [];
    const errors = [];
    const actions = [];

    for (const entry of marks) {
      const { admNo, papers } = entry;

      if (!admNo || !Array.isArray(papers)) {
        errors.push({ admNo, message: "Missing papers or admNo" });
        continue;
      }

      const student = await Student.findOne({
        admNo,
        school: school._id,
      }).select("name _id");
      if (!student) {
        errors.push({ admNo, message: "Student not found" });
        continue;
      }

      const filter = {
        student: student._id,
        class: resolvedClassId,
        subject: resolvedSubjectId,
        term,
        exam,
        year: parseInt(year),
        school: school._id,
      };

      const existing = await Assessment.findOne(filter);

      let totalScore = 0;
      let totalOutOf = 0;
      let absentCount = 0;
      const enrichedPapers = [];
      const validationErrors = [];
      let hasError = false;

      for (const configPaper of config.papers) {
        const paperNo = configPaper.paperNo;
        const max = totalMap[paperNo];
        const entryPaper = papers.find((p) => Number(p.paperNo) === paperNo);

        let rawScore = entryPaper?.score;
        if (rawScore === undefined || rawScore === null || rawScore === "") {
          rawScore = -1;
        }

        const score = Number(rawScore);
        const isValid =
          !isNaN(score) &&
          typeof score === "number" &&
          (score === -1 || (score >= 0 && score <= max));

        if (!isValid) {
          validationErrors.push({
            admNo,
            paperNo,
            score: rawScore,
            max,
            message: `Invalid score for paper ${paperNo}. Must be between 0 and ${max}, or -1 for absent.`,
          });
          hasError = true;
          continue;
        }

        if (score === -1) {
          absentCount++;
        } else {
          totalScore += score;
        }

        totalOutOf += max;
        enrichedPapers.push({ paperNo, score, total: max });
      }

      if (enrichedPapers.length === 0 || hasError) {
        actions.push({
          admNo,
          action: "skipped",
          reason: "Invalid or missing scores",
        });
        errors.push(...validationErrors);
        continue;
      }

      const percentage =
        totalOutOf > 0 ? ((totalScore / totalOutOf) * 100).toFixed(2) : "0.00";
      const computedScore = computeSubjectScore(enrichedPapers, subject.name);
      const { grade, remark } = getGradeRemark(computedScore);
      const autoComment = autoCommentByGrade[grade] || remark;

      const payload = {
        student: student._id,
        class: resolvedClassId,
        subject: resolvedSubjectId,
        term,
        exam,
        year: parseInt(year),
        papers: enrichedPapers,
        totalScore,
        totalOutOf,
        percentage,
        computedScore: +computedScore.toFixed(2),
        grade,
        comment: autoComment,
        absentCount,
        recordedBy: req.user?._id,
        school: school._id,
      };

      try {
        if (existing) {
          if (allowUpdate) {
            await Assessment.findByIdAndUpdate(existing._id, payload);
            actions.push({
              admNo,
              action: "updated",
              score: Math.round(computedScore),
              grade,
              remark: autoComment,
            });
          } else {
            actions.push({
              admNo,
              action: "skipped",
              reason: "Existing entry — update not allowed",
            });
          }
        } else {
          await Assessment.create(payload);
          actions.push({
            admNo,
            action: "inserted",
            score: Math.round(computedScore),
            grade,
            remark: autoComment,
          });
        }

        results.push({
          admNo,
          name: student.name,
          score: Math.round(computedScore),
          grade,
          remark: autoComment,
        });
      } catch (err) {
        errors.push({
          admNo,
          message: "Error saving assessment",
          error: err.message,
        });
      }
    }

    res.status(200).json({
      message: "Mark entry completed",
      className: className || "Resolved",
      LearningArea: subject.name,
      code: subject.code,
      exam,
      term,
      year: parseInt(year),
      count: results.length,
      results,
      actions,
      errors,
    });
  } catch (err) {
    console.error("[UnifiedEnterMarks]", err);
    res.status(500).json({ error: "Server error during mark entry" });
  }
};

// 📝 Update marks for a single/multiple student
const updateMarks = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const { subjectName, term, exam, year, updates } = req.body;

    if (
      !subjectName ||
      !term ||
      !exam ||
      !year ||
      !Array.isArray(updates) ||
      updates.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Missing required fields or invalid updates format" });
    }
    const subject = await Subject.findOne({
      name: subjectName,
      school: school._id,
    });
    if (!subject) return res.status(404).json({ error: "Subject not found" });

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    const results = [];
    const actions = [];
    const errors = [];

    for (const entry of updates) {
      const { admNo, papers } = entry;

      if (!admNo || !Array.isArray(papers)) {
        errors.push({ admNo, message: "Missing admNo or papers array" });
        continue;
      }

      const student = await Student.findOne({ admNo, school: school._id });
      if (!student) {
        errors.push({ admNo, message: "Student not found" });
        continue;
      }

      const assessment = await Assessment.findOne({
        student: student._id,
        subject: subject._id,
        term,
        exam,
        year: parseInt(year),
        school: school._id,
      });

      if (!assessment) {
        actions.push({
          admNo,
          action: "skipped",
          reason: "Assessment not found",
        });
        continue;
      }

      const config = await PaperConfig.findOne({
        subject: subject._id,
        grade: student.currentGrade,
        term,
        exam,
        year: parseInt(year),
        school: school._id,
      });

      if (!config) {
        actions.push({
          admNo,
          action: "skipped",
          reason: "PaperConfig not found",
        });
        continue;
      }

      const totalMap = {};
      config.papers.forEach((p) => {
        totalMap[p.paperNo] = Number(p.total);
      });

      let totalScore = 0;
      let totalOutOf = 0;
      let absentCount = 0;
      const enrichedPapers = [];
      const validationErrors = [];
      let hasError = false;

      for (const configPaper of config.papers) {
        const paperNo = configPaper.paperNo;
        const max = totalMap[paperNo];
        const entryPaper = papers.find((p) => Number(p.paperNo) === paperNo);

        let rawScore = entryPaper?.score;
        if (rawScore === undefined || rawScore === null || rawScore === "") {
          rawScore = -1;
        }

        const score = Number(rawScore);
        const isValid =
          !isNaN(score) &&
          typeof score === "number" &&
          (score === -1 || (score >= 0 && score <= max));

        if (!isValid) {
          validationErrors.push({
            admNo,
            paperNo,
            score: rawScore,
            max,
            message: `Invalid score for paper ${paperNo}. Must be between 0 and ${max}, or -1 for absent.`,
          });
          hasError = true;
          continue;
        }

        if (score === -1) {
          absentCount++;
        } else {
          totalScore += score;
        }

        totalOutOf += max;
        enrichedPapers.push({ paperNo, score, total: max });
      }

      if (enrichedPapers.length === 0 || hasError) {
        actions.push({
          admNo,
          action: "skipped",
          reason: "Invalid or missing scores",
        });
        errors.push(...validationErrors);
        continue;
      }

      const percentage =
        totalOutOf > 0 ? ((totalScore / totalOutOf) * 100).toFixed(2) : "0.00";
      const computedScore = computeSubjectScore(enrichedPapers, subject.name);
      const { grade, remark } = getGradeRemark(computedScore);
      const autoComment = autoCommentByGrade[grade] || remark;

      try {
        await Assessment.findByIdAndUpdate(assessment._id, {
          papers: enrichedPapers,
          totalScore,
          totalOutOf,
          percentage,
          computedScore: +computedScore.toFixed(2),
          grade,
          comment: autoComment,
          absentCount,
        });

        results.push({
          admNo,
          name: student.name,
          score: Math.round(computedScore),
          grade,
          remark: autoComment,
        });

        actions.push({
          admNo,
          action: "updated",
          score: Math.round(computedScore),
          grade,
          remark: autoComment,
        });
      } catch (err) {
        errors.push({
          admNo,
          message: "Error updating assessment",
          error: err.message,
        });
      }
    }

    res.status(200).json({
      message: "Bulk mark update completed",
      subject: subject.name,
      term,
      exam,
      year: parseInt(year),
      count: results.length,
      results,
      actions,
      errors,
    });
  } catch (err) {
    console.error("[BulkUpdateMarks]", err);
    res.status(500).json({ error: "Server error during mark update" });
  }
};
// 📝 Fetch assessments for students in a class for a specific subject, term, exam, year
const fetchAssessments = async (req, res) => {
  try {
    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found." });

    const {
      classId,
      subjectId,
      subjectName,
      exam,
      term,
      year,
    } = req.query;

    if (
      !term ||
      !exam ||
      !year ||
      (!(classId || req.query.className)) ||
      !(subjectId || subjectName)
    ) {
      return res.status(400).json({ error: "Missing required query parameters" });
    }

    // Resolve subject and class IDs if only names provided
    const resolvedSub = subjectId
      ? subjectId
      : (await Subject.findOne({ name: subjectName, school: school._id }))?._id;

    const resolvedClass = classId
      ? classId
      : (await Class.findOne({ name: req.query.className, school: school._id }))?._id;

    if (!resolvedSub || !resolvedClass) {
      return res.status(404).json({ error: "Subject or Class not found" });
    }

    // Query assessments
    const assessments = await Assessment.find({
      school: school._id,
      class: resolvedClass,
      subject: resolvedSub,
      term,
      exam,
      year: parseInt(year)
    }).populate('student', 'admNo name');

    // Prepare response format: list of { admNo, name, papers }
    const response = assessments.map(assess => ({
      admNo: assess.student.admNo,
      name: assess.student.name,
      papers: assess.papers.map(p => ({
        paperNo: p.paperNo,
        score: p.score,
        total: p.total
      })),
    }));

    res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ error: "Server error fetching assessments" });
  }
};


// Singleton Puppeteer browser instance for reuse
let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: path.resolve(
        __dirname,
        "../.chrome-cache/chrome/linux-142.0.7444.59/chrome-linux64/chrome"
      ),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

const generatePDF = async (reportForms, metadata) => {
  // Generate QR codes per report
  for (const report of reportForms) {
    report.qrCodeUrl = await generateQRCode(
      `https://elimu.ke/verify?admNo=${encodeURIComponent(report.admNo)}&term=${encodeURIComponent(metadata.term)}&year=${encodeURIComponent(metadata.year)}&exam=${encodeURIComponent(metadata.examType)}`
    );
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Report Form</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      header { text-align: center; }
      .school-logo { max-height: 80px; }
      h1 { color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;}
      th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
      th { background-color: #2980b9; color: white; }
      .qr-code { margin-top: 15px; }
      .section { margin-bottom: 40px; }
    </style>
  </head>
  <body>
    <header>
      <img class="school-logo" src="${metadata.schoolLogo}" alt="School Logo" />
      <h1>${metadata.schoolName}</h1>
      <p>${metadata.schoolLocation}</p>
      <p>${metadata.schoolContact} | ${metadata.schoolEmail}</p>
      <p><em>${metadata.schoolMotto}</em></p>
      <h2>Report Form - ${metadata.term} ${metadata.year} - ${metadata.examType}</h2>
    </header>

    ${reportForms.map(report => `
      <section class="section">
        <h3>${report.name} (Admission No: ${report.admNo})</h3>
        <p>Class: ${report.class} | Pathway: ${report.pathway}</p>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              ${metadata.examScope.map((exam) => `<th>${exam}</th>`).join('')}
              <th>Total</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            ${report.scores.map(score => `
              <tr>
                <td>${score.learningArea}</td>
                ${metadata.examScope.map(exam => `<td>${score.exams[exam] !== undefined ? score.exams[exam] : '-'}</td>`).join('')}
                <td>${score.total !== null ? score.total : '-'}</td>
                <td>${score.grade || '-'}</td>
                <td>${score.remark}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p><strong>Mean Score:</strong> ${report.meanScore ?? '-'}</p>
        <p><strong>Grade:</strong> ${report.grade ?? '-'}</p>
        <p><strong>Level:</strong> ${report.level ?? '-'}</p>
        <p><strong>Summary Remark:</strong> ${report.summaryRemark ?? '-'}</p>
        <p><strong>Teacher's Comment:</strong> ${report.classTeacherComment ?? '-'}</p>
        <p><strong>Principal's Comment:</strong> ${report.principalComment ?? '-'}</p>

        <div class="qr-code">
          <img src="${report.qrCodeUrl}" alt="QR Code for report verification" width="120" />
          <p>Scan to verify report</p>
        </div>
      </section>
    `).join('')}
  </body>
  </html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  await page.close();

  return pdfBuffer;
};


const generateReportForm = async (req, res) => {
  try {
    const { admNo, className, term, year, exam, format } = req.query;

    if (!term || !year || !exam)
      return res.status(400).json({
        error: "Missing required parameters: term, year, and exam must be specified",
      });
    if (!admNo && !className)
      return res.status(400).json({
        error: "Provide either admNo for single report or className for bulk report",
      });

    const school = await resolveSchool(req);
    if (!school) return res.status(404).json({ error: "School not found" });

    const metadata = {
      schoolName: school.name || "Unknown School",
      schoolLogo: school.logo || "https://elimu-assets.s3.amazonaws.com/logo.png",
      schoolLocation: school.location || "N/A",
      schoolContact: school.contact || "N/A",
      schoolEmail: school.email || "N/A",
      schoolMotto: school.motto || "Empowering Learners",
      term,
      year,
      examType: exam,
    };

    // Dynamically get all exams for the term and year
    const examScope = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });
    metadata.examScope = examScope;

    const generateQRUrl = (admNo) =>
      `https://elimu.ke/verify?admNo=${admNo}&term=${encodeURIComponent(
        term
      )}&year=${year}&exam=${encodeURIComponent(exam)}`;

    // Your existing buildMultiGradeSummary and buildReportForms logic should be here

    let students, assessments, reportForms;

    if (admNo) {
      // Single student report generation logic
      const student = await Student.findOne({ admNo, school: school._id })
        .populate("class", "name")
        .populate("pathway", "name")
        .select("admNo name class pathway");

      if (!student) return res.status(404).json({ error: "Student not found" });

      const classId = student.class?._id || student.class;
      students = await Student.find({ class: classId, school: school._id })
        .populate("pathway", "name")
        .select("admNo name pathway");

      assessments = await Assessment.find({
        class: classId,
        exam: { $in: examScope },
        term,
        year: parseInt(year),
        school: school._id,
      })
        .populate({
          path: "student",
          select: "admNo name pathway class",
          populate: { path: "class", select: "name" },
        })
        .populate("subject", "name");

      reportForms = await buildReportForms(students, assessments, student.class.name);

      const report = reportForms.find((r) => r.admNo === admNo);
      if (!report) return res.status(404).json({ error: "Report not found for student" });

      if (format === "pdf") {
        const pdfBuffer = await generatePDF([report], metadata);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${admNo}_reportform.pdf"`
        );
        return res.send(pdfBuffer);
      }
      return res.status(200).json({ metadata, reportForms: [report] });
    }

    if (className) {
      // Bulk class report generation logic
      const classDoc = await Class.findOne({
        name: new RegExp(`^${className}$`, "i"),
        school: school._id,
      });
      if (!classDoc) return res.status(404).json({ error: "Class not found" });

      students = await Student.find({
        class: classDoc._id,
        school: school._id,
      })
        .populate("pathway", "name")
        .select("admNo name pathway");

      assessments = await Assessment.find({
        class: classDoc._id,
        exam: { $in: examScope },
        term,
        year: parseInt(year),
        school: school._id,
      })
        .populate({
          path: "student",
          select: "admNo name pathway class",
          populate: { path: "class", select: "name" },
        })
        .populate("subject", "name");

      reportForms = await buildReportForms(students, assessments, className);

      if (format === "pdf") {
        const pdfBuffer = await generatePDF(reportForms, metadata);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${className}_reportforms.pdf"`
        );
        return res.send(pdfBuffer);
      }
      return res.status(200).json({ metadata, reportForms });
    }

    return res.status(400).json({
      error: "Provide either admNo or className",
    });
  } catch (error) {
    console.error("[UnifiedReportForm]", error);
    res.status(500).json({ error: "Error generating report forms" });
  }
};

// 📄 Generate broadsheet for class(es) in a term, exam, year, and pathway (unified)
const generateBroadsheetUnified = async (req, res) => {
  try {
    const { className, gradeName, term, exam, year, pathway } = req.query;
    const format = req.query.format || "pdf";
    const { role, name } = req.user || {};

    const normalizedPathway = (pathway || "").trim().toLowerCase();
    const validPathways = ["stem", "arts and sport science", "social sciences"];
    const isGeneral = normalizedPathway === "general";

    console.log(
      `[BroadsheetAccess] ${role ?? "admin"} ${
        name ?? "unknown"
      } requested '${normalizedPathway}' broadsheet for term '${term}', exam '${exam}', year '${year}'`
    );

    if (!term || !exam || !year || !pathway) {
      return res
        .status(400)
        .json({
          error:
            "Missing required parameters: term, exam, year, and pathway are required",
        });
    }

    if (!validPathways.includes(normalizedPathway) && !isGeneral) {
      return res.status(400).json({ error: `Invalid pathway '${pathway}'` });
    }

    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    let classDocs = [];

    if (className) {
      const classDoc = await Class.findOne({
        name: new RegExp(`^${className}$`, "i"),
        school: school._id,
      }).select("_id name");

      if (!classDoc) {
        return res
          .status(404)
          .json({ error: `Class '${className}' not found` });
      }
      classDocs = [classDoc];
    } else if (gradeName) {
      const numericGrade = parseInt(gradeName.replace(/\D/g, ""));
      if (isNaN(numericGrade)) {
        return res
          .status(400)
          .json({ error: `Invalid grade name '${gradeName}'` });
      }
      classDocs = await Class.find({
        grade: numericGrade,
        school: school._id,
      }).select("_id name");

      if (!classDocs.length) {
        return res
          .status(404)
          .json({ error: `No classes found for grade '${numericGrade}'` });
      }
    } else {
      return res
        .status(400)
        .json({ error: "Provide either className or gradeName" });
    }

    const classIds = classDocs.map((c) => c._id);
    const classMap = Object.fromEntries(
      classDocs.map((c) => [c._id.toString(), c.name])
    );

    const allSubjects = await Subject.find({ school: school._id })
      .select("name _id group code shortName pathway")
      .populate("pathway", "name")
      .sort({ code: 1 });

    const pathwaySubjects = allSubjects
      .filter((s) => s.pathway?.name?.toLowerCase() === normalizedPathway)
      .map((s) => s.name);

    const compulsorySubjects = allSubjects
      .filter((s) => s.group === "Compulsory")
      .map((s) => s.name);

    const students = await Student.find({
      class: { $in: classIds },
      school: school._id,
    })
      .select("admNo name class selectedSubjects grade")
      .sort({ admNo: 1 });

    const filteredStudents = isGeneral
      ? students
      : students.filter((student) =>
          student.selectedSubjects?.some((subjectId) => {
            const subject = allSubjects.find((s) => s._id.equals(subjectId));
            return subject?.pathway?.name?.toLowerCase() === normalizedPathway;
          })
        );

    const selectedSubjectsSet = new Set(
      isGeneral
        ? students.flatMap(
            (s) => s.selectedSubjects?.map((id) => id.toString()) || []
          )
        : [...compulsorySubjects, ...pathwaySubjects]
    );

    const selectedSubjects = allSubjects.filter(
      (s) =>
        selectedSubjectsSet.has(s._id.toString()) ||
        selectedSubjectsSet.has(s.name)
    );

    const assessments = await Assessment.find({
      class: { $in: classIds },
      term,
      exam,
      year: parseInt(year),
      school: school._id,
    })
      .populate("student", "admNo name class")
      .populate("subject", "name");

    const extractLevel = (grade) => {
      const match = grade?.match(/\b(1|2)\b$/);
      return match ? Number(match[1]) : null;
    };

    const getStudentPathway = (student) => {
      const pathwayNames = new Set();
      student.selectedSubjects?.forEach((subjectId) => {
        const subject = allSubjects.find((s) => s._id.equals(subjectId));
        const isCompulsory = subject?.group === "Compulsory";
        if (!isCompulsory && subject?.pathway?.name) {
          pathwayNames.add(subject.pathway.name);
        }
      });
      return pathwayNames.size > 0 ? Array.from(pathwayNames).join(", ") : "-";
    };

    let broadsheet = [];

    filteredStudents.forEach((student) => {
      selectedSubjects.forEach((subject) => {
        const isSelected = student.selectedSubjects?.includes(subject._id);
        if (isSelected) {
          const assessment = assessments.find(
            (a) =>
              a.student?.admNo === student.admNo &&
              a.subject?.name === subject.name
          );

          const score = assessment
            ? Math.round(computeSubjectScore(assessment.papers, subject.name))
            : -1;

          const { grade, remark } = assessment
            ? getGradeRemark(score)
            : { grade: null, remark: "Not Assessed" };

          broadsheet.push({
            admNo: student.admNo,
            name: student.name,
            class: classMap[student.class.toString()],
            pathway: isGeneral ? getStudentPathway(student) : undefined,
            learningArea: subject.name,
            score: score === -1 ? "-" : score,
            grade,
            level: extractLevel(grade),
            remark,
          });
        }
      });
    });

    const studentProfiles = {};
    broadsheet.forEach((row) => {
      const admNo = row.admNo;
      if (!studentProfiles[admNo]) {
        studentProfiles[admNo] = {
          admNo,
          name: row.name,
          class: row.class,
          pathway: row.pathway,
          total: 0,
          count: 0,
          meanScore: null,
          grade: null,
          remark: null,
          level: null,
          rank: null,
        };
      }
      if (row.score !== "-") {
        studentProfiles[admNo].total += Number(row.score);
        studentProfiles[admNo].count += 1;
      }
    });

    Object.values(studentProfiles).forEach((profile) => {
      if (profile.count > 0) {
        profile.meanScore = Math.round(profile.total / profile.count);
        const { grade, remark } = getGradeRemark(profile.meanScore);
        profile.grade = grade;
        profile.remark = remark;
        profile.level = extractLevel(grade);
      }
    });

    const ranked = Object.values(studentProfiles)
      .filter((p) => p.meanScore !== null)
      .sort((a, b) => b.meanScore - a.meanScore);

    let currentRank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].meanScore === ranked[i - 1].meanScore) {
        ranked[i].rank = ranked[i - 1].rank;
      } else {
        ranked[i].rank = currentRank;
      }
      currentRank++;
    }

    const rankMap = Object.fromEntries(ranked.map((p) => [p.admNo, p.rank]));
    const meanMap = Object.fromEntries(
      ranked.map((p) => [p.admNo, p.meanScore])
    );
    const gradeMap = Object.fromEntries(ranked.map((p) => [p.admNo, p.grade]));
    const remarkMap = Object.fromEntries(
      ranked.map((p) => [p.admNo, p.remark])
    );
    const levelMap = Object.fromEntries(ranked.map((p) => [p.admNo, p.level]));

    broadsheet = broadsheet.map((row) => ({
      ...row,
      meanScore: meanMap[row.admNo] ?? null,
      grade: gradeMap[row.admNo] ?? null,
      remark: remarkMap[row.admNo] ?? null,
      level: levelMap[row.admNo] ?? null,
      rank: rankMap[row.admNo] ?? null,
    }));

    broadsheet.sort((a, b) => {
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });

    const subjectLabelMap = {};
    selectedSubjects.forEach((subject) => {
      subjectLabelMap[subject.name] =
        subject.shortName || subject.code || subject.name;
    });

    const metadata = {
      schoolName: school.name,
      schoolLogo: school.logo,
      schoolLocation: school.location,
      schoolContact: school.contact,
      schoolEmail: school.email || "N/A",
      schoolMotto: school.motto || "Empowering Learners",
      term,
      year,
      examType: exam,
      pathway: isGeneral ? "GENERAL" : pathway.toUpperCase(),
      classLabel: className || `Grade ${gradeName}`,
      sortedSubjects: selectedSubjects.map((s) => s.name),
      subjectCodes: subjectLabelMap,
      subjects: selectedSubjects.map((s) => ({
        name: s.name,
        code: subjectLabelMap[s.name],
      })),
    };

    const effectiveFormat = format || "pdf";

    if (effectiveFormat !== "pdf") {
      return res.status(200).json({
        pathway: metadata.pathway,
        term,
        year,
        exam,
        classLabel: metadata.classLabel,
        school: {
          name: school.name,
          logo: school.logo,
          location: school.location,
          contact: school.contact,
          schoolEmail: school.email || "N/A",
          schoolMotto: school.motto || "Empowering Learners",
        },
        subjects: metadata.subjects,
        broadsheet,
      });
    }
    const pdfBuffer = await generateBroadsheetPDF(broadsheet, metadata);

    const safeClassLabel = metadata.classLabel
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]/g, "");
    const safeTerm = metadata.term.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
    const safeYear = String(metadata.year).trim();
    const safePathway = metadata.pathway
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]/g, "");
    const filename = `Broadsheet_${safeClassLabel}_${safeTerm}_${safeYear}_${safePathway}.pdf`;

    console.log(`[PDF] Sending file: ${filename}`);

    if (
      !res ||
      typeof res.setHeader !== "function" ||
      typeof res.send !== "function" ||
      res.send.length !== 1
    ) {
      return pdfBuffer;
    }

    res.setHeader("Content-Type", "application/pdf; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}"`
    );
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[GenerateBroadsheetUnified]", err);
    if (typeof res?.status === "function") {
      res.status(500).json({ error: "Error generating broadsheet" });
    } else {
      throw err;
    }
  }
};

// 📦 Generate broadsheet bundle for all pathways in a grade for a specific term, exam, year
const generateBroadsheetBundle = async (req, res) => {
  const { gradeName, term, exam, year } = req.query;
  const { role, name } = req.user || {};

  try {
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    const pathways = [
      "stem",
      "arts and sport science",
      "social sciences",
      "general",
    ];

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Broadsheets_${gradeName}_${term}_${year}.zip"`
    );

    const zip = archiver("zip");
    zip.pipe(res);

    for (const pathway of pathways) {
      try {
        const query = {
          className: null,
          gradeName,
          term,
          exam,
          year,
          pathway,
          format: "pdf",
        };

        const reqClone = {
          query,
          user: {
            ...req.user,
            schoolId: school._id,
            schoolCode: school.code,
          },
        };

        const pdfBuffer = await generateBroadsheetUnified(reqClone);

        const safePathway = pathway
          .replace(/\s+/g, "_")
          .replace(/[^\w\-]/g, "");
        const safeTerm = term.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
        const safeYear = String(year).trim();
        const safeGrade = gradeName
          .replace(/\s+/g, "_")
          .replace(/[^\w\-]/g, "");
        const filename = `Broadsheet_Grade_${safeGrade}_${safeTerm}_${safeYear}_${safePathway}.pdf`;

        if (Buffer.isBuffer(pdfBuffer)) {
          console.log(`[PDF] Appending file: ${filename}`);
          zip.append(pdfBuffer, { name: filename });
        } else {
          console.error(
            `[PDF Error] Invalid buffer for pathway '${pathway}' — received type:`,
            typeof pdfBuffer
          );
        }
      } catch (err) {
        console.error(
          `[BundleError] Failed to generate broadsheet for '${pathway}':`,
          err.message
        );
      }
    }

    await zip.finalize();
  } catch (err) {
    console.error("[GenerateBroadsheetBundle]", err);
    res.status(500).json({ error: "Error generating broadsheet bundle" });
  }
};

// 📊 Get grade distribution across classes, grades, or entire school
const getGradeDistributionUnified = async (req, res) => {
  try {
    const { level, term, year, exam } = req.params;
    const { format } = req.query;

    const gradeBands = [
      "Exceeding Expectations 2",
      "Exceeding Expectations 1",
      "Meeting Expectations 2",
      "Meeting Expectations 1",
      "Approaching Expectations 2",
      "Approaching Expectations 1",
      "Below Expectations 2",
      "Below Expectations 1",
    ];

    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    const allPathways = await Pathway.find({ school: school._id }).select(
      "name"
    );
    const pathwayNames = allPathways
      .map((p) => p.name)
      .filter((name) => name.toLowerCase() !== "compulsory");

    const gradeMap = Object.fromEntries(
      pathwayNames.map((p) => [
        p,
        Object.fromEntries(gradeBands.map((b) => [b, 0])),
      ])
    );
    const gradeTotals = Object.fromEntries(gradeBands.map((b) => [b, 0]));

    let classIds = [];
    let mode = "";
    let stream = null;
    const normalized = level.trim().toLowerCase();
    let classFilter = {};

    if (normalized === "all") {
      mode = "cross-grade";
    } else if (/^grade\s*\d+$/i.test(level) || /^\d+$/.test(level)) {
      mode = "grade-wide";
      const numericGrade = parseInt(level.match(/\d+/)[0]);
      const classDocs = await Class.find({
        grade: numericGrade,
        school: school._id,
      }).select("_id");
      if (!classDocs.length)
        return res.status(404).json({ error: "No classes found for grade" });
      classIds = classDocs.map((c) => c._id);
      classFilter = { class: { $in: classIds } };
    } else {
      mode = "class-specific";
      const classDoc = await Class.findOne({
        name: new RegExp(`^${level}$`, "i"),
        school: school._id,
      });
      if (!classDoc) return res.status(404).json({ error: "Class not found" });
      classIds = [classDoc._id];
      classFilter = { class: classDoc._id };
      stream = classDoc.stream ?? null;
    }

    const students = await Student.find({
      ...classFilter,
      school: school._id,
    })
      .populate("pathway", "name")
      .populate("class", "name")
      .select("admNo name class pathway");

    const assessments = await Assessment.find({
      ...classFilter,
      term,
      year: parseInt(year),
      exam,
      school: school._id,
    })
      .populate("subject", "name papers")
      .populate("student", "admNo");

    const studentScores = {};

    assessments.forEach((a) => {
      const admNo = a.student?.admNo;
      if (!admNo) return;

      if (!studentScores[admNo]) {
        studentScores[admNo] = {
          scores: [],
          student: students.find((s) => s.admNo === admNo),
        };
      }

      const score = a.score ?? computeSubjectScore(a.papers, a.subject?.name);
      if (typeof score === "number" && !isNaN(score)) {
        studentScores[admNo].scores.push(score);
      }
    });

    Object.entries(studentScores).forEach(([admNo, { scores, student }]) => {
      const pathway = student?.pathway?.name;
      const className = student?.class?.name;

      if (!pathway || !pathwayNames.includes(pathway)) return;
      if (scores.length < 5) return;

      const mean = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
      const { grade } = getGradeRemark(mean);
      if (!gradeBands.includes(grade)) return;

      if (mode === "cross-grade") {
        const gradeLevel = className?.substring(0, 2);
        const gradeLabel = `Grade ${gradeLevel}`;
        if (!gradeMap[pathway][gradeLabel]) {
          gradeMap[pathway][gradeLabel] = Object.fromEntries(
            gradeBands.map((b) => [b, 0])
          );
        }
        gradeMap[pathway][gradeLabel][grade]++;
      } else {
        gradeMap[pathway][grade]++;
        gradeTotals[grade]++;
      }
    });

    if (format === "pdf") {
      const metadata = {
        title: `CBC Grade Distribution - ${level} (${exam}, ${term} ${year})`,
        exam,
        term,
        year,
        gradeBands,
        mode,
        stream,
        schoolName: school.name,
        schoolLogo: school.logo,
      };

      const pdfBuffer = await generateGradeDistributionPDF(gradeMap, metadata);
      const filename = `Distribution_${level.replace(
        /\s+/g,
        "_"
      )}_${term}_${year}.pdf`;

      res.setHeader("Content-Type", "application/pdf; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`
      );
      return res.send(pdfBuffer);
    }

    return res.status(200).json({
      mode,
      input: level,
      term,
      year,
      exam,
      stream,
      school: {
        name: school.name,
        logo: school.logo,
      },
      distribution: gradeMap,
      totals: mode !== "cross-grade" ? gradeTotals : undefined,
      visual: {
        title: `CBC Grade Distribution - ${level} (${exam}, ${term} ${year})`,
        type: "stackedBar",
        pathways: Object.keys(gradeMap),
        gradeBands,
        data: gradeMap,
      },
    });
  } catch (err) {
    console.error("[GradeDistributionUnified]", err);
    res.status(500).json({ error: "Error generating CBC grade distribution" });
  }
};

// Helper function to compute student profiles
const computeStudentProfiles = async (req) => {
  const { term, exam, year, pathway } = req.query;
  const school = await resolveSchool(req);
  if (!school) throw new Error("School not found");

  const schoolId = school._id;
  const grades = [10, 11, 12];

  const validExams = await Assessment.distinct("exam", {
    term,
    year: parseInt(year),
    school: schoolId,
  });

  if (!validExams.includes(exam)) {
    throw new Error(
      `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
        ", "
      )}`
    );
  }

  const classDocs = await Class.find({
    grade: { $in: grades },
    school: schoolId,
  }).select("_id name grade");

  const classMap = Object.fromEntries(
    classDocs.map((c) => [c._id.toString(), c.name])
  );
  const classToGradeMap = Object.fromEntries(
    classDocs.map((c) => [c.name, c.grade])
  );

  const allSubjects = await Subject.find({ school: schoolId })
    .select("name _id group code shortName pathway")
    .populate("pathway", "name")
    .sort({ code: 1 });

  const compulsorySubjects = allSubjects
    .filter((s) => s.group === "Compulsory")
    .map((s) => s.name);

  const students = await Student.find({
    class: { $in: classDocs.map((c) => c._id) },
    school: schoolId,
  })
    .select("admNo name class selectedSubjects grade")
    .sort({ admNo: 1 });

  const selectedSubjectsSet = new Set(
    students.flatMap(
      (s) => s.selectedSubjects?.map((id) => id.toString()) || []
    )
  );

  const selectedSubjects = allSubjects.filter(
    (s) =>
      selectedSubjectsSet.has(s._id.toString()) ||
      selectedSubjectsSet.has(s.name)
  );

  const assessments = await Assessment.find({
    class: { $in: classDocs.map((c) => c._id) },
    term,
    exam,
    year: parseInt(year),
    school: schoolId,
  })
    .populate("student", "admNo name class")
    .populate("subject", "name");

  const broadsheet = [];

  students.forEach((student) => {
    selectedSubjects.forEach((subject) => {
      const isSelected = student.selectedSubjects?.includes(subject._id);
      if (isSelected) {
        const assessment = assessments.find(
          (a) =>
            a.student?.admNo === student.admNo &&
            a.subject?.name === subject.name
        );

        const score = assessment
          ? Math.round(computeSubjectScore(assessment.papers, subject.name))
          : -1;

        broadsheet.push({
          admNo: student.admNo,
          name: student.name,
          class: classMap[student.class.toString()],
          score: score === -1 ? "-" : score,
        });
      }
    });
  });

  const studentProfiles = {};
  broadsheet.forEach((row) => {
    const admNo = row.admNo;
    if (!studentProfiles[admNo]) {
      studentProfiles[admNo] = {
        admNo,
        name: row.name,
        class: row.class,
        total: 0,
        count: 0,
        meanScore: null,
      };
    }
    if (row.score !== "-") {
      studentProfiles[admNo].total += Number(row.score);
      studentProfiles[admNo].count += 1;
    }
  });

  Object.values(studentProfiles).forEach((profile) => {
    if (profile.count > 0) {
      profile.meanScore = Math.round(profile.total / profile.count);
    }
  });

  return {
    profiles: Object.values(studentProfiles).filter(
      (p) => typeof p.meanScore === "number"
    ),
    classToGradeMap,
  };
};

// 📊 Rank classes in a stream for a specific grade, term, exam, year
const rankGradeAndClasses = async (req, res) => {
  try {
    const { term, year, exam } = req.params;
    const { format } = req.query;

    const grades = [10, 11, 12];

    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    const classDocs = await Class.find({
      grade: { $in: grades },
      school: school._id,
    }).select("name grade");

    const classToGradeMap = {};
    const gradeClassMap = {};

    classDocs.forEach((c) => {
      classToGradeMap[c.name] = c.grade;
      if (!gradeClassMap[c.grade]) gradeClassMap[c.grade] = [];
      gradeClassMap[c.grade].push(c.name);
    });

    const { profiles } = await computeStudentProfiles({
      term,
      exam,
      year,
      pathway: "general",
      schoolId: school._id,
    });

    const classScores = {};
    profiles.forEach((p) => {
      if (!classScores[p.class]) classScores[p.class] = [];
      classScores[p.class].push(p.meanScore);
    });

    const gradeIntakeMap = await Student.aggregate([
      {
        $match: {
          currentGrade: { $in: grades },
          status: "active",
          school: school._id,
        },
      },
      {
        $group: {
          _id: "$currentGrade",
          count: { $sum: 1 },
        },
      },
    ]);

    const gradeIntake = Object.fromEntries(
      gradeIntakeMap.map((g) => [g._id, g.count])
    );

    const classRanking = classDocs.map((c) => {
      const className = c.name;
      const intake = profiles.filter((p) => p.class === className).length;
      const scores = classScores[className] || [];

      const totalScore = scores.reduce((a, b) => a + b, 0);
      const mean = intake > 0 ? +(totalScore / intake).toFixed(2) : 0;
      const { grade: gradeLabel } = getGradeRemark(mean);

      return {
        grade: c.grade,
        class: className,
        entry: intake,
        mean,
        gradeLabel,
        previousMean: "--",
        deviation: "--",
        color: "gray",
      };
    });

    classRanking.sort((a, b) => b.mean - a.mean);
    classRanking.forEach((r, i) => (r.position = i + 1));

    const gradeRanking = Object.entries(gradeClassMap).map(
      ([grade, classList]) => {
        const classMeans = classList.map((className) => {
          const scores = classScores[className] || [];
          const intake = profiles.filter((p) => p.class === className).length;
          const totalScore = scores.reduce((a, b) => a + b, 0);
          return intake > 0 ? +(totalScore / intake).toFixed(2) : 0;
        });

        const mean = classMeans.length
          ? +(
              classMeans.reduce((a, b) => a + b, 0) / classMeans.length
            ).toFixed(2)
          : 0;

        const entry = gradeIntake[grade] || 0;
        const { grade: gradeLabel } = getGradeRemark(mean);

        return {
          grade: parseInt(grade),
          entry,
          mean,
          gradeLabel,
          previousMean: "--",
          deviation: "--",
          color: "gray",
        };
      }
    );

    gradeRanking.sort((a, b) => b.mean - a.mean);
    gradeRanking.forEach((r, i) => (r.position = i + 1));

    if (format === "pdf") {
      const metadata = {
        schoolName: school.name,
        schoolLogo:
          school.logo || "https://elimu-assets.s3.amazonaws.com/logo.png",
        schoolLocation: school.location || "N/A",
        schoolContact: school.contact || "N/A",
        term,
        year,
        examType: exam,
      };

      const pdfBuffer = await generateRankingPDF(
        { classRanking, gradeRanking },
        metadata
      );
      const filename = `CBC_Ranking_${term}_${year}.pdf`;

      res.setHeader("Content-Type", "application/pdf; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`
      );
      return res.send(pdfBuffer);
    }

    res.status(200).json({
      classRanking,
      gradeRanking,
    });
  } catch (err) {
    console.error("[RankGradeAndClasses]", err);
    res.status(500).json({ error: "Error generating CBC ranking" });
  }
};

// 📊 Rank subjects within learning areas across classes in a specific grade for a specific term, exam, year
const rankSubjectsAndLearningAreas = async (req, res) => {
  try {
    const { grade, term, year, exam } = req.params;
    const { scope = "class", format } = req.query;

    const gradeNum = parseInt(grade);
    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    const previousExam = getPreviousExam(exam);
    const hasPrevious = previousExam && validExams.includes(previousExam);
    const examFilter = hasPrevious ? [exam, previousExam] : [exam];

    const classes = await Class.find({
      grade: gradeNum,
      school: school._id,
    });

    const classMap = Object.fromEntries(
      classes.map((c) => [c._id.toString(), c.name])
    );

    const students = await Student.find({
      class: { $in: classes.map((c) => c._id) },
      school: school._id,
    }).select("_id class");

    const studentClassMap = Object.fromEntries(
      students.map((s) => [s._id.toString(), classMap[s.class.toString()]])
    );
    const studentIds = students.map((s) => s._id);

    const assessments = await Assessment.find({
      student: { $in: studentIds },
      term,
      year: parseInt(year),
      exam: { $in: examFilter },
      school: school._id,
    }).select("student exam subject papers");

    const subjectIds = [
      ...new Set(assessments.map((a) => a.subject.toString())),
    ];

    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      school: school._id,
    }).select("name group");

    const subjectMeta = Object.fromEntries(
      subjects.map((s) => [s._id.toString(), { name: s.name, group: s.group }])
    );

    const grouped = {};

    assessments.forEach((a) => {
      const studentId = a.student.toString();
      const className = studentClassMap[studentId];
      const meta = subjectMeta[a.subject.toString()];
      if (!className || !meta) return;

      const { name, group } = meta;
      const mean =
        Array.isArray(a.papers) && a.papers.length
          ? a.papers.reduce((sum, p) => sum + p.score, 0) / a.papers.length
          : null;
      if (typeof mean !== "number" || isNaN(mean)) return;

      grouped[className] ??= {};
      grouped[className][group] ??= {};
      grouped[className][group][name] ??= { current: [], previous: [] };

      if (a.exam === exam)
        grouped[className][group][name].current.push(+mean.toFixed(2));
      else if (hasPrevious && a.exam === previousExam)
        grouped[className][group][name].previous.push(+mean.toFixed(2));
    });

    const ranking = [];

    Object.entries(grouped).forEach(([className, pathways]) => {
      const allSubjects = [];

      Object.entries(pathways).forEach(([pathway, subjects]) => {
        const subjectList = Object.entries(subjects).map(
          ([learningArea, { current, previous }]) => {
            const entry = current.length;
            const mean = entry
              ? +(current.reduce((a, b) => a + b, 0) / entry).toFixed(2)
              : 0;
            const prevMean = previous.length
              ? +(
                  previous.reduce((a, b) => a + b, 0) / previous.length
                ).toFixed(2)
              : null;
            const deviation =
              prevMean !== null ? +(mean - prevMean).toFixed(2) : null;
            const color =
              deviation === null ? "gray" : deviation >= 0 ? "green" : "red";

            return {
              class: className,
              pathway,
              learningArea,
              entry,
              mean,
              previousMean: prevMean,
              deviation,
              color,
            };
          }
        );

        subjectList.sort((a, b) => b.mean - a.mean);
        subjectList.forEach((r, i) => (r.rank = i + 1));
        ranking.push(...subjectList);
        allSubjects.push(...subjectList);
      });

      allSubjects.sort((a, b) => b.mean - a.mean);
      allSubjects.forEach((r, i) => (r.overallRank = i + 1));
    });

    if (format === "pdf") {
      const metadata = {
        schoolName: school.name || "Unknown School",
        schoolLogo:
          school.logo || "https://elimu-assets.s3.amazonaws.com/logo.png",
        schoolLocation: school.location || "N/A",
        schoolContact: school.contact || "N/A",
        term,
        year,
        examType: exam,
      };

      const pdfBuffer = await generateSubjectRankingPDF(
        ranking,
        metadata,
        scope
      );
      const filename = `CBC_Subject_Ranking_${scope}_${term}_${year}.pdf`;

      res.setHeader("Content-Type", "application/pdf; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`
      );
      return res.send(pdfBuffer);
    }

    res.status(200).json({ raw: ranking });
  } catch (err) {
    console.error("[FinalSubjectRanking]", err);
    res.status(500).json({ error: "Error generating subject ranking" });
  }
};

// 📝 Retrieve a student's assessment for a specific subject by admission number, term, exam, year
const getAssessmentByAdmNo = async (req, res) => {
  try {
    const { admNo, subjectName } = req.params;
    const { term, exam, year } = req.query;

    if (!term || !exam || !year) {
      return res
        .status(400)
        .json({ error: "Missing term, exam, or year in query" });
    }

    const school = await resolveSchool(req);
    if (!school) {
      return res.status(404).json({ error: "School not found" });
    }

    const validExams = await Assessment.distinct("exam", {
      term,
      year: parseInt(year),
      school: school._id,
    });

    if (!validExams.includes(exam)) {
      return res.status(400).json({
        error: `Exam '${exam}' not recognized for ${term} ${year}. Valid exams: ${validExams.join(
          ", "
        )}`,
      });
    }

    const student = await Student.findOne({
      admNo: admNo.trim(),
      school: school._id,
    }).populate("class");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const subject = await Subject.findOne({
      name: new RegExp(`^${subjectName.trim()}$`, "i"),
      school: school._id,
    });

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const assessment = await Assessment.findOne({
      student: student._id,
      subject: subject._id,
      class: student.class._id,
      term,
      exam,
      year: parseInt(year),
      school: school._id,
    });

    if (!assessment) {
      return res
        .status(404)
        .json({ error: "Assessment not found for this setup" });
    }

    res.status(200).json({
      student: {
        name: student.name,
        admNo: student.admNo,
        class: student.class.name,
        grade: student.currentGrade,
      },
      learningArea: subject.name,
      pathway: subject.group,
      assessment: {
        entry: assessment.papers?.length || 0,
        mean: assessment.papers?.length
          ? +(
              assessment.papers.reduce((sum, p) => sum + p.score, 0) /
              assessment.papers.length
            ).toFixed(2)
          : null,
        papers: assessment.papers,
      },
      context: {
        term,
        exam,
        year: parseInt(year),
      },
    });
  } catch (err) {
    console.error("[getAssessmentByAdmNo]", err);
    res.status(500).json({ error: "Error retrieving assessment" });
  }
};

module.exports = {
  enterMarks,
  updateMarks,
  fetchAssessments,
  generateReportForm,
  generatePDF,
  generateBroadsheetUnified,
  generateBroadsheetBundle,
  getGradeDistributionUnified,
  rankGradeAndClasses,
  rankSubjectsAndLearningAreas,
  getAssessmentByAdmNo,
};
