// pages/api/admin/supervisors/assign-multiple.js
// COMPLETE FIXED VERSION - Simplified, deduplicates, returns detailed errors

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // 1. Get token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // 2. Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 3. Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Assign API] Auth error:', userError);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // 4. Parse request body
    const { candidateId, candidateIds, supervisorIds, isBulk } = req.body;

    console.log('[Assign API] Request:', {
      candidateId,
      candidateIds,
      supervisorIds,
      isBulk,
      userId: userData.user.id
    });

    // 5. Deduplicate and validate supervisorIds
    const cleanedSupervisorIds = [...new Set((supervisorIds || []).filter(Boolean))];
    if (cleanedSupervisorIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid supervisor ID is required'
      });
    }

    // 6. Determine which candidates to process
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

    // Remove any null/undefined values and deduplicate
    candidateIdList = [...new Set(candidateIdList.filter(Boolean))];

    if (candidateIdList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid candidate IDs provided'
      });
    }

    console.log('[Assign API] Processing candidates:', candidateIdList);
    console.log('[Assign API] Supervisors to assign:', cleanedSupervisorIds);

    // 7. Process each candidate
    const results = [];

    for (const id of candidateIdList) {
      try {
        // Step A: Delete existing assignments for this candidate
        const { error: deleteError } = await supabase
          .from('candidate_supervisors')
          .delete()
          .eq('candidate_id', id);

        if (deleteError) {
          console.error('[Assign API] Delete error for', id, ':', deleteError);
          results.push({
            candidateId: id,
            success: false,
            error: `Delete failed: ${deleteError.message}`
          });
          continue;
        }

        // Step B: Insert new assignments
        const assignments = cleanedSupervisorIds.map(sid => ({
          candidate_id: id,
          supervisor_id: sid
        }));

        const { error: insertError } = await supabase
          .from('candidate_supervisors')
          .insert(assignments);

        if (insertError) {
          console.error('[Assign API] Insert error for', id, ':', insertError);
          results.push({
            candidateId: id,
            success: false,
            error: `Insert failed: ${insertError.message}`
          });
          continue;
        }

        // Step C: Update primary supervisor in candidate_profiles
        const primarySupervisor = cleanedSupervisorIds[0];
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update({
            supervisor_id: primarySupervisor,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('[Assign API] Update error for', id, ':', updateError);
          // Don't fail, just log it
        }

        console.log('[Assign API] Success for candidate:', id);
        results.push({
          candidateId: id,
          success: true,
          assigned: cleanedSupervisorIds.length
        });

      } catch (err) {
        console.error('[Assign API] Error for', id, ':', err);
        results.push({
          candidateId: id,
          success: false,
          error: err.message || 'Unknown error'
        });
      }
    }

    // 8. Return results with detailed errors
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: failedCount === 0,
      message: failedCount === 0
        ? `Successfully assigned ${successCount} candidate(s)`
        : `${failedCount} of ${results.length} failed`,
      results,
      successCount,
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
