import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import {
  getAllPathways,
  getPathwayDetailsByName,
  updatePathwayByName,
  deletePathway,
  createPathway,
  bulkCreatePathways
} from "../Api";
import TopRightLogout from "../components/TopRightLogout"; // ✅ Import logout button
export default function Pathways() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const [activeTab, setActiveTab] = useState("view");
  const [pathways, setPathways] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [details, setDetails] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [newPathway, setNewPathway] = useState({ name: "", description: "" });
//   const [bulkInput, setBulkInput] = useState("");
  const [message] = useState("");
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [bulkPathways, setBulkPathways] = useState([{ name: "", description: "" }]);

useEffect(() => {
  const fetchSchoolInfo = async () => {
    const code = localStorage.getItem("schoolCode");
    if (!code || code === "undefined") {
      console.warn("⚠️ No valid schoolCode found in localStorage");
      toast.error("School code missing. Please log in again.");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/schools/${code}`);
      const data = await res.json();
      setSchoolInfo(data);
    } catch (err) {
      console.error("❌ Error fetching school info", err);
    }
  };

  fetchSchoolInfo();
}, []);

const exportPathwaysPdf = async () => {
  if (pathways.length === 0) {
    toast.error("No pathway data to export.");
    return;
  }

  if (!schoolInfo?.name) {
    toast.error("School info not loaded yet.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(12);

  // 🖼️ Logo
  if (schoolInfo.logo) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = schoolInfo.logo;

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
  doc.text(`Contact: ${schoolInfo.contact || "—"} | Email: ${schoolInfo.email || "—"}`, 40, 32);

  // 📘 Title
  doc.setFontSize(12);
  doc.text("Pathway List", 14, 45);

  // 🧾 Table
  const headers = [["Name", "Description"]];
  const data = pathways.map(p => [p.name, p.description]);

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
      valign: "middle"
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2
  });

  doc.save("pathways.pdf");
};

  useEffect(() => {
    loadPathways();
  }, []);

  const loadPathways = async () => {
    try {
      const data = await getAllPathways();
      setPathways(data);
    } catch {
      toast.error("Failed to load pathways");
    }
  };

  const fetchDetails = async () => {
    try {
      const data = await getPathwayDetailsByName(selectedName);
      setDetails(data);
      setEditDescription(data.pathway.description);
    } catch {
      toast.error("Failed to load details");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await updatePathwayByName({ name: selectedName, description: editDescription });
      toast.success(res.message || "Pathway updated");
      loadPathways();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
  };

  const handleDelete = async () => {
  try {
    const res = await deletePathway(deleteId); // deleteId holds pathway name
    toast.success(res.message || "Pathway deleted");
    loadPathways();
  } catch (err) {
    toast.error(err.response?.data?.error || "Delete failed");
  }
};

  const handleCreate = async () => {
    try {
      const res = await createPathway(newPathway);
      toast.success(res.message || "Pathway created");
      loadPathways();
    } catch (err) {
      toast.error(err.response?.data?.error || "Creation failed");
    }
  };

 const handleBulkCreate = async () => {
  try {
    const payload = bulkPathways.filter(p => p.name && p.description); // only valid rows
    if (payload.length === 0) {
      toast.error("No valid pathway data to submit.");
      return;
    }

    const res = await bulkCreatePathways(payload);
    toast.success(res.message || "Bulk pathways created");
    loadPathways();
    setBulkPathways([{ name: "", description: "" }]); // reset form
  } catch (err) {
    toast.error(err.response?.data?.error || "Bulk creation failed");
  }
};


  if (!["admin", "teacher"].includes(role)) {
    return <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>;
  }

  return (
    
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* 🔐 Top-right logout */}
    <div className="flex justify-end">
      <TopRightLogout />
    </div>
      <h2 className="text-2xl font-bold text-indigo-700">📘 Pathway Management</h2>
{/* 🔘 Tab Switcher */}
<div className="flex gap-2 mb-4">
  <button onClick={() => setActiveTab("view")} className={tabStyle("view")}>📘 View</button>
  {role === "admin" && (
    <>
      <button onClick={() => setActiveTab("create")} className={tabStyle("create")}>🆕 Create</button>
      <button onClick={() => setActiveTab("bulk")} className={tabStyle("bulk")}>📦 Bulk</button>
      <button onClick={() => setActiveTab("update")} className={tabStyle("update")}>✏️ Update</button>
      <button onClick={() => setActiveTab("delete")} className={tabStyle("delete")}>🗑️ Delete</button>
    </>
  )}
</div>

{/* 📘 View Pathways */}
{activeTab === "view" && (
  <section>
    <h3 className="text-lg font-semibold text-indigo-700">📘 All Pathways</h3>
    <div className="overflow-x-auto">
      <table className="w-full border text-sm print:text-xs">
        <thead className="bg-indigo-100">
          <tr>
            <th className="border px-2 py-1 text-left">Name</th>
            <th className="border px-2 py-1 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {pathways.map((p) => (
            <tr key={p._id}>
              <td className="border px-2 py-1">{p.name}</td>
              <td className="border px-2 py-1">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <button
      onClick={exportPathwaysPdf}
      className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
    >
      🖨️ Export as PDF
    </button>
  </section>
)}


      {/* 🆕 Create Pathway */}
      {activeTab === "create" && role === "admin" && (
        <section>
          <h3 className="text-lg font-semibold text-green-700">➕ Create Pathway</h3>
          <input
            placeholder="Name"
            value={newPathway.name}
            onChange={(e) => setNewPathway({ ...newPathway, name: e.target.value })}
            className="w-full p-2 border rounded mb-2"
          />
          <textarea
            placeholder="Description"
            value={newPathway.description}
            onChange={(e) => setNewPathway({ ...newPathway, description: e.target.value })}
            className="w-full p-2 border rounded mb-2"
            rows={3}
          />
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Create Pathway
          </button>
        </section>
      )}
{/* 📦 Bulk Create */}
{activeTab === "bulk" && role === "admin" && (
  <section>
    <h3 className="text-lg font-semibold text-purple-700">📦 Bulk Create</h3>

    <table className="w-full border text-sm mb-4">
      <thead className="bg-purple-100">
        <tr>
          <th className="border px-2 py-1">Name</th>
          <th className="border px-2 py-1">Description</th>
        </tr>
      </thead>
      <tbody>
        {bulkPathways.map((p, i) => (
          <tr key={i}>
            <td className="border px-2 py-1">
              <input
                value={p.name}
                onChange={(e) =>
                  setBulkPathways((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, name: e.target.value } : row
                    )
                  )
                }
                placeholder="Pathway name"
                className="w-full p-1 border rounded"
              />
            </td>
            <td className="border px-2 py-1">
              <input
                value={p.description}
                onChange={(e) =>
                  setBulkPathways((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, description: e.target.value } : row
                    )
                  )
                }
                placeholder="Description"
                className="w-full p-1 border rounded"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex flex-col items-start gap-2">
      <button
        onClick={() => setBulkPathways([...bulkPathways, { name: "", description: "" }])}
        className="text-sm text-purple-600 underline"
      >
        + Add another row
      </button>
      <button
        onClick={handleBulkCreate}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        Submit
      </button>
    </div>
  </section>
)}


      {/* ✏️ Update Pathway */}
      {activeTab === "update" && role === "admin" && (
        <section>
          <h3 className="text-lg font-semibold text-yellow-700">✏️ Update Pathway</h3>
          <input
            placeholder="Pathway Name"
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <button
            onClick={fetchDetails}
            className="text-sm text-blue-600 underline mb-2"
          >
            Load Details
          </button>
          {details && (
            <div className="mb-2 text-sm text-gray-700">
              <p><strong>Current:</strong> {details.pathway.description}</p>
              <p><strong>Tracks:</strong></p>
              <ul className="list-disc ml-6">
                {details.tracks.map((track) => (
                  <li key={track.code}>
                    {track.name} ({track.code}) — {track.description}
                    <ul className="list-disc ml-6 text-xs text-gray-600">
                      {track.subjects.map((s) => (
                        <li key={s.code}>{s.LearningArea} ({s.code}) - {s.group}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <textarea
            placeholder="New Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full p-2 border rounded mb-2"
            rows={3}
          />
          <button
            onClick={handleUpdate}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Update Pathway
          </button>
        </section>
      )}

      {/* 🗑️ Delete Pathway */}
      {activeTab === "delete" && role === "admin" && (
        <section>
          <h3 className="text-lg font-semibold text-red-700">🗑️ Delete Pathway</h3>
          <input
            placeholder="Pathway name"
            value={deleteId}
            onChange={(e) => setDeleteId(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete Pathway
          </button>
        </section>
      )}

            {message && <p className="mt-4 text-sm text-indigo-600">{message}</p>}

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        ← Back to Dashboard
      </button>
    </div>
  );

  function tabStyle(tab) {
    return `px-3 py-1 rounded ${
      activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
    } hover:bg-indigo-500 hover:text-white transition`;
  }
}
