import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    console.log('Creating supervisor with email:', email);

    // Create service role client (this bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'supervisor'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // Check if user already exists
      if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
        // Try to get the existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
          console.log('User already exists with ID:', existingUser.id);
          
          // Insert into supervisors table with existing user_id
          const { data: existingInsert, error: existingInsertError } = await supabaseAdmin
            .from('supervisors')
            .insert({
              user_id: existingUser.id,
              email,
              full_name,
              role: 'supervisor',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (existingInsertError) {
            // If duplicate, just return success (already exists)
            if (existingInsertError.code === '23505') { // Unique violation
              return res.status(200).json({
                success: true,
                message: 'Supervisor already exists and is active',
                user_id: existingUser.id
              });
            }
            throw existingInsertError;
          }

          return res.status(200).json({
            success: true,
            message: 'Supervisor added successfully (existing user)',
            supervisor: existingInsert
          });
        }
      }
      
      return res.status(400).json({ error: authError.message });
    }

    console.log('Auth user created with ID:', authData.user.id);

    // 2. Add to supervisors table
    const { data: supervisorData, error: supervisorError } = await supabaseAdmin
      .from('supervisors')
      .insert({
        user_id: authData.user.id,
        email,
        full_name,
        role: 'supervisor',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (supervisorError) {
      console.error('Supervisor insert error:', supervisorError);
      
      // If insert fails, try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({ 
        error: 'Failed to add supervisor to database',
        details: supervisorError.message
      });
    }

    console.log('Supervisor added successfully:', supervisorData);

    return res.status(200).json({
      success: true,
      message: 'Supervisor added successfully',
      supervisor: supervisorData
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: error.message || 'An unexpected error occurred'
    });
  }
}
