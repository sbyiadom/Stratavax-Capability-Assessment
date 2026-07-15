// pages/api/assessment/responses.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const { sessionId } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!sessionId) {
    return res.status(400).json({ success: false, error: "Missing sessionId" });
  }

  try {
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

    const { data: responses, error: responsesError } = await serviceClient
      .from("responses")
      .select("question_id, answer_id, initial_answer_id, times_changed")
      .eq("session_id", sessionId);

    if (responsesError) {
      return res.status(500).json({ success: false, error: responsesError.message });
    }

    // Build maps
    const answerMap = {};
    const initialAnswerMap = {};
    const changeCountMap = {};

    responses.forEach(r => {
      if (r.question_id) {
        answerMap[r.question_id] = r.answer_id;
        if (r.initial_answer_id !== null && r.initial_answer_id !== undefined) {
          initialAnswerMap[r.question_id] = r.initial_answer_id;
        }
        changeCountMap[r.question_id] = r.times_changed || 0;
      }
    });

    return res.status(200).json({
      success: true,
      responses: {
        answerMap,
        initialAnswerMap,
        changeCountMap,
        count: responses.length
      }
    });

  } catch (error) {
    console.error("Error fetching responses:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
