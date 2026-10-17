import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="electro-home">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="home-navbar">

        {/* LOGO */}
        <div
          className="home-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <span className="logo-icon">E</span>
          <span>
            Electro<span className="logo-blue">Hire</span>
          </span>
        </div>

        {/* NAVIGATION */}
        <div className="home-nav">
          <a
            href="#home"
            className="active"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            Home
          </a>

          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Features
          </a>

          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("about")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            About
          </a>
        </div>

        {/* NAV BUTTONS */}
        <div className="nav-actions">

          <button
            className="login-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            className="get-started-btn"
            onClick={() => navigate("/register")}
          >
            Get Started
          </button>

        </div>

      </nav>


      {/* =====================================================
          HERO SECTION
      ===================================================== */}

      <main
        className="hero-section"
        id="home"
      >

        {/* LEFT SIDE */}
        <div className="hero-content">

          {/* BADGE */}
          <div className="ai-badge">
            <span className="sparkle">✦</span>
            Your Career. Your Future.
          </div>


          {/* HEADING */}
          <h1>
            Build Your Career With{" "}
            <span>ElectroHire</span>
          </h1>


          {/* DESCRIPTION */}
          <p className="hero-description">
            Build your professional profile, showcase your skills
            and projects, assess your abilities and discover career
            opportunities designed for electronics and technology
            students.
          </p>


          {/* BUTTONS */}
          <div className="hero-buttons">

            <button
              className="journey-btn"
              onClick={() => navigate("/register")}
            >
              Start Your Journey
              <span>→</span>
            </button>

            <button
              className="demo-btn"
              onClick={() => navigate("/login")}
            >
              <span className="play-icon">▶</span>
              Login to Continue
            </button>

          </div>


          {/* FEATURES */}
          <div
            className="hero-features"
            id="features"
          >

            <div className="feature-item">

              <div className="feature-icon">
                ✓
              </div>

              <div>
                <h3>Build Your Profile</h3>
                <p>Showcase your skills and projects</p>
              </div>

            </div>


            <div className="feature-divider"></div>


            <div className="feature-item">

              <div className="feature-icon">
                ✦
              </div>

              <div>
                <h3>AI Skill Assessment</h3>
                <p>Discover your strengths and gaps</p>
              </div>

            </div>


            <div className="feature-divider"></div>


            <div className="feature-item">

              <div className="feature-icon">
                ✓
              </div>

              <div>
                <h3>Find Opportunities</h3>
                <p>Discover jobs matched to you</p>
              </div>

            </div>

          </div>

        </div>


        {/* =====================================================
            AI PANEL
        ===================================================== */}

        <div className="ai-panel-wrapper">

          <div className="ai-panel">

            {/* AI HEADER */}
            <div className="ai-panel-header">

              <div className="ai-title">
                <span className="ai-small-icon">✦</span>
                ElectroHire AI Assistant
              </div>

              <div className="online-status">
                <span></span>
                Online
              </div>

            </div>


            {/* CHAT AREA */}
            <div className="chat-area">

              {/* AI MESSAGE */}
              <div className="message-row ai-row">

                <div className="chat-avatar">
                  ✦
                </div>

                <div className="ai-message">

                  <p>
                    <strong>Hi! Welcome to ElectroHire.</strong>
                  </p>

                  <p>
                    I can help you build your professional
                    profile and prepare for your career.
                  </p>

                  <ul>
                    <li>Build your profile</li>
                    <li>Assess your technical skills</li>
                    <li>Find suitable opportunities</li>
                  </ul>

                </div>

              </div>


              {/* USER MESSAGE */}
              <div className="message-row user-row">

                <div className="user-message">
                  How can I improve my profile?
                </div>

              </div>


              {/* SECOND AI MESSAGE */}
              <div className="message-row ai-row second-ai">

                <div className="chat-avatar">
                  ✦
                </div>

                <div className="ai-message short-message">

                  <p>
                    Start by adding your <strong>skills,
                    projects and certificates.</strong>
                  </p>

                  <p>
                    Our AI assessment can also identify
                    areas where you can improve.
                  </p>

                  <button
                    className="learning-btn"
                    onClick={() => navigate("/register")}
                  >
                    Start Learning
                    <span>→</span>
                  </button>

                </div>

              </div>

            </div>


            {/* CHAT INPUT */}
            <div className="chat-input-container">

              <div className="chat-input">
                Ask ElectroHire AI...
              </div>

              <button
                className="send-btn"
                onClick={() => navigate("/login")}
              >
                ↑
              </button>

            </div>

          </div>

        </div>

      </main>


      {/* =====================================================
          ABOUT ANCHOR
      ===================================================== */}

      <section
        id="about"
        className="hidden-support-section"
      >
      </section>


      {/* =====================================================
          BOTTOM WAVE
      ===================================================== */}

      <div className="bottom-wave"></div>

    </div>
  );
}

export default Home;