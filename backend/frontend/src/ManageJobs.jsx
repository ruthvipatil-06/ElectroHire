import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ManageJobs.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ManageJobs() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedJob, setSelectedJob] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // GET LOGGED-IN RECRUITER
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      const recruiterId =
        parsedUser?.user_id ||
        parsedUser?.id ||
        parsedUser?.userId;

      if (!recruiterId) {
        setError("Recruiter session not found.");
        setLoading(false);
        return;
      }

      setUser({
        ...parsedUser,
        recruiter_id: recruiterId,
      });
    } catch (err) {
      console.error("Invalid user data:", err);
      setError("Invalid login session.");
      setLoading(false);
    }
  }, [navigate]);

  // ============================================================
  // FETCH RECRUITER JOBS
  // ============================================================

  useEffect(() => {
    if (!user?.recruiter_id) return;

    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/jobs/recruiter/${user.recruiter_id}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch jobs.");
      }

      console.log("Recruiter jobs:", data);

      /*
        Backend may return either:

        [
          {...},
          {...}
        ]

        OR

        {
          jobs: [...]
        }
      */

      const jobList = Array.isArray(data)
        ? data
        : data.jobs || [];

      setJobs(jobList);
    } catch (err) {
      console.error("Fetch jobs error:", err);
      setError("Unable to load your jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // DELETE JOB
  // ============================================================

  const handleDelete = async (jobId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this job? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/jobs/${jobId}?recruiter_id=${user.recruiter_id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete the job."
        );
      }

      setMessage("Job deleted successfully.");

      setJobs((prevJobs) =>
        prevJobs.filter((job) => job.job_id !== jobId)
      );
    } catch (err) {
      console.error("Delete job error:", err);
      setError(err.message || "Failed to delete job.");
    }
  };

  // ============================================================
  // VIEW JOB
  // ============================================================

  const handleView = (job) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  // ============================================================
  // EDIT JOB
  // ============================================================

  const handleEdit = (job) => {
    setMessage(
      `Edit functionality for "${job.job_title}" will be added next. The current database supports the core job fields.`
    );
  };

  // ============================================================
  // CLOSE JOB
  // ============================================================

  const handleClose = async (job) => {
    const confirmed = window.confirm(
      `Are you sure you want to close "${job.job_title}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/jobs/${job.job_id}/close?recruiter_id=${user.recruiter_id}`,
        { method: "PUT" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to close the job.");
      }

      setMessage("Job closed successfully.");

      setJobs((prevJobs) =>
        prevJobs.map((item) =>
          item.job_id === job.job_id
            ? { ...item, status: "Closed" }
            : item
        )
      );
    } catch (err) {
      console.error("Close job error:", err);
      setError(err.message || "Failed to close the job.");
    }
  };

  // ============================================================
  // FILTER JOBS
  // ============================================================

  const filteredJobs = jobs.filter((job) => {
    const title = job.job_title || "";
    const location = job.location || "";
    const company = job.company_name || "";
    const jobType = job.job_type || "";

    const search = searchTerm.toLowerCase();

    const matchesSearch =
      title.toLowerCase().includes(search) ||
      company.toLowerCase().includes(search) ||
      location.toLowerCase().includes(search) ||
      jobType.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" ||
      job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ============================================================
  // STATISTICS
  // ============================================================

  const totalJobs = jobs.length;

  const openJobs = jobs.filter(
    (job) => job.status === "Open"
  ).length;

  const closedJobs = jobs.filter(
    (job) => job.status === "Closed"
  ).length;

  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDate = (date) => {
    if (!date) return "Not specified";

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================

  const getStatusClass = (status) => {
    if (status === "Open") return "status-published";
    if (status === "Closed") return "status-closed";

    return "status-default";
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="manage-jobs-page">
        <div className="manage-loading">
          <div className="loading-spinner"></div>
          <p>Loading your jobs...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="manage-jobs-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="manage-jobs-header">

        <div>
          <button
            className="back-button"
            onClick={() => navigate("/recruiter-dashboard")}
          >
            ← Back to Dashboard
          </button>

          <h1>Manage Jobs</h1>

          <p>
            View, manage and track all the jobs posted by you.
          </p>
        </div>

        <button
          className="post-job-button"
          onClick={() => navigate("/post-job")}
        >
          + Post New Job
        </button>

      </div>

      {/* ======================================================
          MESSAGE
      ====================================================== */}

      {message && (
        <div className="success-message">
          {message}
          <button onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="job-statistics">

        <div
          className="stat-card"
          onClick={() => setStatusFilter("All")}
        >
          <div className="stat-icon total-icon">
            💼
          </div>

          <div>
            <span>Total Jobs</span>
            <strong>{totalJobs}</strong>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setStatusFilter("Open")}
        >
          <div className="stat-icon published-icon">
            ✓
          </div>

          <div>
            <span>Open</span>
            <strong>{openJobs}</strong>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setStatusFilter("Closed")}
        >
          <div className="stat-icon draft-icon">
            🔒
          </div>

          <div>
            <span>Closed</span>
            <strong>{closedJobs}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon closed-icon">
            📄
          </div>

          <div>
            <span>Applications</span>
            <strong>
              {jobs.reduce(
                (total, job) => total + Number(job.applications_count || 0),
                0
              )}
            </strong>
          </div>
        </div>

      </div>

      {/* ======================================================
          SEARCH + FILTER
      ====================================================== */}

      <div className="jobs-toolbar">

        <div className="search-box">

          <span>⌕</span>

          <input
            type="text"
            placeholder="Search by job title, location or type..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

        </div>

        <div className="filter-box">

          <label>Status:</label>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="All">All Jobs</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>

        </div>

      </div>

      {/* ======================================================
          JOB LIST
      ====================================================== */}

      <div className="jobs-section">

        <div className="jobs-section-header">

          <div>
            <h2>My Posted Jobs</h2>

            <p>
              {filteredJobs.length} job
              {filteredJobs.length !== 1 ? "s" : ""} found
            </p>
          </div>

        </div>

        {filteredJobs.length === 0 ? (

          <div className="empty-jobs">

            <div className="empty-icon">
              💼
            </div>

            <h3>No jobs found</h3>

            <p>
              {jobs.length === 0
                ? "You haven't posted any jobs yet."
                : "No jobs match your search or filter."}
            </p>

            {jobs.length === 0 && (
              <button
                onClick={() => navigate("/post-job")}
                className="empty-post-button"
              >
                + Post Your First Job
              </button>
            )}

          </div>

        ) : (

          <div className="jobs-grid">

            {filteredJobs.map((job) => (

              <div
                className="job-card"
                key={job.job_id}
              >

                {/* JOB CARD HEADER */}

                <div className="job-card-header">

                  <div className="job-title-section">

                    <div className="job-icon">
                      💼
                    </div>

                    <div>
                      <h3>
                        {job.job_title || "Untitled Job"}
                      </h3>

                      <span className="job-type">
                        {job.job_type || "Job"}
                      </span>
                    </div>

                  </div>

                  <span
                    className={`job-status ${getStatusClass(
                      job.status
                    )}`}
                  >
                    {job.status || "Open"}
                  </span>

                </div>

                {/* JOB INFORMATION */}

                <div className="job-information">

                  <div className="job-info-item">
                    <span>📍</span>
                    <p>
                      {job.location || "Location not specified"}
                    </p>
                  </div>

                  <div className="job-info-item">
                    <span>💼</span>
                    <p>
                      {job.work_mode || "Work mode not specified"}
                    </p>
                  </div>

                  <div className="job-info-item">
                    <span>💰</span>
                    <p>
                      {job.salary || "Salary not specified"}
                    </p>
                  </div>

                  <div className="job-info-item">
                    <span>📅</span>
                    <p>
                      Deadline:{" "}
                      {formatDate(job.application_deadline)}
                    </p>
                  </div>

                </div>

                {/* DESCRIPTION */}

                <div className="job-description">

                  <p>
                    {job.description
                      ? job.description.length > 150
                        ? `${job.description.substring(
                            0,
                            150
                          )}...`
                        : job.description
                      : "No description available."}
                  </p>

                </div>

                {/* APPLICATION INFO */}

                <div className="application-summary">

                  <div>
                    <strong>
                      {job.applications_count || 0}
                    </strong>

                    <span>
                      Applications
                    </span>
                  </div>

                  <div>
                    <strong>
                      {job.shortlisted_count || 0}
                    </strong>

                    <span>
                      Shortlisted
                    </span>
                  </div>

                </div>

                {/* ACTIONS */}

                <div className="job-actions">

                  <button
                    className="view-button"
                    onClick={() => handleView(job)}
                  >
                    View
                  </button>

                  <button
                    className="edit-button"
                    onClick={() => handleEdit(job)}
                  >
                    Edit
                  </button>

                  {job.status === "Open" && (
                    <button
                      className="close-button"
                      onClick={() => handleClose(job)}
                    >
                      Close
                    </button>
                  )}

                  <button
                    className="delete-button"
                    onClick={() =>
                      handleDelete(job.job_id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ======================================================
          JOB DETAILS MODAL
      ====================================================== */}

      {showDetails && selectedJob && (

        <div
          className="modal-overlay"
          onClick={() => setShowDetails(false)}
        >

          <div
            className="job-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <span
                  className={`job-status ${getStatusClass(
                    selectedJob.status
                  )}`}
                >
                  {selectedJob.status}
                </span>

                <h2>
                  {selectedJob.job_title}
                </h2>

                <p>
                  {selectedJob.job_type} •{" "}
                  {selectedJob.work_mode}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowDetails(false)
                }
              >
                ×
              </button>

            </div>

            <div className="modal-content">

              <div className="detail-grid">

                <div className="detail-item">
                  <label>Location</label>
                  <p>
                    {selectedJob.location ||
                      "Not specified"}
                  </p>
                </div>

                <div className="detail-item">
                  <label>Company</label>
                  <p>
                    {selectedJob.company_name || "Not specified"}
                  </p>
                </div>

                <div className="detail-item">
                  <label>Experience</label>
                  <p>
                    {selectedJob.experience_required ||
                      "Not specified"}
                  </p>
                </div>

                <div className="detail-item">
                  <label>Minimum CGPA</label>
                  <p>
                    {selectedJob.minimum_cgpa ??
                      "Not specified"}
                  </p>
                </div>

                <div className="detail-item">
                  <label>Application Deadline</label>
                  <p>
                    {formatDate(
                      selectedJob.application_deadline
                    )}
                  </p>
                </div>

                <div className="detail-item">
                  <label>Salary</label>
                  <p>
                    {selectedJob.salary || "Not specified"}
                  </p>
                </div>

              </div>

              <div className="modal-section">

                <h3>Description</h3>

                <p>
                  {selectedJob.description ||
                    "No description provided."}
                </p>

              </div>

              <div className="modal-section">
                <h3>Company</h3>
                <p>
                  {selectedJob.company_name || "Company not specified."}
                </p>
              </div>

              <div className="modal-section">
                <h3>Salary</h3>
                <p>
                  {selectedJob.salary || "Salary not specified."}
                </p>
              </div>

            </div>

            <div className="modal-footer">

              <button
                className="modal-secondary-button"
                onClick={() =>
                  setShowDetails(false)
                }
              >
                Close
              </button>

              <button
                className="modal-primary-button"
                onClick={() => handleEdit(selectedJob)}
              >
                Edit Job
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default ManageJobs;