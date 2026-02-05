// pages/api/admin/get-users.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array required' });
    }

    const users = [];
    
    for (const userId of userIds) {
      try {
        const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!error && user) {
          users.push({
            id: user.user.id,
            email: user.user.email,
            full_name: user.user.user_metadata?.full_name || user.user.email?.split('@')[0]
          });
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
