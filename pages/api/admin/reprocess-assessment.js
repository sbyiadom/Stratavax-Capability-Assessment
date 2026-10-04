// pages/api/admin/reprocess-assessment.js
// Version: reprocess-v3 (2026-10-04)
//
// v3:
//   • Full rewrite. Reuses the exact scoring pipeline from
//     pages/api/assessment/submit.js — same frozen question loader,
//     same per-question scoring_mode resolution, same category
//     accumulation (with the `in` key-existence check), same
//     competency calculation.
//   • The previous version had two fatal bugs:
//       1) It fetched unique_questions by assessment_type_id without
//          joining unique_answers, so calculateMaxScore got zero-length
//          answers and returned 0 — collapsing every result to 0%.
//       2) It read the legacy `score` column instead of most_score /
//          least_score, so forced-choice questions scored 0.
//   • Also fixes: the previous version never recomputed
//     candidate_competency_scores, so the "Competency data not loaded"
//     section stayed empty after a reprocess.
//
// Auth:
//   Requires POST. If ADMIN_API_KEY is set in env, the Authorization
//   header must be `Bearer ${ADMIN_API_KEY}`. If ADMIN_API_KEY is unset,
//   the check is skipped (matches the previous file's behaviour).
//
// Body:
//   { assessmentResultId: string, dryRun?: boolean }
//
// Behaviour:
//   - dryRun: true  → returns before/after numbers, writes nothing.
//   - dryRun: false → updates assessment_results and replaces
//                     candidate_competency_scores for the candidate +
//                     assessment.

import { createClient } from "@supabase/supabase-js";
import {
  scoreQuestionResponse,
  isBaselineAssessmentType
} from "../../../utils/scoring";
import { calculateCompetencyScores } from "../../../utils/competencyScoring";

