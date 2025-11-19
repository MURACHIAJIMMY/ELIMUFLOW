import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  bulkCreateClasses,
  getClasses,
  updateClass,
  deleteClass,
} from "../Api";
import TopRightLogout from "../components/TopRightLogout"; // ✅ Import logout button
import Spinner from "../components/Spinner";

export default function Class() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const [activeTab, setActiveTab] = useState("view");
  const [classes, setClasses] = useState([]);
  const [newClasses, setNewClasses] = useState([
    { name: "", grade: "", stream: "" },
  ]);
  const [updateForm, setUpdateForm] = useState({ name: "", updates: {} });
  const [deleteName, setDeleteName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true); // ✅ Added loading state

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadClasses();
      setIsLoading(false);
    };
    init();
  }, []);

  const loadClasses = async () => {
    try {
      const data = await getClasses();
      setClasses(data);
    } catch {
      toast.error("Failed to load classes");
    }
  };

  const handleBulkCreate = async () => {
    try {
      const res = await bulkCreateClasses(newClasses);
      toast.success(res.message || "Classes created successfully");
      loadClasses();
    } catch (err) {
      toast.error(err.response?.data?.error || "Bulk creation failed");
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await updateClass(updateForm.name, updateForm.updates);
      setMessage(res.message);
      loadClasses();
    } catch (err) {
      setMessage(err.response?.data?.error || "Update failed");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await deleteClass(deleteName);
      setMessage(res.message);
      loadClasses();
    } catch (err) {
      setMessage(err.response?.data?.error || "Delete failed");
    }
  };

  if (!["admin", "teacher"].includes(role)) {
    return (
      <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 min-h-screen bg-white">
      <TopRightLogout />

      <h2 className="text-2xl font-bold text-indigo-700">
        🏫 Class Management
      </h2>

      {isLoading ? (
        <>
          <Spinner />
          <div className="text-center text-gray-500 mt-10">Spinner</div>
        </>
      ) : (
        <>
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

          {/* 📘 View Classes */}
          {activeTab === "view" && (
            <section>
              <h3 className="text-lg font-semibold text-indigo-700">
                📘 All Classes
              </h3>
              <table className="min-w-full border border-gray-300 mt-2">
                <thead>
                  <tr className="bg-indigo-100">
                    <th className="px-4 py-2 border">Class Name</th>
                    <th className="px-4 py-2 border">Grade</th>
                    <th className="px-4 py-2 border">Stream</th>
                    <th className="px-4 py-2 border">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border">{cls.name}</td>
                      <td className="px-4 py-2 border">{cls.grade}</td>
                      <td className="px-4 py-2 border">{cls.stream}</td>
                      <td className="px-4 py-2 border">{cls.academicYear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* 🆕 Bulk Create */}
          {activeTab === "create" && role === "admin" && (
            <section>
              <h3 className="text-lg font-semibold text-green-700">
                📦 Bulk Create
              </h3>
              {newClasses.map((cls, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input
                    placeholder="name"
                    value={cls.name}
                    onChange={(e) =>
                      setNewClasses((prev) =>
                        prev.map((c, idx) =>
                          idx === i ? { ...c, name: e.target.value } : c
                        )
                      )
                    }
                    className="p-2 border rounded w-1/4"
                  />
                  <select
                    value={cls.grade}
                    onChange={(e) =>
                      setNewClasses((prev) =>
                        prev.map((c, idx) =>
                          idx === i ? { ...c, grade: e.target.value } : c
                        )
                      )
                    }
                    className="p-2 border rounded w-1/4"
                  >
                    <option value="">Grade</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                  </select>
                  <input
                    placeholder="stream"
                    value={cls.stream}
                    onChange={(e) =>
                      setNewClasses((prev) =>
                        prev.map((c, idx) =>
                          idx === i ? { ...c, stream: e.target.value } : c
                        )
                      )
                    }
                    className="p-2 border rounded w-1/4"
                  />
                  <button
                    onClick={() =>
                      setNewClasses((prev) =>
                        prev.length > 1
                          ? prev.filter((_, idx) => idx !== i)
                          : prev
                      )
                    }
                    className="text-red-600 hover:text-red-800 text-sm px-2"
                    title="Remove row"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <div className="flex flex-col items-start gap-2 mt-2">
                <button
                  onClick={() =>
                    setNewClasses([
                      ...newClasses,
                      { name: "", grade: "", stream: "" },
                    ])
                  }
                  className="text-sm text-blue-600 underline"
                >
                  + Add another
                </button>
                <button
                  onClick={handleBulkCreate}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Create Classes
                </button>
              </div>
            </section>
          )}

          {/* ✏️ Update Class */}
          {activeTab === "update" && role === "admin" && (
            <section>
              <h3 className="text-lg font-semibold text-yellow-700">
                ✏️ Update Class
              </h3>
              <input
                placeholder="Class Name"
                value={updateForm.name}
                onChange={(e) =>
                  setUpdateForm({ ...updateForm, name: e.target.value })
                }
                className="w-full p-2 border rounded mb-2"
              />
              {["grade", "stream", "isDefault", "academicYear"].map((field) => (
                <input
                  key={field}
                  placeholder={`New ${field}`}
                  value={updateForm.updates[field] || ""}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      updates: {
                        ...updateForm.updates,
                        [field]: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 border rounded mb-2"
                />
              ))}
              <button
                onClick={handleUpdate}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Update Class
              </button>
            </section>
          )}

          {/* 🗑️ Delete Class */}
          {activeTab === "delete" && role === "admin" && (
            <section>
              <h3 className="text-lg font-semibold text-red-700">
                🗑️ Delete Class
              </h3>
              <input
                placeholder="Class Name"
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
                className="w-full p-2 border rounded mb-2"
              />
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Class
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
