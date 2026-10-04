// pages/assessment/[id].js - FORCED-CHOICE + PER-QUESTION SCORING MODE SUPPORT
// Phase 6.5 (responsive): mobile-first layout.
// Phase 7A: logViolation routes through /api/assessment/session PATCH.
// Phase 7F-7I: layout and per-question scoring mode.
// Phase 8 (2026-10-03): question card clipping fix.
// Phase 8.1 (2026-10-04): proctoring fix.
//   - Spurious visibilitychange events that fire on initial page load no
//     longer count as tab switches. A 2-second grace window suppresses
//     them; the first legitimate tab switch after the grace window is
//     still recorded.
//   - persistAnswer now sends PER-QUESTION deltas (events since the last
//     save), not cumulative counters. The cumulative totals still go to
//     the submit endpoint via proctoringData.summary.
//   - These two changes stop the "80 violations" false alarm on reports.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../../supabase/client";

const AssessmentPage = dynamic(() => Promise.resolve(AssessmentContent), { ssr: false });

// Suppress spurious visibilitychange events fired by browsers during the
// first moments of page load. Real tab switches during the first 2s are
// improbable and not worth the false positive.
const PROCTORING_GRACE_MS = 2000;

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

function deriveDurationSeconds(sessionData) {
  if (!sessionData) return 0;
  const explicit = safeNumber(sessionData.duration_minutes, 0);
  if (explicit > 0) return Math.round(explicit * 60);
  if (sessionData.expires_at && sessionData.started_at) {
    const expiresMs = new Date(sessionData.expires_at).getTime();
    const startedMs = new Date(sessionData.started_at).getTime();
    if (Number.isFinite(expiresMs) && Number.isFinite(startedMs) && expiresMs > startedMs) {
      return Math.round((expiresMs - startedMs) / 1000);
    }
  }
  return 0;
}

function getAnswerArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function extractDomain(url) {
  if (!url) return null;
  try { return new URL(url).hostname; } catch { return null; }
}

function isExternalUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const currentDomain = window.location.hostname;
    return urlObj.hostname !== currentDomain && !url.includes(currentDomain);
  } catch { return false; }
}

function getUrlCategory(url) {
  const domain = extractDomain(url);
  if (!domain) return 'unknown';
  const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
  const aiTools = ['chatgpt.com', 'claude.ai', 'perplexity.ai', 'bard.google.com', 'copilot.microsoft.com'];
  const socialMedia = ['youtube.com', 'twitter.com', 'facebook.com', 'linkedin.com', 'reddit.com'];
  const messaging = ['slack.com', 'teams.microsoft.com', 'discord.com', 'whatsapp.com'];
  const educational = ['wikipedia.org', 'khanacademy.org', 'coursera.org'];
  const codeRepos = ['github.com', 'gitlab.com', 'stackoverflow.com'];
  const email = ['gmail.com', 'outlook.com', 'mail.google.com'];
  if (searchEngines.some(s => domain.includes(s))) return 'search_engine';
  if (aiTools.some(s => domain.includes(s))) return 'ai_tool';
  if (socialMedia.some(s => domain.includes(s))) return 'social_media';
  if (messaging.some(s => domain.includes(s))) return 'messaging';
  if (educational.some(s => domain.includes(s))) return 'educational';
  if (codeRepos.some(s => domain.includes(s))) return 'code_reference';
  if (email.some(s => domain.includes(s))) return 'email';
  return 'other';
}

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
  if (!response.ok) throw new Error(result.error || 'API call failed');
  return result;
}

async function fetchAssessmentDetails(assessmentId) { return await apiCall(`/api/assessment/${assessmentId}`); }
async function fetchAccess(assessmentId) { const r = await apiCall(`/api/assessment/access?assessmentId=${assessmentId}`); return r.access; }
async function fetchQuestions(assessmentTypeId, assessmentTypeCode, sessionId) {
  const params = new URLSearchParams({
    assessmentTypeId,
    ...(assessmentTypeCode && { assessmentTypeCode }),
    ...(sessionId && { sessionId })
  });
  const result = await apiCall(`/api/assessment/questions?${params.toString()}`);
  return result.questions || [];
}
async function createOrGetSession(assessmentId, assessmentTypeId) {
  const result = await apiCall('/api/assessment/session', { method: 'POST', body: JSON.stringify({ assessmentId, assessmentTypeId }) });
  return result.session;
}
async function getSessionResponses(sessionId) {
  const result = await apiCall(`/api/assessment/responses?sessionId=${sessionId}`);
  return result.responses || {};
}
async function saveAnswer(sessionId, questionId, answer, leastAnswer, metadata) {
  const body = { sessionId, questionId, answer, metadata };
  if (leastAnswer !== undefined && leastAnswer !== null) body.leastAnswerId = leastAnswer;
  return await apiCall('/api/assessment/save-response', { method: 'POST', body: JSON.stringify(body) });
}
async function submitAssessment(sessionId, autoSubmitted, autoSubmitReason, allowIncomplete, proctoringData, assessmentId) {
  return await apiCall('/api/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId, autoSubmitted, autoSubmitReason, allowIncomplete, proctoringData, assessmentId })
  });
}

