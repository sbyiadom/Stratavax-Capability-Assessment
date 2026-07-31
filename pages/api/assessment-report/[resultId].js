// pages/api/assessment-report/[resultId].js - COMPLETE WITH PROCTORING DATA

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

function splitCategoryScores(categoryScores) {
  const workplace = [];
  const intellectual = [];

  const workplaceCategoryNames = [
    'Communication & Teamwork',
    'Ownership & Integrity',
    'Safety & Risk Awareness',
    'Technical Fundamentals',
    'Workplace Ethics',
    'Professional Conduct',
    'Work Ethic',
    'Workplace Readiness'
  ];

  const intellectualCategoryNames = [
    'Learning Agility',
    'Problem Solving & Troubleshooting',
    'Logical Reasoning',
    'Numerical Reasoning',
    'Measurement & Engineering Units',
    'Problem Solving',
    'Critical Thinking',
    'Analytical Skills',
    'Intellectual Capability'
  ];

  safeArray(categoryScores).forEach(cat => {
    const name = cat.category || cat.name || 'Unknown';
    const trimmedName = name.trim();
    
    const isWorkplace = workplaceCategoryNames.some(catName => 
      trimmedName === catName || trimmedName.toLowerCase() === catName.toLowerCase()
    );
    
    const isIntellectual = intellectualCategoryNames.some(catName => 
      trimmedName === catName || trimmedName.toLowerCase() === catName.toLowerCase()
    );
    
    if (isWorkplace) {
      workplace.push({
        category: name,
        name: name,
        percentage: safeNumber(cat.percentage || cat.score || 0),
        score: safeNumber(cat.earned || cat.score || 0),
        maxScore: safeNumber(cat.max || cat.maxScore || 100)
      });
      return;
    }
    
    if (isIntellectual) {
      intellectual.push({
        category: name,
        name: name,
        percentage: safeNumber(cat.percentage || cat.score || 0),
        score: safeNumber(cat.earned || cat.score || 0),
        maxScore: safeNumber(cat.max || cat.maxScore || 100)
      });
      return;
    }
    
    const lowerName = trimmedName.toLowerCase();
    const workplaceKeywords = [
      'safety', 'risk', 'technical', 'communication', 'teamwork',
      'ownership', 'integrity', 'workplace', 'ethics', 'professional',
      'conduct', 'collaboration', 'work ethic', 'attitude', 'readiness'
    ];
    
    const intellectualKeywords = [
      'learning agility', 'problem solving', 'troubleshooting',
      'logical reasoning', 'numerical reasoning',
      'measurement', 'engineering units', 'engineering',
      'critical', 'analytical', 'cognitive', 'intellectual'
    ];
    
    const hasWorkplaceKeyword = workplaceKeywords.some(keyword => lowerName.includes(keyword));
    const hasIntellectualKeyword = intellectualKeywords.some(keyword => lowerName.includes(keyword));
    
    if (hasWorkplaceKeyword && !hasIntellectualKeyword) {
      workplace.push({
        category: name,
        name: name,
        percentage: safeNumber(cat.percentage || cat.score || 0),
        score: safeNumber(cat.earned || cat.score || 0),
        maxScore: safeNumber(cat.max || cat.maxScore || 100)
      });
    } else if (hasIntellectualKeyword && !hasWorkplaceKeyword) {
      intellectual.push({
        category: name,
        name: name,
        percentage: safeNumber(cat.percentage || cat.score || 0),
        score: safeNumber(cat.earned || cat.score || 0),
        maxScore: safeNumber(cat.max || cat.maxScore || 100)
      });
    } else {
      if (lowerName.includes('work') || lowerName.includes('team') || lowerName.includes('communicat')) {
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
// GET SUGGESTED PLACEMENT
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

    if (isNationalService) {
      if (workplaceReadiness === 0 && workplaceSubCategories.length > 0) {
        const total = workplaceSubCategories.reduce((sum, cat) => sum + safeNumber(cat.percentage, 0), 0);
        workplaceReadiness = Math.round(total / workplaceSubCategories.length);
      }

      if (intellectualCapability === 0 && intellectualSubCategories.length > 0) {
        const total = intellectualSubCategories.reduce((sum, cat) => sum + safeNumber(cat.percentage, 0), 0);
        intellectualCapability = Math.round(total / intellectualSubCategories.length);
      }

      if (overallScore === 0 && (workplaceReadiness > 0 || intellectualCapability > 0)) {
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
    // EXTRACT PROCTORING DATA (EXTERNAL URLS)
    // ============================================================
    let externalUrls = [];
    let domainVisits = {};
    let proctoringSummary = {};
    let violations = [];
    let tabSwitches = [];

    // Get from proctoring_data
    if (result.proctoring_data) {
      const proctoringData = typeof result.proctoring_data === 'string' 
        ? JSON.parse(result.proctoring_data) 
        : result.proctoring_data;
      
      externalUrls = proctoringData.externalUrls || [];
      domainVisits = proctoringData.domainVisits || {};
      proctoringSummary = proctoringData.summary || {};
      violations = proctoringData.violations || [];
      tabSwitches = proctoringData.tabSwitches || [];
    }

    // Also check flattened columns
    if (result.external_urls_visited && Array.isArray(result.external_urls_visited)) {
      if (result.external_urls_visited.length > externalUrls.length) {
        externalUrls = result.external_urls_visited;
      }
    }

    if (result.domain_visits && typeof result.domain_visits === 'object') {
      domainVisits = { ...domainVisits, ...result.domain_visits };
    }

    if (result.violations && Array.isArray(result.violations)) {
      violations = result.violations;
    }

    if (result.tab_switch_details && Array.isArray(result.tab_switch_details)) {
      tabSwitches = result.tab_switch_details;
    }

    // Categorize external URLs
    const categoryStats = {};
    externalUrls.forEach(url => {
      const category = url.category || 'other';
      if (!categoryStats[category]) {
        categoryStats[category] = 0;
      }
      categoryStats[category]++;
    });

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
        suggestedPlacement: suggestedPlacement,
        reportType: 'national_service',
        // ============================================================
        // PROCTORING DATA
        // ============================================================
        proctoring: {
          externalUrls: externalUrls,
          domainVisits: domainVisits,
          categoryStats: categoryStats,
          summary: proctoringSummary,
          violations: violations,
          tabSwitches: tabSwitches,
          riskLevel: result.risk_level || result.riskLevel || 'Low',
          riskScore: result.risk_score || 0,
          totalViolations: violations.length || 0,
          totalTabSwitches: tabSwitches.length || 0,
          totalExternalUrls: externalUrls.length || 0,
          uniqueDomains: [...new Set(externalUrls.map(u => u.domain))].length || 0
        }
      };
    } else {
      // STRATAVAX REPORT
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
        answered_questions: result.answered_questions || 0,
        // ============================================================
        // PROCTORING DATA
        // ============================================================
        proctoring: {
          externalUrls: externalUrls,
          domainVisits: domainVisits,
          categoryStats: categoryStats,
          summary: proctoringSummary,
          violations: violations,
          tabSwitches: tabSwitches,
          riskLevel: result.risk_level || result.riskLevel || 'Low',
          riskScore: result.risk_score || 0,
          totalViolations: violations.length || 0,
          totalTabSwitches: tabSwitches.length || 0,
          totalExternalUrls: externalUrls.length || 0,
          uniqueDomains: [...new Set(externalUrls.map(u => u.domain))].length || 0
        }
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
        recommendations: recommendations,
        externalUrls: externalUrls,
        domainVisits: domainVisits,
        proctoringSummary: proctoringSummary,
        violations: violations,
        tabSwitches: tabSwitches
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
      suggestedPlacement: report.suggestedPlacement || [],
      // Proctoring data in response
      proctoring: {
        externalUrls: externalUrls,
        domainVisits: domainVisits,
        categoryStats: categoryStats,
        riskLevel: result.risk_level || result.riskLevel || 'Low',
        riskScore: result.risk_score || 0,
        totalViolations: violations.length || 0,
        totalTabSwitches: tabSwitches.length || 0,
        totalExternalUrls: externalUrls.length || 0
      }
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
