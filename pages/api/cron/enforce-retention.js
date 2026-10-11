// pages/api/cron/enforce-retention.js
// Phase 7G — Retention enforcement cron job.
//
// Runs daily at 02:00 UTC (via vercel.json cron config). Reads every
// active policy from retention_policies, finds expired rows in each
// target table, and applies the configured action:
//   - 'anonymize'  → replace identifying fields with the sentinel
//   - 'delete'     → hard delete the row
//
// Every action is logged to anonymization_log for audit purposes.
//
// SAFETY FEATURES:
//   - Dry-run mode (?dryRun=true) returns what would be processed without
//     touching any data. Enabled by default for the first week.
//   - Rate limit: MAX_ROWS_PER_TABLE rows per table per run. Prevents
//     runaway deletions if a misconfigured policy would nuke a table.
//   - Only active policies are enforced. Set is_active = false to disable.
//   - Authenticated: requires RETENTION_CRON_SECRET (falls back to
//     CRON_SECRET) via Authorization header.
//
// To go live after dry-run validation:
//   1. Set env var RETENTION_DRY_RUN = 'false' in Vercel
//   2. Redeploy
//   3. Run once manually to verify
//   4. Let the daily cron handle it thereafter

import { createClient } from '@supabase/supabase-js';

const LOG_TAG = '[Retention Cron]';
const MAX_ROWS_PER_TABLE = 500;

// The sentinel candidate UUID — every anonymized row points here.
// Set in Vercel env vars as ANONYMIZATION_SENTINEL_ID.
function getSentinelId() {
  const id = process.env.ANONYMIZATION_SENTINEL_ID;
  if (!id) {
    throw new Error(
      'ANONYMIZATION_SENTINEL_ID is not set. Cannot anonymize rows without it.'
    );
  }
  return id;
}

// Whether we're in dry-run mode. Defaults to true unless explicitly disabled.
// This is a defense-in-depth default: forgetting to set the env var means
// we do NOT delete anything, which is the safer failure mode.
function isDryRun() {
  const value = String(process.env.RETENTION_DRY_RUN ?? 'true').toLowerCase();
  return value !== 'false';
}

// Authenticate the caller.
//
// Preference order:
//   1. RETENTION_CRON_SECRET — dedicated to this endpoint
//   2. CRON_SECRET — legacy fallback, shared with other crons
function isAuthorized(req) {
  const secret =
    process.env.RETENTION_CRON_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    // If neither secret is configured, allow only in non-production
    // to avoid accidental exposure in prod.
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = req.headers.authorization || '';
  return authHeader === `Bearer ${secret}`;
}

// Cutoff timestamp: rows older than this are eligible for retention action.
function computeCutoff(retentionMonths) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - retentionMonths);
  return d.toISOString();
}

// ------------------------------------------------------------
// Per-table handlers
// ------------------------------------------------------------

