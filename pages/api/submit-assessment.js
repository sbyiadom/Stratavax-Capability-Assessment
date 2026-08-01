// pages/api/submit-assessment.js

import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  normalizeText
} from "../../utils/scoring";
import { generateStratavaxReport } from "../../utils/stratavaxReportGenerator";
import {
  calculateNationalServiceScores,
  classifyWorkplaceReadiness,
  classifyIntellectualCapability,
  getRecommendation,
  getSuggestedDepartments,
  generateNationalServiceReport,
  calculateCategoryBreakdown
} from "../../utils/nationalServiceReportGenerator";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "5mb"
    }
  }
};

function nowIso() {
  return new Date().toISOString();
}

export default async function handler(req, res) {
  console.log(`[Submit Assessment] Request received at ${new Date().toISOString()}`);
  
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const sessionId = body.sessionId || body.session_id;

    console.log(`[Submit Assessment] Session ID: ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No authorization token" });
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Submit Assessment] Missing environment variables');
      return res.status(500).json({ success: false, error: "Configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !userData?.user) {
      console.error('[Submit Assessment] Auth error:', authError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const user = userData.user;
    console.log(`[Submit Assessment] User: ${user.id}`);

    // ============================================================
    // Get session
    // ============================================================
    console.log(`[Submit Assessment] Looking for session with ID: ${sessionId}`);
    
    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, status, violation_count, total_questions")
      .eq("id", sessionId)
      .single();

    if (sessionError) {
      console.error('[Submit Assessment] Session error:', sessionError);
      return res.status(500).json({ 
        success: false, 
        error: "Database error fetching session",
        details: sessionError.message
      });
    }

    if (!session) {
      console.error('[Submit Assessment] Session not found for ID:', sessionId);
      return res.status(404).json({ 
        success: false, 
        error: "Session not found",
        details: `No session found with ID: ${sessionId}`
      });
    }

    console.log(`[Submit Assessment] Session found:`, {
      id: session.id,
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      status: session.status
    });

    if (session.user_id !== user.id) {
      console.error('[Submit Assessment] User mismatch:', { sessionUser: session.user_id, requestUser: user.id });
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (session.status === "completed") {
      return res.status(200).json({ success: true, already_submitted: true });
    }

    // ============================================================
    // Get assessment
    // ============================================================
    console.log(`[Submit Assessment] Fetching assessment with ID: ${session.assessment_id}`);

    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, title, assessment_type_id")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentError) {
      console.error('[Submit Assessment] Assessment error:', assessmentError);
      return res.status(500).json({ 
        success: false, 
        error: "Database error fetching assessment",
        details: assessmentError.message
      });
    }

    if (!assessment) {
      console.error('[Submit Assessment] Assessment not found for ID:', session.assessment_id);
      return res.status(404).json({ 
        success: false, 
        error: "Assessment not found",
        details: `No assessment found with ID: ${session.assessment_id}`
      });
    }

    console.log(`[Submit Assessment] Assessment found:`, {
      id: assessment.id,
      title: assessment.title,
      assessment_type_id: assessment.assessment_type_id
    });

    // Get the assessment type
    let assessmentTypeCode = null;
    if (assessment.assessment_type_id) {
      const { data: typeData, error: typeError } = await supabase
        .from("assessment_types")
        .select("code, name")
        .eq("id", assessment.assessment_type_id)
        .single();
      
      if (!typeError && typeData) {
        assessmentTypeCode = typeData.code;
        console.log(`[Submit Assessment] Assessment type: ${assessmentTypeCode}`);
      }
    }

    const isNationalService = assessmentTypeCode === 'national_service';
    console.log(`[Submit Assessment] Is National Service: ${isNationalService}`);

    // ============================================================
    // Get questions
    // ============================================================
    let questions = [];
    let assessmentTypeId = assessment.assessment_type_id;

    if (assessmentTypeId) {
      console.log(`[Submit Assessment] Assessment type ID: ${assessmentTypeId}`);
      
      try {
        const { data, error } = await supabase
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
          .eq("assessment_type_id", assessmentTypeId);

        if (error) {
          console.error('[Submit Assessment] Unique questions error:', error);
        } else {
          questions = safeArray(data).map(q => ({
            ...q,
            answers: safeArray(q.unique_answers)
          }));
          console.log(`[Submit Assessment] Found ${questions.length} questions`);
        }
      } catch (err) {
        console.error('[Submit Assessment] Unique questions exception:', err);
      }
    }

    if (questions.length === 0 && session.total_questions > 0) {
      console.log(`[Submit Assessment] Creating ${session.total_questions} placeholder questions`);
      questions = Array.from({ length: session.total_questions }, (_, i) => ({
        id: `placeholder-${i + 1}`,
        question_text: `Question ${i + 1}`,
        section: "General",
        answers: [{ id: `ans-${i + 1}`, answer_text: "Answered", score: 1 }]
      }));
    }

    console.log(`[Submit Assessment] Final questions count: ${questions.length}`);

    if (!questions || questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "no_questions", 
        message: "No questions found for this assessment" 
      });
    }

    // Get responses
    let responses = [];
    try {
      const { data, error } = await supabase
        .from("responses")
        .select("*")
        .eq("session_id", sessionId);

      if (error) {
        console.error('[Submit Assessment] Responses error:', error);
      } else {
        responses = safeArray(data);
      }
    } catch (err) {
      console.error('[Submit Assessment] Responses exception:', err);
    }

    console.log(`[Submit Assessment] Responses count: ${responses.length}`);

    const answeredCount = responses.filter(r => r.answer_id && r.answer_id !== "").length || 0;
    const totalQuestions = questions.length;
    const isComplete = answeredCount === totalQuestions;

    console.log(`[Submit Assessment] Answered: ${answeredCount}/${totalQuestions}`);

    const isAutoSubmit = body.auto_submit === true || body.is_auto_submitted === true;

    // ============================================================
    // Calculate scores
    // ============================================================
    let totalEarned = 0;
    let totalMax = 0;

    const responseMap = {};
    responses.forEach(r => {
      responseMap[r.question_id] = r;
    });

    questions.forEach(question => {
      const answers = safeArray(question.answers);
      const maxScore = answers.reduce((max, a) => Math.max(max, toNumber(a.score, 0)), 0) || 1;
      totalMax += maxScore;

      const response = responseMap[question.id];
      let earned = 0;
      if (response?.answer_id) {
        const answer = answers.find(a => String(a.id) === String(response.answer_id));
        earned = answer ? toNumber(answer.score, 0) : 0;
      }
      totalEarned += earned;
    });

    const overallScore = totalMax > 0 ? roundNumber((totalEarned / totalMax) * 100, 2) : 0;

    console.log(`[Submit Assessment] Total Earned: ${totalEarned}, Total Max: ${totalMax}, Overall Score: ${overallScore}%`);

    // Get candidate profile
    const { data: profile, error: profileError } = await supabase
      .from("candidate_profiles")
      .select("full_name, email, university, programme, graduation_year, preferred_department")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Submit Assessment] Profile error:', profileError);
    }

    // ============================================================
    // Generate report
    // ============================================================
    let report;
    let reportType;
    let workplaceReadiness = null;
    let intellectualCapability = null;
    let recommendation = null;
    let suggestedDepartments = null;
    let categoryBreakdown = [];

    if (isNationalService) {
      console.log('[Submit Assessment] Generating National Service report');
      reportType = 'national_service';
      
      const nsScores = calculateNationalServiceScores(responses, questions);
      
      workplaceReadiness = nsScores.workplaceMax > 0 
        ? roundNumber((nsScores.workplaceEarned / nsScores.workplaceMax) * 100, 2) 
        : 0;
        
      intellectualCapability = nsScores.intellectualMax > 0 
        ? roundNumber((nsScores.intellectualEarned / nsScores.intellectualMax) * 100, 2) 
        : 0;
      
      const workplaceClass = classifyWorkplaceReadiness(workplaceReadiness);
      const intellectualClass = classifyIntellectualCapability(intellectualCapability);
      recommendation = getRecommendation(workplaceReadiness, intellectualCapability);
      suggestedDepartments = getSuggestedDepartments(workplaceReadiness, intellectualCapability);
      
      categoryBreakdown = calculateCategoryBreakdown(responses, questions);
      console.log(`[Submit Assessment] Category breakdown calculated: ${categoryBreakdown.length} categories`);

      report = generateNationalServiceReport({
        profile,
        assessment,
        workplaceReadiness,
        intellectualCapability,
        overallScore,
        totalQuestions,
        answeredCount,
        recommendation,
        suggestedDepartments,
        workplaceClass,
        intellectualClass,
        categoryBreakdown
      });
      
      console.log('[Submit Assessment] National Service report generated');
    } else {
      // Stratavax report generation...
      console.log('[Submit Assessment] Generating Stratavax report');
      reportType = 'stratavax';
      
      const stratavaxResponses = questions.map(question => {
        const response = responses.find(r => String(r.question_id) === String(question.id));
        return {
          ...(response || {}),
          unique_questions: {
            id: question.id,
            question_text: question.question_text,
            section: question.section,
            subsection: question.subsection,
            unique_answers: question.answers || []
          }
        };
      });
      
      const generatorAssessmentType = assessmentTypeCode || 'general';
      
      const stratavaxReport = generateStratavaxReport(
        user.id,
        generatorAssessmentType,
        stratavaxResponses,
        profile?.full_name || 'Candidate',
        new Date().toISOString()
      );
      
      const categoryScoresArray = stratavaxReport.categoryScores ? 
        Object.keys(stratavaxReport.categoryScores).map(category => ({
          category: category,
          score: stratavaxReport.categoryScores[category].score || 0,
          percentage: stratavaxReport.categoryScores[category].percentage || 0,
          maxScore: stratavaxReport.categoryScores[category].maxPossible || 0
        })) : [];
      
      const strengths = stratavaxReport.strengths || stratavaxReport.stratavaxReport?.strengths?.items || [];
      const weaknesses = stratavaxReport.weaknesses || stratavaxReport.stratavaxReport?.weaknesses?.items || [];
      const recommendations = stratavaxReport.recommendations || stratavaxReport.stratavaxReport?.recommendations || [];
      
      const executiveSummary = stratavaxReport.executiveSummary || 
                               stratavaxReport.stratavaxReport?.executiveSummary?.narrative || 
                               '';
      
      const supervisorImplication = stratavaxReport.stratavaxReport?.scoreBreakdown?.[0]?.supervisorImplication || 
                                    'Please review the full report for supervisor guidance.';
      
      report = {
        candidateName: profile?.full_name || 'Candidate',
        assessmentName: assessment.title || 'Assessment',
        candidateInfo: {
          fullName: profile?.full_name || 'Candidate',
          university: profile?.university || 'Not Specified',
          programme: profile?.programme || 'Not Specified',
          graduationYear: profile?.graduation_year || 'Not Specified',
          preferredDepartment: profile?.preferred_department || 'Not Specified',
          assessmentDate: new Date().toLocaleDateString()
        },
        executiveSummary: executiveSummary,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        categoryScores: categoryScoresArray,
        supervisorImplication: supervisorImplication,
        overallScore: stratavaxReport.percentageScore || overallScore,
        classification: stratavaxReport.classification?.label || '',
        _fullReport: stratavaxReport
      };
      
      console.log('[Submit Assessment] Stratavax report generated');
    }

    // ============================================================
    // Build the final report_data with type
    // ============================================================
    const reportDataWithType = {
      ...report,
      reportType: reportType,
      assessmentTypeCode: assessmentTypeCode,
      ...(isNationalService && { categoryBreakdown })
    };

    // ============================================================
    // Prepare category_scores for the database
    // ============================================================
    let categoryScoresForDb = [];

    if (isNationalService && categoryBreakdown && categoryBreakdown.length > 0) {
      categoryScoresForDb = categoryBreakdown.map(cat => ({
        category: cat.category || cat.name || 'Unknown',
        name: cat.category || cat.name || 'Unknown',
        percentage: cat.percentage || 0,
        score: cat.earned || cat.score || 0,
        maxScore: cat.max || cat.maxScore || 100,
        dimension: cat.dimension || 'other',
        ...(cat.grade && { grade: cat.grade }),
        ...(cat.comment && { comment: cat.comment })
      }));
      console.log(`[Submit Assessment] category_scores prepared: ${categoryScoresForDb.length} categories`);
    } else if (!isNationalService && report.categoryScores) {
      categoryScoresForDb = report.categoryScores;
    }

    // ============================================================
    // FIX: Process and extract proctoring data from session & request body
    // ============================================================
    console.log(`[Submit Assessment] Processing proctoring data...`);
    
    // Extract proctoring data sent from the frontend
    const proctoringData = body.proctoringData || {};
    const summary = proctoringData.summary || {};
    
    // 1. Get the raw counts (frontend calculated numbers)
    let totalViolations = Number(summary.totalViolations) || 0;
    let totalTabSwitches = Number(summary.tabSwitches) || 0;
    let copyPasteAttempts = Number(summary.copyPasteAttempts) || 0;
    let rightClickAttempts = Number(summary.rightClickAttempts) || 0;
    let durationSeconds = Number(summary.duration) || 0;
    
    // 2. Fallback to session's raw violation_count if frontend didn't send it
    if (totalViolations === 0 && session.violation_count > 0) {
      totalViolations = session.violation_count;
    }

    console.log(`[Submit Assessment] Proctoring counts: Violations=${totalViolations}, TabSwitches=${totalTabSwitches}`);

    // 3. Prepare arrays for detailed logs
    const violationsList = Array.isArray(proctoringData.violations) ? proctoringData.violations : [];
    const tabSwitchesList = Array.isArray(proctoringData.tabSwitches) ? proctoringData.tabSwitches : [];
    const externalUrlsList = Array.isArray(proctoringData.externalUrls) ? proctoringData.externalUrls : [];
    
    const totalExternalUrls = externalUrlsList.length;
    const uniqueDomains = [...new Set(externalUrlsList.map(u => u.domain || u.url))].length;
    
    // 4. Calculate Risk Level based on the actual numbers
    const hasSearchEngineUsage = externalUrlsList.some(u => u.category === 'search_engine');
    const hasAIToolUsage = externalUrlsList.some(u => u.category === 'ai_tool');
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
        description: `Visited search engines (${externalUrlsList.filter(u => u.category === 'search_engine').length} times)`,
        severity: 'high'
      });
    }
    if (hasAIToolUsage) {
      riskFactors.push({
        type: 'ai_tool_usage',
        description: `Visited AI tools (${externalUrlsList.filter(u => u.category === 'ai_tool').length} times)`,
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

    // ============================================================
    // Save result
    // ============================================================
    const resultData = {
      user_id: user.id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: overallScore,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isComplete && !isAutoSubmit && riskLevel !== 'high',
      is_auto_submitted: Boolean(isAutoSubmit || !isComplete),
      completed_at: nowIso(),
      workplace_readiness: isNationalService ? workplaceReadiness : null,
      intellectual_capability: isNationalService ? intellectualCapability : null,
      recommendation: isNationalService ? (recommendation?.recommendation || null) : null,
      category_scores: categoryScoresForDb,
      report_data: reportDataWithType,
      
      // ============================================================
      // FIX: Write actual proctoring data to the result row
      // ============================================================
      violation_count: totalViolations,
      total_tab_switches: totalTabSwitches,
      risk_score: riskScore,
      risk_level: riskLevel, // lowercase: 'low', 'medium', 'high'
      
      proctoring_data: {
        summary: {
          totalViolations: totalViolations,
          tabSwitches: totalTabSwitches,
          externalUrlsVisited: totalExternalUrls,
          uniqueDomains: uniqueDomains,
          copyPasteAttempts: copyPasteAttempts,
          rightClickAttempts: rightClickAttempts,
          duration: durationSeconds,
          riskLevel: riskLevel,
          riskScore: riskScore
        },
        riskFactors: riskFactors,
        externalUrls: externalUrlsList,
        domainVisits: proctoringData.domainVisits || {},
        categoryStats: {},
        violations: violationsList,
        tabSwitches: tabSwitchesList
      },
      
      // Flattened columns for easier frontend querying
      external_urls_visited: externalUrlsList,
      domain_visits: proctoringData.domainVisits || {},
      tab_switch_details: tabSwitchesList,
      violations: violationsList
    };

    // Inject the proctoring summary into report_data as well so the UI picks it up
    if (resultData.report_data) {
      resultData.report_data.proctoring = {
        riskLevel: riskLevel,
        riskScore: riskScore,
        totalViolations: totalViolations,
        externalUrlsVisited: totalExternalUrls,
        tabSwitches: totalTabSwitches,
        riskFactors: riskFactors
      };
    }

    console.log(`[Submit Assessment] Result data saved with proctoring: ${totalViolations} violations, ${totalTabSwitches} tab switches, risk ${riskLevel}`);

    // Check if a result already exists for this session
    const { data: existingResult, error: checkError } = await supabase
      .from("assessment_results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (checkError) {
      console.error('[Submit Assessment] Check existing result error:', checkError);
    }

    let result;
    if (existingResult) {
      const { data, error } = await supabase
        .from("assessment_results")
        .update(resultData)
        .eq("id", existingResult.id)
        .select()
        .single();

      if (error) {
        console.error('[Submit Assessment] Update result error:', error);
        return res.status(500).json({ success: false, error: "Failed to update results: " + error.message });
      }
      result = data;
      console.log('[Submit Assessment] Updated existing result:', result.id);
    } else {
      const { data, error } = await supabase
        .from("assessment_results")
        .insert(resultData)
        .select()
        .single();

      if (error) {
        console.error('[Submit Assessment] Insert result error:', error);
        return res.status(500).json({ success: false, error: "Failed to save results: " + error.message });
      }
      result = data;
      console.log('[Submit Assessment] Inserted new result:', result.id);
    }

    // ============================================================
    // Save proctoring violations to proctoring_logs
    // ============================================================
    if (violationsList.length > 0 && result) {
      const violationLogs = violationsList.map(violation => ({
        assessment_id: session.assessment_id,
        user_id: session.user_id,
        session_id: sessionId,
        result_id: result.id,
        violation_type: violation.type,
        violation_details: violation.details || {},
        timestamp: violation.timestamp || new Date().toISOString()
      }));

      const { error: logError } = await supabase
        .from("proctoring_logs")
        .insert(violationLogs);

      if (logError) {
        console.error("Error saving proctoring logs:", logError);
      } else {
        console.log(`[Submit Assessment] Saved ${violationLogs.length} proctoring logs`);
      }
    }

    // Update session
    await supabase
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: nowIso(),
        answered_questions: answeredCount,
        total_questions: totalQuestions,
        auto_submitted: Boolean(!isComplete || isAutoSubmit)
      })
      .eq("id", sessionId);

    // Update candidate assessment
    await supabase
      .from("candidate_assessments")
      .update({
        status: "completed",
        result_id: result.id,
        score: overallScore,
        completed_at: nowIso()
      })
      .eq("user_id", user.id)
      .eq("assessment_id", session.assessment_id);

    console.log('[Submit Assessment] Success!');

    const responsePayload = {
      success: true,
      result_id: result.id,
      id: result.id,
      result: result,
      report: report,
      reportType: reportType,
      isNationalService: isNationalService,
      score: overallScore,
      percentage_score: overallScore,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isComplete && !isAutoSubmit && riskLevel !== 'high',
      is_auto_submitted: Boolean(!isComplete || isAutoSubmit),
      message: (!isComplete || isAutoSubmit)
        ? `Assessment auto-submitted. ${answeredCount} of ${totalQuestions} questions answered.`
        : "Assessment submitted successfully!",
      // Return proctoring summary in the API response for debugging
      proctoring: {
        totalViolations,
        totalTabSwitches,
        riskLevel,
        riskScore
      }
    };

    if (isNationalService) {
      responsePayload.workplaceReadiness = workplaceReadiness;
      responsePayload.intellectualCapability = intellectualCapability;
      responsePayload.recommendation = recommendation;
      responsePayload.suggestedDepartments = suggestedDepartments;
      responsePayload.categoryBreakdown = categoryBreakdown;
      responsePayload.categoryScoresCount = categoryScoresForDb.length;
    }

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('[Submit Assessment] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error?.message || "An unexpected error occurred"
    });
  }
}
