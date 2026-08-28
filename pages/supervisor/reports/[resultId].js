// pages/supervisor/reports/[resultId].js - COMPLETE FIXED
// Based on the actual data structure from the database

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function roundScore(value) {
  return Math.round(safeNumber(value, 0));
}

function getReportDataObject(rawReportData) {
  if (!rawReportData) return {};

  if (typeof rawReportData === 'object') {
    return rawReportData;
  }

  if (typeof rawReportData === 'string') {
    try {
      const parsed = JSON.parse(rawReportData);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.error('[Report View] Failed to parse report_data:', error);
      return {};
    }
  }

  return {};
}

function calculateScore(result) {
  // First try to get percentage_score
  if (result.percentage_score !== undefined && result.percentage_score !== null) {
    const val = safeNumber(result.percentage_score);
    if (val === 0 && result.total_score !== undefined && result.max_score !== undefined) {
      const total = safeNumber(result.total_score);
      const max = safeNumber(result.max_score);
      if (max > 0) {
        return Math.round((total / max) * 100);
      }
    }
    if (val > 0) return val;
  }
  
  // Calculate from total_score and max_score
  if (result.total_score !== undefined && result.max_score !== undefined) {
    const total = safeNumber(result.total_score);
    const max = safeNumber(result.max_score);
    if (max > 0) {
      return Math.round((total / max) * 100);
    }
  }
  
  // Check in report_data
  if (result.report_data) {
    try {
      let reportData = result.report_data;
      if (typeof reportData === 'string') {
        reportData = JSON.parse(reportData);
      }
      
      if (reportData.totalEarned !== undefined && reportData.totalMax !== undefined) {
        const earned = safeNumber(reportData.totalEarned);
        const max = safeNumber(reportData.totalMax);
        if (max > 0) {
          return Math.round((earned / max) * 100);
        }
      }
      
      if (reportData.percentageScore !== undefined) {
        const val = safeNumber(reportData.percentageScore);
        if (val > 0) return val;
      }
    } catch (e) {}
  }
  
  return 0;
}

// ============================================================
// BEHAVIORAL MATRIX EXTRACTOR
// ============================================================
function extractBehavioralMatrix(reportData) {
  if (!reportData) return null;

  const proctoring = reportData.proctoring || 
                     reportData.behavioral || 
                     reportData.behavioralMatrix || 
                     {};

  if (Object.keys(proctoring).length === 0) {
    return null;
  }

  const matrix = {
    totalTime: proctoring.totalTime || '00:00:00',
    avgTimePerQuestion: proctoring.avgTimePerQuestion || 0,
    answerChanges: proctoring.answerChanges || proctoring.answer_changes || 0,
    tabSwitches: proctoring.tabSwitches || proctoring.tab_switches || 0,
    violations: proctoring.totalViolations || proctoring.violations || 0,
    copyPasteAttempts: proctoring.copyPasteAttempts || 0,
    rightClickAttempts: proctoring.rightClickAttempts || 0,
    riskLevel: proctoring.riskLevel || 'Low Risk',
    riskScore: proctoring.riskScore || 0,
    riskFactors: proctoring.riskFactors || [],
    externalUrlsVisited: proctoring.externalUrlsVisited || 0,
    flags: {
      violations: proctoring.totalViolations || proctoring.violations || 0,
      tabSwitches: proctoring.tabSwitches || proctoring.tab_switches || 0,
      answerChanges: proctoring.answerChanges || proctoring.answer_changes || 0
    }
  };

  return matrix;
}

