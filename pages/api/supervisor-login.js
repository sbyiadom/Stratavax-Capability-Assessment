import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    console.log('Login attempt for:', email);

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      if (authError.message.includes('Invalid login credentials')) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid email or password' 
        });
      }
      
      return res.status(401).json({ 
        success: false,
        error: authError.message 
      });
    }

    if (!authData?.user || !authData?.session) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }

    console.log('Auth successful for user:', authData.user.id);

    // Step 2: Check if user is in supervisor_profiles table (FIXED TABLE NAME)
    const { data: supervisor, error: supervisorError } = await supabase
      .from('supervisor_profiles')  // Changed from 'supervisors' to 'supervisor_profiles'
      .select('*')
      .eq('id', authData.user.id)  // Changed from 'user_id' to 'id'
      .eq('is_active', true)
      .maybeSingle();

    if (supervisorError) {
      console.error('Supervisor query error:', supervisorError);
      await supabase.auth.signOut();
      return res.status(403).json({ 
        success: false,
        error: 'Database error checking supervisor status' 
      });
    }

    if (!supervisor) {
      console.log('User not found in supervisor_profiles table:', authData.user.id);
      await supabase.auth.signOut();
      return res.status(403).json({ 
        success: false,
        error: 'You do not have supervisor access' 
      });
    }

    console.log('Supervisor found:', supervisor.email);

    // Step 3: Update last login
    try {
      await supabase
        .from('supervisor_profiles')  // Changed from 'supervisors' to 'supervisor_profiles'
        .update({ last_login: new Date().toISOString() })
        .eq('id', supervisor.id);  // Changed from 'id' to 'id' (already correct)
    } catch (updateError) {
      console.warn('Failed to update last login:', updateError);
    }

    // Step 4: Return success with COMPLETE session data
    return res.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: supervisor.email,
        full_name: supervisor.full_name,
        role: supervisor.role || 'supervisor'
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at
      }
    });

  } catch (error) {
    console.error('Unexpected login error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}
