// supabase/functions/block-expired-assessments/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  console.log('[Scheduler] Checking for expired assessments...');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Find expired assessment
    const { data: assessment, error: findError } = await supabase
      .from('assessments')
      .select('id, title, expires_at')
      .eq('title', 'National Service Recruitment Assessment')
      .lt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (findError) {
      console.error('[Scheduler] Find error:', findError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: findError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!assessment) {
      console.log('[Scheduler] No expired assessments found');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No expired assessments found',
        blocked: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Scheduler] Found expired assessment: ${assessment.title}`);

    // Block all unblocked candidate assessments
    const { data, error } = await supabase
      .from('candidate_assessments')
      .update({ 
        status: 'blocked', 
        updated_at: new Date().toISOString() 
      })
      .eq('assessment_id', assessment.id)
      .in('status', ['unblocked', 'scheduled'])
      .select('id');

    if (error) {
      console.error('[Scheduler] Update error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Scheduler] Blocked ${data?.length || 0} assessments`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Blocked ${data?.length || 0} assessments`,
      blocked: data?.length || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Scheduler] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
