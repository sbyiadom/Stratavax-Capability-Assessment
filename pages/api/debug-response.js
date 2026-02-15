import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { session_id, user_id, question_id } = req.query;
    
    const results = {};

    // Check if responses table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from("responses")
      .select("*")
      .limit(1);

    results.tableExists = !tableError || tableError.code !== '42P01';
    results.tableError = tableError?.message || null;
    
    if (results.tableExists && tableInfo) {
      results.sampleData = tableInfo;
    }

    // Check foreign key constraints
    if (session_id) {
      const { data: session, error: sessionError } = await supabase
        .from("assessment_sessions")
        .select("id, status, user_id")
        .eq("id", session_id)
        .single();

      results.session = {
        exists: !!session,
        data: session,
        error: sessionError?.message
      };
    }

    if (user_id && question_id) {
      // Check if question exists
      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("id")
        .eq("id", question_id)
        .single();

      results.question = {
        exists: !!question,
        error: questionError?.message
      };
    }

    // Check RLS policies
    const { data: rlsTest, error: rlsError } = await supabase
      .from("responses")
      .select("count", { count: 'exact', head: true });

    results.rlsStatus = {
      canSelect: !rlsError,
      error: rlsError?.message
    };

    return res.status(200).json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
