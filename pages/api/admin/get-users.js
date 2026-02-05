// pages/api/admin/get-users.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Make sure this is in your .env.local
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userIds } = req.body;
    
    // Validate input
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const users = [];
    
    // Fetch each user individually
    for (const userId of userIds) {
      try {
        const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!error && user && user.user) {
          users.push({
            id: user.user.id,
            email: user.user.email || 'Unknown Email',
            full_name: user.user.user_metadata?.full_name || 
                      user.user.email?.split('@')[0] || 
                      'Candidate'
          });
        } else {
          // If user not found, add placeholder
          users.push({
            id: userId,
            email: 'Unknown Email',
            full_name: 'Candidate'
          });
        }
      } catch (userError) {
        console.error(`Error fetching user ${userId}:`, userError);
        // Add placeholder if error
        users.push({
          id: userId,
          email: 'Unknown Email',
          full_name: 'Candidate'
        });
      }
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
