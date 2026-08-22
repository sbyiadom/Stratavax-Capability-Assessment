// pages/api/assessment/start.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;
    const { assessment_id, session_id } = req.body;

    if (!assessment_id) {
      return res.status(400).json({ success: false, error: 'Missing assessment_id' });
    }

    // Check if there's already a result with started_at
    const { data: existingResult, error: checkError } = await supabase
      .from('assessment_results')
      .select('id, started_at')
      .eq('user_id', userId)
      .eq('assessment_id', assessment_id)
      .maybeSingle();

    if (checkError) {
      console.error('[Start Assessment] Check error:', checkError);
    }

    // If no result exists, create one with started_at
    if (!existingResult) {
      const { data: newResult, error: createError } = await supabase
        .from('assessment_results')
        .insert({
          user_id: userId,
          assessment_id: assessment_id,
          session_id: session_id || null,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[Start Assessment] Create error:', createError);
        return res.status(500).json({ success: false, error: createError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Assessment started',
        result_id: newResult.id,
        started_at: new Date().toISOString()
      });
    }

    // If result exists but no started_at, update it
    if (existingResult && !existingResult.started_at) {
      const { error: updateError } = await supabase
        .from('assessment_results')
        .update({ started_at: new Date().toISOString() })
        .eq('id', existingResult.id);

      if (updateError) {
        console.error('[Start Assessment] Update error:', updateError);
        return res.status(500).json({ success: false, error: updateError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Assessment started',
        result_id: existingResult.id,
        started_at: new Date().toISOString()
      });
    }

    // Already started
    return res.status(200).json({
      success: true,
      message: 'Assessment already started',
      result_id: existingResult.id,
      started_at: existingResult.started_at
    });

  } catch (error) {
    console.error('[Start Assessment] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
