// pages/admin/reports/[resultId].js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';
import NationalServiceReport from '../../../components/reports/NationalServiceReport';
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

        // Check if it's a National Service assessment
        const isNS = 
          data.isNationalService === true ||
          (data.result?.report_data && data.result.report_data.dimensions && 
           data.result.report_data.dimensions.workplaceReadiness !== undefined) ||
          (data.report && data.report.dimensions && 
           data.report.dimensions.workplaceReadiness !== undefined) ||
          (data.result?.workplace_readiness !== undefined && data.result?.workplace_readiness !== null);

        console.log('[Admin Report] Is National Service:', isNS);

        // ============================================================
        // BUILD THE REPORT OBJECT WITH SUB-CATEGORIES
        // ============================================================
        let report = data.report || {};

        // If we have report_data in the result, use it
        if (data.result?.report_data && !report.dimensions) {
          report = data.result.report_data;
          console.log('[Admin Report] Using report_data from result:', report);
        }

        // ============================================================
        // ADD SUB-CATEGORIES FROM API RESPONSE
        // ============================================================
        // The API now returns workplaceSubCategories and intellectualSubCategories
        // at the top level of the response
        if (data.workplaceSubCategories && data.workplaceSubCategories.length > 0) {
          report.workplaceSubCategories = data.workplaceSubCategories;
          console.log('[Admin Report] Added workplaceSubCategories:', data.workplaceSubCategories.length);
        }

        if (data.intellectualSubCategories && data.intellectualSubCategories.length > 0) {
          report.intellectualSubCategories = data.intellectualSubCategories;
          console.log('[Admin Report] Added intellectualSubCategories:', data.intellectualSubCategories.length);
        }

        // Also check if sub-categories are in the result
        if (data.result?.workplaceSubCategories && data.result.workplaceSubCategories.length > 0) {
          report.workplaceSubCategories = data.result.workplaceSubCategories;
        }

        if (data.result?.intellectualSubCategories && data.result.intellectualSubCategories.length > 0) {
          report.intellectualSubCategories = data.result.intellectualSubCategories;
        }

        // If we have categoryScores but no sub-categories, try to extract from categoryScores
        if ((!report.workplaceSubCategories || report.workplaceSubCategories.length === 0) && 
            data.categoryScores && data.categoryScores.length > 0) {
          // Split categoryScores into workplace and intellectual based on category names
          const workplaceNames = [
            'Safety & Risk Awareness', 'Safety', 'Risk Awareness',
            'Technical Fundamentals', 'Technical',
            'Communication & Teamwork', 'Communication', 'Teamwork',
            'Ownership & Integrity', 'Ownership', 'Integrity',
            'Workplace Ethics', 'Workplace Readiness'
          ];

          const intellectualNames = [
            'Problem Solving & Troubleshooting', 'Problem Solving', 'Troubleshooting',
            'Logical Reasoning', 'Logic',
            'Numerical Reasoning', 'Numerical',
            'Measurement & Engineering Units', 'Measurement', 'Engineering Units',
            'Learning Agility', 'Agility',
            'Critical Thinking', 'Analytical', 'Decision Making',
            'Intellectual Capability'
          ];

          const workplace = [];
          const intellectual = [];

          data.categoryScores.forEach(cat => {
            const name = cat.category || cat.name || '';
            const lowerName = name.toLowerCase();
            
            const isWorkplace = workplaceNames.some(n => lowerName.includes(n.toLowerCase()));
            const isIntellectual = intellectualNames.some(n => lowerName.includes(n.toLowerCase()));

            if (isWorkplace || lowerName.includes('safety') || lowerName.includes('technical')) {
              workplace.push(cat);
            } else if (isIntellectual || lowerName.includes('reasoning') || lowerName.includes('problem')) {
              intellectual.push(cat);
            } else {
              if (lowerName.includes('readiness') || lowerName.includes('ethics') || lowerName.includes('ownership')) {
                workplace.push(cat);
              } else {
                intellectual.push(cat);
              }
            }
          });

          if (workplace.length > 0) {
            report.workplaceSubCategories = workplace;
            console.log('[Admin Report] Extracted workplaceSubCategories from categoryScores:', workplace.length);
          }
          if (intellectual.length > 0) {
            report.intellectualSubCategories = intellectual;
            console.log('[Admin Report] Extracted intellectualSubCategories from categoryScores:', intellectual.length);
          }
        }

        // Also pass through raw data for the component to handle
        report.categoryScores = data.categoryScores || report.categoryScores || [];
        report.strengths = data.strengths || report.strengths || [];
        report.weaknesses = data.weaknesses || report.weaknesses || [];
        report.recommendations = data.recommendations || report.recommendations || [];
        report.executiveSummary = data.executiveSummary || report.executiveSummary || '';
        report.supervisorImplication = data.supervisorImplication || report.supervisorImplication || '';
        report.classification = data.classification || report.classification || 'Not Available';
        report.riskLevel = data.riskLevel || report.riskLevel || 'Medium';
        report.overallScore = data.overallScore || report.overallScore || 0;

        // Ensure dimensions exist for National Service reports
        if (isNS && !report.dimensions) {
          report.dimensions = {
            workplaceReadiness: data.result?.workplace_readiness || data.report?.dimensions?.workplaceReadiness || 0,
            intellectualCapability: data.result?.intellectual_capability || data.report?.dimensions?.intellectualCapability || 0,
            overallScore: data.overallScore || data.report?.dimensions?.overallScore || 0
          };
        }

        // Ensure recommendation exists
        if (isNS && !report.recommendation) {
          report.recommendation = {
            level: data.result?.recommendation || data.report?.recommendation?.level || 'Not Recommended'
          };
        }

        // Ensure candidateInfo exists
        if (!report.candidateInfo && data.result?.candidate_profiles) {
          report.candidateInfo = {
            fullName: data.result.candidate_profiles.full_name || 'Candidate',
            university: data.result.candidate_profiles.university || '',
            programme: data.result.candidate_profiles.programme || '',
            graduationYear: data.result.candidate_profiles.graduation_year || '',
            preferredDepartment: data.result.candidate_profiles.preferred_department || '',
            assessmentDate: data.result.completed_at ? new Date(data.result.completed_at).toLocaleDateString() : 'N/A'
          };
        }

        console.log('[Admin Report] Final report object:', {
          hasWorkplaceSubCategories: (report.workplaceSubCategories || []).length,
          hasIntellectualSubCategories: (report.intellectualSubCategories || []).length,
          hasDimensions: !!report.dimensions,
          hasRecommendation: !!report.recommendation
        });

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

  // Render National Service Report if detected
  if (isNationalService && reportData?.report) {
    console.log('[Admin Report] Rendering National Service Report with:', {
      workplaceSubCategories: (reportData.report.workplaceSubCategories || []).length,
      intellectualSubCategories: (reportData.report.intellectualSubCategories || []).length
    });
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

  // If we have report_data but it's not being detected, try to render it anyway
  if (reportData?.result?.report_data) {
    console.log('[Admin Report] Rendering report_data directly');
    const report = reportData.result.report_data;
    // Add sub-categories if available from the API
    if (reportData.workplaceSubCategories) {
      report.workplaceSubCategories = reportData.workplaceSubCategories;
    }
    if (reportData.intellectualSubCategories) {
      report.intellectualSubCategories = reportData.intellectualSubCategories;
    }
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.breadcrumb}>
          <button onClick={handleBack} style={styles.breadcrumbButton}>
            ← Back to Reports List
          </button>
          <span style={styles.breadcrumbSeparator}>|</span>
          <span style={styles.breadcrumbText}>National Service Report</span>
        </div>
        <NationalServiceReport report={report} onBack={handleBack} />
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
                workplaceSubCategories: (reportData.workplaceSubCategories || []).length,
                intellectualSubCategories: (reportData.intellectualSubCategories || []).length
              }, null, 2)}</pre>
            </div>
          )}
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
