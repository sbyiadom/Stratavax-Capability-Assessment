import { createClient } from '@supabase/supabase-js';
import { classifyTalent } from '../../utils/classification';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with body:", JSON.stringify(req.body, null, 2));

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // IMPORTANT: Initialize Supabase with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test the connection first
    const { error: testError } = await supabase
      .from('responses')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error("❌ Permission test failed:", testError);
      return res.status(500).json({ 
        error: "Database permission error",
        details: testError.message,
        hint: "Check if SUPABASE_SERVICE_ROLE_KEY is correct and has proper permissions"
      });
    }

    let userId = user_id;
    let assessmentId = assessment_id;

    // Get session details if sessionId provided
    if (sessionId && !userId) {
      console.log("🔍 Fetching session for ID:", sessionId);
      const { data: session, error: sessionError } = await supabase
        .from('assessment_sessions')
        .select('user_id, assessment_id, status')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error("❌ Session not found:", sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
    }

    if (!userId || !assessmentId) {
      return res.status(400).json({ error: "Could not determine user or assessment" });
    }

    console.log(`📝 Processing submission for user: ${userId}, assessment: ${assessmentId}`);

    // Step 1: Get all responses for this user and assessment
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Error fetching responses:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        details: responsesError.message,
        code: responsesError.code
      });
    }

    console.log(`📊 Found ${responses?.length || 0} responses`);

    if (!responses || responses.length === 0) {
      return res.status(400).json({ 
        error: "No responses found for this assessment",
        details: "Cannot calculate scores without responses"
      });
    }

    // Step 2: Get all unique question IDs from responses
    const questionIds = [...new Set(responses.map(r => r.question_id).filter(Boolean))];
    
    // Step 3: Fetch question details including section
    const { data: questions, error: questionsError } = await supabase
      .from('unique_questions')
      .select('id, section, subsection, text')
      .in('id', questionIds);

    if (questionsError) {
      console.error("❌ Error fetching questions:", questionsError);
      return res.status(500).json({ 
        error: "Failed to fetch question details",
        details: questionsError.message 
      });
    }

    // Create a map of question_id -> question details
    const questionMap = {};
    questions?.forEach(q => {
      questionMap[q.id] = q;
    });

    // Step 4: Get all unique answer IDs from responses
    const answerIds = [...new Set(responses.map(r => r.answer_id).filter(Boolean))];
    
    // Step 5: Fetch answer details including scores
    const { data: answers, error: answersError } = await supabase
      .from('unique_answers')
      .select('id, score, text')
      .in('id', answerIds);

    if (answersError) {
      console.error("❌ Error fetching answers:", answersError);
      return res.status(500).json({ 
        error: "Failed to fetch answer details",
        details: answersError.message 
      });
    }

    // Create a map of answer_id -> answer details
    const answerMap = {};
    answers?.forEach(a => {
      answerMap[a.id] = a;
    });

    // Step 6: Calculate scores
    let totalScore = 0;
    const sectionScores = {};
    const questionScores = [];

    responses.forEach(response => {
      const question = questionMap[response.question_id];
      const answer = answerMap[response.answer_id];
      
      if (!question) {
        console.warn("⚠️ Missing question for response:", response.id, "question_id:", response.question_id);
        return;
      }
      
      if (!answer) {
        console.warn("⚠️ Missing answer for response:", response.id, "answer_id:", response.answer_id);
        return;
      }

      const score = answer.score || 0;
      const section = question.section || 'General';
      const subsection = question.subsection;
      
      totalScore += score;
      
      questionScores.push({
        questionId: response.question_id,
        questionText: question.text,
        section,
        subsection,
        score,
        answerText: answer.text,
        maxScore: 5
      });

      if (!sectionScores[section]) {
        sectionScores[section] = {
          total: 0,
          count: 0,
          maxPossible: 0,
          questions: []
        };
      }
      
      sectionScores[section].total += score;
      sectionScores[section].count += 1;
      sectionScores[section].maxPossible += 5;
      sectionScores[section].questions.push({
        questionText: question.text,
        subsection,
        score,
        answerText: answer.text,
        maxScore: 5
      });
    });

    // Calculate section percentages
    Object.keys(sectionScores).forEach(section => {
      const data = sectionScores[section];
      data.percentage = data.maxPossible > 0 ? Math.round((data.total / data.maxPossible) * 100) : 0;
      data.average = data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0;
    });

    const responseCount = responses.length;
    const maxScore = responseCount * 5;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    console.log("📊 Score Calculation:");
    console.log(`   Total Score: ${totalScore}/${maxScore} (${percentage}%)`);
    console.log("   Sections:", Object.keys(sectionScores));

    // Step 7: Get assessment type
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('assessment_type_id, assessment_type:assessment_types(code, name)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.warn("⚠️ Could not fetch assessment type:", assessmentError);
    }

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Step 8: Get classification
    const classificationResult = classifyTalent(totalScore, assessmentType, maxScore);
    const classification = classificationResult.label;

    // Step 9: Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    Object.entries(sectionScores).forEach(([section, data]) => {
      if (data.percentage >= 70) {
        strengths.push(`${section} (${data.percentage}%)`);
      } else if (data.percentage <= 40) {
        weaknesses.push(`${section} (${data.percentage}%)`);
      }
    });

    // Step 10: Generate recommendations
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

    // Step 11: Calculate risk and readiness
    const weakSections = Object.values(sectionScores).filter(d => d.percentage < 40).length;
    const riskLevel = percentage < 40 || weakSections > 3 ? 'high' : percentage < 60 ? 'medium' : 'low';
    const readiness = percentage >= 70 ? 'ready' : percentage >= 50 ? 'development_needed' : 'not_ready';

    // Step 12: Update session to completed
    if (sessionId) {
      const { error: sessionUpdateError } = await supabase
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionUpdateError) {
        console.error("❌ Error updating session:", sessionUpdateError);
      }
    }

    // Step 13: Update candidate_assessments
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
      console.error("❌ Error updating candidate_assessments:", candidateError);
    }

    // Step 14: Store in assessment_results
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
        interpretations: { 
          summary: classificationResult.description || '',
          classification: classification
        },
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        risk_level: riskLevel,
        readiness: readiness,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id'
      });

    if (resultError) {
      console.error("❌ Error storing results:", resultError);
      return res.status(500).json({
        error: "Failed to store results",
        details: resultError.message
      });
    }

    console.log("✅ Assessment submitted successfully with accurate scores");
    
    return res.status(200).json({ 
      success: true,
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      classification: classification,
      strengths: strengths,
      weaknesses: weaknesses,
      recommendations: recommendations,
      section_scores: sectionScores,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Fatal error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
