// pages/api/assessment/submit.js
// Version: submit-per-question-mode-v15
//
// v15 (2026-10-04):
//   • Fixed falsy-zero reset in the category accumulation loop. The old
//     check `if (!categoryEarnedMap[section])` reset categoryMaxMap back to
//     0 every time a section's accumulated earned score was still 0 — so
//     every section ended up with max: 1 instead of max: 10. Replaced with
//     `if (!(section in categoryEarnedMap))`, which tests key existence.
//   • loadFrozenQuestions SELECT now includes most_score and least_score
//     from unique_answers, and both answer-assembly branches carry them
//     through to the scorer. Required because scoreForcedChoiceResponse
//     reads those columns (see utils/scoring.js Phase 8.1).
//   • Removed the `|| 1` fallback on categoryMaxMap[category] in the
//     categoryScores mapper. If max is 0, percentage is 0 — no silent
//     substitution that masks accumulation bugs.
//
// v14 (2026-10-03):
//   • Scoring is decided per question, not per assessment. The handler
//     reads scoring_mode from unique_questions alongside section and
//     subsection, and passes it to scoreQuestionResponse for each question.
//     Assessment-level scoring_mode (from assessment_types) is used only as
//     a fallback when a question's mode is null.
//   • Why: Performance Assessment has 40 forced_choice and 40 single_select
//     questions in the same assessment. Under the old assessment-level
//     resolution, all 80 were scored as single_select, which produced a
//     spurious 100% for every candidate. Per-question mode fixes this.
//   • loadFrozenQuestions SELECT now includes scoring_mode from
//     unique_questions. Each assembled question carries question.scoring_mode.
//   • No changes to auth, session handling, RPC call, behavioural tracking,
//     proctoring, competency scoring, or response shape.
//
// v13 (2026-10-02):
//   • Competency scoring performs a DELETE of candidate_competency_scores
//     for this candidate+assessment before upserting, to clear stale rows.
// v12 (Phase 7E):
//   • Session must have a frozen question set in session_questions.
//   • Post-submit drift check against recompute_session_score.
// v11: competency scoring at end of submission (non-fatal).
// v10: unified scoring engine in utils/scoring.js.

import { createClient } from "@supabase/supabase-js";
import {
  scoreQuestionResponse,
  isBaselineAssessmentType
} from "../../../utils/scoring";
import { calculateCompetencyScores } from "../../../utils/competencyScoring";

const SUBMIT_BUILD = "submit-per-question-mode-v15";

