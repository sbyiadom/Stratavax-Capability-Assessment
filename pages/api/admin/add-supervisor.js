import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create admin client with service role key (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { email, password, full_name } = req.body;

    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'supervisor'
      }
    });

    if (authError) throw authError;

    // 2. Add to supervisors table
    const { data: supervisorData, error: supervisorError } = await supabaseAdmin
      .from('supervisors')
      .insert([
        {
          user_id: authData.user.id,
          email,
          full_name,
          role: 'supervisor',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (supervisorError) throw supervisorError;

    return res.status(200).json({
      success: true,
      message: 'Supervisor added successfully',
      supervisor: supervisorData
    });

  } catch (error) {
    console.error('Error adding supervisor:', error);
    
    // Handle specific error cases
    if (error.message.includes('already registered')) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to add supervisor' 
    });
  }
}
