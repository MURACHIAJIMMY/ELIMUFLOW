import { useState } from "react";
import { toast } from 'sonner';
import {
  getSelectedSubjectsByAdmNo,
  getStudentElectivesForPathway,
  selectSubjectsByAdmNo,
  updateSelectedSubjectsByAdmNo,
  deleteSelectedSubjectsByAdmNo,
  validateAllSubjectSelections
} from "../Api";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";

export default function SubjectSelection() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const [activeTab, setActiveTab] = useState("view");
  const [admNo, setAdmNo] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [electiveOptions, setElectiveOptions] = useState([]);
  const [selectedElectives, setSelectedElectives] = useState([]);
  const [languagePreference, setLanguagePreference] = useState("KISW");
  const [mathChoice, setMathChoice] = useState("essential");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cbcSummary, setCbcSummary] = useState(null);
  const [validationReport, setValidationReport] = useState([]);

  // Fetch student info and electives for their pathway
  async function fetchStudentDetails() {
    setIsLoading(true);
    try {
      const summary = await getSelectedSubjectsByAdmNo(admNo.trim());
      setCbcSummary(summary);
      const { student, electives } = await getStudentElectivesForPathway(admNo.trim());
      setStudentInfo(student);
      setElectiveOptions(electives);
      setMessage("");
      setSelectedElectives([]); // Reset selection
    } catch (err) {
      toast.error(err.response?.data?.error || "Error fetching student details");
      setStudentInfo(null);
      setElectiveOptions([]);
      setCbcSummary(null);
    }
    setIsLoading(false);
  }

  function handleElectiveCheck(name) {
    if (selectedElectives.includes(name)) {
      setSelectedElectives(selectedElectives.filter(e => e !== name));
    } else if (selectedElectives.length < 3) {
      setSelectedElectives([...selectedElectives, name]);
    }
  }

  async function handleSubmitSelection() {
    if (selectedElectives.length !== 3) {
      setMessage("Pick exactly 3 electives.");
      return;
    }
    setIsLoading(true);
    try {
      await selectSubjectsByAdmNo(admNo.trim(), {
        electiveNames: selectedElectives,
        languagePreference,
        mathChoice
      });
      toast.success("Selection saved!");
      fetchStudentDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error submitting selection");
    }
    setIsLoading(false);
  }

  async function handleUpdateSelection() {
    if (selectedElectives.length !== 3) {
      setMessage("Pick exactly 3 electives for update.");
      return;
    }
    setIsLoading(true);
    try {
      await updateSelectedSubjectsByAdmNo(admNo.trim(), {
        subjectNames: selectedElectives,
        languagePreference,
        mathChoice
      });
      toast.success("Selection updated!");
      fetchStudentDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error updating selection");
    }
    setIsLoading(false);
  }

  async function handleDeleteElectives() {
    setIsLoading(true);
    try {
      await deleteSelectedSubjectsByAdmNo(admNo.trim());
      toast.success("Elective subjects deleted!");
      fetchStudentDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error deleting electives");
    }
    setIsLoading(false);
  }

  async function handleCBCValidation() {
    setIsLoading(true);
    try {
      const res = await validateAllSubjectSelections();
      setValidationReport(res.report || []);
      toast.success(res.message || "Validation complete.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error validating CBC selections.");
      setValidationReport([]);
    }
    setIsLoading(false);
  }

  function tabStyle(tab) {
    return `px-3 py-1 rounded ${
      activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
    } hover:bg-indigo-500 hover:text-white transition`;
  }

  if (!["admin", "teacher"].includes(role)) {
    return <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 bg-white">
      {/* 🔐 Top-right logout */}
      <div className="flex justify-end mb-2">
        <TopRightLogout />
      </div>
      <h2 className="text-2xl font-bold text-indigo-700">CBE L.Area Selection</h2>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("view")} className={tabStyle("view")}>📋 View</button>
        <button onClick={() => setActiveTab("select")} className={tabStyle("select")}>🔘 Select</button>
        <button onClick={() => setActiveTab("update")} className={tabStyle("update")}>✏️ Update</button>
        {/* <button onClick={() => setActiveTab("delete")} className={tabStyle("delete")}>🗑️ Delete</button>
        <button onClick={() => setActiveTab("validate")} className={tabStyle("validate")}>📊 Validate</button> */}
      </div>
      {/* Tab content */}
      {message && <div className="text-sm text-red-600 mb-2">{message}</div>}
      {isLoading && <Spinner />}

