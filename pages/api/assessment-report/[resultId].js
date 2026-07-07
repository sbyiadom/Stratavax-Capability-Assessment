// pages/api/assessment-report/[resultId].js

import { createClient } from "@supabase/supabase-js";
import {
  getGradeInfo,
  getClassificationDetailsFromPercentage,
  getScoreComment,
  getSupervisorImplication,
  getRiskLevel,
  toNumber,
  safeArray,
  normalizeText,
  roundNumber
} from "../../../utils/scoring";

export default async function handler(req, res) {
  const { resultId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!resultId) {
    return res.status(400).json({ success: false, error: "Missing resultId" });
  }

  console.log('[API] Looking for result ID:', resultId);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const serviceClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // ============================================================
    // Get the result
    // ============================================================
    const { data: result, error: resultError } = await serviceClient
      .from("assessment_results")
      .select("*")
      .eq("id", resultId)
      .single();

    if (resultError) {
      console.error('[API] Result fetch error:', resultError);
      return res.status(404).json({
        success: false,
        error: "Result not found",
        details: resultError.message
      });
    }

    console.log('[API] Result found:', result.id);
    console.log('[API] report_data keys:', result.report_data ? Object.keys(result.report_data) : 'null');

    // ============================================================
    // Get candidate profile
    // ============================================================
    let candidateProfile = null;
    if (result.user_id) {
      const { data: profile, error: profileError } = await serviceClient
        .from("candidate_profiles")
        .select("full_name, email, university, programme, graduation_year, preferred_department")
        .eq("id", result.user_id)
        .maybeSingle();

      if (!profileError && profile) {
        candidateProfile = profile;
        console.log('[API] Candidate profile found:', candidateProfile.full_name);
      }
    }

    // ============================================================
    // Get assessment
    // ============================================================
    let assessment = null;
    let assessmentTypeCode = null;
    if (result.assessment_id) {
      const { data: assmt, error: assmtError } = await serviceClient
        .from("assessments")
        .select("id, title, assessment_type_id, assessment_type:assessment_types(id, code, name)")
        .eq("id", result.assessment_id)
        .maybeSingle();

      if (!assmtError && assmt) {
        assessment = assmt;
        assessmentTypeCode = assmt.assessment_type?.code || null;
        console.log('[API] Assessment found:', assessment.title);
        console.log('[API] Assessment type code:', assessmentTypeCode);
      }
    }

    // ============================================================
    // Check if National Service
    // ============================================================
    const isNationalService = 
      assessmentTypeCode === 'national_service' ||
      (result.workplace_readiness !== null && result.workplace_readiness !== undefined) ||
      (result.report_data && result.report_data.dimensions && 
       result.report_data.dimensions.workplaceReadiness !== undefined);

    console.log('[API] isNationalService:', isNationalService);

    // ============================================================
    // Get overall score
    // ============================================================
    const overallScore = result.percentage_score || 0;
    const classDetails = getClassificationDetailsFromPercentage(overallScore);
    const classification = classDetails.classification;
    const riskLevel = getRiskLevel(overallScore);

    // ============================================================
    // EXTRACT DATA FROM report_data
    // ============================================================
    const reportData = result.report_data || {};
    
    // Initialize arrays
    let categoryScores = [];
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];
    let executiveSummary = '';
    let supervisorImplication = '';
    let report = {};

    // ============================================================
    // TRY TO EXTRACT FROM MULTIPLE LOCATIONS
    // ============================================================

    // --- CATEGORY SCORES ---
    // Try: report_data.categoryScores (array)
    if (reportData.categoryScores && Array.isArray(reportData.categoryScores)) {
      categoryScores = reportData.categoryScores.map(cat => ({
        category: cat.category || cat.name || 'Category',
        name: cat.category || cat.name || 'Category',
        percentage: cat.percentage || 0,
        score: cat.score || cat.totalScore || 0,
        maxScore: cat.maxScore || cat.maxPossible || 100,
        grade: cat.grade || '',
        comment: cat.comment || ''
      }));
      console.log('[API] Found categoryScores in reportData (array):', categoryScores.length);
    }
    // Try: report_data.categoryScores (object)
    else if (reportData.categoryScores && typeof reportData.categoryScores === 'object') {
      categoryScores = Object.keys(reportData.categoryScores).map(category => ({
        category: category,
        name: category,
        percentage: reportData.categoryScores[category].percentage || 0,
        score: reportData.categoryScores[category].score || reportData.categoryScores[category].total || 0,
        maxScore: reportData.categoryScores[category].maxPossible || reportData.categoryScores[category].maxScore || 100,
        grade: reportData.categoryScores[category].grade || '',
        comment: reportData.categoryScores[category].comment || ''
      }));
      console.log('[API] Found categoryScores in reportData (object):', categoryScores.length);
    }
    // Try: report_data.stratavaxReport.scoreBreakdown
    else if (reportData.stratavaxReport?.scoreBreakdown) {
      const scoreBreakdown = reportData.stratavaxReport.scoreBreakdown;
      if (Array.isArray(scoreBreakdown)) {
        categoryScores = scoreBreakdown.map(item => ({
          category: item.category || 'Category',
          name: item.category || 'Category',
          percentage: item.percentage || 0,
          score: parseFloat(item.score) || 0,
          maxScore: parseFloat(item.score?.split('/')[1]) || 100,
          grade: item.grade || '',
          comment: item.comment || ''
        }));
        console.log('[API] Found categoryScores in stratavaxReport.scoreBreakdown:', categoryScores.length);
      }
    }
    // Try: report_data.categories (legacy)
    else if (reportData.categories && Array.isArray(reportData.categories)) {
      categoryScores = reportData.categories.map(cat => ({
        category: cat.category || cat.name || 'Category',
        name: cat.category || cat.name || 'Category',
        percentage: cat.percentage || cat.score || 0,
        score: cat.score || cat.totalScore || 0,
        maxScore: cat.maxScore || cat.maxPossible || 100
      }));
      console.log('[API] Found categories in reportData (legacy):', categoryScores.length);
    }

    // --- STRENGTHS ---
    if (reportData.strengths && Array.isArray(reportData.strengths)) {
      strengths = reportData.strengths.map(s => ({
        category: s.category || s.area || s.name || 'Strength',
        name: s.category || s.area || s.name || 'Strength',
        percentage: s.percentage || 0,
        score: s.score || 0,
        maxScore: s.maxScore || s.maxPossible || 100
      }));
      console.log('[API] Found strengths in reportData:', strengths.length);
    } else if (reportData.stratavaxReport?.strengths?.items) {
      strengths = reportData.stratavaxReport.strengths.items.map(s => ({
        category: s.area || s.category || 'Strength',
        name: s.area || s.category || 'Strength',
        percentage: s.percentage || 0,
        score: s.score || 0,
        maxScore: s.maxPossible || 100
      }));
      console.log('[API] Found strengths in stratavaxReport:', strengths.length);
    }

    // --- WEAKNESSES ---
    if (reportData.weaknesses && Array.isArray(reportData.weaknesses)) {
      weaknesses = reportData.weaknesses.map(w => ({
        category: w.category || w.area || w.name || 'Development Area',
        name: w.category || w.area || w.name || 'Development Area',
        percentage: w.percentage || 0,
        score: w.score || 0,
        maxScore: w.maxScore || w.maxPossible || 100
      }));
      console.log('[API] Found weaknesses in reportData:', weaknesses.length);
    } else if (reportData.stratavaxReport?.weaknesses?.items) {
      weaknesses = reportData.stratavaxReport.weaknesses.items.map(w => ({
        category: w.area || w.category || 'Development Area',
        name: w.area || w.category || 'Development Area',
        percentage: w.percentage || 0,
        score: w.score || 0,
        maxScore: w.maxPossible || 100
      }));
      console.log('[API] Found weaknesses in stratavaxReport:', weaknesses.length);
    } else if (reportData.developmentAreas && Array.isArray(reportData.developmentAreas)) {
      weaknesses = reportData.developmentAreas.map(w => ({
        category: w.category || w.area || w.name || 'Development Area',
        name: w.category || w.area || w.name || 'Development Area',
        percentage: w.percentage || 0,
        score: w.score || 0,
        maxScore: w.maxScore || w.maxPossible || 100
      }));
      console.log('[API] Found weaknesses in developmentAreas:', weaknesses.length);
    }

    // --- RECOMMENDATIONS ---
    if (reportData.recommendations && Array.isArray(reportData.recommendations)) {
      recommendations = reportData.recommendations.map(r => ({
        priority: r.priority || 'Medium',
        category: r.category || r.area || 'Area',
        recommendation: r.recommendation || r.action || r.description || '',
        action: r.action || '',
        impact: r.impact || ''
      }));
      console.log('[API] Found recommendations in reportData:', recommendations.length);
    } else if (reportData.stratavaxReport?.recommendations) {
      recommendations = reportData.stratavaxReport.recommendations.map(r => ({
        priority: r.priority || 'Medium',
        category: r.category || r.area || 'Area',
        recommendation: r.recommendation || r.action || '',
        action: r.action || '',
        impact: r.impact || ''
      }));
      console.log('[API] Found recommendations in stratavaxReport:', recommendations.length);
    }

    // --- EXECUTIVE SUMMARY ---
    executiveSummary = reportData.executiveSummary || 
                       reportData.stratavaxReport?.executiveSummary?.narrative || 
                       reportData.stratavaxReport?.executiveSummary?.summary ||
                       `${candidateProfile?.full_name || 'Candidate'} completed the ${assessment?.title || 'Assessment'} with an overall score of ${Math.round(overallScore)}%. ${classDetails.description}`;

    // --- SUPERVISOR IMPLICATION ---
    supervisorImplication = reportData.supervisorImplication || 
                            reportData.stratavaxReport?.scoreBreakdown?.[0]?.supervisorImplication ||
                            getSupervisorImplication(overallScore);

    // --- FALLBACK: If still empty, try to generate from available data ---
    if (categoryScores.length === 0 && reportData._fullReport?.categoryScores) {
      // Try nested _fullReport
      const fullReport = reportData._fullReport;
      if (fullReport.categoryScores && typeof fullReport.categoryScores === 'object') {
        categoryScores = Object.keys(fullReport.categoryScores).map(category => ({
          category: category,
          name: category,
          percentage: fullReport.categoryScores[category].percentage || 0,
          score: fullReport.categoryScores[category].score || fullReport.categoryScores[category].total || 0,
          maxScore: fullReport.categoryScores[category].maxPossible || fullReport.categoryScores[category].maxScore || 100
        }));
        console.log('[API] Found categoryScores in _fullReport:', categoryScores.length);
      }
    }

    // Sort category scores by percentage descending
    categoryScores.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

    // ============================================================
    // BUILD THE FINAL REPORT
    // ============================================================
    
    // Build the report object
    report = {
      ...reportData,
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
      overallScore: overallScore,
      reportType: isNationalService ? 'national_service' : 'stratavax'
    };

    // ============================================================
    // BUILD THE RESPONSE - Data available at multiple levels
    // ============================================================
    
    // Combine result with profile and assessment
    const combinedResult = {
      ...result,
      candidate_profiles: candidateProfile,
      assessments: assessment,
      // Add calculated data directly to result for component access
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
      overallScore: overallScore
    };

    console.log('[API] Final stats:', {
      categoryScores: categoryScores.length,
      strengths: strengths.length,
      weaknesses: weaknesses.length,
      recommendations: recommendations.length,
      isNationalService: isNationalService
    });

    return res.status(200).json({
      success: true,
      result: combinedResult,
      report: report,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      // All data available at top level for easy access
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
      overallScore: overallScore,
      summaryStats: {
        totalCategories: categoryScores.length,
        totalStrengths: strengths.length,
        totalWeaknesses: weaknesses.length,
        totalRecommendations: recommendations.length
      }
    });

  } catch (error) {
    console.error("Error fetching report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch report",
      message: error?.message || "Internal server error"
    });
  }
}
