// pages/supervisor/reports/[resultId].js - COMPLETE WITH BEHAVIORAL MATRIX

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
  const [behavioralMatrix, setBehavioralMatrix] = useState(null);
  const [showBehavioral, setShowBehavioral] = useState(false);

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

        // ============================================================
        // Fetch Behavioral Matrix
        // ============================================================
        await fetchBehavioralMatrix(resultId);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReport();
  }, [resultId, session]);

  // ============================================================
  // Fetch Behavioral Matrix
  // ============================================================
  const fetchBehavioralMatrix = async (id) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) return;

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setBehavioralMatrix(data.behavioralMatrix);
        console.log('[Behavioral Matrix] Data loaded:', data.behavioralMatrix);
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    }
  };

  const handleBack = () => {
    router.push('/supervisor');
  };

  const toggleBehavioral = () => {
    setShowBehavioral(!showBehavioral);
  };

  // ============================================================
  // Format time helper
  // ============================================================
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
          <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
            {showBehavioral ? 'Hide' : 'Show'} Behavioral Matrix
          </button>
        </div>
        <NationalServiceReport 
          report={reportData.report} 
          onBack={handleBack} 
          showAssignment={false}
          userRole="supervisor"
        />
        
        {showBehavioral && behavioralMatrix && (
          <div style={styles.behavioralSection}>
            <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
            
            <div style={styles.behavioralStats}>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Total Time</span>
                <span style={styles.behavioralValue}>
                  {formatTime(behavioralMatrix.timing?.totalTimeSeconds)}
                </span>
              </div>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Avg Time per Question</span>
                <span style={styles.behavioralValue}>
                  {behavioralMatrix.timing?.averageTimePerQuestion || 0}s
                </span>
              </div>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Answer Changes</span>
                <span style={styles.behavioralValue}>
                  {behavioralMatrix.behavior?.answerChanges || 0}
                </span>
              </div>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Tab Switches</span>
                <span style={styles.behavioralValue}>
                  {behavioralMatrix.behavior?.tabSwitches || 0}
                </span>
              </div>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Violations</span>
                <span style={styles.behavioralValue}>
                  {behavioralMatrix.behavior?.violations || 0}
                </span>
              </div>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
                <span style={styles.behavioralValue}>
                  {(behavioralMatrix.behavior?.copyAttempts || 0) + (behavioralMatrix.behavior?.pasteAttempts || 0)}
                </span>
              </div>
              <div style={styles.behavioralStat}>
                <span style={styles.behavioralLabel}>Risk Level</span>
                <span style={{
                  ...styles.riskBadge,
                  background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                             behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                  color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                         behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
                }}>
                  {behavioralMatrix.riskAssessment?.level || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div style={styles.riskSummary}>
              <p>{behavioralMatrix.riskAssessment?.summary || 'No behavioral data available.'}</p>
            </div>
            
            {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
              <div style={styles.flaggedQuestions}>
                <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                <ul style={styles.flaggedList}>
                  {behavioralMatrix.flaggedQuestions.map((q, index) => (
                    <li key={index} style={styles.flaggedItem}>
                      Question {q.question_id}: {q.time_seconds}s, 
                      {q.changed ? ' Changed ✓' : ''} 
                      {q.violation ? ' Violation ⚠' : ''}
                      {!q.changed && !q.violation && ' No concerns'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
            <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
              {showBehavioral ? 'Hide' : 'Show'} Behavioral Matrix
            </button>
          </div>
          <NationalServiceReport 
            report={reportData.result.report_data} 
            onBack={handleBack}
            showAssignment={false}
            userRole="supervisor"
          />
          
          {showBehavioral && behavioralMatrix && (
            <div style={styles.behavioralSection}>
              <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
              
              <div style={styles.behavioralStats}>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Total Time</span>
                  <span style={styles.behavioralValue}>
                    {formatTime(behavioralMatrix.timing?.totalTimeSeconds)}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Avg Time per Question</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.timing?.averageTimePerQuestion || 0}s
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Answer Changes</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.answerChanges || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Tab Switches</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.tabSwitches || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Violations</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.violations || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
                  <span style={styles.behavioralValue}>
                    {(behavioralMatrix.behavior?.copyAttempts || 0) + (behavioralMatrix.behavior?.pasteAttempts || 0)}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Risk Level</span>
                  <span style={{
                    ...styles.riskBadge,
                    background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                               behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                    color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                           behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
                  }}>
                    {behavioralMatrix.riskAssessment?.level || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div style={styles.riskSummary}>
                <p>{behavioralMatrix.riskAssessment?.summary || 'No behavioral data available.'}</p>
              </div>
              
              {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                <div style={styles.flaggedQuestions}>
                  <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                  <ul style={styles.flaggedList}>
                    {behavioralMatrix.flaggedQuestions.map((q, index) => (
                      <li key={index} style={styles.flaggedItem}>
                        Question {q.question_id}: {q.time_seconds}s, 
                        {q.changed ? ' Changed ✓' : ''} 
                        {q.violation ? ' Violation ⚠' : ''}
                        {!q.changed && !q.violation && ' No concerns'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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
        <button onClick={toggleBehavioral} style={styles.behavioralToggle}>
          {showBehavioral ? 'Hide' : 'Show'} Behavioral Data
        </button>
      </div>
      <StratavaxReport 
        result={stratavaxData.result}
        candidate={stratavaxData.candidate}
        assessment={stratavaxData.assessment}
        onBack={handleBack}
      />
      
      {showBehavioral && behavioralMatrix && (
        <div style={styles.behavioralSection}>
          <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
          
          <div style={styles.behavioralStats}>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Total Time</span>
              <span style={styles.behavioralValue}>
                {formatTime(behavioralMatrix.timing?.totalTimeSeconds)}
              </span>
            </div>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Avg Time per Question</span>
              <span style={styles.behavioralValue}>
                {behavioralMatrix.timing?.averageTimePerQuestion || 0}s
              </span>
            </div>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Answer Changes</span>
              <span style={styles.behavioralValue}>
                {behavioralMatrix.behavior?.answerChanges || 0}
              </span>
            </div>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Tab Switches</span>
              <span style={styles.behavioralValue}>
                {behavioralMatrix.behavior?.tabSwitches || 0}
              </span>
            </div>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Violations</span>
              <span style={styles.behavioralValue}>
                {behavioralMatrix.behavior?.violations || 0}
              </span>
            </div>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
              <span style={styles.behavioralValue}>
                {(behavioralMatrix.behavior?.copyAttempts || 0) + (behavioralMatrix.behavior?.pasteAttempts || 0)}
              </span>
            </div>
            <div style={styles.behavioralStat}>
              <span style={styles.behavioralLabel}>Risk Level</span>
              <span style={{
                ...styles.riskBadge,
                background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                           behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                       behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
              }}>
                {behavioralMatrix.riskAssessment?.level || 'Unknown'}
              </span>
            </div>
          </div>
          
          <div style={styles.riskSummary}>
            <p>{behavioralMatrix.riskAssessment?.summary || 'No behavioral data available.'}</p>
          </div>
          
          {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
            <div style={styles.flaggedQuestions}>
              <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
              <ul style={styles.flaggedList}>
                {behavioralMatrix.flaggedQuestions.map((q, index) => (
                  <li key={index} style={styles.flaggedItem}>
                    Question {q.question_id}: {q.time_seconds}s, 
                    {q.changed ? ' Changed ✓' : ''} 
                    {q.violation ? ' Violation ⚠' : ''}
                    {!q.changed && !q.violation && ' No concerns'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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
  behavioralToggle: {
    padding: '6px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    marginLeft: 'auto'
  },
  behavioralSection: {
    maxWidth: '1200px',
    margin: '24px auto',
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  behavioralTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 16px 0',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0'
  },
  behavioralStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  behavioralStat: {
    background: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  behavioralLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px'
  },
  behavioralValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929'
  },
  riskBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  riskSummary: {
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#475569'
  },
  flaggedQuestions: {
    marginTop: '12px'
  },
  flaggedTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px'
  },
  flaggedList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  flaggedItem: {
    padding: '6px 12px',
    background: '#f8fafc',
    borderRadius: '4px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
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
