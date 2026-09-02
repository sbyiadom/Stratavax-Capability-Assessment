// pages/admin/reports/[resultId].js - COMPLETE FIXED FILE
// FIX: Properly extracts and passes behavioral matrix to NationalServiceReport

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

// ============================================================
// SCORE / REPORT DATA HELPERS
// ============================================================
function safeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
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
      console.error('[Admin Report View] Failed to parse report_data:', error);
      return {};
    }
  }

  return {};
}

// ============================================================
// 🟢 BEHAVIORAL MATRIX EXTRACTOR
// ============================================================
function extractBehavioralMatrix(reportData) {
  if (!reportData) {
    return null;
  }

  const proctoring = reportData.proctoring || 
                     reportData.behavioral || 
                     reportData.behavioralMatrix || 
                     {};

  if (Object.keys(proctoring).length === 0) {
    return null;
  }

  let totalTime = '00:00:00';
  if (reportData.completedAt) {
    try {
      const startTime = new Date(reportData.completedAt);
      const now = new Date();
      const diffMs = now - startTime;
      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const diffSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        totalTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    } catch (e) {}
  }

  let avgTimePerQuestion = 0;
  if (reportData.totalMax && reportData.totalMax > 0 && reportData.completedAt) {
    try {
      const startTime = new Date(reportData.completedAt);
      const now = new Date();
      const diffMs = now - startTime;
      if (diffMs > 0 && reportData.totalMax > 0) {
        avgTimePerQuestion = Math.round(diffMs / reportData.totalMax / 1000);
      }
    } catch (e) {}
  }

  const matrix = {
    totalTime: totalTime,
    avgTimePerQuestion: avgTimePerQuestion || proctoring.avgTimePerQuestion || 0,
    answerChanges: proctoring.answerChanges || proctoring.answer_changes || 0,
    tabSwitches: proctoring.tabSwitches || proctoring.tab_switches || 0,
    violations: proctoring.totalViolations || proctoring.violations || 0,
    copyPasteAttempts: proctoring.copyPasteAttempts || proctoring.copy_paste_attempts || 0,
    rightClickAttempts: proctoring.rightClickAttempts || proctoring.right_click_attempts || 0,
    riskLevel: proctoring.riskLevel || proctoring.risk_level || 'Low Risk',
    riskScore: proctoring.riskScore || proctoring.risk_score || 0,
    riskFactors: proctoring.riskFactors || proctoring.risk_factors || [],
    externalUrlsVisited: proctoring.externalUrlsVisited || proctoring.external_urls_visited || 0,
    flags: {
      violations: proctoring.totalViolations || proctoring.violations || 0,
      tabSwitches: proctoring.tabSwitches || proctoring.tab_switches || 0,
      answerChanges: proctoring.answerChanges || proctoring.answer_changes || 0
    }
  };

  return matrix;
}

function getAuthoritativeNationalServiceScores(data, result, report) {
  const parsedReportData = getReportDataObject(result?.report_data);
  const reportDimensions = report?.dimensions || {};
  const parsedDimensions = parsedReportData?.dimensions || {};
  const parsedScores = parsedReportData?.scores || {};

  const workplaceReadiness = roundScore(
    parsedDimensions.workplaceReadiness ??
    parsedScores.workplace ??
    reportDimensions.workplaceReadiness ??
    report?.workplaceReadiness ??
    report?.workplace_readiness ??
    data?.workplaceReadiness ??
    result?.workplace_readiness ??
    0
  );

  const intellectualCapability = roundScore(
    parsedDimensions.intellectualCapability ??
    parsedScores.intellectual ??
    reportDimensions.intellectualCapability ??
    report?.intellectualCapability ??
    report?.intellectual_capability ??
    data?.intellectualCapability ??
    result?.intellectual_capability ??
    0
  );

  const overallScore = roundScore(
    parsedDimensions.overallScore ??
    parsedScores.overall ??
    parsedReportData?.overallScore ??
    reportDimensions.overallScore ??
    report?.overallScore ??
    report?.percentage_score ??
    report?.score ??
    data?.overallScore ??
    result?.percentage_score ??
    0
  );

  return {
    workplaceReadiness,
    intellectualCapability,
    overallScore,
    parsedReportData
  };
}

