// pages/api/assessment/questions.js - FIXED VERSION

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { assessmentTypeId } = req.query;
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
    // STEP 2: Format the response
    // ============================================================
    const formattedQuestions = questions.map((q) => ({
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

    console.log(`[API] Found ${formattedQuestions.length} questions with answers`);

    return res.status(200).json({
      success: true,
      questions: formattedQuestions
    });

  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
