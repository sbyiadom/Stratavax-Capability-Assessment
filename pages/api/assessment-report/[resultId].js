// pages/api/assessment-report/[resultId].js - COMPLETE FIXED VERSION

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
// GENERATE RECOMMENDATIONS FROM CATEGORY SCORES
// ============================================================
function generateRecommendations(categoryScores, overallScore) {
  const recommendations = [];
  
  if (!categoryScores || categoryScores.length === 0) {
    if (overallScore < 55) {
      recommendations.push({
        priority: 'High',
        recommendation: 'Focus on building foundational skills across all areas.',
        action: 'Provide structured training and close supervision in key competency areas.',
        impact: 'Building a stronger foundation will enable more consistent performance.'
      });
    } else if (overallScore < 65) {
      recommendations.push({
        priority: 'Medium',
        recommendation: 'Strengthen core competencies through targeted development.',
        action: 'Identify specific areas for improvement and create a structured development plan.',
        impact: 'Improving core competencies will enhance overall effectiveness.'
      });
    } else if (overallScore < 75) {
      recommendations.push({
        priority: 'Low',
        recommendation: 'Continue to build on existing strengths through practical application.',
        action: 'Provide opportunities to apply skills in real-world contexts.',
        impact: 'Practical application will reinforce and strengthen existing capabilities.'
      });
    }
    return recommendations;
  }

  const sortedCategories = [...categoryScores].sort((a, b) => 
    (a.percentage || a.score || 0) - (b.percentage || b.score || 0)
  );

  sortedCategories.forEach((cat, index) => {
    const percentage = safeNumber(cat.percentage || cat.score || 0);
    const categoryName = cat.category || cat.name || 'Unknown';
    
    if (percentage < 65) {
      let priority = 'High';
      if (percentage >= 55) priority = 'Medium';
      if (percentage >= 60) priority = 'Low';
      
      let recommendation = '';
      let action = '';
      let impact = '';
      
      if (percentage < 40) {
        recommendation = `${categoryName} requires immediate foundational development.`;
        action = `Provide intensive training and close supervision in ${categoryName}. Consider assigning a mentor for this area.`;
        impact = `Addressing this gap will significantly improve overall capability in ${categoryName}.`;
      } else if (percentage < 55) {
        recommendation = `${categoryName} shows significant room for improvement.`;
        action = `Implement structured development activities focused on ${categoryName}. Regular progress reviews are recommended.`;
        impact = `Developing ${categoryName} will enhance the candidate's overall effectiveness.`;
      } else {
        recommendation = `${categoryName} would benefit from targeted development.`;
        action = `Provide focused practice and constructive feedback in ${categoryName} to build confidence and consistency.`;
        impact = `Strengthening ${categoryName} will contribute to more consistent performance.`;
      }
      
      recommendations.push({
        priority: priority,
        category: categoryName,
        currentScore: percentage,
        gapToTarget: Math.round(70 - percentage),
        recommendation: recommendation,
        action: action,
        impact: impact
      });
    }
  });

  if (recommendations.length === 0 && overallScore < 70) {
    recommendations.push({
      priority: 'Medium',
      recommendation: 'Continue to build on existing capabilities with practical experience.',
      action: 'Provide structured opportunities to apply skills in increasingly complex scenarios.',
      impact: 'Practical application will help consolidate and extend existing capabilities.'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'Low',
      recommendation: 'Continue to reinforce and apply existing capabilities.',
      action: 'Provide regular feedback and opportunities for practical application.',
      impact: 'Continued reinforcement will support sustained professional growth.'
    });
  }

  return recommendations.slice(0, 5);
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

// ============================================================
// HELPER: Get Suggested Placement based on scores
// ============================================================
function getSuggestedPlacement(workplace, intellectual) {
  const w = Number(workplace) || 0;
  const i = Number(intellectual) || 0;
  
  if (w >= 85 && i >= 85) {
    return ['Operations & Production Management', 'Quality Assurance & Control', 'Supply Chain & Logistics', 'Technical Services'];
  } else if (w >= 75 && i >= 75) {
    return ['Production Support', 'Maintenance & Engineering', 'Quality Control', 'Warehouse & Distribution'];
  } else if (w >= 65 && i >= 65) {
    return ['General Operations', 'Administrative Support', 'Entry-Level Technical Roles'];
  } else if (w >= 50 || i >= 50) {
    return ['Structured Training Programs', 'Supervised Development Roles'];
  } else {
    return ['Foundation Training', 'Supervised Onboarding'];
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

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
    // GET ASSESSMENT WITH TYPE
    // ============================================================
    let assessment = null;
    let assessmentTypeCode = null;
    if (result.assessment_id) {
      const { data: assmt, error: assmtError } = await serviceClient
        .from("assessments")
        .select("id, title, assessment_type_id")
        .eq("id", result.assessment_id)
        .maybeSingle();

      if (!assmtError && assmt) {
        assessment = assmt;
        
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
    // DETERMINE IF NATIONAL SERVICE
    // ============================================================
    const isNationalService = assessmentTypeCode === 'national_service';

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

    // Split for National Service
    if (isNationalService && categoryScores.length > 0) {
      const split = splitCategoryScores(categoryScores);
      workplaceSubCategories = split.workplace;
      intellectualSubCategories = split.intellectual;
    }

    // ============================================================
    // CALCULATE SCORES
    // ============================================================
    let workplaceReadiness = safeNumber(result.workplace_readiness, 0);
    let intellectualCapability = safeNumber(result.intellectual_capability, 0);
    let overallScore = safeNumber(result.percentage_score, 0);
    let recommendation = result.recommendation || 'N/A';

    // For National Service, calculate from sub-categories if missing
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
    // GENERATE RECOMMENDATIONS FOR STRATAVAX
    // ============================================================
    let strengths = [];
    let weaknesses = [];
    let recommendations = [];

    if (!isNationalService) {
      categoryScores.forEach(cat => {
        const percentage = safeNumber(cat.percentage || cat.score || 0);
        const name = cat.category || cat.name || 'Unknown';
        
        if (percentage >= 75) {
          strengths.push({
            category: name,
            name: name,
            percentage: percentage,
            score: safeNumber(cat.earned || cat.score || 0),
            maxScore: safeNumber(cat.max || cat.maxScore || 100)
          });
        } else if (percentage < 65) {
          weaknesses.push({
            category: name,
            name: name,
            percentage: percentage,
            score: safeNumber(cat.earned || cat.score || 0),
            maxScore: safeNumber(cat.max || cat.maxScore || 100)
          });
        }
      });

      strengths.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      weaknesses.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

      recommendations = generateRecommendations(categoryScores, overallScore);
    }

    // ============================================================
    // BUILD REPORT
    // ============================================================
    let report = {};

    if (isNationalService) {
      // ============================================================
      // FIX: Get suggested placement
      // ============================================================
      const suggestedPlacement = getSuggestedPlacement(workplaceReadiness, intellectualCapability);

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
        // ============================================================
        // ADD SUGGESTED PLACEMENT
        // ============================================================
        suggestedPlacement: suggestedPlacement,
        reportType: 'national_service'
      };
    } else {
      // STRATAVAX REPORT - with recommendations
      report = {
        candidateInfo: {
          fullName: candidateProfile?.full_name || 'Candidate',
          email: candidateProfile?.email || '',
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
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
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
        categoryScores: categoryScores,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations
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
      recommendation: recommendation,
      recommendations: recommendations,
      // ============================================================
      // INCLUDE SUGGESTED PLACEMENT IN TOP-LEVEL RESPONSE
      // ============================================================
      suggestedPlacement: report.suggestedPlacement || []
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
