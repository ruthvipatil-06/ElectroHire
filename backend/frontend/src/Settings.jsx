
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEFAULT_SETTINGS = {
  jobType: "Full Time",
  workMode: "Hybrid",
  preferredLocation: "",
  internship: true,
  fresherJobs: true,
  skillBasedJobs: true,
  resumeBasedJobs: true,
  jobMatches: true,
  applicationUpdates: true,
  interviews: true,
  recruiterMessages: true,
  profileVisibility: true,
  recruiterAccess: true,
  assessmentPrivacy: true,
  theme: "Light",
};

function Settings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState("account");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      navigate("/login");
      return;
    }

    setUser(storedUser);

    const savedSettings = JSON.parse(
      localStorage.getItem(`electrohire_settings_${storedUser.user_id}`)
    );

    if (savedSettings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...savedSettings,
      });
    }

    fetchProfile(storedUser.email);
  }, [navigate]);

  const fetchProfile = async (email) => {
    try {
      const response = await fetch(
        `${API}/api/profile/${encodeURIComponent(email)}`
      );

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };

  const updateSetting = (key, value) => {
    const updated = {
      ...settings,
      [key]: value,
    };

    setSettings(updated);

    if (user) {
      localStorage.setItem(
        `electrohire_settings_${user.user_id}`,
        JSON.stringify(updated)
      );
    }

    showMessage("Setting updated successfully");
  };

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const deleteAccount = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your ElectroHire account?"
    );

    if (!confirmDelete) return;

    /*
      Your current backend does not yet provide a delete-account API.
      For now we clear the local session/settings.
    */

    if (user) {
      localStorage.removeItem(
        `electrohire_settings_${user.user_id}`
      );
    }

    localStorage.removeItem("user");

    alert(
      "Your local ElectroHire session has been removed. Permanent database deletion will be connected when the Delete Account API is added."
    );

    navigate("/login");
  };

  const downloadData = () => {
    const data = {
      account: user,
      profile: profile,
      settings: settings,
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "electrohire-my-data.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showMessage("Your data has been downloaded");
  };

  const sections = [
    {
      id: "account",
      icon: "👤",
      title: "Account",
    },
    {
      id: "career",
      icon: "🎯",
      title: "Career Preferences",
    },
    {
      id: "assessment",
      icon: "📝",
      title: "Assessment",
    },
    {
      id: "jobs",
      icon: "💼",
      title: "Job Preferences",
    },
    {
      id: "notifications",
      icon: "🔔",
      title: "Notifications",
    },
    {
      id: "privacy",
      icon: "🔒",
      title: "Privacy & Security",
    },
    {
      id: "resume",
      icon: "📄",
      title: "Resume Preferences",
    },
    {
      id: "appearance",
      icon: "🎨",
      title: "Appearance",
    },
    {
      id: "management",
      icon: "⚠",
      title: "Account Management",
    },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="settings-page">

      {/* SIDEBAR */}
      <aside className="settings-sidebar">

        <div className="settings-logo">
          Electro<span>Hire</span>
        </div>

        <div className="settings-user">
          <div className="settings-avatar">
            {user.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div>
            <strong>{user.full_name}</strong>
            <small>{user.role}</small>
          </div>
        </div>

        <nav className="settings-nav">

          <button onClick={() => navigate("/dashboard")}>
            <span>🏠</span>
            Dashboard
          </button>

          <button onClick={() => navigate("/my-profile")}>
            <span>👤</span>
            My Profile
          </button>

          <button onClick={() => navigate("/skills")}>
            <span>💡</span>
            Skills
          </button>

          <button onClick={() => navigate("/projects")}>
            <span>📁</span>
            Projects
          </button>

          <button onClick={() => navigate("/certificates")}>
            <span>🏆</span>
            Certificates
          </button>

          <button onClick={() => navigate("/resume")}>
            <span>📄</span>
            Resume
          </button>

          <div className="settings-divider"></div>

          <button onClick={() => navigate("/find-jobs")}>
            <span>💼</span>
            Find Jobs
          </button>

          <button onClick={() => navigate("/applications")}>
            <span>📨</span>
            Applications
          </button>

          <button className="active">
            <span>⚙️</span>
            Settings
          </button>

        </nav>

        <button className="settings-logout" onClick={logout}>
          🚪 Logout
        </button>

      </aside>

      {/* MAIN */}
      <main className="settings-main">

        <header className="settings-header">
          <div>
            <h1>⚙ Settings</h1>
            <p>Manage your ElectroHire account and preferences</p>
          </div>

          <div className="settings-header-user">
            <span>{user.full_name}</span>
            <div className="small-avatar">
              {user.full_name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        {message && (
          <div className="settings-success">
            ✓ {message}
          </div>
        )}

        <div className="settings-layout">

          {/* SETTINGS MENU */}
          <div className="settings-menu">

            {sections.map((section) => (
              <button
                key={section.id}
                className={
                  activeSection === section.id
                    ? "settings-menu-item active"
                    : "settings-menu-item"
                }
                onClick={() => setActiveSection(section.id)}
              >
                <span className="menu-icon">
                  {section.icon}
                </span>

                <span>{section.title}</span>

                <span className="menu-arrow">›</span>
              </button>
            ))}

          </div>

          {/* CONTENT */}
          <section className="settings-content">

            {/* ACCOUNT */}
            {activeSection === "account" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">👤</div>

                  <div>
                    <h2>Account</h2>
                    <p>Manage your basic account information.</p>
                  </div>
                </div>

                <div className="settings-field">
                  <label>Email</label>

                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                  />

                  <small>
                    Your registered email cannot be changed here.
                  </small>
                </div>

                <div className="settings-field">
                  <label>Phone</label>

                  <input
                    type="text"
                    value={profile.phone || user.phone || ""}
                    disabled
                  />
                </div>

                <div className="settings-action-row">
                  <div>
                    <strong>Change Password</strong>
                    <p>Update your account password.</p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      alert(
                        "Change Password API will be connected next."
                      )
                    }
                  >
                    Change Password
                  </button>
                </div>

              </div>
            )}

            {/* CAREER */}
            {activeSection === "career" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">🎯</div>

                  <div>
                    <h2>Career Preferences</h2>
                    <p>
                      Tell ElectroHire what type of career you are
                      looking for.
                    </p>
                  </div>
                </div>

                <div className="settings-field">
                  <label>Preferred Role</label>

                  <input
                    value={profile.preferred_role || ""}
                    placeholder="e.g. AI/ML Engineer"
                    disabled
                  />
                </div>

                <div className="settings-field">
                  <label>Job Type</label>

                  <select
                    value={settings.jobType}
                    onChange={(e) =>
                      updateSetting("jobType", e.target.value)
                    }
                  >
                    <option>Full Time</option>
                    <option>Part Time</option>
                    <option>Internship</option>
                    <option>Contract</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Work Mode</label>

                  <select
                    value={settings.workMode}
                    onChange={(e) =>
                      updateSetting("workMode", e.target.value)
                    }
                  >
                    <option>On-site</option>
                    <option>Hybrid</option>
                    <option>Remote</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>Preferred Location</label>

                  <input
                    type="text"
                    value={settings.preferredLocation}
                    placeholder="e.g. Pune, Mumbai, Bangalore"
                    onChange={(e) =>
                      updateSetting(
                        "preferredLocation",
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>
            )}

            {/* ASSESSMENT */}
            {activeSection === "assessment" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">📝</div>

                  <div>
                    <h2>Assessment</h2>
                    <p>
                      View your assessment information and
                      retake your test.
                    </p>
                  </div>
                </div>

                <div className="assessment-status-box">

                  <div>
                    <span className="status-label">
                      Assessment Status
                    </span>

                    <strong>
                      View your latest assessment
                    </strong>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() =>
                      navigate("/assessment-result")
                    }
                  >
                    View Result
                  </button>

                </div>

                <div className="assessment-info-grid">

                  <div className="assessment-info">
                    <span>Score</span>
                    <strong>--</strong>
                    <small>Latest score</small>
                  </div>

                  <div className="assessment-info">
                    <span>Required</span>
                    <strong>70%</strong>
                    <small>Minimum passing score</small>
                  </div>

                  <div className="assessment-info">
                    <span>Questions</span>
                    <strong>15</strong>
                    <small>Per assessment</small>
                  </div>

                </div>

                <div className="settings-action-row">

                  <div>
                    <strong>Retake Assessment</strong>

                    <p>
                      Take the personalized assessment again.
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() =>
                      navigate("/assessment")
                    }
                  >
                    Retake Assessment
                  </button>

                </div>

                <div className="settings-action-row">

                  <div>
                    <strong>Assessment History</strong>

                    <p>
                      Your previous assessment attempts will
                      appear here.
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      showMessage(
                        "Assessment history will be available after backend integration."
                      )
                    }
                  >
                    View History
                  </button>

                </div>

              </div>
            )}

            {/* JOB PREFERENCES */}
            {activeSection === "jobs" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">💼</div>

                  <div>
                    <h2>Job Preferences</h2>
                    <p>
                      Control which opportunities you want to
                      receive.
                    </p>
                  </div>
                </div>

                <ToggleRow
                  title="Internship"
                  description="Show internship opportunities."
                  checked={settings.internship}
                  onChange={(value) =>
                    updateSetting("internship", value)
                  }
                />

                <ToggleRow
                  title="Fresher Jobs"
                  description="Show entry-level and fresher jobs."
                  checked={settings.fresherJobs}
                  onChange={(value) =>
                    updateSetting("fresherJobs", value)
                  }
                />

                <ToggleRow
                  title="Skill-based Jobs"
                  description="Match jobs with your registered skills."
                  checked={settings.skillBasedJobs}
                  onChange={(value) =>
                    updateSetting("skillBasedJobs", value)
                  }
                />

                <ToggleRow
                  title="Resume-based Jobs"
                  description="Match jobs according to your resume."
                  checked={settings.resumeBasedJobs}
                  onChange={(value) =>
                    updateSetting("resumeBasedJobs", value)
                  }
                />

              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === "notifications" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">🔔</div>

                  <div>
                    <h2>Notifications</h2>
                    <p>
                      Choose which notifications you want to
                      receive.
                    </p>
                  </div>
                </div>

                <ToggleRow
                  title="Job Matches"
                  description="Notify me when suitable jobs are found."
                  checked={settings.jobMatches}
                  onChange={(value) =>
                    updateSetting("jobMatches", value)
                  }
                />

                <ToggleRow
                  title="Application Updates"
                  description="Get updates about your applications."
                  checked={settings.applicationUpdates}
                  onChange={(value) =>
                    updateSetting("applicationUpdates", value)
                  }
                />

                <ToggleRow
                  title="Interviews"
                  description="Receive interview reminders and updates."
                  checked={settings.interviews}
                  onChange={(value) =>
                    updateSetting("interviews", value)
                  }
                />

                <ToggleRow
                  title="Recruiter Messages"
                  description="Receive messages from recruiters."
                  checked={settings.recruiterMessages}
                  onChange={(value) =>
                    updateSetting("recruiterMessages", value)
                  }
                />

              </div>
            )}

            {/* PRIVACY */}
            {activeSection === "privacy" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">🔒</div>

                  <div>
                    <h2>Privacy & Security</h2>
                    <p>
                      Control who can access your career
                      information.
                    </p>
                  </div>
                </div>

                <ToggleRow
                  title="Profile Visibility"
                  description="Allow recruiters to discover your profile."
                  checked={settings.profileVisibility}
                  onChange={(value) =>
                    updateSetting("profileVisibility", value)
                  }
                />

                <ToggleRow
                  title="Recruiter Access"
                  description="Allow recruiters to view your skills, projects and resume."
                  checked={settings.recruiterAccess}
                  onChange={(value) =>
                    updateSetting("recruiterAccess", value)
                  }
                />

                <ToggleRow
                  title="Assessment Privacy"
                  description="Control visibility of your assessment results."
                  checked={settings.assessmentPrivacy}
                  onChange={(value) =>
                    updateSetting("assessmentPrivacy", value)
                  }
                />

              </div>
            )}

            {/* RESUME */}
            {activeSection === "resume" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">📄</div>

                  <div>
                    <h2>Resume Preferences</h2>
                    <p>
                      Manage how your resume is used for job
                      matching.
                    </p>
                  </div>
                </div>

                <div className="resume-preference-box">

                  <div className="resume-icon">
                    📄
                  </div>

                  <div>
                    <strong>Default Resume</strong>

                    <p>
                      Your uploaded resume will appear here.
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => navigate("/resume")}
                  >
                    Manage Resume
                  </button>

                </div>

                <div className="settings-field">
                  <label>Target Role</label>

                  <input
                    value={profile.preferred_role || ""}
                    placeholder="e.g. Software Developer"
                    disabled
                  />

                  <small>
                    Update your preferred role from My Profile.
                  </small>
                </div>

              </div>
            )}

            {/* APPEARANCE */}
            {activeSection === "appearance" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">🎨</div>

                  <div>
                    <h2>Appearance</h2>
                    <p>
                      Choose how ElectroHire should look.
                    </p>
                  </div>
                </div>

                <div className="theme-options">

                  {["Light", "Dark", "System"].map((theme) => (
                    <button
                      key={theme}
                      className={
                        settings.theme === theme
                          ? "theme-option selected"
                          : "theme-option"
                      }
                      onClick={() =>
                        updateSetting("theme", theme)
                      }
                    >
                      <span>
                        {theme === "Light"
                          ? "☀️"
                          : theme === "Dark"
                          ? "🌙"
                          : "💻"}
                      </span>

                      <strong>{theme}</strong>

                      {settings.theme === theme && (
                        <small>✓ Selected</small>
                      )}
                    </button>
                  ))}

                </div>

              </div>
            )}

            {/* ACCOUNT MANAGEMENT */}
            {activeSection === "management" && (
              <div className="settings-card">

                <div className="section-heading">
                  <div className="section-heading-icon">⚠</div>

                  <div>
                    <h2>Account Management</h2>
                    <p>
                      Manage your ElectroHire account data.
                    </p>
                  </div>
                </div>

                <div className="management-row">

                  <div>
                    <strong>Download Data</strong>

                    <p>
                      Download your account and settings data.
                    </p>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={downloadData}
                  >
                    Download Data
                  </button>

                </div>

                <div className="management-row">

                  <div>
                    <strong>Deactivate Account</strong>

                    <p>
                      Temporarily stop using your account.
                    </p>
                  </div>

                  <button
                    className="warning-button"
                    onClick={() =>
                      showMessage(
                        "Account deactivation API will be connected next."
                      )
                    }
                  >
                    Deactivate
                  </button>

                </div>

                <div className="management-row danger-row">

                  <div>
                    <strong>Delete Account</strong>

                    <p>
                      Permanently remove your ElectroHire account.
                    </p>
                  </div>

                  <button
                    className="danger-button"
                    onClick={deleteAccount}
                  >
                    Delete Account
                  </button>

                </div>

              </div>
            )}

          </section>

        </div>

      </main>

    </div>
  );
}


/* TOGGLE COMPONENT */

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="toggle-row">

      <div className="toggle-text">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        className={checked ? "toggle on" : "toggle"}
        onClick={() => onChange(!checked)}
      >
        <span></span>
      </button>

    </div>
  );
}

export default Settings;
