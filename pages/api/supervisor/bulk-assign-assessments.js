// pages/api/supervisor/bulk-assign-assessments.js
// Phase 7B — assign one assessment to many candidates at once.
//
// Usage:
//   POST /api/supervisor/bulk-assign-assessments
//   body: { candidateIds: [uuid, ...], assessmentId: uuid }
//
// SCOPE:
//   Admin may assign to any candidate.
//   Supervisor may only assign to candidates in their scope, verified via
//   get_scoped_candidate_ids. Any candidateId not in scope is skipped and
//   reported (not silently ignored, not a 403 for the whole batch).
//
// BEHAVIOUR:
//   • New assignments are created with status = 'blocked'.
//   • Candidates who already have the assessment (any status) are skipped.
//   • Assignments are inserted in bulk; if the table has a UNIQUE constraint
//     on (user_id, assessment_id), the insert uses ON CONFLICT DO NOTHING as
//     a belt-and-braces guarantee.
//
// Response:
//   {
//     success: true,
//     assigned: N,       // newly assigned
//     skipped: M,        // already had it
//     outOfScope: K,     // candidateId not in caller's scope
//     total: T           // candidateIds.length
//   }

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Bulk Assign Assessments]';
const CHUNK_SIZE = 100;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isValidUUID(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function logError(stage, error, extra = {}) {
  console.error(`${LOG_TAG} ${stage} failed`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;

  try {
    const body = req.body || {};
    const rawIds = Array.isArray(body.candidateIds) ? body.candidateIds : [];
    const assessmentId = String(body.assessmentId || '').trim();

    if (!isValidUUID(assessmentId)) {
      return res.status(400).json({ success: false, error: 'Valid assessmentId is required.' });
    }

    const requestedIds = [...new Set(rawIds.filter(isValidUUID))];

    if (requestedIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one valid candidateId is required.' });
    }

    // ---- Confirm the assessment exists and is active ----
    const { data: assessment, error: assessmentError } = await serviceClient
      .from('assessments')
      .select('id, title, is_active')
      .eq('id', assessmentId)
      .maybeSingle();

    if (assessmentError) {
      logError('assessment lookup', assessmentError, { assessmentId });
      return res.status(500).json({ success: false, error: 'Failed to verify assessment.' });
    }

    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    if (assessment.is_active === false) {
      return res.status(400).json({ success: false, error: 'This assessment is not active.' });
    }

    // ---- Scope check ----
    // Admin: any candidate in requestedIds is in scope.
    // Supervisor: only those in get_scoped_candidate_ids.
    let inScopeIds = requestedIds;
    let outOfScopeIds = [];

    if (!caller.isAdmin) {
      const { data: scopedRows, error: scopedError } = await serviceClient.rpc(
        'get_scoped_candidate_ids',
        { p_caller: caller.userId, p_is_admin: false }
      );

      if (scopedError) {
        logError('rpc get_scoped_candidate_ids', scopedError, {
          role: caller.role,
          userId: caller.userId,
        });
        return res.status(500).json({ success: false, error: 'Failed to verify scope.' });
      }

      const scopedSet = new Set(
        Array.isArray(scopedRows)
          ? scopedRows
              .map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids))
              .filter(Boolean)
          : []
      );

      inScopeIds = requestedIds.filter((id) => scopedSet.has(id));
      outOfScopeIds = requestedIds.filter((id) => !scopedSet.has(id));
    }

    if (inScopeIds.length === 0) {
      return res.status(200).json({
        success: true,
        assigned: 0,
        skipped: 0,
        outOfScope: outOfScopeIds.length,
        total: requestedIds.length,
        assessmentTitle: assessment.title,
        message: 'No candidates in your scope.',
      });
    }

    // ---- Which candidates already have this assessment? ----
    const alreadyAssigned = new Set();

    for (const slice of chunk(inScopeIds, CHUNK_SIZE)) {
      const { data: existingRows, error: existingError } = await serviceClient
        .from('candidate_assessments')
        .select('user_id')
        .eq('assessment_id', assessmentId)
        .in('user_id', slice);

      if (existingError) {
        logError('candidate_assessments existing-lookup', existingError, {
          chunkSize: slice.length,
          totalIds: inScopeIds.length,
          assessmentId,
        });
        return res.status(500).json({ success: false, error: 'Failed to check existing assignments.' });
      }

      (existingRows || []).forEach((row) => {
        if (row?.user_id) alreadyAssigned.add(row.user_id);
      });
    }

    // ---- Determine who to insert ----
    const toInsert = inScopeIds.filter((id) => !alreadyAssigned.has(id));

    // ---- Insert with status = 'blocked' ----
    let insertedCount = 0;

    if (toInsert.length > 0) {
      const now = new Date().toISOString();

      for (const slice of chunk(toInsert, CHUNK_SIZE)) {
        const rows = slice.map((userId) => ({
          user_id: userId,
          assessment_id: assessmentId,
          status: 'blocked',
          created_at: now,
          updated_at: now,
        }));

        // Use upsert with ignoreDuplicates so any stray UNIQUE-constraint
        // collision is swallowed rather than aborting the batch.
        const { data: inserted, error: insertError } = await serviceClient
          .from('candidate_assessments')
          .upsert(rows, {
            onConflict: 'user_id,assessment_id',
            ignoreDuplicates: true,
          })
          .select('user_id');

        if (insertError) {
          logError('candidate_assessments insert', insertError, {
            chunkSize: slice.length,
            assessmentId,
            role: caller.role,
          });
          return res.status(500).json({
            success: false,
            error: insertError.message || 'Failed to assign assessment.',
            partial: { assigned: insertedCount },
          });
        }

        insertedCount += Array.isArray(inserted) ? inserted.length : slice.length;
      }
    }

    console.log(`${LOG_TAG} batch assign complete`, {
      by: caller.userId,
      byRole: caller.role,
      assessmentId,
      requested: requestedIds.length,
      inScope: inScopeIds.length,
      outOfScope: outOfScopeIds.length,
      assigned: insertedCount,
      skippedAlreadyAssigned: alreadyAssigned.size,
    });

    return res.status(200).json({
      success: true,
      assigned: insertedCount,
      skipped: alreadyAssigned.size,
      outOfScope: outOfScopeIds.length,
      total: requestedIds.length,
      assessmentTitle: assessment.title,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