function AssessmentContent() {
  const router = useRouter();
  const assessmentId = router.query.id || router.query.assessment_id;

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [assessment, setAssessment] = useState(null);
  const [assessmentType, setAssessmentType] = useState(null);
  const [assessmentTypeCode, setAssessmentTypeCode] = useState(null);
  const [defaultScoringMode, setDefaultScoringMode] = useState("single_select");
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [initialAnswers, setInitialAnswers] = useState({});
  const [answerChangeCount, setAnswerChangeCount] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [flashCell, setFlashCell] = useState(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(7200);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Cumulative counters (for the final submit payload).
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [pasteAttempts, setPasteAttempts] = useState(0);
  const [rightClickAttempts, setRightClickAttempts] = useState(0);
  const [violationCount, setViolationCount] = useState(0);

  const [violationMessage, setViolationMessage] = useState("");
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [questionStartTimes, setQuestionStartTimes] = useState({});

  const [externalUrlVisits, setExternalUrlVisits] = useState([]);
  const [domainVisits, setDomainVisits] = useState({});
  const [currentExternalUrl, setCurrentExternalUrl] = useState(null);
  const [showUrlWarning, setShowUrlWarning] = useState(false);
  const [urlVisitStartTime, setUrlVisitStartTime] = useState(null);
  const [previousUrl, setPreviousUrl] = useState(null);

  const [tabSwitchDetails, setTabSwitchDetails] = useState([]);

  const [accessDenied, setAccessDenied] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [showMobileNavigator, setShowMobileNavigator] = useState(false);

  const sessionIdRef = useRef(null);
  const submittingRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const urlCheckIntervalRef = useRef(null);

  // ----------------------------------------------------------
  // Per-question delta tracking.
  //
  // These refs accumulate events since the last persistAnswer() call.
  // When persistAnswer runs, it reads these, sends them, and resets them
  // to zero. The cumulative counters above are what the submit endpoint
  // receives in proctoringData.summary.
  // ----------------------------------------------------------
  const deltaRef = useRef({
    tab_switches: 0,
    violations: 0,
    copy_attempts: 0,
    paste_attempts: 0,
    right_click_attempts: 0
  });

  // Set to Date.now() when the assessment actually starts (after init).
  // Used to suppress spurious visibilitychange events on page load.
  const proctoringReadyAtRef = useRef(0);

  const primaryColor = "#0b2a4e";
  const accentColor = "#f9b83a";
  const successColor = "#2e7d32";
  const warningColor = "#f57c00";
  const dangerColor = "#c62828";

  const currentQuestion = questions[currentIndex] || {};
  const isNationalService = assessmentTypeCode === 'national_service' ||
    (assessment && assessment.title && assessment.title.toLowerCase().includes('national service'));

  const currentScoringMode = currentQuestion?.scoring_mode || defaultScoringMode;
  const isForcedChoice = currentScoringMode === "forced_choice";
  const isMultipleCorrect = isNationalService ? false : Boolean(currentQuestion.isMultipleCorrect);

  function getForcedChoicePicks(questionId) {
    const entry = answers[questionId];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return { most: null, least: null };
    return { most: entry.most !== undefined ? entry.most : null, least: entry.least !== undefined ? entry.least : null };
  }

  function questionUsesForcedChoice(question) {
    const mode = question?.scoring_mode || defaultScoringMode;
    return mode === "forced_choice";
  }

  function isAnsweredForQuestion(questionId, question) {
    const q = question || questions.find(x => x.id === questionId) || currentQuestion;
    if (questionUsesForcedChoice(q)) {
      const { most, least } = getForcedChoicePicks(questionId);
      return most !== null && least !== null;
    }
    return getAnswerArray(answers[questionId]).length > 0 ||
           (answers[questionId] !== undefined && answers[questionId] !== null && answers[questionId] !== "");
  }

  const answeredCount = questions.filter((q) => isAnsweredForQuestion(q.id, q)).length;
  const totalAnswered = answeredCount;
  const totalChanges = Object.values(answerChangeCount).reduce((a, b) => a + safeNumber(b, 0), 0);
  const isLastQuestion = currentIndex === questions.length - 1;
  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const timeRemainingFormatted = formatTime(remainingSeconds);
  const timeUsedPercent = timeLimitSeconds > 0 ? (elapsedSeconds / timeLimitSeconds) * 100 : 0;
  const isTimeCritical = timeUsedPercent > 90;

  function getSelectedAnswersForQuestion(questionId) { return getAnswerArray(answers[questionId]); }

  function isAnswerSelected(questionId, answerId) {
    if (isForcedChoice) {
      const { most } = getForcedChoicePicks(questionId);
      return String(most) === String(answerId);
    }
    const selected = getSelectedAnswersForQuestion(questionId);
    return selected.map(String).includes(String(answerId));
  }

  function showViolation(message) {
    setViolationMessage(message);
    setShowViolationWarning(true);
    setTimeout(() => setShowViolationWarning(false), 3000);
  }

  function trackUrlChange() {
    const currentUrl = window.location.href;
    const currentDomain = extractDomain(currentUrl);
    if (!previousUrl) { setPreviousUrl(currentUrl); return; }
    if (previousUrl === currentUrl) return;
    const isExternal = isExternalUrl(currentUrl);
    const duration = urlVisitStartTime ? (Date.now() - urlVisitStartTime) / 1000 : null;
    const category = getUrlCategory(currentUrl);
    if (currentDomain) {
      setDomainVisits(prev => ({ ...prev, [currentDomain]: (prev[currentDomain] || 0) + 1 }));
    }
    if (isExternal && currentDomain) {
      const visit = { url: currentUrl, domain: currentDomain, category, timestamp: new Date().toISOString(), duration, fromUrl: previousUrl };
      setExternalUrlVisits(prev => [...prev, visit]);
      setCurrentExternalUrl(currentUrl);
      setShowUrlWarning(true);
      logViolation(`Visited external site: ${currentDomain} (${category})`);
    } else {
      setShowUrlWarning(false);
      setCurrentExternalUrl(null);
    }
    setPreviousUrl(currentUrl);
    setUrlVisitStartTime(Date.now());
  }

  // Records a violation. Increments both the cumulative counter (for the
  // final submit payload) and the per-question delta (for the next save).
  async function logViolation(violationType, opts = {}) {
    if (!sessionIdRef.current || alreadySubmitted || isAutoSubmitting || isTimeExpired) return;

    // Suppress spurious events during page-load grace window.
    if (Date.now() < proctoringReadyAtRef.current) {
      return;
    }

    const newCount = violationCount + 1;
    setViolationCount(newCount);
    deltaRef.current.violations += 1;

    if (opts.tabSwitch) deltaRef.current.tab_switches += 1;
    if (opts.copyAttempt) deltaRef.current.copy_attempts += 1;
    if (opts.pasteAttempt) deltaRef.current.paste_attempts += 1;
    if (opts.rightClickAttempt) deltaRef.current.right_click_attempts += 1;

    try {
      await apiCall('/api/assessment/session', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          violationCount: newCount,
        }),
      });
    } catch (err) {
      console.error("Failed to sync violation count to DB:", err);
    }

    let message = violationType;
    if (currentExternalUrl) {
      const domain = extractDomain(currentExternalUrl);
      const category = getUrlCategory(currentExternalUrl);
      message += ` (${domain} - ${category})`;
    }
    showViolation(message + ". Recorded in your report for review.");
  }

  async function handleAutoSubmit(reason) {
    if (alreadySubmitted || submittingRef.current || autoSubmitRef.current) return;
    try {
      autoSubmitRef.current = true;
      submittingRef.current = true;
      setIsSubmitting(true);
      setIsAutoSubmitting(true);
      setIsTimeExpired(true);
      if (urlCheckIntervalRef.current) { clearInterval(urlCheckIntervalRef.current); urlCheckIntervalRef.current = null; }

      const answerPromises = Object.entries(answers).map(([qId, answer]) => {
        if (answer === null || answer === undefined || answer === "") return null;
        const questionObj = questions.find(q => String(q.id) === String(qId));
        const qForcedChoice = questionUsesForcedChoice(questionObj);
        const changeCount = answerChangeCount[qId] || 0;
        const initialAns = initialAnswers[qId];
        const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
        const timeOnQuestion = Math.floor((Date.now() - (questionStartTimes[qId] || questionStartTime)) / 1000);

        // On auto-submit, still send per-question metadata, but read from
        // the delta refs. The final cumulative numbers are sent via
        // proctoringData.summary below.
        if (qForcedChoice && typeof answer === "object" && !Array.isArray(answer)) {
          if (answer.most == null) return null;
          return saveAnswer(sessionIdRef.current, qId, String(answer.most), answer.least != null ? String(answer.least) : undefined, {
            time_spent_seconds: timeSpentSeconds,
            time_on_question: timeOnQuestion,
            times_changed: changeCount,
            initial_answer_id: initialAns != null ? String(initialAns) : String(answer.most),
            is_answer_change: false,
            tab_switches: 0,
            copy_attempts: 0,
            paste_attempts: 0,
            right_click_attempts: 0,
            violations: 0,
            previous_question: currentIndex
          });
        }
        const answerToStore = Array.isArray(answer) ? answer.join(",") : String(answer);
        return saveAnswer(sessionIdRef.current, qId, answerToStore, undefined, {
          time_spent_seconds: timeSpentSeconds,
          time_on_question: timeOnQuestion,
          times_changed: changeCount,
          initial_answer_id: Array.isArray(initialAns) ? initialAns.join(",") : (initialAns != null ? String(initialAns) : answerToStore),
          is_answer_change: false,
          tab_switches: 0,
          copy_attempts: 0,
          paste_attempts: 0,
          right_click_attempts: 0,
          violations: 0,
          previous_question: currentIndex
        });
      });
      await Promise.all(answerPromises.filter(p => p !== null));

      const proctoringData = {
        summary: {
          tabSwitches: tabSwitchCount,
          copyPasteAttempts: copyAttempts + pasteAttempts,
          rightClickAttempts,
          totalViolations: violationCount,
          externalUrlsVisited: externalUrlVisits.length,
          duration: elapsedSeconds,
          riskLevel: violationCount >= 3 ? 'high' : violationCount >= 1 ? 'medium' : 'low',
          riskScore: Math.min(violationCount * 25 + externalUrlVisits.length * 10, 100)
        },
        violations: [], tabSwitches: tabSwitchDetails, externalUrls: externalUrlVisits,
        domainVisits, sessionId: sessionIdRef.current
      };

      await submitAssessment(sessionIdRef.current, true,
        reason || 'Auto-submitted because the assessment timer expired.',
        true, proctoringData, assessmentId);

      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      setTimeout(() => router.push('/candidate/assessment-complete'), 2000);
    } catch (err) {
      console.error('[AutoSubmit] Failed:', err);
      alert('Auto-submit failed. Please contact support with this error: ' + (err.message || 'Unknown error'));
      setTimeout(() => router.push('/candidate/dashboard'), 3000);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setIsAutoSubmitting(false);
    }
  }

  async function persistAnswer(questionId, answerValue, leastValue, isChange) {
    const currentChangeCount = safeNumber(answerChangeCount[questionId], 0);
    const nextChangeCount = isChange ? currentChangeCount + 1 : currentChangeCount;
    if (isChange) setAnswerChangeCount(prev => ({ ...prev, [questionId]: nextChangeCount }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));
    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    const timeOnQuestion = Math.floor((Date.now() - (questionStartTimes[questionId] || questionStartTime)) / 1000);

    // Snapshot the per-question deltas and reset them.
    const deltas = { ...deltaRef.current };
    deltaRef.current = {
      tab_switches: 0,
      violations: 0,
      copy_attempts: 0,
      paste_attempts: 0,
      right_click_attempts: 0
    };

    try {
      await saveAnswer(sessionIdRef.current, questionId, answerValue, leastValue, {
        time_spent_seconds: timeSpentSeconds,
        time_on_question: timeOnQuestion,
        times_changed: nextChangeCount,
        initial_answer_id: initialAnswers[questionId] != null ? String(initialAnswers[questionId]) : String(answerValue),
        is_answer_change: isChange,
        tab_switches: deltas.tab_switches,
        copy_attempts: deltas.copy_attempts,
        paste_attempts: deltas.paste_attempts,
        right_click_attempts: deltas.right_click_attempts,
        violations: deltas.violations,
        previous_question: currentIndex
      });
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
    } catch (err) {
      console.error("Answer save error:", err);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
    }
    setTimeout(() => {
      setSaveStatus(prev => { const n = { ...prev }; delete n[questionId]; return n; });
    }, 900);
    setQuestionStartTime(Date.now());
  }

  async function handleAnswerSelect(questionId, answerId, multipleCorrect) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically."); return;
    }
    if (alreadySubmitted || !session || !user || !questionId || !answerId || accessDenied || isAutoSubmitting) return;
    const isNationalServiceType = assessmentTypeCode === 'national_service';
    const actualMultipleCorrect = multipleCorrect && !isNationalServiceType && !isForcedChoice;
    let newSelectedAnswer, isAnswerChange = false, isFirstAnswer = false;
    if (actualMultipleCorrect) {
      const currentSelected = getSelectedAnswersForQuestion(questionId);
      if (currentSelected.map(String).includes(String(answerId))) {
        newSelectedAnswer = currentSelected.filter(id => String(id) !== String(answerId));
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
    if (isFirstAnswer) {
      setInitialAnswers(prev => ({ ...prev, [questionId]: actualMultipleCorrect ? newSelectedAnswer : answerId }));
    }
    setAnswers(prev => ({ ...prev, [questionId]: newSelectedAnswer }));
    await persistAnswer(questionId, actualMultipleCorrect ? newSelectedAnswer.join(",") : newSelectedAnswer, undefined, isAnswerChange);
  }

  async function handleForcedChoiceSelect(questionId, answerId, side) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically."); return;
    }
    if (alreadySubmitted || !session || !user || !questionId || !answerId || accessDenied || isAutoSubmitting) return;
    const current = getForcedChoicePicks(questionId);
    const next = { ...current };
    const hadPreviousMost = current.most !== null && current.most !== undefined;
    const hadPreviousLeast = current.least !== null && current.least !== undefined;
    if (side === "most") {
      if (String(next.most) === String(answerId)) { next.most = null; }
      else {
        next.most = answerId;
        if (next.least != null && String(next.least) === String(answerId)) {
          next.least = null;
          setFlashCell({ questionId, answerId, side: "least" });
          setTimeout(() => setFlashCell(null), 700);
        }
      }
    } else {
      if (String(next.least) === String(answerId)) { next.least = null; }
      else {
        next.least = answerId;
        if (next.most != null && String(next.most) === String(answerId)) {
          next.most = null;
          setFlashCell({ questionId, answerId, side: "most" });
          setTimeout(() => setFlashCell(null), 700);
        }
      }
    }
    const isMostChange = side === "most" && hadPreviousMost && String(current.most) !== String(answerId);
    const isLeastChange = side === "least" && hadPreviousLeast && String(current.least) !== String(answerId);
    const isChange = isMostChange || isLeastChange;
    if (!hadPreviousMost && !hadPreviousLeast) {
      setInitialAnswers(prev => ({ ...prev, [questionId]: next.most != null ? next.most : (next.least != null ? next.least : null) }));
    }
    setAnswers(prev => ({ ...prev, [questionId]: next }));
    if (next.most != null) {
      await persistAnswer(questionId, String(next.most), next.least != null ? String(next.least) : undefined, isChange);
    }
  }

  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session || isTimeExpired) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // logViolation internally suppresses events during the grace window.
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        const currentUrl = window.location.href;
        let switchDetail = { timestamp: new Date().toISOString(), url: currentUrl, type: 'tab_switch', description: `Tab switch #${newCount}` };
        if (isExternalUrl(currentUrl)) {
          const domain = extractDomain(currentUrl);
          const category = getUrlCategory(currentUrl);
          switchDetail.description = `Tab switch to external site: ${domain} (${category})`;
          switchDetail.domain = domain;
          switchDetail.category = category;
          logViolation(`Tab switch to external site: ${domain} (${category})`, { tabSwitch: true });
        } else {
          logViolation("Tab switch", { tabSwitch: true });
        }
        setTabSwitchDetails(prev => [...prev, switchDetail]);
      }
    };
    const handlePageHide = () => {
      const newCount = tabSwitchCount + 1;
      setTabSwitchCount(newCount);
      const currentUrl = window.location.href;
      let switchDetail = { timestamp: new Date().toISOString(), url: currentUrl, type: 'page_hide', description: `Page hide #${newCount}` };
      if (isExternalUrl(currentUrl)) {
        const domain = extractDomain(currentUrl);
        const category = getUrlCategory(currentUrl);
        switchDetail.description = `Page hide to external site: ${domain} (${category})`;
        switchDetail.domain = domain;
        switchDetail.category = category;
        logViolation(`Page hide to external site: ${domain} (${category})`, { tabSwitch: true });
      }
      setTabSwitchDetails(prev => [...prev, switchDetail]);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [loading, alreadySubmitted, accessDenied, session, isTimeExpired, tabSwitchCount]);

  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session || isTimeExpired) return;
    const handleContextMenu = (event) => {
      event.preventDefault();
      setRightClickAttempts(prev => prev + 1);
      logViolation("Right-click attempt", { rightClickAttempt: true });
      return false;
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [loading, alreadySubmitted, accessDenied, session, isTimeExpired]);

  useEffect(() => {
    if (currentQuestion.id && !questionStartTimes[currentQuestion.id]) {
      setQuestionStartTimes(prev => ({ ...prev, [currentQuestion.id]: Date.now() }));
    }
  }, [currentQuestion.id]);

  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session || isTimeExpired) return;
    setPreviousUrl(window.location.href);
    setUrlVisitStartTime(Date.now());
    const handleUrlChange = () => { trackUrlChange(); };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    urlCheckIntervalRef.current = setInterval(() => {
      if (previousUrl !== window.location.href) trackUrlChange();
    }, 1000);
    const handleLinkClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href && isExternalUrl(target.href)) {
        const domain = extractDomain(target.href);
        const category = getUrlCategory(target.href);
        logViolation(`External link click: ${domain} (${category})`);
        setExternalUrlVisits(prev => [...prev, {
          url: target.href, domain, category,
          timestamp: new Date().toISOString(),
          fromUrl: window.location.href, via: 'link_click'
        }]);
      }
    };
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      if (urlCheckIntervalRef.current) { clearInterval(urlCheckIntervalRef.current); urlCheckIntervalRef.current = null; }
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [loading, alreadySubmitted, accessDenied, session, isTimeExpired]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true); setPageError(""); setAccessDenied(false); setAlreadySubmitted(false);
        setQuestions([]); setAnswers({}); setInitialAnswers({}); setAnswerChangeCount({}); setSaveStatus({});
        setElapsedSeconds(0); setViolationCount(0); setTabSwitchCount(0);
        setCopyAttempts(0); setPasteAttempts(0); setRightClickAttempts(0);
        setExternalUrlVisits([]); setDomainVisits({}); setTabSwitchDetails([]);
        setIsTimeExpired(false);
        sessionIdRef.current = null; submittingRef.current = false; autoSubmitRef.current = false;
        deltaRef.current = { tab_switches: 0, violations: 0, copy_attempts: 0, paste_attempts: 0, right_click_attempts: 0 };

        const authResponse = await supabase.auth.getSession();
        const authSession = authResponse && authResponse.data ? authResponse.data.session : null;
        if (!authSession) { router.push("/login"); return; }
        if (!assessmentId) return;
        const currentUser = authSession.user;
        setUser(currentUser);

        const assessmentData = await fetchAssessmentDetails(assessmentId);
        if (!assessmentData.success) throw new Error(assessmentData.error || 'Failed to load assessment');
        const assessmentInfo = assessmentData.assessment || assessmentData;
        if (!assessmentInfo?.id) throw new Error('Assessment details were returned in an invalid format');

        const resolvedTypeCode = assessmentInfo.assessment_type?.code || assessmentInfo.assessmentType?.code || assessmentInfo.type_code || null;
        const resolvedScoringMode = assessmentInfo.assessment_type?.scoring_mode || assessmentInfo.assessmentType?.scoring_mode || "single_select";

        setAssessment(assessmentInfo);
        setAssessmentType(assessmentInfo.assessment_type || assessmentInfo.assessmentType || null);
        setAssessmentTypeCode(resolvedTypeCode);
        setDefaultScoringMode(resolvedScoringMode);

        const accessData = await fetchAccess(assessmentId);
        if (accessData && (accessData.status === 'completed' || accessData.result_id)) { setAlreadySubmitted(true); setLoading(false); return; }
        if (accessData && accessData.status === 'blocked') { setAccessDenied(true); setLoading(false); return; }

        const assessmentTypeId = assessmentInfo.assessment_type_id || assessmentInfo.assessment_type?.id || assessmentInfo.assessmentType?.id;
        if (!assessmentTypeId) throw new Error('Assessment type could not be determined');

        const sessionData = await createOrGetSession(assessmentId, assessmentTypeId);
        if (sessionData) { setSession(sessionData); sessionIdRef.current = sessionData.id; }

        const durationSeconds = deriveDurationSeconds(sessionData);
        if (durationSeconds <= 0) throw new Error('Unable to determine session duration');
        setTimeLimitSeconds(durationSeconds);

        const questionData = await fetchQuestions(assessmentTypeId, resolvedTypeCode, sessionData?.id);
        setQuestions(questionData || []);

        if (sessionData && sessionData.id) {
          const savedTimer = localStorage.getItem(`timer_${sessionData.id}`);
          if (savedTimer) {
            const elapsed = parseInt(savedTimer, 10);
            if (elapsed > 0 && elapsed < durationSeconds) { setElapsedSeconds(elapsed); }
          }
          const savedIndex = localStorage.getItem(`current_index_${sessionData.id}`);
          if (savedIndex !== null && questionData && questionData.length > 0) {
            const idx = parseInt(savedIndex, 10);
            if (Number.isFinite(idx) && idx > 0 && idx < questionData.length) { setCurrentIndex(idx); }
          }
        }

        if (sessionData && sessionData.id) {
          const responses = await getSessionResponses(sessionData.id);
          const restoredAnswers = {}, restoredInitialAnswers = {}, restoredChangeCount = {};
          if (responses && responses.answerMap) {
            Object.entries(responses.answerMap).forEach(([qId, answer]) => {
              if (answer && typeof answer === "object" && !Array.isArray(answer) && ("most" in answer || "least" in answer)) {
                restoredAnswers[qId] = { most: answer.most != null ? parseInt(answer.most, 10) : null, least: answer.least != null ? parseInt(answer.least, 10) : null };
              } else if (typeof answer === "string" && answer.includes(",")) {
                restoredAnswers[qId] = answer.split(",").map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id));
              } else if (answer !== null && answer !== undefined && answer !== "") {
                restoredAnswers[qId] = parseInt(answer, 10);
              }
            });
          }
          if (responses && responses.initialAnswerMap) Object.entries(responses.initialAnswerMap).forEach(([qId, answer]) => { restoredInitialAnswers[qId] = answer; });
          if (responses && responses.changeCountMap) Object.entries(responses.changeCountMap).forEach(([qId, count]) => { restoredChangeCount[qId] = safeNumber(count, 0); });
          setAnswers(restoredAnswers);
          setInitialAnswers(restoredInitialAnswers);
          setAnswerChangeCount(restoredChangeCount);
        }

        setQuestionStartTime(Date.now());
        // Arm the proctoring grace window AFTER the page has settled.
        proctoringReadyAtRef.current = Date.now() + PROCTORING_GRACE_MS;
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
      setElapsedSeconds(previous => {
        const next = previous + 1;
        if (sessionIdRef.current) localStorage.setItem(`timer_${sessionIdRef.current}`, String(next));
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
  }, [loading, alreadySubmitted, accessDenied, session, isAutoSubmitting, timeLimitSeconds, isTimeExpired]);

  useEffect(() => {
    if ((alreadySubmitted || isTimeExpired) && sessionIdRef.current) localStorage.removeItem(`timer_${sessionIdRef.current}`);
  }, [alreadySubmitted, isTimeExpired]);

  useEffect(() => {
    if (!sessionIdRef.current || loading || questions.length === 0) return;
    localStorage.setItem(`current_index_${sessionIdRef.current}`, String(currentIndex));
  }, [currentIndex, loading, questions.length]);

  useEffect(() => {
    if ((alreadySubmitted || isTimeExpired) && sessionIdRef.current) localStorage.removeItem(`current_index_${sessionIdRef.current}`);
  }, [alreadySubmitted, isTimeExpired]);

  useEffect(() => {
    if (loading || alreadySubmitted || accessDenied || !session || isTimeExpired) return;
    const handleCopy = (event) => { event.preventDefault(); setCopyAttempts(prev => prev + 1); logViolation("Copy attempt", { copyAttempt: true }); return false; };
    const handlePaste = (event) => { event.preventDefault(); setPasteAttempts(prev => prev + 1); logViolation("Paste attempt", { pasteAttempt: true }); return false; };
    const handleCut = (event) => { event.preventDefault(); logViolation("Cut attempt"); return false; };
    const handleContextMenu2 = (event) => { event.preventDefault(); setRightClickAttempts(prev => prev + 1); logViolation("Right-click attempt", { rightClickAttempt: true }); return false; };
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
    document.addEventListener("contextmenu", handleContextMenu2);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu2);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, alreadySubmitted, accessDenied, session, violationCount, isAutoSubmitting, isTimeExpired]);

  async function moveToQuestion(nextIndex) {
    if (isTimeExpired || elapsedSeconds >= timeLimitSeconds) {
      alert("Time has expired! The assessment is being submitted automatically."); return;
    }
    if (isAutoSubmitting || nextIndex < 0 || nextIndex >= questions.length) return;
    setCurrentIndex(nextIndex);
    setQuestionStartTime(Date.now());
    setShowMobileNavigator(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!session || !session.id) { alert('Unable to submit: No active session found. Please refresh the page and try again.'); return; }
    if (alreadySubmitted) { alert('This assessment has already been submitted.'); return; }
    if (accessDenied) { alert('Access denied for this assessment.'); return; }
    if (isAutoSubmitting || submittingRef.current) return;
    if (isTimeExpired) { alert('Time has expired! The assessment is being submitted automatically.'); return; }
    const unansweredCount = questions.filter(q => !isAnsweredForQuestion(q.id, q)).length;
    if (unansweredCount > 0) {
      alert("Please complete all questions before submitting. " + unansweredCount + " question(s) remaining. Each forced-choice question needs both a Most and a Least selection.");
      return;
    }
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      setShowSubmitModal(false);
      const proctoringData = {
        summary: {
          tabSwitches: tabSwitchCount,
          copyPasteAttempts: copyAttempts + pasteAttempts,
          rightClickAttempts, totalViolations: violationCount,
          externalUrlsVisited: externalUrlVisits.length,
          duration: elapsedSeconds,
          riskLevel: violationCount >= 3 ? 'high' : violationCount >= 1 ? 'medium' : 'low',
          riskScore: Math.min(violationCount * 25 + externalUrlVisits.length * 10, 100)
        },
        violations: [], tabSwitches: tabSwitchDetails, externalUrls: externalUrlVisits,
        domainVisits, sessionId: sessionIdRef.current
      };
      const result = await submitAssessment(sessionIdRef.current, false, null, false, proctoringData, assessmentId);
      setAlreadySubmitted(true);
      setShowSuccessModal(true);
      setTimeout(() => router.push('/candidate/assessment-complete'), 2000);
    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit assessment: " + (err?.message || 'Unknown error') + "\n\nPlease try again or contact support.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleBackClick() { router.push("/candidate/dashboard"); }

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
          <button onClick={() => router.push("/candidate/dashboard")} style={styles.primaryButton}>← Go to Dashboard</button>
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

      {showUrlWarning && currentExternalUrl && (
        <div style={styles.urlWarningBanner}>
          <span>🔴</span>
          <span>
            <strong>External site detected:</strong> {currentExternalUrl}
            <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: '8px' }}>({getUrlCategory(currentExternalUrl)})</span>
          </span>
          <button onClick={() => { window.history.back(); setShowUrlWarning(false); }} style={styles.urlWarningButton}>Return to Assessment</button>
        </div>
      )}

      {isAutoSubmitting && (
        <div style={styles.autoSubmitOverlay}>
          <div style={styles.autoSubmitCard}>
            <div style={styles.autoSubmitSpinner} />
            <h3>Auto-submitting assessment...</h3>
            <p>Please wait while your assessment is submitted.</p>
          </div>
        </div>
      )}

      {isTimeExpired && !alreadySubmitted && (
        <div style={styles.autoSubmitOverlay}>
          <div style={styles.autoSubmitCard}>
            <div style={styles.autoSubmitSpinner} />
            <h3>⏰ Time Expired!</h3>
            <p>Your assessment is being submitted automatically.</p>
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
              {violationCount > 0 && <div style={styles.modalStat}><span>Behavioral Flags</span><strong style={{ color: warningColor }}>{violationCount}</strong></div>}
              {externalUrlVisits.length > 0 && <div style={styles.modalStat}><span>External Sites Visited</span><strong style={{ color: dangerColor }}>{externalUrlVisits.length}</strong></div>}
            </div>
            {externalUrlVisits.length > 0 && (
              <div style={styles.modalUrlWarning}>
                <span>🔴</span>
                <div>
                  <strong>External sites detected:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '12px' }}>
                    {externalUrlVisits.slice(0, 3).map((visit, i) => <li key={i}>{visit.domain} ({visit.category})</li>)}
                    {externalUrlVisits.length > 3 && <li>+{externalUrlVisits.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            )}
            <div style={styles.modalWarning}>
              <span>⚠️</span>
              <span><strong>One attempt only:</strong> After submission, the assessment cannot be retaken unless reset by your supervisor.</span>
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowSubmitModal(false)} style={styles.modalSecondaryButton}>Continue Reviewing</button>
              <button onClick={handleSubmit} disabled={isSubmitting || isTimeExpired} style={{ ...styles.modalPrimaryButton, background: isSubmitting || isTimeExpired ? "#ccc" : successColor, cursor: isSubmitting || isTimeExpired ? "not-allowed" : "pointer" }}>{isSubmitting ? "Submitting..." : "Submit Assessment"}</button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, textAlign: "center" }}>
            <div style={styles.successIconLarge}>✓</div>
            <h2 style={{ color: successColor }}>Assessment Complete!</h2>
            <p>Your assessment has been successfully submitted.</p>
            <p style={{ color: "#64748b" }}>Redirecting to completion page...</p>
          </div>
        </div>
      )}

      {showMobileNavigator && (
        <div style={styles.mobileNavOverlay} onClick={() => setShowMobileNavigator(false)}>
          <div style={styles.mobileNavDrawer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.mobileNavHeader}>
              <span style={styles.mobileNavTitle}>Question Navigator</span>
              <button onClick={() => setShowMobileNavigator(false)} style={styles.mobileNavClose}>✕</button>
            </div>
            <div style={styles.mobileNavGrid}>
              {questions.map((question, index) => {
                const answered = isAnsweredForQuestion(question.id, question);
                const current = index === currentIndex;
                const changed = answerChangeCount[question.id] > 0;
                let bgColor = "white", textColor = "#1e293b", borderColor = "#e2e8f0";
                if (current) { bgColor = accentColor; textColor = primaryColor; borderColor = accentColor; }
                else if (answered && changed) { bgColor = warningColor; textColor = "white"; borderColor = warningColor; }
                else if (answered) { bgColor = successColor; textColor = "white"; borderColor = successColor; }
                return (
                  <button
                    key={question.id}
                    className="navigator-item"
                    onClick={() => moveToQuestion(index)}
                    style={{ ...styles.gridItem, background: bgColor, color: textColor, borderColor, fontWeight: current ? 700 : 500 }}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div style={styles.mobileNavLegend}>
              <span style={{ ...styles.legendDot, background: successColor }} /> Answered
              <span style={{ ...styles.legendDot, background: warningColor, marginLeft: '12px' }} /> Changed
              <span style={{ ...styles.legendDot, background: accentColor, marginLeft: '12px' }} /> Current
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
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
              <button
                onClick={() => setShowMobileNavigator(true)}
                style={styles.mobileNavToggle}
                aria-label="Open question navigator"
              >
                ☰ {currentIndex + 1}/{questions.length}
              </button>
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
            {isForcedChoice && (
              <>
                <span style={styles.headerMetaDivider}>•</span>
                <span style={{ ...styles.headerMetaItem, color: accentColor, fontWeight: 600 }}>Most AND least</span>
              </>
            )}
            {!isForcedChoice && isMultipleCorrect && !isNationalService && (
              <>
                <span style={styles.headerMetaDivider}>•</span>
                <span style={{ ...styles.headerMetaItem, color: accentColor, fontWeight: 600 }}>Select all</span>
              </>
            )}
          </div>
        </div>

        <div className="assessment-main" style={styles.mainContent}>
          <div className="assessment-left-sidebar" style={styles.leftSidebar}>
            <div style={styles.statusCard}>
              <div style={styles.statusNumber}>Question {currentIndex + 1}</div>
              <div style={styles.statusBadge}>
                {isAnsweredForQuestion(currentQuestion.id, currentQuestion) ? 'Answered' : 'Not yet answered'}
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

            {externalUrlVisits.length > 0 && (
              <div style={{ ...styles.metaCard, background: '#fff5f5', borderColor: '#fecaca' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
                  🔴 External Sites ({externalUrlVisits.length})
                </div>
                <div style={{ fontSize: '11px', color: '#475569', maxHeight: '100px', overflowY: 'auto' }}>
                  {externalUrlVisits.map((visit, i) => (
                    <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #fee2e2' }}>
                      <span style={{ fontWeight: 500 }}>{visit.domain}</span>
                      <span style={{ color: '#64748b', fontSize: '10px' }}> ({visit.category})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.metaCard}>
              <div style={styles.metaItem}>Marked out of 1.00</div>
              <div style={styles.metaItem}>Flag question</div>
            </div>
          </div>

          <div className="assessment-middle" style={styles.middleColumn}>
            <div className="assessment-question-card" style={styles.questionCard}>
              <div style={styles.questionTextScroll}>
                <div style={styles.questionText}>
                  {currentQuestion.question_text}
                </div>
              </div>

              <div style={styles.answersScroll}>
                {!isForcedChoice && isMultipleCorrect && !isNationalService && (
                  <div style={styles.multipleHint}>💡 Select one or more answers</div>
                )}

                {isForcedChoice && (
                  <>
                    <div style={styles.forcedChoiceHint}>
                      <strong>Most likely:</strong> which action would you <em>most</em> likely take? &nbsp;
                      <strong>Least likely:</strong> which would you <em>least</em> likely take?
                    </div>
                    <div className="forced-choice-header" style={styles.forcedChoiceHeaderRow}>
                      <div style={styles.forcedChoiceHeaderSpacer} />
                      <div style={styles.forcedChoiceHeaderCol}>Most</div>
                      <div style={styles.forcedChoiceHeaderCol}>Least</div>
                    </div>
                  </>
                )}

                <div className="answers-container" style={styles.answersContainer}>
                  {safeArray(currentQuestion.answers).map((answer, index) => {
                    const optionLetter = String.fromCharCode(65 + index);

                    if (isForcedChoice) {
                      const isMost = String(getForcedChoicePicks(currentQuestion.id).most) === String(answer.id);
                      const isLeast = String(getForcedChoicePicks(currentQuestion.id).least) === String(answer.id);
                      const isFlashingMost = flashCell && flashCell.questionId === currentQuestion.id &&
                        String(flashCell.answerId) === String(answer.id) && flashCell.side === "most";
                      const isFlashingLeast = flashCell && flashCell.questionId === currentQuestion.id &&
                        String(flashCell.answerId) === String(answer.id) && flashCell.side === "least";

                      return (
                        <div
                          key={answer.id}
                          className="answer-option forced-choice-row"
                          style={{ ...styles.forcedChoiceRow, opacity: isDisabled ? 0.6 : 1 }}
                        >
                          <div className="forced-choice-text" style={styles.forcedChoiceTextWrap}>
                            <span style={{
                              color: (isMost || isLeast) ? primaryColor : "#1e293b",
                              fontSize: "16px",
                              fontWeight: (isMost || isLeast) ? 600 : 400
                            }}>
                              {optionLetter}. {answer.answer_text}
                            </span>
                          </div>
                          <div className="forced-choice-buttons" style={styles.forcedChoiceChoicesWrap}>
                            <div style={styles.forcedChoiceChoiceCol}>
                              <button
                                type="button"
                                onClick={() => handleForcedChoiceSelect(currentQuestion.id, answer.id, "most")}
                                disabled={isDisabled}
                                aria-label="Most likely"
                                className="choice-button"
                                style={{
                                  ...styles.choiceButton,
                                  background: isMost ? successColor : (isFlashingMost ? "#fff3e0" : "white"),
                                  borderColor: isMost ? successColor : "#cbd5e1",
                                  color: isMost ? "white" : "#0b2a4e"
                                }}
                              >
                                {isMost ? "✓" : "Most"}
                              </button>
                            </div>
                            <div style={styles.forcedChoiceChoiceCol}>
                              <button
                                type="button"
                                onClick={() => handleForcedChoiceSelect(currentQuestion.id, answer.id, "least")}
                                disabled={isDisabled}
                                aria-label="Least likely"
                                className="choice-button"
                                style={{
                                  ...styles.choiceButton,
                                  background: isLeast ? dangerColor : (isFlashingLeast ? "#fff3e0" : "white"),
                                  borderColor: isLeast ? dangerColor : "#cbd5e1",
                                  color: isLeast ? "white" : "#0b2a4e"
                                }}
                              >
                                {isLeast ? "✕" : "Least"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const selected = isAnswerSelected(currentQuestion.id, answer.id);
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
                        <span style={{ flex: 1, color: selected ? primaryColor : "#1e293b", fontSize: "17px", fontWeight: selected ? 600 : 400 }}>
                          {optionLetter}. {answer.answer_text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="assessment-nav-buttons" style={styles.navButtons}>
              <button
                onClick={() => moveToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0 || isDisabled}
                style={{ ...styles.navButton, opacity: (currentIndex === 0 || isDisabled) ? 0.5 : 1 }}
              >
                ← Previous
              </button>
              {isLastQuestion ? (
                <button onClick={() => setShowSubmitModal(true)} disabled={isDisabled} style={styles.submitButton}>Submit</button>
              ) : (
                <button onClick={() => moveToQuestion(currentIndex + 1)} disabled={isDisabled} style={styles.nextButton}>Next →</button>
              )}
            </div>
          </div>

          <div className="assessment-right-sidebar" style={styles.rightColumn}>
            <div style={styles.navigatorCard}>
              <div style={styles.navigatorHeader}>
                <span style={styles.navigatorTitle}>Quiz navigation</span>
              </div>
              <div className="question-grid" style={styles.questionGrid}>
                {questions.map((question, index) => {
                  const answered = isAnsweredForQuestion(question.id, question);
                  const current = index === currentIndex;
                  const changed = answerChangeCount[question.id] > 0;
                  let bgColor = "white", textColor = "#1e293b", borderColor = "#e2e8f0";
                  if (current) { bgColor = accentColor; textColor = primaryColor; borderColor = accentColor; }
                  else if (answered && changed) { bgColor = warningColor; textColor = "white"; borderColor = warningColor; }
                  else if (answered) { bgColor = successColor; textColor = "white"; borderColor = successColor; }
                  return (
                    <button
                      key={question.id}
                      className="navigator-item"
                      onClick={() => moveToQuestion(index)}
                      disabled={isDisabled}
                      style={{
                        ...styles.gridItem, background: bgColor, color: textColor, borderColor,
                        opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? "not-allowed" : "pointer",
                        fontWeight: current ? 700 : 500, boxShadow: current ? `0 0 0 2px ${accentColor}40` : 'none'
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

      <style jsx>{`
        .answer-option {
          transition: all 0.2s ease;
          border-radius: 8px;
        }
        .answer-option:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(11, 42, 78, 0.15);
        }
        .navigator-item {
          transition: all 0.15s ease;
          border-radius: 5px;
          font-size: 11px;
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

        @media (max-width: 1023px) {
          .assessment-main {
            grid-template-columns: minmax(0, 1fr) 180px !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 12px 16px !important;
          }
          .assessment-left-sidebar {
            display: none !important;
          }
          .assessment-question-card {
            min-height: 60vh !important;
          }
        }

        @media (max-width: 767px) {
          .assessment-main {
            grid-template-columns: 1fr !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 8px 10px 80px 10px !important;
            gap: 10px !important;
          }
          .assessment-left-sidebar,
          .assessment-right-sidebar {
            display: none !important;
          }
          .assessment-question-card {
            min-height: auto !important;
            padding: 16px 16px 18px 16px !important;
          }
          .forced-choice-header {
            display: none !important;
          }
          .forced-choice-row {
            display: block !important;
            padding: 12px 12px !important;
          }
          .forced-choice-text {
            margin-bottom: 10px;
          }
          .forced-choice-buttons {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .choice-button {
            width: 100% !important;
            height: 40px !important;
            border-radius: 8px !important;
            font-size: 13px !important;
          }
          .answer-option {
            padding: 12px 14px !important;
            min-height: 48px !important;
          }
          .answer-option span {
            font-size: 16px !important;
          }

          .assessment-nav-buttons {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            padding: 10px 12px !important;
            border-top: 2px solid #e2e8f0 !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.08) !important;
            z-index: 900 !important;
            gap: 8px !important;
          }
          .assessment-nav-buttons button {
            padding: 12px 16px !important;
            font-size: 15px !important;
            min-height: 46px !important;
          }
          .question-grid {
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 4px !important;
          }
        }

        @media (max-width: 400px) {
          .assessment-main {
            padding: 6px 8px 80px 8px !important;
          }
          .assessment-question-card {
            padding: 12px 12px !important;
          }
          .answer-option span {
            font-size: 15px !important;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc 0%, #e8eaf6 100%)", gap: "20px" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid #e2e8f0", borderTop: "4px solid #0b2a4e", borderRadius: "50%", animation: "spin 1s linear infinite" },
  messageContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "20px" },
  messageCard: { background: "white", padding: "40px", borderRadius: "16px", maxWidth: "500px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
  errorIcon: { fontSize: "64px", marginBottom: "20px" },
  successIcon: { fontSize: "64px", marginBottom: "20px" },
  successIconLarge: { width: "80px", height: "80px", background: "#2e7d32", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "40px", color: "white" },
  primaryButton: { padding: "12px 30px", background: "#0b2a4e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  violationBanner: { position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#c62828", color: "white", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", zIndex: 10001, fontSize: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "10px", maxWidth: "90vw" },
  urlWarningBanner: { position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", background: "#dc2626", color: "white", padding: "12px 20px", borderRadius: "8px", zIndex: 10000, fontSize: "13px", boxShadow: "0 4px 20px rgba(220, 38, 38, 0.3)", display: "flex", alignItems: "center", gap: "12px", maxWidth: "90%", flexWrap: "wrap", justifyContent: "center" },
  urlWarningButton: { padding: "6px 16px", background: "white", color: "#dc2626", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
  autoSubmitOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10002 },
  autoSubmitCard: { background: "white", padding: "30px", borderRadius: "16px", textAlign: "center", maxWidth: "400px" },
  autoSubmitSpinner: { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #c62828", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  container: { minHeight: "100vh", background: "#f4f7fc", display: "flex", flexDirection: "column", overflowX: "hidden" },
  header: { position: "sticky", top: 0, zIndex: 100, background: "linear-gradient(135deg, #0b2a4e 0%, #1b4a7a 100%)", borderBottom: "3px solid #f9b83a", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", flexShrink: 0 },
  headerContent: { maxWidth: "100%", margin: "0 auto", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" },
  headerMetaBar: { maxWidth: "100%", margin: "0 auto", padding: "4px 24px 8px 24px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.08)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  backButton: { width: "36px", height: "36px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  brandSection: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  logoContainer: { display: "flex", alignItems: "center" },
  logoText: { display: "flex", flexDirection: "column", lineHeight: 1.1 },
  logoMain: { fontSize: "16px", fontWeight: 700, color: "white", letterSpacing: "1px" },
  logoSub: { fontSize: "9px", fontWeight: 300, color: "rgba(255,255,255,0.7)", letterSpacing: "2px", textTransform: "uppercase" },
  nationalBadge: { display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.12)", padding: "4px 14px 4px 10px", borderRadius: "40px", border: "1px solid rgba(255,255,255,0.15)" },
  nationalBadgeIcon: { fontSize: "16px" },
  nationalBadgeText: { fontSize: "11px", fontWeight: 500, color: "white", letterSpacing: "0.3px" },
  headerMetaItem: { color: "rgba(255,255,255,0.7)", fontSize: "12px" },
  headerMetaDivider: { color: "rgba(255,255,255,0.3)", fontSize: "12px" },
  timer: { textAlign: "right" },
  timerLabel: { fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.6)" },
  timerValue: { fontSize: "18px", fontWeight: 700, fontFamily: "monospace", color: "#f9b83a" },
  mobileNavToggle: { display: "none", background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  mainContent: {
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
    padding: "16px 20px 20px 20px",
    display: "grid",
    gridTemplateColumns: "minmax(150px, 170px) minmax(0, 1fr) minmax(210px, 230px)",
    columnGap: "16px",
    rowGap: "0",
    boxSizing: "border-box",
    height: "calc(100vh - 96px)",
    maxHeight: "calc(100vh - 96px)",
    overflow: "hidden",
  },
  leftSidebar: { display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflowY: "auto", overflowX: "hidden", minWidth: 0, maxWidth: "100%" },
  statusCard: { background: "white", borderRadius: "12px", padding: "14px 16px", border: "1px solid #e2e8f0", flexShrink: 0 },
  statusNumber: { fontSize: "16px", fontWeight: 600, color: "#0f172a" },
  statusBadge: { fontSize: "12px", color: "#64748b", fontStyle: "italic", marginTop: "2px" },
  statsCard: { background: "white", borderRadius: "12px", padding: "14px 16px", border: "1px solid #e2e8f0", flexShrink: 0 },
  statsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" },
  statsLabel: { fontSize: "13px", color: "#64748b" },
  statsValue: { fontSize: "14px", fontWeight: 600, color: "#0f172a" },
  statsDivider: { height: "1px", background: "#e2e8f0", margin: "6px 0" },
  progressBar: { height: "4px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginTop: "4px" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #f9b83a, #f5a623)", borderRadius: "4px", transition: "width 0.3s ease" },
  metaCard: { background: "white", borderRadius: "12px", padding: "12px 16px", border: "1px solid #e2e8f0", flexShrink: 0, overflow: "hidden" },
  metaItem: { fontSize: "13px", color: "#64748b", padding: "2px 0" },
  middleColumn: { display: "flex", flexDirection: "column", gap: "12px", height: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden" },
  questionCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px 24px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  },
  questionTextScroll: { flexShrink: 0, marginBottom: "14px", maxWidth: "100%" },
  questionText: { fontSize: "19px", lineHeight: "1.6", color: "#0f172a", fontWeight: 500, padding: 0, margin: 0, overflowWrap: "break-word", wordBreak: "break-word" },
  answersScroll: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", paddingRight: "4px" },
  multipleHint: { padding: "10px 16px", background: "#f0f4ff", borderRadius: "8px", fontSize: "14px", color: "#0b2a4e", marginBottom: "12px", borderLeft: "3px solid #f9b83a", flexShrink: 0 },
  forcedChoiceHint: { padding: "10px 16px", background: "#f0f4ff", borderRadius: "8px", fontSize: "14px", color: "#0b2a4e", marginBottom: "12px", borderLeft: "3px solid #f9b83a", flexShrink: 0 },
  forcedChoiceHeaderRow: { display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: "10px", padding: "0 4px 10px 4px", flexShrink: 0 },
  forcedChoiceHeaderSpacer: {},
  forcedChoiceHeaderCol: { textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  forcedChoiceRow: { display: "grid", gridTemplateColumns: "1fr 70px 70px", gap: "10px", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: "8px", alignItems: "center", background: "white", minHeight: "60px", flexShrink: 0 },
  forcedChoiceTextWrap: { textAlign: "left", overflowWrap: "break-word", wordBreak: "break-word", minWidth: 0 },
  forcedChoiceChoicesWrap: { display: "contents" },
  forcedChoiceChoiceCol: { display: "flex", justifyContent: "center" },
  choiceButton: { width: "34px", height: "34px", borderRadius: "50%", border: "2px solid", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" },
  answersContainer: { display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px", minWidth: 0 },
  answerCard: { padding: "12px 18px", border: "2px solid", borderRadius: "8px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "14px", fontSize: "16px", minHeight: "56px", background: "white", flexShrink: 0, overflowWrap: "break-word", wordBreak: "break-word" },
  answerCheckbox: { width: "22px", height: "22px", borderRadius: "5px", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navButtons: { display: "flex", gap: "10px", flexShrink: 0 },
  navButton: { flex: 1, padding: "12px 20px", borderRadius: "8px", fontSize: "15px", fontWeight: 500, border: "2px solid #e2e8f0", background: "white", color: "#475569", cursor: "pointer" },
  nextButton: { flex: 1, padding: "12px 20px", borderRadius: "8px", fontSize: "15px", fontWeight: 500, border: "none", background: "#0b2a4e", color: "white", cursor: "pointer" },
  submitButton: { flex: 1, padding: "12px 20px", borderRadius: "8px", fontSize: "15px", fontWeight: 500, border: "none", background: "#2e7d32", color: "white", cursor: "pointer" },
  rightColumn: { display: "flex", flexDirection: "column", height: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden", position: "relative", zIndex: 2 },
  navigatorCard: { background: "white", borderRadius: "12px", padding: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" },
  navigatorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexShrink: 0 },
  navigatorTitle: { fontSize: "13px", fontWeight: 600, color: "#0f172a" },
  questionGrid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "4px", padding: "2px", flex: "initial", overflowY: "auto", alignContent: "start", maxHeight: "calc(100vh - 280px)" },
  gridItem: { aspectRatio: "1", border: "1px solid", borderRadius: "5px", fontSize: "11px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minWidth: "0", minHeight: "0" },
  legend: { display: "flex", justifyContent: "space-between", padding: "6px 0 0", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "4px", flexShrink: 0, marginTop: "6px" },
  legendItem: { display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "#64748b" },
  legendDot: { width: "8px", height: "8px", borderRadius: "3px", display: "inline-block" },
  navigatorTimer: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "6px 0 0", borderTop: "1px solid #e2e8f0", marginTop: "6px", flexShrink: 0 },
  navigatorTimerLabel: { fontSize: "12px" },
  navigatorTimerValue: { fontSize: "14px", fontWeight: 700, color: "#0b2a4e", fontFamily: "monospace" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "12px" },
  modalContent: { background: "white", padding: "24px", borderRadius: "20px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalIcon: { fontSize: "48px", textAlign: "center", marginBottom: "16px" },
  modalTitle: { fontSize: "22px", fontWeight: 700, textAlign: "center", marginBottom: "20px", color: "#0f172a" },
  modalStats: { background: "#f8fafc", padding: "16px", borderRadius: "12px", marginBottom: "20px" },
  modalStat: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" },
  modalUrlWarning: { display: "flex", gap: "10px", padding: "12px", background: "#fee2e2", borderRadius: "10px", fontSize: "13px", marginBottom: "12px", borderLeft: "3px solid #dc2626" },
  modalWarning: { display: "flex", gap: "10px", padding: "12px", background: "#fff8e1", borderRadius: "10px", fontSize: "13px", marginBottom: "20px", borderLeft: "3px solid #f9b83a" },
  modalActions: { display: "flex", gap: "12px", flexWrap: "wrap" },
  modalSecondaryButton: { flex: 1, minWidth: "120px", padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 500 },
  modalPrimaryButton: { flex: 1, minWidth: "120px", padding: "12px", background: "#2e7d32", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 500 },
  mobileNavOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 10003, display: "flex", alignItems: "flex-end" },
  mobileNavDrawer: { background: "white", width: "100%", maxHeight: "80vh", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", padding: "16px", overflowY: "auto" },
  mobileNavHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  mobileNavTitle: { fontSize: "16px", fontWeight: 700, color: "#0f172a" },
  mobileNavClose: { background: "transparent", border: "none", fontSize: "22px", cursor: "pointer", color: "#64748b", padding: "4px 8px" },
  mobileNavGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "5px", padding: "2px 0" },
  mobileNavLegend: { marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center" },
};

if (typeof window !== "undefined") {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 767px) {
      button[aria-label="Open question navigator"] {
        display: inline-flex !important;
        align-items: center;
      }
    }
  `;
  document.head.appendChild(style);
}

export default AssessmentPage;
