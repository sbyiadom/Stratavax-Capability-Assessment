// pages/api/assessment/questions.js - FULL RANDOMIZATION

import { createClient } from "@supabase/supabase-js";

// ============================================================
// HELPER: Shuffle array using Fisher-Yates algorithm
// ============================================================
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// HELPER: Randomize answers for a question
// ============================================================
function randomizeAnswers(question) {
  if (!question || !Array.isArray(question.answers) || question.answers.length === 0) {
    return question;
  }

  // Find which answers are correct (score === 1)
  const correctAnswerIds = new Set(
    question.answers.filter(a => a.score === 1).map(a => a.id)
  );

  // If no correct answers found, return original
  if (correctAnswerIds.size === 0) {
    return question;
  }

  // Shuffle ALL answers
  const shuffledAnswers = shuffleArray(question.answers);

  // Reset scores based on shuffled positions
  const randomizedAnswers = shuffledAnswers.map(answer => ({
    ...answer,
    score: correctAnswerIds.has(answer.id) ? 1 : 0
  }));

  return {
    ...question,
    answers: randomizedAnswers
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { assessmentTypeId, assessmentTypeCode } = req.query;
    if (!assessmentTypeId) {
      return res.status(400).json({ success: false, error: "Missing assessmentTypeId" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // ============================================================
    // STEP 1: Get questions with their answers
    // ============================================================
    const { data: questions, error: questionsError } = await serviceClient
      .from("unique_questions")
      .select(`
        id,
        question_text,
        section,
        subsection,
        display_order,
        unique_answers (
          id,
          answer_text,
          score,
          display_order
        )
      `)
      .eq("assessment_type_id", parseInt(assessmentTypeId, 10))
      .order("display_order", { ascending: true });

    if (questionsError) {
      console.error("Questions error:", questionsError);
      return res.status(500).json({ success: false, error: questionsError.message });
    }

    // ============================================================
    // STEP 2: Format and randomize questions
    // ============================================================
    let formattedQuestions = questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      section: q.section || "General",
      subsection: q.subsection || "",
      display_order: q.display_order || 0,
      answers: (q.unique_answers || []).map((a) => ({
        id: a.id,
        answer_text: a.answer_text,
        score: a.score || 0,
        display_order: a.display_order || 0
      }))
    }));

    // ============================================================
    // STEP 3: Apply randomization for ALL assessments
    // ============================================================
    // Randomize answer options for ALL questions
    formattedQuestions = formattedQuestions.map(q => randomizeAnswers(q));

    // Randomize the order of questions
    formattedQuestions = shuffleArray(formattedQuestions);

    console.log(`[API] Found ${formattedQuestions.length} questions`);
    console.log(`[API] Assessment type code: ${assessmentTypeCode || 'unknown'}`);
    console.log(`[API] Questions randomized: YES`);
    console.log(`[API] Answers randomized: YES`);

    return res.status(200).json({
      success: true,
      questions: formattedQuestions
    });

  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
