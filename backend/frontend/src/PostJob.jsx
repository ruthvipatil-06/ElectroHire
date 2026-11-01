import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PostJob.css";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function PostJob() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [formData, setFormData] = useState({
    job_title: "",
    job_type: "Full-Time",
    work_mode: "On-Site",
    location: "",
    experience_required: "Fresher",
    openings: 1,

    description: "",
    responsibilities: "",

    minimum_degree: "",
    preferred_branches: "",
    minimum_cgpa: "",
    backlogs_allowed: true,

    salary_min: "",
    salary_max: "",

    stipend_min: "",
    stipend_max: "",

    application_deadline: "",
    expected_joining_date: "",

    assessment_required: false,
    minimum_assessment_score: 70,
  });

  const [requiredSkills, setRequiredSkills] = useState([]);
  const [preferredSkills, setPreferredSkills] = useState([]);

  const [skillInput, setSkillInput] = useState("");
  const [preferredSkillInput, setPreferredSkillInput] = useState("");

  const [matchingWeights, setMatchingWeights] = useState({
    skills_weight: 40,
    projects_weight: 20,
    resume_weight: 15,
    assessment_weight: 15,
    certificates_weight: 10,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ============================================================
  // REQUIRED SKILLS
  // ============================================================

  const addRequiredSkill = () => {
    const skill = skillInput.trim();

    if (!skill) return;

    const alreadyExists = requiredSkills.some(
      (item) => item.toLowerCase() === skill.toLowerCase()
    );

    if (alreadyExists) {
      setSkillInput("");
      return;
    }

    setRequiredSkills((prev) => [...prev, skill]);
    setSkillInput("");
  };

  const removeRequiredSkill = (skillToRemove) => {
    setRequiredSkills((prev) =>
      prev.filter((skill) => skill !== skillToRemove)
    );
  };

  const handleRequiredSkillKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRequiredSkill();
    }
  };

  // ============================================================
  // PREFERRED SKILLS
  // ============================================================

  const addPreferredSkill = () => {
    const skill = preferredSkillInput.trim();

    if (!skill) return;

    const alreadyExists = preferredSkills.some(
      (item) => item.toLowerCase() === skill.toLowerCase()
    );

    if (alreadyExists) {
      setPreferredSkillInput("");
      return;
    }

    setPreferredSkills((prev) => [...prev, skill]);
    setPreferredSkillInput("");
  };

  const removePreferredSkill = (skillToRemove) => {
    setPreferredSkills((prev) =>
      prev.filter((skill) => skill !== skillToRemove)
    );
  };

  const handlePreferredSkillKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPreferredSkill();
    }
  };

  // ============================================================
  // MATCHING WEIGHTS
  // ============================================================

  const handleWeightChange = (name, value) => {
    const numericValue = Number(value);

    if (numericValue < 0 || numericValue > 100) return;

    setMatchingWeights((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
  };

  const totalWeight =
    Number(matchingWeights.skills_weight) +
    Number(matchingWeights.projects_weight) +
    Number(matchingWeights.resume_weight) +
    Number(matchingWeights.assessment_weight) +
    Number(matchingWeights.certificates_weight);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateForm = () => {
    if (!formData.job_title.trim()) {
      return "Please enter the job title.";
    }

    if (!formData.location.trim()) {
      return "Please enter the job location.";
    }

    if (!formData.description.trim()) {
      return "Please enter the job description.";
    }

    if (!formData.minimum_degree.trim()) {
      return "Please enter the minimum degree.";
    }

    if (requiredSkills.length === 0) {
      return "Please add at least one required skill.";
    }

    if (Number(formData.openings) < 1) {
      return "Number of openings must be at least 1.";
    }

    if (
      formData.minimum_cgpa !== "" &&
      (Number(formData.minimum_cgpa) < 0 ||
        Number(formData.minimum_cgpa) > 10)
    ) {
      return "CGPA must be between 0 and 10.";
    }

    if (
      formData.assessment_required &&
      (Number(formData.minimum_assessment_score) < 0 ||
        Number(formData.minimum_assessment_score) > 100)
    ) {
      return "Assessment score must be between 0 and 100.";
    }

    if (totalWeight !== 100) {
      return "AI matching weights must total exactly 100%.";
    }

    return null;
  };

  // ============================================================
  // CREATE JOB OBJECT
  // ============================================================

  const buildJobData = (status) => {
    return {
      recruiter_id: Number(
        JSON.parse(localStorage.getItem("user") || "{}")?.user_id ||
          JSON.parse(localStorage.getItem("user") || "{}")?.id ||
          JSON.parse(localStorage.getItem("user") || "{}")?.userId
      ),
      job: {
        ...formData,
        openings: Number(formData.openings),
        minimum_cgpa:
          formData.minimum_cgpa === "" ? null : Number(formData.minimum_cgpa),
        salary_min:
          formData.salary_min === "" ? null : Number(formData.salary_min),
        salary_max:
          formData.salary_max === "" ? null : Number(formData.salary_max),
        stipend_min:
          formData.stipend_min === "" ? null : Number(formData.stipend_min),
        stipend_max:
          formData.stipend_max === "" ? null : Number(formData.stipend_max),
        minimum_assessment_score: Number(formData.minimum_assessment_score),
        status,
      },
      skills: [
        ...requiredSkills.map((skill) => ({
          skill_name: skill,
          skill_type: "Required",
          importance_weight: 0,
        })),
        ...preferredSkills.map((skill) => ({
          skill_name: skill,
          skill_type: "Preferred",
          importance_weight: 0,
        })),
      ],
      matching_weights: matchingWeights,
    };
  };

  // ============================================================
  // SUBMIT JOB
  // ============================================================

  const handleSubmit = async (status) => {
    setMessage("");
    setMessageType("");

    // Your current MySQL jobs.status supports only Open/Closed.
    // A real Draft state is not available in the current schema.
    if (status !== "Published") {
      setMessage("Draft saving is not available in the current database. Please use Publish Job.");
      setMessageType("error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const error = validateForm();

    if (error) {
      setMessage(error);
      setMessageType("error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const jobData = buildJobData(status);

    if (!jobData.recruiter_id) {
      setMessage("Recruiter session not found. Please login again.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Failed to publish the job.");
      }

      setMessage("Job published successfully! It is now available in Manage Jobs.");
      setMessageType("success");

      window.scrollTo({ top: 0, behavior: "smooth" });

      setTimeout(() => {
        navigate("/manage-jobs");
      }, 900);
    } catch (err) {
      console.error("Publish job error:", err);
      setMessage(err.message || "Failed to publish the job.");
      setMessageType("error");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      job_title: "",
      job_type: "Full-Time",
      work_mode: "On-Site",
      location: "",
      experience_required: "Fresher",
      openings: 1,
      description: "",
      responsibilities: "",
      minimum_degree: "",
      preferred_branches: "",
      minimum_cgpa: "",
      backlogs_allowed: true,
      salary_min: "",
      salary_max: "",
      stipend_min: "",
      stipend_max: "",
      application_deadline: "",
      expected_joining_date: "",
      assessment_required: false,
      minimum_assessment_score: 70,
    });

    setRequiredSkills([]);
    setPreferredSkills([]);
    setSkillInput("");
    setPreferredSkillInput("");

    setMatchingWeights({
      skills_weight: 40,
      projects_weight: 20,
      resume_weight: 15,
      assessment_weight: 15,
      certificates_weight: 10,
    });

    setMessage("");
    setMessageType("");
  };

  return (
    <div className="post-job-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="post-job-header">
        <div>
          <button
            className="back-button"
            onClick={() => navigate("/recruiter-dashboard")}
          >
            ← Back to Dashboard
          </button>

          <h1>Post a New Job</h1>

          <p>
            Create a job opportunity and define the requirements
            used by ElectroHire's candidate matching system.
          </p>
        </div>
      </div>

      {/* ======================================================
          MESSAGE
      ====================================================== */}

      {message && (
        <div className={`form-message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="post-job-container">

        {/* ====================================================
            SECTION 1 - BASIC INFORMATION
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">01</span>

            <div>
              <h2>Basic Information</h2>
              <p>Enter the basic details of the job opportunity.</p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group full-width">
              <label>
                Job Title <span>*</span>
              </label>

              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g. AI/ML Engineer"
              />
            </div>

            <div className="form-group">
              <label>
                Job Type <span>*</span>
              </label>

              <select
                name="job_type"
                value={formData.job_type}
                onChange={handleChange}
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Work Mode <span>*</span>
              </label>

              <select
                name="work_mode"
                value={formData.work_mode}
                onChange={handleChange}
              >
                <option value="On-Site">On-Site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Location <span>*</span>
              </label>

              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Pune, Maharashtra"
              />
            </div>

            <div className="form-group">
              <label>Experience Required</label>

              <select
                name="experience_required"
                value={formData.experience_required}
                onChange={handleChange}
              >
                <option value="Fresher">Fresher</option>
                <option value="0-1 years">0-1 years</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5+ years">5+ years</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Number of Openings <span>*</span>
              </label>

              <input
                type="number"
                name="openings"
                min="1"
                value={formData.openings}
                onChange={handleChange}
              />
            </div>

          </div>
        </section>

        {/* ====================================================
            SECTION 2 - JOB DETAILS
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">02</span>

            <div>
              <h2>Job Details</h2>
              <p>Describe the role and responsibilities.</p>
            </div>
          </div>

          <div className="form-group">
            <label>
              Job Description <span>*</span>
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
              placeholder="Describe the job, team, role and overall opportunity..."
            />
          </div>

          <div className="form-group">
            <label>Responsibilities</label>

            <textarea
              name="responsibilities"
              value={formData.responsibilities}
              onChange={handleChange}
              rows="6"
              placeholder="Enter the key responsibilities of the candidate..."
            />
          </div>

        </section>

        {/* ====================================================
            SECTION 3 - SKILLS
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">03</span>

            <div>
              <h2>Skills & Requirements</h2>
              <p>
                Define the skills candidates should have.
              </p>
            </div>
          </div>

          {/* REQUIRED SKILLS */}

          <div className="skill-block">

            <label>
              Required Skills <span>*</span>
            </label>

            <div className="skill-input-row">

              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleRequiredSkillKeyDown}
                placeholder="Type a skill and press Enter"
              />

              <button
                type="button"
                className="add-skill-button"
                onClick={addRequiredSkill}
              >
                + Add
              </button>

            </div>

            <div className="skill-tags">

              {requiredSkills.map((skill) => (
                <div className="skill-tag required" key={skill}>
                  <span>{skill}</span>

                  <button
                    type="button"
                    onClick={() => removeRequiredSkill(skill)}
                  >
                    ×
                  </button>
                </div>
              ))}

            </div>

          </div>

          {/* PREFERRED SKILLS */}

          <div className="skill-block">

            <label>Preferred Skills</label>

            <div className="skill-input-row">

              <input
                type="text"
                value={preferredSkillInput}
                onChange={(e) =>
                  setPreferredSkillInput(e.target.value)
                }
                onKeyDown={handlePreferredSkillKeyDown}
                placeholder="Type a preferred skill and press Enter"
              />

              <button
                type="button"
                className="add-skill-button"
                onClick={addPreferredSkill}
              >
                + Add
              </button>

            </div>

            <div className="skill-tags">

              {preferredSkills.map((skill) => (
                <div className="skill-tag preferred" key={skill}>
                  <span>{skill}</span>

                  <button
                    type="button"
                    onClick={() => removePreferredSkill(skill)}
                  >
                    ×
                  </button>
                </div>
              ))}

            </div>

          </div>

        </section>

        {/* ====================================================
            SECTION 4 - EDUCATION
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">04</span>

            <div>
              <h2>Education & Eligibility</h2>
              <p>Set the academic requirements for candidates.</p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>Minimum Degree</label>

              <input
                type="text"
                name="minimum_degree"
                value={formData.minimum_degree}
                onChange={handleChange}
                placeholder="e.g. B.Tech / B.E."
              />
            </div>

            <div className="form-group">
              <label>Preferred Branches</label>

              <input
                type="text"
                name="preferred_branches"
                value={formData.preferred_branches}
                onChange={handleChange}
                placeholder="e.g. ECE, CSE, AIML, IT"
              />
            </div>

            <div className="form-group">
              <label>Minimum CGPA</label>

              <input
                type="number"
                name="minimum_cgpa"
                min="0"
                max="10"
                step="0.01"
                value={formData.minimum_cgpa}
                onChange={handleChange}
                placeholder="e.g. 7.0"
              />
            </div>

            <div className="form-group checkbox-group">

              <label className="checkbox-label">

                <input
                  type="checkbox"
                  name="backlogs_allowed"
                  checked={formData.backlogs_allowed}
                  onChange={handleChange}
                />

                <span>
                  Backlogs Allowed
                </span>

              </label>

            </div>

          </div>

        </section>

        {/* ====================================================
            SECTION 5 - COMPENSATION
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">05</span>

            <div>
              <h2>Salary & Stipend</h2>
              <p>
                Add compensation details for this opportunity.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>Minimum Salary</label>

              <input
                type="number"
                name="salary_min"
                min="0"
                value={formData.salary_min}
                onChange={handleChange}
                placeholder="₹ Minimum"
              />
            </div>

            <div className="form-group">
              <label>Maximum Salary</label>

              <input
                type="number"
                name="salary_max"
                min="0"
                value={formData.salary_max}
                onChange={handleChange}
                placeholder="₹ Maximum"
              />
            </div>

            <div className="form-group">
              <label>Minimum Stipend</label>

              <input
                type="number"
                name="stipend_min"
                min="0"
                value={formData.stipend_min}
                onChange={handleChange}
                placeholder="₹ Minimum / month"
              />
            </div>

            <div className="form-group">
              <label>Maximum Stipend</label>

              <input
                type="number"
                name="stipend_max"
                min="0"
                value={formData.stipend_max}
                onChange={handleChange}
                placeholder="₹ Maximum / month"
              />
            </div>

          </div>

        </section>

        {/* ====================================================
            SECTION 6 - APPLICATION
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">06</span>

            <div>
              <h2>Application Details</h2>
              <p>Set the application timeline.</p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>Application Deadline</label>

              <input
                type="date"
                name="application_deadline"
                value={formData.application_deadline}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Expected Joining Date</label>

              <input
                type="date"
                name="expected_joining_date"
                value={formData.expected_joining_date}
                onChange={handleChange}
              />
            </div>

          </div>

        </section>

        {/* ====================================================
            SECTION 7 - ASSESSMENT
        ==================================================== */}

        <section className="form-section">

          <div className="section-heading">
            <span className="section-number">07</span>

            <div>
              <h2>ElectroHire Assessment</h2>
              <p>
                Decide whether candidates must complete the
                personalized assessment.
              </p>
            </div>
          </div>

          <div className="assessment-card">

            <label className="switch-row">

              <div>
                <strong>Require Assessment</strong>

                <p>
                  Candidates must complete the ElectroHire
                  personalized assessment.
                </p>
              </div>

              <label className="switch">

                <input
                  type="checkbox"
                  name="assessment_required"
                  checked={formData.assessment_required}
                  onChange={handleChange}
                />

                <span className="slider"></span>

              </label>

            </label>

            {formData.assessment_required && (
              <div className="assessment-score">

                <label>
                  Minimum Assessment Score
                </label>

                <div className="score-input">

                  <input
                    type="number"
                    name="minimum_assessment_score"
                    min="0"
                    max="100"
                    value={formData.minimum_assessment_score}
                    onChange={handleChange}
                  />

                  <span>%</span>

                </div>

              </div>
            )}

          </div>

        </section>

        {/* ====================================================
            SECTION 8 - AI MATCHING
        ==================================================== */}

        <section className="form-section ai-section">

          <div className="section-heading">

            <span className="section-number">08</span>

            <div>
              <h2>AI Candidate Matching</h2>

              <p>
                Set how ElectroHire should calculate candidate
                match scores for this job.
              </p>
            </div>

          </div>

          <div className="ai-info">
            <div className="ai-icon">✦</div>

            <div>
              <strong>ElectroHire Smart Matching</strong>

              <p>
                Candidates will be evaluated using their skills,
                projects, resume, assessment and certificates.
              </p>
            </div>
          </div>

          <div className="weight-grid">

            <div className="weight-card">

              <div className="weight-header">
                <span>Skills</span>
                <strong>{matchingWeights.skills_weight}%</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={matchingWeights.skills_weight}
                onChange={(e) =>
                  handleWeightChange(
                    "skills_weight",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="weight-card">

              <div className="weight-header">
                <span>Projects</span>
                <strong>{matchingWeights.projects_weight}%</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={matchingWeights.projects_weight}
                onChange={(e) =>
                  handleWeightChange(
                    "projects_weight",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="weight-card">

              <div className="weight-header">
                <span>Resume</span>
                <strong>{matchingWeights.resume_weight}%</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={matchingWeights.resume_weight}
                onChange={(e) =>
                  handleWeightChange(
                    "resume_weight",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="weight-card">

              <div className="weight-header">
                <span>Assessment</span>
                <strong>{matchingWeights.assessment_weight}%</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={matchingWeights.assessment_weight}
                onChange={(e) =>
                  handleWeightChange(
                    "assessment_weight",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="weight-card">

              <div className="weight-header">
                <span>Certificates</span>
                <strong>{matchingWeights.certificates_weight}%</strong>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={matchingWeights.certificates_weight}
                onChange={(e) =>
                  handleWeightChange(
                    "certificates_weight",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div
            className={`weight-total ${
              totalWeight === 100 ? "valid" : "invalid"
            }`}
          >
            Total Weight: <strong>{totalWeight}%</strong>

            {totalWeight === 100 ? (
              <span>✓ Perfect</span>
            ) : (
              <span>Must equal 100%</span>
            )}
          </div>

        </section>

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <div className="form-actions">

          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate("/recruiter-dashboard")}
          >
            Cancel
          </button>

          <button
            type="button"
            className="reset-button"
            onClick={resetForm}
          >
            Reset
          </button>

          <button
            type="button"
            className="draft-button"
            disabled={loading}
            onClick={() => handleSubmit("Draft")}
          >
            Save Draft
          </button>

          <button
            type="button"
            className="publish-button"
            disabled={loading}
            onClick={() => handleSubmit("Published")}
          >
            {loading ? "Processing..." : "Publish Job"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default PostJob;