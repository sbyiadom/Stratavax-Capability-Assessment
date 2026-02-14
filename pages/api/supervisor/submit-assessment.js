import { supabase } from "../../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { session_id, user_id, assessment_id, time_spent } = req.body;
    
    if (!session_id || !user_id || !assessment_id) {
      return res.status(400).json({ 
        success: false,
        error: "session_id, user_id, and assessment_id are required" 
      });
    }

    // ===== CHECK IF ALREADY SUBMITTED =====
    const { data: existingSession, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("id, status, completed_at")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .single();

    if (sessionError) {
      return res.status(404).json({
        success: false,
        error: "Assessment session not found"
      });
    }

    if (existingSession.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: "This assessment has already been submitted"
      });
    }

    // ===== UPDATE SESSION =====
    const { error: updateError } = await supabase
      .from("assessment_sessions")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent_seconds: time_spent || 0
      })
      .eq("id", session_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating session:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to update assessment session"
      });
    }

    // ===== CALCULATE AND GENERATE RESULTS =====
    // Get all responses for this session
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(`
        question_id,
        answer_id,
        question:questions!inner(
          section,
          subsection
        ),
        answer:answers!inner(
          score
        )
      `)
      .eq("session_id", session_id);

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch responses"
      });
    }

    // Calculate category scores
    const categoryTotals = {};
    const categoryCounts = {};
    let totalScore = 0;

    responses.forEach(r => {
      const category = r.question.section;
      const score = r.answer.score || 0;
      totalScore += score;

      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
        categoryCounts[category] = 0;
      }
      categoryTotals[category] += score;
      categoryCounts[category] += 1;
    });

    // Calculate percentages and identify strengths/weaknesses
    const categoryScores = {};
    const strengths = [];
    const weaknesses = [];

    Object.entries(categoryTotals).forEach(([category, total]) => {
      const count = categoryCounts[category];
      const maxPossible = count * 5;
      const percentage = Math.round((total / maxPossible) * 100);
      const average = (total / count).toFixed(1);

      categoryScores[category] = {
        score: total,
        max_possible: maxPossible,
        percentage,
        average: parseFloat(average),
        count
      };

      if (percentage >= 70) {
        strengths.push(category);
      } else if (percentage < 50) {
        weaknesses.push(category);
      }
    });

    // Generate recommendations
    const recommendations = [];
    strengths.forEach(s => {
      recommendations.push(`Leverage strength in ${s} by assigning challenging projects and responsibilities.`);
    });
    weaknesses.forEach(w => {
      recommendations.push(`Focus on developing ${w} through targeted training and mentoring.`);
    });

    // Get assessment type for max score
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select(`
        id,
        title,
        assessment_type:assessment_types!inner(
          id,
          code,
          name,
          max_score
        )
      `)
      .eq("id", assessment_id)
      .single();

    if (assessmentError) {
      console.error("Error fetching assessment:", assessmentError);
    }

    const maxScore = assessment?.assessment_type?.max_score || 100;
    const assessmentTypeCode = assessment?.assessment_type?.code || 'general';

    // ===== INSERT RESULTS =====
    const { data: result, error: resultError } = await supabase
      .from("assessment_results")
      .insert({
        session_id,
        user_id,
        assessment_id,
        assessment_type_id: assessment?.assessment_type?.id,
        total_score: totalScore,
        max_score: maxScore,
        category_scores: categoryScores,
        strengths,
        weaknesses,
        recommendations,
        risk_level: totalScore >= maxScore * 0.7 ? 'low' : totalScore >= maxScore * 0.5 ? 'medium' : 'high',
        readiness: totalScore >= maxScore * 0.7 ? 'ready' : 'development_needed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (resultError) {
      console.error("Error inserting results:", resultError);
      return res.status(500).json({
        success: false,
        error: "Failed to save assessment results"
      });
    }

    // ===== UPDATE CANDIDATE ASSESSMENTS =====
    const { error: candidateError } = await supabase
      .from("candidate_assessments")
      .upsert({
        user_id,
        assessment_id,
        assessment_type_id: assessment?.assessment_type?.id,
        session_id,
        result_id: result.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        score: totalScore
      }, {
        onConflict: 'user_id,assessment_id'
      });

    if (candidateError) {
      console.error("Error updating candidate assessments:", candidateError);
    }

    // ===== CREATE SUPERVISOR NOTIFICATIONS =====
    try {
      // Get candidate info
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("full_name, email")
        .eq("id", user_id)
        .single();

      // Get all supervisors
      const { data: supervisors } = await supabase
        .from("supervisors")
        .select("id");

      if (supervisors && supervisors.length > 0) {
        const notifications = supervisors.map(sup => ({
          supervisor_id: sup.id,
          user_id,
          assessment_id,
          result_id: result.id,
          message: `${profile?.full_name || 'A candidate'} completed ${assessment?.title || 'an assessment'}`,
          status: 'unread',
          created_at: new Date().toISOString()
        }));

        await supabase
          .from("supervisor_notifications")
          .insert(notifications);
      }
    } catch (notifyError) {
      console.error("Failed to create notifications:", notifyError);
    }

    // ===== RETURN SUCCESS RESPONSE =====
    return res.status(200).json({
      success: true,
      message: `✅ ${assessment?.title || 'Assessment'} submitted successfully!`,
      result_id: result.id,
      total_score: totalScore,
      max_score: maxScore,
      assessment_type: assessmentTypeCode,
      strengths,
      weaknesses,
      category_scores: categoryScores
    });

  } catch (err) {
    console.error("Submit assessment error:", err);
    return res.status(500).json({
      success: false,
      error: "Submission failed. Please contact support."
    });
  }
}
