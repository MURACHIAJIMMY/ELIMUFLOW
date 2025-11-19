import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FaTrash } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import {
  getAllPathways,
  getAllTracks,
  createTrack,
  bulkCreateTracks,
  updateTrackByCode,
  deleteTrackByCode,
} from "../Api";
import TopRightLogout from "../components/TopRightLogout"; // ✅ Import logout button
import { getSchoolLogo } from "../utils/logos"; // ✅ import helper
export default function Track() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const [activeTab, setActiveTab] = useState("view");
  const [pathways, setPathways] = useState([]);
  const [selectedPathway, setSelectedPathway] = useState("");
  const [tracks, setTracks] = useState([]);
  const [newTrack, setNewTrack] = useState({
    name: "",
    code: "",
    description: "",
    pathwayName: "",
  });
  const [bulkTracks, setBulkTracks] = useState([
    { name: "", code: "", description: "", pathwayName: "" },
  ]);
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [message] = useState("");
  const [schoolInfo, setSchoolInfo] = useState(null);

  const loadTracks = useCallback(async () => {
    try {
      const data = await getAllTracks();
      const filtered = data.filter(
        (t) =>
          t.pathwayName?.trim().toLowerCase() ===
          selectedPathway.trim().toLowerCase()
      );
      setTracks(filtered);
    } catch {
      toast.error("Failed to load tracks");
    }
  }, [selectedPathway]); // ✅ stable dependency

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      const code = localStorage.getItem("schoolCode");
      if (!code || code === "undefined") {
        console.warn("⚠️ No valid schoolCode found in localStorage");
        toast.error("School code missing. Please log in again.");
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
    };

    fetchSchoolInfo();
  }, []);

  useEffect(() => {
    loadPathways();
  }, []);

  useEffect(() => {
    if (selectedPathway) loadTracks();
  }, [selectedPathway, loadTracks]); // ✅ no ReferenceError

  const loadPathways = async () => {
    try {
      const data = await getAllPathways();
      setPathways(data);
    } catch {
      toast.error("Failed to load pathways");
    }
  };


