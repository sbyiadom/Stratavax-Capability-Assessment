import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called");

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get the user's token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization token" });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create clients
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let userId = user_id;
    let assessmentId = assessment_id;

    if (sessionId && !userId) {
      const { data: session, error: sessionError } = await serviceClient
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

    // Get responses with question and answer details
    const { data: responses, error: responsesError } = await userClient
      .from('responses')
      .select(`
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
          score,
          answer_text
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Responses error:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        message: responsesError.message 
      });
    }

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: "No responses found" });
    }

    // Calculate scores by section
    let totalScore = 0;
    const sectionScores = {};
    const questionScores = [];

    responses.forEach(response => {
      const score = response.unique_answers.score || 0;
      const section = response.unique_questions.section || 'General';
      const subsection = response.unique_questions.subsection;
      const questionText = response.unique_questions.question_text;
      const answerText = response.unique_answers.answer_text;
      
      totalScore += score;
      
      // Track question-level details
      questionScores.push({
        questionId: response.question_id,
        questionText,
        section,
        subsection,
        score,
        maxScore: 5,
        answerText,
        answerId: response.answer_id
      });

      // Aggregate by section
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
        questionText,
        subsection,
        score,
        answerText,
        maxScore: 5
      });
    });

    // Calculate percentages for each section
    Object.keys(sectionScores).forEach(section => {
      const data = sectionScores[section];
      data.percentage = Math.round((data.total / data.maxPossible) * 100);
      data.average = Number((data.total / data.count).toFixed(2));
    });

    const maxScore = responses.length * 5;
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Determine classification based on percentage
    let classification = '';
    let description = '';
    
    if (percentage >= 80) {
      classification = 'High Potential';
      description = 'Demonstrates exceptional capability across all areas.';
    } else if (percentage >= 60) {
      classification = 'Strong Talent';
      description = 'Shows solid capabilities with some areas of excellence.';
    } else if (percentage >= 40) {
      classification = 'Developing Talent';
      description = 'Shows foundational skills with clear development needs.';
    } else {
      classification = 'Entry Level';
      description = 'Foundational level with significant development opportunities.';
    }

    // Identify strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    Object.entries(sectionScores).forEach(([section, data]) => {
      if (data.percentage >= 70) {
        strengths.push({
          area: section,
          percentage: data.percentage,
          score: data.total,
          maxPossible: data.maxPossible
        });
      } else if (data.percentage <= 40) {
        weaknesses.push({
          area: section,
          percentage: data.percentage,
          score: data.total,
          maxPossible: data.maxPossible
        });
      }
    });

    // Generate recommendations
    const recommendations = [];
    
    if (weaknesses.length > 0) {
      recommendations.push({
        type: 'development',
        areas: weaknesses.map(w => w.area),
        message: `Focus on developing: ${weaknesses.map(w => w.area).join(', ')}`
      });
    }
    
    if (strengths.length > 0) {
      recommendations.push({
        type: 'strength',
        areas: strengths.map(s => s.area),
        message: `Leverage strengths in: ${strengths.map(s => s.area).join(', ')}`
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        message: 'Continue building on your solid performance across all areas.'
      });
    }

    // Determine risk level and readiness
    const weakSections = Object.values(sectionScores).filter(d => d.percentage < 40).length;
    const riskLevel = percentage < 40 || weakSections > 3 ? 'high' : percentage < 60 ? 'medium' : 'low';
    const readiness = percentage >= 70 ? 'ready' : percentage >= 50 ? 'development_needed' : 'not_ready';

    // Update session to completed
    if (sessionId) {
      await serviceClient
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }

    // Save to candidate_assessments
    const { error: candidateError } = await serviceClient
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
      console.error("❌ Candidate error:", candidateError);
    }

    // Save detailed results to assessment_results
    const { error: resultsError } = await serviceClient
      .from('assessment_results')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: sessionId,
        total_score: totalScore,
        max_score: maxScore,
        percentage_score: percentage,
        category_scores: sectionScores,
        question_scores: questionScores,
        interpretations: {
          classification,
          description,
          summary: description,
          risk_level: riskLevel,
          readiness: readiness
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

    if (resultsError) {
      console.error("❌ Results error:", resultsError);
      return res.status(500).json({ 
        error: "Failed to save detailed results",
        message: resultsError.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      score: totalScore,
      percentage: percentage,
      classification: classification,
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
