
import React, { useEffect, useState } from "react";
import "./Resume.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Resume() {
  const [resumes, setResumes] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // GET USER ID
  const getUserId = () => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        return (
          user.user_id ||
          user.userId ||
          user.id ||
          user.user?.user_id ||
          user.user?.id ||
          null
        );
      } catch (err) {
        console.error("Invalid user data:", err);
      }
    }

    return (
      localStorage.getItem("user_id") ||
      localStorage.getItem("userId") ||
      null
    );
  };

  // LOAD SAVED RESUMES
  const loadResumes = async () => {
    const userId = getUserId();

    if (!userId) {
      setError("User information not found. Please login again.");
      setFetching(false);
      return;
    }

    try {
      setFetching(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/resumes/${userId}`
      );

      const data = await response.json();

      console.log("RESUME API RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load resumes."
        );
      }

      let resumeList = [];

      if (Array.isArray(data)) {
        resumeList = data;
      } else if (Array.isArray(data.resumes)) {
        resumeList = data.resumes;
      }

      setResumes(resumeList);
    } catch (err) {
      console.error("LOAD RESUMES ERROR:", err);
      setError(err.message || "Failed to load resumes.");
      setResumes([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // SELECT PDF FILE
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      setError("Only PDF files are allowed.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Resume file must be smaller than 10 MB.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // UPLOAD RESUME
  const handleUpload = async (event) => {
    event.preventDefault();

    const userId = getUserId();

    if (!userId) {
      setError("User information not found. Please login again.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a PDF resume.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("user_id", String(userId));
      formData.append("file", selectedFile);

      if (targetRole.trim()) {
        formData.append("target_role", targetRole.trim());
      }

      const response = await fetch(
        `${API_URL}/api/resumes/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log("UPLOAD RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data.detail || "Resume upload failed."
        );
      }

      setSuccess("Resume uploaded successfully!");

      setSelectedFile(null);
      setTargetRole("");

      const fileInput = document.getElementById("resume-file");

      if (fileInput) {
        fileInput.value = "";
      }

      await loadResumes();
    } catch (err) {
      console.error("UPLOAD RESUME ERROR:", err);
      setError(err.message || "Resume upload failed.");
    } finally {
      setLoading(false);
    }
  };

  // DELETE RESUME
  const handleDelete = async (resumeId) => {
    if (!resumeId) {
      setError("Resume ID is missing.");
      return;
    }

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
        `${API_URL}/api/resumes/${resumeId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete resume."
        );
      }

      setSuccess("Resume deleted successfully.");

      await loadResumes();
    } catch (err) {
      console.error("DELETE RESUME ERROR:", err);
      setError(err.message || "Failed to delete resume.");
    }
  };

  // OPEN RESUME
  const openResume = (fileUrl) => {
    if (!fileUrl) {
      setError("Resume file URL is not available.");
      return;
    }

    let fullUrl = fileUrl;

    if (
      !fileUrl.startsWith("http://") &&
      !fileUrl.startsWith("https://")
    ) {
      fullUrl = fileUrl.startsWith("/")
        ? `${API_URL}${fileUrl}`
        : `${API_URL}/${fileUrl}`;
    }

    console.log("Opening resume:", fullUrl);

    window.open(
      fullUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) return "N/A";

    try {
      const formattedDate = new Date(date);

      if (Number.isNaN(formattedDate.getTime())) {
        return "N/A";
      }

      return formattedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="resumes-page">
      <div className="resumes-container">

        {/* PAGE HEADER */}
        <div className="resumes-header">
          <div>
            <span className="resume-eyebrow">
              DOCUMENT CENTER
            </span>

            <h1>My Resumes</h1>

            <p>
              Upload and manage your resumes for different
              career opportunities.
            </p>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="resume-message error">
            <span className="message-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {success && (
          <div className="resume-message success">
            <span className="message-icon">✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* UPLOAD SECTION */}
        <div className="resume-upload-card">
          <div className="upload-card-header">
            <div className="upload-heading-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <h2>Upload Resume</h2>
              <p>
                Upload your latest resume in PDF format.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="resume-form">
            <div className="form-group">
              <label htmlFor="target-role">
                Target Role
              </label>

              <input
                id="target-role"
                type="text"
                placeholder="e.g. AI/ML Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="resume-file">
                Resume PDF
              </label>

              <input
                id="resume-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />

              {selectedFile && (
                <div className="selected-file">
                  <div className="selected-file-info">
                    <span className="selected-file-icon">
                      PDF
                    </span>

                    <div className="selected-file-text">
                      <strong>{selectedFile.name}</strong>
                      <span>
                        {(
                          selectedFile.size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="remove-selected-file"
                    onClick={() => {
                      setSelectedFile(null);
                      const input = document.getElementById(
                        "resume-file"
                      );
                      if (input) input.value = "";
                    }}
                    aria-label="Remove selected file"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="upload-resume-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  Uploading...
                </>
              ) : (
                <>
                  Upload Resume
                  <span className="button-arrow">↑</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* SAVED RESUMES */}
        <div className="resume-list-section">
          <div className="section-title">
            <div>
              <h2>Uploaded Resumes</h2>
              <p>Your saved resume versions</p>
            </div>

            <span
              className="resume-count"
              title={`${resumes.length} saved resumes`}
            >
              {resumes.length}
            </span>
          </div>

          {/* LOADING */}
          {fetching ? (
            <div className="resume-empty">
              <div className="loading-spinner"></div>
              <p>Loading your resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            /* EMPTY STATE */
            <div className="resume-empty">
              <div className="empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 3.75h7l5 5v11.5H7a2 2 0 01-2-2v-12a2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3.75v5h5M9 13h6M9 16.5h6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h3>No resumes uploaded yet</h3>

              <p>
                Upload your first resume using the form above.
                Your saved versions will appear here.
              </p>
            </div>
          ) : (
            <div className="resume-grid">
              {resumes.map((resume, index) => {
                const resumeId =
                  resume.resume_id || resume.id || index;

                const fileName =
                  resume.file_name ||
                  resume.filename ||
                  resume.fileName ||
                  "Resume.pdf";

                const fileUrl =
                  resume.file_url ||
                  resume.fileUrl ||
                  resume.url ||
                  resume.path ||
                  "";

                const uploadedAt =
                  resume.uploaded_at ||
                  resume.created_at ||
                  resume.uploadedAt ||
                  null;

                const targetRoleValue =
                  resume.target_role ||
                  resume.targetRole ||
                  "Not specified";

                const version = resume.version || 1;

                const score =
                  resume.resume_score ??
                  resume.resumeScore ??
                  null;

                const aiGenerated =
                  resume.ai_generated ??
                  resume.aiGenerated ??
                  false;

                return (
                  <article
                    className="resume-card"
                    key={resumeId}
                  >
                    {/* CARD HEADER */}
                    <div className="resume-card-top">
                      <div className="pdf-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M6.5 2.75h7l5 5v13a.5.5 0 01-.5.5h-11a2 2 0 01-2-2v-14a2.5 2.5 0 012.5-2.5z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13.5 2.75v5h5M7.5 15h9M7.5 18h6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>PDF</span>
                      </div>

                      <div className="resume-info">
                        <h3 title={fileName}>
                          {fileName}
                        </h3>

                        <p className="resume-upload-date">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <rect
                              x="3.5"
                              y="5"
                              width="17"
                              height="15"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                          Uploaded {formatDate(uploadedAt)}
                        </p>
                      </div>
                    </div>

                    {/* RESUME DETAILS */}
                    <div className="resume-details">
                      <div className="detail-item">
                        <span className="detail-label">
                          Target Role
                        </span>
                        <strong className="detail-value">
                          {targetRoleValue}
                        </strong>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">
                          Version
                        </span>
                        <strong className="detail-value version-badge">
                          v{version}
                        </strong>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">
                          Resume Score
                        </span>
                        <strong
                          className={`detail-value ${
                            score !== null &&
                            score !== undefined
                              ? "score-value"
                              : "muted-value"
                          }`}
                        >
                          {score !== null &&
                          score !== undefined
                            ? `${score}/100`
                            : "Not evaluated"}
                        </strong>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">
                          AI Generated
                        </span>
                        <strong
                          className={`detail-value ${
                            aiGenerated
                              ? "ai-yes"
                              : "ai-no"
                          }`}
                        >
                          <span className="status-dot"></span>
                          {aiGenerated ? "Yes" : "No"}
                        </strong>
                      </div>
                    </div>

                    {/* CARD ACTIONS */}
                    <div className="resume-actions">
                      <button
                        type="button"
                        className="view-resume-btn"
                        onClick={() => openResume(fileUrl)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="2.5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          />
                        </svg>
                        View Resume
                      </button>

                      <button
                        type="button"
                        className="delete-resume-btn"
                        onClick={() => handleDelete(resumeId)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5M14 11v5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Resume;
