import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProfile.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ============================================================
// CONVERT FASTAPI ERRORS INTO READABLE TEXT
// ============================================================

const getErrorMessage = (data, fallback = "Something went wrong") => {
  if (!data) {
    return fallback;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((error) => {
        if (typeof error === "string") {
          return error;
        }

        if (error && error.msg) {
          const location = Array.isArray(error.loc)
            ? error.loc.join(" → ")
            : "";

          return location
            ? `${location}: ${error.msg}`
            : error.msg;
        }

        return JSON.stringify(error);
      })
      .join("\n");
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (data.detail && typeof data.detail === "object") {
    return (
      data.detail.message ||
      data.detail.msg ||
      JSON.stringify(data.detail)
    );
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return fallback;
};

// ============================================================
// MY PROFILE
// ============================================================

function MyProfile() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================================
  // PROFILE STATE
  // ==========================================================

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    college: "",
    degree: "",
    branch: "",
    year: "",
    semester: "",
    cgpa: "",
    location: "",
    career_objective: "",
    preferred_role: "",
    linkedin_url: "",
    github_url: ""
  });

  // ==========================================================
  // GET LOGGED-IN USER
  // ==========================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      const id =
        user.user_id ??
        user.userId ??
        user.id;

      if (!id) {
        setError("User ID not found. Please login again.");
        setLoading(false);
        return;
      }

      setUserId(Number(id));

      loadProfile(Number(id));
    } catch (err) {
      console.error("LocalStorage error:", err);

      setError("Invalid login session. Please login again.");
      setLoading(false);
    }
  }, [navigate]);

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value.substring(0, 10);
    }

    try {
      return new Date(value)
        .toISOString()
        .substring(0, 10);
    } catch {
      return "";
    }
  };

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = async (id) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/api/profile/${id}` // FIXED: API_URL → API
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Backend returned an invalid response."
        );
      }

      console.log("Profile loaded:", data);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to load profile")
        );
      }

      // ======================================================
      // PUT DATABASE DATA INTO FORM
      // ======================================================

      setProfile({
        full_name: data.full_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        date_of_birth: formatDate(data.date_of_birth),
        gender: data.gender ?? "",
        college: data.college ?? "",
        degree: data.degree ?? "",
        branch: data.branch ?? "",
        year: data.year ?? "",
        semester: data.semester ?? "",
        cgpa: data.cgpa ?? "",
        location: data.location ?? "",
        career_objective: data.career_objective ?? "",
        preferred_role: data.preferred_role ?? "",
        linkedin_url: data.linkedin_url ?? "",
        github_url: data.github_url ?? ""
      });
    } catch (err) {
      console.error("Profile loading error:", err);

      setError(
        err.message ||
        "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  const handleChange = (e) => {
    const {
      name,
      value
    } = e.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value
    }));

    setMessage("");
    setError("");
  };

  // ==========================================================
  // VALIDATE PROFILE
  // ==========================================================

  const validateProfile = () => {
    if (profile.year !== "") {
      const year = Number(profile.year);

      if (
        !Number.isInteger(year) ||
        year < 1 ||
        year > 6
      ) {
        return "Year must be between 1 and 6.";
      }
    }

    if (profile.semester !== "") {
      const semester = Number(profile.semester);

      if (
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 12
      ) {
        return "Semester must be between 1 and 12.";
      }
    }

    if (profile.cgpa !== "") {
      const cgpa = Number(profile.cgpa);

      if (
        Number.isNaN(cgpa) ||
        cgpa < 0 ||
        cgpa > 10
      ) {
        return "CGPA must be between 0 and 10.";
      }
    }

    return "";
  };

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      setError("User ID not found. Please login again.");
      return;
    }

    const validationError = validateProfile();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload = {
        full_name: profile.full_name.trim() || null,
        phone: profile.phone.trim() || null,
        date_of_birth: profile.date_of_birth || null,
        gender: profile.gender || null,
        college: profile.college.trim() || null,
        degree: profile.degree.trim() || null,
        branch: profile.branch.trim() || null,

        year:
          profile.year === ""
            ? null
            : String(profile.year),

        semester:
          profile.semester === ""
            ? null
            : String(profile.semester),

        cgpa:
          profile.cgpa === ""
            ? null
            : Number(profile.cgpa),

        location: profile.location.trim() || null,
        career_objective: profile.career_objective.trim() || null,
        preferred_role: profile.preferred_role.trim() || null,
        linkedin_url: profile.linkedin_url.trim() || null,
        github_url: profile.github_url.trim() || null
      };

      console.log("Sending profile:", payload);

      // ======================================================
      // SEND TO FASTAPI
      // ======================================================

      const response = await fetch(
        `${API}/api/profile/${userId}`, // FIXED: API_URL → API
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Backend returned an invalid response."
        );
      }

      console.log("Save response:", data);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Profile update failed")
        );
      }

      // ======================================================
      // UPDATE LOCAL STORAGE
      // ======================================================

      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          const user = JSON.parse(storedUser);

          user.user_id = user.user_id || userId;
          user.full_name = profile.full_name;

          localStorage.setItem(
            "user",
            JSON.stringify(user)
          );
        }
      } catch (storageError) {
        console.error("LocalStorage update error:", storageError);
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      setMessage("Profile updated successfully!");

      await loadProfile(userId);

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } catch (err) {
      console.error("Profile update error:", err);

      setError(
        err.message ||
        "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>

          <p>
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="profile-page">

      <div className="profile-header">

        <div>
          <h1>My Profile</h1>

          <p>
            Manage your personal and
            career information
          </p>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

      </div>

      {message && (
        <div className="success-message">
          <span>✓</span>

          <div>
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>!</span>

          <div
            style={{
              whiteSpace: "pre-line"
            }}
          >
            {error}
          </div>
        </div>
      )}

      <form
        className="profile-form"
        onSubmit={handleSubmit}
      >

        {/* PERSONAL INFORMATION */}

        <section className="profile-card">

          <div className="card-heading">

            <div className="section-icon">
              👤
            </div>

            <div>
              <h2>Personal Information</h2>

              <p>
                Basic information about you
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>Full Name</label>

              <input
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                value={profile.email}
                disabled
                className="disabled-input"
              />

              <small>
                Email cannot be changed here.
              </small>
            </div>

            <div className="form-group">
              <label>Phone Number</label>

              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>

              <input
                type="date"
                name="date_of_birth"
                value={profile.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Gender</label>

              <select
                name="gender"
                value={profile.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Location</label>

              <input
                type="text"
                name="location"
                value={profile.location}
                onChange={handleChange}
                placeholder="e.g. Pune"
              />
            </div>

          </div>

        </section>

        {/* EDUCATION */}

        <section className="profile-card">

          <div className="card-heading">

            <div className="section-icon">
              🎓
            </div>

            <div>
              <h2>Education</h2>

              <p>
                Your academic information
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-group full-width">
              <label>College / University</label>

              <input
                type="text"
                name="college"
                value={profile.college}
                onChange={handleChange}
                placeholder="Enter your college or university"
              />
            </div>

            <div className="form-group">
              <label>Degree</label>

              <input
                type="text"
                name="degree"
                value={profile.degree}
                onChange={handleChange}
                placeholder="e.g. B.Tech"
              />
            </div>

            <div className="form-group">
              <label>Branch</label>

              <input
                type="text"
                name="branch"
                value={profile.branch}
                onChange={handleChange}
                placeholder="e.g. ECE AIML"
              />
            </div>

            <div className="form-group">
              <label>Year</label>

              <input
                type="number"
                name="year"
                value={profile.year}
                onChange={handleChange}
                placeholder="e.g. 3"
                min="1"
                max="6"
              />

              <small>
                Enter year from 1 to 6.
              </small>
            </div>

            <div className="form-group">
              <label>Semester</label>

              <input
                type="number"
                name="semester"
                value={profile.semester}
                onChange={handleChange}
                placeholder="e.g. 5"
                min="1"
                max="12"
              />

              <small>
                Enter semester from 1 to 12.
              </small>
            </div>

            <div className="form-group">
              <label>CGPA</label>

              <input
                type="number"
                name="cgpa"
                value={profile.cgpa}
                onChange={handleChange}
                placeholder="e.g. 8.16"
                min="0"
                max="10"
                step="0.01"
              />

              <small>
                CGPA should be between 0 and 10.
              </small>
            </div>

          </div>

        </section>

        {/* CAREER INFORMATION */}

        <section className="profile-card">

          <div className="card-heading">

            <div className="section-icon">
              💼
            </div>

            <div>
              <h2>Career Information</h2>

              <p>
                Tell recruiters about your career goals
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-group full-width">
              <label>Preferred Role</label>

              <input
                type="text"
                name="preferred_role"
                value={profile.preferred_role}
                onChange={handleChange}
                placeholder="e.g. AI/ML Engineer"
              />
            </div>

            <div className="form-group full-width">
              <label>Career Objective</label>

              <textarea
                name="career_objective"
                value={profile.career_objective}
                onChange={handleChange}
                placeholder="Write your career objective..."
                rows="5"
              />
            </div>

          </div>

        </section>

        {/* PROFESSIONAL LINKS */}

        <section className="profile-card">

          <div className="card-heading">

            <div className="section-icon">
              🔗
            </div>

            <div>
              <h2>Professional Links</h2>

              <p>
                Add your professional profiles
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>LinkedIn URL</label>

              <input
                type="url"
                name="linkedin_url"
                value={profile.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>

            <div className="form-group">
              <label>GitHub URL</label>

              <input
                type="url"
                name="github_url"
                value={profile.github_url}
                onChange={handleChange}
                placeholder="https://github.com/yourusername"
              />
            </div>

          </div>

        </section>

        {/* SAVE SECTION */}

        <div className="save-section">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-button"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="button-spinner"></span>
                Saving...
              </>
            ) : (
              <>
                💾 Save Profile
              </>
            )}
          </button>

        </div>

      </form>

    </div>
  );
}

export default MyProfile;