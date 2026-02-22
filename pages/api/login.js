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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Step 1: Authenticate
    console.log('2. Attempting auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('3. Auth error:', authError);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('4. Auth successful, user ID:', authData.user.id);

    // Step 2: Check supervisor_profiles
    console.log('5. Querying supervisor_profiles...');
    const { data: supervisor, error: supError } = await supabase
      .from('supervisor_profiles')
      .select('*')
      .eq('id', authData.user.id);

    console.log('6. Supervisor query result:', { 
      found: supervisor?.length > 0, 
      count: supervisor?.length,
      error: supError?.message 
    });

    if (supError) {
      console.error('7. Supervisor query error:', supError);
    }

    if (supervisor && supervisor.length > 0) {
      const user = supervisor[0];
      console.log('8. User is supervisor with role:', user.role);
      return res.status(200).json({
        success: true,
        role: user.role || 'supervisor',
        user: {
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        },
        session: authData.session
      });
    }

    // Step 3: Check candidate_profiles
    console.log('9. Checking candidate_profiles...');
    const { data: candidate, error: canError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', authData.user.id);

    console.log('10. Candidate query result:', { 
      found: candidate?.length > 0, 
      count: candidate?.length,
      error: canError?.message 
    });

    if (candidate && candidate.length > 0) {
      const user = candidate[0];
      console.log('11. User is candidate');
      return res.status(200).json({
        success: true,
        role: 'candidate',
        user: {
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name || user.email
        },
        session: authData.session
      });
    }

    // Step 4: Not found in either table
    console.log('12. User not found in any profile table');
    await supabase.auth.signOut();
    return res.status(403).json({ 
      error: 'Account not properly configured',
      debug: {
        userId: authData.user.id,
        email: authData.user.email
      }
    });

  } catch (error) {
    console.error('13. Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
