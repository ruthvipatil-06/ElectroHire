import React, { useEffect, useState } from "react";
import "./Certificates.css";

const API_BASE_URL = "http://localhost:8000";

function Certificates() {
  const [certificates, setCertificates] = useState([]);

  const [formData, setFormData] = useState({
    certificate_name: "",
    issuing_organization: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    certificate_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // GET USER ID
  // ==========================================================

  const getUserId = () => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        if (user?.user_id) {
          return Number(user.user_id);
        }

        if (user?.id) {
          return Number(user.id);
        }
      } catch (error) {
        console.error("Invalid user data:", error);
      }
    }

    const storedUserId = localStorage.getItem("user_id");

    if (storedUserId) {
      return Number(storedUserId);
    }

    return null;
  };

  // ==========================================================
  // LOAD CERTIFICATES
  // ==========================================================

  const loadCertificates = async () => {
    setLoading(true);
    setError("");

    const userId = getUserId();

    if (!userId) {
      setError("User ID not found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/certificates/${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        let message = "Could not load certificates.";

        if (typeof data.detail === "string") {
          message = data.detail;
        }

        throw new Error(message);
      }

      setCertificates(
        Array.isArray(data.certificates)
          ? data.certificates
          : []
      );

    } catch (error) {
      console.error("Load certificates error:", error);
      setError(error.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadCertificates();
  }, []);

  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================================
  // ADD CERTIFICATE
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const userId = getUserId();

    if (!userId) {
      setError("User ID not found. Please login again.");
      return;
    }

    if (!formData.certificate_name.trim()) {
      setError("Please enter certificate name.");
      return;
    }

    if (!formData.issuing_organization.trim()) {
      setError("Please enter issuing organization.");
      return;
    }

    if (!formData.issue_date) {
      setError("Please select issue date.");
      return;
    }

    if (
      formData.expiry_date &&
      formData.expiry_date < formData.issue_date
    ) {
      setError("Expiry date cannot be before issue date.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        user_id: userId,

        certificate_name:
          formData.certificate_name.trim(),

        issuing_organization:
          formData.issuing_organization.trim(),

        issue_date:
          formData.issue_date,

        expiry_date:
          formData.expiry_date || null,

        credential_id:
          formData.credential_id.trim() || null,

        certificate_url:
          formData.certificate_url.trim() || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/certificates`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let message = "Failed to add certificate.";

        if (typeof data.detail === "string") {
          message = data.detail;
        }

        throw new Error(message);
      }

      setSuccess("Certificate added successfully!");

      // Clear form
      setFormData({
        certificate_name: "",
        issuing_organization: "",
        issue_date: "",
        expiry_date: "",
        credential_id: "",
        certificate_url: "",
      });

      // Reload certificates
      await loadCertificates();

    } catch (error) {
      console.error("Add certificate error:", error);
      setError(
        error.message || "Failed to add certificate."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE CERTIFICATE
  // ==========================================================

  const handleDelete = async (certificateId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this certificate?"
    );

    if (!confirmDelete) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/certificates/${certificateId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let message = "Failed to delete certificate.";

        if (typeof data.detail === "string") {
          message = data.detail;
        }

        throw new Error(message);
      }

      setSuccess("Certificate deleted successfully.");

      await loadCertificates();

    } catch (error) {
      console.error("Delete certificate error:", error);
      setError(
        error.message || "Failed to delete certificate."
      );
    }
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (date) => {
    if (!date) {
      return "Not specified";
    }

    try {
      const formatted = new Date(date);

      return formatted.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return date;
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="certificates-page">

      <div className="certificates-container">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="certificates-header">

          <div>
            <h1>Certificates</h1>

            <p>
              Add and manage your professional certificates
            </p>
          </div>

        </div>

        {/* ====================================================
            SUCCESS MESSAGE
        ==================================================== */}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* ====================================================
            ERROR MESSAGE
        ==================================================== */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* ====================================================
            ADD CERTIFICATE FORM
        ==================================================== */}

        <div className="certificate-form-card">

          <h2>Add Certificate</h2>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              {/* Certificate Name */}

              <div className="form-group">

                <label>
                  Certificate Name *
                </label>

                <input
                  type="text"
                  name="certificate_name"
                  value={formData.certificate_name}
                  onChange={handleChange}
                  placeholder="e.g. AWS Cloud Practitioner"
                  required
                />

              </div>

              {/* Issuing Organization */}

              <div className="form-group">

                <label>
                  Issuing Organization *
                </label>

                <input
                  type="text"
                  name="issuing_organization"
                  value={
                    formData.issuing_organization
                  }
                  onChange={handleChange}
                  placeholder="e.g. Amazon Web Services"
                  required
                />

              </div>

              {/* Issue Date */}

              <div className="form-group">

                <label>
                  Issue Date *
                </label>

                <input
                  type="date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* Expiry Date */}

              <div className="form-group">

                <label>
                  Expiry Date
                </label>

                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                />

              </div>

              {/* Credential ID */}

              <div className="form-group">

                <label>
                  Credential ID
                </label>

                <input
                  type="text"
                  name="credential_id"
                  value={formData.credential_id}
                  onChange={handleChange}
                  placeholder="e.g. ABC123XYZ"
                />

              </div>

              {/* Certificate URL */}

              <div className="form-group">

                <label>
                  Certificate URL
                </label>

                <input
                  type="url"
                  name="certificate_url"
                  value={formData.certificate_url}
                  onChange={handleChange}
                  placeholder="https://example.com/certificate"
                />

              </div>

            </div>

            <button
              type="submit"
              className="add-certificate-btn"
              disabled={saving}
            >
              {saving
                ? "Adding..."
                : "Add Certificate"}
            </button>

          </form>

        </div>

        {/* ====================================================
            CERTIFICATE LIST
        ==================================================== */}

        <div className="certificate-list-section">

          <div className="section-header">

            <h2>
              My Certificates
            </h2>

            <span className="certificate-count">
              {certificates.length}
            </span>

          </div>

          {/* Loading */}

          {loading && (
            <div className="loading-message">
              Loading certificates...
            </div>
          )}

          {/* Empty */}

          {!loading &&
            certificates.length === 0 && (
              <div className="empty-certificates">
                <h3>No certificates added yet</h3>

                <p>
                  Add your certificates using the form above.
                </p>
              </div>
            )}

          {/* Certificate Cards */}

          {!loading &&
            certificates.length > 0 && (

              <div className="certificates-grid">

                {certificates.map((certificate) => (

                  <div
                    className="certificate-card"
                    key={certificate.certificate_id}
                  >

                    <div className="certificate-card-header">

                      <div>

                        <h3>
                          {certificate.certificate_name}
                        </h3>

                        <p className="certificate-organization">
                          {
                            certificate.issuing_organization ||
                            "Organization not specified"
                          }
                        </p>

                      </div>

                      <button
                        type="button"
                        className="delete-certificate-btn"
                        onClick={() =>
                          handleDelete(
                            certificate.certificate_id
                          )
                        }
                      >
                        Delete
                      </button>

                    </div>

                    <div className="certificate-details">

                      <div className="certificate-detail">

                        <span className="detail-label">
                          Issue Date
                        </span>

                        <span className="detail-value">
                          {formatDate(
                            certificate.issue_date
                          )}
                        </span>

                      </div>

                      <div className="certificate-detail">

                        <span className="detail-label">
                          Expiry Date
                        </span>

                        <span className="detail-value">
                          {formatDate(
                            certificate.expiry_date
                          )}
                        </span>

                      </div>

                      {certificate.credential_id && (

                        <div className="certificate-detail">

                          <span className="detail-label">
                            Credential ID
                          </span>

                          <span className="detail-value">
                            {certificate.credential_id}
                          </span>

                        </div>

                      )}

                    </div>

                    {certificate.certificate_url && (

                      <div className="certificate-link">

                        <a
                          href={
                            certificate.certificate_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Certificate
                        </a>

                      </div>

                    )}

                  </div>

                ))}

              </div>

            )}

        </div>

      </div>

    </div>
  );
}

export default Certificates;