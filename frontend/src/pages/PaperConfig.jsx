import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  setPaperConfigByName,
  getPaperConfigs,
  updatePaperConfigByName,
  getSubjects,
  getGrades,
  getYears,
  deletePaperConfigByName,
} from "../Api";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";

export default function PaperConfig() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;

  // --- State
  const [activeTab, setActiveTab] = useState("view");
  const [configs, setConfigs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [years, setYears] = useState([]);
  const [examFilter, setExamFilter] = useState(""); // exam filter state
  const [termFilter, setTermFilter] = useState(""); // term filter state
  const [gradeFilter, setGradeFilter] = useState(""); // grade filter state
  const [form, setForm] = useState({
    subjectName: "",
    grade: "",
    term: "Term 1",
    exam: "Opener",
    year: new Date().getFullYear(),
    papers: [{ name: "Paper 1", outOf: "" }],
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- Load initial data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadConfigs();
      await loadSubjects();
      await loadGrades();
      await loadYears();
      setIsLoading(false);
    };
    init();
  }, []);

  // --- Loaders
  async function loadConfigs() {
    try {
      const data = await getPaperConfigs();
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load paper configs");
    }
  }
  async function loadSubjects() {
    try {
      const data = await getSubjects();
      setSubjects(Array.isArray(data) ? data.map((s) => s.LearningArea) : []);
    } catch {
      toast.error("Failed to load subjects");
    }
  }
  async function loadGrades() {
    try {
      const data = await getGrades();
      setGrades(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load grades");
    }
  }
  async function loadYears() {
    try {
      const data = await getYears();
      setYears(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load years");
    }
  }

  // --- Form utils
  function resetForm() {
    setForm({
      subjectName: "",
      grade: "",
      term: "Term 1",
      exam: "Opener",
      year: new Date().getFullYear(),
      papers: [{ name: "Paper 1", outOf: "" }],
    });
    setMessage("");
  }
  function handlePaperChange(index, field, value) {
    setForm((prev) => ({
      ...prev,
      papers: prev.papers.map((paper, i) =>
        i === index ? { ...paper, [field]: value } : paper
      ),
    }));
  }
  function addPaper() {
    setForm((prev) => ({
      ...prev,
      papers: [...prev.papers, { name: `Paper ${prev.papers.length + 1}`, outOf: "" }],
    }));
  }
  function removePaper(index) {
    if (form.papers.length === 1) return;
    setForm((prev) => ({
      ...prev,
      papers: prev.papers.filter((_, i) => i !== index),
    }));
  }

  // --- CRUD operations
  async function handleCreate() {
    const { subjectName, grade, term, exam, year, papers } = form;
    if (!subjectName || !grade) {
      toast.error("Fill in all required fields.");
      return;
    }
    if (
      papers.some(
        (p) => !p.name || p.name.trim() === "" || isNaN(Number(p.outOf)) || Number(p.outOf) <= 0
      )
    ) {
      toast.error("Each paper must have a name and a positive number for 'Out Of'.");
      return;
    }
    try {
      const res = await setPaperConfigByName(subjectName, {
        grade: Number(grade),
        term,
        exam,
        year: Number(year),
        papers: papers.map((p) => ({ name: p.name.trim(), outOf: Number(p.outOf) })),
      });
      toast.success(res.message || "Config created.");
      resetForm();
      await loadConfigs();
      setActiveTab("view");
    } catch (err) {
      toast.error(err.response?.data?.error || "Creation failed");
    }
  }

  async function handleUpdate() {
    const { subjectName, grade, term, exam, year, papers } = form;
    if (!subjectName || !grade) {
      toast.error("Fill in all required fields.");
      return;
    }
    if (
      papers.some(
        (p) => !p.name || p.name.trim() === "" || isNaN(Number(p.outOf)) || Number(p.outOf) <= 0
      )
    ) {
      toast.error("Each paper must have a name and a positive number for 'Out Of'.");
      return;
    }
    try {
      const res = await updatePaperConfigByName(subjectName, {
        grade: Number(grade),
        term,
        exam,
        year: Number(year),
        papers: papers.map((p) => ({
          name: p.name.trim(),
          outOf: Number(p.outOf),
        })),
      });
      toast.success(res.message || "Config updated.");
      resetForm();
      await loadConfigs();
      setActiveTab("view");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
  }

  function loadConfigForEdit(config) {
    setForm({
      subjectName: config.subject?.name || config.LearningArea,
      grade: config.grade,
      term: config.term,
      exam: config.exam,
      year: config.year,
      papers: config.papers.map((p) => ({
        name: p.name || `Paper ${p.paperNo}`,
        outOf: typeof p.total === "number" ? p.total : "",
      })),
    });
    setActiveTab("update");
  }

  async function handleDelete(cfg) {
    if (!window.confirm(`Delete config for ${cfg.LearningArea}?`)) return;
    try {
      const res = await deletePaperConfigByName(cfg.LearningArea, {
        grade: cfg.grade,
        term: cfg.term,
        exam: cfg.exam,
        year: cfg.year,
      });
      toast.success(res.message || "Config deleted.");
      await loadConfigs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  }

  // --- Unique filter options for dropdowns
  const uniqueExams = [...new Set(configs.map((cfg) => cfg.exam))].filter(Boolean).sort();
  const uniqueTerms = [...new Set(configs.map((cfg) => cfg.term))].filter(Boolean).sort();
  const uniqueGrades = [...new Set(configs.map((cfg) => cfg.grade))].filter(Boolean).sort((a, b) => a - b);

  if (!["admin", "teacher"].includes(role)) {
    return <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white min-h-screen space-y-6">
      <TopRightLogout />
      <h2 className="text-2xl font-bold text-indigo-700">📜 Paper Config Management</h2>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab("view")} className={tabStyle("view")}>
              📘 View
            </button>
            {role === "admin" && (
              <>
                <button onClick={() => setActiveTab("create")} className={tabStyle("create")}>
                  🆕 Create
                </button>
                <button onClick={() => setActiveTab("update")} className={tabStyle("update")}>
                  ✏️ Update
                </button>
              </>
            )}
          </div>

          {/* View Configs */}
          {activeTab === "view" && (
            <section>
              <h3 className="text-lg font-semibold text-indigo-700">📘 All Paper Configs</h3>
              <div className="mb-3 flex gap-2 items-center flex-wrap">
                <label className="font-medium">Filter by Exam:</label>
                <select
                  value={examFilter}
                  onChange={(e) => setExamFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">All Exams</option>
                  {uniqueExams.map((exam, idx) => (
                    <option key={idx} value={exam}>
                      {exam}
                    </option>
                  ))}
                </select>

                <label className="font-medium">Filter by Term:</label>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">All Terms</option>
                  {uniqueTerms.map((term, idx) => (
                    <option key={idx} value={term}>
                      {term}
                    </option>
                  ))}
                </select>

                <label className="font-medium">Filter by Grade:</label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">All Grades</option>
                  {uniqueGrades.map((grade, idx) => (
                    <option key={idx} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <table className="min-w-full border border-gray-300 mt-2">
                <thead>
                  <tr className="bg-indigo-100">
                    <th className="px-4 py-2 border">L.Area</th>
                    <th className="px-4 py-2 border">Grade</th>
                    <th className="px-4 py-2 border">Term</th>
                    <th className="px-4 py-2 border">Exam</th>
                    <th className="px-4 py-2 border">Year</th>
                    <th className="px-4 py-2 border">Papers</th>
                    {role === "admin" && <th className="px-4 py-2 border">✏️</th>}
                    {role === "admin" && <th className="px-4 py-2 border">🗑️</th>}
                  </tr>
                </thead>
                <tbody>
                  {configs
                    .filter(
                      (cfg) =>
                        (!examFilter || cfg.exam === examFilter) &&
                        (!termFilter || cfg.term === termFilter) &&
                        (!gradeFilter || String(cfg.grade) === String(gradeFilter))
                    )
                    .map((cfg, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border">{cfg.subjectName}</td>
                        <td className="px-4 py-2 border">{cfg.grade}</td>
                        <td className="px-4 py-2 border">{cfg.term}</td>
                        <td className="px-4 py-2 border">{cfg.exam}</td>
                        <td className="px-4 py-2 border">{cfg.year}</td>
                        <td className="px-4 py-2 border">
                          {cfg.papers
                            .map((p, i) => {
                              const label = p.name || `P${p.paperNo || i + 1}`;
                              const score = typeof p.total === "number" ? p.total : "—";
                              return `${label}: ${score}`;
                            })
                            .join(", ")}
                        </td>
                        {role === "admin" && (
                          <td className="px-4 py-2 border">
                            <button
                              onClick={() => loadConfigForEdit(cfg)}
                              className="text-blue-600 underline"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                        {role === "admin" && (
                          <td className="px-4 py-2 border text-center">
                            <button
                              onClick={() => handleDelete(cfg)}
                              className="text-red-600 hover:scale-105 transition-transform"
                              aria-label={`Delete config for ${cfg.LearningArea}`}
                            >
                              <FaTrash className="w-5 h-5 inline-block" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Create / Update Form */}
          {["create", "update"].includes(activeTab) && role === "admin" && (
            <section>
              <h3 className="text-lg font-semibold text-green-700">
                {activeTab === "create" ? "🆕 Set Paper Config" : "✏️ Update Paper Config"}
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Subject */}
                <select
                  value={form.subjectName}
                  onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((name, i) => (
                    <option key={i} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {/* Grade */}
                <select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="">Select Grade</option>
                  {grades.map((g, i) => (
                    <option key={i} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {/* Term */}
                <select
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
                {/* Exam */}
                <input
                  type="text"
                  placeholder="Exam Name"
                  value={form.exam}
                  onChange={(e) => setForm({ ...form, exam: e.target.value })}
                  className="col-span-2 p-2 border rounded"
                />
                {/* Year */}
                <select
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="">Select Year</option>
                  {years.map((y, i) => (
                    <option key={i} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              {/* Papers */}
              <h4 className="font-medium text-indigo-700 mb-2">📚 Papers</h4>
              {form.papers.map((paper, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    placeholder="Paper Name"
                    value={paper.name}
                    onChange={(e) => handlePaperChange(index, "name", e.target.value)}
                    className="p-2 border rounded w-1/2"
                  />
                  <input
                    type="number"
                    placeholder="Out Of"
                    value={paper.outOf}
                    onChange={(e) => handlePaperChange(index, "outOf", e.target.value)}
                    className="p-2 border rounded w-1/2"
                    min="0"
                  />
                  <button
                    onClick={() => removePaper(index)}
                    className="text-red-600 text-sm"
                    aria-label="Remove paper"
                  >
                    ✖
                  </button>
                </div>
              ))}
              <button onClick={addPaper} className="text-sm text-blue-600 underline mb-4">
                + Add another paper
              </button>
              <div className="flex justify-end mt-4">
                <button
                  onClick={activeTab === "create" ? handleCreate : handleUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  {activeTab === "create" ? "Submit Config" : "Update Config"}
                </button>
              </div>
            </section>
          )}
          {message && <p className="mt-4 text-sm text-indigo-600">{message}</p>}
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            ← Back to Dashboard
          </button>
        </>
      )}
    </div>
  );

  function tabStyle(tab) {
    return `px-3 py-1 rounded ${
      activeTab === tab
        ? "bg-indigo-600 text-white"
        : "bg-gray-100 text-gray-700"
    } hover:bg-indigo-500 hover:text-white transition`;
  }
}
