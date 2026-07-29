// pages/api/admin/supervisors/assign-multiple.js
// FINAL WORKING VERSION

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    // ============================================================
    // CREATE SUPABASE CLIENT WITH SERVICE ROLE KEY
    // ============================================================
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Assign API] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    console.log('[Assign API] Service role key present, creating admin client');

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user (using the admin client)
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Assign API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const { candidateId, candidateIds, supervisorIds, isBulk } = req.body;

    console.log('[Assign API] Request:', {
      candidateId,
      candidateIds,
      supervisorIds,
      isBulk,
      userId: userData.user.id
    });

    // Validate supervisorIds
    const cleanedSupervisorIds = [...new Set((supervisorIds || []).filter(Boolean))];
    if (cleanedSupervisorIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid supervisor ID is required'
      });
    }

    // Determine candidates
    let candidateIdList = [];
    if (isBulk && candidateIds) {
      candidateIdList = Array.isArray(candidateIds) ? candidateIds : [candidateIds];
    } else if (candidateId) {
      candidateIdList = [candidateId];
    } else {
      return res.status(400).json({
        success: false,
        error: 'candidateId or candidateIds is required'
      });
    }

    candidateIdList = [...new Set(candidateIdList.filter(Boolean))];

    if (candidateIdList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid candidate IDs provided'
      });
    }

    console.log('[Assign API] Processing candidates:', candidateIdList);
    console.log('[Assign API] Supervisors to assign:', cleanedSupervisorIds);

    const results = [];

    for (const id of candidateIdList) {
      try {
        // Step 1: Delete existing assignments
        const { error: deleteError } = await supabase
          .from('candidate_supervisors')
          .delete()
          .eq('candidate_id', id);

        if (deleteError) {
          console.error('[Assign API] Delete error:', deleteError);
          results.push({ candidateId: id, success: false, error: deleteError.message });
          continue;
        }

        // Step 2: Insert new assignments
        const assignments = cleanedSupervisorIds.map(sid => ({
          candidate_id: id,
          supervisor_id: sid
        }));

        const { error: insertError } = await supabase
          .from('candidate_supervisors')
          .insert(assignments);

        if (insertError) {
          console.error('[Assign API] Insert error:', insertError);
          results.push({ candidateId: id, success: false, error: insertError.message });
          continue;
        }

        // Step 3: Update candidate_profiles with primary supervisor
        const primarySupervisor = cleanedSupervisorIds[0];
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({
            supervisor_id: primarySupervisor,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('[Assign API] Update error:', updateError);
        }

        console.log('[Assign API] Success for candidate:', id);
        results.push({ candidateId: id, success: true });

      } catch (err) {
        console.error('[Assign API] Error for', id, ':', err);
        results.push({ candidateId: id, success: false, error: err.message });
      }
    }

    const failedCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: failedCount === 0,
      message: failedCount === 0 ? 'All assignments completed successfully' : `${failedCount} failed`,
      results,
      failedCount
    });

  } catch (error) {
    console.error('[Assign API] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
