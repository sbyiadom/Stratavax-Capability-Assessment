// utils/email.js
// Low-level Brevo wrapper. Used by pages/api/send-email.js, /api/admin/send-candidate-email,
// /api/supervisor/send-candidate-email, /api/supervisor/unblock-assessment, etc.
//
// ⚠️ SECURITY NOTE: BREVO_API_KEY was shared in chat during development.
// Rotate before going live with real candidates.
//   → Brevo → Settings → SMTP & API → API Keys → delete + regenerate
//   → Update Vercel env var BREVO_API_KEY

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send a single email via Brevo.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.toName - Recipient name (optional)
 * @param {string} options.subject - Subject line
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 * @param {Array<{filename: string, content: Buffer|string}>} options.attachments - Optional attachments
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail({ to, toName, subject, html, text, attachments }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "stratavaxadmin@gmail.com";
  const senderName = "Stratavax Assessment Team";

  if (!apiKey) {
    console.error("[email.js] Missing BREVO_API_KEY");
    return { success: false, error: "Server configuration error: missing API key" };
  }
  if (!to || !subject || !html) {
    return { success: false, error: "Missing required fields (to, subject, html)" };
  }

  try {
    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, ...(toName && { name: toName }) }],
      subject,
      htmlContent: html,
      ...(text && { textContent: text }),
    };

    // ---- Attachments ----
    // Brevo expects each attachment as: { name: string, content: base64-string }
    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.attachment = attachments
        .filter((att) => att && att.filename && att.content)
        .map((att) => ({
          name: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString("base64")
            : String(att.content), // assume caller already base64-encoded if string
        }));
    }

    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[email.js] Brevo error:", data);
      return { success: false, error: data.message || `HTTP ${res.status}` };
    }
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error("[email.js] Fetch error:", err);
    return { success: false, error: err.message };
  }
}