{/* View tab */}
{activeTab === "view" && (
  <div>
    <input
      type="text"
      value={admNo}
      onChange={e => setAdmNo(e.target.value)}
      placeholder="Enter Admission Number"
      className="p-2 border rounded w-full mb-2"
    />
    <button
      onClick={fetchStudentDetails}
      className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 w-full mb-2"
    >
      Fetch CBC Summary
    </button>

    {studentInfo && (
      <div className="mb-4 p-3 bg-indigo-50 rounded border">
        <div><strong>Name:</strong> {studentInfo.name}</div>
        <div><strong>Adm No:</strong> {studentInfo.admNo}</div>
        <div><strong>Pathway:</strong> {studentInfo.pathway}</div>
      </div>
    )}

    {cbcSummary?.subjects?.length > 0 && (
      <div className="mb-4">
        <strong>Current Learning Areas:</strong>
        <table className="w-full border border-gray-300 rounded-md mt-2 divide-y divide-gray-300">
          <thead className="bg-gray-100 divide-x divide-gray-300">
            <tr>
              <th className="px-4 py-2 text-left">Learning Area</th>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cbcSummary.subjects.map((sub, i) => (
              <tr key={i} className="divide-x divide-gray-200">
                <td className="px-4 py-2">{sub.name}</td>
                <td className="px-4 py-2">{sub.code}</td>
                <td className="px-4 py-2">{sub.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

      {/* Select tab */}
      {activeTab === "select" && (
        <div>
          <input
            type="text"
            value={admNo}
            onChange={e => setAdmNo(e.target.value)}
            placeholder="Enter Admission Number"
            className="p-2 border rounded w-full mb-2"
          />
          <button
            onClick={fetchStudentDetails}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full mb-2"
          >Fetch L.Areas Options</button>
          {studentInfo && (
            <div className="mb-4 p-3 bg-green-50 rounded border">
              <div><strong>Name:</strong> {studentInfo.name}</div>
              <div><strong>Adm No:</strong> {studentInfo.admNo}</div>
              <div><strong>Pathway:</strong> {studentInfo.pathway}</div>
            </div>
          )}
          {electiveOptions.length > 0 && (
            <div className="mb-4">
              <strong>Select 3 Electives for {studentInfo?.pathway} Pathway:</strong>
              <table className="w-full border text-sm my-2">
                <thead className="bg-green-100">
                  <tr>
                    <th className="border px-2 py-1">Select</th>
                    <th className="border px-2 py-1">Learning Area</th>
                    <th className="border px-2 py-1">Code</th>
                    <th className="border px-2 py-1">Group</th>
                    <th className="border px-2 py-1">Lessons/Week</th>
                  </tr>
                </thead>
                <tbody>
                  {electiveOptions.map(opt =>
                    <tr key={opt.code}>
                      <td className="border px-2 py-1">
                        <input
                          type="checkbox"
                          value={opt.name}
                          checked={selectedElectives.includes(opt.name)}
                          disabled={!selectedElectives.includes(opt.name) && selectedElectives.length >= 3}
                          onChange={() => handleElectiveCheck(opt.name)}
                        />
                      </td>
                      <td className="border px-2 py-1">{opt.name}</td>
                      <td className="border px-2 py-1">{opt.code}</td>
                      <td className="border px-2 py-1">{opt.group}</td>
                      <td className="border px-2 py-1">{opt.lessonsPerWeek}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <label>
                Language:
                <select
                  value={languagePreference}
                  onChange={e => setLanguagePreference(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="KISW">Kiswahili</option>
                  <option value="KSL">Kenyan Sign Language</option>
                </select>
              </label>
              <label>
                Mathematics:
                <select
                  value={mathChoice}
                  onChange={e => setMathChoice(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="core">Core Mathematics</option>
                  <option value="essential">Essential Mathematics</option>
                </select>
              </label>
              <button
                onClick={handleSubmitSelection}
                className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
              >Submit CBC Selection</button>
            </div>
          )}
        </div>
      )}

      {/* Update tab */}
      {activeTab === "update" && (
        <div>
          <input
            type="text"
            value={admNo}
            onChange={e => setAdmNo(e.target.value)}
            placeholder="Enter Admission Number"
            className="p-2 border rounded w-full mb-2"
          />
          <button
            onClick={fetchStudentDetails}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 w-full mb-2"
          >Fetch L.Area Options</button>
          {studentInfo && (
            <div className="mb-4 p-3 bg-yellow-50 rounded border">
              <div><strong>Name:</strong> {studentInfo.name}</div>
              <div><strong>Adm No:</strong> {studentInfo.admNo}</div>
              <div><strong>Pathway:</strong> {studentInfo.pathway}</div>
            </div>
          )}
          {electiveOptions.length > 0 && (
            <div className="mb-4">
              <strong>Update Electives for {studentInfo?.pathway} Pathway:</strong>
              <table className="w-full border text-sm my-2">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="border px-2 py-1">Select</th>
                    <th className="border px-2 py-1">Learning Areas</th>
                    <th className="border px-2 py-1">Code</th>
                    <th className="border px-2 py-1">Group</th>
                    <th className="border px-2 py-1">Lessons/Week</th>
                  </tr>
                </thead>
                <tbody>
                  {electiveOptions.map(opt =>
                    <tr key={opt.code}>
                      <td className="border px-2 py-1">
                        <input
                          type="checkbox"
                          value={opt.name}
                          checked={selectedElectives.includes(opt.name)}
                          disabled={!selectedElectives.includes(opt.name) && selectedElectives.length >= 3}
                          onChange={() => handleElectiveCheck(opt.name)}
                        />
                      </td>
                      <td className="border px-2 py-1">{opt.name}</td>
                      <td className="border px-2 py-1">{opt.code}</td>
                      <td className="border px-2 py-1">{opt.group}</td>
                      <td className="border px-2 py-1">{opt.lessonsPerWeek}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <label>
                Language:
                <select
                  value={languagePreference}
                  onChange={e => setLanguagePreference(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="KISW">Kiswahili</option>
                  <option value="KSL">Kenyan Sign Language</option>
                </select>
              </label>
              <label>
                Mathematics:
                <select
                  value={mathChoice}
                  onChange={e => setMathChoice(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="core">Core Mathematics</option>
                  <option value="essential">Essential Mathematics</option>
                </select>
              </label>
              <button
                onClick={handleUpdateSelection}
                className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 w-full"
              >Update Selection</button>
            </div>
          )}
        </div>
      )}

      {/* Delete tab */}
      {activeTab === "delete" && (
        <div>
          <input
            type="text"
            value={admNo}
            onChange={e => setAdmNo(e.target.value)}
            placeholder="Enter Admission Number"
            className="p-2 border rounded w-full mb-2"
          />
          <button
            onClick={fetchStudentDetails}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full mb-2"
          >Fetch CBC</button>
          <button
            onClick={handleDeleteElectives}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full mt-2"
          >Delete Electives</button>
        </div>
      )}

      {/* Validate tab */}
      {activeTab === "validate" && (
        <div>
          <button
            onClick={handleCBCValidation}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 w-full mb-2"
          >Validate CBC Selections</button>
          {validationReport.length > 0 && (
            <table className="w-full border text-sm mt-4">
              <thead className="bg-blue-100">
                <tr>
                  <th className="border px-2 py-1">Adm No</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">Issues</th>
                </tr>
              </thead>
              <tbody>
                {validationReport.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{item.admNo}</td>
                    <td className="border px-2 py-1">{item.compliant ? "✔️ Compliant" : "❌ Not compliant"}</td>
                    <td className="border px-2 py-1">{item.issues.length > 0 ? item.issues.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Back to dashboard */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
