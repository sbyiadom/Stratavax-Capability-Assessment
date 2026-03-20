import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0
  });
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [processingAssessment, setProcessingAssessment] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      setLoading(true);
      
      const userSession = localStorage.getItem("userSession");
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (!userSession && !supabaseSession) {
        router.push("/login");
        return;
      }

      let userId = null;
      if (supabaseSession?.user?.id) {
        userId = supabaseSession.user.id;
      } else if (userSession) {
        try {
          const parsed = JSON.parse(userSession);
          userId = parsed.user_id;
        } catch (e) {
          console.error('Error parsing userSession:', e);
        }
      }
      
      if (!userId) {
        setAuthError('No user ID found');
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('supervisor_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError) {
        console.error('Database error:', profileError);
        setAuthError(`Database error: ${profileError.message}`);
        router.push('/supervisor');
        return;
      }
      
      if (!profile || profile.role !== 'admin') {
        alert('Admin access required');
        router.push('/supervisor');
        return;
      }
      
      setIsAdmin(true);
      fetchAllCandidates();
      fetchStats();
      
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCandidates = async () => {
    try {
      // Get all candidates with their supervisor info
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select(`
          *,
          supervisor:supervisor_profiles (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;

      // Get assessment results and counts for each candidate
      const candidatesWithDetails = await Promise.all(
        (candidatesData || []).map(async (candidate) => {
          // Get assessment results
          const { data: resultsData } = await supabase
            .from('assessment_results')
            .select(`
              id,
              assessment_id,
              total_score,
              max_score,
              percentage_score,
              completed_at,
              assessment:assessments (
                id,
                title,
                assessment_type:assessment_types (*)
              )
            `)
            .eq('user_id', candidate.id)
            .order('completed_at', { ascending: false });

          // Get candidate assessments
          const { data: accessData } = await supabase
            .from('candidate_assessments')
            .select(`
              id,
              assessment_id,
              status,
              assessments (
                id,
                title,
                assessment_type:assessment_types (*)
              )
            `)
            .eq('user_id', candidate.id);

          const completedAssessments = resultsData?.length || 0;
          const totalAssessments = accessData?.length || 0;
          const latestResult = resultsData?.[0];

          return {
            ...candidate,
            completedAssessments,
            totalAssessments,
            latestResult,
            results: resultsData || [],
            assessments: accessData || []
          };
        })
      );

      setCandidates(candidatesWithDetails);
      setFilteredCandidates(candidatesWithDetails);
      
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: supervisorCount } = await supabase
        .from('supervisor_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: candidateCount } = await supabase
        .from('candidate_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: assessmentCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });

      const { count: completedCount } = await supabase
        .from('assessment_results')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalSupervisors: supervisorCount || 0,
        totalCandidates: candidateCount || 0,
        totalAssessments: assessmentCount || 0,
        completedAssessments: completedCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Reset an assessment for a candidate
  const handleResetAssessment = async (candidateId, assessmentId, assessmentTitle, candidateName) => {
    if (!confirm(`Are you sure you want to reset "${assessmentTitle}" for ${candidateName}?`)) {
      return;
    }

    setProcessingAssessment({ candidateId, assessmentId });

    try {
      // Delete responses
      await supabase
        .from('responses')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      // Delete sessions
      await supabase
        .from('assessment_sessions')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      // Delete results
      await supabase
        .from('assessment_results')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      // Update candidate_assessments
      await supabase
        .from('candidate_assessments')
        .update({ 
          status: 'blocked',
          unblocked_by: null,
          unblocked_at: null,
          result_id: null
        })
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      alert(`✅ "${assessmentTitle}" reset successfully for ${candidateName}.`);
      
      // Refresh data
      fetchAllCandidates();
      
    } catch (error) {
      console.error('Reset error:', error);
      alert('❌ Failed to reset assessment: ' + error.message);
    } finally {
      setProcessingAssessment(null);
    }
  };

  // Reset password for a candidate
  const handleResetPassword = async (candidateId, candidateEmail, candidateName) => {
    if (!confirm(`Reset password for ${candidateName}? They will receive an email to set a new password.`)) {
      return;
    }

    setResettingPassword(candidateId);

    try {
      // Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(candidateEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      alert(`✅ Password reset email sent to ${candidateEmail}. The candidate will receive instructions to set a new password.`);
      
    } catch (error) {
      console.error('Password reset error:', error);
      alert('❌ Failed to send password reset email: ' + error.message);
    } finally {
      setResettingPassword(null);
    }
  };

  // Filter candidates
  useEffect(() => {
    let filtered = [...candidates];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.full_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      );
    }
    setFilteredCandidates(filtered);
  }, [candidates, searchTerm]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getClassification = (score, maxScore) => {
    if (!score || !maxScore) return { label: "No Data", color: "#9E9E9E" };
    const percentage = Math.round((score / maxScore) * 100);
    if (percentage >= 85) return { label: "High Potential", color: "#2E7D32" };
    if (percentage >= 70) return { label: "Strong Performer", color: "#4CAF50" };
    if (percentage >= 55) return { label: "Developing", color: "#FF9800" };
    if (percentage >= 40) return { label: "At Risk", color: "#F57C00" };
    return { label: "High Risk", color: "#F44336" };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  };

  const toggleCandidateDetails = (candidateId) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(candidateId);
    }
  };

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>Authentication Error</p>
        <p style={styles.errorDetail}>{authError}</p>
        <button onClick={() => router.push('/supervisor')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>System Administration & Candidate Management</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>

        {/* Stats Overview */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👑</div>
            <div>
              <div style={styles.statLabel}>Supervisors</div>
              <div style={styles.statValue}>{stats.totalSupervisors}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statLabel}>Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📋</div>
            <div>
              <div style={styles.statLabel}>Assessments</div>
              <div style={styles.statValue}>{stats.totalAssessments}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completedAssessments}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <Link href="/admin/add-supervisor" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>➕</span>
              <div>
                <h3 style={styles.actionTitle}>Add Supervisor</h3>
                <p style={styles.actionDesc}>Create new supervisor accounts</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/manage-supervisors" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>👥</span>
              <div>
                <h3 style={styles.actionTitle}>Manage Supervisors</h3>
                <p style={styles.actionDesc}>View, activate, or remove supervisors</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/assign-candidates" legacyBehavior>
            <a style={{...styles.actionCard, borderLeft: '4px solid #4CAF50'}}>
              <span style={styles.actionIcon}>📋</span>
              <div>
                <h3 style={styles.actionTitle}>Assign Candidates</h3>
                <p style={styles.actionDesc}>Assign candidates to supervisors</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/audit-logs" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionIcon}>📊</span>
              <div>
                <h3 style={styles.actionTitle}>Audit Logs</h3>
                <p style={styles.actionDesc}>View system activity logs</p>
              </div>
            </a>
          </Link>
        </div>

        {/* Search Bar */}
        <div style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search candidates by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Candidates Table */}
        <div style={styles.tableContainer}>
          <h2 style={styles.tableTitle}>
            All Candidates 
            {filteredCandidates.length !== candidates.length && (
              <span style={styles.filterCount}> ({filteredCandidates.length} of {candidates.length})</span>
            )}
          </h2>

          {filteredCandidates.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👥</div>
              <h3>No Candidates Found</h3>
              <p>{searchTerm ? "No candidates match your search." : "No candidates in the system yet."}</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Candidate</th>
                    <th style={styles.tableHead}>Contact</th>
                    <th style={styles.tableHead}>Assigned To</th>
                    <th style={styles.tableHead}>Assessments</th>
                    <th style={styles.tableHead}>Latest Score</th>
                    <th style={styles.tableHead}>Classification</th>
                    <th style={styles.tableHead}>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const latestScore = candidate.latestResult?.total_score || 0;
                    const maxScore = candidate.latestResult?.max_score || 100;
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
                                <div style={styles.candidateName}>{candidate.full_name || 'Unnamed'}</div>
                                <div style={styles.candidateId}>ID: {candidate.id.substring(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.candidateEmail}>{candidate.email}</div>
                            {candidate.phone && <div style={styles.candidatePhone}>{candidate.phone}</div>}
                          </td>
                          <td style={styles.tableCell}>
                            {candidate.supervisor ? (
                              <div>
                                <div style={styles.supervisorName}>{candidate.supervisor.full_name}</div>
                                <div style={styles.supervisorEmail}>{candidate.supervisor.email}</div>
                              </div>
                            ) : (
                              <span style={styles.unassignedBadge}>Unassigned</span>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.assessmentSummary}>
                              <span style={styles.completedBadge}>
                                <strong>{candidate.completedAssessments}</strong> completed
                              </span>
                              <span style={styles.totalBadge}>
                                <strong>{candidate.totalAssessments}</strong> total
                              </span>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            {candidate.latestResult ? (
                              <span style={{
                                ...styles.scoreBadge,
                                background: percentage >= 85 ? '#E8F5E9' :
                                           percentage >= 70 ? '#E3F2FD' :
                                           percentage >= 55 ? '#FFF3E0' :
                                           '#FFEBEE',
                                color: percentage >= 85 ? '#2E7D32' :
                                      percentage >= 70 ? '#1565C0' :
                                      percentage >= 55 ? '#F57C00' :
                                      '#C62828'
                              }}>
                                {latestScore}/{maxScore} ({percentage}%)
                              </span>
                            ) : (
                              <span style={styles.noScore}>Not started</span>
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
                            <div style={styles.actionButtons}>
                              <Link href={`/supervisor/${candidate.id}`} legacyBehavior>
                                <a style={styles.viewButton}>
                                  View Report
                                </a>
                              </Link>
                              <button
                                onClick={() => handleResetPassword(candidate.id, candidate.email, candidate.full_name)}
                                disabled={resettingPassword === candidate.id}
                                style={{
                                  ...styles.resetPasswordButton,
                                  opacity: resettingPassword === candidate.id ? 0.5 : 1,
                                  cursor: resettingPassword === candidate.id ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {resettingPassword === candidate.id ? '⏳' : '🔑 Reset Password'}
                              </button>
                              <button
                                onClick={() => toggleCandidateDetails(candidate.id)}
                                style={styles.detailsButton}
                              >
                                {isExpanded ? '▲ Hide' : '▼ Details'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={styles.expandedRow}>
                            <td colSpan="7" style={styles.expandedCell}>
                              <div style={styles.expandedContent}>
                                <h4 style={styles.expandedTitle}>Assessments for {candidate.full_name}</h4>
                                {candidate.assessments && candidate.assessments.length > 0 ? (
                                  <div style={styles.assessmentsGrid}>
                                    {candidate.assessments.map((assessment) => {
                                      const result = candidate.results?.find(r => r.assessment_id === assessment.assessment_id);
                                      const isProcessing = processingAssessment?.candidateId === candidate.id && 
                                                          processingAssessment?.assessmentId === assessment.assessment_id;

                                      return (
                                        <div key={assessment.id} style={{
                                          ...styles.assessmentCard,
                                          borderColor: result ? '#4CAF50' : 
                                                     assessment.status === 'unblocked' ? '#2196F3' : '#FF9800'
                                        }}>
                                          <div style={styles.assessmentCardHeader}>
                                            <span style={styles.assessmentTitle}>
                                              {assessment.assessments?.title || 'Unknown Assessment'}
                                            </span>
                                            <span style={{
                                              ...styles.assessmentStatus,
                                              background: result ? '#E8F5E9' :
                                                         assessment.status === 'unblocked' ? '#E3F2FD' : '#FFF3E0',
                                              color: result ? '#2E7D32' :
                                                     assessment.status === 'unblocked' ? '#1565C0' : '#F57C00'
                                            }}>
                                              {result ? 'Completed' : 
                                               assessment.status === 'unblocked' ? 'Ready' : 'Blocked'}
                                            </span>
                                          </div>
                                          
                                          {result && (
                                            <div style={styles.assessmentScore}>
                                              Score: {result.total_score}/{result.max_score} 
                                              ({Math.round((result.total_score/result.max_score)*100)}%)
                                              <br />
                                              Completed: {formatDate(result.completed_at)}
                                            </div>
                                          )}
                                          
                                          <div style={styles.assessmentActions}>
                                            {result ? (
                                              <>
                                                <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} legacyBehavior>
                                                  <a style={styles.viewReportButton}>View Full Report</a>
                                                </Link>
                                                <button
                                                  onClick={() => handleResetAssessment(
                                                    candidate.id,
                                                    assessment.assessment_id,
                                                    assessment.assessments?.title,
                                                    candidate.full_name
                                                  )}
                                                  disabled={isProcessing}
                                                  style={{
                                                    ...styles.resetButton,
                                                    opacity: isProcessing ? 0.5 : 1,
                                                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                  }}
                                                >
                                                  {isProcessing ? '⏳' : '🔄 Reset'}
                                                </button>
                                              </>
                                            ) : (
                                              <button
                                                onClick={() => handleResetAssessment(
                                                  candidate.id,
                                                  assessment.assessment_id,
                                                  assessment.assessments?.title,
                                                  candidate.full_name
                                                )}
                                                disabled={isProcessing}
                                                style={{
                                                  ...styles.resetButton,
                                                  opacity: isProcessing ? 0.5 : 1,
                                                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                                                }}
                                              >
                                                {isProcessing ? '⏳' : 'Reset'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p style={styles.noAssessments}>No assessments assigned</p>
                                )}
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

const styles = {
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white',
    padding: '20px',
    textAlign: 'center'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  errorText: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  errorDetail: {
    fontSize: '14px',
    opacity: 0.8,
    marginBottom: '20px',
    maxWidth: '500px'
  },
  backButton: {
    padding: '12px 30px',
    background: 'white',
    color: '#0A1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
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
  subtitle: {
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
    fontWeight: 600
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '32px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0A1929'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  actionCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease'
  },
  actionIcon: {
    fontSize: '28px'
  },
  actionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  actionDesc: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#718096'
  },
  searchSection: {
    marginBottom: '20px'
  },
  searchContainer: {
    position: 'relative',
    maxWidth: '400px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999',
    fontSize: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px'
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#999'
  },
  tableContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  tableTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929'
  },
  filterCount: {
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#666'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    background: '#F8FAFC',
    borderRadius: '8px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '15px',
    opacity: 0.5
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #E2E8F0',
    background: '#F8FAFC'
  },
  tableHead: {
    padding: '12px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0'
  },
  tableCell: {
    padding: '12px',
    verticalAlign: 'top'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  candidateAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  candidateName: {
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '2px'
  },
  candidateId: {
    fontSize: '10px',
    color: '#718096'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#0A1929',
    marginBottom: '2px'
  },
  candidatePhone: {
    fontSize: '11px',
    color: '#718096'
  },
  supervisorName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#0A1929'
  },
  supervisorEmail: {
    fontSize: '10px',
    color: '#718096'
  },
  unassignedBadge: {
    fontSize: '11px',
    background: '#FFEBEE',
    color: '#C62828',
    padding: '2px 8px',
    borderRadius: '12px',
    display: 'inline-block'
  },
  assessmentSummary: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  completedBadge: {
    fontSize: '11px',
    background: '#E8F5E9',
    color: '#2E7D32',
    padding: '4px 8px',
    borderRadius: '12px',
    display: 'inline-block'
  },
  totalBadge: {
    fontSize: '11px',
    background: '#E3F2FD',
    color: '#1565C0',
    padding: '4px 8px',
    borderRadius: '12px',
    display: 'inline-block'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
  },
  noScore: {
    fontSize: '11px',
    color: '#9E9E9E',
    fontStyle: 'italic'
  },
  classificationBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
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
    fontSize: '11px',
    display: 'inline-block'
  },
  resetPasswordButton: {
    background: '#FF9800',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer'
  },
  detailsButton: {
    background: '#E2E8F0',
    color: '#0A1929',
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer'
  },
  expandedRow: {
    background: '#F8FAFC'
  },
  expandedCell: {
    padding: '20px'
  },
  expandedContent: {
    width: '100%'
  },
  expandedTitle: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  assessmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '15px'
  },
  assessmentCard: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '15px',
    background: 'white'
  },
  assessmentCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  assessmentTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  },
  assessmentStatus: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  assessmentScore: {
    fontSize: '11px',
    color: '#4A5568',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  assessmentActions: {
    display: 'flex',
    gap: '8px'
  },
  viewReportButton: {
    background: '#0A1929',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '10px'
  },
  resetButton: {
    background: '#2196F3',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '10px',
    cursor: 'pointer'
  },
  noAssessments: {
    textAlign: 'center',
    padding: '20px',
    color: '#718096',
    fontSize: '12px'
  }
};
