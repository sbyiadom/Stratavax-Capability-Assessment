// pages/admin/reports/[resultId].js - FIXED candidate name

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
        console.log('[Admin Report] assessmentTypeCode:', assessmentTypeCode);

        // ============================================================
        // BUILD REPORT OBJECT
        // ============================================================
        let report = data.report || {};
        let result = data.result || {};

        if (result.report_data && !report.dimensions) {
          report = result.report_data;
        }

        // ============================================================
        // EXTRACT CANDIDATE NAME - CRITICAL FIX
        // ============================================================
        let candidateName = 'Candidate';
        let candidateEmail = '';
        let candidateUniversity = '';
        let candidateProgramme = '';
        
        // Try multiple sources for candidate name
        if (result.candidate_profiles?.full_name) {
          candidateName = result.candidate_profiles.full_name;
          candidateEmail = result.candidate_profiles.email || '';
          candidateUniversity = result.candidate_profiles.university || '';
          candidateProgramme = result.candidate_profiles.programme || '';
        } else if (report.candidateInfo?.fullName) {
          candidateName = report.candidateInfo.fullName;
          candidateEmail = report.candidateInfo.email || '';
          candidateUniversity = report.candidateInfo.university || '';
          candidateProgramme = report.candidateInfo.programme || '';
        } else if (data.candidateName) {
          candidateName = data.candidateName;
        } else if (data.result?.candidate_name) {
          candidateName = data.result.candidate_name;
        }

        console.log('[Admin Report] Candidate name:', candidateName);

        // ============================================================
        // FOR NATIONAL SERVICE
        // ============================================================
        if (isNS) {
          let categoryScores = [];
          
          if (data.categoryScores && Array.isArray(data.categoryScores) && data.categoryScores.length > 0) {
            categoryScores = data.categoryScores;
          } else if (data.workplaceSubCategories && data.intellectualSubCategories) {
            categoryScores = [
              ...(data.workplaceSubCategories || []),
              ...(data.intellectualSubCategories || [])
            ];
          } else if (result.category_scores && Array.isArray(result.category_scores) && result.category_scores.length > 0) {
            categoryScores = result.category_scores;
          } else if (report.category_scores && Array.isArray(report.category_scores) && report.category_scores.length > 0) {
            categoryScores = report.category_scores;
          } else if (report.categoryScores && Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
            categoryScores = report.categoryScores;
          }

          report.category_scores = categoryScores;
          report.workplaceSubCategories = data.workplaceSubCategories || [];
          report.intellectualSubCategories = data.intellectualSubCategories || [];

          if (!report.dimensions) {
            report.dimensions = {
              workplaceReadiness: data.workplaceReadiness || result.workplace_readiness || 0,
              intellectualCapability: data.intellectualCapability || result.intellectual_capability || 0,
              overallScore: data.overallScore || result.percentage_score || 0
            };
          }

          if (!report.recommendation) {
            report.recommendation = {
              level: data.recommendation || result.recommendation || 'Not Recommended'
            };
          }

          if (!report.candidateInfo) {
            report.candidateInfo = {
              fullName: candidateName,
              email: candidateEmail,
              university: candidateUniversity,
              programme: candidateProgramme,
              graduationYear: result.candidate_profiles?.graduation_year || '',
              preferredDepartment: result.candidate_profiles?.preferred_department || '',
              assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
            };
          }

          if (!report.statistics) {
            report.statistics = {
              totalQuestions: result.total_questions || 0,
              totalAnswered: result.answered_questions || 0
            };
          }

          report.reportType = 'national_service';
        }

        // ============================================================
        // FOR STRATAVAX - CRITICAL FIX: Pass candidate name
        // ============================================================
        if (!isNS) {
          let categoryScores = [];
          
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

          let strengths = result.strengths || report.strengths || data.strengths || [];
          let weaknesses = result.weaknesses || report.weaknesses || report.developmentAreas || data.weaknesses || [];
          let recommendations = result.recommendations || report.recommendations || data.recommendations || [];

          // Build candidate info with the extracted name
          const candidateInfo = {
            fullName: candidateName,
            email: candidateEmail,
            university: candidateUniversity,
            programme: candidateProgramme,
            graduationYear: result.candidate_profiles?.graduation_year || report.candidateInfo?.graduationYear || '',
            preferredDepartment: result.candidate_profiles?.preferred_department || report.candidateInfo?.preferredDepartment || '',
            assessmentDate: result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'
          };

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
            candidateName: candidateName, // Add this for direct access
            reportType: 'stratavax',
            total_questions: result.total_questions || 0,
            answered_questions: result.answered_questions || 0
          };
        }

        setReportData({
          ...data,
          report: report,
          result: result,
          candidateName: candidateName // Add to top level for easy access
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
      // Pass candidate name directly
      candidateName: report.candidateInfo?.fullName || reportData.candidateName || 'Candidate'
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
          candidate={stratavaxResult.candidate_profiles || null}
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
