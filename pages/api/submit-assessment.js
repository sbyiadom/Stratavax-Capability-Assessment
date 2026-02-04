import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assessment_id, user_id } = req.body;
    if (!assessment_id || !user_id) {
      return res.status(400).json({ error: "assessment_id and user_id required" });
    }

    const { error } = await supabase.from("assessments").upsert(
      {
        id: assessment_id,
        user_id,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      },
      { onConflict: ["id"] }
    );

    if (error) throw error;

    return res.status(200).json({ message: "Assessment submitted successfully" });
  } catch (err) {
    console.error("Submit assessment error:", err);
    res.status(500).json({ error: err.message });
  }
}
