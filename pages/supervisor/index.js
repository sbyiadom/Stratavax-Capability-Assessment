// pages/supervisor/index.js - PROFESSIONAL VERSION (No Emojis)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';

export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national_service');
  const [candidates, setCandidates] = useState([]);
  const [nationalServiceReports, setNationalServiceReports] = useState([]);
  const [otherReports, setOtherReports] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completedAssessments: 0,
    pendingReviews: 0,
    nationalServiceReports: 0
  });

  useEffect(() => {
    if (!session) return;
    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setDebugInfo(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message || 'Unable to read active session.');
      }

      const token = sessionData?.session?.access_token || session?.access_token;

      if (!token) {
        throw new Error('No active access token found. Please log out and log in again.');
      }

      const response = await fetch('/api/supervisor/dashboard', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Failed to load supervisor dashboard.');
      }

      const candidateRows = Array.isArray(payload.candidates) ? payload.candidates : [];
      const nsRows = Array.isArray(payload.nationalServiceReports) ? payload.nationalServiceReports : [];
      const otherRows = Array.isArray(payload.otherReports) ? payload.otherReports : [];
      const dashboardStats = payload.stats || {};

      setCandidates(candidateRows);
      setNationalServiceReports(nsRows);
      setOtherReports(otherRows);
      setStats({
        totalCandidates: Number(dashboardStats.totalCandidates || 0),
        completedAssessments: Number(dashboardStats.completedAssessments || 0),
        pendingReviews: Number(dashboardStats.pendingReviews || 0),
        nationalServiceReports: Number(dashboardStats.nationalServiceReports || 0)
      });
      setDebugInfo(payload.debug || null);

      const initialSelected = {};
      candidateRows.forEach((candidate) => {
        const completedAssessments = Array.isArray(candidate.completedAssessments)
          ? candidate.completedAssessments
          : [];
        const nonNationalService = completedAssessments.filter((assessment) => !assessment.isNationalService);
        if (nonNationalService.length > 0) {
          initialSelected[candidate.id] = nonNationalService[0].assessment_id;
        } else if (completedAssessments.length > 0) {
          initialSelected[candidate.id] = completedAssessments[0].assessment_id;
        }
      });
      setSelectedAssessments(initialSelected);
    } catch (error) {
      console.error('[Supervisor Dashboard] Load error:', error);
      setCandidates([]);
      setNationalServiceReports([]);
      setOtherReports([]);
      setStats({
        totalCandidates: 0,
        completedAssessments: 0,
        pendingReviews: 0,
        nationalServiceReports: 0
      });
      setErrorMessage(error?.message || 'Unable to load dashboard data.');
    } finally {
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

  const handleAssessmentSelect = (candidateId, assessmentId) => {
    if (!assessmentId) {
      alert('Please select an assessment first.');
      return;
    }

    const candidate = candidates.find((item) => String(item.id) === String(candidateId));
    if (!candidate) {
      alert('Candidate not found. Please refresh and try again.');
      return;
    }

    const completedAssessments = Array.isArray(candidate.completedAssessments)
      ? candidate.completedAssessments
      : [];

    const assessment = completedAssessments.find(
      (item) => String(item.assessment_id) === String(assessmentId)
    );

    if (!assessment) {
      alert('Assessment not found. Please try again.');
      return;
    }

    if (assessment.result_id) {
      handleViewReport(assessment.result_id);
    } else {
      alert('This assessment does not have a result available yet.');
    }
  };

  const handleAssessmentChange = (candidateId, assessmentId) => {
    setSelectedAssessments((previous) => ({
      ...previous,
      [candidateId]: assessmentId
    }));
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'Highly Recommended': '#2e7d32',
      Recommended: '#1565c0',
      Conditional: '#f57c00',
      'Reserve Pool': '#f57c00',
      'Not Recommended': '#c62828',
      'Not Available': '#64748b'
    };
    return colors[recommendation] || '#64748b';
  };

  const getScoreColor = (score) => {
    const value = Number(score || 0);
    if (value >= 70) return '#dcfce7';
    if (value >= 50) return '#fef3c7';
    return '#fee2e2';
  };

  const getScoreTextColor = (score) => {
    const value = Number(score || 0);
    if (value >= 70) return '#166534';
    if (value >= 50) return '#92400e';
    return '#991b1b';
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading dashboard...</p>
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

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Manage your candidates and review assessment reports.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>Refresh</button>
          </div>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            <strong>Dashboard loading issue:</strong> {errorMessage}
          </div>
        )}

        <div style={styles.statsGrid}>
          <StatCard icon="👥" label="Total Candidates" value={stats.totalCandidates} />
          <StatCard icon="✓" label="Completed" value={stats.completedAssessments} />
          <StatCard icon="◉" label="Pending Review" value={stats.pendingReviews} />
          <div style={{ ...styles.statCard, background: '#1a237e' }}>
            <div style={{ ...styles.statIcon, color: 'white' }}>●</div>
            <div>
              <div style={{ ...styles.statLabel, color: 'rgba(255,255,255,0.8)' }}>National Service Reports</div>
              <div style={{ ...styles.statValue, color: 'white' }}>{stats.nationalServiceReports}</div>
            </div>
          </div>
        </div>

        {debugInfo && (
          <div style={styles.debugBox}>
            <span>Debug:</span>{' '}
            Candidates loaded: {debugInfo.assignedCandidates || 0} | Assessments: {debugInfo.candidateAssessments || 0} | Results: {debugInfo.resultRows || 0}
          </div>
        )}

        <div style={styles.tabsContainer}>
          <TabButton
            active={activeTab === 'national_service'}
            onClick={() => setActiveTab('national_service')}
            label={`National Service (${nationalServiceReports.length})`}
          />
          <TabButton
            active={activeTab === 'other'}
            onClick={() => setActiveTab('other')}
            label={`Other Assessments (${otherReports.length})`}
          />
          <TabButton
            active={activeTab === 'candidates'}
            onClick={() => setActiveTab('candidates')}
            label={`All Candidates (${candidates.length})`}
          />
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'national_service' && (
            <NationalServiceTab
              reports={nationalServiceReports}
              getScoreColor={getScoreColor}
              getScoreTextColor={getScoreTextColor}
              getRecommendationColor={getRecommendationColor}
              onViewReport={handleViewReport}
            />
          )}

          {activeTab === 'other' && (
            <OtherAssessmentsTab
              reports={otherReports}
              onViewReport={handleViewReport}
            />
          )}

          {activeTab === 'candidates' && (
            <CandidatesTab
              candidates={candidates}
              selectedAssessments={selectedAssessments}
              onAssessmentChange={handleAssessmentChange}
              onAssessmentSelect={handleAssessmentSelect}
            />
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

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabButton,
        background: active ? '#1a237e' : 'white',
        color: active ? 'white' : '#1a237e',
        border: active ? 'none' : '1px solid #e2e8f0'
      }}
    >
      {label}
    </button>
  );
}

