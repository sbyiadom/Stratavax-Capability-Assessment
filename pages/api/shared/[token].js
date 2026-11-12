// pages/api/shared/[token].js
// GET /api/shared/[token]
// Public endpoint — no authentication required.
// Validates the token, checks expiry, and returns the report data.

import { createClient } from "@supabase/supabase-js";

// We reuse the same helper functions from the admin reports API 
// to ensure the shared report looks exactly like the admin report.
function getReportData(result) {
  const rawReportData = result?.report_data;
  if (!rawReportData) return {};
  if (typeof rawReportData === 'object') return rawReportData;
  if (typeof rawReportData === 'string') {
    try {
      const parsed = JSON.parse(rawReportData);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ success: false, error: "Invalid token format" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Verify Token and Expiry
    const { data: shareAccess, error: shareError } = await supabaseAdmin
      .from("shared_report_access")
      .select("id, candidate_id, assessment_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (shareError || !shareAccess) {
      return res.status(404).json({ success: false, error: "Link is invalid or has been revoked" });
    }

    if (shareAccess.expires_at && new Date(shareAccess.expires_at) < new Date()) {
      return res.status(403).json({ success: false, error: "This link has expired" });
    }

    // 2. Fetch the assessment result
    // Note: The shared_report_access table uses candidate_id and assessment_id,
    // but we need the actual result_id. We'll find the most recent result for this candidate + assessment.
    const { data: results, error: resultErr } = await supabaseAdmin
      .from("assessment_results")
      .select("*")
      .eq("user_id", shareAccess.candidate_id)
      .eq("assessment_id", shareAccess.assessment_id)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (resultErr || !results || results.length === 0) {
      return res.status(404).json({ success: false, error: "Report data not found" });
    }

    const result = results[0];

    // 3. Fetch candidate profile
    const { data: profile } = await supabaseAdmin
      .from("candidate_profiles")
      .select("full_name, email, university, programme, graduation_year, preferred_department")
      .eq("id", shareAccess.candidate_id)
      .maybeSingle();

    // 4. Fetch assessment details (for the title and type)
    const { data: assessment } = await supabaseAdmin
      .from("assessments")
      .select("title, assessment_type_id")
      .eq("id", shareAccess.assessment_id)
      .maybeSingle();

    let assessmentType = null;
    if (assessment?.assessment_type_id) {
      const { data: type } = await supabaseAdmin
        .from("assessment_types")
        .select("code, name")
        .eq("id", assessment.assessment_type_id)
        .maybeSingle();
      assessmentType = type;
    }

    // 5. Build the enriched report payload (same shape as admin reports)
    const parsedReportData = getReportData(result);
    const isNationalService = assessmentType?.code === 'national_service' || assessment?.title === 'National Service Recruitment Assessment';

    const reportPayload = {
      id: result.id,
      candidate_name: profile?.full_name || 'Unknown',
      candidate_email: profile?.email || '',
      university: profile?.university || '',
      programme: profile?.programme || '',
      graduation_year: profile?.graduation_year || '',
      preferred_department: profile?.preferred_department || '',
      
      assessment_title: assessment?.title || 'Unknown',
      assessment_type_code: assessmentType?.code || null,
      assessment_type_name: assessmentType?.name || 'General',
      isNationalService,

      workplace_readiness: result.workplace_readiness || 0,
      intellectual_capability: result.intellectual_capability || 0,
      percentage_score: result.percentage_score || 0,
      overallScore: result.percentage_score || 0,
      category_scores: result.category_scores || [],
      recommendation: result.recommendation || null,
      
      completed_at: result.completed_at,
      report_data: parsedReportData,
    };

    // 6. Return
    return res.status(200).json({
      success: true,
      report: reportPayload,
      expires_at: shareAccess.expires_at,
    });

  } catch (err) {
    console.error("[Shared Report API] Unexpected error:", err);
    return res.status(500).json({ success: false, error: "An unexpected error occurred" });
  }
}
