// pages/api/supervisor/report.js - COMPLETE BYPASS VERSION

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const userId = req.query.user_id || req.query.userId;
  const assessmentId = req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "Supabase environment variables are missing." });
  }

  // Use service role client to bypass RLS completely
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  try {
    console.log(`🔍 Fetching report for user: ${userId}, assessment: ${assessmentId || 'latest'}`);

    // Fetch assessment results - NO PERMISSION CHECK
    let resultQuery = supabase
      .from("assessment_results")
      .select("*, assessments(*)")
      .eq("user_id", userId);

    if (assessmentId) {
      resultQuery = resultQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultQuery.order("completed_at", { ascending: false });

    if (resultsError) {
      console.error("Results error:", resultsError);
      return res.status(500).json({ success: false, error: resultsError.message });
    }

    if (!results || results.length === 0) {
      console.log(`No results found for user: ${userId}`);
      return res.status(404).json({
        success: false,
        error: "No assessment results found for this candidate.",
        user_id: userId
      });
    }

    const storedResult = results[0];
    const assessment = storedResult.assessments || null;

    // Fetch candidate profile
    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("full_name, email, id")
      .eq("id", userId)
      .single();

    if (candidateError) {
      console.error("Candidate error:", candidateError);
    }

    const candidateName = candidate?.full_name || candidate?.email || "Candidate";
    const assessmentName = assessment?.title || "Assessment";
    const percentage = parseFloat(storedResult.percentage_score) || 0;
    
    // Determine classification based on percentage
    let classification = "High Risk";
    if (percentage >= 85) classification = "Exceptional";
    else if (percentage >= 75) classification = "Strong Performer";
    else if (percentage >= 65) classification = "Capable Contributor";
    else if (percentage >= 55) classification = "Developing";
    else if (percentage >= 40) classification = "At Risk";

    // Build executive summary
    const executiveSummary = `${candidateName} completed the ${assessmentName} assessment with an overall score of ${percentage}%.`;

    // Build simple report
    const generatedReport = {
      candidateName,
      assessmentName,
      userId,
      assessmentId: assessmentId || assessment?.id,
      totalScore: storedResult.total_score || 0,
      maxScore: storedResult.max_score || 100,
      percentage: percentage,
      overallPercentage: percentage,
      overallScore: percentage,
      score: percentage,
      classification: classification,
      overallClassification: classification,
      riskLevel: percentage >= 75 ? "Low" : percentage >= 55 ? "Moderate" : "High",
      summary: executiveSummary,
      executiveSummary: executiveSummary,
      overallAssessment: executiveSummary,
      supervisorImplication: "Review the assessment results and provide targeted feedback based on the candidate's performance.",
      roleReadiness: percentage >= 75 ? "Candidate appears ready for role responsibilities." : "Candidate requires additional development before assuming critical responsibilities.",
      readinessStatement: percentage >= 75 ? "Ready for role" : "Development needed",
      categoryScores: [],
      strengths: [],
      developmentAreas: [],
      recommendations: [],
      followUpQuestions: [],
      responseCount: storedResult.answered_questions || 0,
      dataSource: "assessment_results"
    };

    console.log(`✅ Report generated successfully for ${candidateName} with score ${percentage}%`);

    return res.status(200).json({
      success: true,
      candidate: candidate || { id: userId },
      assessment: assessment,
      generatedReport: generatedReport,
      result: storedResult,
      responseCount: storedResult.answered_questions || 0
    });

  } catch (error) {
    console.error("Report generation error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || "Failed to generate report" 
    });
  }
}