function NationalServiceTab({ reports, getScoreColor, getScoreTextColor, getRecommendationColor, onViewReport }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All National Service assessment reports assigned to this supervisor.</p>
      </div>
      {reports.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No National Service assessments found.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Workplace Readiness</th>
                <th style={styles.th}>Intellectual Capability</th>
                <th style={styles.th}>Overall Score</th>
                <th style={styles.th}>Recommendation</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const workplaceScore = Number(report.workplace_readiness || 0);
                const intellectualScore = Number(report.intellectual_capability || 0);
                const overallScore = Number(report.percentage_score || report.score || 0);
                const recommendation = report.recommendation || 'Not Available';
                const status = report.status || 'unknown';
                const isCompleted = status === 'completed' || report.result_id !== null;
                const hasScores = workplaceScore > 0 || intellectualScore > 0 || overallScore > 0;

                return (
                  <tr key={report.result_id || report.candidate_id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{report.candidate_name}</div>
                      <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: isCompleted ? '#dcfce7' : '#fef3c7',
                        color: isCompleted ? '#166534' : '#92400e'
                      }}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(workplaceScore), color: getScoreTextColor(workplaceScore) }}>
                        {hasScores ? Math.round(workplaceScore) + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(intellectualScore), color: getScoreTextColor(intellectualScore) }}>
                        {hasScores ? Math.round(intellectualScore) + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(overallScore), color: getScoreTextColor(overallScore) }}>
                        {hasScores ? Math.round(overallScore) + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.recommendationBadge, color: getRecommendationColor(recommendation) }}>
                        {hasScores ? recommendation : 'Pending'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {isCompleted && report.result_id ? (
                        <button onClick={() => onViewReport(report.result_id)} style={styles.viewButton}>View Report</button>
                      ) : (
                        <span style={styles.pendingText}>Awaiting completion</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OtherAssessmentsTab({ reports, onViewReport }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All other completed assessments for candidates under your supervision.</p>
      </div>
      {reports.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No other assessments found.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Assessment</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.result_id || `${report.candidate_id}-${report.assessment_id}`} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.cellName}>{report.candidate_name}</div>
                    <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                  </td>
                  <td style={styles.td}>{report.assessment_title}</td>
                  <td style={styles.td}>
                    <span style={styles.scoreBadge}>{Math.round(Number(report.score || 0))}%</span>
                  </td>
                  <td style={styles.td}>
                    {report.result_id ? (
                      <button onClick={() => onViewReport(report.result_id)} style={styles.viewButton}>View Report</button>
                    ) : (
                      <span style={styles.pendingText}>No result</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CandidatesTab({ candidates, selectedAssessments, onAssessmentChange, onAssessmentSelect }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All candidates with assessment status and ability to view individual reports.</p>
      </div>
      {candidates.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No candidates assigned to you yet.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Completed</th>
                <th style={styles.th}>In Progress</th>
                <th style={styles.th}>Ready to Start</th>
                <th style={styles.th}>Blocked</th>
                <th style={styles.th}>Not Started</th>
                <th style={styles.th}>Select Assessment</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const completedAssessments = Array.isArray(candidate.completedAssessments)
                  ? candidate.completedAssessments
                  : [];
                const stats = candidate.stats || {};
                const selectedId = selectedAssessments[candidate.id] ||
                  (completedAssessments.length > 0 ? completedAssessments[0].assessment_id : '');

                return (
                  <tr key={candidate.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{candidate.full_name || candidate.name || 'Unnamed Candidate'}</div>
                      <div style={styles.cellSub}>{candidate.email || ''}</div>
                      <div style={styles.cellSub}>{candidate.university || ''} • {candidate.programme || ''}</div>
                    </td>
                    <td style={styles.td}><span style={styles.statBadgeCompleted}>{stats.completed || 0}</span></td>
                    <td style={styles.td}><span style={styles.statBadgeProgress}>{stats.inProgress || 0}</span></td>
                    <td style={styles.td}><span style={styles.statBadgeUnblocked}>{stats.unblocked || 0}</span></td>
                    <td style={styles.td}><span style={styles.statBadgeBlocked}>{stats.blocked || 0}</span></td>
                    <td style={styles.td}><span style={styles.statBadgeNotStarted}>{stats.notStarted || 0}</span></td>
                    <td style={styles.td}>
                      <select
                        onChange={(event) => onAssessmentChange(candidate.id, event.target.value)}
                        style={styles.assessmentDropdown}
                        value={selectedId}
                      >
                        <option value="">-- Select --</option>
                        {completedAssessments.map((assessment) => (
                          <option key={`${candidate.id}-${assessment.assessment_id}`} value={assessment.assessment_id}>
                            {assessment.title} ({Math.round(Number(assessment.score || 0))}%)
                          </option>
                        ))}
                        {completedAssessments.length === 0 && (
                          <option value="" disabled>No completed assessments</option>
                        )}
                      </select>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => onAssessmentSelect(candidate.id, selectedId)}
                        style={styles.viewReportButtonSmall}
                        disabled={completedAssessments.length === 0}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
    maxWidth: '1400px',
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
  headerActions: { display: 'flex', gap: '10px' },
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
  debugBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#475569',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '16px',
    fontSize: '12px'
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
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  tabButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    background: 'white',
    border: '1px solid #e2e8f0'
  },
  tabContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7',
    minHeight: '300px'
  },
  tabPanel: { width: '100%' },
  tabDescription: {
    marginBottom: '16px',
    padding: '8px 12px',
    background: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#475569'
  },
  tableContainer: { overflowX: 'auto' },
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
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
    background: '#f1f5f9'
  },
  recommendationBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
    background: 'white',
    border: '1px solid #e2e8f0'
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
  viewReportButtonSmall: {
    padding: '4px 12px',
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
  assessmentDropdown: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    minWidth: '140px',
    maxWidth: '220px'
  },
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
  statBadgeUnblocked: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#e8f5e9',
    color: '#2e7d32'
  },
  statBadgeBlocked: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#f5f5f5',
    color: '#667085'
  },
  statBadgeNotStarted: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#fef3c7',
    color: '#92400e'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px'
  }
};
