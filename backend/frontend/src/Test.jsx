
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Test.css";

const API_URL = "http://localhost:8000";
const PROCTOR_ENDPOINT = `${API_URL}/api/proctor/frame`;
const PROCTOR_INTERVAL = 1500;
const TEST_DURATION = 15 * 60;
const TOTAL_QUESTIONS = 15;

function getUserId() {
  const keys = ["user_id", "id", "userId", "student_id"];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value && Number.isInteger(Number(value)) && Number(value) > 0) {
      localStorage.setItem("user_id", value);
      return Number(value);
    }
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const id = user?.user_id ?? user?.id ?? user?.userId ?? user?.student_id;

    if (id && Number.isInteger(Number(id)) && Number(id) > 0) {
      localStorage.setItem("user_id", String(id));
      return Number(id);
    }
  } catch (error) {
    console.error("Unable to read saved user:", error);
  }

  return null;
}

function normalizeQuestion(question, index) {
  let options = [];

  if (Array.isArray(question.options)) {
    options = question.options.map((option, i) => ({
      label:
        typeof option === "string"
          ? String.fromCharCode(65 + i)
          : option.label ?? option.option_label ?? String.fromCharCode(65 + i),
      text:
        typeof option === "string"
          ? option
          : option.text ?? option.option_text ?? option.value ?? "",
    }));
  } else {
    options = ["A", "B", "C", "D"]
      .map((letter) => ({
        label: letter,
        text:
          question[`option_${letter.toLowerCase()}`] ??
          question[`option${letter}`] ??
          question[letter] ??
          "",
      }))
      .filter((option) => option.text !== "");
  }

  return {
    ...question,
    question_id: question.question_id ?? question.id ?? question.questionId ?? index + 1,
    question_text:
      question.question_text ??
      question.question ??
      question.text ??
      question.title ??
      `Question ${index + 1}`,
    options,
  };
}

