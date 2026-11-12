// pages/api/admin/reports/[id]/share.js
// Phase 7G — Secure Report Sharing
//
// POST /api/admin/reports/[id]/share
// Body: { expires_in_days: 7, recipient_email?: "optional@example.com" }
//
// Generates a secure magic link for sharing a report externally.

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const LOG_TAG = "[Report Share]";

// ============================================================
// AUTH + ROLE CHECK (matches export-reports.js)
// ============================================================
async function checkAdminAccess(supabaseAdmin, userId, userMetadata) {
  let isAdmin = false;

  const { data: supervisorProfile } = await supabaseAdmin
    .from("supervisor_profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (supervisorProfile?.role === "admin" && supervisorProfile?.is_active !== false) {
    isAdmin = true;
  }

  if (!isAdmin) {
    const { data: candidateProfile } = await supabaseAdmin
      .from("candidate_profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (candidateProfile?.role === "admin") isAdmin = true;
  }

  if (!isAdmin && userMetadata?.role === "admin") {
    isAdmin = true;
  }

  return isAdmin;
}

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ---------- 1. Authenticate ----------
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const userId = userData.user.id;

    // ---------- 2. Verify Admin Role ----------
    const isAdmin = await checkAdminAccess(supabaseAdmin, userId, userData.user.user_metadata);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    // ---------- 3. Verify Report Exists ----------
    const resultId = req.query.id;
    if (!resultId) {
      return res.status(400).json({ success: false, error: "Report ID required" });
    }

    const { data: report, error: reportErr } = await supabaseAdmin
      .from("assessment_results")
      .select("id, user_id, assessment_id")
      .eq("id", resultId)
      .maybeSingle();

    if (reportErr || !report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    // ---------- 4. Parse Options ----------
    const body = req.body || {};
    const expiresInDays = parseInt(body.expires_in_days, 10) || 7;
    const recipientEmail = (body.recipient_email || "").trim() || null;

    if (expiresInDays < 1 || expiresInDays > 90) {
      return res.status(400).json({ success: false, error: "Expiry must be between 1 and 90 days" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // ---------- 5. Generate Token + Insert ----------
    const shareToken = crypto.randomBytes(32).toString("hex");

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("shared_report_access")
      .insert({
        candidate_id: report.user_id,   // Note: schema uses candidate_id, but report uses user_id
        assessment_id: report.assessment_id,
        granted_by: userId,
        granted_to: null,
        permission: "view",
        expires_at: expiresAt.toISOString(),
        token: shareToken,
        recipient_email: recipientEmail,
      })
      .select("id, token, expires_at")
      .single();

    if (insertErr) {
      console.error(`${LOG_TAG} Insert failed:`, insertErr);
      return res.status(500).json({ success: false, error: "Failed to create share link" });
    }

    // ---------- 6. Optional: Send Email ----------
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stratavax-capability-assessment.vercel.app";
    const shareUrl = `${baseUrl}/shared/${shareToken}`;

    let emailSent = false;
    if (recipientEmail && process.env.RESEND_API_KEY) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Stratavax <onboarding@resend.dev>", // ← Adjust if you have a verified domain
            to: [recipientEmail],
            subject: "Stratavax Assessment Report — Secure Share",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a237e;">Stratavax Assessment Report</h2>
                <p>You have been sent a secure, read-only copy of a candidate assessment report.</p>
                <p style="margin: 30px 0;">
                  <a href="${shareUrl}" style="display:inline-block;padding:14px 28px;background:#1a237e;color:white;border-radius:8px;text-decoration:none;font-weight:600;">View Report</a>
                </p>
                <p style="color: #64748b; font-size: 13px;">This link expires on ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}. Do not forward it to anyone else.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;" />
                <p style="color:#94a3b8;font-size:12px;">Stratavax Talent Assessment Platform</p>
              </div>
            `,
          }),
        });

        if (emailRes.ok) emailSent = true;
        else console.warn(`${LOG_TAG} Resend non-OK:`, await emailRes.text());
      } catch (emailErr) {
        console.error(`${LOG_TAG} Email send failed (non-fatal):`, emailErr);
      }
    }

    // ---------- 7. Return ----------
    return res.status(200).json({
      success: true,
      share_url: shareUrl,
      token: inserted.token,
      expires_at: inserted.expires_at,
      email_sent: emailSent,
      email_target: emailSent ? recipientEmail : null,
    });
  } catch (err) {
    console.error(`${LOG_TAG} Unexpected error:`, err);
    return res.status(500).json({ success: false, error: "An unexpected error occurred" });
  }
}
