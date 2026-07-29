// pages/api/admin/supervisor-assignments.js
// FIXED: Gets assignments for candidates

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Assignments API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { candidateIds } = req.query;

    if (!candidateIds) {
      return res.status(400).json({ success: false, error: 'candidateIds is required' });
    }

    // Split comma-separated IDs
    const ids = candidateIds.split(',').filter(Boolean);

    if (ids.length === 0) {
      return res.status(200).json({
        success: true,
        assignments: {}
      });
    }

    console.log('[Assignments API] Fetching for', ids.length, 'candidates');

    // Fetch all assignments for these candidates
    const { data: assignments, error: assignError } = await supabase
      .from('candidate_supervisors')
      .select('candidate_id, supervisor_id')
      .in('candidate_id', ids);

    if (assignError) {
      console.error('[Assignments API] Error:', assignError);
      // If the table doesn't exist, return empty
      if (assignError.code === '42P01') {
        return res.status(200).json({
          success: true,
          assignments: {},
          message: 'candidate_supervisors table not found'
        });
      }
      return res.status(500).json({ success: false, error: assignError.message });
    }

    // Group by candidate_id
    const grouped = {};
    if (assignments) {
      assignments.forEach(assignment => {
        if (!grouped[assignment.candidate_id]) {
          grouped[assignment.candidate_id] = [];
        }
        grouped[assignment.candidate_id].push(assignment.supervisor_id);
      });
    }

    console.log('[Assignments API] Found', Object.keys(grouped).length, 'candidates with assignments');

    return res.status(200).json({
      success: true,
      assignments: grouped
    });

  } catch (error) {
    console.error('[Assignments API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
