// pages/api/assessment/proctoring.js - COMPLETE API ENDPOINT FOR URL/DOMAIN TRACKING

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Proctoring API] Missing environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Get token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Verify the user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('[Proctoring API] Auth error:', userError);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    const userId = userData.user.id;
    const { assessmentId, proctoringData } = req.body;

    if (!assessmentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing assessmentId'
      });
    }

    if (!proctoringData) {
      return res.status(400).json({
        success: false,
        error: 'Missing proctoringData'
      });
    }

    console.log('[Proctoring API] Saving proctoring data for assessment:', assessmentId);
    console.log('[Proctoring API] External URLs visited:', proctoringData.externalUrls?.length || 0);
    console.log('[Proctoring API] Domains visited:', Object.keys(proctoringData.domainVisits || {}));

    // ============================================================
    // OPTION 1: Save to assessment_results table
    // ============================================================
    const { data: existingResult, error: findError } = await supabase
      .from('assessment_results')
      .select('id, proctoring_data')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      console.error('[Proctoring API] Error finding existing result:', findError);
    }

    let result;

    if (existingResult) {
      // Update existing record - merge with existing data
      const existingData = existingResult.proctoring_data || {};
      
      // Merge the data (keep existing, add new)
      const mergedData = {
        ...existingData,
        ...proctoringData,
        // Merge arrays to avoid duplicates
        externalUrls: [
          ...(existingData.externalUrls || []),
          ...(proctoringData.externalUrls || [])
        ],
        tabSwitches: [
          ...(existingData.tabSwitches || []),
          ...(proctoringData.tabSwitches || [])
        ],
        violations: [
          ...(existingData.violations || []),
          ...(proctoringData.violations || [])
        ],
        // Merge domain visits
        domainVisits: {
          ...(existingData.domainVisits || {}),
          ...(proctoringData.domainVisits || {})
        },
        // Update summary
        summary: proctoringData.summary || existingData.summary,
        updatedAt: new Date().toISOString()
      };

      const { data: updated, error: updateError } = await supabase
        .from('assessment_results')
        .update({
          proctoring_data: mergedData,
          external_urls_visited: proctoringData.externalUrls || [],
          domain_visits: proctoringData.domainVisits || {},
          tab_switch_details: proctoringData.tabSwitches || [],
          violations: proctoringData.violations || [],
          risk_score: proctoringData.summary?.riskScore || 0,
          risk_level: proctoringData.summary?.riskLevel || 'Low',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResult.id)
        .select();

      if (updateError) {
        console.error('[Proctoring API] Error updating:', updateError);
        throw updateError;
      }

      result = updated?.[0];
      console.log('[Proctoring API] Updated existing record:', existingResult.id);

    } else {
      // Create new record
      const { data: inserted, error: insertError } = await supabase
        .from('assessment_results')
        .insert({
          assessment_id: assessmentId,
          user_id: userId,
          proctoring_data: proctoringData,
          external_urls_visited: proctoringData.externalUrls || [],
          domain_visits: proctoringData.domainVisits || {},
          tab_switch_details: proctoringData.tabSwitches || [],
          violations: proctoringData.violations || [],
          risk_score: proctoringData.summary?.riskScore || 0,
          risk_level: proctoringData.summary?.riskLevel || 'Low',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('[Proctoring API] Error inserting:', insertError);
        throw insertError;
      }

      result = inserted?.[0];
      console.log('[Proctoring API] Created new record:', result?.id);
    }

    // ============================================================
    // OPTION 2: Also save to a dedicated proctoring_logs table (optional)
    // ============================================================
    // Uncomment this if you want a separate log table for all violations
    /*
    if (proctoringData.violations && proctoringData.violations.length > 0) {
      const violationLogs = proctoringData.violations.map(violation => ({
        assessment_id: assessmentId,
        user_id: userId,
        violation_type: violation.type,
        violation_details: violation.details || {},
        timestamp: violation.timestamp || new Date().toISOString(),
        session_id: proctoringData.sessionId || null
      }));

      const { error: logError } = await supabase
        .from('proctoring_logs')
        .insert(violationLogs);

      if (logError) {
        console.error('[Proctoring API] Error saving violation logs:', logError);
      } else {
        console.log('[Proctoring API] Saved', violationLogs.length, 'violation logs');
      }
    }
    */

    return res.status(200).json({
      success: true,
      message: 'Proctoring data saved successfully',
      data: {
        resultId: result?.id,
        externalUrlsCount: proctoringData.externalUrls?.length || 0,
        violationsCount: proctoringData.violations?.length || 0,
        riskLevel: proctoringData.summary?.riskLevel || 'Low'
      }
    });

  } catch (error) {
    console.error('[Proctoring API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
