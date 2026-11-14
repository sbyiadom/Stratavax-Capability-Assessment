// pages/api/admin/send-candidate-email.js
// Allows an admin to send a custom email to a specific candidate.

import { createClient } from "@supabase/supabase-js";
import { authorizeRequest } from "../../../utils/apiAuth";
import { sendEmail } from "../../../utils/email";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // 1. Verify Admin
    const auth = await authorizeRequest(req, ["admin"]);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }
    const { serviceClient } = auth;

    const { candidateId, subject, message } = req.body || {};

    if (!candidateId || !subject || !message) {
      return res.status(400).json({ success: false, error: "Missing required fields (candidateId, subject, message)" });
    }

    // 2. Fetch Candidate
    const { data: candidate, error: candError } = await serviceClient
      .from("candidate_profiles")
      .select("full_name, email")
      .eq("id", candidateId)
      .maybeSingle();

    if (candError || !candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }
    if (!candidate.email) {
      return res.status(400).json({ success: false, error: "Candidate has no email on file" });
    }

    // 3. Build HTML (Simple wrapper to preserve line breaks)
    const htmlMessage = message.replace(/\n/g, "<br />");
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a202c;">
        <div style="max-width:550px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);padding:32px 24px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:white;letter-spacing:2px;margin-bottom:8px;">STRATAVAX</div>
            <div style="color:rgba(255,255,255,0.8);font-size:14px;">Talent Assessment Platform</div>
          </div>
          <div style="padding:32px;">
            <div style="font-size:18px;font-weight:600;margin-bottom:16px;color:#0A1929;">Hello, ${candidate.full_name}</div>
            <div style="font-size:15px;color:#334155;line-height:1.6;">
              ${htmlMessage}
            </div>
            <div style="text-align:center;margin-top:32px;">
              <a href="https://stratavax-capability-assessment.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">Log In to Portal</a>
            </div>
          </div>
          <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
            <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Send Email
    const result = await sendEmail({
      to: candidate.email,
      toName: candidate.full_name,
      subject: subject,
      html: html,
      text: `Hello ${candidate.full_name},\n\n${message}\n\nLog in: https://stratavax-capability-assessment.vercel.app/login`,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, messageId: result.messageId });

  } catch (err) {
    console.error("[send-candidate-email] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
