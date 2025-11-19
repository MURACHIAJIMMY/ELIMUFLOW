import { useState, useEffect } from "react";
import { toast } from 'sonner';
import { FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getStudentsByClass,
  getClasses,
  getAllPathways,
  getAllTracks, 
  registerStudent,
  bulkRegisterStudents,
  fetchTracksByPathway,
  updateStudentByAdmNo,
  deleteStudentByAdmNo,
  getAllStudents,
  getStudentProfile,
  getStudentSubjectsByAdmNo,
  // getStudentSubjects,
  auditCBCCompliance,
  getSubjectsByAdmNo,
  getSubjectsByClassName
} from "../Api";
import { getSchoolLogo } from "../utils/logos";


import TopRightLogout from "../components/TopRightLogout"; // ✅ Import logout button
import Spinner from "../components/Spinner";
export default function Students() {
  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("teacher"))?.role;
  const [activeTab, setActiveTab] = useState("view");
  const [form, setForm] = useState({
    admNo: "",
    name: "",
    gender: "",
    currentGrade: "",
    className: "",
    pathwayName: "",
    trackName: "",
    languagePreference: "KISW",
    mathChoice: "core"
  });
  const defaultStudent = {
  admNo: "",
  name: "",
  nemisNo: "",
  gender: "",
  currentGrade: "",
  className: "",
  pathwayName: "",
  trackName: "",
  languagePreference: "KISW",
  mathChoice: "core",
  selectedSubjects: []
};
const [updateForm, setUpdateForm] = useState({
  admNo: "",
  name: "",
  nemisNo: "",
  gender: "",
  currentGrade: "",
  className: "",
  pathwayName: "",
  trackName: "",
  languagePreference: "KISW",
  mathChoice: "core",
  selectedSubjects: []
});

