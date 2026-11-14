// pages/api/admin/reset-password.js
// Phase 9: Sends "Your Password Was Reset" email after successful password update.
// Fails closed. Admin can reset anyone. Supervisor can reset only candidates in their scope.

import { authorizeRequest } from '../../../utils/apiAuth';
import { sendEmail } from '../../../utils/email';

function sendPasswordResetEmail(candidateEmail, candidateName, newPassword, callerName) {
  if (!candidateEmail) return Promise.resolve({ sent: false });

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:20px;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a202c;">
      <div style="max-width:550px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);padding:32px 24px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:white;letter-spacing:2px;margin-bottom:8px;">STRATAVAX</div>
          <div style="color:rgba(255,255,255,0.8);font-size:14px;">Talent Assessment Platform</div>
        </div>
        <div style="padding:32px;">
          <div style="font-size:20px;font-weight:600;margin-bottom:16px;color:#0A1929;">Hello, ${candidateName || 'Candidate'}</div>
          <p>Your password has been reset by an administrator. Please use the temporary password below to sign in.</p>
          <div style="background:#F5F7FA;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #6366f1;">
            <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Temporary Password</div>
            <div style="font-size:18px;font-weight:700;color:#0A1929;font-family:'Courier New',monospace;letter-spacing:0.1em;">${newPassword}</div>
          </div>
          <div style="background:#FEF3C7;border-radius:12px;padding:16px;margin:24px 0;border-left:4px solid #f59e0b;">
            <div style="font-size:14px;color:#92400E;font-weight:600;margin-bottom:4px;">⚠️ Security Notice</div>
            <div style="font-size:13px;color:#92400E;line-height:1.5;">Please change this password after logging in. Do not share this email with anyone.</div>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://stratavax-capability-assessment.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">Log In Now</a>
          </div>
          <p style="margin-top: 24px; font-size: 13px; color: #64748B; text-align: center;">
            If you did not request this password reset, please contact support immediately.<br>
            <strong>${callerName || "Stratavax Admin"}</strong>
          </p>
        </div>
        <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
          <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: candidateEmail,
    toName: candidateName,
    subject: `🔑 Your Password Has Been Reset — Stratavax`,
    html,
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

    // Paginated user search
    let allUsers = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: usersPage, error: listError } = await serviceClient.auth.admin.listUsers({ page, perPage });

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

    const targetUser = allUsers.find(u => u.email?.toLowerCase().trim() === normalizedEmail);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: `User not found: ${email}. Please check the email address.`
      });
    }

    // Scope enforcement for supervisors
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
        return res.status(403).json({ success: false, error: 'Forbidden: user out of scope' });
      }
    }

    // Perform the password reset
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('[reset-password] Update password error:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Fetch candidate name for personalization
    const { data: candidate } = await serviceClient
      .from('candidate_profiles')
      .select('full_name')
      .eq('id', targetUser.id)
      .maybeSingle();

    // Send the email (non-blocking)
    let emailSent = false;
    try {
      const callerName = caller.user_metadata?.full_name || caller.email || 'Stratavax Admin';
      const emailResult = await sendPasswordResetEmail(
        targetUser.email,
        candidate?.full_name || targetUser.email,
        newPassword,
        callerName
      );
      emailSent = emailResult.success;
    } catch (emailErr) {
      console.error('[reset-password] Non-fatal email error:', emailErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      userId: targetUser.id,
      email: targetUser.email,
      emailSent
    });

  } catch (error) {
    console.error('[reset-password] Unexpected error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
