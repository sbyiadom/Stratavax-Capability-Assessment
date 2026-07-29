// pages/supervisor/index.js - DIRECT SUPABASE QUERY VERSION

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
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completedAssessments: 0
  });

  useEffect(() => {
    if (!session) return;
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const supervisorId = session.user.id;
      console.log('[Dashboard] Supervisor ID:', supervisorId);

      // ============================================================
      // DIRECT QUERY: Get candidates assigned to this supervisor
      // ============================================================
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme, supervisor_id')
        .eq('supervisor_id', supervisorId);

      if (candidatesError) {
        console.error('[Dashboard] Candidates error:', candidatesError);
        setErrorMessage(candidatesError.message);
        setLoading(false);
        return;
      }

      console.log('[Dashboard] Candidates found:', candidatesData?.length || 0);

      if (!candidatesData || candidatesData.length === 0) {
        setCandidates([]);
        setStats({ totalCandidates: 0, completedAssessments: 0 });
        setLoading(false);
        return;
      }

      // Get candidate IDs
      const candidateIds = candidatesData.map(c => c.id);

      // ============================================================
      // Get candidate assessments
      // ============================================================
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('candidate_assessments')
        .select('*')
        .in('user_id', candidateIds);

      if (assessmentsError) {
        console.error('[Dashboard] Assessments error:', assessmentsError);
      }

      console.log('[Dashboard] Assessments found:', assessmentsData?.length || 0);

      // ============================================================
      // Build candidate objects
      // ============================================================
      const candidatesWithStats = candidatesData.map(c => {
        const candidateAssessments = assessmentsData ? assessmentsData.filter(a => a.user_id === c.id) : [];
        const completed = candidateAssessments.filter(a => a.status === 'completed' || a.result_id !== null).length;
        const inProgress = candidateAssessments.filter(a => a.status === 'in_progress').length;
        const notStarted = candidateAssessments.filter(a => !a.status || a.status === 'pending' || a.status === '').length;

        const completedAssessments = candidateAssessments
          .filter(a => a.status === 'completed' || a.result_id !== null)
          .map(a => ({
            assessment_id: a.assessment_id,
            result_id: a.result_id,
            title: 'Assessment',
            score: 0
          }));

        return {
          ...c,
          stats: { completed, inProgress, notStarted, total: candidateAssessments.length },
          completedAssessments
        };
      });

      setCandidates(candidatesWithStats);
      setStats({
        totalCandidates: candidatesData.length,
        completedAssessments: assessmentsData ? assessmentsData.filter(a => a.status === 'completed' || a.result_id !== null).length : 0
      });
      setLoading(false);

    } catch (error) {
      console.error('[Dashboard] Error:', error);
      setErrorMessage(error.message || 'Failed to load data');
      setLoading(false);
    }
  };

  const handleViewReport = (resultId) => {
    if (!resultId) {
      alert('No result available for this assessment.');
      return;
    }
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleBack = () => {
    router.push('/supervisor');
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Manage your candidates and review assessment reports.</p>
          </div>
          <button onClick={fetchData} style={styles.refreshButton}>Refresh</button>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statLabel}>Total Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✓</div>
            <div>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completedAssessments}</div>
            </div>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Completed</th>
                <th style={styles.th}>In Progress</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.emptyState}>
                    No candidates assigned to you yet.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{candidate.full_name || 'Unknown'}</div>
                      <div style={styles.cellSub}>{candidate.email || ''}</div>
                      <div style={styles.cellSub}>{candidate.university || ''} • {candidate.programme || ''}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statBadgeCompleted}>{candidate.stats?.completed || 0}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statBadgeProgress}>{candidate.stats?.inProgress || 0}</span>
                    </td>
                    <td style={styles.td}>
                      {candidate.completedAssessments && candidate.completedAssessments.length > 0 ? (
                        <button
                          onClick={() => handleViewReport(candidate.completedAssessments[0]?.result_id)}
                          style={styles.viewButton}
                        >
                          View Report
                        </button>
                      ) : (
                        <span style={styles.pendingText}>No results</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
    background: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#0a1929', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  refreshButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  statIcon: { fontSize: '28px' },
  statLabel: { fontSize: '12px', color: '#718096', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' },
  statValue: { fontSize: '24px', fontWeight: '800', color: '#0a1929' },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflow: 'auto',
    border: '1px solid #eef2f7'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  tr: { transition: 'background 0.2s' },
  cellName: { fontWeight: '600', color: '#1a202c' },
  cellSub: { fontSize: '12px', color: '#94a3b8' },
  statBadgeCompleted: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#dcfce7',
    color: '#166534'
  },
  statBadgeProgress: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#dbeafe',
    color: '#1e40af'
  },
  viewButton: {
    padding: '6px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  pendingText: { color: '#94a3b8', fontSize: '13px' },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px'
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