const exportTracksPdf = async () => {
  if (tracks.length === 0) {
    toast.error("No track data to export.");
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
  doc.text(`Tracks under: ${selectedPathway}`, 14, 45);

  // 🧾 Table
  const headers = [["Name", "Code", "Description"]];
  const data = tracks.map((t) => [
    t.trackName,
    t.trackCode,
    t.description || "—",
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

  doc.save(`tracks_${selectedPathway}.pdf`);
};

  const handleCreateTrack = async () => {
    try {
      const res = await createTrack(newTrack);
      toast.success(res.message || "Tracks created seccessfully");
      loadTracks();
      setNewTrack({ name: "", code: "", description: "", pathwayName: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Create failed");
    }
  };

  const handleBulkCreateTracks = async () => {
    try {
      const payload = bulkTracks.filter(
        (t) => t.name && t.code && t.pathwayName
      );
      const res = await bulkCreateTracks(payload);
      toast.success(res.message || "Tracks created seccessfully");
      loadTracks();
      setBulkTracks([{ name: "", code: "", description: "", pathwayName: "" }]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Bulk creation failed");
    }
  };

  const handleUpdateTrack = async () => {
    try {
      const res = await updateTrackByCode(editCode, {
        description: editDescription,
      });
      toast.success(res.message || "Track Updated successfully");
      loadTracks();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
  };

  const handleDeleteTrack = async () => {
    try {
      const res = await deleteTrackByCode(deleteCode);
      toast.success(res.message || "Deleted successfully");
      loadTracks();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };
  const updateBulk = (i, field, value) => {
    setBulkTracks((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  };
  if (!["admin", "teacher"].includes(role)) {
    return (
      <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>
    );
  }
  const schoolCode = localStorage.getItem("schoolCode");
  if (!schoolCode || schoolCode === "undefined") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        🔒 School code missing. Please verify first.
      </div>
    );
  }
  return (
    <>
      <TopRightLogout /> {/* ✅ Floats top-right of screen */}
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-indigo-700">
          🎯 Track Management
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
            </>
          )}
        </div>

        {/* 📘 View Tracks */}
        {activeTab === "view" && (
          <section>
            <h3 className="text-lg font-semibold text-indigo-700">
              📘 Tracks under: {selectedPathway}
            </h3>
            <select
              value={selectedPathway}
              onChange={(e) => setSelectedPathway(e.target.value)}
              className="mb-2 p-2 border rounded"
            >
              <option value="">Select Pathway</option>
              {pathways.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="overflow-x-auto">
              <table className="w-full border text-sm print:text-xs">
                <thead className="bg-indigo-100">
                  <tr>
                    <th className="border px-2 py-1 text-left">Name</th>
                    <th className="border px-2 py-1 text-left">Code</th>
                    <th className="border px-2 py-1 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-2 text-gray-500"
                      >
                        No tracks found for selected pathway.
                      </td>
                    </tr>
                  ) : (
                    tracks.map((t) => (
                      <tr key={t.trackCode}>
                        <td className="border px-2 py-1">{t.trackName}</td>
                        <td className="border px-2 py-1">{t.trackCode}</td>
                        <td className="border px-2 py-1">{t.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={exportTracksPdf}
              className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
            >
              🖨️ Export as PDF
            </button>
          </section>
        )}

        {/* 🆕 Create Track */}
        {activeTab === "create" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-green-700">
              ➕ Create Track
            </h3>
            <input
              placeholder="Name"
              value={newTrack.name}
              onChange={(e) =>
                setNewTrack({ ...newTrack, name: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
            />
            <input
              placeholder="Code"
              value={newTrack.code}
              onChange={(e) =>
                setNewTrack({ ...newTrack, code: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
            />
            <textarea
              placeholder="Description"
              value={newTrack.description}
              onChange={(e) =>
                setNewTrack({ ...newTrack, description: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
              rows={3}
            />
            <select
              value={newTrack.pathwayName}
              onChange={(e) =>
                setNewTrack({ ...newTrack, pathwayName: e.target.value })
              }
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Pathway</option>
              {pathways.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateTrack}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create Track
            </button>
          </section>
        )}

        {/* 📦 Bulk Create */}
        {activeTab === "bulk" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-purple-700">
              📦 Bulk Create
            </h3>
            <table className="w-full border text-sm mb-4">
              <thead className="bg-purple-100">
                <tr>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Code</th>
                  <th className="border px-2 py-1">Description</th>
                  <th className="border px-2 py-1">Pathway</th>
                  <th className="border px-2 py-1">Remove</th>{" "}
                  {/* ✅ New column */}
                </tr>
              </thead>
              <tbody>
                {bulkTracks.map((t, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">
                      <input
                        value={t.name}
                        onChange={(e) => updateBulk(i, "name", e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        value={t.code}
                        onChange={(e) => updateBulk(i, "code", e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        value={t.description}
                        onChange={(e) =>
                          updateBulk(i, "description", e.target.value)
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <select
                        value={t.pathwayName}
                        onChange={(e) =>
                          updateBulk(i, "pathwayName", e.target.value)
                        }
                        className="w-full p-1 border rounded"
                      >
                        <option value="">Select</option>
                        {pathways.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        onClick={() =>
                          setBulkTracks((prev) =>
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
                  setBulkTracks([
                    ...bulkTracks,
                    { name: "", code: "", description: "", pathwayName: "" },
                  ])
                }
                className="text-sm text-purple-600 underline"
              >
                + Add another row
              </button>
              <button
                onClick={handleBulkCreateTracks}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Submit
              </button>
            </div>
          </section>
        )}

        {/* ✏️ Update Track */}
        {activeTab === "update" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-yellow-700">
              ✏️ Update Track
            </h3>
            <input
              placeholder="Track Code"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <textarea
              placeholder="New Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              rows={3}
            />
            <button
              onClick={handleUpdateTrack}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Update Track
            </button>
          </section>
        )}

        {/* 🗑️ Delete Track */}
        {activeTab === "delete" && role === "admin" && (
          <section>
            <h3 className="text-lg font-semibold text-red-700">
              🗑️ Delete Track
            </h3>
            <input
              placeholder="Track Code"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <button
              onClick={handleDeleteTrack}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete Track
            </button>
          </section>
        )}

        {/* 💬 Message */}
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
