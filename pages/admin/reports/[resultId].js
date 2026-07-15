// pages/admin/reports/[resultId].js - FIXED with correct report rendering

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

export default function AdminReportView() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState(null); // 'national_service' or 'stratavax'

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

        // Check if user is admin
        const userRole = session.user?.user_metadata?.role || session.user?.role;
        if (userRole !== 'admin') {
          setError('You do not have permission to view this report.');
          setLoading(false);
          return;
        }

        // Fetch the report directly from the API
        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
        }

        console.log('[Admin Report] Full data received:', data);

        // ============================================================
        // DETERMINE REPORT TYPE
        // ============================================================
        // Check if this is a National Service assessment
        const isNationalService = 
          data.isNationalService === true ||
          data.assessmentTypeCode === 'national_service' ||
          (data.result?.report_data && data.result.report_data.dimensions && 
           data.result.report_data.dimensions.workplaceReadiness !== undefined) ||
          (data.report && data.report.dimensions && 
           data.report.dimensions.workplaceReadiness !== undefined) ||
          (data.result?.workplace_readiness !== undefined && data.result?.workplace_readiness !== null) ||
          (data.report?.reportType === 'national_service');

        console.log('[Admin Report] Report type - National Service:', isNationalService);

        // ============================================================
        // BUILD THE REPORT OBJECT
        // ============================================================
        let report = data.report || {};
        let result = data.result || {};

        // If we have report_data in the result, use it
        if (result.report_data && !report.dimensions) {
          report = result.report_data;
        }

        // For Stratavax reports, ensure we have all the data
        if (!isNationalService) {
          // Get category scores from result
          let categoryScores = result.categoryScores || result.category_scores || [];
          
          // Try to get from report_data if not found
          if (categoryScores.length === 0 && report.categoryScores) {
            categoryScores = report.categoryScores;
          }
          if (categoryScores.length === 0 && report.category_scores) {
            categoryScores = report.category_scores;
          }

          // Get strengths and weaknesses
          let strengths = result.strengths || report.strengths || [];
          let weaknesses = result.weaknesses || report.weaknesses || report.developmentAreas || [];
          let recommendations = result.recommendations || report.recommendations || [];

          // Build the Stratavax report data
          report = {
            ...report,
            categoryScores: categoryScores,
            category_scores: categoryScores,
            strengths: strengths,
            weaknesses: weaknesses,
            recommendations: recommendations,
            overallScore: result.percentage_score || report.overallScore || 0,
            percentage_score: result.percentage_score || report.percentage_score || 0,
            classification: result.classification || report.classification || 'Standard Profile',
            riskLevel: result.riskLevel || report.riskLevel || result.risk_level || 'Medium',
            executiveSummary: result.executiveSummary || report.executiveSummary || '',
            supervisorImplication: result.supervisorImplication || report.supervisorImplication || '',
            candidateInfo: {
              fullName: result.candidate_profiles?.full_name || report.candidateInfo?.fullName || 'Candidate',
              university: result.candidate_profiles?.university || report.candidateInfo?.university || '',
              programme: result.candidate_profiles?.programme || report.candidateInfo?.programme || '',
              graduationYear: result.candidate_profiles?.graduation_year || report.candidateInfo?.graduationYear || '',
              preferredDepartment: result.candidate_profiles?.preferred_department || report.candidateInfo?.preferredDepartment || '',
              assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
            },
            reportType: 'stratavax'
          };
        }

        // ============================================================
        // For National Service, ensure sub-categories are included
        // ============================================================
        if (isNationalService) {
          // Get category scores from various sources
          let categoryScores = [];
          
          if (result.category_scores && Array.isArray(result.category_scores)) {
            categoryScores = result.category_scores;
          } else if (report.category_scores && Array.isArray(report.category_scores)) {
            categoryScores = report.category_scores;
          } else if (data.categoryScores && Array.isArray(data.categoryScores)) {
            categoryScores = data.categoryScores;
          } else if (result.report_data?.categoryScores) {
            categoryScores = result.report_data.categoryScores;
          }

          // Get workplace and intellectual sub-categories
          let workplaceSubCategories = report.workplaceSubCategories || data.workplaceSubCategories || [];
          let intellectualSubCategories = report.intellectualSubCategories || data.intellectualSubCategories || [];

          // If we have category scores but no sub-categories, try to split them
          if (categoryScores.length > 0 && workplaceSubCategories.length === 0 && intellectualSubCategories.length === 0) {
            const workplaceKeywords = ['safety', 'risk', 'technical', 'communication', 'teamwork', 'ownership', 'integrity', 'workplace', 'ethics', 'professional', 'readiness'];
            const intellectualKeywords = ['numerical', 'logical', 'reasoning', 'measurement', 'engineering', 'spatial', 'problem', 'troubleshooting', 'analysis', 'critical', 'analytical', 'decision'];

            categoryScores.forEach(cat => {
              const name = (cat.category || cat.name || '').toLowerCase();
              const isWorkplace = workplaceKeywords.some(k => name.includes(k));
              const isIntellectual = intellectualKeywords.some(k => name.includes(k));

              if (isWorkplace) {
                workplaceSubCategories.push(cat);
              } else if (isIntellectual) {
                intellectualSubCategories.push(cat);
              }
            });
          }

          // Build the National Service report
          report = {
            ...report,
            dimensions: {
              workplaceReadiness: result.workplace_readiness || report.dimensions?.workplaceReadiness || 0,
              intellectualCapability: result.intellectual_capability || report.dimensions?.intellectualCapability || 0,
              overallScore: result.percentage_score || report.dimensions?.overallScore || 0
            },
            recommendation: {
              level: result.recommendation || report.recommendation?.level || 'Not Recommended'
            },
            workplaceSubCategories: workplaceSubCategories,
            intellectualSubCategories: intellectualSubCategories,
            category_scores: categoryScores,
            categoryBreakdown: categoryScores,
            candidateInfo: {
              fullName: result.candidate_profiles?.full_name || report.candidateInfo?.fullName || 'Candidate',
              university: result.candidate_profiles?.university || report.candidateInfo?.university || '',
              programme: result.candidate_profiles?.programme || report.candidateInfo?.programme || '',
              graduationYear: result.candidate_profiles?.graduation_year || report.candidateInfo?.graduationYear || '',
              preferredDepartment: result.candidate_profiles?.preferred_department || report.candidateInfo?.preferredDepartment || '',
              assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
            },
            statistics: {
              totalQuestions: result.total_questions || report.statistics?.totalQuestions || 0,
              totalAnswered: result.answered_questions || report.statistics?.totalAnswered || 0
            },
            reportType: 'national_service'
          };
        }

        console.log('[Admin Report] Final report type:', isNationalService ? 'National Service' : 'Stratavax');
        console.log('[Admin Report] Report keys:', Object.keys(report));

        setReportData({
          ...data,
          report: report,
          result: result
        });
        setReportType(isNationalService ? 'national_service' : 'stratavax');

        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReport();
  }, [resultId, session]);

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
          <div style={styles.errorIcon}>🔒</div>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
        </div>
      </AppLayout>
    );
  }

  // ============================================================
  // RENDER THE CORRECT REPORT TYPE
  // ============================================================

  // National Service Report
  if (reportType === 'national_service' && reportData?.report) {
    console.log('[Admin Report] Rendering National Service Report');
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Reports List
          </button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>National Service Report</span>
        </div>
        <NationalServiceReport report={reportData.report} onBack={handleBack} />
      </AppLayout>
    );
  }

  // Stratavax Report
  if (reportType === 'stratavax' && reportData?.report) {
    console.log('[Admin Report] Rendering Stratavax Report');
    const report = reportData.report;
    
    // Prepare data for Stratavax report
    const stratavaxData = {
      result: {
        ...reportData.result,
        candidate_profiles: report.candidateInfo || null,
        assessments: reportData.result?.assessments || null,
        percentage_score: report.overallScore || report.percentage_score || 0,
        classification: report.classification || 'Standard Profile',
        riskLevel: report.riskLevel || 'Medium',
        categoryScores: report.categoryScores || report.category_scores || [],
        strengths: report.strengths || [],
        weaknesses: report.weaknesses || [],
        recommendations: report.recommendations || [],
        executiveSummary: report.executiveSummary || '',
        supervisorImplication: report.supervisorImplication || ''
      },
      candidate: report.candidateInfo || null,
      assessment: reportData.result?.assessments || null
    };

    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Reports List
          </button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>Assessment Report</span>
        </div>
        <StratavaxReport 
          result={stratavaxData.result}
          candidate={stratavaxData.candidate}
          assessment={stratavaxData.assessment}
          onBack={handleBack}
        />
      </AppLayout>
    );
  }

  // Fallback
  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Reports List
        </button>
        <div style={styles.fallbackContent}>
          <h2>Report Not Available</h2>
          <p>Unable to determine the report type.</p>
          <pre style={styles.debugPre}>
            {JSON.stringify({
              reportType,
              hasReport: !!reportData?.report,
              reportKeys: reportData?.report ? Object.keys(reportData.report) : []
            }, null, 2)}
          </pre>
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
    margin: '0 auto'
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
  },
  debugPre: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '300px'
  }
};

// Add keyframe animation
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
