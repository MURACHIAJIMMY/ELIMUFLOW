import { useNavigate } from "react-router-dom";

export default function TopRightLogout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("teacher");
    localStorage.removeItem("schoolCode");
    navigate("/login"); // 🔁 Adjust this if your login route is different
  };

  return (
    <div className="fixed top-4 right-6 z-50">
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Logout ➡️
      </button>
    </div>
  );
}
