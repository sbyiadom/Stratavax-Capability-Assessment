import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Check authentication (admin only)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );

  // Verify admin role
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is admin (you may have an admin table or role)
  const { data: adminCheck, error: adminError } = await supabase
    .from('supervisor_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminError || adminCheck?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetConfig(req, res, supabase);
    case 'POST':
      return handleUpdateConfig(req, res, supabase);
    case 'PUT':
      return handleCreateConfig(req, res, supabase);
    case 'DELETE':
      return handleDeleteConfig(req, res, supabase);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET: Retrieve all configuration settings
 */
async function handleGetConfig(req, res, supabase) {
  try {
    const { type, assessmentType } = req.query;
    
    let results = {};

    // Get grade mappings
    if (!type || type === 'grades') {
      const { data: grades, error: gradesError } = await supabase
        .from('config_grade_mappings')
        .select('*')
        .order('min_percentage', { ascending: false });

      if (!gradesError) {
        results.grades = grades;
      }
    }

    // Get classifications
    if (!type || type === 'classifications') {
      let query = supabase
        .from('config_classifications')
        .select('*')
        .order('min_percentage', { ascending: false });
      
      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }
      
      const { data: classifications, error: classError } = await query;
      if (!classError) {
        results.classifications = classifications;
      }
    }

    // Get recommendation templates
    if (!type || type === 'recommendations') {
      let query = supabase
        .from('config_recommendations')
        .select('*');
      
      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }
      
      const { data: recommendations, error: recError } = await query;
      if (!recError) {
        results.recommendations = recommendations;
      }
    }

    // Get narrative templates
    if (!type || type === 'narratives') {
      let query = supabase
        .from('config_narrative_templates')
        .select('*');
      
      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }
      
      const { data: narratives, error: narError } = await query;
      if (!narError) {
        results.narratives = narratives;
      }
    }

    // Get assessment types
    if (!type || type === 'assessmentTypes') {
      const { data: assessmentTypes, error: assError } = await supabase
        .from('assessment_types')
        .select('*')
        .order('name');

      if (!assError) {
        results.assessmentTypes = assessmentTypes;
      }
    }

    // Get thresholds
    if (!type || type === 'thresholds') {
      const { data: thresholds, error: threshError } = await supabase
        .from('config_thresholds')
        .select('*')
        .single();

      if (!threshError) {
        results.thresholds = thresholds;
      } else {
        // Default thresholds if not configured
        results.thresholds = {
          strength_threshold: 80,
          weakness_threshold: 55,
          critical_threshold: 40,
          excellence_threshold: 90,
          id: 'default'
        };
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching config:', error);
    return res.status(500).json({ error: 'Failed to fetch configuration' });
  }
}

/**
 * POST: Update existing configuration
 */
async function handleUpdateConfig(req, res, supabase) {
  try {
    const { configType, data } = req.body;

    if (!configType || !data) {
      return res.status(400).json({ error: 'Missing configType or data' });
    }

    let result;
    let error;

    switch (configType) {
      case 'grades':
        // Update grade mapping
        ({ data: result, error } = await supabase
          .from('config_grade_mappings')
          .upsert(data, { onConflict: 'id' })
          .select());
        break;

      case 'classifications':
        // Update classification
        ({ data: result, error } = await supabase
          .from('config_classifications')
          .upsert(data, { onConflict: 'id' })
          .select());
        break;

      case 'recommendations':
        // Update recommendation
        ({ data: result, error } = await supabase
          .from('config_recommendations')
          .upsert(data, { onConflict: 'id' })
          .select());
        break;

      case 'narratives':
        // Update narrative template
        ({ data: result, error } = await supabase
          .from('config_narrative_templates')
          .upsert(data, { onConflict: 'id' })
          .select());
        break;

      case 'thresholds':
        // Update thresholds
        ({ data: result, error } = await supabase
          .from('config_thresholds')
          .upsert(data, { onConflict: 'id' })
          .select());
        break;

      default:
        return res.status(400).json({ error: 'Invalid configType' });
    }

    if (error) {
      console.error(`Error updating ${configType}:`, error);
      return res.status(500).json({ error: `Failed to update ${configType}` });
    }

    // Log the configuration change for audit trail
    await supabase
      .from('config_audit_log')
      .insert([{
        user_id: req.user?.id,
        action: 'UPDATE',
        config_type: configType,
        new_value: data,
        timestamp: new Date().toISOString()
      }]);

    return res.status(200).json({ 
      success: true, 
      message: `${configType} updated successfully`,
      data: result 
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return res.status(500).json({ error: 'Failed to update configuration' });
  }
}

/**
 * PUT: Create new configuration
 */
async function handleCreateConfig(req, res, supabase) {
  try {
    const { configType, data } = req.body;

    if (!configType || !data) {
      return res.status(400).json({ error: 'Missing configType or data' });
    }

    let result;
    let error;

    switch (configType) {
      case 'grades':
        ({ data: result, error } = await supabase
          .from('config_grade_mappings')
          .insert([data])
          .select());
        break;

      case 'classifications':
        ({ data: result, error } = await supabase
          .from('config_classifications')
          .insert([data])
          .select());
        break;

      case 'recommendations':
        ({ data: result, error } = await supabase
          .from('config_recommendations')
          .insert([data])
          .select());
        break;

      case 'narratives':
        ({ data: result, error } = await supabase
          .from('config_narrative_templates')
          .insert([data])
          .select());
        break;

      default:
        return res.status(400).json({ error: 'Invalid configType' });
    }

    if (error) {
      console.error(`Error creating ${configType}:`, error);
      return res.status(500).json({ error: `Failed to create ${configType}` });
    }

    // Log the creation
    await supabase
      .from('config_audit_log')
      .insert([{
        user_id: req.user?.id,
        action: 'CREATE',
        config_type: configType,
        new_value: data,
        timestamp: new Date().toISOString()
      }]);

    return res.status(201).json({ 
      success: true, 
      message: `${configType} created successfully`,
      data: result 
    });
  } catch (error) {
    console.error('Error creating config:', error);
    return res.status(500).json({ error: 'Failed to create configuration' });
  }
}

/**
 * DELETE: Remove configuration
 */
async function handleDeleteConfig(req, res, supabase) {
  try {
    const { configType, id } = req.query;

    if (!configType || !id) {
      return res.status(400).json({ error: 'Missing configType or id' });
    }

    let table;
    switch (configType) {
      case 'grades':
        table = 'config_grade_mappings';
        break;
      case 'classifications':
        table = 'config_classifications';
        break;
      case 'recommendations':
        table = 'config_recommendations';
        break;
      case 'narratives':
        table = 'config_narrative_templates';
        break;
      default:
        return res.status(400).json({ error: 'Invalid configType' });
    }

    // Get the value before deleting for audit log
    const { data: oldValue } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting ${configType}:`, error);
      return res.status(500).json({ error: `Failed to delete ${configType}` });
    }

    // Log the deletion
    await supabase
      .from('config_audit_log')
      .insert([{
        user_id: req.user?.id,
        action: 'DELETE',
        config_type: configType,
        old_value: oldValue,
        timestamp: new Date().toISOString()
      }]);

    return res.status(200).json({ 
      success: true, 
      message: `${configType} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting config:', error);
    return res.status(500).json({ error: 'Failed to delete configuration' });
  }
}
