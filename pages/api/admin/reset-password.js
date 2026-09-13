// pages/api/admin/reset-password.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing email or newPassword' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Verify the requesting user is an admin or supervisor
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const { data: userData } = await serviceClient.auth.getUser(token);
      if (userData?.user) {
        const role = userData.user.user_metadata?.role;
        if (role !== 'admin' && role !== 'supervisor') {
          return res.status(403).json({ success: false, error: 'Unauthorized: Admin access required' });
        }
      }
    }

    // Find user by email
    const { data: users, error: listError } = await serviceClient.auth.admin.listUsers();

    if (listError) {
      console.error('List users error:', listError);
      return res.status(500).json({ success: false, error: 'Failed to find user' });
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update password using Admin API
    const { data, error: updateError } = await serviceClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Update password error:', updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log('[Admin] Password reset for:', email);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      userId: user.id,
      email: user.email
    });

  } catch (error) {
    console.error('[Admin] Reset password error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
