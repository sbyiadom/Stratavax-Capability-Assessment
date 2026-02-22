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

  // FIXED: Data fetching with proper assessment_results table
  useEffect(() => {
    if (!currentSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // First, get candidates assigned to this supervisor
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidate_profiles')
          .select(`
            id,
            full_name,
            email,
            phone,
            created_at
          `)
          .eq('supervisor_id', currentSupervisor.id)
          .order('created_at', { ascending: false });

        if (candidatesError) throw candidatesError;

        // For each candidate, get their assessment results
        const processedCandidates = await Promise.all(
          (candidatesData || []).map(async (candidate) => {
            
            // Get assessment results for this candidate
            const { data: resultsData, error: resultsError } = await supabase
              .from('assessment_results')
              .select(`
                id,
                assessment_id,
                total_score,
                max_score,
                percentage_score,
                completed_at,
                assessment_type_id
              `)
              .eq('user_id', candidate.id)
              .order('completed_at', { ascending: false });

            if (resultsError) throw resultsError;

            // Get assessment details for each result
            const assessmentsWithDetails = await Promise.all(
              (resultsData || []).map(async (result) => {
                
                // Get assessment type details
                const { data: typeData, error: typeError } = await supabase
                  .from('assessment_types')
                  .select('code, name')
                  .eq('id', result.assessment_type_id)
                  .single();

                if (typeError) {
                  console.error('Error fetching assessment type:', typeError);
                }

                return {
                  id: result.id,
                  assessment_id: result.assessment_id,
                  score: result.total_score,
                  max_score: result.max_score,
                  percentage: result.percentage_score,
                  completed_at: result.completed_at,
                  assessment_type: typeData?.code || 'unknown',
                  assessment_name: typeData?.name || 'Unknown',
                  assessment_title: typeData?.name || 'Unknown Assessment',
                  status: 'completed'
                };
              })
            );

            // Also get pending/in-progress assessments from candidate_assessments
            const { data: pendingData, error: pendingError } = await supabase
              .from('candidate_assessments')
              .select(`
                id,
                assessment_id,
                status,
                created_at
              `)
              .eq('user_id', candidate.id)
              .in('status', ['pending', 'in_progress']);

            if (pendingError) throw pendingError;

            // Get assessment details for pending assessments
            const pendingWithDetails = await Promise.all(
              (pendingData || []).map(async (pending) => {
                
                // Get assessment details
                const { data: assessmentData, error: assessmentError } = await supabase
                  .from('assessments')
                  .select(`
                    title,
                    assessment_type_id
                  `)
                  .eq('id', pending.assessment_id)
                  .single();

                if (assessmentError) {
                  console.error('Error fetching assessment:', assessmentError);
                }

                // Get assessment type
                const { data: typeData, error: typeError } = await supabase
                  .from('assessment_types')
                  .select('code, name')
                  .eq('id', assessmentData?.assessment_type_id)
                  .single();

                return {
                  id: pending.id,
                  assessment_id: pending.assessment_id,
                  score: null,
                  max_score: null,
                  percentage: null,
                  completed_at: null,
                  assessment_type: typeData?.code || 'unknown',
                  assessment_name: typeData?.name || 'Unknown',
                  assessment_title: assessmentData?.title || 'Unknown Assessment',
                  status: pending.status
                };
              })
            );

            // Combine completed and pending assessments
            const allAssessments = [...assessmentsWithDetails, ...pendingWithDetails];
            
            // Sort by date (most recent first)
            allAssessments.sort((a, b) => {
              const dateA = a.completed_at || a.created_at || 0;
              const dateB = b.completed_at || b.created_at || 0;
              return new Date(dateB) - new Date(dateA);
            });

            const completedAssessments = allAssessments.filter(a => a.status === 'completed');
            const pendingAssessments = allAssessments.filter(a => a.status === 'pending' || a.status === 'in_progress');
            
            // Calculate assessment breakdown by type
            const assessmentBreakdown = {};
            allAssessments.forEach(a => {
              const type = a.assessment_type || 'unknown';
              assessmentBreakdown[type] = (assessmentBreakdown[type] || 0) + 1;
            });

            // Get latest completed assessment
            const latestAssessment = completedAssessments[0];

            return {
              id: candidate.id,
              full_name: candidate.full_name || 'Unnamed Candidate',
              email: candidate.email || 'No email provided',
              phone: candidate.phone,
              created_at: candidate.created_at,
              totalAssessments: allAssessments.length,
              completedAssessments: completedAssessments.length,
              pendingAssessments: pendingAssessments.length,
              assessment_breakdown: assessmentBreakdown,
              latestAssessment: latestAssessment,
              hasCompletedAssessments: completedAssessments.length > 0,
              assessments: allAssessments
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
      
      // Delete the assessment result
      const { error: deleteError } = await supabase
        .from('assessment_results')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (deleteError) throw deleteError;

      // Update candidate_assessments to pending
      const { error: updateError } = await supabase
        .from('candidate_assessments')
        .update({ 
          status: 'pending',
          score: null,
          completed_at: null 
        })
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (updateError) throw updateError;

      // Delete any assessment sessions
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
                    const percentage = latestScore && maxScore ? Math.round((latestScore/maxScore)*100) : 0;
                    const classification = getClassification(latestScore, maxScore);
                    const isExpanded = expandedCandidate === candidate.id;

                    return (
                      <React.Fragment key={candidate.id}>
                        <tr style={styles.tableRow}>
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
                                        {assessment.assessment_title || assessment.assessment_name}
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
                                          assessment.assessment_title || assessment.assessment_name,
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
                      </React.Fragment>
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

// ... keep all the styles from your existing file ...
