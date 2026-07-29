// pages/supervisor/index.js - CORRECTED VERSION

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';

export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    fetchCandidates();
  }, [session]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);

      const supervisorId = session.user.id;
      const supervisorEmail = session.user.email;

      console.log('[Supervisor Dashboard] Supervisor ID:', supervisorId);

      // ============================================================
      // Step 1: Get all candidates assigned to this supervisor
      // ============================================================
      let assignedCandidates = [];

      const { data: candidatesByField, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id, assigned_supervisor_id, supervisor_email')
        .or(`supervisor_id.eq.${supervisorId},assigned_supervisor_id.eq.${supervisorId},supervisor_email.eq.${supervisorEmail}`);

      if (!candidatesError && candidatesByField && candidatesByField.length > 0) {
        assignedCandidates = candidatesByField;
        console.log('[Supervisor Dashboard] Found candidates:', assignedCandidates.length);
      }

      if (assignedCandidates.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      const candidateIds = assignedCandidates.map(c => c.id);

      // ============================================================
      // Step 2: Get ALL assessment results for these candidates
      // This is the key fix - using assessment_results directly
      // ============================================================
      const { data: results, error: resultsError } = await supabase
        .from('assessment_results')
        .select(`
          id,
          user_id,
          assessment_id,
          completed_at,
          is_auto_submitted,
          is_valid,
          percentage_score,
          assessments:assessment_id (
            id,
            title,
            assessment_type_id,
            assessment_types:assessment_type_id (
              id,
              code,
              name
            )
          )
        `)
        .in('user_id', candidateIds)
        .order('completed_at', { ascending: false });

      if (resultsError) {
        console.error('[Supervisor Dashboard] Results query error:', resultsError);
        setError(resultsError.message);
        setLoading(false);
        return;
      }

      console.log('[Supervisor Dashboard] Results found:', results?.length || 0);

      // ============================================================
      // Step 3: Build candidate data with all assessments
      // ============================================================
      const candidateData = assignedCandidates.map(candidate => {
        // Get all results for this candidate
        const candidateResults = results.filter(r => r.user_id === candidate.id);
        
        // Count completed assessments (has completed_at)
        const completed = candidateResults.filter(r => r.completed_at !== null && r.is_valid !== false).length;
        
        // Count auto-submitted
        const autoSubmitted = candidateResults.filter(r => r.is_auto_submitted === true).length;
        
        // Count in progress (has started but not completed)
        const inProgress = candidateResults.filter(r => r.completed_at === null && r.id).length;

        // Get the latest assessment with score
        const latestResult = candidateResults.find(r => r.completed_at !== null);
        const latestAssessment = latestResult?.assessments || {};
        const latestScore = latestResult?.percentage_score || 0;
        const assessmentTitle = latestAssessment?.title || '-- Select --';

        return {
          ...candidate,
          completedCount: completed,
          inProgressCount: inProgress,
          autoSubmittedCount: autoSubmitted,
          totalAssessments: candidateResults.length,
          latestAssessmentTitle: assessmentTitle,
          latestScore: latestScore,
          latestResultId: latestResult?.id || null,
          hasResults: candidateResults.length > 0
        };
      });

      setCandidates(candidateData);
      setLoading(false);

    } catch (error) {
      console.error('[Supervisor Dashboard] Error:', error);
      setError(error.message || 'Failed to fetch candidates');
      setLoading(false);
    }
  };

  const handleViewReport = (resultId) => {
    if (resultId) {
      router.push(`/supervisor/reports/${resultId}`);
    }
  };

  const handleBack = () => {
    router.push('/supervisor');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading candidates...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>

        <div style={styles.header}>
          <h1 style={styles.title}>My Candidates</h1>
          <p style={styles.subtitle}>All candidates assigned to you with their assessment status.</p>
          
          {error && (
            <div style={styles.errorBox}>
              <strong>Error:</strong> {error}
              <button onClick={fetchCandidates} style={styles.retryButton}>Retry</button>
            </div>
          )}

          <div style={styles.debugInfo}>
            Debug: Total Candidates: {candidates.length} | Total Assessments: {candidates.reduce((sum, c) => sum + c.totalAssessments, 0)}
          </div>
        </div>

        {candidates.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No candidates assigned to you.</p>
            <p style={styles.emptySubtext}>When candidates are assigned to you, they will appear here.</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Completed</th>
                  <th style={styles.th}>In Progress</th>
                  <th style={styles.th}>Select Assessment</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.candidateName}>
                        {candidate.full_name || 'Unknown'}
                      </div>
                      <div style={styles.candidateEmail}>
                        {candidate.email || ''}
                      </div>
                      <div style={styles.candidateDetails}>
                        {candidate.university || ''} • {candidate.programme || ''}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.completedBadge}>
                        {candidate.completedCount || 0}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.inProgressBadge}>
                        {candidate.inProgressCount || 0}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {candidate.latestResultId ? (
                        <span style={styles.assessmentSelect}>
                          {candidate.latestAssessmentTitle} ({Math.round(candidate.latestScore)}%)
                        </span>
                      ) : (
                        <span style={styles.noAssessment}>-- Select --</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {candidate.latestResultId ? (
                        <button
                          onClick={() => handleViewReport(candidate.latestResultId)}
                          style={styles.viewButton}
                        >
                          View Report
                        </button>
                      ) : (
                        <span style={styles.noReport}>No report</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  container: {
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
  header: {
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 16px 0'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#991b1b'
  },
  retryButton: {
    padding: '4px 12px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  debugInfo: {
    padding: '8px 12px',
    background: '#f8f9fa',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '12px',
    border: '1px solid #e2e8f0'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'auto',
    border: '1px solid #e2e8f0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#1a202c',
    verticalAlign: 'middle'
  },
  tr: {
    transition: 'background 0.2s'
  },
  candidateName: {
    fontWeight: '600',
    color: '#1a202c'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  candidateDetails: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  completedBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  inProgressBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  assessmentSelect: {
    fontSize: '13px',
    color: '#1a202c'
  },
  noAssessment: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  viewButton: {
    padding: '6px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  noReport: {
    color: '#94a3b8',
    fontSize: '13px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '8px'
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
