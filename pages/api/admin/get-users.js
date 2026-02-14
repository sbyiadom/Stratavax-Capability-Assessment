import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userIds, includeProfiles = true } = req.body;
    
    // Validate input
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    if (userIds.length === 0) {
      return res.status(200).json({ users: [] });
    }

    // First, try to get users from candidate_profiles (faster)
    let profiles = [];
    if (includeProfiles) {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('candidate_profiles')
        .select('*')
        .in('id', userIds);

      if (!profileError && profileData) {
        profiles = profileData;
      }
    }

    // Create a map of profile data by user ID
    const profileMap = {};
    profiles.forEach(profile => {
      profileMap[profile.id] = profile;
    });

    // Fetch users that don't have profiles or if we need all auth data
    const users = [];
    const usersToFetch = [];

    for (const userId of userIds) {
      if (profileMap[userId]) {
        // Use profile data
        users.push({
          id: userId,
          email: profileMap[userId].email || 'Unknown Email',
          full_name: profileMap[userId].full_name || 'Candidate',
          department: profileMap[userId].department,
          position: profileMap[userId].position,
          phone: profileMap[userId].phone,
          employee_id: profileMap[userId].employee_id,
          created_at: profileMap[userId].created_at,
          updated_at: profileMap[userId].updated_at,
          source: 'profile'
        });
      } else {
        usersToFetch.push(userId);
      }
    }

    // Fetch remaining users from auth
    if (usersToFetch.length > 0) {
      // Use batch fetching if possible (Supabase doesn't have batch get, so we'll do individual)
      for (const userId of usersToFetch) {
        try {
          const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
          
          if (!error && user && user.user) {
            const userData = {
              id: user.user.id,
              email: user.user.email || 'Unknown Email',
              full_name: user.user.user_metadata?.full_name || 
                        user.user.user_metadata?.name ||
                        user.user.email?.split('@')[0] || 
                        'Candidate',
              created_at: user.user.created_at,
              last_sign_in: user.user.last_sign_in_at,
              source: 'auth'
            };

            users.push(userData);

            // Optionally create a profile for this user for future lookups
            if (includeProfiles) {
              await supabaseAdmin
                .from('candidate_profiles')
                .upsert({
                  id: userId,
                  email: user.user.email,
                  full_name: userData.full_name,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'id',
                  ignoreDuplicates: true
                });
            }
          } else {
            // If user not found, add placeholder
            users.push({
              id: userId,
              email: 'Unknown Email',
              full_name: 'Candidate',
              source: 'placeholder'
            });
          }
        } catch (userError) {
          console.error(`Error fetching user ${userId}:`, userError);
          // Add placeholder if error
          users.push({
            id: userId,
            email: 'Unknown Email',
            full_name: 'Candidate',
            source: 'placeholder',
            error: userError.message
          });
        }
      }
    }

    // Sort users to match the original order of userIds
    const orderedUsers = userIds.map(id => users.find(u => u.id === id) || {
      id,
      email: 'Unknown Email',
      full_name: 'Candidate',
      source: 'missing'
    });

    return res.status(200).json({ 
      users: orderedUsers,
      stats: {
        total: orderedUsers.length,
        from_profiles: profiles.length,
        from_auth: usersToFetch.length - (orderedUsers.length - profiles.length),
        placeholders: orderedUsers.filter(u => u.source === 'placeholder' || u.source === 'missing').length
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
