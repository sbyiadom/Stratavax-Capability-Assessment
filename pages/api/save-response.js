// pages/api/save-response.js
import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { assessment_id, question_id, answer_id } = req.body;

    if (!assessment_id || !question_id || !answer_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get logged-in user
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user_id = session.user.id;

    // Save or update the response
    const { error } = await supabase.from("responses").upsert(
      [
        {
          assessment_id,
          question_id,
          answer_id,
          user_id,
        },
      ],
      { onConflict: ["assessment_id", "question_id", "user_id"] }
    );

    if (error) throw error;

    return res.status(200).json({ message: "Response saved successfully" });
  } catch (err) {
    console.error("Save response error:", err);
    return res.status(500).json({ error: "Failed to save response" });
  }
}
