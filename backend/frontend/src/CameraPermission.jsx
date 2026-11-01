
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CameraPermission.css";

function CameraPermission() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const [cameraStatus, setCameraStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestCamera = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    setCameraStatus("checking");
    setErrorMessage("");

    // Release any previous stream before requesting another one.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser. Use a supported browser over HTTPS or localhost."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      // Release the stream if this request is no longer active.
      if (
        !mountedRef.current ||
        currentRequestId !== requestIdRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        stopCamera();
        setCameraStatus("error");
        setErrorMessage("The camera preview could not be initialized.");
        return;
      }

      video.srcObject = stream;

      // Wait for the browser to load the video metadata.
      if (video.readyState < 1) {
        await new Promise((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error("Camera preview timed out. Please retry."));
          }, 10000);

          const onLoaded = () => {
            cleanup();
            resolve();
          };

          const onError = () => {
            cleanup();
            reject(new Error("Unable to display the camera preview."));
          };

          function cleanup() {
            window.clearTimeout(timeoutId);
            video.removeEventListener("loadedmetadata", onLoaded);
            video.removeEventListener("error", onError);
          }

          video.addEventListener("loadedmetadata", onLoaded, {
            once: true,
          });

          video.addEventListener("error", onError, {
            once: true,
          });
        });
      }

      if (
        !mountedRef.current ||
        currentRequestId !== requestIdRef.current
      ) {
        return;
      }

      await video.play();

      if (
        !mountedRef.current ||
        currentRequestId !== requestIdRef.current
      ) {
        return;
      }

      setCameraStatus("granted");
    } catch (error) {
      console.error("Camera permission error:", error);

      // Ignore errors from requests that are no longer active.
      if (
        !mountedRef.current ||
        currentRequestId !== requestIdRef.current
      ) {
        return;
      }

      stopCamera();

      setCameraStatus("error");

      if (error.name === "NotAllowedError") {
        setErrorMessage(
          "Camera permission was denied. Allow camera access in your browser settings and try again."
        );
      } else if (error.name === "NotFoundError") {
        setErrorMessage(
          "No camera was found on this device. Connect or enable a camera."
        );
      } else if (error.name === "NotReadableError") {
        setErrorMessage(
          "The camera may be in use by another application. Close other camera apps and retry."
        );
      } else {
        setErrorMessage(
          error.message ||
            "Unable to access the camera. Check your camera settings and retry."
        );
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    requestCamera();

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [requestCamera, stopCamera]);

  const handleContinue = () => {
    if (cameraStatus !== "granted") {
      return;
    }

    // The assessment page manages its own camera stream.
    stopCamera();
    navigate("/test");
  };

  const handleBack = () => {
    stopCamera();
    navigate("/assessment-check");
  };

  const handleRetry = () => {
    requestCamera();
  };

  const getUserName = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.full_name || user.name || "Student";
    } catch {
      return "Student";
    }
  };

  const getInitial = () => {
    return getUserName().charAt(0).toUpperCase() || "S";
  };

  const cameraReady = cameraStatus === "granted";

  return (
    <div className="camera-page">
      {/* SIDEBAR */}
      <aside className="camera-sidebar">
        <div className="camera-logo">
          Electro<span>Hire</span>
        </div>

        <nav className="camera-nav">
          <button
            className="camera-nav-item"
            onClick={() => navigate("/dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/my-profile")}
          >
            <span className="nav-icon">👤</span>
            <span>My Profile</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/skills")}
          >
            <span className="nav-icon">⚡</span>
            <span>Skills</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/projects")}
          >
            <span className="nav-icon">📁</span>
            <span>Projects</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/certificates")}
          >
            <span className="nav-icon">🏆</span>
            <span>Certificates</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/resume")}
          >
            <span className="nav-icon">📄</span>
            <span>Resume</span>
          </button>

          <button
            className="camera-nav-item active"
            onClick={() => navigate("/assessment")}
          >
            <span className="nav-icon">📝</span>
            <span>Assessment</span>
          </button>

          <div className="camera-divider" />

          <button
            className="camera-nav-item"
            onClick={() => navigate("/find-jobs")}
          >
            <span className="nav-icon">💼</span>
            <span>Find Jobs</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/applications")}
          >
            <span className="nav-icon">📋</span>
            <span>Applications</span>
          </button>

          <button
            className="camera-nav-item"
            onClick={() => navigate("/settings")}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>
        </nav>

        <button
          className="camera-logout"
          onClick={() => {
            stopCamera();
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            navigate("/login");
          }}
        >
          <span>↪</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN */}
      <main className="camera-main">
        <header className="camera-topbar">
          <div className="camera-heading">
            <h1>Camera Permission</h1>
            <p>
              Prepare your camera before starting the assessment.
            </p>
          </div>

          <div className="camera-user">
            <div className="camera-user-avatar">
              {getInitial()}
            </div>

            <div className="camera-user-details">
              <strong>{getUserName()}</strong>
              <span>AI Skill Assessment</span>
            </div>
          </div>
        </header>

        <section className="camera-content">
          <div className="camera-step">STEP 2 OF 4</div>

          <div className="camera-title-section">
            <div className="camera-large-icon">📷</div>

            <div className="camera-badge">
              AI Camera Monitoring
            </div>

            <h2>
              Enable Your <span>Camera</span>
            </h2>

            <p>
              Allow camera access before beginning your assessment.
              Camera monitoring features will run during the test
              when the assessment monitoring service is connected.
            </p>
          </div>

          {/* CAMERA CARD */}
          <div className="camera-card">
            <div className="camera-preview">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{
                  display: cameraReady ? "block" : "none",
                }}
              />

              {!cameraReady && (
                <div className="camera-placeholder">
                  <div className="camera-placeholder-icon">
                    📷
                  </div>

                  {cameraStatus === "checking" && (
                    <>
                      <h3>Checking Camera...</h3>
                      <p>
                        Please allow camera access when prompted.
                      </p>
                    </>
                  )}

                  {cameraStatus === "error" && (
                    <>
                      <h3>Camera Unavailable</h3>
                      <p>{errorMessage}</p>
                    </>
                  )}
                </div>
              )}

              {cameraReady && (
                <div className="camera-live-badge">
                  <span className="live-dot" />
                  Camera Ready
                </div>
              )}
            </div>

            {/* STATUS */}
            <div className="camera-status-section">
              <div className="camera-status-row">
                <div className="status-icon">
                  {cameraReady
                    ? "✓"
                    : cameraStatus === "checking"
                    ? "..."
                    : "!"}
                </div>

                <div className="status-text">
                  <strong>
                    {cameraReady
                      ? "Camera Access Granted"
                      : cameraStatus === "checking"
                      ? "Requesting Camera Access"
                      : "Camera Access Required"}
                  </strong>

                  <span>
                    {cameraReady
                      ? "The live camera preview is ready."
                      : cameraStatus === "checking"
                      ? "Waiting for camera permission and video."
                      : errorMessage}
                  </span>
                </div>
              </div>

              {cameraStatus === "error" && (
                <button
                  className="retry-camera-button"
                  onClick={handleRetry}
                >
                  Try Again
                </button>
              )}
            </div>
          </div>

          {/* INFORMATION */}
          <div className="camera-info-grid">
            <div className="camera-info-card">
              <div className="camera-info-icon">🔒</div>
              <div>
                <h3>Privacy</h3>
                <p>
                  Camera access is used for the assessment monitoring
                  process. Review the assessment privacy notice for
                  details about how camera data is processed and retained.
                </p>
              </div>
            </div>

            <div className="camera-info-card">
              <div className="camera-info-icon">👁</div>
              <div>
                <h3>Monitoring</h3>
                <p>
                  Keep the camera enabled throughout the assessment
                  if camera monitoring is required.
                </p>
              </div>
            </div>

            <div className="camera-info-card">
              <div className="camera-info-icon">💡</div>
              <div>
                <h3>Environment</h3>
                <p>
                  Sit in a well-lit environment with your face
                  clearly visible.
                </p>
              </div>
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div className="camera-instructions">
            <h3>Before You Start</h3>

            <div className="instruction-list">
              <div className="instruction-item">
                <span>1</span>
                <p>Make sure your face is clearly visible.</p>
              </div>

              <div className="instruction-item">
                <span>2</span>
                <p>Sit in a well-lit environment.</p>
              </div>

              <div className="instruction-item">
                <span>3</span>
                <p>
                  Keep your phone away during the assessment if
                  required by the assessment rules.
                </p>
              </div>

              <div className="instruction-item">
                <span>4</span>
                <p>
                  Review the camera monitoring and privacy notice
                  before continuing.
                </p>
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="camera-actions">
            <button
              className="camera-back-button"
              onClick={handleBack}
            >
              ← Back
            </button>

            <button
              className="camera-continue-button"
              onClick={handleContinue}
              disabled={!cameraReady}
            >
              Continue to Assessment
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CameraPermission;
