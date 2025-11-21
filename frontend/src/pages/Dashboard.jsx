import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Spinner from "../components/Spinner";
import TopRightLogout from "../components/TopRightLogout";
export default function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState("teacher");
  const [isLoading, setIsLoading] = useState(true); // ✅ Added loading state

  useEffect(() => {
    const init = async () => {
      const teacher = JSON.parse(localStorage.getItem("teacher"));
      if (teacher?.role) setRole(teacher.role.toLowerCase());
      setIsLoading(false);
    };
    init();
  }, []);

  const modules = [
    { label: "Students", path: "/students", icon: "👨‍🎓" },
    { label: "Learning Areas", path: "/subjects", icon: "📘" },
    { label: "Assessments", path: "/assessments", icon: "📝" },
    { label: "L.Area Selection", path: "/subject-selection", icon: "🎯" },
    { label: "Pathways", path: "/pathways", icon: "🧭" },
    { label: "Tracks", path: "/tracks", icon: "🛤️" },
    { label: "Classes", path: "/classes", icon: "🏫" },
    ...(role === "admin"
      ? [
          { label: "Promotions", path: "/admin/promotions", icon: "🚀" },
          { label: "Paper Config", path: "/paper-config", icon: "📄" },
          { label: "Schools", path: "/schools", icon: "🏢" },
          { label: "Teachers", path: "/teacher-management", icon: "🔐" },
          { label: "Fees", path: "/fee-management", icon: "🔐" },
        ]
      : []),
  ];

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-6">
      <div className="flex justify-end">
            <TopRightLogout />
          </div>
      <h1 className="text-3xl font-bold text-indigo-700 mb-6">📊 ElimuFlow Dashboard</h1>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {modules.map(({ label, path, icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white border border-indigo-200 shadow-md rounded-lg p-4 hover:shadow-lg hover:border-indigo-400 transition"
            >
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-indigo-700 font-semibold">{label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
