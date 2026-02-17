import { createClient } from '@supabase/supabase-js';
import { classifyTalent } from '../../utils/classification';

export default async function handler(req, res) {
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
      .select('assessment_type_id, assessment_type:assessment_types(code)')
      .eq('id', assessmentId)
      .single();

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Get all responses for this user
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        details: responsesError.message 
      });
    }

    console.log(`📊 Found ${responses?.length || 0} responses`);

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: "No responses found for this assessment" });
    }

    // Get question details for all questions
    const questionIds = responses.map(r => r.question_id);
    const { data: questions } = await supabase
      .from("unique_questions")
      .select("id, section, subsection")
      .in("id", questionIds);

    const questionMap = {};
    questions?.forEach(q => {
      questionMap[q.id] = q;
    });

    // Get answer scores for all answers
    const answerIds = responses.map(r => r.answer_id);
    const { data: answers } = await supabase
      .from("unique_answers")
      .select("id, score")
      .in("id", answerIds);

    const answerMap = {};
    answers?.forEach(a => {
      answerMap[a.id] = a;
    });

    // Calculate scores by section
    let totalScore = 0;
    const sectionScores = {};

    responses.forEach(response => {
      const question = questionMap[response.question_id] || { section: 'General' };
      const answer = answerMap[response.answer_id] || { score: 0 };
      const score = answer.score || 0;
      
      totalScore += score;
      
      const section = question.section || 'General';
      if (!sectionScores[section]) {
        sectionScores[section] = {
          total: 0,
          count: 0,
          maxPossible: 0
        };
      }
      
      sectionScores[section].total += score;
      sectionScores[section].count += 1;
      sectionScores[section].maxPossible += 5;
    });

    // Calculate percentages
    Object.keys(sectionScores).forEach(section => {
      const data = sectionScores[section];
      data.percentage = data.maxPossible > 0 ? Math.round((data.total / data.maxPossible) * 100) : 0;
      data.average = data.count > 0 ? Number((data.total / data.count).toFixed(1)) : 0;
    });

    const responseCount = responses.length;
    const maxScore = responseCount * 5;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Get classification
    const classificationResult = classifyTalent(totalScore, assessmentType, maxScore);
    const classification = classificationResult.label;

    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    Object.entries(sectionScores).forEach(([section, data]) => {
      if (data.percentage >= 70) {
        strengths.push(`${section} (${data.percentage}%)`);
      } else if (data.percentage <= 40) {
        weaknesses.push(`${section} (${data.percentage}%)`);
      }
    });

    // Generate recommendations
    const recommendations = [];
    if (weaknesses.length > 0) {
      recommendations.push(`Focus on developing: ${weaknesses.join(', ')}`);
    }
    if (strengths.length > 0) {
      recommendations.push(`Leverage strengths in: ${strengths.join(', ')}`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue building on your solid performance across all areas.');
    }

    // Determine risk level
    const weakSections = Object.values(sectionScores).filter(d => d.percentage < 40).length;
    const riskLevel = percentage < 40 || weakSections > 3 ? 'high' : percentage < 60 ? 'medium' : 'low';
    const readiness = percentage >= 70 ? 'ready' : percentage >= 50 ? 'development_needed' : 'not_ready';

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

    // Store in assessment_results
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
        interpretations: { summary: classificationResult.description || '' },
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        risk_level: riskLevel,
        readiness: readiness,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id, assessment_id' });

    if (resultError) {
      console.error("❌ Error storing results:", resultError);
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
    console.error("❌ Fatal error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
