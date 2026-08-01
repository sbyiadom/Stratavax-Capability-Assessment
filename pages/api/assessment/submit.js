// pages/api/assessment/submit.js - COMPLETE FIXED VERSION
// Handles assessment submission with correct scoring (1 mark per correct answer)
// Saves category_scores, workplace_readiness, intellectual_capability, AND proctoring data

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
      proctoringData
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

    const percentageScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

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

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${percentageScore}%`);
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
    // STEP 8: Process proctoring data (FIXED FOR NUMBERS AND ARRAYS)
    // ============================================================
    const proctoring = proctoringData || {};
    
    // Handle arrays safely
    const externalUrls = Array.isArray(proctoring.externalUrls) ? proctoring.externalUrls : [];
    const violations = Array.isArray(proctoring.violations) ? proctoring.violations : [];
    const tabSwitches = Array.isArray(proctoring.tabSwitches) ? proctoring.tabSwitches : [];
    
    // Handle nested summary correctly
    const summary = proctoring.summary || {};
    
    // 1. Get totals from the summary first (if the frontend sends numbers, use those)
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    
    // 2. Fallback to counting arrays if the summary numbers are 0 but arrays exist
    // (This ensures if the backend receives arrays instead of numbers, it still calculates correctly)
    if (totalViolations === 0 && violations.length > 0) totalViolations = violations.length;
    if (totalTabSwitches === 0 && tabSwitches.length > 0) totalTabSwitches = tabSwitches.length;
    
    // Handle other summary stats
    const copyPasteAttempts = Number(summary.copyPasteAttempts) || 0;
    const rightClickAttempts = Number(summary.rightClickAttempts) || 0;
    const duration = Number(summary.duration) || 0;
    
    const totalExternalUrls = externalUrls.length;
    const uniqueDomains = [...new Set(externalUrls.map(u => u.domain || u.url))].length;
    
    const categoryStats = {};
    externalUrls.forEach(url => {
      const category = url.category || 'other';
      if (!categoryStats[category]) {
        categoryStats[category] = 0;
      }
      categoryStats[category]++;
    });

    const hasSearchEngineUsage = externalUrls.some(u => u.category === 'search_engine');
    const hasAIToolUsage = externalUrls.some(u => u.category === 'ai_tool');
    const hasExcessiveTabSwitches = totalTabSwitches > 10;
    const hasExcessiveViolations = totalViolations > 5;

    let riskLevel = 'low';
    let riskScore = 0;
    
    if (hasSearchEngineUsage) riskScore += 30;
    if (hasAIToolUsage) riskScore += 35;
    if (hasExcessiveTabSwitches) riskScore += 20;
    if (hasExcessiveViolations) riskScore += 15;
    riskScore = Math.min(riskScore, 100);
    
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    const riskFactors = [];
    if (hasSearchEngineUsage) {
      riskFactors.push({
        type: 'search_engine_usage',
        description: `Visited search engines (${externalUrls.filter(u => u.category === 'search_engine').length} times)`,
        severity: 'high'
      });
    }
    if (hasAIToolUsage) {
      riskFactors.push({
        type: 'ai_tool_usage',
        description: `Visited AI tools (${externalUrls.filter(u => u.category === 'ai_tool').length} times)`,
        severity: 'high'
      });
    }
    if (hasExcessiveTabSwitches) {
      riskFactors.push({
        type: 'excessive_tab_switching',
        description: `${totalTabSwitches} tab switches detected`,
        severity: 'medium'
      });
    }
    if (hasExcessiveViolations) {
      riskFactors.push({
        type: 'excessive_violations',
        description: `${totalViolations} violations detected`,
        severity: 'medium'
      });
    }

    console.log(`[Submit] Proctoring: Total Violations ${totalViolations}, Tab Switches ${totalTabSwitches}`);
    console.log(`[Submit] Proctoring: Risk Level ${riskLevel}, Score ${riskScore}`);

    // ============================================================
    // STEP 9: Update session status
    // ============================================================
    await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    // ============================================================
    // STEP 10: Check for existing result by session_id (FIXED)
    // ============================================================
    const { data: existingResult, error: resultError } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    console.log(`[Submit] Existing result: ${existingResult ? existingResult.id : 'None'}`);

    // ============================================================
    // STEP 11: Create or update assessment result (NO status field)
    // ============================================================
    const recommendation = isNationalService ? 
      (workplaceReadiness >= 85 && intellectualCapability >= 85 ? 'Highly Recommended' :
       workplaceReadiness >= 75 && intellectualCapability >= 75 ? 'Recommended' :
       workplaceReadiness >= 65 && intellectualCapability >= 65 ? 'Reserve Pool' : 'Not Recommended')
      : null;

    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: percentageScore,
      completed_at: new Date().toISOString(),
      is_valid: riskLevel !== 'high',
      is_auto_submitted: autoSubmitted || false,
      
      // Category scores
      category_scores: categoryScores,
      workplace_readiness: workplaceReadiness,
      intellectual_capability: intellectualCapability,
      recommendation: recommendation,
      
      // Proctoring data
      proctoring_data: {
        summary: {
          totalViolations: totalViolations,
          tabSwitches: totalTabSwitches,
          externalUrlsVisited: totalExternalUrls,
          uniqueDomains: uniqueDomains,
          copyPasteAttempts: copyPasteAttempts,
          rightClickAttempts: rightClickAttempts,
          duration: duration,
          riskLevel: riskLevel,
          riskScore: riskScore
        },
        riskFactors: riskFactors,
        externalUrls: externalUrls,
        domainVisits: proctoring.domainVisits || {},
        categoryStats: categoryStats,
        violations: violations,
        tabSwitches: tabSwitches
      },
      
      // Flattened columns
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
        percentageScore: percentageScore,
        workplaceReadiness: workplaceReadiness,
        intellectualCapability: intellectualCapability,
        recommendation: recommendation,
        completedAt: new Date().toISOString(),
        proctoring: {
          riskLevel: riskLevel,
          riskScore: riskScore,
          totalViolations: totalViolations,
          externalUrlsVisited: totalExternalUrls,
          tabSwitches: totalTabSwitches,
          riskFactors: riskFactors
        }
      }
    };

    let resultId;

    if (existingResult) {
      // Update existing result
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
      // Create new result
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
    // STEP 12: Save proctoring violations to proctoring_logs
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

      const { error: logError } = await serviceClient
        .from("proctoring_logs")
        .insert(violationLogs);

      if (logError) {
        console.error("Error saving proctoring logs:", logError);
      } else {
        console.log(`[Submit] Saved ${violationLogs.length} proctoring logs`);
      }
    }

    // ============================================================
    // STEP 13: Update candidate_assessments with result_id (FIXED)
    // ============================================================
    if (resultId) {
      const { error: caUpdateError } = await serviceClient
        .from("candidate_assessments")
        .update({
          result_id: resultId,
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", session.user_id)
        .eq("assessment_id", session.assessment_id);

      if (caUpdateError) {
        console.error("Error updating candidate_assessments:", caUpdateError);
      } else {
        console.log(`[Submit] Updated candidate_assessments with result_id: ${resultId}`);
      }
    }

    // ============================================================
    // STEP 14: Return response
    // ============================================================
    return res.status(200).json({
      success: true,
      resultId: resultId,
      sessionId: sessionId,
      score: percentageScore,
      totalEarned: totalEarned,
      totalMax: totalMax,
      categoryScores: categoryScores,
      workplaceReadiness: workplaceReadiness,
      intellectualCapability: intellectualCapability,
      recommendation: recommendation,
      isNationalService: isNationalService,
      isAutoSubmitted: autoSubmitted || false,
      proctoring: {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: totalExternalUrls,
        tabSwitches: totalTabSwitches,
        riskFactors: riskFactors,
        categoryStats: categoryStats
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