function getCandidateInfo(data, result, report) {
  const profile = result?.candidate_profiles || {};
  const existingInfo = report?.candidateInfo || {};

  return {
    fullName:
      profile?.full_name ||
      existingInfo?.fullName ||
      data?.candidateName ||
      result?.candidate_name ||
      'Candidate',
    email: profile?.email || existingInfo?.email || '',
    university: profile?.university || existingInfo?.university || data?.university || 'N/A',
    programme: profile?.programme || existingInfo?.programme || data?.programme || 'N/A',
    graduationYear: profile?.graduation_year || existingInfo?.graduationYear || data?.graduationYear || '',
    preferredDepartment: profile?.preferred_department || existingInfo?.preferredDepartment || data?.preferredDepartment || 'Not Specified',
    assessmentDate: result?.completed_at ? new Date(result.completed_at).toLocaleDateString() : (existingInfo?.assessmentDate || 'N/A')
  };
}

function getCategoryScores(data, result, report) {
  if (Array.isArray(data?.categoryScores) && data.categoryScores.length > 0) return data.categoryScores;
  if (Array.isArray(data?.category_scores) && data.category_scores.length > 0) return data.category_scores;
  if (Array.isArray(data?.workplaceSubCategories) || Array.isArray(data?.intellectualSubCategories)) {
    return [
      ...(data.workplaceSubCategories || []),
      ...(data.intellectualSubCategories || [])
    ];
  }
  if (Array.isArray(result?.category_scores) && result.category_scores.length > 0) return result.category_scores;
  if (Array.isArray(report?.category_scores) && report.category_scores.length > 0) return report.category_scores;
  if (Array.isArray(report?.categoryScores) && report.categoryScores.length > 0) return report.categoryScores;
  if (Array.isArray(report?.categoryBreakdown) && report.categoryBreakdown.length > 0) return report.categoryBreakdown;
  return [];
}

