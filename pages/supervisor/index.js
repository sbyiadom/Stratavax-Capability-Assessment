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
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [nationalServiceReports, setNationalServiceReports] = useState([]);
  const [otherReports, setOtherReports] = useState([]);
  const [candidateAssessments, setCandidateAssessments] = useState([]);
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
        
        // Get assessments
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

        // Build candidate list
        const candidateList = assignedCandidates.map(c => ({
          ...c,
          assessments: allAssessments
            .filter(a => a.user_id === c.id)
            .map(a => {
              const isCompleted = a.status === 'completed' || a.result_id !== null;
              const isNationalService = a.assessments?.assessment_type?.code === 'national_service';
              // Find score if completed
              let score = 0;
              if (isCompleted && a.result_id) {
                const found = [...nsReports, ...otherAssessments].find(r => r.result_id === a.result_id);
                score = found?.score || found?.scores?.overall || 0;
              }
              return {
                id: a.assessment_id,
                title: a.assessments?.title || 'Assessment',
                status: a.status,
                result_id: a.result_id,
                isCompleted: isCompleted,
                isNationalService: isNationalService,
                assessment_type: a.assessments?.assessment_type?.name || 'General',
                assessment_code: a.assessments?.assessment_type?.code || 'general',
                score: score,
                completed_at: a.completed_at
              };
            })
        }));

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

  const handleCandidateSelect = (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId);
    setSelectedCandidate(candidate);
    setSelectedAssessment(null);
    // Set the candidate's assessments
    setCandidateAssessments(candidate?.assessments || []);
  };

  const handleAssessmentSelect = (assessmentId) => {
    const assessment = candidateAssessments.find(a => a.id === assessmentId);
    setSelectedAssessment(assessment);
    if (assessment?.result_id) {
      handleViewReport(assessment.result_id);
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

          {/* All Candidates Tab - Select Candidate First */}
          {activeTab === 'candidates' && (
            <div style={styles.tabPanel}>
              {candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No candidates assigned to you yet.</p>
                </div>
              ) : (
                <div style={styles.candidateSelector}>
                  {/* Candidate Selection */}
                  <div style={styles.selectorSection}>
                    <h3 style={styles.selectorTitle}>1. Select Candidate</h3>
                    <div style={styles.candidateList}>
                      {candidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() => handleCandidateSelect(candidate.id)}
                          style={{
                            ...styles.candidateSelectButton,
                            background: selectedCandidate?.id === candidate.id ? '#1a237e' : 'white',
                            color: selectedCandidate?.id === candidate.id ? 'white' : '#1a202c',
                            border: selectedCandidate?.id === candidate.id ? 'none' : '1px solid #e2e8f0'
                          }}
                        >
                          <div style={styles.candidateSelectName}>{candidate.name}</div>
                          <div style={styles.candidateSelectEmail}>{candidate.email}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assessment Selection (shown when candidate is selected) */}
                  {selectedCandidate && (
                    <div style={styles.selectorSection}>
                      <h3 style={styles.selectorTitle}>2. Select Assessment to View</h3>
                      {candidateAssessments.length === 0 ? (
                        <div style={styles.emptyState}>No assessments assigned to this candidate.</div>
                      ) : (
                        <div style={styles.assessmentList}>
                          {candidateAssessments.map((assessment) => {
                            const statusColor = getStatusColor(assessment.status);
                            return (
                              <button
                                key={assessment.id}
                                onClick={() => handleAssessmentSelect(assessment.id)}
                                style={{
                                  ...styles.assessmentSelectButton,
                                  background: selectedAssessment?.id === assessment.id ? '#e8f5e9' : 'white',
                                  border: selectedAssessment?.id === assessment.id ? '2px solid #1a237e' : '1px solid #e2e8f0'
                                }}
                                disabled={!assessment.isCompleted || !assessment.result_id}
                              >
                                <div style={styles.assessmentSelectInfo}>
                                  <span style={styles.assessmentSelectTitle}>
                                    {assessment.title}
                                    {assessment.isNationalService && (
                                      <span style={styles.nationalServiceBadge}>🇬🇭 NS</span>
                                    )}
                                  </span>
                                  <span style={{ 
                                    ...styles.assessmentSelectStatus,
                                    background: statusColor.bg,
                                    color: statusColor.color
                                  }}>
                                    {getStatusLabel(assessment.status)}
                                  </span>
                                  {assessment.isCompleted && assessment.result_id && (
                                    <span style={styles.assessmentSelectScore}>
                                      Score: {Math.round(assessment.score)}%
                                    </span>
                                  )}
                                </div>
                                {assessment.isCompleted && assessment.result_id ? (
                                  <span style={styles.assessmentSelectAction}>📄 View Report →</span>
                                ) : (
                                  <span style={styles.assessmentSelectDisabled}>Not Completed</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Candidate Info */}
                  {selectedCandidate && (
                    <div style={styles.selectedInfo}>
                      <div style={styles.selectedInfoHeader}>
                        <span style={styles.selectedInfoIcon}>👤</span>
                        <div>
                          <div style={styles.selectedInfoName}>{selectedCandidate.name}</div>
                          <div style={styles.selectedInfoDetails}>
                            {selectedCandidate.university} • {selectedCandidate.programme}
                          </div>
                          <div style={styles.selectedInfoEmail}>{selectedCandidate.email}</div>
                        </div>
                      </div>
                    </div>
                  )}
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
  candidateSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  selectorSection: {
    background: '#f8fafc',
    padding: '16px 20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  selectorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a237e',
    margin: '0 0 12px 0'
  },
  candidateList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  candidateSelectButton: {
    padding: '10px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    fontFamily: 'inherit'
  },
  candidateSelectName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'inherit'
  },
  candidateSelectEmail: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  assessmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  assessmentSelectButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    width: '100%'
  },
  assessmentSelectInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  assessmentSelectTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  assessmentSelectStatus: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500'
  },
  assessmentSelectScore: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1a237e'
  },
  assessmentSelectAction: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1a237e'
  },
  assessmentSelectDisabled: {
    fontSize: '13px',
    color: '#94a3b8'
  },
  selectedInfo: {
    background: '#e8f5e9',
    padding: '16px 20px',
    borderRadius: '8px',
    border: '1px solid #4caf50'
  },
  selectedInfoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  selectedInfoIcon: {
    fontSize: '32px'
  },
  selectedInfoName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c'
  },
  selectedInfoDetails: {
    fontSize: '13px',
    color: '#64748b'
  },
  selectedInfoEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  nationalServiceBadge: {
    padding: '2px 8px',
    background: '#1a237e',
    color: 'white',
    borderRadius: '12px',
    fontSize: '9px',
    fontWeight: '700',
    marginLeft: '8px'
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
