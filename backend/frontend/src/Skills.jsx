
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Skills.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const getErrorMessage = (data, fallback = "Something went wrong.") => {
  if (!data) return fallback;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === "string") return item;

        if (item?.msg) {
          return item.msg;
        }

        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return fallback;
};

const readResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      detail: text
    };
  }
};

/*
  Handles different backend response formats:

  [
    {...},
    {...}
  ]

  OR

  {
    skills: [...]
  }

  OR

  {
    data: [...]
  }

  OR

  {
    data: {
      skills: [...]
    }
  }
*/

const extractArray = (data, key = "skills") => {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  if (Array.isArray(data[key])) {
    return data[key];
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (
    data.data &&
    typeof data.data === "object" &&
    Array.isArray(data.data[key])
  ) {
    return data.data[key];
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
};

/* =========================================================
   NORMALIZE AVAILABLE SKILL
========================================================= */

const normalizeAvailableSkill = (skill, index) => {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  const id =
    skill.skill_id ??
    skill.id ??
    skill.skillId ??
    skill.SkillID;

  const name =
    skill.skill_name ??
    skill.name ??
    skill.skillName ??
    skill.title;

  if (id === undefined || id === null) {
    return null;
  }

  return {
    skill_id: Number(id),
    skill_name:
      name !== undefined && name !== null
        ? String(name)
        : `Skill ${index + 1}`
  };
};

/* =========================================================
   NORMALIZE STUDENT SKILL
========================================================= */

const normalizeStudentSkill = (skill, index) => {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  const studentSkillId =
    skill.student_skill_id ??
    skill.studentSkillId ??
    skill.id;

  const skillId =
    skill.skill_id ??
    skill.skillId;

  const skillName =
    skill.skill_name ??
    skill.skillName ??
    skill.name ??
    skill.title ??
    skill.skills?.skill_name;

  const level =
    skill.skill_level ??
    skill.skillLevel ??
    skill.level ??
    "Beginner";

  const experience =
    skill.years_experience ??
    skill.yearsExperience ??
    skill.experience ??
    0;

  return {
    student_skill_id:
      studentSkillId !== undefined && studentSkillId !== null
        ? Number(studentSkillId)
        : `skill-${index}`,

    skill_id:
      skillId !== undefined && skillId !== null
        ? Number(skillId)
        : null,

    skill_name:
      skillName !== undefined && skillName !== null
        ? String(skillName)
        : "Unknown Skill",

    skill_level: String(level),

    years_experience:
      experience !== undefined && experience !== null
        ? Number(experience)
        : 0
  };
};

/* =========================================================
   COMPONENT
========================================================= */

function Skills() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [availableSkills, setAvailableSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);

  const [skillId, setSkillId] = useState("");
  const [skillLevel, setSkillLevel] = useState("Beginner");
  const [experience, setExperience] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =======================================================
     GET USER ID
  ======================================================= */

  const getUserId = (userData = user) => {
    if (!userData) {
      return null;
    }

    const storedUserId = localStorage.getItem("user_id");

    const rawUserId =
      userData.user_id ??
      userData.userId ??
      userData.id ??
      storedUserId;

    const numericUserId = Number(rawUserId);

    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      return null;
    }

    return numericUserId;
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(savedUser);

      setUser(userData);

      const userId = getUserId(userData);

      console.log("=================================");
      console.log("SKILLS PAGE");
      console.log("Logged in user:", userData);
      console.log("User ID:", userId);
      console.log("=================================");

      if (!userId) {
        setError(
          "User ID not found. Please logout and login again."
        );

        setLoading(false);
        return;
      }

      /*
        Keep user_id separately as well.
        This makes the session easier to recover.
      */
      localStorage.setItem(
        "user_id",
        String(userId)
      );

      loadSkills(userId);
    } catch (err) {
      console.error(
        "User data parsing error:",
        err
      );

      localStorage.removeItem("user");
      localStorage.removeItem("user_id");

      navigate("/login");
    }
  }, [navigate]);

  /* =======================================================
     LOAD AVAILABLE SKILLS + MY SKILLS
  ======================================================= */

  const loadSkills = async (userId) => {
    setLoading(true);
    setError("");

    try {
      /* ===================================================
         1. GET ALL AVAILABLE SKILLS
      =================================================== */

      console.log(
        "Loading available skills..."
      );

      const skillsResponse = await fetch(
        `${API}/api/skills`
      );

      const skillsData =
        await readResponse(skillsResponse);

      console.log(
        "AVAILABLE SKILLS RESPONSE:",
        skillsData
      );

      if (!skillsResponse.ok) {
        throw new Error(
          getErrorMessage(
            skillsData,
            `Skills API error: ${skillsResponse.status}`
          )
        );
      }

      const rawAvailableSkills =
        extractArray(
          skillsData,
          "skills"
        );

      console.log(
        "RAW AVAILABLE SKILLS:",
        rawAvailableSkills
      );

      const normalizedAvailableSkills =
        rawAvailableSkills
          .map(normalizeAvailableSkill)
          .filter(Boolean);

      console.log(
        "NORMALIZED AVAILABLE SKILLS:",
        normalizedAvailableSkills
      );

      setAvailableSkills(
        normalizedAvailableSkills
      );

      /* ===================================================
         2. GET STUDENT'S SAVED SKILLS
      =================================================== */

      console.log(
        `Loading saved skills for user ${userId}...`
      );

      const mySkillsResponse = await fetch(
        `${API}/api/student-skills/${userId}`
      );

      const mySkillsData =
        await readResponse(
          mySkillsResponse
        );

      console.log(
        "MY SKILLS RESPONSE:",
        mySkillsData
      );

      if (!mySkillsResponse.ok) {
        console.error(
          "Student skills API error:",
          mySkillsData
        );

        setMySkills([]);

        /*
          Do not stop the whole page if there
          are simply no saved skills.
        */

        if (
          mySkillsResponse.status !== 404
        ) {
          console.warn(
            getErrorMessage(
              mySkillsData,
              "Could not load saved skills."
            )
          );
        }
      } else {
        const rawMySkills =
          extractArray(
            mySkillsData,
            "skills"
          );

        console.log(
          "RAW MY SKILLS:",
          rawMySkills
        );

        const normalizedMySkills =
          rawMySkills
            .map(normalizeStudentSkill)
            .filter(Boolean);

        console.log(
          "NORMALIZED MY SKILLS:",
          normalizedMySkills
        );

        setMySkills(
          normalizedMySkills
        );
      }
    } catch (err) {
      console.error(
        "Skills loading error:",
        err
      );

      setError(
        err.message ||
          "Unable to connect to the ElectroHire backend."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     ADD SKILL
  ======================================================= */

  const handleAddSkill = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!skillId) {
      setError(
        "Please select a skill."
      );
      return;
    }

    if (experience === "") {
      setError(
        "Please enter years of experience."
      );
      return;
    }

    const experienceNumber =
      Number(experience);

    if (
      Number.isNaN(experienceNumber) ||
      experienceNumber < 0
    ) {
      setError(
        "Years of experience must be a valid number."
      );
      return;
    }

    const userId = getUserId();

    console.log(
      "ADDING SKILL FOR USER:",
      userId
    );

    if (!userId) {
      setError(
        "User session not found. Please login again."
      );

      return;
    }

    setSaving(true);

    try {
      const requestData = {
        user_id: Number(userId),
        skill_id: Number(skillId),
        skill_level: skillLevel,
        years_experience: experienceNumber
      };

      console.log(
        "POST /api/student-skills",
        requestData
      );

      const response = await fetch(
        `${API}/api/student-skills`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(
            requestData
          )
        }
      );

      const data =
        await readResponse(response);

      console.log(
        "ADD SKILL RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to add skill."
          )
        );
      }

      /* Reset form */

      setSkillId("");
      setSkillLevel("Beginner");
      setExperience("");

      setSuccess(
        "Skill added successfully!"
      );

      /* Reload skills */

      await loadSkills(userId);
    } catch (err) {
      console.error(
        "Add skill error:",
        err
      );

      setError(
        err.message ||
          "Unable to add skill."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE SKILL
  ======================================================= */

  const handleDeleteSkill = async (
    studentSkillId
  ) => {
    if (
      studentSkillId === undefined ||
      studentSkillId === null
    ) {
      setError(
        "Invalid skill ID."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to remove this skill?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      console.log(
        "Deleting student skill:",
        studentSkillId
      );

      const response = await fetch(
        `${API}/api/student-skills/${studentSkillId}`,
        {
          method: "DELETE"
        }
      );

      const data =
        await readResponse(response);

      console.log(
        "DELETE SKILL RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to delete skill."
          )
        );
      }

      setSuccess(
        "Skill removed successfully!"
      );

      const userId = getUserId();

      if (userId) {
        await loadSkills(userId);
      }
    } catch (err) {
      console.error(
        "Delete skill error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete skill."
      );
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    localStorage.removeItem("student_id");
    localStorage.removeItem("isLoggedIn");

    navigate("/login");
  };

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {
    return (
      <div className="skills-loading">
        <div className="skills-spinner"></div>

        <h2>Loading Skills...</h2>

        <p>
          Connecting to ElectroHire
        </p>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="skills-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="skills-sidebar">

        <div className="skills-logo">
          Electro<span>Hire</span>
        </div>

        <div className="skills-user">

          <div className="skills-avatar">
            {user?.full_name
              ? String(
                  user.full_name
                )
                  .charAt(0)
                  .toUpperCase()
              : "U"}
          </div>

          <div className="skills-user-info">

            <strong>
              {user?.full_name ||
                "Student"}
            </strong>

            <span>
              {user?.role ||
                "student"}
            </span>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="skills-navigation">

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/my-profile")
            }
          >
            <span>👤</span>
            My Profile
          </button>

          <button
            type="button"
            className="active"
          >
            <span>⚡</span>
            Skills
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/projects")
            }
          >
            <span>📁</span>
            Projects
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/certificates")
            }
          >
            <span>📜</span>
            Certificates
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/resume")
            }
          >
            <span>📄</span>
            Resume
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/find-jobs")
            }
          >
            <span>🔎</span>
            Find Jobs
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/applications")
            }
          >
            <span>✓</span>
            Applications
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/settings")
            }
          >
            <span>⚙</span>
            Settings
          </button>

        </nav>

        <button
          type="button"
          className="skills-logout"
          onClick={handleLogout}
        >
          ↪ Logout
        </button>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="skills-main">

        {/* HEADER */}

        <div className="skills-page-header">

          <div>
            <h1>My Skills</h1>

            <p>
              Add and manage your technical
              skills.
            </p>
          </div>

          <div className="skills-welcome">

            Welcome,{" "}

            <strong>
              {user?.full_name ||
                "Student"}
            </strong>

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="skills-error">

            <span className="alert-icon">
              ⚠
            </span>

            <div>
              <strong>
                Error
              </strong>

              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="skills-success">

            <span>
              ✓
            </span>

            <p>
              {success}
            </p>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
            >
              ×
            </button>

          </div>
        )}

        {/* =================================================
            ADD SKILL CARD
        ================================================= */}

        <section className="skills-card">

          <div className="skills-card-heading">

            <div className="skills-heading-icon">
              +
            </div>

            <div>

              <h2>
                Add New Skill
              </h2>

              <p>
                Add a skill to your
                professional profile.
              </p>

            </div>

          </div>

          <form
            className="skills-form"
            onSubmit={handleAddSkill}
          >

            {/* SKILL */}

            <div className="skills-form-group">

              <label htmlFor="skill">
                Skill
              </label>

              <select
                id="skill"
                value={skillId}
                onChange={(event) =>
                  setSkillId(
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select Skill
                </option>

                {availableSkills.map(
                  (skill) => (
                    <option
                      key={
                        skill.skill_id
                      }
                      value={
                        skill.skill_id
                      }
                    >
                      {
                        skill.skill_name
                      }
                    </option>
                  )
                )}

              </select>

              {availableSkills.length ===
                0 && (
                <small className="skills-help">
                  No skills found in the
                  database.
                </small>
              )}

            </div>

            {/* LEVEL */}

            <div className="skills-form-group">

              <label htmlFor="skillLevel">
                Skill Level
              </label>

              <select
                id="skillLevel"
                value={skillLevel}
                onChange={(event) =>
                  setSkillLevel(
                    event.target.value
                  )
                }
              >

                <option value="Beginner">
                  Beginner
                </option>

                <option value="Intermediate">
                  Intermediate
                </option>

                <option value="Advanced">
                  Advanced
                </option>

              </select>

            </div>

            {/* EXPERIENCE */}

            <div className="skills-form-group">

              <label htmlFor="experience">
                Years of Experience
              </label>

              <input
                id="experience"
                type="number"
                min="0"
                step="0.1"
                placeholder="Example: 1.5"
                value={experience}
                onChange={(event) =>
                  setExperience(
                    event.target.value
                  )
                }
              />

            </div>

            {/* BUTTON */}

            <button
              type="submit"
              className="skills-add-button"
              disabled={
                saving ||
                availableSkills.length ===
                  0
              }
            >
              {saving
                ? "Saving..."
                : "Add Skill"}
            </button>

          </form>

        </section>

        {/* =================================================
            MY SKILLS CARD
        ================================================= */}

        <section className="skills-card">

          <div className="my-skills-heading">

            <div>

              <h2>
                My Skills
              </h2>

              <p>
                Skills saved to your
                profile.
              </p>

            </div>

            <div className="skill-count">

              {mySkills.length}{" "}

              {mySkills.length === 1
                ? "Skill"
                : "Skills"}

            </div>

          </div>

          {/* NO SKILLS */}

          {mySkills.length === 0 ? (

            <div className="no-skills">

              <div className="no-skills-icon">
                ⚡
              </div>

              <h3>
                No skills added yet
              </h3>

              <p>
                Add your first skill
                using the form above.
              </p>

            </div>

          ) : (

            /* =================================================
               SKILLS TABLE
            ================================================= */

            <div className="skills-table">

              <div className="skills-table-header">

                <span>
                  Skill
                </span>

                <span>
                  Level
                </span>

                <span>
                  Experience
                </span>

                <span>
                  Action
                </span>

              </div>

              {mySkills.map(
                (skill, index) => {

                  const levelClass =
                    String(
                      skill.skill_level ||
                        "Beginner"
                    )
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        "-"
                      );

                  return (
                    <div
                      className="skills-table-row"
                      key={
                        skill.student_skill_id ??
                        index
                      }
                    >

                      {/* NAME */}

                      <div className="skill-name-cell">

                        <div className="skill-small-icon">
                          ⚡
                        </div>

                        <strong>
                          {
                            skill.skill_name
                          }
                        </strong>

                      </div>

                      {/* LEVEL */}

                      <div>

                        <span
                          className={`skill-level ${levelClass}`}
                        >
                          {
                            skill.skill_level
                          }
                        </span>

                      </div>

                      {/* EXPERIENCE */}

                      <div className="experience-cell">

                        {
                          skill.years_experience
                        }{" "}

                        {Number(
                          skill.years_experience
                        ) === 1
                          ? "year"
                          : "years"}

                      </div>

                      {/* DELETE */}

                      <div>

                        <button
                          type="button"
                          className="delete-skill-button"
                          onClick={() =>
                            handleDeleteSkill(
                              skill.student_skill_id
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default Skills;
