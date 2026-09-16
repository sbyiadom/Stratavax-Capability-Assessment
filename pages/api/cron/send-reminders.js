// pages/api/cron/send-reminders.js
// Phase 3 item 6 — reminder cron.
// Runs daily via Vercel Cron.
// Sends up to 3 reminders to candidates who were scheduled but haven't started:
//   • Reminder 1 — 3 days after scheduled_at
//   • Reminder 2 — 7 days after scheduled_at
//   • Reminder 3 — 14 days after scheduled_at
// Idempotent — uses candidate_assessments.reminder_N_sent_at to avoid duplicates.

import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stratavax-capability-assessment.vercel.app';

// ============================================================
// Reminder cadence in days
// ============================================================
const CADENCE = [3, 7, 14];

// ============================================================
// HTML template for a reminder email
// ============================================================
function buildReminderHtml({ candidateName, assessmentTitle, daysSince, portalUrl }) {
  const tone = daysSince >= 14 ? 'urgent' : daysSince >= 7 ? 'firm' : 'gentle';

  const title = {
    gentle: '⏰ Friendly reminder',
    firm: '📌 Still waiting on you',
    urgent: '🚨 Action needed'
  }[tone];

  const line = {
    gentle: `It's been ${daysSince} days since your assessment was scheduled. Whenever you're ready, please log in and complete it.`,
    firm: `Your assessment has been waiting for ${daysSince} days. Please log in and complete it at your earliest convenience.`,
    urgent: `Your assessment has been pending for ${daysSince} days. Please log in and complete it as soon as possible — your supervisor is waiting on the result.`
  }[tone];

  const accent = { gentle: '#2196F3', firm: '#F59E0B', urgent: '#DC2626' }[tone];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Assessment Reminder</title>
    </head>
    <body style="margin: 0; padding: 20px; background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a202c;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%); padding: 32px 24px; text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: white; letter-spacing: 2px; margin-bottom: 8px;">STRATAVAX</div>
          <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Talent Assessment Platform</div>
        </div>
        <div style="padding: 32px;">
          <div style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #0A1929;">
            Hello, <span style="color: #1E3A5F;">${candidateName || 'Candidate'}</span>
          </div>

          <div style="background: #F5F7FA; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${accent};">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #0A1929;">${title}</div>
            <div style="color: #1a202c; font-weight: 500;">${assessmentTitle}</div>
          </div>

          <p>${line}</p>

          <div style="background: #FFF3E0; border-radius: 10px; padding: 16px; margin: 24px 0; border-left: 4px solid #FF9800;">
            <div style="font-weight: 600; color: #E65100; margin-bottom: 8px;">Reminder</div>
            <ul style="margin: 0; padding-left: 20px; color: #E65100; font-size: 13px;">
              <li>Find a quiet space with stable internet</li>
              <li>Set aside the full time required (see assessment details)</li>
              <li>You can only take the assessment once</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 500;">
              Go to Assessment Portal
            </a>
          </div>

          <p style="margin-top: 24px; font-size: 13px; color: #64748B; text-align: center;">
            If you have any questions, please contact your supervisor.
          </p>
        </div>
        <div style="background: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
          <p style="margin: 4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
          <p style="margin: 4px 0;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildReminderText({ candidateName, assessmentTitle, daysSince, portalUrl }) {
  return `STRATAVAX - Assessment Reminder

Hello ${candidateName || 'Candidate'},

Your assessment "${assessmentTitle}" has been waiting for ${daysSince} days.

Please log in and complete it:
${portalUrl}

If you have any questions, please contact your supervisor.

© 2026 Stratavax - Talent Assessment Platform
`;
}

// ============================================================
// Send one reminder via /api/send-email
// ============================================================
async function sendReminder({ to, candidateName, assessmentTitle, daysSince }) {
  const portalUrl = `${SITE_URL}/login`;
  const subject = daysSince >= 14
    ? `🚨 Action needed: ${assessmentTitle}`
    : daysSince >= 7
      ? `📌 Reminder: ${assessmentTitle} is still pending`
      : `⏰ Friendly reminder: ${assessmentTitle}`;

  const html = buildReminderHtml({ candidateName, assessmentTitle, daysSince, portalUrl });
  const text = buildReminderText({ candidateName, assessmentTitle, daysSince, portalUrl });

  const response = await fetch(`${SITE_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html, text })
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

// ============================================================
// Handler
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      console.warn('[Send Reminders] Unauthorized call');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Send Reminders] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // ------------------------------------------------------------
    // Fetch all unstarted, still-available scheduled assignments
    // with candidate email + assessment title via joins.
    // ------------------------------------------------------------
    const { data: rows, error: fetchErr } = await serviceClient
      .from('candidate_assessments')
      .select(`
        id,
        user_id,
        assessment_id,
        status,
        scheduled_at,
        scheduled_start,
        scheduled_end,
        reminder_1_sent_at,
        reminder_2_sent_at,
        reminder_3_sent_at,
        candidate_profiles:user_id ( full_name, email ),
        assessments:assessment_id ( title )
      `)
      .in('status', ['scheduled', 'unblocked'])
      .is('session_id', null)
      .not('scheduled_at', 'is', null);

    if (fetchErr) {
      console.error('[Send Reminders] fetch error:', fetchErr);
      return res.status(500).json({
        success: false,
        error: `Failed to load assignments: ${fetchErr.message}`
      });
    }

    let reminder1Sent = 0;
    let reminder2Sent = 0;
    let reminder3Sent = 0;
    let skipped = 0;
    const failures = [];

    for (const row of rows || []) {
      const profile = row.candidate_profiles;
      const assessment = row.assessments;

      if (!profile?.email || !assessment?.title) {
        skipped += 1;
        continue;
      }

      const scheduledMs = new Date(row.scheduled_at).getTime();
      const daysSince = Math.floor((now - scheduledMs) / DAY_MS);

      // Which reminder is due (highest tier whose window has passed and not yet sent)?
      let dueIndex = null; // 0, 1, 2
      let dueSentColumn = null;

      for (let i = CADENCE.length - 1; i >= 0; i--) {
        const threshold = CADENCE[i];
        const sentColumn = `reminder_${i + 1}_sent_at`;
        if (daysSince >= threshold && !row[sentColumn]) {
          dueIndex = i;
          dueSentColumn = sentColumn;
          break;
        }
      }

      if (dueIndex === null) {
        skipped += 1;
        continue;
      }

      const daysSinceForMessage = daysSince;

      try {
        await sendReminder({
          to: profile.email,
          candidateName: profile.full_name,
          assessmentTitle: assessment.title,
          daysSince: daysSinceForMessage
        });

        const { error: updateErr } = await serviceClient
          .from('candidate_assessments')
          .update({ [dueSentColumn]: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', row.id);

        if (updateErr) {
          console.error('[Send Reminders] update error for', row.id, updateErr);
          failures.push({ id: row.id, error: updateErr.message });
          continue;
        }

        if (dueIndex === 0) reminder1Sent += 1;
        else if (dueIndex === 1) reminder2Sent += 1;
        else reminder3Sent += 1;

        // Small delay to be gentle with Resend rate limits
        await new Promise((r) => setTimeout(r, 200));
      } catch (sendErr) {
        console.error('[Send Reminders] send error for', row.id, sendErr);
        failures.push({ id: row.id, error: sendErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      reminder_1_sent: reminder1Sent,
      reminder_2_sent: reminder2Sent,
      reminder_3_sent: reminder3Sent,
      skipped,
      failed: failures.length,
      failures: failures.slice(0, 10), // cap response size
      ran_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Send Reminders] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
