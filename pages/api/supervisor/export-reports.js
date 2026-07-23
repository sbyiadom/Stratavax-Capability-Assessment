// pages/api/supervisor/export-reports.js

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function calculateSubScores(categoryScores) {
  let workplaceTotal = 0;
  let workplaceCount = 0;
  let intellectualTotal = 0;
  let intellectualCount = 0;

  const workplaceCategories = ['Safety & Risk Awareness', 'Technical Fundamentals', 'Communication & Teamwork', 'Ownership & Integrity', 'Professional Conduct', 'Work Ethic'];
  const intellectualCategories = ['Problem Solving & Troubleshooting', 'Logical Reasoning', 'Numerical Reasoning', 'Measurement & Engineering Units', 'Learning Agility', 'Cognitive Ability', 'Analytical Thinking'];

  if (!categoryScores || !Array.isArray(categoryScores)) {
    return { workplaceReadiness: 0, intellectualCapability: 0 };
  }

  categoryScores.forEach(cat => {
    const name = (cat.category || cat.name || '').toLowerCase();
    const percentage = Number(cat.percentage || cat.score || 0);
    
    const isWorkplace = workplaceCategories.some(keyword => name.includes(keyword.toLowerCase()));
    const isIntellectual = intellectualCategories.some(keyword => name.includes(keyword.toLowerCase()));

    if (isWorkplace) {
      workplaceTotal += percentage;
      workplaceCount++;
    } else if (isIntellectual) {
      intellectualTotal += percentage;
      intellectualCount++;
    }
  });

  return {
    workplaceReadiness: workplaceCount > 0 ? Math.round(workplaceTotal / workplaceCount) : 0,
    intellectualCapability: intellectualCount > 0 ? Math.round(intellectualTotal / intellectualCount) : 0
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing token' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: 'Missing env vars' });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Get user from token
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const supervisorId = userData.user.id;
    const { type } = req.query;

    // STEP 1: Get candidates for this supervisor
    const { data: candidates, error: candidatesError } = await serviceClient
      .from('candidate_profiles')
      .select('id, full_name, email, university, programme, graduation_year, preferred_department')
      .eq('supervisor_id', supervisorId);

    if (candidatesError) {
      console.error('[Export] Candidates error:', candidatesError);
      return res.status(500).json({ success: false, error: candidatesError.message });
    }

    const candidateIds = candidates.map(c => c.id);

    if (candidateIds.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No candidates assigned to you' 
      });
    }

    // STEP 2: Get assessment results for these candidates
    const { data: results, error: resultsError } = await serviceClient
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
          assessment_type_id,
          assessment_types (
            id,
            code,
            name
          )
        )
      `)
      .in('user_id', candidateIds)
      .order('completed_at', { ascending: false });

    if (resultsError) {
      console.error('[Export] Results error:', resultsError);
      return res.status(500).json({ success: false, error: resultsError.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'No results found for your candidates' });
    }

    // STEP 3: Process and filter results
    let processedResults = results.map(result => {
      const candidate = result.candidate_profiles || {};
      const assessment = result.assessments || {};
      const assessmentType = assessment.assessment_types || {};
      
      const isNationalService = 
        assessment.id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessment.title === 'National Service Recruitment Assessment' ||
        assessmentType.code === 'national_service' ||
        assessmentType.name === 'National Service Recruitment Assessment';

      let workplaceReadiness = Number(result.workplace_readiness || 0);
      let intellectualCapability = Number(result.intellectual_capability || 0);

      if (workplaceReadiness === 0 && intellectualCapability === 0 && result.category_scores) {
        const calculated = calculateSubScores(result.category_scores);
        workplaceReadiness = calculated.workplaceReadiness;
        intellectualCapability = calculated.intellectualCapability;
      }

      let recommendation = result.recommendation || 'Not Available';
      if (isNationalService && (recommendation === 'Not Available' || !recommendation || recommendation === 'N/A')) {
        if (workplaceReadiness >= 85 && intellectualCapability >= 85) recommendation = 'Highly Recommended';
        else if (workplaceReadiness >= 75 && intellectualCapability >= 75) recommendation = 'Recommended';
        else if (workplaceReadiness >= 65 && intellectualCapability >= 65) recommendation = 'Reserve Pool';
        else recommendation = 'Not Recommended';
      }

      let categoryBreakdown = '';
      if (result.category_scores && Array.isArray(result.category_scores)) {
        categoryBreakdown = result.category_scores
          .map(cat => `${cat.category || cat.name}: ${cat.percentage || cat.score || 0}%`)
          .join('; ');
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
        'Workplace Readiness (%)': Math.round(workplaceReadiness || 0),
        'Intellectual Capability (%)': Math.round(intellectualCapability || 0),
        'Recommendation': recommendation,
        'Category Breakdown': categoryBreakdown,
        'Completed Date': result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A',
        'Result ID': result.id,
        'isNationalService': isNationalService
      };
    });

    // Filter by type
    if (type === 'national_service') {
      processedResults = processedResults.filter(r => r.isNationalService === true);
    } else if (type === 'other') {
      processedResults = processedResults.filter(r => r.isNationalService === false);
    }

    processedResults = processedResults.map(({ isNationalService, ...rest }) => rest);

    if (processedResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No results found for the selected filter' 
      });
    }

    // STEP 4: Generate Excel file
    const worksheet = XLSX.utils.json_to_sheet(processedResults);
    
    const colWidths = [
      { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 22 }, { wch: 50 },
      { wch: 15 }, { wch: 38 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `supervisor-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    
    res.status(200).send(buffer);

  } catch (error) {
    console.error('[Export] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal error' 
    });
  }
}
