// pages/api/supervisor/logout.js
import { supabase } from "../../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supervisorId } = req.body;

    // Log the logout event
    if (supervisorId) {
      await supabase
        .from("supervisor_logs")
        .insert({
          supervisor_id: supervisorId,
          action: "logout",
          timestamp: new Date().toISOString()
        });
    }

    // Return success
    res.status(200).json({ 
      success: true, 
      message: "Logged out successfully" 
    });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
