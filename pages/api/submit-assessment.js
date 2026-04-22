// pages/api/submit-assessment.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization token" });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("📤 Processing submission for session:", sessionId);

    // Get session with violation info
    const { data: session, error: sessionError } = await serviceClient
      .from('assessment_sessions')
      .select(`
        id,
        user_id,
        assessment_id,
        violation_count,
        auto_submitted,
        answered_questions,
        total_questions,
        status,
        copy_paste_count,
        right_click_count,
        devtools_count,
        screenshot_count
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session error:", sessionError);
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if already submitted
    if (session.status === 'completed') {
      console.log("⚠️ Session already completed");
      return res.status(400).json({ error: "already_submitted" });
    }

    const violationCount = session.violation_count || 0;
    const MAX_VIOLATIONS = 3;
    const isAutoSubmit = violationCount >= MAX_VIOLATIONS;

    console.log(`📊 Violations: ${violationCount}/${MAX_VIOLATIONS}, Auto-submit: ${isAutoSubmit}`);

    // Get all responses for this session
    const { data: responses, error: responsesError } = await serviceClient
      .from('responses')
      .select(`
        question_id,
        answer_id,
        unique_answers!inner (score)
      `)
      .eq('session_id', sessionId);

    if (responsesError) {
      console.error("❌ Responses error:", responsesError);
      return res.status(500).json({ error: "Failed to fetch responses" });
    }

    const answeredCount = responses?.length || 0;

    // Get assessment type
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('assessment_type_id')
      .eq('id', session.assessment_id)
      .single();

    if (assessmentError) {
      console.error("❌ Assessment error:", assessmentError);
      return res.status(500).json({ error: "Failed to fetch assessment" });
    }

    // Get total number of questions in this assessment
    const { data: allQuestions, error: questionsError } = await serviceClient
      .from('unique_questions')
      .select('id', { count: 'exact' })
      .eq('assessment_type_id', assessment.assessment_type_id);

    if (questionsError) {
      console.error("❌ Error getting question count:", questionsError);
    }

    const totalQuestions = allQuestions?.length || session.total_questions || 0;

    console.log(`📊 Answered: ${answeredCount}, Total Questions: ${totalQuestions}`);

    // ===== VALIDATION: Must answer ALL questions unless auto-submit =====
    if (!isAutoSubmit && answeredCount < totalQuestions) {
      console.log(`❌ Submission rejected: ${totalQuestions - answeredCount} unanswered questions`);
      return res.status(400).json({
        success: false,
        error: 'incomplete_assessment',
        message: `Please answer all questions before submitting. ${totalQuestions - answeredCount} question(s) remaining.`,
        unanswered_count: totalQuestions - answeredCount,
        total_questions: totalQuestions,
        answered_count: answeredCount
      });
    }

    // ===== CALCULATE TOTAL POSSIBLE MAX SCORE (if all questions answered correctly) =====
    async function calculateTotalPossibleMaxScore(assessmentTypeId) {
      if (!assessmentTypeId) {
        console.error("❌ No assessment_type_id provided");
        return 0;
      }
      
      const { data: questions, error: questionsError } = await serviceClient
        .from('unique_questions')
        .select(`
          id,
          unique_answers (score)
        `)
        .eq('assessment_type_id', assessmentTypeId);
      
      if (questionsError || !questions) {
        console.error("❌ Error fetching questions:", questionsError);
        return 0;
      }
      
      let totalMaxScore = 0;
      
      for (const question of questions) {
        const scores = (question.unique_answers || []).map(a => a.score || 0);
        if (scores.length > 0) {
          const maxScoreForQuestion = Math.max(...scores);
          totalMaxScore += maxScoreForQuestion;
        } else {
          console.error(`❌ Question ${question.id} has no answers! This is a data issue.`);
          totalMaxScore += 5;
        }
      }
      
      console.log(`📊 Total possible max score (all questions correct): ${totalMaxScore}`);
      return totalMaxScore;
    }

    const totalPossibleMaxScore = await calculateTotalPossibleMaxScore(assessment.assessment_type_id);
    
    // Calculate earned score from answered questions ONLY (unanswered = 0 points)
    let earnedScore = 0;
    for (const response of responses) {
      earnedScore += response.unique_answers?.score || 0;
    }

    // Calculate percentage based on earned score vs TOTAL possible max score
    let percentage = 0;
    if (totalPossibleMaxScore > 0) {
      percentage = (earnedScore / totalPossibleMaxScore) * 100;
    }

    console.log(`📊 Earned Score: ${earnedScore}, Total Possible Max: ${totalPossibleMaxScore}, Percentage: ${percentage.toFixed(2)}%`);
    console.log(`📊 Answered: ${answeredCount}/${totalQuestions} questions`);

    // Determine if result is valid (only valid if normal submission with all questions answered)
    const isValid = !isAutoSubmit && answeredCount === totalQuestions;

    // Update session to completed
    const { error: updateError } = await serviceClient
      .from('assessment_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        auto_submitted: isAutoSubmit,
        auto_submit_reason: isAutoSubmit ? `Auto-submitted due to ${violationCount} violation(s). Only ${answeredCount} of ${totalQuestions} questions answered.` : null,
        answered_questions: answeredCount,
        total_questions: totalQuestions
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error("❌ Session update error:", updateError);
    } else {
      console.log("✅ Session updated");
    }

    // Save results
    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: earnedScore,
      max_score: totalPossibleMaxScore,
      percentage_score: percentage,
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      is_valid: isValid,
      is_auto_submitted: isAutoSubmit,
      auto_submit_reason: isAutoSubmit ? `Auto-submitted due to ${violationCount} violation(s). Only ${answeredCount} of ${totalQuestions} questions answered.` : null,
      violation_count: violationCount,
      violation_details: {
        copy_paste: session.copy_paste_count || 0,
        right_clicks: session.right_click_count || 0,
        devtools: session.devtools_count || 0,
        screenshots: session.screenshot_count || 0
      },
      completed_at: new Date().toISOString()
    };

    console.log("📦 Saving assessment results:", resultData);

    const { data: result, error: resultError } = await serviceClient
      .from('assessment_results')
      .insert(resultData)
      .select()
      .single();

    if (resultError) {
      console.error("❌ Result save error:", resultError);
      return res.status(500).json({ 
        error: "failed_to_save_results", 
        message: resultError.message 
      });
    }

    console.log("✅ Results saved successfully");

    // Update candidate_assessments
    const { error: candidateError } = await serviceClient
      .from('candidate_assessments')
      .update({
        status: 'completed',
        score: earnedScore,
        max_score: totalPossibleMaxScore,
        percentage: percentage,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', session.user_id)
      .eq('assessment_id', session.assessment_id);

    if (candidateError) {
      console.error("❌ Candidate assessment update error:", candidateError);
    }

    // Get candidate name for notification
    const { data: profile } = await serviceClient
      .from('candidate_profiles')
      .select('full_name, email, created_by')
      .eq('id', session.user_id)
      .single();

    // Create notification for supervisor
    if (profile?.created_by) {
      const notificationMessage = isAutoSubmit
        ? `⚠️ ${profile.full_name || profile.email || 'Candidate'} was AUTO-SUBMITTED due to ${violationCount}/3 violations. Answered: ${answeredCount}/${totalQuestions}. Score: ${Math.round(percentage)}%`
        : `✅ ${profile.full_name || profile.email || 'Candidate'} completed assessment. Score: ${Math.round(percentage)}%`;
      
      await serviceClient
        .from('supervisor_notifications')
        .insert({
          supervisor_id: profile.created_by,
          user_id: session.user_id,
          assessment_id: session.assessment_id,
          result_id: result.id,
          message: notificationMessage,
          status: 'unread',
          priority: isAutoSubmit ? 'high' : 'normal',
          created_at: new Date().toISOString()
        });
      
      console.log("✅ Notification sent to supervisor");
    }

    // Return success response
    return res.status(200).json({
      success: true,
      result_id: result.id,
      score: earnedScore,
      max_score: totalPossibleMaxScore,
      percentage: Math.round(percentage),
      answered_questions: answeredCount,
      total_questions: totalQuestions,
      isAutoSubmitted: isAutoSubmit,
      violationCount: violationCount,
      message: isAutoSubmit 
        ? `⚠️ Assessment auto-submitted due to ${violationCount} violation(s). Score calculated on ${answeredCount} of ${totalQuestions} questions.`
        : `✅ Assessment submitted successfully! Score: ${Math.round(percentage)}%`
    });

  } catch (err) {
    console.error("❌ Fatal error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
