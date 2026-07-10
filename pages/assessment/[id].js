// pages/assessment/[id].js - COMPLETE FIXED LAYOUT

import { useEffect, useRef, useState } from "react";
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

function isManufacturingBaselineAssessment(assessment, assessmentType) {
  const typeId = safeNumber(
    assessment && assessment.assessment_type_id
      ? assessment.assessment_type_id
      : assessmentType && assessmentType.id
      ? assessmentType.id
      : 0,
    0
  );

  const assessmentTitle = String((assessment && assessment.title) || "").toLowerCase();
  const typeCode = String((assessmentType && assessmentType.code) || "").toLowerCase();
  const typeName = String((assessmentType && assessmentType.name) || "").toLowerCase();

  return (
    typeId === 19 ||
    assessmentTitle.includes("manufacturing baseline") ||
    typeCode.includes("manufacturing_baseline") ||
    typeCode.includes("manufacturing-baseline") ||
    typeName.includes("manufacturing baseline")
  );
}

function isMultipleCorrectQuestion(question) {
  if (!question || !Array.isArray(question.answers)) return false;
  const correctAnswers = question.answers.filter((answer) => safeNumber(answer.score, 0) === 1);
  return correctAnswers.length > 1;
}

function getRemainingFromSession(sessionData, fallbackSeconds) {
  if (!sessionData || !sessionData.expires_at) return fallbackSeconds;
  const expiresAtMs = new Date(sessionData.expires_at).getTime();
  if (Number.isNaN(expiresAtMs)) return fallbackSeconds;
  return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
}

function getAssessmentDuration(assessmentTypeCode) {
  if (assessmentTypeCode === 'national_service') {
    return 120;
  }
  return 180;
}

