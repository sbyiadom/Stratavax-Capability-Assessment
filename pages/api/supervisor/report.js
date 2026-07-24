// pages/api/supervisor-report.js - WITH BEHAVIORAL MATRIX DATA

import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * CONFIG
 * ============================================================
 * Change ONLY these if your library table/columns differ.
 */
const LIBRARY_TABLE = "competency_library"; // <-- replace if needed
const LIBRARY_NAME_COLUMN = "name";
const LIBRARY_DESCRIPTION_COLUMN = "description";
const LIBRARY_RECOMMENDATION_COLUMN = "recommendation";
const LIBRARY_FOLLOWUP_COLUMN = "follow_up_question";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */
function normalizeParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getClassification(percentage) {
  if (percentage >= 85) return "Exceptional";
  if (percentage >= 75) return "Strong Performer";
  if (percentage >= 65) return "Capable Contributor";
  if (percentage >= 55) return "Developing";
  if (percentage >= 40) return "At Risk";
  return "High Risk";
}

function getRiskLevel(percentage) {
  if (percentage >= 75) return "Low";
  if (percentage >= 55) return "Moderate";
  return "High";
}

function buildCategoryScoreMap(categoryScores) {
  const map = new Map();

  safeArray(categoryScores).forEach((item) => {
    const key = safeText(item?.name || item?.category, "").trim().toLowerCase();
    if (!key) return;
    map.set(key, item);
  });

  return map;
}

function buildLibraryMap(libraryRows) {
  const map = new Map();

  safeArray(libraryRows).forEach((row) => {
    const key = safeText(row?.[LIBRARY_NAME_COLUMN], "").trim().toLowerCase();
    if (!key) return;
    map.set(key, row);
  });

  return map;
}

function buildFollowUpQuestionsFromLibrary(developmentAreas) {
  return safeArray(developmentAreas)
    .filter((item) => safeText(item?.followUpQuestion, "").trim() !== "")
    .map((item) => ({
      category: item.name,
      question: item.followUpQuestion,
      priority: "Medium"
    }));
}

function buildRecommendationsFromLibrary(developmentAreas) {
  return safeArray(developmentAreas)
    .filter((item) => safeText(item?.recommendation, "").trim() !== "")
    .map((item) => ({
      category: item.name,
      title: item.name,
      recommendation: item.recommendation,
      priority: "Medium"
    }));
}

// ============================================================
// Extract sub-categories from report_data
// ============================================================
function extractSubCategories(reportData) {
  const rd = safeObject(reportData);
  let subCategories = [];

  // 1. Try report_data.categoryScores
  if (rd.categoryScores && Array.isArray(rd.categoryScores) && rd.categoryScores.length > 0) {
    subCategories = rd.categoryScores;
    console.log('[API] Found sub-categories in report_data.categoryScores:', subCategories.length);
  }
  // 2. Try report_data.scoreBreakdown
  else if (rd.scoreBreakdown && Array.isArray(rd.scoreBreakdown) && rd.scoreBreakdown.length > 0) {
    subCategories = rd.scoreBreakdown;
    console.log('[API] Found sub-categories in report_data.scoreBreakdown:', subCategories.length);
  }
  // 3. Try report_data._fullReport.categoryScores
  else if (rd._fullReport?.categoryScores) {
    const catScores = rd._fullReport.categoryScores;
    if (typeof catScores === 'object') {
      subCategories = Object.keys(catScores).map(key => ({
        category: key,
        percentage: catScores[key].percentage || 0,
        score: catScores[key].score || catScores[key].totalScore || 0,
        maxScore: catScores[key].maxScore || catScores[key].maxPossible || 100,
        grade: catScores[key].grade || 'N/A'
      }));
      console.log('[API] Found sub-categories in _fullReport.categoryScores:', subCategories.length);
    }
  }

  return subCategories;
}

