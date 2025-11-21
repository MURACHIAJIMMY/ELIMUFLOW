import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ✅ If the data is FormData, remove Content-Type so browser sets multipart/form-data
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// ✅ Attach token dynamically before each request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
function getSchoolContext() {
  const user = JSON.parse(localStorage.getItem("teacher")) || {};
  const role = user.role || null;

  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";

  return {
    role,
    isAdmin,
    isTeacher,
    schoolId: user.schoolId || null,
    schoolCode: user.schoolCode || user.code || null,
  };
}

export default api;

// 🔐 Verify school code and fetch branding info
export async function verifySchoolCode(schoolCode) {
  const { schoolCode: fallbackCode } = getSchoolContext();
  const res = await api.post("/auth/verify-school", {
    schoolCode: schoolCode || fallbackCode,
  });
  return res.data;
}

// 🔐 Login teacher/admin
export async function loginTeacher(credentials) {
  const { schoolCode } = getSchoolContext();
  const res = await api.post("/auth/login", {
    ...credentials,
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}


// 🏫 School Management (admin only)
export async function createSchool(formData) {
  const token = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    // ❌ don’t set Content-Type here, let the browser handle it
  };
  const res = await api.post("/schools/create", formData, { headers });
  return res.data;
}

export async function updateSchool(code, formData) {
  const token = localStorage.getItem("token");
  const { schoolId, schoolCode } = getSchoolContext();
  const headers = {
    Authorization: `Bearer ${token}`,
    // ❌ don’t set Content-Type here either
  };

  if (schoolId) formData.append("schoolId", schoolId);
  if (schoolCode) formData.append("schoolCode", schoolCode);

  const res = await api.put(`/schools/update/${code || schoolCode}`, formData, { headers });
  return res.data;
}



// 🧑‍🏫 Teacher Management (admin only)
// 📝 Admin-only signup for teacher/admin/principal
export async function signupTeacher(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/auth/signup", {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 🔧 Admin-only update teacher by username
export async function updateTeacher(username, updates) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put(`/auth/update/${username}`, {
    ...updates,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 🗑️ Admin-only delete teacher by username
export async function deleteTeacher(username) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.delete(`/auth/delete/${username}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📘 Class Management (admin and teachers)
export async function bulkCreateClasses(classes) {
  const { schoolId, schoolCode } = getSchoolContext();

  const res = await api.post("/classes/bulk", {
    classes,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });

  return res.data;
}

export async function getClasses(grade = "") {
  const { schoolId, schoolCode } = getSchoolContext();

  const res = await api.get("/classes", {
    params: {
      ...(grade && { grade }),
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });

  return res.data;
}

export async function updateClass(name, updates) {
  const { schoolId, schoolCode } = getSchoolContext();

  const res = await api.put(`/classes/update/name/${name}`, {
    ...updates,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });

  return res.data;
}

export async function deleteClass(name) {
  const { schoolId, schoolCode } = getSchoolContext();

  const res = await api.delete(`/classes/delete/name/${name}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });

  return res.data;
}

// 🧍‍♂️ Student Management (admin and teachers)
// 📝 Register a single student
export async function registerStudent(data) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/students/register", {
    ...data,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📝 Bulk register students
export async function bulkRegisterStudents(payloadArray) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/students/bulk", payloadArray, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}


// 🔧 Update student by admission number
export async function updateStudentByAdmNo(admNo, updates) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put(`/students/admno/${admNo}/update`, {
    ...updates,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 🗑️ Delete student by admission number
export async function deleteStudentByAdmNo(admNo) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.delete(`/students/admno/${admNo}/delete`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📄 Get all students
export async function getAllStudents() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/students", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📄 Get student profile by ID
export async function getStudentProfile(studentId) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/students/profile/${studentId}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📘 Get student subjects by ID
export async function getStudentSubjects(studentId) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/students/${studentId}/subjects`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📘 Get student subjects by admission number
export async function getSubjectsByAdmNo(admNo) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/students/adm/${admNo}/subjects`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📘 Alias for getSubjectsByAdmNo
export async function getStudentSubjectsByAdmNo(admNo) {
  return getSubjectsByAdmNo(admNo);
}

// 📘 Get all students with subjects
export async function getAllStudentsWithSubjects() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/students/with-subjects", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📘 Get students with subjects by class name
export async function getSubjectsByClassName(className) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(
    `/students/class/${className}/students-with-subjects`,
    {
      params: {
        ...(schoolId && { schoolId }),
        ...(schoolCode && { schoolCode }),
      },
    }
  );
  return res.data;
}

// 📘 Get students by class name
export async function getStudentsByClass({ className }) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/students/class/name/${className}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📊 Audit CBC compliance
export async function auditCBCCompliance() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/students/audit/cbc-compliance", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📘 Fetch tracks by pathway
export async function fetchTracksByPathway(pathwayId) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/tracks`, {
    params: {
      pathwayId,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

//
// 📚 CBC Modules
//
export async function fetchGrades() {
  const res = await api.get("/grades");
  return res.data;
}

export async function submitReport(data) {
  const res = await api.post("/reports", data);
  return res.data;
}

export async function fetchPathways() {
  const res = await api.get("/pathways");
  return res.data;
}

export async function fetchStudents({ gradeId, term, pathway }) {
  const res = await api.get("/students", {
    params: { grade: gradeId, term, pathway },
  });
  return res.data;
}

export async function fetchSubjects(gradeId) {
  const res = await api.get("/subjects", {
    params: { grade: gradeId },
  });
  return res.data;
}
// pathways block
// 📋 Get all pathways (name, description, tracks)
export async function getAllPathways() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/pathways", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📄 Get pathway details by name (tracks + subjects)
export async function getPathwayDetailsByName(name) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/pathways/details/name/${name}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// ✏️ Update pathway by name
export async function updatePathwayByName(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put("/pathways/update/by-name", {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📥 Create a new pathway
export async function createPathway(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/pathways", {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// bulk pathways create 
export async function bulkCreatePathways(payloadArray) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/pathways/bulk-create", payloadArray, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 🗑️ Delete pathway by name
export async function deletePathway(pathwayName) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.delete(`/pathways/${pathwayName}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 🎯 Track Management
// 📋 Get all tracks
export async function getAllTracks() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/tracks", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📥 Create a new track
export async function createTrack(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/tracks", {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📦 Bulk create tracks
export async function bulkCreateTracks(payloadArray) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/tracks/bulk-create", payloadArray, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}


// ✏️ Update track by code
export async function updateTrackByCode(code, updates) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put(`/tracks/${code}`, {
    ...updates,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 🗑️ Delete track by code
export async function deleteTrackByCode(code) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.delete(`/tracks/${code}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📥 Create a single subject
export async function createSubject(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/subjects/create", {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📦 Bulk create subjects
export async function bulkCreateSubjects(payloadArray) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post("/subjects/bulk-create", payloadArray, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}


// ✅ Validate subject registry
export async function validateSubjectRegistry() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/subjects/validate/registry", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📄 Get all subjects
export async function getAllSubjects() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/subjects/all", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 🔧 Update subject by name
export async function updateSubjectByName(subjectName, updates) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put(`/subjects/update/${subjectName}`, {
    ...updates,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📦 Bulk update subjects
export async function bulkUpdateSubjects(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put("/subjects/bulk-update", {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// ❌ Delete subject by name
export async function deleteSubjectByName(name) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.delete(`/subjects/delete/${name}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// CBC Subject Selection Block

// 1. Get a student's currently selected subjects (summary)
export async function getSelectedSubjectsByAdmNo(admNo) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/subject-selection/student/admno/${admNo}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 2. Get possible elective subjects for student's pathway
export async function getStudentElectivesForPathway(admNo) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(
    `/subject-selection/student/admno/${admNo}/electives`,
    {
      params: {
        ...(schoolId && { schoolId }),
        ...(schoolCode && { schoolCode }),
      },
    }
  );
  return res.data;
}

// 3. Submit (select) subjects for a student
export async function selectSubjectsByAdmNo(admNo, payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post(`/subject-selection/student/select`, {
    admNo,
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 4. Update elective subjects for a student
export async function updateSelectedSubjectsByAdmNo(admNo, payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put(`/subject-selection/student/admno/${admNo}`, {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 5. Delete all elective subjects by admission number (keep compulsories)
export async function deleteSelectedSubjectsByAdmNo(admNo) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.delete(`/subject-selection/student/admno/${admNo}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 6. Validate CBC subject selections across all students (admin only)
export async function validateAllSubjectSelections() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/subject-selection/validate/cbc-subjects", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📄 Paper Configuration Management
// 📊 Get all paper configs
export async function getPaperConfigs() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/paper-configs", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📊 Get paper config by subject name
export async function getPaperConfigByName(subjectName, params = {}) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/paper-config/${subjectName}`, {
    params: {
      ...params,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📝 Set paper config by subject name
export async function setPaperConfigByName(subjectName, payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post(`/paper-config/${subjectName}`, {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// ✏️ Update paper config by subject name
export async function updatePaperConfigByName(subjectName, payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put(
    `/paper-config/${encodeURIComponent(subjectName)}`,
    {
      ...payload,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    }
  );
  return res.data;
}

// 🗑️ Delete paper config by subject name
export async function deletePaperConfigByName(subjectName, query) {
  const { schoolId, schoolCode } = getSchoolContext();
  const params = new URLSearchParams({
    ...query,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  }).toString();

  const res = await api.delete(
    `/paper-config/${encodeURIComponent(subjectName)}?${params}`
  );
  return res.data;
}
// // 📊 Get distinct exams for a term and year
export async function getExamsByTermYear(term, year) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/exams", {
    params: {
      term,
      year,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode })
    }
  });
  return res.data;
}


// 📚 Get subjects
export async function getSubjects() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/subjects/all", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 🎓 Get grades
export async function getGrades() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/classes/grades", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📅 Get academic years
export async function getYears() {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get("/years", {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// Assessement block 
// ✏️ Enter marks for multiple students (teacher/admin)
export async function enterMarks(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.post('/assessments/enter-marks', {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📝 Update marks for single/multiple student
export async function updateMarks(payload) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.put('/assessments/update-marks', {
    ...payload,
    ...(schoolId && { schoolId }),
    ...(schoolCode && { schoolCode }),
  });
  return res.data;
}

// 📝 Fetch assessments for students in a class for a specific subject, term, exam, year (new)
export async function fetchAssessments(params) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get('/assessments/fetch', {
    params: {
      ...params,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}
export async function generateReportForm(params) {
  const { schoolId, schoolCode } = getSchoolContext();
  // Remove exam from params for report generation aggregation
  const { _exam, ...filteredParams } = params;
  const res = await api.get('/assessments/reportform', {
    params: {
      ...filteredParams,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📄 Generate unified broadsheet (class or grade)
export async function generateBroadsheetUnified(params) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get('/assessments/broadsheet', {
    params: {
      ...params,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📦 Generate broadsheet ZIP bundle (multi-pathway export)
export async function generateBroadsheetBundle(params) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get('/assessments/broadsheet/bundle', {
    params: {
      ...params,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}


// 📊 Unified CBC Grade Distribution (JSON mode)
export async function getGradeDistributionUnified(level, term, year, exam) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/distribution/${level}/${term}/${year}/${exam}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📊 Unified CBC Grade Distribution (PDF mode)
export async function downloadGradeDistributionPDF(level, term, year, exam) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/distribution/${level}/${term}/${year}/${exam}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
      format: "pdf",
    },
    responseType: "blob",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
  return res.data; // Blob
}


// 📊 Unified CBC Class & Grade Ranking (JSON)
export async function rankGradeAndClasses(grade, term, year, exam) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/ranking/${grade}/${term}/${year}/${exam}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// 📊 Unified CBC Class & Grade Ranking (PDF)
export async function downloadRankingPDF(grade, term, year, exam) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/ranking/${grade}/${term}/${year}/${exam}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
      format: "pdf",
    },
    responseType: "blob",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
  return res.data; // PDF Blob
}

// 📊 Get Subject/Learning Area Ranking - JSON
export async function rankSubjectsAndLearningAreas(grade, term, year, exam, scope = "class") {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/learningarea/rank/${grade}/${term}/${year}/${exam}`, {
    params: {
      scope,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data; // .raw = [{...}]
}

// 📊 Download Subject/Learning Area Ranking as PDF
export async function downloadSubjectRankingPDF(grade, term, year, exam, scope = "class") {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/learningarea/rank/${grade}/${term}/${year}/${exam}`, {
    params: {
      format: "pdf",
      scope,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
    responseType: "blob",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
  return res.data; // Blob
}


// 🆕 Get assessment by admission number and subject name
export async function getAssessmentByAdmNo(admNo, subjectName) {
  const { schoolId, schoolCode } = getSchoolContext();
  const res = await api.get(`/assessments/by-adm/${admNo}/subject/${subjectName}`, {
    params: {
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
  });
  return res.data;
}

// Download report PDF, with same exam omission for aggregation
export async function downloadReportPDFApi(params) {
  const { schoolId, schoolCode } = getSchoolContext();

  // Remove exam param to aggregate all exams in term
  const {_exam, ...filteredParams } = params;
  const payload = { ...filteredParams, format: "pdf" };
  if (!payload.admNo) delete payload.admNo;
  if (!payload.className) delete payload.className;

  const res = await api.get("/assessments/reportform", {
    params: {
      ...payload,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
    responseType: "blob", // critical for PDF
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });

  return res.data; // Blob
}
// Download broadsheet PDF
export async function downloadBroadsheetPDFApi(params) {
  const { schoolId, schoolCode } = getSchoolContext();
  const payload = { ...params, format: "pdf" };
  if (!payload.className) delete payload.className;
  if (!payload.gradeName) delete payload.gradeName;
  if (!payload.pathway) delete payload.pathway;

  const res = await api.get("/assessments/broadsheet", {
    params: {
      ...payload,
      ...(schoolId && { schoolId }),
      ...(schoolCode && { schoolCode }),
    },
    responseType: "blob",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });

  return res.data; // Blob
}
// Admin Operations
// Trigger student promotion
export async function promoteStudentsApi() {
  const token = localStorage.getItem("token");
  const res = await api.post("/admin/trigger-promotion", {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function syncEnrollmentApi() {
  const token = localStorage.getItem("token");
  const res = await api.post("/admin/sync-enrollment", {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
// fee management
// ➕ Create a new payment (partial payments supported)
export async function createFeePayment(payload) {
  const token = localStorage.getItem("token");
  const res = await api.post("/fees/create", payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// 📄 Get latest receipt for a student by AdmNo
export async function getFeeReceiptByAdmNo(admNo) {
  const token = localStorage.getItem("token");
  const res = await api.get(`/fees/receipt/${admNo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// 📊 Get class fees list by class name
export async function getClassFeesListByName(className) {
  const token = localStorage.getItem("token");
  const res = await api.get(`/fees/class/${className}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
