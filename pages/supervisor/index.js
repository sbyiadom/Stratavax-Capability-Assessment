// pages/supervisor/index.js

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
      
      const supervisorId = session.user.id;

      // Get candidates
      const { data: assignedCandidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .eq('supervisor_id', supervisorId);

      if (candidatesError) {
        console.error('Error fetching candidates:', candidatesError);
      }

      let allAssessments = [];
      let nsReports = [];
      let otherAssessments = [];

      if (assignedCandidates && assignedCandidates.length > 0) {
        const candidateIds = assignedCandidates.map(c => c.id);
        
        // Get assessments with assessment type info
        const { data: assessments, error: assessmentsError } = await supabase
          .from('candidate_assessments')
          .select(`
            id,
            user_id,
            assessment_id,
            status,
            result_id,
            completed_at,
            assessments!inner(
              id,
              title, 
              assessment_type:assessment_types(code, name)
            )
          `)
          .in('user_id', candidateIds);

        if (assessmentsError) {
          console.error('Error fetching assessments:', assessmentsError);
        } else {
          allAssessments = assessments || [];
        }

        // Process National Service Reports
        for (const assessment of allAssessments) {
          const isNationalService = assessment.assessments?.assessment_type?.code === 'national_service';
          const isCompleted = assessment.status === 'completed' || assessment.result_id !== null;
          
          if (isNationalService && isCompleted && assessment.result_id) {
            const { data: resultData, error: resultError } = await supabase
              .from('assessment_results')
              .select('percentage_score, workplace_readiness, intellectual_capability, recommendation, completed_at')
              .eq('id', assessment.result_id)
              .single();

            if (!resultError && resultData) {
              const candidate = assignedCandidates.find(c => c.id === assessment.user_id);
              nsReports.push({
                result_id: assessment.result_id,
                candidate_id: assessment.user_id,
                candidate_name: candidate?.full_name || 'Unknown',
                candidate_email: candidate?.email || '',
                university: candidate?.university || '',
                programme: candidate?.programme || '',
                assessment_title: assessment.assessments?.title || 'National Service Assessment',
                scores: {
                  overall: resultData?.percentage_score || 0,
                  workplace: resultData?.workplace_readiness || 0,
                  intellectual: resultData?.intellectual_capability || 0,
                  recommendation: resultData?.recommendation || 'Not Recommended'
                }
              });
            }
          } else if (isCompleted && assessment.result_id) {
            const { data: resultData, error: resultError } = await supabase
              .from('assessment_results')
              .select('percentage_score')
              .eq('id', assessment.result_id)
              .single();

            if (!resultError && resultData) {
              const candidate = assignedCandidates.find(c => c.id === assessment.user_id);
              otherAssessments.push({
                result_id: assessment.result_id,
                candidate_id: assessment.user_id,
                candidate_name: candidate?.full_name || 'Unknown',
                candidate_email: candidate?.email || '',
                assessment_title: assessment.assessments?.title || 'Assessment',
                assessment_type: assessment.assessments?.assessment_type?.name || 'General',
                score: resultData?.percentage_score || 0
              });
            }
          }
        }

        setNationalServiceReports(nsReports);
        setOtherReports(otherAssessments);

        // Build candidate list with all assessments
        const candidateList = assignedCandidates.map(c => {
          const candidateAssessments = allAssessments
            .filter(a => a.user_id === c.id)
            .map(a => {
              const isCompleted = a.status === 'completed' || a.result_id !== null;
              const isNationalService = a.assessments?.assessment_type?.code === 'national_service';
              return {
                id: a.assessment_id,
                title: a.assessments?.title || 'Assessment',
                status: a.status,
                result_id: a.result_id,
                isCompleted: isCompleted,
                isNationalService: isNationalService,
                assessment_type: a.assessments?.assessment_type?.name || 'General'
              };
            });

          // Get completed assessments with scores
          const completedWithScores = candidateAssessments
            .filter(a => a.isCompleted && a.result_id)
            .map(a => {
              const report = [...nsReports, ...otherAssessments].find(r => r.result_id === a.result_id);
              return {
                ...a,
                score: report?.score || report?.scores?.overall || 0
              };
            });

          return {
            ...c,
            assessments: candidateAssessments,
            completedAssessments: completedWithScores
          };
        });

        setCandidates(candidateList);
        
        setStats({
          totalCandidates: assignedCandidates.length,
          completedAssessments: allAssessments.filter(a => a.status === 'completed' || a.result_id !== null).length,
          pendingReviews: allAssessments.filter(a => a.status === 'in_progress' || a.status === 'unblocked').length,
          nationalServiceReports: nsReports.length
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const handleViewReport = (resultId) => {
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleViewAllReports = () => {
    router.push('/supervisor/reports');
  };

  const getStatusLabel = (status) => {
    const labels = {
      'completed': '✅ Completed',
      'in_progress': '⏳ In Progress',
      'unblocked': '🔓 Ready to Start',
      'blocked': '🔒 Blocked'
    };
    return labels[status] || '📋 Pending';
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': { bg: '#dcfce7', color: '#166534' },
      'in_progress': { bg: '#dbeafe', color: '#1e40af' },
      'unblocked': { bg: '#e8f5e9', color: '#2e7d32' },
      'blocked': { bg: '#f5f5f5', color: '#667085' }
    };
    return colors[status] || { bg: '#f5f5f5', color: '#667085' };
  };

  const getRecommendationColor = (rec) => {
    const colors = {
      'Highly Recommended': '#2e7d32',
      'Recommended': '#1565c0',
      'Reserve Pool': '#f57c00',
      'Not Recommended': '#c62828'
    };
    return colors[rec] || '#64748b';
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
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Manage your candidates and review assessment reports.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>🔄 Refresh</button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statLabel}>Total Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completedAssessments}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⏳</div>
            <div>
              <div style={styles.statLabel}>Pending Review</div>
              <div style={styles.statValue}>{stats.pendingReviews}</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, background: '#1a237e' }}>
            <div style={{ ...styles.statIcon, color: 'white' }}>📋</div>
            <div>
              <div style={{ ...styles.statLabel, color: 'rgba(255,255,255,0.8)' }}>National Service Reports</div>
              <div style={{ ...styles.statValue, color: 'white' }}>{stats.nationalServiceReports}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('national_service')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'national_service' ? '#1a237e' : 'white',
              color: activeTab === 'national_service' ? 'white' : '#1a237e',
              border: activeTab === 'national_service' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            📋 National Service ({nationalServiceReports.length})
          </button>
          <button
            onClick={() => setActiveTab('other')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'other' ? '#1a237e' : 'white',
              color: activeTab === 'other' ? 'white' : '#1a237e',
              border: activeTab === 'other' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            📊 Other Assessments ({otherReports.length})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'candidates' ? '#1a237e' : 'white',
              color: activeTab === 'candidates' ? 'white' : '#1a237e',
              border: activeTab === 'candidates' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            👥 All Candidates ({candidates.length})
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {/* National Service Reports Tab */}
          {activeTab === 'national_service' && (
            <div style={styles.tabPanel}>
              {nationalServiceReports.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No completed National Service assessments to review.</p>
                </div>
              ) : (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Candidate</th>
                        <th style={styles.th}>Workplace Readiness</th>
                        <th style={styles.th}>Intellectual Capability</th>
                        <th style={styles.th}>Overall Score</th>
                        <th style={styles.th}>Recommendation</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalServiceReports.map((report) => {
                        const recColor = getRecommendationColor(report.scores?.recommendation);
                        return (
                          <tr key={report.result_id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={styles.cellName}>{report.candidate_name}</div>
                              <div style={styles.cellSub}>{report.university} • {report.programme}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.scoreBadge}>
                                {Math.round(report.scores?.workplace || 0)}%
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.scoreBadge}>
                                {Math.round(report.scores?.intellectual || 0)}%
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.scoreBadge}>
                                {Math.round(report.scores?.overall || 0)}%
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ ...styles.recommendationBadge, color: recColor }}>
                                {report.scores?.recommendation || 'N/A'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => handleViewReport(report.result_id)}
                                style={styles.viewButton}
                              >
                                📄 View Report
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
          )}

          {/* Other Assessments Tab */}
          {activeTab === 'other' && (
            <div style={styles.tabPanel}>
              {otherReports.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No other completed assessments to review.</p>
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
                      {otherReports.map((report) => (
                        <tr key={report.result_id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.cellName}>{report.candidate_name}</div>
                            <div style={styles.cellSub}>{report.candidate_email}</div>
                          </td>
                          <td style={styles.td}>{report.assessment_title}</td>
                          <td style={styles.td}>
                            <span style={styles.scoreBadge}>{Math.round(report.score || 0)}%</span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleViewReport(report.result_id)}
                              style={styles.viewButton}
                            >
                              📄 View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* All Candidates Tab - Enhanced with all assessments */}
          {activeTab === 'candidates' && (
            <div style={styles.tabPanel}>
              {candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No candidates assigned to you yet.</p>
                </div>
              ) : (
                candidates.map((candidate) => (
                  <div key={candidate.id} style={styles.candidateCard}>
                    <div style={styles.candidateHeader}>
                      <div>
                        <div style={styles.candidateName}>{candidate.name}</div>
                        <div style={styles.candidateDetails}>
                          {candidate.university} • {candidate.programme}
                        </div>
                        <div style={styles.candidateEmail}>{candidate.email}</div>
                      </div>
                      <span style={styles.candidateBadge}>
                        {candidate.assessments?.length || 0} Assessment(s)
                      </span>
                    </div>

                    {/* Assessments Table */}
                    <div style={styles.assessmentTableContainer}>
                      <table style={styles.assessmentTable}>
                        <thead>
                          <tr>
                            <th style={styles.ath}>Assessment</th>
                            <th style={styles.ath}>Type</th>
                            <th style={styles.ath}>Status</th>
                            <th style={styles.ath}>Score</th>
                            <th style={styles.ath}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidate.assessments?.map((assessment) => {
                            const statusColor = getStatusColor(assessment.status);
                            // Find score if completed
                            let score = 0;
                            if (assessment.isCompleted && assessment.result_id) {
                              const found = [...nationalServiceReports, ...otherReports].find(r => r.result_id === assessment.result_id);
                              score = found?.score || found?.scores?.overall || 0;
                            }
                            return (
                              <tr key={assessment.id} style={styles.atr}>
                                <td style={styles.atd}>
                                  <span style={styles.assessmentTitle}>{assessment.title}</span>
                                  {assessment.isNationalService && (
                                    <span style={styles.nationalServiceBadge}>🇬🇭 NS</span>
                                  )}
                                </td>
                                <td style={styles.atd}>{assessment.assessment_type}</td>
                                <td style={styles.atd}>
                                  <span style={{ 
                                    ...styles.assessmentStatus,
                                    background: statusColor.bg,
                                    color: statusColor.color
                                  }}>
                                    {getStatusLabel(assessment.status)}
                                  </span>
                                </td>
                                <td style={styles.atd}>
                                  {assessment.isCompleted && assessment.result_id ? (
                                    <span style={styles.scoreBadge}>{Math.round(score)}%</span>
                                  ) : (
                                    <span style={styles.noScore}>—</span>
                                  )}
                                </td>
                                <td style={styles.atd}>
                                  {assessment.result_id ? (
                                    <button
                                      onClick={() => handleViewReport(assessment.result_id)}
                                      style={styles.viewButtonSmall}
                                    >
                                      📄 View Report
                                    </button>
                                  ) : (
                                    <span style={styles.noAction}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {(!candidate.assessments || candidate.assessments.length === 0) && (
                            <tr>
                              <td colSpan="5" style={styles.noAssessments}>
                                No assessments assigned yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
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
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0'
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  tr: { transition: 'background 0.2s' },
  cellName: { fontWeight: '600', color: '#1a202c' },
  cellSub: { fontSize: '12px', color: '#94a3b8' },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    background: '#e8f5e9',
    color: '#1a237e',
    display: 'inline-block'
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
  viewButtonSmall: {
    padding: '4px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  candidateCard: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '12px'
  },
  candidateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px'
  },
  candidateName: { fontSize: '16px', fontWeight: '600', color: '#1a202c' },
  candidateDetails: { fontSize: '13px', color: '#64748b' },
  candidateEmail: { fontSize: '12px', color: '#94a3b8' },
  candidateBadge: {
    padding: '4px 12px',
    background: '#e2e8f0',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#475569'
  },
  assessmentTableContainer: { overflowX: 'auto' },
  assessmentTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  ath: {
    padding: '8px 12px',
    textAlign: 'left',
    background: '#f1f5f9',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '12px'
  },
  atd: { padding: '8px 12px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  atr: { transition: 'background 0.2s' },
  assessmentTitle: { fontSize: '13px', fontWeight: '500', color: '#1a202c' },
  assessmentStatus: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' },
  nationalServiceBadge: {
    padding: '2px 8px',
    background: '#1a237e',
    color: 'white',
    borderRadius: '12px',
    fontSize: '9px',
    fontWeight: '700',
    marginLeft: '8px'
  },
  noScore: { color: '#94a3b8', fontSize: '13px' },
  noAction: { color: '#94a3b8', fontSize: '13px' },
  noAssessments: { padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }
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
