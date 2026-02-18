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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // Step 1: Get all responses with their associated answer scores in a single query
    // This ensures we get accurate data directly from the database
    const { data: responsesWithScores, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        question_id,
        answer_id,
        unique_questions!inner (
          id,
          section,
          subsection,
          text
        ),
        unique_answers!inner (
          id,
          score,
          text
        )
      `)
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error("❌ Error fetching responses with scores:", responsesError);
      return res.status(500).json({ 
        error: "Failed to fetch responses",
        details: responsesError.message 
      });
    }

    console.log(`📊 Found ${responsesWithScores?.length || 0} responses with scores`);

    if (!responsesWithScores || responsesWithScores.length === 0) {
      return res.status(400).json({ 
        error: "No responses found for this assessment",
        details: "Cannot calculate scores without responses"
      });
    }

    // Step 2: Calculate scores from the actual response data
    let totalScore = 0;
    const sectionScores = {};
    const questionScores = []; // For detailed reporting

    responsesWithScores.forEach(response => {
      // Get the actual score from the joined unique_answers
      const score = response.unique_answers?.score || 0;
      const section = response.unique_questions?.section || 'General';
      const subsection = response.unique_questions?.subsection;
      const questionText = response.unique_questions?.text;
      
      totalScore += score;
      
      // Track individual question scores for detailed reporting
      questionScores.push({
        questionId: response.question_id,
        questionText,
        section,
        subsection,
        score,
        maxScore: 5 // Assuming max score is 5
      });

      // Initialize section if not exists
      if (!sectionScores[section]) {
        sectionScores[section] = {
          total: 0,
          count: 0,
          maxPossible: 0,
          questions: []
        };
      }
      
      // Add to section totals
      sectionScores[section].total += score;
      sectionScores[section].count += 1;
      sectionScores[section].maxPossible += 5; // Max score per question
      sectionScores[section].questions.push({
        subsection,
        questionText,
        score,
        maxScore: 5
      });
    });

    // Step 3: Calculate section percentages and averages
    Object.keys(sectionScores).forEach(section => {
      const data = sectionScores[section];
      data.percentage = Math.round((data.total / data.maxPossible) * 100);
      data.average = Number((data.total / data.count).toFixed(2));
      
      // Calculate subsection scores if needed
      const subsectionScores = {};
      data.questions.forEach(q => {
        if (q.subsection) {
          if (!subsectionScores[q.subsection]) {
            subsectionScores[q.subsection] = {
              total: 0,
              count: 0,
              maxPossible: 0
            };
          }
          subsectionScores[q.subsection].total += q.score;
          subsectionScores[q.subsection].count += 1;
          subsectionScores[q.subsection].maxPossible += q.maxScore;
        }
      });
      
      // Calculate subsection percentages
      Object.keys(subsectionScores).forEach(subsection => {
        const subData = subsectionScores[subsection];
        subData.percentage = Math.round((subData.total / subData.maxPossible) * 100);
        subData.average = Number((subData.total / subData.count).toFixed(2));
      });
      
      data.subsections = subsectionScores;
    });

    const responseCount = responsesWithScores.length;
    const maxScore = responseCount * 5;
    const percentage = Math.round((totalScore / maxScore) * 100);

    console.log("📊 Score Calculation:");
    console.log(`   Total Score: ${totalScore}/${maxScore} (${percentage}%)`);
    console.log("   Sections:", Object.keys(sectionScores));

    // Step 4: Get assessment type for classification
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('assessment_type_id, assessment_type:assessment_types(code, name)')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.warn("⚠️ Could not fetch assessment type:", assessmentError);
    }

    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Step 5: Get classification
    const classificationResult = classifyTalent(totalScore, assessmentType, maxScore);
    const classification = classificationResult.label;

    // Step 6: Identify strengths and weaknesses based on actual scores
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

    // Step 7: Generate specific recommendations based on actual weaknesses
    const recommendations = [];
    if (weaknesses.length > 0) {
      recommendations.push({
        type: 'development',
        areas: weaknesses.map(w => `${w.area} (${w.percentage}%)`),
        message: `Focus on developing: ${weaknesses.map(w => w.area).join(', ')}`
      });
    }
    if (strengths.length > 0) {
      recommendations.push({
        type: 'strength',
        areas: strengths.map(s => `${s.area} (${s.percentage}%)`),
        message: `Leverage strengths in: ${strengths.map(s => s.area).join(', ')}`
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        message: 'Continue building on your solid performance across all areas.'
      });
    }

    // Step 8: Calculate risk and readiness based on actual performance
    const weakSections = Object.values(sectionScores).filter(d => d.percentage < 40).length;
    const riskLevel = percentage < 40 || weakSections > 3 ? 'high' : percentage < 60 ? 'medium' : 'low';
    const readiness = percentage >= 70 ? 'ready' : percentage >= 50 ? 'development_needed' : 'not_ready';

    // Step 9: Update session to completed
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

    // Step 10: Update candidate_assessments with the actual score
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
        onConflict: 'user_id, assessment_id',
        ignoreDuplicates: false
      });

    if (candidateError) {
      console.error("❌ Error updating candidate_assessments:", candidateError);
    }

    // Step 11: Store detailed results in assessment_results
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
        question_scores: questionScores, // Detailed question-level scores
        interpretations: { 
          summary: classificationResult.description || '',
          classification: classification,
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
        onConflict: 'user_id, assessment_id',
        ignoreDuplicates: false
      });

    if (resultError) {
      console.error("❌ Error storing results:", resultError);
      return res.status(500).json({
        error: "Failed to store results",
        details: resultError.message
      });
    }

    // Step 12: Verify the data was saved correctly
    const { data: savedResult, error: verifyError } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .single();

    if (verifyError) {
      console.warn("⚠️ Could not verify saved results:", verifyError);
    } else {
      console.log("✅ Verified saved result:", {
        score: savedResult.total_score,
        percentage: savedResult.percentage_score,
        sections: Object.keys(savedResult.category_scores || {})
      });
    }

    console.log("✅ Assessment submitted successfully with accurate scores");
    
    return res.status(200).json({ 
      success: true,
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      classification: classification,
      strengths: strengths.map(s => `${s.area} (${s.percentage}%)`),
      weaknesses: weaknesses.map(w => `${w.area} (${w.percentage}%)`),
      recommendations: recommendations.map(r => r.message),
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
