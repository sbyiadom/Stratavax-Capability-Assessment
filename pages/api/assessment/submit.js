// pages/api/assessment/submit.js - COMPLETE FIXED VERSION
// Handles assessment submission with correct scoring (1 mark per correct answer)
// Saves category_scores, workplace_readiness, and intellectual_capability

import { createClient } from "@supabase/supabase-js";

// ============================================================
// HELPER: Split categories into Workplace and Intellectual
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

function calculateScoresFromCategories(categoryScores) {
  let workplaceTotal = 0;
  let workplaceCount = 0;
  let intellectualTotal = 0;
  let intellectualCount = 0;

  if (!Array.isArray(categoryScores) || categoryScores.length === 0) {
    return { workplaceReadiness: 0, intellectualCapability: 0 };
  }

  categoryScores.forEach(cat => {
    const name = (cat.category || cat.name || '').toLowerCase();
    const percentage = Number(cat.percentage || cat.score || 0);
    
    const isWorkplace = WORKPLACE_KEYWORDS.some(keyword => name.includes(keyword));
    const isIntellectual = INTELLECTUAL_KEYWORDS.some(keyword => name.includes(keyword));

    if (isWorkplace) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectual) {
      intellectualTotal += percentage;
      intellectualCount++;
    }
  });

  const workplaceReadiness = workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0;
  const intellectualCapability = intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0;

  return { workplaceReadiness, intellectualCapability };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { sessionId, autoSubmitted, autoSubmitReason, allowIncomplete } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Missing sessionId" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // ============================================================
    // STEP 1: Get session details
    // ============================================================
    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // ============================================================
    // STEP 2: Get assessment type to check if National Service
    // ============================================================
    const { data: assessmentType, error: assessmentTypeError } = await serviceClient
      .from("assessment_types")
      .select("code")
      .eq("id", session.assessment_type_id)
      .maybeSingle();

    const isNationalService = assessmentType?.code === 'national_service';

    // ============================================================
    // STEP 3: Get all responses for this session
    // ============================================================
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id")
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("Responses error:", responsesError);
    }

    // ============================================================
    // STEP 4: Get all questions with answers
    // ============================================================
    const { data: questions, error: questionsError } = await serviceClient
      .from("unique_questions")
      .select(`
        id,
        question_text,
        section,
        unique_answers (
          id,
          answer_text,
          score
        )
      `)
      .eq("assessment_type_id", session.assessment_type_id);

    if (questionsError) {
      console.error("Questions error:", questionsError);
    }

    // ============================================================
    // STEP 5: Calculate scores (1 mark per correct answer)
    // ============================================================
    let totalEarned = 0;
    let totalMax = 0;

    // Build a map of responses for quick lookup
    const responseMap = {};
    (responses || []).forEach(r => {
      responseMap[r.question_id] = r.answer_id;
    });

    // Category scores map
    const categoryMap = {};
    const categoryMaxMap = {};

    // Calculate scores for each question - 1 mark per correct answer
    (questions || []).forEach(q => {
      const answers = q.unique_answers || [];
      // Each question is worth 1 mark
      const maxScore = 1;
      totalMax += maxScore;

      // Get section/category name
      const section = q.section || "General";
      
      // Initialize category tracking
      if (!categoryMap[section]) {
        categoryMap[section] = 0;
        categoryMaxMap[section] = 0;
      }
      categoryMaxMap[section] += maxScore;

      const userAnswer = responseMap[q.id];
      if (userAnswer) {
        const selectedAnswer = answers.find(a => String(a.id) === String(userAnswer));
        if (selectedAnswer) {
          // Correct if score > 0, earns 1 mark
          const earned = Number(selectedAnswer.score) > 0 ? 1 : 0;
          totalEarned += earned;
          categoryMap[section] += earned;
        }
      }
    });

    const percentageScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    // ============================================================
    // STEP 6: Build category_scores array
    // ============================================================
    const categoryScores = Object.keys(categoryMap).map(category => {
      const earned = categoryMap[category];
      const max = categoryMaxMap[category] || 1;
      const percentage = Math.round((earned / max) * 100);
      return {
        category: category,
        earned: earned,
        max: max,
        percentage: percentage
      };
    });

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${percentageScore}%`);
    console.log(`[Submit] Categories: ${categoryScores.length}`);

    // ============================================================
    // STEP 7: Calculate workplace and intellectual scores for National Service
    // ============================================================
    let workplaceReadiness = 0;
    let intellectualCapability = 0;

    if (isNationalService && categoryScores.length > 0) {
      const calculated = calculateScoresFromCategories(categoryScores);
      workplaceReadiness = calculated.workplaceReadiness;
      intellectualCapability = calculated.intellectualCapability;
      console.log(`[Submit] Workplace: ${workplaceReadiness}%, Intellectual: ${intellectualCapability}%`);
    }

    // ============================================================
    // STEP 8: Update session status
    // ============================================================
    await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    // ============================================================
    // STEP 9: Update candidate_assessments
    // ============================================================
    await serviceClient
      .from("candidate_assessments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id);

    // ============================================================
    // STEP 10: Create or update assessment result WITH category_scores
    // ============================================================
    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: totalEarned,
      max_score: totalMax,
      percentage_score: percentageScore,
      completed_at: new Date().toISOString(),
      is_valid: true,
      is_auto_submitted: autoSubmitted || false,
      // ============================================================
      // FIX: Save category_scores, workplace_readiness, intellectual_capability
      // ============================================================
      category_scores: categoryScores,
      workplace_readiness: workplaceReadiness,
      intellectual_capability: intellectualCapability,
      // For National Service, calculate recommendation
      recommendation: isNationalService ? 
        (workplaceReadiness >= 85 && intellectualCapability >= 85 ? 'Highly Recommended' :
         workplaceReadiness >= 75 && intellectualCapability >= 75 ? 'Recommended' :
         workplaceReadiness >= 65 && intellectualCapability >= 65 ? 'Reserve Pool' : 'Not Recommended')
        : null,
      report_data: {
        categoryScores: categoryScores,
        totalEarned: totalEarned,
        totalMax: totalMax,
        percentageScore: percentageScore,
        workplaceReadiness: workplaceReadiness,
        intellectualCapability: intellectualCapability,
        recommendation: isNationalService ? 
          (workplaceReadiness >= 85 && intellectualCapability >= 85 ? 'Highly Recommended' :
           workplaceReadiness >= 75 && intellectualCapability >= 75 ? 'Recommended' :
           workplaceReadiness >= 65 && intellectualCapability >= 65 ? 'Reserve Pool' : 'Not Recommended')
          : null,
        completedAt: new Date().toISOString()
      }
    };

    const { data: existingResult, error: resultError } = await serviceClient
      .from("assessment_results")
      .select("id")
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id)
      .maybeSingle();

    let resultId;

    if (resultError || !existingResult) {
      // Create new result
      const { data: newResult, error: createResultError } = await serviceClient
        .from("assessment_results")
        .insert(resultData)
        .select()
        .single();

      if (!createResultError && newResult) {
        resultId = newResult.id;
      } else {
        console.error("Create result error:", createResultError);
      }
    } else {
      // Update existing result
      const { data: updatedResult, error: updateResultError } = await serviceClient
        .from("assessment_results")
        .update(resultData)
        .eq("id", existingResult.id)
        .select()
        .single();

      if (!updateResultError && updatedResult) {
        resultId = updatedResult.id;
      } else {
        console.error("Update result error:", updateResultError);
      }
    }

    // ============================================================
    // STEP 11: Update candidate_assessments with result_id
    // ============================================================
    if (resultId) {
      await serviceClient
        .from("candidate_assessments")
        .update({
          result_id: resultId,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", session.user_id)
        .eq("assessment_id", session.assessment_id);
    }

    return res.status(200).json({
      success: true,
      resultId: resultId,
      sessionId: sessionId,
      score: percentageScore,
      totalEarned: totalEarned,
      totalMax: totalMax,
      categoryScores: categoryScores,
      workplaceReadiness: workplaceReadiness,
      intellectualCapability: intellectualCapability,
      recommendation: resultData.recommendation,
      isNationalService: isNationalService,
      isAutoSubmitted: autoSubmitted || false
    });

  } catch (error) {
    console.error("Error submitting assessment:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
}
