// pages/supervisor/index.js - Complete updated file

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
              assessment_type:assessment_types(id, code, name)
            )
          `)
          .in('user_id', candidateIds);

        if (assessmentsError) {
          console.error('Error fetching assessments:', assessmentsError);
        } else {
          allAssessments = assessments || [];
        }

        // Process ALL completed assessments with results
        for (const assessment of allAssessments) {
          const isCompleted = assessment.status === 'completed' || assessment.result_id !== null;
          
          if (isCompleted && assessment.result_id) {
            const { data: resultData, error: resultError } = await supabase
              .from('assessment_results')
              .select('percentage_score, workplace_readiness, intellectual_capability, recommendation, completed_at')
              .eq('id', assessment.result_id)
              .single();

            if (!resultError && resultData) {
              const candidate = assignedCandidates.find(c => c.id === assessment.user_id);
              const isNationalService = assessment.assessments?.assessment_type?.code === 'national_service';
              
              const reportData = {
                result_id: assessment.result_id,
                candidate_id: assessment.user_id,
                candidate_name: candidate?.full_name || 'Unknown',
                candidate_email: candidate?.email || '',
                university: candidate?.university || '',
                programme: candidate?.programme || '',
                assessment_title: assessment.assessments?.title || 'Assessment',
                assessment_id: assessment.assessment_id,
                assessment_type: assessment.assessments?.assessment_type?.name || 'General',
                assessment_code: assessment.assessments?.assessment_type?.code || 'general',
                status: assessment.status,
                completed_at: assessment.completed_at || resultData?.completed_at,
                score: resultData?.percentage_score || 0,
                is_national_service: isNationalService
              };

              if (isNationalService) {
                reportData.scores = {
                  overall: resultData?.percentage_score || 0,
                  workplace: resultData?.workplace_readiness || 0,
                  intellectual: resultData?.intellectual_capability || 0,
                  recommendation: resultData?.recommendation || 'Not Recommended'
                };
                nsReports.push(reportData);
              } else {
                otherAssessments.push(reportData);
              }
            }
          }
        }

        setNationalServiceReports(nsReports);
        setOtherReports(otherAssessments);

        // Build candidate list with assessment stats and dropdown options
        const candidateList = assignedCandidates.map(c => {
          const candidateAssessments = allAssessments.filter(a => a.user_id === c.id);
          
          // Count assessment statuses
          const completed = candidateAssessments.filter(a => a.status === 'completed' || a.result_id !== null).length;
          const inProgress = candidateAssessments.filter(a => a.status === 'in_progress').length;
          const unblocked = candidateAssessments.filter(a => a.status === 'unblocked').length;
          const blocked = candidateAssessments.filter(a => a.status === 'blocked').length;
          const notStarted = candidateAssessments.filter(a => a.status === 'pending' || !a.status).length;
          
          // Build dropdown options for completed assessments
          const completedAssessments = candidateAssessments
            .filter(a => a.status === 'completed' || a.result_id !== null)
            .map(a => {
              const isNationalService = a.assessments?.assessment_type?.code === 'national_service';
              let score = 0;
              let reportData = null;
              let resultId = a.result_id;
              
              // Find the result data
              if (a.result_id) {
                const found = [...nsReports, ...otherAssessments].find(r => r.result_id === a.result_id);
                if (found) {
                  score = found.score || found.scores?.overall || 0;
                  reportData = found;
                  resultId = found.result_id;
                }
              }
              
              return {
                assessment_id: a.assessment_id,
                result_id: resultId,  // ← THIS IS THE IMPORTANT PART
                title: a.assessments?.title || 'Assessment',
                score: score,
                isNationalService: isNationalService,
                assessment_code: a.assessments?.assessment_type?.code || 'general',
                assessment_type: a.assessments?.assessment_type?.name || 'General',
                reportData: reportData
              };
            })
            .filter(a => a.result_id); // Only keep assessments with result_id

          return {
            ...c,
            assessments: candidateAssessments,
            stats: {
              completed: completed,
              inProgress: inProgress,
              unblocked: unblocked,
              blocked: blocked,
              notStarted: notStarted,
              total: candidateAssessments.length
            },
            completedAssessments: completedAssessments
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
    if (!resultId) {
      alert('No result available for this assessment.');
      return;
    }
    console.log('[Supervisor] Navigating to report with resultId:', resultId);
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleViewAllReports = () => {
    router.push('/supervisor/reports');
  };

  const handleAssessmentSelect = (candidateId, assessmentId) => {
    console.log('[Supervisor] Candidate ID:', candidateId);
    console.log('[Supervisor] Selected Assessment ID:', assessmentId);
    
    if (!assessmentId) {
      alert('Please select an assessment first.');
      return;
    }
    
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      console.warn('[Supervisor] Candidate not found');
      return;
    }
    
    console.log('[Supervisor] Candidate found:', candidate.full_name || candidate.name);
    console.log('[Supervisor] Completed assessments:', candidate.completedAssessments);
    
    const assessment = candidate.completedAssessments.find(
      a => String(a.assessment_id) === String(assessmentId)
    );
    
    if (!assessment) {
      console.warn('[Supervisor] Assessment not found in completed list');
      alert('Assessment not found. Please try again.');
      return;
    }
    
    console.log('[Supervisor] Assessment found:', assessment);
    console.log('[Supervisor] Result ID:', assessment.result_id);
    console.log('[Supervisor] Score:', assessment.score);
    
    if (assessment && assessment.result_id) {
      handleViewReport(assessment.result_id);
    } else {
      console.warn('[Supervisor] No result_id for this assessment');
      alert('This assessment does not have a result available yet.');
    }
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
              <div style={styles.tabDescription}>
                <p>📋 All National Service assessment reports for candidates under your supervision.</p>
              </div>
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
                                📄 View NS Report
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
              <div style={styles.tabDescription}>
                <p>📊 All other completed assessments for candidates under your supervision.</p>
              </div>
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

          {/* All Candidates Tab - Fixed with proper result_id */}
          {activeTab === 'candidates' && (
            <div style={styles.tabPanel}>
              <div style={styles.tabDescription}>
                <p>👥 All candidates with assessment status and ability to view individual reports.</p>
              </div>

              {candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No candidates assigned to you yet.</p>
                </div>
              ) : (
                <div style={styles.candidatesTableContainer}>
                  <table style={styles.candidatesTable}>
                    <thead>
                      <tr>
                        <th style={styles.cth}>Candidate</th>
                        <th style={styles.cth}>Completed</th>
                        <th style={styles.cth}>In Progress</th>
                        <th style={styles.cth}>Ready to Start</th>
                        <th style={styles.cth}>Blocked</th>
                        <th style={styles.cth}>Not Started</th>
                        <th style={styles.cth}>Select Assessment</th>
                        <th style={styles.cth}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate) => (
                        <tr key={candidate.id} style={styles.ctr}>
                          <td style={styles.ctd}>
                            <div style={styles.candidateNameCell}>{candidate.full_name || candidate.name}</div>
                            <div style={styles.candidateEmailCell}>{candidate.email}</div>
                            <div style={styles.candidateUniversityCell}>{candidate.university} • {candidate.programme}</div>
                          </td>
                          <td style={styles.ctd}>
                            <span style={styles.statBadgeCompleted}>{candidate.stats.completed}</span>
                          </td>
                          <td style={styles.ctd}>
                            <span style={styles.statBadgeProgress}>{candidate.stats.inProgress}</span>
                          </td>
                          <td style={styles.ctd}>
                            <span style={styles.statBadgeUnblocked}>{candidate.stats.unblocked}</span>
                          </td>
                          <td style={styles.ctd}>
                            <span style={styles.statBadgeBlocked}>{candidate.stats.blocked}</span>
                          </td>
                          <td style={styles.ctd}>
                            <span style={styles.statBadgeNotStarted}>{candidate.stats.notStarted}</span>
                          </td>
                          <td style={styles.ctd}>
                            <select
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                console.log('[Supervisor] Dropdown selected:', selectedValue);
                                if (selectedValue) {
                                  handleAssessmentSelect(candidate.id, selectedValue);
                                }
                              }}
                              style={styles.assessmentDropdown}
                              defaultValue=""
                            >
                              <option value="">-- Select --</option>
                              {candidate.completedAssessments.map((assessment) => (
                                <option key={assessment.assessment_id} value={assessment.assessment_id}>
                                  {assessment.title} ({Math.round(assessment.score || 0)}%)
                                </option>
                              ))}
                              {candidate.completedAssessments.length === 0 && (
                                <option value="" disabled>No completed assessments</option>
                              )}
                            </select>
                          </td>
                          <td style={styles.ctd}>
                            <button
                              onClick={() => {
                                const select = document.querySelector(`select[data-candidate="${candidate.id}"]`);
                                if (select && select.value) {
                                  handleAssessmentSelect(candidate.id, select.value);
                                } else {
                                  alert('Please select an assessment first.');
                                }
                              }}
                              style={styles.viewReportButtonSmall}
                              disabled={candidate.completedAssessments.length === 0}
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
  // Candidates Table Styles
  candidatesTableContainer: { overflowX: 'auto' },
  candidatesTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  cth: {
    padding: '10px 12px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  ctd: { padding: '10px 12px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  ctr: { transition: 'background 0.2s' },
  candidateNameCell: { fontWeight: '600', color: '#1a202c' },
  candidateEmailCell: { fontSize: '11px', color: '#94a3b8' },
  candidateUniversityCell: { fontSize: '11px', color: '#64748b' },
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
  assessmentDropdown: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    minWidth: '140px',
    maxWidth: '200px'
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
    transition: 'background 0.2s',
    whiteSpace: 'nowrap'
  },
  emptyState: { textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }
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
