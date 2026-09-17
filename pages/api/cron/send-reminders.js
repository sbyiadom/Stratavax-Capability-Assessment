// pages/api/cron/send-reminders.js
// Phase 3 item 8 — reminder cron, revised.
//
// Runs daily via Vercel Cron at 08:00.
//
// Five idempotent tracks, all in one run:
//
//   A. Pre-open          — status='scheduled', window opens within 24h
//                          → "your assessment opens tomorrow"
//   B. Window-open       — status='unblocked', scheduled_start passed
//                          within the last 24h (auto flip OR manual late
//                          unblock) → "your assessment is now available"
//   C. Idle nudge        — status='unblocked', session_id IS NULL,
//                          3–7 days since the candidate could start
//                          → "still pending"
//   D. Second nudge      — same, 7–14 days since start, windowed rows
//                          ONLY → "firmer reminder"
//   E. Post-window       — status='blocked', scheduled_end passed,
//                          session_id IS NULL → "your window closed"
//
// Idempotency columns on candidate_assessments:
//   reminder_1_sent_at              (track C)
//   reminder_2_sent_at              (track D)
//   reminder_3_sent_at              (legacy — not used; retained for compat)
//   pre_open_reminder_sent_at       (track A)
//   window_open_reminder_sent_at    (track B)
//   window_closed_reminder_sent_at  (track E)
//
// The 3/7/14-day cadence now keys off max(scheduled_start, unblocked_at),
// NOT scheduled_at. A candidate cannot be "idle" before they can start.

import { createClient } from '@supabase/supabase-js';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://stratavax-capability-assessment.vercel.app';

const DAY_MS = 24 * 60 * 60 * 1000;

// ============================================================
// HTML / text templates
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
  `.replace(/\$\{accent\}/g, accent);
}

function assessmentBlock(title, accent) {
  return `
    <div style="background:#F5F7FA;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid ${accent};">
      <div style="color:#1a202c;font-weight:500;">${title}</div>
    </div>
  `;
}

function buildEmail(track, { candidateName, assessmentTitle, daysSince }) {
  const portalUrl = `${SITE_URL}/login`;
  const hello = `Hello, <span style="color:#1E3A5F;">${candidateName || 'Candidate'}</span>`;

  switch (track) {
    case 'A': {
      const subject = `⏰ Opens tomorrow: ${assessmentTitle}`;
      const body = `
        <p>${hello},</p>
        <p>Your assessment opens tomorrow. Please log in and complete it while the window is open.</p>
        ${assessmentBlock(assessmentTitle, '#2196F3')}
        <div style="background:#FFF3E0;border-radius:10px;padding:16px;margin:24px 0;border-left:4px solid #FF9800;">
          <div style="font-weight:600;color:#E65100;margin-bottom:8px;">Before you start</div>
          <ul style="margin:0;padding-left:20px;color:#E65100;font-size:13px;">
            <li>Find a quiet space with stable internet</li>
            <li>Set aside the full time required</li>
            <li>You can only take the assessment once</li>
          </ul>
        </div>
      `;
      const html = shell({ heading: hello, accent: '#2196F3', bodyHtml: body, ctaLabel: 'Go to Assessment Portal', ctaUrl: portalUrl });
      const text = `STRATAVAX\n\nHello ${candidateName || 'Candidate'},\n\nYour assessment "${assessmentTitle}" opens tomorrow.\n\nLog in: ${portalUrl}\n`;
      return { subject, html, text };
    }

    case 'B': {
      const subject = `✅ Now available: ${assessmentTitle}`;
      const body = `
        <p>${hello},</p>
        <p>Your assessment is now open. You can start whenever you are ready, but only during the scheduled window.</p>
        ${assessmentBlock(assessmentTitle, '#16A34A')}
      `;
      const html = shell({ heading: hello, accent: '#16A34A', bodyHtml: body, ctaLabel: 'Start Assessment', ctaUrl: portalUrl });
      const text = `STRATAVAX\n\nHello ${candidateName || 'Candidate'},\n\nYour assessment "${assessmentTitle}" is now available.\n\nStart: ${portalUrl}\n`;
      return { subject, html, text };
    }

    case 'C':
    case 'D': {
      const firm = track === 'D';
      const accent = firm ? '#F59E0B' : '#2196F3';
      const subject = firm
        ? `📌 Still pending: ${assessmentTitle}`
        : `⏰ Reminder: ${assessmentTitle}`;
      const line = firm
        ? `Your assessment has been waiting for ${daysSince} days. Please log in and complete it at your earliest convenience.`
        : `It's been ${daysSince} days since your assessment became available. Whenever you're ready, please log in and complete it.`;
      const body = `
        <p>${hello},</p>
        ${assessmentBlock(assessmentTitle, accent)}
        <p>${line}</p>
      `;
      const html = shell({ heading: hello, accent, bodyHtml: body, ctaLabel: 'Go to Assessment Portal', ctaUrl: portalUrl });
      const text = `STRATAVAX\n\nHello ${candidateName || 'Candidate'},\n\n${line}\n\n${assessmentTitle}\n\nLog in: ${portalUrl}\n`;
      return { subject, html, text };
    }

    case 'E': {
      const subject = `Your assessment window has closed: ${assessmentTitle}`;
      const body = `
        <p>${hello},</p>
        <p>Your scheduled window for this assessment has now closed and it is no longer available.</p>
        ${assessmentBlock(assessmentTitle, '#DC2626')}
        <p>If you still need to complete it, please contact your supervisor to have it re-opened.</p>
      `;
      const html = shell({ heading: hello, accent: '#DC2626', bodyHtml: body, ctaLabel: 'Go to Assessment Portal', ctaUrl: portalUrl });
      const text = `STRATAVAX\n\nHello ${candidateName || 'Candidate'},\n\nYour assessment "${assessmentTitle}" is no longer available. Contact your supervisor if you need it re-opened.\n`;
      return { subject, html, text };
    }

    default:
      throw new Error(`Unknown track: ${track}`);
  }
}

// ============================================================
// Delivery
// ============================================================
async function sendEmail({ to, subject, html, text }) {
  const res = await fetch(`${SITE_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html, text })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ============================================================
