import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecruiterProfile.css";

const API_URL = "http://localhost:8000";

function RecruiterProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    company_name: "",
    designation: "",
    phone: "",
    company_website: "",
    company_linkedin: "",
    industry: "",
    company_size: "",
    location: "",
    company_description: "",
  });

  // ============================================================
  // LOAD USER
  // ============================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "recruiter") {
        navigate("/dashboard");
        return;
      }

      setUser(parsedUser);

      loadProfile(parsedUser.user_id);
    } catch (error) {
      console.error("Invalid user data:", error);
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // ============================================================
  // LOAD RECRUITER PROFILE
  // ============================================================

  const loadProfile = async (userId) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/recruiter-profile/${userId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load recruiter profile");
      }

      const data = await response.json();

      setFormData({
        company_name: data.company_name || "",
        designation: data.designation || "",
        phone: data.phone || "",
        company_website: data.company_website || "",
        company_linkedin: data.company_linkedin || "",
        industry: data.industry || "",
        company_size: data.company_size || "",
        location: data.location || "",
        company_description: data.company_description || "",
      });
    } catch (error) {
      console.error("Profile loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.user_id) {
      setMessage("User session not found.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/recruiter-profile/${user.user_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to save profile");
      }

      setMessage("Profile saved successfully!");

    } catch (error) {
      console.error("Save profile error:", error);
      setMessage(error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="recruiter-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="recruiter-profile-page">

      {/* ========================================================
          TOP BAR
      ======================================================== */}

      <header className="recruiter-profile-header">

        <div>
          <h1>My Profile</h1>
          <p>
            Manage your recruiter and company information
          </p>
        </div>

        <div className="recruiter-profile-user">
          <div className="profile-avatar">
            {user?.full_name?.charAt(0)?.toUpperCase() || "R"}
          </div>

          <div>
            <strong>{user?.full_name || "Recruiter"}</strong>
            <span>Recruiter</span>
          </div>
        </div>

      </header>


      {/* ========================================================
          FORM
      ======================================================== */}

      <form
        className="recruiter-profile-form"
        onSubmit={handleSubmit}
      >

        {/* ======================================================
            COMPANY INFORMATION
        ====================================================== */}

        <section className="profile-card">

          <div className="section-heading">
            <div className="section-icon">🏢</div>

            <div>
              <h2>Company Information</h2>
              <p>Tell students about your company.</p>
            </div>
          </div>


          <div className="form-grid">

            {/* Company Name */}

            <div className="form-group full-width">

              <label>
                Company Name <span>*</span>
              </label>

              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Enter company name"
              />

            </div>


            {/* Industry */}

            <div className="form-group">

              <label>Industry</label>

              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g. IT, Electronics, Finance"
              />

            </div>


            {/* Company Size */}

            <div className="form-group">

              <label>Company Size</label>

              <select
                name="company_size"
                value={formData.company_size}
                onChange={handleChange}
              >

                <option value="">
                  Select company size
                </option>

                <option value="1-10 Employees">
                  1-10 Employees
                </option>

                <option value="11-50 Employees">
                  11-50 Employees
                </option>

                <option value="51-200 Employees">
                  51-200 Employees
                </option>

                <option value="201-500 Employees">
                  201-500 Employees
                </option>

                <option value="501-1000 Employees">
                  501-1000 Employees
                </option>

                <option value="1000+ Employees">
                  1000+ Employees
                </option>

              </select>

            </div>


            {/* Location */}

            <div className="form-group full-width">

              <label>Location</label>

              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Pune, Maharashtra"
              />

            </div>

          </div>

        </section>


        {/* ======================================================
            RECRUITER INFORMATION
        ====================================================== */}

        <section className="profile-card">

          <div className="section-heading">

            <div className="section-icon">👤</div>

            <div>
              <h2>Recruiter Information</h2>
              <p>Your professional contact information.</p>
            </div>

          </div>


          <div className="form-grid">

            {/* Designation */}

            <div className="form-group">

              <label>Designation</label>

              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g. HR Manager"
              />

            </div>


            {/* Phone */}

            <div className="form-group">

              <label>Phone Number</label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />

            </div>

          </div>

        </section>


        {/* ======================================================
            ONLINE PRESENCE
        ====================================================== */}

        <section className="profile-card">

          <div className="section-heading">

            <div className="section-icon">🌐</div>

            <div>
              <h2>Online Presence</h2>
              <p>Add your company's online profiles.</p>
            </div>

          </div>


          <div className="form-grid">

            {/* Website */}

            <div className="form-group">

              <label>Company Website</label>

              <input
                type="url"
                name="company_website"
                value={formData.company_website}
                onChange={handleChange}
                placeholder="https://www.example.com"
              />

            </div>


            {/* LinkedIn */}

            <div className="form-group">

              <label>Company LinkedIn</label>

              <input
                type="url"
                name="company_linkedin"
                value={formData.company_linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/company/..."
              />

            </div>

          </div>

        </section>


        {/* ======================================================
            ABOUT COMPANY
        ====================================================== */}

        <section className="profile-card">

          <div className="section-heading">

            <div className="section-icon">📝</div>

            <div>
              <h2>About Company</h2>
              <p>Describe your company and work culture.</p>
            </div>

          </div>


          <div className="form-group">

            <label>Company Description</label>

            <textarea
              name="company_description"
              value={formData.company_description}
              onChange={handleChange}
              placeholder="Tell students about your company, products, services, work culture and opportunities..."
              rows="6"
            />

          </div>

        </section>


        {/* ======================================================
            SAVE AREA
        ====================================================== */}

        <div className="profile-actions">

          {message && (
            <div
              className={
                message.includes("successfully")
                  ? "success-message"
                  : "error-message"
              }
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="save-profile-btn"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

        </div>

      </form>

    </div>
  );
}

export default RecruiterProfile;