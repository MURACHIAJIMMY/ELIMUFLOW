import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FaTrash } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import {
  createSubject,
  bulkCreateSubjects,
  getAllSubjects,
  updateSubjectByName,
  bulkUpdateSubjects,
  deleteSubjectByName,
  validateSubjectRegistry,
  getAllPathways,
  getAllTracks,
} from "../Api";
import TopRightLogout from "../components/TopRightLogout";
import { getSchoolLogo } from "../utils/logos"; // ✅ import helper
export default function Subjects() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const schoolCode = localStorage.getItem("schoolCode");
  const [isLoading, setIsLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [registryReport, setRegistryReport] = useState(null);
  const [activeTab, setActiveTab] = useState("view");
  const [pathwayOptions, setPathwayOptions] = useState([]);
  const [trackOptions, setTrackOptions] = useState([]);
  const [selectedPathway, setSelectedPathway] = useState("");
  const [allTracks, setAllTracks] = useState([]);
  const [selectedFilterPathway, setSelectedFilterPathway] = useState("");

  // 📘 Loaded subjects
  const [subjects, setSubjects] = useState([]);

  // 🆕 Create subject
  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    group: "",
    compulsory: false,
    pathwayName: "",
    trackCode: "",
    lessonsPerWeek: 5,
    shortName: "",
  });

  // 📦 Bulk create subjects
  const [bulkSubjects, setBulkSubjects] = useState([
    {
      name: "",
      code: "",
      group: "",
      compulsory: false,
      pathwayName: "",
      trackCode: "",
      lessonsPerWeek: 5,
      shortName: "",
    },
  ]);

  // 🧠 Bulk update subjects
  const [bulkUpdates, setBulkUpdates] = useState([
    {
      name: "",
      updates: {
        group: "",
        lessonsPerWeek: 5,
        pathway: "",
        track: "",
        shortName: "",
        compulsory: false,
      },
    },
  ]);
  // ✏️ Update single subject
  const [updateForm, setUpdateForm] = useState({
    name: "",
    updates: {
      group: "",
      lessonsPerWeek: 5,
      pathway: "",
      track: "",
      shortName: "",
      compulsory: false,
    },
  });

  // 🗑️ Delete subject
  const [deleteName, setDeleteName] = useState("");

  // 💬 Feedback message
  const [message, setMessage] = useState("");

  // 📘 Load subjects and school info on mount
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);

      await loadSubjects();

      const code = localStorage.getItem("schoolCode");
      if (!code || code === "undefined") {
        console.warn("⚠️ No valid schoolCode found in localStorage");
        setMessage("School code missing. Please log in again.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/schools/${code}`
        );
        const data = await res.json();
        setSchoolInfo(data);
      } catch (err) {
        console.error("❌ Error fetching school info", err);
      }

      setIsLoading(false);
    };

    loadAll();
  }, []);
  // use effect to load group pathway and track
  useEffect(() => {
    const loadInitialOptions = async () => {
      try {
        const pathways = await getAllPathways();
        const tracks = await getAllTracks();

        setPathwayOptions(pathways.map((p) => p.name));
        setAllTracks(tracks);
      } catch {
        toast.error("Failed to load pathway/track options");
      }
    };

    loadInitialOptions();
  }, []);

  useEffect(() => {
    if (!selectedPathway || allTracks.length === 0) return;

    const normalizedPathway = selectedPathway.trim().toLowerCase();

    const filteredTracks = allTracks.filter(
      (t) => t.pathwayName?.trim().toLowerCase() === normalizedPathway
    );

    setTrackOptions(
      filteredTracks.map((t) => ({
        label: `${t.trackName} (${t.trackCode})`,
        value: t.trackCode,
      }))
    );
  }, [selectedPathway, allTracks]);


const loadSubjects = async () => {
  try {
    const data = await getAllSubjects();
    setSubjects(data);
  } catch {
    toast.error("Failed to load Learning Areas.");
  }
};




