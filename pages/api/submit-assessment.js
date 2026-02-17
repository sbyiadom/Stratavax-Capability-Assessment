import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with body:", req.body);

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    // We need either sessionId or (user_id and assessment_id)
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ 
        error: "Either sessionId or both user_id and assessment_id required" 
      });
    }

    let userId = user_id;
    let assessmentId = assessment_id;

    // If we have sessionId, get the details from the session
    if (sessionId && !userId) {
      console.log("🔍 Fetching session details for ID:", sessionId);
      
      const { data: session, error: sessionError } = await supabase
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error("❌ Session fetch error:", sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
      console.log("✅ Session found:", { userId, assessmentId });
    }

    // Get all responses for this user and assessment
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(`
        id,
        question_id,
        answer_id,
        unique_answers!inner (
          score
        )
      `)
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return res.status(500).json({ error: "Failed to fetch responses" });
    }

    // Calculate total score
    let totalScore = 0;
    const maxScore = responses?.length * 5 || 0; // Assuming 5 points per question
    
    responses?.forEach(response => {
      totalScore += response.unique_answers?.score || 0;
    });

    console.log(`📊 Calculated score: ${totalScore}/${maxScore} from ${responses?.length} responses`);

    // Determine classification based on score
    let classification = "Needs Improvement";
    if (totalScore >= 450) classification = "Elite Talent";
    else if (totalScore >= 400) classification = "Top Talent";
    else if (totalScore >= 350) classification = "High Potential";
    else if (totalScore >= 300) classification = "Solid Performer";
    else if (totalScore >= 250) classification = "Developing Talent";
    else if (totalScore >= 200) classification = "Emerging Talent";

    // Update assessment session to completed
    if (sessionId) {
      const { error: sessionError } = await supabase
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) {
        console.error("❌ Error updating session:", sessionError);
      }
    }

    // Insert into candidate_assessments with score
    const { error: candidateError } = await supabase
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        status: 'completed',
        score: totalScore,
        max_score: maxScore,
        classification: classification,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (candidateError) {
      console.error("❌ Error updating candidate_assessments:", candidateError);
      return res.status(500).json({ 
        error: "Failed to save submission",
        message: candidateError.message 
      });
    }

    // Also update or insert into assessment_results for detailed results
    const { error: resultError } = await supabase
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: maxScore,
        classification: classification,
        responses_count: responses?.length || 0,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (resultError) {
      console.error("❌ Error updating assessment_results:", resultError);
    }

    console.log("✅ Assessment submitted successfully with score:", totalScore);
    
    return res.status(200).json({ 
      success: true,
      score: totalScore,
      max_score: maxScore,
      classification: classification,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Submit assessment error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
