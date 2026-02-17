import { createClient } from '@supabase/supabase-js';
import { classifyTalent } from '../../utils/classification';

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
      .select('assessment_type_id, assessment_type:assessment_types(code)')
      .eq('id', assessmentId)
      .single();

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // STEP 1: Get all responses (just answer_ids)
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("id, question_id, answer_id")
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

    // STEP 2: Get all unique questions for section info
    const questionIds = responses?.map(r => r.question_id) || [];
    let questionsMap = {};
    
    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from("unique_questions")
        .select("id, section, subsection")
        .in("id", questionIds);
      
      questions?.forEach(q => {
        questionsMap[q.id] = q;
      });
    }

    // STEP 3: Get all answers with scores
    const answerIds = responses?.map(r => r.answer_id) || [];
    let answersMap = {};
    
    if (answerIds.length > 0) {
      const { data: answers } = await supabase
        .from("unique_answers")
        .select("id, score, answer_text")
        .in("id", answerIds);
      
      answers?.forEach(a => {
        answersMap[a.id] = a;
      });
    }

    // STEP 4: Calculate scores and build section data
    let totalScore = 0;
    const sectionScores = {};
    const strengths = [];
    const weaknesses = [];

    responses?.forEach(response => {
      const question = questionsMap[response.question_id] || { section: 'General', subsection: '' };
      const answer = answersMap[response.answer_id] || { score: 0 };
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

    // Calculate percentages and identify strengths/weaknesses
    Object.keys(sectionScores).forEach(section => {
      const data = sectionScores[section];
      data.percentage = data.maxPossible > 0 ? Math.round((data.total / data.maxPossible) * 100) : 0;
      data.average = data.count > 0 ? (data.total / data.count).toFixed(1) : 0;
      
      if (data.percentage >= 70) {
        strengths.push(`${section} (${data.percentage}%)`);
      } else if (data.percentage <= 40) {
        weaknesses.push(`${section} (${data.percentage}%)`);
      }
    });

    const responseCount = responses?.length || 0;
    const maxScore = responseCount * 5;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Get classification
    const classificationResult = classifyTalent(totalScore, assessmentType, maxScore);
    const classification = classificationResult.label;

    // Generate recommendations
    const recommendations = [];
    if (weaknesses.length > 0) {
      recommendations.push(`Focus on developing: ${weaknesses.join(', ')}`);
    }
    if (strengths.length > 0) {
      recommendations.push(`Leverage strengths in: ${strengths.join(', ')}`);
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

    // Store detailed results
    await supabase
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
