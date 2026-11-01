import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Projects.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Projects() {
  const navigate = useNavigate();

  // ============================================================
  // USER
  // ============================================================

  const [userId, setUserId] = useState(null);

  // ============================================================
  // PROJECT DATA
  // ============================================================

  const [projects, setProjects] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    technologies: "",
    project_role: "",
    start_date: "",
    end_date: "",
    github_url: "",
    live_url: "",
  });

  // ============================================================
  // UI STATES
  // ============================================================

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // GET LOGGED-IN USER
  // ============================================================

  useEffect(() => {
    getUserId();
  }, []);

  // ============================================================
  // GET USER ID FROM LOCAL STORAGE
  // ============================================================

  const getUserId = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const user = JSON.parse(storedUser);

        const id =
          user.user_id ??
          user.id ??
          user.student_id;

        if (id) {
          setUserId(Number(id));
          return;
        }
      }

      // Fallback in case user_id is stored separately
      const storedUserId =
        localStorage.getItem("user_id") ||
        localStorage.getItem("userId");

      if (storedUserId) {
        setUserId(Number(storedUserId));
        return;
      }

      setError("User information not found. Please login again.");
      setLoading(false);

    } catch (err) {
      console.error("Error reading user:", err);
      setError("Unable to read user information. Please login again.");
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD PROJECTS AFTER USER ID IS AVAILABLE
  // ============================================================

  useEffect(() => {
    if (userId) {
      loadProjects();
    }
  }, [userId]);

  // ============================================================
  // GET PROJECTS
  // ============================================================

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/projects/${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load projects"
        );
      }

      setProjects(data.projects || []);

    } catch (err) {
      console.error("Load projects error:", err);

      setError(
        err.message ||
        "Failed to load projects. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Clear messages while typing
    setError("");
    setSuccess("");
  };

  // ============================================================
  // CLEAR FORM
  // ============================================================

  const handleClear = () => {
    setFormData({
      title: "",
      description: "",
      technologies: "",
      project_role: "",
      start_date: "",
      end_date: "",
      github_url: "",
      live_url: "",
    });

    setError("");
    setSuccess("");
  };

  // ============================================================
  // ADD PROJECT
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ----------------------------------------------------------
    // CHECK USER
    // ----------------------------------------------------------

    if (!userId) {
      setError("User information not found. Please login again.");
      return;
    }

    // ----------------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // ----------------------------------------------------------

    if (!formData.title.trim()) {
      setError("Project title is required.");
      return;
    }

    if (!formData.description.trim()) {
      setError("Project description is required.");
      return;
    }

    if (!formData.technologies.trim()) {
      setError("Technologies used are required.");
      return;
    }

    // ----------------------------------------------------------
    // DATE VALIDATION
    // ----------------------------------------------------------

    if (
      formData.start_date &&
      formData.end_date &&
      formData.end_date < formData.start_date
    ) {
      setError("End date cannot be before start date.");
      return;
    }

    try {
      setSubmitting(true);

      // --------------------------------------------------------
      // JSON DATA
      // --------------------------------------------------------

      const projectData = {
        user_id: Number(userId),

        title: formData.title.trim(),

        description: formData.description.trim(),

        technologies: formData.technologies.trim(),

        project_role:
          formData.project_role.trim() || null,

        start_date:
          formData.start_date || null,

        end_date:
          formData.end_date || null,

        github_url:
          formData.github_url.trim() || null,

        live_url:
          formData.live_url.trim() || null,
      };

      console.log("Sending project:", projectData);

      // --------------------------------------------------------
      // POST REQUEST
      // --------------------------------------------------------

      const response = await fetch(
        `${API_URL}/api/projects`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(projectData),
        }
      );

      const data = await response.json();

      console.log("Project response:", data);

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to add project"
        );
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      setSuccess("Project added successfully!");

      // Clear form
      setFormData({
        title: "",
        description: "",
        technologies: "",
        project_role: "",
        start_date: "",
        end_date: "",
        github_url: "",
        live_url: "",
      });

      // Reload projects
      await loadProjects();

    } catch (err) {
      console.error("Add project error:", err);

      setError(
        err.message ||
        "Failed to add project. Please try again."
      );

    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // DELETE PROJECT
  // ============================================================

  const handleDelete = async (projectId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/projects/${projectId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete project"
        );
      }

      setSuccess("Project deleted successfully.");

      // Remove from UI immediately
      setProjects((previous) =>
        previous.filter(
          (project) =>
            project.project_id !== projectId
        )
      );

    } catch (err) {
      console.error("Delete project error:", err);

      setError(
        err.message ||
        "Failed to delete project."
      );
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    const dateObject = new Date(date);

    if (Number.isNaN(dateObject.getTime())) {
      return date;
    }

    return dateObject.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ============================================================
  // BACK TO DASHBOARD
  // ============================================================

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="projects-page">
        <div className="projects-container">

          <button
            className="back-button"
            onClick={handleBackToDashboard}
          >
            ← Back to Dashboard
          </button>

          <div className="projects-loading">
            <div className="loading-spinner"></div>
            <p>Loading your projects...</p>
          </div>

        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="projects-page">

      <div className="projects-container">

        {/* =====================================================
            BACK BUTTON
        ====================================================== */}

        <button
          className="back-button"
          onClick={handleBackToDashboard}
        >
          ← Back to Dashboard
        </button>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="projects-header">

          <div>
            <h1>Projects</h1>

            <p>
              Showcase your academic and professional projects.
            </p>
          </div>

          <div className="profile-avatar">
            RP
          </div>

        </div>

        {/* =====================================================
            ERROR MESSAGE
        ====================================================== */}

        {error && (
          <div className="message error-message">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* =====================================================
            SUCCESS MESSAGE
        ====================================================== */}

        {success && (
          <div className="message success-message">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* =====================================================
            ADD PROJECT CARD
        ====================================================== */}

        <div className="project-form-card">

          <div className="section-number">
            01
          </div>

          <div className="form-header">

            <h2>Add Project</h2>

            <p>
              Add details about your project.
            </p>

          </div>

          <form onSubmit={handleSubmit}>

            {/* =================================================
                PROJECT TITLE
            ================================================== */}

            <div className="form-group">

              <label htmlFor="title">
                Project Title<span>*</span>
              </label>

              <input
                type="text"
                id="title"
                name="title"
                placeholder="Enter project title"
                value={formData.title}
                onChange={handleChange}
                maxLength={150}
                required
              />

            </div>

            {/* =================================================
                DESCRIPTION
            ================================================== */}

            <div className="form-group">

              <label htmlFor="description">
                Description<span>*</span>
              </label>

              <textarea
                id="description"
                name="description"
                placeholder="Describe your project, its purpose, features, and outcome..."
                value={formData.description}
                onChange={handleChange}
                rows={5}
                required
              />

            </div>

            {/* =================================================
                TECHNOLOGIES
            ================================================== */}

            <div className="form-group">

              <label htmlFor="technologies">
                Technologies Used<span>*</span>
              </label>

              <input
                type="text"
                id="technologies"
                name="technologies"
                placeholder="e.g. React, Python, FastAPI, MySQL"
                value={formData.technologies}
                onChange={handleChange}
                required
              />

              <small>
                Separate multiple technologies using commas.
              </small>

            </div>

            {/* =================================================
                YOUR ROLE
            ================================================== */}

            <div className="form-group">

              <label htmlFor="project_role">
                Your Role
              </label>

              <input
                type="text"
                id="project_role"
                name="project_role"
                placeholder="e.g. Full Stack Developer"
                value={formData.project_role}
                onChange={handleChange}
                maxLength={100}
              />

            </div>

            {/* =================================================
                DATES
            ================================================== */}

            <div className="form-row">

              <div className="form-group">

                <label htmlFor="start_date">
                  Start Date
                </label>

                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                />

              </div>

              <div className="form-group">

                <label htmlFor="end_date">
                  End Date
                </label>

                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                />

              </div>

            </div>

            {/* =================================================
                GITHUB URL
            ================================================== */}

            <div className="form-group">

              <label htmlFor="github_url">
                GitHub URL
              </label>

              <input
                type="url"
                id="github_url"
                name="github_url"
                placeholder="https://github.com/username/project"
                value={formData.github_url}
                onChange={handleChange}
              />

            </div>

            {/* =================================================
                LIVE PROJECT URL
            ================================================== */}

            <div className="form-group">

              <label htmlFor="live_url">
                Live Project URL
              </label>

              <input
                type="url"
                id="live_url"
                name="live_url"
                placeholder="https://your-project.com"
                value={formData.live_url}
                onChange={handleChange}
              />

            </div>

            {/* =================================================
                BUTTONS
            ================================================== */}

            <div className="form-actions">

              <button
                type="button"
                className="clear-button"
                onClick={handleClear}
                disabled={submitting}
              >
                Clear
              </button>

              <button
                type="submit"
                className="add-project-button"
                disabled={submitting}
              >
                {submitting
                  ? "Adding Project..."
                  : "Add Project"}
              </button>

            </div>

          </form>

        </div>

        {/* =====================================================
            YOUR PROJECTS
        ====================================================== */}

        <div className="your-projects-section">

          <div className="your-projects-header">

            <div>
              <h2>Your Projects</h2>

              <p>
                Projects saved to your ElectroHire profile.
              </p>
            </div>

            <div className="project-count">
              {projects.length}
            </div>

          </div>

          {/* =================================================
              NO PROJECTS
          ================================================== */}

          {projects.length === 0 ? (

            <div className="empty-projects">

              <div className="empty-icon">
                📁
              </div>

              <h3>
                No projects added yet
              </h3>

              <p>
                Add your first project using the form above.
              </p>

            </div>

          ) : (

            <div className="projects-grid">

              {projects.map((project) => (

                <div
                  className="project-card"
                  key={project.project_id}
                >

                  {/* =========================================
                      PROJECT CARD HEADER
                  ========================================== */}

                  <div className="project-card-header">

                    <div className="project-icon">
                      💼
                    </div>

                    <button
                      className="delete-project-button"
                      onClick={() =>
                        handleDelete(project.project_id)
                      }
                      title="Delete project"
                    >
                      🗑
                    </button>

                  </div>

                  {/* =========================================
                      TITLE
                  ========================================== */}

                  <h3>
                    {project.title}
                  </h3>

                  {/* =========================================
                      DESCRIPTION
                  ========================================== */}

                  {project.description && (
                    <p className="project-description">
                      {project.description}
                    </p>
                  )}

                  {/* =========================================
                      TECHNOLOGIES
                  ========================================== */}

                  {project.technologies && (

                    <div className="project-detail">

                      <strong>
                        Technologies
                      </strong>

                      <div className="technology-list">

                        {project.technologies
                          .split(",")
                          .map((technology, index) => (

                            <span
                              className="technology-tag"
                              key={index}
                            >
                              {technology.trim()}
                            </span>

                          ))}

                      </div>

                    </div>

                  )}

                  {/* =========================================
                      ROLE
                  ========================================== */}

                  {project.project_role && (

                    <div className="project-detail">

                      <strong>
                        Role
                      </strong>

                      <span>
                        {project.project_role}
                      </span>

                    </div>

                  )}

                  {/* =========================================
                      DATES
                  ========================================== */}

                  {(project.start_date ||
                    project.end_date) && (

                    <div className="project-detail">

                      <strong>
                        Duration
                      </strong>

                      <span>

                        {project.start_date
                          ? formatDate(project.start_date)
                          : "N/A"}

                        {" — "}

                        {project.end_date
                          ? formatDate(project.end_date)
                          : "Present"}

                      </span>

                    </div>

                  )}

                  {/* =========================================
                      LINKS
                  ========================================== */}

                  {(project.github_url ||
                    project.live_url) && (

                    <div className="project-links">

                      {project.github_url && (

                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-link"
                        >
                          GitHub ↗
                        </a>

                      )}

                      {project.live_url && (

                        <a
                          href={project.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-link"
                        >
                          Live Project ↗
                        </a>

                      )}

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

export default Projects;