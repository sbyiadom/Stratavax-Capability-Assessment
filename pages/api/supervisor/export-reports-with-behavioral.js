// pages/api/supervisor/export-reports-with-behavioral.js
// Enhanced export with behavioral matrix data

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function roundScore(value) {
  return Math.round(safeNumber(value, 0));
}

function getReportData(result) {
  const raw = result?.report_data;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('[Export] Failed to parse report_data:', error);
      return {};
    }
  }
  return {};
}

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatAvgTime(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

// ============================================================
// EXTRACT BEHAVIORAL MATRIX
// ============================================================
function extractBehavioralMatrix(result) {
  if (!result) return null;

  const reportData = getReportData(result);
  
  // Check multiple locations for proctoring data
  let proctoringData = 
    reportData?.proctoring || 
    reportData?.proctoring_data || 
    reportData?.behavioral ||
    result?.proctoring_data ||
    result?.behavioral_data ||
    null;
  
  if (!proctoringData) {
    return null;
  }

  const summary = proctoringData.summary || proctoringData;
  
  const totalSeconds = summary.duration || 0;
  const totalDurationFormatted = formatTime(totalSeconds);
  
  // Get total questions from various sources
  const totalQuestions = 
    reportData?.totalQuestions || 
    result?.total_questions || 
    reportData?.total_questions || 
    10;
  
  const avgTimePerQuestion = totalSeconds > 0 && totalQuestions > 0 
    ? formatAvgTime(totalSeconds / totalQuestions) 
    : '0s';

  return {
    totalTime: totalDurationFormatted,
    avgTimePerQuestion: avgTimePerQuestion,
    answerChanges: summary.answerChanges || 0,
    tabSwitches: summary.tabSwitches || 0,
    violations: summary.totalViolations || 0,
    copyPasteAttempts: summary.copyPasteAttempts || 0,
    rightClickAttempts: summary.rightClickAttempts || 0,
    riskLevel: summary.riskLevel || 'Low Risk',
    riskScore: summary.riskScore || 0,
    externalUrlsVisited: summary.externalUrlsVisited || 0,
    riskFactors: proctoringData.riskFactors || [],
    flags: {
      violations: summary.totalViolations || 0,
      tabSwitches: summary.tabSwitches || 0,
      answerChanges: summary.answerChanges || 0
    }
  };
}

function getOverallFromTotalScore(result) {
  const total = safeNumber(result?.total_score || 0);
  const max = safeNumber(result?.max_score || 0);
  if (total > 0 && max > 0) {
    return Math.round((total / max) * 100);
  }
  return 0;
}

function getNationalServiceScores(result) {
  const reportData = getReportData(result);
  
  return {
    workplaceReadiness: roundScore(
      reportData?.dimensions?.workplaceReadiness ??
      reportData?.scores?.workplace ??
      result?.workplace_readiness ??
      0
    ),
    intellectualCapability: roundScore(
      reportData?.dimensions?.intellectualCapability ??
      reportData?.scores?.intellectual ??
      result?.intellectual_capability ??
      0
    ),
    overallScore: roundScore(
      reportData?.dimensions?.overallScore ??
      reportData?.scores?.overall ??
      reportData?.overallScore ??
      reportData?.percentageScore ??
      result?.percentage_score ??
      getOverallFromTotalScore(result) ??
      0
    )
  };
}

function calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability) {
  const workplace = safeNumber(workplaceReadiness);
  const intellectual = safeNumber(intellectualCapability);

  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  return 'Not Recommended';
}

