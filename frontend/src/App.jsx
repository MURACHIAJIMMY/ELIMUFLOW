import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Schools from "./pages/Schools";
import Teacher from "./pages/Teacher";
import Class from "./pages/Class";
import Students from "./pages/Students";
import Pathways from "./pages/Pathways";
import Track from "./pages/Track"; // ✅ CBC-aligned track module
import Subjects from "./pages/Subjects";
import SubjectSelection from "./pages/SubjectSelection";
import PaperConfig from "./pages/PaperConfig";
import Assessments from "./pages/Assessment";
import Promotions from "./pages/Promotion";
import Fee from "./pages/Fee";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/schools" element={<Schools />} />
        <Route path="/teacher-management" element={<Teacher />} />
        <Route path="/classes" element={<Class />} />
        <Route path="/students" element={<Students />} />
        <Route path="/pathways" element={<Pathways />} />
        <Route path="/tracks" element={<Track />} /> 
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subject-selection" element={<SubjectSelection />} />
        <Route path="/paper-config" element={<PaperConfig />} /> 
        <Route path="/Assessments" element={<Assessments/>}/>
        <Route path="/admin/promotions" element={<Promotions />} />
        <Route path="/fee-management" element={<Fee />} />
        {/* <Route path="/grades" element={<Grades />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
