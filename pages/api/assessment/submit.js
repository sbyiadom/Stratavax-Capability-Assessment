// pages/api/assessment/submit.js - FULLY CORRECTED WITH UNIFIED SCORING
// Version: submit-behavioral-v10-unified-scoring
//
// WHAT CHANGED FROM v9
// --------------------
// Previous versions computed the candidate's score inline:
//     const earned = Number(selectedAnswer.score) > 0 ? 1 : 0;
// Every non-zero answer earned a full point. For a graded question whose
// answers score [2,5,3,1], that meant three of the four answers all
// earned a full point. The candidate's overall percentage barely reflected
// the quality of their choices.
//
// v10 replaces the inline loop with the shared scoring engine in
// utils/scoring.js, which:
//   • single_select → answer-weighted, real max per question
//   • baseline      → exact-match multi-select
//   • forced_choice → most/least picks (0.7 / 0.3 weights)
//
// CONSEQUENCE: new submissions will produce different (generally lower)
// percentages than the same answers scored under v9. That is the point.
// Existing historical results are untouched — they retain the value they
// had when they were written.
//
// Behavioural tracking, proctoring, RPC call, and response shape are all
// unchanged.

import { createClient } from "@supabase/supabase-js";
import {
  scoreQuestionResponse,
  isBaselineAssessmentType
} from "../../../utils/scoring";

const SUBMIT_BUILD = "submit-behavioral-v10-unified-scoring";

const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',
  'a6000077-095d-4115-bc4e-5936fce953e9',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'
];
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';
const MAX_REASONABLE_SECONDS = 8 * 60 * 60; // 8 hours

// ============================================================
// HELPERS
// ============================================================
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

