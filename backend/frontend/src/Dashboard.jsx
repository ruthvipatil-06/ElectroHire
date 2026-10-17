import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        navigate("/login");
        return;
      }

      const userData = JSON.parse(savedUser);

      setUser(userData);

      if (!userData.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:8000/api/profile/${encodeURIComponent(
            userData.email
          )}`
        );

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        } else {
          console.log("Profile could not be loaded.");
        }
      } catch (error) {
        console.log("Profile API error:", error);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
      localStorage.removeItem("user");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const getUserName = () => {
    if (profile?.full_name) {
      return profile.full_name;
    }

    if (user?.full_name) {
      return user.full_name;
    }

    if (user?.name) {
      return user.name;
    }

    return "Student";
  };

  const getEmail = () => {
    if (profile?.email) {
      return profile.email;
    }

    return user?.email || "";
  };

  const getInitial = () => {
    const name = getUserName();

    if (!name) {
      return "S";
    }

    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* ================= SIDEBAR ================= */}

      <aside className="dashboard-sidebar">

        <div className="sidebar-logo">
          Electro<span>Hire</span>
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {getInitial()}
          </div>

          <div className="sidebar-user-info">
            <h3>{getUserName()}</h3>
            <p>{user?.role || "Student"}</p>
          </div>
        </div>

        <nav className="sidebar-nav">

          {/* Dashboard */}

          <button
            className="sidebar-nav-item active"
            onClick={() => navigate("/dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          {/* My Profile */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/my-profile")}
          >
            <span className="nav-icon">👤</span>
            <span>My Profile</span>
          </button>

          {/* Skills */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/skills")}
          >
            <span className="nav-icon">◆</span>
            <span>Skills</span>
          </button>

          {/* Projects */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/projects")}
          >
            <span className="nav-icon">▣</span>
            <span>Projects</span>
          </button>

          {/* Certificates */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/certificates")}
          >
            <span className="nav-icon">◇</span>
            <span>Certificates</span>
          </button>

          {/* Resume */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/resume")}
          >
            <span className="nav-icon">▤</span>
            <span>Resume</span>
          </button>

          {/* ================= ASSESSMENT ================= */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/assessment")}
          >
            <span className="nav-icon">📝</span>
            <span>Assessment</span>
          </button>

          <div className="sidebar-divider"></div>

          {/* Find Jobs */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/find-jobs")}
          >
            <span className="nav-icon">⌕</span>
            <span>Find Jobs</span>
          </button>

          {/* Applications */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/applications")}
          >
            <span className="nav-icon">✓</span>
            <span>Applications</span>
          </button>

          {/* Settings */}

          <button
            className="sidebar-nav-item"
            onClick={() => navigate("/settings")}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>

        </nav>

        {/* Logout */}

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>


      {/* ================= MAIN CONTENT ================= */}

      <main className="dashboard-main">

        {/* TOP BAR */}

        <header className="dashboard-topbar">

          <div>
            <h1>Dashboard</h1>

            <p>
              Welcome back, {getUserName()}!
            </p>
          </div>

          <div className="topbar-user">

            <div className="topbar-avatar">
              {getInitial()}
            </div>

            <div>
              <strong>{getUserName()}</strong>
              <span>{getEmail()}</span>
            </div>

          </div>

        </header>


        {/* ================= WELCOME CARD ================= */}

        <section className="welcome-card">

          <div className="welcome-content">

            <span className="welcome-badge">
              Your Career. Your Future.
            </span>

            <h2>
              Build Your Career With
              <span> ElectroHire</span>
            </h2>

            <p>
              Manage your professional profile, showcase your
              skills and projects, complete your assessment,
              and discover career opportunities.
            </p>

            <button
              className="primary-button"
              onClick={() => navigate("/my-profile")}
            >
              Complete Your Profile →
            </button>

          </div>

          <div className="welcome-visual">

            <div className="welcome-circle">
              EH
            </div>

          </div>

        </section>


        {/* ================= STAT CARDS ================= */}

        <section className="stats-grid">

          {/* Profile */}

          <div className="stat-card">

            <div className="stat-icon blue-icon">
              👤
            </div>

            <div>
              <p>Profile</p>
              <h3>My Profile</h3>
            </div>

            <button
              onClick={() => navigate("/my-profile")}
            >
              →
            </button>

          </div>


          {/* Skills */}

          <div className="stat-card">

            <div className="stat-icon purple-icon">
              ◆
            </div>

            <div>
              <p>Skills</p>
              <h3>My Skills</h3>
            </div>

            <button
              onClick={() => navigate("/skills")}
            >
              →
            </button>

          </div>


          {/* Projects */}

          <div className="stat-card">

            <div className="stat-icon green-icon">
              ▣
            </div>

            <div>
              <p>Projects</p>
              <h3>My Projects</h3>
            </div>

            <button
              onClick={() => navigate("/projects")}
            >
              →
            </button>

          </div>


          {/* Assessment */}

          <div className="stat-card">

            <div className="stat-icon orange-icon">
              📝
            </div>

            <div>
              <p>Assessment</p>
              <h3>Skill Assessment</h3>
            </div>

            <button
              onClick={() => navigate("/assessment")}
            >
              →
            </button>

          </div>

        </section>


        {/* ================= LOWER CONTENT ================= */}

        <section className="dashboard-grid">

          {/* PROFILE COMPLETION */}

          <div className="dashboard-card">

            <div className="card-header">

              <div>

                <h2>
                  Complete Your Profile
                </h2>

                <p>
                  Build a strong profile to improve your
                  career opportunities.
                </p>

              </div>

              <span className="percentage">
                60%
              </span>

            </div>


            <div className="progress-container">

              <div
                className="progress-bar"
                style={{ width: "60%" }}
              ></div>

            </div>


            <div className="profile-checklist">

              <div className="check-item completed">
                <span>✓</span>
                <p>Basic Information</p>
              </div>

              <div className="check-item">
                <span>○</span>
                <p>Add Skills</p>
              </div>

              <div className="check-item">
                <span>○</span>
                <p>Add Projects</p>
              </div>

              <div className="check-item">
                <span>○</span>
                <p>Upload Resume</p>
              </div>

              <div className="check-item">
                <span>○</span>
                <p>Complete Assessment</p>
              </div>

            </div>


            <button
              className="secondary-button"
              onClick={() => navigate("/my-profile")}
            >
              Complete Profile
            </button>

          </div>


          {/* ================= QUICK ACTIONS ================= */}

          <div className="dashboard-card">

            <div className="card-header">

              <div>

                <h2>
                  Quick Actions
                </h2>

                <p>
                  Quickly access important features.
                </p>

              </div>

            </div>


            <div className="quick-actions">

              {/* Add Skills */}

              <button
                onClick={() => navigate("/skills")}
              >

                <span className="quick-icon">
                  ◆
                </span>

                <div>

                  <strong>
                    Add Skills
                  </strong>

                  <small>
                    Showcase your technical skills
                  </small>

                </div>

                <span>→</span>

              </button>


              {/* Add Project */}

              <button
                onClick={() => navigate("/projects")}
              >

                <span className="quick-icon">
                  ▣
                </span>

                <div>

                  <strong>
                    Add Project
                  </strong>

                  <small>
                    Showcase your work
                  </small>

                </div>

                <span>→</span>

              </button>


              {/* Upload Resume */}

              <button
                onClick={() => navigate("/resume")}
              >

                <span className="quick-icon">
                  ▤
                </span>

                <div>

                  <strong>
                    Upload Resume
                  </strong>

                  <small>
                    Keep your resume updated
                  </small>

                </div>

                <span>→</span>

              </button>


              {/* Assessment */}

              <button
                onClick={() => navigate("/assessment")}
              >

                <span className="quick-icon">
                  📝
                </span>

                <div>

                  <strong>
                    Take Assessment
                  </strong>

                  <small>
                    Test your technical skills
                  </small>

                </div>

                <span>→</span>

              </button>


              {/* Find Jobs */}

              <button
                onClick={() => navigate("/find-jobs")}
              >

                <span className="quick-icon">
                  ⌕
                </span>

                <div>

                  <strong>
                    Find Jobs
                  </strong>

                  <small>
                    Explore career opportunities
                  </small>

                </div>

                <span>→</span>

              </button>

            </div>

          </div>

        </section>


        {/* ================= CAREER JOURNEY ================= */}

        <section className="dashboard-card career-card">

          <div className="card-header">

            <div>

              <h2>
                Your Career Journey
              </h2>

              <p>
                Keep building your profile step by step.
              </p>

            </div>

          </div>


          <div className="journey">

            {/* Step 1 */}

            <div className="journey-step completed-step">

              <div className="journey-circle">
                ✓
              </div>

              <div>

                <h3>
                  Create Account
                </h3>

                <p>
                  Your ElectroHire account is ready.
                </p>

              </div>

            </div>


            <div className="journey-line"></div>


            {/* Step 2 */}

            <div className="journey-step">

              <div className="journey-circle">
                2
              </div>

              <div>

                <h3>
                  Build Profile
                </h3>

                <p>
                  Add your academic and professional
                  information.
                </p>

              </div>

            </div>


            <div className="journey-line"></div>


            {/* Step 3 */}

            <div className="journey-step">

              <div className="journey-circle">
                3
              </div>

              <div>

                <h3>
                  Showcase Skills
                </h3>

                <p>
                  Add your technical and soft skills.
                </p>

              </div>

            </div>


            <div className="journey-line"></div>


            {/* Step 4 - Assessment */}

            <div className="journey-step">

              <div className="journey-circle">
                4
              </div>

              <div>

                <h3>
                  Complete Assessment
                </h3>

                <p>
                  Take a personalized skill assessment.
                </p>

              </div>

            </div>


            <div className="journey-line"></div>


            {/* Step 5 */}

            <div className="journey-step">

              <div className="journey-circle">
                5
              </div>

              <div>

                <h3>
                  Find Opportunities
                </h3>

                <p>
                  Discover jobs and internships.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ================= PROFILE SUMMARY ================= */}

        <section className="dashboard-card profile-summary">

          <div className="card-header">

            <div>

              <h2>
                Profile Summary
              </h2>

              <p>
                Your current ElectroHire account information.
              </p>

            </div>

            <button
              className="text-button"
              onClick={() => navigate("/my-profile")}
            >
              View Profile →
            </button>

          </div>


          <div className="summary-grid">

            <div className="summary-item">

              <span>Name</span>

              <strong>
                {getUserName()}
              </strong>

            </div>


            <div className="summary-item">

              <span>Email</span>

              <strong>
                {getEmail() || "Not available"}
              </strong>

            </div>


            <div className="summary-item">

              <span>Role</span>

              <strong>
                {user?.role || "Student"}
              </strong>

            </div>


            <div className="summary-item">

              <span>Profile Status</span>

              <strong className="status-text">
                Active
              </strong>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;