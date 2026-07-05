// pages/supervisor/reports/[resultId].js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
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

        // Verify this supervisor has access to this candidate
        const { data: access, error: accessError } = await supabase
          .from('candidate_assessments')
          .select('id')
          .eq('result_id', resultId)
          .eq('supervisor_id', session.user.id)
          .maybeSingle();

        if (accessError) {
          console.error('Access check error:', accessError);
        }

        // If admin, allow access. If supervisor, check access.
        if (userRole !== 'admin' && !access) {
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
        
        // Check if it's a National Service assessment
        // Check multiple sources for National Service detection
        const isNS = 
          data.isNationalService === true ||
          (data.result?.report_data && data.result.report_data.dimensions && 
           data.result.report_data.dimensions.workplaceReadiness !== undefined) ||
          (data.report && data.report.dimensions && 
           data.report.dimensions.workplaceReadiness !== undefined) ||
          (data.result?.workplace_readiness !== undefined && data.result?.workplace_readiness !== null);

        console.log('[Supervisor Report] Is National Service:', isNS);

        // If we have report_data in the result, use it directly
        let report = data.report;
        if (!report && data.result?.report_data) {
          report = data.result.report_data;
          console.log('[Supervisor Report] Using report_data from result');
        }

        setReportData({
          ...data,
          report: report
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
  // Render National Service Report for Supervisor
  // ============================================================
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
        {/* Pass showAssignment={false} to hide assignment features for supervisors */}
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
    console.log('[Supervisor Report] Rendering report_data directly');
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

  // Fallback for non-National Service reports
  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.fallbackContainer}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Supervisor Dashboard
        </button>
        <div style={styles.fallbackContent}>
          <h2>Standard Report</h2>
          <p>This assessment uses the standard report format.</p>
          {reportData?.result && (
            <div style={styles.debugInfo}>
              <h4>Debug Info:</h4>
              <pre>{JSON.stringify({
                hasReportData: !!reportData.result.report_data,
                hasWorkplaceReadiness: reportData.result.workplace_readiness,
                hasIntellectualCapability: reportData.result.intellectual_capability,
                recommendation: reportData.result.recommendation,
                isNationalService: isNationalService
              }, null, 2)}</pre>
            </div>
          )}
          <div style={styles.scoreDisplay}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreLabel}>Overall Score</span>
              <span style={styles.scoreValue}>{reportData?.result?.percentage_score || 0}%</span>
            </div>
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
    overflow: 'auto'
  },
  scoreDisplay: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '16px'
  },
  scoreItem: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    textAlign: 'center'
  },
  scoreLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '4px'
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a237e'
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
