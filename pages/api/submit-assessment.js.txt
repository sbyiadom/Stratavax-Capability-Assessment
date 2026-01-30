import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assessment_id } = req.body;

    if (!assessment_id) {
      return res.status(400).json({ error: "Assessment ID is required" });
    }

    // Get logged-in user session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user_id = session.user.id;

    // Mark the assessment as submitted
    const { error } = await supabase.from("assessments").upsert(
      [
        {
          id: assessment_id,
          user_id,
          submitted_at: new Date(),
          status: "submitted",
        },
      ],
      { onConflict: ["id"] }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: "Assessment submitted successfully" });
  } catch (err) {
    console.error("Submit assessment error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
