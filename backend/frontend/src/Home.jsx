import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

/*
  Animated particle background.
  This uses Canvas directly, so no extra library is required.
*/

function ParticleUniverse() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return undefined;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let particles = [];
    let resizeObserver;
    let resizeHandler;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Create particles
    const createParticles = () => {
      const count = Math.min(
        1250,
        Math.max(520, Math.floor((width * height) / 1000))
      );

      particles = Array.from({ length: count }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: Math.pow(Math.random(), 0.72),
        orbit: 0.28 + Math.random() * 0.9,
        size:
          Math.random() < 0.12
            ? 1.7 + Math.random() * 1.8
            : 0.5 + Math.random() * 1.15,
        alpha: 0.42 + Math.random() * 0.58,
        speed: (Math.random() - 0.5) * 0.00007,
        phase: Math.random() * Math.PI * 2,
        tint: Math.random(),
      }));
    };

    // Resize canvas according to the hero section
    const resizeCanvas = () => {
      const rect =
        canvas.parentElement?.getBoundingClientRect() ||
        canvas.getBoundingClientRect();

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      createParticles();
    };

    // Draw the particles
    const paintFrame = (time = 0) => {
      context.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const centerY = height * 0.56;
      const glowRadius = Math.min(width, height) * 0.65;

      // Central blue glow
      const glow = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        glowRadius
      );

      glow.addColorStop(0, "rgba(70, 142, 255, 0.28)");
      glow.addColorStop(0.38, "rgba(38, 105, 207, 0.14)");
      glow.addColorStop(1, "rgba(7, 21, 47, 0)");

      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      // Draw individual particles
      particles.forEach((particle) => {
        const angle =
          particle.angle +
          (reduceMotion ? 0 : time * particle.speed);

        const spreadX =
          width * 0.39 * particle.radius * particle.orbit;

        const spreadY =
          height * 0.46 * particle.radius * particle.orbit;

        const x = centerX + Math.cos(angle) * spreadX;
        const y = centerY + Math.sin(angle) * spreadY;

        const twinkle = reduceMotion
          ? 0.82
          : 0.62 +
            0.38 *
              Math.sin(time * 0.0014 + particle.phase);

        const alpha = particle.alpha * twinkle;

        const color =
          particle.tint > 0.88
            ? `rgba(255, 190, 151, ${alpha})`
            : particle.tint > 0.53
              ? `rgba(151, 201, 255, ${alpha})`
              : `rgba(235, 244, 255, ${alpha})`;

        context.beginPath();
        context.fillStyle = color;
        context.shadowBlur = particle.size > 1.6 ? 17 : 8;
        context.shadowColor = color;

        context.arc(
          x,
          y,
          particle.size,
          0,
          Math.PI * 2
        );

        context.fill();
      });

      context.shadowBlur = 0;
    };

    // Continuous animation
    const animate = (time) => {
      paintFrame(time);
      animationFrame = window.requestAnimationFrame(animate);
    };

    resizeCanvas();

    if (reduceMotion) {
      paintFrame(0);
    } else {
      animationFrame = window.requestAnimationFrame(animate);
    }

    // Handle screen resizing
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();

        if (reduceMotion) {
          paintFrame(0);
        }
      });

      resizeObserver.observe(canvas.parentElement || canvas);
    } else {
      resizeHandler = () => {
        resizeCanvas();

        if (reduceMotion) {
          paintFrame(0);
        }
      };

      window.addEventListener("resize", resizeHandler);
    }

    // Cleanup animation
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();

      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
    };
  }, []);

  return (
    <canvas
      className="particle-canvas"
      ref={canvasRef}
      aria-hidden="true"
    />
  );
}


// =====================================================
// MAIN HOME COMPONENT
// =====================================================

