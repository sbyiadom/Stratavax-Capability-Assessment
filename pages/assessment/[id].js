// pages/assessment/[id].js - FULLY CORRECTED VERSION
// FIXES: National Service single selection, randomized answers, correct time limits

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../../supabase/client";

const AssessmentPage = dynamic(() => Promise.resolve(AssessmentContent), { ssr: false });

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(safeNumber(seconds, 0)));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getAnswerArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function countAnswered(answerMap) {
  return Object.values(answerMap || {}).filter((answer) => {
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== null && answer !== undefined && answer !== "";
  }).length;
}

// ============================================================
// FIXED: National Service ALWAYS uses single selection
// ============================================================
function isMultipleCorrectQuestion(question, assessmentTypeCode) {
  // National Service assessment: ALWAYS single selection
  if (assessmentTypeCode === 'national_service') {
    return false;
  }
  
  // For other assessments: check if more than 1 correct answer
  if (!question || !Array.isArray(question.answers)) return false;
  const correctAnswers = question.answers.filter((answer) => safeNumber(answer.score, 0) === 1);
  return correctAnswers.length > 1;
}

function getAssessmentDuration(assessmentTypeCode) {
  // National Service: 90 minutes (FIXED from 120)
  if (assessmentTypeCode === 'national_service') {
    return 90;
  }
  // All other assessments: 120 minutes
  return 120;
}

// ============================================================
// API HELPERS
// ============================================================

async function apiCall(endpoint, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'API call failed');
  }
  return result;
}

async function fetchAssessmentDetails(assessmentId) {
  const result = await apiCall(`/api/assessment/${assessmentId}`);
  return result;
}

async function fetchAccess(assessmentId) {
  const result = await apiCall(`/api/assessment/access?assessmentId=${assessmentId}`);
  return result.access;
}

// UPDATED: Pass assessmentTypeCode for randomization
async function fetchQuestions(assessmentTypeId, assessmentTypeCode) {
  const params = new URLSearchParams({ 
    assessmentTypeId,
    ...(assessmentTypeCode && { assessmentTypeCode })
  });
  const result = await apiCall(`/api/assessment/questions?${params.toString()}`);
  return result.questions || [];
}

async function createOrGetSession(assessmentId, assessmentTypeId, durationMinutes) {
  const result = await apiCall('/api/assessment/session', {
    method: 'POST',
    body: JSON.stringify({ assessmentId, assessmentTypeId, durationMinutes })
  });
  return result.session;
}

async function getSessionResponses(sessionId) {
  const result = await apiCall(`/api/assessment/responses?sessionId=${sessionId}`);
  return result.responses || {};
}

async function saveAnswer(sessionId, questionId, answer, metadata) {
  const result = await apiCall('/api/assessment/save-response', {
    method: 'POST',
    body: JSON.stringify({ sessionId, questionId, answer, metadata })
  });
  return result;
}

