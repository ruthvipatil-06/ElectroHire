import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !formData.full_name.trim() ||
      !formData.email.trim() ||
      !formData.password
    ) {
      setError(
        "Please fill in all the required fields."
      );
      return;
    }

    if (formData.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: formData.full_name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            role: formData.role,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        setError(
          data.detail ||
            data.message ||
            "Registration failed. Please try again."
        );
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess: true,
          email: formData.email.trim(),
        },
      });

    } catch (err) {
      console.error("Registration error:", err);

      setError(
        "Failed to connect to the backend. Make sure the backend is running on http://localhost:8000."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      <div className="register-container">

        <div
          className="register-logo"
          onClick={() => navigate("/")}
        >
          Electro<span>Hire</span>
        </div>

        <h2>Create Account</h2>

        <p className="register-subtitle">
          Create your ElectroHire account
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>

          <div className="input-group">
            <label>Full Name</label>

            <input
              type="text"
              name="full_name"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <div className="input-group">
            <label>Register As</label>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">
                Student
              </option>

              <option value="recruiter">
                Recruiter
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Register"}
          </button>

        </form>

        <p className="login-link">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>
            Login
          </span>
        </p>

        <button
          type="button"
          className="home-link"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>

      </div>

    </div>
  );
}

export default Register;