import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  const { assessmentId } = req.query;
  
  if (!assessmentId) {
    return res.status(400).json({ error: "Assessment ID required" });
  }

  try {
    // 1. Get total count
    const { count, error: countError } = await supabase
      .from("questions")
      .select("*", { count: 'exact', head: true })
      .eq("assessment_id", assessmentId);

    if (countError) throw countError;

    // 2. Get all questions with their order
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        section,
        question_order,
        assessment_id
      `)
      .eq("assessment_id", assessmentId)
      .order("question_order", { ascending: true });

    if (questionsError) throw questionsError;

    // 3. Check for any missing order values
    const missingOrder = questions?.filter(q => !q.question_order) || [];

    return res.status(200).json({
      assessment_id: assessmentId,
      total_count: count,
      returned_count: questions?.length || 0,
      missing_question_order: missingOrder.length,
      first_5_questions: questions?.slice(0, 5),
      last_5_questions: questions?.slice(-5),
      all_question_orders: questions?.map(q => q.question_order)
    });
  } catch (error) {
    console.error("Debug error:", error);
    return res.status(500).json({ error: error.message });
  }
}
