// pages/api/admin/set-assessment-expiration.js

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { expiresAt } = req.body;
    
    if (!expiresAt) {
      return res.status(400).json({ success: false, error: 'Missing expiresAt' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('supervisor_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Update expiration date for National Service assessment
    const { data, error: updateError } = await supabase
      .from('assessments')
      .update({ expires_at: expiresAt })
      .eq('title', 'National Service Recruitment Assessment')
      .select('id, title, expires_at');

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Expiration date updated successfully',
      assessment: data?.[0]
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
