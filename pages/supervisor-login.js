import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is a supervisor
    const { data: supervisor, error: supervisorError } = await supabase
      .from('supervisors')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('is_active', true)
      .single();

    if (supervisorError || !supervisor) {
      // Sign them out if not a supervisor
      await supabase.auth.signOut();
      return res.status(403).json({ error: 'Not authorized as supervisor' });
    }

    // Update last login
    await supabase
      .from('supervisors')
      .update({ last_login: new Date().toISOString() })
      .eq('id', supervisor.id);

    return res.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: supervisor.email,
        full_name: supervisor.full_name,
        role: supervisor.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
