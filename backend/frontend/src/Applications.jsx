
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Applications.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function readResponse(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data, fallback) {
  if (!data) return fallback;

  const detail = data.detail ?? data.message ?? data.error;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.msg || JSON.stringify(item)
      )
      .join("\n");
  }

  if (detail && typeof detail === "object") {
    return detail.message || detail.msg || JSON.stringify(detail);
  }

  return fallback;
}

function normalizeApplication(application) {
  return {
    ...application,
    status:
      application.application_status ??
      application.status ??
      "Applied",
    match_score:
      application.match_percentage ??
      application.match_score ??
      application.match_percentage_score ??
      null,
  };
}

function Applications() {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const getUser = useCallback(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;

      const user = JSON.parse(storedUser);
      return user && typeof user === "object" ? user : null;
    } catch (err) {
      console.error("Unable to read stored user:", err);
      return null;
    }
  }, []);

  const getUserId = useCallback(() => {
    const user = getUser();

    return (
      user?.user_id ??
      user?.student_id ??
      user?.id ??
      user?.userId ??
      null
    );
  }, [getUser]);

  const loadApplications = useCallback(async () => {
    const userId = getUserId();

    if (userId === null || userId === undefined || userId === "") {
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/applications/${encodeURIComponent(userId)}`,
        {
          headers: { Accept: "application/json" },
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to load your applications.")
        );
      }

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.applications)
          ? data.applications
          : null;

      if (!rows) {
        console.error("Unexpected applications response:", data);
        throw new Error(
          "The backend did not return an applications list."
        );
      }

      setApplications(rows.map(normalizeApplication));
    } catch (err) {
      console.error("Student applications error:", err);
      setError(err.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [getUserId, navigate]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const withdrawApplication = async (applicationId) => {
    if (!applicationId) {
      alert("Application ID is missing.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to withdraw this application?"
      )
    ) {
      return;
    }

    try {
      setWithdrawing(true);

      const response = await fetch(
        `${API_URL}/api/applications/${encodeURIComponent(
          applicationId
        )}/withdraw`,
        {
          method: "POST",
          headers: { Accept: "application/json" },
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to withdraw application.")
        );
      }

      alert(getErrorMessage(data, "Application withdrawn successfully."));
      setSelectedApplication(null);
      await loadApplications();
    } catch (err) {
      console.error("Withdraw application error:", err);
      alert(err.message || "Unable to withdraw application.");
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusClass = (status) => {
    const value = String(status || "Applied").toLowerCase();

    if (value.includes("shortlist")) return "status-shortlisted";
    if (value.includes("interview")) return "status-interview";
    if (value.includes("selected")) return "status-selected";
    if (value.includes("reject")) return "status-rejected";
    if (value.includes("withdraw")) return "status-withdrawn";
    if (value.includes("review")) return "status-review";

    return "status-applied";
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return String(date);
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="applications-page">
      <div className="applications-header">
        <div>
          <h1>My Applications</h1>
          <p>Track and manage the jobs you have applied for.</p>
        </div>

        <button
          className="find-jobs-button"
          onClick={() => navigate("/find-jobs")}
        >
          Find Jobs
        </button>
      </div>

      {!loading && (
        <div className="application-summary">
          <div className="summary-card">
            <span>Total Applications</span>
            <strong>{applications.length}</strong>
          </div>

          <div className="summary-card">
            <span>Under Review</span>
            <strong>
              {
                applications.filter((app) =>
                  String(app.status).toLowerCase().includes("review")
                ).length
              }
            </strong>
          </div>

          <div className="summary-card">
            <span>Shortlisted</span>
            <strong>
              {
                applications.filter((app) =>
                  String(app.status).toLowerCase().includes("shortlist")
                ).length
              }
            </strong>
          </div>

          <div className="summary-card">
            <span>Selected</span>
            <strong>
              {
                applications.filter((app) =>
                  String(app.status).toLowerCase().includes("selected")
                ).length
              }
            </strong>
          </div>
        </div>
      )}

      {error && (
        <div className="applications-error" role="alert">
          {error}
          <button onClick={loadApplications}>Retry</button>
        </div>
      )}

      {loading && (
        <div className="applications-loading">
          <div className="application-loader"></div>
          <p>Loading your applications...</p>
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <div className="no-applications">
          <div className="empty-icon">📄</div>
          <h2>No Applications Yet</h2>
          <p>You haven't applied for any jobs yet.</p>
          <button onClick={() => navigate("/find-jobs")}>
            Find Jobs
          </button>
        </div>
      )}

      {!loading && applications.length > 0 && (
        <div className="applications-list">
          {applications.map((application) => (
            <div
              className="application-card"
              key={application.application_id}
            >
              <div className="application-left">
                <div className="application-company-logo">
                  {(application.company_name || "C")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="application-job-info">
                  <h2>{application.job_title || "Job"}</h2>

                  <p className="application-company">
                    {application.company_name || "Company"}
                  </p>

                  <div className="application-meta">
                    {application.location && (
                      <span>📍 {application.location}</span>
                    )}
                    {application.job_type && (
                      <span>💼 {application.job_type}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="application-right">
                <span
                  className={`application-status ${getStatusClass(
                    application.status
                  )}`}
                >
                  {application.status}
                </span>

                {application.match_score !== null &&
                  application.match_score !== "" && (
                    <div className="application-match">
                      {Number(application.match_score).toFixed(0)}% Match
                    </div>
                  )}

                <div className="application-date">
                  Applied {formatDate(application.applied_at)}
                </div>

                <button
                  className="view-application-btn"
                  onClick={() => setSelectedApplication(application)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedApplication && (
        <div
          className="application-modal-overlay"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="application-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="application-modal-close"
              onClick={() => setSelectedApplication(null)}
              aria-label="Close application details"
            >
              ×
            </button>

            <div className="application-modal-logo">
              {(selectedApplication.company_name || "C")
                .charAt(0)
                .toUpperCase()}
            </div>

            <h2>{selectedApplication.job_title || "Job Application"}</h2>

            <p className="modal-company-name">
              {selectedApplication.company_name || "Company"}
            </p>

            <div className="detail-row">
              <span>Status</span>
              <strong
                className={`application-status ${getStatusClass(
                  selectedApplication.status
                )}`}
              >
                {selectedApplication.status}
              </strong>
            </div>

            <div className="detail-row">
              <span>Applied On</span>
              <strong>{formatDate(selectedApplication.applied_at)}</strong>
            </div>

            {selectedApplication.location && (
              <div className="detail-row">
                <span>Location</span>
                <strong>{selectedApplication.location}</strong>
              </div>
            )}

            {selectedApplication.job_type && (
              <div className="detail-row">
                <span>Job Type</span>
                <strong>{selectedApplication.job_type}</strong>
              </div>
            )}

            {selectedApplication.resume_file_name && (
              <div className="detail-row">
                <span>Resume</span>
                <strong>{selectedApplication.resume_file_name}</strong>
              </div>
            )}

            {selectedApplication.match_score !== null &&
              selectedApplication.match_score !== "" && (
                <div className="detail-row">
                  <span>Match Score</span>
                  <strong>
                    {Number(selectedApplication.match_score).toFixed(0)}%
                  </strong>
                </div>
              )}

            {selectedApplication.cover_letter && (
              <div className="cover-letter-section">
                <h3>Cover Letter</h3>
                <p>{selectedApplication.cover_letter}</p>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="close-details-btn"
                onClick={() => setSelectedApplication(null)}
              >
                Close
              </button>

              {!["withdrawn", "selected"].includes(
                String(selectedApplication.status).toLowerCase()
              ) && (
                <button
                  className="withdraw-btn"
                  disabled={withdrawing}
                  onClick={() =>
                    withdrawApplication(selectedApplication.application_id)
                  }
                >
                  {withdrawing ? "Withdrawing..." : "Withdraw Application"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Applications;
