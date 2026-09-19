// pages/api/supervisor/batch-manage/list.js
// Phase 7A — server-side candidate list for the supervisor batch-manage page.
//
// Replaces direct supabase reads in pages/supervisor/batch-manage.js.
// Uses strict scoping (Option A): admin → all candidates, supervisor → assigned.

import { createClient } from '@supabase/supabase-js';
import {
  resolveCallerRole,
  getAccessibleCandidateIds,
} from '../../../../utils/scoping';

function logError(tag, error, extra = {}) {
  console.error(`[Supervisor Batch Manage List] ${tag}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Supervisor Batch Manage List] Missing Supabase credentials');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !userData?.user) {
      logError('auth.getUser failed', authError || { message: 'no user' });
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const caller = await resolveCallerRole(
      serviceClient,
      userData.user.id,
      userData.user.user_metadata || null
    );

    if (caller.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account is inactive' });
    }

    if (!caller.isAdmin && !caller.isSupervisor) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const scopedCaller = {
      userId: userData.user.id,
      isAdmin: caller.isAdmin,
      isSupervisor: caller.isSupervisor,
      role: caller.role,
    };

    const allowedIds = await getAccessibleCandidateIds(serviceClient, scopedCaller);

    if (Array.isArray(allowedIds) && allowedIds.length === 0) {
      return res.status(200).json({
        success: true,
        candidates: [],
        scope: { type: 'supervisor', candidateCount: 0 },
      });
    }

    let candidatesQuery = serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, phone, university, programme, supervisor_id, created_at')
      .order('created_at', { ascending: false });

    if (Array.isArray(allowedIds)) {
      candidatesQuery = candidatesQuery.in('id', allowedIds);
    }

    const { data: candidates, error: candidatesError } = await candidatesQuery;

    if (candidatesError) {
      logError('candidates fetch failed', candidatesError, { scope: caller.role });
      return res.status(500).json({ success: false, error: 'Failed to load candidates' });
    }

    const rows = (candidates || []).map((c) => ({
      id: c.id,
      full_name: c.full_name || '',
      email: c.email || '',
      phone: c.phone || '',
      university: c.university || '',
      programme: c.programme || '',
      supervisor_id: c.supervisor_id || null,
      created_at: c.created_at || null,
    }));

    return res.status(200).json({
      success: true,
      candidates: rows,
      scope: {
        type: caller.isAdmin ? 'admin' : 'supervisor',
        candidateCount: rows.length,
      },
    });
  } catch (error) {
    console.error('[Supervisor Batch Manage List] Unhandled error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
