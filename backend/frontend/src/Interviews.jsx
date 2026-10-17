import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Interviews.css";

const API_URL = "http://localhost:8000";

function Interviews() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [filteredInterviews, setFilteredInterviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedInterview, setSelectedInterview] = useState(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  const [saving, setSaving] = useState(false);

  // ============================================================
  // SCHEDULE FORM
  // ============================================================

  const [scheduleForm, setScheduleForm] = useState({
    application_id: "",
    interview_date: "",
    interview_time: "",
    interview_type: "Online",
    meeting_link: "",
    location: "",
  });

  // ============================================================
  // EVALUATION FORM
  // ============================================================

  const [evaluationForm, setEvaluationForm] = useState({
    technical_skills: 0,
    communication: 0,
    problem_solving: 0,
    confidence: 0,
    role_knowledge: 0,
    recruiter_feedback: "",
    final_decision: "",
  });

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
      console.error("Error reading recruiter:", error);
      return null;
    }
  };

  // ============================================================
  // FETCH INTERVIEWS
  // ============================================================

  const fetchInterviews = async () => {
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
        `${API_URL}/api/recruiter/interviews/${recruiterId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const rawText = await response.text();

      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : [];
      } catch (parseError) {
        console.error("Invalid JSON from interview API:", rawText);
        throw new Error(
          `Backend returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            `Interview API failed with HTTP ${response.status}.`
        );
      }

      const interviewData = Array.isArray(data)
        ? data
        : Array.isArray(data.interviews)
        ? data.interviews
        : Array.isArray(data.data)
        ? data.data
        : [];

      console.log("INTERVIEWS API RESPONSE:", interviewData);

      setInterviews(interviewData);
      setFilteredInterviews(interviewData);
    } catch (error) {
      console.error("Error fetching interviews:", error);

      setError(
        error.message ||
          "Unable to load interviews. Please make sure the backend interview API is available."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchInterviews();
  }, []);

  // ============================================================
  // FILTER INTERVIEWS
  // ============================================================

  useEffect(() => {
    let result = [...interviews];

    if (search.trim() !== "") {
      const searchText = search.toLowerCase();

      result = result.filter((interview) => {
        return (
          (interview.student_name || "")
            .toLowerCase()
            .includes(searchText) ||
          (interview.student_email || interview.email || "")
            .toLowerCase()
            .includes(searchText) ||
          (interview.job_title || "")
            .toLowerCase()
            .includes(searchText) ||
          (interview.company_name || "")
            .toLowerCase()
            .includes(searchText)
        );
      });
    }

    if (jobFilter !== "All") {
      result = result.filter(
        (interview) => interview.job_title === jobFilter
      );
    }

    if (statusFilter !== "All") {
      result = result.filter(
        (interview) => interview.status === statusFilter
      );
    }

    setFilteredInterviews(result);
  }, [search, jobFilter, statusFilter, interviews]);

  // ============================================================
  // JOB LIST
  // ============================================================

  const jobs = [
    "All",
    ...new Set(
      interviews
        .map((interview) => interview.job_title)
        .filter(Boolean)
    ),
  ];

  // ============================================================
  // STATISTICS
  // ============================================================

  const totalInterviews = interviews.length;

  const upcomingInterviews = interviews.filter(
    (interview) => interview.status === "Scheduled"
  ).length;

  const completedInterviews = interviews.filter(
    (interview) => interview.status === "Completed"
  ).length;

  const pendingInterviews = interviews.filter(
    (interview) =>
      interview.status === "Scheduled" &&
      interview.interview_date &&
      new Date(
        `${interview.interview_date}T${interview.interview_time || "00:00"}`
      ) >= new Date()
  ).length;

  // ============================================================
  // OPEN SCHEDULE MODAL
  // ============================================================

  const openScheduleModal = () => {
    setScheduleForm({
      application_id: "",
      interview_date: "",
      interview_time: "",
      interview_type: "Online",
      meeting_link: "",
      location: "",
    });

    setShowScheduleModal(true);
  };

  // ============================================================
  // SCHEDULE INTERVIEW
  // ============================================================

  const handleScheduleInterview = async (e) => {
    e.preventDefault();

    const recruiterId = getRecruiterId();

    if (!recruiterId) {
      alert("Recruiter session not found. Please login again.");
      return;
    }

    if (!scheduleForm.application_id) {
      alert("Please enter the application ID.");
      return;
    }

    const meetingOrLocation =
      scheduleForm.interview_type === "Online"
        ? scheduleForm.meeting_link.trim()
        : scheduleForm.location.trim();

    if (!meetingOrLocation) {
      alert(
        scheduleForm.interview_type === "Online"
          ? "Please enter the meeting link."
          : "Please enter the interview location."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/recruiter/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiter_id: Number(recruiterId),
          application_id: Number(scheduleForm.application_id),
          interview_date: scheduleForm.interview_date,
          interview_time: scheduleForm.interview_time,
          mode: scheduleForm.interview_type,
          meeting_link: meetingOrLocation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to schedule interview.");
      }

      alert("Interview scheduled successfully.");
      setShowScheduleModal(false);
      await fetchInterviews();
    } catch (error) {
      console.error("Schedule interview error:", error);
      alert(error.message || "Unable to schedule interview.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // VIEW INTERVIEW
  // ============================================================

  const viewInterview = (interview) => {
    setSelectedInterview(interview);
  };

  // ============================================================
  // COMPLETE INTERVIEW
  // ============================================================

  const completeInterview = (interview) => {
    setSelectedInterview(interview);

    setEvaluationForm({
      technical_skills: 0,
      communication: 0,
      problem_solving: 0,
      confidence: 0,
      role_knowledge: 0,
      recruiter_feedback: "",
      final_decision: "",
    });

    setShowEvaluationModal(true);
  };

  // ============================================================
  // SAVE EVALUATION
  // ============================================================

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();

    if (!selectedInterview) {
      return;
    }

    const scores = [
      Number(evaluationForm.technical_skills),
      Number(evaluationForm.communication),
      Number(evaluationForm.problem_solving),
      Number(evaluationForm.confidence),
      Number(evaluationForm.role_knowledge),
    ];

    const overallScore =
      scores.reduce((sum, score) => sum + score, 0) /
      scores.length;

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/recruiter/interviews/${selectedInterview.interview_id}/evaluation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            technical_skills: scores[0],
            communication: scores[1],
            problem_solving: scores[2],
            confidence: scores[3],
            role_knowledge: scores[4],
            overall_score: overallScore,
            recruiter_feedback:
              evaluationForm.recruiter_feedback,
            final_decision:
              evaluationForm.final_decision || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to save evaluation"
        );
      }

      alert("Interview evaluation saved successfully.");

      setShowEvaluationModal(false);
      setSelectedInterview(null);

      fetchInterviews();
    } catch (error) {
      console.error("Evaluation error:", error);

      alert(
        error.message || "Unable to save interview evaluation."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  const updateInterviewStatus = async (
    interviewId,
    status
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/recruiter/interviews/${interviewId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update interview status"
        );
      }

      alert(`Interview marked as ${status}.`);

      setSelectedInterview(null);

      fetchInterviews();
    } catch (error) {
      console.error("Status update error:", error);

      alert(
        error.message ||
          "Unable to update interview status."
      );
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (time) => {
    if (!time) return "-";

    const [hours, minutes] = time.split(":");

    const date = new Date();

    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
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
      <div className="interviews-page">
        <div className="interviews-loading">
          <div className="interviews-spinner"></div>
          <p>Loading interviews...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="interviews-page">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="interviews-header">

        <div>
          <p className="interviews-small-label">
            ELECTROHIRE
          </p>

          <h1>Interviews</h1>

          <p>
            Manage and track candidate interviews.
          </p>
        </div>

        <div className="interviews-header-actions">

          <button
            className="back-dashboard-btn"
            onClick={() =>
              navigate("/recruiter-dashboard")
            }
          >
            ← Dashboard
          </button>

          <button
            className="schedule-main-btn"
            onClick={openScheduleModal}
          >
            ＋ Schedule Interview
          </button>

        </div>

      </div>


      {/* ======================================================
          ERROR
      ======================================================= */}

      {error && (
        <div className="interviews-error">
          ⚠️ {error}
        </div>
      )}


      {/* ======================================================
          STATISTICS
      ======================================================= */}

      <div className="interview-stats">

        <div className="interview-stat-card">

          <div className="interview-stat-icon total">
            📅
          </div>

          <div>
            <span>Total Interviews</span>
            <strong>{totalInterviews}</strong>
          </div>

        </div>


        <div className="interview-stat-card">

          <div className="interview-stat-icon upcoming">
            ⏰
          </div>

          <div>
            <span>Upcoming</span>
            <strong>{upcomingInterviews}</strong>
          </div>

        </div>


        <div className="interview-stat-card">

          <div className="interview-stat-icon completed">
            ✓
          </div>

          <div>
            <span>Completed</span>
            <strong>{completedInterviews}</strong>
          </div>

        </div>


        <div className="interview-stat-card">

          <div className="interview-stat-icon pending">
            ⏳
          </div>

          <div>
            <span>Pending</span>
            <strong>{pendingInterviews}</strong>
          </div>

        </div>

      </div>


      {/* ======================================================
          TOOLBAR
      ======================================================= */}

      <div className="interviews-toolbar">

        <div className="interview-search">

          <span>🔍</span>

          <input
            type="text"
            placeholder="Search student, job or company..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>


        <select
          value={jobFilter}
          onChange={(e) =>
            setJobFilter(e.target.value)
          }
        >
          {jobs.map((job, index) => (
            <option
              key={index}
              value={job}
            >
              {job === "All"
                ? "All Jobs"
                : job}
            </option>
          ))}
        </select>


        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="All">
            All Status
          </option>

          <option value="Scheduled">
            Scheduled
          </option>

          <option value="Completed">
            Completed
          </option>

          <option value="Cancelled">
            Cancelled
          </option>
        </select>

      </div>


      {/* ======================================================
          INTERVIEW TABLE
      ======================================================= */}

      {filteredInterviews.length === 0 ? (

        <div className="empty-interviews">

          <div className="empty-interview-icon">
            📅
          </div>

          <h2>No Interviews Found</h2>

          <p>
            Schedule an interview for a shortlisted
            candidate to see it here.
          </p>

          <button
            onClick={() =>
              navigate("/shortlisted")
            }
          >
            View Shortlisted Students
          </button>

        </div>

      ) : (

        <div className="interviews-table-container">

          <table className="interviews-table">

            <thead>

              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Date & Time</th>
                <th>Interview</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>


            <tbody>

              {filteredInterviews.map(
                (interview) => (

                  <tr
                    key={
                      interview.interview_id
                    }
                  >

                    {/* CANDIDATE */}

                    <td>

                      <div className="candidate-info">

                        <div className="candidate-avatar">

                          {(
                            interview.student_name ||
                            "S"
                          )
                            .charAt(0)
                            .toUpperCase()}

                        </div>

                        <div>

                          <strong>
                            {
                              interview.student_name ||
                              "Unknown Student"
                            }
                          </strong>

                          <span>
                            {
                              interview.student_email ||
                              interview.email ||
                              "No email"
                            }
                          </span>

                        </div>

                      </div>

                    </td>


                    {/* JOB */}

                    <td>

                      <div className="interview-job-info">

                        <strong>
                          {
                            interview.job_title ||
                            "Unknown Job"
                          }
                        </strong>

                        <span>
                          {
                            interview.company_name ||
                            "Company"
                          }
                        </span>

                      </div>

                    </td>


                    {/* DATE */}

                    <td>

                      <div className="date-time-info">

                        <strong>
                          {formatDate(
                            interview.interview_date
                          )}
                        </strong>

                        <span>
                          {formatTime(
                            interview.interview_time
                          )}
                        </span>

                      </div>

                    </td>


                    {/* ROUND */}

                    <td>

                      <span className="round-badge">
                        Interview
                      </span>

                    </td>


                    {/* TYPE */}

                    <td>

                      <span>
                        {interview.interview_type ===
                        "Online"
                          ? "💻 Online"
                          : "📍 Offline"}
                      </span>

                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={`interview-status ${(
                          interview.status ||
                          "Scheduled"
                        )
                          .toLowerCase()
                          .replace(
                            /\s+/g,
                            "-"
                          )}`}
                      >
                        {
                          interview.status ||
                          "Scheduled"
                        }
                      </span>

                    </td>


                    {/* ACTIONS */}

                    <td>

                      <div className="interview-actions">

                        <button
                          className="view-interview-btn"
                          onClick={() =>
                            viewInterview(
                              interview
                            )
                          }
                        >
                          View
                        </button>


                        {interview.status ===
                          "Scheduled" && (

                          <button
                            className="complete-interview-btn"
                            onClick={() =>
                              completeInterview(
                                interview
                              )
                            }
                          >
                            Evaluate
                          </button>

                        )}

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}


      {/* ======================================================
          VIEW INTERVIEW MODAL
      ======================================================= */}

      {selectedInterview &&
        !showEvaluationModal && (

          <div
            className="interview-modal-overlay"
            onClick={() =>
              setSelectedInterview(null)
            }
          >

            <div
              className="interview-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="interview-modal-header">

                <div>

                  <h2>
                    {
                      selectedInterview.student_name ||
                      "Student"
                    }
                  </h2>

                  <p>
                    {
                      selectedInterview.student_email ||
                      selectedInterview.email ||
                      "No email"
                    }
                  </p>

                </div>

                <button
                  onClick={() =>
                    setSelectedInterview(null)
                  }
                  className="close-interview-modal"
                >
                  ×
                </button>

              </div>


              <div className="interview-modal-content">

                {/* INTERVIEW DETAILS */}

                <div className="interview-detail-section">

                  <h3>
                    Interview Details
                  </h3>

                  <div className="interview-detail-grid">

                    <div>
                      <span>Job</span>

                      <strong>
                        {
                          selectedInterview.job_title ||
                          "-"
                        }
                      </strong>
                    </div>


                    <div>
                      <span>Company</span>

                      <strong>
                        {
                          selectedInterview.company_name ||
                          "-"
                        }
                      </strong>
                    </div>


                    <div>
                      <span>Interview</span>

                      <strong>
                        Interview
                      </strong>
                    </div>


                    <div>
                      <span>Date</span>

                      <strong>
                        {formatDate(
                          selectedInterview.interview_date
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>Time</span>

                      <strong>
                        {formatTime(
                          selectedInterview.interview_time
                        )}
                      </strong>
                    </div>


                    <div>
                      <span>Type</span>

                      <strong>
                        {
                          selectedInterview.interview_type ||
                          "-"
                        }
                      </strong>
                    </div>


                    <div>
                      <span>Match Score</span>

                      <strong>
                        {
                          selectedInterview.match_percentage ??
                          0
                        }%
                      </strong>
                    </div>


                    <div>
                      <span>Assessment Score</span>

                      <strong>
                        {
                          selectedInterview.assessment_score ??
                          "N/A"
                        }
                        {selectedInterview.assessment_score !=
                          null &&
                          "%"}
                      </strong>
                    </div>

                  </div>

                </div>


                {/* MEETING */}

                {selectedInterview.interview_type ===
                  "Online" &&
                  selectedInterview.meeting_link && (

                    <div className="interview-detail-section">

                      <h3>
                        Online Interview
                      </h3>

                      <a
                        href={
                          selectedInterview.meeting_link
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="meeting-link"
                      >
                        🔗 Join Meeting
                      </a>

                    </div>

                  )}


                {/* LOCATION */}

                {selectedInterview.interview_type ===
                  "Offline" &&
                  selectedInterview.interview_location && (

                    <div className="interview-detail-section">

                      <h3>
                        Interview Location
                      </h3>

                      <p>
                        📍{" "}
                        {
                          selectedInterview.interview_location
                        }
                      </p>

                    </div>

                  )}


                {/* NOTES */}

                {selectedInterview.recruiter_notes && (

                  <div className="interview-detail-section">

                    <h3>
                      Recruiter Notes
                    </h3>

                    <p>
                      {
                        selectedInterview.recruiter_notes
                      }
                    </p>

                  </div>

                )}

              </div>


              <div className="interview-modal-footer">

                {selectedInterview.status ===
                  "Scheduled" && (

                  <>
                    <button
                      className="cancel-interview-btn"
                      onClick={() =>
                        updateInterviewStatus(
                          selectedInterview.interview_id,
                          "Cancelled"
                        )
                      }
                    >
                      Cancel Interview
                    </button>

                    <button
                      className="evaluate-interview-btn"
                      onClick={() =>
                        completeInterview(
                          selectedInterview
                        )
                      }
                    >
                      Evaluate Interview
                    </button>
                  </>

                )}

                <button
                  className="close-footer-btn"
                  onClick={() =>
                    setSelectedInterview(null)
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}


      {/* ======================================================
          SCHEDULE INTERVIEW MODAL
      ======================================================= */}

      {showScheduleModal && (

        <div
          className="interview-modal-overlay"
          onClick={() =>
            setShowScheduleModal(false)
          }
        >

          <div
            className="interview-modal schedule-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="interview-modal-header">

              <div>

                <h2>
                  Schedule Interview
                </h2>

                <p>
                  Create a new candidate interview.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowScheduleModal(false)
                }
                className="close-interview-modal"
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleScheduleInterview}
              className="schedule-form"
            >
              <div className="form-group">
                <label>Application ID *</label>
                <input
                  type="number"
                  min="1"
                  value={scheduleForm.application_id}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      application_id: e.target.value,
                    })
                  }
                  placeholder="Enter shortlisted application ID"
                  required
                />
                <small>
                  Use the application ID shown in the recruiter applications/shortlisted page.
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Interview Date *</label>
                  <input
                    type="date"
                    value={scheduleForm.interview_date}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        interview_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Interview Time *</label>
                  <input
                    type="time"
                    value={scheduleForm.interview_time}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        interview_time: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Interview Mode *</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="Online"
                      checked={scheduleForm.interview_type === "Online"}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          interview_type: e.target.value,
                        })
                      }
                    />
                    💻 Online
                  </label>

                  <label>
                    <input
                      type="radio"
                      value="Offline"
                      checked={scheduleForm.interview_type === "Offline"}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          interview_type: e.target.value,
                        })
                      }
                    />
                    📍 Offline
                  </label>
                </div>
              </div>

              {scheduleForm.interview_type === "Online" ? (
                <div className="form-group">
                  <label>Meeting Link *</label>
                  <input
                    type="url"
                    value={scheduleForm.meeting_link}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        meeting_link: e.target.value,
                      })
                    }
                    placeholder="https://meet.google.com/..."
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Interview Location *</label>
                  <input
                    type="text"
                    value={scheduleForm.location}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        location: e.target.value,
                      })
                    }
                    placeholder="Office / Meeting Room"
                    required
                  />
                </div>
              )}

              <div className="schedule-form-actions">
                <button
                  type="button"
                  className="cancel-form-btn"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-interview-btn"
                  disabled={saving}
                >
                  {saving ? "Scheduling..." : "Schedule Interview"}
                </button>
              </div>
            </form>

          </div>

        </div>

      )}


      {/* ======================================================
          EVALUATION MODAL
      ======================================================= */}

      {showEvaluationModal &&
        selectedInterview && (

          <div
            className="interview-modal-overlay"
            onClick={() =>
              setShowEvaluationModal(false)
            }
          >

            <div
              className="interview-modal evaluation-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="interview-modal-header">

                <div>

                  <h2>
                    Interview Evaluation
                  </h2>

                  <p>
                    {
                      selectedInterview.student_name
                    }{" "}
                    —{" "}
                    {
                      selectedInterview.job_title
                    }
                  </p>

                </div>

                <button
                  onClick={() =>
                    setShowEvaluationModal(false)
                  }
                  className="close-interview-modal"
                >
                  ×
                </button>

              </div>


              <form
                onSubmit={handleSaveEvaluation}
                className="evaluation-form"
              >

                <div className="evaluation-info">

                  <p>
                    Rate the candidate from
                    <strong> 0 to 10 </strong>
                    for each category.
                  </p>

                </div>


                <div className="evaluation-grid">

                  <div className="form-group">

                    <label>
                      Technical Skills
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={
                        evaluationForm.technical_skills
                      }
                      onChange={(e) =>
                        setEvaluationForm({
                          ...evaluationForm,
                          technical_skills:
                            e.target.value,
                        })
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Communication
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={
                        evaluationForm.communication
                      }
                      onChange={(e) =>
                        setEvaluationForm({
                          ...evaluationForm,
                          communication:
                            e.target.value,
                        })
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Problem Solving
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={
                        evaluationForm.problem_solving
                      }
                      onChange={(e) =>
                        setEvaluationForm({
                          ...evaluationForm,
                          problem_solving:
                            e.target.value,
                        })
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Confidence
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={
                        evaluationForm.confidence
                      }
                      onChange={(e) =>
                        setEvaluationForm({
                          ...evaluationForm,
                          confidence:
                            e.target.value,
                        })
                      }
                    />

                  </div>


                  <div className="form-group">

                    <label>
                      Role Knowledge
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={
                        evaluationForm.role_knowledge
                      }
                      onChange={(e) =>
                        setEvaluationForm({
                          ...evaluationForm,
                          role_knowledge:
                            e.target.value,
                        })
                      }
                    />

                  </div>

                </div>


                <div className="evaluation-preview">

                  <span>
                    Overall Score
                  </span>

                  <strong>
                    {(
                      (
                        Number(
                          evaluationForm.technical_skills
                        ) +
                        Number(
                          evaluationForm.communication
                        ) +
                        Number(
                          evaluationForm.problem_solving
                        ) +
                        Number(
                          evaluationForm.confidence
                        ) +
                        Number(
                          evaluationForm.role_knowledge
                        )
                      ) /
                      5 *
                      10
                    ).toFixed(1)}
                    %
                  </strong>

                </div>


                <div className="form-group">

                  <label>
                    Recruiter Feedback
                  </label>

                  <textarea
                    value={
                      evaluationForm.recruiter_feedback
                    }
                    onChange={(e) =>
                      setEvaluationForm({
                        ...evaluationForm,
                        recruiter_feedback:
                          e.target.value,
                      })
                    }
                    placeholder="Enter your feedback about the candidate..."
                    rows="5"
                  />

                </div>


                <div className="form-group">

                  <label>
                    Final Decision
                  </label>

                  <select
                    value={
                      evaluationForm.final_decision
                    }
                    onChange={(e) =>
                      setEvaluationForm({
                        ...evaluationForm,
                        final_decision:
                          e.target.value,
                      })
                    }
                  >

                    <option value="">
                      Select Decision
                    </option>

                    <option value="Selected">
                      Selected
                    </option>

                    <option value="Rejected">
                      Rejected
                    </option>

                    <option value="On Hold">
                      On Hold
                    </option>

                  </select>

                </div>


                <div className="schedule-form-actions">

                  <button
                    type="button"
                    className="cancel-form-btn"
                    onClick={() =>
                      setShowEvaluationModal(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-interview-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Evaluation"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

    </div>
  );
}

export default Interviews;