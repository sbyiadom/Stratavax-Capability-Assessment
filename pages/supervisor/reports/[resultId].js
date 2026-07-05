// pages/supervisor/reports/[resultId].js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
import StratavaxReport from '../../../components/reports/StratavaxReport';
import AppLayout from '../../../components/AppLayout';

export default function SupervisorReportView() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isNationalService, setIsNationalService] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchReport = async () => {
      try {
        setLoading(true);

        // Check if user is supervisor or admin
        const userRole = session.user?.user_metadata?.role || session.user?.role;
        const isSupervisor = userRole === 'supervisor' || userRole === 'admin';
        
        if (!isSupervisor) {
          setError('You do not have permission to view this report.');
          setLoading(false);
          return;
        }

        setIsAuthorized(true);

        // Fetch the report from the API
        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
        }

        console.log('[Supervisor Report] Data received:', data);
        
        // Store the full data
        setReportData(data);
        
        // ============================================================
        // Determine if this is a National Service assessment
        // ============================================================
        const isNS = 
          data.isNationalService === true ||
          data.assessmentTypeCode === 'national_service' ||
          (data.result?.report_data && data.result.report_data.dimensions && 
           data.result.report_data.dimensions.workplaceReadiness !== undefined) ||
          (data.report && data.report.dimensions && 
           data.report.dimensions.workplaceReadiness !== undefined) ||
          (data.result?.workplace_readiness !== undefined && data.result?.workplace_readiness !== null);

        console.log('[Supervisor Report] Is National Service:', isNS);
        console.log('[Supervisor Report] Assessment type code:', data.assessmentTypeCode);

        // If we have report_data in the result, use it directly
        let report = data.report;
        if (!report && data.result?.report_data) {
          report = data.result.report_data;
          console.log('[Supervisor Report] Using report_data from result');
        }

        // If report is still null, try to build it from the result
        if (!report && data.result) {
          // For National Service, build the report structure
          if (isNS) {
            report = {
              dimensions: {
                workplaceReadiness: data.result.workplace_readiness || 0,
                intellectualCapability: data.result.intellectual_capability || 0,
                overallScore: data.result.percentage_score || 0
              },
              recommendation: {
                level: data.result.recommendation || 'Not Recommended'
              },
              statistics: {
                totalQuestions: data.result.total_questions || 0,
                totalAnswered: data.result.answered_questions || 0
              },
              categoryBreakdown: data.result.report_data?.categoryBreakdown || [],
              candidateInfo: {
                fullName: data.result.candidate_profiles?.full_name || 'Candidate',
                university: data.result.candidate_profiles?.university || '',
                programme: data.result.candidate_profiles?.programme || '',
                graduationYear: data.result.candidate_profiles?.graduation_year || '',
                preferredDepartment: data.result.candidate_profiles?.preferred_department || '',
                assessmentDate: new Date(data.result.completed_at).toLocaleDateString()
              }
            };
          } else {
            // For Stratavax, use the result directly
            report = data.result;
          }
        }

        setReportData({
          ...data,
          report: report,
          isNationalService: isNS
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
    router.push('/supervisor');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading report...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
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
  // Render the correct report format based on assessment type
  // ============================================================
  
  // If it's a National Service assessment, use the National Service Report
  if (isNationalService && reportData?.report && isAuthorized) {
    console.log('[Supervisor Report] Rendering National Service Report');
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Supervisor Dashboard
          </button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>National Service Report</span>
        </div>
        <NationalServiceReport 
          report={reportData.report} 
          onBack={handleBack} 
          showAssignment={false}
          userRole="supervisor"
        />
      </AppLayout>
    );
  }

  // If we have report_data but it's not being detected, try to render it anyway
  if (reportData?.result?.report_data) {
    // Check if the report_data has National Service structure
    const hasNSStructure = reportData.result.report_data.dimensions && 
                          reportData.result.report_data.dimensions.workplaceReadiness !== undefined;
    
    if (hasNSStructure) {
      console.log('[Supervisor Report] Rendering National Service Report from report_data');
      return (
        <AppLayout background="/images/supervisor-bg.jpg">
          <div style={styles.breadcrumb}>
            <button onClick={handleBack} style={styles.breadcrumbButton}>
              ← Back to Supervisor Dashboard
            </button>
            <span style={styles.breadcrumbSeparator}>|</span>
            <span style={styles.breadcrumbText}>National Service Report</span>
          </div>
          <NationalServiceReport 
            report={reportData.result.report_data} 
            onBack={handleBack}
            showAssignment={false}
            userRole="supervisor"
          />
        </AppLayout>
      );
    }
  }

  // ============================================================
  // DEFAULT: Use Stratavax Report for all non-National Service assessments
  // ============================================================
  console.log('[Supervisor Report] Rendering Stratavax Report');
  
  // Prepare data for Stratavax report
  const stratavaxData = {
    result: reportData?.result || null,
    candidate: reportData?.result?.candidate_profiles || null,
    assessment: reportData?.result?.assessments || null
  };

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.breadcrumb}>
        <button onClick={handleBack} style={styles.breadcrumbButton}>
          ← Back to Supervisor Dashboard
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