async function processCandidateProfiles(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('candidate_profiles')
    .select('id, updated_at')
    .lt('updated_at', cutoff)
    .neq('id', process.env.ANONYMIZATION_SENTINEL_ID)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`candidate_profiles fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: updateErr } = await client
      .from('candidate_profiles')
      .update({
        full_name: '[Anonymized]',
        email: `anonymized+${ids[0].slice(0, 8)}@stratavax.internal`,
        phone: '+233000000000',
        university: null,
        programme: null,
        degree_level_id: null,
        graduation_year: null,
        preferred_department: null,
        supervisor_id: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateErr) throw new Error(`candidate_profiles update failed: ${updateErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

async function processAssessmentResults(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('assessment_results')
    .select('id, completed_at')
    .lt('completed_at', cutoff)
    .neq('user_id', process.env.ANONYMIZATION_SENTINEL_ID)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`assessment_results fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: updateErr } = await client
      .from('assessment_results')
      .update({
        user_id: process.env.ANONYMIZATION_SENTINEL_ID,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateErr) throw new Error(`assessment_results update failed: ${updateErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

async function processCompetencyScores(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('candidate_competency_scores')
    .select('id, created_at')
    .lt('created_at', cutoff)
    .neq('candidate_id', process.env.ANONYMIZATION_SENTINEL_ID)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`candidate_competency_scores fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: updateErr } = await client
      .from('candidate_competency_scores')
      .update({
        candidate_id: process.env.ANONYMIZATION_SENTINEL_ID,
      })
      .in('id', ids);

    if (updateErr) throw new Error(`candidate_competency_scores update failed: ${updateErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

async function processResponses(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('responses')
    .select('id, created_at')
    .lt('created_at', cutoff)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`responses fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: deleteErr } = await client
      .from('responses')
      .delete()
      .in('id', ids);

    if (deleteErr) throw new Error(`responses delete failed: ${deleteErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

async function processAssessmentSessions(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('assessment_sessions')
    .select('id, completed_at, created_at')
    .lt('created_at', cutoff)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`assessment_sessions fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: deleteErr } = await client
      .from('assessment_sessions')
      .delete()
      .in('id', ids);

    if (deleteErr) throw new Error(`assessment_sessions delete failed: ${deleteErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

async function processSessionQuestions(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('session_questions')
    .select('id, created_at')
    .lt('created_at', cutoff)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`session_questions fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: deleteErr } = await client
      .from('session_questions')
      .delete()
      .in('id', ids);

    if (deleteErr) throw new Error(`session_questions delete failed: ${deleteErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

async function processAuditLogs(client, cutoff, action, dryRun) {
  const { data: rows, error } = await client
    .from('audit_logs')
    .select('id, created_at')
    .lt('created_at', cutoff)
    .limit(MAX_ROWS_PER_TABLE);

  if (error) throw new Error(`audit_logs fetch failed: ${error.message}`);
  if (!rows || rows.length === 0) return { processed: 0, rowIds: [] };

  const ids = rows.map(r => r.id);

  if (!dryRun) {
    const { error: deleteErr } = await client
      .from('audit_logs')
      .delete()
      .in('id', ids);

    if (deleteErr) throw new Error(`audit_logs delete failed: ${deleteErr.message}`);
  }

  return { processed: ids.length, rowIds: ids };
}

// ------------------------------------------------------------
// Dispatcher
// ------------------------------------------------------------
const TABLE_HANDLERS = {
  candidate_profiles: processCandidateProfiles,
  assessment_results: processAssessmentResults,
  candidate_competency_scores: processCompetencyScores,
  responses: processResponses,
  assessment_sessions: processAssessmentSessions,
  session_questions: processSessionQuestions,
  audit_logs: processAuditLogs,
};

// ------------------------------------------------------------
// Log actions to anonymization_log
// ------------------------------------------------------------
async function logActions(client, tableName, action, rowIds, triggeredBy, reason) {
  if (!rowIds || rowIds.length === 0) return;

  const entries = rowIds.map(rowId => ({
    table_name: tableName,
    row_id: String(rowId),
    action: action === 'anonymize' ? 'anonymized' : 'deleted',
    reason,
    triggered_by: triggeredBy,
  }));

  const { error } = await client.from('anonymization_log').insert(entries);
  if (error) {
    console.error(`${LOG_TAG} Failed to write anonymization_log:`, error.message);
  }
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    console.warn(`${LOG_TAG} Unauthorized request`);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const dryRunParam = url.searchParams.get('dryRun');
  const dryRun = dryRunParam === 'true' ? true : dryRunParam === 'false' ? false : isDryRun();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(`${LOG_TAG} Missing Supabase env vars`);
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`${LOG_TAG} Starting run (dryRun=${dryRun})`);
  const startedAt = new Date().toISOString();
  const results = [];

  try {
    // Sanity check: sentinel must exist before we anonymize anything
    if (!dryRun) {
      const sentinelId = getSentinelId();
      const { data: sentinel, error: sentinelErr } = await client
        .from('candidate_profiles')
        .select('id, email')
        .eq('id', sentinelId)
        .maybeSingle();

      if (sentinelErr || !sentinel) {
        throw new Error(
          `Sentinel candidate ${sentinelId} not found. Refusing to anonymize.`
        );
      }
    }

    // Load all active policies
    const { data: policies, error: policiesErr } = await client
      .from('retention_policies')
      .select('id, table_name, retention_months, action, description')
      .eq('is_active', true)
      .order('table_name');

    if (policiesErr) {
      throw new Error(`Failed to load retention policies: ${policiesErr.message}`);
    }

    if (!policies || policies.length === 0) {
      console.log(`${LOG_TAG} No active retention policies found`);
      return res.status(200).json({
        success: true,
        dryRun,
        message: 'No active retention policies',
        results: [],
      });
    }

    // Process each policy
    for (const policy of policies) {
      const { table_name, retention_months, action, description } = policy;
      const handler = TABLE_HANDLERS[table_name];

      if (!handler) {
        console.warn(`${LOG_TAG} No handler for table: ${table_name}`);
        results.push({
          table: table_name,
          status: 'skipped',
          reason: 'no_handler',
        });
        continue;
      }

      const cutoff = computeCutoff(retention_months);

      try {
        const { processed, rowIds } = await handler(client, cutoff, action, dryRun);

        if (processed > 0) {
          await logActions(
            client,
            table_name,
            action,
            rowIds,
            'retention_policy',
            dryRun
              ? `Dry run: would ${action} ${processed} rows older than ${retention_months} months`
              : `Retention policy: ${action} ${processed} rows older than ${retention_months} months`
          );
        }

        results.push({
          table: table_name,
          status: 'ok',
          action,
          retention_months,
          cutoff,
          processed,
          description,
          dryRun,
        });

        console.log(
          `${LOG_TAG} ${table_name}: ${processed} rows ${dryRun ? '(would be) ' : ''}${action}d`
        );
      } catch (tableErr) {
        console.error(`${LOG_TAG} ${table_name} failed:`, tableErr.message);
        results.push({
          table: table_name,
          status: 'error',
          error: tableErr.message,
        });
      }
    }

    const finishedAt = new Date().toISOString();
    const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0);

    console.log(`${LOG_TAG} Complete. Total rows processed: ${totalProcessed}`);

    return res.status(200).json({
      success: true,
      dryRun,
      startedAt,
      finishedAt,
      totalProcessed,
      results,
    });

  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      results,
    });
  }
}
