// pages/api/assessment/submit.js - FIXED with score calculation

import { createClient } from "@supabase/supabase-js";

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
    // STEP 2: Get all responses for this session
    // ============================================================
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id")
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("Responses error:", responsesError);
    }

    // ============================================================
    // STEP 3: Get all questions with correct answers
    // ============================================================
    const { data: questions, error: questionsError } = await serviceClient
      .from("unique_questions")
      .select(`
        id,
        question_text,
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
    // STEP 4: Calculate scores
    // ============================================================
    let totalEarned = 0;
    let totalMax = 0;
    let correctCount = 0;
    let totalQuestions = 0;

    // Build a map of responses for quick lookup
    const responseMap = {};
    (responses || []).forEach(r => {
      responseMap[r.question_id] = r.answer_id;
    });

    // Calculate scores for each question
    (questions || []).forEach(q => {
      const answers = q.unique_answers || [];
      const maxScore = answers.reduce((max, a) => Math.max(max, Number(a.score) || 0), 0);
      totalMax += maxScore;
      totalQuestions++;

      const userAnswer = responseMap[q.id];
      if (userAnswer) {
        // Find the selected answer
        const selectedAnswer = answers.find(a => String(a.id) === String(userAnswer));
        if (selectedAnswer) {
          const earned = Number(selectedAnswer.score) || 0;
          totalEarned += earned;
          if (earned > 0) {
            correctCount++;
          }
        }
      }
    });

    const percentageScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    console.log(`[Submit] Score: ${totalEarned}/${totalMax} = ${percentageScore}%`);

    // ============================================================
    // STEP 5: Update session status
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
    // STEP 6: Update candidate_assessments
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
    // STEP 7: Create or update assessment result
    // ============================================================
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
        .insert({
          user_id: session.user_id,
          assessment_id: session.assessment_id,
          session_id: sessionId,
          total_score: totalEarned,
          max_score: totalMax,
          percentage_score: percentageScore,
          completed_at: new Date().toISOString(),
          is_valid: true,
          is_auto_submitted: autoSubmitted || false,
          // Store category scores for National Service
          workplace_readiness: null,
          intellectual_capability: null
        })
        .select()
        .single();

      if (!createResultError && newResult) {
        resultId = newResult.id;
      }
    } else {
      // Update existing result
      const { data: updatedResult, error: updateResultError } = await serviceClient
        .from("assessment_results")
        .update({
          total_score: totalEarned,
          max_score: totalMax,
          percentage_score: percentageScore,
          completed_at: new Date().toISOString(),
          is_valid: true,
          is_auto_submitted: autoSubmitted || false
        })
        .eq("id", existingResult.id)
        .select()
        .single();

      if (!updateResultError && updatedResult) {
        resultId = updatedResult.id;
      }
    }

    // ============================================================
    // STEP 8: Update candidate_assessments with result_id
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