const exportSubjectsPdf = async () => {
  const filteredSubjects = selectedFilterPathway
    ? subjects.filter(
        (s) =>
          s.pathway?.trim().toLowerCase() ===
          selectedFilterPathway.trim().toLowerCase()
      )
    : subjects;

  if (filteredSubjects.length === 0) {
    toast.error("No Learning Area data to export.");
    return;
  }

  if (!schoolInfo?.name) {
    toast.error("School info not loaded yet.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(12);

  // 🖼️ Logo
  const logoUrl = getSchoolLogo(schoolInfo);
  if (logoUrl) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = logoUrl;

    await new Promise((resolve) => {
      img.onload = () => {
        const format = img.src.includes(".png") ? "PNG" : "JPEG";
        doc.addImage(img, format, 14, 10, 20, 20);
        resolve();
      };
      img.onerror = () => {
        console.warn("⚠️ Logo image failed to load from:", img.src);
        resolve();
      };
    });
  }

  // 🏫 School details
  doc.setFontSize(14);
  doc.text(schoolInfo.name, 40, 15);

  doc.setFontSize(11);
  if (schoolInfo.motto) doc.text(`"${schoolInfo.motto}"`, 40, 21);

  doc.setFontSize(10);
  doc.text(schoolInfo.location || "—", 40, 27);
  doc.text(
    `Contact: ${schoolInfo.contact || "—"} | Email: ${
      schoolInfo.email || "—"
    }`,
    40,
    32
  );

  // 📘 Title
  doc.setFontSize(12);
  doc.text("Learning Areas Registry", 14, 45);

  // 🧾 Table
  const headers = [
    [
      "#",
      "Learning Area",
      "Code",
      "Group",
      "Compulsory",
      "Lessons/Week",
      "Pathway",
      "Track",
    ],
  ];
  const data = filteredSubjects.map((s, i) => [
    i + 1,
    s.LearningArea,
    s.code,
    s.group,
    s.compulsory ? "Yes" : "No",
    s.lessonsPerWeek,
    s.pathway || "—",
    s.track ? `${s.track.name} (${s.track.code})` : "—",
  ]);

  autoTable(doc, {
    startY: 50,
    head: headers,
    body: data,
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: 20,
      fontSize: 10,
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
  });

  doc.save("subjects.pdf");
};


  const handleCreate = async (payload) => {
  try {
    const res = await createSubject(payload);
    toast.success(res.message || "Subject created");
    loadSubjects();
    setNewSubject({
      name: "",
      code: "",
      group: "",
      shortName: "",
      lessonsPerWeek: 5,
      pathwayName: "",
      trackCode: "",
      compulsory: false,
    });
  } catch (err) {
    toast.error(err.response?.data?.error || "Create failed.");
  }
};


  const handleValidateRegistry = async () => {
    try {
      const res = await validateSubjectRegistry();
      setRegistryReport(res);
      toast.success("Registry validation complete.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Validation failed.");
    }
  };

  const handleBulkCreate = async () => {
    try {
      const payload = bulkSubjects
        .filter(
          (s) =>
            s.name &&
            s.code &&
            s.group &&
            s.pathwayName &&
            s.trackCode &&
            typeof s.lessonsPerWeek === "number"
        )
        .map((s) => ({
          ...s,
          code: s.code.trim().toUpperCase(),
          pathwayName: s.pathwayName.trim(),
          trackCode: s.trackCode.trim().toUpperCase(),
          shortName: s.shortName?.trim() || s.name.slice(0, 3),
        }));

      if (payload.length === 0) {
        toast.error("No valid subject data to submit.");
        return;
      }

      console.log("📦 Final payload:", payload);

      const res = await bulkCreateSubjects(payload);

      toast.success(
        `${res.message} ${
          res.skipped?.length
            ? `(${res.skipped.length} skipped: ${res.skipped
                .map((s) => s.name)
                .join(", ")})`
            : ""
        }`
      );

      loadSubjects();
      setBulkSubjects([
        {
          name: "",
          code: "",
          group: "",
          compulsory: false,
          pathwayName: "",
          trackCode: "",
          lessonsPerWeek: 5,
          shortName: "",
        },
      ]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Bulk create failed.");
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...updateForm.updates,
        track: updateForm.updates.track?.trim().toUpperCase(),
        pathway: updateForm.updates.pathway?.trim(),
        shortName:
          updateForm.updates.shortName?.trim() || updateForm.name.slice(0, 3),
        newName: updateForm.updates.newName?.trim(),
      };

      const res = await updateSubjectByName(updateForm.name.trim(), payload);
      toast.success(res.message || "Learning Area Update successful");
      loadSubjects();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed.");
    }
  };

  const handleBulkUpdate = async () => {
    try {
      const normalized = bulkUpdates.map((row) => ({
        name: row.name.trim(),
        updates: {
          ...row.updates,
          track: row.updates.track?.trim().toUpperCase(),
          pathway: row.updates.pathway?.trim(),
          shortName: row.updates.shortName?.trim() || row.name.slice(0, 3),
        },
      }));

      const res = await bulkUpdateSubjects(normalized);
      toast.success(res.message || "Bulk update successful");
      loadSubjects();
    } catch (err) {
      toast.error(err.response?.data?.error || "Bulk update failed.");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await deleteSubjectByName(deleteName);
      toast.success(res.message || "Learning Area deleted");
      loadSubjects();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed.");
    }
  };

  if (!["admin", "teacher"].includes(role)) {
    return (
      <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>
    );
  }

  if (!schoolCode || schoolCode === "undefined") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        🔒 School code missing.
      </div>
    );
  }

  return (
    <>
      <TopRightLogout />

      <div className="p-6 max-w-5xl mx-auto space-y-6 min-h-screen bg-white">
        <h2 className="text-2xl font-bold text-indigo-700">
          📚 Learning Areas (Subjects)
        </h2>

        {/* 🔘 Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("view")}
            className={tabStyle("view")}
          >
            📘 View
          </button>
          {role === "admin" && (
            <>
              <button
                onClick={() => setActiveTab("create")}
                className={tabStyle("create")}
              >
                🆕 Create
              </button>
              <button
                onClick={() => setActiveTab("bulk")}
                className={tabStyle("bulk")}
              >
                📦 Bulk
              </button>
              <button
                onClick={() => setActiveTab("update")}
                className={tabStyle("update")}
              >
                ✏️ Update
              </button>
              <button
                onClick={() => setActiveTab("delete")}
                className={tabStyle("delete")}
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => setActiveTab("validate")}
                className={tabStyle("validate")}
              >
                🧾 Validate
              </button>
            </>
          )}
        </div>
       {/* 📘 View Subjects */}
{activeTab === "view" && (
  <section>
    <h3 className="text-lg font-semibold text-indigo-700">
      📘 All Subjects
    </h3>

    {/* Filter by pathway */}
    <div className="mb-4 flex items-center gap-2">
      <label className="text-sm font-medium text-indigo-700">
        Filter by Pathway:
      </label>
      <select
        value={selectedFilterPathway}
        onChange={(e) => setSelectedFilterPathway(e.target.value)}
        className="p-2 border rounded text-sm"
      >
        <option value="">All Pathways</option>
        {pathwayOptions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>

    {isLoading ? (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-600"></div>
      </div>
    ) : (
      <>
        {/* Declare filteredSubjects inline */}
        {(() => {
          const filteredSubjects = selectedFilterPathway
            ? subjects.filter(
                (s) =>
                  s.pathway?.trim().toLowerCase() ===
                  selectedFilterPathway.trim().toLowerCase()
              )
            : subjects;

          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border text-sm print:text-xs">
                  <thead className="bg-indigo-100">
                    <tr>
                      <th className="border px-2 py-1">#</th>
                      <th className="border px-2 py-1">Name</th>
                      <th className="border px-2 py-1">Code</th>
                      <th className="border px-2 py-1">Group</th>
                      <th className="border px-2 py-1">Compulsory</th>
                      <th className="border px-2 py-1">Lessons/Week</th>
                      <th className="border px-2 py-1">Pathway</th>
                      <th className="border px-2 py-1">Track</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((s, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1">{i + 1}</td>
                        <td className="border px-2 py-1">{s.LearningArea}</td>
                        <td className="border px-2 py-1">{s.code}</td>
                        <td className="border px-2 py-1">{s.group}</td>
                        <td className="border px-2 py-1">
                          {s.compulsory ? "✅" : "❌"}
                        </td>
                        <td className="border px-2 py-1">{s.lessonsPerWeek}</td>
                        <td className="border px-2 py-1">{s.pathway || "—"}</td>
                        <td className="border px-2 py-1">
                          {s.track
                            ? `${s.track.name} (${s.track.code})`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={exportSubjectsPdf}
                className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
              >
                🖨️ Export as PDF
              </button>
            </>
          );
        })()}
      </>
    )}
  </section>
)}


        {/* 🆕 Create Subject */}
        {activeTab === "create" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-green-700">
              ➕ Create Subject
            </h3>

            {/* Text inputs */}
            {["name", "code", "shortName"].map((field) => (
              <input
                key={field}
                placeholder={field}
                value={newSubject[field]}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, [field]: e.target.value })
                }
                className="w-full p-2 border rounded mb-2"
              />
            ))}

            {/* Group selector */}
            <select
              value={newSubject.group}
              onChange={(e) =>
                setNewSubject({ ...newSubject, group: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Group</option>
              {["Compulsory", "STEM", "SOCIAL", "ARTS", "OTHER"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Pathway selector */}
            <select
              value={selectedPathway}
              onChange={(e) => {
                setSelectedPathway(e.target.value);
                setNewSubject({ ...newSubject, pathwayName: e.target.value });
              }}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Pathway</option>
              {pathwayOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Track selector */}
            <select
              value={newSubject.trackCode}
              onChange={(e) =>
                setNewSubject({ ...newSubject, trackCode: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Track</option>
              {trackOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Lessons per week */}
            <input
              type="number"
              placeholder="Lessons per week"
              value={newSubject.lessonsPerWeek}
              onChange={(e) =>
                setNewSubject({
                  ...newSubject,
                  lessonsPerWeek: parseInt(e.target.value),
                })
              }
              className="w-full p-2 border rounded mb-2"
            />

            {/* Compulsory checkbox */}
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={newSubject.compulsory}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, compulsory: e.target.checked })
                }
              />
              Compulsory
            </label>

            {/* Submit button */}
            <button
              onClick={() => {
                const payload = {
                  ...newSubject,
                  code: newSubject.code.trim().toUpperCase(),
                  shortName:
                    newSubject.shortName?.trim() ||
                    newSubject.name?.slice(0, 3),
                  pathwayName: newSubject.pathwayName?.trim(),
                  trackCode: newSubject.trackCode?.trim().toUpperCase(),
                };

                const isValid =
                  payload.name &&
                  payload.code &&
                  payload.group &&
                  payload.pathwayName &&
                  payload.trackCode &&
                  typeof payload.lessonsPerWeek === "number";

                if (!isValid) {
                  toast.error("Please fill all required fields.");
                  return;
                }

                handleCreate(payload);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Subject
            </button>
          </section>
        )}

        {/* 🧾 Validate Subject Registry */}
        {activeTab === "validate" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-blue-700">
              🧾 Validate Subject Registry
            </h3>

            <button
              onClick={handleValidateRegistry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
            >
              Run Validation
            </button>

            {registryReport && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm">
                <h4 className="font-semibold mb-2">Validation Summary:</h4>
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(registryReport, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* 📦 Bulk Create Subjects */}
        {activeTab === "bulk" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-purple-700">
              📦 Bulk Create Subjects
            </h3>

            <table className="w-full border text-sm mb-4">
              <thead className="bg-purple-100">
                <tr>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Code</th>
                  <th className="border px-2 py-1">Group</th>
                  <th className="border px-2 py-1">ShortName</th>
                  <th className="border px-2 py-1">Lessons/Week</th>
                  <th className="border px-2 py-1">Pathway</th>
                  <th className="border px-2 py-1">Track</th>
                  <th className="border px-2 py-1">Compulsory</th>
                  <th className="border px-2 py-1">Remove</th>
                </tr>
              </thead>
              <tbody>
                {bulkSubjects.map((s, i) => (
                  <tr key={i}>
                    {/* Name */}
                    <td className="border px-2 py-1">
                      <input
                        value={s.name}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, name: e.target.value } : row
                            )
                          )
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>

                    {/* Code */}
                    <td className="border px-2 py-1">
                      <input
                        value={s.code}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, code: e.target.value } : row
                            )
                          )
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>

                    {/* Group */}
                    <td className="border px-2 py-1">
                      <select
                        value={s.group}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? { ...row, group: e.target.value }
                                : row
                            )
                          )
                        }
                        className="w-full p-1 border rounded"
                      >
                        <option value="">Select Group</option>
                        {["Compulsory", "STEM", "SOCIAL", "ARTS", "OTHER"].map(
                          (g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    {/* ShortName */}
                    <td className="border px-2 py-1">
                      <input
                        value={s.shortName}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? { ...row, shortName: e.target.value }
                                : row
                            )
                          )
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>

                    {/* Lessons/Week */}
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        value={s.lessonsPerWeek}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? {
                                    ...row,
                                    lessonsPerWeek: parseInt(e.target.value),
                                  }
                                : row
                            )
                          )
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>

                    {/* Pathway */}
                    <td className="border px-2 py-1">
                      <select
                        value={s.pathwayName}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? { ...row, pathwayName: e.target.value }
                                : row
                            )
                          )
                        }
                        className={`w-full p-1 border rounded ${
                          !s.pathwayName ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Select Pathway</option>
                        {pathwayOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Track */}
                    <td className="border px-2 py-1">
                      <select
                        value={s.trackCode}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? { ...row, trackCode: e.target.value }
                                : row
                            )
                          )
                        }
                        className={`w-full p-1 border rounded ${
                          !s.trackCode ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Select Track</option>
                        {allTracks
                          .filter(
                            (t) =>
                              t.pathwayName?.trim().toLowerCase() ===
                              s.pathwayName?.trim().toLowerCase()
                          )
                          .map((t) => (
                            <option key={t.trackId} value={t.trackCode}>
                              {t.trackName} ({t.trackCode})
                            </option>
                          ))}
                      </select>
                    </td>

                    {/* Compulsory */}
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={s.compulsory}
                        onChange={(e) =>
                          setBulkSubjects((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? { ...row, compulsory: e.target.checked }
                                : row
                            )
                          )
                        }
                      />
                    </td>

                    {/* Remove */}
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() =>
                          setBulkSubjects((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-red-600 hover:text-red-800"
                        title="Remove row"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col items-start gap-2">
              <button
                onClick={() =>
                  setBulkSubjects([
                    ...bulkSubjects,
                    {
                      name: "",
                      code: "",
                      group: "",
                      compulsory: false,
                      pathwayName: "",
                      trackCode: "",
                      lessonsPerWeek: 5,
                      shortName: "",
                    },
                  ])
                }
                className="text-sm text-purple-700 underline"
              >
                + Add another row
              </button>
              <button
                onClick={handleBulkCreate}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Submit Bulk Create
              </button>
            </div>
          </section>
        )}

        {/* ✏️ Update Subject */}
        {activeTab === "update" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-yellow-700">
              ✏️ Update Subject
            </h3>

            {/* Subject name to update */}
            <input
              placeholder="Subject Name to Update"
              value={updateForm.name}
              onChange={(e) =>
                setUpdateForm({ ...updateForm, name: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
            />

            {/* New Name (optional) */}
            <input
              placeholder="New Name (optional)"
              value={updateForm.updates.newName || ""}
              onChange={(e) =>
                setUpdateForm({
                  ...updateForm,
                  updates: { ...updateForm.updates, newName: e.target.value },
                })
              }
              className="w-full p-2 border rounded mb-2"
            />

            {/* Group selector */}
            <select
              value={updateForm.updates.group}
              onChange={(e) =>
                setUpdateForm({
                  ...updateForm,
                  updates: { ...updateForm.updates, group: e.target.value },
                })
              }
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Group</option>
              {["Compulsory", "STEM", "SOCIAL", "ARTS", "OTHER"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Pathway selector */}
            <select
              value={updateForm.updates.pathway}
              onChange={(e) => {
                const selected = e.target.value;
                setSelectedPathway(selected);
                setUpdateForm({
                  ...updateForm,
                  updates: { ...updateForm.updates, pathway: selected },
                });
              }}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Pathway</option>
              {pathwayOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Track selector */}
            <select
              value={updateForm.updates.track}
              onChange={(e) =>
                setUpdateForm({
                  ...updateForm,
                  updates: { ...updateForm.updates, track: e.target.value },
                })
              }
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Track</option>
              {trackOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Lessons per week */}
            <input
              type="number"
              placeholder="Lessons per week"
              value={updateForm.updates.lessonsPerWeek}
              onChange={(e) =>
                setUpdateForm({
                  ...updateForm,
                  updates: {
                    ...updateForm.updates,
                    lessonsPerWeek: parseInt(e.target.value),
                  },
                })
              }
              className="w-full p-2 border rounded mb-2"
            />

            {/* ShortName */}
            <input
              placeholder="New shortName"
              value={updateForm.updates.shortName || ""}
              onChange={(e) =>
                setUpdateForm({
                  ...updateForm,
                  updates: { ...updateForm.updates, shortName: e.target.value },
                })
              }
              className="w-full p-2 border rounded mb-2"
            />

            {/* Compulsory checkbox */}
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={updateForm.updates.compulsory || false}
                onChange={(e) =>
                  setUpdateForm({
                    ...updateForm,
                    updates: {
                      ...updateForm.updates,
                      compulsory: e.target.checked,
                    },
                  })
                }
              />
              Compulsory
            </label>

            <button
              onClick={handleUpdate}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Submit Update
            </button>
          </section>
        )}

        {/* 🧠 Bulk Update Subjects */}
        {activeTab === "bulk" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-yellow-700">
              🧠 Bulk Update Subjects
            </h3>

            <table className="w-full border text-sm mb-4">
              <thead className="bg-yellow-100">
                <tr>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">New Name</th>
                  <th className="border px-2 py-1">Group</th>
                  <th className="border px-2 py-1">Lessons/Week</th>
                  <th className="border px-2 py-1">Pathway</th>
                  <th className="border px-2 py-1">Track</th>
                  <th className="border px-2 py-1">ShortName</th>
                  <th className="border px-2 py-1">Compulsory</th>
                  <th className="border px-2 py-1">Remove</th>
                </tr>
              </thead>
              <tbody>
                {bulkUpdates.map((row, i) => {
                  const normalizedPathway = row.updates.pathway
                    ?.trim()
                    .toLowerCase();
                  const filteredTracks = allTracks.filter(
                    (t) =>
                      t.pathwayName?.trim().toLowerCase() === normalizedPathway
                  );

                  return (
                    <tr key={i}>
                      {/* Name */}
                      <td className="border px-2 py-1">
                        <input
                          value={row.name}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i ? { ...r, name: e.target.value } : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        />
                      </td>

                      {/* New Name */}
                      <td className="border px-2 py-1">
                        <input
                          value={row.updates.newName || ""}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        newName: e.target.value,
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        />
                      </td>

                      {/* Group */}
                      <td className="border px-2 py-1">
                        <select
                          value={row.updates.group}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        group: e.target.value,
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        >
                          <option value="">Select Group</option>
                          {[
                            "Compulsory",
                            "STEM",
                            "SOCIAL",
                            "ARTS",
                            "OTHER",
                          ].map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Lessons/Week */}
                      <td className="border px-2 py-1">
                        <input
                          type="number"
                          value={row.updates.lessonsPerWeek}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        lessonsPerWeek: parseInt(
                                          e.target.value
                                        ),
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        />
                      </td>

                      {/* Pathway */}
                      <td className="border px-2 py-1">
                        <select
                          value={row.updates.pathway}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        pathway: e.target.value,
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        >
                          <option value="">Select Pathway</option>
                          {pathwayOptions.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Track */}
                      <td className="border px-2 py-1">
                        <select
                          value={row.updates.track}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        track: e.target.value,
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        >
                          <option value="">Select Track</option>
                          {filteredTracks.map((t) => (
                            <option key={t.trackId} value={t.trackCode}>
                              {t.trackName} ({t.trackCode})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* ShortName */}
                      <td className="border px-2 py-1">
                        <input
                          value={row.updates.shortName || ""}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        shortName: e.target.value,
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                          className="w-full p-1 border rounded"
                        />
                      </td>

                      {/* Compulsory */}
                      <td className="border px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={row.updates.compulsory || false}
                          onChange={(e) =>
                            setBulkUpdates((prev) =>
                              prev.map((r, idx) =>
                                idx === i
                                  ? {
                                      ...r,
                                      updates: {
                                        ...r.updates,
                                        compulsory: e.target.checked,
                                      },
                                    }
                                  : r
                              )
                            )
                          }
                        />
                      </td>

                      {/* Remove */}
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={() =>
                            setBulkUpdates((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="text-red-600 hover:text-red-800"
                          title="Remove row"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex flex-col items-start gap-2">
              <button
                onClick={() =>
                  setBulkUpdates([
                    ...bulkUpdates,
                    {
                      name: "",
                      updates: {
                        newName: "",
                        group: "",
                        lessonsPerWeek: 5,
                        pathway: "",
                        track: "",
                        shortName: "",
                        compulsory: false,
                      },
                    },
                  ])
                }
                className="text-sm text-yellow-700 underline"
              >
                + Add another row
              </button>
              <button
                onClick={handleBulkUpdate}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Submit Bulk Update
              </button>
            </div>
          </section>
        )}

        {/* 🗑️ Delete Subject */}
        {activeTab === "delete" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-red-700">
              🗑️ Delete Subject
            </h3>

            <input
              placeholder="Subject Name to Delete"
              value={deleteName}
              onChange={(e) => setDeleteName(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            />

            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete Subject
            </button>
          </section>
        )}
        {/* message*/}
        {message && <p className="mt-4 text-sm text-indigo-600">{message}</p>}

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          ← Back to Dashboard
        </button>
      </div>
    </>
  );

  function tabStyle(tab) {
    return `px-3 py-1 rounded ${
      activeTab === tab
        ? "bg-indigo-600 text-white"
        : "bg-gray-100 text-gray-700"
    } hover:bg-indigo-500 hover:text-white transition`;
  }
}