// ============================================================
// Load the frozen question set for a session.
// Returns { questions, assessmentVersion, scoringVersion } or null.
// ============================================================
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
    .select("id, question_text, section, subsection")
    .in("id", questionIds);

  if (qErr || !questions) {
    console.error("[Submit] Frozen questions fetch error:", qErr);
    return null;
  }

  const { data: answers, error: aErr } = await serviceClient
    .from("unique_answers")
    .select("id, question_id, answer_text, score, display_order")
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
          return { id: a.id, answer_text: a.answer_text, score: a.score || 0 };
        })
        .filter(Boolean);
    } else {
      orderedAnswers = answersForQ.map((a) => ({
        id: a.id,
        answer_text: a.answer_text,
        score: a.score || 0
      }));
    }

    assembled.push({
      id: q.id,
      question_text: q.question_text,
      section: q.section || "General",
      subsection: q.subsection || "",
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

// ============================================================
// MAIN HANDLER
// ============================================================
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

    // ============================================================
    // STEP 1: Verify user
    // ============================================================
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("[Submit] Auth error:", userError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }
    const userId = userData.user.id;

    // ============================================================
    // STEP 2: Get session
    // ============================================================
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

    // ============================================================
    // STEP 3: Validate session has assessment_id
    // ============================================================
    if (!session.assessment_id) {
      console.error("[Submit] Session missing assessment_id");
      return res.status(409).json({
        success: false,
        error: "Session is missing assessment_id. Please start a new assessment session.",
        diagnosticCode: "MISSING_ASSESSMENT_ID"
      });
    }

    // ============================================================
    // STEP 4: Get assessment
    // ============================================================
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

    // ============================================================
    // STEP 5: Get assessment type (now including scoring_mode)
    // ============================================================
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

    // Determine scoring mode. Baseline is a special case of single-select
    // that uses exact-match multi-select.
    const typeCode = assessmentType?.code || 'general';
    const isBaseline = isBaselineAssessmentType(typeCode);
    const scoringMode = isBaseline
      ? 'baseline'
      : (assessmentType?.scoring_mode === 'forced_choice' ? 'forced_choice' : 'single_select');

    console.log(`[Submit] Resolved scoring mode: ${scoringMode}`);

    // ============================================================
    // STEP 6: Get responses (now including least_answer_id)
    // ============================================================
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

    // ============================================================
    // STEP 7: Get questions for scoring (frozen first, fallback second)
    // ============================================================
    let questions = null;
    let frozenUsed = false;
    let denominatorOverridden = false;
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
    }

    if (!frozenUsed) {
      const { data: questionsData, error: questionsError } = await serviceClient
        .from("unique_questions")
        .select(`
          id,
          question_text,
          section,
          unique_answers (
            id,
            answer_text,
            score
          )
        `)
        .eq("assessment_type_id", assessment.assessment_type_id);

      if (questionsError) {
        console.error("[Submit] Questions error:", questionsError);
      }

      questions = (questionsData || []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        section: q.section,
        answers: q.unique_answers || []
      }));

      if (questions.length === 0) {
        console.error("[Submit] No questions found for assessment_type_id:", assessment.assessment_type_id);
        return res.status(409).json({
          success: false,
          error: "No questions found for this assessment",
          diagnosticCode: "NO_QUESTIONS_FOUND"
        });
      }

      console.log(`[Submit] Questions found: ${questions.length} (source: unique_questions / fallback)`);
    }

    // ============================================================
    // STEP 8: Calculate scores using the unified scoring engine
    // ------------------------------------------------------------
    // Previously this used `Number(selectedAnswer.score) > 0 ? 1 : 0`
    // which awarded a full point for ANY non-zero answer and therefore
    // could not distinguish a candidate who picked the best answer from
    // one who picked the second-worst. v10 uses scoreQuestionResponse,
    // which handles single_select, baseline, and forced_choice uniformly.
    // ============================================================
    const responseLookup = {};
    (responses || []).forEach(r => {
      responseLookup[r.question_id] = r;
    });

    const categoryEarnedMap = {};
    const categoryMaxMap = {};
    let totalEarned = 0;
    let totalMax = 0;

    questions.forEach(q => {
      const response = responseLookup[q.id];
      const section = q.section || "General";

      if (!categoryEarnedMap[section]) {
        categoryEarnedMap[section] = 0;
        categoryMaxMap[section] = 0;
      }

      if (!response) {
        // Unanswered question still contributes to the denominator.
        const answeredShape = {
          question_id: q.id,
          answer_id: null,
          least_answer_id: null,
          unique_questions: q
        };
        const scored = scoreQuestionResponse(answeredShape, isBaseline, scoringMode);
        totalMax += Number(scored.maxScore) || 0;
        categoryMaxMap[section] += Number(scored.maxScore) || 0;
        return;
      }

      // Attach the full question object so the engine can resolve answer scores.
      const responseShape = {
        ...response,
        unique_questions: q
      };

      const scored = scoreQuestionResponse(responseShape, isBaseline, scoringMode);
      const earned = Number(scored.score) || 0;
      const max = Number(scored.maxScore) || 0;

      totalEarned += earned;
      totalMax += max;

      categoryEarnedMap[section] += earned;
      categoryMaxMap[section] += max;
    });

    // ============================================================
    // STEP 9: Validate question count (fallback path only)
    // ============================================================
    if (frozenUsed) {
      console.log(`[Submit] Frozen denominator locked: ${totalMax} max points`);
    } else {
      let expectedTotalQuestions = 0;
      if (assessmentType?.question_count && assessmentType.question_count > 0) {
        expectedTotalQuestions = assessmentType.question_count;
      } else if (questions.length > 0) {
        expectedTotalQuestions = questions.length;
      } else {
        expectedTotalQuestions = getTotalQuestions(assessment.id);
      }
      console.log(`[Submit] Expected questions: ${expectedTotalQuestions}, Actual: ${questions.length}`);
      if (questions.length !== expectedTotalQuestions) {
        denominatorOverridden = true;
        expectedDenominator = expectedTotalQuestions;
        actualDenominator = questions.length;
        console.error('[Submit] DENOMINATOR OVERRIDE:', {
          assessmentId: assessment.id,
          assessmentTypeId: assessment.assessment_type_id,
          assessmentTypeCode: assessmentType?.code || null,
          configuredQuestionCount: expectedTotalQuestions,
          actualQuestionsFound: questions.length,
          sessionId: sessionId,
          source: 'legacy_fallback_path'
        });
      }
    }

    const finalPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${finalPercentage}% (mode=${scoringMode})`);

    // ============================================================
    // STEP 10: category_scores
    // ============================================================
    const categoryScores = Object.keys(categoryEarnedMap).map(category => {
      const earned = categoryEarnedMap[category];
      const max = categoryMaxMap[category] || 1;
      const percentage = Math.round((earned / max) * 100);
      return { category, earned, max, percentage };
    });

    // ============================================================
    // STEP 11: recommendation
    // ============================================================
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

    // ============================================================
    // STEP 12: proctoring data
    // ============================================================
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

    // ============================================================
    // STEP 13: risk
    // ============================================================
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

    // ============================================================
    // STEP 14: time tracking
    // ============================================================
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

    // ============================================================
    // STEP 15-18: TRANSACTIONAL SUBMISSION
    // ============================================================
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
      scoringMode: scoringMode,
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

    // ============================================================
    // STEP 19: Return response
    // ============================================================
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
      scoringMode: scoringMode,
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
