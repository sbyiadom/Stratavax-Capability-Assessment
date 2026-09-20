// pages/api/admin/assessments/bulk-assign.js
// Phase 3 item 7: bulk candidate <-> assessment assignment.
// Phase 7A: admin role enforcement added.
//
// Modes:
//   byAssessment  — one or more assessments -> many candidates  (A)
//   byCandidate   — one candidate -> many assessments           (B)
//
// Action:
//   assign   -> status 'unblocked' (or 'scheduled' if a window is provided)
//   unblock  -> status 'unblocked' (or 'scheduled' if a window is provided)
//   block    -> status 'blocked'
//
// Safety:
//   - Existing rows with status 'completed' or 'in_progress' are SKIPPED,
//     never overwritten. They are reported in `skipped[]`.
//   - Uses UNIQUE(user_id, assessment_id) via upsert onConflict.
//
// Response envelope:
//   { success: true, inserted, updated, skipped, failed, results[] }
//   { success: false, error: '...' }

import { createClient } from '@supabase/supabase-js';

const VALID_MODES = new Set(['byAssessment', 'byCandidate']);
const VALID_ACTIONS = new Set(['assign', 'unblock', 'block']);
const PROTECTED_STATUSES = new Set(['completed', 'in_progress']);

function localToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildScheduleFields(schedule) {
  const empty = {
    is_scheduled: false,
    scheduled_start: null,
    scheduled_end: null,
    scheduled_by: null,
    scheduled_at: null
  };

  if (schedule === undefined || schedule === null) {
    return { ok: true, fields: empty };
  }

  const { start, end } = schedule;
  const hasStart = start !== undefined && start !== null && start !== '';
  const hasEnd = end !== undefined && end !== null && end !== '';

  if (!hasStart && !hasEnd) {
    return { ok: true, fields: empty };
  }

  if (!hasStart || !hasEnd) {
    return { ok: false, error: 'Schedule requires both start and end, or neither.' };
  }

  const startIso = localToIso(start);
  const endIso = localToIso(end);

  if (!startIso || !endIso) {
    return { ok: false, error: 'Schedule start/end are not valid timestamps.' };
  }

  if (new Date(startIso) >= new Date(endIso)) {
    return { ok: false, error: 'Schedule start must be before end.' };
  }

  return {
    ok: true,
    fields: {
      is_scheduled: true,
      scheduled_start: startIso,
      scheduled_end: endIso,
      scheduled_by: null,
      scheduled_at: new Date().toISOString()
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    // ------------------------------------------------------------
    // AUTH
    // ------------------------------------------------------------
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Bulk Assign] Missing Supabase environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Bulk Assign] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // ------------------------------------------------------------
    // AUTHORIZATION — admin only
    // ------------------------------------------------------------
    const { data: profile, error: profileError } = await serviceClient
      .from('supervisor_profiles')
      .select('id, role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Bulk Assign] profile lookup failed:', profileError.message);
      return res.status(500).json({ success: false, error: 'Unable to verify caller role' });
    }

    const metadataRole = userData.user.user_metadata?.role || null;
    const resolvedRole = profile?.role || metadataRole;

    if (profile?.is_active === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (resolvedRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const adminId = userData.user.id;

    // ------------------------------------------------------------
    // Input validation
    // ------------------------------------------------------------
    const { mode, assessmentIds, candidateIds, action, schedule } = req.body || {};

    if (!VALID_MODES.has(mode)) {
      return res.status(400).json({
        success: false,
        error: "mode must be 'byAssessment' or 'byCandidate'"
      });
    }

    if (!VALID_ACTIONS.has(action)) {
      return res.status(400).json({
        success: false,
        error: "action must be 'assign', 'unblock', or 'block'"
      });
    }

    const cleanAssessmentIds = [...new Set(
      (Array.isArray(assessmentIds) ? assessmentIds : [assessmentIds]).filter(Boolean)
    )];
    const cleanCandidateIds = [...new Set(
      (Array.isArray(candidateIds) ? candidateIds : [candidateIds]).filter(Boolean)
    )];

    if (cleanAssessmentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one assessment is required.' });
    }
    if (cleanCandidateIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one candidate is required.' });
    }

    if (mode === 'byCandidate' && cleanCandidateIds.length !== 1) {
      return res.status(400).json({
        success: false,
        error: "mode 'byCandidate' accepts exactly one candidate."
      });
    }

    if (action === 'block' && schedule && (schedule.start || schedule.end)) {
      return res.status(400).json({
        success: false,
        error: 'Scheduling is not valid when blocking.'
      });
    }

    // ------------------------------------------------------------
    // Schedule normalization
    // ------------------------------------------------------------
    const scheduleResult = buildScheduleFields(action === 'block' ? null : schedule);
    if (!scheduleResult.ok) {
      return res.status(400).json({ success: false, error: scheduleResult.error });
    }

    const scheduleFields = {
      ...scheduleResult.fields,
      scheduled_by: scheduleResult.fields.is_scheduled ? adminId : null
    };

    const isScheduled = scheduleFields.is_scheduled === true;

    let targetStatus;
    if (action === 'block') targetStatus = 'blocked';
    else if (isScheduled) targetStatus = 'scheduled';
    else targetStatus = 'unblocked';

    // ------------------------------------------------------------
    // Build the (candidate x assessment) pair matrix
    // ------------------------------------------------------------
    const pairs = [];
    for (const candidateId of cleanCandidateIds) {
      for (const assessmentId of cleanAssessmentIds) {
        pairs.push({ candidateId, assessmentId });
      }
    }

    console.log('[Bulk Assign] Request', {
      adminId,
      mode,
      action,
      targetStatus,
      isScheduled,
      candidateCount: cleanCandidateIds.length,
      assessmentCount: cleanAssessmentIds.length,
      pairCount: pairs.length
    });

    // ------------------------------------------------------------
    // Load existing rows for these pairs, so we can skip protected ones
    // ------------------------------------------------------------
    const { data: existingRows, error: existingError } = await serviceClient
      .from('candidate_assessments')
      .select('id, user_id, assessment_id, status')
      .in('user_id', cleanCandidateIds)
      .in('assessment_id', cleanAssessmentIds);

    if (existingError) {
      console.error('[Bulk Assign] Failed to load existing rows:', existingError);
      return res.status(500).json({
        success: false,
        error: 'Failed to read existing assignments: ' + existingError.message
      });
    }

    const existingMap = new Map();
    for (const row of existingRows || []) {
      existingMap.set(`${row.user_id}::${row.assessment_id}`, row);
    }

    // ------------------------------------------------------------
    // Partition pairs into: toWrite, skipped
    // ------------------------------------------------------------
    const now = new Date().toISOString();
    const toWrite = [];
    const skipped = [];
    let expectedUpdates = 0;
    let expectedInserts = 0;

    for (const pair of pairs) {
      const key = `${pair.candidateId}::${pair.assessmentId}`;
      const existing = existingMap.get(key);

      if (existing && PROTECTED_STATUSES.has(existing.status)) {
        skipped.push({
          candidateId: pair.candidateId,
          assessmentId: pair.assessmentId,
          reason: `Existing status '${existing.status}' is protected.`
        });
        continue;
      }

      if (existing) expectedUpdates += 1;
      else expectedInserts += 1;

      toWrite.push({
        user_id: pair.candidateId,
        assessment_id: pair.assessmentId,
        status: targetStatus,
        updated_at: now,
        unblocked_at: targetStatus === 'unblocked' ? now : null,
        ...scheduleFields
      });
    }

    // ------------------------------------------------------------
    // Write in batches (avoid oversized single statement)
    // ------------------------------------------------------------
    const BATCH_SIZE = 200;
    const failed = [];
    let writtenCount = 0;

    for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
      const batch = toWrite.slice(i, i + BATCH_SIZE);

      const { error: upsertError } = await serviceClient
        .from('candidate_assessments')
        .upsert(batch, { onConflict: 'user_id,assessment_id' });

      if (upsertError) {
        console.error('[Bulk Assign] Batch upsert failed:', upsertError);

        let httpStatus = 500;
        if (upsertError.code === '23505') httpStatus = 409;
        else if (upsertError.code === '23503') httpStatus = 409;
        else if (upsertError.code === '22023') httpStatus = 400;

        for (const row of batch) {
          failed.push({
            candidateId: row.user_id,
            assessmentId: row.assessment_id,
            error: upsertError.message
          });
        }

        if (httpStatus !== 500) {
          return res.status(httpStatus).json({
            success: false,
            error: upsertError.message,
            written: writtenCount,
            skipped,
            failed
          });
        }
        continue;
      }

      writtenCount += batch.length;
    }

    // ------------------------------------------------------------
    // Success response
    // ------------------------------------------------------------
    const failedCount = failed.length;
    const allGood = failedCount === 0;

    console.log('[Bulk Assign] Done', {
      written: writtenCount,
      skipped: skipped.length,
      failed: failedCount
    });

    return res.status(200).json({
      success: allGood,
      message: allGood
        ? `Wrote ${writtenCount} assignment(s); skipped ${skipped.length}.`
        : `Wrote ${writtenCount}; skipped ${skipped.length}; failed ${failedCount}.`,
      mode,
      action,
      targetStatus,
      isScheduled,
      inserted: expectedInserts,
      updated: expectedUpdates,
      written: writtenCount,
      skipped,
      failed
    });

  } catch (error) {
    console.error('[Bulk Assign] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error'
    });
  }
}
