// pages/api/assessment/submit.js - FULLY CORRECTED WITH FALLBACK ASSESSMENT LOOKUP

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
// QUESTION COUNT MAP
// ============================================================
const QUESTION_COUNT_MAP = {
  'c2bc4994-1c4a-4094-a763-8d9d560b759e': 40,
  '243275ec-9bb5-43ce-9f02-1111b2ca66e0': 40,
  'a6000077-095d-4115-bc4e-5936fce953e9': 40,
  '928f81fc-35ea-40ac-83cb-7c3a0c1c18dc': 40,
  'bdb9d46e-9fac-4d00-8478-1f649e7ac600': 80,
};

function getTotalQuestions(assessmentId, assessmentType) {
  if (PRACTICAL_ASSESSMENT_IDS.includes(assessmentId)) {
    return 40;
  }
  if (assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID || assessmentType?.code === 'national_service') {
    return 80;
  }
  return QUESTION_COUNT_MAP[assessmentId] || 100;
}

// ============================================================
// HELPER: Split categories into Workplace and Intellectual
// ============================================================
const WORKPLACE_KEYWORDS = [
  'safety', 'risk_awareness', 'risk', 'hazard',
  'technical_fundamentals', 'technical',
  'problem_solving', 'troubleshooting',
  'communication', 'teamwork', 'collaboration',
  'ownership', 'integrity', 'accountability',
  'professional_conduct', 'work_ethic', 'ethics',
  'workplace', 'workplace_readiness', 'readiness',
  'learning_agility', 'agility', 'adaptability'
];

const INTELLECTUAL_KEYWORDS = [
  'numerical_reasoning', 'numerical_aptitude', 'numerical', 'math',
  'logical_reasoning', 'logic', 'reasoning',
  'measurement', 'engineering_units', 'units',
  'spatial_reasoning', 'spatial',
  'analysis',
  'critical_thinking', 'analytical', 'decision_making',
  'intellectual', 'cognitive', 'capability'
];

function cleanText(value, fallback = "") {
  if (!value) return fallback;
  return String(value).toLowerCase().replace(/\s+/g, '_');
}

function isWorkplaceCategory(category) {
  const normalized = cleanText(category, '');
  return WORKPLACE_KEYWORDS.some(key => normalized.includes(key));
}

function isIntellectualCategory(category) {
  const normalized = cleanText(category, '');
  return INTELLECTUAL_KEYWORDS.some(key => normalized.includes(key));
}

function calculateScoresFromCategories(categoryScores) {
  let workplaceTotal = 0;
  let workplaceCount = 0;
  let intellectualTotal = 0;
  let intellectualCount = 0;

  if (!Array.isArray(categoryScores) || categoryScores.length === 0) {
    return { workplaceReadiness: 0, intellectualCapability: 0 };
  }

  categoryScores.forEach(cat => {
    const name = (cat.category || cat.name || '').toLowerCase();
    const percentage = Number(cat.percentage || cat.score || 0);
    
    if (isWorkplaceCategory(name)) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectualCategory(name)) {
      intellectualTotal += percentage;
      intellectualCount++;
    }
  });

  const workplaceReadiness = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
  const intellectualCapability = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;

  return { workplaceReadiness, intellectualCapability };
}

