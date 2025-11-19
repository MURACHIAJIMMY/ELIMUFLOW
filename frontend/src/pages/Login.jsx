import { useState } from "react";
import { verifySchoolCode, loginTeacher } from "../Api";
import Spinner from "../components/Spinner";

export default function Login() {
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolVerified, setSchoolVerified] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // ✅ Added loading state

  async function handleVerifySchool() {
    setIsLoading(true);
    try {
      const data = await verifySchoolCode(schoolCode);
      if (data?.schoolId) {
        setSchoolVerified(true);
        setSchoolInfo(data);
        localStorage.setItem("schoolCode", data.code);
      } else {
        alert("School not found");
      }
    } catch {
      alert("Invalid school code");
    }
    setIsLoading(false);
  }

  async function handleLogin() {
    setIsLoading(true);
    try {
      const verifiedCode = schoolInfo?.code || schoolCode;
      const data = await loginTeacher({
        schoolCode: verifiedCode,
        username,
        password,
      });

      if (data?.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("teacher", JSON.stringify(data.teacher));
        localStorage.setItem("schoolCode", verifiedCode);
        window.location.href = "/dashboard";
      } else {
        alert("Login failed");
      }
    } catch {
      alert("Login failed");
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        {isLoading ? (
          <Spinner />
        ) : !schoolVerified ? (
          <>
            <h2 className="text-2xl font-bold text-center mb-4 text-indigo-700">
              Enter School Code
            </h2>
            <input
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="School Code"
              className="w-full p-3 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleVerifySchool}
              disabled={!schoolCode.trim()}
              className={`w-full mt-4 p-3 rounded text-white font-semibold ${
                schoolCode.trim()
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-indigo-300 cursor-not-allowed"
              }`}
            >
              Verify
            </button>
          </>
        ) : (
          <>
            {schoolInfo?.logo?.[0]?.url && (
              <div className="flex justify-center mb-4">
                <img
                  src={schoolInfo.logo[0].url}
                  alt="School Logo"
                  className="h-20 w-auto object-contain"
                />
              </div>
            )}

            <h2 className="text-2xl font-bold text-center mb-4 text-indigo-700">
              Login to {schoolInfo?.name || schoolCode}
            </h2>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-3 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 mt-3 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleLogin}
              disabled={!username.trim() || !password.trim()}
              className={`w-full mt-4 p-3 rounded text-white font-semibold ${
                username.trim() && password.trim()
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-green-300 cursor-not-allowed"
              }`}
            >
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
