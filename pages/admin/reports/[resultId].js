// pages/admin/reports/[resultId].js - COMPLETE CORRECTED VERSION
// Fixes National Service score mismatch by passing authoritative scores into NationalServiceReport

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

        const userRole = session.user?.user_metadata?.role || session.user?.role;
        if (userRole !== 'admin') {
          setError('You do not have permission to view this report.');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
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
              overall: authoritativeScores.overallScore
            },
            workplaceReadiness: authoritativeScores.workplaceReadiness,
            intellectualCapability: authoritativeScores.intellectualCapability,
            workplace_readiness: authoritativeScores.workplaceReadiness,
            intellectual_capability: authoritativeScores.intellectualCapability,
            overallScore: authoritativeScores.overallScore,
            percentage_score: authoritativeScores.overallScore,
            score: authoritativeScores.overallScore,
            recommendation: report.recommendation || data.recommendation || result.recommendation || 'Not Recommended',
            statistics: report.statistics || {
              totalQuestions: result.total_questions || 0,
              totalAnswered: result.answered_questions || 0
            }
          };

          console.log('[Admin Report] Authoritative National Service scores:', authoritativeScores);
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
            answered_questions: result.answered_questions || 0
          };
        }

        setReportData({
          ...data,
          report,
          result,
          candidateName
        });
        setIsNationalService(isNS);

        await fetchBehavioralMatrix(resultId);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message || 'Failed to load report');
        setLoading(false);
      }
    };

    fetchReport();
  }, [resultId, session]);

  const fetchBehavioralMatrix = async (id) => {
    try {
      setLoadingBehavioral(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setLoadingBehavioral(false);
        return;
      }

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        const matrix = data.behavioralMatrix || data.matrixData || data.data || data.result;
        if (matrix) {
          setBehavioralMatrix(matrix);
        }
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    } finally {
      setLoadingBehavioral(false);
    }
  };

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
          <div style={styles.errorIcon}>!</div>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
        </div>
      </AppLayout>
    );
  }

  if (isNationalService && reportData?.report) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>Back to Reports List</button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>National Service Report</span>
        </div>

        <NationalServiceReport
          report={reportData.report}
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
      candidateName: report.candidateInfo?.fullName || reportData.candidateName || 'Candidate'
    };

    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>Back to Reports List</button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>Assessment Report</span>
        </div>

        <StratavaxReport
          result={stratavaxResult}
          candidate={stratavaxResult.candidate_profiles || null}
          assessment={stratavaxResult.assessments || null}
          onBack={handleBack}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>Back to Reports List</button>
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
    marginBottom: '16px',
    color: '#dc2626'
  },
  errorButton: {
    padding: '10px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px'
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
