// pages/api/supervisor/export-reports.js - FIXED
// Proper score calculation and recommendation logic

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

// ============================================================
// 🟢 FIXED: PROPER SCORE CALCULATION
// ============================================================
function calculateOverallScore(result) {
  // 1. Check if we have category scores
  let categoryScores = [];
  
  // Try different locations for category scores
  if (result.category_scores && Array.isArray(result.category_scores)) {
    categoryScores = result.category_scores;
  } else if (result.categoryScores && Array.isArray(result.categoryScores)) {
    categoryScores = result.categoryScores;
  } else if (result.report_data) {
    const reportData = getReportData(result);
    if (reportData.categoryScores && Array.isArray(reportData.categoryScores)) {
      categoryScores = reportData.categoryScores;
    } else if (reportData.category_scores && Array.isArray(reportData.category_scores)) {
      categoryScores = reportData.category_scores;
    } else if (reportData.category_scores && typeof reportData.category_scores === 'object') {
      categoryScores = Object.values(reportData.category_scores);
    }
  }

  // If we have category scores, calculate the average
  if (categoryScores.length > 0) {
    let totalScore = 0;
    let count = 0;
    
    categoryScores.forEach(cat => {
      // Check for percentage field (most common)
      let score = safeNumber(cat.percentage || cat.score || cat.earned || 0);
      
      // If score is 0 but we have maxScore, calculate percentage
      if (score === 0 && cat.maxScore && cat.score) {
        const max = safeNumber(cat.maxScore);
        const earned = safeNumber(cat.score);
        if (max > 0) {
          score = Math.round((earned / max) * 100);
        }
      }
      
      // Only include valid scores
      if (score > 0 && score <= 100) {
        totalScore += score;
        count++;
      }
    });
    
    if (count > 0) {
      return Math.round(totalScore / count);
    }
  }

  // 2. Check for percentage_score
  if (result.percentage_score) {
    const val = safeNumber(result.percentage_score);
    if (val > 0 && val <= 100) return val;
  }

  // 3. Check for total_score / max_score
  if (result.total_score !== undefined && result.max_score !== undefined) {
    const total = safeNumber(result.total_score);
    const max = safeNumber(result.max_score);
    if (max > 0) {
      const calc = Math.round((total / max) * 100);
      if (calc >= 0 && calc <= 100) return calc;
    }
  }

  // 4. Check for workplace_readiness / intellectual_capability
  const workplace = safeNumber(result.workplace_readiness || 0);
  const intellectual = safeNumber(result.intellectual_capability || 0);
  if (workplace > 0 && intellectual > 0) {
    return Math.round((workplace + intellectual) / 2);
  }

  return 0;
}

// ============================================================
// 🟢 FIXED: PROPER RECOMMENDATION CALCULATION
// ============================================================
function calculateRecommendation(score) {
  const s = safeNumber(score, 0);
  if (s >= 85) return 'Highly Recommended';
  if (s >= 75) return 'Recommended';
  if (s >= 65) return 'Reserve Pool';
  if (s >= 50) return 'Needs Improvement';
  return 'Not Recommended';
}

// ============================================================
// EXTRACT BEHAVIORAL MATRIX
// ============================================================
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

function extractBehavioralMatrix(result) {
  if (!result) return null;

  const reportData = getReportData(result);
  
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
    hasBehavioralData: true
  };
}

