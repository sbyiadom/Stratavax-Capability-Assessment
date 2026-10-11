// pages/api/admin/privacy/export/[candidateId].js
// Phase 7H — Data export generator for privacy access requests.
//
// Produces a complete JSON export of everything the platform holds about
// a candidate. The export is intended to be delivered to the candidate
// (or a data protection authority) in response to a right-of-access
// request.
//
// Auth: admin only.
//
// Response: a downloadable JSON file (Content-Disposition: attachment)
// containing the full export.
//
// The export contains:
//   - metadata (generation date, retention statement)
//   - candidate profile
//   - assessment results (scores, categories, classifications)
//   - competency scores
//   - responses (item-level answers, if retained)
//   - audit summary (who accessed what)
//
// Fields are excluded if they would expose other users' data (e.g. we
// do NOT include supervisor names verbatim — only roles and timestamps).

import { authorizeRequest } from '../../../../../utils/apiAuth';

const LOG_TAG = '[Privacy Export]';

// How many months we tell candidates we retain their data.
// Keep in sync with retention_policies for candidate_profiles.
const RETENTION_MONTHS = 24;

function isoNow() {
  return new Date().toISOString();
}

// ------------------------------------------------------------
// Handlers for each section of the export
// ------------------------------------------------------------

async function loadProfile(serviceClient, candidateId) {
  const { data, error } = await serviceClient
    .from('candidate_profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      university,
      programme,
      degree_level_id,
      graduation_year,
      preferred_department,
      created_at,
      updated_at
    `)
    .eq('id', candidateId)
    .maybeSingle();

  if (error) throw new Error(`Profile lookup failed: ${error.message}`);
  return data;
}

async function loadAssessmentResults(serviceClient, candidateId) {
  const { data, error } = await serviceClient
    .from('assessment_results')
    .select(`
      id,
      assessment_id,
      total_score,
      max_score,
      percentage_score,
      classification,
      category_scores,
      total_questions,
      answered_questions,
      recommendation,
      risk_level,
      completed_at,
      started_at,
      total_seconds
    `)
    .eq('user_id', candidateId)
    .order('completed_at', { ascending: false });

  if (error) throw new Error(`Assessment results lookup failed: ${error.message}`);
  return data || [];
}

async function loadCompetencyScores(serviceClient, candidateId) {
  const { data, error } = await serviceClient
    .from('candidate_competency_scores')
    .select(`
      id,
      assessment_id,
      competency_id,
      raw_score,
      max_possible,
      percentage,
      classification,
      question_count,
      created_at,
      competencies ( id, name, category )
    `)
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Competency scores lookup failed: ${error.message}`);
  return (data || []).map(row => ({
    id: row.id,
    assessment_id: row.assessment_id,
    competency_id: row.competency_id,
    competency_name: row.competencies?.name || null,
    competency_category: row.competencies?.category || null,
    raw_score: row.raw_score,
    max_possible: row.max_possible,
    percentage: row.percentage,
    classification: row.classification,
    question_count: row.question_count,
    created_at: row.created_at,
  }));
}

async function loadResponses(serviceClient, candidateId) {
  // Note: responses.user_id is the candidate's auth user id. Responses may
  // have been deleted by retention before the export runs — that's expected
  // and reflected in the retention statement at the top of the export.
  const { data, error } = await serviceClient
    .from('responses')
    .select(`
      id,
      assessment_id,
      question_id,
      answer_id,
      least_answer_id,
      created_at,
      time_spent_seconds
    `)
    .eq('user_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`${LOG_TAG} Responses lookup failed (non-fatal):`, error.message);
    return [];
  }
  return data || [];
}

async function loadAuditSummary(serviceClient, candidateId) {
  // Summarise audit log entries about this candidate's data. We do NOT
  // expose the identity of other users (supervisors/admins) — only roles
  // and timestamps.
  const { data, error } = await serviceClient
    .from('audit_logs')
    .select(`
      id,
      action,
      table_name,
      created_at
    `)
    .eq('record_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn(`${LOG_TAG} Audit lookup failed (non-fatal):`, error.message);
    return { total: 0, by_action: {}, most_recent: null };
  }

  const entries = data || [];
  const byAction = {};
  entries.forEach(e => {
    byAction[e.action] = (byAction[e.action] || 0) + 1;
  });

  return {
    total: entries.length,
    by_action: byAction,
    most_recent: entries[0]?.created_at || null,
  };
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Admin-only auth
  const auth = await authorizeRequest(req, ['admin']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { serviceClient } = auth;
  const { candidateId } = req.query;

  if (!candidateId) {
    return res.status(400).json({ success: false, error: 'Missing candidateId' });
  }

  // Optional: allow ?download=1 to trigger Content-Disposition attachment.
  // Without it, the response is JSON for admin preview.
  const download = req.query.download === '1';

  try {
    // Load profile first — if no profile, no export is possible
    const profile = await loadProfile(serviceClient, candidateId);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Warn (but proceed) if candidate appears anonymized
    const isAnonymized = (profile.email || '').startsWith('anonymized');

    // Load all sections
    const [results, competencies, responses, auditSummary] = await Promise.all([
      loadAssessmentResults(serviceClient, candidateId),
      loadCompetencyScores(serviceClient, candidateId),
      loadResponses(serviceClient, candidateId),
      loadAuditSummary(serviceClient, candidateId),
    ]);

    const exportPayload = {
      export_metadata: {
        generated_at: isoNow(),
        generated_by: 'Stratavax Capability Assessment Platform',
        format_version: '1.0',
        retention_statement: `Your personal data is retained for ${RETENTION_MONTHS} months from the date of last activity, after which it is anonymized in accordance with our Privacy and Data Retention Policy. Some data types (item-level responses, session metadata) are retained for shorter periods.`,
        note: isAnonymized
          ? 'This export was generated AFTER the profile was already anonymized. Some personal data may have been replaced with placeholder values.'
          : null,
      },
      candidate: profile,
      assessment_results: results,
      competency_scores: competencies,
      responses,
      audit_summary: auditSummary,
    };

    // If download=1, trigger Content-Disposition
    if (download) {
      const filename = `stratavax-export-${candidateId.slice(0, 8)}-${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(JSON.stringify(exportPayload, null, 2));
    }

    // Otherwise return JSON for admin preview
    return res.status(200).json({
      success: true,
      candidate_id: candidateId,
      candidate_name: profile.full_name,
      counts: {
        assessment_results: results.length,
        competency_scores: competencies.length,
        responses: responses.length,
        audit_entries: auditSummary.total,
      },
      download_url: `/api/admin/privacy/export/${candidateId}?download=1`,
      export: exportPayload,
    });

  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
