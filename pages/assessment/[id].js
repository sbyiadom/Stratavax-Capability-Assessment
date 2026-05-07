// pages/assessment/[id].js

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

const AssessmentPage = dynamic(() => Promise.resolve(AssessmentContent), { ssr: false });

function safeNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallbackValue;
  return numberValue;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatTime(seconds) {
  var safeSeconds = Math.max(0, Math.floor(safeNumber(seconds, 0)));
  var hrs = Math.floor(safeSeconds / 3600);
  var mins = Math.floor((safeSeconds % 3600) / 60);
  var secs = safeSeconds % 60;
  return hrs.toString().padStart(2, "0") + ":" + mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
}

function isMultipleCorrectQuestion(question) {
  var correctAnswers;
  if (!question || !Array.isArray(question.answers)) return false;
  correctAnswers = question.answers.filter(function (answer) {
    return safeNumber(answer.score, 0) === 1;
  });
  return correctAnswers.length > 1;
}

function getAnswerArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function countAnswered(answerMap) {
  return Object.values(answerMap || {}).filter(function (answer) {
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== null && answer !== undefined && answer !== "";
  }).length;
}

function getSessionBasedLimit(sessionData, progressElapsed, defaultLimit) {
  var elapsed = safeNumber(progressElapsed, 0);
  var fallbackLimit = defaultLimit || 10800;
  var expiresAt;
  var remaining;

  if (!sessionData || !sessionData.expires_at) return fallbackLimit;
  expiresAt = new Date(sessionData.expires_at).getTime();
  if (Number.isNaN(expiresAt)) return fallbackLimit;
  remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  if (remaining <= 0) return elapsed;
  return elapsed + remaining;
}

function parseDateMs(value) {
  var ms;
  if (!value) return 0;
  ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return 0;
  return ms;
}

function clearBrowserAttemptStorage(userId, assessmentId) {
  var stores;
  var patterns;

  if (typeof window === "undefined") return;

  stores = [window.localStorage, window.sessionStorage].filter(Boolean);
  patterns = [
    String(assessmentId || ""),
    String(userId || "") + "_" + String(assessmentId || ""),
    String(userId || "") + ":" + String(assessmentId || ""),
    "assessment_" + String(assessmentId || ""),
    "responses_" + String(assessmentId || ""),
    "answers_" + String(assessmentId || ""),
    "answerChanges_" + String(assessmentId || ""),
    "questionTiming_" + String(assessmentId || ""),
    "behavioral_" + String(assessmentId || "")
  ].filter(Boolean);

  stores.forEach(function (store) {
    var keys = [];
    var i;
    var key;

    try {
      for (i = 0; i < store.length; i += 1) {
        key = store.key(i);
        if (key) keys.push(key);
      }

      keys.forEach(function (storageKey) {
        var lowerKey = String(storageKey).toLowerCase();
        var shouldRemove = patterns.some(function (pattern) {
          return pattern && lowerKey.indexOf(String(pattern).toLowerCase()) >= 0;
        });
        if (shouldRemove) store.removeItem(storageKey);
      });
    } catch (storageError) {
      console.warn("Unable to clear browser attempt storage:", storageError);
    }
  });
}

async function fetchCandidateAccess(userId, assessmentId) {
  var response;

  response = await supabase
    .from("candidate_assessments")
    .select("id, status, result_id, completed_at, unblocked_at, session_id")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  if (response.error) throw response.error;
  return response.data || null;
}

async function collectSessionIds(userId, assessmentId) {
  var response;

  try {
    response = await supabase
      .from("assessment_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (response.error) return [];
    return safeArray(response.data).map(function (row) { return row.id; }).filter(Boolean);
  } catch (error) {
    return [];
  }
}

async function safeDelete(tableName, filters) {
  var query;
  var i;

  try {
    query = supabase.from(tableName).delete();
    for (i = 0; i < filters.length; i += 1) {
      if (filters[i].operator === "in") query = query.in(filters[i].column, filters[i].value);
      else query = query.eq(filters[i].column, filters[i].value);
    }
    await query;
  } catch (error) {
    console.warn("Cleanup skipped for " + tableName + ":", error && error.message ? error.message : error);
  }
}

async function clearStaleAttemptData(userId, assessmentId) {
  var sessionIds;

  sessionIds = await collectSessionIds(userId, assessmentId);

  if (sessionIds.length > 0) {
    await safeDelete("answer_history", [{ column: "session_id", operator: "in", value: sessionIds }]);
    await safeDelete("question_timing", [{ column: "session_id", operator: "in", value: sessionIds }]);
    await safeDelete("candidate_personality_scores", [{ column: "session_id", operator: "in", value: sessionIds }]);
  }

  await safeDelete("assessment_violations", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ]);

  await safeDelete("responses", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ]);

  await safeDelete("behavioral_metrics", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ]);

  await safeDelete("assessment_progress", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ]);

  await safeDelete("assessment_sessions", [
    { column: "user_id", value: userId },
    { column: "assessment_id", value: assessmentId }
  ]);

  await supabase
    .from("candidate_assessments")
    .update({ session_id: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId);
}

