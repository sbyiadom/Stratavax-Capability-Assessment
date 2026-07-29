// pages/api/admin/supervisors/assign.js - UPDATED

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Verify user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Assign API] Auth error:', userError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Check if user is admin
    const userRole = userData.user.user_metadata?.role || userData.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { candidateId, supervisorIds, action } = req.body;

    console.log('[Assign API] Request:', { candidateId, supervisorIds, action });

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'Missing candidateId' });
    }

    if (!supervisorIds || !Array.isArray(supervisorIds)) {
      return res.status(400).json({ success: false, error: 'Invalid supervisorIds' });
    }

    const adminId = userData.user.id;

    // Check if candidate exists
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('[Assign API] Candidate error:', candidateError);
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Check if supervisors exist
    const { data: supervisors, error: supervisorsError } = await supabase
      .from('supervisor_profiles')
      .select('id, full_name')
      .in('id', supervisorIds);

    if (supervisorsError) {
      console.error('[Assign API] Supervisors error:', supervisorsError);
      return res.status(500).json({ success: false, error: supervisorsError.message });
    }

    const foundIds = supervisors.map(s => s.id);
    const missingIds = supervisorIds.filter(id => !foundIds.includes(id));
    if (missingIds.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Supervisors not found: ${missingIds.join(', ')}` 
      });
    }

    if (action === 'replace') {
      // Delete all existing assignments
      const { error: deleteError } = await supabase
        .from('candidate_supervisors')
        .delete()
        .eq('candidate_id', candidateId);

      if (deleteError) {
        console.error('[Assign API] Delete error:', deleteError);
        return res.status(500).json({ success: false, error: deleteError.message });
      }

      // Insert new assignments
      if (supervisorIds.length > 0) {
        const assignments = supervisorIds.map(supervisorId => ({
          candidate_id: candidateId,
          supervisor_id: supervisorId,
          assigned_by: adminId
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('candidate_supervisors')
          .insert(assignments)
          .select();

        if (insertError) {
          console.error('[Assign API] Insert error:', insertError);
          return res.status(500).json({ success: false, error: insertError.message });
        }

        console.log('[Assign API] Inserted:', inserted?.length || 0);
      }

      return res.status(200).json({
        success: true,
        message: 'Supervisors updated successfully',
        count: supervisorIds.length
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use: replace'
    });

  } catch (error) {
    console.error('[Assign API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
