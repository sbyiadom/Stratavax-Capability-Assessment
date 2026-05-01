// pages/api/submit-assessment.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token" });
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "server_config_error",
        message: "Missing Supabase environment variables"
      });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    console.log("📤 Processing submission for session:", sessionId);

    // Validate the user token
    const { data: authData, error: authError } = await serviceClient.auth.getUser(accessToken);

    if (authError || !authData?.user) {
      console.error("❌ Auth validation error:", authError);
      return res.status(401).json({
        error: "invalid_token",
        message: "Could not validate user session"
      });
    }

    const authenticatedUserId = authData.user.id;

    // Get session with violation info
    const { data: session, error: sessionError } = await serviceClient
      .from("assessment_sessions")
      .select(
        `
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
      `
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session error:", sessionError);
      return res.status(404).json({ error: "Session not found" });
    }

    // Security check: candidate can only submit own session
    if (session.user_id !== authenticatedUserId) {
      console.error("❌ Unauthorized submit attempt:", {
        authenticatedUserId,
        sessionUserId: session.user_id,
        sessionId
      });

      return res.status(403).json({
        error: "forbidden",
        message: "You cannot submit another user's assessment session"
      });
    }

    if (session.status === "completed") {
      console.log("⚠️ Session already completed");
      return res.status(400).json({ error: "already_submitted" });
    }

    const violationCount = Number(session.violation_count || 0);
    const MAX_VIOLATIONS = 3;
    const isAutoSubmit = violationCount >= MAX_VIOLATIONS;

    console.log(`📊 Violations: ${violationCount}/${MAX_VIOLATIONS}, Auto-submit: ${isAutoSubmit}`);

    // Get assessment
    const { data: assessment, error: assessmentError } = await serviceClient
      .from("assessments")
      .select("assessment_type_id, title")
      .eq("id", session.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      console.error("❌ Assessment error:", assessmentError);
      return res.status(500).json({ error: "Failed to fetch assessment" });
    }

    const isBaseline = assessment.assessment_type_id === 19;

    console.log(`📊 Assessment: ${assessment.title}, Type: ${assessment.assessment_type_id}, isBaseline: ${isBaseline}`);

    // Get all questions and answers for this assessment type
    const { data: allQuestionsData, error: questionsError } = await serviceClient
      .from("unique_questions")
      .select(
        `
        id,
        unique_answers (
          id,
          score
        )
      `
      )
      .eq("assessment_type_id", assessment.assessment_type_id);

    if (questionsError) {
      console.error("❌ Error getting questions:", questionsError);
      return res.status(500).json({
        error: "failed_to_fetch_questions",
        message: questionsError.message
      });
    }

    const totalQuestions = allQuestionsData?.length || Number(session.total_questions || 0);

    if (!totalQuestions || totalQuestions <= 0) {
      return res.status(400).json({
        error: "no_questions_found",
        message: "No questions found for this assessment"
      });
    }

    // Get responses for this session
    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select(
        `
        question_id,
        answer_id
      `
      )
      .eq("session_id", sessionId);

    if (responsesError) {
      console.error("❌ Responses error:", responsesError);
      return res.status(500).json({
        error: "failed_to_fetch_responses",
        message: responsesError.message
      });
    }

    // Group responses by question and count distinct answered questions
    const responsesByQuestion = {};

    for (const response of responses || []) {
      const questionId = response.question_id;

      if (!questionId || response.answer_id === null || response.answer_id === undefined) {
        continue;
      }

      const rawAnswerValue = String(response.answer_id);
      let answerIds = [];

      if (rawAnswerValue.includes(",")) {
        answerIds = rawAnswerValue
          .split(",")
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id));
      } else {
        const parsed = parseInt(rawAnswerValue, 10);
        if (!Number.isNaN(parsed)) {
          answerIds = [parsed];
        }
      }

      if (answerIds.length === 0) {
        continue;
      }

      if (!responsesByQuestion[questionId]) {
        responsesByQuestion[questionId] = [];
      }

      responsesByQuestion[questionId].push(...answerIds);
    }

    const answeredCount = Object.keys(responsesByQuestion).length;

    console.log(`📊 Answered distinct questions: ${answeredCount}, Total Questions: ${totalQuestions}`);

    // Must answer all questions unless auto-submit
    if (!isAutoSubmit && answeredCount < totalQuestions) {
      const unansweredCount = totalQuestions - answeredCount;

      console.log(`❌ Submission rejected: ${unansweredCount} unanswered questions`);

      return res.status(400).json({
        success: false,
        error: "incomplete_assessment",
        message: `Please answer all questions before submitting. ${unansweredCount} question(s) remaining.`,
        unanswered_count: unansweredCount,
        total_questions: totalQuestions,
        answered_count: answeredCount
      });
    }

    // Build question metadata
    const questionMetadata = {};

    for (const question of allQuestionsData || []) {
      const answers = question.unique_answers || [];

      if (isBaseline) {
        const correctAnswerIds = answers
          .filter((a) => Number(a.score || 0) === 1)
          .map((a) => a.id);

        questionMetadata[question.id] = {
          correctAnswerIds,
          isMultipleCorrect: correctAnswerIds.length > 1,
          answerScores: null,
          maxScore: 1
        };
      } else {
        const answerScores = {};
        let maxScore = 0;

        for (const answer of answers) {
          const score = Number(answer.score || 0);
          answerScores[answer.id] = score;

          if (score > maxScore) {
            maxScore = score;
          }
        }

        questionMetadata[question.id] = {
          answerScores,
          maxScore,
          isMultipleCorrect: false,
          correctAnswerIds: null
        };
      }
    }

    // Calculate max possible score
    let totalPossibleMaxScore = 0;

    if (isBaseline) {
      totalPossibleMaxScore = totalQuestions;
    } else {
      for (const question of allQuestionsData || []) {
        const answers = question.unique_answers || [];
        const maxScoreForQuestion = answers.length
          ? Math.max(...answers.map((a) => Number(a.score || 0)))
          : 0;

        totalPossibleMaxScore += maxScoreForQuestion;
      }
    }

    console.log(`📊 Total possible max score: ${totalPossibleMaxScore}`);

    // Calculate earned score
    let earnedScore = 0;

    for (const [questionId, selectedAnswerIdsRaw] of Object.entries(responsesByQuestion)) {
      const selectedAnswerIds = [...new Set(selectedAnswerIdsRaw)];
      const metadata = questionMetadata[questionId];

      if (!metadata) {
        console.warn(`⚠️ No metadata found for question ${questionId}`);
        continue;
      }

      let questionScore = 0;

      if (isBaseline) {
        const { correctAnswerIds, isMultipleCorrect } = metadata;

        if (!correctAnswerIds || correctAnswerIds.length === 0) {
          console.warn(`⚠️ Baseline question ${questionId} has no correct answers defined`);
          questionScore = 0;
        } else if (isMultipleCorrect) {
          const hasAllCorrect = correctAnswerIds.every((correctId) =>
            selectedAnswerIds.includes(correctId)
          );

          const hasNoExtraIncorrect = selectedAnswerIds.every((selectedId) =>
            correctAnswerIds.includes(selectedId)
          );

          questionScore = hasAllCorrect && hasNoExtraIncorrect ? 1 : 0;
        } else {
          const selectedAnswer = selectedAnswerIds[0];
          questionScore = correctAnswerIds.includes(selectedAnswer) ? 1 : 0;
        }
      } else {
        const { answerScores } = metadata;

        for (const answerId of selectedAnswerIds) {
          questionScore += Number(answerScores?.[answerId] || 0);
        }
      }

      earnedScore += questionScore;
    }

    let percentage = 0;

    if (totalPossibleMaxScore > 0) {
      percentage = (earnedScore / totalPossibleMaxScore) * 100;
    }

    percentage = Number(percentage);

    if (Number.isNaN(percentage) || !Number.isFinite(percentage)) {
      percentage = 0;
    }

    percentage = Math.round(percentage * 100) / 100;

    console.log(`📊 Final Score: ${earnedScore}/${totalPossibleMaxScore} (${percentage}%)`);

    const isValid = !isAutoSubmit && answeredCount === totalQuestions;

    const autoSubmitReason = isAutoSubmit
      ? `Auto-submitted due to ${violationCount} violation(s). Only ${answeredCount} of ${totalQuestions} questions answered.`
      : null;

    // Save results first. Use upsert to avoid duplicate session result conflicts.
    const resultData = {
      user_id: session.user_id,
      assessment_id: session.assessment_id,
      session_id: sessionId,
      total_score: Number(earnedScore) || 0,
      max_score: Number(totalPossibleMaxScore) || 0,
      percentage_score: percentage,
      answered_questions: Number(answeredCount) || 0,
      total_questions: Number(totalQuestions) || 0,
      is_valid: Boolean(isValid),
      is_auto_submitted: Boolean(isAutoSubmit),
      auto_submit_reason: autoSubmitReason,
      violation_count: Number(violationCount) || 0,
      violation_details: {
        copy_paste: session.copy_paste_count || 0,
        right_clicks: session.right_click_count || 0,
        devtools: session.devtools_count || 0,
        screenshots: session.screenshot_count || 0
      },
      completed_at: new Date().toISOString()
    };

    console.log("📦 Saving assessment results:", JSON.stringify(resultData, null, 2));

    const { data: result, error: resultError } = await serviceClient
      .from("assessment_results")
      .upsert(resultData, {
        onConflict: "session_id"
      })
      .select()
      .single();

    if (resultError) {
      console.error("❌ Result save error:", resultError);
      return res.status(500).json({
        error: "failed_to_save_results",
        message: resultError.message
      });
    }

    console.log("✅ Results saved successfully:", result?.id);

    // Update session only after result is saved
    const { error: updateError } = await serviceClient
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        auto_submitted: isAutoSubmit,
        auto_submit_reason: autoSubmitReason,
        answered_questions: Number(answeredCount) || 0,
        total_questions: Number(totalQuestions) || 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("❌ Session update error:", updateError);

      return res.status(500).json({
        error: "failed_to_update_session",
        message: updateError.message,
        result_id: result?.id
      });
    }

    console.log("✅ Session updated to completed");

    // Update candidate_assessments
    const { error: candidateError } = await serviceClient
      .from("candidate_assessments")
      .update({
        status: "completed",
        score: Number(earnedScore) || 0,
        max_score: Number(totalPossibleMaxScore) || 0,
        percentage,
        completed_at: new Date().toISOString()
      })
      .eq("user_id", session.user_id)
      .eq("assessment_id", session.assessment_id);

    if (candidateError) {
      console.error("❌ Candidate assessment update error:", candidateError);
    } else {
      console.log("✅ candidate_assessments updated");
    }

    // Get candidate profile for notification
    const { data: profile, error: profileError } = await serviceClient
      .from("candidate_profiles")
      .select("full_name, email, created_by")
      .eq("id", session.user_id)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
    }

    // Notify supervisor if available
    if (profile?.created_by) {
      const candidateName = profile.full_name || profile.email || "Candidate";

      const notificationMessage = isAutoSubmit
        ? `⚠️ ${candidateName} was AUTO-SUBMITTED due to ${violationCount}/3 violations. Answered: ${answeredCount}/${totalQuestions}. Score: ${Math.round(percentage)}%`
        : `✅ ${candidateName} completed assessment. Score: ${Math.round(percentage)}%`;

      const { error: notificationError } = await serviceClient
        .from("supervisor_notifications")
        .insert({
          supervisor_id: profile.created_by,
          user_id: session.user_id,
          assessment_id: session.assessment_id,
          result_id: result.id,
          message: notificationMessage,
          status: "unread",
          priority: isAutoSubmit ? "high" : "normal",
          created_at: new Date().toISOString()
        });

      if (notificationError) {
        console.error("❌ Notification error:", notificationError);
      } else {
        console.log("✅ Notification sent to supervisor");
      }
    }

    return res.status(200).json({
      success: true,
      result_id: result.id,
      score: Number(earnedScore) || 0,
      max_score: Number(totalPossibleMaxScore) || 0,
      percentage: Math.round(percentage),
      percentage_raw: percentage,
      answered_questions: Number(answeredCount) || 0,
      total_questions: Number(totalQuestions) || 0,
      isAutoSubmitted: Boolean(isAutoSubmit),
      violationCount: Number(violationCount) || 0,
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
