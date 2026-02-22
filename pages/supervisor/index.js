import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('all');
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    pendingAssessments: 0,
    byType: {}
  });
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem("userSession");
        
        if (!userSession) {
          router.push("/login");
          return;
        }
        
        try {
          const session = JSON.parse(userSession);
          if (session.loggedIn && (session.role === 'supervisor' || session.role === 'admin')) {
            setCurrentSupervisor({
              id: session.user_id,
              email: session.email,
              name: session.full_name || session.email
            });
          } else {
            if (session.role === 'candidate') {
              router.push("/candidate/dashboard");
            } else {
              router.push("/login");
            }
          }
        } catch {
          router.push("/login");
        }
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!currentSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // First, get candidates with their basic assessment info
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidate_profiles')
          .select(`
            id,
            full_name,
            email,
            phone,
            created_at,
            candidate_assessments (
              id,
              assessment_id,
              status,
              score,
              completed_at
            )
          `)
          .eq('supervisor_id', currentSupervisor.id)
          .order('created_at', { ascending: false });

        if (candidatesError) throw candidatesError;

        // Process candidates and fetch assessment details separately
        const processedCandidates = await Promise.all(
          (candidatesData || []).map(async (candidate) => {
            const assessments = candidate.candidate_assessments || [];
            
            // Get assessment details for each assessment
            const assessmentsWithDetails = await Promise.all(
              assessments.map(async (assessment) => {
                if (assessment.assessment_id) {
                  const { data: assessmentData, error: assessmentError } = await supabase
                    .from('assessments')
                    .select(`
                      id,
                      title,
                      max_score,
                      assessment_type_id,
                      assessment_types (
                        code,
                        name
                      )
                    `)
                    .eq('id', assessment.assessment_id)
                    .single();
                  
                  if (!assessmentError && assessmentData) {
                    return {
                      ...assessment,
                      max_score: assessmentData.max_score || 100,
                      assessment_type: assessmentData.assessment_types?.code || 'unknown',
                      assessment_name: assessmentData.assessment_types?.name || 'Unknown',
                      assessment_title: assessmentData.title || 'Unknown Assessment'
                    };
                  }
                }
                return {
                  ...assessment,
                  max_score: 100,
                  assessment_type: 'unknown',
                  assessment_name: 'Unknown',
                  assessment_title: 'Unknown Assessment'
                };
              })
            );

            const completedAssessments = assessmentsWithDetails.filter(a => a.status === 'completed');
            const pendingAssessments = assessmentsWithDetails.filter(a => a.status === 'pending' || a.status === 'in_progress');
            
            // Calculate assessment breakdown by type
            const assessmentBreakdown = {};
            assessmentsWithDetails.forEach(a => {
              const type = a.assessment_type || 'unknown';
              assessmentBreakdown[type] = (assessmentBreakdown[type] || 0) + 1;
            });

            // Get latest completed assessment
            const latestAssessment = completedAssessments.sort((a, b) => 
              new Date(b.completed_at) - new Date(a.completed_at)
            )[0];

            return {
              id: candidate.id,
              full_name: candidate.full_name || 'Unnamed Candidate',
              email: candidate.email || 'No email provided',
              phone: candidate.phone,
              created_at: candidate.created_at,
              totalAssessments: assessmentsWithDetails.length,
              completedAssessments: completedAssessments.length,
              pendingAssessments: pendingAssessments.length,
              assessment_breakdown: assessmentBreakdown,
              latestAssessment: latestAssessment,
              hasCompletedAssessments: completedAssessments.length > 0,
              assessments: assessmentsWithDetails
            };
          })
        );

        setCandidates(processedCandidates);

        // Calculate stats
        const types = new Set();
        const typeCounts = {};
        let totalAssessments = 0;
        let completedAssessments = 0;
        let pendingAssessments = 0;

        processedCandidates.forEach(candidate => {
          totalAssessments += candidate.totalAssessments;
          completedAssessments += candidate.completedAssessments;
          pendingAssessments += candidate.pendingAssessments;
          
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
          totalCandidates: processedCandidates.length,
          totalAssessments,
          completedAssessments,
          pendingAssessments,
          byType: typeCounts
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentSupervisor]);

  const filteredCandidates = selectedAssessmentType === 'all'
    ? candidates
    : candidates.filter(c => 
        c.assessment_breakdown?.[selectedAssessmentType] > 0
      );

  const getClassification = (score, maxScore) => {
    if (!score || !maxScore) return { label: "No Data", color: "#9E9E9E" };
    const percentage = Math.round((score / maxScore) * 100);
    if (percentage >= 85) return { label: "High Potential", color: "#2E7D32" };
    if (percentage >= 70) return { label: "Strong Performer", color: "#4CAF50" };
    if (percentage >= 55) return { label: "Developing", color: "#FF9800" };
    if (percentage >= 40) return { label: "At Risk", color: "#F57C00" };
    return { label: "High Risk", color: "#F44336" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  };

  // Toggle candidate details
  const toggleCandidateDetails = (candidateId) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(candidateId);
    }
  };

  // Assessment-specific reset function
  const handleResetAssessment = async (candidateId, assessmentId, assessmentTitle, candidateName) => {
    if (!confirm(`Are you sure you want to reset "${assessmentTitle}" for ${candidateName}? They will be able to retake it.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Update specific assessment to 'pending' status
      const { error } = await supabase
        .from('candidate_assessments')
        .update({ 
          status: 'pending',
          score: null,
          completed_at: null 
        })
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (error) throw error;

      // Delete any assessment sessions for this specific assessment
      const { error: sessionError } = await supabase
        .from('assessment_sessions')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (sessionError) throw sessionError;

      alert(`✅ "${assessmentTitle}" reset successfully for ${candidateName}. They can now retake it.`);
      
      // Refresh the data
      window.location.reload();

    } catch (error) {
      console.error('Error resetting assessment:', error);
      alert('❌ Failed to reset assessment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentSupervisor) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.welcome}>Welcome back, <strong>{currentSupervisor.name || currentSupervisor.email}</strong></p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>

        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)' }}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>My Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #1E3A5F 0%, #2B4C7C 100%)' }}>
            <div style={styles.statIcon}>📋</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Assessments</div>
              <div style={styles.statValue}>{stats.totalAssessments}</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)' }}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completedAssessments}</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)' }}>
            <div style={styles.statIcon}>⏳</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Pending</div>
              <div style={styles.statValue}>{stats.pendingAssessments}</div>
            </div>
          </div>
        </div>

        <div style={styles.filterBar}>
          <span style={styles.filterLabel}>Filter by Assessment:</span>
          <div style={styles.filterButtons}>
            {assessmentTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedAssessmentType(type)}
                style={{
                  ...styles.filterButton,
                  background: selectedAssessmentType === type ? '#0A1929' : '#f0f0f0',
                  color: selectedAssessmentType === type ? 'white' : '#333'
                }}
              >
                {type === 'all' ? 'All Assessments' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>My Assigned Candidates</h2>
            <Link href="/supervisor/add-candidate" legacyBehavior>
              <a style={styles.addButton}>+ Add New Candidate</a>
            </Link>
          </div>

          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading your candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👥</div>
              <h3>No Assigned Candidates</h3>
              <p>You don't have any candidates assigned to you yet. Contact an administrator to assign candidates to your account.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Candidate</th>
                    <th style={styles.tableHead}>Contact</th>
                    <th style={styles.tableHead}>Assessments</th>
                    <th style={styles.tableHead}>Latest Score</th>
                    <th style={styles.tableHead}>Classification</th>
                    <th style={styles.tableHead}>Last Active</th>
                    <th style={styles.tableHead}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const latestScore = candidate.latestAssessment?.score || 0;
                    const maxScore = candidate.latestAssessment?.max_score || 100;
                    const percentage = latestScore ? Math.round((latestScore/maxScore)*100) : 0;
                    const classification = getClassification(latestScore, maxScore);
                    const isExpanded = expandedCandidate === candidate.id;

                    return (
                      <>
                        <tr key={candidate.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <div style={styles.candidateInfo}>
                              <div style={styles.candidateAvatar}>
                                {candidate.full_name?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <div style={styles.candidateName}>{candidate.full_name}</div>
                                <div style={styles.candidateId}>ID: {candidate.id.substring(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.candidateEmail}>{candidate.email}</div>
                            {candidate.phone && <div style={styles.candidatePhone}>{candidate.phone}</div>}
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.assessmentStats}>
                              <span style={styles.assessmentCount}>
                                <strong>{candidate.completedAssessments}</strong> completed
                              </span>
                              <span style={styles.assessmentCount}>
                                <strong>{candidate.pendingAssessments}</strong> pending
                              </span>
                            </div>
                            <div style={styles.assessmentTags}>
                              {Object.entries(candidate.assessment_breakdown).map(([type, count]) => (
                                <span key={type} style={{
                                  ...styles.assessmentTag,
                                  background: type === 'leadership' ? '#E3F2FD' :
                                             type === 'cognitive' ? '#E8F5E9' :
                                             type === 'technical' ? '#FFEBEE' :
                                             type === 'personality' ? '#F3E5F5' :
                                             type === 'performance' ? '#FFF3E0' :
                                             type === 'behavioral' ? '#E0F2F1' :
                                             type === 'cultural' ? '#F1F5F9' :
                                             '#F1F5F9',
                                  color: type === 'leadership' ? '#1565C0' :
                                         type === 'cognitive' ? '#2E7D32' :
                                         type === 'technical' ? '#C62828' :
                                         type === 'personality' ? '#7B1FA2' :
                                         type === 'performance' ? '#EF6C00' :
                                         type === 'behavioral' ? '#00695C' :
                                         type === 'cultural' ? '#37474F' :
                                         '#37474F'
                                }}>
                                  {type}: {count}
                                </span>
                              ))}
                            </div>
                            {candidate.assessments.length > 0 && (
                              <button
                                onClick={() => toggleCandidateDetails(candidate.id)}
                                style={styles.viewDetailsButton}
                              >
                                {isExpanded ? '▲ Hide Details' : '▼ View Assessments'}
                              </button>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            {candidate.latestAssessment ? (
                              <span style={{
                                ...styles.scoreBadge,
                                background: percentage >= 85 ? '#E8F5E9' :
                                           percentage >= 70 ? '#E3F2FD' :
                                           percentage >= 55 ? '#FFF3E0' :
                                           percentage >= 40 ? '#F3E5F5' :
                                           '#FFEBEE',
                                color: percentage >= 85 ? '#2E7D32' :
                                      percentage >= 70 ? '#1565C0' :
                                      percentage >= 55 ? '#F57C00' :
                                      percentage >= 40 ? '#7B1FA2' :
                                      '#C62828'
                              }}>
                                {latestScore}/{maxScore} ({percentage}%)
                              </span>
                            ) : (
                              <span style={styles.noScore}>No assessments</span>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.classificationBadge,
                              color: classification.color,
                              background: `${classification.color}15`,
                              border: `1px solid ${classification.color}30`
                            }}>
                              {classification.label}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={styles.date}>
                              {candidate.latestAssessment 
                                ? formatDate(candidate.latestAssessment.completed_at)
                                : 'Never'
                              }
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.actionButtons}>
                              <Link href={`/supervisor/${candidate.id}`} legacyBehavior>
                                <a style={styles.viewButton}>
                                  View Reports
                                </a>
                              </Link>
                              <Link href={`/supervisor/assign-assessment/${candidate.id}`} legacyBehavior>
                                <a style={styles.assignButton}>
                                  Assign
                                </a>
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={styles.expandedRow}>
                            <td colSpan="7" style={styles.expandedCell}>
                              <div style={styles.assessmentsList}>
                                <h4 style={styles.assessmentsListTitle}>Individual Assessments</h4>
                                {candidate.assessments.map((assessment) => (
                                  <div key={assessment.id} style={styles.assessmentItem}>
                                    <div style={styles.assessmentItemInfo}>
                                      <span style={styles.assessmentItemTitle}>
                                        {assessment.assessment_title}
                                      </span>
                                      <span style={{
                                        ...styles.assessmentItemStatus,
                                        background: assessment.status === 'completed' ? '#E8F5E9' : '#FFF3E0',
                                        color: assessment.status === 'completed' ? '#2E7D32' : '#F57C00'
                                      }}>
                                        {assessment.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                                      </span>
                                      {assessment.status === 'completed' && (
                                        <span style={styles.assessmentItemScore}>
                                          Score: {assessment.score}/{assessment.max_score} 
                                          ({Math.round((assessment.score/assessment.max_score)*100)}%)
                                        </span>
                                      )}
                                    </div>
                                    {assessment.status === 'completed' && (
                                      <button
                                        onClick={() => handleResetAssessment(
                                          candidate.id, 
                                          assessment.assessment_id, 
                                          assessment.assessment_title,
                                          candidate.full_name
                                        )}
                                        style={styles.resetSmallButton}
                                      >
                                        🔄 Reset
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    width: '90vw',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '28px',
    fontWeight: 700
  },
  welcome: {
    margin: '5px 0 0 0',
    color: '#666',
    fontSize: '14px'
  },
  logoutButton: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#D32F2F',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
    }
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    padding: '25px',
    borderRadius: '16px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
  },
  statIcon: {
    fontSize: '36px',
    opacity: 0.9
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '5px'
  },
  statValue: {
    fontSize: '32px',
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
    borderRadius: '16px',
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
    color: '#0A1929',
    fontSize: '20px',
    fontWeight: 600
  },
  addButton: {
    background: '#0A1929',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(10, 25, 41, 0.3)'
    }
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: '#F8FAFC',
    borderRadius: '12px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    background: '#0A1929',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '30px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    marginTop: '20px',
    cursor: 'pointer'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '1200px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #0A1929',
    background: '#F8FAFC'
  },
  tableHead: {
    padding: '15px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background 0.2s ease',
    ':hover': {
      background: '#F8FAFC'
    }
  },
  tableCell: {
    padding: '15px'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  candidateAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    background: '#E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929'
  },
  candidateName: {
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '4px'
  },
  candidateId: {
    fontSize: '11px',
    color: '#718096',
    fontFamily: 'monospace'
  },
  candidateEmail: {
    fontSize: '14px',
    color: '#0A1929',
    marginBottom: '4px'
  },
  candidatePhone: {
    fontSize: '12px',
    color: '#718096'
  },
  assessmentStats: {
    display: 'flex',
    gap: '15px',
    marginBottom: '8px'
  },
  assessmentCount: {
    fontSize: '13px',
    color: '#4A5568'
  },
  assessmentTags: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap'
  },
  assessmentTag: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'capitalize'
  },
  viewDetailsButton: {
    marginTop: '8px',
    padding: '4px 8px',
    background: 'none',
    border: '1px solid #0A1929',
    borderRadius: '4px',
    color: '#0A1929',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#0A1929',
      color: 'white'
    }
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: '20px',
    fontWeight: 600,
    fontSize: '13px'
  },
  noScore: {
    fontSize: '13px',
    color: '#9E9E9E',
    fontStyle: 'italic'
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
    color: '#718096'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  viewButton: {
    background: '#0A1929',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A'
    }
  },
  assignButton: {
    background: '#4CAF50',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#45a049'
    }
  },
  expandedRow: {
    background: '#F8FAFC'
  },
  expandedCell: {
    padding: '20px 30px',
    borderBottom: '1px solid #E2E8F0'
  },
  assessmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  assessmentsListTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  assessmentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #E2E8F0'
  },
  assessmentItemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  assessmentItemTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#0A1929',
    minWidth: '200px'
  },
  assessmentItemStatus: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600
  },
  assessmentItemScore: {
    fontSize: '12px',
    color: '#4A5568'
  },
  resetSmallButton: {
    padding: '4px 10px',
    background: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#F57C00'
    }
  }
};