function isSessionOlderThanUnblock(sessionData, accessData) {
  var unblockedAt;
  var sessionCreatedAt;
  var sessionUpdatedAt;

  if (!sessionData || !accessData || !accessData.unblocked_at) return false;

  unblockedAt = parseDateMs(accessData.unblocked_at);
  sessionCreatedAt = parseDateMs(sessionData.created_at);
  sessionUpdatedAt = parseDateMs(sessionData.updated_at);

  if (!unblockedAt) return false;
  if (sessionCreatedAt && sessionCreatedAt < unblockedAt) return true;
  if (sessionUpdatedAt && sessionUpdatedAt < unblockedAt) return true;

  return false;
}

function isFreshResetAccess(accessData) {
  return !!accessData && accessData.status === "unblocked" && !accessData.result_id && !accessData.completed_at;
}

function AssessmentContent() {
  const router = useRouter();
  const assessmentId = router.query.id || router.query.assessment_id;

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
  const autoSubmitRef = useRef(false);
  const submittingRef = useRef(false);

  const [violationCount, setViolationCount] = useState(0);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimit, setTimeLimit] = useState(10800);

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

  const getGradientStart = () => (assessmentType && assessmentType.gradient_start ? assessmentType.gradient_start : DEFAULT_GRADIENT_START);
  const getGradientEnd = () => (assessmentType && assessmentType.gradient_end ? assessmentType.gradient_end : DEFAULT_GRADIENT_END);

  const getSelectedAnswersForQuestion = (questionId) => getAnswerArray(answers[questionId]);

  const isAnswerSelected = (questionId, answerId) => {
    const selected = getSelectedAnswersForQuestion(questionId);
    return selected.map(String).includes(String(answerId));
  };

  const resetClientAttemptState = () => {
    setCurrentIndex(0);
    setAnswers({});
    setInitialAnswers({});
    setAnswerChangeCount({});
    setSaveStatus({});
    setQuestionTimings({});
    setElapsedSeconds(0);
    setViolationCount(0);
    setAlreadySubmitted(false);
    setAccessDenied(false);
    setShowSubmitModal(false);
    setIsSubmitting(false);
    setIsAutoSubmitting(false);
    sessionIdRef.current = null;
    autoSubmitRef.current = false;
    submittingRef.current = false;
    setQuestionStartTime(Date.now());
  };

  const showViolationWarningMessage = (message) => {
    setViolationMessage(message);
    setShowViolationWarning(true);
    setTimeout(() => setShowViolationWarning(false), 3000);
  };

  const updateAnsweredQuestionsCount = async (answerMapOverride) => {
    var answerMap = answerMapOverride || answers;
    var answeredCount;

    if (!sessionIdRef.current) return;

    answeredCount = countAnswered(answerMap);

    const { error: updateError } = await supabase
      .from("assessment_sessions")
      .update({
        answered_questions: answeredCount,
        total_questions: questions.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionIdRef.current);

    if (updateError) console.error("Error updating answered questions count:", updateError);
  };

  const markCandidateAssessmentCompleted = async (resultId, autoSubmitted, reason) => {
    if (!user || !assessmentId) return;

    await supabase
      .from("candidate_assessments")
      .update({
        status: "completed",
        result_id: resultId || null,
        completed_at: new Date().toISOString(),
        session_id: sessionIdRef.current || null,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id)
      .eq("assessment_id", assessmentId);

    if (autoSubmitted && sessionIdRef.current) {
      await supabase
        .from("assessment_sessions")
        .update({
          auto_submitted: true,
          auto_submit_reason: reason || "Auto-submitted.",
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionIdRef.current);
    }
  };

  const completeAssessmentSafely = async (autoSubmitted, reason) => {
    var result;
    var resultId = null;
    var lastQuestionId = questions[currentIndex] ? questions[currentIndex].id : null;
    var answeredCount = countAnswered(answers);

    if (!session || !user || !assessmentId) throw new Error("Assessment session is not ready.");

    if (lastQuestionId) {
      await saveQuestionTiming(lastQuestionId, Math.floor((Date.now() - questionStartTime) / 1000));
    }

    await Promise.all([
      saveProgress(session.id, user.id, assessmentId, elapsedSeconds, lastQuestionId),
      updateSessionTimer(session.id, elapsedSeconds),
      updateAnsweredQuestionsCount(answers)
    ]);

    result = await submitAssessment(session.id);

    if (result && result.id) resultId = result.id;
    if (result && result.result && result.result.id) resultId = result.result.id;
    if (result && result.data && result.data.id) resultId = result.data.id;

    await supabase
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        answered_questions: answeredCount,
        total_questions: questions.length,
        violation_count: violationCount,
        auto_submitted: !!autoSubmitted,
        auto_submit_reason: autoSubmitted ? reason || "Auto-submitted." : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", session.id);

    await markCandidateAssessmentCompleted(resultId, autoSubmitted, reason);

    return result;
  };

  const handleAutoSubmitDueToViolations = async () => {
    var reason;
    if (alreadySubmitted || submittingRef.current || autoSubmitRef.current) return;

    try {
      autoSubmitRef.current = true;
      submittingRef.current = true;
      setIsSubmitting(true);
      setIsAutoSubmitting(true);

      reason = "Auto-submitted due to rule violations. Answered " + countAnswered(answers) + " of " + questions.length + " questions.";
      await completeAssessmentSafely(true, reason);

      setAlreadySubmitted(true);
      setShowViolationWarning(false);
      router.push("/assessment/terminated?reason=violations&count=" + violationCount + "&answered=" + countAnswered(answers) + "&total=" + questions.length);
    } catch (submitError) {
      console.error("Auto-submit failed:", submitError);

      if (session && session.id) {
        await supabase
          .from("assessment_sessions")
          .update({
            status: "completed",
            auto_submitted: true,
            auto_submit_reason: "Auto-submitted due to rule violations. Submit function failed: " + (submitError && submitError.message ? submitError.message : "Unknown error"),
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", session.id);
      }

      await markCandidateAssessmentCompleted(null, true, "Auto-submitted due to rule violations.");
      setAlreadySubmitted(true);
      router.push("/assessment/terminated?reason=violations&count=" + violationCount + "&answered=" + countAnswered(answers) + "&total=" + questions.length);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setIsAutoSubmitting(false);
    }
  };

  const logViolation = async (violationType) => {
    var newCount;

    if (!sessionIdRef.current || isAutoSubmitting || alreadySubmitted) return;

    newCount = violationCount + 1;
    setViolationCount(newCount);

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

    showViolationWarningMessage(violationType + ". Violation " + newCount + " of 3.");

    if (newCount >= 3 && !isAutoSubmitting && !alreadySubmitted) {
      showViolationWarningMessage("Maximum violations reached (3/3). Auto-submitting assessment...");
      setIsAutoSubmitting(true);
      setTimeout(async () => {
        await handleAutoSubmitDueToViolations();
      }, 1200);
    }
  };

  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session) return;

    const handleCopy = (event) => { event.preventDefault(); logViolation("Copy attempt"); return false; };
    const handlePaste = (event) => { event.preventDefault(); logViolation("Paste attempt"); return false; };
    const handleCut = (event) => { event.preventDefault(); logViolation("Cut attempt"); return false; };
    const handleKeyDown = (event) => {
      var key = String(event.key || "").toLowerCase();
      if (event.key === "PrintScreen") { event.preventDefault(); logViolation("Screenshot attempt"); return false; }
      if (event.key === "F12") { event.preventDefault(); logViolation("DevTools attempt"); return false; }
      if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) { event.preventDefault(); logViolation("DevTools shortcut attempt"); return false; }
      if (event.ctrlKey && key === "u") { event.preventDefault(); logViolation("View source attempt"); return false; }
      if (event.metaKey && event.altKey && key === "i") { event.preventDefault(); logViolation("DevTools shortcut attempt"); return false; }
    };
    const handleContextMenu = (event) => { event.preventDefault(); logViolation("Right-click attempt"); return false; };

    const devToolsInterval = setInterval(() => {
      if (!sessionIdRef.current || alreadySubmitted) return;
      if (window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 200) {
        logViolation("DevTools detected");
      }
    }, 5000);

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    const style = document.createElement("style");
    style.textContent = "* { -webkit-user-select: none !important; user-select: none !important; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      if (style && style.parentNode) style.parentNode.removeChild(style);
      clearInterval(devToolsInterval);
    };
  }, [loading, alreadySubmitted, accessDenied, session, violationCount, isAutoSubmitting]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.push("/login");
    });

    return () => {
      if (authListener && authListener.subscription) authListener.subscription.unsubscribe();
    };
  }, [router]);

  const checkAssessmentAccess = async (userId, assessmentIdValue) => {
    try {
      const completed = await isAssessmentCompleted(userId, assessmentIdValue);

      if (completed) {
        setAlreadySubmitted(true);
        setAccessChecked(true);
        return false;
      }

      const data = await fetchCandidateAccess(userId, assessmentIdValue);

      if (!data || data.status !== "unblocked") {
        setAccessDenied(true);
        setAccessChecked(true);
        return false;
      }

      setAccessChecked(true);
      return true;
    } catch (accessError) {
      console.error("Error checking assessment access:", accessError);
      setAccessDenied(true);
      setAccessChecked(true);
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      var authSession;
      var hasAccess;
      var completed;
      var assessmentData;
      var accessData;
      var sessionData;
      var replacementSessionData;
      var progress;
      var progressElapsed;
      var uniqueQuestions;
      var responses;
      var formattedAnswers = {};
      var restoredInitialAnswers = {};
      var restoredChangeCount = {};
      var sessionViolations;
      var lastIndex;
      var shouldRestorePreviousState = true;

      try {
        setLoading(true);
        setError(null);
        resetClientAttemptState();

        const authResponse = await supabase.auth.getSession();
        authSession = authResponse && authResponse.data ? authResponse.data.session : null;

        if (!authSession) {
          router.push("/login");
          return;
        }

        setUser(authSession.user);
        if (!assessmentId) return;

        clearBrowserAttemptStorage(authSession.user.id, assessmentId);

        hasAccess = await checkAssessmentAccess(authSession.user.id, assessmentId);
        if (!hasAccess) {
          setLoading(false);
          return;
        }

        completed = await isAssessmentCompleted(authSession.user.id, assessmentId);
        if (completed) {
          setAlreadySubmitted(true);
          setLoading(false);
          return;
        }

        accessData = await fetchCandidateAccess(authSession.user.id, assessmentId);

        assessmentData = await getAssessmentById(assessmentId);
        setAssessment(assessmentData);
        setAssessmentType(assessmentData ? assessmentData.assessment_type : null);

        sessionData = await createAssessmentSession(authSession.user.id, assessmentId, assessmentData && assessmentData.assessment_type ? assessmentData.assessment_type.id : null);

        // Critical fix:
        // If createAssessmentSession returns an old session from before the reset/unblock timestamp,
        // delete stale session-linked behavioral data and create a clean session.
        if (isFreshResetAccess(accessData) && isSessionOlderThanUnblock(sessionData, accessData)) {
          await clearStaleAttemptData(authSession.user.id, assessmentId);
          clearBrowserAttemptStorage(authSession.user.id, assessmentId);
          replacementSessionData = await createAssessmentSession(authSession.user.id, assessmentId, assessmentData && assessmentData.assessment_type ? assessmentData.assessment_type.id : null);
          if (replacementSessionData) sessionData = replacementSessionData;
          shouldRestorePreviousState = false;
        }

        setSession(sessionData);
        if (sessionData && sessionData.id) sessionIdRef.current = sessionData.id;

        progress = await getProgress(authSession.user.id, assessmentId);

        if (!shouldRestorePreviousState) {
          progress = null;
          progressElapsed = 0;
        } else {
          progressElapsed = progress && progress.elapsed_seconds ? progress.elapsed_seconds : 0;
        }

        setElapsedSeconds(progressElapsed || 0);
        setTimeLimit(getSessionBasedLimit(sessionData, progressElapsed || 0, 10800));

        uniqueQuestions = await getUniqueQuestions(assessmentId);
        uniqueQuestions = safeArray(uniqueQuestions);
        setQuestions(uniqueQuestions);

        if (sessionData && sessionData.id && shouldRestorePreviousState) {
          responses = await getSessionResponses(sessionData.id);

          if (responses && responses.answerMap) {
            Object.entries(responses.answerMap).forEach(function ([qId, answer]) {
              if (typeof answer === "string" && answer.includes(",")) {
                formattedAnswers[qId] = answer.split(",").map(function (id) { return parseInt(id, 10); }).filter(function (id) { return !Number.isNaN(id); });
              } else {
                formattedAnswers[qId] = parseInt(answer, 10);
              }
            });

            setAnswers(formattedAnswers);
          }

          if (responses && responses.initialAnswerMap) {
            restoredInitialAnswers = responses.initialAnswerMap;
            setInitialAnswers(restoredInitialAnswers);
          }
        }

        if (progress && progress.last_question_id && uniqueQuestions.length > 0 && shouldRestorePreviousState) {
          lastIndex = uniqueQuestions.findIndex(function (question) { return String(question.id) === String(progress.last_question_id); });
          if (lastIndex >= 0) setCurrentIndex(lastIndex);
        }

        if (sessionData && sessionData.id && shouldRestorePreviousState) {
          const violationResponse = await supabase
            .from("assessment_sessions")
            .select("violation_count")
            .eq("id", sessionData.id)
            .single();
          sessionViolations = violationResponse.data;
          if (sessionViolations && sessionViolations.violation_count) setViolationCount(sessionViolations.violation_count);
        }

        setAnswerChangeCount(restoredChangeCount);
        setQuestionStartTime(Date.now());
        setLoading(false);
      } catch (initError) {
        console.error("Initialization error:", initError);
        setError(initError && initError.message ? initError.message : "Failed to initialize assessment.");
        setLoading(false);
      }
    };

    if (assessmentId) init();
  }, [assessmentId, router]);

  const handleTimeExpired = async () => {
    if (alreadySubmitted || submittingRef.current || isAutoSubmitting) return;

    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      alert("Time is up. The assessment will be submitted automatically.");
      await completeAssessmentSafely(true, "Auto-submitted because the assessment timer expired.");
      setAlreadySubmitted(true);
      router.push("/candidate/dashboard");
    } catch (submitError) {
      console.error("Auto-submit error:", submitError);
      alert("Failed to auto-submit. Please contact support.");
      setIsSubmitting(false);
    } finally {
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    if (loading || alreadySubmitted || !session || accessDenied || isAutoSubmitting) return;

    const timer = setInterval(() => {
      setElapsedSeconds((previous) => {
        var newElapsed = previous + 1;
        if (newElapsed >= timeLimit) handleTimeExpired();

        if (newElapsed % 30 === 0 && session && user) {
          saveProgress(session.id, user.id, assessmentId, newElapsed, questions[currentIndex] ? questions[currentIndex].id : null);
          updateSessionTimer(session.id, newElapsed);
        }

        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, alreadySubmitted, session, timeLimit, assessmentId, user, currentIndex, questions, accessDenied, isAutoSubmitting]);

  const saveQuestionTiming = async (questionId, timeSpentSeconds) => {
    var questionIdNum;
    var currentTiming;
    var payload;

    if (!sessionIdRef.current || !questionId) return false;

    try {
      questionIdNum = parseInt(questionId, 10);
      if (Number.isNaN(questionIdNum)) return false;

      currentTiming = questionTimings[questionIdNum] || {};

      payload = {
        session_id: sessionIdRef.current,
        question_id: questionIdNum,
        question_number: currentIndex + 1,
        time_spent_seconds: Math.max(0, timeSpentSeconds || 0),
        visit_count: (currentTiming.visit_count || 0) + 1,
        last_answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: timingError } = await supabase.from("question_timing").upsert(payload, { onConflict: "session_id,question_id" });
      if (timingError) {
        console.error("Error saving question timing:", timingError);
        return false;
      }

      setQuestionTimings(function (previous) {
        return {
          ...previous,
          [questionIdNum]: {
            time_spent: timeSpentSeconds,
            visit_count: (previous[questionIdNum] && previous[questionIdNum].visit_count ? previous[questionIdNum].visit_count : 0) + 1
          }
        };
      });

      return true;
    } catch (timingError) {
      console.error("Error in saveQuestionTiming:", timingError);
      return false;
    }
  };

  const handleAnswerSelect = async (questionId, answerId, isMultipleCorrect) => {
    var timeSpentSeconds;
    var newSelectedAnswers;
    var isAnswerChange = false;
    var isFirstAnswer = false;
    var currentSelected;
    var previousAnswer;
    var currentChangeCount;
    var newChangeCount;
    var initialAnswerId;
    var answerToStore;
    var result;
    var nextAnswers;

    if (alreadySubmitted || !session || !questionId || !answerId || accessDenied || isAutoSubmitting) return;

    timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);

    if (isMultipleCorrect) {
      currentSelected = getSelectedAnswersForQuestion(questionId);
      if (currentSelected.map(String).includes(String(answerId))) {
        newSelectedAnswers = currentSelected.filter(function (id) { return String(id) !== String(answerId); });
      } else {
        newSelectedAnswers = currentSelected.concat([answerId]);
      }
      isAnswerChange = currentSelected.map(String).join(",") !== newSelectedAnswers.map(String).join(",");
      isFirstAnswer = currentSelected.length === 0 && newSelectedAnswers.length > 0;
    } else {
      previousAnswer = answers[questionId];
      newSelectedAnswers = answerId;
      isAnswerChange = previousAnswer !== undefined && previousAnswer !== null && String(previousAnswer) !== String(answerId);
      isFirstAnswer = previousAnswer === undefined || previousAnswer === null || previousAnswer === "";
    }

    currentChangeCount = answerChangeCount[questionId] || 0;
    newChangeCount = isAnswerChange ? currentChangeCount + 1 : currentChangeCount;
    initialAnswerId = initialAnswers[questionId];

    if (isFirstAnswer) {
      initialAnswerId = isMultipleCorrect ? newSelectedAnswers : answerId;
      setInitialAnswers(function (previous) { return { ...previous, [questionId]: initialAnswerId }; });
    }

    if (isAnswerChange) {
      setAnswerChangeCount(function (previous) { return { ...previous, [questionId]: newChangeCount }; });
    }

    nextAnswers = { ...answers, [questionId]: newSelectedAnswers };
    setAnswers(nextAnswers);
    setSaveStatus(function (previous) { return { ...previous, [questionId]: "saving" }; });

    try {
      answerToStore = Array.isArray(newSelectedAnswers) ? newSelectedAnswers.join(",") : newSelectedAnswers;

      result = await saveUniqueResponse(session.id, user.id, assessmentId, questionId, answerToStore, {
        time_spent_seconds: timeSpentSeconds,
        times_changed: newChangeCount,
        initial_answer_id: Array.isArray(initialAnswerId) ? initialAnswerId.join(",") : initialAnswerId,
        is_answer_change: isAnswerChange
      });

      if (result && result.success) {
        setSaveStatus(function (previous) { return { ...previous, [questionId]: "saved" }; });
        await saveQuestionTiming(questionId, timeSpentSeconds);
        await updateAnsweredQuestionsCount(nextAnswers);
      } else {
        setSaveStatus(function (previous) { return { ...previous, [questionId]: "error" }; });
      }
    } catch (saveError) {
      console.error("Save error:", saveError);
      setSaveStatus(function (previous) { return { ...previous, [questionId]: "error" }; });
    }

    setTimeout(function () {
      setSaveStatus(function (previous) {
        var newStatus = { ...previous };
        delete newStatus[questionId];
        return newStatus;
      });
    }, 900);

    setQuestionStartTime(Date.now());
  };

  const moveToQuestion = async (nextIndex) => {
    var currentQuestionId;
    var timeSpent;
    if (isAutoSubmitting || nextIndex < 0 || nextIndex >= questions.length) return;

    currentQuestionId = questions[currentIndex] ? questions[currentIndex].id : null;
    if (currentQuestionId) {
      timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      await saveQuestionTiming(currentQuestionId, timeSpent);
      if (session && user) await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, currentQuestionId);
    }

    setCurrentIndex(nextIndex);
    setQuestionStartTime(Date.now());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    var unansweredCount;
    var confirmed;

    if (!session || alreadySubmitted || accessDenied || isAutoSubmitting || submittingRef.current) return;

    if (violationCount >= 3) {
      alert("Cannot submit: the assessment reached the violation limit and must be auto-submitted.");
      return;
    }

    unansweredCount = questions.length - countAnswered(answers);
    if (unansweredCount > 0) {
      confirmed = window.confirm("You have " + unansweredCount + " unanswered question(s). Are you sure you want to submit?");
      if (!confirmed) return;
    }

    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      setShowSubmitModal(false);

      await completeAssessmentSafely(false, null);

      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      setTimeout(function () { router.push("/candidate/dashboard"); }, 2000);
    } catch (submitError) {
      console.error("Submission error:", submitError);
      alert("Failed to submit assessment: " + (submitError && submitError.message ? submitError.message : "Unknown error"));
      setIsSubmitting(false);
    } finally {
      submittingRef.current = false;
    }
  };

  const handleBackClick = async () => {
    if (session && user && !alreadySubmitted) {
      await saveProgress(session.id, user.id, assessmentId, elapsedSeconds, questions[currentIndex] ? questions[currentIndex].id : null);
      await updateSessionTimer(session.id, elapsedSeconds);
    }
    router.push("/candidate/dashboard");
  };

  var totalAnswered = countAnswered(answers);
  var isLastQuestion = currentIndex === questions.length - 1;
  var timeRemainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
  var timeRemainingFormatted = formatTime(timeRemainingSeconds);
  var timePercentage = timeLimit > 0 ? (elapsedSeconds / timeLimit) * 100 : 0;
  var isTimeWarning = timePercentage > 80;
  var isTimeCritical = timePercentage > 90;
  var currentQuestion = questions[currentIndex] || {};
  var isMultipleCorrect = isMultipleCorrectQuestion(currentQuestion);

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
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div style={styles.messageContainer}>
        <div style={styles.messageCard}>
          <div style={styles.successIcon}>✅</div>
          <h2>Assessment Completed</h2>
          <p>This assessment has already been submitted.</p>
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button>
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
          <button onClick={() => window.location.reload()} style={styles.primaryButton}>Try Again</button>
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
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showViolationWarning && (
        <div style={styles.violationBanner}><span>⚠️</span><span>{violationMessage}</span></div>
      )}

      {isAutoSubmitting && (
        <div style={styles.autoSubmitOverlay}>
          <div style={styles.autoSubmitCard}>
            <div style={styles.autoSubmitSpinner} />
            <h3>Auto-submitting assessment...</h3>
            <p>The violation limit has been reached.</p>
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
              <div style={styles.modalStat}><span>Answer Changes</span><strong>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</strong></div>
              {violationCount > 0 && <div style={styles.modalStat}><span>Violations</span><strong style={{ color: violationCount >= 3 ? "#f44336" : "#ff9800" }}>{violationCount}/3</strong></div>}
            </div>
            <div style={styles.modalWarning}><span>⚠️</span><span><strong>One attempt only:</strong> After submission, the assessment cannot be retaken unless reset by your supervisor.</span></div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowSubmitModal(false)} style={styles.modalSecondaryButton}>Continue Reviewing</button>
              <button onClick={handleSubmit} disabled={isSubmitting || violationCount >= 3} style={{ ...styles.modalPrimaryButton, background: violationCount >= 3 ? "#ccc" : "#4caf50", cursor: violationCount >= 3 ? "not-allowed" : "pointer" }}>{isSubmitting ? "Submitting..." : violationCount >= 3 ? "Cannot Submit" : "Submit Assessment"}</button>
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
        <div style={{ ...styles.header, background: "linear-gradient(135deg, " + getGradientStart() + ", " + getGradientEnd() + ")" }}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button onClick={handleBackClick} style={styles.backButton}>←</button>
              <div>
                <div style={styles.headerTitle}>{assessment ? assessment.title : "Assessment"}</div>
                <div style={styles.headerMeta}>Question {currentIndex + 1} of {questions.length} • {currentQuestion.section || "General"}{isMultipleCorrect && <span style={{ marginLeft: "10px", color: "#ff9800", fontSize: "12px" }}>(Select all that apply)</span>}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {violationCount > 0 && <div style={{ background: violationCount >= 3 ? "#f44336" : "#ff9800", color: "white", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>⚠️ {violationCount}/3 Violations</div>}
              <div style={{ ...styles.timer, background: isTimeCritical ? "rgba(211,47,47,0.1)" : isTimeWarning ? "rgba(255,152,0,0.1)" : "rgba(255,255,255,0.15)" }}>
                <div style={styles.timerLabel}>TIME REMAINING</div>
                <div style={{ ...styles.timerValue, color: isTimeCritical ? "#d32f2f" : isTimeWarning ? "#ff9800" : "white" }}>{timeRemainingFormatted}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.mainContent}>
          <div style={styles.questionColumn}>
            <div style={styles.questionCard}>
              <div style={styles.questionText}>{currentQuestion.question_text}</div>
              {answerChangeCount[currentQuestion.id] > 0 && <div style={styles.changeIndicator}>✏️ Changed answer {answerChangeCount[currentQuestion.id]} time{answerChangeCount[currentQuestion.id] !== 1 ? "s" : ""}</div>}
              <div style={styles.answersContainer}>
                {safeArray(currentQuestion.answers).map((answer, index) => {
                  const isSelected = isAnswerSelected(currentQuestion.id, answer.id);
                  const optionLetter = String.fromCharCode(65 + index);
                  return (
                    <button key={answer.id} onClick={() => handleAnswerSelect(currentQuestion.id, answer.id, isMultipleCorrect)} disabled={alreadySubmitted || isAutoSubmitting} style={{ ...styles.answerCard, background: isSelected ? "linear-gradient(135deg, " + getGradientStart() + ", " + getGradientEnd() + ")" : "white", borderColor: isSelected ? getGradientStart() : "#e2e8f0", opacity: isAutoSubmitting ? 0.6 : 1 }}>
                      <div style={{ ...styles.answerLetter, background: isSelected ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: isSelected ? "white" : "#475569" }}>{optionLetter}</div>
                      <span style={{ color: isSelected ? "white" : "#1e293b" }}>{answer.answer_text}{isMultipleCorrect && isSelected && <span style={{ marginLeft: "8px", fontSize: "12px" }}>✓</span>}</span>
                    </button>
                  );
                })}
              </div>
              {isMultipleCorrect && <div style={styles.multipleHint}>💡 This question has multiple correct answers. Select all that apply.</div>}
              <div style={styles.navigation}>
                <button onClick={() => moveToQuestion(currentIndex - 1)} disabled={currentIndex === 0 || isAutoSubmitting} style={{ ...styles.navButton, opacity: currentIndex === 0 || isAutoSubmitting ? 0.5 : 1 }}>← Previous</button>
                {isLastQuestion ? <button onClick={() => setShowSubmitModal(true)} disabled={isAutoSubmitting || violationCount >= 3} style={{ ...styles.submitButton, background: violationCount >= 3 ? "#ccc" : "#4caf50", cursor: violationCount >= 3 ? "not-allowed" : "pointer" }}>{violationCount >= 3 ? "Blocked - Violations" : "Submit"}</button> : <button onClick={() => moveToQuestion(currentIndex + 1)} disabled={isAutoSubmitting} style={styles.nextButton}>Next →</button>}
              </div>
            </div>
          </div>

          <div style={styles.navigatorColumn}>
            <div style={styles.navigatorCard}>
              <h3>Question Navigator</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}><div style={styles.statValue}>{totalAnswered}</div><div style={styles.statLabel}>Answered</div></div>
                <div style={styles.statCard}><div style={styles.statValue}>{questions.length - totalAnswered}</div><div style={styles.statLabel}>Remaining</div></div>
                <div style={styles.statCard}><div style={styles.statValue}>{Object.values(answerChangeCount).reduce((a, b) => a + b, 0)}</div><div style={styles.statLabel}>Changes</div></div>
              </div>
              <div style={styles.questionGrid}>
                {questions.map((question, index) => {
                  const questionAnswer = answers[question.id];
                  const isAnswered = questionAnswer !== undefined && (Array.isArray(questionAnswer) ? questionAnswer.length > 0 : questionAnswer !== null);
                  const isCurrent = index === currentIndex;
                  const hasChanges = answerChangeCount[question.id] > 0;
                  return <button key={question.id} onClick={() => moveToQuestion(index)} disabled={isAutoSubmitting} style={{ ...styles.gridItem, background: isCurrent ? getGradientStart() : isAnswered ? hasChanges ? "#ff9800" : "#4caf50" : "white", color: isCurrent || isAnswered ? "white" : "#1e293b", borderColor: isCurrent ? getGradientStart() : "#e2e8f0", opacity: isAutoSubmitting ? 0.6 : 1 }}>{index + 1}</button>;
                })}
              </div>
              <div style={styles.legend}>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "#4caf50" }} />Answered</div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "#ff9800" }} />Changed</div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: getGradientStart() }} />Current</div>
                <div style={styles.legendItem}><div style={{ ...styles.legendDot, background: "white", border: "2px solid #e2e8f0" }} />Pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: "20px" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid #e2e8f0", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" },
  messageContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "20px" },
  messageCard: { background: "white", padding: "40px", borderRadius: "16px", maxWidth: "500px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  errorIcon: { fontSize: "64px", marginBottom: "20px" },
  successIcon: { fontSize: "64px", marginBottom: "20px" },
  successIconLarge: { width: "80px", height: "80px", background: "#4caf50", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "40px", color: "white" },
  primaryButton: { padding: "12px 30px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  violationBanner: { position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#f44336", color: "white", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", zIndex: 10001, fontSize: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "10px" },
  autoSubmitOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002 },
  autoSubmitCard: { background: "white", padding: "30px", borderRadius: "16px", textAlign: "center", maxWidth: "400px" },
  autoSubmitSpinner: { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #f44336", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  container: { minHeight: "100vh", background: "#f8fafc" },
  header: { position: "sticky", top: 0, zIndex: 100, color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  headerContent: { maxWidth: "1400px", margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "20px" },
  backButton: { width: "40px", height: "40px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "10px", color: "white", fontSize: "24px", cursor: "pointer" },
  headerTitle: { fontSize: "20px", fontWeight: 700, marginBottom: "4px" },
  headerMeta: { fontSize: "14px", opacity: 0.9 },
  timer: { padding: "10px 20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.3)", textAlign: "center", minWidth: "160px" },
  timerLabel: { fontSize: "12px", fontWeight: 600, marginBottom: "4px" },
  timerValue: { fontSize: "24px", fontWeight: 700, fontFamily: "monospace" },
  mainContent: { maxWidth: "1400px", margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" },
  questionColumn: { display: "flex", flexDirection: "column", gap: "20px" },
  questionCard: { background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  questionText: { fontSize: "18px", lineHeight: "1.5", color: "#1e293b", marginBottom: "20px", fontWeight: 500, padding: "16px", background: "#f8fafc", borderRadius: "10px" },
  changeIndicator: { padding: "6px 12px", background: "#FFF8E1", borderRadius: "20px", fontSize: "11px", color: "#F57C00", marginBottom: "12px", display: "inline-block" },
  answersContainer: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" },
  answerCard: { padding: "12px 16px", border: "2px solid", borderRadius: "12px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s" },
  answerLetter: { width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 },
  multipleHint: { padding: "10px 16px", background: "#E3F2FD", borderRadius: "8px", fontSize: "13px", color: "#1565C0", marginBottom: "16px" },
  navigation: { display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "8px" },
  navButton: { padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, border: "2px solid #667eea", background: "white", color: "#667eea", cursor: "pointer" },
  nextButton: { padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, border: "none", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", cursor: "pointer" },
  submitButton: { padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, border: "none", background: "#4caf50", color: "white", cursor: "pointer" },
  navigatorColumn: { position: "sticky", top: "100px", height: "fit-content" },
  navigatorCard: { background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" },
  statCard: { background: "#f8fafc", padding: "12px", borderRadius: "10px", textAlign: "center" },
  statValue: { fontSize: "20px", fontWeight: 800 },
  statLabel: { fontSize: "10px", color: "#64748b" },
  questionGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", marginBottom: "16px", maxHeight: "260px", overflowY: "auto", padding: "4px" },
  gridItem: { aspectRatio: "1", border: "2px solid", borderRadius: "8px", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  legend: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "8px" },
  legendItem: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" },
  legendDot: { width: "10px", height: "10px", borderRadius: "2px" },
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
