// pages/api/admin/reset-password.js
// Fails closed. Admin can reset anyone. Supervisor can reset only candidates in their scope.
import { authorizeRequest } from '../../../utils/apiAuth';
import { chunk } from '../../../utils/chunk'; // see note below if this helper doesn't exist yet

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Fail-closed auth. No token / bad token / wrong role => 401/403 here.
  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;
  const isAdmin = !!caller.isAdmin;

  try {
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing email or newPassword' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // ---- Paginated user search (kept from the previous fix) ----
    let allUsers = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: usersPage, error: listError } = await serviceClient.auth.admin.listUsers({
        page,
        perPage
      });

      if (listError) {
        console.error('[reset-password] List users error:', listError);
        return res.status(500).json({ success: false, error: 'Failed to search users' });
      }

      if (!usersPage?.users || usersPage.users.length === 0) {
        hasMore = false;
      } else {
        allUsers = allUsers.concat(usersPage.users);
        hasMore = usersPage.users.length === perPage;
        if (hasMore) page++;
      }
    }

    const targetUser = allUsers.find(
      u => u.email?.toLowerCase().trim() === normalizedEmail
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: `User not found: ${email}. Please check the email address.`
      });
    }

    // ---- Scope enforcement for supervisors ----
    // Supervisors may only reset passwords for candidates in their scope.
    // Admins may reset anyone.
    if (!isAdmin) {
      const { data: scopedRows, error: scopeError } = await serviceClient.rpc(
        'get_scoped_candidate_ids',
        { p_caller: caller.userId, p_is_admin: false }
      );

      if (scopeError) {
        console.error('[reset-password] Scope RPC error:', scopeError);
        return res.status(500).json({ success: false, error: 'Failed to resolve scope' });
      }

      const scopedIds = Array.isArray(scopedRows)
        ? scopedRows.map(r => (typeof r === 'string' ? r : r?.get_scoped_candidate_ids)).filter(Boolean)
        : [];

      if (!scopedIds.includes(targetUser.id)) {
        // Don't leak whether the user exists — 403 for out-of-scope.
        return res.status(403).json({ success: false, error: 'Forbidden: user out of scope' });
      }
    }

    // ---- Perform the password reset ----
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[reset-password] Update password error:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      userId: targetUser.id,
      email: targetUser.email
    });

  } catch (error) {
    console.error('[reset-password] Unexpected error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
