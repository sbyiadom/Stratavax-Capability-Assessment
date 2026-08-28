// pages/supervisor/reports/other.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

export default function OtherAssessmentReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    averageScore: 0,
    completedAssessments: 0,
    pendingReview: 0,
    failed: 0
  });
  const [currentSupervisor, setCurrentSupervisor] = useState(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  async function checkAuthAndLoadData() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Get supervisor profile
      const { data: profile } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentSupervisor(profile);
      }

      await loadOtherAssessmentReports(session.user.id);
    } catch (error) {
      console.error('Error loading reports:', error);
      setLoading(false);
    }
  }

  async function loadOtherAssessmentReports(supervisorId) {
    try {
      setLoading(true);

      // 1. Get all candidates under this supervisor
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .eq('supervisor_id', supervisorId);

      if (candidatesError) throw candidatesError;

      if (!candidates || candidates.length === 0) {
        setReports([]);
        setStats({
          totalAssessments: 0,
          averageScore: 0,
          completedAssessments: 0,
          pendingReview: 0,
          failed: 0
        });
        setLoading(false);
        return;
      }

      const candidateIds = candidates.map(c => c.id);

      // 2. Get assessments for these candidates with their results
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessment_results')
        .select(`
          id,
          candidate_id,
          assessment_id,
          score,
          status,
          created_at,
          completed_at,
          assessments:assessment_id (
            id,
            title,
            type,
            description
          )
        `)
        .in('candidate_id', candidateIds)
        .order('created_at', { ascending: false });

      if (assessmentsError) throw assessmentsError;

      // 3. Process the data - filter out National Service assessments (or filter based on type)
      const reportData = [];
      let totalScore = 0;
      let scoreCount = 0;
      let completed = 0;
      let pending = 0;
      let failed = 0;

      if (assessments && assessments.length > 0) {
        assessments.forEach(assessment => {
          // Find candidate info
          const candidate = candidates.find(c => c.id === assessment.candidate_id);
          
          // Exclude National Service type assessments (or include only 'other' types)
          const assessmentType = assessment.assessments?.type || '';
          
          // Skip national service assessments - adjust filter based on your assessment types
          if (assessmentType === 'national_service' || assessmentType === 'ns' || assessmentType === 'National Service') {
            return; // Skip this assessment
          }
          
          reportData.push({
            id: assessment.id,
            candidate: candidate?.full_name || 'Unknown',
            candidate_id: assessment.candidate_id,
            university: candidate?.university || 'Not Specified',
            program: candidate?.programme || 'Not Specified',
            score: assessment.score || 0,
            status: assessment.status || 'Pending',
            date: assessment.completed_at ? new Date(assessment.completed_at).toISOString().split('T')[0] : 
                   assessment.created_at ? new Date(assessment.created_at).toISOString().split('T')[0] : 'N/A',
            assessment_id: assessment.assessment_id,
            assessment_title: assessment.assessments?.title || 'Untitled',
            assessment_type: assessmentType || 'Other'
          });

          // Calculate stats
          if (assessment.score) {
            totalScore += assessment.score;
            scoreCount++;
          }

          if (assessment.status === 'Completed') completed++;
          else if (assessment.status === 'Pending' || assessment.status === 'In Progress') pending++;
          else if (assessment.status === 'Failed') failed++;
        });
      }

      // If no assessments found, show message
      if (reportData.length === 0) {
        setReports([]);
        setStats({
          totalAssessments: 0,
          averageScore: 0,
          completedAssessments: 0,
          pendingReview: 0,
          failed: 0
        });
        setLoading(false);
        return;
      }

      setReports(reportData);
      setStats({
        totalAssessments: reportData.length,
        averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        completedAssessments: completed,
        pendingReview: pending,
        failed: failed
      });

    } catch (error) {
      console.error('Error loading other assessment reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': return '#48bb78';
      case 'pending': return '#ed8936';
      case 'in progress': return '#4299e1';
      case 'failed': return '#fc8181';
      default: return '#a0aec0';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#fc8181';
  };

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>📊 Other Assessment Reports</h1>
            <p style={styles.subtitle}>
              View and manage other assessment reports
              {currentSupervisor && ` — ${currentSupervisor.full_name || currentSupervisor.email}`}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.exportButton}>📥 Export CSV</button>
            <button style={styles.printButton}>🖨️ Print</button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📋</div>
            <div>
              <div style={styles.statsValue}>{stats.totalAssessments}</div>
              <div style={styles.statsLabel}>Total Assessments</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📈</div>
            <div>
              <div style={styles.statsValue}>{stats.averageScore}%</div>
              <div style={styles.statsLabel}>Average Score</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>✅</div>
            <div>
              <div style={styles.statsValue}>{stats.completedAssessments}</div>
              <div style={styles.statsLabel}>Completed</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>⏳</div>
            <div>
              <div style={styles.statsValue}>{stats.pendingReview}</div>
              <div style={styles.statsLabel}>Pending Review</div>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <h3 style={styles.emptyTitle}>No Other Assessment Reports Found</h3>
              <p style={styles.emptyText}>
                There are no other assessment reports available for your candidates yet.
                Assessments will appear here once candidates complete them.
              </p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.tableHeadCell}>Candidate</th>
                  <th style={styles.tableHeadCell}>University</th>
                  <th style={styles.tableHeadCell}>Program</th>
                  <th style={styles.tableHeadCell}>Assessment</th>
                  <th style={styles.tableHeadCell}>Type</th>
                  <th style={styles.tableHeadCell}>Score</th>
                  <th style={styles.tableHeadCell}>Status</th>
                  <th style={styles.tableHeadCell}>Date</th>
                  <th style={styles.tableHeadCell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{report.candidate}</td>
                    <td style={styles.tableCell}>{report.university}</td>
                    <td style={styles.tableCell}>{report.program}</td>
                    <td style={styles.tableCell}>{report.assessment_title}</td>
                    <td style={styles.tableCell}>
                      <span style={styles.assessmentTypeBadge}>
                        {report.assessment_type || 'Other'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.scoreBadge,
                        background: getScoreColor(report.score)
                      }}>
                        {report.score || 'N/A'}%
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        background: getStatusColor(report.status)
                      }}>
                        {report.status || 'Pending'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{report.date}</td>
                    <td style={styles.tableCell}>
                      <button
                        onClick={() => router.push(`/supervisor/reports/${report.id}`)}
                        style={styles.viewButton}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    flex: 1
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0
  },
  exportButton: {
    padding: '8px 20px',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  printButton: {
    padding: '8px 20px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  statsCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statsIcon: {
    fontSize: '32px'
  },
  statsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0A1929'
  },
  statsLabel: {
    fontSize: '14px',
    color: '#718096'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeadRow: {
    background: '#F8FAFC'
  },
  tableHeadCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '2px solid #E2E8F0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4A5568'
  },
  tableRow: {
    transition: 'background 0.2s ease'
  },
  tableCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#2D3748'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  assessmentTypeBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    background: '#ebf8ff',
    color: '#2b6cb0',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  viewButton: {
    padding: '4px 12px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.2s ease'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
