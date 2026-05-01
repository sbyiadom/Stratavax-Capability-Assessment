import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../../supabase/client";
import {
  getAssessmentById,
  createAssessmentSession,
  getSessionResponses,
  submitAssessment,
  getProgress,
  saveProgress,
  updateSessionTimer,
  isAssessmentCompleted,
  getUniqueQuestions,
  saveUniqueResponse
} from "../../supabase/assessment";

// Dynamically import with no SSR
const AssessmentPage = dynamic(() => Promise.resolve(AssessmentContent), { ssr: false });

// ===== TIMER FUNCTIONS =====
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// ===== CHECK IF QUESTION HAS MULTIPLE CORRECT ANSWERS =====
const isMultipleCorrectQuestion = (question) => {
  if (!question?.answers) return false;
  const correctAnswers = question.answers.filter((a) => a.score === 1);
  return correctAnswers.length > 1;
};

function AssessmentContent() {
  const router = useRouter();
  const { id: assessmentId } = router.query;

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [assessmentType, setAssessmentType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [initialAnswers, setInitialAnswers] = useState({});
  const [answerChangeCount, setAnswerChangeCount] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimings, setQuestionTimings] = useState({});
  const sessionIdRef = useRef(null);

  const [violationCount, setViolationCount] = useState(0);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(10800);
  const [timeRemaining, setTimeRemaining] = useState(10800);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");

  const DEFAULT_GRADIENT_START = "#667eea";
  const DEFAULT_GRADIENT_END = "#764ba2";

  const getGradientStart = () => assessmentType?.gradient_start || DEFAULT_GRADIENT_START;
  const getGradientEnd = () => assessmentType?.gradient_end || DEFAULT_GRADIENT_END;

  const getSelectedAnswersForQuestion = (questionId) => {
    const selected = answers[questionId];
    if (Array.isArray(selected)) return selected;
    if (selected) return [selected];
    return [];
  };

  const isAnswerSelected = (questionId, answerId) => {
    const selected = getSelectedAnswersForQuestion(questionId);
    return selected.includes(answerId);
  };

  const showViolationWarningMessage = (message) => {
    setViolationMessage(message);
    setShowViolationWarning(true);
    setTimeout(() => setShowViolationWarning(false), 3000);
  };

  const logViolation = async (violationType) => {
    if (!sessionIdRef.current || isAutoSubmitting || alreadySubmitted) return;

    const newCount = violationCount + 1;
    setViolationCount(newCount);

    await supabase
      .from("assessment_sessions")
      .update({ violation_count: newCount })
      .eq("id", sessionIdRef.current);

    await supabase.from("assessment_violations").insert({
      session_id: sessionIdRef.current,
      user_id: user?.id,
      assessment_id: assessmentId,
      violation_type: violationType
    });

    showViolationWarningMessage(`${violationType}. Violation ${newCount} of 3.`);

    if (newCount >= 3 && !isAutoSubmitting && !alreadySubmitted) {
      showViolationWarningMessage("Maximum violations reached (3/3). Auto-submitting assessment...");
      setIsAutoSubmitting(true);

      setTimeout(async () => {
        await handleAutoSubmitDueToViolations();
      }, 2000);
    }
  };

  const handleAutoSubmitDueToViolations = async () => {
    if (alreadySubmitted || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id);
      await updateSessionTimer(session.id, elapsedSeconds);

      await submitAssessment(session.id);
    } catch (error) {
      await supabase
        .from("assessment_sessions")
        .update({
          status: "completed",
          auto_submitted: true,
          auto_submit_reason: `Auto-submitted due to ${violationCount} rule violation(s). Only ${Object.keys(answers).length} of ${questions.length} questions completed.`,
          completed_at: new Date().toISOString()
        })
        .eq("id", session.id);

      setAlreadySubmitted(true);
      setShowViolationWarning(false);

      router.push(
        `/assessment/terminated?reason=violations&count=${violationCount}&answered=${Object.keys(answers).length}&total=${questions.length}`
      );
    } finally {
      setIsSubmitting(false);
      setIsAutoSubmitting(false);
    }
  };

  // ===== ANTI-CHEAT LISTENERS =====
  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session) return;

    const handleCopy = (e) => {
      e.preventDefault();
      logViolation("Copy attempt");
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      logViolation("Paste attempt");
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      logViolation("Cut attempt");
      return false;
    };

    const handleKeyDown = (e) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        logViolation("Screenshot attempt (PrintScreen)");
        return false;
      }

      if (e.key === "F12") {
        e.preventDefault();
        logViolation("DevTools attempt (F12)");
        return false;
      }

      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) {
        e.preventDefault();
        logViolation(`DevTools attempt (Ctrl+Shift+${e.key})`);
        return false;
      }

      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        logViolation("View source attempt");
        return false;
      }

      if (e.metaKey && e.altKey && e.key === "I") {
        e.preventDefault();
        logViolation("DevTools attempt (Mac)");
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      logViolation("Right-click attempt");
      return false;
    };

    const devToolsInterval = setInterval(() => {
      if (!sessionIdRef.current || alreadySubmitted) return;

      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > 200 || heightDiff > 200) {
        logViolation("DevTools detected (window size)");
      }
    }, 5000);

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    const style = document.createElement("style");
    style.textContent = `* { -webkit-user-select: none !important; user-select: none !important; }`;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.head.removeChild(style);
      clearInterval(devToolsInterval);
    };
  }, [loading, alreadySubmitted, accessDenied, session, violationCount]);

  // ===== AUTH STATE =====
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  const checkAssessmentAccess = async (userId, assessmentId) => {
    try {
      const completed = await isAssessmentCompleted(userId, assessmentId);

      if (completed) {
        setAlreadySubmitted(true);
        setAccessChecked(true);
        return false;
      }

      const { data, error } = await supabase
        .from("candidate_assessments")
        .select("status")
        .eq("user_id", userId)
        .eq("assessment_id", assessmentId)
        .maybeSingle();

      if (error) throw error;

      const hasAccess = data?.status === "unblocked";

      if (!hasAccess) {
        setAccessDenied(true);
      }

      setAccessChecked(true);
      return hasAccess;
    } catch (error) {
      console.error("Error checking assessment access:", error);
      setAccessDenied(true);
      setAccessChecked(true);
      return false;
    }
  };

  // ===== INITIALIZATION =====
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        const {
          data: { session: authSession }
        } = await supabase.auth.getSession();

        if (!authSession) {
          router.push("/login");
          return;
        }

        setUser(authSession.user);

        if (!assessmentId) return;

        const hasAccess = await checkAssessmentAccess(authSession.user.id, assessmentId);

        if (!hasAccess) {
          setLoading(false);
          return;
        }

        const completed = await isAssessmentCompleted(authSession.user.id, assessmentId);

        if (completed) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        const assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);
        setAssessmentType(assessmentData?.assessment_type);
        setTimeLimit(10800);
        setTimeRemaining(10800);

        const sessionData = await createAssessmentSession(
          authSession.user.id,
          assessmentId,
          assessmentData?.assessment_type?.id
        );

        setSession(sessionData);

        if (sessionData?.id) {
          sessionIdRef.current = sessionData.id;
          console.log("📌 Session ID:", sessionData.id);
        }

        const progress = await getProgress(authSession.user.id, assessmentId);

        if (progress) {
          setElapsedSeconds(progress.elapsed_seconds || 0);
        }

        const uniqueQuestions = await getUniqueQuestions(assessmentId);
        setQuestions(uniqueQuestions || []);

        if (sessionData?.id) {
          const responses = await getSessionResponses(sessionData.id);

          if (responses?.answerMap) {
            const formattedAnswers = {};

            Object.entries(responses.answerMap).forEach(([qId, answer]) => {
              if (typeof answer === "string" && answer.includes(",")) {
                formattedAnswers[qId] = answer.split(",").map((id) => parseInt(id, 10));
              } else {
                formattedAnswers[qId] = parseInt(answer, 10);
              }
            });

            setAnswers(formattedAnswers);

            if (responses.initialAnswerMap) {
              setInitialAnswers(responses.initialAnswerMap);
            }

            if (progress?.last_question_id && uniqueQuestions?.length > 0) {
              const lastIndex = uniqueQuestions.findIndex((q) => q.id === progress.last_question_id);
              if (lastIndex >= 0) setCurrentIndex(lastIndex);
            }
          }
        }

        const { data: sessionViolations } = await supabase
          .from("assessment_sessions")
          .select("violation_count")
          .eq("id", sessionData.id)
          .single();

        if (sessionViolations?.violation_count) {
          setViolationCount(sessionViolations.violation_count);
        }

        setQuestionStartTime(Date.now());
        setLoading(false);
      } catch (error) {
        console.error("❌ Initialization error:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (assessmentId) {
      init();
    }
  }, [assessmentId, router]);

  // ===== TIMER =====
  useEffect(() => {
    if (loading || alreadySubmitted || !session || accessDenied || isAutoSubmitting) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newElapsed = prev + 1;

        setTimeRemaining(timeLimit - newElapsed);

        if (newElapsed >= timeLimit) {
          handleTimeExpired();
        }

        if (newElapsed % 30 === 0) {
          saveProgress(session.id, user.id, assessmentId, newElapsed, questions[currentIndex]?.id);
          updateSessionTimer(session.id, newElapsed);
        }

        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    loading,
    alreadySubmitted,
    session,
    timeLimit,
    assessmentId,
    user?.id,
    currentIndex,
    questions,
    accessDenied,
    isAutoSubmitting
  ]);

  // ✅ FIXED: Save question timing
  const saveQuestionTiming = async (questionId, timeSpentSeconds) => {
    if (!sessionIdRef.current || !questionId) return false;

    try {
      const questionIdNum = parseInt(questionId, 10);

      if (isNaN(questionIdNum)) {
        console.error("❌ Invalid question_id for timing:", questionId);
        return false;
      }

      const currentTiming = questionTimings[questionIdNum] || {};

      const payload = {
        session_id: sessionIdRef.current,
        question_id: questionIdNum,
        question_number: currentIndex + 1,
        time_spent_seconds: Math.max(0, timeSpentSeconds || 0),
        visit_count: (currentTiming.visit_count || 0) + 1,
        last_answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from("question_timing").upsert(payload, {
        onConflict: "session_id,question_id"
      });

      if (error) {
        console.error("❌ Error saving question timing:", error);
        return false;
      }

      setQuestionTimings((prev) => ({
        ...prev,
        [questionIdNum]: {
          time_spent: timeSpentSeconds,
          visit_count: (prev[questionIdNum]?.visit_count || 0) + 1
        }
      }));

      return true;
    } catch (error) {
      console.error("❌ Error in saveQuestionTiming:", error);
      return false;
    }
  };

  const handleTimeExpired = async () => {
    if (alreadySubmitted || isSubmitting || isAutoSubmitting) return;

    alert("Time's up! Your assessment will be submitted automatically.");

    try {
      setIsSubmitting(true);

      await Promise.all([
        saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id),
        updateSessionTimer(session.id, elapsedSeconds)
      ]);

      await submitAssessment(session.id);

      setAlreadySubmitted(true);
      router.push("/candidate/dashboard");
    } catch (error) {
      console.error("Auto-submit error:", error);
      alert("Failed to auto-submit. Please contact support.");
      setIsSubmitting(false);
    }
  };

  // ✅ SAFER: answered count fallback; DB trigger also handles this
  const updateAnsweredQuestionsCount = async () => {
    if (!sessionIdRef.current) return;

    const answeredCount = Object.values(answers).filter((answer) => {
      if (Array.isArray(answer)) return answer.length > 0;
      return answer !== null && answer !== undefined && answer !== "";
    }).length;

    const { error } = await supabase
      .from("assessment_sessions")
      .update({
        answered_questions: answeredCount,
        total_questions: questions.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionIdRef.current);

    if (error) {
      console.error("Error updating answered questions count:", error);
    }
  };

  const handleAnswerSelect = async (questionId, answerId, isMultipleCorrect) => {
    if (alreadySubmitted || !session || !questionId || !answerId || accessDenied || isAutoSubmitting) return;

    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);

    let newSelectedAnswers;
    let isAnswerChange = false;
    let isFirstAnswer = false;

    if (isMultipleCorrect) {
      const currentSelected = getSelectedAnswersForQuestion(questionId);

      if (currentSelected.includes(answerId)) {
        newSelectedAnswers = currentSelected.filter((id) => id !== answerId);
      } else {
        newSelectedAnswers = [...currentSelected, answerId];
      }

      isAnswerChange =
        currentSelected.length !== newSelectedAnswers.length ||
        !currentSelected.every((id) => newSelectedAnswers.includes(id));

      isFirstAnswer = currentSelected.length === 0 && newSelectedAnswers.length > 0;
    } else {
      const previousAnswer = answers[questionId];
      newSelectedAnswers = answerId;
      isAnswerChange = previousAnswer && previousAnswer !== answerId;
      isFirstAnswer = !previousAnswer;
    }

    const currentChangeCount = answerChangeCount[questionId] || 0;
    const newChangeCount = isAnswerChange ? currentChangeCount + 1 : currentChangeCount;

    let initialAnswerId = initialAnswers[questionId];

    if (isFirstAnswer) {
      initialAnswerId = isMultipleCorrect ? newSelectedAnswers : answerId;
      setInitialAnswers((prev) => ({ ...prev, [questionId]: initialAnswerId }));
    }

    if (isAnswerChange) {
      setAnswerChangeCount((prev) => ({ ...prev, [questionId]: newChangeCount }));
    }

    setAnswers((prev) => ({ ...prev, [questionId]: newSelectedAnswers }));
    setSaveStatus((prev) => ({ ...prev, [questionId]: "saving" }));

    try {
      const answerToStore = Array.isArray(newSelectedAnswers)
        ? newSelectedAnswers.join(",")
        : newSelectedAnswers;

      const result = await saveUniqueResponse(session.id, user.id, assessmentId, questionId, answerToStore, {
        time_spent_seconds: timeSpentSeconds,
        times_changed: newChangeCount,
        initial_answer_id: Array.isArray(initialAnswerId) ? initialAnswerId.join(",") : initialAnswerId,
        is_answer_change: isAnswerChange
      });

      if (result?.success) {
        setSaveStatus((prev) => ({ ...prev, [questionId]: "saved" }));

        await saveQuestionTiming(questionId, timeSpentSeconds);
        await updateAnsweredQuestionsCount();

        setTimeout(() => {
          setSaveStatus((prev) => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 500);
      } else {
        setSaveStatus((prev) => ({ ...prev, [questionId]: "error" }));

        setTimeout(() => {
          setSaveStatus((prev) => {
            const newStatus = { ...prev };
            delete newStatus[questionId];
            return newStatus;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Save error:", error);

      setSaveStatus((prev) => ({ ...prev, [questionId]: "error" }));

      setTimeout(() => {
        setSaveStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 2000);
    }

    setQuestionStartTime(Date.now());
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1 && !isAutoSubmitting) {
      const currentQuestionId = questions[currentIndex]?.id;

      if (currentQuestionId) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        await saveQuestionTiming(currentQuestionId, timeSpent);
      }

      setCurrentIndex((i) => i + 1);
      setQuestionStartTime(Date.now());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = async () => {
    if (currentIndex > 0 && !isAutoSubmitting) {
      const currentQuestionId = questions[currentIndex]?.id;

      if (currentQuestionId) {
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        await saveQuestionTiming(currentQuestionId, timeSpent);
      }

      setCurrentIndex((i) => i - 1);
      setQuestionStartTime(Date.now());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const jumpToQuestion = async (index) => {
    if (isAutoSubmitting) return;

    const currentQuestionId = questions[currentIndex]?.id;

    if (currentQuestionId) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      await saveQuestionTiming(currentQuestionId, timeSpent);
    }

    setCurrentIndex(index);
    setQuestionStartTime(Date.now());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!session || alreadySubmitted || accessDenied || isAutoSubmitting) return;

    if (violationCount >= 3) {
      alert(
        `Cannot submit: You have ${violationCount} rule violations. The assessment has been auto-submitted as invalid.`
      );
      return;
    }

    const lastQuestionId = questions[currentIndex]?.id;

    if (lastQuestionId) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      await saveQuestionTiming(lastQuestionId, timeSpent);
    }

    const unansweredCount = questions.length - Object.keys(answers).length;

    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      );

      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      await Promise.all([
        saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id),
        updateSessionTimer(session.id, elapsedSeconds),
        updateAnsweredQuestionsCount()
      ]);

      const result = await submitAssessment(session.id);

      console.log("✅ Submit successful:", result);

      setAlreadySubmitted(true);
      setShowSuccessModal(true);

      setTimeout(() => {
        router.push("/candidate/dashboard");
      }, 2000);
    } catch (error) {
      console.error("❌ Submission error:", error);

      if (error.message === "assessment_invalid_violations" || error.message?.includes("violations")) {
        alert("Assessment cannot be submitted due to rule violations. Please contact your supervisor.");
        router.push("/candidate/dashboard");
      } else if (error.message === "already_submitted" || error.message?.includes("already submitted")) {
        setAlreadySubmitted(true);
        alert("This assessment has already been submitted.");
        router.push("/candidate/dashboard");
      } else {
        alert(`Failed to submit assessment: ${error.message}`);
        setIsSubmitting(false);
      }
    }
  };

  const handleBackClick = async () => {
    router.push("/candidate/dashboard");
  };

  const totalAnswered = Object.keys(answers || {}).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const timeRemainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
  const timeRemainingFormatted = formatTime(timeRemainingSeconds);
  const timePercentage = (elapsedSeconds / timeLimit) * 100;
  const isTimeWarning = timePercentage > 80;
  const isTimeCritical = timePercentage > 90;

  const currentQuestion = questions[currentIndex] || {};
  const isMultipleCorrect = isMultipleCorrectQuestion(currentQuestion);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <h2>Loading Assessment...</h2>
        <p>Preparing your questions</p>
      </div>
    );
  }

  if (accessDenied && accessChecked) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>🔒</div>
          <h2>Access Denied</h2>
          <p>You do not have permission to take this assessment.</p>
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.successIcon}>✅</div>
          <h2>Assessment Already Completed</h2>
          <p>You have already submitted this assessment.</p>
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Error Loading Assessment</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} style={styles.primaryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>📭</div>
          <h2>No Questions Available</h2>
          <p>This assessment does not have any questions yet.</p>
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>
            ← Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showViolationWarning && (
        <div style={styles.violationBanner}>
          <span>⚠️</span>
          <span>{violationMessage}</span>
        </div>
      )}

      {isAutoSubmitting && (
        <div style={styles.autoSubmitOverlay}>
          <div style={styles.autoSubmitCard}>
            <div style={styles.autoSubmitSpinner} />
            <h3>Auto-submitting assessment...</h3>
            <p>You have exceeded the violation limit (3/3).</p>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIcon}>📋</div>
            <h2 style={styles.modalTitle}>Ready to Submit?</h2>

            <div style={styles.modalStats}>
              <div style={styles.modalStat}>
                <span>Questions Answered</span>
                <span style={{ color: "#4caf50", fontWeight: 700 }}>
                  {totalAnswered}/{questions.length}
                </span>
              </div>

              <div style={styles.modalStat}>
                <span>Completion Rate</span>
                <span>{Math.round((totalAnswered / questions.length) * 100)}%</span>
              </div>

              <div style={styles.modalStat}>
                <span>Answer Changes</span>
                <span>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</span>
              </div>

              {violationCount > 0 && (
                <div style={styles.modalStat}>
                  <span>Violations</span>
                  <span
                    style={{
                      color: violationCount >= 3 ? "#f44336" : "#ff9800",
                      fontWeight: 700
                    }}
                  >
                    {violationCount}/3
                  </span>
                </div>
              )}
            </div>

            <div style={styles.modalWarning}>
              <span>⚠️</span>
              <span>
                <strong>One attempt only:</strong> After submission, you cannot retake this assessment.
              </span>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowSubmitModal(false)} style={styles.modalSecondaryButton}>
                Continue Reviewing
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || violationCount >= 3}
                style={{
                  ...styles.modalPrimaryButton,
                  background: violationCount >= 3 ? "#ccc" : "#4caf50",
                  cursor: violationCount >= 3 ? "not-allowed" : "pointer"
                }}
              >
                {isSubmitting
                  ? "Submitting..."
                  : violationCount >= 3
                  ? "Cannot Submit - Violations"
                  : "Submit Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: "center" }}>
            <div style={styles.successIconLarge}>✓</div>
            <h2 style={{ color: "#2e7d32" }}>Assessment Complete!</h2>
            <p>Your assessment has been successfully submitted.</p>
            <p style={{ color: "#64748b" }}>Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      <div style={styles.container}>
        <div
          style={{
            ...styles.header,
            background: `linear-gradient(135deg, ${getGradientStart()}, ${getGradientEnd()})`
          }}
        >
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button onClick={handleBackClick} style={styles.backButton}>
                ←
              </button>

              <div>
                <div style={styles.headerTitle}>{assessment?.title}</div>
                <div style={styles.headerMeta}>
                  Question {currentIndex + 1} of {questions.length} • {currentQuestion?.section || "General"}
                  {isMultipleCorrect && (
                    <span style={{ marginLeft: "10px", color: "#ff9800", fontSize: "12px" }}>
                      (Select all that apply)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {violationCount > 0 && (
                <div
                  style={{
                    background: violationCount >= 3 ? "#f44336" : "#ff9800",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                >
                  ⚠️ {violationCount}/3 Violations
                </div>
              )}

              <div
                style={{
                  ...styles.timer,
                  background: isTimeCritical
                    ? "rgba(211, 47, 47, 0.1)"
                    : isTimeWarning
                    ? "rgba(255, 152, 0, 0.1)"
                    : "rgba(255,255,255,0.15)"
                }}
              >
                <div style={styles.timerLabel}>TIME REMAINING</div>
                <div
                  style={{
                    ...styles.timerValue,
                    color: isTimeCritical ? "#d32f2f" : isTimeWarning ? "#ff9800" : "white"
                  }}
                >
                  {timeRemainingFormatted}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.mainContent}>
          <div style={styles.questionColumn}>
            <div style={styles.questionCard}>
              <div style={styles.questionText}>{currentQuestion?.question_text}</div>

              {answerChangeCount[currentQuestion?.id] > 0 && (
                <div style={styles.changeIndicator}>
                  ✏️ Changed answer {answerChangeCount[currentQuestion.id]} time
                  {answerChangeCount[currentQuestion.id] !== 1 ? "s" : ""}
                </div>
              )}

              <div style={styles.answersContainer}>
                {currentQuestion?.answers?.map((answer, index) => {
                  const isSelected = isAnswerSelected(currentQuestion.id, answer.id);
                  const optionLetter = String.fromCharCode(65 + index);

                  return (
                    <button
                      key={answer.id}
                      onClick={() => handleAnswerSelect(currentQuestion.id, answer.id, isMultipleCorrect)}
                      disabled={alreadySubmitted || isAutoSubmitting}
                      style={{
                        ...styles.answerCard,
                        background: isSelected
                          ? `linear-gradient(135deg, ${getGradientStart()}, ${getGradientEnd()})`
                          : "white",
                        borderColor: isSelected ? getGradientStart() : "#e2e8f0",
                        opacity: isAutoSubmitting ? 0.6 : 1
                      }}
                    >
                      <div
                        style={{
                          ...styles.answerLetter,
                          background: isSelected ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                          color: isSelected ? "white" : "#475569"
                        }}
                      >
                        {optionLetter}
                      </div>

                      <span style={{ color: isSelected ? "white" : "#1e293b" }}>
                        {answer.answer_text}
                        {isMultipleCorrect && isSelected && (
                          <span style={{ marginLeft: "8px", fontSize: "12px" }}>✓</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isMultipleCorrect && (
                <div style={styles.multipleHint}>
                  💡 This question has multiple correct answers. Select all that apply.
                </div>
              )}

              <div style={styles.navigation}>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || isAutoSubmitting}
                  style={{
                    ...styles.navButton,
                    opacity: currentIndex === 0 || isAutoSubmitting ? 0.5 : 1
                  }}
                >
                  ← Previous
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    disabled={isAutoSubmitting || violationCount >= 3}
                    style={{
                      ...styles.submitButton,
                      background: violationCount >= 3 ? "#ccc" : "#4caf50",
                      cursor: violationCount >= 3 ? "not-allowed" : "pointer"
                    }}
                  >
                    {violationCount >= 3 ? "Blocked - Violations" : "Submit"}
                  </button>
                ) : (
                  <button onClick={handleNext} disabled={isAutoSubmitting} style={styles.nextButton}>
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={styles.navigatorColumn}>
            <div style={styles.navigatorCard}>
              <h3>Question Navigator</h3>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{totalAnswered}</div>
                  <div style={styles.statLabel}>Answered</div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statValue}>{questions.length - totalAnswered}</div>
                  <div style={styles.statLabel}>Remaining</div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statValue}>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</div>
                  <div style={styles.statLabel}>Changes</div>
                </div>
              </div>

              <div style={styles.questionGrid}>
                {questions.map((q, index) => {
                  const isAnswered =
                    answers[q.id] !== undefined &&
                    (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : answers[q.id] !== null);

                  const isCurrent = index === currentIndex;
                  const hasChanges = answerChangeCount[q.id] > 0;

                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(index)}
                      disabled={isAutoSubmitting}
                      style={{
                        ...styles.gridItem,
                        background: isCurrent
                          ? getGradientStart()
                          : isAnswered
                          ? hasChanges
                            ? "#ff9800"
                            : "#4caf50"
                          : "white",
                        color: isCurrent || isAnswered ? "white" : "#1e293b",
                        borderColor: isCurrent ? getGradientStart() : "#e2e8f0",
                        opacity: isAutoSubmitting ? 0.6 : 1
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "#4caf50" }} />
                  Answered
                </div>

                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "#ff9800" }} />
                  Changed
                </div>

                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: getGradientStart() }} />
                  Current
                </div>

                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: "white", border: "2px solid #e2e8f0" }} />
                  Pending
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Styles
const styles = {
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    gap: "20px"
  },
  loadingSpinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  messageContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px"
  },
  messageCard: {
    background: "white",
    padding: "40px",
    borderRadius: "16px",
    maxWidth: "500px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
  },
  errorIcon: { fontSize: "64px", marginBottom: "20px" },
  successIcon: { fontSize: "64px", marginBottom: "20px" },
  successIconLarge: {
    width: "80px",
    height: "80px",
    background: "#4caf50",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    fontSize: "40px",
    color: "white"
  },
  primaryButton: {
    padding: "12px 30px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },
  violationBanner: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#f44336",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: "bold",
    zIndex: 10001,
    fontSize: "14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  autoSubmitOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10002
  },
  autoSubmitCard: {
    background: "white",
    padding: "30px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "400px"
  },
  autoSubmitSpinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #f44336",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px"
  },
  container: { minHeight: "100vh", background: "#f8fafc" },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    color: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  headerContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px"
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "20px" },
  backButton: {
    width: "40px",
    height: "40px",
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontSize: "24px",
    cursor: "pointer"
  },
  headerTitle: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  headerMeta: { fontSize: "14px", opacity: 0.9 },
  timer: {
    padding: "10px 20px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.3)",
    textAlign: "center",
    minWidth: "160px"
  },
  timerLabel: { fontSize: "12px", fontWeight: 600, marginBottom: "4px" },
  timerValue: { fontSize: "24px", fontWeight: 700, fontFamily: "monospace" },
  mainContent: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "24px",
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: "24px"
  },
  questionColumn: { display: "flex", flexDirection: "column", gap: "20px" },
  questionCard: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  questionText: {
    fontSize: "18px",
    lineHeight: "1.5",
    color: "#1e293b",
    marginBottom: "20px",
    fontWeight: 500,
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "10px"
  },
  changeIndicator: {
    padding: "6px 12px",
    background: "#FFF8E1",
    borderRadius: "20px",
    fontSize: "11px",
    color: "#F57C00",
    marginBottom: "12px",
    display: "inline-block"
  },
  answersContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "24px"
  },
  answerCard: {
    padding: "12px 16px",
    border: "2px solid",
    borderRadius: "12px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.2s"
  },
  answerLetter: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 700
  },
  multipleHint: {
    padding: "10px 16px",
    background: "#E3F2FD",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#1565C0",
    marginBottom: "16px"
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "8px"
  },
  navButton: {
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    border: "2px solid #667eea",
    background: "white",
    color: "#667eea",
    cursor: "pointer"
  },
  nextButton: {
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    border: "none",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    cursor: "pointer"
  },
  submitButton: {
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    border: "none",
    background: "#4caf50",
    color: "white",
    cursor: "pointer"
  },
  navigatorColumn: {
    position: "sticky",
    top: "100px",
    height: "fit-content"
  },
  navigatorCard: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "20px"
  },
  statCard: {
    background: "#f8fafc",
    padding: "12px",
    borderRadius: "10px",
    textAlign: "center"
  },
  statValue: { fontSize: "20px", fontWeight: 800 },
  statLabel: { fontSize: "10px", color: "#64748b" },
  questionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "6px",
    marginBottom: "16px",
    maxHeight: "260px",
    overflowY: "auto",
    padding: "4px"
  },
  gridItem: {
    aspectRatio: "1",
    border: "2px solid",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  legend: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "8px"
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px"
  },
  legendDot: { width: "10px", height: "10px", borderRadius: "2px" },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modalContent: {
    background: "white",
    padding: "30px",
    borderRadius: "20px",
    maxWidth: "450px",
    width: "90%"
  },
  modalIcon: {
    fontSize: "48px",
    textAlign: "center",
    marginBottom: "15px"
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "20px"
  },
  modalStats: {
    background: "#f8fafc",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  modalStat: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px"
  },
  modalWarning: {
    display: "flex",
    gap: "10px",
    padding: "12px",
    background: "#fff8e1",
    borderRadius: "10px",
    fontSize: "13px",
    marginBottom: "20px"
  },
  modalActions: { display: "flex", gap: "12px" },
  modalSecondaryButton: {
    flex: 1,
    padding: "12px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer"
  },
  modalPrimaryButton: {
    flex: 1,
    padding: "12px",
    background: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer"
  }
};

// Add keyframes globally
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default AssessmentPage;