// ============================================================
// EXPORT HANDLER
// ============================================================
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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Missing env vars' });
    }

    // Create service client with token forwarding
    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: { persistSession: false }
    });

    // Verify user
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const supervisorId = userData.user.id;
    const { type, candidateId } = req.query;

    // ============================================================
    // FETCH CANDIDATES
    // ============================================================
    const candidateMap = {};
    const candidateIdsSet = new Set();

    // If candidateId is provided, fetch that specific candidate
    if (candidateId) {
      const { data: candidate, error: candidateError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, graduation_year, preferred_department, supervisor_id')
        .eq('id', candidateId)
        .single();

      if (!candidateError && candidate) {
        candidateIdsSet.add(candidate.id);
        candidateMap[candidate.id] = candidate;
      }
    } else {
      // Fetch all candidates for this supervisor
      // 1. Legacy supervisor_id assignments
      const { data: legacyCandidates, error: legacyError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, graduation_year, preferred_department, supervisor_id')
        .eq('supervisor_id', supervisorId);

      if (!legacyError && legacyCandidates) {
        legacyCandidates.forEach(c => {
          if (!candidateIdsSet.has(c.id)) {
            candidateIdsSet.add(c.id);
            candidateMap[c.id] = c;
          }
        });
      }

      // 2. New multi-supervisor assignments
      const { data: junctionAssignments, error: junctionError } = await serviceClient
        .from('candidate_supervisors')
        .select('candidate_id')
        .eq('supervisor_id', supervisorId);

      if (!junctionError && junctionAssignments && junctionAssignments.length > 0) {
        const junctionCandidateIds = [...new Set(junctionAssignments.map(a => a.candidate_id).filter(Boolean))];
        const missingIds = junctionCandidateIds.filter(id => !candidateIdsSet.has(id));

        if (missingIds.length > 0) {
          const { data: junctionCandidates, error: junctionCandidatesError } = await serviceClient
            .from('candidate_profiles')
            .select('id, full_name, email, university, programme, graduation_year, preferred_department, supervisor_id')
            .in('id', missingIds);

          if (!junctionCandidatesError && junctionCandidates) {
            junctionCandidates.forEach(c => {
              if (!candidateIdsSet.has(c.id)) {
                candidateIdsSet.add(c.id);
                candidateMap[c.id] = c;
              }
            });
          }
        }
      }
    }

    const candidates = Object.values(candidateMap);
    const candidateIds = candidates.map(c => c.id);

    if (candidateIds.length === 0) {
      return res.status(404).json({ success: false, error: 'No candidates found' });
    }

    // ============================================================
    // FETCH ASSESSMENT RESULTS WITH BATCH PROCESSING
    // ============================================================
    let allResults = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < candidateIds.length; i += BATCH_SIZE) {
      const batch = candidateIds.slice(i, i + BATCH_SIZE);
      
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
          report_data,
          assessments:assessment_id (
            id,
            title,
            assessment_type_id,
            assessment_types:assessment_type_id (
              id,
              code,
              name
            )
          )
        `)
        .in('user_id', batch)
        .order('completed_at', { ascending: false });

      if (resultsError) {
        console.error('[Export] Results error for batch:', resultsError);
        continue;
      }
      
      if (results) {
        allResults = allResults.concat(results);
      }
    }

    // ============================================================
    // PROCESS & NORMALIZE ROWS WITH BEHAVIORAL DATA
    // ============================================================
    let processedResults = allResults.map(result => {
      const candidate = candidateMap[result.user_id] || {};
      const assessment = result.assessments || {};
      const type = assessment.assessment_types || {};
      
      // Extract behavioral matrix
      const behavioral = extractBehavioralMatrix(result);
      
      // National Service Classification
      const assessmentTitle = String(assessment?.title || '').toLowerCase().trim();
      const assessmentCode = String(type?.code || '').toLowerCase().trim();
      const assessmentTypeName = String(type?.name || '').toLowerCase().trim();

      const isNationalService = 
        assessment.id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessmentCode.includes('national') ||
        assessmentTypeName.includes('national service') ||
        assessmentTitle === 'national service recruitment assessment' ||
        assessmentTitle.includes('national service') ||
        assessmentTitle.includes('nationalservice') ||
        assessmentTitle.includes('service recruitment');

      // Normalize Scores
      let workplaceReadiness = 0;
      let intellectualCapability = 0;
      let overallScore = 0;
      let recommendation = 'Not Available';

      if (isNationalService) {
        const nsScores = getNationalServiceScores(result);
        workplaceReadiness = nsScores.workplaceReadiness;
        intellectualCapability = nsScores.intellectualCapability;
        overallScore = nsScores.overallScore;
        recommendation = calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability);
      } else {
        workplaceReadiness = roundScore(result.workplace_readiness || 0);
        intellectualCapability = roundScore(result.intellectual_capability || 0);
        overallScore = roundScore(result.percentage_score || getOverallFromTotalScore(result) || 0);
        recommendation = result.recommendation || 'Not Available';
      }

      // Category Breakdown
      let categoryBreakdown = '';
      if (result.category_scores && Array.isArray(result.category_scores)) {
        categoryBreakdown = result.category_scores
          .map(cat => `${cat.category || cat.name}: ${cat.percentage || cat.score || 0}%`)
          .join('; ');
      }

      // Behavioral Risk Assessment
      let riskAssessment = 'Low Risk';
      if (behavioral) {
        const violations = behavioral.violations || 0;
        const tabSwitches = behavioral.tabSwitches || 0;
        const answerChanges = behavioral.answerChanges || 0;
        
        if (violations > 10 || tabSwitches > 20) {
          riskAssessment = 'High Risk - Review Required';
        } else if (violations > 3 || tabSwitches > 5) {
          riskAssessment = 'Medium Risk - Monitor';
        } else {
          riskAssessment = 'Low Risk - Compliant';
        }
      }

      return {
        // Candidate Info
        'Candidate Name': candidate.full_name || 'Unknown',
        'Email': candidate.email || '',
        'University': candidate.university || '',
        'Programme': candidate.programme || '',
        'Graduation Year': candidate.graduation_year || '',
        'Preferred Department': candidate.preferred_department || '',
        
        // Assessment Info
        'Assessment': assessment.title || 'Unknown',
        'Type': isNationalService ? 'National Service' : 'Stratavax',
        'Completed Date': result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A',
        
        // Scores
        'Overall Score (%)': overallScore,
        'Total Score': result.total_score || 0,
        'Max Score': result.max_score || 0,
        'Workplace Readiness (%)': workplaceReadiness,
        'Intellectual Capability (%)': intellectualCapability,
        
        // Category Details
        'Category Breakdown': categoryBreakdown,
        
        // Recommendation
        'Recommendation': recommendation,
        
        // =============================================
        // BEHAVIORAL MATRIX DATA - NEW
        // =============================================
        'Total Time': behavioral?.totalTime || '00:00:00',
        'Avg Time per Question': behavioral?.avgTimePerQuestion || '0s',
        'Answer Changes': behavioral?.answerChanges || 0,
        'Tab Switches': behavioral?.tabSwitches || 0,
        'Violations': behavioral?.violations || 0,
        'Copy/Paste Attempts': behavioral?.copyPasteAttempts || 0,
        'Right-Click Attempts': behavioral?.rightClickAttempts || 0,
        'Risk Level': behavioral?.riskLevel || 'Low Risk',
        'Risk Score': behavioral?.riskScore || 0,
        'Risk Factors': (behavioral?.riskFactors || []).join('; '),
        'Risk Assessment': riskAssessment,
        
        // Internal
        'Result ID': result.id,
        'hasBehavioralData': behavioral ? 'Yes' : 'No'
      };
    });

    // Filter by type
    if (type === 'national_service') {
      processedResults = processedResults.filter(r => r['Type'] === 'National Service');
    } else if (type === 'other') {
      processedResults = processedResults.filter(r => r['Type'] === 'Stratavax');
    }

    if (processedResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No results found for the selected filter' 
      });
    }

    // ============================================================
    // GENERATE EXCEL FILE
    // ============================================================
    const worksheet = XLSX.utils.json_to_sheet(processedResults);
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 22 },
      { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 38 },
      { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports with Behavioral Data');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `reports-with-behavioral-${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
