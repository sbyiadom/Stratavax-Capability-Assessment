// utils/emailService.js
// Phase 3 item 8 — outbound email helpers.
//
// Used by:
//   • pages/admin/bulk-assign.js          → sendScheduleNotification / sendAssignmentNotification
//   • pages/admin/assign-assessments.js   → sendScheduleNotification / sendAssignmentNotification
//
// Reminder emails are handled by pages/api/cron/send-reminders.js — this file
// does NOT send reminders. It only sends assign-time notifications.
//
// Delivery gating:
//   EMAIL_DELIVERY_ENABLED = "true"  → actually calls /api/send-email
//   anything else (or unset)         → dry run; returns { success: true, dryRun: true }
//                                      without calling /api/send-email.
//
// When the Resend domain lands (Phase 8), flip EMAIL_DELIVERY_ENABLED to "true"
// in Vercel. No code change required.

const SITE_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://stratavax-capability-assessment.vercel.app';

// ============================================================
// Delivery gate (client-safe)
// ============================================================
function deliveryEnabled() {
  if (typeof process === 'undefined') return false;
  return process.env.NEXT_PUBLIC_EMAIL_DELIVERY_ENABLED === 'true';
}

// ============================================================
// Shared HTML shell — matches the cron's visual style
// ============================================================
function shell({ heading, accent, bodyHtml, ctaLabel, ctaUrl }) {
  return `
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
          <div style="font-size:20px;font-weight:600;margin-bottom:16px;color:#0A1929;">${heading}</div>
          ${bodyHtml}
          <div style="text-align:center;margin:24px 0;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">${ctaLabel}</a>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#64748B;text-align:center;">If you have any questions, please contact your supervisor.</p>
        </div>
        <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
          <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
          <p style="margin:4px 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function assessmentBlock(title, accent) {
  return `
    <div style="background:#F5F7FA;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid ${accent};">
      <div style="color:#1a202c;font-weight:500;">${title}</div>
    </div>
  `;
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return String(dateString);
  }
}

// ============================================================
// Internal sender
// ============================================================
async function postEmail({ to, subject, html, text }) {
  const enabled = deliveryEnabled();

  if (!enabled) {
    // Phase 8 pending — do not attempt delivery.
    if (typeof console !== 'undefined') {
      console.log(`[emailService] DRY RUN → would send "${subject}" to ${to}`);
    }
    return { success: true, dryRun: true };
  }

  try {
    const res = await fetch(`${SITE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, text })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, ...data };
  } catch (error) {
    console.error('[emailService] send error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// PUBLIC — sendScheduleNotification
// Fires when a candidate is assigned an assessment WITH a window.
// Candidate becomes status='scheduled' (or 'unblocked' if window already open).
//
// Optional `supervisorName` — if omitted, generic phrasing is used.
// ============================================================
export async function sendScheduleNotification({
  candidateEmail,
  candidateName,
  assessmentTitle,
  scheduledStart,
  scheduledEnd,
  supervisorName
}) {
  if (!candidateEmail || !assessmentTitle) {
    return { success: false, error: 'candidateEmail and assessmentTitle are required' };
  }

  const startFormatted = formatDateTime(scheduledStart);
  const endFormatted = formatDateTime(scheduledEnd);
  const portalUrl = `${SITE_URL}/login`;

  const subject = `📋 Assessment Scheduled: ${assessmentTitle}`;
  const greeting = `Hello, <span style="color:#1E3A5F;">${candidateName || 'Candidate'}</span>`;
  const intro = supervisorName
    ? `Your supervisor <strong>${supervisorName}</strong> has scheduled an assessment for you.`
    : `An assessment has been scheduled for you.`;

  const body = `
    <p>${greeting},</p>
    <p>${intro}</p>
    ${assessmentBlock(assessmentTitle, '#2196F3')}
    <div style="background:#E3F2FD;border-radius:10px;padding:16px;margin:24px 0;border-left:4px solid #2196F3;">
      <div style="font-weight:600;color:#1565C0;margin-bottom:8px;">Schedule</div>
      <div style="font-size:14px;color:#0A1929;margin-bottom:4px;"><strong>Starts:</strong> ${startFormatted || 'To be confirmed'}</div>
      <div style="font-size:14px;color:#0A1929;"><strong>Ends:</strong> ${endFormatted || 'To be confirmed'}</div>
    </div>
    <div style="background:#FFF3E0;border-radius:10px;padding:16px;margin:24px 0;border-left:4px solid #FF9800;">
      <div style="font-weight:600;color:#E65100;margin-bottom:8px;">Important</div>
      <ul style="margin:0;padding-left:20px;color:#E65100;font-size:13px;">
        <li>The assessment is only available during the scheduled window</li>
        <li>You can only take it once</li>
        <li>Find a quiet space with stable internet before you start</li>
      </ul>
    </div>
  `;

  const html = shell({
    heading: greeting,
    accent: '#2196F3',
    bodyHtml: body,
    ctaLabel: 'Go to Assessment Portal',
    ctaUrl: portalUrl
  });

  const text = `STRATAVAX - Assessment Scheduled

Hello ${candidateName || 'Candidate'},

${supervisorName ? `Your supervisor ${supervisorName} has scheduled an assessment for you.` : 'An assessment has been scheduled for you.'}

Assessment: ${assessmentTitle}
Starts: ${startFormatted || 'To be confirmed'}
Ends: ${endFormatted || 'To be confirmed'}

The assessment is only available during the scheduled window.
You can only take it once.

Log in: ${portalUrl}

© 2026 Stratavax - Talent Assessment Platform
`;

  return postEmail({ to: candidateEmail, subject, html, text });
}

// ============================================================
// PUBLIC — sendAssignmentNotification
// Fires when a candidate is assigned an assessment WITHOUT a window
// (status='unblocked' immediately, no scheduled_start/scheduled_end).
// ============================================================
export async function sendAssignmentNotification({
  candidateEmail,
  candidateName,
  assessmentTitle,
  supervisorName
}) {
  if (!candidateEmail || !assessmentTitle) {
    return { success: false, error: 'candidateEmail and assessmentTitle are required' };
  }

  const portalUrl = `${SITE_URL}/login`;
  const subject = `📋 New Assessment Assigned: ${assessmentTitle}`;
  const greeting = `Hello, <span style="color:#1E3A5F;">${candidateName || 'Candidate'}</span>`;
  const intro = supervisorName
    ? `Your supervisor <strong>${supervisorName}</strong> has assigned you an assessment.`
    : `A new assessment has been assigned to you.`;

  const body = `
    <p>${greeting},</p>
    <p>${intro}</p>
    ${assessmentBlock(assessmentTitle, '#16A34A')}
    <div style="background:#E8F5E9;border-radius:10px;padding:16px;margin:24px 0;border-left:4px solid #16A34A;">
      <div style="font-weight:600;color:#2E7D32;margin-bottom:8px;">Ready when you are</div>
      <p style="margin:0;font-size:14px;color:#1B5E20;">You can start this assessment whenever you're ready. It will remain available until your supervisor closes it.</p>
    </div>
    <div style="background:#FFF3E0;border-radius:10px;padding:16px;margin:24px 0;border-left:4px solid #FF9800;">
      <div style="font-weight:600;color:#E65100;margin-bottom:8px;">Before you start</div>
      <ul style="margin:0;padding-left:20px;color:#E65100;font-size:13px;">
        <li>Find a quiet space with stable internet</li>
        <li>Set aside the full time required</li>
        <li>You can only take the assessment once</li>
      </ul>
    </div>
  `;

  const html = shell({
    heading: greeting,
    accent: '#16A34A',
    bodyHtml: body,
    ctaLabel: 'Go to Assessment Portal',
    ctaUrl: portalUrl
  });

  const text = `STRATAVAX - New Assessment Assigned

Hello ${candidateName || 'Candidate'},

${supervisorName ? `Your supervisor ${supervisorName} has assigned you an assessment.` : 'A new assessment has been assigned to you.'}

Assessment: ${assessmentTitle}

You can start whenever you're ready.
You can only take it once.

Log in: ${portalUrl}

© 2026 Stratavax - Talent Assessment Platform
`;

  return postEmail({ to: candidateEmail, subject, html, text });
}
