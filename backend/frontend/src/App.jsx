
import React from "react";
import { Routes, Route } from "react-router-dom";

// ============================================================
// HOME
// ============================================================
import Home from "./Home";

// ============================================================
// AUTHENTICATION
// ============================================================
import Login from "./Login";
import Register from "./Register";

// ============================================================
// STUDENT DASHBOARD
// ============================================================
import Dashboard from "./Dashboard";
import MyProfile from "./MyProfile";
import Skills from "./Skills";
import Projects from "./Projects";
import Certificates from "./Certificates";
import Resume from "./Resume";
import Settings from "./Settings";

// ============================================================
// RECRUITER DASHBOARD
// ============================================================
import RecruiterDashboard from "./RecruiterDashboard";
import RecruiterProfile from "./RecruiterProfile";
import PostJob from "./PostJob";
import ManageJobs from "./ManageJobs";
import RecruiterApplications from "./RecruiterApplications";
import Shortlisted from "./Shortlisted";
import Interviews from "./Interviews";
import RecruiterSettings from "./RecruiterSettings";

// ============================================================
// ASSESSMENT
// ============================================================
import Assessment from "./Assessment";
import AssessmentCheck from "./AssessmentCheck";
import CameraPermission from "./CameraPermission";
import Test from "./Test";
import AssessmentResult from "./AssessmentResult";

// ============================================================
// CHATBOT
// ============================================================
import Chatbot from "./Chatbot";

// ============================================================
// JOBS & STUDENT APPLICATIONS
// ============================================================
import FindJobs from "./FindJobs";
import Applications from "./Applications";

// ============================================================
// APP
// ============================================================
function App() {
  return (
    <>
      <Routes>
        {/* =====================================================
            HOME
        ====================================================== */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* =====================================================
            AUTHENTICATION
        ====================================================== */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* =====================================================
            STUDENT DASHBOARD
        ====================================================== */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/my-profile"
          element={<MyProfile />}
        />

        <Route
          path="/skills"
          element={<Skills />}
        />

        <Route
          path="/projects"
          element={<Projects />}
        />

        <Route
          path="/certificates"
          element={<Certificates />}
        />

        <Route
          path="/resume"
          element={<Resume />}
        />

        {/* Student Settings */}
        <Route
          path="/settings"
          element={<Settings />}
        />

        {/* =====================================================
            RECRUITER DASHBOARD
        ====================================================== */}
        <Route
          path="/recruiter-dashboard"
          element={<RecruiterDashboard />}
        />

        {/* =====================================================
            RECRUITER PROFILE
        ====================================================== */}
        <Route
          path="/recruiter-profile"
          element={<RecruiterProfile />}
        />

        {/* =====================================================
            POST JOB
        ====================================================== */}
        <Route
          path="/post-job"
          element={<PostJob />}
        />

        {/* =====================================================
            MANAGE JOBS
        ====================================================== */}
        <Route
          path="/manage-jobs"
          element={<ManageJobs />}
        />

        {/* =====================================================
            RECRUITER APPLICATIONS
        ====================================================== */}
        <Route
          path="/recruiter-applications"
          element={<RecruiterApplications />}
        />

        {/* =====================================================
            SHORTLISTED STUDENTS
        ====================================================== */}
        <Route
          path="/shortlisted"
          element={<Shortlisted />}
        />

        {/* =====================================================
            RECRUITER INTERVIEWS
        ====================================================== */}
        <Route
          path="/interviews"
          element={<Interviews />}
        />

        {/* =====================================================
            RECRUITER SETTINGS
        ====================================================== */}
        <Route
          path="/recruiter-settings"
          element={<RecruiterSettings />}
        />

        {/* =====================================================
            ASSESSMENT
        ====================================================== */}
        <Route
          path="/assessment"
          element={<Assessment />}
        />

        <Route
          path="/assessment-check"
          element={<AssessmentCheck />}
        />

        <Route
          path="/camera-permission"
          element={<CameraPermission />}
        />

        <Route
          path="/test"
          element={<Test />}
        />

        <Route
          path="/assessment-result"
          element={<AssessmentResult />}
        />

        {/* =====================================================
            FIND JOBS
        ====================================================== */}
        <Route
          path="/find-jobs"
          element={<FindJobs />}
        />

        {/* =====================================================
            STUDENT APPLICATIONS
        ====================================================== */}
        <Route
          path="/applications"
          element={<Applications />}
        />

        {/* =====================================================
            FALLBACK
        ====================================================== */}
        <Route
          path="*"
          element={<Home />}
        />
      </Routes>

      {/* ========================================================
          ELECTROHIRE CHATBOT
          Available throughout the application.
      ========================================================= */}
      <Chatbot />
    </>
  );
}

export default App;