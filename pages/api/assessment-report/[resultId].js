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
  getDevelopmentAreas,
  isStrength,
  isDevelopmentArea,
  calculateGapToTarget,
  REPORT_THRESHOLDS
} from "../../../utils/scoring";
import { generateUniversalInterpretation } from "../../../utils/categoryMapper";
import { generateDetailedInterpretation } from "../../../utils/detailedInterpreter";
import { analyzeResponses } from "../../../utils/responseAnalyzer";
import {
  generateCommentary,
  generateStrengthsSummary,
  generateWeaknessesSummary,
  generateProfileCommentary
} from "../../../utils/commentaryEngine";
import { getDevelopmentRecommendation } from "../../../utils/developmentRecommendations";
import {
  getScorePhrase,
  getManufacturingPhrase,
  getTraitPhrase,
  getRoleReadinessPhrase,
  getPhrase,
  selectPhrase,
  generalReportPhrases
} from "../../../utils/phraseLibrary";

// ============================================================
// HELPERS
// ============================================================
function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

// ============================================================
// HELPER: Normalize a single sub-category item (supports array or object format)
// ============================================================
function normalizeSubCategoryItem(item, fallbackName = '') {
  if (!item) return null;

  // If stored as: "Safety & Risk Awareness": 93 (key-value pair)
  if (typeof item !== 'object') {
    return {
      category: fallbackName,
      name: fallbackName,
      percentage: Number(item) || 0,
      score: Number(item) || 0,
      maxScore: 100
    };
  }

  const categoryName = safeText(
    item.category ||
    item.name ||
    item.subcategory ||
    item.sub_category ||
    item.subcategory_name ||
    item.sub_category_name ||
    item.title ||
    item.competency ||
    item.section ||
    item.area ||
    fallbackName,
    fallbackName
  );

  const percentage = toNumber(
    item.percentage ??
    item.percent ??
    item.score_percentage ??
    item.average ??
    item.score ??
    item.value,
    0
  );

  return {
    ...item,
    category: categoryName,
    name: categoryName,
    percentage: percentage,
    score: toNumber(item.score ?? item.earned ?? item.totalScore ?? percentage, percentage),
    maxScore: toNumber(item.maxScore ?? item.max_score ?? item.max ?? item.maxPossible ?? 100, 100),
    questionCount: toNumber(item.questionCount ?? item.count ?? item.totalQuestions ?? 0, 0)
  };
}

// ============================================================
// HELPER: Extract sub-categories from result data (supports both array and object)
// ============================================================
function extractSubCategories(resultData) {
  let subCategories = [];

  console.log('[API] extractSubCategories - checking data sources');

  const normalizeArray = (arr) =>
    safeArray(arr)
      .map((item) => normalizeSubCategoryItem(item))
      .filter((item) => item && item.category);

  const normalizeObject = (obj) =>
    Object.entries(obj || {})
      .map(([key, value]) => normalizeSubCategoryItem(value, key))
      .filter((item) => item && item.category);

  // 1. category_scores column - supports array or object
  if (resultData.category_scores) {
    if (Array.isArray(resultData.category_scores)) {
      subCategories = normalizeArray(resultData.category_scores);
    } else if (typeof resultData.category_scores === 'object') {
      subCategories = normalizeObject(resultData.category_scores);
    }

    if (subCategories.length > 0) {
      console.log('[API] Found sub-categories in category_scores:', subCategories.length);
      return subCategories;
    }
  }

  // 2. report_data possible locations
  const rd = safeObject(resultData.report_data);

  const possibleArrays = [
    rd.categoryScores,
    rd.category_scores,
    rd.scoreBreakdown,
    rd.categoryBreakdown,
    rd.subCategories,
    rd.sub_categories,
    rd.workplaceSubCategories,
    rd.intellectualSubCategories
  ];

  for (const source of possibleArrays) {
    if (Array.isArray(source) && source.length > 0) {
      subCategories = normalizeArray(source);
      if (subCategories.length > 0) {
        console.log('[API] Found sub-categories in report_data:', subCategories.length);
        return subCategories;
      }
    }
  }

  // 3. _fullReport.categoryScores may be an object
  if (rd._fullReport?.categoryScores && typeof rd._fullReport.categoryScores === 'object') {
    subCategories = normalizeObject(rd._fullReport.categoryScores);
    if (subCategories.length > 0) {
      console.log('[API] Found sub-categories in _fullReport.categoryScores:', subCategories.length);
      return subCategories;
    }
  }

  console.log('[API] No sub-categories found in any source');
  return [];
}

