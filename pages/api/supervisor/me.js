// pages/api/supervisor/me.js
// Phase 7B — returns the authenticated caller's supervisor profile.
//
// Replaces the client-side supabase.from('supervisor_profiles').select(...)
// in pages/supervisor/add-candidate.js, which was silently returning null
// under the Phase 7 RLS deny-all policy.
//
// Response: { success: true, profile: { id, email, full_name, role, is_active } }

import { authorizeRequest } from '../../../utils/apiAuth';

const LOG_TAG = '[Supervisor Me]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const auth = await authorizeRequest(req, ['admin', 'supervisor']);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const { caller, serviceClient } = auth;

  try {
    const { data: profile, error } = await serviceClient
      .from('supervisor_profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', caller.userId)
      .maybeSingle();

    if (error) {
      console.error(`${LOG_TAG} profile lookup failed`, {
        message: error.message,
        code: error.code,
        userId: caller.userId,
      });
      return res.status(500).json({ success: false, error: 'Failed to load profile' });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Supervisor profile not found. Please contact support.',
      });
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        is_active: profile.is_active !== false,
      },
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
