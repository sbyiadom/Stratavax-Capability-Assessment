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

    // 1. Check question_instances
    const { data: instances, error: instancesError } = await supabase
      .from("question_instances")
      .select(`
        id,
        assessment_id,
        display_order,
        question_bank_id
      `)
      .eq("assessment_id", assessmentId);

    results.instances = {
      count: instances?.length || 0,
      data: instances,
      error: instancesError?.message
    };

    // 2. If instances exist, check one question_bank
    if (instances && instances.length > 0) {
      const sampleBankId = instances[0].question_bank_id;
      
      const { data: questionBank, error: bankError } = await supabase
        .from("question_banks")
        .select(`
          id,
          question_text,
          section,
          subsection,
          answer_banks (*)
        `)
        .eq("id", sampleBankId)
        .single();

      results.sampleQuestionBank = {
        data: questionBank,
        error: bankError?.message
      };
    }

    // 3. Check if the assessment exists
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, title, assessment_type_id")
      .eq("id", assessmentId)
      .single();

    results.assessment = {
      data: assessment,
      error: assessmentError?.message
    };

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
