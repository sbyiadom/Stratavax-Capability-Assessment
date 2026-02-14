// pages/api/debug-check-responses.js
import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_id, assessment_id, session_id } = req.query;

    // Check if tables exist and have correct structure
    const tables = ['responses', 'assessment_sessions', 'questions', 'answers'];
    const tableInfo = {};

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      tableInfo[table] = {
        exists: !error || error.code !== '42P01',
        error: error ? error.message : null,
        sample: data || null
      };
    }

    // If user_id provided, check their responses
    let userResponses = null;
    if (user_id && assessment_id) {
      const { data, error } = await supabase
        .from("responses")
        .select(`
          *,
          session:assessment_sessions!inner(
            id,
            status
          )
        `)
        .eq("user_id", user_id)
        .eq("assessment_id", assessment_id);

      userResponses = {
        data,
        error: error?.message,
        count: data?.length || 0
      };
    }

    // If session_id provided, check session
    let sessionInfo = null;
    if (session_id) {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .select(`
          *,
          responses (*)
        `)
        .eq("id", session_id)
        .single();

      sessionInfo = {
        data,
        error: error?.message
      };
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      tables: tableInfo,
      userResponses,
      sessionInfo
    });

  } catch (err) {
    console.error("Debug error:", err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
}
