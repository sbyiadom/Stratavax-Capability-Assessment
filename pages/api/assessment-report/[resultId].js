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
  roundNumber,
  calculateCategoryScores,
  getStrengthAreas,
  getDevelopmentAreas
} from "../../../utils/scoring";
import { generateUniversalInterpretation } from "../../../utils/categoryMapper";

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
      }
    }

    // ============================================================
    // Check if National Service
    // ============================================================
    const isNationalService = 
      assessmentTypeCode === 'national_service' ||
      (result.workplace_readiness !== null && result.workplace_readiness !== undefined);

    console.log('[API] isNationalService:', isNationalService);
    console.log('[API] Assessment type code:', assessmentTypeCode);

    // ============================================================
    // Get overall score
    // ============================================================
    const overallScore = result.percentage_score || 0;
    const classDetails = getClassificationDetailsFromPercentage(overallScore);
    const classification = classDetails.classification;
    const riskLevel = getRiskLevel(overallScore);

    // ============================================================
    // Fetch responses for category scoring
    // ============================================================
    let responses = [];
    let categoryScores = [];
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];
    let executiveSummary = '';
    let supervisorImplication = '';
    let categoryInterpretation = {};
    let profileSummary = {};
    let suitabilityAndRisks = {};
    let developmentFocus = [];
    let report = {};

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

    if (!isNationalService && responses.length > 0) {
      // ============================================================
      // STRATAVAX REPORT - Generate using categoryMapper
      // ============================================================
      console.log('[API] Generating Stratavax report with categoryMapper');

      // Calculate category scores from responses
      const isBaseline = false;
      const calculatedCategories = calculateCategoryScores(responses, isBaseline);
      
      // Build scores object for categoryMapper
      const scoresMap = {};
      calculatedCategories.forEach(cat => {
        scoresMap[cat.category] = cat.percentage;
      });

      // Format category scores for frontend
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

      // Sort by percentage descending
      categoryScores.sort((a, b) => b.percentage - a.percentage);

      // Get strengths and weaknesses
      const strengthItems = getStrengthAreas(calculatedCategories, 5);
      strengths = strengthItems.map(s => ({
        category: s.category,
        name: s.category,
        percentage: s.percentage,
        score: s.totalScore,
        maxScore: s.maxPossible,
        comment: s.comment
      }));

      const weaknessItems = getDevelopmentAreas(calculatedCategories, 5);
      weaknesses = weaknessItems.map(w => ({
        category: w.category,
        name: w.category,
        percentage: w.percentage,
        score: w.totalScore,
        maxScore: w.maxPossible,
        gapToTarget: w.gapToTarget,
        comment: w.comment
      }));

      // ============================================================
      // USE CATEGORY MAPPER FOR PROFESSIONAL INTERPRETATION
      // ============================================================
      const interpretation = generateUniversalInterpretation(
        assessmentTypeCode || 'general',
        candidateProfile?.full_name || 'Candidate',
        scoresMap,
        strengths.map(s => ({ area: s.category, percentage: s.percentage })),
        weaknesses.map(w => ({ area: w.category, percentage: w.percentage })),
        overallScore
      );

      // Extract interpretation data
      categoryInterpretation = interpretation.categoryInterpretation || {};
      profileSummary = {
        type: interpretation.profileType || 'Standard Profile',
        description: interpretation.profileDescription || ''
      };
      suitabilityAndRisks = {
        suitability: interpretation.suitability || [],
        risks: interpretation.risks || []
      };
      developmentFocus = interpretation.developmentFocus || [];
      executiveSummary = interpretation.overallSummary || '';

      // Generate recommendations from interpretation or from weaknesses
      if (interpretation.developmentFocus && interpretation.developmentFocus.length > 0) {
        recommendations = interpretation.developmentFocus.map((item, index) => {
          let priority = 'Medium';
          if (item.priority === 'High' || item.score < 40) priority = 'Critical';
          else if (item.score < 55) priority = 'High';
          else if (item.score < 65) priority = 'Medium';
          else priority = 'Low';

          return {
            priority: priority,
            category: item.area,
            recommendation: `Focus on developing ${item.area} skills. Current score of ${Math.round(item.score)}% indicates ${item.gapToTarget > 0 ? `a ${Math.round(item.gapToTarget)}% gap` : 'room for improvement'}.`,
            action: priority === 'Critical' || priority === 'High' 
              ? `Provide structured training, supervised practice, and weekly check-ins for ${item.area}.`
              : `Provide targeted coaching and practical assignments in ${item.area}.`,
            impact: `Improving ${item.area} will help move the candidate closer to the recommended 80% target.`
          };
        });
      }

      // Supervisor implication
      supervisorImplication = getSupervisorImplication(overallScore);

      // Build report with all data
      report = {
        candidateName: candidateProfile?.full_name || 'Candidate',
        assessmentName: assessment?.title || 'Assessment',
        candidateInfo: {
          fullName: candidateProfile?.full_name || 'Candidate',
          university: candidateProfile?.university || '',
          programme: candidateProfile?.programme || '',
          graduationYear: candidateProfile?.graduation_year || '',
          preferredDepartment: candidateProfile?.preferred_department || '',
          assessmentDate: new Date(result.completed_at).toLocaleDateString()
        },
        categoryScores: categoryScores,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        executiveSummary: executiveSummary,
        supervisorImplication: supervisorImplication,
        classification: classification,
        riskLevel: riskLevel,
        overallScore: overallScore,
        reportType: 'stratavax',
        // Add interpretation data
        categoryInterpretation: categoryInterpretation,
        profileSummary: profileSummary,
        suitabilityAndRisks: suitabilityAndRisks,
        developmentFocus: developmentFocus
      };

      console.log('[API] Report generated with categoryMapper:', {
        categoryScores: categoryScores.length,
        strengths: strengths.length,
        weaknesses: weaknesses.length,
        recommendations: recommendations.length,
        hasInterpretation: Object.keys(categoryInterpretation).length > 0
      });

    } else if (isNationalService) {
      // ============================================================
      // NATIONAL SERVICE REPORT - Use existing data
      // ============================================================
      console.log('[API] National Service report');

      const reportData = result.report_data || {};
      
      // Get category breakdown if available
      const categoryBreakdown = reportData.categoryBreakdown || [];
      categoryScores = categoryBreakdown.map(cat => ({
        category: cat.category,
        name: cat.category,
        percentage: cat.percentage || 0,
        score: cat.earned || 0,
        maxScore: cat.max || 0,
        dimension: cat.dimension || 'other'
      }));

      // Build scores map for categoryMapper
      const scoresMap = {};
      categoryScores.forEach(cat => {
        scoresMap[cat.category] = cat.percentage;
      });

      // Use categoryMapper for interpretation
      const interpretation = generateUniversalInterpretation(
        'national_service',
        candidateProfile?.full_name || 'Candidate',
        scoresMap,
        [],
        [],
        overallScore
      );

      report = {
        dimensions: {
          workplaceReadiness: result.workplace_readiness || 0,
          intellectualCapability: result.intellectual_capability || 0,
          overallScore: overallScore
        },
        recommendation: {
          level: result.recommendation || 'Not Recommended'
        },
        statistics: {
          totalQuestions: result.total_questions || 0,
          totalAnswered: result.answered_questions || 0
        },
        categoryBreakdown: categoryBreakdown,
        candidateInfo: {
          fullName: candidateProfile?.full_name || 'Candidate',
          university: candidateProfile?.university || '',
          programme: candidateProfile?.programme || '',
          graduationYear: candidateProfile?.graduation_year || '',
          preferredDepartment: candidateProfile?.preferred_department || '',
          assessmentDate: new Date(result.completed_at).toLocaleDateString()
        },
        reportType: 'national_service',
        executiveSummary: interpretation.overallSummary || '',
        profileSummary: {
          type: interpretation.profileType || 'National Service Profile',
          description: interpretation.profileDescription || ''
        },
        suitabilityAndRisks: {
          suitability: interpretation.suitability || [],
          risks: interpretation.risks || []
        }
      };
    } else {
      // ============================================================
      // FALLBACK - Use report_data
      // ============================================================
      console.log('[API] Using fallback - report_data only');
      
      const reportData = result.report_data || {};
      report = {
        ...reportData,
        reportType: 'stratavax',
        overallScore: overallScore,
        classification: classification,
        riskLevel: riskLevel
      };
      
      // Try to extract data from report_data
      categoryScores = reportData.categoryScores || reportData.category_scores || [];
      strengths = reportData.strengths || [];
      weaknesses = reportData.weaknesses || reportData.developmentAreas || [];
      recommendations = reportData.recommendations || [];
      executiveSummary = reportData.executiveSummary || reportData.executive_summary || '';
      supervisorImplication = reportData.supervisorImplication || reportData.supervisor_implication || '';
    }

    // ============================================================
    // Combine data for response
    // ============================================================
    const combinedResult = {
      ...result,
      candidate_profiles: candidateProfile,
      assessments: assessment,
      // Add all calculated data
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
      overallScore: overallScore,
      // Add interpretation data
      categoryInterpretation: categoryInterpretation,
      profileSummary: profileSummary,
      suitabilityAndRisks: suitabilityAndRisks,
      developmentFocus: developmentFocus
    };

    console.log('[API] Final response:', {
      success: true,
      isNationalService: isNationalService,
      categoryScores: categoryScores.length,
      strengths: strengths.length,
      weaknesses: weaknesses.length,
      recommendations: recommendations.length,
      hasInterpretation: Object.keys(categoryInterpretation).length > 0
    });

    return res.status(200).json({
      success: true,
      result: combinedResult,
      report: report,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      categoryScores: categoryScores,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      executiveSummary: executiveSummary,
      supervisorImplication: supervisorImplication,
      classification: classification,
      riskLevel: riskLevel,
      overallScore: overallScore,
      categoryInterpretation: categoryInterpretation,
      profileSummary: profileSummary,
      suitabilityAndRisks: suitabilityAndRisks,
      developmentFocus: developmentFocus,
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
