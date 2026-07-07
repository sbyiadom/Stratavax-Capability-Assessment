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
  normalizeText
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
    // For Stratavax reports: Calculate category scores, strengths, etc.
    // ============================================================
    let report = result.report_data || null;
    let categoryScores = [];
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];
    let executiveSummary = '';
    let supervisorImplication = '';
    let classification = '';
    let riskLevel = '';

    if (!isNationalService) {
      // ============================================================
      // STRATAVAX REPORT - Calculate from responses
      // ============================================================
      console.log('[API] Generating Stratavax report data');

      // Fetch responses for this session
      let responses = [];
      if (result.session_id) {
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
        }
      }

      // If we have responses, calculate category scores
      if (responses.length > 0) {
        // Use the scoring engine to calculate category scores
        const isBaseline = false; // Stratavax assessments use weighted scoring
        const calculatedCategories = calculateCategoryScores(responses, isBaseline);
        
        // Format category scores for the frontend
        categoryScores = calculatedCategories.map(cat => ({
          category: cat.category,
          name: cat.category,
          percentage: cat.percentage,
          score: cat.totalScore,
          maxScore: cat.maxPossible,
          grade: cat.grade,
          classification: cat.classification,
          comment: cat.comment,
          supervisorImplication: cat.supervisorImplication,
          riskLevel: cat.riskLevel,
          gapToTarget: cat.gapToTarget
        }));

        // Get strengths (categories above 75%)
        const strengthAreas = getStrengthAreas(calculatedCategories, 3);
        strengths = strengthAreas.map(s => ({
          category: s.category,
          name: s.category,
          percentage: s.percentage,
          score: s.totalScore,
          maxScore: s.maxPossible
        }));

        // Get development areas (categories below 65%)
        const developmentAreas = getDevelopmentAreas(calculatedCategories, 3);
        weaknesses = developmentAreas.map(d => ({
          category: d.category,
          name: d.category,
          percentage: d.percentage,
          score: d.totalScore,
          maxScore: d.maxPossible
        }));

        // Generate recommendations based on weaknesses
        recommendations = developmentAreas.map((d, index) => {
          let priority = 'Medium';
          if (d.percentage < 40) priority = 'Critical';
          else if (d.percentage < 55) priority = 'High';
          else if (d.percentage < 65) priority = 'Medium';
          else priority = 'Low';

          return {
            priority: priority,
            category: d.category,
            recommendation: `Focus on developing ${d.category} skills through targeted training and practical experience. Current score of ${Math.round(d.percentage)}% indicates room for improvement.`,
            action: priority === 'Critical' || priority === 'High' 
              ? `Provide structured training, supervised practice, and weekly check-ins for ${d.category}.`
              : `Provide targeted practice and feedback in ${d.category}.`,
            impact: `Improving ${d.category} will help move the candidate closer to the recommended 80% target.`
          };
        });

        // Generate executive summary
        const overallPercentage = result.percentage_score || 0;
        const gradeInfo = getGradeInfo(overallPercentage);
        const classDetails = getClassificationDetailsFromPercentage(overallPercentage);
        classification = classDetails.classification;
        riskLevel = getRiskLevel(overallPercentage);

        const topStrengths = strengths.slice(0, 3).map(s => s.category).join(', ');
        const topWeaknesses = weaknesses.slice(0, 3).map(w => w.category).join(', ');

        executiveSummary = `${candidateProfile?.full_name || 'Candidate'} scored ${Math.round(overallPercentage)}% overall, demonstrating ${classification.toLowerCase()} performance. Key strengths include ${topStrengths || 'no specific strengths identified'}. Areas for development include ${topWeaknesses || 'no specific development areas identified'}.`;

        supervisorImplication = getSupervisorImplication(overallPercentage);

        console.log('[API] Category scores calculated:', categoryScores.length);
        console.log('[API] Strengths:', strengths.length);
        console.log('[API] Weaknesses:', weaknesses.length);
        console.log('[API] Recommendations:', recommendations.length);
      } else {
        // Fallback: Use data from report_data if available
        const reportData = result.report_data || {};
        categoryScores = reportData.categoryScores || reportData.category_scores || [];
        strengths = reportData.strengths || [];
        weaknesses = reportData.weaknesses || reportData.developmentAreas || [];
        recommendations = reportData.recommendations || [];
        executiveSummary = reportData.executiveSummary || reportData.executive_summary || '';
        supervisorImplication = reportData.supervisorImplication || reportData.supervisor_implication || '';
        classification = reportData.classification || getClassification(result.percentage_score || 0);
        riskLevel = reportData.riskLevel || getRiskLevel(result.percentage_score || 0);
      }

      // Build the report object with all calculated data
      report = {
        ...result.report_data,
        categoryScores: categoryScores,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        executiveSummary: executiveSummary,
        supervisorImplication: supervisorImplication,
        classification: classification,
        riskLevel: riskLevel,
        overallScore: result.percentage_score || 0,
        reportType: 'stratavax'
      };

      console.log('[API] Final report built with:', {
        categoryScores: categoryScores.length,
        strengths: strengths.length,
        weaknesses: weaknesses.length,
        recommendations: recommendations.length
      });
    } else {
      // ============================================================
      // NATIONAL SERVICE REPORT - Use existing report_data
      // ============================================================
      console.log('[API] National Service report - using existing data');
      
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
          categoryBreakdown: result.report_data?.categoryBreakdown || [],
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

    // Combine data for response
    const combinedResult = {
      ...result,
      candidate_profiles: candidateProfile,
      assessments: assessment
    };

    return res.status(200).json({
      success: true,
      result: combinedResult,
      report: report,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      // Include calculated data directly for easier access
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
      executiveSummary: isNationalService ? {
        workplaceReadiness: result.workplace_readiness,
        intellectualCapability: result.intellectual_capability,
        overallScore: result.percentage_score,
        recommendation: result.recommendation
      } : {
        overallScore: result.percentage_score,
        classification: classification,
        riskLevel: riskLevel
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
