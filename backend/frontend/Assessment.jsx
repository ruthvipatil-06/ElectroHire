import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Resume.css";

const API_BASE_URL = "http://localhost:8000";

function Resume() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);

  const [formData, setFormData] = useState({
    target_role: "",
    version: "1.0",
    resume_score: "",
    ai_generated: false,
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // GET USER ID
  // =====================================================

  const getUserId = (userData = user) => {
    if (!userData) {
      return null;
    }

    const userId =
      userData.user_id ||
      userData.id ||
      localStorage.getItem("user_id");

    return userId ? Number(userId) : null;
  };

  // =====================================================
  // LOAD USER
  // =====================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedUserId = localStorage.getItem("user_id");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      setUser(parsedUser);

      // Support both user_id and id
      const userId =
        parsedUser.user_id ||
        parsedUser.id ||
        storedUserId;

      if (!userId) {
        setError(
          "User information is missing. Please login again."
        );
        setLoading(false);
        return;
      }

      // Store the resolved ID for other pages
      localStorage.setItem(
        "user_id",
        String(userId)
      );

      loadResumes(Number(userId));

    } catch (error) {
      console.error("Error reading user:", error);

      localStorage.removeItem("user");
      localStorage.removeItem("user_id");

      navigate("/login");
    }
  }, [navigate]);

  // =====================================================
  // LOAD RESUMES
  // =====================================================

  const loadResumes = async (userId) => {
    try {
      setLoading(true);
      setError("");

      if (!userId) {
        throw new Error(
          "User information is missing. Please login again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/resumes/${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not load resumes."
        );
      }

      setResumes(data.resumes || []);

    } catch (error) {
      console.error("Load resumes error:", error);

      setError(
        error.message || "Failed to fetch resumes."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =====================================================
  // FILE CHANGE
  // =====================================================

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please select a PDF file only.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Resume file must be smaller than 10 MB."
      );
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  // =====================================================
  // ADD RESUME
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const userId = getUserId();

    if (!userId) {
      setError(
        "User not found. Please login again."
      );
      return;
    }

    if (!selectedFile) {
      setError(
        "Please select your resume PDF."
      );
      return;
    }

    if (!formData.target_role.trim()) {
      setError(
        "Please enter the target role."
      );
      return;
    }

    if (!formData.version.trim()) {
      setError(
        "Please enter the resume version."
      );
      return;
    }

    if (
      formData.resume_score !== "" &&
      (
        Number(formData.resume_score) < 0 ||
        Number(formData.resume_score) > 100
      )
    ) {
      setError(
        "Resume score must be between 0 and 100."
      );
      return;
    }

    try {
      setUploading(true);

      const uploadData = new FormData();

      uploadData.append(
        "user_id",
        String(userId)
      );

      uploadData.append(
        "file",
        selectedFile
      );

      uploadData.append(
        "target_role",
        formData.target_role.trim()
      );

      uploadData.append(
        "version",
        formData.version.trim()
      );

      uploadData.append(
        "resume_score",
        formData.resume_score === ""
          ? ""
          : formData.resume_score
      );

      uploadData.append(
        "ai_generated",
        formData.ai_generated
          ? "true"
          : "false"
      );

      const response = await fetch(
        `${API_BASE_URL}/api/resumes/upload`,
        {
          method: "POST",
          body: uploadData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Could not upload resume."
        );
      }

      setSuccess(
        "Resume uploaded successfully!"
      );

      setFormData({
        target_role: "",
        version: "1.0",
        resume_score: "",
        ai_generated: false,
      });

      setSelectedFile(null);

      const fileInput =
        document.getElementById(
          "resume-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadResumes(userId);

    } catch (error) {
      console.error(
        "Upload resume error:",
        error
      );

      setError(
        error.message ||
        "Failed to upload resume."
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // DELETE RESUME
  // =====================================================

  const handleDelete = async (resumeId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this resume?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE_URL}/api/resumes/${resumeId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Could not delete resume."
        );
      }

      setSuccess(
        "Resume deleted successfully!"
      );

      const userId = getUserId();

      if (userId) {
        await loadResumes(userId);
      }

    } catch (error) {
      console.error(
        "Delete resume error:",
        error
      );

      setError(
        error.message ||
        "Failed to delete resume."
      );
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("student_id");
    localStorage.removeItem("isLoggedIn");

    navigate("/login");
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="resume-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="resume-sidebar">

        <div className="resume-logo">
          Electro<span>Hire</span>
        </div>

        <nav className="resume-sidebar-nav">

          <button
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            onClick={() =>
              navigate("/my-profile")
            }
          >
            <span>👤</span>
            My Profile
          </button>

          <button
            onClick={() =>
              navigate("/skills")
            }
          >
            <span>⚡</span>
            Skills
          </button>

          <button
            onClick={() =>
              navigate("/projects")
            }
          >
            <span>📁</span>
            Projects
          </button>

          <button
            onClick={() =>
              navigate("/certificates")
            }
          >
            <span>🏆</span>
            Certificates
          </button>

          <button className="active">
            <span>📄</span>
            Resume
          </button>

          <button
            onClick={() =>
              navigate("/find-jobs")
            }
          >
            <span>💼</span>
            Find Jobs
          </button>

          <button
            onClick={() =>
              navigate("/applications")
            }
          >
            <span>📋</span>
            Applications
          </button>

          <button
            onClick={() =>
              navigate("/settings")
            }
          >
            <span>⚙</span>
            Settings
          </button>

        </nav>

        <button
          className="resume-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="resume-main">

        {/* HEADER */}

        <div className="resume-header">

          <div>

            <h1>
              My Resume
            </h1>

            <p>
              Upload and manage your professional resumes.
            </p>

          </div>

          {user && (
            <div className="resume-welcome">

              Welcome,{" "}

              <strong>
                {user.full_name || "Student"}
              </strong>

            </div>
          )}

        </div>


        {/* ERROR */}

        {error && (
          <div className="resume-alert resume-error">
            <strong>Error:</strong>{" "}
            {error}
          </div>
        )}


        {/* SUCCESS */}

        {success && (
          <div className="resume-alert resume-success">
            {success}
          </div>
        )}


        {/* =================================================
            UPLOAD FORM
        ================================================= */}

        <section className="resume-card">

          <div className="resume-card-heading">

            <div className="resume-icon">
              +
            </div>

            <div>

              <h2>
                Upload New Resume
              </h2>

              <p>
                Add a resume to your professional profile.
              </p>

            </div>

          </div>


          <form
            className="resume-form"
            onSubmit={handleSubmit}
          >

            {/* FILE */}

            <div className="resume-field resume-full">

              <label>
                Resume File
              </label>

              <input
                id="resume-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />

              <small>
                PDF only • Maximum size: 10 MB
              </small>

              {selectedFile && (
                <div className="selected-file">
                  📄 {selectedFile.name}
                </div>
              )}

            </div>


            {/* TARGET ROLE */}

            <div className="resume-field">

              <label>
                Target Role
              </label>

              <input
                type="text"
                name="target_role"
                value={formData.target_role}
                onChange={handleChange}
                placeholder="Example: AI/ML Engineer"
              />

            </div>


            {/* VERSION */}

            <div className="resume-field">

              <label>
                Version
              </label>

              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                placeholder="Example: 1.0"
              />

            </div>


            {/* SCORE */}

            <div className="resume-field">

              <label>

                Resume Score

                <span className="optional-label">
                  Optional
                </span>

              </label>

              <input
                type="number"
                name="resume_score"
                value={formData.resume_score}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                placeholder="Example: 85"
              />

            </div>


            {/* AI GENERATED */}

            <div className="resume-checkbox-field">

              <label className="resume-checkbox-label">

                <input
                  type="checkbox"
                  name="ai_generated"
                  checked={
                    formData.ai_generated
                  }
                  onChange={handleChange}
                />

                <span>
                  This resume was AI generated
                </span>

              </label>

            </div>


            {/* BUTTON */}

            <div className="resume-submit-row">

              <button
                type="submit"
                className="upload-resume-button"
                disabled={uploading}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload Resume"}
              </button>

            </div>

          </form>

        </section>


        {/* =================================================
            MY RESUMES
        ================================================= */}

        <section className="resume-card">

          <div className="resume-list-header">

            <div>

              <h2>
                My Resumes
              </h2>

              <p>
                Resumes saved to your profile.
              </p>

            </div>

            <span className="resume-count">

              {resumes.length}{" "}

              {resumes.length === 1
                ? "Resume"
                : "Resumes"}

            </span>

          </div>


          {/* LOADING */}

          {loading ? (

            <div className="resume-loading">

              <div className="resume-spinner"></div>

              <p>
                Loading resumes...
              </p>

            </div>

          ) : resumes.length === 0 ? (

            /* EMPTY */

            <div className="resume-empty">

              <div className="empty-resume-icon">
                📄
              </div>

              <h3>
                No Resumes Added Yet
              </h3>

              <p>
                Upload your resume above to showcase
                your professional profile.
              </p>

            </div>

          ) : (

            /* RESUME GRID */

            <div className="resumes-grid">

              {resumes.map((resume) => (

                <article
                  className="resume-item"
                  key={resume.resume_id}
                >

                  <div className="resume-item-top">

                    <div className="resume-file-icon">
                      📄
                    </div>

                    <button
                      className="resume-delete-button"
                      onClick={() =>
                        handleDelete(
                          resume.resume_id
                        )
                      }
                      title="Delete resume"
                    >
                      ×
                    </button>

                  </div>


                  <h3>
                    {resume.file_name}
                  </h3>


                  <div className="resume-target-role">
                    {resume.target_role ||
                      "General Resume"}
                  </div>


                  <div className="resume-details">

                    <div>

                      <span>
                        Version
                      </span>

                      <strong>
                        {resume.version || "—"}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Score
                      </span>

                      <strong>

                        {resume.resume_score !== null &&
                        resume.resume_score !== undefined
                          ? `${resume.resume_score}/100`
                          : "Not scored"}

                      </strong>

                    </div>

                  </div>


                  <div className="resume-extra">

                    <span>
                      AI Generated
                    </span>

                    <strong>

                      {resume.ai_generated
                        ? "Yes"
                        : "No"}

                    </strong>

                  </div>


                  <div className="resume-uploaded">

                    Uploaded:{" "}

                    {formatDate(
                      resume.uploaded_at
                    )}

                  </div>


                  {resume.file_url && (
                    <a
                      href={resume.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-resume-button"
                    >
                      View Resume ↗
                    </a>
                  )}

                </article>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default Resume;