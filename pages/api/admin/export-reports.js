// pages/api/admin/export-reports.js

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

    // Verify admin access
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('supervisor_profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Get filter from query
    const { type } = req.query;

    // ============================================================
    // FETCH DATA
    // ============================================================
    
    let query = supabase
      .from('assessment_results')
      .select(`
        id,
        user_id,
        assessment_id,
        percentage_score,
        total_score,
        max_score,
        workplace_readiness,
        intellectual_capability,
        recommendation,
        completed_at,
        category_scores,
        report_data,
        candidate_profiles:user_id (
          id,
          full_name,
          email,
          university,
          programme,
          graduation_year,
          preferred_department
        ),
        assessments:assessment_id (
          id,
          title,
          assessment_types (
            id,
            code,
            name
          )
        )
      `)
      .order('completed_at', { ascending: false });

    // Apply filter if specified
    if (type === 'national_service') {
      const { data: nsAssessment } = await supabase
        .from('assessments')
        .select('id')
        .eq('title', 'National Service Recruitment Assessment')
        .single();
      
      if (nsAssessment) {
        query = query.eq('assessment_id', nsAssessment.id);
      }
    } else if (type === 'stratavax') {
      const { data: nsAssessment } = await supabase
        .from('assessments')
        .select('id')
        .eq('title', 'National Service Recruitment Assessment')
        .single();
      
      if (nsAssessment) {
        query = query.neq('assessment_id', nsAssessment.id);
      }
    }

    const { data: results, error } = await query;

    if (error) {
      console.error('Export error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'No results found' });
    }

    // ============================================================
    // FORMAT DATA FOR EXCEL
    // ============================================================
    
    const excelData = results.map((result) => {
      const candidate = result.candidate_profiles || {};
      const assessment = result.assessments || {};
      const assessmentType = assessment.assessment_types || {};
      
      const isNationalService = assessment.title === 'National Service Recruitment Assessment';
      
      // Extract category scores
      let categoryBreakdown = '';
      if (result.category_scores && Array.isArray(result.category_scores)) {
        categoryBreakdown = result.category_scores
          .map(cat => `${cat.category || cat.name}: ${cat.percentage || cat.score || 0}%`)
          .join('; ');
      }

      // Get recommendation
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
    
    // Auto-size columns
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