// ============================================================
// 🟢 FIXED: RISK ASSESSMENT
// ============================================================
function calculateRiskAssessment(behavioral) {
  if (!behavioral) return 'Low Risk - Compliant';
  
  const violations = behavioral.violations || 0;
  const tabSwitches = behavioral.tabSwitches || 0;
  
  // High risk: excessive violations or tab switches
  if (violations > 10 || tabSwitches > 100) {
    return 'High Risk - Review Required';
  }
  
  // Medium risk: moderate violations or tab switches
  if (violations > 3 || tabSwitches > 20) {
    return 'Medium Risk - Monitor';
  }
  
  // Low risk: minimal behavioral issues
  if (violations > 0 || tabSwitches > 5) {
    return 'Low Risk - Minor Flags';
  }
  
  return 'Low Risk - Compliant';
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

    const serviceClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: { persistSession: false }
    });

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

    if (candidateId) {
      const { data: candidate, error: candidateError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, graduation_year, preferred_department')
        .eq('id', candidateId)
        .single();

      if (!candidateError && candidate) {
        candidateIdsSet.add(candidate.id);
        candidateMap[candidate.id] = candidate;
      }
    } else {
      // Legacy supervisor_id assignments
      const { data: legacyCandidates, error: legacyError } = await serviceClient
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, graduation_year, preferred_department')
        .eq('supervisor_id', supervisorId);

      if (!legacyError && legacyCandidates) {
        legacyCandidates.forEach(c => {
          if (!candidateIdsSet.has(c.id)) {
            candidateIdsSet.add(c.id);
            candidateMap[c.id] = c;
          }
        });
      }

      // Multi-supervisor assignments
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
            .select('id, full_name, email, university, programme, graduation_year, preferred_department')
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
    // FETCH ASSESSMENT RESULTS
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
    // PROCESS RESULTS WITH 🟢 FIXED CALCULATIONS
    // ============================================================
    let processedResults = allResults.map(result => {
      const candidate = candidateMap[result.user_id] || {};
      const assessment = result.assessments || {};
      const type = assessment.assessment_types || {};
      
      // Extract behavioral matrix
      const behavioral = extractBehavioralMatrix(result);
      
      // 🟢 FIXED: Calculate overall score properly
      const overallScore = calculateOverallScore(result);
      
      // 🟢 FIXED: Calculate recommendation based on actual score
      const recommendation = calculateRecommendation(overallScore);
      
      // National Service Classification
      const assessmentTitle = String(assessment?.title || '').toLowerCase().trim();
      const assessmentCode = String(type?.code || '').toLowerCase().trim();
      const assessmentTypeName = String(type?.name || '').toLowerCase().trim();

      const isNationalService = 
        assessment.id === NATIONAL_SERVICE_ASSESSMENT_ID ||
        assessmentCode.includes('national') ||
        assessmentTypeName.includes('national service') ||
        assessmentTitle.includes('national service') ||
        assessmentTitle.includes('service recruitment');

      // Get workplace and intellectual scores if available
      const workplaceReadiness = safeNumber(result.workplace_readiness || 0);
      const intellectualCapability = safeNumber(result.intellectual_capability || 0);

      // Category Breakdown
      let categoryBreakdown = '';
      const categoryScores = result.category_scores || result.report_data?.categoryScores || [];
      if (Array.isArray(categoryScores) && categoryScores.length > 0) {
        categoryBreakdown = categoryScores
          .map(cat => {
            const name = cat.category || cat.name || 'Unknown';
            const score = safeNumber(cat.percentage || cat.score || cat.earned || 0);
            return `${name}: ${score}%`;
          })
          .join('; ');
      }

      // 🟢 FIXED: Risk Assessment
      const riskAssessment = calculateRiskAssessment(behavioral);

      return {
        // Candidate Info
        'Candidate Name': candidate.full_name || 'Unknown',
        'Email': candidate.email || '',
        'University': candidate.university || 'Not Specified',
        'Programme': candidate.programme || 'Not Specified',
        'Graduation Year': candidate.graduation_year || '',
        'Preferred Department': candidate.preferred_department || '',
        
        // Assessment Info
        'Assessment': assessment.title || 'Unknown',
        'Type': isNationalService ? 'National Service' : 'Stratavax',
        'Completed Date': result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A',
        
        // 🟢 FIXED: Scores (now showing correct values)
        'Overall Score (%)': overallScore,
        'Total Score': result.total_score || 0,
        'Max Score': result.max_score || 0,
        'Workplace Readiness (%)': workplaceReadiness,
        'Intellectual Capability (%)': intellectualCapability,
        
        // Category Details
        'Category Breakdown': categoryBreakdown,
        
        // 🟢 FIXED: Recommendation
        'Recommendation': recommendation,
        
        // Behavioral Matrix
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
        '🟢 Risk Assessment': riskAssessment,
        'Has Behavioral Data': behavioral ? 'Yes' : 'No'
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
    
    const colWidths = [
      { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 15 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 22 },
      { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 38 },
      { wch: 18 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports with Behavioral Data');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `reports-${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
