// pages/api/supervisor/send-candidate-email.js
// Allows a supervisor to email a candidate they are assigned to.
// Enforces scoping — supervisor can only email their own candidates.

import { authorizeRequest } from "../../../utils/apiAuth";
import { sendEmail } from "../../../utils/email";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // 1. Verify Supervisor
    const auth = await authorizeRequest(req, ["supervisor"]);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }
    const { serviceClient, caller } = auth;

    const { candidateId, subject, message } = req.body || {};

    if (!candidateId || !subject || !message) {
      return res.status(400).json({ success: false, error: "Missing required fields (candidateId, subject, message)" });
    }

    // 2. Verify this candidate is assigned to this supervisor
    const { data: assignment, error: assignError } = await serviceClient
      .from("candidate_profiles")
      .select("id, full_name, email, supervisor_id")
      .eq("id", candidateId)
      .eq("supervisor_id", caller.userId)
      .maybeSingle();

    if (assignError || !assignment) {
      return res.status(403).json({ 
        success: false, 
        error: "This candidate is not assigned to you." 
      });
    }

    if (!assignment.email) {
      return res.status(400).json({ success: false, error: "Candidate has no email on file" });
    }

    // 3. Fetch the supervisor's name for the email signature
    const { data: supervisor } = await serviceClient
      .from("supervisor_profiles")
      .select("full_name")
      .eq("id", caller.userId)
      .maybeSingle();

    const supervisorName = supervisor?.full_name || "Your Supervisor";

    // 4. Build HTML
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
            <div style="font-size:18px;font-weight:600;margin-bottom:16px;color:#0A1929;">Hello, ${assignment.full_name}</div>
            <div style="font-size:15px;color:#334155;line-height:1.6;">
              ${htmlMessage}
            </div>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:14px;color:#64748B;">
              Best regards,<br />
              <strong style="color:#0A1929;">${supervisorName}</strong><br />
              Stratavax Assessment Team
            </div>
            <div style="text-align:center;margin-top:32px;">
              <a href="https://stratavax-capability-assessment.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">Log In to Portal</a>
            </div>
          </div>
          <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
            <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
            <p style="margin:4px 0;">This message was sent by ${supervisorName}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Send
    const result = await sendEmail({
      to: assignment.email,
      toName: assignment.full_name,
      subject: subject,
      html: html,
      text: `Hello ${assignment.full_name},\n\n${message}\n\nBest regards,\n${supervisorName}\nStratavax Assessment Team\n\nLog in: https://stratavax-capability-assessment.vercel.app/login`,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    return res.status(200).json({ success: true, messageId: result.messageId });

  } catch (err) {
    console.error("[supervisor/send-candidate-email] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
