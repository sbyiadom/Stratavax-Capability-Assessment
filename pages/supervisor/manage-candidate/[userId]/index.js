// pages/supervisor/manage-candidate/[userId]/index.js - CORRECTED
// Candidate Report List - Shows all reports for a candidate

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../../components/AppLayout'; // Fixed: 4 levels up to root, then components
import { supabase } from '../../../../supabase/client'; // Fixed: 4 levels up to root, then supabase

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean);
  }
  return [];
}

function calculateScoreFromCategories(categoryScores) {
  let totalEarned = 0;
  let totalMax = 0;
  let validPercentages = [];

  const categories = normalizeArray(categoryScores);

  categories.forEach(cat => {
    let score = safeNumber(cat.score || cat.earned || 0);
    let maxScore = safeNumber(cat.maxScore || cat.max || 0);
    let pct = safeNumber(cat.percentage || 0);

    if (maxScore > 0 && score >= 0) {
      totalEarned += score;
      totalMax += maxScore;
    }

    if (pct > 0 && pct <= 100) {
      validPercentages.push(pct);
    }
  });

  if (totalMax > 0) {
    return Math.min(100, Math.max(0, Math.round((totalEarned / totalMax) * 100)));
  }

  if (validPercentages.length > 0) {
    return Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length);
  }

  return 0;
}