const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',
  'a6000077-095d-4115-bc4e-5936fce953e9',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'
];
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';
const MAX_REASONABLE_SECONDS = 8 * 60 * 60;

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calculateAvgTimePerQuestion(totalSeconds, questionCount) {
  if (!totalSeconds || totalSeconds <= 0 || !questionCount || questionCount <= 0) return '0s';
  if (totalSeconds > MAX_REASONABLE_SECONDS) return 'Session left open';
  const avgSeconds = Math.round(totalSeconds / questionCount);
  if (avgSeconds < 60) return `${avgSeconds}s`;
  const minutes = Math.floor(avgSeconds / 60);
  const seconds = avgSeconds % 60;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function getTotalQuestions(assessmentId) {
  if (PRACTICAL_ASSESSMENT_IDS.includes(assessmentId)) return 40;
  if (assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID) return 80;
  return 100;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// v15: also selects most_score and least_score from unique_answers so the
// forced-choice scorer has the columns it needs.
async function loadFrozenQuestions(serviceClient, sessionId) {
  const { data: frozen, error: frozenErr } = await serviceClient
    .from("session_questions")
    .select("question_id, display_order, answer_order, assessment_version, scoring_version")
    .eq("session_id", sessionId)
    .order("display_order", { ascending: true });

  if (frozenErr) {
    console.error("[Submit] Frozen set read error:", frozenErr);
    return null;
  }
  if (!frozen || frozen.length === 0) return null;

  const questionIds = frozen.map((r) => r.question_id);

  const { data: questions, error: qErr } = await serviceClient
    .from("unique_questions")
    .select("id, question_text, section, subsection, scoring_mode")
    .in("id", questionIds);

  if (qErr || !questions) {
    console.error("[Submit] Frozen questions fetch error:", qErr);
    return null;
  }

  const { data: answers, error: aErr } = await serviceClient
    .from("unique_answers")
    .select("id, question_id, answer_text, score, most_score, least_score, display_order")
    .in("question_id", questionIds);

  if (aErr) {
    console.error("[Submit] Frozen answers fetch error:", aErr);
    return null;
  }

  const questionMap = {};
  questions.forEach((q) => { questionMap[q.id] = q; });

  const answersByQuestion = {};
  safeArray(answers).forEach((a) => {
    if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = [];
    answersByQuestion[a.question_id].push(a);
  });

  const assembled = [];
  for (const row of frozen) {
    const q = questionMap[row.question_id];
    if (!q) {
      console.warn("[Submit] Frozen question missing from unique_questions:", row.question_id);
      continue;
    }

    const answersForQ = answersByQuestion[row.question_id] || [];
    const answerOrder = Array.isArray(row.answer_order) ? row.answer_order : [];
    let orderedAnswers;

    if (answerOrder.length > 0) {
      const answerMap = {};
      answersForQ.forEach((a) => { answerMap[a.id] = a; });
      orderedAnswers = answerOrder
        .map((entry) => {
          const a = answerMap[entry.answer_id];
          if (!a) return null;
          return {
            id: a.id,
            answer_text: a.answer_text,
            score: a.score || 0,
            most_score: a.most_score,
            least_score: a.least_score
          };
        })
        .filter(Boolean);
    } else {
      orderedAnswers = answersForQ.map((a) => ({
        id: a.id,
        answer_text: a.answer_text,
        score: a.score || 0,
        most_score: a.most_score,
        least_score: a.least_score
      }));
    }

    assembled.push({
      id: q.id,
      question_text: q.question_text,
      section: q.section || "General",
      subsection: q.subsection || "",
      scoring_mode: q.scoring_mode || null,
      answers: orderedAnswers
    });
  }

  const assessmentVersion = frozen[0]?.assessment_version ?? 1;
  const scoringVersion = frozen[0]?.scoring_version ?? 1;

  return {
    questions: assembled,
    assessmentVersion,
    scoringVersion
  };
}

export default async function handler(req, res) {
  console.log(`[Submit] Build: ${SUBMIT_BUILD}`);
  console.log(`[Submit] Method: ${req.method}`);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, autoSubmitted, proctoringData, startedAt } = req.body;

    console.log(`[Submit] SessionId: ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[Submit] Missing environment variables");
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("[Submit] Auth error:", userError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    const userId = userData.user.id;

    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      console.error("[Submit] Session error:", sessionError);
      return res.status(404).json({
        success: false,
        error: "Session not found",
        diagnosticCode: sessionError?.code || "SESSION_NOT_FOUND"
      });
    }

    console.log(`[Submit] Session found: ${session.id}, assessment_id: ${session.assessment_id}`);

    if (!session.assessment_id) {
      console.error("[Submit] Session missing assessment_id");
      return res.status(409).json({
        success: false,
        error: "Session is missing assessment_id. Please start a new assessment session.",
        diagnosticCode: "MISSING_ASSESSMENT_ID"
      });
    }

    console.log(`[Submit] Looking up assessment: ${session.assessment_id}`);
    const { data: assessment, error: assessmentError } = await serviceClient
      .from("assessments")
      .select("id, title, assessment_type_id")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      console.error("[Submit] Assessment lookup failed:", {
        assessmentId: session.assessment_id,
        code: assessmentError?.code,
        message: assessmentError?.message
      });
      return res.status(500).json({
        success: false,
        error: "Assessment lookup failed",
        diagnosticCode: assessmentError?.code || "ASSESSMENT_NOT_FOUND"
      });
    }

    console.log(`[Submit] Assessment found: ${assessment.id} - ${assessment.title}`);

    const { data: assessmentType, error: typeError } = await serviceClient
      .from("assessment_types")
      .select("id, code, name, question_count, scoring_mode")
      .eq("id", assessment.assessment_type_id)
      .single();

    if (typeError || !assessmentType) {
      console.error("[Submit] Assessment type lookup failed:", {
        typeId: assessment.assessment_type_id,
        code: typeError?.code,
        message: typeError?.message
      });
    } else {
      console.log(`[Submit] Assessment type: ${assessmentType.code} (${assessmentType.id}) mode=${assessmentType.scoring_mode || 'single_select'}`);
    }

    const isNationalService = assessmentType?.code === 'national_service' ||
                             session.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;

    const typeCode = assessmentType?.code || 'general';
    const isBaseline = isBaselineAssessmentType(typeCode);

    // v14+: the assessment-level mode is now only a fallback. The per-question
    // mode from unique_questions takes precedence in the scoring loop below.
    const assessmentFallbackMode = isBaseline
      ? 'baseline'
      : (assessmentType?.scoring_mode === 'forced_choice' ? 'forced_choice' : 'single_select');

    console.log(`[Submit] Assessment fallback mode: ${assessmentFallbackMode}`);

    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, least_answer_id, metadata, times_changed")
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("[Submit] Responses error:", responsesError);
    }
    console.log(`[Submit] Found ${responses?.length || 0} responses`);

    let totalAnswerChanges = 0;
    let totalCopyAttempts = 0;
    let totalPasteAttempts = 0;
    let totalRightClickAttempts = 0;

    if (responses && responses.length > 0) {
      responses.forEach(r => {
        totalAnswerChanges += Number(r.times_changed) || 0;
        const metadata = r.metadata || {};
        totalCopyAttempts += Number(metadata.copy_attempts) || 0;
        totalPasteAttempts += Number(metadata.paste_attempts) || 0;
        totalRightClickAttempts += Number(metadata.right_click_attempts) || 0;
      });
    }

    let questions = null;
    let frozenUsed = false;
    const denominatorOverridden = false;
    let expectedDenominator = null;
    let actualDenominator = null;
    let frozenAssessmentVersion = null;
    let frozenScoringVersion = null;

    const frozenResult = await loadFrozenQuestions(serviceClient, sessionId);
    if (frozenResult && frozenResult.questions && frozenResult.questions.length > 0) {
      questions = frozenResult.questions;
      frozenUsed = true;
      frozenAssessmentVersion = frozenResult.assessmentVersion;
      frozenScoringVersion = frozenResult.scoringVersion;
      console.log(`[Submit] Questions found: ${questions.length} (source: session_questions / frozen)`);
      console.log(`[Submit] Versions: assessment=v${frozenAssessmentVersion}, scoring=v${frozenScoringVersion}`);

      // Log per-question mode distribution.
      const modeCounts = {};
      questions.forEach(q => {
        const m = q.scoring_mode || assessmentFallbackMode;
        modeCounts[m] = (modeCounts[m] || 0) + 1;
      });
      console.log(`[Submit] Per-question mode distribution:`, modeCounts);
    }

    if (!frozenUsed) {
      console.error('[Submit] No frozen question set for session:', sessionId);
      return res.status(409).json({
        success: false,
        error: 'Session has no frozen question set. Cannot submit. Please contact your supervisor.',
        diagnosticCode: 'NO_FROZEN_QUESTIONS'
      });
    }

    const responseLookup = {};
    (responses || []).forEach(r => {
      responseLookup[r.question_id] = r;
    });

    const categoryEarnedMap = {};
    const categoryMaxMap = {};
    let totalEarned = 0;
    let totalMax = 0;

    // v15: use `in` to test key existence. The old `!categoryEarnedMap[section]`
    // check treated 0 as falsy and reset categoryMaxMap[section] back to 0 on
    // every subsequent question in that section, collapsing max to 1.
    questions.forEach(q => {
      const response = responseLookup[q.id];
      const section = q.section || "General";
      const questionMode = q.scoring_mode || assessmentFallbackMode;

      if (!(section in categoryEarnedMap)) {
        categoryEarnedMap[section] = 0;
        categoryMaxMap[section] = 0;
      }

      if (!response) {
        const answeredShape = {
          question_id: q.id,
          answer_id: null,
          least_answer_id: null,
          unique_questions: q
        };
        const scored = scoreQuestionResponse(answeredShape, isBaseline, questionMode);
        totalMax += Number(scored.maxScore) || 0;
        categoryMaxMap[section] += Number(scored.maxScore) || 0;
        return;
      }

      const responseShape = {
        ...response,
        unique_questions: q
      };

      const scored = scoreQuestionResponse(responseShape, isBaseline, questionMode);
      const earned = Number(scored.score) || 0;
      const max = Number(scored.maxScore) || 0;

      totalEarned += earned;
      totalMax += max;

      categoryEarnedMap[section] += earned;
      categoryMaxMap[section] += max;
    });

    if (frozenUsed) {
      console.log(`[Submit] Frozen denominator locked: ${totalMax} max points`);
    }

    const finalPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${finalPercentage}% (per-question mode)`);

    // v15: no `|| 1` fallback. If max is 0, percentage is 0. Silent substitution
    // was masking the accumulation bug fixed above.
    const categoryScores = Object.keys(categoryEarnedMap).map(category => {
      const earned = categoryEarnedMap[category];
      const max = categoryMaxMap[category];
      const percentage = max > 0 ? Math.round((earned / max) * 100) : 0;
      return { category, earned, max, percentage };
    });

    // Record the per-question mode distribution as metadata for later
    // inspection. Not used for scoring — the loop above already did that.
    const distinctModes = new Set(
      questions
        .map(q => q.scoring_mode || assessmentFallbackMode)
        .filter(Boolean)
    );
    const scoredWithMode = distinctModes.size === 1
      ? Array.from(distinctModes)[0]
      : 'mixed';

    let recommendation = null;
    if (isNationalService) {
      if (finalPercentage >= 85) recommendation = 'Highly Recommended';
      else if (finalPercentage >= 75) recommendation = 'Recommended';
      else if (finalPercentage >= 65) recommendation = 'Reserve Pool';
      else recommendation = 'Not Recommended';
    } else {
      if (finalPercentage >= 85) recommendation = 'Highly Recommended';
      else if (finalPercentage >= 75) recommendation = 'Recommended';
      else if (finalPercentage >= 65) recommendation = 'Reserve Pool';
      else if (finalPercentage >= 50) recommendation = 'Consider for Development';
      else recommendation = 'Not Recommended';
    }

    const proctoring = proctoringData || {};
    const externalUrls = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls : [];
    const violations = Array.isArray(proctoring.violations) ? proctoring.violations : [];
    const tabSwitches = Array.isArray(proctoring.tabSwitches) ? proctoring.tabSwitches : [];

    const summary = proctoring.summary || {};
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    const externalUrlsVisited = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls.length : 0;

    if (responses && responses.length > 0) {
      const responseMetadata = responses.map(r => r.metadata || {});
      const totalViolationsFromResponses = responseMetadata.reduce((sum, meta) => sum + (Number(meta.violations) || 0), 0);
      if (totalViolationsFromResponses > totalViolations) {
        totalViolations = totalViolationsFromResponses;
      }
    }

    let riskScore = 0;
    if (totalTabSwitches > 50) riskScore += 30;
    else if (totalTabSwitches > 10) riskScore += 20;
    else if (totalTabSwitches > 0) riskScore += 5;

    if (totalViolations > 10) riskScore += 30;
    else if (totalViolations > 5) riskScore += 20;
    else if (totalViolations > 0) riskScore += 10;

    if (externalUrlsVisited > 0) {
      const hasSearchEngine = externalUrls.some(u => u.category === 'search_engine');
      const hasAITool = externalUrls.some(u => u.category === 'ai_tool');
      if (hasAITool) riskScore += 35;
      else if (hasSearchEngine) riskScore += 30;
      else riskScore += 15;
    }

    riskScore = Math.min(riskScore, 100);
    let riskLevel = 'low';
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';

    const completedAt = new Date().toISOString();
    let assessmentStartedAt = null;
    let totalSeconds = 0;

    if (startedAt) {
      assessmentStartedAt = startedAt;
      totalSeconds = Math.floor((new Date(completedAt) - new Date(startedAt)) / 1000);
    } else if (session.started_at) {
      assessmentStartedAt = session.started_at;
      totalSeconds = Math.floor((new Date(completedAt) - new Date(session.started_at)) / 1000);
    } else if (session.created_at) {
      assessmentStartedAt = session.created_at;
      totalSeconds = Math.floor((new Date(completedAt) - new Date(session.created_at)) / 1000);
    }

    if (totalSeconds > MAX_REASONABLE_SECONDS) {
      console.warn(`[Submit] Total time ${totalSeconds}s exceeds reasonable limit, capping for display`);
    }
    if (totalSeconds < 0) totalSeconds = 0;
    const totalDurationFormatted = formatDuration(totalSeconds);
    const avgTimePerQuestion = calculateAvgTimePerQuestion(totalSeconds, questions.length);

    const reportData = {
      categoryScores: categoryScores,
      totalEarned: totalEarned,
      totalMax: totalMax,
      percentageScore: finalPercentage,
      recommendation: recommendation,
      startedAt: assessmentStartedAt,
      completedAt: completedAt,
      totalSeconds: totalSeconds,
      totalDurationFormatted: totalDurationFormatted,
      avgTimePerQuestion: avgTimePerQuestion,
      totalQuestions: questions.length,
      isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS,
      frozenSetUsed: frozenUsed,
      denominatorOverridden: denominatorOverridden,
      expectedDenominator: expectedDenominator,
      actualDenominator: actualDenominator,
      assessmentVersion: frozenAssessmentVersion || 1,
      scoringVersion: frozenScoringVersion || 1,
      scoringMode: scoredWithMode,
      scoringModeDistribution: Array.from(distinctModes),
      behavioral: {
        tabSwitches: totalTabSwitches,
        violations: totalViolations,
        externalUrlsVisited: externalUrlsVisited,
        copyPasteAttempts: totalCopyAttempts + totalPasteAttempts,
        rightClickAttempts: totalRightClickAttempts,
        answerChanges: totalAnswerChanges,
        totalTime: totalSeconds,
        totalTimeFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        riskLevel: riskLevel,
        riskScore: riskScore,
        isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS
      },
      proctoring: {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: externalUrlsVisited,
        tabSwitches: totalTabSwitches,
        duration: totalSeconds,
        durationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS
      }
    };

    const proctoringDataForDb = {
      summary: {
        totalViolations: totalViolations,
        tabSwitches: totalTabSwitches,
        externalUrlsVisited: externalUrlsVisited,
        copyPasteAttempts: totalCopyAttempts + totalPasteAttempts,
        rightClickAttempts: totalRightClickAttempts,
        duration: totalSeconds,
        durationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        riskLevel: riskLevel,
        riskScore: riskScore,
        answerChanges: totalAnswerChanges,
        isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS
      },
      externalUrls: externalUrls,
      domainVisits: proctoring.domainVisits || {},
      violations: violations,
      tabSwitches: tabSwitches,
      total_tab_switches: totalTabSwitches,
      total_violations: totalViolations,
      copy_attempts: totalCopyAttempts,
      paste_attempts: totalPasteAttempts,
      right_click_attempts: totalRightClickAttempts,
      answer_changes: totalAnswerChanges,
      total_time_seconds: totalSeconds,
      avg_time_per_question: avgTimePerQuestion,
      is_time_abnormal: totalSeconds > MAX_REASONABLE_SECONDS
    };

    const answeredQuestionIds = (responses || []).map(r => r.question_id);

    console.log('[Submit] Calling transactional RPC for session:', sessionId);

    const { data: rpcResult, error: rpcError } = await serviceClient.rpc(
      'submit_assessment_transactional',
      {
        p_session_id: sessionId,
        p_user_id: session.user_id,
        p_assessment_id: assessment.id,
        p_assessment_type_id: assessment.assessment_type_id,
        p_completed_at: completedAt,
        p_total_score: totalEarned,
        p_max_score: totalMax,
        p_percentage_score: finalPercentage,
        p_total_questions: questions.length,
        p_answered_questions: answeredQuestionIds,
        p_category_scores: categoryScores,
        p_started_at: assessmentStartedAt,
        p_total_seconds: totalSeconds,
        p_recommendation: recommendation,
        p_risk_level: riskLevel,
        p_risk_score: riskScore,
        p_is_valid: riskLevel !== 'high',
        p_is_auto_submitted: autoSubmitted || false,
        p_assessment_version: frozenAssessmentVersion || 1,
        p_scoring_version: frozenScoringVersion || 1,
        p_report_data: reportData,
        p_proctoring_data: proctoringDataForDb,
        p_external_urls_visited: externalUrls,
        p_domain_visits: proctoring.domainVisits || {},
        p_tab_switch_details: tabSwitches,
        p_violations: violations,
        p_total_tab_switches: totalTabSwitches,
        p_total_external_urls: externalUrlsVisited
      }
    );

    if (rpcError) {
      console.error('[Submit] Transactional RPC failed:', rpcError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save assessment result',
        diagnosticCode: 'TRANSACTION_FAILED',
        debug: {
          code: rpcError?.code,
          message: rpcError?.message,
          details: rpcError?.details,
          hint: rpcError?.hint
        }
      });
    }

    const resultId = rpcResult;
    console.log(`[Submit] Result saved (transactional): ${resultId}`);

    // Phase 7E: post-submit drift check.
    try {
      const { data: recomputed, error: recomputeErr } = await serviceClient
        .rpc('recompute_session_score', { p_session_id: sessionId });

      if (recomputeErr) {
        console.warn('[Submit] Drift check: recompute_session_score failed (non-fatal):', recomputeErr.message);
      } else if (recomputed) {
        const recomputedPct = Number(recomputed.percentage);
        if (Number.isFinite(recomputedPct) && recomputedPct !== finalPercentage) {
          console.warn('[Submit] DRIFT DETECTED between JS engine and SQL function:', {
            sessionId,
            assessmentId: assessment.id,
            scoringMode: scoredWithMode,
            storedPct: finalPercentage,
            recomputedPct,
            delta: recomputedPct - finalPercentage
          });
        }
      }
    } catch (driftErr) {
      console.warn('[Submit] Drift check errored (non-fatal):', driftErr?.message || driftErr);
    }

    // ============================================================
    // STEP 19: COMPETENCY SCORING (NON-FATAL)
    // ============================================================
    try {
      const validQuestionIds = questions
        .map(q => q.id)
        .filter(id => id && !String(id).startsWith('placeholder-'));

      console.log(`[Submit] Competency: evaluating ${validQuestionIds.length} question IDs`);

      if (validQuestionIds.length > 0) {
        const { data: questionCompetencies, error: qcError } = await serviceClient
          .from('question_competencies')
          .select('question_id, competency_id, weight, competencies(id, name, category)')
          .in('question_id', validQuestionIds);

        if (qcError) {
          console.error('[Submit] Competency: question_competencies fetch failed:', qcError);
        } else if (questionCompetencies && questionCompetencies.length > 0) {
          console.log(`[Submit] Competency: found ${questionCompetencies.length} mapping rows`);

          const responsesWithQuestions = questions.map(question => {
            const response = responseLookup[question.id];
            return {
              ...(response || {}),
              unique_questions: {
                id: question.id,
                question_text: question.question_text,
                section: question.section,
                subsection: question.subsection,
                scoring_mode: question.scoring_mode,
                unique_answers: question.answers || []
              }
            };
          });

          const competencyScores = calculateCompetencyScores(
            responsesWithQuestions,
            questionCompetencies,
            {
              code: typeCode,
              scoring_mode: scoredWithMode === 'mixed' ? assessmentFallbackMode : scoredWithMode
            }
          );

          const rows = Object.values(competencyScores)
            .map(c => ({
              candidate_id: userId,
              assessment_id: assessment.id,
              competency_id: c.id,
              raw_score: c.rawScore,
              max_possible: c.maxPossible,
              percentage: c.percentage,
              classification: c.classification,
              question_count: c.questionCount
            }))
            .filter(r => Number.isFinite(Number(r.competency_id)) && Number(r.competency_id) > 0);

          if (rows.length > 0) {
            const { error: deleteError } = await serviceClient
              .from('candidate_competency_scores')
              .delete()
              .eq('candidate_id', userId)
              .eq('assessment_id', assessment.id);

            if (deleteError) {
              console.warn('[Submit] Competency: pre-upsert delete failed (non-fatal):', {
                message: deleteError.message,
                code: deleteError.code
              });
            } else {
              console.log(`[Submit] Competency: cleared prior rows for candidate+assessment`);
            }

            const { error: upsertError } = await serviceClient
              .from('candidate_competency_scores')
              .upsert(rows, { onConflict: 'candidate_id,assessment_id,competency_id' });

            if (upsertError) {
              console.error('[Submit] Competency: upsert failed:', {
                message: upsertError.message,
                code: upsertError.code,
                details: upsertError.details,
                hint: upsertError.hint
              });
            } else {
              console.log(`[Submit] Competency: wrote ${rows.length} rows for assessment ${assessment.id}`);
            }
          } else {
            console.log('[Submit] Competency: no rows produced by scorer');
          }
        } else {
          console.log('[Submit] Competency: no mappings found for these questions');

          const { error: cleanupError } = await serviceClient
            .from('candidate_competency_scores')
            .delete()
            .eq('candidate_id', userId)
            .eq('assessment_id', assessment.id);

          if (cleanupError) {
            console.warn('[Submit] Competency: stale row cleanup failed (non-fatal):', {
              message: cleanupError.message,
              code: cleanupError.code
            });
          } else {
            console.log(`[Submit] Competency: cleaned up any stale rows for candidate+assessment`);
          }
        }
      }
    } catch (competencyError) {
      console.error('[Submit] Competency: non-fatal error:', competencyError);
    }

    return res.status(200).json({
      success: true,
      resultId: resultId,
      sessionId: sessionId,
      score: finalPercentage,
      totalEarned: totalEarned,
      totalMax: totalMax,
      categoryScores: categoryScores,
      recommendation: recommendation,
      isNationalService: isNationalService,
      isAutoSubmitted: autoSubmitted || false,
      submitBuild: SUBMIT_BUILD,
      scoringMode: scoredWithMode,
      scoringModeDistribution: Array.from(distinctModes),
      frozenSetUsed: frozenUsed,
      denominatorOverridden: denominatorOverridden,
      assessmentVersion: frozenAssessmentVersion || 1,
      scoringVersion: frozenScoringVersion || 1,
      timeTracking: {
        startedAt: assessmentStartedAt,
        completedAt: completedAt,
        totalSeconds: totalSeconds,
        totalDurationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        totalQuestions: questions.length,
        isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS
      },
      behavioral: {
        tabSwitches: totalTabSwitches,
        violations: totalViolations,
        externalUrlsVisited: externalUrlsVisited,
        copyPasteAttempts: totalCopyAttempts + totalPasteAttempts,
        rightClickAttempts: totalRightClickAttempts,
        answerChanges: totalAnswerChanges,
        totalTime: totalSeconds,
        totalTimeFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        riskLevel: riskLevel,
        riskScore: riskScore,
        isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS
      },
      proctoring: {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: externalUrlsVisited,
        tabSwitches: totalTabSwitches,
        isTimeAbnormal: totalSeconds > MAX_REASONABLE_SECONDS
      }
    });

  } catch (error) {
    console.error("[Submit] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      diagnosticCode: "UNHANDLED_ERROR"
    });
  }
}