const [trackOptions, setTrackOptions] = useState([]);

  // const [updateForm, setUpdateForm] = useState({ admNo: "", updates: {} });
  const [deleteAdmNo, setDeleteAdmNo] = useState("");
  // const [students, setStudents] = useState([]);
  const [cbcAudit, setCbcAudit] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [message, setMessage] = useState("");
  const [classStudents, setClassStudents] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [admNo,] = useState("");
  const [subjectResults, setSubjectResults] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null); // ✅ correct
  const [pathwayOptions, setPathwayOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  // const [trackOptions, setTrackOptions] = useState([]);
  const [students, setStudents] = useState([{ ...defaultStudent }]);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  // const [trackOptionsByRow, setTrackOptionsByRow] = useState({});
  const [admFilter, setAdmFilter] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [allTracks, setAllTracks] = useState([]);
 

  const grades = ["10", "11", "12"];
  const genders = ["Male", "Female"];
  const mathChoices = ["core", "essential"];
  const languages = ["KISW", "KSL"];

  const updateStudentField = (index, field, value) => {
  const updated = [...students];
  updated[index][field] = value;
  setStudents(updated);
};

const addStudentRow = () => {
  setStudents([...students, { ...defaultStudent }]);
};


// ✅ Load students when viewing tabs change
  useEffect(() => {
    if (["view", "cbc", "electives"].includes(activeTab)) loadStudents();
  }, [activeTab]);

  const loadStudents = async () => {
    try {
      const res = await getAllStudents();
      setRegisteredStudents(res.students || []);
    } catch {
      toast.error("Failed to load students");
    }
  };
 
const fetchByClassName = async (className) => {
  try {
    const res = await getStudentsByClass({ className }); // your API call
    setClassStudents(res.students || []);
    setSelectedClass(res.class);
    toast.success(`Loaded ${res.total} students from ${res.class}`);
  } catch {
    toast.error("Failed to load class list.");
    setClassStudents([]);
  }
};
// use effect to load availlable classes 
useEffect(() => {
  if (activeTab === "class") {
    loadAvailableClasses();
  }
}, [activeTab]);
useEffect(() => {
  const loadAvailableClasses = async () => {
    try {
      const classes = await getClasses();
      setAvailableClasses(classes);
    } catch (err) {
      console.error("Failed to load classes", err);
      toast.error("Failed to load class list.");
    }
  };

  loadAvailableClasses();
}, []);

const loadAvailableClasses = async () => {
  try {
    const res = await getClasses(); // optionally pass grade
    setAvailableClasses(res || []);
  } catch {
    toast.error("Failed to load class list.");
  }
};
// use effect to load school info
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

useEffect(() => {
  if (!form.pathwayName || allTracks.length === 0) return;

  const normalized = form.pathwayName.trim().toLowerCase();
  const filtered = allTracks.filter(
    (t) => t.pathwayName?.trim().toLowerCase() === normalized
  );

  setTrackOptions(filtered);
}, [form.pathwayName, allTracks]);

// useEffect(() => {
//   const updated = {};

//   students.forEach((student, index) => {
//     const normalized = student.pathwayName?.trim().toLowerCase();
//     const filtered = allTracks.filter(
//       (t) => t.pathwayName?.trim().toLowerCase() === normalized
//     );
//     updated[index] = filtered;
//   });

//   setTrackOptionsByRow(updated);
// }, [students, allTracks]);


useEffect(() => {
  const loadInitialOptions = async () => {
    try {
      const [pathways, tracks] = await Promise.all([
        getAllPathways(),
        getAllTracks()
      ]);
      setPathwayOptions(pathways);
      setAllTracks(tracks);
    } catch {
      toast.error("Failed to load pathway/track options");
    }
  };

  loadInitialOptions();
}, []);

const exportClassPdf = async () => {
  if (classStudents.length === 0) {
    toast.error("No class data to export.");
    return;
  }

  if (!schoolInfo?.name) {
    toast.error("School info not loaded yet.");
    return;
  }

  const schoolCode = localStorage.getItem("schoolCode");

  if (!schoolCode || schoolCode === "undefined") {
    console.warn("⚠️ Cannot export PDF — schoolCode missing");
    toast.error("School code missing. Please log in again.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(12);

  // 🖼️ Add logo from Cloudinary (direct link, CORS-safe)
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

  // 🏫 Add school details
  doc.setFontSize(14);
  doc.text(schoolInfo.name, 40, 15);

  doc.setFontSize(11);
  if (schoolInfo.motto) doc.text(`"${schoolInfo.motto}"`, 40, 21);

  doc.setFontSize(10);
  doc.text(schoolInfo.location || "—", 40, 27);
  doc.text(`Contact: ${schoolInfo.contact || "—"} | Email: ${schoolInfo.email || "—"}`, 40, 32);

  // 📘 Class title
  doc.setFontSize(12);
  doc.text(`Class List: ${selectedClass}`, 14, 45);

  // 🧾 Table
  const headers = [["Adm No", "Nemis No", "Name", "Gender", "Class"]];
  const data = classStudents.map(s => [
    s.admNo,
    s.nemisNo || "--",
    s.name,
    s.gender,
    s.class
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

  doc.save(`${selectedClass}_students.pdf`);
};


// use effect for update 
useEffect(() => {
  const selectedPathway = pathwayOptions.find(p => p.name === updateForm.pathwayName);
  if (!selectedPathway || !selectedPathway._id) {
    setTrackOptions([]);
    return;
  }

  fetchTracksByPathway(selectedPathway._id)
    .then((tracks) => setTrackOptions(tracks || []))
    .catch(() => setTrackOptions([]));
}, [updateForm.pathwayName, pathwayOptions]);


const handleSubjectFetch = async () => {
  try {
    if (admNo) {
      const data = await getSubjectsByAdmNo(admNo);
      setSubjectResults(data);
      setMessage("");
    } else if (selectedClass) {
      const data = await getSubjectsByClassName(selectedClass);
      setSubjectResults(data);
      setMessage("");
    } else {
      toast.error("Please enter Adm No or select a class.");
      setSubjectResults(null);
    }
  } catch (err) {
    console.error("Error fetching subject data", err);
    toast.error("Error fetching subject data.");
    setSubjectResults(null);
  }
};
useEffect(() => {
  const loadRegistrationOptions = async () => {
    try {
      const [pathways, tracks, classes] = await Promise.all([
        getAllPathways(),
        getAllTracks(),
        getClasses()
      ]);

      setPathwayOptions(pathways);
      setTrackOptions(tracks);
      setClassOptions(classes);
    } catch (err) {
      console.error("[loadRegistrationOptions]", err);
      toast.error("Failed to load registration options");
    }
  };

  loadRegistrationOptions();
}, []);

  const handleRegister = async () => {
  try {
    const payload = {
      ...form,
      admNo: form.admNo.trim().toUpperCase(),
      name: form.name.trim(),
      nemisNo: form.nemisNo?.trim() || undefined,
      gender: form.gender.toLowerCase(),
      currentGrade: parseInt(form.currentGrade),
      selectedSubjects: []
    };

    const res = await registerStudent(payload);
    toast.success(res.message || "Student registered.");
    setForm({
      admNo: "",
      name: "",
      nemisNo: "",
      gender: "",
      currentGrade: "",
      className: "",
      pathwayName: "",
      trackName: "",
      languagePreference: "KISW",
      mathChoice: "core"
    });

    loadStudents();
  } catch (err) {
    toast.error(err.response?.data?.error || "Registration failed");
  }
};



 const handleBulkRegister = async () => {
  try {
    const payload = students.map((student) => ({
      ...student,
      admNo: student.admNo.trim().toUpperCase(),
      name: student.name.trim(),
      nemisNo: student.nemisNo?.trim() || undefined,
      gender: student.gender.toLowerCase(),
      currentGrade: parseInt(student.currentGrade),
      selectedSubjects: [], // optional: wire later
      languagePreference: student.languagePreference || "KISW",
      mathChoice: student.mathChoice || "core",
    }));

    const res = await bulkRegisterStudents(payload);

    toast.success(res.message || "Students registered.");
    setStudents([{ ...defaultStudent }]); // Reset to one empty row
    loadStudents();
  } catch (err) {
    console.error("[handleBulkRegister]", err);
    toast.error(err.response?.data?.error || "Bulk registration failed");
  }
};

const removeStudentRow = (index) => {
  setStudents((prev) => prev.filter((_, i) => i !== index));
};


  const handleUpdate = async () => {
  try {
    const payload = {
      ...updateForm,
      admNo: updateForm.admNo.trim().toUpperCase(),
      name: updateForm.name?.trim(),
      nemisNo: updateForm.nemisNo?.trim() || undefined,
      gender: updateForm.gender?.toLowerCase(),
      currentGrade: parseInt(updateForm.currentGrade),
      className: updateForm.className,
      pathwayName: updateForm.pathwayName,
      trackName: updateForm.trackName,
      languagePreference: updateForm.languagePreference || "KISW",
      mathChoice: updateForm.mathChoice || "core",
      selectedSubjects: updateForm.selectedSubjects || []
    };

    const res = await updateStudentByAdmNo(updateForm.admNo, payload);
    toast.success(res.message || "Student updated.");
    loadStudents();
  } catch (err) {
    console.error("[handleUpdate]", err);
    toast.error(err.response?.data?.error || "Update failed");
  }
};


  const handleDelete = async () => {
    try {
      const res = await deleteStudentByAdmNo(deleteAdmNo);
      toast.success(res.message || "Student and linked subjects deleted successfully");
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    }
  };

  const handleAudit = async () => {
    try {
      const res = await auditCBCCompliance();
      setCbcAudit(res);
    } catch {
      toast.error("CBC audit failed");
    }
  };


const handleProfileView = async (studentId) => {
  try {
    const profile = await getStudentProfile(studentId);
    const subjectData = await getStudentSubjectsByAdmNo(profile.admNo);

    setStudentProfile({
      ...profile,
      class: profile.class?.name || "—",
      pathway: profile.pathway?.name || "—",
    });

    const allSubjects = [
      ...(subjectData.compulsorySubjects || []),
      ...(subjectData.electiveSubjects || [])
    ];

    setStudentSubjects(allSubjects);
    setActiveTab("profile");

    toast.success(`Loaded ${allSubjects.length} subjects for ${profile.name}`);
  } catch (err) {
  console.error("Profile load error:", err);
  toast.error("Failed to load student profile");
}
};



  const tabStyle = (tab) =>
    `px-3 py-1 rounded ${
      activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"
    } hover:bg-indigo-500 hover:text-white transition`;

  if (!["admin", "teacher"].includes(role)) {
    return <div className="p-6 text-red-600 font-semibold">🔒 Access denied.</div>;
  }
  // 🔧 Utility: Export student list as CSV
  const downloadCSV = () => {
    if (students.length === 0) {
      setMessage("No student data to export.");
      return;
    }

    const headers = ["Adm No", "Name", "Grade", "Class", "Pathway", "Subjects"];
    const rows = students.map(s => [
      s.admNo,
      s.name,
      s.currentGrade,
      s.class,
      s.pathway,
      s.subjectCount
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${val}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔧 Utility: Export CBC audit as PDF



if (!["admin", "teacher"].includes(role)) {
  return (
    <div className="p-6 text-red-600 font-semibold">
      🔒 Access denied.
    </div>
  );
}
return (
  <>
    <TopRightLogout /> {/* ✅ Floats top-right of screen */}

    <div className="p-6 max-w-5xl mx-auto space-y-6 min-h-screen bg-white">
      <h2 className="text-2xl font-bold text-indigo-700">🎓 Student Management</h2>

      {/* 🔘 Tab Switcher */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setActiveTab("class")} className={tabStyle("class")}>🏷️ Class</button>
        <button onClick={() => setActiveTab("view")} className={tabStyle("view")}>📘 View</button>
        <button onClick={() => setActiveTab("profile")} className={tabStyle("profile")}>🧾 Profile</button>
        <button onClick={() => setActiveTab("subjects")} className={tabStyle("subjects")}>📚 L.Areas</button>
        {role === "admin" && (
          <>
            <button onClick={() => setActiveTab("register")} className={tabStyle("register")}>🆕 Register</button>
            <button onClick={() => setActiveTab("bulk")} className={tabStyle("bulk")}>📦 Bulk Register</button>
            <button onClick={() => setActiveTab("update")} className={tabStyle("update")}>✏️ Update</button>
            <button onClick={() => setActiveTab("delete")} className={tabStyle("delete")}>🗑️ Delete</button>
            <button onClick={() => { setActiveTab("cbc"); handleAudit(); }} className={tabStyle("cbc")}>📊 CBC Audit</button>
          
          </>
        )}
      </div>
{/* 🆕 Register */}
{activeTab === "register" && role === "admin" && (
  <section>
    <h3 className="text-lg font-semibold text-green-700 mb-4">🆕 Register Student</h3>
    <div className="space-y-2">
      {/* 🔤 Admission No, Name & NEMIS */}
      <input
        name="admNo"
        value={form.admNo}
        onChange={(e) => setForm({ ...form, admNo: e.target.value })}
        placeholder="Admission Number"
        className="w-full p-2 border rounded"
      />
      <input
        name="name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Full Name"
        className="w-full p-2 border rounded"
      />
      <input
        name="nemisNo"
        value={form.nemisNo}
        onChange={(e) => setForm({ ...form, nemisNo: e.target.value })}
        placeholder="NEMIS Number (optional)"
        className="w-full p-2 border rounded"
      />

      {/* 🏫 Class */}
      <select
        name="className"
        value={form.className}
        onChange={(e) => setForm({ ...form, className: e.target.value })}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Class</option>
        {classOptions.map((c) => (
          <option key={c._id || c.name} value={c.name}>{c.name}</option>
        ))}
      </select>

      {/* 🛤️ Pathway */}
      <select
        name="pathwayName"
        value={form.pathwayName}
        onChange={(e) => setForm({ ...form, pathwayName: e.target.value })}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Pathway</option>
        {pathwayOptions.map((p) => (
          <option key={p._id || p.name} value={p.name}>{p.name}</option>
        ))}
      </select>

      {/* ⚧ Gender */}
      <select
        name="gender"
        value={form.gender}
        onChange={(e) => setForm({ ...form, gender: e.target.value })}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Gender</option>
        {genders.map((g, i) => (
          <option key={i} value={g}>{g}</option>
        ))}
      </select>

      {/* 🎓 Grade */}
      <select
        name="currentGrade"
        value={form.currentGrade}
        onChange={(e) => setForm({ ...form, currentGrade: e.target.value })}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Grade</option>
        {grades.map((g, i) => (
          <option key={i} value={g}>{g}</option>
        ))}
      </select>

      {/* 🗣️ Language Preference */}
      <select
        name="languagePreference"
        value={form.languagePreference}
        onChange={(e) => setForm({ ...form, languagePreference: e.target.value })}
        className="w-full p-2 border rounded"
      >
        {languages.map((l, i) => (
          <option key={i} value={l}>{l}</option>
        ))}
      </select>

      {/* ➗ Math Choice */}
      <select
        name="mathChoice"
        value={form.mathChoice}
        onChange={(e) => setForm({ ...form, mathChoice: e.target.value })}
        className="w-full p-2 border rounded"
      >
        {mathChoices.map((m, i) => (
          <option key={i} value={m}>{m}</option>
        ))}
      </select>

      {/* ✅ Register Button */}
      <button
        onClick={handleRegister}
        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Register
      </button>
    </div>
  </section>
)}


{/* 📦 Bulk Register Students */}
{activeTab === "bulk" && role === "admin" && (
  <section>
    <h3 className="text-lg font-semibold text-green-700 mb-2">📦 Bulk Register Students</h3>
    <p className="text-sm text-gray-600 mb-4">Enter multiple students below. Submit to register all at once.</p>

    {/* 🧾 Table Header */}
    <div className="grid grid-cols-9 gap-2 font-semibold text-sm text-gray-700 mb-2">
      <div>Adm No</div>
      <div>Name</div>
      <div>NEMIS</div>
      <div>Class</div>
      <div>Pathway</div>
      <div>Gender</div>
      <div>Grade</div>
      <div>Subjects</div>
      <div>Remove</div>
    </div>

    {/* 🧑‍🎓 Student Rows */}
    {students.map((student, index) => (
      <div key={index} className="grid grid-cols-9 gap-2 mb-2">
        <input
          value={student.admNo}
          onChange={(e) => updateStudentField(index, "admNo", e.target.value)}
          placeholder="ADM"
          className="p-2 border rounded"
        />
        <input
          value={student.name}
          onChange={(e) => updateStudentField(index, "name", e.target.value)}
          placeholder="Name"
          className="p-2 border rounded"
        />
        <input
          value={student.nemisNo}
          onChange={(e) => updateStudentField(index, "nemisNo", e.target.value)}
          placeholder="NEMIS (optional)"
          className="p-2 border rounded"
        />
        <select
          value={student.className}
          onChange={(e) => updateStudentField(index, "className", e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Class</option>
          {classOptions.map((c) => (
            <option key={c._id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          value={student.pathwayName}
          onChange={(e) => updateStudentField(index, "pathwayName", e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Pathway</option>
          {pathwayOptions.map((p) => (
            <option key={p._id || p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <select
          value={student.gender}
          onChange={(e) => updateStudentField(index, "gender", e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Gender</option>
          {genders.map((g, i) => <option key={i} value={g}>{g}</option>)}
        </select>
        <select
          value={student.currentGrade}
          onChange={(e) => updateStudentField(index, "currentGrade", e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Grade</option>
          {grades.map((g, i) => <option key={i} value={g}>{g}</option>)}
        </select>
        <div className="p-2 border rounded text-gray-500 text-xs">Auto/Manual subjects</div>
        <div className="flex items-center justify-center">
          <button
            onClick={() => removeStudentRow(index)}
            className="text-red-600 hover:text-red-800"
            title="Remove row"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    ))}

    {/* ➕ Add Row */}
    <button
      onClick={addStudentRow}
      className="text-blue-600 text-sm mb-4"
    >
      + Add another row
    </button>

    {/* 🗣️ Language & Math Choice */}
    <div className="grid grid-cols-2 gap-4 mb-4">
      <select
        value={students[0]?.languagePreference || "KISW"}
        onChange={(e) => updateStudentField(0, "languagePreference", e.target.value)}
        className="p-2 border rounded"
      >
        {languages.map((l, i) => (
          <option key={i} value={l}>{l}</option>
        ))}
      </select>
      <select
        value={students[0]?.mathChoice || "core"}
        onChange={(e) => updateStudentField(0, "mathChoice", e.target.value)}
        className="p-2 border rounded"
      >
        {mathChoices.map((m, i) => (
          <option key={i} value={m}>{m}</option>
        ))}
      </select>
    </div>

    {/* ✅ Submit Button */}
    <button
      onClick={handleBulkRegister}
      className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      Submit Bulk Register
    </button>
  </section>
)}



{/* 🔧 Update Student */}
{activeTab === "update" && role === "admin" && (
  <section>
    <h3 className="text-lg font-semibold text-yellow-700 mb-2">🔧 Update Student</h3>
    <p className="text-sm text-gray-600 mb-4">Enter Adm No and update student details below.</p>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <input
        value={updateForm.admNo}
        onChange={(e) => setUpdateForm({ ...updateForm, admNo: e.target.value })}
        placeholder="Admission Number"
        className="p-2 border rounded"
      />
      <input
        value={updateForm.name}
        onChange={(e) => setUpdateForm({ ...updateForm, name: e.target.value })}
        placeholder="Full Name"
        className="p-2 border rounded"
      />
      <input
        value={updateForm.nemisNo}
        onChange={(e) => setUpdateForm({ ...updateForm, nemisNo: e.target.value })}
        placeholder="NEMIS (optional)"
        className="p-2 border rounded"
      />

      {/* ⚧ Gender */}
      <select
        value={updateForm.gender}
        onChange={(e) => setUpdateForm({ ...updateForm, gender: e.target.value })}
        className="p-2 border rounded"
      >
        <option value="">Gender</option>
        {genders.map((g, i) => (
          <option key={i} value={g}>{g}</option>
        ))}
      </select>

      {/* 🎓 Grade */}
      <select
        value={updateForm.currentGrade}
        onChange={(e) => setUpdateForm({ ...updateForm, currentGrade: e.target.value })}
        className="p-2 border rounded"
      >
        <option value="">Grade</option>
        {grades.map((g, i) => (
          <option key={i} value={g}>{g}</option>
        ))}
      </select>

      {/* 🏫 Class */}
      <select
        value={updateForm.className}
        onChange={(e) => setUpdateForm({ ...updateForm, className: e.target.value })}
        className="p-2 border rounded"
      >
        <option value="">Class</option>
        {classOptions.map((c) => (
          <option key={c._id || c.name} value={c.name}>{c.name}</option>
        ))}
      </select>

      {/* 🛤️ Pathway */}
      <select
        value={updateForm.pathwayName}
        onChange={(e) => setUpdateForm({ ...updateForm, pathwayName: e.target.value })}
        className="p-2 border rounded"
      >
        <option value="">Pathway</option>
        {pathwayOptions.map((p) => (
          <option key={p._id || p.name} value={p.name}>{p.name}</option>
        ))}
      </select>

      {/* 🧭 Track */}
      <select
        value={updateForm.trackName}
        onChange={(e) => setUpdateForm({ ...updateForm, trackName: e.target.value })}
        className="p-2 border rounded"
      >
        <option value="">Track</option>
        {trackOptions.map((t) => (
          <option key={t._id || t.name} value={t.name}>{t.name}</option>
        ))}
      </select>

      {/* 🗣️ Language Preference */}
      <select
        value={updateForm.languagePreference}
        onChange={(e) => setUpdateForm({ ...updateForm, languagePreference: e.target.value })}
        className="p-2 border rounded"
      >
        {languages.map((l, i) => (
          <option key={i} value={l}>{l}</option>
        ))}
      </select>

      {/* ➗ Math Choice */}
      <select
        value={updateForm.mathChoice}
        onChange={(e) => setUpdateForm({ ...updateForm, mathChoice: e.target.value })}
        className="p-2 border rounded"
      >
        {mathChoices.map((m, i) => (
          <option key={i} value={m}>{m}</option>
        ))}
      </select>
    </div>

    <button
      onClick={handleUpdate}
      className="w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
    >
      Update Student
    </button>
  </section>
)}


      {/* 🗑️ Delete */}
      {activeTab === "delete" && role === "admin" && (
        <section>
          <h3 className="text-lg font-semibold text-red-700">🗑️ Delete Student</h3>
          <input
            placeholder="Admission Number"
            value={deleteAdmNo}
            onChange={(e) => setDeleteAdmNo(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <button onClick={handleDelete} className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Delete</button>
        </section>
      )}
      
    {/* 📘 View Students */}
{activeTab === "view" && (
  <section>
    <h3 className="text-lg font-semibold text-indigo-700 mb-2">📘 All Students</h3>

    {/* 🔍 Filter + Sort Controls */}
    <div className="flex items-center gap-4 mb-4">
      <input
        type="text"
        value={admFilter}
        onChange={(e) => setAdmFilter(e.target.value)}
        placeholder="Filter by Adm No"
        className="p-2 border rounded w-64"
      />
      <button
        onClick={() => setSortAsc(!sortAsc)}
        className="px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
      >
        Sort: {sortAsc ? "A → Z" : "Z → A"}
      </button>
    </div>

    {/* 📋 Table */}
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm text-left border">
        <thead className="bg-indigo-100">
          <tr>
            <th className="px-4 py-2 border">Adm No</th>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Grade</th>
            <th className="px-4 py-2 border">Class</th>
            <th className="px-4 py-2 border">Pathway</th>
            <th className="px-4 py-2 border">L.Areas Count</th>
          </tr>
        </thead>
        <tbody>
          {registeredStudents
            .filter((s) => s.admNo.toLowerCase().includes(admFilter.toLowerCase()))
            .sort((a, b) => {
              const admA = a.admNo.toUpperCase();
              const admB = b.admNo.toUpperCase();
              return sortAsc ? admA.localeCompare(admB) : admB.localeCompare(admA);
            })
            .map((s) => (
              <tr key={s._id} className="border-t">
                <td
                  className="px-4 py-2 border text-blue-600 underline cursor-pointer"
                  onClick={() => handleProfileView(s._id)}
                >
                  {s.admNo}
                </td>
                <td className="px-6 py-2 border">{s.name}</td>
                <td className="px-4 py-2 border">{s.currentGrade}</td>
                <td className="px-4 py-2 border">{s.class?.name || s.class}</td>
                <td className="px-4 py-2 border">{s.pathway?.name || s.pathway}</td>
                <td className="px-4 py-2 border">{s.subjectCount || s.selectedSubjects?.length || 0}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    {/* ⬇️ CSV Export */}
    <button
      onClick={downloadCSV}
      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
    >
      ⬇️ Download CSV
    </button>
  </section>
)}


{/* 🧾 Student Profile */}
{activeTab === "profile" && studentProfile && (
  <section>
    <h3 className="text-lg font-semibold text-indigo-700 mb-4">🧾 Student Profile</h3>

    <p><strong>Name:</strong> {studentProfile.name}</p>
    <p><strong>Adm No:</strong> {studentProfile.admNo}</p>
    <p><strong>Grade:</strong> {studentProfile.currentGrade}</p>
    <p><strong>Class:</strong> {studentProfile.class || "—"}</p>
    <p><strong>Pathway:</strong> {studentProfile.pathway || "—"}</p>
    {/* <p><strong>Track:</strong> {studentProfile.track || "—"}</p> */}

    {/* 📚 Subject Breakdown Table */}
    {studentSubjects.length > 0 && (
      <div className="mt-6">
        <h4 className="text-md font-semibold text-indigo-700 mb-2">📚 Learning Areas</h4>
        <table className="table-auto w-full border text-sm">
          <thead>
            <tr className="bg-indigo-100">
              <th className="px-2 py-1 border">No</th>
              <th className="px-2 py-1 border">Name</th>
              <th className="px-2 py-1 border">Code</th>
              <th className="px-2 py-1 border">Group</th>
              <th className="px-2 py-1 border">Category</th>
              {/* <th className="px-2 py-1 border">Term</th>
              <th className="px-2 py-1 border">Year</th> */}
            </tr>
          </thead>
          <tbody>
            {studentSubjects.map((subj, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-2 py-1 border">{i + 1}</td>
                <td className="px-2 py-1 border">{subj.name}</td>
                <td className="px-2 py-1 border">{subj.code}</td>
                <td className="px-2 py-1 border">{subj.group}</td>
                <td className="px-2 py-1 border">{subj.category}</td>
                {/* <td className="px-2 py-1 border">{subj.term || "—"}</td>
                <td className="px-2 py-1 border">{subj.year || "—"}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}

{/* 📚 Subject Breakdown */}
{activeTab === "subjects" && (
  <section>
    <h3 className="text-lg font-semibold text-indigo-700 mb-4">📚 L.Areas</h3>

    {/* 📄 Select: Class Name */}
    <div className="mb-4">
      <select
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
        className="p-2 border rounded w-full"
      >
        <option value="">Select Class</option>
        {availableClasses.length === 0 ? (
          <option disabled>Loading classes...</option>
        ) : (
          availableClasses.map((cls) => (
            <option key={cls.name} value={cls.name}>
              Grade {cls.grade} {cls.stream ? `- ${cls.stream}` : ""} ({cls.name})
            </option>
          ))
        )}
      </select>
    </div>

    {/* 🚀 Fetch Button */}
    <button
      onClick={handleSubjectFetch}
      className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
    >
      📚 Load L.Area Data
    </button>

    {/* 🧾 Message */}
    {message && <p className="text-red-600 text-sm mb-4">{message}</p>}

    {/* 🔍 Individual Student View */}
    {subjectResults?.student && (
      <div className="mb-6">
        <h4 className="font-semibold text-indigo-600">
          {subjectResults.student.name} ({subjectResults.student.admNo})
        </h4>
        <p className="text-sm text-gray-700">
          Grade: {subjectResults.student.grade} | Pathway: {subjectResults.student.pathway || "—"} | Track: {subjectResults.student.track || "—"}
        </p>

        <h5 className="mt-4 font-semibold">📚 L.Area Breakdown</h5>
        <table className="table-auto w-full border text-sm mt-2">
          <thead>
            <tr className="bg-indigo-100">
              <th className="px-2 py-1 border">No</th>
              <th className="px-2 py-1 border">L.Area</th>
              <th className="px-2 py-1 border">Group</th>
            </tr>
          </thead>
          <tbody>
            {[...subjectResults.autoAssignedSubjects, ...subjectResults.optionalSubjects].map((subj, i) => (
              <tr key={i}>
                <td className="px-2 py-1 border">{i + 1}</td>
                <td className="px-2 py-1 border">{subj.name}</td>
                <td className="px-2 py-1 border">{subj.group}</td>
                <td className="px-2 py-1 border">
                  {/* {subjectResults.autoAssignedSubjects.includes(subj) ? "Compulsory" : "Elective"} */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* 📄 Class-Wide View */}
    {subjectResults?.students && (
      <div>
        <h4 className="font-semibold text-indigo-600">
          Class: {subjectResults.class.name} (Grade {subjectResults.class.grade})
        </h4>
        <p className="text-sm text-gray-700">Total Students: {subjectResults.count}</p>

        <table className="table-auto w-full mt-4 border text-sm">
          <thead>
            <tr className="bg-indigo-100">
              <th className="px-2 py-1 border">Adm No</th>
              <th className="px-2 py-1 border">Name</th>
              <th className="px-2 py-1 border">L.Areas</th>
            </tr>
          </thead>
          <tbody>
            {subjectResults.students.map((s, i) => (
              <tr key={i}>
                <td className="px-2 py-1 border">{s.admNo}</td>
                <td className="px-2 py-1 border">{s.name}</td>
                <td className="px-2 py-1 border">
                  {s.selectedSubjects.map(sub => `${sub.name} (${sub.group})`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {/* 🧾 Fallback */}
    {!subjectResults && (
      <p className="text-sm text-gray-600 mt-4">
        No Learning Area loaded. Enter Adm No or select a class to view subject data.
      </p>
    )}
  </section>
)}


{/* 🏷️ Class View */}
{activeTab === "class" && (
  <section>
    <h3 className="text-lg font-semibold text-indigo-700">🏷️ Class View</h3>

    <select
      value={selectedClass}
      onChange={(e) => setSelectedClass(e.target.value)}
      className="mb-2 w-full p-2 border rounded"
    >
      <option value="">Select Class</option>
      {availableClasses.map((cls) => (
        <option key={cls._id} value={cls.name}>
          Grade {cls.grade} {cls.stream ? `- ${cls.stream}` : ""} ({cls.name})
        </option>
      ))}
    </select>

    <button
      onClick={() => fetchByClassName(selectedClass)}
      disabled={!selectedClass}
      className={`mb-2 px-4 py-2 rounded ${
        selectedClass
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }`}
    >
      🔍 Load Class
    </button>

    {classStudents.length > 0 && (
      <>
        <p className="text-sm text-gray-700 mb-2">
          Showing students from <strong>{selectedClass}</strong>
        </p>

        <div className="overflow-auto border rounded mt-2">
          <table className="min-w-full text-sm text-left border">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-2 border">Adm No</th>
                <th className="px-4 py-2 border">Nemis No</th>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Gender</th>
                <th className="px-4 py-2 border">Class</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 border">{s.admNo}</td>
                  <td className="px-4 py-2 border">{s.nemisNo}</td>
                  <td className="px-4 py-2 border">{s.name}</td>
                  <td className="px-4 py-2 border">{s.gender}</td>
                  <td className="px-4 py-2 border">{s.class}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={exportClassPdf}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          ⬇️ Export Class PDF
        </button>
      </>
    )}
  </section>
)}


      {/* 📊 CBC Audit */}
      {activeTab === "cbc" && (
        <section>
          <h3 className="text-lg font-semibold text-indigo-700">📊 CBC Compliance Audit</h3>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm text-left border">
              <thead className="bg-indigo-100">
                <tr>
                  <th className="px-4 py-2 border">Adm No</th>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Pathway</th>
                  <th className="px-4 py-2 border">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {cbcAudit.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 border">{s.admNo}</td>
                    <td className="px-4 py-2 border">{s.name}</td>
                    <td className="px-4 py-2 border">{s.pathway}</td>
                    <td className="px-4 py-2 border">{s.compliant ? "✅ Compliant" : "❌ Incomplete"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                 </section>
      )}

      {/* ✅ Message + Navigation */}
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
}
