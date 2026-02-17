import { supabase } from "../../supabase/client";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📥 Submit API called with body:", req.body);

  try {
    const { sessionId, user_id, assessment_id } = req.body;
    
    // We need either sessionId or (user_id and assessment_id)
    if (!sessionId && (!user_id || !assessment_id)) {
      return res.status(400).json({ 
        error: "Either sessionId or both user_id and assessment_id required" 
      });
    }

    let userId = user_id;
    let assessmentId = assessment_id;

    // If we have sessionId, get the details from the session
    if (sessionId && !userId) {
      console.log("🔍 Fetching session details for ID:", sessionId);
      
      const { data: session, error: sessionError } = await supabase
        .from('assessment_sessions')
        .select('user_id, assessment_id')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error("❌ Session fetch error:", sessionError);
        return res.status(404).json({ error: "Session not found" });
      }

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      userId = session.user_id;
      assessmentId = session.assessment_id;
      console.log("✅ Session found:", { userId, assessmentId });
    }

    // First, check if already submitted in assessments_completed table
    const { data: existingSubmission, error: checkError } = await supabase
      .from("assessments_completed")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking existing submission:", checkError);
    }

    if (existingSubmission) {
      console.log("⚠️ Assessment already submitted");
      return res.status(400).json({ 
        error: "already_submitted",
        message: "Assessment has already been submitted" 
      });
    }

    // Mark as submitted in assessments_completed table
    console.log("📝 Marking assessment as submitted for user:", userId);
    
    const { data, error } = await supabase
      .from("assessments_completed")
      .insert({
        user_id: userId,
        assessment_id: assessmentId,
        completed_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error("❌ Database error:", error);
      
      // Check for duplicate submission error
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: "already_submitted",
          message: "Assessment has already been submitted" 
        });
      }
      
      return res.status(500).json({ 
        error: "database_error", 
        message: error.message 
      });
    }

    console.log("✅ Assessment submitted successfully");
    
    return res.status(200).json({ 
      success: true,
      message: "Assessment submitted successfully" 
    });

  } catch (err) {
    console.error("❌ Submit assessment error:", err);
    return res.status(500).json({ 
      error: "server_error", 
      message: err.message 
    });
  }
}
