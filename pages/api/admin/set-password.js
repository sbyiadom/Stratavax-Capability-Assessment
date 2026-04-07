// pages/api/admin/set-password.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the password from request body
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'Missing userId or newPassword' });
  }

  // Create admin client with service role key (this is safe on server)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Update the user's password
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Password updated successfully',
    email: data.user.email
  });
}
