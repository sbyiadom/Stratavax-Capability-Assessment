// pages/api/privacy/requests.js
// GET /api/privacy/requests
//
// Returns the authenticated candidate's own privacy requests.
// Uses service role key to bypass RLS (matches dashboard/profile pattern).
//
// Response:
//   { success: true, requests: [ { id, request_type, status, details,
//                                  requested_at, reviewed_at, completed_at,
//                                  rejection_reason, notes }, ... ] }

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // ---------- 1. Authenticate ----------
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, error: "Missing authorization token" });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid or expired session" });
    }

    const candidateId = userData.user.id;

    // ---------- 2. Fetch candidate's own requests ----------
    const { data: requests, error: fetchError } = await supabaseAdmin
      .from("privacy_requests")
      .select(
        "id, request_type, status, details, requested_at, reviewed_at, completed_at, rejection_reason, notes"
      )
      .eq("candidate_id", candidateId)
      .order("requested_at", { ascending: false });

    if (fetchError) {
      console.error("[privacy/requests] Fetch error:", fetchError);
      return res.status(500).json({
        success: false,
        error: "Failed to load your privacy requests",
      });
    }

    // ---------- 3. Return ----------
    return res.status(200).json({
      success: true,
      requests: requests || [],
    });
  } catch (err) {
    console.error("[privacy/requests] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
    });
  }
}
