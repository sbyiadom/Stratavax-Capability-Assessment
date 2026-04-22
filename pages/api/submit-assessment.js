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

    const token = authHeader.replace('Bearer ', '');
    
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
    const isAutoSubmitted = violationCount >= MAX_VIOLATIONS;

    console.log(`📊 Violations: ${violationCount}/${MAX_VIOLATIONS}, Auto-submit: ${isAutoSubmitted}`);

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

    if (!responses || responses.length === 0) {
      console.error("❌ No responses found");
      return res.status(400).json({ error: "No responses found" });
    }

    console.log(`✅ Found ${responses.length} responses`);

    // Get assessment type for max score calculation
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('assessment_type_id')
      .eq('id', session.assessment_id)
      .single();

    if (assessmentError) {
      console.error("❌ Assessment error:", assessmentError);
      return res.status(500).json({ error: "Failed to fetch assessment" });
    }

    // ===== CRITICAL FIX: Calculate max score properly =====
    async function calculateMaxScore(assessmentTypeId) {
      if (!assessmentTypeId) {
        console.error("❌ No assessment_type_id provided");
        return 0;
      }
      
      // Get all questions for this assessment type
      const { data: questions, error: questionsError } = await serviceClient
        .from('unique_questions')
        .select(`
          id,
          unique_answers (score)
        `)
        .eq('assessment_type_id', assessmentTypeId);
      
      if (questionsError) {
        console.error("❌ Error fetching questions:", questionsError);
        return 0;
      }
      
      if (!questions || questions.length === 0) {
        console.error("❌ No questions found for assessment_type_id:", assessmentTypeId);
        return 0;
      }
      
      console.log(`📊 Found ${questions.length} total questions for max score calculation`);
      
      let maxScore = 0;
      let questionsWithNoAnswers = 0;
      
      for (const question of questions) {
        const scores = (question.unique_answers || []).map(a => a.score || 0);
        
        if (scores.length === 0) {
          questionsWithNoAnswers++;
          maxScore += 5; // Default 5 points per question
          console.warn(`⚠️ Question ${question.id} has no answers, defaulting to 5 points`);
        } else {
          const questionMax = Math.max(...scores);
          maxScore += questionMax;
        }
      }
      
      if (questionsWithNoAnswers > 0) {
        console.warn(`⚠️ ${questionsWithNoAnswers} questions had no answers, using default 5 points each`);
      }
      
      console.log(`📊 Calculated max score: ${maxScore}`);
      return maxScore;
    }

    let trueMaxScore = await calculateMaxScore(assessment.assessment_type_id);
    
    // Fallback if calculation failed
    if (!trueMaxScore || trueMaxScore === 0) {
      console.warn("⚠️ Max score calculation failed, using fallback");
      const totalQuestions = session.total_questions || 100;
      trueMaxScore = totalQuestions * 5;
      console.log(`📊 Fallback max score: ${trueMaxScore}`);
    }

    // Calculate earned score
    let totalScore = 0;
    for (const response of responses) {
      totalScore += response.unique_answers?.score || 0;
    }

    // Calculate percentage based on TRUE max score
    let percentage = 0;
    if (trueMaxScore > 0) {
      percentage = (totalScore / trueMaxScore) * 100;
    }

    console.log(`📊 Score: ${totalScore}/${trueMaxScore} = ${percentage.toFixed(2)}%`);
    console.log(`📊 Violations: ${violationCount}/${MAX_VIOLATIONS}`);

    // Determine if result is valid
    const isValid = violationCount < MAX_VIOLATIONS;

    // Update session to completed
    const { error: updateError } = await serviceClient
      .from('assessment_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        auto_submitted: isAutoSubmitted,
        auto_submit_reason: isAutoSubmitted ? `Auto-submitted due to ${violationCount} violation(s)` : null,
        answered_questions: responses.length,
        total_questions: Math.round(trueMaxScore / 5)
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
      total_score: totalScore,
      max_score: trueMaxScore,
      percentage_score: percentage,
      is_valid: isValid,
      is_auto_submitted: isAutoSubmitted,
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
      // Still return success since we have the score
      return res.status(200).json({
        success: true,
        score: totalScore,
        max_score: trueMaxScore,
        percentage: Math.round(percentage),
        isAutoSubmitted: isAutoSubmitted,
        violationCount: violationCount,
        warning: "Score saved but detailed results had issues",
        message: isAutoSubmitted 
          ? `⚠️ Assessment auto-submitted due to ${violationCount} violation(s). Score: ${Math.round(percentage)}%`
          : `✅ Assessment submitted successfully! Score: ${Math.round(percentage)}%`
      });
    }

    console.log("✅ Results saved successfully");

    // Update candidate_assessments
    const { error: candidateError } = await serviceClient
      .from('candidate_assessments')
      .update({
        status: 'completed',
        score: totalScore,
        max_score: trueMaxScore,
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

    // Create notification for supervisor if there are violations
    if (profile?.created_by && violationCount > 0) {
      const notificationMessage = isAutoSubmitted
        ? `⚠️ ${profile.full_name || profile.email || 'Candidate'} was AUTO-SUBMITTED due to ${violationCount}/3 violations. Score: ${Math.round(percentage)}%`
        : `⚠️ ${profile.full_name || profile.email || 'Candidate'} completed assessment with ${violationCount} violation(s). Score: ${Math.round(percentage)}%`;
      
      await serviceClient
        .from('supervisor_notifications')
        .insert({
          supervisor_id: profile.created_by,
          user_id: session.user_id,
          assessment_id: session.assessment_id,
          result_id: result.id,
          message: notificationMessage,
          status: 'unread',
          priority: isAutoSubmitted ? 'high' : 'normal',
          created_at: new Date().toISOString()
        });
      
      console.log("✅ Notification sent to supervisor");
    }

    // Return success response
    return res.status(200).json({
      success: true,
      result_id: result.id,
      score: totalScore,
      max_score: trueMaxScore,
      percentage: Math.round(percentage),
      isAutoSubmitted: isAutoSubmitted,
      violationCount: violationCount,
      message: isAutoSubmitted 
        ? `⚠️ Assessment auto-submitted due to ${violationCount} violation(s). Score: ${Math.round(percentage)}%`
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