// ============================================================
// HELPER: Format seconds to HH:MM:SS
// ============================================================
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================
// HELPER: Calculate average time per question
// ============================================================
function calculateAvgTimePerQuestion(totalSeconds, questionCount) {
  if (!totalSeconds || totalSeconds <= 0 || !questionCount || questionCount <= 0) {
    return '0s';
  }
  const avgSeconds = Math.round(totalSeconds / questionCount);
  if (avgSeconds < 60) {
    return `${avgSeconds}s`;
  }
  const minutes = Math.floor(avgSeconds / 60);
  const seconds = avgSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { 
      sessionId, 
      autoSubmitted, 
      autoSubmitReason, 
      allowIncomplete,
      proctoringData,
      startedAt
    } = req.body;

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

    // Verify user
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    // ============================================================
    // STEP 1: Get session details
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
    // STEP 2: Get assessment details with fallback
    // ============================================================
    let assessment = null;
    let assessmentError = null;

    // First try: use assessment_id from session
    if (session.assessment_id) {
      const { data, error } = await serviceClient
        .from("assessments")
        .select("id, title, assessment_type_id, assessment_type:assessment_types(*)")
        .eq("id", session.assessment_id)
        .single();
      
      if (!error && data) {
        assessment = data;
        console.log("[Submit] Found assessment by assessment_id:", assessment.id);
      }
    }

    // Second try: use assessment_type_id from session
    if (!assessment && session.assessment_type_id) {
      const { data, error } = await serviceClient
        .from("assessments")
        .select("id, title, assessment_type_id, assessment_type:assessment_types(*)")
        .eq("assessment_type_id", session.assessment_type_id)
        .maybeSingle();
      
      if (!error && data) {
        assessment = data;
        console.log("[Submit] Found assessment by assessment_type_id:", assessment.id);
      }
    }

    if (!assessment) {
      console.error("[Submit] Assessment not found for session:", {
        sessionId: session.id,
        assessment_id: session.assessment_id,
        assessment_type_id: session.assessment_type_id
      });
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    const assessmentType = assessment.assessment_type || {};
    const isNationalService = assessmentType.code === 'national_service' || 
                             session.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID;
    const assessmentId = assessment.id;

    // ============================================================
    // STEP 3: Get all responses
    // ============================================================
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, metadata")
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("Responses error:", responsesError);
    }

    // ============================================================
    // STEP 4: Get all questions with answers
    // ============================================================
    const { data: questions, error: questionsError } = await serviceClient
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

    if (questionsError) {
      console.error("Questions error:", questionsError);
    }

    // ============================================================
    // STEP 5: Calculate scores
    // ============================================================
    let totalEarned = 0;
    let totalMax = 0;

    const responseMap = {};
    (responses || []).forEach(r => {
      responseMap[r.question_id] = r.answer_id;
    });

    const categoryMap = {};
    const categoryMaxMap = {};

    (questions || []).forEach(q => {
      const answers = q.unique_answers || [];
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
    // STEP 6: Use the correct total question count
    // ============================================================
    const expectedTotalQuestions = getTotalQuestions(assessmentId, assessmentType);
    
    if (totalMax !== expectedTotalQuestions) {
      console.log(`[Submit] Fixing totalMax from ${totalMax} to ${expectedTotalQuestions}`);
      totalMax = expectedTotalQuestions;
    }

    const finalPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${finalPercentage}%`);
    console.log(`[Submit] Assessment: ${assessmentId}, Type: ${assessmentType.code || 'unknown'}`);

    // ============================================================
    // STEP 7: Build category_scores
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
    // STEP 8: Calculate workplace and intellectual scores
    // ============================================================
    let workplaceReadiness = 0;
    let intellectualCapability = 0;

    if (isNationalService && categoryScores.length > 0) {
      const calculated = calculateScoresFromCategories(categoryScores);
      workplaceReadiness = calculated.workplaceReadiness;
      intellectualCapability = calculated.intellectualCapability;
    }

    // ============================================================
    // STEP 9: Calculate TIME TRACKING
    // ============================================================
    const completedAt = new Date().toISOString();
    let assessmentStartedAt = null;
    let totalSeconds = 0;
    let totalDurationFormatted = '00:00:00';
    let avgTimePerQuestion = '0s';
    const questionCount = expectedTotalQuestions;

    if (startedAt) {
      assessmentStartedAt = startedAt;
      const start = new Date(assessmentStartedAt);
      const end = new Date(completedAt);
      totalSeconds = Math.floor((end - start) / 1000);
    } else if (session.started_at) {
      assessmentStartedAt = session.started_at;
      const start = new Date(session.started_at);
      const end = new Date(completedAt);
      totalSeconds = Math.floor((end - start) / 1000);
    } else if (proctoringData?.summary?.duration) {
      totalSeconds = Math.floor(Number(proctoringData.summary.duration));
      if (totalSeconds > 0) {
        const estimatedStart = new Date(completedAt);
        estimatedStart.setSeconds(estimatedStart.getSeconds() - totalSeconds);
        assessmentStartedAt = estimatedStart.toISOString();
      }
    } else if (session.created_at) {
      assessmentStartedAt = session.created_at;
      const start = new Date(session.created_at);
      const end = new Date(completedAt);
      totalSeconds = Math.floor((end - start) / 1000);
    }

    if (totalSeconds < 0) totalSeconds = 0;
    totalDurationFormatted = formatDuration(totalSeconds);
    avgTimePerQuestion = calculateAvgTimePerQuestion(totalSeconds, questionCount);

    // ============================================================
    // STEP 10: Process proctoring data
    // ============================================================
    const proctoring = proctoringData || {};
    const externalUrls = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls : [];
    const violations = Array.isArray(proctoring.violations) ? proctoring.violations : [];
    const tabSwitches = Array.isArray(proctoring.tabSwitches) ? proctoring.tabSwitches : [];
    
    const summary = proctoring.summary || {};
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    
    if (totalViolations === 0 && violations.length > 0) totalViolations = violations.length;
    if (totalTabSwitches === 0 && tabSwitches.length > 0) totalTabSwitches = tabSwitches.length;
    
    const copyPasteAttempts = Number(summary.copyPasteAttempts) || 0;
    const rightClickAttempts = Number(summary.rightClickAttempts) || 0;
    const totalExternalUrls = externalUrls.length;
    const uniqueDomains = [...new Set(externalUrls.map(u => u.domain || u.url))].length;

    // ============================================================
    // STEP 11: RISK CALCULATION
    // ============================================================
    let riskScore = 0;
    if (totalTabSwitches > 50) riskScore += 30;
    else if (totalTabSwitches > 10) riskScore += 20;
    else if (totalTabSwitches > 0) riskScore += 5;
    
    if (totalViolations > 10) riskScore += 30;
    else if (totalViolations > 5) riskScore += 20;
    else if (totalViolations > 0) riskScore += 10;
    
    if (totalExternalUrls > 0) {
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
    // STEP 12: Calculate Recommendation
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
    // STEP 13: Update session status
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
    // STEP 14: Check for existing result
    // ============================================================
    const { data: existingResult } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    // ============================================================
    // STEP 15: Build resultData
    // ============================================================
    const resultData = {
      user_id: session.user_id,
      assessment_id: assessmentId,
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
      workplace_readiness: workplaceReadiness,
      intellectual_capability: intellectualCapability,
      recommendation: recommendation,
      risk_level: riskLevel,
      risk_score: riskScore,
      total_questions: expectedTotalQuestions,
      answered_questions: (responses || []).length,
      proctoring_data: {
        summary: {
          totalViolations: totalViolations,
          tabSwitches: totalTabSwitches,
          externalUrlsVisited: totalExternalUrls,
          uniqueDomains: uniqueDomains,
          copyPasteAttempts: copyPasteAttempts,
          rightClickAttempts: rightClickAttempts,
          duration: totalSeconds,
          durationFormatted: totalDurationFormatted,
          avgTimePerQuestion: avgTimePerQuestion,
          riskLevel: riskLevel,
          riskScore: riskScore
        },
        externalUrls: externalUrls,
        domainVisits: proctoring.domainVisits || {},
        violations: violations,
        tabSwitches: tabSwitches
      },
      external_urls_visited: externalUrls,
      domain_visits: proctoring.domainVisits || {},
      tab_switch_details: tabSwitches,
      violations: violations,
      total_tab_switches: totalTabSwitches,
      total_external_urls: totalExternalUrls,
      report_data: {
        categoryScores: categoryScores,
        totalEarned: totalEarned,
        totalMax: totalMax,
        percentageScore: finalPercentage,
        workplaceReadiness: workplaceReadiness,
        intellectualCapability: intellectualCapability,
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
    // STEP 16: Update candidate_assessments
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
        .eq("assessment_id", assessmentId);
    }

    // ============================================================
    // STEP 17: Return response
    // ============================================================
    return res.status(200).json({
      success: true,
      resultId: resultId,
      sessionId: sessionId,
      score: finalPercentage,
      totalEarned: totalEarned,
      totalMax: totalMax,
      categoryScores: categoryScores,
      workplaceReadiness: workplaceReadiness,
      intellectualCapability: intellectualCapability,
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
