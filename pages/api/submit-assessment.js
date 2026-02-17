import { createClient } from '@supabase/supabase-js';
import { classifyTalent } from '../../utils/classification';
import { 
  calculateSectionScores, 
  identifyStrengthsWeaknesses, 
  generateRecommendations,
  determineRiskLevel,
  determineReadiness 
} from '../../utils/scoring';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with body:", req.body);

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId = user_id;
    let assessmentId = assessment_id;

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

    // Get assessment type
    const { data: assessment } = await supabase
      .from('assessments')
      .select('assessment_type_id, assessment_type:assessment_types(*)')
      .eq('id', assessmentId)
      .single();

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Get all responses with question and answer details
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(`
        id,
        question_id,
        answer_id,
        unique_questions!inner (
          id,
          section,
          subsection,
          question_text
        ),
        unique_answers!inner (
          id,
          answer_text,
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
    responses?.forEach(response => {
      totalScore += response.unique_answers?.score || 0;
    });

    const responseCount = responses?.length || 0;
    const maxScore = responseCount * 5;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Calculate section scores
    const sectionScores = calculateSectionScores(responses, assessmentType);
    
    // Identify strengths and weaknesses
    const { strengths, weaknesses } = identifyStrengthsWeaknesses(sectionScores);
    
    // Generate recommendations
    const recommendations = generateRecommendations(sectionScores, assessmentType);
    
    // Determine risk level and readiness
    const riskLevel = determineRiskLevel(sectionScores, percentage);
    const readiness = determineReadiness(percentage, assessmentType);

    // Get classification
    const classificationResult = classifyTalent(totalScore, assessmentType, maxScore);
    const classification = classificationResult.label;

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

    // Update candidate_assessments
    await supabase
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        status: 'completed',
        score: totalScore,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id, assessment_id' });

    // Store detailed results in assessment_results
    const { error: resultError } = await supabase
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: maxScore,
        percentage_score: percentage,
        category_scores: sectionScores,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        risk_level: riskLevel,
        readiness: readiness,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id, assessment_id' });

    if (resultError) {
      console.error("❌ Error storing detailed results:", resultError);
    }

    console.log("✅ Assessment submitted. Score:", totalScore, "Classification:", classification);
    
    return res.status(200).json({ 
      success: true,
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      classification: classification,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Submit assessment error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
}
