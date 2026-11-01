
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AssessmentCheck.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function AssessmentCheck() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const [checks, setChecks] = useState({
    profile: "checking",
    skills: "checking",
    projects: "checking",
    resume: "checking",
    certificates: "checking",
  });

  const [details, setDetails] = useState({
    profile: "",
    skills: "",
    projects: "",
    resume: "",
    certificates: "",
  });

  const [error, setError] = useState("");

  // ============================================================
  // GET USER ID
  // ============================================================

  const getUserId = (userData) => {
    if (!userData) return null;

    const userId =
      userData.user_id ||
      userData.id ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("userId");

    return userId ? Number(userId) : null;
  };

  // ============================================================
  // LOAD AND CHECK STUDENT DATA
  // ============================================================

  useEffect(() => {
    checkStudentData();
  }, []);

  const checkStudentData = async () => {
    try {
      setChecking(true);
      setError("");

      // ========================================================
      // GET SAVED USER
      // ========================================================

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        navigate("/login");
        return;
      }

      let userData;

      try {
        userData = JSON.parse(savedUser);
      } catch (parseError) {
        console.error("Unable to read saved user:", parseError);

        localStorage.removeItem("user");
        localStorage.removeItem("user_id");
        localStorage.removeItem("userId");

        navigate("/login");
        return;
      }

      setUser(userData);

      const userId = getUserId(userData);

      if (!userId) {
        setError("User information is missing. Please login again.");
        setChecking(false);
        return;
      }

      // Save user ID for the rest of the application
      localStorage.setItem("user_id", String(userId));

      console.log("=================================");
      console.log("Assessment Check - User ID:", userId);
      console.log("Assessment Check - User:", userData);
      console.log("=================================");

      // ========================================================
      // DEFAULT STATUS
      // ========================================================

      let profileStatus = "missing";
      let skillsStatus = "missing";
      let projectsStatus = "missing";
      let resumeStatus = "missing";
      let certificatesStatus = "missing";

      let profileMessage = "Profile information is incomplete.";
      let skillsMessage = "No skills added yet.";
      let projectsMessage = "No projects added yet.";
      let resumeMessage = "Resume has not been added.";
      let certificatesMessage = "No certificates added yet.";

      // ========================================================
      // PROFILE CHECK
      // ========================================================

      try {
        /*
          First try profile using USER ID.

          This is more reliable than checking by email because
          all the other student-related APIs use userId.
        */

        let response = await fetch(
          `${API}/api/profile/${userId}`
        );

        console.log("Profile response status:", response.status);

        if (response.ok) {
          const profileData = await response.json();

          console.log("Profile data:", profileData);

          /*
            Handle different possible backend response formats:

            1. {
                 full_name: "...",
                 email: "..."
               }

            2. {
                 profile: {
                   full_name: "...",
                   email: "..."
                 }
               }

            3. {
                 student: {
                   full_name: "...",
                   email: "..."
                 }
               }
          */

          const profile =
            profileData?.profile ||
            profileData?.student ||
            profileData;

          const fullName =
            profile?.full_name ||
            profile?.name ||
            userData?.full_name ||
            userData?.name;

          const email =
            profile?.email ||
            userData?.email;

          /*
            Profile is considered complete if the backend
            returned a valid profile with basic information.
          */

          if (profile && (fullName || email)) {
            profileStatus = "complete";
            profileMessage = "Profile information is available.";
          }
        } else {
          /*
            If the user-ID endpoint is not available in your
            backend, try the existing email endpoint.
          */

          if (userData?.email) {
            const emailResponse = await fetch(
              `${API}/api/profile/${encodeURIComponent(
                userData.email
              )}`
            );

            console.log(
              "Profile email response status:",
              emailResponse.status
            );

            if (emailResponse.ok) {
              const profileData = await emailResponse.json();

              console.log("Profile email data:", profileData);

              const profile =
                profileData?.profile ||
                profileData?.student ||
                profileData;

              const fullName =
                profile?.full_name ||
                profile?.name ||
                userData?.full_name ||
                userData?.name;

              const email =
                profile?.email ||
                userData?.email;

              if (profile && (fullName || email)) {
                profileStatus = "complete";
                profileMessage =
                  "Profile information is available.";
              }
            }
          }
        }
      } catch (err) {
        console.log("Profile check error:", err);

        /*
          If profile API fails completely, don't crash the
          entire assessment check.
        */
      }

      // ========================================================
      // SKILLS CHECK
      // ========================================================

      try {
        const response = await fetch(
          `${API}/api/student-skills/${userId}`
        );

        console.log("Skills response status:", response.status);

        if (response.ok) {
          const skillsData = await response.json();

          console.log("Skills data:", skillsData);

          const skills = Array.isArray(skillsData)
            ? skillsData
            : skillsData?.skills || [];

          if (skills.length > 0) {
            skillsStatus = "complete";

            skillsMessage =
              `${skills.length} skill${
                skills.length > 1 ? "s" : ""
              } added to your profile.`;
          }
        }
      } catch (err) {
        console.log("Skills check error:", err);
      }

      // ========================================================
      // PROJECTS CHECK
      // ========================================================

      try {
        const response = await fetch(
          `${API}/api/projects/${userId}`
        );

        console.log("Projects response status:", response.status);

        if (response.ok) {
          const projectsData = await response.json();

          console.log("Projects data:", projectsData);

          const projects = Array.isArray(projectsData)
            ? projectsData
            : projectsData?.projects || [];

          if (projects.length > 0) {
            projectsStatus = "complete";

            projectsMessage =
              `${projects.length} project${
                projects.length > 1 ? "s" : ""
              } added to your profile.`;
          }
        }
      } catch (err) {
        console.log("Projects check error:", err);
      }

      // ========================================================
      // RESUME CHECK
      // ========================================================

      try {
        const response = await fetch(
          `${API}/api/resumes/${userId}`
        );

        console.log("Resume response status:", response.status);

        if (response.ok) {
          const resumeData = await response.json();

          console.log("Resume data:", resumeData);

          const resumes = Array.isArray(resumeData)
            ? resumeData
            : resumeData?.resumes || [];

          if (resumes.length > 0) {
            resumeStatus = "complete";
            resumeMessage = "Your resume is available.";
          }
        }
      } catch (err) {
        console.log("Resume check error:", err);
      }

      // ========================================================
      // CERTIFICATES CHECK
      // ========================================================

      try {
        const response = await fetch(
          `${API}/api/certificates/${userId}`
        );

        console.log(
          "Certificates response status:",
          response.status
        );

        if (response.ok) {
          const certificatesData = await response.json();

          console.log(
            "Certificates data:",
            certificatesData
          );

          const certificates = Array.isArray(certificatesData)
            ? certificatesData
            : certificatesData?.certificates || [];

          if (certificates.length > 0) {
            certificatesStatus = "complete";

            certificatesMessage =
              `${certificates.length} certificate${
                certificates.length > 1 ? "s" : ""
              } added.`;
          }
        }
      } catch (err) {
        console.log("Certificates check error:", err);
      }

      // ========================================================
      // UPDATE ALL CHECKS
      // ========================================================

      setChecks({
        profile: profileStatus,
        skills: skillsStatus,
        projects: projectsStatus,
        resume: resumeStatus,
        certificates: certificatesStatus,
      });

      setDetails({
        profile: profileMessage,
        skills: skillsMessage,
        projects: projectsMessage,
        resume: resumeMessage,
        certificates: certificatesMessage,
      });

      setChecking(false);
    } catch (err) {
      console.error("Assessment check error:", err);

      setError(
        "Unable to check your profile information. Please try again."
      );

      setChecking(false);
    }
  };

  // ============================================================
  // CHECK WHETHER EVERYTHING IS COMPLETE
  // ============================================================

  const allComplete =
    checks.profile === "complete" &&
    checks.skills === "complete" &&
    checks.projects === "complete" &&
    checks.resume === "complete" &&
    checks.certificates === "complete";

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleContinue = () => {
    if (!allComplete) return;

    navigate("/camera-permission");
  };

  const handleBack = () => {
    navigate("/assessment");
  };

  const handleCompleteProfile = () => {
    navigate("/my-profile");
  };

  const handleAddSkills = () => {
    navigate("/skills");
  };

  const handleAddProjects = () => {
    navigate("/projects");
  };

  const handleAddResume = () => {
    navigate("/resume");
  };

  const handleAddCertificates = () => {
    navigate("/certificates");
  };

  // ============================================================
  // STATUS ICON
  // ============================================================

  const renderStatusIcon = (status) => {
    if (status === "checking") {
      return <span className="check-spinner"></span>;
    }

    if (status === "complete") {
      return <span className="status-icon complete">✓</span>;
    }

    return <span className="status-icon missing">!</span>;
  };

  // ============================================================
  // STATUS TEXT
  // ============================================================

  const renderStatusText = (status) => {
    if (status === "checking") return "Checking...";
    if (status === "complete") return "Ready";

    return "Incomplete";
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="assessment-check-page">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <header className="assessment-check-navbar">

        <div
          className="assessment-check-logo"
          onClick={() => navigate("/dashboard")}
        >
          Electro<span>Hire</span>
        </div>

        <div className="assessment-check-user">

          <div className="assessment-user-avatar">
            {user?.full_name
              ? user.full_name.charAt(0).toUpperCase()
              : user?.name
              ? user.name.charAt(0).toUpperCase()
              : "S"}
          </div>

          <div className="assessment-user-info">
            <strong>
              {user?.full_name ||
                user?.name ||
                user?.username ||
                "Student"}
            </strong>

            <span>
              {user?.email || ""}
            </span>
          </div>

        </div>

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="assessment-check-main">

        {/* BACK BUTTON */}

        <button
          className="back-assessment-button"
          onClick={handleBack}
        >
          ← Back to Assessment
        </button>

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="assessment-check-header">

          <div className="assessment-check-badge">
            STEP 1 OF 4
          </div>

          <h1>Before You Start</h1>

          <p>
            ElectroHire will use your profile, skills, projects,
            resume, and certificates to create a personalized
            assessment for you.
          </p>

          <div className="question-count-box">

            <div className="question-count-icon">
              15
            </div>

            <div>
              <strong>
                15 Personalized Questions
              </strong>

              <span>
                Questions will be generated according to your
                academic background, skills and experience.
              </span>
            </div>

          </div>

        </section>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="assessment-error">
            <span>!</span>
            {error}
          </div>
        )}

        {/* ====================================================
            PROFILE READINESS
        ==================================================== */}

        <section className="assessment-readiness-card">

          <div className="readiness-header">

            <div>
              <h2>Profile Readiness</h2>

              <p>
                Make sure your information is complete before
                starting the assessment.
              </p>
            </div>

            {!checking && (
              <div
                className={
                  allComplete
                    ? "overall-status ready"
                    : "overall-status incomplete"
                }
              >
                {allComplete
                  ? "✓ Ready to Start"
                  : "Complete Required Information"}
              </div>
            )}

          </div>

          <div className="readiness-list">

            {/* ==================================================
                PROFILE
            ================================================== */}

            <div className="readiness-item">

              <div className="readiness-icon profile-icon">
                👤
              </div>

              <div className="readiness-content">

                <div className="readiness-title-row">

                  <h3>Profile</h3>

                  <span
                    className={`status-label ${checks.profile}`}
                  >
                    {renderStatusIcon(checks.profile)}
                    {renderStatusText(checks.profile)}
                  </span>

                </div>

                <p>
                  {details.profile}
                </p>

              </div>

              {checks.profile === "missing" && (
                <button
                  className="fix-button"
                  onClick={handleCompleteProfile}
                >
                  Complete
                </button>
              )}

            </div>

            {/* ==================================================
                SKILLS
            ================================================== */}

            <div className="readiness-item">

              <div className="readiness-icon skills-icon">
                ◆
              </div>

              <div className="readiness-content">

                <div className="readiness-title-row">

                  <h3>Skills</h3>

                  <span
                    className={`status-label ${checks.skills}`}
                  >
                    {renderStatusIcon(checks.skills)}
                    {renderStatusText(checks.skills)}
                  </span>

                </div>

                <p>
                  {details.skills}
                </p>

              </div>

              {checks.skills === "missing" && (
                <button
                  className="fix-button"
                  onClick={handleAddSkills}
                >
                  Add Skills
                </button>
              )}

            </div>

            {/* ==================================================
                PROJECTS
            ================================================== */}

            <div className="readiness-item">

              <div className="readiness-icon projects-icon">
                ▣
              </div>

              <div className="readiness-content">

                <div className="readiness-title-row">

                  <h3>Projects</h3>

                  <span
                    className={`status-label ${checks.projects}`}
                  >
                    {renderStatusIcon(checks.projects)}
                    {renderStatusText(checks.projects)}
                  </span>

                </div>

                <p>
                  {details.projects}
                </p>

              </div>

              {checks.projects === "missing" && (
                <button
                  className="fix-button"
                  onClick={handleAddProjects}
                >
                  Add Projects
                </button>
              )}

            </div>

            {/* ==================================================
                RESUME
            ================================================== */}

            <div className="readiness-item">

              <div className="readiness-icon resume-icon">
                ▤
              </div>

              <div className="readiness-content">

                <div className="readiness-title-row">

                  <h3>Resume</h3>

                  <span
                    className={`status-label ${checks.resume}`}
                  >
                    {renderStatusIcon(checks.resume)}
                    {renderStatusText(checks.resume)}
                  </span>

                </div>

                <p>
                  {details.resume}
                </p>

              </div>

              {checks.resume === "missing" && (
                <button
                  className="fix-button"
                  onClick={handleAddResume}
                >
                  Add Resume
                </button>
              )}

            </div>

            {/* ==================================================
                CERTIFICATES
            ================================================== */}

            <div className="readiness-item">

              <div className="readiness-icon certificate-icon">
                ◇
              </div>

              <div className="readiness-content">

                <div className="readiness-title-row">

                  <h3>Certificates</h3>

                  <span
                    className={`status-label ${checks.certificates}`}
                  >
                    {renderStatusIcon(checks.certificates)}
                    {renderStatusText(checks.certificates)}
                  </span>

                </div>

                <p>
                  {details.certificates}
                </p>

              </div>

              {checks.certificates === "missing" && (
                <button
                  className="fix-button"
                  onClick={handleAddCertificates}
                >
                  Add Certificates
                </button>
              )}

            </div>

          </div>

        </section>

        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <section className="assessment-info-section">

          <div className="info-card">

            <div className="info-icon">
              ✨
            </div>

            <div>

              <h3>
                How personalization works
              </h3>

              <p>
                Your assessment will consider your degree,
                branch, skills, projects, certificates,
                resume information and career preferences.
              </p>

            </div>

          </div>

          <div className="info-card">

            <div className="info-icon">
              🎯
            </div>

            <div>

              <h3>
                What happens next?
              </h3>

              <p>
                After your information is checked, ElectroHire
                will prepare 15 questions for your assessment.
                You will then enable your camera before starting
                the test.
              </p>

            </div>

          </div>

        </section>

        {/* ====================================================
            ACTION
        ==================================================== */}

        <section className="assessment-check-actions">

          {!allComplete && !checking && (
            <p className="action-warning">
              Please complete the missing sections before
              starting your personalized assessment.
            </p>
          )}

          <button
            className={`continue-assessment-button ${
              allComplete ? "enabled" : "disabled"
            }`}
            onClick={handleContinue}
            disabled={!allComplete || checking}
          >
            {checking
              ? "Checking Your Profile..."
              : allComplete
              ? "Continue to Camera Permission →"
              : "Complete Your Profile First"}
          </button>

        </section>

      </main>

    </div>
  );
}

export default AssessmentCheck;
