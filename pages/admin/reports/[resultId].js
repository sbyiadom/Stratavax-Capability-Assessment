// pages/admin/reports/[resultId].js - FIXED with both report types

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport'; // <-- ADD THIS IMPORT
import AppLayout from '../../../components/AppLayout';

export default function AdminReportView() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isNationalService, setIsNationalService] = useState(false);

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

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

        console.log('[Admin Report] Full data received:', data);

        // ============================================================
        // DETERMINE IF NATIONAL SERVICE
        // ============================================================
        const isNS = 
          data.isNationalService === true ||
          data.assessmentTypeCode === 'national_service' ||
          (data.result?.report_data && data.result.report_data.dimensions && 
           data.result.report_data.dimensions.workplaceReadiness !== undefined) ||
          (data.report && data.report.dimensions && 
           data.report.dimensions.workplaceReadiness !== undefined) ||
          (data.result?.workplace_readiness !== undefined && data.result?.workplace_readiness !== null) ||
          (data.report?.reportType === 'national_service');

        console.log('[Admin Report] Is National Service:', isNS);

        // ============================================================
        // BUILD REPORT OBJECT
        // ============================================================
        let report = data.report || {};
        let result = data.result || {};

        // If we have report_data in the result, use it
        if (result.report_data && !report.dimensions) {
          report = result.report_data;
        }

        // ============================================================
        // FOR NATIONAL SERVICE: Build with sub-categories
        // ============================================================
        if (isNS) {
          let allCategoryScores = [];

          // Get category scores from various sources
          if (data.workplaceSubCategories && data.workplaceSubCategories.length > 0) {
            report.workplaceSubCategories = data.workplaceSubCategories;
            allCategoryScores = [...allCategoryScores, ...data.workplaceSubCategories];
          }

          if (data.intellectualSubCategories && data.intellectualSubCategories.length > 0) {
            report.intellectualSubCategories = data.intellectualSubCategories;
            allCategoryScores = [...allCategoryScores, ...data.intellectualSubCategories];
          }

          if (result.workplaceSubCategories && result.workplaceSubCategories.length > 0) {
            report.workplaceSubCategories = result.workplaceSubCategories;
            allCategoryScores = [...allCategoryScores, ...result.workplaceSubCategories];
          }

          if (result.intellectualSubCategories && result.intellectualSubCategories.length > 0) {
            report.intellectualSubCategories = result.intellectualSubCategories;
            allCategoryScores = [...allCategoryScores, ...result.intellectualSubCategories];
          }

          if (report.categoryScores && Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
            allCategoryScores = [...allCategoryScores, ...report.categoryScores];
          }

          // Fallback: split from categoryScores
          if (allCategoryScores.length === 0 && data.categoryScores && data.categoryScores.length > 0) {
            const workplaceNames = ['Safety', 'Risk', 'Technical', 'Communication', 'Teamwork', 'Ownership', 'Integrity', 'Workplace', 'Ethics', 'Professional', 'Readiness'];
            const intellectualNames = ['Numerical', 'Logical', 'Reasoning', 'Measurement', 'Engineering', 'Spatial', 'Problem', 'Troubleshooting', 'Analysis', 'Critical', 'Analytical', 'Decision'];

            const workplace = [];
            const intellectual = [];

            data.categoryScores.forEach(cat => {
              const name = (cat.category || cat.name || '').toLowerCase();
              const isWorkplace = workplaceNames.some(n => name.includes(n.toLowerCase()));
              const isIntellectual = intellectualNames.some(n => name.includes(n.toLowerCase()));

              if (isWorkplace) {
                workplace.push(cat);
              } else if (isIntellectual) {
                intellectual.push(cat);
              } else {
                // Default: if it has 'capability' or 'reasoning' put in intellectual
                if (name.includes('capability') || name.includes('reasoning')) {
                  intellectual.push(cat);
                } else {
                  workplace.push(cat);
                }
              }
            });

            if (workplace.length > 0) report.workplaceSubCategories = workplace;
            if (intellectual.length > 0) report.intellectualSubCategories = intellectual;
            allCategoryScores = [...workplace, ...intellectual];
          }

          if (allCategoryScores.length > 0) {
            report.category_scores = allCategoryScores;
          }

          if (!report.dimensions) {
            report.dimensions = {
              workplaceReadiness: result.workplace_readiness || 0,
              intellectualCapability: result.intellectual_capability || 0,
              overallScore: result.percentage_score || 0
            };
          }

          if (!report.recommendation) {
            report.recommendation = {
              level: result.recommendation || 'Not Recommended'
            };
          }
        }

        // ============================================================
        // FOR STRATAVAX: Build with category scores, strengths, weaknesses
        // ============================================================
        if (!isNS) {
          // Get category scores
          let categoryScores = result.categoryScores || result.category_scores || [];
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

          // Build the report
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

        // Ensure candidateInfo exists for both
        if (!report.candidateInfo && result.candidate_profiles) {
          report.candidateInfo = {
            fullName: result.candidate_profiles.full_name || 'Candidate',
            university: result.candidate_profiles.university || '',
            programme: result.candidate_profiles.programme || '',
            graduationYear: result.candidate_profiles.graduation_year || '',
            preferredDepartment: result.candidate_profiles.preferred_department || '',
            assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
          };
        }

        setReportData({
          ...data,
          report: report,
          result: result
        });
        setIsNationalService(isNS);

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
  // RENDER NATIONAL SERVICE REPORT
  // ============================================================
  if (isNationalService && reportData?.report) {
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

  // ============================================================
  // RENDER STRATAVAX REPORT
  // ============================================================
  if (!isNationalService && reportData?.report) {
    console.log('[Admin Report] Rendering Stratavax Report');
    const report = reportData.report;
    
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
          result={{
            ...reportData.result,
            candidate_profiles: report.candidateInfo || null,
            percentage_score: report.overallScore || report.percentage_score || 0,
            classification: report.classification || 'Standard Profile',
            riskLevel: report.riskLevel || 'Medium',
            categoryScores: report.categoryScores || report.category_scores || [],
            strengths: report.strengths || [],
            weaknesses: report.weaknesses || [],
            recommendations: report.recommendations || [],
            executiveSummary: report.executiveSummary || '',
            supervisorImplication: report.supervisorImplication || ''
          }}
          candidate={report.candidateInfo || null}
          assessment={reportData.result?.assessments || null}
          onBack={handleBack}
        />
      </AppLayout>
    );
  }

  // ============================================================
  // FALLBACK
  // ============================================================
  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Reports List
        </button>
        <div style={styles.fallbackContent}>
          <h2>Report Not Available</h2>
          <p>Unable to determine the report type.</p>
          <div style={styles.debugInfo}>
            <pre>{JSON.stringify({
              isNationalService,
              hasReport: !!reportData?.report,
              reportKeys: reportData?.report ? Object.keys(reportData.report) : [],
              hasResult: !!reportData?.result
            }, null, 2)}</pre>
          </div>
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
  debugInfo: {
    marginTop: '16px',
    padding: '12px',
    background: '#f8fafc',
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