function calculateScore(result) {
  let categoryScores = [];

  if (result.category_scores) {
    categoryScores = result.category_scores;
  } else if (result.report_data) {
    try {
      let reportData = result.report_data;
      if (typeof reportData === 'string') {
        reportData = JSON.parse(reportData);
      }
      if (reportData.categoryScores) {
        categoryScores = reportData.categoryScores;
      } else if (reportData.category_scores) {
        categoryScores = reportData.category_scores;
      }
    } catch (e) {}
  }

  if (categoryScores && Object.keys(categoryScores).length > 0) {
    return calculateScoreFromCategories(categoryScores);
  }

  if (result.percentage_score) {
    const val = safeNumber(result.percentage_score);
    if (val > 0 && val <= 100) return val;
  }

  if (result.total_score !== undefined && result.max_score !== undefined) {
    const total = safeNumber(result.total_score);
    const max = safeNumber(result.max_score);
    if (max > 0) {
      const calc = Math.round((total / max) * 100);
      if (calc >= 0 && calc <= 100) return calc;
    }
  }

  return 0;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

function getStatus(report) {
  if (report.completed_at) {
    return 'Completed';
  }
  return report.status || 'Pending';
}

function getStatusColor(status) {
  switch(status) {
    case 'Completed': return '#48bb78';
    case 'Pending': return '#ed8936';
    case 'In Progress': return '#4299e1';
    case 'Failed': return '#fc8181';
    default: return '#a0aec0';
  }
}

function getScoreColor(score) {
  if (score >= 80) return '#48bb78';
  if (score >= 60) return '#ed8936';
  return '#fc8181';
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CandidateReports() {
  const router = useRouter();
  const { userId } = router.query;

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);

  useEffect(() => {
    if (!router.isReady || !userId) return;
    loadData();
  }, [router.isReady, userId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Get supervisor profile
      const { data: profile, error: profileError } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        setError('Unable to verify your account.');
        setLoading(false);
        return;
      }

      setCurrentSupervisor(profile);

      // Get candidate details using userId
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (candidateError || !candidateData) {
        setError('Candidate not found.');
        setLoading(false);
        return;
      }

      // Check permission
      const isAdmin = profile?.role === 'admin';
      const isTheirCandidate = candidateData.supervisor_id === session.user.id;

      if (!isAdmin && !isTheirCandidate) {
        setError('You do not have permission to view this candidate.');
        setLoading(false);
        return;
      }

      setCandidate(candidateData);

      // Get ALL assessment results for this candidate using user_id
      const { data: results, error: resultsError } = await supabase
        .from('assessment_results')
        .select(`
          *,
          assessments:assessment_id (
            id,
            title,
            description
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (resultsError) {
        setError('Failed to load assessment results.');
        setLoading(false);
        return;
      }

      // Process reports
      const processedReports = (results || []).map(result => {
        const assessment = result.assessments || {};
        const displayScore = calculateScore(result);
        const status = getStatus(result);
        const isCompleted = !!result.completed_at;

        return {
          id: result.id,
          assessment_id: result.assessment_id,
          assessment_title: assessment?.title || 'Untitled Assessment',
          score: displayScore,
          status: status,
          isCompleted: isCompleted,
          completed_at: result.completed_at,
          created_at: result.created_at,
          total_score: result.total_score,
          max_score: result.max_score,
          percentage_score: result.percentage_score,
          category_scores: result.category_scores,
          report_data: result.report_data,
          raw_result: result
        };
      });

      setReports(processedReports);

    } catch (error) {
      console.error('Error loading candidate reports:', error);
      setError(error.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenReport = (reportId) => {
    if (!reportId) {
      setError('The selected report has no ID.');
      return;
    }
    // Navigate to the report detail page with return path
    router.push({
      pathname: `/supervisor/reports/${reportId}`,
      query: { returnTo: `/supervisor/manage-candidate/${userId}` }
    });
  };

  const handleBack = () => {
    router.push('/supervisor/manage-candidate');
  };

  const handleRetry = () => {
    loadData();
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2>Error Loading Reports</h2>
          <p style={styles.errorMessage}>{error}</p>
          <div style={styles.errorButtonGroup}>
            <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
            <button onClick={handleRetry} style={styles.retryButton}>Retry</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>👤</div>
          <h2>Candidate Not Found</h2>
          <p style={styles.errorMessage}>The candidate you are looking for does not exist.</p>
          <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={handleBack} style={styles.backButton}>
            ← Back to Candidates
          </button>
          <button onClick={handleRetry} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>

        {/* Candidate Info */}
        <div style={styles.candidateCard}>
          <div style={styles.candidateHeader}>
            <div style={styles.candidateAvatar}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div style={styles.candidateInfo}>
              <h1 style={styles.candidateName}>{candidate.full_name || 'Unknown'}</h1>
              <p style={styles.candidateEmail}>{candidate.email || 'No email'}</p>
              <div style={styles.candidateDetails}>
                <span style={styles.detailTag}>🏫 {candidate.university || 'Not Specified'}</span>
                <span style={styles.detailTag}>📚 {candidate.programme || 'Not Specified'}</span>
                <span style={styles.detailTag}>📅 {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div style={styles.reportsSection}>
          <h2 style={styles.sectionTitle}>Assessment Reports ({reports.length})</h2>

          {reports.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <p>No assessments found for this candidate.</p>
            </div>
          ) : (
            <div style={styles.reportGrid}>
              {reports.map((report) => (
                <div
                  key={report.id}
                  style={styles.reportCard}
                  onClick={() => handleOpenReport(report.id)}
                >
                  <div style={styles.reportHeader}>
                    <h3 style={styles.reportTitle}>{report.assessment_title}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      background: getStatusColor(report.status)
                    }}>
                      {report.status}
                    </span>
                  </div>
                  <div style={styles.reportBody}>
                    <div style={styles.reportScore}>
                      {report.isCompleted && report.score > 0 ? (
                        <span style={{
                          ...styles.scoreBadge,
                          background: getScoreColor(report.score)
                        }}>
                          {report.score}%
                        </span>
                      ) : (
                        <span style={styles.noScoreBadge}>—</span>
                      )}
                    </div>
                    <div style={styles.reportMeta}>
                      <span>📅 {formatDate(report.completed_at)}</span>
                    </div>
                  </div>
                  <div style={styles.reportFooter}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReport(report.id);
                      }}
                      style={styles.viewButton}
                    >
                      View Report Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
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
  errorIcon: { fontSize: '48px', marginBottom: '16px' },
  errorMessage: { color: '#dc2626', marginBottom: '20px' },
  errorButtonGroup: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' },
  errorButton: { padding: '10px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  retryButton: { padding: '10px 24px', background: '#e2e8f0', color: '#1a202c', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569'
  },
  refreshButton: {
    padding: '8px 16px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569'
  },
  candidateCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  candidateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  candidateAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#2563EB',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: '22px', fontWeight: 'bold', color: '#0A1929', margin: '0 0 4px 0' },
  candidateEmail: { fontSize: '14px', color: '#718096', margin: '0 0 8px 0' },
  candidateDetails: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  detailTag: {
    fontSize: '13px',
    color: '#4A5568',
    background: '#f7fafc',
    padding: '4px 12px',
    borderRadius: '16px'
  },
  reportsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#0A1929', margin: '0 0 16px 0' },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  reportCard: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  reportTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0A1929',
    margin: 0,
    flex: 1,
    marginRight: '12px'
  },
  reportBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  reportScore: {
    display: 'flex',
    alignItems: 'center'
  },
  reportMeta: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  reportFooter: {
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    whiteSpace: 'nowrap'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    color: 'white'
  },
  noScoreBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#94a3b8',
    background: '#f1f5f9'
  },
  viewButton: {
    padding: '6px 16px',
    background: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    width: '100%'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#94a3b8'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  }
};
