// pages/api/assessment/submit.js - FULLY CORRECTED WITH BEHAVIORAL TRACKING
// Version: submit-behavioral-v1
// - Complete behavioral data saved to database
// - Proper proctoring_data structure for Behavioral Matrix
// - Answer changes tracking

import { createClient } from "@supabase/supabase-js";

const SUBMIT_BUILD = "submit-behavioral-v1";
const PRACTICAL_ASSESSMENT_IDS = [
  'c2bc4994-1c4a-4094-a763-8d9d560b759e',
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0',
  'a6000077-095d-4115-bc4e-5936fce953e9',
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc'
];
const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

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
    // STEP 4: Get assessment (SEPARATE LOOKUP - NO EMBEDDED RELATIONSHIP)
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
        message: assessmentError?.message,
        details: assessmentError?.details,
        hint: assessmentError?.hint
      });
      return res.status(500).json({
        success: false,
        error: "Assessment lookup failed",
        diagnosticCode: assessmentError?.code || "ASSESSMENT_NOT_FOUND",
        debug: {
          assessmentId: session.assessment_id,
          code: assessmentError?.code,
          message: assessmentError?.message
        }
      });
    }

    console.log(`[Submit] Assessment found: ${assessment.id} - ${assessment.title}`);

    // ============================================================
    // STEP 5: Get assessment type (SEPARATE LOOKUP)
    // ============================================================
    console.log(`[Submit] Looking up assessment type: ${assessment.assessment_type_id}`);
    const { data: assessmentType, error: typeError } = await serviceClient
      .from("assessment_types")
      .select("id, code, name, question_count")
      .eq("id", assessment.assessment_type_id)
      .single();

    if (typeError || !assessmentType) {
      console.error("[Submit] Assessment type lookup failed:", {
        typeId: assessment.assessment_type_id,
        code: typeError?.code,
        message: typeError?.message
      });
      // Continue without type - we'll use direct question count
    } else {
      console.log(`[Submit] Assessment type: ${assessmentType.code} (${assessmentType.id})`);
    }

    const isNationalService = assessmentType?.code === 'national_service' ||
                             session.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;

    // ============================================================
    // STEP 6: Get responses with metadata (for answer changes)
    // ============================================================
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, metadata, times_changed")
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("[Submit] Responses error:", responsesError);
    }
    console.log(`[Submit] Found ${responses?.length || 0} responses`);

    // Calculate answer changes from responses
    let totalAnswerChanges = 0;
    let totalCopyAttempts = 0;
    let totalPasteAttempts = 0;
    let totalRightClickAttempts = 0;

    if (responses && responses.length > 0) {
      responses.forEach(r => {
        // Count answer changes from times_changed field
        totalAnswerChanges += Number(r.times_changed) || 0;
        
        // Get from metadata if available
        const metadata = r.metadata || {};
        totalCopyAttempts += Number(metadata.copy_attempts) || 0;
        totalPasteAttempts += Number(metadata.paste_attempts) || 0;
        totalRightClickAttempts += Number(metadata.right_click_attempts) || 0;
      });
    }

    // ============================================================
    // STEP 7: Get questions DIRECTLY from questions table
    // ============================================================
    const { data: questionsData, error: questionsError } = await serviceClient
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
      .eq("assessment_id", assessment.id)
      .eq("is_active", true)
      .order("question_order", { ascending: true });

    if (questionsError) {
      console.error("[Submit] Questions error:", questionsError);
    }

    // If direct questions not found, try unique_questions as fallback
    let fallbackUsed = false;
    let questions = questionsData || [];

    if (questions.length === 0) {
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
        .eq("assessment_type_id", assessment.assessment_type_id);

      if (!fallbackError && fallbackQuestions) {
        questions = fallbackQuestions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          section: q.section,
          answers: q.unique_answers || []
        }));
      }
    }

    if (questions.length === 0) {
      console.error("[Submit] No questions found for assessment:", assessment.id);
      return res.status(409).json({
        success: false,
        error: "No questions found for this assessment",
        diagnosticCode: "NO_QUESTIONS_FOUND"
      });
    }

    console.log(`[Submit] Questions found: ${questions.length} (fallback: ${fallbackUsed})`);

    // ============================================================
    // STEP 8: Calculate scores
    // ============================================================
    const responseMap = {};
    (responses || []).forEach(r => {
      responseMap[r.question_id] = r.answer_id;
    });

    const categoryMap = {};
    const categoryMaxMap = {};
    let totalEarned = 0;
    let totalMax = 0;

    questions.forEach(q => {
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
    // STEP 9: Validate question count
    // ============================================================
    let expectedTotalQuestions = 0;
    
    if (assessmentType?.question_count && assessmentType.question_count > 0) {
      expectedTotalQuestions = assessmentType.question_count;
    } else if (questions.length > 0) {
      expectedTotalQuestions = questions.length;
    } else {
      expectedTotalQuestions = getTotalQuestions(assessment.id);
    }

    console.log(`[Submit] Expected: ${expectedTotalQuestions}, Actual: ${questions.length}`);

    if (questions.length !== expectedTotalQuestions) {
      console.warn(`[Submit] Question count mismatch: expected ${expectedTotalQuestions}, found ${questions.length}`);
      totalMax = questions.length;
    }

    const finalPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${finalPercentage}%`);

    // ============================================================
    // STEP 10: Build category_scores
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
    // STEP 11: Calculate recommendation
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
    // STEP 12: Process proctoring data
    // ============================================================
    const proctoring = proctoringData || {};
    const externalUrls = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls : [];
    const violations = Array.isArray(proctoring.violations) ? proctoring.violations : [];
    const tabSwitches = Array.isArray(proctoring.tabSwitches) ? proctoring.tabSwitches : [];
    
    const summary = proctoring.summary || {};
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    const externalUrlsVisited = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls.length : 0;
    
    // Also get from the frontend's violation tracking
    if (responses && responses.length > 0) {
      const responseMetadata = responses.map(r => r.metadata || {});
      const totalViolationsFromResponses = responseMetadata.reduce((sum, meta) => sum + (Number(meta.violations) || 0), 0);
      if (totalViolationsFromResponses > totalViolations) {
        totalViolations = totalViolationsFromResponses;
      }
    }

    // ============================================================
    // STEP 13: Calculate risk
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
    // STEP 14: Time tracking
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
    const avgTimePerQuestion = calculateAvgTimePerQuestion(totalSeconds, totalMax);

    // ============================================================
    // STEP 15: Update session
    // ============================================================
    const { error: sessionUpdateError } = await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: completedAt,
        updated_at: completedAt
      })
      .eq("id", sessionId);

    if (sessionUpdateError) {
      console.error("[Submit] Session update error:", sessionUpdateError);
      return res.status(500).json({
        success: false,
        error: "Failed to update session",
        diagnosticCode: "SESSION_UPDATE_FAILED"
      });
    }

    // ============================================================
    // STEP 16: Check existing result
    // ============================================================
    const { data: existingResult, error: existingResultError } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingResultError) {
      console.error("[Submit] Existing result error:", existingResultError);
    }

    // ============================================================
    // STEP 17: Build result data with COMPLETE BEHAVIORAL DATA
    // ============================================================
    const resultData = {
      user_id: session.user_id,
      assessment_id: assessment.id,
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
      total_questions: totalMax,
      answered_questions: (responses || []).length,
      
      // ============================================================
      // BEHAVIORAL MATRIX DATA - ALL FIELDS
      // ============================================================
      proctoring_data: {
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
          answerChanges: totalAnswerChanges
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
        avg_time_per_question: avgTimePerQuestion
      },
      
      external_urls_visited: externalUrls,
      domain_visits: proctoring.domainVisits || {},
      tab_switch_details: tabSwitches,
      violations: violations,
      total_tab_switches: totalTabSwitches,
      total_external_urls: externalUrlsVisited,
      
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
        totalQuestions: totalMax,
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
          riskScore: riskScore
        },
        proctoring: {
          riskLevel: riskLevel,
          riskScore: riskScore,
          totalViolations: totalViolations,
          externalUrlsVisited: externalUrlsVisited,
          tabSwitches: totalTabSwitches,
          duration: totalSeconds,
          durationFormatted: totalDurationFormatted,
          avgTimePerQuestion: avgTimePerQuestion
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

      if (updateError) {
        console.error("[Submit] Result update error:", updateError);
        return res.status(500).json({
          success: false,
          error: "Failed to update result",
          diagnosticCode: "RESULT_UPDATE_FAILED"
        });
      }
      resultId = updatedResult?.id;
    } else {
      const { data: newResult, error: createError } = await serviceClient
        .from("assessment_results")
        .insert(resultData)
        .select()
        .single();

      if (createError) {
        console.error("[Submit] Result create error:", createError);
        return res.status(500).json({
          success: false,
          error: "Failed to save result",
          diagnosticCode: "RESULT_CREATE_FAILED"
        });
      }
      resultId = newResult?.id;
    }

    console.log(`[Submit] Result saved: ${resultId}`);

    // ============================================================
    // STEP 18: Update candidate_assessments
    // ============================================================
    if (resultId) {
      const { error: caUpdateError } = await serviceClient
        .from("candidate_assessments")
        .update({
          result_id: resultId,
          status: "completed",
          completed_at: completedAt,
          updated_at: completedAt,
          score: totalEarned
        })
        .eq("user_id", session.user_id)
        .eq("assessment_id", assessment.id);

      if (caUpdateError) {
        console.error("[Submit] Candidate assessment update error:", caUpdateError);
        // Don't fail the submission, just log it
      }
    }

    // ============================================================
    // STEP 19: Return response with COMPLETE behavioral data
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
      timeTracking: {
        startedAt: assessmentStartedAt,
        completedAt: completedAt,
        totalSeconds: totalSeconds,
        totalDurationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        totalQuestions: totalMax
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
        riskScore: riskScore
      },
      proctoring: {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: externalUrlsVisited,
        tabSwitches: totalTabSwitches
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
