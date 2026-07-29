// pages/api/admin/supervisors/assign-multiple.js
// FIXED: Assigns multiple supervisors to candidates

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

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Assign Multiple API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { candidateId, candidateIds, supervisorIds, isBulk } = req.body;

    console.log('[Assign Multiple API] Request:', { candidateId, candidateIds, supervisorIds, isBulk });

    if (!supervisorIds || !Array.isArray(supervisorIds) || supervisorIds.length === 0) {
      return res.status(400).json({ success: false, error: 'supervisorIds is required and must be an array' });
    }

    let ids = [];
    if (isBulk && candidateIds) {
      ids = Array.isArray(candidateIds) ? candidateIds : [candidateIds];
    } else if (candidateId) {
      ids = [candidateId];
    } else {
      return res.status(400).json({ success: false, error: 'candidateId or candidateIds is required' });
    }

    const results = [];

    for (const id of ids) {
      try {
        // Delete existing assignments
        const { error: deleteError } = await supabase
          .from('candidate_supervisors')
          .delete()
          .eq('candidate_id', id);

        if (deleteError) {
          console.error('[Assign Multiple API] Delete error for', id, ':', deleteError);
          results.push({ candidateId: id, success: false, error: deleteError.message });
          continue;
        }

        // Insert new assignments
        const assignments = supervisorIds.map(sid => ({
          candidate_id: id,
          supervisor_id: sid,
          assigned_by: userData.user.id
        }));

        const { error: insertError } = await supabase
          .from('candidate_supervisors')
          .insert(assignments);

        if (insertError) {
          console.error('[Assign Multiple API] Insert error for', id, ':', insertError);
          results.push({ candidateId: id, success: false, error: insertError.message });
          continue;
        }

        // Update primary supervisor in candidate_profiles
        const primarySupervisor = supervisorIds[0];
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({ supervisor_id: primarySupervisor })
          .eq('id', id);

        if (updateError) {
          console.error('[Assign Multiple API] Update error for', id, ':', updateError);
          // Don't fail the whole operation, just log it
        }

        results.push({ candidateId: id, success: true });
        console.log('[Assign Multiple API] Successfully assigned', supervisorIds.length, 'supervisors to', id);

      } catch (err) {
        console.error('[Assign Multiple API] Error processing', id, ':', err);
        results.push({ candidateId: id, success: false, error: err.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    const failed = results.filter(r => !r.success);

    return res.status(200).json({
      success: allSuccess,
      message: allSuccess ? 'All assignments completed successfully' : `${failed.length} failed`,
      results,
      failedCount: failed.length
    });

  } catch (error) {
    console.error('[Assign Multiple API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
