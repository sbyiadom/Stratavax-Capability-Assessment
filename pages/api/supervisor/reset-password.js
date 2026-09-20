// pages/api/supervisor/reset-password.js
// Phase 7B — supervisor-side password reset endpoint.
//
// AUTH:   authorizeRequest(req, ['admin','supervisor']) — same pattern as
//         every other Phase 7B endpoint. Rejects unauthenticated callers;
//         verifies role from the DB, not from user_metadata.
//
// SCOPE:  A supervisor may only reset passwords for candidates in their scope.
//         Scope is derived from get_scoped_candidate_ids (primary + junction
//         union) — the same primitive used by the candidate list endpoints.
//         An admin may reset anyone.
//
// MECHANISM: Uses the Supabase Admin API to update the password directly.
//            No email is sent. The candidate can sign in immediately.
//
// Request body: { email: string, newPassword: string }
// Response:     { success: true, userId, email }
//            or { success: false, error }

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Supervisor Reset Password]';

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

  // ---- Auth ----
  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;

  try {
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing email or newPassword' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // ---- Scope check: is this email a candidate the caller can act on? ----
    const { data: candidate, error: candidateError } = await serviceClient
      .from('candidate_profiles')
      .select('id, email, full_name')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (candidateError) {
      logError('candidate_profiles lookup', candidateError, {
        role: caller.role,
        email: normalizedEmail,
      });
      return res.status(500).json({ success: false, error: 'Failed to look up candidate' });
    }

    if (!candidate) {
      // Do not reveal whether an unknown email exists elsewhere in the system.
      return res.status(404).json({
        success: false,
        error: 'No candidate in your scope matches that email.',
      });
    }

    // Admin: any candidate is fair game. Supervisor: must be in scope.
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
        return res.status(500).json({ success: false, error: 'Failed to verify scope' });
      }

      const scopedIds = Array.isArray(scopedRows)
        ? scopedRows
            .map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids))
            .filter(Boolean)
        : [];

      if (!scopedIds.includes(candidate.id)) {
        logError('scope check rejected', { message: 'candidate out of scope' }, {
          role: caller.role,
          userId: caller.userId,
          candidateId: candidate.id,
        });
        return res.status(403).json({
          success: false,
          error: 'This candidate is not in your scope.',
        });
      }
    }

    // ---- Locate the auth user by email (paginated) ----
    // Supabase Admin API has no "get user by email" method; listing is the
    // only way. We cap the scan and stop as soon as the target email is found.
    let targetUser = null;
    let page = 1;
    const perPage = 1000;
    const maxPages = 20; // safety cap: 20k users
    while (page <= maxPages && !targetUser) {
      const { data: usersPage, error: listError } = await serviceClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        logError('auth.admin.listUsers', listError, { page, perPage });
        return res.status(500).json({ success: false, error: 'Failed to search users' });
      }

      const users = usersPage?.users || [];
      if (users.length === 0) break;

      targetUser = users.find(
        (u) => (u.email || '').toLowerCase().trim() === normalizedEmail
      );

      if (users.length < perPage) break;
      page++;
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile exists but no matching auth user was found. Contact support.',
      });
    }

    // Defence in depth: the auth user id must match the candidate_profiles id.
    // candidate_profiles.id and auth.users.id are the same UUID by design.
    if (targetUser.id !== candidate.id) {
      logError('identity mismatch', {
        message: 'auth user id does not match candidate_profiles id',
      }, {
        candidateId: candidate.id,
        authUserId: targetUser.id,
        email: normalizedEmail,
      });
      return res.status(500).json({
        success: false,
        error: 'Identity mismatch. Contact support.',
      });
    }

    // ---- Update password via Admin API ----
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      logError('auth.admin.updateUserById', updateError, {
        candidateId: candidate.id,
      });
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log(`${LOG_TAG} Password reset ok`, {
      by: caller.userId,
      byRole: caller.role,
      candidateId: candidate.id,
      email: normalizedEmail,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      userId: targetUser.id,
      email: targetUser.email,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