function formatTime(seconds) {
  const value = Math.max(0, seconds);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(
    value % 60
  ).padStart(2, "0")}`;
}

function Test() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const proctorTimerRef = useRef(null);
  const sendingFrameRef = useRef(false);
  const submissionStarted = useRef(false);
  const startTimeRef = useRef(Date.now());
  const answersRef = useRef({});
  const mountedRef = useRef(true);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [cameraStatus, setCameraStatus] = useState("checking");
  const [warning, setWarning] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(
    Boolean(document.fullscreenElement)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proctoring response state
  const [proctorStatus, setProctorStatus] = useState("waiting");
  const [proctorWarnings, setProctorWarnings] = useState([]);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [gazeDirections, setGazeDirections] = useState([]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const stopCamera = useCallback(() => {
    if (proctorTimerRef.current) {
      clearInterval(proctorTimerRef.current);
      proctorTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    sendingFrameRef.current = false;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraStatus("checking");
      setProctorStatus("waiting");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access requires localhost or HTTPS.");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraStatus("granted");
      setWarning("");
    } catch (error) {
      console.error("Camera access failed:", error);

      if (mountedRef.current) {
        setCameraStatus("denied");
        setProctorStatus("unavailable");
        setWarning(
          error.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser."
            : error.message || "Unable to start the camera."
        );
      }
    }
  }, []);

  // The video element is conditionally rendered, so attach the stream
  // after React has rendered it.
  useEffect(() => {
    if (cameraStatus !== "granted" || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch((error) => {
      console.warn("Camera preview could not autoplay:", error);
    });
  }, [cameraStatus]);

  const enterFullScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Full-screen request failed:", error);
      setWarning("Full-screen mode could not be enabled. Please try again.");
    }
  }, []);

  // Load assessment questions using your existing endpoint.
  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(
          `${API_URL}/api/assessment/questions?limit=${TOTAL_QUESTIONS}`
        );

        if (!response.ok) {
          throw new Error(`Unable to load questions (${response.status}).`);
        }

        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : data.questions ?? data.data ?? data.results ?? [];

        if (!Array.isArray(list) || list.length === 0) {
          throw new Error("The backend returned no assessment questions.");
        }

        const normalized = list
          .slice(0, TOTAL_QUESTIONS)
          .map(normalizeQuestion);

        if (!cancelled) {
          setQuestions(normalized);
        }
      } catch (error) {
        console.error("Question loading failed:", error);
        if (!cancelled) {
          setLoadError(error.message || "Unable to load assessment questions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Assessment setup and existing browser security listeners.
  useEffect(() => {
    mountedRef.current = true;

    if (!getUserId()) {
      navigate("/login");
      return undefined;
    }

    startTimeRef.current = Date.now();
    enterFullScreen();
    startCamera();

    const preventDefault = (event) => event.preventDefault();

    const handleVisibilityChange = () => {
      if (document.hidden && !submissionStarted.current) {
        setWarning("Warning: You switched away from the assessment tab.");
      }
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullScreen(active);

      if (!active && !submissionStarted.current) {
        setWarning("Warning: Full-screen mode was exited.");
      }
    };

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (
        (event.ctrlKey && ["c", "v", "x", "u", "s", "p"].includes(key)) ||
        key === "printscreen"
      ) {
        event.preventDefault();
        setWarning("Copying and restricted keyboard shortcuts are disabled.");
      }
    };

    document.addEventListener("contextmenu", preventDefault);
    document.addEventListener("copy", preventDefault);
    document.addEventListener("cut", preventDefault);
    document.addEventListener("paste", preventDefault);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", preventDefault);
      document.removeEventListener("copy", preventDefault);
      document.removeEventListener("cut", preventDefault);
      document.removeEventListener("paste", preventDefault);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);

      mountedRef.current = false;
      stopCamera();
    };
  }, [navigate, startCamera, enterFullScreen, stopCamera]);

  // Send browser camera frames to FastAPI. The backend must accept
  // POST /api/proctor/frame with JSON { image: "<base64 JPEG>" }.
  useEffect(() => {
    if (cameraStatus !== "granted") return undefined;

    let cancelled = false;

    async function sendFrame() {
      const video = videoRef.current;

      if (
        cancelled ||
        submissionStarted.current ||
        sendingFrameRef.current ||
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      sendingFrameRef.current = true;

      try {
        let canvas = canvasRef.current;

        if (!canvas) {
          canvas = document.createElement("canvas");
          canvasRef.current = canvas;
        }

        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Unable to capture camera frame.");

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Image = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        if (!base64Image) throw new Error("Unable to encode camera frame.");

        const response = await fetch(PROCTOR_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
          throw new Error(`Proctoring endpoint returned HTTP ${response.status}.`);
        }

        const result = await response.json();

        if (cancelled || !mountedRef.current) return;

        setProctorStatus("active");

        const phone = Boolean(result.phone_detected ?? result.phoneDetected ?? false);
        const faces = Number(result.face_count ?? result.faceCount ?? 0);
        const gaze =
          result.gaze_directions ?? result.gazeDirections ?? result.gaze ?? [];
        const warnings = Array.isArray(result.warnings)
          ? result.warnings
          : result.warnings
            ? [String(result.warnings)]
            : [];

        setPhoneDetected(phone);
        setFaceCount(faces);
        setGazeDirections(
          Array.isArray(gaze) ? gaze.map(String) : gaze ? [String(gaze)] : []
        );
        setProctorWarnings(warnings);

        if (phone) {
          setWarning("AI proctoring detected a possible phone. Please keep your phone away.");
        } else if (
          (result.face_count !== undefined || result.faceCount !== undefined) &&
          faces === 0
        ) {
          setWarning("No face detected. Please sit in front of the camera.");
        } else if (warnings.length) {
          setWarning(warnings.join(" "));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Proctoring request failed:", error);
          setProctorStatus("error");
        }
      } finally {
        sendingFrameRef.current = false;
      }
    }

    sendFrame();
    proctorTimerRef.current = setInterval(sendFrame, PROCTOR_INTERVAL);

    return () => {
      cancelled = true;
      if (proctorTimerRef.current) {
        clearInterval(proctorTimerRef.current);
        proctorTimerRef.current = null;
      }
    };
  }, [cameraStatus]);

  // Countdown and automatic submission.
  useEffect(() => {
    if (loading || loadError || questions.length === 0) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          if (!submissionStarted.current) {
            submitTestRef.current?.(true);
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, loadError, questions.length]);

  const submitTestRef = useRef(null);

  const handleAnswer = (questionId, optionLabel) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionLabel,
    }));
  };

  const goToNextQuestion = () => {
    setCurrentQuestion((previous) => Math.min(previous + 1, questions.length - 1));
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestion((previous) => Math.max(previous - 1, 0));
  };

  const submitTest = async (automatic = false) => {
    if (submissionStarted.current) return;

    if (!automatic) setShowSubmit(false);

    submissionStarted.current = true;
    setIsSubmitting(true);

    if (proctorTimerRef.current) {
      clearInterval(proctorTimerRef.current);
      proctorTimerRef.current = null;
    }

    const userId = getUserId();

    if (!userId) {
      submissionStarted.current = false;
      setIsSubmitting(false);
      setWarning("Your login session was not found. Please log in again.");
      navigate("/login");
      return;
    }

    const submittedAnswers = { ...answersRef.current };
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - startTimeRef.current) / 1000)
    );

    const payload = {
      user_id: userId,
      answers: submittedAnswers,
      questions: questions.map((question) => ({
        question_id: question.question_id,
        question_text: question.question_text,
        options: question.options,
        selected_answer: submittedAnswers[question.question_id] ?? null,
      })),
      time_taken: elapsedSeconds,
      skill_name: "General Assessment",
    };

    try {
      const response = await fetch(`${API_URL}/api/assessments/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseData.detail ??
          responseData.message ??
          `Submission failed (${response.status}).`
        );
      }

      sessionStorage.setItem(
        "assessmentResult",
        JSON.stringify({
          ...responseData,
          assessment_id:
            responseData.assessment_id ?? responseData.id ?? responseData.assessmentId,
          user_id: userId,
          answers: submittedAnswers,
          time_taken: elapsedSeconds,
          questions,
        })
      );

      stopCamera();

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (error) {
          console.warn("Could not exit full screen:", error);
        }
      }

      navigate("/assessment-result");
    } catch (error) {
      console.error("Assessment submission failed:", error);
      setWarning(`Could not submit the assessment: ${error.message}`);
      submissionStarted.current = false;
      setIsSubmitting(false);
    }
  };

  // Keep the timer's callback pointed at the latest submit function.
  submitTestRef.current = submitTest;

  const current = questions[currentQuestion];

  const answeredCount = questions.filter(
    (question) =>
      answers[question.question_id] !== undefined &&
      answers[question.question_id] !== ""
  ).length;

  if (loading) {
    return (
      <div className="test-page">
        <div className="test-main">
          <div className="test-loading">Loading assessment questions...</div>
        </div>
      </div>
    );
  }

  if (loadError || !current) {
    return (
      <div className="test-page">
        <div className="test-main">
          <div className="test-loading">
            <h2>Unable to Load Assessment</h2>
            <p>{loadError || "No assessment questions are available."}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-page">
      <header className="test-header">
        <div className="test-brand">
          <span className="brand-electro">Electro</span>
          <span className="brand-hire">Hire</span>
        </div>

        <div className="test-title">
          <strong>Assessment Test</strong>
          <span>Question {currentQuestion + 1} of {questions.length}</span>
        </div>

        <div className="test-security">
          <span className="security-dot" />
          Secure Assessment
        </div>
      </header>

      {warning && (
        <div className="test-warning" role="alert">
          <span>{warning}</span>
          <button
            type="button"
            aria-label="Dismiss warning"
            onClick={() => setWarning("")}
          >
            ×
          </button>
        </div>
      )}

      <main className="test-main">
        <section className="question-section">
          <div className="question-top">
            <div>
              <div className="question-number">
                Question {currentQuestion + 1} / {questions.length}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className={`timer ${timeLeft <= 60 ? "timer-danger" : ""}`}>
              <span>◷</span>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="question-card">
            <div className="question-meta">
              <span>Question {currentQuestion + 1}</span>
              <span>
                {answers[current.question_id] !== undefined
                  ? "Answered"
                  : "Choose one answer"}
              </span>
            </div>

            <h1>{current.question_text}</h1>

            <div className="options">
              {current.options.map((option, index) => {
                const label = option.label || String.fromCharCode(65 + index);
                const selected = answers[current.question_id] === label;

                return (
                  <button
                    type="button"
                    key={`${current.question_id}-${label}`}
                    className={`option ${selected ? "selected" : ""}`}
                    onClick={() => handleAnswer(current.question_id, label)}
                  >
                    <span className="option-letter">{label}</span>
                    <span className="option-text">{option.text}</span>
                    {selected && <span className="selected-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="question-navigation">
            <button
              type="button"
              className="previous-btn"
              onClick={goToPreviousQuestion}
              disabled={currentQuestion === 0}
            >
              ← Previous
            </button>

            <span className="answered-count">
              {answeredCount} of {questions.length} answered
            </span>

            {currentQuestion < questions.length - 1 ? (
              <button type="button" className="next-btn" onClick={goToNextQuestion}>
                Save &amp; Next →
              </button>
            ) : (
              <button
                type="button"
                className="submit-btn"
                onClick={() => setShowSubmit(true)}
                disabled={isSubmitting}
              >
                Finish Test
              </button>
            )}
          </div>
        </section>

        <aside className="test-side">
          <section className="camera-card">
            <div className="camera-header">
              <span>Live Camera Monitoring</span>
              <span className="camera-live"><span /> LIVE</span>
            </div>

            <div className="camera-box">
              {cameraStatus === "granted" ? (
                <video ref={videoRef} autoPlay muted playsInline />
              ) : (
                <div className="camera-message">
                  {cameraStatus === "checking"
                    ? "Starting camera..."
                    : "Camera access is required."}
                </div>
              )}
            </div>

            {cameraStatus === "granted" ? (
              <div className="camera-status">
                <span className="status-check">✓</span>
                Camera permission granted
              </div>
            ) : (
              <button type="button" className="camera-retry" onClick={startCamera}>
                Enable / Retry Camera
              </button>
            )}

            {/* Proctoring results added inside the existing camera card. */}
            <div className="proctor-status">
              <div className="proctor-status-heading">
                <strong>AI Proctoring</strong>
                <span className={`proctor-indicator ${proctorStatus}`}>
                  {proctorStatus === "active"
                    ? "Connected"
                    : proctorStatus === "error"
                      ? "Connection error"
                      : proctorStatus === "unavailable"
                        ? "Unavailable"
                        : "Connecting"}
                </span>
              </div>

              <p>Phone detected: <strong>{phoneDetected ? "Yes" : "No"}</strong></p>
              <p>Faces detected: <strong>{faceCount}</strong></p>
              <p>
                Gaze direction:{" "}
                <strong>
                  {gazeDirections.length ? gazeDirections.join(", ") : "Not available"}
                </strong>
              </p>

              {proctorWarnings.length > 0 && (
                <ul>
                  {proctorWarnings.map((item, index) => (
                    <li key={`${index}-${item}`}>{String(item)}</li>
                  ))}
                </ul>
              )}

              {proctorStatus === "error" && (
                <p className="proctor-error">
                  The proctoring request failed. Check the backend and browser Network tab.
                </p>
              )}
            </div>
          </section>

          <section className="navigator-card">
            <h3>Question Navigator</h3>

            <div className="question-grid">
              {questions.map((question, index) => {
                const answered = answers[question.question_id] !== undefined;

                return (
                  <button
                    type="button"
                    key={question.question_id}
                    className={[
                      "question-number-btn",
                      index === currentQuestion ? "active" : "",
                      answered ? "answered" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setCurrentQuestion(index)}
                    aria-label={`Go to question ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="navigator-legend">
              <span><i className="legend-current" /> Current question</span>
              <span><i className="legend-answered" /> Answered</span>
              <span><i className="legend-unanswered" /> Not answered</span>
            </div>
          </section>

          <section className="security-card">
            <h3>Assessment Rules</h3>
            <p>• Keep your face visible to the camera.</p>
            <p>• Do not use a phone during the test.</p>
            <p>• Avoid switching tabs or exiting full-screen mode.</p>
            <p>• Your answers are submitted when you finish or time runs out.</p>
          </section>

          <button
            type="button"
            className="submit-btn sidebar-submit"
            onClick={() => setShowSubmit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Assessment"}
          </button>
        </aside>
      </main>

      {showSubmit && (
        <div className="modal-overlay">
          <div className="submit-modal" role="dialog" aria-modal="true">
            <div className="modal-icon">?</div>
            <h2>Submit Assessment?</h2>
            <p>
              You have answered {answeredCount} out of {questions.length} questions.
            </p>
            {answeredCount < questions.length && (
              <p className="unanswered-warning">
                Some questions are unanswered. You can return to the test or submit now.
              </p>
            )}

            <div className="modal-buttons">
              <button
                type="button"
                className="cancel-submit"
                onClick={() => setShowSubmit(false)}
                disabled={isSubmitting}
              >
                Continue Test
              </button>
              <button
                type="button"
                className="confirm-submit"
                onClick={() => submitTest(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isFullScreen && (
        <div className="fullscreen-overlay">
          <div className="fullscreen-box">
            <div className="fullscreen-icon">⛶</div>
            <h2>Full-Screen Mode Required</h2>
            <p>Return to full-screen mode to continue your assessment.</p>
            <button type="button" onClick={enterFullScreen}>
              Return to Full Screen
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />
    </div>
  );
}

export default Test;
