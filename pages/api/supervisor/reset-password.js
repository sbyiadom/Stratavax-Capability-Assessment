// pages/api/supervisor/reset-password.js
// Phase 9: Sends "Your Password Was Reset" email after successful password update.

import { authorizeRequest } from '../../../utils/apiAuth';
import { sendEmail } from '../../../utils/email';

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

// ============================================================
// EMAIL DISPATCH
// ============================================================
async function sendPasswordResetEmail(candidate, newPassword, callerName) {
  if (!candidate?.email) {
    console.log('[reset-password] Skipping email — no candidate email');
    return { sent: false };
  }

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
          <div style="font-size:20px;font-weight:600;margin-bottom:16px;color:#0A1929;">Hello, ${candidate.full_name}</div>
          <p>Your password has been reset by your supervisor. Please use the temporary password below to sign in.</p>

          <div style="background:#F5F7FA;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #6366f1;">
            <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Temporary Password</div>
            <div style="font-size:18px;font-weight:700;color:#0A1929;font-family:'Courier New',monospace;letter-spacing:0.1em;">${newPassword}</div>
          </div>

          <div style="background:#FEF3C7;border-radius:12px;padding:16px;margin:24px 0;border-left:4px solid #f59e0b;">
            <div style="font-size:14px;color:#92400E;font-weight:600;margin-bottom:4px;">⚠️ Security Notice</div>
            <div style="font-size:13px;color:#92400E;line-height:1.5;">You must change this password after your first login. Do not share this email with anyone.</div>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="https://stratavax-capability-assessment.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#0A1929 0%,#1E3A5F 100%);color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:500;">Log In Now</a>
          </div>

          <p style="margin-top: 24px; font-size: 13px; color: #64748B; text-align: center;">
            If you did not request this password reset, please contact your supervisor immediately.<br>
            <strong>${callerName || "Your Supervisor"}</strong>
          </p>
        </div>
        <div style="background:#F8FAFC;padding:20px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
          <p style="margin:4px 0;">© 2026 Stratavax - Talent Assessment Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await sendEmail({
      to: candidate.email,
      toName: candidate.full_name,
      subject: `🔑 Your Password Has Been Reset — Stratavax`,
      html,
    });

    if (result.success) {
      console.log(`[reset-password] Email sent → ${candidate.email}`);
      return { sent: true };
    } else {
      console.error('[reset-password] Email failed:', result.error);
      return { sent: false, error: result.error };
    }
  } catch (err) {
    console.error('[reset-password] Email dispatch error:', err);
    return { sent: false, error: err.message };
  }
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
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing email or newPassword' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // ---- Scope check ----
    const { data: candidate, error: candidateError } = await serviceClient
      .from('candidate_profiles')
      .select('id, email, full_name')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (candidateError) {
      logError('candidate_profiles lookup', candidateError, { role: caller.role, email: normalizedEmail });
      return res.status(500).json({ success: false, error: 'Failed to look up candidate' });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'No candidate in your scope matches that email.',
      });
    }

    if (!caller.isAdmin) {
      const { data: scopedRows, error: scopedError } = await serviceClient.rpc(
        'get_scoped_candidate_ids',
        { p_caller: caller.userId, p_is_admin: false }
      );

      if (scopedError) {
        logError('rpc get_scoped_candidate_ids', scopedError, { role: caller.role, userId: caller.userId });
        return res.status(500).json({ success: false, error: 'Failed to verify scope' });
      }

      const scopedIds = Array.isArray(scopedRows)
        ? scopedRows.map((row) => (typeof row === 'string' ? row : row?.get_scoped_candidate_ids)).filter(Boolean)
        : [];

      if (!scopedIds.includes(candidate.id)) {
        logError('scope check rejected', { message: 'candidate out of scope' }, {
          role: caller.role,
          userId: caller.userId,
          candidateId: candidate.id,
        });
        return res.status(403).json({ success: false, error: 'This candidate is not in your scope.' });
      }
    }

    // ---- Locate auth user ----
    let targetUser = null;
    let page = 1;
    const perPage = 1000;
    const maxPages = 20;
    while (page <= maxPages && !targetUser) {
      const { data: usersPage, error: listError } = await serviceClient.auth.admin.listUsers({ page, perPage });

      if (listError) {
        logError('auth.admin.listUsers', listError, { page, perPage });
        return res.status(500).json({ success: false, error: 'Failed to search users' });
      }

      const users = usersPage?.users || [];
      if (users.length === 0) break;

      targetUser = users.find((u) => (u.email || '').toLowerCase().trim() === normalizedEmail);

      if (users.length < perPage) break;
      page++;
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Candidate profile exists but no matching auth user was found. Contact support.',
      });
    }

    if (targetUser.id !== candidate.id) {
      logError('identity mismatch', { message: 'auth user id does not match candidate_profiles id' }, {
        candidateId: candidate.id,
        authUserId: targetUser.id,
        email: normalizedEmail,
      });
      return res.status(500).json({ success: false, error: 'Identity mismatch. Contact support.' });
    }

    // ---- Update password ----
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      logError('auth.admin.updateUserById', updateError, { candidateId: candidate.id });
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log(`${LOG_TAG} Password reset ok`, {
      by: caller.userId,
      byRole: caller.role,
      candidateId: candidate.id,
      email: normalizedEmail,
    });

    // ---- Send email (non-blocking) ----
    let emailSent = false;
    try {
      const callerName = caller.name || caller.email || null;
      const emailResult = await sendPasswordResetEmail(candidate, newPassword, callerName);
      emailSent = emailResult.sent;
    } catch (emailErr) {
      console.error('[reset-password] Non-fatal email error:', emailErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      userId: targetUser.id,
      email: targetUser.email,
      emailSent,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
