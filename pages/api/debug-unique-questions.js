import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assessmentId } = req.query;

    if (!assessmentId) {
      return res.status(400).json({ error: "assessmentId is required" });
    }

    const results = {};

    // 1. Check if assessment exists
    const { data: assessment, error: aError } = await supabase
      .from('assessments')
      .select('id, title, assessment_type_id')
      .eq('id', assessmentId)
      .single();

    results.assessment = {
      data: assessment,
      error: aError?.message
    };

    if (assessment) {
      // 2. Check assessment type
      const { data: assessmentType, error: atError } = await supabase
        .from('assessment_types')
        .select('*')
        .eq('id', assessment.assessment_type_id)
        .single();

      results.assessmentType = {
        data: assessmentType,
        error: atError?.message
      };

      // 3. Check unique_questions for this assessment type
      const { data: uniqueQuestions, error: uqError } = await supabase
        .from('unique_questions')
        .select(`
          id,
          section,
          subsection,
          question_text,
          display_order
        `)
        .eq('assessment_type_id', assessment.assessment_type_id)
        .order('display_order');

      results.uniqueQuestions = {
        count: uniqueQuestions?.length || 0,
        sample: uniqueQuestions?.slice(0, 3),
        error: uqError?.message
      };

      // 4. If questions exist, check answers for first question
      if (uniqueQuestions && uniqueQuestions.length > 0) {
        const { data: answers, error: ansError } = await supabase
          .from('unique_answers')
          .select('*')
          .eq('question_id', uniqueQuestions[0].id);

        results.sampleAnswers = {
          question_id: uniqueQuestions[0].id,
          count: answers?.length || 0,
          sample: answers?.slice(0, 3),
          error: ansError?.message
        };
      }
    }

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
