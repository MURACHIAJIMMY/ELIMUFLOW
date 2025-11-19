import { useState } from "react";
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import { signupTeacher, updateTeacher, deleteTeacher } from "../Api";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";

export default function Teacher() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const [activeTab, setActiveTab] = useState("create");
  const [isLoading, setIsLoading] = useState(false); // ✅ Added loading state

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    school: "",
    gender: "",
    phone: "",
    role: "teacher",
    email: ""
  });

  const [updateForm, setUpdateForm] = useState({
    username: "",
    updates: {
      name: "",
      role: "",
      phone: "",
      email: ""
    }
  });

  const [deleteUsername, setDeleteUsername] = useState("");
  const [message] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const res = await signupTeacher(form);
      toast.success(res.message || "Teacher Added successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Signup failed");
    }
    setIsLoading(false);
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const res = await updateTeacher(updateForm.username, updateForm.updates);
      toast.success(res.message || "Teacher updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const res = await deleteTeacher(deleteUsername);
      toast.success(res.message || "Teacher deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
    setIsLoading(false);
  };

  if (role !== "admin") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        🔒 Access denied. Only admins can manage teacher accounts.
      </div>
    );
  }

  return (
    <>
      <TopRightLogout />

      <div className="p-6 max-w-xl mx-auto space-y-6 min-h-screen bg-white">
        <h2 className="text-2xl font-bold text-indigo-700">👩‍🏫 Teacher Management</h2>

        {/* 🔘 Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("create")} className={tabStyle("create")}>🆕 Create</button>
          <button onClick={() => setActiveTab("update")} className={tabStyle("update")}>✏️ Update</button>
          <button onClick={() => setActiveTab("delete")} className={tabStyle("delete")}>🗑️ Delete</button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <>
            {/* 🆕 Create Teacher */}
            {activeTab === "create" && (
              <section>
                <h3 className="text-lg font-semibold text-green-700">🆕 Create Teacher/Admin</h3>
                <div className="space-y-2">
                  {["name", "username", "password", "school", "phone", "role", "email"].map((field) => (
                    <input
                      key={field}
                      name={field}
                      value={form[field]}
                      onChange={handleChange}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className="w-full p-2 border rounded"
                    />
                  ))}

                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <button
                    onClick={handleSignup}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Create Account
                  </button>
                </div>
              </section>
            )}

            {/* ✏️ Update Teacher */}
            {activeTab === "update" && (
              <section>
                <h3 className="text-lg font-semibold text-yellow-700">✏️ Update Teacher</h3>
                <div className="space-y-2">
                  <input
                    name="username"
                    value={updateForm.username}
                    onChange={(e) => setUpdateForm({ ...updateForm, username: e.target.value })}
                    placeholder="Username to update"
                    className="w-full p-2 border rounded"
                  />
                  {["name", "role", "phone", "email"].map((field) => (
                    <input
                      key={field}
                      name={field}
                      value={updateForm.updates[field]}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          updates: { ...updateForm.updates, [field]: e.target.value }
                        })
                      }
                      placeholder={`New ${field}`}
                      className="w-full p-2 border rounded"
                    />
                  ))}
                  <button
                    onClick={handleUpdate}
                    className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    Update Teacher
                  </button>
                </div>
              </section>
            )}

            {/* 🗑️ Delete Teacher */}
            {activeTab === "delete" && (
              <section>
                <h3 className="text-lg font-semibold text-red-700">🗑️ Delete Teacher</h3>
                <div className="space-y-2">
                  <input
                    value={deleteUsername}
                    onChange={(e) => setDeleteUsername(e.target.value)}
                    placeholder="Username to delete"
                    className="w-full p-2 border rounded"
                  />
                  <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete Teacher
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
    </>
  );

  function tabStyle(tab) {
    return `px-3 py-1 rounded ${
      activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
    } hover:bg-indigo-500 hover:text-white transition`;
  }
}