async function fetchCandidateAccess(userId, assessmentId) {
  const response = await supabase
    .from("candidate_assessments")
    .select("id,status,result_id,completed_at,unblocked_at,session_id")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (response.error) throw response.error;
  return response.data || null;
}

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
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(10800);
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

  const gradientStart = assessmentType && assessmentType.gradient_start ? assessmentType.gradient_start : "#0097a7";
  const gradientEnd = assessmentType && assessmentType.gradient_end ? assessmentType.gradient_end : "#006064";

  const currentQuestion = questions[currentIndex] || {};
  const allowMultipleSelection = isManufacturingBaselineAssessment(assessment, assessmentType);
  const isMultipleCorrect = allowMultipleSelection && isMultipleCorrectQuestion(currentQuestion);
  const totalAnswered = countAnswered(answers);
  const totalChanges = Object.values(answerChangeCount).reduce((a, b) => a + safeNumber(b, 0), 0);
  const isLastQuestion = currentIndex === questions.length - 1;
  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const timeRemainingFormatted = formatTime(remainingSeconds);
  const timeUsedPercent = timeLimitSeconds > 0 ? (elapsedSeconds / timeLimitSeconds) * 100 : 0;
  const isTimeWarning = timeUsedPercent > 80;
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

  async function updateAnsweredQuestionsCount(nextAnswers) {
    if (!sessionIdRef.current) return;
    const answeredCount = countAnswered(nextAnswers || answers);
    await supabase
      .from("assessment_sessions")
      .update({
        answered_questions: answeredCount,
        total_questions: questions.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionIdRef.current);
  }

  async function saveQuestionTiming(questionId, timeSpentSeconds) {
    if (!sessionIdRef.current || !questionId) return;
    const questionIdNum = parseInt(questionId, 10);
    if (Number.isNaN(questionIdNum)) return;

    try {
      await supabase.from("question_timing").upsert(
        {
          session_id: sessionIdRef.current,
          question_id: questionIdNum,
          question_number: currentIndex + 1,
          time_spent_seconds: Math.max(0, safeNumber(timeSpentSeconds, 0)),
          last_answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: "session_id,question_id" }
      );
    } catch (err) {
      console.warn("Question timing save skipped:", err);
    }
  }

  async function completeAssessmentSafely(autoSubmitted, reason) {
    if (!session || !session.id) {
      throw new Error("No active session to submit.");
    }
    
    if (!user || !assessmentId) {
      throw new Error("Missing user or assessment information.");
    }

    const lastQuestionId = questions[currentIndex] ? questions[currentIndex].id : null;
    if (lastQuestionId) {
      await saveQuestionTiming(lastQuestionId, Math.floor((Date.now() - questionStartTime) / 1000));
    }

    await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, lastQuestionId);
    await updateSessionTimer(session.id, elapsedSeconds);
    await updateAnsweredQuestionsCount(answers);

    const result = await submitAssessment(session.id, {
      autoSubmitted: autoSubmitted === true,
      autoSubmitReason: reason || null,
      allowIncomplete: autoSubmitted === true
    });
    
    return result;
  }

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

      const currentQuestionId = questions[currentIndex]?.id || null;
      
      const answerPromises = Object.entries(answers).map(([qId, answer]) => {
        if (answer === null || answer === undefined || answer === '') return null;
        
        const answerToStore = Array.isArray(answer) ? answer.join(",") : String(answer);
        const changeCount = answerChangeCount[qId] || 0;
        const initialAns = initialAnswers[qId] || answer;
        
        return saveUniqueResponse(
          session.id,
          user.id,
          assessmentId,
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

      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, currentQuestionId);
      await updateSessionTimer(session.id, elapsedSeconds);
      await updateAnsweredQuestionsCount(answers);

      const result = await submitAssessment(session.id, {
        autoSubmitted: true,
        autoSubmitReason: reason || 'Auto-submitted because the assessment timer expired.',
        allowIncomplete: true
      });

      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        const resultId = result.result_id || result.id || result.result?.id;
        if (resultId) {
          router.push(`/candidate/results/${resultId}`);
        } else {
          router.push('/candidate/dashboard');
        }
      }, 2000);

    } catch (err) {
      console.error('[AutoSubmit] Failed:', err);
      alert('Auto-submit failed. Please contact support with this error: ' + (err.message || 'Unknown error'));
      
      try {
        await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex]?.id || null);
      } catch (saveErr) {
        console.error('[AutoSubmit] Failed to save progress:', saveErr);
      }
      
      setTimeout(() => {
        router.push('/candidate/dashboard');
      }, 3000);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setIsAutoSubmitting(false);
    }
  }

  async function logViolation(violationType) {
    if (!sessionIdRef.current || alreadySubmitted || isAutoSubmitting || isTimeExpired) return;
    const newCount = violationCount + 1;
    setViolationCount(newCount);

    try {
      await supabase
        .from("assessment_sessions")
        .update({ violation_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current);
      await supabase.from("assessment_violations").insert({
        session_id: sessionIdRef.current,
        user_id: user ? user.id : null,
        assessment_id: assessmentId,
        violation_type: violationType,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Violation logging failed:", err);
    }

    showViolation(violationType + ". Violation " + newCount + " of 3.");
    if (newCount >= 3) {
      showViolation("Maximum violations reached. Auto-submitting assessment...");
      setTimeout(() => handleAutoSubmit("Auto-submitted due to rule violations."), 1000);
    }
  }

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

        const completed = await isAssessmentCompleted(currentUser.id, assessmentId);
        if (completed) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        const accessData = await fetchCandidateAccess(currentUser.id, assessmentId);
        if (!accessData || !["unblocked", "in_progress"].includes(accessData.status)) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);
        setAssessmentType(assessmentData ? assessmentData.assessment_type : null);
        
        const typeCode = assessmentData?.assessment_type?.code || null;
        setAssessmentTypeCode(typeCode);

        const allowMultipleForThisAssessment = isManufacturingBaselineAssessment(
          assessmentData,
          assessmentData ? assessmentData.assessment_type : null
        );

        const sessionData = await createAssessmentSession(
          currentUser.id,
          assessmentId,
          assessmentData && assessmentData.assessment_type_id ? assessmentData.assessment_type_id : null
        );

        if (!sessionData || !sessionData.id) throw new Error("Unable to create assessment session.");
        setSession(sessionData);
        sessionIdRef.current = sessionData.id;

        const progress = await getProgress(currentUser.id, assessmentId);
        const progressElapsed = progress && progress.elapsed_seconds ? safeNumber(progress.elapsed_seconds, 0) : 0;
        setElapsedSeconds(progressElapsed);
        
        const durationMinutes = getAssessmentDuration(typeCode);
        const durationSeconds = durationMinutes * 60;
        setTimeLimitSeconds(progressElapsed + getRemainingFromSession(sessionData, durationSeconds));

        let uniqueQuestions = [];
        try {
          uniqueQuestions = safeArray(await getUniqueQuestions(assessmentId));
        } catch (questionsError) {
          console.error("[Assessment] Error fetching questions:", questionsError);
          uniqueQuestions = [];
        }
        
        setQuestions(uniqueQuestions);
        
        if (uniqueQuestions.length === 0) {
          setLoading(false);
          return;
        }

        const responses = await getSessionResponses(sessionData.id);
        const restoredAnswers = {};
        const restoredInitialAnswers = {};
        const restoredChangeCount = {};

        if (responses && responses.answerMap) {
          Object.entries(responses.answerMap).forEach(([qId, answer]) => {
            if (typeof answer === "string" && answer.includes(",")) {
              const answerList = answer.split(",").map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));
              restoredAnswers[qId] = allowMultipleForThisAssessment ? answerList : answerList[0];
            } else if (answer !== null && answer !== undefined && answer !== "") {
              restoredAnswers[qId] = parseInt(answer, 10);
            }
          });
        }

        if (responses && responses.initialAnswerMap) {
          Object.entries(responses.initialAnswerMap).forEach(([qId, answer]) => {
            if (typeof answer === "string" && answer.includes(",") && !allowMultipleForThisAssessment) {
              const firstAnswer = answer.split(",").map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id))[0];
              restoredInitialAnswers[qId] = firstAnswer;
            } else {
              restoredInitialAnswers[qId] = answer;
            }
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

        if (progress && progress.last_question_id) {
          const lastIndex = uniqueQuestions.findIndex((question) => String(question.id) === String(progress.last_question_id));
          if (lastIndex >= 0) setCurrentIndex(lastIndex);
        }

        const violationResponse = await supabase
          .from("assessment_sessions")
          .select("violation_count")
          .eq("id", sessionData.id)
          .maybeSingle();
        if (violationResponse.data && violationResponse.data.violation_count) {
          setViolationCount(safeNumber(violationResponse.data.violation_count, 0));
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
        
        if (next % 30 === 0 && session && user) {
          const currentQuestionId = questions[currentIndex] ? questions[currentIndex].id : null;
          saveProgress(session.id, user.id, assessmentId, next, currentQuestionId);
          updateSessionTimer(session.id, next);
        }
        
        return next;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [loading, alreadySubmitted, accessDenied, session, isAutoSubmitting, timeLimitSeconds, user, assessmentId, currentIndex, questions, isTimeExpired]);

  async function handleAnswerSelect(questionId, answerId, multipleCorrect) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically.");
      return;
    }
    
    if (alreadySubmitted || !session || !user || !questionId || !answerId || accessDenied || isAutoSubmitting) return;

    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    let newSelectedAnswer;
    let isAnswerChange = false;
    let isFirstAnswer = false;

    if (multipleCorrect) {
      const currentSelected = getSelectedAnswersForQuestion(questionId);
      if (currentSelected.map(String).includes(String(answerId))) {
        newSelectedAnswer = currentSelected.filter((id) => String(id) !== String(answerId));
      } else {
        newSelectedAnswer = currentSelected.concat([answerId]);
      }
      isFirstAnswer = currentSelected.length === 0 && newSelectedAnswer.length > 0;
      isAnswerChange = !isFirstAnswer && currentSelected.map(String).join(",") !== newSelectedAnswer.map(String).join(",");
    } else {
      const previousAnswer = answers[questionId];
      newSelectedAnswer = answerId;
      isFirstAnswer = previousAnswer === undefined || previousAnswer === null || previousAnswer === "";
      isAnswerChange = !isFirstAnswer && String(previousAnswer) !== String(answerId);
    }

    const currentChangeCount = safeNumber(answerChangeCount[questionId], 0);
    const nextChangeCount = isAnswerChange ? currentChangeCount + 1 : currentChangeCount;
    let initialAnswerId = initialAnswers[questionId];

    if (isFirstAnswer) {
      initialAnswerId = multipleCorrect ? newSelectedAnswer : answerId;
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
      const result = await saveUniqueResponse(session.id, user.id, assessmentId, questionId, answerToStore, {
        time_spent_seconds: timeSpentSeconds,
        times_changed: nextChangeCount,
        initial_answer_id: Array.isArray(initialAnswerId) ? initialAnswerId.join(",") : initialAnswerId,
        is_answer_change: isAnswerChange
      });

      if (result && result.success) {
        setSaveStatus((previous) => ({ ...previous, [questionId]: "saved" }));
        await saveQuestionTiming(questionId, timeSpentSeconds);
        await updateAnsweredQuestionsCount(nextAnswers);
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

  async function moveToQuestion(nextIndex) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically.");
      return;
    }
    
    if (isAutoSubmitting || nextIndex < 0 || nextIndex >= questions.length) return;
    const currentQuestionId = questions[currentIndex] ? questions[currentIndex].id : null;
    if (currentQuestionId) {
      const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
      await saveQuestionTiming(currentQuestionId, timeSpentSeconds);
      if (session && user) await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, currentQuestionId);
    }
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
      
      const result = await completeAssessmentSafely(false, null);
      
      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      setTimeout(() => {
        const resultId = result.result_id || result.id || result.result?.id;
        if (resultId) {
          router.push(`/candidate/results/${resultId}`);
        } else {
          router.push('/candidate/dashboard');
        }
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
    if (session && user && !alreadySubmitted && !isTimeExpired) {
      const currentQuestionId = questions[currentIndex] ? questions[currentIndex].id : null;
      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, currentQuestionId);
      await updateSessionTimer(session.id, elapsedSeconds);
    }
    router.push("/candidate/dashboard");
  }

  const isDisabled = alreadySubmitted || isAutoSubmitting || isTimeExpired;

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
          <div style={styles.debugInfo}>
            <p><strong>Assessment ID:</strong> {assessmentId}</p>
            <p><strong>Assessment Name:</strong> {assessment?.title || "N/A"}</p>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "10px" }}>
              Please contact your supervisor or the system administrator to add questions to this assessment.
            </p>
          </div>
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button>
        </div>
      </div>
    );
  }

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
              <div style={styles.modalStat}><span>Questions Answered</span><strong style={{ color: "#4caf50" }}>{totalAnswered}/{questions.length}</strong></div>
              <div style={styles.modalStat}><span>Completion Rate</span><strong>{Math.round((totalAnswered / questions.length) * 100)}%</strong></div>
              <div style={styles.modalStat}><span>Answer Changes</span><strong>{totalChanges}</strong></div>
              {violationCount > 0 && <div style={styles.modalStat}><span>Violations</span><strong style={{ color: violationCount >= 3 ? "#f44336" : "#ff9800" }}>{violationCount}/3</strong></div>}
            </div>
            <div style={styles.modalWarning}><span>⚠️</span><span><strong>One attempt only:</strong> After submission, the assessment cannot be retaken unless reset by your supervisor.</span></div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowSubmitModal(false)} style={styles.modalSecondaryButton}>Continue Reviewing</button>
              <button onClick={handleSubmit} disabled={isSubmitting || isTimeExpired} style={{ ...styles.modalPrimaryButton, background: isSubmitting || isTimeExpired ? "#ccc" : "#4caf50", cursor: isSubmitting || isTimeExpired ? "not-allowed" : "pointer" }}>{isSubmitting ? "Submitting..." : "Submit Assessment"}</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && <div style={styles.modalOverlay}><div style={{ ...styles.modalContent, textAlign: "center" }}><div style={styles.successIconLarge}>✓</div><h2 style={{ color: "#2e7d32" }}>Assessment Complete!</h2><p>Your assessment has been successfully submitted.</p><p style={{ color: "#64748b" }}>Redirecting to dashboard...</p></div></div>}

      <div style={styles.container}>
        <div style={{ ...styles.header, background: "linear-gradient(135deg, " + gradientStart + ", " + gradientEnd + ")" }}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button onClick={handleBackClick} style={styles.backButton}>←</button>
              <div>
                <div style={styles.headerTitle}>{assessment ? assessment.title : "Assessment"}</div>
                <div style={styles.headerMeta}>
                  Question {currentIndex + 1} of {questions.length} • {currentQuestion.section || "General"}
                  {isMultipleCorrect && <span style={{ marginLeft: "10px", color: "#ffeb3b", fontSize: "12px" }}>(Select all that apply)</span>}
                  {isTimeExpired && <span style={{ marginLeft: "10px", color: "#ffeb3b", fontSize: "12px" }}>⏰ TIME EXPIRED - Auto-submitting...</span>}
                </div>
              </div>
            </div>
            <div style={styles.headerRight}>
              {violationCount > 0 && <div style={{ background: violationCount >= 3 ? "#f44336" : "#ff9800", color: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>⚠️ {violationCount}/3 Violations</div>}
              <div style={{ ...styles.timer, background: isTimeCritical ? "rgba(211,47,47,0.2)" : isTimeWarning ? "rgba(255,152,0,0.2)" : "rgba(255,255,255,0.15)", border: isTimeExpired ? "2px solid #f44336" : "1px solid rgba(255,255,255,0.3)" }}>
                <div style={styles.timerLabel}>TIME REMAINING</div>
                <div style={{ ...styles.timerValue, color: isTimeCritical ? "#ffebee" : isTimeWarning ? "#fff3e0" : "white" }}>
                  {isTimeExpired ? "EXPIRED" : timeRemainingFormatted}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            MAIN CONTENT - FIXED GRID LAYOUT (Professional Assessment Standard)
            ============================================================ */}
        <div style={styles.mainContent}>
          {/* Question Column */}
          <div style={styles.questionColumn}>
            <div style={styles.questionCard}>
              {/* Question Area - FIXED 130px with scroll */}
              <div style={styles.questionArea}>
                <div style={styles.questionText}>
                  {currentQuestion.question_text}
                </div>
                {answerChangeCount[currentQuestion.id] > 0 && (
                  <div style={styles.changeIndicator}>
                    ✏️ Changed answer {answerChangeCount[currentQuestion.id]} time{answerChangeCount[currentQuestion.id] !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              
              {/* Answers Area - Fills remainder with scroll */}
              <div style={styles.answersArea}>
                <div style={styles.answersContainer}>
                  {safeArray(currentQuestion.answers).map((answer, index) => {
                    const selected = isAnswerSelected(currentQuestion.id, answer.id);
                    const optionLetter = String.fromCharCode(65 + index);
                    return (
                      <button 
                        key={answer.id} 
                        onClick={() => handleAnswerSelect(currentQuestion.id, answer.id, isMultipleCorrect)} 
                        disabled={isDisabled}
                        style={{ 
                          ...styles.answerCard, 
                          background: selected ? "linear-gradient(135deg, " + gradientStart + ", " + gradientEnd + ")" : "white", 
                          borderColor: selected ? gradientStart : "#e2e8f0", 
                          opacity: isDisabled ? 0.6 : 1,
                          cursor: isDisabled ? "not-allowed" : "pointer"
                        }}
                      >
                        <div style={{ 
                          ...styles.answerLetter, 
                          background: selected ? "rgba(255,255,255,0.2)" : "#f1f5f9", 
                          color: selected ? "white" : "#475569" 
                        }}>
                          {optionLetter}
                        </div>
                        <span style={{
                          flex: 1,
                          overflowY: "auto",
                          maxHeight: "45px",
                          lineHeight: "1.4",
                          color: selected ? "white" : "#1e293b",
                          fontSize: "14px"
                        }}>
                          {answer.answer_text}
                          {isMultipleCorrect && selected && <span style={{ marginLeft: "6px", fontSize: "11px" }}>✓</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {/* ============================================================
                    FIX 1: multipleHint moved INSIDE answersArea
                    ============================================================ */}
                {isMultipleCorrect && (
                  <div style={styles.multipleHint}>
                    💡 This question has multiple correct answers. Select all that apply.
                  </div>
                )}
              </div>
              
              {/* Navigation - FIXED 65px at bottom */}
              <div style={styles.navigation}>
                <button onClick={() => moveToQuestion(currentIndex - 1)} disabled={currentIndex === 0 || isDisabled} style={{ ...styles.navButton, opacity: (currentIndex === 0 || isDisabled) ? 0.5 : 1 }}>← Previous</button>
                <div style={styles.navCenter}>
                  <span style={styles.navProgress}>{currentIndex + 1} / {questions.length}</span>
                </div>
                {isLastQuestion ? (
                  <button onClick={() => setShowSubmitModal(true)} disabled={isDisabled} style={styles.submitButton}>Submit</button>
                ) : (
                  <button onClick={() => moveToQuestion(currentIndex + 1)} disabled={isDisabled} style={styles.nextButton}>Next →</button>
                )}
              </div>
            </div>
          </div>

          {/* Navigator - FIXED height */}
          <div style={styles.navigatorColumn}>
            <div style={styles.navigatorCard}>
              <h3 style={styles.navigatorTitle}>Question Navigator</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}><div style={styles.statValue}>{totalAnswered}</div><div style={styles.statLabel}>Answered</div></div>
                <div style={styles.statCard}><div style={styles.statValue}>{questions.length - totalAnswered}</div><div style={styles.statLabel}>Remaining</div></div>
                <div style={styles.statCard}><div style={styles.statValue}>{totalChanges}</div><div style={styles.statLabel}>Changes</div></div>
              </div>
              <div style={styles.questionGrid}>
                {questions.map((question, index) => {
                  const questionAnswer = answers[question.id];
                  const answered = questionAnswer !== undefined && (Array.isArray(questionAnswer) ? questionAnswer.length > 0 : questionAnswer !== null);
                  const current = index === currentIndex;
                  const changed = answerChangeCount[question.id] > 0;
                  return (
                    <button 
                      key={question.id} 
                      onClick={() => moveToQuestion(index)} 
                      disabled={isDisabled}
                      style={{ 
                        ...styles.gridItem, 
                        background: current ? gradientStart : answered ? changed ? "#ff9800" : "#4caf50" : "white", 
                        color: current || answered ? "white" : "#1e293b", 
                        borderColor: current ? gradientStart : "#e2e8f0", 
                        opacity: isDisabled ? 0.6 : 1,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transform: current ? "scale(1.1)" : "scale(1)",
                        boxShadow: current ? "0 2px 8px rgba(0,0,0,0.2)" : "none"
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div style={styles.legend}>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "#4caf50" }} />Answered</div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "#ff9800" }} />Changed</div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: gradientStart }} />Current</div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "white", border: "2px solid #e2e8f0" }} />Pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// STYLES - FIXED GRID LAYOUT (All Issues Addressed)
// ============================================================

const styles = {
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: "20px" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid #e2e8f0", borderTop: "4px solid #0097a7", borderRadius: "50%", animation: "spin 1s linear infinite" },
  messageContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0097a7 0%, #006064 100%)", padding: "20px" },
  messageCard: { background: "white", padding: "40px", borderRadius: "16px", maxWidth: "500px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  errorIcon: { fontSize: "64px", marginBottom: "20px" },
  successIcon: { fontSize: "64px", marginBottom: "20px" },
  successIconLarge: { width: "80px", height: "80px", background: "#4caf50", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "40px", color: "white" },
  primaryButton: { padding: "12px 30px", background: "linear-gradient(135deg, #0097a7, #006064)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  debugInfo: { background: "#f8fafc", padding: "15px", borderRadius: "8px", margin: "15px 0", fontSize: "14px", textAlign: "left" },
  violationBanner: { position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#f44336", color: "white", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", zIndex: 10001, fontSize: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "10px" },
  autoSubmitOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002 },
  autoSubmitCard: { background: "white", padding: "30px", borderRadius: "16px", textAlign: "center", maxWidth: "400px" },
  autoSubmitSpinner: { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #f44336", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  container: { minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" },
  header: { position: "sticky", top: 0, zIndex: 100, color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", flexShrink: 0 },
  headerContent: { maxWidth: "1400px", margin: "0 auto", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" },
  backButton: { width: "34px", height: "34px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", color: "white", fontSize: "16px", cursor: "pointer" },
  headerTitle: { fontSize: "17px", fontWeight: 700, marginBottom: "1px" },
  headerMeta: { fontSize: "12px", opacity: 0.9 },
  timer: { padding: "4px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.3)", textAlign: "center", minWidth: "110px" },
  timerLabel: { fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" },
  timerValue: { fontSize: "20px", fontWeight: 900, fontFamily: "monospace" },
  
  // ============================================================
  // MAIN CONTENT - FIXED GRID (Never changes size)
  // FIX 3: Use minmax(0, 1fr) for middle row
  // ============================================================
  mainContent: { 
    maxWidth: "1400px", 
    margin: "0 auto", 
    padding: "10px 16px", 
    display: "grid", 
    gridTemplateColumns: "1fr 260px", 
    gap: "16px",
    flex: 1,
    minHeight: 0,
    height: "calc(100vh - 78px)",
    maxHeight: "calc(100vh - 78px)",
    overflow: "hidden",
    boxSizing: "border-box"
  },
  
  questionColumn: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "6px", 
    minHeight: 0, 
    height: "100%",
    maxHeight: "100%",
    overflow: "hidden"
  },
  
  // ============================================================
  // FIX 2: questionCard with correct grid rows
  // FIX 3: Use minmax(0, 1fr) for middle row
  // ============================================================
  questionCard: { 
    background: "white", 
    borderRadius: "14px", 
    padding: "16px 20px", 
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "grid",
    gridTemplateRows: "130px minmax(0, 1fr) 65px",
    height: "100%",
    overflow: "hidden",
    gap: "8px",
    boxSizing: "border-box"
  },
  
  // Question Area - FIXED 130px
  questionArea: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden"
  },
  
  // FIX 2: questionText uses height: 100% with maxHeight
  questionText: { 
    fontSize: "17px", 
    lineHeight: "1.5", 
    color: "#1e293b", 
    fontWeight: 500,
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: "8px",
    height: "100%",
    maxHeight: "105px",
    overflowY: "auto",
    scrollbarWidth: "thin",
    boxSizing: "border-box",
    flexShrink: 1
  },
  
  changeIndicator: { 
    padding: "2px 10px", 
    background: "#FFF8E1", 
    borderRadius: "6px", 
    fontSize: "11px", 
    color: "#F57C00", 
    marginTop: "4px",
    display: "inline-block",
    flexShrink: 0
  },
  
  // Answers Area - Fills remainder with minmax(0, 1fr)
  answersArea: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden"
  },
  
  answersContainer: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "6px",
    overflowY: "auto",
    minHeight: 0,
    height: "100%",
    paddingRight: "4px",
    scrollbarWidth: "thin"
  },
  
  answerCard: { 
    minHeight: "52px",
    maxHeight: "52px",
    padding: "8px 12px",
    border: "2px solid", 
    borderRadius: "8px", 
    cursor: "pointer", 
    textAlign: "left", 
    display: "flex", 
    alignItems: "center", 
    gap: "10px", 
    transition: "all 0.15s", 
    fontSize: "14px",
    flexShrink: 0,
    overflow: "hidden"
  },
  
  answerLetter: { 
    width: "24px", 
    height: "24px", 
    borderRadius: "5px", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontSize: "12px", 
    fontWeight: 700,
    flexShrink: 0
  },
  
  // FIX 1: multipleHint moved inside answersArea
  multipleHint: { 
    padding: "4px 10px", 
    background: "#E3F2FD", 
    borderRadius: "4px", 
    fontSize: "11px", 
    color: "#1565C0",
    flexShrink: 0,
    marginTop: "4px"
  },
  
  // Navigation - FIXED 65px at bottom
  navigation: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center",
    gap: "8px", 
    paddingTop: "8px",
    borderTop: "1px solid #e2e8f0",
    flexShrink: 0,
    height: "65px"
  },
  
  navCenter: { display: "flex", alignItems: "center", gap: "6px" },
  navProgress: { fontSize: "13px", color: "#64748b", fontWeight: 500 },
  navButton: { padding: "6px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "2px solid #0097a7", background: "white", color: "#0097a7", cursor: "pointer" },
  nextButton: { padding: "6px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "none", background: "linear-gradient(135deg, #0097a7, #006064)", color: "white", cursor: "pointer" },
  submitButton: { padding: "6px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "none", background: "#4caf50", color: "white", cursor: "pointer" },
  
  // Navigator - FIXED height
  navigatorColumn: { 
    display: "flex", 
    flexDirection: "column",
    height: "100%",
    maxHeight: "100%",
    minHeight: 0
  },
  
  navigatorCard: { 
    background: "white", 
    borderRadius: "14px", 
    padding: "12px 14px", 
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    maxHeight: "100%",
    overflow: "hidden"
  },
  
  navigatorTitle: { fontSize: "13px", fontWeight: 600, color: "#0a1929", margin: "0 0 6px 0", flexShrink: 0 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", marginBottom: "6px", flexShrink: 0 },
  statCard: { background: "#f8fafc", padding: "4px 2px", borderRadius: "4px", textAlign: "center" },
  statValue: { fontSize: "14px", fontWeight: 900 },
  statLabel: { fontSize: "8px", color: "#64748b", marginTop: "1px" },
  
  questionGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(10, 1fr)", 
    gap: "3px", 
    marginBottom: "4px",
    flex: 1,
    overflowY: "auto",
    padding: "2px",
    alignContent: "start"
  },
  
  gridItem: { 
    aspectRatio: "1", 
    border: "2px solid", 
    borderRadius: "4px", 
    fontSize: "10px", 
    fontWeight: 700, 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    cursor: "pointer",
    transition: "all 0.15s",
    minWidth: "0",
    minHeight: "0"
  },
  
  legend: { 
    display: "flex", 
    justifyContent: "space-between", 
    padding: "4px 0", 
    borderTop: "1px solid #e2e8f0", 
    flexWrap: "wrap", 
    gap: "3px",
    flexShrink: 0
  },
  
  legendItem: { display: "flex", alignItems: "center", gap: "3px", fontSize: "9px" },
  legendDot: { width: "6px", height: "6px", borderRadius: "2px" },
  
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "30px", borderRadius: "20px", maxWidth: "450px", width: "90%" },
  modalIcon: { fontSize: "48px", textAlign: "center", marginBottom: "15px" },
  modalTitle: { fontSize: "24px", fontWeight: 700, textAlign: "center", marginBottom: "20px" },
  modalStats: { background: "#f8fafc", padding: "15px", borderRadius: "12px", marginBottom: "20px" },
  modalStat: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
  modalWarning: { display: "flex", gap: "10px", padding: "12px", background: "#fff8e1", borderRadius: "10px", fontSize: "13px", marginBottom: "20px" },
  modalActions: { display: "flex", gap: "12px" },
  modalSecondaryButton: { flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "10px", cursor: "pointer" },
  modalPrimaryButton: { flex: 1, padding: "12px", background: "#4caf50", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }
};

if (typeof document !== "undefined" && !document.getElementById("assessment-spin-keyframes")) {
  const style = document.createElement("style");
  style.id = "assessment-spin-keyframes";
  style.textContent = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
  document.head.appendChild(style);
}

export default AssessmentPage;
