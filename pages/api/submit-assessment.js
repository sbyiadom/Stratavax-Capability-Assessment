import { createClient } from '@supabase/supabase-js';
import { generatePersonalizedReport } from '../../utils/dynamicReportGenerator';
import { calculateBehavioralMetrics } from '../../utils/behavioralAnalyzer';

// Import competency functions
import { 
  calculateCompetencyScores, 
  generateCompetencyRecommendations 
} from '../../utils/competencyScoring';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with behavioral analytics");

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization token" });
    }

    const token = authHeader.replace('Bearer ', '');

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
    let activeSessionId = sessionId;

    if (sessionId && !userId) {
      const { data: session, error: sessionError } = await serviceClient
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error("❌ Session error:", sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
      activeSessionId = sessionId;
    }

    console.log("📊 Processing for user:", userId, "assessment:", assessmentId, "session:", activeSessionId);

    // ===== CRITICAL FIX: CHECK FOR VIOLATIONS BEFORE PROCESSING =====
    const { data: sessionData, error: sessionError } = await serviceClient
      .from('assessment_sessions')
      .select('violation_count, auto_submitted, answered_questions, total_questions, status')
      .eq('id', activeSessionId)
      .single();

    if (sessionError) {
      console.error("❌ Error fetching session:", sessionError);
    }

    // If violations exceed limit (3), reject the submission
    if (sessionData && sessionData.violation_count >= 3) {
      console.log(`⚠️ Auto-submit rejected: ${sessionData.violation_count} violations detected`);
      
      await serviceClient
        .from('assessment_sessions')
        .update({
          status: 'completed',
          auto_submitted: true,
          auto_submit_reason: `Auto-submitted due to ${sessionData.violation_count} rule violations. Only ${sessionData.answered_questions || 0} of ${sessionData.total_questions || 100} questions completed.`,
          completed_at: new Date().toISOString()
        })
        .eq('id', activeSessionId);
      
      return res.status(400).json({
        success: false,
        error: 'assessment_invalid_violations',
        message: `Assessment auto-submitted due to ${sessionData.violation_count} rule violations. This result is invalid. Please contact your supervisor.`,
        violation_count: sessionData.violation_count,
        answered_questions: sessionData.answered_questions || 0,
        total_questions: sessionData.total_questions || 100
      });
    }

    // Get all responses with full question and answer details
    const { data: responses, error: responsesError } = await userClient
      .from('responses')
      .select(`
        question_id,
        answer_id,
        time_spent_seconds,
        times_changed,
        first_saved_at,
        initial_answer_id,
        session_id,
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
      console.error("❌ No responses found");
      return res.status(400).json({ error: "No responses found" });
    }

    console.log(`✅ Found ${responses.length} responses`);

    // Get assessment type for the result
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('assessment_type_id, assessment_type:assessment_types(code), title')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      console.error("❌ Assessment error:", assessmentError);
    }

    const assessmentTypeId = assessment?.assessment_type_id;
    const assessmentType = assessment?.assessment_type?.code || 'general';

    // Get candidate name for the report
    let candidateName = 'Candidate';
    const { data: profileData } = await serviceClient
      .from('candidate_profiles')
      .select('full_name, email, created_by')
      .eq('id', userId)
      .single();

    if (profileData?.full_name) {
      candidateName = profileData.full_name;
    } else if (profileData?.email) {
      candidateName = profileData.email.split('@')[0];
    }

    // ===== FIXED: Calculate TRUE MAX SCORE with proper error handling =====
    async function getAssessmentTrueMaxScore(assessmentTypeId) {
      if (!assessmentTypeId) {
        console.error("❌ No assessment_type_id provided");
        return null;
      }
      
      // Get all questions for this assessment type
      const { data: questions, error } = await serviceClient
        .from('unique_questions')
        .select(`
          id,
          unique_answers (score)
        `)
        .eq('assessment_type_id', assessmentTypeId);
      
      if (error) {
        console.error("❌ Error getting questions:", error);
        return null;
      }
      
      if (!questions || questions.length === 0) {
        console.error("❌ No questions found for assessment_type_id:", assessmentTypeId);
        return null;
      }
      
      console.log(`📊 Found ${questions.length} total questions for max score calculation`);
      
      let totalMaxScore = 0;
      let questionsWithNoAnswers = 0;
      
      for (const question of questions) {
        // Find the highest score among answers for this question
        const answerScores = (question.unique_answers || []).map(a => a.score || 0);
        
        if (answerScores.length === 0) {
          questionsWithNoAnswers++;
          // Default to 5 points if no answers found
          totalMaxScore += 5;
          console.warn(`⚠️ Question ${question.id} has no answers, defaulting to 5 points`);
        } else {
          const maxAnswerScore = Math.max(...answerScores);
          totalMaxScore += maxAnswerScore;
        }
      }
      
      if (questionsWithNoAnswers > 0) {
        console.warn(`⚠️ ${questionsWithNoAnswers} questions had no answers, using default 5 points each`);
      }
      
      console.log(`📊 Calculated true max score: ${totalMaxScore} from ${questions.length} questions`);
      
      return totalMaxScore;
    }

    // Calculate total earned score from actual answer scores
    let totalEarnedScore = 0;
    let questionsWithZeroScore = 0;
    
    for (const response of responses) {
      const answerScore = response.unique_answers?.score || 0;
      totalEarnedScore += answerScore;
      if (answerScore === 0) {
        questionsWithZeroScore++;
      }
    }
    
    console.log(`📊 Total earned score: ${totalEarnedScore}, Questions with zero score: ${questionsWithZeroScore}`);

    // Get the TRUE maximum score for the full assessment
    let trueMaxScore = await getAssessmentTrueMaxScore(assessmentTypeId);
    
    // FALLBACK: If trueMaxScore calculation fails, calculate from responses
    if (!trueMaxScore || trueMaxScore === 0) {
      console.warn("⚠️ True max score calculation failed, using fallback method");
      
      // Fallback: Calculate max score from all possible answers for answered questions
      let fallbackMaxScore = 0;
      for (const response of responses) {
        // Get all answers for this question to find max possible score
        const { data: questionAnswers } = await serviceClient
          .from('unique_answers')
          .select('score')
          .eq('question_id', response.question_id);
        
        if (questionAnswers && questionAnswers.length > 0) {
          const maxScore = Math.max(...questionAnswers.map(a => a.score || 0));
          fallbackMaxScore += maxScore;
        } else {
          fallbackMaxScore += 5; // Default 5 points per question
        }
      }
      
      trueMaxScore = fallbackMaxScore;
      console.log(`📊 Fallback max score: ${trueMaxScore} from ${responses.length} questions`);
    }
    
    // Final validation - ensure max_score is not zero
    if (!trueMaxScore || trueMaxScore === 0) {
      console.error("❌ CRITICAL: Failed to calculate max score even with fallback");
      
      // ULTIMATE FALLBACK: Use responses count * 5
      trueMaxScore = responses.length * 5;
      console.log(`📊 Ultimate fallback max score: ${trueMaxScore} (${responses.length} questions × 5 points)`);
    }

    // Calculate percentage based on FULL assessment
    let percentageScore = 0;
    if (trueMaxScore > 0) {
      percentageScore = (totalEarnedScore / trueMaxScore) * 100;
    } else {
      console.error("❌ trueMaxScore is still 0, cannot calculate percentage");
      percentageScore = 0;
    }
    
    console.log(`📊 FINAL SCORES: Earned=${totalEarnedScore}, TrueMax=${trueMaxScore}, Percentage=${percentageScore.toFixed(2)}%`);
    console.log(`📊 Questions answered: ${responses.length}, Est. total questions: ${Math.round(trueMaxScore / 5)}`);

    // ===== COMPETENCY PROCESSING =====
    console.log("🧠 Processing competency scores...");
    
    const { data: questionCompetencies, error: qcError } = await serviceClient
      .from('question_competencies')
      .select(`
        question_id,
        competency_id,
        weight,
        competencies(name)
      `);

    let competencyResults = {};
    let competencyRecommendations = [];

    if (questionCompetencies && questionCompetencies.length > 0 && !qcError) {
      competencyResults = calculateCompetencyScores(responses, questionCompetencies, assessmentType);
      competencyRecommendations = generateCompetencyRecommendations(competencyResults);
      console.log(`✅ Processed ${Object.keys(competencyResults).length} competencies`);
    } else {
      console.log("⚠️ No question-competency mappings found");
    }

    // ===== BEHAVIORAL METRICS PROCESSING =====
    console.log("🧠 Calculating behavioral metrics...");
    let behavioralMetrics = null;
    
    try {
      if (activeSessionId) {
        behavioralMetrics = await calculateBehavioralMetrics(
          activeSessionId,
          userId,
          assessmentId,
          serviceClient
        );
        
        if (behavioralMetrics) {
          console.log("✅ Behavioral metrics calculated:", {
            work_style: behavioralMetrics.work_style,
            confidence_level: behavioralMetrics.confidence_level,
            total_answer_changes: behavioralMetrics.total_answer_changes
          });
        }
      }
    } catch (behavioralError) {
      console.error("Error calculating behavioral metrics:", behavioralError);
    }

    // Generate personalized report
    const personalizedReport = generatePersonalizedReport(
      userId,
      assessmentType,
      responses,
      candidateName
    );

    console.log("✅ Personalized report generated");

    // Determine risk level and readiness
    const riskLevel = percentageScore < 40 ? 'high' : 
                     percentageScore < 60 ? 'medium' : 'low';
    const readiness = percentageScore >= 70 ? 'ready' : 
                     percentageScore >= 50 ? 'development_needed' : 'not_ready';

    // Update session to completed
    if (activeSessionId) {
      const { error: sessionUpdateError } = await serviceClient
        .from('assessment_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          answered_questions: responses.length,
          total_questions: Math.round(trueMaxScore / 5)
        })
        .eq('id', activeSessionId);

      if (sessionUpdateError) {
        console.error("❌ Session update error:", sessionUpdateError);
      } else {
        console.log("✅ Session updated");
      }
    }

    // Save to candidate_assessments
    const { error: candidateError } = await serviceClient
      .from('candidate_assessments')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        session_id: activeSessionId,
        status: 'completed',
        score: totalEarnedScore,
        max_score: trueMaxScore,
        percentage: percentageScore,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id, assessment_id' 
      });

    if (candidateError) {
      console.error("❌ Candidate error:", candidateError);
    } else {
      console.log("✅ Candidate assessments updated");
    }

    // Prepare strengths and weaknesses
    const strengthsArray = personalizedReport.strengths?.map(s => 
      `${s.area} (${s.percentage}%)`
    ) || [];
    
    const weaknessesArray = personalizedReport.weaknesses?.map(w => 
      `${w.area} (${w.percentage}%)`
    ) || [];

    // Prepare recommendations
    const recommendationsArray = [
      ...(personalizedReport.recommendations || []),
      ...competencyRecommendations.map(r => r.recommendation)
    ];

    // Prepare interpretations with behavioral insights
    const interpretationsObj = {
      classification: personalizedReport.gradeInfo?.description || 
                     (percentageScore >= 80 ? 'Elite Talent' :
                      percentageScore >= 60 ? 'High Potential' :
                      percentageScore >= 40 ? 'Developing Talent' :
                      'Needs Improvement'),
      executiveSummary: personalizedReport.executiveSummary || "Assessment completed successfully.",
      overallProfile: personalizedReport.overallProfile || "Profile generated based on assessment responses.",
      overallTraits: personalizedReport.overallTraits || [],
      summary: `Overall performance: ${Math.round(percentageScore)}%`,
      
      competencyData: Object.keys(competencyResults).length > 0 ? {
        results: competencyResults,
        recommendations: competencyRecommendations
      } : null,
      
      behavioralInsights: behavioralMetrics ? {
        work_style: behavioralMetrics.work_style,
        confidence_level: behavioralMetrics.confidence_level,
        attention_span: behavioralMetrics.attention_span,
        decision_pattern: behavioralMetrics.decision_pattern,
        avg_response_time: behavioralMetrics.avg_response_time_seconds,
        total_answer_changes: behavioralMetrics.total_answer_changes,
        improvement_rate: behavioralMetrics.improvement_rate,
        first_instinct_accuracy: behavioralMetrics.first_instinct_accuracy,
        revisit_rate: behavioralMetrics.revisit_rate,
        fatigue_factor: behavioralMetrics.fatigue_factor,
        recommended_support: behavioralMetrics.recommended_support,
        development_focus_areas: behavioralMetrics.development_focus_areas
      } : null
    };

    // Prepare the data for assessment_results with CORRECT max_score
    const resultData = {
      user_id: userId,
      assessment_id: assessmentId,
      session_id: activeSessionId,
      assessment_type_id: assessmentTypeId,
      total_score: totalEarnedScore,
      max_score: trueMaxScore,
      percentage_score: percentageScore,
      category_scores: personalizedReport.categoryScores || {},
      interpretations: interpretationsObj,
      strengths: strengthsArray,
      weaknesses: weaknessesArray,
      recommendations: recommendationsArray,
      risk_level: riskLevel,
      readiness: readiness,
      is_valid: true,
      completed_at: new Date().toISOString()
    };

    console.log("📦 Inserting into assessment_results with max_score:", trueMaxScore);

    // Save to assessment_results
    const { data: insertedData, error: resultsError } = await serviceClient
      .from('assessment_results')
      .insert([resultData])
      .select();

    if (resultsError) {
      console.error("❌ Results error:", resultsError);
      
      // Return success anyway since we have the score
      return res.status(200).json({ 
        success: true,
        score: totalEarnedScore,
        max_score: trueMaxScore,
        percentage: Math.round(percentageScore),
        classification: interpretationsObj.classification,
        warning: "Score saved but detailed report failed to save: " + resultsError.message,
        message: "Assessment submitted successfully (score only)" 
      });
    }

    // Save competency scores to database
    if (Object.keys(competencyResults).length > 0) {
      console.log("💾 Saving competency scores...");
      
      const competencyInserts = [];
      Object.values(competencyResults).forEach(comp => {
        competencyInserts.push({
          candidate_id: userId,
          assessment_id: assessmentId,
          competency_id: comp.id,
          raw_score: comp.rawScore,
          max_possible: comp.maxPossible,
          percentage: comp.percentage,
          classification: comp.classification,
          question_count: comp.questionCount
        });
      });
      
      const { error: compInsertError } = await serviceClient
        .from('candidate_competency_scores')
        .upsert(competencyInserts, { 
          onConflict: 'candidate_id, assessment_id, competency_id' 
        });
      
      if (compInsertError) {
        console.error("❌ Error saving competency scores:", compInsertError);
      } else {
        console.log(`✅ Saved ${competencyInserts.length} competency scores`);
      }
    }

    console.log("✅ Results inserted successfully:", insertedData);

    // Create notification for supervisor
    if (profileData?.created_by) {
      const { error: notifError } = await serviceClient
        .from('supervisor_notifications')
        .insert({
          supervisor_id: profileData.created_by,
          user_id: userId,
          assessment_id: assessmentId,
          result_id: insertedData?.[0]?.id,
          message: `${profileData.full_name || profileData.email || 'Candidate'} completed ${assessment?.title || 'an assessment'} with ${Math.round(percentageScore)}%`,
          status: 'unread',
          created_at: new Date().toISOString()
        });

      if (notifError) {
        console.error("❌ Failed to create notification:", notifError);
      } else {
        console.log("✅ Notification created for supervisor:", profileData.created_by);
      }
    }

    return res.status(200).json({ 
      success: true,
      score: totalEarnedScore,
      max_score: trueMaxScore,
      percentage: Math.round(percentageScore),
      classification: interpretationsObj.classification,
      competencyCount: Object.keys(competencyResults).length,
      behavioralMetrics: behavioralMetrics ? {
        work_style: behavioralMetrics.work_style,
        confidence_level: behavioralMetrics.confidence_level
      } : null,
      message: "Assessment submitted successfully with correct scoring" 
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
