import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCandidateManager, setShowCandidateManager] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0
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

      const candidatesWithDetails = await Promise.all(
        (candidatesData || []).map(async (candidate) => {
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
          const unblockedAssessments = accessData?.filter(a => a.status === 'unblocked').length || 0;
          const blockedAssessments = accessData?.filter(a => a.status === 'blocked').length || 0;
          const latestResult = resultsData?.[0];

          return {
            ...candidate,
            completedAssessments,
            totalAssessments,
            unblockedAssessments,
            blockedAssessments,
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

      const { data: accessData } = await supabase
        .from('candidate_assessments')
        .select('status');

      const unblockedCount = accessData?.filter(a => a.status === 'unblocked').length || 0;
      const blockedCount = accessData?.filter(a => a.status === 'blocked').length || 0;

      setStats({
        totalSupervisors: supervisorCount || 0,
        totalCandidates: candidateCount || 0,
        totalAssessments: assessmentCount || 0,
        completedAssessments: completedCount || 0,
        unblockedAssessments: unblockedCount,
        blockedAssessments: blockedCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleResetAssessment = async (candidateId, assessmentId, assessmentTitle, candidateName) => {
    if (!confirm(`Are you sure you want to reset "${assessmentTitle}" for ${candidateName}?`)) {
      return;
    }

    setProcessingAssessment({ candidateId, assessmentId });

    try {
      await supabase
        .from('responses')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      await supabase
        .from('assessment_sessions')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      await supabase
        .from('assessment_results')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

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
      fetchAllCandidates();
      
    } catch (error) {
      console.error('Reset error:', error);
      alert('❌ Failed to reset assessment: ' + error.message);
    } finally {
      setProcessingAssessment(null);
    }
  };

  const handleResetPassword = async (candidateId, candidateEmail, candidateName) => {
    if (!confirm(`Reset password for ${candidateName}? They will receive an email to set a new password.`)) {
      return;
    }

    setResettingPassword(candidateId);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(candidateEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      alert(`✅ Password reset email sent to ${candidateEmail}.`);
      
    } catch (error) {
      console.error('Password reset error:', error);
      alert('❌ Failed to send password reset email: ' + error.message);
    } finally {
      setResettingPassword(null);
    }
  };

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
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => {
        if (selectedStatus === 'completed') return c.completedAssessments > 0;
        if (selectedStatus === 'unblocked') return c.unblockedAssessments > 0;
        if (selectedStatus === 'blocked') return c.blockedAssessments > 0;
        return true;
      });
    }
    
    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, selectedStatus]);

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
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>System Administration & Configuration</p>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>

        {/* Stats Cards */}
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
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🔓</div>
            <div>
              <div style={styles.statLabel}>Unblocked</div>
              <div style={styles.statValue}>{stats.unblockedAssessments}</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🔒</div>
            <div>
              <div style={styles.statLabel}>Blocked</div>
              <div style={styles.statValue}>{stats.blockedAssessments}</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div style={styles.actionCardsGrid}>
          <Link href="/admin/add-supervisor" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>➕</span>
              <div>
                <h3 style={styles.actionCardTitle}>Add Supervisor</h3>
                <p style={styles.actionCardDesc}>Create new supervisor accounts with dashboard access</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/manage-supervisors" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>👥</span>
              <div>
                <h3 style={styles.actionCardTitle}>Manage Supervisors</h3>
                <p style={styles.actionCardDesc}>View, activate, or remove existing supervisors</p>
              </div>
            </a>
          </Link>

          <Link href="/admin/assign-candidates" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>📋</span>
              <div>
                <h3 style={styles.actionCardTitle}>Assign Candidates</h3>
                <p style={styles.actionCardDesc}>Assign candidates to specific supervisors</p>
              </div>
            </a>
          </Link>

          {/* NEW: Manage Candidates Card - Click to show candidate management */}
          <div 
            onClick={() => setShowCandidateManager(!showCandidateManager)}
            style={styles.actionCard}
          >
            <span style={styles.actionCardIcon}>🎓</span>
            <div>
              <h3 style={styles.actionCardTitle}>Manage Candidates</h3>
              <p style={styles.actionCardDesc}>
                {showCandidateManager ? 'Hide' : 'View and manage all'} candidates, reset assessments, and reset passwords
              </p>
            </div>
            <span style={styles.chevron}>{showCandidateManager ? '▲' : '▼'}</span>
          </div>

          <Link href="/admin/audit-logs" legacyBehavior>
            <a style={styles.actionCard}>
              <span style={styles.actionCardIcon}>📊</span>
              <div>
                <h3 style={styles.actionCardTitle}>Audit Logs</h3>
                <p style={styles.actionCardDesc}>View system activity and user actions</p>
              </div>
            </a>
          </Link>
        </div>

        {/* Candidate Management Section - Card Layout (only shown when clicked) */}
        {showCandidateManager && (
          <div style={styles.candidateManagerCard}>
            <div style={styles.candidateManagerHeader}>
              <div>
                <h2 style={styles.candidateManagerTitle}>🎓 Candidate Management</h2>
                <p style={styles.candidateManagerSubtitle}>View, manage, reset assessments, and reset passwords for all candidates</p>
              </div>
              <div style={styles.candidateManagerStats}>
                <span style={styles.managerStat}>Total: {candidates.length}</span>
                <span style={styles.managerStat}>Completed: {candidates.filter(c => c.completedAssessments > 0).length}</span>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div style={styles.managerFilterBar}>
              <div style={styles.managerSearch}>
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.managerSearchInput}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={styles.managerClearButton}>✕</button>
                )}
              </div>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={styles.managerFilterSelect}
              >
                <option value="all">All Candidates</option>
                <option value="completed">With Completed Assessments</option>
                <option value="unblocked">With Unblocked Assessments</option>
                <option value="blocked">With Blocked Assessments</option>
              </select>
            </div>

            {/* Candidates Table */}
            {filteredCandidates.length === 0 ? (
              <div style={styles.managerEmptyState}>
                <span>👥</span>
                <h3>No Candidates Found</h3>
                <p>{searchTerm ? "No candidates match your search." : "No candidates in the system yet."}</p>
              </div>
            ) : (
              <div style={styles.managerTableWrapper}>
                <table style={styles.managerTable}>
                  <thead>
                    <tr style={styles.managerTableHead}>
                      <th>Candidate</th>
                      <th>Contact</th>
                      <th>Supervisor</th>
                      <th>Assessments</th>
                      <th>Latest Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => {
                      const latestScore = candidate.latestResult?.total_score || 0;
                      const maxScore = candidate.latestResult?.max_score || 100;
                      const percentage = latestScore && maxScore ? Math.round((latestScore/maxScore)*100) : 0;
                      const classification = getClassification(latestScore, maxScore);
                      const isExpanded = expandedCandidate === candidate.id;
                      const hasAssessments = candidate.assessments && candidate.assessments.length > 0;

                      return (
                        <React.Fragment key={candidate.id}>
                          <tr style={styles.managerTableRow}>
                            <td style={styles.managerTableCell}>
                              <div style={styles.managerCandidateInfo}>
                                <div style={styles.managerCandidateAvatar}>
                                  {candidate.full_name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                  <div style={styles.managerCandidateName}>{candidate.full_name || 'Unnamed'}</div>
                                  <div style={styles.managerCandidateId}>ID: {candidate.id.substring(0, 8)}...</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.managerTableCell}>
                              <div style={styles.managerContactEmail}>{candidate.email}</div>
                              {candidate.phone && <div style={styles.managerContactPhone}>{candidate.phone}</div>}
                            </td>
                            <td style={styles.managerTableCell}>
                              {candidate.supervisor ? (
                                <div>
                                  <div style={styles.managerSupervisorName}>{candidate.supervisor.full_name}</div>
                                  <div style={styles.managerSupervisorEmail}>{candidate.supervisor.email}</div>
                                </div>
                              ) : (
                                <span style={styles.managerUnassignedBadge}>Unassigned</span>
                              )}
                            </td>
                            <td style={styles.managerTableCell}>
                              <div style={styles.managerAssessmentBadges}>
                                <span style={{...styles.managerBadge, background: '#E8F5E9', color: '#2E7D32'}}>
                                  ✅ {candidate.completedAssessments}
                                </span>
                                <span style={{...styles.managerBadge, background: '#E3F2FD', color: '#1565C0'}}>
                                  🔓 {candidate.unblockedAssessments}
                                </span>
                                <span style={{...styles.managerBadge, background: '#FFF3E0', color: '#F57C00'}}>
                                  🔒 {candidate.blockedAssessments}
                                </span>
                              </div>
                            </td>
                            <td style={styles.managerTableCell}>
                              {candidate.latestResult ? (
                                <div>
                                  <span style={{
                                    ...styles.managerScoreBadge,
                                    background: percentage >= 85 ? '#E8F5E9' :
                                               percentage >= 70 ? '#E3F2FD' :
                                               percentage >= 55 ? '#FFF3E0' : '#FFEBEE',
                                    color: percentage >= 85 ? '#2E7D32' :
                                           percentage >= 70 ? '#1565C0' :
                                           percentage >= 55 ? '#F57C00' : '#C62828'
                                  }}>
                                    {latestScore}/{maxScore} ({percentage}%)
                                  </span>
                                  <div style={styles.managerClassification}>{classification.label}</div>
                                </div>
                              ) : (
                                <span style={styles.managerNoScore}>Not started</span>
                              )}
                            </td>
                            <td style={styles.managerTableCell}>
                              <div style={styles.managerActionButtons}>
                                <Link href={`/supervisor/${candidate.id}`} legacyBehavior>
                                  <a style={styles.managerViewButton}>View Report</a>
                                </Link>
                                <button
                                  onClick={() => handleResetPassword(candidate.id, candidate.email, candidate.full_name)}
                                  disabled={resettingPassword === candidate.id}
                                  style={{
                                    ...styles.managerResetPasswordButton,
                                    opacity: resettingPassword === candidate.id ? 0.5 : 1
                                  }}
                                >
                                  {resettingPassword === candidate.id ? '⏳' : '🔑 Reset Password'}
                                </button>
                                {hasAssessments && (
                                  <button
                                    onClick={() => toggleCandidateDetails(candidate.id)}
                                    style={styles.managerDetailsButton}
                                  >
                                    {isExpanded ? '▲' : '▼'} Assessments
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr style={styles.managerExpandedRow}>
                              <td colSpan="6" style={styles.managerExpandedCell}>
                                <div style={styles.managerExpandedContent}>
                                  <h4 style={styles.managerExpandedTitle}>Assessments</h4>
                                  <div style={styles.managerAssessmentsGrid}>
                                    {candidate.assessments.map((assessment) => {
                                      const result = candidate.results?.find(r => r.assessment_id === assessment.assessment_id);
                                      const isProcessing = processingAssessment?.candidateId === candidate.id && 
                                                          processingAssessment?.assessmentId === assessment.assessment_id;

                                      return (
                                        <div key={assessment.id} style={{
                                          ...styles.managerAssessmentCard,
                                          borderLeftColor: result ? '#4CAF50' : 
                                                         assessment.status === 'unblocked' ? '#2196F3' : '#FF9800'
                                        }}>
                                          <div style={styles.managerAssessmentHeader}>
                                            <span style={styles.managerAssessmentTitle}>
                                              {assessment.assessments?.title || 'Unknown Assessment'}
                                            </span>
                                            <span style={{
                                              ...styles.managerAssessmentStatus,
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
                                            <div style={styles.managerAssessmentDetails}>
                                              <div>Score: {result.total_score}/{result.max_score} ({Math.round((result.total_score/result.max_score)*100)}%)</div>
                                              <div style={styles.managerAssessmentDate}>Completed: {formatDate(result.completed_at)}</div>
                                            </div>
                                          )}
                                          <div style={styles.managerAssessmentActions}>
                                            {result ? (
                                              <>
                                                <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} legacyBehavior>
                                                  <a style={styles.managerViewReportLink}>View Full Report</a>
                                                </Link>
                                                <button
                                                  onClick={() => handleResetAssessment(
                                                    candidate.id,
                                                    assessment.assessment_id,
                                                    assessment.assessments?.title,
                                                    candidate.full_name
                                                  )}
                                                  disabled={isProcessing}
                                                  style={styles.managerResetButton}
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
                                                style={styles.managerResetButton}
                                              >
                                                {isProcessing ? '⏳' : 'Reset'}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
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
        )}
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
    gridTemplateColumns: 'repeat(6, 1fr)',
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
  actionCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative'
  },
  actionCardIcon: {
    fontSize: '32px'
  },
  actionCardTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929'
  },
  actionCardDesc: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#718096'
  },
  chevron: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#94A3B8'
  },
  candidateManagerCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginTop: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  candidateManagerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  candidateManagerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A1929'
  },
  candidateManagerSubtitle: {
    margin: '5px 0 0 0',
    fontSize: '13px',
    color: '#718096'
  },
  candidateManagerStats: {
    display: 'flex',
    gap: '15px'
  },
  managerStat: {
    padding: '4px 12px',
    background: '#F1F5F9',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#0A1929'
  },
  managerFilterBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  managerSearch: {
    flex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#F8FAFC',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0'
  },
  managerSearchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: '14px'
  },
  managerClearButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#999'
  },
  managerFilterSelect: {
    padding: '8px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    background: '#F8FAFC',
    fontSize: '14px',
    cursor: 'pointer'
  },
  managerTableWrapper: {
    overflowX: 'auto'
  },
  managerTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  managerTableHead: {
    background: '#F8FAFC',
    borderBottom: '2px solid #E2E8F0'
  },
  managerTableHead: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#0A1929'
  },
  managerTableRow: {
    borderBottom: '1px solid #E2E8F0',
    '&:hover': {
      background: '#F8FAFC'
    }
  },
  managerTableCell: {
    padding: '12px',
    verticalAlign: 'top'
  },
  managerCandidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  managerCandidateAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white'
  },
  managerCandidateName: {
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '2px'
  },
  managerCandidateId: {
    fontSize: '10px',
    color: '#718096'
  },
  managerContactEmail: {
    fontSize: '12px',
    color: '#0A1929',
    marginBottom: '2px'
  },
  managerContactPhone: {
    fontSize: '11px',
    color: '#718096'
  },
  managerSupervisorName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#0A1929'
  },
  managerSupervisorEmail: {
    fontSize: '10px',
    color: '#718096'
  },
  managerUnassignedBadge: {
    fontSize: '11px',
    background: '#FFEBEE',
    color: '#C62828',
    padding: '2px 8px',
    borderRadius: '12px',
    display: 'inline-block'
  },
  managerAssessmentBadges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  managerBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
  },
  managerScoreBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
  },
  managerClassification: {
    fontSize: '10px',
    color: '#64748B',
    marginTop: '4px'
  },
  managerNoScore: {
    fontSize: '11px',
    color: '#9E9E9E',
    fontStyle: 'italic'
  },
  managerActionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  managerViewButton: {
    background: '#0A1929',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '11px',
    display: 'inline-block'
  },
  managerResetPasswordButton: {
    background: '#FF9800',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer'
  },
  managerDetailsButton: {
    background: '#E2E8F0',
    color: '#0A1929',
    padding: '4px 10px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer'
  },
  managerExpandedRow: {
    background: '#F8FAFC'
  },
  managerExpandedCell: {
    padding: '16px'
  },
  managerExpandedContent: {
    width: '100%'
  },
  managerExpandedTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  },
  managerAssessmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px'
  },
  managerAssessmentCard: {
    borderLeft: '4px solid',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  managerAssessmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  managerAssessmentTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  },
  managerAssessmentStatus: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 500
  },
  managerAssessmentDetails: {
    fontSize: '11px',
    color: '#4A5568',
    marginBottom: '10px'
  },
  managerAssessmentDate: {
    fontSize: '10px',
    color: '#94A3B8',
    marginTop: '2px'
  },
  managerAssessmentActions: {
    display: 'flex',
    gap: '8px'
  },
  managerViewReportLink: {
    background: '#0A1929',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '10px'
  },
  managerResetButton: {
    background: '#2196F3',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '10px',
    cursor: 'pointer'
  },
  managerEmptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096'
  }
};
