// pages/admin/reports/[resultId].js - FIXED data mapping for Stratavax

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

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
        const assessmentId = data.result?.assessment_id || data.assessment_id || '';
        const assessmentTypeCode = data.assessmentTypeCode || data.result?.assessment_type_code || '';
        
        const isNS = 
          assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID ||
          assessmentTypeCode === 'national_service' ||
          data.isNationalService === true;

        console.log('[Admin Report] Is National Service:', isNS);

        // ============================================================
        // BUILD REPORT OBJECT
        // ============================================================
        let report = data.report || {};
        let result = data.result || {};

        if (result.report_data && !report.dimensions) {
          report = result.report_data;
        }

        // ============================================================
        // FOR NATIONAL SERVICE: Build with sub-categories
        // ============================================================
        if (isNS) {
          let allCategoryScores = [];

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
                intellectual.push(cat);
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

          if (!report.statistics) {
            report.statistics = {
              totalQuestions: result.total_questions || 0,
              totalAnswered: result.answered_questions || 0
            };
          }
        }

        // ============================================================
        // FOR STRATAVAX: Build with all necessary data
        // ============================================================
        if (!isNS) {
          // Get category scores - try multiple sources
          let categoryScores = [];
          
          // Try result.categoryScores
          if (result.categoryScores && Array.isArray(result.categoryScores)) {
            categoryScores = result.categoryScores;
          } else if (result.category_scores && Array.isArray(result.category_scores)) {
            categoryScores = result.category_scores;
          } else if (report.categoryScores && Array.isArray(report.categoryScores)) {
            categoryScores = report.categoryScores;
          } else if (report.category_scores && Array.isArray(report.category_scores)) {
            categoryScores = report.category_scores;
          } else if (data.categoryScores && Array.isArray(data.categoryScores)) {
            categoryScores = data.categoryScores;
          }

          // Get strengths - try multiple sources
          let strengths = [];
          if (result.strengths && Array.isArray(result.strengths)) {
            strengths = result.strengths;
          } else if (report.strengths && Array.isArray(report.strengths)) {
            strengths = report.strengths;
          } else if (data.strengths && Array.isArray(data.strengths)) {
            strengths = data.strengths;
          }

          // Get weaknesses
          let weaknesses = [];
          if (result.weaknesses && Array.isArray(result.weaknesses)) {
            weaknesses = result.weaknesses;
          } else if (report.weaknesses && Array.isArray(report.weaknesses)) {
            weaknesses = report.weaknesses;
          } else if (report.developmentAreas && Array.isArray(report.developmentAreas)) {
            weaknesses = report.developmentAreas;
          } else if (data.weaknesses && Array.isArray(data.weaknesses)) {
            weaknesses = data.weaknesses;
          }

          // Get recommendations
          let recommendations = [];
          if (result.recommendations && Array.isArray(result.recommendations)) {
            recommendations = result.recommendations;
          } else if (report.recommendations && Array.isArray(report.recommendations)) {
            recommendations = report.recommendations;
          } else if (data.recommendations && Array.isArray(data.recommendations)) {
            recommendations = data.recommendations;
          }

          // Get candidate info
          const candidateInfo = {
            fullName: result.candidate_profiles?.full_name || report.candidateInfo?.fullName || data.candidateName || 'Candidate',
            email: result.candidate_profiles?.email || report.candidateInfo?.email || '',
            university: result.candidate_profiles?.university || report.candidateInfo?.university || '',
            programme: result.candidate_profiles?.programme || report.candidateInfo?.programme || '',
            graduationYear: result.candidate_profiles?.graduation_year || report.candidateInfo?.graduationYear || '',
            preferredDepartment: result.candidate_profiles?.preferred_department || report.candidateInfo?.preferredDepartment || '',
            assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
          };

          // Get assessment info
          const assessmentInfo = {
            title: result.assessments?.title || report.assessmentName || data.assessmentName || 'Assessment',
            type: result.assessments?.assessment_type?.name || report.assessmentType || 'General'
          };

          // Build the report with all data
          report = {
            ...report,
            categoryScores: categoryScores,
            category_scores: categoryScores,
            strengths: strengths,
            weaknesses: weaknesses,
            recommendations: recommendations,
            overallScore: result.percentage_score || report.overallScore || data.overallScore || 0,
            percentage_score: result.percentage_score || report.percentage_score || data.percentage_score || 0,
            classification: result.classification || report.classification || data.classification || 'Standard Profile',
            riskLevel: result.riskLevel || report.riskLevel || result.risk_level || data.riskLevel || 'Medium',
            executiveSummary: result.executiveSummary || report.executiveSummary || data.executiveSummary || '',
            supervisorImplication: result.supervisorImplication || report.supervisorImplication || data.supervisorImplication || '',
            candidateInfo: candidateInfo,
            assessmentInfo: assessmentInfo,
            reportType: 'stratavax',
            total_questions: result.total_questions || report.total_questions || 0,
            answered_questions: result.answered_questions || report.answered_questions || 0
          };

          console.log('[Admin Report] Stratavax report built:', {
            categoryScores: categoryScores.length,
            strengths: strengths.length,
            weaknesses: weaknesses.length,
            recommendations: recommendations.length,
            candidateName: candidateInfo.fullName,
            assessmentTitle: assessmentInfo.title
          });
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
    
    // Build the result object with all necessary data
    const stratavaxResult = {
      ...reportData.result,
      candidate_profiles: report.candidateInfo || null,
      assessments: {
        title: report.assessmentInfo?.title || reportData.result?.assessments?.title || 'Assessment',
        assessment_type: {
          name: report.assessmentInfo?.type || reportData.result?.assessments?.assessment_type?.name || 'General'
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
      completed_at: reportData.result?.completed_at || null
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
          result={stratavaxResult}
          candidate={report.candidateInfo || null}
          assessment={stratavaxResult.assessments || null}
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
              reportKeys: reportData?.report ? Object.keys(reportData.report) : []
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
