import { createClient } from '@supabase/supabase-js';

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
        error: "Missing required fields" 
      });
    }

    // Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // ===== SCORE CALCULATION =====
    // Get all responses for this user and assessment
    console.log("📊 Fetching responses for score calculation...");
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
      // Continue with submission even if score calculation fails
    }

    // Calculate total score
    let totalScore = 0;
    const responseCount = responses?.length || 0;
    const maxScore = responseCount * 5; // Assuming 5 points per question
    
    responses?.forEach(response => {
      totalScore += response.unique_answers?.score || 0;
    });

    console.log(`📊 Calculated score: ${totalScore}/${maxScore} from ${responseCount} responses`);

    // Determine classification based on score percentage
    let classification = "Needs Improvement";
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    if (percentage >= 90) classification = "Elite Talent";
    else if (percentage >= 80) classification = "Top Talent";
    else if (percentage >= 70) classification = "High Potential";
    else if (percentage >= 60) classification = "Solid Performer";
    else if (percentage >= 50) classification = "Developing Talent";
    else if (percentage >= 40) classification = "Emerging Talent";

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
        // Continue anyway - this is not critical
      }
    }

    // Insert into candidate_assessments WITH SCORE
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

    // Also update assessment_results for detailed analytics
    const { error: resultError } = await supabase
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: maxScore,
        classification: classification,
        responses_count: responseCount,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (resultError) {
      console.error("❌ Error updating assessment_results:", resultError);
      // Continue anyway - not critical
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
