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

// ============================================================
// MAIN HANDLER
// ============================================================

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

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, status, violation_count, total_questions")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[Submit Assessment] Session error:', sessionError);
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if (session.user_id !== user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (session.status === "completed") {
      return res.status(200).json({ success: true, already_submitted: true });
    }

    // ============================================================
    // Get assessment with type info
    // ============================================================
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select(`
        id, 
        title, 
        assessment_type_id,
        assessment_type:assessment_types(code, name)
      `)
      .eq("id", session.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      console.error('[Submit Assessment] Assessment error:', assessmentError);
      return res.status(500).json({ success: false, error: "Assessment not found" });
    }

    // Get assessment type code
    const assessmentTypeCode = assessment.assessment_type?.code || null;
    const isNationalService = assessmentTypeCode === 'national_service';
    
    console.log(`[Submit Assessment] Assessment type code: ${assessmentTypeCode}`);
    console.log(`[Submit Assessment] Is National Service: ${isNationalService}`);

    // ============================================================
    // Get questions from unique_questions
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
          console.log(`[Submit Assessment] Found ${questions.length} questions from unique_questions`);
        }
      } catch (err) {
        console.error('[Submit Assessment] Unique questions exception:', err);
      }
    }

    // Fallback: Use session total_questions
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
    const forceAutoSubmit = isAutoSubmit || !isComplete;

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

    // Calculate percentage score - CRITICAL FIX
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
    // Conditional report generation based on assessment type
    // ============================================================
    let report;
    let reportType;
    let workplaceReadiness = null;
    let intellectualCapability = null;
    let recommendation = null;
    let suggestedDepartments = null;

    if (isNationalService) {
      // ============================================================
      // NATIONAL SERVICE REPORT
      // ============================================================
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
      
      const categoryBreakdown = calculateCategoryBreakdown(responses, questions);

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
      // ============================================================
      // STRATAVAX REPORT
      // ============================================================
      console.log('[Submit Assessment] Generating Stratavax report');
      reportType = 'stratavax';
      
      // Build the responses array with nested question data for the Stratavax generator
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
      
      // Extract category scores from the report
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
      
      // Build the report with ALL data
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
        // Keep the full original report for reference
        _fullReport: stratavaxReport
      };
      
      console.log('[Submit Assessment] Stratavax report generated successfully');
      console.log(`[Submit Assessment] Categories: ${categoryScoresArray.length}, Strengths: ${strengths.length}, Weaknesses: ${weaknesses.length}`);
    }

    // ============================================================
    // Build the final report_data with type
    // ============================================================
    const reportDataWithType = {
      ...report,
      reportType: reportType,
      assessmentTypeCode: assessmentTypeCode
    };

    // ============================================================
    // CRITICAL FIX: Save result with ALL fields properly populated
    // ============================================================
    const resultData = {
      user_id: user.id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: overallScore, // CRITICAL: Always calculate this
      answered_questions: answeredCount, // CRITICAL: Should be a number, not an array
      total_questions: totalQuestions, // CRITICAL: Should be a number
      is_valid: isComplete && !isAutoSubmit,
      is_auto_submitted: Boolean(isAutoSubmit || !isComplete),
      completed_at: nowIso(),
      workplace_readiness: isNationalService ? workplaceReadiness : null,
      intellectual_capability: isNationalService ? intellectualCapability : null,
      recommendation: isNationalService ? (recommendation?.recommendation || null) : null,
      // CRITICAL: Save the full report data
      report_data: reportDataWithType
    };

    console.log('[Submit Assessment] Result data:', JSON.stringify({
      ...resultData,
      report_data_keys: Object.keys(resultData.report_data || {})
    }, null, 2));

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
      // Update existing result
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
      // Insert new result
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

    // Build response
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
      is_valid: isComplete && !isAutoSubmit,
      is_auto_submitted: Boolean(!isComplete || isAutoSubmit),
      message: (!isComplete || isAutoSubmit)
        ? `Assessment auto-submitted. ${answeredCount} of ${totalQuestions} questions answered.`
        : "Assessment submitted successfully!"
    };

    if (isNationalService) {
      responsePayload.workplaceReadiness = workplaceReadiness;
      responsePayload.intellectualCapability = intellectualCapability;
      responsePayload.recommendation = recommendation;
      responsePayload.suggestedDepartments = suggestedDepartments;
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
