// pages/api/admin/supervisors/assign.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
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

    // Verify admin role
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userRole = userData.user.user_metadata?.role || userData.user.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { candidateId, supervisorIds, action } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'Missing candidateId' });
    }

    if (action === 'replace' && !supervisorIds) {
      return res.status(400).json({ success: false, error: 'Missing supervisorIds' });
    }

    const adminId = userData.user.id;

    // Check if candidate exists
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id, full_name')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Handle different actions
    if (action === 'add') {
      // Add a single supervisor
      const supervisorId = supervisorIds[0] || supervisorIds;
      
      const { error: insertError } = await supabase
        .from('candidate_supervisors')
        .insert({
          candidate_id: candidateId,
          supervisor_id: supervisorId,
          assigned_by: adminId
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(409).json({ success: false, error: 'Assignment already exists' });
        }
        return res.status(500).json({ success: false, error: insertError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Supervisor assigned successfully'
      });
    }

    if (action === 'remove') {
      // Remove a single supervisor
      const supervisorId = supervisorIds[0] || supervisorIds;
      
      const { error: deleteError } = await supabase
        .from('candidate_supervisors')
        .delete()
        .eq('candidate_id', candidateId)
        .eq('supervisor_id', supervisorId);

      if (deleteError) {
        return res.status(500).json({ success: false, error: deleteError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Supervisor removed successfully'
      });
    }

    if (action === 'replace') {
      // Replace all supervisors with new list
      // First, delete all existing assignments
      const { error: deleteError } = await supabase
        .from('candidate_supervisors')
        .delete()
        .eq('candidate_id', candidateId);

      if (deleteError) {
        return res.status(500).json({ success: false, error: deleteError.message });
      }

      // Then insert new assignments
      if (supervisorIds && supervisorIds.length > 0) {
        const assignments = supervisorIds.map(supervisorId => ({
          candidate_id: candidateId,
          supervisor_id: supervisorId,
          assigned_by: adminId
        }));

        const { error: insertError } = await supabase
          .from('candidate_supervisors')
          .insert(assignments);

        if (insertError) {
          return res.status(500).json({ success: false, error: insertError.message });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Supervisors updated successfully'
      });
    }

    if (action === 'list') {
      // Get all supervisors for a candidate
      const { data: assignments, error: listError } = await supabase
        .from('candidate_supervisors')
        .select(`
          supervisor_id,
          assigned_at,
          assigned_by,
          users:supervisor_id (email, raw_user_meta_data)
        `)
        .eq('candidate_id', candidateId);

      if (listError) {
        return res.status(500).json({ success: false, error: listError.message });
      }

      return res.status(200).json({
        success: true,
        supervisors: assignments || []
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use: add, remove, replace, or list'
    });

  } catch (error) {
    console.error('[Supervisor Assign API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
