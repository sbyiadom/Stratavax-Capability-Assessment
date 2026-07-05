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
    pendingReviews: 0
  });

  useEffect(() => {
    if (!session) return;
    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get all candidates assigned to this supervisor
      const { data: assignments, error: assignmentError } = await supabase
        .from('candidate_assessments')
        .select(`
          id,
          user_id,
          assessment_id,
          status,
          result_id,
          candidate_profiles!inner(full_name, email, university, programme),
          assessments!inner(title, assessment_type:assessment_types(code))
        `)
        .eq('supervisor_id', session.user.id);

      if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError);
        setLoading(false);
        return;
      }

      // Group by candidate
      const candidateMap = {};
      const reports = [];

      assignments?.forEach(assignment => {
        const userId = assignment.user_id;
        if (!candidateMap[userId]) {
          candidateMap[userId] = {
            id: userId,
            name: assignment.candidate_profiles?.full_name || 'Unknown',
            email: assignment.candidate_profiles?.email || '',
            university: assignment.candidate_profiles?.university || '',
            programme: assignment.candidate_profiles?.programme || '',
            assessments: []
          };
        }
        
        // Check if this is a National Service assessment
        const isNationalService = assignment.assessments?.assessment_type?.code === 'national_service';
        
        candidateMap[userId].assessments.push({
          id: assignment.assessment_id,
          title: assignment.assessments?.title || 'Assessment',
          status: assignment.status,
          result_id: assignment.result_id,
          candidate_assessment_id: assignment.id,
          isNationalService: isNationalService
        });

        // Collect National Service reports
        if (isNationalService && assignment.result_id && assignment.status === 'completed') {
          reports.push({
            result_id: assignment.result_id,
            candidate_id: userId,
            candidate_name: assignment.candidate_profiles?.full_name || 'Unknown',
            candidate_email: assignment.candidate_profiles?.email || '',
            university: assignment.candidate_profiles?.university || '',
            programme: assignment.candidate_profiles?.programme || '',
            assessment_title: assignment.assessments?.title || 'National Service Assessment',
            status: assignment.status
          });
        }
      });

      setCandidates(Object.values(candidateMap));
      setNationalServiceReports(reports);
      
      // Calculate stats
      const totalCandidates = Object.keys(candidateMap).length;
      const completed = assignments?.filter(a => a.status === 'completed').length || 0;
      const pending = assignments?.filter(a => a.status === 'in_progress' || a.status === 'unblocked').length || 0;
      
      setStats({
        totalCandidates: totalCandidates,
        completedAssessments: completed,
        pendingReviews: pending
      });

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
              <div style={styles.statLabel}>Completed Assessments</div>
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
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div>
              <div style={styles.statLabel}>National Service Reports</div>
              <div style={styles.statValue}>{nationalServiceReports.length}</div>
            </div>
          </div>
        </div>

        {/* National Service Reports Section - DEDICATED BUTTON */}
        <div style={styles.reportsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>📋 National Service Reports</h2>
            {nationalServiceReports.length > 0 && (
              <button 
                onClick={handleViewAllReports}
                style={styles.viewAllButton}
              >
                View All Reports →
              </button>
            )}
          </div>

          {nationalServiceReports.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No completed National Service assessments to review.</p>
            </div>
          ) : (
            <div style={styles.reportsGrid}>
              {nationalServiceReports.slice(0, 4).map((report) => (
                <div key={report.result_id} style={styles.reportCard}>
                  <div style={styles.reportHeader}>
                    <div style={styles.reportTitle}>{report.assessment_title}</div>
                    <span style={styles.reportStatus}>✅ Completed</span>
                  </div>
                  <div style={styles.reportCandidate}>
                    <div style={styles.candidateName}>{report.candidate_name}</div>
                    <div style={styles.candidateDetails}>
                      {report.university} • {report.programme}
                    </div>
                    <div style={styles.candidateEmail}>{report.candidate_email}</div>
                  </div>
                  <button 
                    onClick={() => handleViewReport(report.result_id)}
                    style={styles.viewReportButton}
                  >
                    📄 View National Service Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidates List */}
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
                      {candidate.assessments.length} Assessment(s)
                    </span>
                  </div>

                  <div style={styles.assessmentList}>
                    {candidate.assessments.map((assessment) => (
                      <div key={assessment.id} style={styles.assessmentItem}>
                        <div style={styles.assessmentInfo}>
                          <span style={styles.assessmentTitle}>{assessment.title}</span>
                          <span style={{ 
                            ...styles.assessmentStatus,
                            background: assessment.status === 'completed' ? '#dcfce7' : 
                                       assessment.status === 'in_progress' ? '#dbeafe' : '#f5f5f5',
                            color: assessment.status === 'completed' ? '#166534' : 
                                   assessment.status === 'in_progress' ? '#1e40af' : '#667085'
                          }}>
                            {assessment.status || 'Pending'}
                          </span>
                          {assessment.isNationalService && (
                            <span style={styles.nationalServiceBadge}>🇬🇭 NS</span>
                          )}
                        </div>
                        
                        {/* National Service Report Button */}
                        {assessment.isNationalService && assessment.result_id && (
                          <button 
                            onClick={() => handleViewReport(assessment.result_id)}
                            style={styles.viewReportButtonSmall}
                          >
                            📄 View NS Report
                          </button>
                        )}
                        
                        {!assessment.isNationalService && assessment.result_id && (
                          <button 
                            onClick={() => router.push(`/supervisor/reports/${assessment.result_id}`)}
                            style={styles.viewReportButtonSmall}
                          >
                            📄 View Report
                          </button>
                        )}
                      </div>
                    ))}
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
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '10px 20px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
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
    marginBottom: '4px',
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
    marginBottom: '30px',
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
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
    color: '#1a237e',
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  reportCard: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  reportTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a237e'
  },
  reportStatus: {
    fontSize: '12px',
    color: '#2e7d32',
    background: '#dcfce7',
    padding: '2px 10px',
    borderRadius: '12px'
  },
  reportCandidate: {
    marginBottom: '12px'
  },
  candidateName: {
    fontSize: '15px',
    fontWeight: '500',
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
  viewReportButton: {
    width: '100%',
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
    padding: '24px',
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
  assessmentList: {
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
    gap: '10px'
  },
  assessmentTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  assessmentStatus: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  nationalServiceBadge: {
    padding: '2px 8px',
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
