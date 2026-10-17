import React from "react";
import { useNavigate } from "react-router-dom";
import "./Assessment.css";

function Assessment() {
  const navigate = useNavigate();

  // ============================================================
  // GET LOGGED-IN USER
  // ============================================================

  const getUserData = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return {};
      }

      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Unable to read user data:", error);
      return {};
    }
  };

  const userData = getUserData();

  // ============================================================
  // GET USER ID
  // ============================================================

  const getUserId = () => {
    const storedUserId =
      userData.user_id ||
      userData.id ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("userId");

    if (!storedUserId) {
      return null;
    }

    const numericUserId = Number(storedUserId);

    return Number.isNaN(numericUserId) ? null : numericUserId;
  };

  // ============================================================
  // GET USER NAME
  // ============================================================

  const getUserName = () => {
    return (
      userData.full_name ||
      userData.name ||
      userData.username ||
      "Student"
    );
  };

  // ============================================================
  // GET USER INITIAL
  // ============================================================

  const getInitial = () => {
    const name = getUserName().trim();

    if (!name) {
      return "S";
    }

    return name.charAt(0).toUpperCase();
  };

  // ============================================================
  // START ASSESSMENT
  // ============================================================

  const startAssessment = () => {
    const userId = getUserId();

    if (!userId) {
      alert("User information is missing. Please login again.");
      navigate("/login");
      return;
    }

    // Save user ID for the next assessment pages
    localStorage.setItem("user_id", String(userId));

    // Go to profile/assessment checking page
    navigate("/assessment-check");
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("userId");
    localStorage.removeItem("student_id");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");

    navigate("/login");
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const goTo = (path) => {
    navigate(path);
  };

  // ============================================================
  // JSX
  // ============================================================

  return (
    <div className="assessment-page">

      {/* ========================================================
          SIDEBAR
          ======================================================== */}

      <aside className="assessment-sidebar">

        {/* LOGO */}
        <div className="assessment-logo">
          Electro<span>Hire</span>
        </div>

        {/* NAVIGATION */}
        <nav className="assessment-nav">

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/my-profile")}
          >
            <span className="nav-icon">👤</span>
            <span>My Profile</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/skills")}
          >
            <span className="nav-icon">⚡</span>
            <span>Skills</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/projects")}
          >
            <span className="nav-icon">📁</span>
            <span>Projects</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/certificates")}
          >
            <span className="nav-icon">🏆</span>
            <span>Certificates</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/resume")}
          >
            <span className="nav-icon">📄</span>
            <span>Resume</span>
          </button>

          {/* ACTIVE */}
          <button
            type="button"
            className="assessment-nav-item active"
            onClick={() => goTo("/assessment")}
          >
            <span className="nav-icon">📝</span>
            <span>Assessment</span>
          </button>

          <div className="assessment-divider"></div>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/find-jobs")}
          >
            <span className="nav-icon">💼</span>
            <span>Find Jobs</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/applications")}
          >
            <span className="nav-icon">📋</span>
            <span>Applications</span>
          </button>

          <button
            type="button"
            className="assessment-nav-item"
            onClick={() => goTo("/settings")}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>
        </nav>

        {/* LOGOUT */}
        <button
          type="button"
          className="assessment-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* ========================================================
          MAIN CONTENT
          ======================================================== */}

      <main className="assessment-main">

        {/* ======================================================
            TOP BAR
            ====================================================== */}

        <header className="assessment-topbar">

          <div className="assessment-heading">
            <h1>Assessment</h1>

            <p>
              Test your technical skills with a personalized
              assessment.
            </p>
          </div>

          {/* USER */}
          <div className="assessment-user">

            <div className="assessment-user-avatar">
              {getInitial()}
            </div>

            <div className="assessment-user-details">
              <strong>{getUserName()}</strong>

              <span>
                AI Skill Assessment
              </span>
            </div>

          </div>
        </header>

        {/* ======================================================
            HERO
            ====================================================== */}

        <section className="assessment-hero">

          {/* ICON */}
          <div className="assessment-icon">
            🧠
          </div>

          {/* BADGE */}
          <div className="assessment-badge">
            AI-Powered Skill Assessment
          </div>

          {/* HEADING */}
          <h2>
            Discover Your
            <span> Technical Skills</span>
          </h2>

          {/* DESCRIPTION */}
          <p className="assessment-description">
            ElectroHire creates a personalized assessment
            based on your profile, skills, projects,
            certificates, and resume.
          </p>

          {/* ====================================================
              INFORMATION CARDS
              ==================================================== */}

          <div className="assessment-info-grid">

            {/* PERSONALIZED */}
            <div className="assessment-info-card">

              <div className="info-card-icon">
                👤
              </div>

              <div>
                <h3>Personalized</h3>

                <p>
                  Questions will be generated according
                  to your profile and experience.
                </p>
              </div>

            </div>

            {/* SKILL BASED */}
            <div className="assessment-info-card">

              <div className="info-card-icon">
                ⚡
              </div>

              <div>
                <h3>Skill Based</h3>

                <p>
                  Your assessment focuses on the skills
                  you have added to your profile.
                </p>
              </div>

            </div>

            {/* DETAILED ANALYSIS */}
            <div className="assessment-info-card">

              <div className="info-card-icon">
                🎯
              </div>

              <div>
                <h3>Detailed Analysis</h3>

                <p>
                  Receive skill-wise scores and identify
                  areas where you can improve.
                </p>
              </div>

            </div>

          </div>

          {/* ====================================================
              HOW ASSESSMENT WORKS
              ==================================================== */}

          <div className="assessment-process">

            <div className="process-heading">

              <h3>
                How Your Assessment Works
              </h3>

              <p>
                Follow these steps to complete your assessment.
              </p>

            </div>

            <div className="process-container">

              {/* STEP 1 */}
              <div className="process-step">

                <div className="process-number active">
                  1
                </div>

                <div className="process-content">

                  <h4>
                    Check Profile
                  </h4>

                  <p>
                    Verify your profile information.
                  </p>

                </div>

              </div>

              {/* STEP 2 */}
              <div className="process-step">

                <div className="process-number">
                  2
                </div>

                <div className="process-content">

                  <h4>
                    Check Skills
                  </h4>

                  <p>
                    Analyze your technical skills.
                  </p>

                </div>

              </div>

              {/* STEP 3 */}
              <div className="process-step">

                <div className="process-number">
                  3
                </div>

                <div className="process-content">

                  <h4>
                    Generate Questions
                  </h4>

                  <p>
                    Create personalized questions.
                  </p>

                </div>

              </div>

              {/* STEP 4 */}
              <div className="process-step">

                <div className="process-number">
                  4
                </div>

                <div className="process-content">

                  <h4>
                    Take Assessment
                  </h4>

                  <p>
                    Answer questions with monitoring.
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ====================================================
              ASSESSMENT JOURNEY
              ==================================================== */}

          <div className="assessment-journey">

            <h3>
              Assessment Journey
            </h3>

            <div className="journey-list">

              {/* 1 */}
              <div className="journey-item current">

                <div className="journey-icon">
                  1
                </div>

                <div>
                  <strong>
                    Check Profile
                  </strong>

                  <span>
                    Make sure your profile information
                    is complete.
                  </span>
                </div>

              </div>

              {/* 2 */}
              <div className="journey-item">

                <div className="journey-icon">
                  2
                </div>

                <div>
                  <strong>
                    Check Skills
                  </strong>

                  <span>
                    Review your technical skills.
                  </span>
                </div>

              </div>

              {/* 3 */}
              <div className="journey-item">

                <div className="journey-icon">
                  3
                </div>

                <div>
                  <strong>
                    Check Projects
                  </strong>

                  <span>
                    Review projects added to your
                    profile.
                  </span>
                </div>

              </div>

              {/* 4 */}
              <div className="journey-item">

                <div className="journey-icon">
                  4
                </div>

                <div>
                  <strong>
                    Check Resume
                  </strong>

                  <span>
                    Verify your uploaded resume.
                  </span>
                </div>

              </div>

              {/* 5 */}
              <div className="journey-item">

                <div className="journey-icon">
                  5
                </div>

                <div>
                  <strong>
                    Personalized Questions
                  </strong>

                  <span>
                    Generate questions according
                    to your profile.
                  </span>
                </div>

              </div>

              {/* 6 */}
              <div className="journey-item">

                <div className="journey-icon">
                  6
                </div>

                <div>
                  <strong>
                    Camera Permission
                  </strong>

                  <span>
                    Enable camera access before
                    starting the test.
                  </span>
                </div>

              </div>

              {/* 7 */}
              <div className="journey-item">

                <div className="journey-icon">
                  7
                </div>

                <div>
                  <strong>
                    Start Test
                  </strong>

                  <span>
                    Begin your technical assessment.
                  </span>
                </div>

              </div>

              {/* 8 */}
              <div className="journey-item">

                <div className="journey-icon">
                  8
                </div>

                <div>
                  <strong>
                    AI Evaluation
                  </strong>

                  <span>
                    Analyze your answers and
                    calculate your scores.
                  </span>
                </div>

              </div>

              {/* 9 */}
              <div className="journey-item">

                <div className="journey-icon">
                  9
                </div>

                <div>
                  <strong>
                    Assessment Result
                  </strong>

                  <span>
                    View your skill-wise performance
                    and skill gaps.
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* ====================================================
              START ASSESSMENT
              ==================================================== */}

          <div className="assessment-start-section">

            <div className="start-content">

              <h3>
                Ready to test your skills?
              </h3>

              <p>
                Before the test begins, ElectroHire will
                check your profile, skills, projects,
                certificates and resume.
              </p>

            </div>

            <button
              type="button"
              className="start-assessment-button"
              onClick={startAssessment}
            >
              <span>
                Start Assessment
              </span>

              <span className="start-arrow">
                →
              </span>
            </button>

          </div>

        </section>
      </main>
    </div>
  );
}

export default Assessment;