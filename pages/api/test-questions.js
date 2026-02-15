import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { assessmentId } = req.query;
    
    if (!assessmentId) {
      return res.status(400).json({ error: "assessmentId is required" });
    }

    const results = {
      assessmentId,
      steps: []
    };

    // Step 1: Check if assessment exists
    const { data: assessment, error: aError } = await supabase
      .from('assessments')
      .select('*, assessment_type:assessment_types(*)')
      .eq('id', assessmentId)
      .maybeSingle();

    results.steps.push({
      step: 1,
      name: "Fetch assessment",
      success: !aError && assessment,
      data: assessment,
      error: aError?.message
    });

    if (!assessment) {
      return res.status(200).json(results);
    }

    // Step 2: Check assessment type
    results.steps.push({
      step: 2,
      name: "Assessment type",
      data: {
        id: assessment.assessment_type_id,
        name: assessment.assessment_type?.name,
        code: assessment.assessment_type?.code
      }
    });

    // Step 3: Try to fetch questions directly with a simple query
    const { data: questions, error: qError } = await supabase
      .from('unique_questions')
      .select('*')
      .eq('assessment_type_id', assessment.assessment_type_id);

    results.steps.push({
      step: 3,
      name: "Fetch unique questions",
      success: !qError,
      count: questions?.length || 0,
      sample: questions?.slice(0, 2),
      error: qError?.message
    });

    // Step 4: If no questions, check if table exists
    if (!questions || questions.length === 0) {
      const { data: tables, error: tError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'unique_questions')
        .maybeSingle();

      results.steps.push({
        step: 4,
        name: "Check if table exists",
        exists: !!tables,
        error: tError?.message
      });
    }

    // Step 5: Try to fetch from legacy questions as fallback
    const { data: legacyQuestions, error: lError } = await supabase
      .from('questions')
      .select('*')
      .eq('assessment_id', assessmentId);

    results.steps.push({
      step: 5,
      name: "Fetch legacy questions",
      count: legacyQuestions?.length || 0,
      sample: legacyQuestions?.slice(0, 2),
      error: lError?.message
    });

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
