import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  enterMarks,
  updateMarks,
  getSubjects,
  getClasses,
  getYears,
  getPaperConfigs,
  getSubjectsByClassName,
  fetchAssessments,
  generateReportForm,
  downloadReportPDFApi,
  downloadBroadsheetPDFApi,
  fetchPathways,
  getExamsByTermYear,
  generateBroadsheetUnified,
  getGradeDistributionUnified,
  downloadGradeDistributionPDF,
  rankGradeAndClasses,
  downloadRankingPDF,
  rankSubjectsAndLearningAreas,
  downloadSubjectRankingPDF,
} from "../Api";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";
import { computeSubjectScore } from "../utils/computeSubjectScore";
import { getGradeRemark } from "../utils/scoreUtils";
import { extractLevel } from "../utils/level";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Assessment() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;

  // useState hooks
  const [activeTab, setActiveTab] = useState("enter");
  const [entryParams, setEntryParams] = useState({
    classId: "",
    subjectId: "",
    exam: "",
    term: "Term 1",
    year: new Date().getFullYear(),
  });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [examOptions, setExamOptions] = useState([]);
  const [students, setStudents] = useState([]);
  const [paperConfig, setPaperConfig] = useState([]);
  const [marks, setMarks] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [reportParams, setReportParams] = useState({
    admNo: "",
    className: "",
    term: "Term 1",
    exam: "Opener",
    year: new Date().getFullYear(),
    format: "pdf",
  });
  const [reportPreview, setReportPreview] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  // broadsheet states
 const [broadsheetParams, setBroadsheetParams] = useState({
  className: "",
  gradeName: "",
  term: "Term 1",
  exam: "",
  year: new Date().getFullYear(),
  pathway: "",
  format: "json",
});
const [broadsheetPreview, setBroadsheetPreview] = useState(null);
const [broadsheetLoading, setBroadsheetLoading] = useState(false);
const [pathways, setPathways] = useState([]);
const [examsByTerm, setExamsByTerm] = useState([]);

// Grade Distribution states
const [distributionParams, setDistributionParams] = useState({
  level: "all",
  term: "Term 1",
  year: new Date().getFullYear(),
  exam: "Opener",
});
const [distributionPreview, setDistributionPreview] = useState(null);
const [distributionMeta, setDistributionMeta] = useState(null);
const [distributionLoading, setDistributionLoading] = useState(false);

// --- Ranking feature UI state
const [rankingParams, setRankingParams] = useState({
  grade: "all", // "all" | "10" | "11" | "12" (or a single grade)
  term: "Term 1",
  year: new Date().getFullYear(),
  exam: "Opener"
});
const [classRanking, setClassRanking] = useState([]);
const [gradeRanking, setGradeRanking] = useState([]);
const [rankingLoading, setRankingLoading] = useState(false);

