// pages/api/login.js
// Phase 7A: switched to service role key so login works after RLS is enabled.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    console.log('1. Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Login] Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Service-role client bypasses RLS. Required so login works once RLS
    // is enabled on supervisor_profiles and candidate_profiles.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Use a separate client with the anon key purely for signInWithPassword.
    // signInWithPassword does not need RLS — it hits Supabase Auth directly.
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Step 1: Authenticate
    console.log('2. Attempting auth...');
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('3. Auth error:', authError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('4. Auth successful, user ID:', authData.user.id);

    // Step 2: Check supervisor_profiles via service role (RLS-immune)
    console.log('5. Querying supervisor_profiles for ID:', authData.user.id);
    const { data: supervisor, error: supError } = await adminClient
      .from('supervisor_profiles')
      .select('*')
      .eq('id', authData.user.id);

    if (supError) {
      console.error('6. Supervisor query error:', supError);
      // Continue to candidate check
    }

    if (supervisor && supervisor.length > 0) {
      const user = supervisor[0];
      console.log('7. User is supervisor with role:', user.role);
      return res.status(200).json({
        success: true,
        role: user.role || 'supervisor',
        user: {
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        session: authData.session,
      });
    }

    // Step 3: Check candidate_profiles via service role
    console.log('8. Checking candidate_profiles for ID:', authData.user.id);
    const { data: candidate, error: canError } = await adminClient
      .from('candidate_profiles')
      .select('*')
      .eq('id', authData.user.id);

    if (canError) {
      console.error('9. Candidate query error:', canError);
    }

    if (candidate && candidate.length > 0) {
      const user = candidate[0];
      console.log('10. User is candidate');
      return res.status(200).json({
        success: true,
        role: 'candidate',
        user: {
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name || user.email,
        },
        session: authData.session,
      });
    }

    // Step 4: Not found in either table
    console.log('11. User not found in any profile table');

    await authClient.auth.signOut();
    return res.status(403).json({
      error: 'Account not properly configured',
      debug: {
        userId: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error('[Login] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
