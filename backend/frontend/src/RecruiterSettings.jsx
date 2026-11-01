
import React, { useEffect, useState } from "react";
import "./RecruiterSettings.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const DEFAULT_SETTINGS = {
  email_notifications: true,
  new_application_notifications: true,
  shortlisted_notifications: true,
  interview_reminders: true,
  evaluation_reminders: true,
  preferred_branches: "",
  minimum_cgpa: "6.00",
  preferred_skills: "",
  default_job_type: "Full-time",
  default_work_mode: "On-site",
  default_interview_mode: "Online",
  default_interview_duration: 30,
  preferred_meeting_platform: "",
};

function getRecruiterId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
      user.user_id ||
      user.id ||
      user.userId ||
      user.recruiter_id ||
      localStorage.getItem("recruiter_id") ||
      ""
    );
  } catch {
    return localStorage.getItem("recruiter_id") || "";
  }
}

function RecruiterSettings() {
  const recruiterId = getRecruiterId();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loadWarning, setLoadWarning] = useState("");

  // ============================================================
  // LOAD RECRUITER SETTINGS
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      if (!recruiterId) {
        setLoadWarning(
          "Recruiter session not found. Please log in again."
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API}/api/recruiter/settings/${encodeURIComponent(recruiterId)}`
        );

        if (!response.ok) {
          throw new Error(
            `Could not load settings (${response.status}).`
          );
        }

        const data = await response.json();

        if (!cancelled) {
          const savedSettings = data.settings || data;

          setSettings({
            ...DEFAULT_SETTINGS,
            ...savedSettings,
            minimum_cgpa:
              savedSettings.minimum_cgpa ?? "6.00",
            default_interview_duration:
              savedSettings.default_interview_duration ?? 30,
          });

          setLoadWarning("");
        }
      } catch (error) {
        console.error("Settings loading error:", error);

        if (!cancelled) {
          setLoadWarning(
            "Saved settings could not be loaded. Showing default values until the backend API is connected."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [recruiterId]);

  // ============================================================
  // HANDLE INPUT CHANGES
  // ============================================================

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setMessage("");
    setMessageType("");
  }

  // ============================================================
  // SAVE SETTINGS
  // ============================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!recruiterId) {
      setMessage("Please log in with a recruiter account first.");
      setMessageType("error");
      return;
    }

    const cgpa = Number(settings.minimum_cgpa);
    const duration = Number(settings.default_interview_duration);

    if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
      setMessage("Minimum CGPA must be between 0 and 10.");
      setMessageType("error");
      return;
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      setMessage("Interview duration must be a positive whole number.");
      setMessageType("error");
      return;
    }

    const payload = {
      ...settings,
      minimum_cgpa: cgpa,
      default_interview_duration: duration,
    };

    setSaving(true);

    try {
      const response = await fetch(
        `${API}/api/recruiter/settings/${encodeURIComponent(recruiterId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Could not save settings (${response.status}).`
        );
      }

      setMessage("Your settings have been saved successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Settings saving error:", error);

      setMessage(
        error.message ||
          "Unable to save settings. Please check your backend connection."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // RESET SETTINGS
  // ============================================================

  function handleReset() {
    setSettings({ ...DEFAULT_SETTINGS });
    setMessage("Default values restored. Click Save Changes to save them.");
    setMessageType("info");
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="recruiter-settings-page">
        <div className="settings-loading">
          Loading recruiter settings...
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <main className="recruiter-settings-page">
      <div className="settings-container">

        <header className="settings-header">
          <div className="settings-heading-icon">⚙</div>

          <div>
            <p className="settings-eyebrow">ACCOUNT MANAGEMENT</p>

            <h1>Recruiter Settings</h1>

            <p className="settings-subtitle">
              Manage your notifications, hiring preferences and
              interview defaults in one place.
            </p>
          </div>
        </header>

        {loadWarning && (
          <div className="settings-alert settings-alert-warning">
            {loadWarning}
          </div>
        )}

        {message && (
          <div
            className={`settings-alert settings-alert-${messageType}`}
            role="status"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* NOTIFICATION PREFERENCES */}

          <section className="settings-card">
            <div className="settings-section-heading">
              <div className="settings-section-icon">🔔</div>

              <div>
                <h2>Notification Preferences</h2>
                <p>Choose which recruitment updates you receive.</p>
              </div>
            </div>

            <div className="settings-options">
              {[
                {
                  name: "email_notifications",
                  title: "Email notifications",
                  description: "Enable or disable email notifications.",
                },
                {
                  name: "new_application_notifications",
                  title: "New job applications",
                  description: "Get notified when students apply.",
                },
                {
                  name: "shortlisted_notifications",
                  title: "Shortlisted students",
                  description: "Receive updates about shortlisted candidates.",
                },
                {
                  name: "interview_reminders",
                  title: "Interview reminders",
                  description: "Receive reminders for scheduled interviews.",
                },
                {
                  name: "evaluation_reminders",
                  title: "Evaluation reminders",
                  description: "Get reminders to evaluate completed interviews.",
                },
              ].map((item) => (
                <label className="settings-toggle-row" key={item.name}>
                  <span className="settings-toggle-text">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>

                  <span className="settings-switch">
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={Boolean(settings[item.name])}
                      onChange={handleChange}
                    />

                    <span className="settings-switch-track" />
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* HIRING PREFERENCES */}

          <section className="settings-card">
            <div className="settings-section-heading">
              <div className="settings-section-icon">🎯</div>

              <div>
                <h2>Hiring Preferences</h2>
                <p>Set your default requirements for finding candidates.</p>
              </div>
            </div>

            <div className="settings-form-grid">

              <div className="settings-field">
                <label htmlFor="preferred_branches">
                  Preferred branches
                </label>

                <input
                  id="preferred_branches"
                  name="preferred_branches"
                  value={settings.preferred_branches || ""}
                  onChange={handleChange}
                  placeholder="e.g. ECE, CSE, AIML"
                />

                <small>Separate branches with commas.</small>
              </div>

              <div className="settings-field">
                <label htmlFor="minimum_cgpa">Minimum CGPA</label>

                <input
                  id="minimum_cgpa"
                  name="minimum_cgpa"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  value={settings.minimum_cgpa}
                  onChange={handleChange}
                  required
                />

                <small>Enter a value between 0 and 10.</small>
              </div>

              <div className="settings-field settings-field-full">
                <label htmlFor="preferred_skills">Preferred skills</label>

                <textarea
                  id="preferred_skills"
                  name="preferred_skills"
                  rows="3"
                  value={settings.preferred_skills || ""}
                  onChange={handleChange}
                  placeholder="e.g. Python, SQL, Machine Learning, React"
                />

                <small>List the skills you commonly look for.</small>
              </div>

              <div className="settings-field">
                <label htmlFor="default_job_type">Default job type</label>

                <select
                  id="default_job_type"
                  name="default_job_type"
                  value={settings.default_job_type || "Full-time"}
                  onChange={handleChange}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div className="settings-field">
                <label htmlFor="default_work_mode">Default work mode</label>

                <select
                  id="default_work_mode"
                  name="default_work_mode"
                  value={settings.default_work_mode || "On-site"}
                  onChange={handleChange}
                >
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

            </div>
          </section>

          {/* INTERVIEW PREFERENCES */}

          <section className="settings-card">
            <div className="settings-section-heading">
              <div className="settings-section-icon">📅</div>

              <div>
                <h2>Interview Preferences</h2>
                <p>Configure the defaults used for your interviews.</p>
              </div>
            </div>

            <div className="settings-form-grid">

              <div className="settings-field">
                <label htmlFor="default_interview_mode">
                  Default interview mode
                </label>

                <select
                  id="default_interview_mode"
                  name="default_interview_mode"
                  value={settings.default_interview_mode || "Online"}
                  onChange={handleChange}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div className="settings-field">
                <label htmlFor="default_interview_duration">
                  Interview duration (minutes)
                </label>

                <select
                  id="default_interview_duration"
                  name="default_interview_duration"
                  value={settings.default_interview_duration}
                  onChange={handleChange}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div className="settings-field settings-field-full">
                <label htmlFor="preferred_meeting_platform">
                  Preferred meeting platform
                </label>

                <select
                  id="preferred_meeting_platform"
                  name="preferred_meeting_platform"
                  value={settings.preferred_meeting_platform || ""}
                  onChange={handleChange}
                >
                  <option value="">Select a platform</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="Microsoft Teams">Microsoft Teams</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Other">Other</option>
                </select>
              </div>

            </div>
          </section>

          {/* ACTION BUTTONS */}

          <div className="settings-actions">

            <button
              type="button"
              className="settings-reset-button"
              onClick={handleReset}
              disabled={saving}
            >
              Reset to Defaults
            </button>

            <button
              type="submit"
              className="settings-save-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </div>

        </form>

        <p className="settings-footer-note">
          Your preferences are specific to your recruiter account.
        </p>

      </div>
    </main>
  );
}

export default RecruiterSettings;
