export function getSchoolContext() {
  const user = JSON.parse(localStorage.getItem("teacher")) || {};
  const isAdmin = user.role === "admin";

  return {
    schoolId: user.schoolId || null,
    schoolCode: user.schoolCode || user.code || null, // fallback for admin
    isAdmin
  };
}