// ============================================================
// Split sub-categories into Workplace and Intellectual
// ============================================================
function splitSubCategories(subCategories) {
  const workplace = [];
  const intellectual = [];

  const workplaceNames = [
    'Safety & Risk Awareness', 'Safety', 'Risk Awareness',
    'Technical Fundamentals', 'Technical',
    'Communication & Teamwork', 'Communication', 'Teamwork',
    'Ownership & Integrity', 'Ownership', 'Integrity',
    'Workplace Ethics', 'Workplace Readiness'
  ];

  const intellectualNames = [
    'Problem Solving & Troubleshooting', 'Problem Solving', 'Troubleshooting',
    'Logical Reasoning', 'Logic',
    'Numerical Reasoning', 'Numerical',
    'Measurement & Engineering Units', 'Measurement', 'Engineering Units',
    'Learning Agility', 'Agility',
    'Critical Thinking', 'Analytical', 'Decision Making',
    'Intellectual Capability'
  ];

  if (subCategories.length > 0) {
    subCategories.forEach(cat => {
      const name = safeText(cat.category || cat.name || '', '');
      const lowerName = name.toLowerCase();
      
      const isWorkplace = workplaceNames.some(n => lowerName.includes(n.toLowerCase()));
      const isIntellectual = intellectualNames.some(n => lowerName.includes(n.toLowerCase()));

      // Also check for patterns
      const hasWorkplacePattern = lowerName.includes('safety') || 
                                   lowerName.includes('technical') ||
                                   lowerName.includes('communication') ||
                                   lowerName.includes('teamwork') ||
                                   lowerName.includes('ownership') ||
                                   lowerName.includes('integrity') ||
                                   lowerName.includes('workplace') ||
                                   lowerName.includes('ethics');

      const hasIntellectualPattern = lowerName.includes('problem') || 
                                      lowerName.includes('solving') ||
                                      lowerName.includes('reasoning') ||
                                      lowerName.includes('numerical') ||
                                      lowerName.includes('measurement') ||
                                      lowerName.includes('engineering') ||
                                      lowerName.includes('learning') ||
                                      lowerName.includes('agility') ||
                                      lowerName.includes('critical') ||
                                      lowerName.includes('analytical') ||
                                      lowerName.includes('decision');

      if (isWorkplace || hasWorkplacePattern) {
        workplace.push(cat);
      } else if (isIntellectual || hasIntellectualPattern) {
        intellectual.push(cat);
      } else {
        // Default based on category name
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
// Generate behavioral commentary
// ============================================================
function generateBehavioralCommentary(tabSwitches, violations, answerChanges) {
  const comments = [];
  const recommendations = [];

  // Tab Switches
  if (tabSwitches === 0) {
    comments.push('No tab switching detected. Candidate maintained focus on the assessment.');
  } else if (tabSwitches <= 5) {
    comments.push(`Minimal tab switching detected (${tabSwitches} switches). This may indicate occasional distraction.`);
    recommendations.push('Consider discussing focus levels during follow-up interview.');
  } else if (tabSwitches <= 20) {
    comments.push(`Moderate tab switching detected (${tabSwitches} switches). Candidate may have been referencing external materials.`);
    recommendations.push('Review the assessment validity. Consider a follow-up assessment or interview.');
  } else {
    comments.push(`High tab switching detected (${tabSwitches} switches). This suggests significant distraction or potential external reference use.`);
    recommendations.push('Strongly recommend invalidating this assessment or conducting a fresh assessment in a controlled environment.');
  }

  // Violations
  if (violations === 0) {
    comments.push('No rule violations detected. Candidate followed all assessment guidelines.');
  } else if (violations <= 3) {
    comments.push(`Minor violations detected (${violations} violations). These may be accidental or due to unfamiliarity with the assessment interface.`);
    recommendations.push('Review the specific violations. Consider providing clearer instructions for future assessments.');
  } else if (violations <= 10) {
    comments.push(`Moderate violations detected (${violations} violations). Candidate may have attempted to circumvent assessment rules.`);
    recommendations.push('Flag for review. Consider a follow-up interview to discuss the behavior.');
  } else {
    comments.push(`High violations detected (${violations} violations). This indicates significant disregard for assessment rules.`);
    recommendations.push('Immediate review required. Consider invalidating the assessment and requiring a fresh attempt.');
  }

  // Answer Changes
  if (answerChanges === 0) {
    comments.push('No answer changes. Candidate answered confidently without second-guessing.');
  } else if (answerChanges <= 3) {
    comments.push(`Minimal answer changes (${answerChanges} changes). Candidate showed some hesitation on a few questions.`);
  } else if (answerChanges <= 10) {
    comments.push(`Moderate answer changes (${answerChanges} changes). Candidate may have been uncertain about several answers.`);
    recommendations.push('Review the questions where answers were changed. Consider if the questions were ambiguous.');
  } else {
    comments.push(`High answer changes (${answerChanges} changes). Candidate showed significant uncertainty throughout the assessment.`);
    recommendations.push('Review the assessment for potential difficulty issues or candidate comprehension problems.');
  }

  return {
    summary: comments.join(' '),
    detailedComments: comments,
    recommendations: recommendations
  };
}

// ============================================================
// API HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const rawUserId = req.query.user_id || req.query.userId;
  const rawAssessmentId =
    req.query.assessment_id || req.query.assessmentId || req.query.assessment;

  const userId = normalizeParam(rawUserId);
  const assessmentId = normalizeParam(rawAssessmentId);

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing user_id"
    });
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      error:
        "Supabase environment variables are missing. Expected SUPABASE URL and SERVICE ROLE KEY."
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    /**
     * ------------------------------------------------------------
     * 1) Load assessment result
     * ------------------------------------------------------------
     */
    let resultQuery = supabase
      .from("assessment_results")
      .select(`
        id,
        session_id,
        user_id,
        assessment_id,
        total_score,
        max_score,
        category_scores,
        interpretations,
        strengths,
        weaknesses,
        recommendations,
        risk_level,
        readiness,
        completed_at,
        created_at,
        updated_at,
        is_valid,
        validation_note,
        answered_questions,
        auto_submit_reason,
        is_auto_submitted,
        violation_count,
        violation_details,
        total_questions,
        percentage_score,
        workplace_readiness,
        intellectual_capability,
        report_data
      `)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false });

    if (assessmentId) {
      resultQuery = resultQuery.eq("assessment_id", assessmentId);
    }

    const { data: results, error: resultsError } = await resultQuery.limit(1);

    if (resultsError) {
      return res.status(500).json({
        success: false,
        error: resultsError.message
      });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No completed assessments found for this candidate.",
        user_id: userId,
        assessment_id: assessmentId || null
      });
    }

    const record = results[0];
    const reportData = safeObject(record.report_data);

    console.log('[API] Processing report for user:', userId);
    console.log('[API] report_data exists:', !!record.report_data);

    /**
     * ------------------------------------------------------------
     * 2) Load candidate profile
     * ------------------------------------------------------------
     */
    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("id, full_name, email, university, programme")
      .eq("id", record.user_id)
      .maybeSingle();

    if (candidateError) {
      console.error("candidate_profiles query warning:", candidateError);
    }

    /**
     * ------------------------------------------------------------
     * 3) Load assessment
     * ------------------------------------------------------------
     */
    let assessment = null;

    if (record.assessment_id) {
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("id, title, description")
        .eq("id", record.assessment_id)
        .maybeSingle();

      if (assessmentError) {
        console.error("assessments query warning:", assessmentError);
      } else {
        assessment = assessmentData || null;
      }
    }

    /**
     * ------------------------------------------------------------
     * 4) EXTRACT SUB-CATEGORIES FROM report_data
     * ------------------------------------------------------------
     */
    const subCategories = extractSubCategories(record.report_data);
    const { workplace: workplaceSubCategories, intellectual: intellectualSubCategories } = splitSubCategories(subCategories);

    console.log('[API] Sub-categories found:', subCategories.length);

    /**
     * ------------------------------------------------------------
     * 5) Load library rows for relevant categories
     * ------------------------------------------------------------
     */
    const categoryScores = safeArray(record.category_scores);
    const categoryScoreMap = buildCategoryScoreMap(categoryScores);

    const categoryNames = categoryScores
      .map((item) => safeText(item?.name || item?.category, "").trim())
      .filter(Boolean);

    let libraryRows = [];
    if (categoryNames.length > 0) {
      const { data: libraryData, error: libraryError } = await supabase
        .from(LIBRARY_TABLE)
        .select(
          [
            LIBRARY_NAME_COLUMN,
            LIBRARY_DESCRIPTION_COLUMN,
            LIBRARY_RECOMMENDATION_COLUMN,
            LIBRARY_FOLLOWUP_COLUMN
          ].join(", ")
        )
        .in(LIBRARY_NAME_COLUMN, categoryNames);

      if (libraryError) {
        console.error("library query warning:", libraryError);
      } else {
        libraryRows = libraryData || [];
      }
    }

    const libraryMap = buildLibraryMap(libraryRows);

    /**
     * ------------------------------------------------------------
     * 6) Load behavioral matrix data
     * ------------------------------------------------------------
     */
    let behavioralData = null;
    let behavioralMetrics = {
      tabSwitches: 0,
      violations: 0,
      copyAttempts: 0,
      pasteAttempts: 0,
      rightClickAttempts: 0,
      answerChanges: 0,
      totalTimeSeconds: 0,
      averageTimePerQuestion: 0,
      timePerQuestion: [],
      violationTimeline: [],
      flaggedQuestions: [],
      hasBehavioralData: false
    };

    // Try to fetch behavioral matrix if we have a session_id
    if (record.session_id) {
      try {
        console.log('[API] Fetching behavioral data for session:', record.session_id);
        
        const { data: responses, error: responsesError } = await supabase
          .from('responses')
          .select('question_id, time_spent_seconds, times_changed, metadata, created_at')
          .eq('session_id', record.session_id)
          .order('created_at', { ascending: true });

        if (!responsesError && responses && responses.length > 0) {
          console.log('[API] Found responses:', responses.length);
          
          let totalTabSwitches = 0;
          let totalViolations = 0;
          let totalCopyAttempts = 0;
          let totalPasteAttempts = 0;
          let totalRightClicks = 0;
          let totalChanges = 0;
          let totalTime = 0;
          const timePerQuestion = [];
          const violationTimeline = [];
          const flaggedQuestions = [];

          responses.forEach(response => {
            totalChanges += response.times_changed || 0;
            totalTime += response.time_spent_seconds || 0;
            
            const metadata = response.metadata || {};
            const tabSwitches = parseInt(metadata.tab_switches, 10) || 0;
            const violations = parseInt(metadata.violations, 10) || 0;
            const copyAttempts = parseInt(metadata.copy_attempts, 10) || 0;
            const pasteAttempts = parseInt(metadata.paste_attempts, 10) || 0;
            const rightClicks = parseInt(metadata.right_click_attempts, 10) || 0;
            
            totalTabSwitches += tabSwitches;
            totalViolations += violations;
            totalCopyAttempts += copyAttempts;
            totalPasteAttempts += pasteAttempts;
            totalRightClicks += rightClicks;

            // Track timeline
            if (violations > 0 || tabSwitches > 0 || copyAttempts > 0 || pasteAttempts > 0 || rightClicks > 0) {
              violationTimeline.push({
                question_id: response.question_id,
                timestamp: response.created_at,
                tab_switches: tabSwitches,
                violations: violations,
                copy_attempts: copyAttempts,
                paste_attempts: pasteAttempts,
                right_click_attempts: rightClicks
              });
            }

            // Time per question
            const timeOnQuestion = parseInt(metadata.time_on_question, 10) || 0;
            const timeSpent = response.time_spent_seconds || 0;
            if (timeOnQuestion > 0 || timeSpent > 0) {
              const qTime = timeOnQuestion || timeSpent;
              timePerQuestion.push({
                question_id: response.question_id,
                time_seconds: qTime,
                changed: (response.times_changed || 0) > 0,
                violation: (metadata.violations || 0) > 0
              });

              // Flagged questions
              if (qTime > 60 || (response.times_changed || 0) > 0 || (metadata.violations || 0) > 0) {
                flaggedQuestions.push({
                  question_id: response.question_id,
                  time_seconds: qTime,
                  changed: (response.times_changed || 0) > 0,
                  violation: (metadata.violations || 0) > 0,
                  comment: (metadata.violations || 0) > 0 
                    ? 'This question had a violation (tab switch, copy attempt, etc.)' 
                    : (response.times_changed || 0) > 0 
                      ? 'Candidate changed their answer on this question'
                      : 'Candidate spent more than 60 seconds on this question',
                  recommendation: (metadata.violations || 0) > 0 
                    ? 'Review this question for potential compromise' 
                    : 'No action needed'
                });
              }
            }
          });

          const avgTime = timePerQuestion.length > 0 
            ? Math.round(timePerQuestion.reduce((sum, q) => sum + q.time_seconds, 0) / timePerQuestion.length)
            : 0;

          const hasBehavioralData = 
            totalChanges > 0 || 
            totalTabSwitches > 0 || 
            totalViolations > 0 || 
            totalCopyAttempts > 0 || 
            totalPasteAttempts > 0 || 
            totalRightClicks > 0 ||
            timePerQuestion.length > 0;

          // Determine risk level
          let riskLevel = 'Low Risk';
          let riskScore = 0;
          if (totalViolations > 0) riskScore += 2;
          if (totalTabSwitches > 5) riskScore += 1;
          if (totalChanges > 10) riskScore += 1;
          if (avgTime < 5) riskScore += 1;
          if (riskScore >= 4) riskLevel = 'High Risk';
          else if (riskScore >= 2) riskLevel = 'Medium Risk';

          // Generate commentary
          const commentary = generateBehavioralCommentary(totalTabSwitches, totalViolations, totalChanges);

          behavioralMetrics = {
            tabSwitches: totalTabSwitches,
            violations: totalViolations,
            copyAttempts: totalCopyAttempts,
            pasteAttempts: totalPasteAttempts,
            rightClickAttempts: totalRightClicks,
            answerChanges: totalChanges,
            totalTimeSeconds: totalTime,
            averageTimePerQuestion: avgTime,
            timePerQuestion: timePerQuestion,
            violationTimeline: violationTimeline,
            flaggedQuestions: flaggedQuestions,
            hasBehavioralData: hasBehavioralData,
            riskLevel: riskLevel,
            riskScore: riskScore,
            commentary: commentary
          };

          behavioralData = {
            hasBehavioralData: hasBehavioralData,
            metrics: behavioralMetrics,
            riskAssessment: {
              level: riskLevel,
              summary: hasBehavioralData 
                ? `${riskLevel} - ${totalViolations} violations, ${totalTabSwitches} tab switches` 
                : 'No behavioral data available',
              detail: hasBehavioralData 
                ? `Candidate had ${totalViolations} violations and ${totalTabSwitches} tab switches across ${responses.length} questions.`
                : 'No behavioral data was tracked for this assessment.',
              action: hasBehavioralData 
                ? riskLevel === 'High Risk' ? 'Immediate review recommended' : 'Standard review process applies'
                : 'No action required'
            },
            commentary: commentary
          };

          console.log('[API] Behavioral data calculated:');
          console.log('[API] - tabSwitches:', totalTabSwitches);
          console.log('[API] - violations:', totalViolations);
          console.log('[API] - answerChanges:', totalChanges);
          console.log('[API] - hasBehavioralData:', hasBehavioralData);
        } else {
          console.log('[API] No responses found for session:', record.session_id);
        }
      } catch (behavioralError) {
        console.error('[API] Error fetching behavioral data:', behavioralError);
      }
    }

    /**
     * ------------------------------------------------------------
     * 7) Build report payload
     * ------------------------------------------------------------
     */
    const percentage = toNumber(record.percentage_score, 0);
    const totalScore = toNumber(record.total_score, 0);
    const maxScore = toNumber(record.max_score, 100);
    const responseCount = toNumber(record.answered_questions, 0);

    const classification = getClassification(percentage);
    const riskLevel = safeText(record.risk_level, getRiskLevel(percentage));

    const candidateName =
      safeText(candidate?.full_name, "") ||
      safeText(candidate?.email, "") ||
      "Candidate";

    const assessmentName =
      safeText(assessment?.title, "") || "Assessment";

    // DIRECTLY use stored strengths
    const strengths = safeArray(record.strengths).map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          percentage: 0,
          narrative: `${item} is an area of strength for this candidate.`,
          description: `${item} is an area of strength for this candidate.`,
          classification: "Not classified"
        };
      }
      return {
        name: item.name || item.category || "Strength",
        percentage: item.percentage !== undefined ? item.percentage : (item.score || 0),
        narrative: item.narrative || item.description || `${item.name || item.category || "This area"} is a strength.`,
        description: item.narrative || item.description || `${item.name || item.category || "This area"} is a strength.`,
        classification: item.classification || getClassification(item.percentage || item.score || 0),
        ...(item.action && { action: item.action }),
        ...(item.followUpQuestion && { followUpQuestion: item.followUpQuestion })
      };
    });

    // DIRECTLY use stored weaknesses
    const developmentAreas = safeArray(record.weaknesses).map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          percentage: 0,
          narrative: `${item} is an area for development.`,
          description: `${item} is an area for development.`,
          classification: "Not classified"
        };
      }
      return {
        name: item.name || item.category || "Development Area",
        percentage: item.percentage !== undefined ? item.percentage : (item.score || 0),
        narrative: item.narrative || item.description || `${item.name || item.category || "This area"} needs development.`,
        description: item.narrative || item.description || `${item.name || item.category || "This area"} needs development.`,
        classification: item.classification || getClassification(item.percentage || item.score || 0),
        ...(item.action && { action: item.action }),
        ...(item.followUpQuestion && { followUpQuestion: item.followUpQuestion })
      };
    });

    // Build follow-up questions
    let followUpQuestions = [];
    if (record.interpretations && record.interpretations.followUpQuestions) {
      followUpQuestions = safeArray(record.interpretations.followUpQuestions);
    } else if (developmentAreas.length > 0) {
      followUpQuestions = buildFollowUpQuestionsFromLibrary(developmentAreas);
    } else if (categoryScores.length > 0) {
      followUpQuestions = categoryScores
        .filter(item => toNumber(item.percentage, 0) < 75)
        .slice(0, 3)
        .map(item => ({
          category: item.name || item.category,
          question: `Tell me more about your experience with ${item.name || item.category}.`,
          priority: "Medium"
        }));
    }

    // Build recommendations
    let recommendations = safeArray(record.recommendations);
    if (recommendations.length === 0 && developmentAreas.length > 0) {
      recommendations = buildRecommendationsFromLibrary(developmentAreas);
    }
    recommendations = recommendations.map((item) => {
      if (typeof item === "string") {
        return {
          title: "Recommendation",
          category: "",
          recommendation: item,
          priority: "Medium"
        };
      }
      return {
        title: safeText(item?.title, safeText(item?.category, "Recommendation")),
        category: safeText(item?.category, ""),
        recommendation: safeText(
          item?.recommendation || item?.description,
          "No recommendation text available."
        ),
        priority: safeText(item?.priority, "Medium")
      };
    });

    // Build executive summary
    const executiveSummary = record.interpretations?.executiveSummary || 
      `${candidateName} completed the ${assessmentName} assessment with an overall score of ${percentage}%. ${getClassification(percentage)} performance.`;

    // Build supervisor implication
    const supervisorImplication = record.interpretations?.supervisorImplication ||
      (percentage >= 75
        ? "The candidate shows readiness for role responsibilities. Provide normal supervision with targeted feedback to reinforce strengths."
        : "The candidate requires structured development and close supervision before assuming critical responsibilities.");

    // Build role readiness
    const roleReadiness = record.readiness || record.interpretations?.roleReadiness ||
      (percentage >= 75
        ? "Candidate appears ready for role responsibilities."
        : "Candidate requires additional development before assuming critical responsibilities.");

    // ============================================================
    // BUILD THE FINAL REPORT WITH SUB-CATEGORIES AND BEHAVIORAL DATA
    // ============================================================
    const generatedReport = {
      candidateName,
      assessmentName,
      userId: record.user_id,
      assessmentId: record.assessment_id,

      totalScore,
      maxScore,

      percentage,
      overallPercentage: percentage,
      overallScore: percentage,
      score: percentage,

      classification,
      overallClassification: classification,

      riskLevel,

      summary: executiveSummary,
      executiveSummary,
      overallAssessment: executiveSummary,

      supervisorImplication,
      roleReadiness,
      readinessStatement: percentage >= 75 ? "Ready for role" : "Development needed",

      // ============================================================
      // MAIN CATEGORY SCORES
      // ============================================================
      workplace_readiness: record.workplace_readiness || 0,
      intellectual_capability: record.intellectual_capability || 0,
      percentage_score: record.percentage_score || 0,

      // ============================================================
      // SUB-CATEGORIES - THIS IS WHAT THE SUPERVISOR NEEDS TO SEE
      // ============================================================
      workplaceSubCategories: workplaceSubCategories,
      intellectualSubCategories: intellectualSubCategories,

      // Also keep the original category scores for compatibility
      categoryScores: categoryScores.map(item => ({
        ...item,
        percentage: item.percentage !== undefined ? item.percentage : (item.score || 0),
        narrative: item.narrative || getDefaultNarrative(item.name || item.category, item.percentage || item.score || 0)
      })),

      strengths,
      developmentAreas,
      recommendations,
      followUpQuestions,

      // ============================================================
      // BEHAVIORAL DATA - NEW
      // ============================================================
      behavioralData: behavioralData || {
        hasBehavioralData: false,
        metrics: behavioralMetrics,
        riskAssessment: {
          level: 'No Data',
          summary: 'No behavioral data available',
          detail: 'No behavioral data was tracked for this assessment.',
          action: 'No action required'
        },
        commentary: {
          summary: 'No behavioral data available for this assessment.',
          detailedComments: ['No behavioral data was tracked for this assessment.'],
          recommendations: ['No action required.']
        }
      },

      // For backward compatibility
      behavioralMetrics: behavioralMetrics,

      responseCount,
      answered_questions: responseCount,
      completedAt: record.completed_at || null,
      dataSource: "assessment_results"
    };

    return res.status(200).json({
      success: true,
      candidate: candidate || { id: record.user_id },
      assessment: assessment || { id: record.assessment_id, title: "Assessment" },
      generatedReport,
      result: record,
      assessment_id: record.assessment_id,
      // Also return behavioral data at root level for easy access
      behavioralData: behavioralData || {
        hasBehavioralData: false,
        metrics: behavioralMetrics,
        riskAssessment: {
          level: 'No Data',
          summary: 'No behavioral data available',
          detail: 'No behavioral data was tracked for this assessment.',
          action: 'No action required'
        },
        commentary: {
          summary: 'No behavioral data available for this assessment.',
          detailedComments: ['No behavioral data was tracked for this assessment.'],
          recommendations: ['No action required.']
        }
      }
    });
  } catch (error) {
    console.error("Supervisor report fatal error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate report"
    });
  }
}

// Helper function for default narratives
function getDefaultNarrative(category, percentage) {
  const value = toNumber(percentage, 0);
  const categoryName = safeText(category, "This area");
  
  if (value >= 85) return `${categoryName} scored ${value}%, indicating exceptional capability. This is a clear strength that can be leveraged.`;
  if (value >= 75) return `${categoryName} scored ${value}%, indicating strong capability. The candidate performs reliably in this area.`;
  if (value >= 65) return `${categoryName} scored ${value}%, indicating capable performance. Some reinforcement may be beneficial.`;
  if (value >= 55) return `${categoryName} scored ${value}%, indicating developing capability. Structured coaching is recommended.`;
  if (value >= 40) return `${categoryName} scored ${value}%, indicating a priority development area. Targeted support is needed.`;
  return `${categoryName} scored ${value}%, indicating a critical development area. Close supervision and structured practice are required.`;
}