// Track handler — one track = one DB query + one email per match
// ============================================================
async function runTrack({ name, supabase, rows, stampColumn, emailParams, counters }) {
  if (!rows || rows.length === 0) {
    console.log(`[Send Reminders] track=${name}: 0 matches`);
    counters[name] = { sent: 0, failed: 0, skipped: 0 };
    return;
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const profile = row.candidate_profiles;
    const assessment = row.assessments;
    if (!profile?.email || !assessment?.title) {
      skipped += 1;
      continue;
    }

    try {
      const params = emailParams(row);
      const { subject, html, text } = buildEmail(name, params);

      await sendEmail({ to: profile.email, subject, html, text });

      const { error: updErr } = await supabase
        .from('candidate_assessments')
        .update({
          [stampColumn]: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      if (updErr) {
        console.error(`[Send Reminders] track=${name} update error id=${row.id}`, updErr);
        failed += 1;
        continue;
      }

      sent += 1;
      await new Promise((r) => setTimeout(r, 200)); // rate-limit courtesy
    } catch (err) {
      console.error(`[Send Reminders] track=${name} send error id=${row.id}`, err);
      failed += 1;
    }
  }

  counters[name] = { sent, failed, skipped };
  console.log(`[Send Reminders] track=${name}: sent=${sent} failed=${failed} skipped=${skipped}`);
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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const now = Date.now();
    const iso = (ms) => new Date(ms).toISOString();

    const counters = {};
    const rowSelect = `
      id,
      user_id,
      assessment_id,
      status,
      scheduled_start,
      scheduled_end,
      scheduled_at,
      unblocked_at,
      session_id,
      reminder_1_sent_at,
      reminder_2_sent_at,
      pre_open_reminder_sent_at,
      window_open_reminder_sent_at,
      window_closed_reminder_sent_at,
      candidate_profiles:user_id ( full_name, email ),
      assessments:assessment_id ( title )
    `;

    // --------------------------------------------------------
    // Track A — pre-open, 24h before scheduled_start
    // --------------------------------------------------------
    {
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(rowSelect)
        .eq('status', 'scheduled')
        .is('session_id', null)
        .is('pre_open_reminder_sent_at', null)
        .not('scheduled_start', 'is', null)
        .gte('scheduled_start', iso(now))
        .lte('scheduled_start', iso(now + DAY_MS));

      if (error) console.error('[Send Reminders] track=A query error', error);

      await runTrack({
        name: 'A',
        supabase,
        rows: data || [],
        stampColumn: 'pre_open_reminder_sent_at',
        emailParams: (row) => ({
          candidateName: row.candidate_profiles?.full_name,
          assessmentTitle: row.assessments?.title
        }),
        counters
      });
    }

    // --------------------------------------------------------
    // Track B — window opened in last 24h and candidate is live
    // (catches both auto-flip and manual late unblock)
    // --------------------------------------------------------
    {
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(rowSelect)
        .eq('status', 'unblocked')
        .is('session_id', null)
        .is('window_open_reminder_sent_at', null)
        .not('scheduled_start', 'is', null)
        .gte('scheduled_start', iso(now - DAY_MS))
        .lte('scheduled_start', iso(now));

      if (error) console.error('[Send Reminders] track=B query error', error);

      await runTrack({
        name: 'B',
        supabase,
        rows: data || [],
        stampColumn: 'window_open_reminder_sent_at',
        emailParams: (row) => ({
          candidateName: row.candidate_profiles?.full_name,
          assessmentTitle: row.assessments?.title
        }),
        counters
      });
    }

    // --------------------------------------------------------
    // Track C — idle nudge, 3–7 days since candidate could start
    // "could start" = max(scheduled_start, unblocked_at). Falls back
    // to scheduled_at if both are null (legacy rows).
    // Windowed AND non-windowed rows are eligible.
    // --------------------------------------------------------
    {
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(rowSelect)
        .eq('status', 'unblocked')
        .is('session_id', null)
        .is('reminder_1_sent_at', null);

      if (error) console.error('[Send Reminders] track=C query error', error);

      const eligible = (data || []).filter((row) => {
        const base = row.scheduled_start || row.unblocked_at || row.scheduled_at;
        if (!base) return false;
        const since = (now - new Date(base).getTime()) / DAY_MS;
        return since >= 3 && since < 7;
      });

      await runTrack({
        name: 'C',
        supabase,
        rows: eligible,
        stampColumn: 'reminder_1_sent_at',
        emailParams: (row) => {
          const base = row.scheduled_start || row.unblocked_at || row.scheduled_at;
          return {
            candidateName: row.candidate_profiles?.full_name,
            assessmentTitle: row.assessments?.title,
            daysSince: Math.floor((now - new Date(base).getTime()) / DAY_MS)
          };
        },
        counters
      });
    }

    // --------------------------------------------------------
    // Track D — second nudge, 7–14 days, WINDOWED rows only.
    // Non-windowed rows get track C only (per decision).
    // --------------------------------------------------------
    {
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(rowSelect)
        .eq('status', 'unblocked')
        .is('session_id', null)
        .is('reminder_2_sent_at', null)
        .not('scheduled_start', 'is', null);

      if (error) console.error('[Send Reminders] track=D query error', error);

      const eligible = (data || []).filter((row) => {
        const since = (now - new Date(row.scheduled_start).getTime()) / DAY_MS;
        return since >= 7 && since < 14;
      });

      await runTrack({
        name: 'D',
        supabase,
        rows: eligible,
        stampColumn: 'reminder_2_sent_at',
        emailParams: (row) => ({
          candidateName: row.candidate_profiles?.full_name,
          assessmentTitle: row.assessments?.title,
          daysSince: Math.floor((now - new Date(row.scheduled_start).getTime()) / DAY_MS)
        }),
        counters
      });
    }

    // --------------------------------------------------------
    // Track E — post-window, still blocked, never started
    // Fires once per row, immediately after scheduled_end passes.
    // --------------------------------------------------------
    {
      const { data, error } = await supabase
        .from('candidate_assessments')
        .select(rowSelect)
        .eq('status', 'blocked')
        .is('session_id', null)
        .is('window_closed_reminder_sent_at', null)
        .not('scheduled_end', 'is', null)
        .lte('scheduled_end', iso(now));

      if (error) console.error('[Send Reminders] track=E query error', error);

      await runTrack({
        name: 'E',
        supabase,
        rows: data || [],
        stampColumn: 'window_closed_reminder_sent_at',
        emailParams: (row) => ({
          candidateName: row.candidate_profiles?.full_name,
          assessmentTitle: row.assessments?.title
        }),
        counters
      });
    }

    return res.status(200).json({
      success: true,
      ran_at: new Date().toISOString(),
      tracks: counters
    });
  } catch (error) {
    console.error('[Send Reminders] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