function Home() {
  const navigate = useNavigate();

  // Smooth scrolling for Features and About
  const scrollToSection = (event, id) => {
    event.preventDefault();

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <div className="electro-home" id="home">

      {/* ================= NAVBAR ================= */}

      <nav
        className="home-navbar"
        aria-label="Main navigation"
      >

        {/* LOGO */}

        <button
          className="home-logo"
          onClick={() => navigate("/")}
          aria-label="ElectroHire home"
        >
          <span>
            Electro<span className="logo-blue">Hire</span>
          </span>
        </button>


        {/* NAVIGATION */}

        <div className="home-nav">

          <a
            href="#home"
            className="active"
            onClick={(event) => {
              event.preventDefault();

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            Home
          </a>

          <a
            href="#features"
            onClick={(event) =>
              scrollToSection(event, "features")
            }
          >
            Features
          </a>

          <a
            href="#about"
            onClick={(event) =>
              scrollToSection(event, "about")
            }
          >
            About
          </a>

        </div>


        {/* LOGIN AND REGISTER BUTTONS */}

        <div className="nav-actions">

          <button
            className="login-btn"
            onClick={() => navigate("/login")}
          >
            Log in
          </button>

          <button
            className="get-started-btn"
            onClick={() => navigate("/register")}
          >
            Get Started
            <span aria-hidden="true">↗</span>
          </button>

        </div>

      </nav>


      {/* ================= HERO SECTION ================= */}

      <main className="hero-section">

        {/* ANIMATED PARTICLE BACKGROUND */}

        <ParticleUniverse />


        {/* HERO CONTENT */}

        <div className="hero-copy">

          <div className="eyebrow">

            <span className="eyebrow-dot"></span>

            INTELLIGENT CAREER PLATFORM

          </div>


          <h1>
            Your potential.
            <br />

            <span>Your next opportunity.</span>
          </h1>


          <p className="hero-description">

            Meet ElectroHire — where electronics and technology
            talent connects with smarter opportunities through
            AI-powered skill insights and intelligent recruitment.

          </p>


          {/* HERO BUTTONS */}

          <div className="hero-buttons">

            <button
              className="journey-btn"
              onClick={() => navigate("/register")}
            >
              Get started
              <span aria-hidden="true">→</span>
            </button>


            <button
              className="demo-btn"
              onClick={() => navigate("/login")}
            >
              Log in to ElectroHire
              <span aria-hidden="true">↗</span>
            </button>

          </div>


          <div className="hero-note">

            <span className="note-sparkle">✦</span>

            Built for emerging electronics and technology talent

          </div>

        </div>


        {/* SIDE LABELS */}

        <div
          className="universe-label universe-label-left"
          aria-hidden="true"
        >
          <span className="label-line"></span>
          TALENT
        </div>


        <div
          className="universe-label universe-label-right"
          aria-hidden="true"
        >
          OPPORTUNITY
          <span className="label-line"></span>
        </div>


        {/* SCROLL BUTTON */}

        <a
          className="scroll-cue"
          href="#features"
          onClick={(event) =>
            scrollToSection(event, "features")
          }
        >
          <span className="scroll-cue-line"></span>
          Explore ElectroHire
        </a>

      </main>


      {/* ================= FEATURES ================= */}

      <section
        className="feature-strip"
        id="features"
      >

        <div className="feature-heading">

          <span>THE ELECTROHIRE EXPERIENCE</span>

          <h2>
            More than a profile. A path forward.
          </h2>

        </div>


        <div className="feature-grid">


          {/* FEATURE 1 */}

          <article className="feature-card">

            <span className="feature-number">01</span>

            <div className="feature-symbol">⌘</div>

            <h3>Showcase your talent</h3>

            <p>
              Bring your skills, projects, certificates and
              resume together in one professional profile.
            </p>

          </article>


          {/* FEATURE 2 */}

          <article className="feature-card">

            <span className="feature-number">02</span>

            <div className="feature-symbol">✳</div>

            <h3>Understand your skills</h3>

            <p>
              Use assessments and skill insights to understand
              strengths and identify areas to improve.
            </p>

          </article>


          {/* FEATURE 3 */}

          <article className="feature-card">

            <span className="feature-number">03</span>

            <div className="feature-symbol">↗</div>

            <h3>Find your opportunity</h3>

            <p>
              Explore relevant roles and help recruiters
              discover candidates with suitable skills.
            </p>

          </article>

        </div>

      </section>


      {/* ================= ABOUT ================= */}

      <section
        className="about-section"
        id="about"
      >

        <div
          className="about-orb"
          aria-hidden="true"
        >
          E
        </div>


        <div>

          <span className="section-kicker">
            A SMARTER WAY TO MOVE FORWARD
          </span>

          <h2>
            Make your next move
            <br />

            <span>with confidence.</span>
          </h2>

          <p>
            ElectroHire brings student portfolios, skill
            assessment and recruitment into one connected
            experience.
          </p>

        </div>


        <button
          className="about-cta"
          onClick={() => navigate("/register")}
        >
          Start your journey
          <span aria-hidden="true">→</span>
        </button>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="home-footer">

        <div className="footer-brand">
          Electro<span className="logo-blue">Hire</span>
        </div>

        <span>
          Connecting talent with opportunity.
        </span>

      </footer>

    </div>
  );
}

export default Home;