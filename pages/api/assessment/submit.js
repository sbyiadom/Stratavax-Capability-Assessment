// pages/api/assessment/submit.js - FULLY CORRECTED WITH TIME TRACKING
// Handles assessment submission with correct scoring, proctoring, and Risk/Recommendation Logic

import { createClient } from "@supabase/supabase-js";

// ============================================================
// HELPER: Split categories into Workplace and Intellectual
// ============================================================
const WORKPLACE_KEYWORDS = [
  'safety', 'risk', 'technical', 'communication', 'teamwork', 
  'ownership', 'integrity', 'workplace', 'ethics', 'professional',
  'readiness', 'conduct', 'attitude', 'work ethic', 'collaboration'
];

const INTELLECTUAL_KEYWORDS = [
  'numerical', 'logical', 'reasoning', 'measurement', 'engineering',
  'spatial', 'problem solving', 'troubleshooting', 'analysis',
  'critical thinking', 'analytical', 'decision making', 'cognitive',
  'aptitude', 'intellectual', 'capability'
];

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
    
    const isWorkplace = WORKPLACE_KEYWORDS.some(keyword => name.includes(keyword));
    const isIntellectual = INTELLECTUAL_KEYWORDS.some(keyword => name.includes(keyword));

    if (isWorkplace) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectual) {
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
      startedAt // Add this to accept started_at from frontend
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
    // STEP 2: Get assessment type
    // ============================================================
    const { data: assessmentType, error: assessmentTypeError } = await serviceClient
      .from("assessment_types")
      .select("code, name")
      .eq("id", session.assessment_type_id)
      .maybeSingle();

    const isNationalService = assessmentType?.code === 'national_service';

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

    const finalPercentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    // ============================================================
    // STEP 6: Build category_scores
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

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${finalPercentage}%`);
    console.log(`[Submit] Categories: ${categoryScores.length}`);

    // ============================================================
    // STEP 7: Calculate workplace and intellectual scores
    // ============================================================
    let workplaceReadiness = 0;
    let intellectualCapability = 0;

    if (isNationalService && categoryScores.length > 0) {
      const calculated = calculateScoresFromCategories(categoryScores);
      workplaceReadiness = calculated.workplaceReadiness;
      intellectualCapability = calculated.intellectualCapability;
      console.log(`[Submit] Workplace: ${workplaceReadiness}%, Intellectual: ${intellectualCapability}%`);
    }

    // ============================================================
    // STEP 8: Calculate TIME TRACKING
    // ============================================================
    const completedAt = new Date().toISOString();
    let startedAt = null;
    let totalSeconds = 0;
    let totalDurationFormatted = '00:00:00';
    let avgTimePerQuestion = '0s';
    const questionCount = (questions || []).length || 1;

    // Priority 1: Use startedAt from frontend (most accurate)
    if (startedAt) {
      startedAt = startedAt;
      const start = new Date(startedAt);
      const end = new Date(completedAt);
      totalSeconds = Math.floor((end - start) / 1000);
    }
    // Priority 2: Use started_at from session
    else if (session.started_at) {
      startedAt = session.started_at;
      const start = new Date(session.started_at);
      const end = new Date(completedAt);
      totalSeconds = Math.floor((end - start) / 1000);
    }
    // Priority 3: Use duration from proctoring data
    else if (proctoringData?.summary?.duration) {
      totalSeconds = Math.floor(Number(proctoringData.summary.duration));
      // Estimate started_at from completed_at minus duration
      if (totalSeconds > 0) {
        const estimatedStart = new Date(completedAt);
        estimatedStart.setSeconds(estimatedStart.getSeconds() - totalSeconds);
        startedAt = estimatedStart.toISOString();
      }
    }
    // Priority 4: Use session.created_at as fallback
    else if (session.created_at) {
      startedAt = session.created_at;
      const start = new Date(session.created_at);
      const end = new Date(completedAt);
      totalSeconds = Math.floor((end - start) / 1000);
    }

    // Ensure we don't have negative time
    if (totalSeconds < 0) totalSeconds = 0;

    // Format the total time
    totalDurationFormatted = formatDuration(totalSeconds);

    // Calculate average time per question
    avgTimePerQuestion = calculateAvgTimePerQuestion(totalSeconds, questionCount);

    console.log(`[Submit] Time Tracking: Started: ${startedAt}, Total: ${totalDurationFormatted}, Avg/Question: ${avgTimePerQuestion}`);

    // ============================================================
    // STEP 9: Process proctoring data
    // ============================================================
    const proctoring = proctoringData || {};
    
    const externalUrls = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls : [];
    const violations = Array.isArray(proctoring.violations) ? proctoring.violations : [];
    const tabSwitches = Array.isArray(proctoring.tabSwitches) ? proctoring.tabSwitches : [];
    
    const summary = proctoring.summary || {};
    
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    
    // Fallback safety
    if (totalViolations === 0 && violations.length > 0) totalViolations = violations.length;
    if (totalTabSwitches === 0 && tabSwitches.length > 0) totalTabSwitches = tabSwitches.length;
    
    const copyPasteAttempts = Number(summary.copyPasteAttempts) || 0;
    const rightClickAttempts = Number(summary.rightClickAttempts) || 0;
    const duration = Number(summary.duration) || totalSeconds;
    
    const totalExternalUrls = externalUrls.length;
    const uniqueDomains = [...new Set(externalUrls.map(u => u.domain || u.url))].length;
    
    // ============================================================
    // STEP 10: RISK CALCULATION
    // ============================================================
    let riskScore = 0;
    
    // Factor 1: Tab Switches
    if (totalTabSwitches > 50) riskScore += 30;
    else if (totalTabSwitches > 10) riskScore += 20;
    else if (totalTabSwitches > 0) riskScore += 5;
    
    // Factor 2: Violations
    if (totalViolations > 10) riskScore += 30;
    else if (totalViolations > 5) riskScore += 20;
    else if (totalViolations > 0) riskScore += 10;
    
    // Factor 3: External URLs
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
    
    // Build Risk Factors Array
    const riskFactors = [];
    if (totalTabSwitches > 50) riskFactors.push({ type: 'excessive_tab_switching', description: `${totalTabSwitches} extreme tab switches detected`, severity: 'high' });
    else if (totalTabSwitches > 10) riskFactors.push({ type: 'excessive_tab_switching', description: `${totalTabSwitches} tab switches detected`, severity: 'medium' });
    else if (totalTabSwitches > 0) riskFactors.push({ type: 'tab_switching', description: `${totalTabSwitches} tab switches detected`, severity: 'low' });
    
    if (totalViolations > 10) riskFactors.push({ type: 'excessive_violations', description: `${totalViolations} violations detected`, severity: 'high' });
    else if (totalViolations > 5) riskFactors.push({ type: 'excessive_violations', description: `${totalViolations} violations detected`, severity: 'medium' });
    else if (totalViolations > 0) riskFactors.push({ type: 'violations', description: `${totalViolations} violations detected`, severity: 'low' });
    
    if (totalExternalUrls > 0) {
      externalUrls.forEach(u => {
        riskFactors.push({
          type: 'external_url_visit',
          description: `Visited ${u.domain} (${u.category})`,
          severity: u.category === 'ai_tool' ? 'high' : u.category === 'search_engine' ? 'high' : 'medium'
        });
      });
    }

    console.log(`[Submit] Proctoring: Total Violations ${totalViolations}, Tab Switches ${totalTabSwitches}`);
    console.log(`[Submit] Proctoring: Risk Level ${riskLevel}, Score ${riskScore}`);

    // ============================================================
    // STEP 11: Update session status
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
    // STEP 12: Check for existing result
    // ============================================================
    const { data: existingResult, error: resultError } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    // ============================================================
    // STEP 13: Calculate Recommendation based on finalPercentage
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
    // STEP 14: Build resultData with time tracking
    // ============================================================
    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: finalPercentage,
      started_at: startedAt,
      completed_at: completedAt,
      total_seconds: totalSeconds,
      is_valid: riskLevel !== 'high',
      is_auto_submitted: autoSubmitted || false,
      
      category_scores: categoryScores,
      workplace_readiness: workplaceReadiness,
      intellectual_capability: intellectualCapability,
      recommendation: recommendation,
      
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
        riskFactors: riskFactors,
        externalUrls: externalUrls,
        domainVisits: proctoring.domainVisits || {},
        categoryStats: {},
        violations: violations,
        tabSwitches: tabSwitches
      },
      
      external_urls_visited: externalUrls,
      domain_visits: proctoring.domainVisits || {},
      tab_switch_details: tabSwitches,
      violations: violations,
      risk_score: riskScore,
      risk_level: riskLevel,
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
        startedAt: startedAt,
        completedAt: completedAt,
        totalSeconds: totalSeconds,
        totalDurationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        totalQuestions: questionCount,
        proctoring: {
          riskLevel: riskLevel,
          riskScore: riskScore,
          totalViolations: totalViolations,
          externalUrlsVisited: totalExternalUrls,
          tabSwitches: totalTabSwitches,
          riskFactors: riskFactors,
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
        console.log(`[Submit] Updated result: ${resultId}`);
      } else {
        console.error("Update result error:", updateError);
      }
    } else {
      const { data: newResult, error: createError } = await serviceClient
        .from("assessment_results")
        .insert(resultData)
        .select()
        .single();

      if (!createError && newResult) {
        resultId = newResult.id;
        console.log(`[Submit] Created result: ${resultId}`);
      } else {
        console.error("Create result error:", createError);
      }
    }

    // ============================================================
    // STEP 15: Save proctoring violations to logs
    // ============================================================
    if (violations.length > 0 && resultId) {
      const violationLogs = violations.map(violation => ({
        assessment_id: session.assessment_id,
        user_id: session.user_id,
        session_id: sessionId,
        result_id: resultId,
        violation_type: violation.type,
        violation_details: violation.details || {},
        timestamp: violation.timestamp || new Date().toISOString()
      }));

      await serviceClient.from("proctoring_logs").insert(violationLogs);
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
          updated_at: completedAt
        })
        .eq("user_id", session.user_id)
        .eq("assessment_id", session.assessment_id);
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
        startedAt: startedAt,
        completedAt: completedAt,
        totalSeconds: totalSeconds,
        totalDurationFormatted: totalDurationFormatted,
        avgTimePerQuestion: avgTimePerQuestion,
        totalQuestions: questionCount
      },
      proctoring: {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: totalExternalUrls,
        tabSwitches: totalTabSwitches,
        riskFactors: riskFactors
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
