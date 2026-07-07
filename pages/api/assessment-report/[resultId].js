// pages/api/assessment-report/[resultId].js

import { createClient } from "@supabase/supabase-js";
import {
  calculateCategoryScores,
  getStrengthAreas,
  getDevelopmentAreas,
  getTopStrengths,
  normalizeCategoryScores,
  getGradeInfo,
  getClassificationDetailsFromPercentage,
  getScoreComment,
  getSupervisorImplication,
  getRiskLevel,
  calculateGapToTarget,
  isStrength,
  isDevelopmentArea,
  REPORT_THRESHOLDS,
  toNumber,
  safeArray,
  normalizeText,
  calculatePercentage,
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
    console.log('[API] Assessment type code:', assessmentTypeCode);

    // ============================================================
    // Fetch responses with question data for ALL assessments
    // ============================================================
    let responses = [];
    let questions = [];

    if (result.session_id) {
      console.log('[API] Fetching responses for session:', result.session_id);
      
      const { data: responseData, error: responseError } = await serviceClient
        .from("responses")
        .select(`
          id,
          question_id,
          answer_id,
          session_id,
          user_id,
          assessment_id,
          unique_questions (
            id,
            question_text,
            section,
            subsection,
            unique_answers (
              id,
              answer_text,
              score
            )
          )
        `)
        .eq("session_id", result.session_id);

      if (!responseError && responseData) {
        responses = responseData;
        console.log('[API] Found', responses.length, 'responses');
        
        // Extract questions from responses
        questions = responses
          .map(r => r.unique_questions)
          .filter(q => q && q.id);
        console.log('[API] Found', questions.length, 'questions');
      } else {
        console.log('[API] No responses found or error:', responseError);
      }
    }

    // ============================================================
    // Calculate data based on assessment type
    // ============================================================
    let report = result.report_data || {};
    let categoryScores = [];
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];
    let executiveSummary = '';
    let supervisorImplication = '';
    let classification = '';
    let riskLevel = '';
    let overallScore = result.percentage_score || 0;

    if (!isNationalService && responses.length > 0) {
      // ============================================================
      // STRATAVAX REPORT - Calculate from responses using scoring engine
      // ============================================================
      console.log('[API] Generating Stratavax report data from', responses.length, 'responses');

      // Calculate category scores using the scoring engine
      const isBaseline = false;
      const calculatedCategories = calculateCategoryScores(responses, isBaseline);
      
      console.log('[API] Calculated', calculatedCategories.length, 'categories');

      // Format category scores for the frontend
      categoryScores = calculatedCategories.map(cat => ({
        category: cat.category,
        name: cat.category,
        percentage: roundNumber(cat.percentage, 1),
        score: roundNumber(cat.totalScore, 1),
        maxScore: roundNumber(cat.maxPossible, 1),
        grade: cat.grade,
        classification: cat.classification,
        comment: cat.comment,
        supervisorImplication: cat.supervisorImplication,
        riskLevel: cat.riskLevel,
        gapToTarget: cat.gapToTarget,
        count: cat.count || 0
      }));

      // Sort categories by percentage descending for display
      categoryScores.sort((a, b) => b.percentage - a.percentage);

      // Get strengths (categories above 75%)
      const strengthItems = getStrengthAreas(calculatedCategories, 5);
      strengths = strengthItems.map(s => ({
        category: s.category,
        name: s.category,
        percentage: roundNumber(s.percentage, 1),
        score: roundNumber(s.totalScore, 1),
        maxScore: roundNumber(s.maxPossible, 1),
        gapToTarget: s.gapToTarget || 0,
        comment: s.comment || getScoreComment(s.percentage)
      }));

      // Get development areas (categories below 65%)
      const developmentItems = getDevelopmentAreas(calculatedCategories, 5);
      weaknesses = developmentItems.map(d => ({
        category: d.category,
        name: d.category,
        percentage: roundNumber(d.percentage, 1),
        score: roundNumber(d.totalScore, 1),
        maxScore: roundNumber(d.maxPossible, 1),
        gapToTarget: d.gapToTarget || calculateGapToTarget(d.percentage),
        comment: d.comment || getScoreComment(d.percentage)
      }));

      // Generate professional recommendations based on weaknesses
      recommendations = developmentItems.map((d, index) => {
        let priority = 'Medium';
        let urgency = 'Standard';
        
        if (d.percentage < 40) {
          priority = 'Critical';
          urgency = 'Immediate';
        } else if (d.percentage < 55) {
          priority = 'High';
          urgency = 'High';
        } else if (d.percentage < 65) {
          priority = 'Medium';
          urgency = 'Moderate';
        } else {
          priority = 'Low';
          urgency = 'Low';
        }

        const gap = d.gapToTarget || calculateGapToTarget(d.percentage);
        const targetScore = REPORT_THRESHOLDS.targetScore || 80;

        return {
          priority: priority,
          urgency: urgency,
          category: d.category,
          currentScore: roundNumber(d.percentage, 1),
          targetScore: targetScore,
          gap: roundNumber(gap, 1),
          recommendation: `Priority development needed in ${d.category}. Current score of ${roundNumber(d.percentage, 1)}% is ${gap > 0 ? gap : 0}% below the target of ${targetScore}%.`,
          action: priority === 'Critical' || priority === 'High' 
            ? `Immediate intervention required. Provide structured training, supervised practice, and weekly performance reviews for ${d.category}.`
            : `Provide targeted coaching, practical assignments, and regular feedback in ${d.category}.`,
          impact: `Closing the ${gap > 0 ? gap : 0}% gap in ${d.category} will significantly improve overall capability and role readiness.`,
          timeframe: urgency === 'Immediate' ? '0-30 days' :
                     urgency === 'High' ? '30-60 days' :
                     urgency === 'Moderate' ? '60-90 days' : '90+ days'
        };
      });

      // Sort recommendations by priority (Critical > High > Medium > Low)
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      recommendations.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

      // Generate professional executive summary
      const overallPercentage = result.percentage_score || 0;
      const gradeInfo = getGradeInfo(overallPercentage);
      const classDetails = getClassificationDetailsFromPercentage(overallPercentage);
      classification = classDetails.classification;
      riskLevel = getRiskLevel(overallPercentage);

      const topStrengths = strengths.slice(0, 3).map(s => `${s.category} (${s.percentage}%)`).join(', ');
      const topWeaknesses = weaknesses.slice(0, 3).map(w => `${w.category} (${w.percentage}%)`).join(', ');

      // Build comprehensive executive summary
      const summaryParts = [];
      summaryParts.push(`${candidateProfile?.full_name || 'Candidate'} completed the ${assessment?.title || 'Assessment'} with an overall score of ${Math.round(overallPercentage)}%.`);
      summaryParts.push(`Performance classification: ${classification}.`);
      
      if (strengths.length > 0) {
        summaryParts.push(`Key strengths (above 75%): ${topStrengths}.`);
      } else {
        summaryParts.push('No specific strengths identified above the 75% threshold.');
      }
      
      if (weaknesses.length > 0) {
        summaryParts.push(`Priority development areas (below 65%): ${topWeaknesses}.`);
      } else {
        summaryParts.push('No specific development areas identified below the 65% threshold.');
      }
      
      summaryParts.push(`Overall assessment: ${classDetails.description}`);

      executiveSummary = summaryParts.join(' ');
      
      // Get supervisor implication
      supervisorImplication = getSupervisorImplication(overallPercentage);

      console.log('[API] Category scores calculated:', categoryScores.length);
      console.log('[API] Strengths:', strengths.length);
      console.log('[API] Weaknesses:', weaknesses.length);
      console.log('[API] Recommendations:', recommendations.length);

    } else if (isNationalService) {
      // ============================================================
      // NATIONAL SERVICE REPORT - Use existing data
      // ============================================================
      console.log('[API] National Service report - using existing data');
      
      classification = result.recommendation || 'Not Recommended';
      riskLevel = 'Moderate';
      
      // Use category breakdown if available
      if (report.categoryBreakdown && report.categoryBreakdown.length > 0) {
        categoryScores = report.categoryBreakdown.map(cat => ({
          category: cat.category,
          name: cat.category,
          percentage: cat.percentage || 0,
          score: cat.earned || 0,
          maxScore: cat.max || 0,
          dimension: cat.dimension || 'other'
        }));
      }

      if (!report) {
        report = {
          dimensions: {
            workplaceReadiness: result.workplace_readiness || 0,
            intellectualCapability: result.intellectual_capability || 0,
            overallScore: result.percentage_score || 0
          },
          recommendation: {
            level: result.recommendation || 'Not Recommended'
          },
          statistics: {
            totalQuestions: result.total_questions || 0,
            totalAnswered: result.answered_questions || 0
          },
          categoryBreakdown: categoryScores,
          candidateInfo: {
            fullName: candidateProfile?.full_name || 'Candidate',
            university: candidateProfile?.university || '',
            programme: candidateProfile?.programme || '',
            graduationYear: candidateProfile?.graduation_year || '',
            preferredDepartment: candidateProfile?.preferred_department || '',
            assessmentDate: new Date(result.completed_at).toLocaleDateString()
          },
          reportType: 'national_service'
        };
      }
    } else {
      // ============================================================
      // FALLBACK - No responses or data available
      // ============================================================
      console.log('[API] No responses available - using fallback data');
      
      const overallPercentage = result.percentage_score || 0;
      const classDetails = getClassificationDetailsFromPercentage(overallPercentage);
      classification = classDetails.classification;
      riskLevel = getRiskLevel(overallPercentage);
      
      executiveSummary = `${candidateProfile?.full_name || 'Candidate'} completed the ${assessment?.title || 'Assessment'} with an overall score of ${Math.round(overallPercentage)}%. ${classDetails.description}`;
      supervisorImplication = getSupervisorImplication(overallPercentage);

      // Use existing report data if available
      categoryScores = report.categoryScores || report.category_scores || [];
      strengths = report.strengths || [];
      weaknesses = report.weaknesses || report.developmentAreas || [];
      recommendations = report.recommendations || [];
    }

    // Helper function for classification (fallback)
    function getClassification(score) {
      if (score >= 85) return 'Exceptional';
      if (score >= 75) return 'Strong Performer';
      if (score >= 65) return 'Capable Contributor';
      if (score >= 55) return 'Developing';
      if (score >= 40) return 'At Risk';
      return 'High Risk';
    }

    // Helper function for risk level (fallback)
    function getRiskLevel(score) {
      if (score >= 75) return 'Low';
      if (score >= 65) return 'Moderate';
      if (score >= 55) return 'Elevated';
      if (score >= 40) return 'High';
      return 'Critical';
    }

    // Build the final report object
    const finalReport = {
      ...report,
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary || report.executiveSummary || '',
      supervisorImplication: supervisorImplication || report.supervisorImplication || '',
      classification: classification || report.classification || getClassification(overallScore),
      riskLevel: riskLevel || report.riskLevel || getRiskLevel(overallScore),
      overallScore: overallScore,
      reportType: isNationalService ? 'national_service' : 'stratavax',
      // Add summary statistics for the dashboard cards
      summaryStats: {
        totalCategories: categoryScores.length,
        totalStrengths: strengths.length,
        totalWeaknesses: weaknesses.length,
        totalRecommendations: recommendations.length
      }
    };

    console.log('[API] Final report summary:', {
      categoryScores: categoryScores.length,
      strengths: strengths.length,
      weaknesses: weaknesses.length,
      recommendations: recommendations.length,
      isNationalService: isNationalService
    });

    // Combine data for response
    const combinedResult = {
      ...result,
      candidate_profiles: candidateProfile,
      assessments: assessment
    };

    return res.status(200).json({
      success: true,
      result: combinedResult,
      report: finalReport,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      // Include calculated data at top level for easy access
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
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
