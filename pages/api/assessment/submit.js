// pages/api/assessment/submit.js - FULLY CORRECTED
// Uses assessment_id from session, scores direct questions

import { createClient } from "@supabase/supabase-js";

// ============================================================
// PRACTICAL ASSESSMENT IDs
// ============================================================
const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',
  'a6000077-095d-4115-bc4e-5936fce953e9',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'
];

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// HELPER: Format duration
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
  const avgSeconds = Math.round(totalSeconds / questionCount);
  if (avgSeconds < 60) return `${avgSeconds}s`;
  const minutes = Math.floor(avgSeconds / 60);
  const seconds = avgSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function getTotalQuestions(assessmentId) {
  if (PRACTICAL_ASSESSMENT_IDS.includes(assessmentId)) return 40;
  if (assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID) return 80;
  return 100;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, autoSubmitted, proctoringData, startedAt } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
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
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    // ============================================================
    // STEP 1: Get session - MUST have assessment_id
    // ============================================================
    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // ============================================================
    // STEP 2: Validate session has assessment_id
    // ============================================================
    if (!session.assessment_id) {
      console.error("[Submit] Session missing assessment_id:", session.id);
      return res.status(409).json({
        success: false,
        error: "Session is missing assessment_id. Please start a new assessment session."
      });
    }

    // ============================================================
    // STEP 3: Get assessment by assessment_id (NO FALLBACK)
    // ============================================================
    const { data: assessment, error: assessmentError } = await serviceClient
      .from("assessments")
      .select("id, title, assessment_type_id, assessment_type:assessment_types(*)")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      console.error("[Submit] Assessment lookup failed:", assessmentError);
      return res.status(404).json({
        success: false,
        error: "Assessment not found"
      });
    }

    const assessmentType = assessment.assessment_type || {};
    const isNationalService = assessmentType.code === 'national_service' ||
                             session.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;
    const finalAssessmentId = assessment.id;

    console.log("[Submit] Assessment found:", {
      id: finalAssessmentId,
      title: assessment.title,
      typeId: assessment.assessment_type_id
    });

    // ============================================================
    // STEP 4: Get responses
    // ============================================================
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, metadata")
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("Responses error:", responsesError);
    }

    // ============================================================
    // STEP 5: Get questions DIRECTLY from questions table
    // ============================================================
    const { data: questions, error: questionsError } = await serviceClient
      .from("questions")
      .select(`
        id,
        question_text,
        section,
        answers (
          id,
          answer_text,
          score,
          is_active
        )
      `)
      .eq("assessment_id", finalAssessmentId)
      .eq("is_active", true)
      .order("question_order", { ascending: true });

    if (questionsError) {
      console.error("Questions error:", questionsError);
    }

    // If direct questions not found, try unique_questions as fallback
    let fallbackUsed = false;
    let questionsData = questions || [];

    if (questionsData.length === 0) {
      console.log("[Submit] No direct questions found, trying unique_questions");
      fallbackUsed = true;
      
      const { data: fallbackQuestions, error: fallbackError } = await serviceClient
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
        .eq("assessment_type_id", session.assessment_type_id);

      if (!fallbackError && fallbackQuestions) {
        questionsData = fallbackQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          section: q.section,
          answers: q.unique_answers || []
        }));
      }
    }

    if (questionsData.length === 0) {
      return res.status(409).json({
        success: false,
        error: "No questions found for this assessment"
      });
    }

    // ============================================================
    // STEP 6: Calculate scores
    // ============================================================
    const responseMap = {};
    (responses || []).forEach(r => {
      responseMap[r.question_id] = r.answer_id;
    });

    const categoryMap = {};
    const categoryMaxMap = {};
    let totalEarned = 0;
    let totalMax = 0;

    questionsData.forEach(q => {
      const answers = q.answers || [];
      const maxScore = 1;
      totalMax += maxScore;

      const section = q.section || "General";
      
      if (!categoryMap[section]) {
        categoryMap[section] = 0;
        categoryMaxMap[section] = 0;
      }
      categoryMaxMap[section] += maxScore;

      const userAnswer = responseMap[q.id];
      if (userAnswer) {
        const selectedAnswer = answers.find(a => String(a.id) === String(userAnswer));
        if (selectedAnswer) {
          const earned = Number(selectedAnswer.score) > 0 ? 1 : 0;
          totalEarned += earned;
          categoryMap[section] += earned;
        }
      }
    });

    // ============================================================
    // STEP 7: Validate question count
    // ============================================================
    const expectedTotalQuestions = getTotalQuestions(finalAssessmentId);

    if (totalMax !== expectedTotalQuestions) {
      console.warn(`[Submit] Question count mismatch: expected ${expectedTotalQuestions}, found ${totalMax}`);
      // Use the expected count for scoring denominator
      totalMax = expectedTotalQuestions;
    }

    const finalPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${finalPercentage}%`);

    // ============================================================
    // STEP 8: Build category_scores
    // ============================================================
    const categoryScores = Object.keys(categoryMap).map(category => {
      const earned = categoryMap[category];
      const max = categoryMaxMap[category] || 1;
      const percentage = Math.round((earned / max) * 100);
      return {
        category: category,
        earned: earned,
        max: max,
        percentage: percentage
      };
    });

    // ============================================================
    // STEP 9: Calculate recommendation
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
    // STEP 10: Calculate risk
    // ============================================================
    const proctoring = proctoringData || {};
    const summary = proctoring.summary || {};
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    const totalExternalUrls = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls.length : 0;

    let riskScore = 0;
    if (totalTabSwitches > 50) riskScore += 30;
    else if (totalTabSwitches > 10) riskScore += 20;
    else if (totalTabSwitches > 0) riskScore += 5;
    
    if (totalViolations > 10) riskScore += 30;
    else if (totalViolations > 5) riskScore += 20;
    else if (totalViolations > 0) riskScore += 10;
    
    if (totalExternalUrls > 0) riskScore += 25;
    
    riskScore = Math.min(riskScore, 100);
    
    let riskLevel = 'low';
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';

    // ============================================================
    // STEP 11: Time tracking
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

    if (totalSeconds < 0) totalSeconds = 0;
    const totalDurationFormatted = formatDuration(totalSeconds);
    const avgTimePerQuestion = calculateAvgTimePerQuestion(totalSeconds, expectedTotalQuestions);

    // ============================================================
    // STEP 12: Update session
    // ============================================================
    await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: completedAt,
        updated_at: completedAt
      })
      .eq("id", sessionId);

    // ============================================================
    // STEP 13: Check existing result
    // ============================================================
    const { data: existingResult } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    // ============================================================
    // STEP 14: Build result data
    // ============================================================
    const resultData = {
      user_id: session.user_id,
      assessment_id: finalAssessmentId,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: finalPercentage,
      started_at: assessmentStartedAt,
      completed_at: completedAt,
      total_seconds: totalSeconds,
      is_valid: riskLevel !== 'high',
      is_auto_submitted: autoSubmitted || false,
      category_scores: categoryScores,
      workplace_readiness: 0,
      intellectual_capability: 0,
      recommendation: recommendation,
      risk_level: riskLevel,
      risk_score: riskScore,
      total_questions: expectedTotalQuestions,
      answered_questions: (responses || []).length,
      report_data: {
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
        totalQuestions: expectedTotalQuestions,
        proctoring: {
          riskLevel: riskLevel,
          riskScore: riskScore,
          totalViolations: totalViolations,
          externalUrlsVisited: totalExternalUrls,
          tabSwitches: totalTabSwitches
        }
      }
    };

    let resultId;

    if (existingResult) {
      const { data: updatedResult, error: updateError } = await serviceClient
        .from("assessment_results")
        .update(resultData)
        .eq("id", existingResult.id)
        .select()
        .single();

      if (!updateError && updatedResult) {
        resultId = updatedResult.id;
      }
    } else {
      const { data: newResult, error: createError } = await serviceClient
        .from("assessment_results")
        .insert(resultData)
        .select()
        .single();

      if (!createError && newResult) {
        resultId = newResult.id;
      }
    }

    // ============================================================
    // STEP 15: Update candidate_assessments
    // ============================================================
    if (resultId) {
      await serviceClient
        .from("candidate_assessments")
        .update({
          result_id: resultId,
          status: "completed",
          completed_at: completedAt,
          updated_at: completedAt,
          score: totalEarned
        })
        .eq("user_id", session.user_id)
        .eq("assessment_id", finalAssessmentId);
    }

    // ============================================================
    // STEP 16: Return response
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
      timeTracking: {
        startedAt: assessmentStartedAt,
        completedAt: completedAt,
        totalSeconds: totalSeconds,
        totalDurationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        totalQuestions: expectedTotalQuestions
      },
      proctoring: {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: totalExternalUrls,
        tabSwitches: totalTabSwitches
      }
    });

  } catch (error) {
    console.error("Error submitting assessment:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}
