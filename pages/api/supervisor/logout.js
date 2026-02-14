import { supabase } from "../../../supabase/client";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { supervisorId, sessionToken, email } = req.body;

    if (!supervisorId) {
      return res.status(400).json({ 
        success: false, 
        error: 'supervisorId is required' 
      });
    }

    // Update supervisor's last activity
    const { error: updateError } = await supabase
      .from("supervisors")
      .update({
        last_activity: new Date().toISOString(),
        last_logout: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", supervisorId);

    if (updateError) {
      console.error("Error updating supervisor:", updateError);
      // Continue with logout even if update fails
    }

    // Log the logout event with more details
    const { error: logError } = await supabase
      .from("supervisor_logs")
      .insert({
        supervisor_id: supervisorId,
        supervisor_email: email || 'unknown',
        action: "logout",
        timestamp: new Date().toISOString(),
        session_token: sessionToken || null,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
        details: {
          method: req.method,
          path: req.url,
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error("Error logging logout:", logError);
      // Continue even if logging fails
    }

    // Clear any supervisor-specific cache if needed
    // This is optional - depends on your caching strategy
    try {
      await supabase
        .from("supervisor_sessions")
        .update({ 
          active: false,
          ended_at: new Date().toISOString()
        })
        .eq("supervisor_id", supervisorId)
        .eq("session_token", sessionToken);
    } catch (cacheError) {
      console.error("Error clearing session:", cacheError);
      // Non-critical, continue
    }

    // Return success with timestamp
    res.status(200).json({ 
      success: true, 
      message: "Logged out successfully",
      timestamp: new Date().toISOString(),
      supervisor_id: supervisorId
    });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error.message 
    });
  }
}