// ============================================================
// UUID VALIDATION
// ============================================================
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SupervisorReportView() {
  const router = useRouter();
  const { resultId } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isNationalService, setIsNationalService] = useState(false);
  const [behavioralMatrix, setBehavioralMatrix] = useState(null);

  useEffect(() => {
    if (!resultId) return;

    if (!isValidUUID(resultId)) {
      setError('Invalid report ID format. Please go back and select a valid report.');
      setLoading(false);
      return;
    }

    fetchReport();
  }, [resultId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Please sign in to view this report.');
        setLoading(false);
        return;
      }

      console.log('[Report View] Fetching report...');

      const response = await fetch(`/api/assessment-report/${resultId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[Report View] Invalid API response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to view this report.');
        }
        if (response.status === 404) {
          throw new Error('The requested report could not be found.');
        }
        throw new Error(data?.error || 'Failed to load report');
      }

      console.log('[Report View] Report fetched successfully');

      const result = data.result || {};
      const parsedResultReportData = getReportDataObject(result.report_data);
      let report = data.report || {};

      // Merge report_data into report
      if (parsedResultReportData && Object.keys(parsedResultReportData).length > 0) {
        report = {
          ...parsedResultReportData,
          ...report,
          report_data: parsedResultReportData
        };
      }

      // Determine if National Service
      const assessmentId = result?.assessment_id || data?.assessment_id || '';
      const assessmentTitle = result?.assessments?.title || report?.assessmentName || data?.assessmentTitle || '';

      const isNS = assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID ||
                   assessmentTitle === 'National Service Recruitment Assessment';

      // Get candidate info
      const profile = result?.candidate_profiles || {};
      const candidateInfo = {
        fullName: profile?.full_name || result?.candidate_name || data?.candidateName || 'Candidate',
        email: profile?.email || '',
        university: profile?.university || 'Not Specified',
        programme: profile?.programme || 'Not Specified',
        assessmentDate: result?.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
      };

      // Get category scores
      const categoryScores = result?.category_scores || 
                             report?.category_scores || 
                             report?.categoryScores || 
                             parsedResultReportData?.categoryScores || [];

      // Calculate score
      const displayScore = calculateScore(result);

      // Get recommendation
      let recommendation = result?.recommendation || report?.recommendation || 'N/A';
      if (isNS && displayScore > 0) {
        const s = displayScore;
        if (s >= 85) recommendation = 'Highly Recommended';
        else if (s >= 75) recommendation = 'Recommended';
        else if (s >= 65) recommendation = 'Reserve Pool';
        else recommendation = 'Not Recommended';
      }

      // Extract behavioral matrix
      const matrix = extractBehavioralMatrix(parsedResultReportData || report);
      console.log('[Report View] Behavioral Matrix:', matrix);

      // Build the report object
      const reportObject = {
        ...report,
        reportType: isNS ? 'national_service' : 'stratavax',
        candidateName: candidateInfo.fullName,
        candidateInfo: candidateInfo,
        category_scores: categoryScores,
        categoryScores: categoryScores,
        overallScore: displayScore,
        percentage_score: displayScore,
        score: displayScore,
        recommendation: recommendation,
        status: result?.status || 'Pending',
        completed_at: result?.completed_at,
        created_at: result?.created_at,
        total_questions: result?.total_questions || 0,
        answered_questions: result?.answered_questions || 0,
        behavioralMatrix: matrix,
        proctoring: parsedResultReportData?.proctoring || null,
        strengths: result?.strengths || report?.strengths || [],
        weaknesses: result?.weaknesses || report?.weaknesses || [],
        recommendations: result?.recommendations || report?.recommendations || [],
        classification: result?.classification || report?.classification || 'Standard Profile',
        riskLevel: result?.risk_level || report?.riskLevel || 'Medium',
        executiveSummary: report?.executiveSummary || '',
        supervisorImplication: report?.supervisorImplication || ''
      };

      // Build the result object for StratavaxReport
      const stratavaxResult = {
        ...result,
        candidate_profiles: {
          full_name: candidateInfo.fullName,
          email: candidateInfo.email,
          university: candidateInfo.university,
          programme: candidateInfo.programme
        },
        assessments: {
          title: assessmentTitle || 'Assessment'
        },
        percentage_score: displayScore,
        classification: reportObject.classification,
        riskLevel: reportObject.riskLevel,
        categoryScores: categoryScores,
        strengths: reportObject.strengths,
        weaknesses: reportObject.weaknesses,
        recommendations: reportObject.recommendations,
        executiveSummary: reportObject.executiveSummary,
        supervisorImplication: reportObject.supervisorImplication,
        total_questions: reportObject.total_questions,
        answered_questions: reportObject.answered_questions,
        completed_at: result?.completed_at,
        candidateName: candidateInfo.fullName,
        behavioralMatrix: matrix
      };

      setReportData({
        report: reportObject,
        result: stratavaxResult,
        candidateName: candidateInfo.fullName,
        behavioralMatrix: matrix
      });
      setIsNationalService(isNS);
      setBehavioralMatrix(matrix);
      setLoading(false);

    } catch (err) {
      console.error('[Report View] Error:', err);
      setError(err.message || 'Failed to load report');
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/supervisor/reports');
  };

  // ============================================================
  // RENDER STATES
  // ============================================================

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading report...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Error Loading Report</h2>
          <p style={styles.errorMessage}>{error}</p>
          <div style={styles.errorButtonGroup}>
            <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
            <button onClick={fetchReport} style={styles.retryButton}>Retry</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isNationalService && reportData?.report) {
    return (
      <AppLayout>
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>← Back to Reports</button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>National Service Report</span>
        </div>

        <NationalServiceReport
          report={{
            ...reportData.report,
            proctoring: reportData.report.proctoring,
            behavioralMatrix: behavioralMatrix,
            report_data: reportData.report.report_data || {}
          }}
          onBack={handleBack}
          behavioralMatrix={behavioralMatrix}
          loadingBehavioral={false}
        />
      </AppLayout>
    );
  }

  if (!isNationalService && reportData?.result) {
    return (
      <AppLayout>
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>← Back to Reports</button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>Assessment Report</span>
        </div>

        <StratavaxReport
          result={reportData.result}
          candidate={reportData.result.candidate_profiles || null}
          assessment={reportData.result.assessments || null}
          onBack={handleBack}
          behavioralMatrix={behavioralMatrix}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>← Back to Reports</button>
        <div style={styles.fallbackContent}>
          <h2>Report Not Available</h2>
          <p>Unable to determine the report type.</p>
        </div>
      </div>
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    maxWidth: '500px',
    margin: '40px auto',
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorMessage: {
    color: '#dc2626',
    marginBottom: '20px'
  },
  errorButtonGroup: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginTop: '16px'
  },
  errorButton: {
    padding: '10px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  retryButton: {
    padding: '10px 24px',
    background: '#e2e8f0',
    color: '#1a202c',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap'
  },
  breadcrumbButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#1a237e',
    fontWeight: '500'
  },
  breadcrumbSeparator: {
    color: '#94a3b8'
  },
  breadcrumbText: {
    fontSize: '14px',
    color: '#475569'
  },
  fallbackContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '20px'
  },
  fallbackContent: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
};

// Add keyframe animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
