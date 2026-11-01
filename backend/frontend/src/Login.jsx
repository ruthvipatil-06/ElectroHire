
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // ============================================================
  // FORM STATE
  // ============================================================

  const [email, setEmail] = useState(
    location.state?.email || ""
  );

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(
    location.state?.registrationSuccess
      ? "Registration successful. Please login."
      : ""
  );

  const [loading, setLoading] = useState(false);

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // LOGIN API
      // ========================================================

      const response = await fetch(
        `${API}/api/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      // ========================================================
      // READ RESPONSE
      // ========================================================

      let data = {};

      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(
          "Could not read login response:",
          jsonError
        );

        data = {};
      }

      console.log(
        "LOGIN RESPONSE STATUS:",
        response.status
      );

      console.log(
        "LOGIN RESPONSE DATA:",
        data
      );

      // ========================================================
      // LOGIN FAILED
      // ========================================================

      if (!response.ok) {
        setError(
          data.detail ||
            data.message ||
            "Invalid email or password."
        );

        return;
      }

      // ========================================================
      // LOGIN SUCCESS
      // ========================================================

      console.log(
        "LOGIN SUCCESS - SAVING USER DATA"
      );

      // ========================================================
      // IMPORTANT:
      // GET ROLE FROM BACKEND
      // ========================================================

      const role = String(data.role || "")
        .trim()
        .toLowerCase();

      console.log(
        "ROLE RECEIVED FROM BACKEND:",
        role
      );

      // ========================================================
      // ROLE MUST EXIST
      // ========================================================

      if (!role) {
        console.error(
          "LOGIN ERROR: Backend did not return a role.",
          data
        );

        setError(
          "Login failed: User role was not returned by the server."
        );

        return;
      }

      // ========================================================
      // VALIDATE ROLE
      // ========================================================

      if (
        role !== "student" &&
        role !== "recruiter"
      ) {
        console.error(
          "LOGIN ERROR: Invalid role received:",
          role
        );

        setError(
          "Login failed: Invalid user role."
        );

        return;
      }

      // ========================================================
      // CREATE LOGGED-IN USER OBJECT
      // ========================================================

      const loggedInUser = {
        user_id: data.user_id,

        student_id:
          data.student_id ?? null,

        full_name:
          data.full_name || "",

        email:
          data.email || email.trim(),

        role: role,
      };

      console.log(
        "LOGGED-IN USER:",
        loggedInUser
      );

      // ========================================================
      // SAVE COMPLETE USER OBJECT
      // ========================================================

      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      // ========================================================
      // SAVE USER ID
      // ========================================================

      if (
        data.user_id !== undefined &&
        data.user_id !== null
      ) {
        localStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      }

      // ========================================================
      // SAVE STUDENT ID
      // ========================================================

      if (
        data.student_id !== undefined &&
        data.student_id !== null
      ) {
        localStorage.setItem(
          "student_id",
          String(data.student_id)
        );
      } else {
        // Make sure an old student ID is not kept
        localStorage.removeItem("student_id");
      }

      // ========================================================
      // SAVE ROLE
      // ========================================================

      localStorage.setItem(
        "role",
        role
      );

      // ========================================================
      // SAVE EMAIL
      // ========================================================

      localStorage.setItem(
        "email",
        data.email || email.trim()
      );

      // ========================================================
      // SAVE FULL NAME
      // ========================================================

      if (data.full_name) {
        localStorage.setItem(
          "full_name",
          data.full_name
        );
      }

      // ========================================================
      // SAVE LOGIN STATUS
      // ========================================================

      localStorage.setItem(
        "isLoggedIn",
        "true"
      );

      // ========================================================
      // VERIFY SAVED USER
      // ========================================================

      console.log(
        "SAVED USER:",
        localStorage.getItem("user")
      );

      console.log(
        "SAVED ROLE:",
        localStorage.getItem("role")
      );

      console.log(
        "LOGIN SUCCESS - USER ROLE:",
        loggedInUser.role
      );

      // ========================================================
      // ROLE-BASED REDIRECT
      // ========================================================

      if (loggedInUser.role === "recruiter") {
        // ======================================================
        // RECRUITER
        // ======================================================

        console.log(
          "RECRUITER LOGIN - GOING TO RECRUITER DASHBOARD"
        );

        navigate(
          "/recruiter-dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      // ========================================================
      // STUDENT
      // ========================================================

      if (loggedInUser.role === "student") {
        console.log(
          "STUDENT LOGIN - GOING TO STUDENT DASHBOARD"
        );

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

    } catch (err) {
      // ========================================================
      // CONNECTION ERROR
      // ========================================================

      console.error(
        "Login error:",
        err
      );

      setError(
        "Failed to connect to the ElectroHire backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="electro-login-page">

      <div className="electro-login-card">

        {/* ======================================================
            LOGO
        ======================================================= */}

        <div
          className="electro-login-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          Electro<span>Hire</span>
        </div>

        {/* ======================================================
            HEADING
        ======================================================= */}

        <div className="electro-login-heading">

          <h1>
            Welcome Back
          </h1>

          <p>
            Login to continue to ElectroHire
          </p>

        </div>

        {/* ======================================================
            SUCCESS MESSAGE
        ======================================================= */}

        {success && (
          <div className="electro-login-success">
            {success}
          </div>
        )}

        {/* ======================================================
            ERROR MESSAGE
        ======================================================= */}

        {error && (
          <div className="electro-login-error">
            {error}
          </div>
        )}

        {/* ======================================================
            LOGIN FORM
        ======================================================= */}

        <form
          className="electro-login-form"
          onSubmit={handleLogin}
        >

          {/* ====================================================
              EMAIL
          ===================================================== */}

          <div className="electro-login-field">

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />

          </div>

          {/* ====================================================
              PASSWORD
          ===================================================== */}

          <div className="electro-login-field">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />

          </div>

          {/* ====================================================
              LOGIN BUTTON
          ===================================================== */}

          <button
            type="submit"
            className="electro-login-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        {/* ======================================================
            DIVIDER
        ======================================================= */}

        <div className="electro-login-divider">
          <span>OR</span>
        </div>

        {/* ======================================================
            REGISTER
        ======================================================= */}

        <p className="electro-login-register-text">

          Don't have an account?{" "}

          <span
            onClick={() => navigate("/register")}
          >
            Register
          </span>

        </p>

        {/* ======================================================
            BACK HOME
        ======================================================= */}

        <button
          type="button"
          className="electro-login-home-link"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>

      </div>

    </div>
  );
}

export default Login;
