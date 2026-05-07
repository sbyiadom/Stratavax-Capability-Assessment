// pages/assessment/[id].js

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
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

  // NOTE: The remainder of your AssessmentContent is not included in the snippet you provided.
  // Paste the rest of your file to regenerate a true full file with UI intact.

  return null;
}

export default function AssessmentPage() {
  return <AssessmentContent />;
}
