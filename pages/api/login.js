import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is a supervisor
    const { data: supervisor } = await supabase
      .from('supervisor_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (supervisor) {
      return res.status(200).json({
        success: true,
        role: supervisor.role || 'supervisor',
        user: {
          id: authData.user.id,
          email: supervisor.email,
          full_name: supervisor.full_name,
          role: supervisor.role
        },
        session: authData.session
      });
    }

    // Check if user is a candidate
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (candidate) {
      return res.status(200).json({
        success: true,
        role: 'candidate',
        user: {
          id: authData.user.id,
          email: candidate.email,
          full_name: candidate.full_name
        },
        session: authData.session
      });
    }

    // User not found in either table
    await supabase.auth.signOut();
    return res.status(403).json({ error: 'Account not properly configured' });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
