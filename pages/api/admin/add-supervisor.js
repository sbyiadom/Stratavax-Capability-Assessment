import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    console.log('Creating supervisor:', { email, full_name });

    // Create service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'supervisor' }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // If user exists, try to get them
      if (authError.message.includes('already exists')) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === email);
        
        if (existingUser) {
          // Check if already in supervisors table
          const { data: existing } = await supabaseAdmin
            .from('supervisors')
            .select('*')
            .eq('user_id', existingUser.id);

          if (existing && existing.length > 0) {
            return res.status(200).json({
              success: true,
              message: 'Supervisor already exists',
              supervisor: existing[0]
            });
          }

          // Add to supervisors table
          const { data: insertData, error: insertError } = await supabaseAdmin
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

          if (insertError) {
            throw insertError;
          }

          return res.status(200).json({
            success: true,
            message: 'Supervisor added successfully',
            supervisor: insertData
          });
        }
      }
      
      return res.status(400).json({ error: authError.message });
    }

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
      console.error('Insert error:', supervisorError);
      
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({ 
        error: 'Failed to add to database',
        details: supervisorError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supervisor added successfully',
      supervisor: supervisorData
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
