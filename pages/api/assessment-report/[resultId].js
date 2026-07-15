// pages/api/assessment-report/[resultId].js - COMPLETELY FIXED

import { createClient } from "@supabase/supabase-js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// ============================================================
// SPLIT CATEGORIES INTO WORKPLACE AND INTELLECTUAL
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

function isWorkplaceCategory(categoryName) {
  const lower = String(categoryName || '').toLowerCase();
  return WORKPLACE_KEYWORDS.some(keyword => lower.includes(keyword));
}

function isIntellectualCategory(categoryName) {
  const lower = String(categoryName || '').toLowerCase();
  return INTELLECTUAL_KEYWORDS.some(keyword => lower.includes(keyword));
}

function splitCategoryScores(categoryScores) {
  const workplace = [];
  const intellectual = [];

  safeArray(categoryScores).forEach(cat => {
    const name = cat.category || cat.name || 'Unknown';
    
    if (isWorkplaceCategory(name)) {
      workplace.push({
        category: name,
        name: name,
        percentage: safeNumber(cat.percentage || cat.score || 0),
        score: safeNumber(cat.earned || cat.score || 0),
        maxScore: safeNumber(cat.max || cat.maxScore || 100)
      });
    } else if (isIntellectualCategory(name)) {
      intellectual.push({
        category: name,
        name: name,
        percentage: safeNumber(cat.percentage || cat.score || 0),
        score: safeNumber(cat.earned || cat.score || 0),
        maxScore: safeNumber(cat.max || cat.maxScore || 100)
      });
    } else {
      const lowerName = name.toLowerCase();
      const hasWorkplacePattern = lowerName.includes('safety') || 
                                  lowerName.includes('technical') || 
                                  lowerName.includes('work') ||
                                  lowerName.includes('team') ||
                                  lowerName.includes('communication');
      
      if (hasWorkplacePattern) {
        workplace.push({
          category: name,
          name: name,
          percentage: safeNumber(cat.percentage || cat.score || 0),
          score: safeNumber(cat.earned || cat.score || 0),
          maxScore: safeNumber(cat.max || cat.maxScore || 100)
        });
      } else {
        intellectual.push({
          category: name,
          name: name,
          percentage: safeNumber(cat.percentage || cat.score || 0),
          score: safeNumber(cat.earned || cat.score || 0),
          maxScore: safeNumber(cat.max || cat.maxScore || 100)
        });
      }
    }
  });

  return { workplace, intellectual };
}

