// pages/api/admin/analytics/funnel.js
// Phase 6 Extension: Assessment Completion Funnel Analytics.
// Uses defensive filtering to exclude legacy pre-Phase-8 data.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Adjust this if you deploy to a different date
const CLEAN_DATA_CUTOFF = "2026-08-01T00:00:00Z";

async function checkAdminAccess(supabaseAdmin, userId, userMetadata) {
  let isAdmin = false;
  const { data: supervisorProfile } = await supabaseAdmin
    .from("supervisor_profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (supervisorProfile?.role === "admin" && supervisorProfile?.is_active !== false) isAdmin = true;
  if (!isAdmin && userMetadata?.role === "admin") isAdmin = true;
  return isAdmin;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // 1. Auth
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) return res.status(401).json({ success: false, error: "Invalid token" });

    const isAdmin = await checkAdminAccess(supabaseAdmin, userData.user.id, userData.user.user_metadata);
    if (!isAdmin) return res.status(403).json({ success: false, error: "Admin access required" });

    // 2. Fetch all sessions (excluding legacy pre-Phase-8 data)
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from("assessment_sessions")
      .select("id, status, started_at, completed_at, time_spent_seconds, total_time_spent, current_question_index, total_questions, answered_questions, assessment_id, assessment_type_id")
      .gte("started_at", CLEAN_DATA_CUTOFF);

    if (sessErr) {
      console.error("[Funnel API] Session fetch error:", sessErr);
      return res.status(500).json({ success: false, error: "Failed to load sessions" });
    }

    const cleanSessions = sessions || [];

    // 3. Compute the funnel
    const totalStarted = cleanSessions.length;
    const completed = cleanSessions.filter(s => s.status === "completed");
    const inProgress = cleanSessions.filter(s => s.status === "in_progress");
    const abandoned = cleanSessions.filter(s => s.status === "in_progress" && 
      s.started_at && new Date(s.started_at) < new Date(Date.now() - 24 * 60 * 60 * 1000));
    const completedCount = completed.length;
    const inProgressCount = inProgress.length;
    const completionRate = totalStarted > 0 ? ((completedCount / totalStarted) * 100).toFixed(1) : 0;

    // 4. Abandonment map — where do candidates stop?
    const stopPositions = {};
    inProgress.forEach(s => {
      const idx = s.current_question_index || 0;
      if (idx > 0) {
        // Bucket into ranges of 10 for cleaner visualization
        const bucket = Math.floor(idx / 10) * 10;
        const label = `Q${bucket + 1}-${bucket + 10}`;
        stopPositions[label] = (stopPositions[label] || 0) + 1;
      }
    });

    // Convert to sorted array
    const abandonmentChart = Object.keys(stopPositions)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, ""), 10);
        const numB = parseInt(b.replace(/[^\d]/g, ""), 10);
        return numA - numB;
      })
      .map(label => ({ range: label, count: stopPositions[label] }));

    // 5. Engagement time — use time_spent_seconds, fallback to total_time_spent
    const completedWithTime = completed.filter(s => 
      (Number(s.time_spent_seconds) > 0) || (Number(s.total_time_spent) > 0)
    );

    const avgEngagementSeconds = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, s) => {
          const seconds = Number(s.time_spent_seconds) || Number(s.total_time_spent) || 0;
          return sum + seconds;
        }, 0) / completedWithTime.length
      : 0;

    const avgEngagementMinutes = (avgEngagementSeconds / 60).toFixed(1);

    // 6. Data health
    const sessionsWithZeroTime = completed.filter(s => 
      (Number(s.time_spent_seconds) || 0) === 0 && 
      (Number(s.total_time_spent) || 0) === 0
    ).length;

    const dataHealthWarning = completed.length > 0 && (sessionsWithZeroTime / completed.length) > 0.1;

    // 7. Return
    return res.status(200).json({
      success: true,
      funnel: {
        totalStarted,
        completed: completedCount,
        inProgress: inProgressCount,
        abandoned: abandoned.length,
        completionRate: Number(completionRate),
        avgEngagementMinutes: Number(avgEngagementMinutes),
        abandonmentChart,
        dataHealth: {
          sessionsWithZeroTime,
          totalCompleted: completed.length,
          warning: dataHealthWarning,
        },
        cutoffDate: CLEAN_DATA_CUTOFF,
      },
    });

  } catch (err) {
    console.error("[Funnel API] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
