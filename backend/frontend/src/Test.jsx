import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Test.css";

const API_URL = "http://localhost:8000";

function Test() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const submissionStarted = useRef(false);
  const startTimeRef = useRef(Date.now());

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [cameraStatus, setCameraStatus] = useState("checking");
  const [warning, setWarning] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(Boolean(document.fullscreenElement));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUserId = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const id =
        user.user_id ??
        user.id ??
        user.userId ??
        user.student_id ??
        localStorage.getItem("user_id");

      if (id === null || id === undefined || id === "") return null;

      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) return null;

      localStorage.setItem("user_id", String(numericId));
      return numericId;
    } catch (error) {
      console.error("Could not read user information:", error);
      return null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      setCameraStatus("checking");

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraStatus("granted");
    } catch (error) {
      console.error("Camera error:", error);
      setCameraStatus("denied");
    }
  }, []);

  const enterFullScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen error:", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadQuestions = async () => {
      setQuestionsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/assessment/questions?limit=15`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.detail || `Unable to load questions (${response.status}).`);
        }
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error("No assessment questions were returned by the backend.");
        }
        const normalizedQuestions = data.questions.map((q) => ({
          id: Number(q.question_id ?? q.id),
          question_id: Number(q.question_id ?? q.id),
          question: String(q.question_text ?? q.question ?? ""),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          skill: String(q.skill ?? q.skill_name ?? "General Assessment"),
        }));
        if (normalizedQuestions.some((q) => !Number.isInteger(q.id) || !q.question || q.options.length < 2)) {
          throw new Error("The database returned a question with a missing ID, text, or answer options.");
        }
        if (!cancelled) {
          setQuestions(normalizedQuestions);
          setWarning("");
        }
      } catch (error) {
        console.error("Question loading failed:", error);
        if (!cancelled) setWarning(`Could not load assessment questions: ${error.message}`);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    };

    loadQuestions();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!getUserId()) {
      navigate("/login");
      return undefined;
    }

    enterFullScreen();
    startCamera();

    const preventContextMenu = (event) => event.preventDefault();

    const preventCopy = (event) => {
      event.preventDefault();
      setWarning("Copying is disabled during the assessment.");
    };

    const preventPaste = (event) => {
      event.preventDefault();
      setWarning("Pasting is disabled during the assessment.");
    };

    const preventCut = (event) => {
      event.preventDefault();
      setWarning("Cutting is disabled during the assessment.");
    };

    const preventShortcuts = (event) => {
      const key = event.key.toLowerCase();

      if (
        (event.ctrlKey || event.metaKey) &&
        ["c", "v", "x", "a", "s", "p", "u"].includes(key)
      ) {
        event.preventDefault();
        setWarning("This keyboard shortcut is disabled during the assessment.");
      }

      if (
        key === "f12" ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))
      ) {
        event.preventDefault();
        setWarning("Developer tools shortcuts are disabled during the assessment.");
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        setWarning("Warning: You left the assessment window. Please return.");
      }
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullScreen(active);

      if (!active) {
        setWarning("Warning: Full-screen mode was exited.");
      }
    };

    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("paste", preventPaste);
    document.addEventListener("cut", preventCut);
    document.addEventListener("keydown", preventShortcuts);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("paste", preventPaste);
      document.removeEventListener("cut", preventCut);
      document.removeEventListener("keydown", preventShortcuts);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [navigate, getUserId, enterFullScreen, startCamera]);

  const submitTest = useCallback(async () => {
    if (submissionStarted.current) return;
    if (questions.length === 0) {
      setWarning("Assessment questions are not loaded. Please refresh the page and try again.");
      return;
    }

    const userId = getUserId();

    if (!userId) {
      setWarning("Your login information is missing. Please log in again.");
      return;
    }

    submissionStarted.current = true;
    setIsSubmitting(true);
    setWarning("");

    try {
      const timeTaken = Math.max(
        0,
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );

      // The backend receives answer letters A-D, not the displayed option text.
      const questionsPayload = questions.map((question) => {
        const selectedText = answers[question.id] ?? null;
        const selectedIndex = question.options.indexOf(selectedText);

        return {
          id: question.id,
          question_id: question.id,
          question_text: question.question,
          options: question.options,
          skill: question.skill,
          skill_name: question.skill,
          selected_answer:
            selectedIndex >= 0
              ? String.fromCharCode(65 + selectedIndex)
              : null,
        };
      });

      const answersPayload = Object.fromEntries(
        questionsPayload.map((question) => [
          String(question.question_id),
          question.selected_answer,
        ])
      );

      const response = await fetch(`${API_URL}/api/assessments/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          answers: answersPayload,
          questions: questionsPayload,
          time_taken: timeTaken,
          skill_name: "General Assessment",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || data);
        throw new Error(detail || `Assessment save failed (${response.status}).`);
      }

      if (!data.assessment_id) {
        throw new Error(
          "The backend did not return assessment_id. Check the API response."
        );
      }

      sessionStorage.setItem("assessmentResult", JSON.stringify(data));

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      setShowSubmit(false);
      navigate("/assessment-result");
    } catch (error) {
      console.error("Assessment submission failed:", error);
      setWarning(
        `${error.message || "Unknown error"} Your answers were not confirmed as saved. You can try again.`
      );
      submissionStarted.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, getUserId, navigate, questions]);

  useEffect(() => {
    if (timeLeft <= 0) {
      submitTest();
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitTest]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const selectAnswer = (answer) => {
    setAnswers((previous) => ({
      ...previous,
      [questions[currentQuestion].id]: answer,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1);
    }
  };

  const question = questions[currentQuestion];

  if (questionsLoading) {
    return <div className="test-page"><main className="test-main"><section className="question-section"><h2>Loading assessment questions...</h2><p>Questions are being loaded from the ElectroHire database.</p></section></main></div>;
  }

  if (!questions.length) {
    return <div className="test-page"><main className="test-main"><section className="question-section"><h2>Unable to load assessment</h2><p>{warning || "No questions are available."}</p><button type="button" onClick={() => window.location.reload()}>Try Again</button></section></main></div>;
  }

  return (
    <div className="test-page">
      <header className="test-header">
        <div className="test-brand">
          <span className="brand-electro">Electro</span>
          <span className="brand-hire">Hire</span>
        </div>

        <div className="test-title">
          <strong>AI Skill Assessment</strong>
          <span>15 Personalized Questions</span>
        </div>

        <div className="test-security">
          <span className="security-dot"></span>
          Secure Test
        </div>
      </header>

      {warning && (
        <div className="test-warning" role="alert">
          <span>⚠</span>
          <span>{warning}</span>
          <button type="button" onClick={() => setWarning("")} aria-label="Dismiss warning">
            ×
          </button>
        </div>
      )}

      <main className="test-main">
        <section className="question-section">
          <div className="question-top">
            <div>
              <span className="question-number">
                Question {currentQuestion + 1} of {questions.length}
              </span>
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
              <span>⏱</span> {formatTime()}
            </div>
          </div>

          <div className="question-card">
            <div className="question-meta">
              <span>{question.skill}</span>
              <span>Multiple Choice</span>
            </div>

            <h1>{question.question}</h1>

            <div className="options">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === option;

                return (
                  <button
                    type="button"
                    key={option}
                    className={`option ${selected ? "selected" : ""}`}
                    onClick={() => selectAnswer(option)}
                    disabled={isSubmitting}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="option-text">{option}</span>
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
              disabled={currentQuestion === 0 || isSubmitting}
              onClick={previousQuestion}
            >
              ← Previous
            </button>

            <span className="answered-count">
              {Object.keys(answers).length} / {questions.length} answered
            </span>

            {currentQuestion === questions.length - 1 ? (
              <button
                type="button"
                className="submit-btn"
                disabled={isSubmitting}
                onClick={() => setShowSubmit(true)}
              >
                Submit Assessment
              </button>
            ) : (
              <button
                type="button"
                className="next-btn"
                disabled={isSubmitting}
                onClick={nextQuestion}
              >
                Next →
              </button>
            )}
          </div>
        </section>

        <aside className="test-side">
          <div className="camera-card">
            <div className="camera-header">
              <span>Camera Monitoring</span>
              <span className="camera-live"><span></span> LIVE</span>
            </div>

            <div className="camera-box">
              {cameraStatus === "granted" ? (
                <video ref={videoRef} autoPlay muted playsInline />
              ) : (
                <div className="camera-message">
                  {cameraStatus === "denied"
                    ? "Camera permission required"
                    : "Starting camera..."}
                </div>
              )}
            </div>

            {cameraStatus === "denied" && (
              <button type="button" className="camera-retry" onClick={startCamera}>
                Enable Camera
              </button>
            )}

            <div className="camera-status">
              <span className="status-check">✓</span>
              {cameraStatus === "granted"
                ? "Camera monitoring active"
                : "Camera not active"}
            </div>
          </div>

          <div className="navigator-card">
            <h3>Question Navigator</h3>
            <div className="question-grid">
              {questions.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`question-number-btn ${
                    index === currentQuestion ? "active" : ""
                  } ${answers[item.id] ? "answered" : ""}`}
                  onClick={() => setCurrentQuestion(index)}
                  disabled={isSubmitting}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="navigator-legend">
              <span><i className="legend-current"></i>Current</span>
              <span><i className="legend-answered"></i>Answered</span>
              <span><i className="legend-unanswered"></i>Unanswered</span>
            </div>
          </div>

          <div className="security-card">
            <h3>Test Rules</h3>
            <p>✓ Stay in full-screen mode</p>
            <p>✓ Camera should remain enabled</p>
            <p>✓ Do not switch tabs</p>
            <p>✓ Copy/Paste is disabled</p>
            <p>✓ Right-click is disabled</p>
          </div>
        </aside>
      </main>

      {showSubmit && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <div className="modal-icon">✓</div>
            <h2>Submit Assessment?</h2>
            <p>
              You have answered <strong>{Object.keys(answers).length}</strong>{" "}
              out of {questions.length} questions.
            </p>

            {questions.length - Object.keys(answers).length > 0 && (
              <p className="unanswered-warning">
                {questions.length - Object.keys(answers).length} question(s)
                are unanswered.
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
                onClick={submitTest}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving Result..." : "Submit Now"}
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
            <p>The assessment must be completed in full-screen mode.</p>
            <button type="button" onClick={enterFullScreen}>
              Return to Full Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Test;