// Subject Ranking states
const [subjectRankingParams, setSubjectRankingParams] = useState({
  grade: "10",
  term: "Term 1",
  year: new Date().getFullYear(),
  exam: "Opener",
  scope: "class",
});
const [subjectRanking, setSubjectRanking] = useState([]);
const [subjectRankingLoading, setSubjectRankingLoading] = useState(false);

  // useEffect hooks
  useEffect(() => {
    getClasses().then((data) => setClasses(Array.isArray(data) ? data : []));
    getSubjects().then((data) => setSubjects(Array.isArray(data) ? data : []));
    getYears().then((data) => setYears(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (activeTab === "enter" || activeTab === "update") {
      async function loadExamOptions() {
        const { classId, subjectId, term, year } = entryParams;
        const selClass = classes.find(
          (cls) => String(cls._id) === String(classId)
        );
        if (selClass && subjectId && term && year) {
          const configs = await getPaperConfigs();
          const filteredConfigs = configs.filter(
            (c) =>
              String(c.subject?._id ?? c.subject) === String(subjectId) &&
              Number(c.grade) === Number(selClass.grade) &&
              c.term === term &&
              Number(c.year) === Number(year) &&
              String(c.school?._id ?? c.school) === String(selClass.school)
          );
          const sortedConfigs = [...filteredConfigs].sort(
            (a, b) => (a.sequence ?? 999) - (b.sequence ?? 999)
          );
          const exams = Array.from(
            new Set(sortedConfigs.map((cfg) => cfg.exam))
          );
          setExamOptions(exams);
        } else {
          setExamOptions([]);
        }
      }
      loadExamOptions();
    }
  }, [entryParams, classes, activeTab]);

  useEffect(() => {
    if (activeTab === "report") {
      async function loadReportExamOptions() {
        const { className, term, year } = reportParams;
        const selClass = classes.find((cls) => cls.name === className);
        if (selClass && term && year) {
          const configs = await getPaperConfigs();
          const filteredConfigs = configs.filter(
            (c) =>
              Number(c.grade) === Number(selClass.grade) &&
              c.term === term &&
              Number(c.year) === Number(year) &&
              String(c.school?._id ?? c.school) === String(selClass.school)
          );
          const sortedConfigs = [...filteredConfigs].sort(
            (a, b) => (a.sequence ?? 999) - (b.sequence ?? 999)
          );
          const exams = Array.from(
            new Set(sortedConfigs.map((cfg) => cfg.exam))
          );
          setExamOptions(exams);
        } else {
          setExamOptions([]);
        }
      }
      loadReportExamOptions();
    }
  }, [reportParams, classes, activeTab]);

  useEffect(() => {
    if (activeTab !== "enter" && activeTab !== "update") {
      setStudents([]);
      setPaperConfig([]);
      setMarks({});
      return;
    }
    
    async function fetchData() {
      const { classId, subjectId, exam, year, term } = entryParams;
      const selClass = classes.find(
        (cls) => String(cls._id) === String(classId)
      );

      if (!selClass || !subjectId || !exam || !year || !term) {
        setStudents([]);
        setPaperConfig([]);
        setMarks({});
        return;
      }

      setIsLoading(true);
      try {
        const configs = await getPaperConfigs();
        const config = configs.find(
          (c) =>
            String(c.subject?._id ?? c.subject) === String(subjectId) &&
            Number(c.grade) === Number(selClass.grade) &&
            c.term === term &&
            c.exam === exam &&
            Number(c.year) === Number(year) &&
            String(c.school?._id ?? c.school) === String(selClass.school)
        );
        setPaperConfig(config?.papers || []);

        const studentsWithSubjects = await getSubjectsByClassName(
          selClass.name
        );
        const rawStudents =
          studentsWithSubjects?.students || studentsWithSubjects || [];
        const filteredStudents = rawStudents.filter(
          (student) =>
            Array.isArray(student.selectedSubjects) &&
            student.selectedSubjects.some(
              (sub) => String(sub._id) === String(subjectId)
            )
        );
        setStudents(filteredStudents);

        const assessmentsData = await fetchAssessments({
          classId,
          subjectId,
          exam,
          term,
          year,
        });

        const marksMap = {};
        filteredStudents.forEach((s) => {
          const assessment = assessmentsData.find((a) => a.admNo === s.admNo);
          marksMap[s.admNo] = (config?.papers || []).map((p) => ({
            paperNo: p.paperNo,
            score: assessment
              ? assessment.papers.find((pp) => pp.paperNo === p.paperNo)
                  ?.score ?? ""
              : "",
          }));
        });

        setMarks(marksMap);
        setMessage("");
      } catch {
        toast.error("Failed to load data. Please check your selections.");
        setStudents([]);
        setPaperConfig([]);
        setMarks({});
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [entryParams, classes, activeTab]);

  // broadsheet useEffect
  useEffect(() => {
    fetchPathways().then((d) => setPathways(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (broadsheetParams.term && broadsheetParams.year) {
      getExamsByTermYear(broadsheetParams.term, broadsheetParams.year).then(
        (d) => setExamsByTerm(Array.isArray(d) ? d : [])
      );
    }
  }, [broadsheetParams.term, broadsheetParams.year]);

  // Export report preview to PDF
  function exportReportPreviewToPDF() {
    if (!reportPreview || reportPreview.length === 0) {
      toast.error("No report preview to export");
      return;
    }
    const reportYear = reportParams.year ?? "--";
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const previewsPerPage = 3;
    const tableHeight = 85;
    const baseY = 14;
    const marginLeft = 12;
    const tableWidth = 185;
    const summaryFontSize = 9;

    reportPreview.forEach((rep, idx) => {
      const previewIdx = idx % previewsPerPage;
      if (idx > 0 && previewIdx === 0) doc.addPage();

      // Title line (Student Name + AdmNo)
      const startY = baseY + previewIdx * tableHeight;
      doc.setFontSize(11);
      doc.text(`${rep.name} (${rep.admNo})`, marginLeft, startY);

      // Extra info line, just below name
      doc.setFontSize(8);
      doc.text(
        `Pathway: ${rep.pathway ?? "--"}  |  Class: ${
          rep.class ?? "--"
        }  |  Rubric: ${rep.grade ?? "--"}  |  Year: ${reportYear}`,
        marginLeft,
        startY + 6
      );

      // --- DEFINE headRow/bodyRows FIRST!
      const exams = rep.scores?.[0]?.exams
        ? Object.keys(rep.scores[0].exams)
        : [];
      const headRow = [
        "Subject",
        ...exams,
        "Total",
        "Rubric",
        "Level",
        "Remark",
      ];
      const bodyRows = rep.scores.map((score) => [
        score.learningArea,
        ...exams.map((ex) => score.exams[ex]),
        score.total ?? "--",
        score.grade ?? "--",
        score.level ?? "--",
        score.remark ?? "--",
      ]);

      // NOW render the table, single call!
      autoTable(doc, {
        head: [headRow],
        body: bodyRows,
        startY: startY + 12, // About 6mm below the extra info, so no overlap!
        styles: {
          fontSize: 8,
          lineColor: [40, 40, 40],
          lineWidth: 0.25,
          cellPadding: 1,
        },
        headStyles: {
          fillColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontSize: 8,
          halign: "center",
          valign: "middle",
          lineColor: [40, 40, 40],
          lineWidth: 0.25,
        },
        margin: { left: marginLeft, right: 10 },
        tableWidth,
      });

      // Summary
      let lastY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(summaryFontSize);
      const summary = `Mean Score: ${rep.meanScore ?? "--"}   Rubric: ${
        rep.grade ?? "--"
      }   Remark: ${rep.summaryRemark ?? "--"}`;
      const maxSummaryWidth = tableWidth - 6;
      const summaryLines = doc.splitTextToSize(summary, maxSummaryWidth);
      doc.text(summaryLines, marginLeft, lastY, { maxWidth: maxSummaryWidth });
    });

    doc.save("report-preview.pdf");
  }

  // Handlers
  function handleScoreChange(admNo, paperNo, val) {
    setMarks((prev) => ({
      ...prev,
      [admNo]: prev[admNo].map((p) => {
        if (p.paperNo !== paperNo) return p;
        let newScore = val === "" ? "" : Number(val);
        const paperMax =
          paperConfig.find((pc) => pc.paperNo === p.paperNo)?.total ?? 100;
        if (newScore !== "" && newScore > paperMax) {
          toast.warning(`Score cannot exceed paper max (${paperMax})`);
          newScore = paperMax;
        }
        if (newScore !== "" && newScore < 0) newScore = 0;
        return { ...p, score: newScore };
      }),
    }));
  }

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const payload = Object.entries(marks).map(([admNo, papers]) => ({
        admNo,
        papers: papers.map((p) => ({
          paperNo: p.paperNo,
          score: Number(p.score),
        })),
      }));

      if (activeTab === "enter") {
        const res = await enterMarks({
          classId: entryParams.classId,
          subjectId: entryParams.subjectId,
          exam: entryParams.exam,
          term: entryParams.term,
          year: entryParams.year,
          marks: payload,
          allowUpdate: true,
        });
        if (res.actions.some((a) => a.action === "skipped")) {
          toast.warning("Some students already have marks. They were skipped.");
        } else {
          toast.success(res.message || "Marks entered successfully");
        }
        setMessage(res.message || "");
      } else {
        const res = await updateMarks({
          subjectName:
            subjects.find(
              (sub) => String(sub._id) === String(entryParams.subjectId)
            )?.name || "",
          term: entryParams.term,
          exam: entryParams.exam,
          year: entryParams.year,
          updates: payload,
        });
        toast.success(res.message || "Marks updated successfully");
        setMessage(res.message || "");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit marks");
    } finally {
      setIsLoading(false);
    }
  }

  async function previewReport() {
    const payload = { ...reportParams, format: "json" };
    if (!payload.admNo) delete payload.admNo;
    if (!payload.className) delete payload.className;

    if (
      !payload.term ||
      !payload.exam ||
      !payload.year ||
      (!payload.admNo && !payload.className)
    ) {
      toast.error("Please select all required fields for report preview");
      return;
    }

    setReportLoading(true);
    try {
      const data = await generateReportForm(payload);
      setReportPreview(data.reportForms || []);
    } catch (error) {
      console.error("[Preview Report Error]", error);
      toast.error(
        error.response?.data?.error || "Failed to fetch report preview"
      );
      setReportPreview(null);
    } finally {
      setReportLoading(false);
    }
  }

  async function downloadReportPDF() {
    if (
      !reportParams.term ||
      !reportParams.exam ||
      !reportParams.year ||
      (!reportParams.admNo && !reportParams.className)
    ) {
      toast.error("Please select all required fields for report generation");
      return;
    }
    setReportLoading(true);
    try {
      const response = await downloadReportPDFApi(reportParams);
      const pdfBlob = new Blob([response], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl);
    } catch (error) {
      toast.error(error.message || "Failed to generate PDF report");
    } finally {
      setReportLoading(false);
    }
  }
  

  // Access control early return
  if (!["admin", "teacher"].includes(role)) {
    return (
      <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>
    );
  }
  // Broadsheet handlers
async function previewBroadsheet() {
  setBroadsheetLoading(true);
  try {
    const res = await generateBroadsheetUnified({ ...broadsheetParams, format: "json" });
    setBroadsheetPreview(res.broadsheet || []);
    if (!res.broadsheet?.length) toast.warning("No data found.");
  } catch (err) {
    toast.error(err?.response?.data?.error || "Error fetching broadsheet");
    setBroadsheetPreview([]);
  } finally {
    setBroadsheetLoading(false);
  }
}

async function downloadBroadsheetPDF() {
  try {
    setBroadsheetLoading(true);
    const pdfBlob = await downloadBroadsheetPDFApi({ ...broadsheetParams, format: "pdf" });
    const pdfUrl = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
    window.open(pdfUrl);
  } catch{
    toast.error("Failed to generate broadsheet PDF");
  } finally {
    setBroadsheetLoading(false);
  }
}
// async function to preview grade distribution
async function previewGradeDistribution() {
  setDistributionLoading(true);
  const { level, term, year, exam } = distributionParams;
  try {
    const data = await getGradeDistributionUnified(level, term, year, exam);
    setDistributionPreview(data.distribution);
    setDistributionMeta(data.visual);
    if (!data.distribution || Object.keys(data.distribution).length === 0) {
      toast.warning("No distribution data found.");
    }
  } catch (err) {
    toast.error(err?.response?.data?.error || "Error fetching distribution");
    setDistributionPreview(null);
    setDistributionMeta(null);
  } finally {
    setDistributionLoading(false);
  }
}
// async function to download grade distribution PDF
async function exportGradeDistributionPDF() {
  setDistributionLoading(true);
  const { level, term, year, exam } = distributionParams;
  try {
    const pdfData = await downloadGradeDistributionPDF(level, term, year, exam);
    const url = window.URL.createObjectURL(new Blob([pdfData], { type: "application/pdf" }));
    const filename = `Grade_Distribution_${level}_${term}_${year}.pdf`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    toast.error(err?.response?.data?.error || "PDF export failed");
  } finally {
    setDistributionLoading(false);
  }
}
// --- Ranking feature handlers
// --- Preview CBC Ranking
async function previewRanking() {
  setRankingLoading(true);
  const { grade, term, year, exam } = rankingParams;
  try {
    const res = await rankGradeAndClasses(grade, term, year, exam);
    setClassRanking(res.classRanking || []);
    setGradeRanking(res.gradeRanking || []);
    if (
      (!res.classRanking || res.classRanking.length === 0) &&
      (!res.gradeRanking || res.gradeRanking.length === 0)
    ) {
      toast.warning("No ranking data found for these parameters.");
    }
  } catch (err) {
    toast.error(err?.response?.data?.error || "Error fetching ranking");
    setClassRanking([]);
    setGradeRanking([]);
  } finally {
    setRankingLoading(false);
  }
}

// --- Download PDF
async function downloadRankingPDFHandler() {
  setRankingLoading(true);
  const { grade, term, year, exam } = rankingParams;
  try {
    const pdfData = await downloadRankingPDF(grade, term, year, exam);
    const url = window.URL.createObjectURL(new Blob([pdfData], { type: "application/pdf" }));
    const filename = `CBC_Ranking_${grade}_${term}_${year}.pdf`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    toast.error(err?.response?.data?.error || "PDF export failed");
  } finally {
    setRankingLoading(false);
  }
}
// --- Subject Ranking handlers
async function previewSubjectRanking() {
  setSubjectRankingLoading(true);
  const { grade, term, year, exam, scope } = subjectRankingParams;
  try {
    const res = await rankSubjectsAndLearningAreas(grade, term, year, exam, scope);
    setSubjectRanking(res.raw || []);
    if (!res.raw || res.raw.length === 0) {
      toast.warning("No ranking data found for these parameters.");
    }
  } catch (err) {
    toast.error(err?.response?.data?.error || "Error fetching subject ranking");
    setSubjectRanking([]);
  } finally {
    setSubjectRankingLoading(false);
  }
}

async function exportSubjectRankingPDF() {
  setSubjectRankingLoading(true);
  const { grade, term, year, exam, scope } = subjectRankingParams;
  try {
    const pdfData = await downloadSubjectRankingPDF(grade, term, year, exam, scope);
    const url = window.URL.createObjectURL(new Blob([pdfData], { type: "application/pdf" }));
    const filename = `Subject_Ranking_${scope}_${term}_${year}.pdf`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    toast.error(err?.response?.data?.error || "PDF export failed");
  } finally {
    setSubjectRankingLoading(false);
  }
}


  return (
    <div className="p-2 max-w-6xl mx-auto space-y-4 min-h-screen bg-white">
      <TopRightLogout />
      <h2 className="text-lg font-bold text-indigo-700">
        Assessment Management
      </h2>

     {/* Tab navigation - ALL buttons in one flex row */}
<div className="flex space-x-2 mb-4 items-center">
  <button
    className={`px-3 py-1 rounded ${
      activeTab === "enter" ? "bg-indigo-600 text-white" : "bg-gray-200"
    }`}
    onClick={() => {
      setActiveTab("enter");
      setMessage("");
    }}
  >
    Enter Marks
  </button>
  <button
    className={`px-3 py-1 rounded ${
      activeTab === "update" ? "bg-indigo-600 text-white" : "bg-gray-200"
    }`}
    onClick={() => {
      setActiveTab("update");
      setMessage("");
    }}
  >
    Update Marks
  </button>
  <button
    className={`px-3 py-1 rounded ${
      activeTab === "report" ? "bg-indigo-600 text-white" : "bg-gray-200"
    }`}
    onClick={() => {
      setActiveTab("report");
      setReportPreview(null);
    }}
  >
    Generate Report
  </button>
  <button
    className={`px-3 py-1 rounded ${
      activeTab === "broadsheet" ? "bg-indigo-600 text-white" : "bg-gray-200"
    }`}
    onClick={() => {
      setActiveTab("broadsheet");
      setBroadsheetPreview(null);
    }}
  >
    Export Broadsheet
  </button>
  <button
    className={`px-3 py-1 rounded ${
      activeTab === "distribution" ? "bg-indigo-600 text-white" : "bg-gray-200"
    }`}
    onClick={() => {
      setActiveTab("distribution");
      setDistributionPreview(null);
      setDistributionMeta(null);
    }}
  >
    Grade Distribution
  </button>
  <button
  className={`px-3 py-1 rounded ${activeTab === "ranking" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
  onClick={() => {
    setActiveTab("ranking");
    setClassRanking([]);
    setGradeRanking([]);
  }}
>
  Class & Grade Ranking
</button>
<button
  className={`px-3 py-1 rounded ${activeTab === "subjectRanking" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
  onClick={() => {
    setActiveTab("subjectRanking");
    setSubjectRanking([]);
  }}
>
  Learning Area Ranking
</button>
</div>

      {(activeTab === "enter" || activeTab === "update") && (
        <>
          {/* Filters shared across Enter and Update */}
          <div className="grid grid-cols-2 gap-2 my-2">
            <select
              value={entryParams.classId}
              onChange={(e) =>
                setEntryParams((p) => ({ ...p, classId: e.target.value }))
              }
              className="p-1 border rounded text-xs"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <select
              value={entryParams.subjectId}
              onChange={(e) =>
                setEntryParams((p) => ({ ...p, subjectId: e.target.value }))
              }
              className="p-1 border rounded text-xs"
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.LearningArea || subject.name}
                </option>
              ))}
            </select>

            <select
              value={entryParams.term}
              onChange={(e) =>
                setEntryParams((p) => ({ ...p, term: e.target.value }))
              }
              className="p-1 border rounded text-xs"
            >
              {["Term 1", "Term 2", "Term 3"].map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>

            <select
              value={entryParams.exam}
              onChange={(e) =>
                setEntryParams((p) => ({ ...p, exam: e.target.value }))
              }
              className="p-1 border rounded text-xs"
            >
              <option value="">Select Exam</option>
              {examOptions.map((exam) => (
                <option key={String(exam)} value={exam}>
                  {exam}
                </option>
              ))}
            </select>

            <select
              value={entryParams.year}
              onChange={(e) =>
                setEntryParams((p) => ({ ...p, year: e.target.value }))
              }
              className="p-1 border rounded text-xs"
            >
              {years.map((y) => (
                <option key={String(y)} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Marks table */}
          {isLoading ? (
            <Spinner />
          ) : paperConfig.length > 0 && students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border">Adm</th>
                    <th className="px-2 py-1 border">Name</th>
                    {paperConfig.map((p) => (
                      <th key={p.paperNo} className="px-2 py-1 border">
                        {p.name || `P${p.paperNo}`}
                        <br />
                        <span className="text-[10px] text-gray-400">
                          /{p.total}
                        </span>
                      </th>
                    ))}
                    <th className="px-2 py-1 border bg-blue-50">Avg</th>
                    <th className="px-2 py-1 border bg-green-50">Rubric</th>
                    <th className="px-2 py-1 border bg-yellow-50">Level</th>
                    <th className="px-2 py-1 border bg-gray-50">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const papers = marks[s.admNo] || [];
                    const displayPapers = papers.map((pm, idx) => ({
                      ...pm,
                      total: paperConfig[idx]?.total ?? 0,
                      score:
                        pm.score !== "" &&
                        pm.score > (paperConfig[idx]?.total ?? 100)
                          ? paperConfig[idx]?.total
                          : pm.score,
                    }));
                    const subjectObj = subjects.find(
                      (sub) => String(sub._id) === String(entryParams.subjectId)
                    );
                    const avg = Math.round(
                      computeSubjectScore(
                        displayPapers,
                        subjectObj?.LearningArea || subjectObj?.name || ""
                      )
                    );
                    const gradeObj = getGradeRemark(avg);
                    const lvl = extractLevel(gradeObj.grade);

                    return (
                      <tr key={s.admNo}>
                        <td className="px-2 py-1 border">{s.admNo}</td>
                        <td className="px-2 py-1 border whitespace-nowrap">
                          {s.name}
                        </td>
                        {paperConfig.map((paper, idx) => (
                          <td key={paper.paperNo} className="px-2 py-1 border">
                            <input
                              type="number"
                              value={marks[s.admNo]?.[idx]?.score ?? ""}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (val === "") val = "";
                                else if (Number(val) > paper.total) {
                                  toast.warning(
                                    `Score cannot exceed paper max (${paper.total})`
                                  );
                                  val = paper.total;
                                } else if (Number(val) < 0) val = 0;
                                handleScoreChange(s.admNo, paper.paperNo, val);
                              }}
                              className={`p-1 border rounded w-14 text-xs ${
                                Number(marks[s.admNo]?.[idx]?.score) >
                                paper.total
                                  ? "border-red-500"
                                  : ""
                              }`}
                              min="0"
                              max={paper.total}
                              disabled={false}
                            />
                            {Number(marks[s.admNo]?.[idx]?.score) >
                              paper.total && (
                              <div className="text-[10px] text-red-500 font-semibold">
                                Max {paper.total}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-1 border bg-blue-50 font-semibold">
                          {isNaN(avg) ? "--" : avg}
                        </td>
                        <td className="px-2 py-1 border bg-green-50 font-semibold">
                          {gradeObj.grade || "--"}
                        </td>
                        <td className="px-2 py-1 border bg-yellow-50 font-semibold">
                          {lvl ?? "--"}
                        </td>
                        <td className="px-2 py-1 border bg-gray-50 font-semibold whitespace-nowrap">
                          {gradeObj.remark}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-2 text-red-600 text-xs">
              Select all options to load students and mark sheet.
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleSubmit}
              className={`mt-4 ${
                activeTab === "enter" ? "bg-green-600" : "bg-blue-600"
              } text-white px-3 py-1 rounded hover:${
                activeTab === "enter" ? "bg-green-700" : "bg-blue-700"
              } text-xs`}
            >
              Submit Marks ({activeTab === "enter" ? "Enter" : "Update"})
            </button>
          </div>

          {message && (
            <p
              className={`mt-3 text-xs ${
                activeTab === "enter" ? "text-green-700" : "text-blue-700"
              }`}
            >
              {message}
            </p>
          )}
        </>
      )}

      {/* Report Generation Section */}
      {activeTab === "report" && (
        <section className="mt-8 border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Generate Report Form</h3>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Admission No (optional)"
              value={reportParams.admNo}
              onChange={(e) =>
                setReportParams((p) => ({ ...p, admNo: e.target.value }))
              }
              className="border p-2 rounded col-span-1"
            />
            <select
              value={reportParams.className}
              onChange={(e) =>
                setReportParams((p) => ({ ...p, className: e.target.value }))
              }
              className="border p-2 rounded col-span-1"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={reportParams.term}
              onChange={(e) =>
                setReportParams((p) => ({ ...p, term: e.target.value }))
              }
              className="border p-2 rounded col-span-1"
            >
              {["Term 1", "Term 2", "Term 3"].map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
            <select
              value={reportParams.exam}
              onChange={(e) =>
                setReportParams((p) => ({ ...p, exam: e.target.value }))
              }
              className="border p-2 rounded col-span-1"
            >
              <option value="">Select Exam</option>
              {examOptions.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>

            <select
              value={reportParams.year}
              onChange={(e) =>
                setReportParams((p) => ({ ...p, year: e.target.value }))
              }
              className="border p-2 rounded col-span-1"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="col-span-3 flex space-x-4 mt-4">
              <button
                disabled={reportLoading}
                onClick={() => {
                  if (!reportParams.admNo && !reportParams.className) {
                    toast.error("Provide admission number or class");
                    return;
                  }
                  setReportParams((p) => ({ ...p, format: "json" }));
                  previewReport();
                }}
                className="bg-indigo-600 text-white rounded px-4 py-2 hover:bg-indigo-700"
              >
                Preview Report
              </button>
              <button
                disabled={reportLoading}
                onClick={downloadReportPDF}
                className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
              >
                Download PDF
              </button>
              <button
                disabled={!reportPreview || reportPreview.length === 0}
                onClick={exportReportPreviewToPDF}
                className="bg-gray-700 text-white rounded px-4 py-2 hover:bg-black"
              >
                🖨️Export Preview as PDF
              </button>
            </div>

            {reportLoading && <Spinner />}

            {reportParams.format === "json" && reportPreview && (
              <div className="mt-4 max-h-80 overflow-auto border p-3 bg-gray-50 rounded col-span-3">
                <h4 className="text-lg font-semibold mb-2">Report Preview</h4>
                {reportPreview.length === 0 && <p>No data to display</p>}
                {reportPreview.map((rep) => (
                  <div key={rep.admNo} className="mb-6">
                    <p>
                      <strong>{rep.name}</strong> ({rep.admNo})
                    </p>
                    <table className="min-w-full border border-gray-300 my-2 text-xs">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 border">Learning Area</th>
                          {rep.scores &&
                            rep.scores[0]?.exams &&
                            Object.keys(rep.scores[0].exams).map((ex) => (
                              <th key={ex} className="px-2 py-1 border">
                                {ex}
                              </th>
                            ))}
                          <th className="px-2 py-1 border bg-blue-50">Total</th>
                          <th className="px-2 py-1 border bg-green-50">
                            Rubric
                          </th>
                          <th className="px-2 py-1 border bg-yellow-50">
                            Level
                          </th>
                          <th className="px-2 py-1 border bg-gray-50">
                            Remark
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rep.scores.map((score, i) => (
                          <tr key={score.learningArea || i}>
                            <td className="px-2 py-1 border">
                              {score.learningArea}
                            </td>
                            {score.exams &&
                              Object.keys(score.exams).map((ex) => (
                                <td key={ex} className="px-2 py-1 border">
                                  {score.exams[ex]}
                                </td>
                              ))}
                            <td className="px-2 py-1 border bg-blue-50">
                              {score.total ?? "--"}
                            </td>
                            <td className="px-2 py-1 border bg-green-50">
                              {score.grade ?? "--"}
                            </td>
                            <td className="px-2 py-1 border bg-yellow-50">
                              {score.level ?? "--"}
                            </td>
                            <td className="px-2 py-1 border bg-gray-50">
                              {score.remark ?? "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="my-2">
                      <b>Mean Score:</b> {rep.meanScore ?? "--"} |{" "}
                      <b>Rubric:</b> {rep.grade ?? "--"} | <b>Remark:</b>{" "}
                      {rep.summaryRemark ?? "--"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
     {activeTab === "broadsheet" && (
  <section className="mt-8 border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">Export Broadsheet</h3>
    <div className="grid grid-cols-3 gap-3 mb-4">
      <select
        value={broadsheetParams.className}
        onChange={e => setBroadsheetParams(p => ({ ...p, className: e.target.value, gradeName: "" }))}
        className="border p-2 rounded"
      >
        <option value="">Choose Class (or use Grade)</option>
        {classes.map(c => (
          <option key={c._id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select
        value={broadsheetParams.gradeName}
        onChange={e => setBroadsheetParams(p => ({ ...p, gradeName: e.target.value, className: "" }))}
        className="border p-2 rounded"
      >
        <option value="">Choose Grade (if not using Class)</option>
        {Array.from(new Set(classes.map(cls => cls.grade))).map(grade =>
          <option key={grade} value={grade}>{grade}</option>
        )}
      </select>
      <select
        value={broadsheetParams.term}
        onChange={e => setBroadsheetParams(p => ({ ...p, term: e.target.value }))}
        className="border p-2 rounded"
      >
        {["Term 1", "Term 2", "Term 3"].map(term =>
          <option key={term} value={term}>{term}</option>
        )}
      </select>
      <select
        value={broadsheetParams.exam}
        onChange={e => setBroadsheetParams(p => ({ ...p, exam: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="">Choose Exam</option>
        {examsByTerm.map(ex => (
          <option key={ex} value={ex}>{ex}</option>
        ))}
      </select>
      <select
        value={broadsheetParams.year}
        onChange={e => setBroadsheetParams(p => ({ ...p, year: e.target.value }))}
        className="border p-2 rounded"
      >
        {years.map(y => (
          <option key={String(y)} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={broadsheetParams.pathway}
        onChange={e => setBroadsheetParams(p => ({ ...p, pathway: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="">Choose Pathway</option>
        <option value="GENERAL">GENERAL</option>
        {pathways.map(p => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>
    </div>
    <div className="flex space-x-4 mb-4">
      <button
        className="bg-indigo-600 text-white rounded px-4 py-2 hover:bg-indigo-700"
        disabled={broadsheetLoading}
        onClick={previewBroadsheet}
      >
        Preview Broadsheet
      </button>
      <button
        className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
        disabled={broadsheetLoading}
        onClick={downloadBroadsheetPDF}
      >
        Download PDF
      </button>
    </div>
    {broadsheetLoading && <Spinner />}
    {broadsheetPreview && (
      <div className="overflow-auto border bg-gray-50 rounded p-2 text-xs max-h-96">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="border px-1 py-1">AdmNo</th>
              <th className="border px-1 py-1">Name</th>
              <th className="border px-1 py-1">Class</th>
              <th className="border px-1 py-1">Pathway</th>
              <th className="border px-1 py-1">Subject</th>
              <th className="border px-1 py-1">Score</th>
              <th className="border px-1 py-1">Rubric</th>
              <th className="border px-1 py-1">Level</th>
              <th className="border px-1 py-1">Rank</th>
            </tr>
          </thead>
          <tbody>
            {broadsheetPreview.map((row, idx) => (
              <tr key={String(row.admNo) + "_" + row.learningArea + "_" + idx}>
                <td className="border px-1 py-1">{row.admNo}</td>
                <td className="border px-1 py-1">{row.name}</td>
                <td className="border px-1 py-1">{row.class}</td>
                <td className="border px-1 py-1">{row.pathway || "-"}</td>
                <td className="border px-1 py-1">{row.learningArea}</td>
                <td className="border px-1 py-1">{row.score}</td>
                <td className="border px-1 py-1">{row.grade || "-"}</td>
                <td className="border px-1 py-1">{row.level ?? "-"}</td>
                <td className="border px-1 py-1">{row.rank ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}
{activeTab === "distribution" && (
  <section className="mt-8 border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">CBE Grade Distribution</h3>
    <div className="grid grid-cols-4 gap-4 mb-4">
      <input
        type="text"
        value={distributionParams.level}
        onChange={e => setDistributionParams(p => ({ ...p, level: e.target.value }))}
        className="border p-2 rounded"
        placeholder="e.g. all, grade 11, Class 10A"
      />
      <select
        value={distributionParams.term}
        onChange={e => setDistributionParams(p => ({ ...p, term: e.target.value }))}
        className="border p-2 rounded"
      >
        {["Term 1", "Term 2", "Term 3"].map(term => (
          <option key={term} value={term}>{term}</option>
        ))}
      </select>
      <select
        value={distributionParams.year}
        onChange={e => setDistributionParams(p => ({ ...p, year: e.target.value }))}
        className="border p-2 rounded"
      >
        {years.map(y => (
          <option key={String(y)} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={distributionParams.exam}
        onChange={e => setDistributionParams(p => ({ ...p, exam: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="">Select Exam</option>
        {examsByTerm.map(ex => (
          <option key={ex} value={ex}>{ex}</option>
        ))}
      </select>
    </div>
    <div className="flex gap-4 mb-4">
      <button
        className="bg-indigo-600 text-white rounded px-4 py-2 hover:bg-indigo-700"
        disabled={distributionLoading}
        onClick={previewGradeDistribution}
      >
        {distributionLoading ? "Loading…" : "Preview Distribution"}
      </button>
      <button
        className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
        disabled={distributionLoading}
        onClick={exportGradeDistributionPDF}
      >
        Export PDF
      </button>
    </div>
    {distributionLoading && <Spinner />}
    {distributionPreview && distributionMeta && (
      <div className="overflow-auto border bg-gray-50 rounded p-2 text-xs max-h-96">
        <h4 className="font-bold mb-2">{distributionMeta.title}</h4>
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-gray-100">Pathway</th>
              {distributionMeta.gradeBands.map(b => (
                <th key={b} className="border px-2 py-1">{b}</th>
              ))}
              <th className="border px-2 py-1 bg-gray-100">Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(distributionPreview).map(([pathway, bands]) => {
              const total = Object.values(bands).reduce((sum, val) => typeof val === "number" ? sum + val : sum, 0);
              return (
                <tr key={pathway}>
                  <td className="border px-2 py-1 font-semibold">{pathway}</td>
                  {distributionMeta.gradeBands.map(b => {
                    const val = bands[b];
                    const percent = total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0%";
                    return (
                      <td key={b} className="border px-2 py-1">
                        {val}<br />
                        <span className="text-xs text-gray-500">{percent}</span>
                      </td>
                    );
                  })}
                  <td className="border px-2 py-1 font-semibold">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}
{activeTab === "ranking" && (
  <section className="mt-8 border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">CBE Class & Grade Ranking</h3>
    <div className="grid grid-cols-4 gap-4 mb-4">
      <select
        value={rankingParams.grade}
        onChange={e => setRankingParams(p => ({ ...p, grade: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="all">All Grades</option>
        {[10, 11, 12].map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select
        value={rankingParams.term}
        onChange={e => setRankingParams(p => ({ ...p, term: e.target.value }))}
        className="border p-2 rounded"
      >
        {["Term 1", "Term 2", "Term 3"].map(term => (
          <option key={term} value={term}>{term}</option>
        ))}
      </select>
      <select
        value={rankingParams.year}
        onChange={e => setRankingParams(p => ({ ...p, year: e.target.value }))}
        className="border p-2 rounded"
      >
        {years.map(y => (
          <option key={String(y)} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={rankingParams.exam}
        onChange={e => setRankingParams(p => ({ ...p, exam: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="">Select Exam</option>
        {examsByTerm.map(ex => (
          <option key={ex} value={ex}>{ex}</option>
        ))}
      </select>
    </div>
    <div className="flex gap-4 mb-4">
      <button
        className="bg-indigo-600 text-white rounded px-4 py-2 hover:bg-indigo-700"
        disabled={rankingLoading}
        onClick={previewRanking}
      >
        {rankingLoading ? "Loading…" : "Preview Ranking"}
      </button>
      <button
        className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
        disabled={rankingLoading}
        onClick={downloadRankingPDFHandler}
      >
        Export PDF
      </button>
    </div>
    {rankingLoading && <Spinner />}
    {/* Class Ranking Table */}
{classRanking.length > 0 && (
  <div className="overflow-auto border bg-gray-50 rounded p-2 text-xs max-h-96 mb-4">
    <h4 className="font-bold mb-2">Class Ranking</h4>
    <table className="min-w-full border">
      <thead>
        <tr>
          <th className="border px-2 py-1">Pos</th>
          <th className="border px-2 py-1">Class</th>
          <th className="border px-2 py-1">Entry</th>
          <th className="border px-2 py-1">Mean</th>
          <th className="border px-2 py-1">Rubric</th>
          <th className="border px-2 py-1">Prev</th>
          <th className="border px-2 py-1">Dev</th>
        </tr>
      </thead>
      <tbody>
        {classRanking.map((r, idx) => (
          <tr key={idx}>
            <td className="border px-2 py-1">{r.position}</td>
            <td className="border px-2 py-1">{r.class}</td>
            <td className="border px-2 py-1">{r.entry}</td>
            <td className="border px-2 py-1">{r.mean}</td>
            <td className="border px-2 py-1">{r.gradeLabel ?? "--"}</td>
            <td className="border px-2 py-1">{r.previousMean ?? "--"}</td>
            <td
              className="border px-2 py-1 font-semibold"
              style={{
                backgroundColor:
                  r.deviation === "--"
                    ? "gray"
                    : Number(r.deviation) > 0
                    ? "#1b5e20"
                    : Number(r.deviation) < 0
                    ? "#e53935"
                    : "gray",
                color:
                  r.deviation === "--"
                    ? "black"
                    : Number(r.deviation) !== 0
                    ? "white"
                    : "black",
              }}
            >
              {r.deviation ?? "--"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
{/* Grade Ranking Table */}
{gradeRanking.length > 0 && (
  <div className="overflow-auto border bg-gray-50 rounded p-2 text-xs max-h-96">
    <h4 className="font-bold mb-2">Grade Ranking</h4>
    <table className="min-w-full border">
      <thead>
        <tr>
          <th className="border px-2 py-1">Pos</th>
          <th className="border px-2 py-1">Grade</th>
          <th className="border px-2 py-1">Entry</th>
          <th className="border px-2 py-1">Mean</th>
          <th className="border px-2 py-1">Rubric</th>
          <th className="border px-2 py-1">Prev</th>
          <th className="border px-2 py-1">Dev</th>
        </tr>
      </thead>
      <tbody>
        {gradeRanking.map((r, idx) => (
          <tr key={idx}>
            <td className="border px-2 py-1">{r.position}</td>
            <td className="border px-2 py-1">Grade {r.grade}</td>
            <td className="border px-2 py-1">{r.entry}</td>
            <td className="border px-2 py-1">{r.mean}</td>
            <td className="border px-2 py-1">{r.gradeLabel ?? "--"}</td>
            <td className="border px-2 py-1">{r.previousMean ?? "--"}</td>
            <td
              className="border px-2 py-1 font-semibold"
              style={{
                backgroundColor:
                  r.deviation === "--"
                    ? "gray"
                    : Number(r.deviation) > 0
                    ? "#1b5e20"
                    : Number(r.deviation) < 0
                    ? "#e53935"
                    : "gray",
                color:
                  r.deviation === "--"
                    ? "black"
                    : Number(r.deviation) !== 0
                    ? "white"
                    : "black",
              }}
            >
              {r.deviation ?? "--"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
  </section>
)}
{activeTab === "subjectRanking" && (
  <section className="mt-8 border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">CBE Learning Area Ranking</h3>
    <div className="grid grid-cols-5 gap-4 mb-4">
      <select
        value={subjectRankingParams.grade}
        onChange={e => setSubjectRankingParams(p => ({ ...p, grade: e.target.value }))}
        className="border p-2 rounded"
      >
        {[10, 11, 12].map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select
        value={subjectRankingParams.term}
        onChange={e => setSubjectRankingParams(p => ({ ...p, term: e.target.value }))}
        className="border p-2 rounded"
      >
        {["Term 1", "Term 2", "Term 3"].map(term => (
          <option key={term} value={term}>{term}</option>
        ))}
      </select>
      <select
        value={subjectRankingParams.year}
        onChange={e => setSubjectRankingParams(p => ({ ...p, year: e.target.value }))}
        className="border p-2 rounded"
      >
        {years.map(y => (
          <option key={String(y)} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={subjectRankingParams.exam}
        onChange={e => setSubjectRankingParams(p => ({ ...p, exam: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="">Select Exam</option>
        {examsByTerm.map(ex => (
          <option key={ex} value={ex}>{ex}</option>
        ))}
      </select>
      <select
        value={subjectRankingParams.scope}
        onChange={e => setSubjectRankingParams(p => ({ ...p, scope: e.target.value }))}
        className="border p-2 rounded"
      >
        <option value="class">By Class</option>
        <option value="grade">By Grade</option>
      </select>
    </div>
    <div className="flex gap-4 mb-4">
      <button
        className="bg-indigo-600 text-white rounded px-4 py-2 hover:bg-indigo-700"
        disabled={subjectRankingLoading}
        onClick={previewSubjectRanking}
      >
        {subjectRankingLoading ? "Loading…" : "Preview Ranking"}
      </button>
      <button
        className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
        disabled={subjectRankingLoading}
        onClick={exportSubjectRankingPDF}
      >
        Export PDF
      </button>
    </div>
    {subjectRankingLoading && <Spinner />}
    {subjectRanking.length > 0 && (
      <div className="overflow-auto border bg-gray-50 rounded p-2 text-xs max-h-96">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">Class</th>
              <th className="border px-2 py-1">Pathway</th>
              <th className="border px-2 py-1">Learning Area</th>
              <th className="border px-2 py-1">Entry</th>
              <th className="border px-2 py-1">Mean</th>
              <th className="border px-2 py-1">Prev</th>
              <th className="border px-2 py-1">Dev</th>
              <th className="border px-2 py-1">Rank</th>
              <th className="border px-2 py-1">Overall Rank</th>
            </tr>
          </thead>
          <tbody>
            {subjectRanking.map((r, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">{r.class}</td>
                <td className="border px-2 py-1">{r.pathway}</td>
                <td className="border px-2 py-1">{r.learningArea}</td>
                <td className="border px-2 py-1">{r.entry}</td>
                <td className="border px-2 py-1">{r.mean}</td>
                <td className="border px-2 py-1">{r.previousMean ?? "--"}</td>
                <td
                  className="border px-2 py-1 font-semibold"
                  style={{
                    backgroundColor:
                      r.deviation === null
                        ? "gray"
                        : Number(r.deviation) > 0
                        ? "#1b5e20"
                        : Number(r.deviation) < 0
                        ? "#e53935"
                        : "gray",
                    color:
                      r.deviation === null
                        ? "black"
                        : Number(r.deviation) !== 0
                        ? "white"
                        : "black",
                  }}
                >
                  {r.deviation ?? "--"}
                </td>
                <td className="border px-2 py-1">{r.rank}</td>
                <td className="border px-2 py-1">{r.overallRank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 w-full bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-xs"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
