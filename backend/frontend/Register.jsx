import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {

  const navigate = useNavigate();


  const [role, setRole] = useState("");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");


  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");


  const handleRegister = async (event) => {

    event.preventDefault();

    setError("");
    setSuccess("");


    /* CHECK ROLE */

    if (!role) {

      setError(
        "Please select Student or Recruiter."
      );

      return;

    }


    /* CHECK PASSWORD */

    if (password !== confirmPassword) {

      setError(
        "Passwords do not match."
      );

      return;

    }


    if (password.length < 6) {

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
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            name: name,

            email: email,

            password: password,

            role: role

          })

        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          data.message ||
          "Registration failed."
        );

      }


      console.log(
        "Registration response:",
        data
      );


      setSuccess(
        "Registration successful! Redirecting to login..."
      );


      /*
        Go to Login after successful registration.
      */

      setTimeout(() => {

        navigate("/login");

      }, 1500);

    }


    catch (error) {

      console.error(
        "Registration error:",
        error
      );


      setError(
        error.message ||
        "Unable to connect to the server."
      );

    }


    finally {

      setLoading(false);

    }

  };


  return (

    <div className="register-page">

      <div className="register-card">


        {/* LOGO */}

        <Link
          to="/"
          className="register-logo"
        >
          Electro<span>Hire</span>
        </Link>


        {/* TITLE */}

        <h1>
          Create Your Account
        </h1>

        <p className="register-subtitle">
          Join ElectroHire and build your professional profile.
        </p>


        {/* ERROR */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        {/* SUCCESS */}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}


        {/* ROLE */}

        <div className="role-section">

          <label className="section-label">
            Register as
          </label>


          <div className="role-options">


            {/* STUDENT */}

            <button
              type="button"
              className={`role-card ${
                role === "student"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setRole("student")
              }
            >

              <div className="role-icon">
                🎓
              </div>

              <div>

                <h3>
                  Student
                </h3>

                <p>
                  Build your profile and discover opportunities.
                </p>

              </div>

            </button>


            {/* RECRUITER */}

            <button
              type="button"
              className={`role-card ${
                role === "recruiter"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setRole("recruiter")
              }
            >

              <div className="role-icon">
                💼
              </div>

              <div>

                <h3>
                  Recruiter
                </h3>

                <p>
                  Find skilled students and hire talent.
                </p>

              </div>

            </button>

          </div>

        </div>


        {/* FORM */}

        <form onSubmit={handleRegister}>


          {/* NAME */}

          <div className="form-group">

            <label htmlFor="register-name">
              Full Name
            </label>

            <input
              id="register-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
            />

          </div>


          {/* EMAIL */}

          <div className="form-group">

            <label htmlFor="register-email">
              Email
            </label>

            <input
              id="register-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

          </div>


          {/* PASSWORD */}

          <div className="form-group">

            <label htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

          </div>


          {/* CONFIRM PASSWORD */}

          <div className="form-group">

            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              required
            />

          </div>


          {/* CREATE ACCOUNT */}

          <button
            type="submit"
            className="create-account-button"
            disabled={loading}
          >

            {loading
              ? "Creating Account..."
              : "Create Account"
            }

          </button>

        </form>


        {/* LOGIN */}

        <p className="register-text">

          Already have an account?

          <Link to="/login">
            Login
          </Link>

        </p>


        {/* HOME */}

        <Link
          to="/"
          className="back-home"
        >
          ← Back to Home
        </Link>


      </div>

    </div>

  );
}

export default Register;