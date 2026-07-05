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
  const [candidates, setCandidates] = useState([]);
  const [nationalServiceReports, setNationalServiceReports] = useState([]);
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

      // Get all candidates assigned to this supervisor
      const { data: assignedCandidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .eq('supervisor_id', supervisorId);

      if (candidatesError) {
        console.error('Error fetching candidates:', candidatesError);
      }

      let allAssessments = [];
      let reports = [];

      if (assignedCandidates && assignedCandidates.length > 0) {
        const candidateIds = assignedCandidates.map(c => c.id);
        
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
              title, 
              assessment_type:assessment_types(code)
            )
          `)
          .in('user_id', candidateIds);

        if (assessmentsError) {
          console.error('Error fetching assessments:', assessmentsError);
        } else {
          allAssessments = assessments || [];
        }

        // Fetch scores for completed National Service assessments
        const reportsWithScores = await Promise.all(
          allAssessments
            .filter(a => {
              const isNationalService = a.assessments?.assessment_type?.code === 'national_service';
              const isCompleted = a.status === 'completed' || a.result_id !== null;
              return isNationalService && isCompleted && a.result_id;
            })
            .map(async (assessment) => {
              const { data: resultData, error: resultError } = await supabase
                .from('assessment_results')
                .select('percentage_score, workplace_readiness, intellectual_capability, recommendation, completed_at')
                .eq('id', assessment.result_id)
                .single();

              if (resultError) {
                console.error('Error fetching result:', resultError);
                return null;
              }

              const candidate = assignedCandidates.find(c => c.id === assessment.user_id);
              
              return {
                result_id: assessment.result_id,
                candidate_id: assessment.user_id,
                candidate_name: candidate?.full_name || 'Unknown',
                candidate_email: candidate?.email || '',
                university: candidate?.university || '',
                programme: candidate?.programme || '',
                assessment_title: assessment.assessments?.title || 'National Service Assessment',
                status: 'completed',
                completed_at: assessment.completed_at || resultData?.completed_at,
                scores: {
                  overall: resultData?.percentage_score || 0,
                  workplace: resultData?.workplace_readiness || 0,
                  intellectual: resultData?.intellectual_capability || 0,
                  recommendation: resultData?.recommendation || 'Not Recommended'
                }
              };
            })
        );

        const validReports = reportsWithScores.filter(r => r !== null);
        setNationalServiceReports(validReports);

        // Build candidate map
        const candidateMap = {};
        
        assignedCandidates.forEach(c => {
          candidateMap[c.id] = {
            id: c.id,
            name: c.full_name || 'Unknown',
            email: c.email || '',
            university: c.university || '',
            programme: c.programme || '',
            assessments: []
          };
        });

        allAssessments.forEach(assessment => {
          const userId = assessment.user_id;
          if (candidateMap[userId]) {
            const isNationalService = assessment.assessments?.assessment_type?.code === 'national_service';
            const isCompleted = assessment.status === 'completed' || assessment.result_id !== null;
            
            candidateMap[userId].assessments.push({
              id: assessment.assessment_id,
              title: assessment.assessments?.title || 'Assessment',
              status: isCompleted ? 'completed' : assessment.status,
              result_id: assessment.result_id,
              completed_at: assessment.completed_at,
              candidate_assessment_id: assessment.id,
              isNationalService: isNationalService,
              isCompleted: isCompleted
            });
          }
        });

        setCandidates(Object.values(candidateMap));
        
        const totalCandidates = assignedCandidates.length;
        const completed = allAssessments.filter(a => a.status === 'completed' || a.result_id !== null).length || 0;
        const pending = allAssessments.filter(a => a.status === 'in_progress' || a.status === 'unblocked').length || 0;
        
        setStats({
          totalCandidates: totalCandidates,
          completedAssessments: completed,
          pendingReviews: pending,
          nationalServiceReports: validReports.length
        });
      } else {
        setCandidates([]);
        setNationalServiceReports([]);
        setStats({
          totalCandidates: 0,
          completedAssessments: 0,
          pendingReviews: 0,
          nationalServiceReports: 0
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return { bg: '#dcfce7', color: '#166534', label: 'Completed' };
      case 'in_progress': return { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' };
      case 'unblocked': return { bg: '#e8f5e9', color: '#2e7d32', label: 'Ready to Start' };
      case 'blocked': return { bg: '#f5f5f5', color: '#667085', label: 'Blocked' };
      default: return { bg: '#f5f5f5', color: '#667085', label: 'Pending' };
    }
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'Highly Recommended': return '#2e7d32';
      case 'Recommended': return '#1565c0';
      case 'Reserve Pool': return '#f57c00';
      case 'Not Recommended': return '#c62828';
      default: return '#64748b';
    }
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
            <button onClick={handleViewAllReports} style={styles.reportsButton}>📋 View All Reports</button>
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

        {/* National Service Reports - Admin Style Cards */}
        <div style={styles.reportsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>📋 National Service Reports</h2>
            {nationalServiceReports.length > 0 && (
              <button onClick={handleViewAllReports} style={styles.viewAllButton}>
                View All Reports →
              </button>
            )}
          </div>

          {nationalServiceReports.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No completed National Service assessments to review.</p>
              <p style={styles.emptySubtext}>When candidates complete their National Service assessment, their reports will appear here.</p>
            </div>
          ) : (
            <div style={styles.reportsGrid}>
              {nationalServiceReports.map((report) => {
                const recColor = getRecommendationColor(report.scores?.recommendation);
                return (
                  <div key={report.result_id} style={styles.reportCard}>
                    <div style={styles.reportHeader}>
                      <div>
                        <div style={styles.reportTitle}>{report.assessment_title}</div>
                        <div style={styles.reportCandidateName}>{report.candidate_name}</div>
                        <div style={styles.reportCandidateDetails}>
                          {report.university} • {report.programme} • {report.candidate_email}
                        </div>
                      </div>
                      <span style={styles.reportStatus}>✅ Completed</span>
                    </div>

                    {/* Admin-Style Score Row */}
                    <div style={styles.scoreRow}>
                      <div style={styles.scoreItem}>
                        <div style={styles.scoreLabel}>Workplace Readiness</div>
                        <div style={styles.scoreValue}>{Math.round(report.scores?.workplace || 0)}%</div>
                      </div>
                      <div style={styles.scoreDivider} />
                      <div style={styles.scoreItem}>
                        <div style={styles.scoreLabel}>Intellectual Capability</div>
                        <div style={styles.scoreValue}>{Math.round(report.scores?.intellectual || 0)}%</div>
                      </div>
                      <div style={styles.scoreDivider} />
                      <div style={styles.scoreItem}>
                        <div style={styles.scoreLabel}>Overall Score</div>
                        <div style={styles.scoreValue}>{Math.round(report.scores?.overall || 0)}%</div>
                      </div>
                      <div style={styles.scoreDivider} />
                      <div style={styles.scoreItem}>
                        <div style={styles.scoreLabel}>Recommendation</div>
                        <div style={{ ...styles.scoreValue, fontSize: '16px', color: recColor }}>
                          {report.scores?.recommendation || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div style={styles.reportActions}>
                      <button onClick={() => handleViewReport(report.result_id)} style={styles.viewReportButton}>
                        📄 View Full Report
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Candidates - Admin Style */}
        <div style={styles.candidatesSection}>
          <h2 style={styles.sectionTitle}>👥 All Candidates</h2>
          <div style={styles.candidatesGrid}>
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

                  <div style={styles.assessmentGrid}>
                    {candidate.assessments?.map((assessment) => {
                      const statusStyle = getStatusColor(assessment.status);
                      return (
                        <div key={assessment.id} style={styles.assessmentItem}>
                          <div style={styles.assessmentInfo}>
                            <span style={styles.assessmentTitle}>{assessment.title}</span>
                            <span style={{ 
                              ...styles.assessmentStatus,
                              background: statusStyle.bg,
                              color: statusStyle.color
                            }}>
                              {statusStyle.label}
                            </span>
                            {assessment.isNationalService && (
                              <span style={styles.nationalServiceBadge}>🇬🇭 NS</span>
                            )}
                          </div>
                          {assessment.isNationalService && assessment.result_id && (
                            <button 
                              onClick={() => handleViewReport(assessment.result_id)}
                              style={styles.viewReportButtonSmall}
                            >
                              📄 View NS Report
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {(!candidate.assessments || candidate.assessments.length === 0) && (
                      <div style={styles.noAssessments}>No assessments assigned yet.</div>
                    )}
                  </div>
                </div>
              ))
            )}
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
    padding: '20px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
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
  reportsButton: {
    padding: '8px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
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
  statIcon: {
    fontSize: '28px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0a1929'
  },
  reportsSection: {
    marginBottom: '24px',
    background: 'white',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0a1929',
    margin: 0
  },
  viewAllButton: {
    padding: '8px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  reportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '16px'
  },
  reportCard: {
    background: '#f8fafc',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  reportTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a237e'
  },
  reportCandidateName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1a202c',
    marginTop: '4px'
  },
  reportCandidateDetails: {
    fontSize: '12px',
    color: '#64748b'
  },
  reportStatus: {
    fontSize: '12px',
    color: '#2e7d32',
    background: '#dcfce7',
    padding: '2px 10px',
    borderRadius: '12px'
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap'
  },
  scoreItem: {
    flex: 1,
    minWidth: '70px',
    textAlign: 'center'
  },
  scoreLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  scoreValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a237e',
    marginTop: '2px'
  },
  scoreDivider: {
    width: '1px',
    height: '28px',
    background: '#e2e8f0'
  },
  reportActions: {
    display: 'flex',
    gap: '10px'
  },
  viewReportButton: {
    flex: 1,
    padding: '10px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  candidatesSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  candidatesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  candidateCard: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  candidateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  candidateName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c'
  },
  candidateDetails: {
    fontSize: '13px',
    color: '#64748b'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  candidateBadge: {
    padding: '4px 12px',
    background: '#e2e8f0',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#475569'
  },
  assessmentGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  assessmentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'white',
    borderRadius: '8px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  assessmentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  assessmentTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  assessmentStatus: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  nationalServiceBadge: {
    padding: '2px 10px',
    background: '#1a237e',
    color: 'white',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '700'
  },
  viewReportButtonSmall: {
    padding: '6px 16px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  },
  noAssessments: {
    padding: '8px 14px',
    color: '#94a3b8',
    fontSize: '13px',
    fontStyle: 'italic'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px'
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
