
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./RecruiterApplications.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Safely read JSON or text responses from FastAPI.
async function readResponse(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// Extract a useful error message from FastAPI responses.
function getErrorMessage(data, fallback) {
  if (!data) return fallback;

  const detail = data.detail ?? data.message ?? data.error;

  if (typeof detail === "string") {
    return detail;
  }

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

// Normalize API responses to the field names used by this UI.
// Your MySQL table uses "status", not "application_status".
function normalizeApplication(application) {
  return {
    ...application,

    status:
      application.status ??
      application.application_status ??
      "Applied",

    match_percentage:
      application.match_percentage ??
      application.match_score ??
      null,
  };
}

function RecruiterApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [user, setUser] = useState(null);

  // Restore the logged-in user's session.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setError("Recruiter session not found. Please log in again.");
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (!parsedUser || typeof parsedUser !== "object") {
        throw new Error("Invalid user session.");
      }

      setUser(parsedUser);
    } catch (err) {
      console.error("Invalid user data:", err);
      setError("Invalid login session. Please log in again.");
      setLoading(false);
    }
  }, []);

  // Support the user ID formats used by different login responses.
  const getRecruiterId = useCallback(() => {
    return (
      user?.recruiter_id ??
      user?.user_id ??
      user?.recruiterId ??
      user?.id ??
      null
    );
  }, [user]);

  // Fetch applications belonging to the logged-in recruiter.
  const fetchApplications = useCallback(async (recruiterId) => {
    if (
      recruiterId === null ||
      recruiterId === undefined ||
      String(recruiterId).trim() === ""
    ) {
      setApplications([]);
      setError("Recruiter ID was not found in the login session.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/recruiter/applications/${encodeURIComponent(
          recruiterId
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to load recruiter applications."
          )
        );
      }

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.applications)
          ? data.applications
          : null;

      if (!rows) {
        console.error(
          "Unexpected recruiter applications response:",
          data
        );

        throw new Error(
          "The backend response did not contain an applications list."
        );
      }

      const normalizedRows = rows.map(normalizeApplication);

      setApplications(normalizedRows);

      // Keep the open modal synchronized with refreshed data.
      setSelectedApplication((previous) => {
        if (!previous) return null;

        return (
          normalizedRows.find(
            (application) =>
              String(application.application_id) ===
              String(previous.application_id)
          ) ?? null
        );
      });
    } catch (err) {
      console.error("Recruiter applications error:", err);
      setApplications([]);
      setError(err.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchApplications(getRecruiterId());
    }
  }, [user, getRecruiterId, fetchApplications]);

  // Update application status through the FastAPI endpoint.
  const updateApplicationStatus = async (
    applicationId,
    newStatus
  ) => {
    if (
      applicationId === null ||
      applicationId === undefined ||
      String(applicationId).trim() === ""
    ) {
      alert("Application ID is missing.");
      return;
    }

    if (
      !["Applied", "Shortlisted", "Interview", "Rejected"].includes(
        newStatus
      )
    ) {
      alert("Invalid application status.");
      return;
    }

    try {
      setUpdatingId(applicationId);

      const response = await fetch(
        `${API_URL}/api/recruiter/applications/${encodeURIComponent(
          applicationId
        )}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          // Send both names for compatibility with the existing API.
          // The backend should ultimately update recruiter_applications.status.
          body: JSON.stringify({
            status: newStatus,
            application_status: newStatus,
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to update application status."
          )
        );
      }

      // Update the table without requiring a page reload.
      setApplications((previous) =>
        previous.map((application) =>
          String(application.application_id) ===
          String(applicationId)
            ? {
                ...application,
                status: newStatus,
                application_status: newStatus,
              }
            : application
        )
      );

      // Update the currently selected application modal.
      setSelectedApplication((previous) =>
        previous &&
        String(previous.application_id) === String(applicationId)
          ? {
              ...previous,
              status: newStatus,
              application_status: newStatus,
            }
          : previous
      );
    } catch (err) {
      console.error("Status update error:", err);
      alert(err.message || "Unable to update application status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Search and filter applications.
  const filteredApplications = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return applications.filter((application) => {
      const studentName = String(
        application.student_name ??
          application.full_name ??
          ""
      ).toLowerCase();

      const email = String(
        application.email ?? ""
      ).toLowerCase();

      const jobTitle = String(
        application.job_title ??
          application.title ??
          ""
      ).toLowerCase();

      const matchesSearch =
        !search ||
        studentName.includes(search) ||
        email.includes(search) ||
        jobTitle.includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        application.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  // Dashboard statistics.
  const totalApplications = applications.length;

  const newApplications = applications.filter(
    (application) => application.status === "Applied"
  ).length;

  const shortlistedApplications = applications.filter(
    (application) => application.status === "Shortlisted"
  ).length;

  const interviewApplications = applications.filter(
    (application) => application.status === "Interview"
  ).length;

  // CSS status classes.
  const getStatusClass = (status) => {
    switch (status) {
      case "Shortlisted":
        return "status-shortlisted";

      case "Rejected":
        return "status-rejected";

      case "Interview":
        return "status-interview";

      case "Applied":
      default:
        return "status-applied";
    }
  };

  // CSS match-score classes.
  const getMatchClass = (percentage) => {
    const value = Number(percentage || 0);

    if (value >= 90) return "match-excellent";
    if (value >= 70) return "match-good";

    return "match-low";
  };

  // Format dates for display.
  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Loading screen.
  if (loading) {
    return (
      <div className="recruiter-applications-page">
        <div className="applications-loading">
          <div className="loading-spinner"></div>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recruiter-applications-page">
      {/* Page header */}
      <div className="applications-page-header">
        <div>
          <h1>Applications</h1>
          <p>
            Review and manage applications received for your posted jobs.
          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={() => fetchApplications(getRecruiterId())}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="applications-error" role="alert">
          <strong>Unable to load applications</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={() => fetchApplications(getRecruiterId())}
          >
            Retry
          </button>
        </div>
      )}

      {/* Application statistics */}
      <div className="application-statistics">
        <div className="application-stat-card">
          <div className="stat-icon stat-icon-blue">▣</div>
          <div>
            <span>Total Applications</span>
            <strong>{totalApplications}</strong>
          </div>
        </div>

        <div className="application-stat-card">
          <div className="stat-icon stat-icon-orange">●</div>
          <div>
            <span>New Applications</span>
            <strong>{newApplications}</strong>
          </div>
        </div>

        <div className="application-stat-card">
          <div className="stat-icon stat-icon-green">✓</div>
          <div>
            <span>Shortlisted</span>
            <strong>{shortlistedApplications}</strong>
          </div>
        </div>

        <div className="application-stat-card">
          <div className="stat-icon stat-icon-purple">◷</div>
          <div>
            <span>Interviews</span>
            <strong>{interviewApplications}</strong>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="applications-filter-bar">
        <div className="application-search">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search student, email or job..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="status-filter"
          aria-label="Filter applications by status"
        >
          <option value="All">All Applications</option>
          <option value="Applied">New</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Interview">Interview</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Applications table */}
      <div className="applications-card">
        <div className="applications-card-header">
          <div>
            <h2>All Applications</h2>
            <p>
              {filteredApplications.length} application
              {filteredApplications.length !== 1 ? "s" : ""} shown
            </p>
          </div>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="applications-empty">
            <div className="empty-application-icon">▣</div>

            <h3>No applications found</h3>

            <p>
              Student applications for your posted jobs will appear here.
            </p>

            {(searchTerm || statusFilter !== "All") && (
              <button
                type="button"
                className="clear-filters-button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="applications-table-wrapper">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>APPLIED FOR</th>
                  <th>MATCH</th>
                  <th>ASSESSMENT</th>
                  <th>APPLIED ON</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {filteredApplications.map((application) => {
                  const studentName =
                    application.student_name ||
                    application.full_name ||
                    "Unknown Student";

                  const matchPercentage = Math.min(
                    Math.max(
                      Number(application.match_percentage || 0),
                      0
                    ),
                    100
                  );

                  return (
                    <tr key={application.application_id}>
                      {/* Student details */}
                      <td>
                        <div className="student-information">
                          <div className="student-avatar">
                            {studentName.charAt(0).toUpperCase()}
                          </div>

                          <div className="student-text">
                            <strong>{studentName}</strong>
                            <span>
                              {application.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Job title */}
                      <td>
                        <span className="job-name">
                          {application.job_title ||
                            application.title ||
                            "Unknown Job"}
                        </span>
                      </td>

                      {/* Match percentage */}
                      <td>
                        <div className="match-container">
                          <span
                            className={`match-value ${getMatchClass(
                              matchPercentage
                            )}`}
                          >
                            {matchPercentage.toFixed(0)}%
                          </span>

                          <div className="match-progress">
                            <div
                              className={`match-progress-fill ${getMatchClass(
                                matchPercentage
                              )}`}
                              style={{
                                width: `${matchPercentage}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Assessment score */}
                      <td>
                        {application.assessment_score != null ? (
                          <span className="assessment-value">
                            {Number(
                              application.assessment_score
                            ).toFixed(0)}
                            /100
                          </span>
                        ) : (
                          <span className="not-attempted">
                            Not attempted
                          </span>
                        )}
                      </td>

                      {/* Application date */}
                      <td>
                        <span className="application-date">
                          {formatDate(application.applied_at)}
                        </span>
                      </td>

                      {/* Application status */}
                      <td>
                        <span
                          className={`application-status ${getStatusClass(
                            application.status
                          )}`}
                        >
                          {application.status}
                        </span>
                      </td>

                      {/* View application */}
                      <td>
                        <button
                          type="button"
                          className="view-application-button"
                          onClick={() =>
                            setSelectedApplication(application)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application details modal */}
      {selectedApplication && (
        <div
          className="application-modal-overlay"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="application-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal header */}
            <div className="modal-header">
              <div>
                <h2>Application Details</h2>
                <p>Review this student's application.</p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() => setSelectedApplication(null)}
                aria-label="Close application details"
              >
                ×
              </button>
            </div>

            {/* Student information */}
            <div className="modal-student-section">
              <div className="modal-student-avatar">
                {(
                  selectedApplication.student_name ||
                  selectedApplication.full_name ||
                  "S"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>
                  {selectedApplication.student_name ||
                    selectedApplication.full_name ||
                    "Unknown Student"}
                </h3>

                <p>
                  {selectedApplication.email ||
                    "No email available"}
                </p>
              </div>
            </div>

            {/* Application details */}
            <div className="application-details-grid">
              <div className="application-detail-box">
                <span>Applied For</span>
                <strong>
                  {selectedApplication.job_title ||
                    selectedApplication.title ||
                    "Unknown Job"}
                </strong>
              </div>

              <div className="application-detail-box">
                <span>Match Percentage</span>
                <strong className="detail-match">
                  {Number(
                    selectedApplication.match_percentage || 0
                  ).toFixed(0)}
                  %
                </strong>
              </div>

              <div className="application-detail-box">
                <span>Assessment Score</span>
                <strong>
                  {selectedApplication.assessment_score != null
                    ? `${Number(
                        selectedApplication.assessment_score
                      ).toFixed(0)}/100`
                    : "Not attempted"}
                </strong>
              </div>

              <div className="application-detail-box">
                <span>Applied On</span>
                <strong>
                  {formatDate(selectedApplication.applied_at)}
                </strong>
              </div>
            </div>

            {/* Current status */}
            <div className="modal-status-section">
              <span>Current Status</span>

              <span
                className={`application-status ${getStatusClass(
                  selectedApplication.status
                )}`}
              >
                {selectedApplication.status}
              </span>
            </div>

            {/* Recruiter actions */}
            <div className="modal-action-buttons">
              <button
                type="button"
                className="modal-shortlist-button"
                disabled={
                  updatingId === selectedApplication.application_id
                }
                onClick={() =>
                  updateApplicationStatus(
                    selectedApplication.application_id,
                    "Shortlisted"
                  )
                }
              >
                {updatingId === selectedApplication.application_id
                  ? "Updating..."
                  : "✓ Shortlist"}
              </button>

              <button
                type="button"
                className="modal-interview-button"
                disabled={
                  updatingId === selectedApplication.application_id
                }
                onClick={() =>
                  updateApplicationStatus(
                    selectedApplication.application_id,
                    "Interview"
                  )
                }
              >
                ◷ Move to Interview
              </button>

              <button
                type="button"
                className="modal-reject-button"
                disabled={
                  updatingId === selectedApplication.application_id
                }
                onClick={() =>
                  updateApplicationStatus(
                    selectedApplication.application_id,
                    "Rejected"
                  )
                }
              >
                × Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecruiterApplications;
