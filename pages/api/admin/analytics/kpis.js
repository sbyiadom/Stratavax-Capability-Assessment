// pages/api/admin/analytics/kpis.js
// Phase 6: Recruitment KPIs for Admin Dashboard.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Same auth check as other admin routes
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
    // 1. Authenticate
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) return res.status(401).json({ success: false, error: "Invalid token" });

    // 2. Verify Admin Role
    const isAdmin = await checkAdminAccess(supabaseAdmin, userData.user.id, userData.user.user_metadata);
    if (!isAdmin) return res.status(403).json({ success: false, error: "Admin access required" });

    // 3. Fetch Data concurrently
    const [
      { count: totalCandidates },
      { count: totalAssessments },
      { data: results },
      { data: sharedLinks },
      { data: candidatesData }
    ] = await Promise.all([
      supabaseAdmin.from("candidate_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("assessment_results").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("assessment_results").select("percentage_score, recommendation, completed_at, assessment_id"),
      supabaseAdmin.from("shared_report_access").select("expires_at"),
      supabaseAdmin.from("candidate_profiles").select("created_at")
    ]);

    // 4. Calculate KPIs
    let totalScore = 0;
    let highestScore = 0;
    let lowestScore = 100;
    let recommendedCount = 0;
    let rejectedCount = 0;

    (results || []).forEach(r => {
      const score = Number(r.percentage_score) || 0;
      totalScore += score;
      if (score > highestScore) highestScore = score;
      if (score < lowestScore) lowestScore = score;

      if (r.recommendation === "Highly Recommended" || r.recommendation === "Recommended") {
        recommendedCount++;
      } else if (r.recommendation === "Not Recommended") {
        rejectedCount++;
      }
    });

    const averageScore = results?.length > 0 ? (totalScore / results.length).toFixed(1) : 0;
    const recommendationRate = results?.length > 0 ? ((recommendedCount / results.length) * 100).toFixed(1) : 0;

    // Count active shared links (expires_at > now)
    const activeLinks = (sharedLinks || []).filter(link => new Date(link.expires_at) > new Date()).length;

    // Calculate candidate growth (new candidates in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCandidatesLast30Days = (candidatesData || []).filter(c => new Date(c.created_at) > thirtyDaysAgo).length;

    // 5. Return the payload
    return res.status(200).json({
      success: true,
      kpis: {
        totalCandidates: totalCandidates || 0,
        newCandidatesLast30Days,
        totalAssessments: totalAssessments || 0,
        averageScore,
        highestScore,
        lowestScore,
        recommendationRate,
        activeSharedLinks: activeLinks,
      }
    });

  } catch (err) {
    console.error("[Analytics KPIs] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
