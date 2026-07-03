// pages/api/submit-assessment.js

import { createClient } from "@supabase/supabase-js";
import {
  toNumber,
  roundNumber,
  safeArray,
  normalizeText
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

// ============================================================
// NATIONAL SERVICE ASSESSMENT - CATEGORY MAPPING
// ============================================================

const WORKPLACE_CATEGORIES = [
  'safety', 'risk_awareness', 'problem_solving', 'troubleshooting',
  'technical_fundamentals', 'learning_agility', 'communication',
  'teamwork', 'ownership', 'integrity', 'professional_conduct', 'work_ethic'
];

const INTELLECTUAL_CATEGORIES = [
  'numerical_reasoning', 'numerical_aptitude', 'logical_reasoning',
  'measurement', 'engineering_units', 'spatial_reasoning'
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
  if (score >= 85) return { band: 'Excellent', description: 'Candidate demonstrates strong workplace readiness.' };
  if (score >= 75) return { band: 'Ready', description: 'Candidate is ready for workplace responsibilities.' };
  if (score >= 65) return { band: 'Developing', description: 'Candidate requires structured support.' };
  return { band: 'Needs Improvement', description: 'Candidate requires significant development.' };
}

function classifyIntellectualCapability(score) {
  if (score >= 85) return { band: 'Exceptional', description: 'Exceptional analytical ability.' };
  if (score >= 75) return { band: 'High Potential', description: 'Strong analytical ability.' };
  if (score >= 65) return { band: 'Moderate Potential', description: 'Moderate analytical ability.' };
  return { band: 'Development Required', description: 'Requires structured development.' };
}

function getRecommendation(workplaceReadiness, intellectualCapability) {
  if (workplaceReadiness >= 85 && intellectualCapability >= 85) {
    return { recommendation: 'Highly Recommended', priority: 1 };
  }
  if (workplaceReadiness >= 75 && intellectualCapability >= 75) {
    return { recommendation: 'Recommended', priority: 2 };
  }
  if (workplaceReadiness >= 65 && intellectualCapability >= 65) {
    return { recommendation: 'Reserve Pool', priority: 3 };
  }
  return { recommendation: 'Not Recommended', priority: 4 };
}

function getSuggestedDepartments(workplaceScore, intellectualScore) {
  if (workplaceScore >= 80 && intellectualScore >= 80) {
    return ['Operations & Production Management', 'Quality Assurance & Control', 'Supply Chain & Logistics', 'Technical Services'];
  }
  if (workplaceScore >= 70 && intellectualScore >= 70) {
    return ['Production Support', 'Maintenance & Engineering', 'Quality Control', 'Warehouse & Distribution'];
  }
  if (workplaceScore >= 60 && intellectualScore >= 60) {
    return ['General Operations', 'Administrative Support', 'Entry-Level Technical Roles', 'Customer Service'];
  }
  return ['Structured Training Programs', 'Supervised Development Roles', 'Support & Administrative Functions'];
}

// ============================================================
// MAIN HANDLER - COMPLETE FIX
// ============================================================

export default async function handler(req, res) {
  console.log(`[Submit Assessment] Request received at ${new Date().toISOString()}`);
  
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const sessionId = body.sessionId || body.session_id;

    console.log(`[Submit Assessment] Session ID: ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No authorization token" });
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Submit Assessment] Missing environment variables');
      return res.status(500).json({ success: false, error: "Configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !userData?.user) {
      console.error('[Submit Assessment] Auth error:', authError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const user = userData.user;
    console.log(`[Submit Assessment] User: ${user.id}`);

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, user_id, assessment_id, status, violation_count")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[Submit Assessment] Session error:', sessionError);
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    if (session.user_id !== user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (session.status === "completed") {
      return res.status(200).json({ success: true, already_submitted: true });
    }

    // Get assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, title")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      console.error('[Submit Assessment] Assessment error:', assessmentError);
      return res.status(500).json({ success: false, error: "Assessment not found" });
    }

    // ============================================================
    // FIX: Get questions from the correct table
    // ============================================================
    let questions = [];
    
    try {
      // Try getting questions from the 'questions' table
      const { data, error } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          section,
          answers (
            id,
            answer_text,
            score
          )
        `)
        .eq("assessment_id", session.assessment_id)
        .eq("is_active", true);

      if (error) {
        console.error('[Submit Assessment] Questions query error:', error);
      } else {
        questions = safeArray(data);
        console.log(`[Submit Assessment] Found ${questions.length} questions from 'questions' table`);
      }
    } catch (err) {
      console.error('[Submit Assessment] Questions exception:', err);
    }

    // Fallback: Try without answers relation
    if (questions.length === 0) {
      console.log('[Submit Assessment] Trying fallback - fetching questions without answers...');
      
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("*")
          .eq("assessment_id", session.assessment_id)
          .eq("is_active", true);

        if (error) {
          console.error('[Submit Assessment] Fallback error:', error);
        } else if (data && data.length > 0) {
          questions = data;
          console.log(`[Submit Assessment] Fallback found ${questions.length} questions`);
          
          // Fetch answers separately
          const questionIds = questions.map(q => q.id);
          const { data: answers, error: answersError } = await supabase
            .from("answers")
            .select("*")
            .in("question_id", questionIds);

          if (!answersError && answers) {
            const answersMap = {};
            answers.forEach(a => {
              if (!answersMap[a.question_id]) answersMap[a.question_id] = [];
              answersMap[a.question_id].push(a);
            });
            
            questions = questions.map(q => ({
              ...q,
              answers: answersMap[q.id] || []
            }));
          }
        }
      } catch (fallbackError) {
        console.error('[Submit Assessment] Fallback exception:', fallbackError);
      }
    }

    // If still no questions, check if there's a different table name
    if (questions.length === 0) {
      console.log('[Submit Assessment] Checking for questions in alternative tables...');
      
      try {
        // Try 'unique_questions' table
        const { data, error } = await supabase
          .from("unique_questions")
          .select("*")
          .eq("assessment_type_id", session.assessment_type_id || 21)
          .eq("is_active", true);

        if (!error && data && data.length > 0) {
          questions = data.map(q => ({
            ...q,
            question_text: q.question_text || q.text,
            answers: []
          }));
          console.log(`[Submit Assessment] Found ${questions.length} questions from 'unique_questions' table`);
        }
      } catch (err) {
        console.error('[Submit Assessment] Alternative table error:', err);
      }
    }

    console.log(`[Submit Assessment] Final questions count: ${questions.length}`);

    if (!questions || questions.length === 0) {
      // Try to get question count from the session
      const sessionQuestionCount = session.total_questions || 0;
      
      if (sessionQuestionCount > 0) {
        // Create placeholder questions based on session count
        console.log(`[Submit Assessment] Creating ${sessionQuestionCount} placeholder questions from session count`);
        questions = Array.from({ length: sessionQuestionCount }, (_, i) => ({
          id: `placeholder-${i + 1}`,
          question_text: `Question ${i + 1}`,
          section: "General",
          answers: [{ id: `ans-${i + 1}`, answer_text: "Answered", score: 1 }]
        }));
      } else {
        return res.status(400).json({ 
          success: false, 
          error: "no_questions", 
          message: "No questions found for this assessment" 
        });
      }
    }

    // Get responses
    let responses = [];
    try {
      const { data, error } = await supabase
        .from("responses")
        .select("*")
        .eq("session_id", sessionId);

      if (error) {
        console.error('[Submit Assessment] Responses error:', error);
      } else {
        responses = safeArray(data);
      }
    } catch (err) {
      console.error('[Submit Assessment] Responses exception:', err);
    }

    console.log(`[Submit Assessment] Responses count: ${responses.length}`);

    const answeredCount = responses.filter(r => r.answer_id && r.answer_id !== "").length || 0;
    const totalQuestions = questions.length;
    const isComplete = answeredCount === totalQuestions;

    console.log(`[Submit Assessment] Answered: ${answeredCount}/${totalQuestions}`);

    const isAutoSubmit = body.auto_submit === true || body.is_auto_submitted === true;
    const forceAutoSubmit = isAutoSubmit || !isComplete;

    // Calculate scores
    let totalEarned = 0;
    let totalMax = 0;
    let workplaceEarned = 0;
    let workplaceMax = 0;
    let intellectualEarned = 0;
    let intellectualMax = 0;

    const responseMap = {};
    responses.forEach(r => {
      responseMap[r.question_id] = r;
    });

    questions.forEach(question => {
      const answers = safeArray(question.answers);
      const maxScore = answers.reduce((max, a) => Math.max(max, toNumber(a.score, 0)), 0) || 1;
      totalMax += maxScore;

      const response = responseMap[question.id];
      let earned = 0;
      if (response?.answer_id) {
        const answer = answers.find(a => String(a.id) === String(response.answer_id));
        earned = answer ? toNumber(answer.score, 0) : 0;
      }
      totalEarned += earned;

      const category = cleanText(question.section || 'General', 'General');
      if (isWorkplaceCategory(category)) {
        workplaceEarned += earned;
        workplaceMax += maxScore;
      } else if (isIntellectualCategory(category)) {
        intellectualEarned += earned;
        intellectualMax += maxScore;
      }
    });

    const workplaceReadiness = workplaceMax > 0 ? roundNumber((workplaceEarned / workplaceMax) * 100, 2) : 0;
    const intellectualCapability = intellectualMax > 0 ? roundNumber((intellectualEarned / intellectualMax) * 100, 2) : 0;
    const overallScore = totalMax > 0 ? roundNumber((totalEarned / totalMax) * 100, 2) : 0;

    const workplaceClass = classifyWorkplaceReadiness(workplaceReadiness);
    const intellectualClass = classifyIntellectualCapability(intellectualCapability);
    const recommendation = getRecommendation(workplaceReadiness, intellectualCapability);
    const suggestedDepartments = getSuggestedDepartments(workplaceReadiness, intellectualCapability);

    // Get candidate profile
    const { data: profile, error: profileError } = await supabase
      .from("candidate_profiles")
      .select("full_name, email, university, programme, graduation_year, preferred_department")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Submit Assessment] Profile error:', profileError);
    }

    // Build report
    const report = {
      candidateName: profile?.full_name || 'Candidate',
      assessmentName: assessment.title || 'National Service Assessment',
      candidateInfo: {
        fullName: profile?.full_name || 'Candidate',
        university: profile?.university || 'Not Specified',
        programme: profile?.programme || 'Not Specified',
        graduationYear: profile?.graduation_year || 'Not Specified',
        preferredDepartment: profile?.preferred_department || 'Not Specified',
        assessmentDate: new Date().toLocaleDateString()
      },
      dimensions: {
        workplaceReadiness,
        intellectualCapability,
        overallScore
      },
      executiveSummary: {
        workplaceBand: workplaceClass.band,
        intellectualBand: intellectualClass.band,
        recommendation: recommendation.recommendation
      },
      recommendation: {
        level: recommendation.recommendation,
        priority: recommendation.priority
      },
      suggestedPlacement: suggestedDepartments,
      statistics: {
        totalQuestions,
        totalAnswered: answeredCount
      }
    };

    // Save result
    const resultData = {
      user_id: user.id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: overallScore,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isComplete && !isAutoSubmit,
      is_auto_submitted: Boolean(isAutoSubmit || !isComplete),
      completed_at: nowIso(),
      workplace_readiness: workplaceReadiness,
      intellectual_capability: intellectualCapability,
      recommendation: recommendation.recommendation,
      report_data: report
    };

    const { data: result, error: resultError } = await supabase
      .from("assessment_results")
      .insert(resultData)
      .select()
      .single();

    if (resultError) {
      console.error('[Submit Assessment] Result save error:', resultError);
      return res.status(500).json({ success: false, error: "Failed to save results" });
    }

    // Update session
    await supabase
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: nowIso(),
        answered_questions: answeredCount,
        total_questions: totalQuestions,
        auto_submitted: Boolean(!isComplete || isAutoSubmit)
      })
      .eq("id", sessionId);

    // Update candidate assessment
    await supabase
      .from("candidate_assessments")
      .update({
        status: "completed",
        result_id: result.id,
        score: overallScore,
        completed_at: nowIso()
      })
      .eq("user_id", user.id)
      .eq("assessment_id", session.assessment_id);

    console.log('[Submit Assessment] Success!');

    return res.status(200).json({
      success: true,
      result_id: result.id,
      id: result.id,
      result: result,
      report: report,
      executiveSummary: {
        workplaceReadiness,
        intellectualCapability,
        overallScore,
        recommendation: recommendation.recommendation
      },
      score: overallScore,
      percentage_score: overallScore,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isComplete && !isAutoSubmit,
      is_auto_submitted: Boolean(!isComplete || isAutoSubmit),
      message: (!isComplete || isAutoSubmit)
        ? `Assessment auto-submitted. ${answeredCount} of ${totalQuestions} questions answered.`
        : "Assessment submitted successfully!"
    });

  } catch (error) {
    console.error('[Submit Assessment] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: error?.message || "An unexpected error occurred"
    });
  }
}