export const config = {
  maxDuration: 300 // 5 minutes
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// ----------------------------------------------------------
// Identical logic to submit.js loadFrozenQuestions — do not diverge.
// If you change this, change it there too, or better: extract to a
// shared helper.
// ----------------------------------------------------------
async function loadFrozenQuestions(serviceClient, sessionId) {
  const { data: frozen, error: frozenErr } = await serviceClient
    .from("session_questions")
    .select("question_id, display_order, answer_order, assessment_version, scoring_version")
    .eq("session_id", sessionId)
    .order("display_order", { ascending: true });

  if (frozenErr) {
    console.error("[Reprocess] Frozen set read error:", frozenErr);
    return null;
  }
  if (!frozen || frozen.length === 0) return null;

  const questionIds = frozen.map(r => r.question_id);

  const { data: questions, error: qErr } = await serviceClient
    .from("unique_questions")
    .select("id, question_text, section, subsection, scoring_mode")
    .in("id", questionIds);

  if (qErr || !questions) {
    console.error("[Reprocess] Frozen questions fetch error:", qErr);
    return null;
  }

  const { data: answers, error: aErr } = await serviceClient
    .from("unique_answers")
    .select("id, question_id, answer_text, score, most_score, least_score, display_order")
    .in("question_id", questionIds);

  if (aErr) {
    console.error("[Reprocess] Frozen answers fetch error:", aErr);
    return null;
  }

  const questionMap = {};
  questions.forEach(q => { questionMap[q.id] = q; });

  const answersByQuestion = {};
  (answers || []).forEach(a => {
    if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = [];
    answersByQuestion[a.question_id].push(a);
  });

  const assembled = [];
  for (const row of frozen) {
    const q = questionMap[row.question_id];
    if (!q) continue;

    const answersForQ = answersByQuestion[row.question_id] || [];
    const answerOrder = Array.isArray(row.answer_order) ? row.answer_order : [];

    let orderedAnswers;
    if (answerOrder.length > 0) {
      const answerMap = {};
      answersForQ.forEach(a => { answerMap[a.id] = a; });
      orderedAnswers = answerOrder
        .map(entry => {
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
      orderedAnswers = answersForQ.map(a => ({
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

  return {
    questions: assembled,
    assessmentVersion: frozen[0]?.assessment_version ?? 1,
    scoringVersion: frozen[0]?.scoring_version ?? 1
  };
}

// ----------------------------------------------------------
// Core scoring — same shape as submit.js.
// ----------------------------------------------------------
function scoreAssessment({
  questions,
  responses,
  isBaseline,
  assessmentFallbackMode
}) {
  const responseLookup = {};
  (responses || []).forEach(r => {
    responseLookup[r.question_id] = r;
  });

  const categoryEarnedMap = {};
  const categoryMaxMap = {};
  let totalEarned = 0;
  let totalMax = 0;

  // The `in` check is critical — see submit.js v15 comments.
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

    const responseShape = { ...response, unique_questions: q };
    const scored = scoreQuestionResponse(responseShape, isBaseline, questionMode);
    const earned = Number(scored.score) || 0;
    const max = Number(scored.maxScore) || 0;

    totalEarned += earned;
    totalMax += max;
    categoryEarnedMap[section] += earned;
    categoryMaxMap[section] += max;
  });

  const percentage = totalMax > 0
    ? Math.round((totalEarned / totalMax) * 100)
    : 0;

  const categoryScores = Object.keys(categoryEarnedMap).map(category => {
    const earned = categoryEarnedMap[category];
    const max = categoryMaxMap[category];
    const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
    return { category, earned, max, percentage: pct };
  });

  const distinctModes = new Set(
    questions
      .map(q => q.scoring_mode || assessmentFallbackMode)
      .filter(Boolean)
  );
  const scoredWithMode = distinctModes.size === 1
    ? Array.from(distinctModes)[0]
    : "mixed";

  return {
    totalEarned,
    totalMax,
    percentage,
    categoryScores,
    scoredWithMode,
    scoringModeDistribution: Array.from(distinctModes)
  };
}

// ----------------------------------------------------------
// Competency scoring — same shape as submit.js step 19.
// ----------------------------------------------------------
async function computeCompetencyRows({
  serviceClient,
  questions,
  responses,
  questionCompetencies,
  typeCode,
  fallbackMode
}) {
  if (!questionCompetencies || questionCompetencies.length === 0) {
    return [];
  }

  const responseLookup = {};
  (responses || []).forEach(r => { responseLookup[r.question_id] = r; });

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

  const scores = calculateCompetencyScores(
    responsesWithQuestions,
    questionCompetencies,
    { code: typeCode, scoring_mode: fallbackMode }
  );

  return Object.values(scores)
    .map(c => ({
      competency_id: c.id,
      raw_score: c.rawScore,
      max_possible: c.maxPossible,
      percentage: c.percentage,
      classification: c.classification,
      question_count: c.questionCount
    }))
    .filter(r => Number.isFinite(Number(r.competency_id)) && Number(r.competency_id) > 0);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth: enforce only if ADMIN_API_KEY is configured.
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) {
    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${adminKey}`) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }

  const { assessmentResultId, dryRun = false } = req.body || {};

  if (!assessmentResultId) {
    return res.status(400).json({
      success: false,
      error: "Missing assessmentResultId"
    });
  }

  let serviceClient;
  try {
    serviceClient = getServiceClient();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }

  try {
    // 1. Load the result row + assessment_type info
    const { data: record, error: recErr } = await serviceClient
      .from("assessment_results")
      .select(`
        id,
        user_id,
        assessment_id,
        session_id,
        total_score,
        max_score,
        percentage_score,
        category_scores,
        assessments!assessment_id (
          id,
          title,
          assessment_type_id,
          assessment_type:assessment_types (code, scoring_mode)
        )
      `)
      .eq("id", assessmentResultId)
      .maybeSingle();

    if (recErr) {
      console.error("[Reprocess] Result lookup failed:", recErr);
      return res.status(500).json({
        success: false,
        error: "Result lookup failed",
        details: recErr.message
      });
    }

    if (!record) {
      return res.status(404).json({ success: false, error: "Result not found" });
    }

    if (!record.session_id) {
      return res.status(400).json({
        success: false,
        error: "Result has no session_id; cannot reprocess"
      });
    }

    console.log(`[Reprocess] Result ${record.id} → session ${record.session_id}`);

    // 2. Load frozen questions
    const frozenResult = await loadFrozenQuestions(serviceClient, record.session_id);

    if (!frozenResult || !frozenResult.questions || frozenResult.questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No frozen questions found for session"
      });
    }

    const questions = frozenResult.questions;
    console.log(`[Reprocess] Loaded ${questions.length} frozen questions`);

    // 3. Load responses
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, least_answer_id, times_changed, metadata")
      .eq("session_id", record.session_id);

    if (responsesError) {
      console.error("[Reprocess] Responses fetch failed:", responsesError);
      return res.status(500).json({
        success: false,
        error: "Responses fetch failed",
        details: responsesError.message
      });
    }

    console.log(`[Reprocess] Loaded ${responses?.length || 0} responses`);

    // 4. Resolve assessment mode
    const typeCode = record.assessments?.assessment_type?.code || "general";
    const assessmentMode = record.assessments?.assessment_type?.scoring_mode || "single_select";
    const isBaseline = isBaselineAssessmentType(typeCode);
    const fallbackMode = isBaseline ? "baseline" : assessmentMode;

    console.log(`[Reprocess] typeCode=${typeCode} mode=${assessmentMode} baseline=${isBaseline}`);

    // 5. Score
    const scored = scoreAssessment({
      questions,
      responses,
      isBaseline,
      assessmentFallbackMode: fallbackMode
    });

    console.log(`[Reprocess] Score: ${scored.totalEarned}/${scored.totalMax} = ${scored.percentage}%`);

    // 6. Competencies
    const questionIds = questions.map(q => q.id);
    const { data: questionCompetencies, error: qcError } = await serviceClient
      .from("question_competencies")
      .select("question_id, competency_id, weight, competencies(id, name, category)")
      .in("question_id", questionIds);

    if (qcError) {
      console.error("[Reprocess] question_competencies fetch failed:", qcError);
    }

    let competencyRows = [];
    if (questionCompetencies && questionCompetencies.length > 0) {
      competencyRows = await computeCompetencyRows({
        serviceClient,
        questions,
        responses,
        questionCompetencies,
        typeCode,
        fallbackMode
      });
      console.log(`[Reprocess] Competency rows: ${competencyRows.length}`);
    } else {
      console.log("[Reprocess] No question_competencies mappings found");
    }

    // 7. Dry run — return without writing
    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        resultId: record.id,
        before: {
          total_score: record.total_score,
          max_score: record.max_score,
          percentage_score: record.percentage_score,
          category_scores: record.category_scores
        },
        after: {
          total_score: scored.totalEarned,
          max_score: scored.totalMax,
          percentage_score: scored.percentage,
          category_scores: scored.categoryScores,
          competency_rows: competencyRows.length,
          scored_with_mode: scored.scoredWithMode,
          scoring_mode_distribution: scored.scoringModeDistribution
        }
      });
    }

    // 8. Persist assessment_results
    const { error: updateErr } = await serviceClient
      .from("assessment_results")
      .update({
        total_score: scored.totalEarned,
        max_score: scored.totalMax,
        percentage_score: scored.percentage,
        category_scores: scored.categoryScores,
        updated_at: new Date().toISOString()
      })
      .eq("id", record.id);

    if (updateErr) {
      console.error("[Reprocess] Update failed:", updateErr);
      return res.status(500).json({
        success: false,
        error: "Failed to update assessment_results",
        details: updateErr.message
      });
    }

    // 9. Replace candidate_competency_scores for this candidate + assessment
    const { error: deleteErr } = await serviceClient
      .from("candidate_competency_scores")
      .delete()
      .eq("candidate_id", record.user_id)
      .eq("assessment_id", record.assessment_id);

    if (deleteErr) {
      console.warn("[Reprocess] Competency delete failed (non-fatal):", deleteErr.message);
    }

    let competencyWriteCount = 0;
    if (competencyRows.length > 0) {
      const rowsWithKeys = competencyRows.map(r => ({
        candidate_id: record.user_id,
        assessment_id: record.assessment_id,
        competency_id: r.competency_id,
        raw_score: r.raw_score,
        max_possible: r.max_possible,
        percentage: r.percentage,
        classification: r.classification,
        question_count: r.question_count
      }));

      const { error: upsertErr } = await serviceClient
        .from("candidate_competency_scores")
        .upsert(rowsWithKeys, {
          onConflict: "candidate_id,assessment_id,competency_id"
        });

      if (upsertErr) {
        console.warn("[Reprocess] Competency upsert failed (non-fatal):", upsertErr.message);
      } else {
        competencyWriteCount = rowsWithKeys.length;
        console.log(`[Reprocess] Wrote ${competencyWriteCount} competency rows`);
      }
    }

    return res.status(200).json({
      success: true,
      dryRun: false,
      resultId: record.id,
      before: {
        total_score: record.total_score,
        max_score: record.max_score,
        percentage_score: record.percentage_score
      },
      after: {
        total_score: scored.totalEarned,
        max_score: scored.totalMax,
        percentage_score: scored.percentage,
        category_scores: scored.categoryScores,
        competency_rows_written: competencyWriteCount,
        scored_with_mode: scored.scoredWithMode,
        scoring_mode_distribution: scored.scoringModeDistribution
      }
    });

  } catch (error) {
    console.error("[Reprocess] Unhandled error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}
