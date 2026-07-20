// pages/api/admin/export-reports.js - FIXED QUERY

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const userId = userData.user.id;

    // ============================================================
    // CHECK ADMIN ACCESS - MULTIPLE SOURCES
    // ============================================================
    let isAdmin = false;

    const { data: supervisorProfile } = await supabase
      .from('supervisor_profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (supervisorProfile?.role === 'admin' && supervisorProfile?.is_active !== false) {
      isAdmin = true;
    }

    if (!isAdmin) {
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (candidateProfile?.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      const metadataRole = userData.user.user_metadata?.role;
      if (metadataRole === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    // Get filter from query
    const { type } = req.query;

    // ============================================================
    // FETCH DATA - FIXED QUERY
    // ============================================================
    
    // First, get all assessment results
    let query = supabase
      .from('assessment_results')
      .select('*')
      .order('completed_at', { ascending: false });

    const { data: results, error } = await query;

    if (error) {
      console.error('Export error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'No results found' });
    }

    // Get all unique user IDs from results
    const userIds = results.map(r => r.user_id).filter(Boolean);
    let candidateMap = {};
    if (userIds.length > 0) {
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, graduation_year, preferred_department')
        .in('id', userIds);
      
      if (candidates) {
        candidates.forEach(c => {
          candidateMap[c.id] = c;
        });
      }
    }

    // Get all unique assessment IDs from results
    const assessmentIds = results.map(r => r.assessment_id).filter(Boolean);
    let assessmentMap = {};
    if (assessmentIds.length > 0) {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, assessment_type_id')
        .in('id', assessmentIds);
      
      if (assessments) {
        assessments.forEach(a => {
          assessmentMap[a.id] = a;
        });
      }
    }

    // Get assessment types
    const typeIds = Object.values(assessmentMap).map(a => a.assessment_type_id).filter(Boolean);
    let typeMap = {};
    if (typeIds.length > 0) {
      const { data: types } = await supabase
        .from('assessment_types')
        .select('id, code, name')
        .in('id', typeIds);
      
      if (types) {
        types.forEach(t => {
          typeMap[t.id] = t;
        });
      }
    }

    // Apply filter if specified
    let filteredResults = results;
    if (type === 'national_service') {
      const nsAssessment = Object.values(assessmentMap).find(a => a.title === 'National Service Recruitment Assessment');
      if (nsAssessment) {
        filteredResults = results.filter(r => r.assessment_id === nsAssessment.id);
      }
    } else if (type === 'stratavax') {
      const nsAssessment = Object.values(assessmentMap).find(a => a.title === 'National Service Recruitment Assessment');
      if (nsAssessment) {
        filteredResults = results.filter(r => r.assessment_id !== nsAssessment.id);
      }
    }

    if (filteredResults.length === 0) {
      return res.status(404).json({ success: false, error: 'No results found for the selected filter' });
    }

    // ============================================================
    // FORMAT DATA FOR EXCEL
    // ============================================================
    
    const excelData = filteredResults.map((result) => {
      const candidate = candidateMap[result.user_id] || {};
      const assessment = assessmentMap[result.assessment_id] || {};
      const assessmentType = assessment ? typeMap[assessment.assessment_type_id] : null;
      
      const isNationalService = assessment.title === 'National Service Recruitment Assessment';
      
      let categoryBreakdown = '';
      if (result.category_scores && Array.isArray(result.category_scores)) {
        categoryBreakdown = result.category_scores
          .map(cat => `${cat.category || cat.name}: ${cat.percentage || cat.score || 0}%`)
          .join('; ');
      }

      let recommendation = result.recommendation || 'N/A';
      if (isNationalService && (recommendation === 'N/A' || !recommendation)) {
        const workplace = Number(result.workplace_readiness) || 0;
        const intellectual = Number(result.intellectual_capability) || 0;
        if (workplace >= 85 && intellectual >= 85) recommendation = 'Highly Recommended';
        else if (workplace >= 75 && intellectual >= 75) recommendation = 'Recommended';
        else if (workplace >= 65 && intellectual >= 65) recommendation = 'Reserve Pool';
        else recommendation = 'Not Recommended';
      }

      return {
        'Candidate Name': candidate.full_name || 'Unknown',
        'Email': candidate.email || '',
        'University': candidate.university || '',
        'Programme': candidate.programme || '',
        'Graduation Year': candidate.graduation_year || '',
        'Preferred Department': candidate.preferred_department || '',
        'Assessment': assessment.title || 'Unknown',
        'Type': isNationalService ? 'National Service' : 'Stratavax',
        'Overall Score (%)': Math.round(result.percentage_score || 0),
        'Total Score': result.total_score || 0,
        'Max Score': result.max_score || 0,
        'Workplace Readiness (%)': Math.round(result.workplace_readiness || 0),
        'Intellectual Capability (%)': Math.round(result.intellectual_capability || 0),
        'Recommendation': recommendation,
        'Category Breakdown': categoryBreakdown,
        'Completed Date': result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A',
        'Result ID': result.id
      };
    });

    // ============================================================
    // GENERATE EXCEL FILE
    // ============================================================
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 25 }, // Candidate Name
      { wch: 30 }, // Email
      { wch: 25 }, // University
      { wch: 20 }, // Programme
      { wch: 15 }, // Graduation Year
      { wch: 20 }, // Preferred Department
      { wch: 35 }, // Assessment
      { wch: 18 }, // Type
      { wch: 20 }, // Overall Score
      { wch: 12 }, // Total Score
      { wch: 12 }, // Max Score
      { wch: 25 }, // Workplace Readiness
      { wch: 25 }, // Intellectual Capability
      { wch: 22 }, // Recommendation
      { wch: 50 }, // Category Breakdown
      { wch: 15 }, // Completed Date
      { wch: 38 }, // Result ID
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `assessment-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    
    res.status(200).send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
