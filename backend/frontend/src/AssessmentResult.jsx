
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AssessmentResult.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const PASS_MARK = 70;

function AssessmentResult() {
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadResult() {
      try {
        const storedResult = JSON.parse(
          sessionStorage.getItem("assessmentResult") || "{}"
        );

        const user = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        const userId =
          user.user_id ??
          user.id ??
          user.userId ??
          user.student_id ??
          localStorage.getItem("user_id");

        const assessmentId = storedResult.assessment_id;

        if (!userId) {
          throw new Error(
            "Your login session could not be found. Please log in again."
          );
        }

        if (!assessmentId) {
          throw new Error(
            "Assessment ID not found. Please complete the assessment again."
          );
        }

        const response = await fetch(
          `${API_URL}/api/assessment-results/${encodeURIComponent(
            assessmentId
          )}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Could not load the saved assessment result."
          );
        }

        // The backend endpoint returns { result: {...} }.
        const savedResult = data.result ?? data;

        if (!savedResult || savedResult.result_id == null) {
          throw new Error(
            "No saved result was found for this assessment."
          );
        }

        if (!cancelled) {
          setResult({
            ...savedResult,

            // Preserve useful values from the submission response
            // if they are not included in the saved database result.
            total:
              savedResult.total ??
              savedResult.total_questions ??
              storedResult.total ??
              storedResult.total_questions ??
              0,

            correct:
              savedResult.correct ??
              savedResult.correct_answers ??
              storedResult.correct ??
              storedResult.correct_answers ??
              0,

            wrong:
              savedResult.wrong ??
              savedResult.wrong_answers ??
              storedResult.wrong ??
              storedResult.wrong_answers ??
              0,

            unanswered:
              savedResult.unanswered ??
              storedResult.unanswered ??
              0,

            percentage:
              savedResult.percentage ??
              savedResult.accuracy ??
              savedResult.score ??
              storedResult.percentage ??
              storedResult.accuracy ??
              storedResult.score ??
              0,

            skill_analysis:
              savedResult.skill_analysis ??
              storedResult.skill_analysis ??
              [],
          });
        }
      } catch (err) {
        console.error("Assessment result loading error:", err);

        if (!cancelled) {
          setError(
            err.message || "Could not load assessment result."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="result-loading">
        Loading saved assessment result...
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="result-loading">
        <p>{error || "Assessment result not found."}</p>

        <button onClick={() => navigate("/assessment")}>
          Back to Assessment
        </button>
      </div>
    );
  }

  const total = Number(result.total ?? 0);
  const correct = Number(result.correct ?? 0);
  const wrong = Number(result.wrong ?? 0);
  const unanswered = Number(result.unanswered ?? 0);

  const percentage = Math.max(
    0,
    Math.min(100, Number(result.percentage ?? 0))
  );

  const passed = percentage >= PASS_MARK;

  const skillAnalysis = Array.isArray(result.skill_analysis)
    ? result.skill_analysis
    : [];

  const retakeTest = () => {
    sessionStorage.removeItem("assessmentResult");
    navigate("/test");
  };

  const goDashboard = () => navigate("/dashboard");
  const goAssessment = () => navigate("/assessment");

  return (
    <div className="result-page">
      <header className="result-header">
        <div className="result-logo">
          <span className="result-logo-electro">Electro</span>
          <span className="result-logo-hire">Hire</span>
        </div>

        <div className="result-header-title">
          Assessment Result
        </div>

        <button
          className="result-dashboard-btn"
          onClick={goDashboard}
        >
          Dashboard
        </button>
      </header>

      <main className="result-main">
        <section
          className={`result-hero ${
            passed ? "result-passed" : "result-failed"
          }`}
        >
          <div
            className={`result-status-icon ${
              passed ? "passed-icon" : "failed-icon"
            }`}
          >
            {passed ? "✓" : "!"}
          </div>

          <div className="result-hero-content">
            <p className="result-small-title">
              AI SKILL ASSESSMENT
            </p>

            <h1>
              {passed
                ? "Assessment Passed!"
                : "Assessment Not Passed"}
            </h1>

            <p>
              {passed
                ? "You achieved the minimum required score of 70%."
                : "You need at least 70% to pass this assessment."}
            </p>
          </div>

          <div className="score-circle">
            <strong>{percentage.toFixed(2)}%</strong>
            <span>Your Score</span>
          </div>
        </section>

        <section className="score-cards">
          <div className="score-card">
            <div className="score-card-icon blue">✓</div>
            <div>
              <span>Correct Answers</span>
              <strong>{correct}</strong>
            </div>
          </div>

          <div className="score-card">
            <div className="score-card-icon red">✕</div>
            <div>
              <span>Wrong Answers</span>
              <strong>{wrong}</strong>
            </div>
          </div>

          <div className="score-card">
            <div className="score-card-icon orange">?</div>
            <div>
              <span>Unanswered</span>
              <strong>{unanswered}</strong>
            </div>
          </div>

          <div className="score-card">
            <div className="score-card-icon purple">#</div>
            <div>
              <span>Total Questions</span>
              <strong>{total}</strong>
            </div>
          </div>
        </section>

        <section className="requirement-card">
          <div className="requirement-header">
            <div>
              <h2>Assessment Requirement</h2>
              <p>
                Minimum score required to complete your assessment.
              </p>
            </div>

            <div className="required-score">70%</div>
          </div>

          <div className="requirement-progress">
            <div
              className={`requirement-progress-fill ${
                passed ? "progress-pass" : "progress-fail"
              }`}
              style={{ width: `${percentage}%` }}
            />

            <div
              className="required-marker"
              style={{ left: "70%" }}
            >
              <span />
              <label>70%</label>
            </div>
          </div>

          <div className="requirement-labels">
            <span>0%</span>
            <span className="current-score-label">
              Your Score: {percentage.toFixed(2)}%
            </span>
            <span>100%</span>
          </div>
        </section>

        <section className="analysis-section">
          <div className="section-heading">
            <div>
              <span>PERFORMANCE</span>
              <h2>Skill-wise Analysis</h2>
            </div>

            <p>
              Your saved performance across assessed skills.
            </p>
          </div>

          <div className="skill-analysis-grid">
            {skillAnalysis.length === 0 ? (
              <p>
                Skill-wise analysis is not available for this
                saved result yet.
              </p>
            ) : (
              skillAnalysis.map((skill, index) => {
                const attempted = Number(
                  skill.questions_attempted ??
                    skill.total ??
                    0
                );

                const skillCorrect = Number(
                  skill.correct_answers ??
                    skill.correct ??
                    0
                );

                const score = Math.max(
                  0,
                  Math.min(
                    100,
                    Number(
                      skill.score ??
                        (attempted > 0
                          ? (skillCorrect / attempted) * 100
                          : 0)
                    )
                  )
                );

                return (
                  <div
                    className="skill-analysis-card"
                    key={
                      skill.skill_id ??
                      skill.skill_name ??
                      index
                    }
                  >
                    <div className="skill-analysis-top">
                      <div>
                        <h3>
                          {skill.skill_name ||
                            `Skill ${skill.skill_id ?? index + 1}`}
                        </h3>

                        <span>
                          {skillCorrect} / {attempted} correct
                        </span>
                      </div>

                      <strong>{Math.round(score)}%</strong>
                    </div>

                    <div className="skill-progress">
                      <div
                        className="skill-progress-fill"
                        style={{ width: `${score}%` }}
                      />
                    </div>

                    <div className="skill-status">
                      {skill.strength_level ||
                        (score >= 70
                          ? "Good performance"
                          : "Needs improvement")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section
          className={`completion-card ${
            passed
              ? "completion-success"
              : "completion-retest"
          }`}
        >
          <div className="completion-icon">
            {passed ? "🎉" : "🔄"}
          </div>

          <div className="completion-content">
            <h2>
              {passed
                ? "Your profile assessment is complete"
                : "Retest required"}
            </h2>

            <p>
              {passed
                ? "You achieved the required assessment score. You can continue exploring ElectroHire."
                : "Your score is below the required 70%. Please retake the assessment."}
            </p>
          </div>
        </section>

        <section className="result-actions">
          {passed ? (
            <>
              <button
                className="primary-result-btn"
                onClick={goDashboard}
              >
                Continue to Dashboard →
              </button>

              <button
                className="secondary-result-btn"
                onClick={goAssessment}
              >
                View Assessment
              </button>
            </>
          ) : (
            <>
              <button
                className="primary-result-btn"
                onClick={retakeTest}
              >
                Retake Assessment
              </button>

              <button
                className="secondary-result-btn"
                onClick={goDashboard}
              >
                Back to Dashboard
              </button>
            </>
          )}
        </section>

        <div className="result-note">
          <strong>Assessment rule:</strong>

          <span>
            A minimum score of 70% is required. With 15 questions,
            at least 11 correct answers are needed.
          </span>
        </div>
      </main>
    </div>
  );
}

export default AssessmentResult;
