// pages/api/admin/supervisors/assign.js - SIMPLIFIED WORKING VERSION

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Verify the user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Get request body
    const { candidateId, supervisorIds } = req.body;

    console.log('[Assign API] Request received:', { 
      candidateId, 
      supervisorIds,
      userId: userData.user.id 
    });

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'Missing candidateId' });
    }

    if (!supervisorIds || !Array.isArray(supervisorIds)) {
      return res.status(400).json({ success: false, error: 'supervisorIds must be an array' });
    }

    // STEP 1: Delete all existing assignments for this candidate
    const { error: deleteError } = await supabase
      .from('candidate_supervisors')
      .delete()
      .eq('candidate_id', candidateId);

    if (deleteError) {
      console.error('[Assign API] Delete error:', deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    // STEP 2: Insert new assignments
    if (supervisorIds.length > 0) {
      const assignments = supervisorIds.map(supervisorId => ({
        candidate_id: candidateId,
        supervisor_id: supervisorId,
        assigned_by: userData.user.id
      }));

      const { error: insertError } = await supabase
        .from('candidate_supervisors')
        .insert(assignments);

      if (insertError) {
        console.error('[Assign API] Insert error:', insertError);
        return res.status(500).json({ success: false, error: insertError.message });
      }

      console.log('[Assign API] Inserted', supervisorIds.length, 'assignments');
    }

    return res.status(200).json({
      success: true,
      message: `${supervisorIds.length} supervisor(s) assigned successfully`
    });

  } catch (error) {
    console.error('[Assign API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