// ============================================================
// HELPER: Split sub-categories into Workplace and Intellectual
// ============================================================
function splitSubCategories(subCategories) {
  const workplace = [];
  const intellectual = [];

  // CORRECTED: Workplace Readiness sub-categories
  const workplaceNames = [
    'Safety & Risk Awareness',
    'Safety',
    'Risk Awareness',
    'Communication & Teamwork',
    'Communication',
    'Teamwork',
    'Ownership & Integrity',
    'Ownership',
    'Integrity',
    'Workplace Ethics',
    'Workplace Readiness',
    'Learning Agility',
    'Agility'
  ];

  // CORRECTED: Intellectual Capability sub-categories
  const intellectualNames = [
    'Technical Fundamentals',
    'Technical',
    'Problem Solving & Troubleshooting',
    'Problem Solving',
    'Troubleshooting',
    'Logical Reasoning',
    'Logic',
    'Numerical Reasoning',
    'Numerical',
    'Measurement & Engineering Units',
    'Measurement',
    'Engineering Units',
    'Critical Thinking',
    'Analytical',
    'Decision Making',
    'Intellectual Capability'
  ];

  if (subCategories.length > 0) {
    subCategories.forEach(rawCat => {
      // Normalize the category item first
      const cat = normalizeSubCategoryItem(rawCat);
      if (!cat || !cat.category) return;

      const name = safeText(cat.category || cat.name, '');
      const lowerName = name.toLowerCase();

      const isWorkplace = workplaceNames.some(n => lowerName.includes(n.toLowerCase()));
      const isIntellectual = intellectualNames.some(n => lowerName.includes(n.toLowerCase()));

      // CORRECTED: Workplace pattern logic
      const hasWorkplacePattern = lowerName.includes('safety') ||
        lowerName.includes('communication') ||
        lowerName.includes('teamwork') ||
        lowerName.includes('ownership') ||
        lowerName.includes('integrity') ||
        lowerName.includes('workplace') ||
        lowerName.includes('ethics') ||
        lowerName.includes('learning') ||
        lowerName.includes('agility');

      // CORRECTED: Intellectual pattern logic
      const hasIntellectualPattern = lowerName.includes('technical') ||
        lowerName.includes('problem') ||
        lowerName.includes('solving') ||
        lowerName.includes('reasoning') ||
        lowerName.includes('numerical') ||
        lowerName.includes('measurement') ||
        lowerName.includes('engineering') ||
        lowerName.includes('critical') ||
        lowerName.includes('analytical') ||
        lowerName.includes('decision');

      // Classification logic with corrected patterns
      if (isWorkplace || hasWorkplacePattern) {
        workplace.push(cat);
      } else if (isIntellectual || hasIntellectualPattern) {
        intellectual.push(cat);
      } else {
        // Fallback: default based on category name
        if (lowerName.includes('readiness') || lowerName.includes('ethics') || lowerName.includes('ownership')) {
          workplace.push(cat);
        } else {
          intellectual.push(cat);
        }
      }
    });
  }

  console.log('[API] Workplace sub-categories:', workplace.length);
  console.log('[API] Intellectual sub-categories:', intellectual.length);

  return { workplace, intellectual };
}

// ============================================================
// HELPER: Get score level label
// ============================================================
function getScoreLevelLabel(percentage) {
  const value = toNumber(percentage, 0);
  if (value >= 85) return 'Exceptional';
  if (value >= 75) return 'Strong';
  if (value >= 65) return 'Adequate';
  if (value >= 55) return 'Developing';
  if (value >= 40) return 'Priority Development';
  return 'Critical Gap';
}

// ============================================================
// HELPER: Get development action
// ============================================================
function getDevelopmentAction(category, percentage) {
  const value = toNumber(percentage, 0);
  const rec = getDevelopmentRecommendation(category, value);

  if (value < 40) {
    return `Immediate intervention required. ${rec}`;
  }
  if (value < 55) {
    return `High priority action. ${rec}`;
  }
  if (value < 65) {
    return `Structured development. ${rec}`;
  }
  return `Reinforcement and practice. ${rec}`;
}

