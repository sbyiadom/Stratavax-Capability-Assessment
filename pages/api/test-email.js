// pages/api/test-email.js
// TEMPORARY — for verifying Brevo integration. Delete after confirmed.
// Uses the low-level email.js wrapper directly (not emailService.js).

import { sendEmail } from "../../utils/email";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const recipient = "stratavaxadmin@gmail.com";

  const html = `
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
          <div style="font-size:20px;font-weight:600;margin-bottom:16px;color:#0A1929;">✓ Email Integration Test</div>
          <p>This is a test email from the Stratavax platform.</p>
          <p>If you received this, the Brevo integration is working end-to-end. The notification system is now ready to send:</p>
          <ul style="margin:16px 0;padding-left:20px;color:#334155;">
            <li>Assessment assignment notifications</li>
            <li>Scheduled assessment reminders</li>
            <li>Submission confirmations</li>
          </ul>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://stratavax-capability-assessment.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">Visit Platform</a>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#64748B;text-align:center;">
            If you did not expect this email, you can ignore it.
          </p>
        </div>
        <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
          <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
          <p style="margin:4px 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `STRATAVAX - Email Integration Test

This is a test email from the Stratavax Capability Assessment Platform.

If you received this, the Brevo integration is working end-to-end. The notification system is ready to send:
- Assessment assignment notifications
- Scheduled assessment reminders
- Submission confirmations

Visit the platform:
https://stratavax-capability-assessment.vercel.app

© 2026 Stratavax - Talent Assessment Platform
`;

  const result = await sendEmail({
    to: recipient,
    toName: "Stratavax Admin",
    subject: "✓ Stratavax Email Test — Integration Working",
    html,
    text,
  });

  return res.status(200).json({
    ...result,
    sentTo: recipient,
    timestamp: new Date().toISOString(),
  });
}
