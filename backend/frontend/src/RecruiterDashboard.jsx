
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterDashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function RecruiterDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
    shortlisted: 0,
    interviews: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  // ============================================================
  // LOAD RECRUITER USER
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      console.log("RECRUITER DASHBOARD USER:", parsedUser);

      if (parsedUser.role?.toLowerCase() !== "recruiter") {
        console.log("Access denied: User is not a recruiter.");
        navigate("/dashboard", { replace: true });
        return;
      }

      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error("Error reading user from localStorage:", error);

      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const recruiterId =
      user.user_id || user.id || user.userId || user.recruiter_id;

    if (!recruiterId) {
      console.error("Recruiter ID not found:", user);
      return;
    }

    const fetchDashboardData = async () => {
      setApplicationsLoading(true);

      try {
        const response = await fetch(
          `${API}/api/recruiter/applications/${encodeURIComponent(recruiterId)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load applications: ${response.status}`);
        }

        const data = await response.json();

        const applications = Array.isArray(data)
          ? data
          : data.applications || [];

        const normalizedApplications = applications.map((application) => ({
          ...application,
          status: (
            application.status ||
            application.application_status ||
            "Applied"
          ).toLowerCase()
        }));

        const jobsResponse = await fetch(
          `${API}/api/recruiter/jobs/${encodeURIComponent(recruiterId)}`
        );

        let jobs = [];

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json();
          jobs = Array.isArray(jobsData)
            ? jobsData
            : jobsData.jobs || [];
        } else {
          console.warn("Could not load recruiter jobs:", jobsResponse.status);
        }

        setStats({
          jobs: jobs.length,
          applications: normalizedApplications.length,
          shortlisted: normalizedApplications.filter((application) =>
            ["shortlisted", "interview", "selected"].includes(application.status)
          ).length,
          interviews: normalizedApplications.filter((application) =>
            application.status === "interview"
          ).length
        });

        setRecentApplications(
          [...normalizedApplications]
            .sort((a, b) => {
              const dateA = new Date(
                a.created_at || a.applied_at || 0
              ).getTime();

              const dateB = new Date(
                b.created_at || b.applied_at || 0
              ).getTime();

              return dateB - dateA;
            })
            .slice(0, 5)
        );
      } catch (error) {
        console.error("Error loading recruiter dashboard:", error);
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    console.log("RECRUITER LOGOUT");

    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("student_id");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("full_name");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");

    navigate("/login", { replace: true });
  };

  // ============================================================
  // NAVIGATION HANDLERS
  // ============================================================

  const handlePostJob = () => {
    navigate("/post-job");
  };

  const handleManageJobs = () => {
    navigate("/manage-jobs");
  };

  const handleApplications = () => {
    navigate("/recruiter-applications");
  };

  const handleShortlisted = () => {
    navigate("/shortlisted");
  };

  const handleInterviews = () => {
    navigate("/interviews");
  };

  const handleProfile = () => {
    navigate("/recruiter-profile");
  };

  const handleRecruiterSettings = () => {
    navigate("/recruiter-settings");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="recruiter-loading-page">
        <div className="recruiter-loader"></div>
        <p>Loading recruiter dashboard...</p>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="recruiter-dashboard-page">

      {/* SIDEBAR */}

      <aside className="recruiter-sidebar">

        <div
          className="recruiter-logo"
          onClick={() => navigate("/recruiter-dashboard")}
        >
          Electro<span>Hire</span>
        </div>

        <div className="recruiter-portal-label">
          RECRUITER PORTAL
        </div>

        <nav className="recruiter-navigation">

          <button
            className="recruiter-nav-item active"
            onClick={() => navigate("/recruiter-dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handleProfile}
          >
            <span className="nav-icon">👤</span>
            <span>My Profile</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handlePostJob}
          >
            <span className="nav-icon">＋</span>
            <span>Post Jobs</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handleManageJobs}
          >
            <span className="nav-icon">▤</span>
            <span>Manage Jobs</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handleApplications}
          >
            <span className="nav-icon">▣</span>
            <span>Applications</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handleShortlisted}
          >
            <span className="nav-icon">✓</span>
            <span>Shortlisted</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handleInterviews}
          >
            <span className="nav-icon">◷</span>
            <span>Interviews</span>
          </button>

          <button
            className="recruiter-nav-item"
            onClick={handleRecruiterSettings}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>

        </nav>

        <div className="recruiter-sidebar-bottom">
          <button
            className="recruiter-logout-button"
            onClick={handleLogout}
          >
            <span className="nav-icon">↪</span>
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="recruiter-main-content">

        {/* TOP BAR */}

        <header className="recruiter-topbar">

          <div>
            <p className="topbar-small-text">ElectroHire</p>
            <h1>Recruiter Dashboard</h1>
          </div>

          <div className="recruiter-user-info">

            <div className="recruiter-avatar">
              {user?.full_name
                ? user.full_name.charAt(0).toUpperCase()
                : "R"}
            </div>

            <div className="recruiter-user-details">
              <strong>{user?.full_name || "Recruiter"}</strong>
              <span>{user?.email || "Recruiter Account"}</span>
            </div>

          </div>

        </header>

        {/* WELCOME SECTION */}

        <section className="recruiter-welcome-card">

          <div className="welcome-content">
            <p className="welcome-label">WELCOME BACK</p>

            <h2>
              Hello, {user?.full_name || "Recruiter"}!
            </h2>

            <p>
              Find talented students and build your team with
              ElectroHire.
            </p>
          </div>

          <div className="welcome-badge">
            <span>●</span> Recruiter Account
          </div>

        </section>

        {/* STATISTICS */}

        <section className="recruiter-section">

          <div className="section-heading">
            <div>
              <h2>Overview</h2>
              <p>Your recruitment activity at a glance.</p>
            </div>
          </div>

          <div className="recruiter-stats-grid">

            <div
              className="recruiter-stat-card"
              onClick={handleManageJobs}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon jobs-icon">💼</div>

              <div className="stat-information">
                <span className="stat-title">Jobs Posted</span>
                <strong className="stat-number">{stats.jobs}</strong>
                <span className="stat-description">
                  Active job postings
                </span>
              </div>
            </div>

            <div
              className="recruiter-stat-card"
              onClick={handleApplications}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon applications-icon">📄</div>

              <div className="stat-information">
                <span className="stat-title">Applications</span>
                <strong className="stat-number">{stats.applications}</strong>
                <span className="stat-description">
                  Applications received
                </span>
              </div>
            </div>

            <div
              className="recruiter-stat-card"
              onClick={handleShortlisted}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon shortlisted-icon">✓</div>

              <div className="stat-information">
                <span className="stat-title">Shortlisted</span>
                <strong className="stat-number">{stats.shortlisted}</strong>
                <span className="stat-description">
                  Candidates shortlisted
                </span>
              </div>
            </div>

            <div
              className="recruiter-stat-card"
              onClick={handleInterviews}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon interviews-icon">◷</div>

              <div className="stat-information">
                <span className="stat-title">Interviews</span>
                <strong className="stat-number">{stats.interviews}</strong>
                <span className="stat-description">
                  Upcoming interviews
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* RECENT APPLICATIONS */}

        <section className="recruiter-section">

          <div className="section-heading">

            <div>
              <h2>Recent Applications</h2>
              <p>
                Review the latest candidates who applied for your jobs.
              </p>
            </div>

            <button
              className="view-all-button"
              onClick={handleApplications}
            >
              View All
            </button>

          </div>

          <div className="empty-applications-card">

            {applicationsLoading ? (
              <p>Loading recent applications...</p>
            ) : recentApplications.length > 0 ? (
              <div className="recent-applications-list">
                {recentApplications.map((application, index) => (
                  <div
                    className="recent-application-item"
                    key={application.application_id || application.id || index}
                  >
                    <div>
                      <h3>
                        {application.student_name ||
                          application.full_name ||
                          application.name ||
                          "Student"}
                      </h3>
                      <p>
                        {application.job_title ||
                          application.title ||
                          "Job Application"}
                      </p>
                      <span>
                        Status: {application.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="empty-applications-icon">📋</div>

                <h3>No Applications Yet</h3>

                <p>
                  Once you post a job, applications from students will
                  appear here.
                </p>

                <button
                  className="primary-action-button"
                  onClick={handlePostJob}
                >
                  Post Your First Job
                </button>
              </>
            )}

          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section className="recruiter-section">

          <div className="section-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Manage your recruitment activities.</p>
            </div>
          </div>

          <div className="quick-actions-grid">

            <button
              className="quick-action-card"
              onClick={handlePostJob}
            >
              <div className="quick-action-icon">＋</div>
              <div>
                <h3>Post a Job</h3>
                <p>Create a new job opportunity.</p>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={handleManageJobs}
            >
              <div className="quick-action-icon">▤</div>
              <div>
                <h3>Manage Jobs</h3>
                <p>View and manage your job postings.</p>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={handleApplications}
            >
              <div className="quick-action-icon">▣</div>
              <div>
                <h3>Applications</h3>
                <p>Review student applications.</p>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={handleShortlisted}
            >
              <div className="quick-action-icon">✓</div>
              <div>
                <h3>Shortlisted</h3>
                <p>View shortlisted candidates.</p>
              </div>
            </button>

            <button
              className="quick-action-card"
              onClick={handleInterviews}
            >
              <div className="quick-action-icon">◷</div>
              <div>
                <h3>Interviews</h3>
                <p>Schedule and manage candidate interviews.</p>
              </div>
            </button>

          </div>
        </section>

        {/* INFORMATION CARD */}

        <section className="recruiter-info-card">

          <div className="info-icon">💡</div>

          <div className="info-content">
            <h3>Build Your Recruitment Pipeline</h3>

            <p>
              Start by posting a job opportunity. ElectroHire will
              help you discover students based on their skills,
              projects, resumes and assessment performance.
              After shortlisting candidates, you can schedule
              interviews directly from the Interviews section.
            </p>
          </div>

        </section>

      </main>
    </div>
  );
}

export default RecruiterDashboard;