async function submitAssessment(sessionId, autoSubmitted, autoSubmitReason, allowIncomplete) {
  const result = await apiCall('/api/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, autoSubmitted, autoSubmitReason, allowIncomplete })
  });
  return result;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function AssessmentContent() {
  const router = useRouter();
  const assessmentId = router.query.id || router.query.assessment_id;

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [assessment, setAssessment] = useState(null);
  const [assessmentType, setAssessmentType] = useState(null);
  const [assessmentTypeCode, setAssessmentTypeCode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [initialAnswers, setInitialAnswers] = useState({});
  const [answerChangeCount, setAnswerChangeCount] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(7200); // Default 120 mins
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const [violationCount, setViolationCount] = useState(0);
  const [violationMessage, setViolationMessage] = useState("");
  const [showViolationWarning, setShowViolationWarning] = useState(false);

  const [accessDenied, setAccessDenied] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  const sessionIdRef = useRef(null);
  const submittingRef = useRef(false);
  const autoSubmitRef = useRef(false);

  // STRATAVAX BRAND COLORS
  const primaryColor = "#0b2a4e";
  const accentColor = "#f9b83a";
  const successColor = "#2e7d32";
  const warningColor = "#f57c00";
  const dangerColor = "#c62828";

  const currentQuestion = questions[currentIndex] || {};
  const isNationalService = assessmentTypeCode === 'national_service' || 
    (assessment && assessment.title && assessment.title.toLowerCase().includes('national service'));

  // FIXED: For National Service, ALWAYS single selection
  const isMultipleCorrect = isNationalService ? false : isMultipleCorrectQuestion(currentQuestion, assessmentTypeCode);
  
  const totalAnswered = countAnswered(answers);
  const totalChanges = Object.values(answerChangeCount).reduce((a, b) => a + safeNumber(b, 0), 0);
  const isLastQuestion = currentIndex === questions.length - 1;
  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const timeRemainingFormatted = formatTime(remainingSeconds);
  const timeUsedPercent = timeLimitSeconds > 0 ? (elapsedSeconds / timeLimitSeconds) * 100 : 0;
  const isTimeCritical = timeUsedPercent > 90;

  function getSelectedAnswersForQuestion(questionId) {
    return getAnswerArray(answers[questionId]);
  }

  function isAnswerSelected(questionId, answerId) {
    const selected = getSelectedAnswersForQuestion(questionId);
    return selected.map(String).includes(String(answerId));
  }

  function showViolation(message) {
    setViolationMessage(message);
    setShowViolationWarning(true);
    setTimeout(() => setShowViolationWarning(false), 3000);
  }

  // ============================================================
  // AUTO SUBMIT
  // ============================================================
  async function handleAutoSubmit(reason) {
    if (alreadySubmitted || submittingRef.current || autoSubmitRef.current) {
      return;
    }
    
    try {
      autoSubmitRef.current = true;
      submittingRef.current = true;
      setIsSubmitting(true);
      setIsAutoSubmitting(true);
      setIsTimeExpired(true);

      const answerPromises = Object.entries(answers).map(([qId, answer]) => {
        if (answer === null || answer === undefined || answer === '') return null;
        const answerToStore = Array.isArray(answer) ? answer.join(",") : String(answer);
        const changeCount = answerChangeCount[qId] || 0;
        const initialAns = initialAnswers[qId] || answer;
        
        return saveAnswer(
          sessionIdRef.current,
          qId,
          answerToStore,
          {
            time_spent_seconds: Math.floor((Date.now() - questionStartTime) / 1000),
            times_changed: changeCount,
            initial_answer_id: Array.isArray(initialAns) ? initialAns.join(",") : String(initialAns),
            is_answer_change: false
          }
        );
      });

      await Promise.all(answerPromises.filter(p => p !== null));

      await submitAssessment(sessionIdRef.current, true, reason || 'Auto-submitted because the assessment timer expired.', true);

      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        router.push('/candidate/assessment-complete');
      }, 2000);

    } catch (err) {
      console.error('[AutoSubmit] Failed:', err);
      alert('Auto-submit failed. Please contact support with this error: ' + (err.message || 'Unknown error'));
      setTimeout(() => {
        router.push('/candidate/dashboard');
      }, 3000);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setIsAutoSubmitting(false);
    }
  }

  // ============================================================
  // ANSWER HANDLER - FORCES SINGLE SELECTION FOR NATIONAL SERVICE
  // ============================================================
  async function handleAnswerSelect(questionId, answerId, multipleCorrect) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically.");
      return;
    }
    
    if (alreadySubmitted || !session || !user || !questionId || !answerId || accessDenied || isAutoSubmitting) return;

    // FORCE single selection for National Service
    const isNationalServiceType = assessmentTypeCode === 'national_service';
    const actualMultipleCorrect = multipleCorrect && !isNationalServiceType;

    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    let newSelectedAnswer;
    let isAnswerChange = false;
    let isFirstAnswer = false;

    if (actualMultipleCorrect) {
      // Multiple selection logic
      const currentSelected = getSelectedAnswersForQuestion(questionId);
      if (currentSelected.map(String).includes(String(answerId))) {
        newSelectedAnswer = currentSelected.filter((id) => String(id) !== String(answerId));
      } else {
        newSelectedAnswer = currentSelected.concat([answerId]);
      }
      isFirstAnswer = currentSelected.length === 0 && newSelectedAnswer.length > 0;
      isAnswerChange = !isFirstAnswer && currentSelected.map(String).join(",") !== newSelectedAnswer.map(String).join(",");
    } else {
      // Single selection logic - ALWAYS replace the answer
      const previousAnswer = answers[questionId];
      newSelectedAnswer = answerId;
      isFirstAnswer = previousAnswer === undefined || previousAnswer === null || previousAnswer === "";
      isAnswerChange = !isFirstAnswer && String(previousAnswer) !== String(answerId);
    }

    const currentChangeCount = safeNumber(answerChangeCount[questionId], 0);
    const nextChangeCount = isAnswerChange ? currentChangeCount + 1 : currentChangeCount;
    let initialAnswerId = initialAnswers[questionId];

    if (isFirstAnswer) {
      initialAnswerId = actualMultipleCorrect ? newSelectedAnswer : answerId;
      setInitialAnswers((previous) => ({ ...previous, [questionId]: initialAnswerId }));
    }

    if (isAnswerChange) {
      setAnswerChangeCount((previous) => ({ ...previous, [questionId]: nextChangeCount }));
    }

    const nextAnswers = { ...answers, [questionId]: newSelectedAnswer };
    setAnswers(nextAnswers);
    setSaveStatus((previous) => ({ ...previous, [questionId]: "saving" }));

    try {
      const answerToStore = Array.isArray(newSelectedAnswer) ? newSelectedAnswer.join(",") : newSelectedAnswer;
      const result = await saveAnswer(
        sessionIdRef.current,
        questionId,
        answerToStore,
        {
          time_spent_seconds: timeSpentSeconds,
          times_changed: nextChangeCount,
          initial_answer_id: Array.isArray(initialAnswerId) ? initialAnswerId.join(",") : initialAnswerId,
          is_answer_change: isAnswerChange
        }
      );

      if (result && result.success) {
        setSaveStatus((previous) => ({ ...previous, [questionId]: "saved" }));
      } else {
        setSaveStatus((previous) => ({ ...previous, [questionId]: "error" }));
      }
    } catch (err) {
      console.error("Answer save error:", err);
      setSaveStatus((previous) => ({ ...previous, [questionId]: "error" }));
    }

    setTimeout(() => {
      setSaveStatus((previous) => {
        const next = { ...previous };
        delete next[questionId];
        return next;
      });
    }, 900);
    setQuestionStartTime(Date.now());
  }

  // ============================================================
  // LOG VIOLATION
  // ============================================================
  async function logViolation(violationType) {
    if (!sessionIdRef.current || alreadySubmitted || isAutoSubmitting || isTimeExpired) return;
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    showViolation(violationType + ". Violation " + newCount + " of 3.");
    if (newCount >= 3) {
      showViolation("Maximum violations reached. Auto-submitting assessment...");
      setTimeout(() => handleAutoSubmit("Auto-submitted due to rule violations."), 1000);
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setPageError("");
        setAccessDenied(false);
        setAlreadySubmitted(false);
        setQuestions([]);
        setAnswers({});
        setInitialAnswers({});
        setAnswerChangeCount({});
        setSaveStatus({});
        setElapsedSeconds(0);
        setViolationCount(0);
        setIsTimeExpired(false);
        sessionIdRef.current = null;
        submittingRef.current = false;
        autoSubmitRef.current = false;

        const authResponse = await supabase.auth.getSession();
        const authSession = authResponse && authResponse.data ? authResponse.data.session : null;
        if (!authSession) {
          router.push("/login");
          return;
        }
        if (!assessmentId) return;

        const currentUser = authSession.user;
        setUser(currentUser);

        // STEP 1: Get assessment details
        const assessmentData = await fetchAssessmentDetails(assessmentId);
        if (!assessmentData.success) {
          throw new Error(assessmentData.error || 'Failed to load assessment');
        }

        const assessmentInfo = assessmentData;
        setAssessment(assessmentInfo);
        setAssessmentType(assessmentInfo.assessment_type || null);
        setAssessmentTypeCode(assessmentInfo.assessment_type?.code || null);
        
        // FIXED: Use correct duration (90 for National Service, 120 for others)
        const durationMinutes = getAssessmentDuration(assessmentInfo.assessment_type?.code || null);
        const durationSeconds = durationMinutes * 60;
        setTimeLimitSeconds(durationSeconds);

        // STEP 2: Check access
        const accessData = await fetchAccess(assessmentId);
        
        if (accessData && (accessData.status === 'completed' || accessData.result_id)) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        if (accessData && accessData.status === 'blocked') {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // STEP 3: Get questions with randomization for National Service
        const questionData = await fetchQuestions(
          assessmentInfo.assessment_type_id,
          assessmentInfo.assessment_type?.code
        );
        setQuestions(questionData || []);

        // STEP 4: Create or get session
        const sessionData = await createOrGetSession(
          assessmentId,
          assessmentInfo.assessment_type_id,
          durationMinutes
        );

        if (sessionData) {
          setSession(sessionData);
          sessionIdRef.current = sessionData.id;
        }

        // STEP 5: Get existing responses if session exists
        if (sessionData && sessionData.id) {
          const responses = await getSessionResponses(sessionData.id);
          const restoredAnswers = {};
          const restoredInitialAnswers = {};
          const restoredChangeCount = {};

          if (responses && responses.answerMap) {
            Object.entries(responses.answerMap).forEach(([qId, answer]) => {
              if (typeof answer === "string" && answer.includes(",")) {
                const answerList = answer.split(",").map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
                restoredAnswers[qId] = answerList;
              } else if (answer !== null && answer !== undefined && answer !== "") {
                restoredAnswers[qId] = parseInt(answer, 10);
              }
            });
          }

          if (responses && responses.initialAnswerMap) {
            Object.entries(responses.initialAnswerMap).forEach(([qId, answer]) => {
              restoredInitialAnswers[qId] = answer;
            });
          }

          if (responses && responses.changeCountMap) {
            Object.entries(responses.changeCountMap).forEach(([qId, count]) => {
              restoredChangeCount[qId] = safeNumber(count, 0);
            });
          }

          setAnswers(restoredAnswers);
          setInitialAnswers(restoredInitialAnswers);
          setAnswerChangeCount(restoredChangeCount);
        }

        setQuestionStartTime(Date.now());
        setLoading(false);
      } catch (err) {
        console.error("Assessment initialization error:", err);
        setPageError(err && err.message ? err.message : "Failed to load assessment.");
        setLoading(false);
      }
    };

    if (assessmentId) init();
  }, [assessmentId, router]);

  // ============================================================
  // TIMER
  // ============================================================
  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session || isAutoSubmitting || questions.length === 0 || isTimeExpired) return;
    
    const timer = setInterval(() => {
      setElapsedSeconds((previous) => {
        const next = previous + 1;
        
        if (timeLimitSeconds > 0 && next >= timeLimitSeconds) {
          setIsTimeExpired(true);
          if (!autoSubmitRef.current && !submittingRef.current) {
            handleAutoSubmit("Auto-submitted because the assessment timer expired.");
          }
          return next;
        }
        return next;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, alreadySubmitted, accessDenied, session, isAutoSubmitting, timeLimitSeconds, user, assessmentId, currentIndex, questions, isTimeExpired]);

  // ============================================================
  // ANTI-CHEAT
  // ============================================================
  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session || isTimeExpired) return;

    const handleCopy = (event) => { event.preventDefault(); logViolation("Copy attempt"); return false; };
    const handlePaste = (event) => { event.preventDefault(); logViolation("Paste attempt"); return false; };
    const handleCut = (event) => { event.preventDefault(); logViolation("Cut attempt"); return false; };
    const handleContextMenu = (event) => { event.preventDefault(); logViolation("Right-click attempt"); return false; };
    const handleKeyDown = (event) => {
      const key = String(event.key || "").toLowerCase();
      if (event.key === "PrintScreen") { event.preventDefault(); logViolation("Screenshot attempt"); return false; }
      if (event.key === "F12") { event.preventDefault(); logViolation("DevTools attempt"); return false; }
      if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) { event.preventDefault(); logViolation("DevTools shortcut attempt"); return false; }
      if (event.ctrlKey && key === "u") { event.preventDefault(); logViolation("View source attempt"); return false; }
      return true;
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, alreadySubmitted, accessDenied, session, violationCount, isAutoSubmitting, isTimeExpired]);

  // ============================================================
  // NAVIGATION
  // ============================================================
  async function moveToQuestion(nextIndex) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically.");
      return;
    }
    
    if (isAutoSubmitting || nextIndex < 0 || nextIndex >= questions.length) return;
    setCurrentIndex(nextIndex);
    setQuestionStartTime(Date.now());
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!session || !session.id) {
      alert('Unable to submit: No active session found. Please refresh the page and try again.');
      return;
    }

    if (alreadySubmitted) {
      alert('This assessment has already been submitted.');
      return;
    }

    if (accessDenied) {
      alert('Access denied for this assessment.');
      return;
    }

    if (isAutoSubmitting || submittingRef.current) {
      return;
    }

    if (isTimeExpired) {
      alert('Time has expired! The assessment is being submitted automatically.');
      return;
    }

    const unansweredCount = questions.length - countAnswered(answers);
    if (unansweredCount > 0) {
      alert("Please answer all questions before submitting. " + unansweredCount + " question(s) remaining.");
      return;
    }

    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      setShowSubmitModal(false);
      
      await submitAssessment(sessionIdRef.current, false, null, false);
      
      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        router.push('/candidate/assessment-complete');
      }, 2000);
    } catch (err) {
      console.error("Submission error:", err);
      const errorMessage = err && err.message ? err.message : "Unknown error";
      alert("Failed to submit assessment: " + errorMessage + "\n\nPlease try again or contact support.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleBackClick() {
    router.push("/candidate/dashboard");
  }

  const isDisabled = alreadySubmitted || isAutoSubmitting || isTimeExpired;

  // ============================================================
  // LOADING / ERROR STATES
  // ============================================================
  if (loading) return <div style={styles.loadingContainer}><div style={styles.loadingSpinner} /><h2>Loading Assessment...</h2><p>Preparing your questions</p></div>;
  if (accessDenied) return <div style={styles.messageContainer}><div style={styles.messageCard}><div style={styles.errorIcon}>🔒</div><h2>Access Denied</h2><p>This assessment is not currently available for your account.</p><button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button></div></div>;
  if (alreadySubmitted && !showSuccessModal) return <div style={styles.messageContainer}><div style={styles.messageCard}><div style={styles.successIcon}>✅</div><h2>Assessment Completed</h2><p>This assessment has already been submitted.</p><button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button></div></div>;
  if (pageError) return <div style={styles.messageContainer}><div style={styles.messageCard}><div style={styles.errorIcon}>⚠️</div><h2>Error Loading Assessment</h2><p>{pageError}</p><button onClick={() => window.location.reload()} style={styles.primaryButton}>Try Again</button></div></div>;
  if (!questions.length) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.errorIcon}>📭</div>
          <h2>No Questions Available</h2>
          <p>This assessment does not have any questions configured yet.</p>
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {showViolationWarning && <div style={styles.violationBanner}><span>⚠️</span><span>{violationMessage}</span></div>}
      {isAutoSubmitting && <div style={styles.autoSubmitOverlay}><div style={styles.autoSubmitCard}><div style={styles.autoSubmitSpinner} /><h3>Auto-submitting assessment...</h3><p>Please wait while your assessment is submitted.</p></div></div>}
      
      {isTimeExpired && !alreadySubmitted && (
        <div style={styles.autoSubmitOverlay}>
          <div style={styles.autoSubmitCard}>
            <div style={styles.autoSubmitSpinner} />
            <h3>⏰ Time Expired!</h3>
            <p>Your assessment is being submitted automatically.</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Please wait...</p>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIcon}>📋</div>
            <h2 style={styles.modalTitle}>Ready to Submit?</h2>
            <div style={styles.modalStats}>
              <div style={styles.modalStat}><span>Questions Answered</span><strong style={{ color: successColor }}>{totalAnswered}/{questions.length}</strong></div>
              <div style={styles.modalStat}><span>Completion Rate</span><strong>{Math.round((totalAnswered / questions.length) * 100)}%</strong></div>
              <div style={styles.modalStat}><span>Answer Changes</span><strong>{totalChanges}</strong></div>
              {violationCount > 0 && <div style={styles.modalStat}><span>Violations</span><strong style={{ color: violationCount >= 3 ? dangerColor : warningColor }}>{violationCount}/3</strong></div>}
            </div>
            <div style={styles.modalWarning}><span>⚠️</span><span><strong>One attempt only:</strong> After submission, the assessment cannot be retaken unless reset by your supervisor.</span></div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowSubmitModal(false)} style={styles.modalSecondaryButton}>Continue Reviewing</button>
              <button onClick={handleSubmit} disabled={isSubmitting || isTimeExpired} style={{ ...styles.modalPrimaryButton, background: isSubmitting || isTimeExpired ? "#ccc" : successColor, cursor: isSubmitting || isTimeExpired ? "not-allowed" : "pointer" }}>{isSubmitting ? "Submitting..." : "Submit Assessment"}</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && <div style={styles.modalOverlay}><div style={{ ...styles.modalContent, textAlign: "center" }}><div style={styles.successIconLarge}>✓</div><h2 style={{ color: successColor }}>Assessment Complete!</h2><p>Your assessment has been successfully submitted.</p><p style={{ color: "#64748b" }}>Redirecting to completion page...</p></div></div>}

      {/* MAIN ASSESSMENT UI */}
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button onClick={handleBackClick} style={styles.backButton}>←</button>
              <div style={styles.brandSection}>
                <div style={styles.logoContainer}>
                  <div style={styles.logoText}>
                    <span style={styles.logoMain}>STRATAVAX</span>
                    <span style={styles.logoSub}>CAPABILITY ASSESSMENT</span>
                  </div>
                </div>
                {isNationalService && (
                  <div style={styles.nationalBadge}>
                    <span style={styles.nationalBadgeIcon}>🇬🇭</span>
                    <span style={styles.nationalBadgeText}>National Service</span>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.headerRight}>
              <div style={styles.timer}>
                <div style={styles.timerLabel}>TIME REMAINING</div>
                <div style={{ ...styles.timerValue, color: isTimeCritical ? dangerColor : accentColor }}>
                  {isTimeExpired ? "EXPIRED" : timeRemainingFormatted}
                </div>
              </div>
            </div>
          </div>
          <div style={styles.headerMetaBar}>
            <span style={styles.headerMetaItem}>Question {currentIndex + 1}</span>
            <span style={styles.headerMetaDivider}>•</span>
            <span style={styles.headerMetaItem}>{currentQuestion.section || "General"}</span>
            {/* FIXED: Only show "Select one or more answers" for non-National Service */}
            {isMultipleCorrect && !isNationalService && (
              <>
                <span style={styles.headerMetaDivider}>•</span>
                <span style={{ ...styles.headerMetaItem, color: accentColor, fontWeight: 600 }}>Select all that apply</span>
              </>
            )}
          </div>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div style={styles.mainContent}>
          {/* Left Column - Stats */}
          <div style={styles.leftSidebar}>
            <div style={styles.statusCard}>
              <div style={styles.statusNumber}>Question {currentIndex + 1}</div>
              <div style={styles.statusBadge}>
                {totalAnswered > 0 ? 'Answered' : 'Not yet answered'}
              </div>
            </div>

            <div style={styles.statsCard}>
              <div style={styles.statsRow}><span style={styles.statsLabel}>Answered</span><span style={styles.statsValue}>{totalAnswered}</span></div>
              <div style={styles.statsRow}><span style={styles.statsLabel}>Remaining</span><span style={styles.statsValue}>{questions.length - totalAnswered}</span></div>
              <div style={styles.statsRow}><span style={styles.statsLabel}>Changes</span><span style={styles.statsValue}>{totalChanges}</span></div>
              <div style={styles.statsDivider} />
              <div style={styles.statsRow}><span style={styles.statsLabel}>Progress</span><span style={styles.statsValue}>{Math.round((totalAnswered / questions.length) * 100)}%</span></div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: Math.min((totalAnswered / questions.length) * 100, 100) + '%' }} />
              </div>
            </div>

            <div style={styles.metaCard}>
              <div style={styles.metaItem}>Marked out of 1.00</div>
              <div style={styles.metaItem}>Flag question</div>
            </div>
          </div>

          {/* Middle Column - Question */}
          <div style={styles.middleColumn}>
            <div style={styles.questionCard}>
              <div style={styles.questionText}>
                {currentQuestion.question_text}
              </div>

              {/* FIXED: Only show "Select one or more answers" for non-National Service */}
              {isMultipleCorrect && !isNationalService && (
                <div style={styles.multipleHint}>
                  💡 Select one or more answers
                </div>
              )}

              <div style={styles.answersContainer}>
                {safeArray(currentQuestion.answers).map((answer, index) => {
                  const selected = isAnswerSelected(currentQuestion.id, answer.id);
                  const optionLetter = String.fromCharCode(65 + index);
                  return (
                    <button 
                      key={answer.id} 
                      className="answer-option"
                      onClick={() => handleAnswerSelect(currentQuestion.id, answer.id, isMultipleCorrect)} 
                      disabled={isDisabled}
                      style={{ 
                        ...styles.answerCard, 
                        background: selected ? "#e3f2fd" : "white", 
                        borderColor: selected ? primaryColor : "#e2e8f0",
                        opacity: isDisabled ? 0.6 : 1,
                        cursor: isDisabled ? "not-allowed" : "pointer"
                      }}
                    >
                      <div style={{ 
                        ...styles.answerCheckbox, 
                        background: selected ? primaryColor : "white", 
                        borderColor: selected ? primaryColor : "#cbd5e1"
                      }}>
                        {selected && <span style={{ color: "white", fontSize: "14px" }}>✓</span>}
                      </div>
                      <span style={{
                        flex: 1,
                        color: selected ? primaryColor : "#1e293b",
                        fontSize: "15px",
                        fontWeight: selected ? 600 : 400
                      }}>
                        {optionLetter}. {answer.answer_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div style={styles.navButtons}>
              <button 
                onClick={() => moveToQuestion(currentIndex - 1)} 
                disabled={currentIndex === 0 || isDisabled} 
                style={{ ...styles.navButton, opacity: (currentIndex === 0 || isDisabled) ? 0.5 : 1 }}
              >
                ← Previous page
              </button>
              {isLastQuestion ? (
                <button 
                  onClick={() => setShowSubmitModal(true)} 
                  disabled={isDisabled} 
                  style={styles.submitButton}
                >
                  Submit
                </button>
              ) : (
                <button 
                  onClick={() => moveToQuestion(currentIndex + 1)} 
                  disabled={isDisabled} 
                  style={styles.nextButton}
                >
                  Next page →
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Navigator */}
          <div style={styles.rightColumn}>
            <div style={styles.navigatorCard}>
              <div style={styles.navigatorHeader}>
                <span style={styles.navigatorTitle}>Quiz navigation</span>
              </div>
              <div style={styles.questionGrid}>
                {questions.map((question, index) => {
                  const questionAnswer = answers[question.id];
                  const answered = questionAnswer !== undefined && (Array.isArray(questionAnswer) ? questionAnswer.length > 0 : questionAnswer !== null);
                  const current = index === currentIndex;
                  const changed = answerChangeCount[question.id] > 0;
                  
                  let bgColor = "white";
                  let textColor = "#1e293b";
                  let borderColor = "#e2e8f0";
                  
                  if (current) {
                    bgColor = accentColor;
                    textColor = primaryColor;
                    borderColor = accentColor;
                  } else if (answered && changed) {
                    bgColor = warningColor;
                    textColor = "white";
                    borderColor = warningColor;
                  } else if (answered) {
                    bgColor = successColor;
                    textColor = "white";
                    borderColor = successColor;
                  }
                  
                  return (
                    <button 
                      key={question.id} 
                      className="navigator-item"
                      onClick={() => moveToQuestion(index)} 
                      disabled={isDisabled}
                      style={{ 
                        ...styles.gridItem, 
                        background: bgColor, 
                        color: textColor, 
                        borderColor: borderColor,
                        opacity: isDisabled ? 0.6 : 1,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        fontWeight: current ? 700 : 500,
                        boxShadow: current ? `0 0 0 2px ${accentColor}40` : 'none'
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              
              <div style={styles.legend}>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: successColor }} /><span>Answered</span></div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: warningColor }} /><span>Changed</span></div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: accentColor }} /><span>Current</span></div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "white", border: "2px solid #e2e8f0" }} /><span>Pending</span></div>
              </div>

              <div style={styles.navigatorTimer}>
                <span style={styles.navigatorTimerLabel}>⏱</span>
                <span style={styles.navigatorTimerValue}>{timeRemainingFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Injection */}
      {typeof document !== "undefined" && !document.getElementById("assessment-stratavax-styles") && (
        <style id="assessment-stratavax-styles">{`
          .answer-option {
            transition: all 0.2s ease;
            border-radius: 8px;
          }
          
          .answer-option:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(11, 42, 78, 0.15);
            border-color: #0b2a4e !important;
          }
          
          .answer-option:active:not(:disabled) {
            transform: scale(0.98);
          }

          .navigator-item {
            transition: all 0.15s ease;
            border-radius: 6px;
            font-size: 12px;
          }
          
          .navigator-item:hover:not(:disabled) {
            transform: scale(1.08);
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            z-index: 2;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  loadingContainer: { 
    minHeight: "100vh", 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    background: "linear-gradient(135deg, #f8fafc 0%, #e8eaf6 100%)", 
    gap: "20px" 
  },
  loadingSpinner: { 
    width: "50px", 
    height: "50px", 
    border: "4px solid #e2e8f0", 
    borderTop: "4px solid #0b2a4e", 
    borderRadius: "50%", 
    animation: "spin 1s linear infinite" 
  },
  messageContainer: { 
    minHeight: "100vh", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    background: "#f8fafc", 
    padding: "20px" 
  },
  messageCard: { 
    background: "white", 
    padding: "40px", 
    borderRadius: "16px", 
    maxWidth: "500px", 
    textAlign: "center", 
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)" 
  },
  errorIcon: { fontSize: "64px", marginBottom: "20px" },
  successIcon: { fontSize: "64px", marginBottom: "20px" },
  successIconLarge: { 
    width: "80px", 
    height: "80px", 
    background: "#2e7d32", 
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
    background: "#0b2a4e", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    cursor: "pointer", 
    fontSize: "14px" 
  },
  
  violationBanner: { 
    position: "fixed", 
    top: "20px", 
    left: "50%", 
    transform: "translateX(-50%)", 
    background: "#c62828", 
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
    borderTop: "4px solid #c62828", 
    borderRadius: "50%", 
    animation: "spin 1s linear infinite", 
    margin: "0 auto 20px" 
  },
  
  container: { 
    minHeight: "100vh", 
    background: "#f4f7fc", 
    display: "flex", 
    flexDirection: "column" 
  },
  
  header: { 
    position: "sticky", 
    top: 0, 
    zIndex: 100, 
    background: "linear-gradient(135deg, #0b2a4e 0%, #1b4a7a 100%)", 
    borderBottom: "3px solid #f9b83a", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", 
    flexShrink: 0 
  },
  
  headerContent: { 
    maxWidth: "1400px", 
    margin: "0 auto", 
    padding: "10px 24px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    flexWrap: "wrap", 
    gap: "8px" 
  },
  
  headerMetaBar: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "4px 24px 8px 24px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    borderTop: "1px solid rgba(255,255,255,0.08)"
  },
  
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  
  backButton: { 
    width: "36px", 
    height: "36px", 
    background: "rgba(255,255,255,0.1)", 
    border: "1px solid rgba(255,255,255,0.2)", 
    borderRadius: "8px", 
    color: "white", 
    fontSize: "16px", 
    cursor: "pointer",
    transition: "0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  
  brandSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap"
  },
  
  logoContainer: {
    display: "flex",
    alignItems: "center"
  },
  
  logoText: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.1
  },
  
  logoMain: {
    fontSize: "18px",
    fontWeight: 700,
    color: "white",
    letterSpacing: "1px"
  },
  
  logoSub: {
    fontSize: "9px",
    fontWeight: 300,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: "2px",
    textTransform: "uppercase"
  },
  
  nationalBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,255,255,0.12)",
    padding: "4px 14px 4px 10px",
    borderRadius: "40px",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(4px)"
  },
  
  nationalBadgeIcon: {
    fontSize: "16px"
  },
  
  nationalBadgeText: {
    fontSize: "11px",
    fontWeight: 500,
    color: "white",
    letterSpacing: "0.3px"
  },
  
  headerMetaItem: { 
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px"
  },
  headerMetaDivider: { 
    color: "rgba(255,255,255,0.3)",
    fontSize: "12px"
  },
  
  timer: { 
    textAlign: "right" 
  },
  
  timerLabel: { 
    fontSize: "9px", 
    fontWeight: 600, 
    textTransform: "uppercase", 
    letterSpacing: "0.5px", 
    color: "rgba(255,255,255,0.6)" 
  },
  
  timerValue: { 
    fontSize: "20px", 
    fontWeight: 700, 
    fontFamily: "monospace",
    color: "#f9b83a"
  },
  
  mainContent: { 
    maxWidth: "1400px", 
    margin: "0 auto", 
    padding: "20px 24px", 
    display: "grid", 
    gridTemplateColumns: "180px 1fr 220px", 
    gap: "20px",
    flex: 1,
    minHeight: 0,
    height: "calc(100vh - 100px)",
    maxHeight: "calc(100vh - 100px)",
    overflow: "hidden",
    boxSizing: "border-box"
  },
  
  leftSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%",
    overflow: "hidden",
    flexShrink: 0
  },
  
  statusCard: {
    background: "white",
    borderRadius: "12px",
    padding: "14px 16px",
    border: "1px solid #e2e8f0",
    flexShrink: 0
  },
  
  statusNumber: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#0f172a"
  },
  
  statusBadge: {
    fontSize: "12px",
    color: "#64748b",
    fontStyle: "italic",
    marginTop: "2px"
  },
  
  statsCard: {
    background: "white",
    borderRadius: "12px",
    padding: "14px 16px",
    border: "1px solid #e2e8f0",
    flexShrink: 0
  },
  
  statsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0"
  },
  
  statsLabel: {
    fontSize: "13px",
    color: "#64748b"
  },
  
  statsValue: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0f172a"
  },
  
  statsDivider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "6px 0"
  },
  
  progressBar: {
    height: "4px",
    background: "#e2e8f0",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "4px"
  },
  
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #f9b83a, #f5a623)",
    borderRadius: "4px",
    transition: "width 0.3s ease"
  },
  
  metaCard: {
    background: "white",
    borderRadius: "12px",
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    flexShrink: 0
  },
  
  metaItem: {
    fontSize: "13px",
    color: "#64748b",
    padding: "2px 0"
  },
  
  middleColumn: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    gap: "12px",
    minWidth: 0
  },
  
  questionCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px 24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  
  questionText: { 
    fontSize: "16px", 
    lineHeight: "1.7", 
    color: "#0f172a", 
    fontWeight: 500,
    padding: "0 4px 12px 4px",
    flexShrink: 0
  },
  
  multipleHint: { 
    padding: "8px 14px", 
    background: "#f0f4ff", 
    borderRadius: "8px", 
    fontSize: "13px", 
    color: "#0b2a4e",
    flexShrink: 0,
    marginBottom: "12px",
    borderLeft: "3px solid #f9b83a"
  },
  
  answersContainer: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px",
    flex: 1,
    overflowY: "auto",
    paddingRight: "4px",
    scrollbarWidth: "thin"
  },
  
  answerCard: { 
    padding: "10px 14px",
    border: "2px solid", 
    borderRadius: "8px", 
    cursor: "pointer", 
    textAlign: "left", 
    display: "flex", 
    alignItems: "center", 
    gap: "12px", 
    transition: "all 0.2s ease", 
    fontSize: "15px",
    flexShrink: 0,
    minHeight: "44px",
    background: "white"
  },
  
  answerCheckbox: { 
    width: "22px", 
    height: "22px", 
    borderRadius: "4px", 
    border: "2px solid", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    flexShrink: 0,
    transition: "all 0.2s ease"
  },
  
  navButtons: {
    display: "flex",
    gap: "8px",
    flexShrink: 0
  },
  
  navButton: { 
    flex: 1,
    padding: "10px 16px", 
    borderRadius: "8px", 
    fontSize: "14px", 
    fontWeight: 500, 
    border: "2px solid #e2e8f0", 
    background: "white", 
    color: "#475569", 
    cursor: "pointer",
    transition: "0.2s ease"
  },
  
  nextButton: { 
    flex: 1,
    padding: "10px 16px", 
    borderRadius: "8px", 
    fontSize: "14px", 
    fontWeight: 500, 
    border: "none", 
    background: "#0b2a4e", 
    color: "white", 
    cursor: "pointer",
    transition: "0.2s ease"
  },
  
  submitButton: { 
    flex: 1,
    padding: "10px 16px", 
    borderRadius: "8px", 
    fontSize: "14px", 
    fontWeight: 500, 
    border: "none", 
    background: "#2e7d32", 
    color: "white", 
    cursor: "pointer",
    transition: "0.2s ease"
  },
  
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    flexShrink: 0
  },
  
  navigatorCard: { 
    background: "white", 
    borderRadius: "12px", 
    padding: "16px", 
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  
  navigatorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexShrink: 0
  },
  
  navigatorTitle: { 
    fontSize: "14px", 
    fontWeight: 600, 
    color: "#0f172a"
  },
  
  questionGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(10, 1fr)", 
    gap: "4px", 
    flex: 1,
    overflowY: "auto",
    padding: "2px",
    alignContent: "start"
  },
  
  gridItem: { 
    aspectRatio: "1", 
    border: "2px solid", 
    borderRadius: "6px", 
    fontSize: "11px", 
    fontWeight: 500, 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "0",
    minHeight: "0",
    position: "relative"
  },
  
  legend: { 
    display: "flex", 
    justifyContent: "space-between", 
    padding: "8px 0 0", 
    borderTop: "1px solid #e2e8f0", 
    flexWrap: "wrap", 
    gap: "4px",
    flexShrink: 0,
    marginTop: "8px"
  },
  
  legendItem: { 
    display: "flex", 
    alignItems: "center", 
    gap: "4px", 
    fontSize: "9px", 
    color: "#64748b" 
  },
  
  legendDot: { 
    width: "10px", 
    height: "10px", 
    borderRadius: "4px" 
  },
  
  navigatorTimer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 0 0",
    borderTop: "1px solid #e2e8f0",
    marginTop: "8px",
    flexShrink: 0
  },
  
  navigatorTimerLabel: {
    fontSize: "14px"
  },
  
  navigatorTimerValue: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0b2a4e",
    fontFamily: "monospace"
  },
  
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
    zIndex: 1000, 
    backdropFilter: "blur(4px)" 
  },
  
  modalContent: { 
    background: "white", 
    padding: "32px", 
    borderRadius: "20px", 
    maxWidth: "440px", 
    width: "90%", 
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)" 
  },
  
  modalIcon: { fontSize: "48px", textAlign: "center", marginBottom: "16px" },
  modalTitle: { fontSize: "22px", fontWeight: 700, textAlign: "center", marginBottom: "20px", color: "#0f172a" },
  
  modalStats: { 
    background: "#f8fafc", 
    padding: "16px", 
    borderRadius: "12px", 
    marginBottom: "20px" 
  },
  
  modalStat: { 
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: "8px",
    fontSize: "14px"
  },
  
  modalWarning: { 
    display: "flex", 
    gap: "10px", 
    padding: "12px", 
    background: "#fff8e1", 
    borderRadius: "10px", 
    fontSize: "13px", 
    marginBottom: "20px",
    borderLeft: "3px solid #f9b83a"
  },
  
  modalActions: { 
    display: "flex", 
    gap: "12px" 
  },
  
  modalSecondaryButton: { 
    flex: 1, 
    padding: "12px", 
    background: "#f1f5f9", 
    border: "none", 
    borderRadius: "10px", 
    cursor: "pointer", 
    fontWeight: 500 
  },
  
  modalPrimaryButton: { 
    flex: 1, 
    padding: "12px", 
    background: "#2e7d32", 
    color: "white", 
    border: "none", 
    borderRadius: "10px", 
    cursor: "pointer", 
    fontWeight: 500 
  }
};

export default AssessmentPage;
