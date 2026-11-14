// pages/api/send-email.js
// Sends email via Brevo. Supports two modes:
//   1. Caller provides raw HTML/text (used by utils/emailService.js)
//   2. Legacy callers pass structured data (candidateName, assessmentTitle, etc.)
//      and we build the scheduled-assessment template for them.
//
// ⚠️ BREVO_API_KEY was shared in chat during development. Rotate before
// going live with real candidates.

import { sendEmail } from "../../utils/email";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const {
    to,
    subject,
    html: callerHtml,
    text: callerText,
    candidateName,
    assessmentTitle,
    scheduledStart,
    scheduledEnd,
    supervisorName,
  } = req.body || {};

  if (!to || !subject) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: to and subject are required",
    });
  }

  try {
    let emailHtml = callerHtml;
    let emailText = callerText;

    // ---------- Fallback: build scheduled-assessment template ----------
    if (!emailHtml) {
      const formatDateTime = (dateString) => {
        if (!dateString) return "Not specified";
        try {
          return new Date(dateString).toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          });
        } catch {
          return String(dateString);
        }
      };

      const startFormatted = formatDateTime(scheduledStart);
      const endFormatted = formatDateTime(scheduledEnd);

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#1a202c;">
          <div style="max-width:550px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);padding:32px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:white;letter-spacing:2px;margin-bottom:8px;">STRATAVAX</div>
              <div style="color:rgba(255,255,255,0.8);font-size:14px;">Talent Assessment Platform</div>
            </div>
            <div style="padding:32px;">
              <div style="font-size:20px;font-weight:600;margin-bottom:16px;color:#0A1929;">
                Hello, <span style="color:#1E3A5F;">${candidateName || "Candidate"}</span>
              </div>
              <p>Your supervisor <strong>${supervisorName || "Your supervisor"}</strong> has scheduled an assessment for you.</p>
              <div style="background:#F5F7FA;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #2196F3;">
                <div style="font-weight:600;font-size:16px;margin-bottom:16px;color:#0A1929;">📋 Assessment Details</div>
                <div style="padding:10px 0;border-bottom:1px solid #E2E8F0;">
                  <span style="font-weight:500;color:#64748B;">Assessment:</span>
                  <span style="color:#1a202c;font-weight:500;">${assessmentTitle || "N/A"}</span>
                </div>
                <div style="padding:10px 0;border-bottom:1px solid #E2E8F0;">
                  <span style="font-weight:500;color:#64748B;">Start Time:</span>
                  <span style="color:#1a202c;font-weight:500;">${startFormatted}</span>
                </div>
                <div style="padding:10px 0;border-bottom:1px solid #E2E8F0;">
                  <span style="font-weight:500;color:#64748B;">End Time:</span>
                  <span style="color:#1a202c;font-weight:500;">${endFormatted}</span>
                </div>
              </div>
              <div style="background:#FFF3E0;border-radius:10px;padding:16px;margin:24px 0;border-left:4px solid #FF9800;">
                <div style="font-weight:600;color:#E65100;margin-bottom:12px;">⚠️ Important Information</div>
                <ul style="margin:0;padding-left:20px;color:#E65100;font-size:13px;">
                  <li>You can only take this assessment ONCE</li>
                  <li>The assessment is only available during the scheduled window</li>
                  <li>Your answers are auto-saved as you progress</li>
                </ul>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="https://stratavax-capability-assessment.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">Go to Assessment Portal</a>
              </div>
            </div>
            <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
              <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
              <p style="margin:4px 0;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!emailText) {
        emailText = `STRATAVAX - Assessment Scheduled

Hello ${candidateName || "Candidate"},

Your supervisor ${supervisorName || "Your supervisor"} has scheduled an assessment for you.

Assessment: ${assessmentTitle || "N/A"}
Start Time: ${startFormatted}
End Time: ${endFormatted}

You can only take this assessment ONCE.

Go to the assessment portal:
https://stratavax-capability-assessment.vercel.app/login
`;
      }
    }

    // ---------- Send via Brevo ----------
    const result = await sendEmail({
      to,
      toName: candidateName,
      subject,
      html: emailHtml,
      text: emailText,
    });

    if (!result.success) {
      console.error("[Send Email] Brevo error:", result.error);
      return res.status(500).json({ success: false, error: result.error });
    }

    console.log("[Send Email] Sent:", result.messageId);
    return res.status(200).json({ success: true, messageId: result.messageId });

  } catch (error) {
    console.error("[Send Email] Unhandled error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
