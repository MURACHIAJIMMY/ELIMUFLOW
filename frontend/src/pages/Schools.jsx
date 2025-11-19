import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';
import { createSchool, updateSchool } from "../Api";
import TopRightLogout from "../components/TopRightLogout";
import Spinner from "../components/Spinner";

export default function Schools() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create");
  const [form, setForm] = useState({
    name: "",
    code: "",
    logo: "",
    location: "",
    contact: "",
    email: "",
    motto: ""
  });
  const [updateForm, setUpdateForm] = useState({
    code: "",
    name: "",
    logo: "",
    location: "",
    contact: "",
    email: "",
    motto: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const logoInputRef = useRef(null);
  const updateLogoInputRef = useRef(null);

  // Handle normal input changes
  const handleChange = (e, forUpdate = false) => {
    const updater = forUpdate ? setUpdateForm : setForm;
    updater(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Handle logo (image) file selection
const handleLogoChange = (e, forUpdate = false) => {
  const file = e.target.files[0];
  const updater = forUpdate ? setUpdateForm : setForm;

  if (file) {
    updater(prev => ({ ...prev, logo: file }));
  } else {
    updater(prev => {
      const updated = { ...prev };
      delete updated.logo; // ✅ remove logo if no file
      return updated;
    });
  }
};


  // School creation
  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "logo") {
          if (v instanceof File) {
            fd.append("logo", v); // ✅ only append if file
          }
        } else {
          fd.append(k, v);
        }
      });
      const res = await createSchool(fd);
      toast.success(res.message || "School created");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error creating school");
    }
    setIsLoading(false);
  };

  // School update
  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const fd = new FormData();
      Object.entries(updateForm).forEach(([k, v]) => {
        if (k === "logo") {
          if (v instanceof File) {
            fd.append("logo", v); // ✅ only append if file
          }
        } else {
          fd.append(k, v);
        }
      });
      const res = await updateSchool(updateForm.code, fd);
      toast.success(res.message || "School updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error updating school");
    }
    setIsLoading(false);
  };

  if (role !== "admin") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        🔒 Access denied. Only admins can manage schools.
      </div>
    );
  }

  return (
    <>
      <TopRightLogout />

      <div className="p-6 max-w-xl mx-auto space-y-6 min-h-screen bg-white">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">🏫 School Management</h2>
        {/* Tab Buttons for Create/Update */}
        <div className="flex space-x-2 mb-6">
          <button
            className={`px-4 py-2 rounded ${activeTab === "create" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("create")}
          >
            Create School
          </button>
          <button
            className={`px-4 py-2 rounded ${activeTab === "update" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("update")}
          >
            Update School
          </button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            {activeTab === "create" && (
              <form
                className="space-y-3"
                onSubmit={e => {
                  e.preventDefault();
                  handleCreate();
                }}
                encType="multipart/form-data"
              >
                {["name", "code", "location", "contact", "email", "motto"].map(field => (
                  <input
                    key={field}
                    name={field}
                    value={form[field]}
                    onChange={e => handleChange(e)}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    className="w-full p-2 border rounded"
                  />
                ))}
                {/* Logo file input */}
                <input
                  name="logo"
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  onChange={e => handleLogoChange(e)}
                  className="w-full p-2 border rounded"
                />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-2"
                >
                  Create School
                </button>
              </form>
            )}
            {activeTab === "update" && (
              <form
                className="space-y-3"
                onSubmit={e => {
                  e.preventDefault();
                  handleUpdate();
                }}
                encType="multipart/form-data"
              >
                {/* Start with code for lookup */}
                <input
                  name="code"
                  value={updateForm.code}
                  onChange={e => handleChange(e, true)}
                  placeholder="Code"
                  className="w-full p-2 border rounded"
                />
                {/* Other editable fields */}
                {["name", "location", "contact", "email", "motto"].map(field => (
                  <input
                    key={field}
                    name={field}
                    value={updateForm[field]}
                    onChange={e => handleChange(e, true)}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    className="w-full p-2 border rounded"
                  />
                ))}
                <input
                  name="logo"
                  type="file"
                  accept="image/*"
                  ref={updateLogoInputRef}
                  onChange={e => handleLogoChange(e, true)}
                  className="w-full p-2 border rounded"
                />
                <button
                  type="submit"
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mt-2"
                >
                  Update School
                </button>
              </form>
            )}

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </>
  );
}
