import { useState } from "react";
import { verifySchoolCode, loginTeacher } from "../Api";
import Spinner from "../components/Spinner";

// Eye SVGs
function Eye({ visible, ...props }) {
  return visible ? (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-500" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-5.33 0-8.37 4.36-9 7.16a1.24 1.24 0 000 .68C3.63 15.14 6.67 19.5 12 19.5c5.33 0 8.37-4.36 9-7.16a1.24 1.24 0 000-.68C20.37 8.86 17.33 4.5 12 4.5z" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-500" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M7.53 7.53A7.968 7.968 0 004.5 12c.63 2.8 3.67 7.16 9 7.16 1.65 0 3.08-.44 4.26-1.2m1.62-2.42A8.013 8.013 0 0019.5 12c-.63-2.8-3.67-7.16-9-7.16-1.65 0-3.08.44-4.26 1.2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default function Login() {
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolVerified, setSchoolVerified] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleVerifySchool(e) {
    if (e) e.preventDefault();
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

  async function handleLogin(e) {
    if (e) e.preventDefault();
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

  // Allow enter key for submit in inputs
  function handleInputKey(e) {
    if (e.key === "Enter") {
      if (!schoolVerified) return handleVerifySchool(e);
      if (username.trim() && password.trim()) return handleLogin(e);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        {isLoading ? (
          <Spinner />
        ) : !schoolVerified ? (
          <form onSubmit={handleVerifySchool}>
            <h2 className="text-2xl font-bold text-center mb-4 text-indigo-700">
              Enter School Code
            </h2>
            <input
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              onKeyDown={handleInputKey}
              placeholder="School Code"
              className="w-full p-3 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              onClick={handleVerifySchool}
              disabled={!schoolCode.trim()}
              className={`w-full mt-4 p-3 rounded text-white font-semibold ${
                schoolCode.trim()
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-indigo-300 cursor-not-allowed"
              }`}
              type="submit"
            >
              Verify
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
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
              onKeyDown={handleInputKey}
              placeholder="Username"
              autoFocus
              className="w-full p-3 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleInputKey}
                placeholder="Password"
                className="w-full p-3 mt-3 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword((v) => !v)}
              >
                <Eye visible={showPassword} />
              </button>
            </div>
            <button
              onClick={handleLogin}
              disabled={!username.trim() || !password.trim()}
              className={`w-full mt-4 p-3 rounded text-white font-semibold ${
                username.trim() && password.trim()
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-green-300 cursor-not-allowed"
              }`}
              type="submit"
            >
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
