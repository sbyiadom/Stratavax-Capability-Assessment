// pages/api/admin/supervisors/clear-assignments.js
// FIXED: Clears all assignments for a candidate

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Clear Assignments API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }

    console.log('[Clear Assignments API] Clearing assignments for', candidateId);

    // Delete from candidate_supervisors
    const { error: deleteError } = await supabase
      .from('candidate_supervisors')
      .delete()
      .eq('candidate_id', candidateId);

    if (deleteError) {
      console.error('[Clear Assignments API] Delete error:', deleteError);
      // If table doesn't exist, that's fine
      if (deleteError.code !== '42P01') {
        return res.status(500).json({ success: false, error: deleteError.message });
      }
    }

    // Update candidate_profiles
    const { error: updateError } = await supabase
      .from('candidate_profiles')
      .update({ supervisor_id: null })
      .eq('id', candidateId);

    if (updateError) {
      console.error('[Clear Assignments API] Update error:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log('[Clear Assignments API] Successfully cleared assignments for', candidateId);

    return res.status(200).json({
      success: true,
      message: 'All supervisor assignments cleared successfully'
    });

  } catch (error) {
    console.error('[Clear Assignments API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
