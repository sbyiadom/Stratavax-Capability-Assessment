import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called");

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Initialize Supabase with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId = user_id;
    let assessmentId = assessment_id;

    // Get session details if sessionId provided
    if (sessionId && !userId) {
      const { data: session, error: sessionError } = await supabase
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
    }

    // Get all responses with their answer scores
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        unique_answers (
          score
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        message: responsesError.message 
      });
    }

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: "No responses found" });
    }

    // Calculate total score
    let totalScore = 0;
    responses.forEach(response => {
      // Handle the joined data
      if (response.unique_answers) {
        totalScore += response.unique_answers.score || 0;
      }
    });

    // Calculate max possible score (assuming 5 points per question)
    const maxScore = responses.length * 5;
    const percentage = Math.round((totalScore / maxScore) * 100);

    console.log(`✅ Score: ${totalScore}/${maxScore} (${percentage}%)`);

    // Update session to completed
    if (sessionId) {
      await supabase
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    // Update candidate_assessments (this is what the supervisor dashboard reads)
    const { error: candidateError } = await supabase
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        status: 'completed',
        score: totalScore,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (candidateError) {
      console.error("❌ Error saving to candidate_assessments:", candidateError);
      return res.status(500).json({ 
        error: "Failed to save submission",
        message: candidateError.message 
      });
    }

    // Also save to assessment_results for detailed reporting
    await supabase
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: maxScore,
        percentage_score: percentage,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    return res.status(200).json({ 
      success: true,
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