// ============================================================
// API HANDLER
// ============================================================
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
    console.log('[API] category_scores column:', result.category_scores ? (Array.isArray(result.category_scores) ? result.category_scores.length : 'object') : 'null');

    // ============================================================
    // DEBUG LOGS - Raw data (remove after confirming fix)
    // ============================================================
    console.log('[API DEBUG] Raw category_scores:', JSON.stringify(result.category_scores, null, 2));
    console.log('[API DEBUG] Raw report_data:', JSON.stringify(result.report_data, null, 2));

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
    // Initialize data structures
    // ============================================================
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
    let detailedInterpretation = {};
    let responseInsights = {};
    let commentaryData = {};
    let report = {};

    // ============================================================
    // Fetch responses for category scoring
    // ============================================================
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
          time_spent_seconds,
          times_changed,
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

    // ============================================================
    // Generate response insights using responseAnalyzer
    // ============================================================
    if (responses.length > 0 && !isNationalService) {
      responseInsights = analyzeResponses(responses, [], [], assessmentTypeCode || 'general');
      console.log('[API] Response insights generated for', Object.keys(responseInsights).length, 'categories');
    }

    // ============================================================
    // STRATAVAX REPORT - Full detailed report
    // ============================================================
    if (!isNationalService && responses.length > 0) {
      console.log('[API] Generating full Stratavax report with all utilities');

      // Calculate category scores from responses
      const isBaseline = false;
      const calculatedCategories = calculateCategoryScores(responses, isBaseline);

      // Build scores object for utilities
      const scoresMap = {};
      calculatedCategories.forEach(cat => {
        scoresMap[cat.category] = cat.percentage;
      });

      // Format category scores for frontend with full details
      categoryScores = calculatedCategories.map(cat => {
        const percentage = cat.percentage || 0;
        const gradeInfo = getGradeInfo(percentage);
        const gap = calculateGapToTarget(percentage);

        const commentary = generateCommentary(
          cat.category,
          percentage,
          isStrength(percentage) ? 'strength' : 'weakness',
          assessmentTypeCode
        );

        const devRecommendation = getDevelopmentRecommendation(cat.category, percentage);
        const insights = responseInsights[cat.category]?.insights || [];

        return {
          category: cat.category,
          name: cat.category,
          percentage: percentage,
          score: cat.totalScore || 0,
          maxScore: cat.maxPossible || 0,
          grade: gradeInfo.grade,
          gradeDescription: gradeInfo.description,
          classification: cat.classification || classDetails.classification,
          comment: cat.comment || getScoreComment(percentage),
          supervisorImplication: cat.supervisorImplication || getSupervisorImplication(percentage),
          riskLevel: cat.riskLevel || getRiskLevel(percentage),
          gapToTarget: gap,
          commentary: commentary,
          developmentRecommendation: devRecommendation,
          insights: insights.slice(0, 3),
          questionCount: cat.count || 0,
          isStrength: isStrength(percentage),
          isDevelopmentArea: isDevelopmentArea(percentage),
          isCriticalGap: percentage < REPORT_THRESHOLDS.criticalThreshold,
          performanceLevel: getScoreLevelLabel(percentage)
        };
      });

      // Sort by percentage descending
      categoryScores.sort((a, b) => b.percentage - a.percentage);

      // Get strengths and weaknesses with full details
      const strengthItems = getStrengthAreas(calculatedCategories, 5);
      strengths = strengthItems.map(s => {
        const percentage = s.percentage || 0;
        return {
          category: s.category,
          name: s.category,
          percentage: percentage,
          score: s.totalScore || 0,
          maxScore: s.maxPossible || 0,
          gapToTarget: s.gapToTarget || 0,
          comment: s.comment || getScoreComment(percentage),
          supervisorImplication: s.supervisorImplication || getSupervisorImplication(percentage),
          commentary: generateCommentary(s.category, percentage, 'strength', assessmentTypeCode),
          phrase: getScorePhrase(s.category, percentage, 'summary', `${s.category}-${percentage}`)
        };
      });

      const weaknessItems = getDevelopmentAreas(calculatedCategories, 5);
      weaknesses = weaknessItems.map(w => {
        const percentage = w.percentage || 0;
        return {
          category: w.category,
          name: w.category,
          percentage: percentage,
          score: w.totalScore || 0,
          maxScore: w.maxPossible || 0,
          gapToTarget: w.gapToTarget || calculateGapToTarget(percentage),
          comment: w.comment || getScoreComment(percentage),
          supervisorImplication: w.supervisorImplication || getSupervisorImplication(percentage),
          commentary: generateCommentary(w.category, percentage, 'weakness', assessmentTypeCode),
          developmentRecommendation: getDevelopmentRecommendation(w.category, percentage),
          phrase: getScorePhrase(w.category, percentage, 'summary', `${w.category}-${percentage}`)
        };
      });

      // Generate detailed interpretation
      detailedInterpretation = generateDetailedInterpretation(
        candidateProfile?.full_name || 'Candidate',
        scoresMap,
        assessmentTypeCode || 'general',
        responseInsights
      );

      // Generate universal interpretation
      const interpretation = generateUniversalInterpretation(
        assessmentTypeCode || 'general',
        candidateProfile?.full_name || 'Candidate',
        scoresMap,
        strengths.map(s => ({ area: s.category, percentage: s.percentage })),
        weaknesses.map(w => ({ area: w.category, percentage: w.percentage })),
        overallScore
      );

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

      // Generate recommendations
      if (interpretation.developmentFocus && interpretation.developmentFocus.length > 0) {
        recommendations = interpretation.developmentFocus.map((item, index) => {
          let priority = 'Medium';
          if (item.priority === 'High' || item.score < 40) priority = 'Critical';
          else if (item.score < 55) priority = 'High';
          else if (item.score < 65) priority = 'Medium';
          else priority = 'Low';

          const devRec = getDevelopmentRecommendation(item.area, item.score);

          return {
            priority: priority,
            category: item.area,
            currentScore: item.score,
            gapToTarget: item.gapToTarget || calculateGapToTarget(item.score),
            recommendation: devRec,
            action: getDevelopmentAction(item.area, item.score),
            impact: `Improving ${item.area} will help move the candidate closer to the recommended ${REPORT_THRESHOLDS.targetScore}% target.`
          };
        });
      } else if (weaknesses.length > 0) {
        recommendations = weaknesses.map((w, index) => {
          let priority = 'Medium';
          if (w.percentage < 40) priority = 'Critical';
          else if (w.percentage < 55) priority = 'High';
          else if (w.percentage < 65) priority = 'Medium';
          else priority = 'Low';

          return {
            priority: priority,
            category: w.category,
            currentScore: w.percentage,
            gapToTarget: w.gapToTarget || calculateGapToTarget(w.percentage),
            recommendation: getDevelopmentRecommendation(w.category, w.percentage),
            action: getDevelopmentAction(w.category, w.percentage),
            impact: `Improving ${w.category} will help move the candidate closer to the recommended ${REPORT_THRESHOLDS.targetScore}% target.`
          };
        });
      }

      // Sort recommendations by priority
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      recommendations.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

      // Generate executive summary
      const strengthsSummary = generateStrengthsSummary(
        strengths.map(s => ({ area: s.category, percentage: s.percentage })),
        strengths.slice(0, 3).map(s => s.category)
      );

      const weaknessesSummary = generateWeaknessesSummary(
        weaknesses.map(w => ({ area: w.category, percentage: w.percentage })),
        weaknesses.slice(0, 3).map(w => w.category),
        overallScore
      );

      const profileCommentary = generateProfileCommentary(
        overallScore,
        classification,
        strengths.map(s => ({ area: s.category, percentage: s.percentage })),
        weaknesses.map(w => ({ area: w.category, percentage: w.percentage }))
      );

      const candidateName = candidateProfile?.full_name || 'Candidate';
      const assessmentTitle = assessment?.title || 'Assessment';

      executiveSummary = `${candidateName} completed the ${assessmentTitle} with an overall score of ${Math.round(overallScore)}%. ${strengthsSummary} ${weaknessesSummary} ${profileCommentary}`;

      supervisorImplication = getSupervisorImplication(overallScore);

      report = {
        candidateName: candidateProfile?.full_name || 'Candidate',
        assessmentName: assessment?.title || 'Assessment',
        assessmentType: assessmentTypeCode || 'general',
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
        categoryInterpretation: categoryInterpretation,
        profileSummary: profileSummary,
        suitabilityAndRisks: suitabilityAndRisks,
        developmentFocus: developmentFocus,
        detailedInterpretation: detailedInterpretation,
        summaryStats: {
          totalCategories: categoryScores.length,
          totalStrengths: strengths.length,
          totalWeaknesses: weaknesses.length,
          totalRecommendations: recommendations.length,
          totalQuestions: result.total_questions || 0,
          answeredQuestions: result.answered_questions || 0
        }
      };

      console.log('[API] Full report generated:', {
        categoryScores: categoryScores.length,
        strengths: strengths.length,
        weaknesses: weaknesses.length,
        recommendations: recommendations.length
      });

    } else if (isNationalService) {
      // ============================================================
      // NATIONAL SERVICE REPORT - WITH SUB-CATEGORIES
      // ============================================================
      console.log('[API] National Service report with sub-categories');

      // ============================================================
      // EXTRACT SUB-CATEGORIES FROM result (checks category_scores column first)
      // ============================================================
      const subCategories = extractSubCategories(result);

      console.log('[API DEBUG] Extracted SubCategories:', JSON.stringify(subCategories, null, 2));

      const { workplace: workplaceSubCategories, intellectual: intellectualSubCategories } = splitSubCategories(subCategories);

      console.log('[API] Sub-categories found:', subCategories.length);
      console.log('[API] Workplace sub-categories:', workplaceSubCategories.length);
      console.log('[API] Intellectual sub-categories:', intellectualSubCategories.length);

      // Get category breakdown if available (legacy)
      const reportData = result.report_data || {};
      const categoryBreakdown = reportData.categoryBreakdown || [];
      const legacyCategoryScores = categoryBreakdown.map(cat => ({
        category: cat.category,
        name: cat.category,
        percentage: cat.percentage || 0,
        score: cat.earned || 0,
        maxScore: cat.max || 0,
        dimension: cat.dimension || 'other'
      }));

      // Use sub-categories if available, otherwise use legacy
      const finalCategoryScores = subCategories.length > 0 ? subCategories : legacyCategoryScores;

      // Build scores map for utilities
      const scoresMap = {};
      finalCategoryScores.forEach(cat => {
        scoresMap[cat.category || cat.name] = cat.percentage || 0;
      });

      // Generate interpretation
      const interpretation = generateUniversalInterpretation(
        'national_service',
        candidateProfile?.full_name || 'Candidate',
        scoresMap,
        [],
        [],
        overallScore
      );

      // ============================================================
      // BUILD NATIONAL SERVICE REPORT WITH SUB-CATEGORIES
      // ============================================================
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
        // ============================================================
        // SUB-CATEGORIES - WHAT THE SUPERVISOR NEEDS TO SEE
        // ============================================================
        workplaceSubCategories: workplaceSubCategories,
        intellectualSubCategories: intellectualSubCategories,
        // Legacy category breakdown for compatibility
        categoryBreakdown: finalCategoryScores,
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

      console.log('[API] National Service report with sub-categories generated:', {
        workplaceSubCategories: workplaceSubCategories.length,
        intellectualSubCategories: intellectualSubCategories.length
      });

    } else {
      // ============================================================
      // FALLBACK - Use report_data
      // ============================================================
      console.log('[API] Using fallback - report_data only');

      const reportData = result.report_data || {};

      categoryScores = reportData.categoryScores || reportData.category_scores || [];
      strengths = reportData.strengths || [];
      weaknesses = reportData.weaknesses || reportData.developmentAreas || [];
      recommendations = reportData.recommendations || [];
      executiveSummary = reportData.executiveSummary || reportData.executive_summary || '';
      supervisorImplication = reportData.supervisorImplication || reportData.supervisor_implication || '';

      report = {
        ...reportData,
        reportType: 'stratavax',
        overallScore: overallScore,
        classification: classification,
        riskLevel: riskLevel,
        categoryScores: categoryScores,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        executiveSummary: executiveSummary,
        supervisorImplication: supervisorImplication
      };
    }

    // ============================================================
    // Combine data for response
    // ============================================================
    const combinedResult = {
      ...result,
      candidate_profiles: candidateProfile,
      assessments: assessment,
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
      detailedInterpretation: detailedInterpretation,
      // NATIONAL SERVICE SUB-CATEGORIES
      workplaceSubCategories: report.workplaceSubCategories || [],
      intellectualSubCategories: report.intellectualSubCategories || []
    };

    console.log('[API] Final response:', {
      success: true,
      isNationalService: isNationalService,
      workplaceSubCategories: (report.workplaceSubCategories || []).length,
      intellectualSubCategories: (report.intellectualSubCategories || []).length,
      categoryScores: categoryScores.length,
      strengths: strengths.length,
      weaknesses: weaknesses.length,
      recommendations: recommendations.length
    });

    return res.status(200).json({
      success: true,
      result: combinedResult,
      report: report,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      // NATIONAL SERVICE SUB-CATEGORIES at top level
      workplaceSubCategories: report.workplaceSubCategories || [],
      intellectualSubCategories: report.intellectualSubCategories || [],
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
      detailedInterpretation: detailedInterpretation,
      summaryStats: {
        totalCategories: categoryScores.length,
        totalStrengths: strengths.length,
        totalWeaknesses: weaknesses.length,
        totalRecommendations: recommendations.length,
        workplaceSubCategories: (report.workplaceSubCategories || []).length,
        intellectualSubCategories: (report.intellectualSubCategories || []).length
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
