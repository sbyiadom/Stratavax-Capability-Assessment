// pages/api/academic-options.js
//
// Public read-only endpoint that returns the canonical list of universities
// and programmes, sourced from the `roles` table (categories 'university'
// and 'programme').
//
// Used by:
//   • pages/register.js                (candidates, pre-signup — no token)
//   • pages/supervisor/add-candidate.js (supervisors)
//   • pages/supervisor/batch-manage.js  (supervisors)
//
// Read-only. Service role, so it works regardless of RLS on `roles`.
// Cached for 5 minutes to avoid hammering the DB on every form mount.

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

    const { data: rows, error } = await serviceClient
      .from('roles')
      .select('id, name, category')
      .in('category', ['university', 'programme'])
      .order('name', { ascending: true });

    if (error) {
      console.error(`${LOG_TAG} roles fetch failed`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({ success: false, error: 'Failed to load options' });
    }

    const universities = [];
    const programmes = [];

    (rows || []).forEach((row) => {
      if (!row?.name) return;
      const entry = { id: row.id, name: row.name };
      if (row.category === 'university') universities.push(entry);
      else if (row.category === 'programme') programmes.push(entry);
    });

    // Cache for 5 minutes; allow shared CDN caching.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      universities,
      programmes,
    });
  } catch (error) {
    console.error(`${LOG_TAG} Unhandled error:`, error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error',
    });
  }
}
