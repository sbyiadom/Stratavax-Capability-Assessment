import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('all');
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAssessments: 0,
    byType: {}
  });

  // Check supervisor authentication
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn) {
            setIsSupervisor(true);
          } else {
            router.push("/supervisor-login");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };
    checkAuth();
  }, [router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Get all candidates with their assessments
        const { data, error } = await supabase
          .from('supervisor_dashboard')
          .select('*')
          .order('total_assessments_taken', { ascending: false });

        if (error) throw error;

        setCandidates(data || []);

        // Calculate stats
        const types = new Set();
        const typeCounts = {};
        let totalAssessments = 0;

        data?.forEach(candidate => {
          totalAssessments += candidate.total_assessments_taken || 0;
          
          if (candidate.assessment_breakdown) {
            Object.entries(candidate.assessment_breakdown).forEach(([type, count]) => {
              if (count > 0) {
                types.add(type);
                typeCounts[type] = (typeCounts[type] || 0) + count;
              }
            });
          }
        });

        setAssessmentTypes(['all', ...Array.from(types)]);
        setStats({
          totalCandidates: data?.length || 0,
          totalAssessments,
          byType: typeCounts
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor]);

  // Filter candidates
  const filteredCandidates = selectedAssessmentType === 'all'
    ? candidates
    : candidates.filter(c => 
        c.assessment_breakdown?.[selectedAssessmentType] > 0
      );

  // Get classification based on score
  const getClassification = (score, assessmentType = 'general') => {
    if (assessmentType === 'general') {
      if (score >= 450) return { label: "Elite Talent", color: "#2E7D32" };
      if (score >= 400) return { label: "Top Talent", color: "#4CAF50" };
      if (score >= 350) return { label: "High Potential", color: "#2196F3" };
      if (score >= 300) return { label: "Solid Performer", color: "#FF9800" };
      if (score >= 250) return { label: "Developing Talent", color: "#9C27B0" };
      if (score >= 200) return { label: "Emerging Talent", color: "#795548" };
      return { label: "Needs Improvement", color: "#F44336" };
    } else {
      if (score >= 90) return { label: "Exceptional", color: "#2E7D32" };
      if (score >= 80) return { label: "Advanced", color: "#4CAF50" };
      if (score >= 70) return { label: "Proficient", color: "#2196F3" };
      if (score >= 60) return { label: "Developing", color: "#FF9800" };
      if (score >= 50) return { label: "Basic", color: "#9C27B0" };
      return { label: "Needs Improvement", color: "#F44336" };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  if (!isSupervisor) {
    return (
      <div style={styles.checkingContainer}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Multi-Assessment Talent Analytics</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div style={styles.statLabel}>Total Candidates</div>
            <div style={styles.statValue}>{stats.totalCandidates}</div>
          </div>
          
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)' }}>
            <div style={styles.statLabel}>Total Assessments</div>
            <div style={styles.statValue}>{stats.totalAssessments}</div>
          </div>

          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} style={{
              ...styles.statCard,
              background: type === 'general' ? 'linear-gradient(135deg, #607D8B 0%, #455A64 100%)' :
                          type === 'leadership' ? 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)' :
                          type === 'cognitive' ? 'linear-gradient(135deg, #4A6FA5 0%, #2C3E50 100%)' :
                          type === 'technical' ? 'linear-gradient(135deg, #F44336 0%, #C62828 100%)' :
                          type === 'personality' ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)' :
                          type === 'performance' ? 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' :
                          type === 'behavioral' ? 'linear-gradient(135deg, #00ACC1 0%, #006064 100%)' :
                          type === 'manufacturing' ? 'linear-gradient(135deg, #795548 0%, #4E342E 100%)' :
                          'linear-gradient(135deg, #E91E63 0%, #AD1457 100%)'
            }}>
              <div style={styles.statLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</div>
              <div style={styles.statValue}>{count}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={styles.filterBar}>
          <span style={styles.filterLabel}>Filter by Assessment:</span>
          <div style={styles.filterButtons}>
            {assessmentTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedAssessmentType(type)}
                style={{
                  ...styles.filterButton,
                  background: selectedAssessmentType === type ? '#1565c0' : '#f0f0f0',
                  color: selectedAssessmentType === type ? 'white' : '#333'
                }}
              >
                {type === 'all' ? 'All Assessments' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates Table */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Candidate Assessments</h2>
            <span style={styles.tableCount}>
              {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading candidate data...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <h3>No Assessment Data Yet</h3>
              <p>When candidates complete assessments, their results will appear here.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Candidate</th>
                    <th style={styles.tableHead}>Contact</th>
                    <th style={styles.tableHead}>Assessments Taken</th>
                    <th style={styles.tableHead}>Latest Score</th>
                    <th style={styles.tableHead}>Classification</th>
                    <th style={styles.tableHead}>Last Completed</th>
                    <th style={styles.tableHead}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const latestAssessment = candidate.assessments?.[0] || {};
                    const score = latestAssessment.score || 0;
                    const assessmentType = latestAssessment.assessment_type || 'general';
                    const classification = getClassification(score, assessmentType);

                    return (
                      <tr key={candidate.user_id} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.candidateName}>{candidate.full_name}</div>
                          <div style={styles.candidateId}>ID: {candidate.user_id.substring(0, 8)}...</div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.candidateEmail}>{candidate.email}</div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.assessmentTags}>
                            {candidate.assessment_breakdown && 
                              Object.entries(candidate.assessment_breakdown).map(([type, count]) => 
                                count > 0 && (
                                  <span key={type} style={{
                                    ...styles.assessmentTag,
                                    background: type === 'general' ? '#e3f2fd' :
                                               type === 'leadership' ? '#f3e5f5' :
                                               type === 'cognitive' ? '#e8f5e9' :
                                               type === 'technical' ? '#ffebee' :
                                               type === 'personality' ? '#e0f2f1' :
                                               type === 'performance' ? '#fff3e0' :
                                               '#f1f5f9',
                                    color: type === 'general' ? '#1565c0' :
                                           type === 'leadership' ? '#7b1fa2' :
                                           type === 'cognitive' ? '#2e7d32' :
                                           type === 'technical' ? '#c62828' :
                                           type === 'personality' ? '#00695c' :
                                           type === 'performance' ? '#ef6c00' :
                                           '#37474f'
                                  }}>
                                    {type}: {count}
                                  </span>
                                )
                              )
                            }
                          </div>
                          <div style={styles.totalAssessments}>
                            Total: {candidate.total_assessments_taken} assessment{candidate.total_assessments_taken !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.scoreBadge,
                            background: score >= 400 ? '#e8f5e9' :
                                       score >= 350 ? '#e3f2fd' :
                                       score >= 300 ? '#fff3e0' :
                                       score >= 250 ? '#f3e5f5' :
                                       '#ffebee',
                            color: score >= 400 ? '#2e7d32' :
                                  score >= 350 ? '#1565c0' :
                                  score >= 300 ? '#f57c00' :
                                  score >= 250 ? '#7b1fa2' :
                                  '#c62828'
                          }}>
                            {score}/{latestAssessment.max_score || 100}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.classificationBadge,
                            color: classification.color,
                            background: `${classification.color}15`
                          }}>
                            {classification.label}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.date}>
                            {latestAssessment.completed_at 
                              ? new Date(latestAssessment.completed_at).toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <Link href={`/supervisor/${candidate.user_id}`} legacyBehavior>
                            <a style={styles.viewButton}>
                              View Reports
                            </a>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    width: '90vw',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    margin: 0,
    color: '#1565c0',
    fontSize: '32px',
    fontWeight: 600
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#666'
  },
  logoutButton: {
    background: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '8px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700
  },
  filterBar: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap'
  },
  filterLabel: {
    fontWeight: 600,
    color: '#333'
  },
  filterButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  tableContainer: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  tableTitle: {
    margin: 0,
    color: '#333',
    fontSize: '18px'
  },
  tableCount: {
    fontSize: '14px',
    color: '#666'
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #1565c0',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    opacity: 0.3
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #1565c0',
    backgroundColor: '#f5f5f5'
  },
  tableHead: {
    padding: '15px',
    fontWeight: 600,
    color: '#333',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #eee',
    transition: 'background 0.2s',
    ':hover': {
      background: '#f8f9fa'
    }
  },
  tableCell: {
    padding: '15px'
  },
  candidateName: {
    fontWeight: 500,
    marginBottom: '4px'
  },
  candidateId: {
    fontSize: '11px',
    color: '#888',
    fontFamily: 'monospace'
  },
  candidateEmail: {
    fontSize: '13px',
    color: '#1565c0'
  },
  assessmentTags: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
    marginBottom: '5px'
  },
  assessmentTag: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'capitalize'
  },
  totalAssessments: {
    fontSize: '11px',
    color: '#666'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: '20px',
    fontWeight: 600,
    fontSize: '13px'
  },
  classificationBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '12px'
  },
  date: {
    fontSize: '13px',
    color: '#666'
  },
  viewButton: {
    color: '#fff',
    background: '#1565c0',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    display: 'inline-block',
    fontWeight: 500,
    fontSize: '13px',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#0d47a1',
      transform: 'translateY(-1px)'
    }
  }
};