// ============================================================
// AUTH HELPER
// ============================================================
async function getValidAdminSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session) {
    return { session: null, error: 'No valid session. Please sign in again.' };
  }

  const session = sessionData.session;
  const metadataRole = session.user?.user_metadata?.role || null;

  const { data: adminProfile, error: profileError } = await supabase
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError) {
    return { session: null, error: 'Unable to verify administrator access.' };
  }

  const resolvedRole = adminProfile?.role || metadataRole;

  if (resolvedRole !== 'admin') {
    return { session: null, error: 'You do not have permission to view this report.' };
  }

  if (adminProfile?.is_active === false) {
    await supabase.auth.signOut();
    return { session: null, error: 'Your account is inactive. Please contact support.' };
  }

  return { session, error: null };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminReportView() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isNationalService, setIsNationalService] = useState(false);
  const [behavioralMatrix, setBehavioralMatrix] = useState(null);
  const [loadingBehavioral, setLoadingBehavioral] = useState(false);

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const { session: validSession, error: authError } = await getValidAdminSession();
        
        if (authError || !validSession) {
          setError(authError || 'Authentication failed');
          setLoading(false);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        const token = validSession.access_token;

        if (!token) {
          setError('Unauthorized: No valid access token found. Please sign in again.');
          setLoading(false);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

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
          throw new Error(`The report server returned an invalid response. HTTP status: ${response.status}`);
        }

        if (!response.ok || !data.success) {
          if (response.status === 401) {
            throw new Error(data?.error || 'Your session is invalid or has expired. Please sign in again.');
          }
          if (response.status === 403) {
            throw new Error(data?.error || 'You do not have permission to view this report.');
          }
          if (response.status === 404) {
            throw new Error(data?.error || 'The requested assessment report could not be found.');
          }
          throw new Error(data?.error || `Failed to load report. HTTP status: ${response.status}`);
        }

        const result = data.result || {};
        const parsedResultReportData = getReportDataObject(result.report_data);
        let report = data.report || {};

        if (parsedResultReportData && Object.keys(parsedResultReportData).length > 0) {
          report = {
            ...parsedResultReportData,
            ...report,
            dimensions: report.dimensions || parsedResultReportData.dimensions || {},
            scores: report.scores || parsedResultReportData.scores || {},
            category_scores: report.category_scores || parsedResultReportData.category_scores || parsedResultReportData.categoryBreakdown || [],
            categoryBreakdown: report.categoryBreakdown || parsedResultReportData.categoryBreakdown || parsedResultReportData.category_scores || [],
            report_data: parsedResultReportData
          };
        }

        const assessmentId = result?.assessment_id || data?.assessment_id || '';
        const assessmentTypeCode = data?.assessmentTypeCode || result?.assessment_type_code || result?.assessments?.assessment_type?.code || '';
        const assessmentTitle = result?.assessments?.title || report?.assessmentName || data?.assessmentTitle || '';

        const isNS =
          assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID ||
          assessmentTypeCode === 'national_service' ||
          data?.isNationalService === true ||
          assessmentTitle === 'National Service Recruitment Assessment' ||
          report?.reportType === 'national_service';

        const candidateInfo = getCandidateInfo(data, result, report);
        const candidateName = candidateInfo.fullName || 'Candidate';
        const categoryScores = getCategoryScores(data, result, report);

        const matrix = extractBehavioralMatrix(parsedResultReportData || report);

        if (isNS) {
          const authoritativeScores = getAuthoritativeNationalServiceScores(data, result, report);

          report = {
            ...report,
            reportType: 'national_service',
            candidateName,
            candidateInfo,
            category_scores: categoryScores,
            categoryScores: categoryScores,
            categoryBreakdown: categoryScores,
            workplaceSubCategories: data.workplaceSubCategories || report.workplaceSubCategories || [],
            intellectualSubCategories: data.intellectualSubCategories || report.intellectualSubCategories || [],
            dimensions: {
              ...(report.dimensions || {}),
              workplaceReadiness: authoritativeScores.workplaceReadiness,
              intellectualCapability: authoritativeScores.intellectualCapability,
              overallScore: authoritativeScores.overallScore
            },
            scores: {
              ...(report.scores || {}),
              workplace: authoritativeScores.workplaceReadiness,
              intellectual: authoritativeScores.intellectualCapability,
              overall: authoritativeScores.overallScore,
              recommendation: report.scores?.recommendation || report.recommendation || data.recommendation || result.recommendation || 'Not Recommended'
            },
            workplaceReadiness: authoritativeScores.workplaceReadiness,
            intellectualCapability: authoritativeScores.intellectualCapability,
            workplace_readiness: authoritativeScores.workplaceReadiness,
            intellectual_capability: authoritativeScores.intellectualCapability,
            overallScore: authoritativeScores.overallScore,
            percentage_score: authoritativeScores.overallScore,
            score: authoritativeScores.overallScore,
            recommendation: report.scores?.recommendation || report.recommendation || data.recommendation || result.recommendation || 'Not Recommended',
            statistics: report.statistics || {
              totalQuestions: result.total_questions || 0,
              totalAnswered: result.answered_questions || 0
            },
            proctoring: parsedResultReportData?.proctoring || report.proctoring || null,
            behavioralMatrix: matrix
          };
        } else {
          report = {
            ...report,
            reportType: 'stratavax',
            candidateName,
            candidateInfo,
            categoryScores: categoryScores,
            category_scores: categoryScores,
            overallScore: roundScore(result.percentage_score ?? report.overallScore ?? data.overallScore ?? 0),
            percentage_score: roundScore(result.percentage_score ?? report.percentage_score ?? data.percentage_score ?? 0),
            classification: result.classification || report.classification || data.classification || 'Standard Profile',
            riskLevel: result.riskLevel || report.riskLevel || result.risk_level || data.riskLevel || 'Medium',
            strengths: result.strengths || report.strengths || data.strengths || [],
            weaknesses: result.weaknesses || report.weaknesses || report.developmentAreas || data.weaknesses || [],
            recommendations: result.recommendations || report.recommendations || data.recommendations || [],
            total_questions: result.total_questions || 0,
            answered_questions: result.answered_questions || 0,
            proctoring: parsedResultReportData?.proctoring || report.proctoring || null,
            behavioralMatrix: matrix
          };
        }

        setReportData({
          ...data,
          report,
          result,
          candidateName,
          behavioralMatrix: matrix
        });
        setIsNationalService(isNS);
        setBehavioralMatrix(matrix);
        setLoading(false);
      } catch (err) {
        console.error('[Admin Report View] Error fetching report:', err);
        setError(err.message || 'Failed to load report');
        setLoading(false);
        if (err.message?.includes('session') || err.message?.includes('token') || err.message?.includes('Unauthorized')) {
          setTimeout(() => router.push('/login'), 2000);
        }
      }
    };

    fetchReport();
  }, [resultId, session, router]);

  const handleBack = () => {
    router.push('/admin/reports');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading report...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Access Denied</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
          <button 
            onClick={() => router.push('/login')} 
            style={{ ...styles.errorButton, ...styles.secondaryButton }}
          >
            Sign In Again
          </button>
        </div>
      </AppLayout>
    );
  }

  if (isNationalService && reportData?.report) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>← Back to Reports List</button>
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
          loadingBehavioral={loadingBehavioral}
        />
      </AppLayout>
    );
  }

  if (!isNationalService && reportData?.report) {
    const report = reportData.report;

    const stratavaxResult = {
      ...reportData.result,
      candidate_profiles: {
        full_name: report.candidateInfo?.fullName || reportData.candidateName || 'Candidate',
        email: report.candidateInfo?.email || '',
        university: report.candidateInfo?.university || '',
        programme: report.candidateInfo?.programme || '',
        graduation_year: report.candidateInfo?.graduationYear || '',
        preferred_department: report.candidateInfo?.preferredDepartment || ''
      },
      assessments: {
        title: reportData.result?.assessments?.title || report.assessmentName || 'Assessment',
        assessment_type: {
          name: reportData.result?.assessments?.assessment_type?.name || 'General'
        }
      },
      percentage_score: report.overallScore || report.percentage_score || 0,
      classification: report.classification || 'Standard Profile',
      riskLevel: report.riskLevel || 'Medium',
      categoryScores: report.categoryScores || report.category_scores || [],
      strengths: report.strengths || [],
      weaknesses: report.weaknesses || [],
      recommendations: report.recommendations || [],
      executiveSummary: report.executiveSummary || '',
      supervisorImplication: report.supervisorImplication || '',
      total_questions: report.total_questions || 0,
      answered_questions: report.answered_questions || 0,
      completed_at: reportData.result?.completed_at || null,
      candidateName: report.candidateInfo?.fullName || reportData.candidateName || 'Candidate',
      proctoring: report.proctoring,
      behavioralMatrix: behavioralMatrix
    };

    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>← Back to Reports List</button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>Assessment Report</span>
        </div>

        <StratavaxReport
          result={stratavaxResult}
          candidate={stratavaxResult.candidate_profiles || null}
          assessment={stratavaxResult.assessments || null}
          onBack={handleBack}
          behavioralMatrix={behavioralMatrix}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>← Back to Reports List</button>
        <div style={styles.fallbackContent}>
          <h2>Report Not Available</h2>
          <p>Unable to determine the report type.</p>
        </div>
      </div>
    </AppLayout>
  );
}

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
  errorButton: {
    padding: '10px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
    marginRight: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  secondaryButton: {
    background: '#e2e8f0',
    color: '#1a202c'
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
