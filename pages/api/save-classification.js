import { supabase } from "../../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { session_id, assessment_id, user_id } = req.body;
  
  if (!session_id || !assessment_id || !user_id) {
    return res.status(400).json({ 
      error: "session_id, assessment_id, and user_id are required" 
    });
  }

  try {
    // First, check if this session is already completed
    const { data: existingSession, error: sessionCheckError } = await supabase
      .from("assessment_sessions")
      .select("id, status, completed_at")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .single();

    if (sessionCheckError) {
      return res.status(404).json({ error: "Assessment session not found" });
    }

    if (existingSession.status === 'completed') {
      return res.status(400).json({ 
        error: "Assessment already completed and classified" 
      });
    }

    // Get all responses with their scores
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
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .eq("assessment_id", assessment_id);

    if (responsesError) throw responsesError;

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: "No responses found for this assessment" });
    }

    // Calculate total score
    const totalScore = responses.reduce((sum, r) => sum + (r.answer.score || 0), 0);
    
    // Calculate category scores
    const categoryScores = {};
    responses.forEach(r => {
      const category = r.question.section;
      const score = r.answer.score || 0;
      
      if (!categoryScores[category]) {
        categoryScores[category] = {
          total: 0,
          count: 0
        };
      }
      categoryScores[category].total += score;
      categoryScores[category].count += 1;
    });

    // Calculate percentages and identify strengths/weaknesses
    const categoryResults = {};
    const strengths = [];
    const weaknesses = [];

    Object.entries(categoryScores).forEach(([category, data]) => {
      const maxPossible = data.count * 5;
      const percentage = Math.round((data.total / maxPossible) * 100);
      
      categoryResults[category] = {
        score: data.total,
        max_possible: maxPossible,
        count: data.count,
        percentage,
        average: (data.total / data.count).toFixed(1)
      };

      if (percentage >= 70) {
        strengths.push(category);
      } else if (percentage < 50) {
        weaknesses.push(category);
      }
    });

    // Get assessment type for max score and classification
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
    const overallPercentage = Math.round((totalScore / (responses.length * 5)) * 100);

    // Determine classification
    let classification;
    if (assessmentTypeCode === 'general') {
      if (totalScore >= 450) classification = "Elite Talent";
      else if (totalScore >= 400) classification = "Top Talent";
      else if (totalScore >= 350) classification = "High Potential";
      else if (totalScore >= 300) classification = "Solid Performer";
      else if (totalScore >= 250) classification = "Developing Talent";
      else if (totalScore >= 200) classification = "Emerging Talent";
      else classification = "Needs Improvement";
    } else {
      if (overallPercentage >= 90) classification = "Exceptional";
      else if (overallPercentage >= 80) classification = "Advanced";
      else if (overallPercentage >= 70) classification = "Proficient";
      else if (overallPercentage >= 60) classification = "Developing";
      else if (overallPercentage >= 50) classification = "Basic";
      else classification = "Needs Improvement";
    }

    // Generate recommendations
    const recommendations = [];
    strengths.forEach(s => {
      recommendations.push(`Leverage strength in ${s} through challenging assignments.`);
    });
    weaknesses.forEach(w => {
      recommendations.push(`Focus on developing ${w} with targeted training.`);
    });

    // Update session status
    await supabase
      .from("assessment_sessions")
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq("id", session_id);

    // Insert into assessment_results
    const { data: result, error: resultError } = await supabase
      .from("assessment_results")
      .insert({
        session_id,
        user_id,
        assessment_id,
        assessment_type_id: assessment?.assessment_type?.id,
        total_score: totalScore,
        max_score: maxScore,
        category_scores: categoryResults,
        strengths,
        weaknesses,
        recommendations,
        risk_level: overallPercentage >= 70 ? 'low' : overallPercentage >= 50 ? 'medium' : 'high',
        readiness: overallPercentage >= 70 ? 'ready' : 'development_needed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (resultError) throw resultError;

    // Update candidate_assessments
    await supabase
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

    // Return success response
    res.status(200).json({ 
      success: true,
      total_score: totalScore,
      max_score: maxScore,
      percentage: overallPercentage,
      classification,
      category_scores: categoryResults,
      strengths,
      weaknesses,
      recommendations,
      result_id: result.id
    });

  } catch (err) {
    console.error("Save classification error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
}
