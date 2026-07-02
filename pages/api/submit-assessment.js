// pages/api/submit-assessment.js

import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  normalizeText,
  parseSelectedAnswerIds,
  isBaselineAssessmentType
} from "../../utils/scoring";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "5mb"
    }
  }
};

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, fallback = "") {
  return normalizeText(value, fallback);
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

// ============================================================
// NATIONAL SERVICE ASSESSMENT - CATEGORY MAPPING
// ============================================================

const WORKPLACE_CATEGORIES = [
  'safety_risk_awareness',
  'safety',
  'risk_awareness',
  'problem_solving',
  'troubleshooting',
  'technical_fundamentals',
  'learning_agility',
  'communication',
  'teamwork',
  'ownership',
  'integrity',
  'professional_conduct',
  'work_ethic'
];

const INTELLECTUAL_CATEGORIES = [
  'numerical_reasoning',
  'numerical_aptitude',
  'logical_reasoning',
  'measurement',
  'engineering_units',
  'spatial_reasoning'
];

function isWorkplaceCategory(category) {
  const normalized = cleanText(category, '').toLowerCase().replace(/\s+/g, '_');
  return WORKPLACE_CATEGORIES.some(key => normalized.includes(key));
}

function isIntellectualCategory(category) {
  const normalized = cleanText(category, '').toLowerCase().replace(/\s+/g, '_');
  return INTELLECTUAL_CATEGORIES.some(key => normalized.includes(key));
}

function classifyWorkplaceReadiness(score) {
  if (score >= 85) return { 
    band: 'Excellent', 
    description: 'Candidate demonstrates strong workplace readiness and can perform effectively with minimal supervision.' 
  };
  if (score >= 75) return { 
    band: 'Ready', 
    description: 'Candidate is ready for workplace responsibilities with standard supervision and guidance.' 
  };
  if (score >= 65) return { 
    band: 'Developing', 
    description: 'Candidate is developing workplace readiness and requires structured support and coaching.' 
  };
  return { 
    band: 'Needs Improvement', 
    description: 'Candidate requires significant development and close supervision in workplace competencies.' 
  };
}

function classifyIntellectualCapability(score) {
  if (score >= 85) return { 
    band: 'Exceptional', 
    description: 'Candidate demonstrates exceptional analytical ability and strong learning potential.' 
  };
  if (score >= 75) return { 
    band: 'High Potential', 
    description: 'Candidate shows strong analytical ability and good learning potential.' 
  };
  if (score >= 65) return { 
    band: 'Moderate Potential', 
    description: 'Candidate demonstrates moderate analytical ability with room for development.' 
  };
  return { 
    band: 'Development Required', 
    description: 'Candidate requires structured development in analytical and reasoning skills.' 
  };
}

function getRecommendation(workplaceReadiness, intellectualCapability) {
  if (workplaceReadiness >= 85 && intellectualCapability >= 85) {
    return {
      recommendation: 'Highly Recommended',
      description: 'This candidate demonstrates exceptional workplace readiness and intellectual capability. They are strongly recommended for National Service roles.',
      priority: 1
    };
  }
  if (workplaceReadiness >= 75 && intellectualCapability >= 75) {
    return {
      recommendation: 'Recommended',
      description: 'This candidate demonstrates strong workplace readiness and intellectual capability. They are recommended for National Service roles.',
      priority: 2
    };
  }
  if (workplaceReadiness >= 65 && intellectualCapability >= 65) {
    return {
      recommendation: 'Reserve Pool',
      description: 'This candidate demonstrates adequate workplace readiness and intellectual capability. They may be considered for the reserve pool.',
      priority: 3
    };
  }
  return {
    recommendation: 'Not Recommended',
    description: 'This candidate does not currently meet the required thresholds for National Service roles. Additional development is recommended.',
    priority: 4
  };
}

function getSuggestedDepartments(workplaceScore, intellectualScore) {
  const suggestions = [];
  
  if (workplaceScore >= 80 && intellectualScore >= 80) {
    suggestions.push('Operations & Production Management');
    suggestions.push('Quality Assurance & Control');
    suggestions.push('Supply Chain & Logistics');
    suggestions.push('Technical Services');
  } else if (workplaceScore >= 70 && intellectualScore >= 70) {
    suggestions.push('Production Support');
    suggestions.push('Maintenance & Engineering');
    suggestions.push('Quality Control');
    suggestions.push('Warehouse & Distribution');
  } else if (workplaceScore >= 60 && intellectualScore >= 60) {
    suggestions.push('General Operations');
    suggestions.push('Administrative Support');
    suggestions.push('Entry-Level Technical Roles');
    suggestions.push('Customer Service');
  } else {
    suggestions.push('Structured Training Programs');
    suggestions.push('Supervised Development Roles');
    suggestions.push('Support & Administrative Functions');
  }
  
  return suggestions;
}

// ============================================================
// SCORE CALCULATION FUNCTIONS
// ============================================================

function calculateCategoryScores(questions, responses) {
  const categoryScores = {};
  const categoryMaxScores = {};
  const categoryQuestionCounts = {};

  questions.forEach(question => {
    const category = cleanText(question.section || 'General', 'General');
    const maxScore = safeArray(question.answers).reduce((max, a) => Math.max(max, toNumber(a.score, 0)), 0) || 1;

    if (!categoryScores[category]) {
      categoryScores[category] = 0;
      categoryMaxScores[category] = 0;
      categoryQuestionCounts[category] = 0;
    }

    categoryMaxScores[category] += maxScore;
    categoryQuestionCounts[category] += 1;

    const response = responses.find(r => String(r.question_id) === String(question.id));
    if (response && response.answer_id) {
      const answer = safeArray(question.answers).find(a => String(a.id) === String(response.answer_id));
      if (answer) {
        categoryScores[category] += toNumber(answer.score, 0);
      }
    }
  });

  return {
    scores: categoryScores,
    maxScores: categoryMaxScores,
    questionCounts: categoryQuestionCounts
  };
}

function calculateExecutiveDimensions(categoryScores, categoryMaxScores) {
  let workplaceEarned = 0;
  let workplaceMax = 0;
  let intellectualEarned = 0;
  let intellectualMax = 0;
  let totalEarned = 0;
  let totalMax = 0;

  Object.keys(categoryScores).forEach(category => {
    const earned = categoryScores[category];
    const max = categoryMaxScores[category];
    
    totalEarned += earned;
    totalMax += max;

    if (isWorkplaceCategory(category)) {
      workplaceEarned += earned;
      workplaceMax += max;
    } else if (isIntellectualCategory(category)) {
      intellectualEarned += earned;
      intellectualMax += max;
    }
  });

  const workplaceReadiness = workplaceMax > 0 ? (workplaceEarned / workplaceMax) * 100 : 0;
  const intellectualCapability = intellectualMax > 0 ? (intellectualEarned / intellectualMax) * 100 : 0;
  const overallScore = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return {
    workplaceReadiness: roundNumber(workplaceReadiness, 2),
    intellectualCapability: roundNumber(intellectualCapability, 2),
    overallScore: roundNumber(overallScore, 2),
    breakdown: {
      workplaceEarned: roundNumber(workplaceEarned, 2),
      workplaceMax: roundNumber(workplaceMax, 2),
      intellectualEarned: roundNumber(intellectualEarned, 2),
      intellectualMax: roundNumber(intellectualMax, 2)
    }
  };
}

function buildNationalServiceReport(candidateProfile, assessment, responses, questions, session) {
  const candidateName = cleanText(
    candidateProfile?.full_name || candidateProfile?.name || candidateProfile?.email,
    'Candidate'
  );

  // Get candidate info from profile
  const candidateInfo = {
    fullName: candidateProfile?.full_name || candidateName,
    university: candidateProfile?.university || 'Not Specified',
    programme: candidateProfile?.programme || 'Not Specified',
    graduationYear: candidateProfile?.graduation_year || 'Not Specified',
    preferredDepartment: candidateProfile?.preferred_department || 'Not Specified',
    assessmentDate: new Date().toLocaleDateString()
  };

  // Calculate category scores
  const { scores, maxScores, questionCounts } = calculateCategoryScores(questions, responses);
  
  // Calculate executive dimensions
  const dimensions = calculateExecutiveDimensions(scores, maxScores);

  // Build category breakdown with dimension labels
  const categoryBreakdown = Object.keys(scores).map(category => {
    const earned = scores[category];
    const max = maxScores[category];
    const percentage = max > 0 ? (earned / max) * 100 : 0;
    const dimension = isWorkplaceCategory(category) ? 'workplace' : 
                     isIntellectualCategory(category) ? 'intellectual' : 'other';

    return {
      category,
      earned: roundNumber(earned, 2),
      max: roundNumber(max, 2),
      percentage: roundNumber(percentage, 2),
      dimension,
      questionCount: questionCounts[category] || 0
    };
  });

  // Get classifications
  const workplaceClassification = classifyWorkplaceReadiness(dimensions.workplaceReadiness);
  const intellectualClassification = classifyIntellectualCapability(dimensions.intellectualCapability);
  const recommendation = getRecommendation(dimensions.workplaceReadiness, dimensions.intellectualCapability);

  // Get suggested placement based on scores
  const suggestedPlacement = getSuggestedDepartments(
    dimensions.workplaceReadiness, 
    dimensions.intellectualCapability
  );

  // Calculate top strengths (top 3 scoring categories)
  const topStrengths = [...categoryBreakdown]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  // Calculate development areas (bottom 3 scoring categories)
  const developmentAreas = [...categoryBreakdown]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  return {
    candidateName,
    assessmentName: assessment?.title || 'National Service Recruitment Assessment',
    assessmentId: assessment?.id || null,
    userId: candidateProfile?.id || null,
    completedAt: new Date().toISOString(),
    
    // Candidate Information
    candidateInfo,
    
    // Executive Summary
    executiveSummary: {
      workplaceReadiness: dimensions.workplaceReadiness,
      workplaceBand: workplaceClassification.band,
      workplaceDescription: workplaceClassification.description,
      intellectualCapability: dimensions.intellectualCapability,
      intellectualBand: intellectualClassification.band,
      intellectualDescription: intellectualClassification.description,
      overallScore: dimensions.overallScore,
      recommendation: recommendation.recommendation,
      recommendationDescription: recommendation.description
    },
    
    // Dimensions
    dimensions: {
      workplaceReadiness: dimensions.workplaceReadiness,
      intellectualCapability: dimensions.intellectualCapability,
      overallScore: dimensions.overallScore,
      breakdown: dimensions.breakdown
    },
    
    // Category Breakdown
    categoryBreakdown,
    
    // Top Strengths (Top 3)
    topStrengths,
    
    // Development Areas (Bottom 3)
    developmentAreas,
    
    // Recommendation
    recommendation: {
      level: recommendation.recommendation,
      description: recommendation.description,
      priority: recommendation.priority
    },
    
    // Suggested Placement
    suggestedPlacement,
    
    // Statistics
    statistics: {
      totalQuestions: questions.length,
      totalAnswered: responses.filter(r => r.answer_id && r.answer_id !== "").length,
      totalEarned: dimensions.breakdown.workplaceEarned + dimensions.breakdown.intellectualEarned,
      totalMax: dimensions.breakdown.workplaceMax + dimensions.breakdown.intellectualMax
    },
    
    // Response Details
    responses: responses.map(response => {
      const question = questions.find(q => String(q.id) === String(response.question_id));
      const answer = question ? safeArray(question.answers).find(a => String(a.id) === String(response.answer_id)) : null;
      
      return {
        questionId: response.question_id,
        questionText: question?.question_text || 'N/A',
        category: question?.section || 'General',
        answerId: response.answer_id,
        answerText: answer?.answer_text || 'N/A',
        score: answer?.score || 0,
        maxScore: safeArray(question?.answers).reduce((max, a) => Math.max(max, toNumber(a.score, 0)), 0) || 1,
        timeSpent: response.time_spent_seconds || 0,
        timesChanged: response.times_changed || 0
      };
    })
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const sessionId = body.sessionId || body.session_id;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No authorization token" });
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const serviceClient = getServiceClient();

    const authResponse = await serviceClient.auth.getUser(accessToken);
    const authenticatedUser = authResponse?.data?.user || null;

    if (authResponse.error || !authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "invalid_token",
        message: "Could not validate user session"
      });
    }

    // Get session
    const sessionResponse = await serviceClient
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, assessment_type_id, violation_count, status, copy_paste_count, right_click_count, devtools_count, screenshot_count, time_spent_seconds, started_at, created_at")
      .eq("id", sessionId)
      .single();

    if (sessionResponse.error || !sessionResponse.data) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    const session = sessionResponse.data;

    if (session.user_id !== authenticatedUser.id) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "You cannot submit another user's assessment session"
      });
    }

    // Get assessment
    const assessmentResponse = await serviceClient
      .from("assessments")
      .select("id, assessment_type_id, title, description")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentResponse.error || !assessmentResponse.data) {
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_assessment",
        message: "Assessment not found"
      });
    }

    const assessment = assessmentResponse.data;

    // Get questions with answers
    const questionsResponse = await serviceClient
      .from("questions")
      .select(`
        id,
        question_text,
        section,
        subsection,
        display_order,
        answers (
          id,
          answer_text,
          score,
          display_order
        )
      `)
      .eq("assessment_id", session.assessment_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (questionsResponse.error) {
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_questions",
        message: questionsResponse.error.message
      });
    }

    const questions = safeArray(questionsResponse.data);
    const totalQuestions = questions.length;

    if (totalQuestions <= 0) {
      return res.status(400).json({
        success: false,
        error: "no_questions_found",
        message: "No questions found for this assessment"
      });
    }

    // Get responses
    const responsesResponse = await serviceClient
      .from("responses")
      .select(`
        id,
        question_id,
        answer_id,
        user_id,
        assessment_id,
        session_id,
        time_spent_seconds,
        times_changed,
        initial_answer_id,
        created_at,
        updated_at
      `)
      .eq("session_id", sessionId);

    if (responsesResponse.error) {
      return res.status(500).json({
        success: false,
        error: "failed_to_fetch_responses",
        message: responsesResponse.error.message
      });
    }

    const responses = safeArray(responsesResponse.data);
    const answeredCount = responses.filter(r => r.answer_id && r.answer_id !== "").length;

    // Check if all questions are answered
    const isComplete = answeredCount === totalQuestions;
    const isAutoSubmit = body.auto_submit === true || body.auto_submitted === true || body.is_auto_submitted === true;
    const allowIncomplete = body.allow_incomplete === true || body.allowIncomplete === true || isAutoSubmit;

    if (!allowIncomplete && !isComplete) {
      const unansweredCount = totalQuestions - answeredCount;
      return res.status(400).json({
        success: false,
        error: "incomplete_assessment",
        message: "Please answer all questions before submitting. " + unansweredCount + " question(s) remaining.",
        unanswered_count: unansweredCount,
        total_questions: totalQuestions,
        answered_count: answeredCount
      });
    }

    // Get candidate profile
    const profileResponse = await serviceClient
      .from("candidate_profiles")
      .select("id, full_name, email, created_by, supervisor_id, university, programme, graduation_year, preferred_department")
      .eq("id", session.user_id)
      .maybeSingle();

    const candidateProfile = profileResponse.data || { id: session.user_id, full_name: null, email: null };

    // Build the National Service report
    const report = buildNationalServiceReport(
      candidateProfile,
      assessment,
      responses,
      questions,
      session
    );

    // Prepare result data
    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: report.statistics.totalEarned,
      max_score: report.statistics.totalMax,
      percentage_score: report.dimensions.overallScore,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isComplete && !isAutoSubmit,
      is_auto_submitted: Boolean(isAutoSubmit),
      auto_submit_reason: body.auto_submit_reason || null,
      violation_count: toNumber(session.violation_count, 0),
      completed_at: nowIso(),
      
      // National Service specific fields
      workplace_readiness: report.dimensions.workplaceReadiness,
      intellectual_capability: report.dimensions.intellectualCapability,
      recommendation: report.recommendation.level,
      report_data: report
    };

    // Save results
    const resultResponse = await serviceClient
      .from("assessment_results")
      .insert(resultData)
      .select()
      .single();

    if (resultResponse.error || !resultResponse.data) {
      console.error("Result save error:", resultResponse.error);
      return res.status(500).json({
        success: false,
        error: "failed_to_save_results",
        message: resultResponse.error ? resultResponse.error.message : "Could not save result"
      });
    }

    const result = resultResponse.data;

    // Update session
    await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: nowIso(),
        auto_submitted: Boolean(isAutoSubmit),
        answered_questions: answeredCount,
        total_questions: totalQuestions,
        updated_at: nowIso()
      })
      .eq("id", sessionId);

    // Update candidate assessment
    await serviceClient
      .from("candidate_assessments")
      .update({
        status: "completed",
        result_id: result.id,
        score: report.dimensions.overallScore,
        completed_at: nowIso(),
        updated_at: nowIso()
      })
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id);

    // Return response
    return res.status(200).json({
      success: true,
      result_id: result.id,
      id: result.id,
      result: result,
      
      // Executive Summary
      executiveSummary: {
        workplaceReadiness: report.dimensions.workplaceReadiness,
        intellectualCapability: report.dimensions.intellectualCapability,
        overallScore: report.dimensions.overallScore,
        recommendation: report.recommendation.level,
        recommendationDescription: report.recommendation.description
      },
      
      // Full Report
      report: report,
      
      // Legacy fields for compatibility
      score: report.dimensions.overallScore,
      total_score: report.statistics.totalEarned,
      max_score: report.statistics.totalMax,
      percentage: Math.round(report.dimensions.overallScore),
      percentage_score: report.dimensions.overallScore,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isComplete && !isAutoSubmit,
      isAutoSubmitted: Boolean(isAutoSubmit),
      is_auto_submitted: Boolean(isAutoSubmit),
      
      message: isAutoSubmit
        ? `Assessment auto-submitted. ${answeredCount} of ${totalQuestions} questions answered.`
        : "Assessment submitted successfully!"
    });

  } catch (error) {
    console.error("Fatal submit-assessment error:", error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error?.message || "Submission failed"
    });
  }
}
