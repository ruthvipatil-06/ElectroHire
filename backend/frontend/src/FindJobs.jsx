import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FindJobs.css";

const API_URL = "http://localhost:8000";

function getStoredUser() {
  const keys = ["user", "currentUser", "userData", "student", "loggedInUser"];
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Some projects store the user ID as a plain string instead of JSON.
    }
  }
  return {};
}

function getUserId() {
  const user = getStoredUser();
  return (
    user.user_id ?? user.userId ?? user.student_id ?? user.studentId ??
    localStorage.getItem("user_id") ?? localStorage.getItem("userId") ??
    localStorage.getItem("student_id") ?? localStorage.getItem("studentId") ?? ""
  );
}

async function readResponse(response) {
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { detail: raw };
  }
  if (!response.ok) {
    const detail = data.detail || data.message || data.error || `Request failed (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

function asArray(payload, possibleKeys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of possibleKeys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

export default function FindJobs() {
  const navigate = useNavigate();
  const userId = getUserId();
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (location.trim()) params.set("location", location.trim());
      if (jobType) params.set("job_type", jobType);
      if (userId) params.set("user_id", String(userId));
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const data = await readResponse(await fetch(`${API_URL}/api/jobs${suffix}`));
      setJobs(asArray(data, ["jobs", "results", "data"]));
    } catch (e) {
      setError(e.message || "Unable to load jobs. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [keyword, location, jobType, userId]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const loadResumes = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await readResponse(await fetch(`${API_URL}/api/resumes/${encodeURIComponent(userId)}`));
      const list = asArray(data, ["resumes", "data"]);
      setResumes(list);
      if (list.length && !selectedResumeId) setSelectedResumeId(String(list[0].resume_id ?? list[0].id ?? ""));
    } catch (e) {
      setResumes([]);
      setNotice(`Could not load saved resumes: ${e.message}`);
    }
  }, [userId, selectedResumeId]);

  useEffect(() => { loadResumes(); }, [loadResumes]);

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const text = `${job.job_title ?? ""} ${job.company_name ?? ""} ${job.description ?? ""} ${job.skills ?? ""}`.toLowerCase();
    const locationText = String(job.location ?? "").toLowerCase();
    return (!keyword.trim() || text.includes(keyword.trim().toLowerCase())) &&
      (!location.trim() || locationText.includes(location.trim().toLowerCase())) &&
      (!jobType || String(job.job_type ?? "").toLowerCase() === jobType.toLowerCase());
  }), [jobs, keyword, location, jobType]);

  async function openJob(job) {
    setError("");
    setNotice("");
    try {
      const data = await readResponse(await fetch(`${API_URL}/api/jobs/${job.job_id}`));
      setSelectedJob(data.job ?? data);
    } catch (e) {
      setSelectedJob(job);
      setNotice(`Showing available job details. ${e.message}`);
    }
  }

  async function applyForJob() {
    if (!selectedJob?.job_id) return;
    if (!userId) {
      setError("Please log in again. Your student ID was not found in local storage.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        student_id: Number(userId),
        job_id: Number(selectedJob.job_id),
        resume_id: selectedResumeId ? Number(selectedResumeId) : null,
      };
      const data = await readResponse(await fetch(`${API_URL}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      setSelectedJob(null);
      setNotice(data.message || "Application submitted successfully!");
    } catch (e) {
      setError(e.message || "Unable to submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  const closeDetails = () => setSelectedJob(null);

  return (
    <main className="find-jobs-page">
      <section className="find-jobs-header">
        <div>
          <p className="find-jobs-eyebrow">STUDENT PORTAL</p>
          <h1>Find Jobs</h1>
          <p>Discover opportunities that match your skills and career goals.</p>
        </div>
        <button type="button" className="find-jobs-secondary-btn" onClick={() => navigate("/applications")}>
          My Applications
        </button>
      </section>

      <form className="find-jobs-filters" onSubmit={(e) => { e.preventDefault(); loadJobs(); }}>
        <label>
          <span>Keyword</span>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Job title, company, skill" />
        </label>
        <label>
          <span>Location</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or remote" />
        </label>
        <label>
          <span>Job type</span>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
            <option value="">All types</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Part-time">Part-time</option>
          </select>
        </label>
        <button type="submit" className="find-jobs-primary-btn">Search Jobs</button>
      </form>

      {error && <div className="find-jobs-alert find-jobs-alert-error" role="alert">{error}</div>}
      {notice && <div className="find-jobs-alert" role="status">{notice}</div>}

      <section className="find-jobs-results">
        <div className="find-jobs-results-heading">
          <h2>Available Opportunities</h2>
          <span>{loading ? "Loading…" : `${visibleJobs.length} job${visibleJobs.length === 1 ? "" : "s"}`}</span>
        </div>
        {loading ? <p className="find-jobs-empty">Loading available jobs…</p> : visibleJobs.length === 0 ? (
          <div className="find-jobs-empty"><h3>No jobs found</h3><p>Try changing your filters, or check whether a recruiter has published a job.</p></div>
        ) : (
          <div className="find-jobs-grid">
            {visibleJobs.map((job) => (
              <article className="find-job-card" key={job.job_id}>
                <div className="find-job-card-top">
                  <div className="find-job-company-mark">{String(job.company_name || job.job_title || "J").charAt(0).toUpperCase()}</div>
                  <span className="find-job-type">{job.job_type || "Opportunity"}</span>
                </div>
                <h3>{job.job_title || "Untitled role"}</h3>
                <p className="find-job-company">{job.company_name || job.recruiter_name || "Company not specified"}</p>
                <div className="find-job-meta">
                  <span>{job.location || job.work_mode || "Location not specified"}</span>
                  {job.experience_required && <span>{job.experience_required}</span>}
                </div>
                {job.salary && <p className="find-job-salary">{job.salary}</p>}
                {job.match_percentage != null || job.match_score != null ? <p className="find-job-match">Match: {job.match_percentage ?? job.match_score}%</p> : null}
                <p className="find-job-description">{job.description || "View this opportunity for more details."}</p>
                <button type="button" className="find-jobs-primary-btn" onClick={() => openJob(job)}>View Details / Apply</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedJob && (
        <div className="find-jobs-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDetails(); }}>
          <section className="find-jobs-modal" role="dialog" aria-modal="true" aria-labelledby="find-job-modal-title">
            <button type="button" className="find-jobs-modal-close" onClick={closeDetails} aria-label="Close">×</button>
            <p className="find-jobs-eyebrow">JOB DETAILS</p>
            <h2 id="find-job-modal-title">{selectedJob.job_title}</h2>
            <p className="find-job-company">{selectedJob.company_name || selectedJob.recruiter_name || "Company not specified"}</p>
            <div className="find-job-meta">
              <span>{selectedJob.location || selectedJob.work_mode || "Location not specified"}</span>
              <span>{selectedJob.job_type || "Opportunity"}</span>
              {selectedJob.salary && <span>{selectedJob.salary}</span>}
            </div>
            <h3>Description</h3>
            <p className="find-jobs-modal-description">{selectedJob.description || "No description provided."}</p>
            {selectedJob.skills && <><h3>Skills</h3><p>{Array.isArray(selectedJob.skills) ? selectedJob.skills.join(", ") : selectedJob.skills}</p></>}
            {selectedJob.application_deadline && <p><strong>Application deadline:</strong> {String(selectedJob.application_deadline).slice(0, 10)}</p>}
            <label className="find-jobs-resume-select">
              <span>Select resume (optional)</span>
              <select value={selectedResumeId} onChange={(e) => setSelectedResumeId(e.target.value)}>
                <option value="">Apply without selecting a resume</option>
                {resumes.map((resume) => {
                  const id = resume.resume_id ?? resume.id;
                  return <option key={id} value={String(id)}>{resume.file_name || resume.filename || resume.title || `Resume ${id}`}</option>;
                })}
              </select>
            </label>
            <div className="find-jobs-modal-actions">
              <button type="button" className="find-jobs-secondary-btn" onClick={closeDetails}>Cancel</button>
              <button type="button" className="find-jobs-primary-btn" onClick={applyForJob} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
