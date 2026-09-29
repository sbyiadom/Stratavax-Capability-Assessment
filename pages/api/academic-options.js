// pages/api/academic-options.js
//
// Public read-only endpoint that returns the canonical list of universities,
// programmes, and degree levels.
//
// Sources:
//   • roles        — categories 'university' and 'programme'
//   • degree_levels — the degree_levels table (bsc, btech, hnd, ...)
//
// Used by:
//   • pages/register.js                 (candidates, pre-signup — no token)
//   • pages/supervisor/add-candidate.js (supervisors)
//   • pages/supervisor/batch-manage.js  (supervisors)
//
// Read-only. Uses the service role so it works regardless of RLS on `roles`
// and `degree_levels`. Cached for 5 minutes at the CDN edge to avoid
// hammering the DB on every form mount.
//
// Response:
//   {
//     success: true,
//     universities: [{ id, name }, ...],
//     programmes:   [{ id, name }, ...],
//     degree_levels: [{ id, code, name }, ...]
//   }

import { createClient } from '@supabase/supabase-js';

const LOG_TAG = '[Academic Options]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`${LOG_TAG} Missing Supabase credentials`);
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Roles (universities + programmes) and degree_levels are independent
    // reads; run them concurrently. If either fails we surface a single
    // error — this endpoint is all-or-nothing from the form's perspective.
    const [rolesResult, degreeLevelsResult] = await Promise.all([
      serviceClient
        .from('roles')
        .select('id, name, category')
        .in('category', ['university', 'programme'])
        .order('name', { ascending: true }),
      serviceClient
        .from('degree_levels')
        .select('id, code, name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

    if (rolesResult.error) {
      console.error(`${LOG_TAG} roles fetch failed`, {
        message: rolesResult.error.message,
        code: rolesResult.error.code,
        details: rolesResult.error.details,
        hint: rolesResult.error.hint,
      });
      return res.status(500).json({ success: false, error: 'Failed to load options' });
    }

    if (degreeLevelsResult.error) {
      console.error(`${LOG_TAG} degree_levels fetch failed`, {
        message: degreeLevelsResult.error.message,
        code: degreeLevelsResult.error.code,
        details: degreeLevelsResult.error.details,
        hint: degreeLevelsResult.error.hint,
      });
      return res.status(500).json({ success: false, error: 'Failed to load options' });
    }

    const universities = [];
    const programmes = [];

    (rolesResult.data || []).forEach((row) => {
      if (!row?.name) return;
      const entry = { id: row.id, name: row.name };
      if (row.category === 'university') universities.push(entry);
      else if (row.category === 'programme') programmes.push(entry);
    });

    const degree_levels = (degreeLevelsResult.data || [])
      .filter((row) => row?.code && row?.name)
      .map((row) => ({ id: row.id, code: row.code, name: row.name }));

    // Cache for 5 minutes at the CDN edge; serve stale for up to 10 minutes
    // while revalidating. The lists change rarely (admin edits only), so this
    // is safe and dramatically reduces DB pressure from form mounts.
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
    );

    return res.status(200).json({
      success: true,
      universities,
      programmes,
      degree_levels,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