export default async function handler(req, res) {
  const { resultId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!resultId) {
    return res.status(400).json({ success: false, error: "Missing resultId" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // ============================================================
    // GET RESULT
    // ============================================================
    const { data: result, error: resultError } = await serviceClient
      .from("assessment_results")
      .select("*")
      .eq("id", resultId)
      .single();

    if (resultError) {
      return res.status(404).json({ success: false, error: "Result not found", details: resultError.message });
    }

    console.log('[API] Result found:', result.id);

    // ============================================================
    // GET CANDIDATE PROFILE
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
      }
    }

    // ============================================================
    // GET ASSESSMENT WITH TYPE - THIS IS THE KEY!
    // ============================================================
    let assessment = null;
    let assessmentTypeCode = null;
    if (result.assessment_id) {
      // First get the assessment
      const { data: assmt, error: assmtError } = await serviceClient
        .from("assessments")
        .select("id, title, assessment_type_id")
        .eq("id", result.assessment_id)
        .maybeSingle();

      if (!assmtError && assmt) {
        assessment = assmt;
        
        // Then get the assessment type
        if (assmt.assessment_type_id) {
          const { data: type, error: typeError } = await serviceClient
            .from("assessment_types")
            .select("id, code, name")
            .eq("id", assmt.assessment_type_id)
            .maybeSingle();

          if (!typeError && type) {
            assessmentTypeCode = type.code;
            assessment.assessment_type = type;
          }
        }
      }
    }

    // ============================================================
    // CRITICAL FIX: Determine if National Service by assessment_type_code ONLY
    // ============================================================
    const isNationalService = assessmentTypeCode === 'national_service';

    console.log('[API] assessmentTypeCode:', assessmentTypeCode);
    console.log('[API] isNationalService:', isNationalService);

    // ============================================================
    // EXTRACT CATEGORY SCORES
    // ============================================================
    let categoryScores = [];
    let workplaceSubCategories = [];
    let intellectualSubCategories = [];

    if (result.category_scores && Array.isArray(result.category_scores) && result.category_scores.length > 0) {
      categoryScores = result.category_scores;
    } else if (result.report_data && result.report_data.categoryScores) {
      categoryScores = result.report_data.categoryScores;
    } else if (result.report_data && result.report_data.category_scores) {
      categoryScores = result.report_data.category_scores;
    }

    // Only split if it's actually a National Service report
    if (isNationalService && categoryScores.length > 0) {
      const split = splitCategoryScores(categoryScores);
      workplaceSubCategories = split.workplace;
      intellectualSubCategories = split.intellectual;
      console.log('[API] Workplace sub-categories:', workplaceSubCategories.length);
      console.log('[API] Intellectual sub-categories:', intellectualSubCategories.length);
    }

    // ============================================================
    // GET SCORES
    // ============================================================
    let workplaceReadiness = safeNumber(result.workplace_readiness, 0);
    let intellectualCapability = safeNumber(result.intellectual_capability, 0);
    let overallScore = safeNumber(result.percentage_score, 0);
    let recommendation = result.recommendation || 'N/A';

    // For National Service, calculate scores from sub-categories if missing
    if (isNationalService) {
      if (workplaceReadiness === 0 && workplaceSubCategories.length > 0) {
        const total = workplaceSubCategories.reduce((sum, cat) => sum + safeNumber(cat.percentage, 0), 0);
        workplaceReadiness = Math.round(total / workplaceSubCategories.length);
      }

      if (intellectualCapability === 0 && intellectualSubCategories.length > 0) {
        const total = intellectualSubCategories.reduce((sum, cat) => sum + safeNumber(cat.percentage, 0), 0);
        intellectualCapability = Math.round(total / intellectualSubCategories.length);
      }

      if (overallScore === 0 && workplaceReadiness > 0 && intellectualCapability > 0) {
        overallScore = Math.round((workplaceReadiness + intellectualCapability) / 2);
      }

      // Calculate recommendation for National Service if missing
      if (!recommendation || recommendation === 'N/A' || recommendation === '') {
        const workplace = Number(workplaceReadiness) || 0;
        const intellectual = Number(intellectualCapability) || 0;
        if (workplace >= 85 && intellectual >= 85) recommendation = 'Highly Recommended';
        else if (workplace >= 75 && intellectual >= 75) recommendation = 'Recommended';
        else if (workplace >= 65 && intellectual >= 65) recommendation = 'Reserve Pool';
        else recommendation = 'Not Recommended';
      }
    }

    // ============================================================
    // BUILD REPORT
    // ============================================================
    let report = {};

    if (isNationalService) {
      report = {
        dimensions: {
          workplaceReadiness: workplaceReadiness,
          intellectualCapability: intellectualCapability,
          overallScore: overallScore
        },
        recommendation: {
          level: recommendation
        },
        statistics: {
          totalQuestions: result.total_questions || 0,
          totalAnswered: result.answered_questions || 0
        },
        workplaceSubCategories: workplaceSubCategories,
        intellectualSubCategories: intellectualSubCategories,
        category_scores: categoryScores,
        categoryBreakdown: categoryScores,
        candidateInfo: {
          fullName: candidateProfile?.full_name || 'Candidate',
          university: candidateProfile?.university || '',
          programme: candidateProfile?.programme || '',
          graduationYear: candidateProfile?.graduation_year || '',
          preferredDepartment: candidateProfile?.preferred_department || '',
          assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
        },
        reportType: 'national_service'
      };
    } else {
      // STRATAVAX REPORT - Build with all data
      report = {
        candidateInfo: {
          fullName: candidateProfile?.full_name || 'Candidate',
          university: candidateProfile?.university || '',
          programme: candidateProfile?.programme || '',
          graduationYear: candidateProfile?.graduation_year || '',
          preferredDepartment: candidateProfile?.preferred_department || '',
          assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
        },
        assessmentName: assessment?.title || 'Assessment',
        assessmentType: assessmentTypeCode || 'general',
        overallScore: overallScore,
        percentage_score: overallScore,
        classification: result.classification || 'Standard Profile',
        riskLevel: result.risk_level || result.riskLevel || 'Medium',
        categoryScores: categoryScores,
        category_scores: categoryScores,
        // These will be populated by the report generator if needed
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || result.developmentAreas || [],
        recommendations: result.recommendations || [],
        executiveSummary: result.executive_summary || result.executiveSummary || '',
        supervisorImplication: result.supervisor_implication || result.supervisorImplication || '',
        reportType: 'stratavax',
        total_questions: result.total_questions || 0,
        answered_questions: result.answered_questions || 0
      };
    }

    // ============================================================
    // RETURN RESPONSE
    // ============================================================
    return res.status(200).json({
      success: true,
      result: {
        ...result,
        candidate_profiles: candidateProfile,
        assessments: assessment,
        workplaceSubCategories: workplaceSubCategories,
        intellectualSubCategories: intellectualSubCategories,
        categoryScores: categoryScores
      },
      report: report,
      isNationalService: isNationalService,
      assessmentTypeCode: assessmentTypeCode,
      workplaceSubCategories: workplaceSubCategories,
      intellectualSubCategories: intellectualSubCategories,
      categoryScores: categoryScores,
      workplaceReadiness: workplaceReadiness,
      intellectualCapability: intellectualCapability,
      overallScore: overallScore,
      recommendation: recommendation
    });

  } catch (error) {
    console.error("[API] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch report",
      message: error?.message || "Internal server error"
    });
  }
}
