import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API = "http://localhost:8000";

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["data", "items", "results", "skills", "projects", "certificates", "resumes", "applications"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState({ skills: [], projects: [], certificates: [], resumes: [], assessments: [], applications: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const saved = localStorage.getItem("user");
      if (!saved) { navigate("/login"); return; }
      const currentUser = JSON.parse(saved);
      setUser(currentUser);
      const userId = currentUser.user_id ?? currentUser.userId ?? currentUser.id ?? currentUser.student_id;
      if (userId == null || userId === "") {
        setError("Your account ID is missing. Please log out and log in again.");
        return;
      }
      const id = encodeURIComponent(String(userId));
      const endpoints = {
        profile: `/api/profile/${id}`,
        skills: `/api/student-skills/${id}`,
        projects: `/api/projects/${id}`,
        certificates: `/api/certificates/${id}`,
        resumes: `/api/resumes/${id}`,
        assessments: `/api/assessments/results/${id}`,
        applications: `/api/applications/${id}`,
      };
      const entries = await Promise.all(Object.entries(endpoints).map(async ([key, path]) => {
        try {
          const response = await fetch(`${API}${path}`);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          return [key, await response.json(), null];
        } catch (err) {
          console.error(`Dashboard ${key} request failed:`, err);
          return [key, null, err];
        }
      }));
      const values = Object.fromEntries(entries.map(([key, value]) => [key, value]));
      const profileValue = values.profile?.profile && typeof values.profile.profile === "object" ? values.profile.profile : values.profile;
      if (profileValue && typeof profileValue === "object") setProfile(profileValue);
      setRecords({
        skills: toArray(values.skills),
        projects: toArray(values.projects),
        certificates: toArray(values.certificates),
        resumes: toArray(values.resumes),
        assessments: toArray(values.assessments),
        applications: toArray(values.applications),
      });
      const failures = entries.filter(([, , err]) => err).map(([key]) => key);
      if (failures.length) setError(`Some dashboard data could not be loaded (${failures.join(", ")}). Check the API responses in the browser console.`);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Could not load dashboard data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const userName = profile?.full_name || profile?.name || user?.full_name || user?.name || "Student";
  const email = profile?.email || user?.email || "";
  const initial = userName.charAt(0).toUpperCase() || "S";
  const basicComplete = Boolean((profile?.full_name || profile?.name || user?.full_name || user?.name) && email && profile?.college && profile?.degree && profile?.branch);
  const checks = [
    { label: "Basic Information", done: basicComplete, path: "/my-profile" },
    { label: "Add Skills", done: records.skills.length > 0, path: "/skills" },
    { label: "Add Projects", done: records.projects.length > 0, path: "/projects" },
    { label: "Upload Resume", done: records.resumes.length > 0, path: "/resume" },
    { label: "Add Certificates", done: records.certificates.length > 0, path: "/certificates" },
    { label: "Complete Assessment", done: records.assessments.length > 0, path: "/assessment" },
  ];
  const completion = Math.round(checks.filter((item) => item.done).length / checks.length * 100);
  const careerSteps = [
    { title: "Create Account", description: "Your ElectroHire account is ready.", done: true, path: "/dashboard" },
    { title: "Build Profile", description: "Add your academic and professional information.", done: basicComplete, path: "/my-profile" },
    { title: "Showcase Skills", description: "Add your technical skills and projects.", done: records.skills.length > 0 && records.projects.length > 0, path: "/skills" },
    { title: "Complete Assessment", description: "Take a personalized skill assessment.", done: records.assessments.length > 0, path: "/assessment" },
    { title: "Find Opportunities", description: "Discover jobs and internships.", done: records.applications.length > 0, path: "/find-jobs" },
  ];

  if (loading) return <div className="dashboard-loading"><div className="loading-spinner" /><p>Loading Dashboard...</p></div>;

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">Electro<span>Hire</span></div>
        <div className="sidebar-profile"><div className="sidebar-avatar">{initial}</div><div className="sidebar-user-info"><h3>{userName}</h3><p>{user?.role || "Student"}</p></div></div>
        <nav className="sidebar-nav">
          <button className="sidebar-nav-item active" onClick={() => navigate("/dashboard")}><span className="nav-icon">⌂</span><span>Dashboard</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/my-profile")}><span className="nav-icon">👤</span><span>My Profile</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/skills")}><span className="nav-icon">◆</span><span>Skills</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/projects")}><span className="nav-icon">▣</span><span>Projects</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/certificates")}><span className="nav-icon">◇</span><span>Certificates</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/resume")}><span className="nav-icon">▤</span><span>Resume</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/assessment")}><span className="nav-icon">📝</span><span>Assessment</span></button>
          <div className="sidebar-divider" />
          <button className="sidebar-nav-item" onClick={() => navigate("/find-jobs")}><span className="nav-icon">⌕</span><span>Find Jobs</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/applications")}><span className="nav-icon">✓</span><span>Applications</span></button>
          <button className="sidebar-nav-item" onClick={() => navigate("/settings")}><span className="nav-icon">⚙</span><span>Settings</span></button>
        </nav>
        <button className="logout-button" onClick={handleLogout}><span>↪</span>Logout</button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar"><div><h1>Dashboard</h1><p>Welcome back, {userName}!</p></div><div className="topbar-user"><div className="topbar-avatar">{initial}</div><div><strong>{userName}</strong><span>{email}</span></div></div></header>
        {error && <div className="dashboard-error" role="alert"><span>{error}</span><button onClick={loadDashboard}>Retry</button></div>}

        <section className="welcome-card"><div className="welcome-content"><span className="welcome-badge">Your Career. Your Future.</span><h2>Build Your Career With <span>ElectroHire</span></h2><p>Manage your professional profile, showcase your skills and projects, complete your assessment, and discover career opportunities.</p><button className="primary-button" onClick={() => navigate("/my-profile")}>Complete Your Profile →</button></div><div className="welcome-visual"><div className="welcome-circle">EH</div></div></section>

        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue-icon">👤</div><div className="stat-info"><p>Profile Completion</p><h3>{completion}%</h3></div><button aria-label="Open profile" onClick={() => navigate("/my-profile")}>→</button></div>
          <div className="stat-card"><div className="stat-icon purple-icon">◆</div><div className="stat-info"><p>Skills Added</p><h3>{records.skills.length}</h3></div><button aria-label="Open skills" onClick={() => navigate("/skills")}>→</button></div>
          <div className="stat-card"><div className="stat-icon green-icon">▣</div><div className="stat-info"><p>Projects Added</p><h3>{records.projects.length}</h3></div><button aria-label="Open projects" onClick={() => navigate("/projects")}>→</button></div>
          <div className="stat-card"><div className="stat-icon orange-icon">📝</div><div className="stat-info"><p>Assessments</p><h3>{records.assessments.length}</h3></div><button aria-label="Open assessment" onClick={() => navigate("/assessment")}>→</button></div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card"><div className="card-header"><div><h2>Complete Your Profile</h2><p>Build a strong profile to improve your career opportunities.</p></div><span className="percentage">{completion}%</span></div><div className="progress-container"><div className="progress-bar" style={{ width: `${completion}%` }} /></div><div className="profile-checklist">{checks.map((item) => <button type="button" key={item.label} className={`check-item ${item.done ? "completed" : ""}`} onClick={() => navigate(item.path)}><span>{item.done ? "✓" : "○"}</span><p>{item.label}</p></button>)}</div><button className="secondary-button" onClick={() => navigate(checks.find((item) => !item.done)?.path || "/my-profile")}>{completion === 100 ? "View Profile" : "Complete Next Step"}</button></div>
          <div className="dashboard-card"><div className="card-header"><div><h2>Quick Actions</h2><p>Quickly access important features.</p></div></div><div className="quick-actions">
            <button onClick={() => navigate("/skills")}><span className="quick-icon">◆</span><div><strong>Add Skills</strong><small>{records.skills.length} skill(s) added</small></div><span>→</span></button>
            <button onClick={() => navigate("/projects")}><span className="quick-icon">▣</span><div><strong>Add Project</strong><small>{records.projects.length} project(s) added</small></div><span>→</span></button>
            <button onClick={() => navigate("/resume")}><span className="quick-icon">▤</span><div><strong>Upload Resume</strong><small>{records.resumes.length ? "Resume uploaded" : "No resume found"}</small></div><span>→</span></button>
            <button onClick={() => navigate("/certificates")}><span className="quick-icon">◇</span><div><strong>Certificates</strong><small>{records.certificates.length} certificate(s) added</small></div><span>→</span></button>
            <button onClick={() => navigate("/assessment")}><span className="quick-icon">📝</span><div><strong>Take Assessment</strong><small>{records.assessments.length ? "Assessment result found" : "No assessment result found"}</small></div><span>→</span></button>
            <button onClick={() => navigate("/find-jobs")}><span className="quick-icon">⌕</span><div><strong>Find Jobs</strong><small>Explore career opportunities</small></div><span>→</span></button>
          </div></div>
        </section>

        <section className="dashboard-card career-card"><div className="card-header"><div><h2>Your Career Journey</h2><p>Keep building your profile step by step.</p></div></div><div className="journey">{careerSteps.map((step, index) => <React.Fragment key={step.title}><button type="button" className={`journey-step ${step.done ? "completed-step" : ""}`} onClick={() => navigate(step.path)}><div className="journey-circle">{step.done ? "✓" : index + 1}</div><div><h3>{step.title}</h3><p>{step.description}</p></div></button>{index < careerSteps.length - 1 && <div className="journey-line" />}</React.Fragment>)}</div></section>

        <section className="dashboard-card profile-summary"><div className="card-header"><div><h2>Profile Summary</h2><p>Your current ElectroHire account information.</p></div><button className="text-button" onClick={() => navigate("/my-profile")}>View Profile →</button></div><div className="summary-grid"><div className="summary-item"><span>Name</span><strong>{userName}</strong></div><div className="summary-item"><span>Email</span><strong>{email || "Not available"}</strong></div><div className="summary-item"><span>Role</span><strong>{user?.role || "Student"}</strong></div><div className="summary-item"><span>Profile Status</span><strong className="status-text">{completion === 100 ? "Complete" : "In Progress"}</strong></div><div className="summary-item"><span>Certificates</span><strong>{records.certificates.length}</strong></div><div className="summary-item"><span>Applications</span><strong>{records.applications.length}</strong></div></div></section>
        <div className="dashboard-refresh"><button onClick={loadDashboard}>↻ Refresh Dashboard</button></div>
      </main>
    </div>
  );
}

export default Dashboard;
