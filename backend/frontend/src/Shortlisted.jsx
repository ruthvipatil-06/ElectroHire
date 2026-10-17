import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Shortlisted.css";

const API_URL = "http://localhost:8000";

function Shortlisted() {
  const navigate = useNavigate();

  const [shortlisted, setShortlisted] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All");

  const [selectedStudent, setSelectedStudent] = useState(null);

  // ============================================================
  // GET RECRUITER ID
  // ============================================================

  const getRecruiterId = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return null;
      }

      const user = JSON.parse(storedUser);

      return (
        user.user_id ||
        user.id ||
        user.recruiter_id ||
        user.recruiterId ||
        null
      );
    } catch (error) {
      console.error("Error reading user:", error);
      return null;
    }
  };

  // ============================================================
  // FETCH SHORTLISTED STUDENTS
  // ============================================================

  const fetchShortlisted = async () => {
    try {
      setLoading(true);
      setError("");

      const recruiterId = getRecruiterId();

      if (!recruiterId) {
        setError("Recruiter session not found. Please login again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/recruiter/shortlisted/${recruiterId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch shortlisted students");
      }

      const data = await response.json();

      const students = Array.isArray(data)
        ? data
        : data.shortlisted || data.data || [];

      setShortlisted(students);
      setFilteredStudents(students);
    } catch (error) {
      console.error("Error fetching shortlisted students:", error);
      setError("Unable to load shortlisted students.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchShortlisted();
  }, []);

  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  useEffect(() => {
    let result = [...shortlisted];

    // Search
    if (search.trim() !== "") {
      const searchText = search.toLowerCase();

      result = result.filter((student) => {
        return (
          (student.student_name || student.full_name || "")
            .toLowerCase()
            .includes(searchText) ||
          (student.student_email || student.email || "")
            .toLowerCase()
            .includes(searchText) ||
          (student.job_title || student.title || "")
            .toLowerCase()
            .includes(searchText)
        );
      });
    }

    // Job filter
    if (jobFilter !== "All") {
      result = result.filter(
        (student) =>
          (student.job_title || student.title || "") === jobFilter
      );
    }

    setFilteredStudents(result);
  }, [search, jobFilter, shortlisted]);

  // ============================================================
  // GET UNIQUE JOBS
  // ============================================================

  const jobs = [
    "All",
    ...new Set(
      shortlisted
        .map((student) => student.job_title || student.title)
        .filter(Boolean)
    ),
  ];

  // ============================================================
  // REMOVE FROM SHORTLIST
  // ============================================================

  const removeFromShortlist = async (applicationId) => {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove this student from the shortlist?"
    );

    if (!confirmRemove) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/recruiter/applications/${applicationId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Applied",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove student from shortlist");
      }

      alert("Student removed from shortlist.");

      setSelectedStudent(null);

      fetchShortlisted();
    } catch (error) {
      console.error("Remove shortlist error:", error);
      alert("Unable to remove student from shortlist.");
    }
  };

  // ============================================================
  // SCHEDULE INTERVIEW
  // ============================================================

  const scheduleInterview = async (applicationId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/recruiter/applications/${applicationId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Interview",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update interview status");
      }

      alert("Student moved to Interview.");

      setSelectedStudent(null);

      fetchShortlisted();
    } catch (error) {
      console.error("Interview status error:", error);
      alert("Unable to move student to interview.");
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    navigate("/login");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="shortlisted-page">
        <div className="shortlisted-loading">
          <div className="loading-spinner"></div>
          <p>Loading shortlisted students...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="shortlisted-page">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="shortlisted-header">
        <div>
          <h1>Shortlisted Students</h1>

          <p>
            Manage students shortlisted for your job opportunities.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchShortlisted}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div className="shortlisted-error">
          ⚠️ {error}
        </div>
      )}

      {/* ========================================================
          STAT CARDS
      ======================================================== */}

      <div className="shortlisted-stats">

        <div className="stat-card">
          <div className="stat-icon">👥</div>

          <div>
            <span className="stat-label">
              Total Shortlisted
            </span>

            <strong>
              {shortlisted.length}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>

          <div>
            <span className="stat-label">
              Average Match
            </span>

            <strong>
              {shortlisted.length > 0
                ? `${(
                    shortlisted.reduce(
                      (sum, student) =>
                        sum +
                        Number(
                          student.match_percentage || 0
                        ),
                      0
                    ) / shortlisted.length
                  ).toFixed(1)}%`
                : "0%"}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🧠</div>

          <div>
            <span className="stat-label">
              Average Assessment
            </span>

            <strong>
              {shortlisted.length > 0
                ? `${(
                    shortlisted.reduce(
                      (sum, student) =>
                        sum +
                        Number(
                          student.assessment_score || 0
                        ),
                      0
                    ) / shortlisted.length
                  ).toFixed(1)}%`
                : "0%"}
            </strong>
          </div>
        </div>

      </div>

      {/* ========================================================
          FILTER BAR
      ======================================================== */}

      <div className="shortlisted-toolbar">

        <div className="search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search student, email or job..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="job-filter"
        >
          {jobs.map((job, index) => (
            <option key={index} value={job}>
              {job}
            </option>
          ))}
        </select>

      </div>

      {/* ========================================================
          EMPTY STATE
      ======================================================== */}

      {filteredStudents.length === 0 ? (

        <div className="empty-shortlisted">

          <div className="empty-icon">
            ⭐
          </div>

          <h2>
            No Shortlisted Students
          </h2>

          <p>
            Students you shortlist from the Applications
            page will appear here.
          </p>

          <button
            onClick={() =>
              navigate("/recruiter-applications")
            }
          >
            View Applications
          </button>

        </div>

      ) : (

        /* ======================================================
           TABLE
        ====================================================== */

        <div className="shortlisted-table-container">

          <table className="shortlisted-table">

            <thead>
              <tr>
                <th>Student</th>
                <th>Job</th>
                <th>Match</th>
                <th>Assessment</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredStudents.map((student) => (

                <tr key={student.application_id}>

                  {/* STUDENT */}

                  <td>
                    <div className="student-info">

                      <div className="student-avatar">
                        {(student.student_name ||
                          student.full_name ||
                          "S"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {student.student_name ||
                            student.full_name ||
                            "Unknown Student"}
                        </strong>

                        <span>
                          {student.student_email ||
                            student.email ||
                            "No email"}
                        </span>
                      </div>

                    </div>
                  </td>

                  {/* JOB */}

                  <td>
                    <div className="job-info">

                      <strong>
                        {student.job_title ||
                          student.title ||
                          "Unknown Job"}
                      </strong>

                      <span>
                        {student.company_name ||
                          "Company"}
                      </span>

                    </div>
                  </td>

                  {/* MATCH */}

                  <td>

                    <div className="score-wrapper">

                      <div className="score-bar">

                        <div
                          className="score-fill"
                          style={{
                            width: `${Math.min(
                              Number(
                                student.match_percentage || 0
                              ),
                              100
                            )}%`,
                          }}
                        ></div>

                      </div>

                      <strong>
                        {student.match_percentage || 0}%
                      </strong>

                    </div>

                  </td>

                  {/* ASSESSMENT */}

                  <td>
                    <span className="assessment-score">
                      {student.assessment_score != null
                        ? `${student.assessment_score}%`
                        : "Not Available"}
                    </span>
                  </td>

                  {/* DATE */}

                  <td>
                    {student.applied_at
                      ? new Date(
                          student.applied_at
                        ).toLocaleDateString()
                      : "-"}
                  </td>

                  {/* STATUS */}

                  <td>
                    <span className="status-badge">
                      {student.status || "Shortlisted"}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td>

                    <div className="action-buttons">

                      <button
                        className="view-btn"
                        onClick={() =>
                          setSelectedStudent(student)
                        }
                        title="View Student"
                      >
                        View
                      </button>

                      <button
                        className="interview-btn"
                        onClick={() =>
                          scheduleInterview(
                            student.application_id
                          )
                        }
                        title="Schedule Interview"
                      >
                        Interview
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

      {/* ========================================================
          STUDENT DETAILS MODAL
      ======================================================== */}

      {selectedStudent && (

        <div
          className="modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >

          <div
            className="student-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <h2>
                  {selectedStudent.student_name ||
                    selectedStudent.full_name ||
                    "Student"}
                </h2>

                <p>
                  {selectedStudent.student_email ||
                    selectedStudent.email ||
                    "No email available"}
                </p>
              </div>

              <button
                className="close-modal"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                ×
              </button>

            </div>

            <div className="modal-content">

              <div className="detail-section">

                <h3>
                  Application Details
                </h3>

                <div className="detail-grid">

                  <div>
                    <span>Job</span>
                    <strong>
                      {selectedStudent.job_title ||
                        selectedStudent.title ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Company</span>
                    <strong>
                      {selectedStudent.company_name ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Match Percentage</span>
                    <strong>
                      {selectedStudent.match_percentage || 0}%
                    </strong>
                  </div>

                  <div>
                    <span>Assessment Score</span>
                    <strong>
                      {selectedStudent.assessment_score != null
                        ? `${selectedStudent.assessment_score}%`
                        : "Not Available"}
                    </strong>
                  </div>

                  <div>
                    <span>Applied On</span>
                    <strong>
                      {selectedStudent.applied_at
                        ? new Date(
                            selectedStudent.applied_at
                          ).toLocaleDateString()
                        : "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {selectedStudent.status ||
                        "Shortlisted"}
                    </strong>
                  </div>

                </div>

              </div>

              {/* LOCATION */}

              {selectedStudent.location && (
                <div className="detail-section">

                  <h3>Job Location</h3>

                  <p>
                    📍 {selectedStudent.location}
                  </p>

                </div>
              )}

              {/* NOTES */}

              {selectedStudent.recruiter_notes && (
                <div className="detail-section">

                  <h3>Recruiter Notes</h3>

                  <p>
                    {selectedStudent.recruiter_notes}
                  </p>

                </div>
              )}

            </div>

            <div className="modal-footer">

              <button
                className="remove-btn"
                onClick={() =>
                  removeFromShortlist(
                    selectedStudent.application_id
                  )
                }
              >
                Remove from Shortlist
              </button>

              <button
                className="modal-interview-btn"
                onClick={() =>
                  scheduleInterview(
                    selectedStudent.application_id
                  )
                }
              >
                Move to Interview
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Shortlisted;