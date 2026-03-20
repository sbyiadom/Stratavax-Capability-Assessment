import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function ManageCandidates() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('all');
  const [supervisors, setSupervisors] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(null);
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [processingAssessment, setProcessingAssessment] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem("userSession");
        
        if (userSession) {
          try {
            const session = JSON.parse(userSession);
            
            // Verify admin status from database
            const { data: profile, error } = await supabase
              .from('supervisor_profiles')
              .select('role')
              .eq('id', session.user_id)
              .maybeSingle();

            if (error) {
              console.error('Error checking admin:', error);
              router.push('/login');
              return;
            }

            if (profile?.role === 'admin') {
              setIsAdmin(true);
              fetchSupervisors();
              fetchCandidates();
            } else {
              router.push('/supervisor');
            }
          } catch (e) {
            console.error('Auth error:', e);
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      }
    };
    checkAdmin();
  }, [router]);

  const fetchSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setSupervisors(data || []);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      // Fetch all candidates with their supervisor info
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

      // Get assessment data for each candidate
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
      applyFilters(candidatesWithDetails, searchTerm, selectedSupervisor);
      
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (candidatesList, search, supervisorId) => {
    let filtered = [...candidatesList];
    
    // Filter by supervisor
    if (supervisorId !== 'all') {
      filtered = filtered.filter(c => c.supervisor_id === supervisorId);
    }
    
    // Filter by search term
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.full_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      );
    }
    
    setFilteredCandidates(filtered);
  };

  // Handle search term change
  useEffect(() => {
    applyFilters(candidates, searchTerm, selectedSupervisor);
  }, [searchTerm, selectedSupervisor, candidates]);

  const handleResetAssessment = async (candidateId, assessmentId, assessmentTitle, candidateName) => {
    if (!confirm(`Are you sure you want to reset "${assessmentTitle}" for ${candidateName}? They will be able to retake it.`)) {
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

      setSuccess(`✅ "${assessmentTitle}" reset successfully for ${candidateName}.`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh data
      fetchCandidates();
      
    } catch (error) {
      console.error('Reset error:', error);
      setError('Failed to reset assessment: ' + error.message);
      setTimeout(() => setError(''), 3000);
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

      setSuccess(`✅ Password reset email sent to ${candidateEmail}.`);
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Password reset error:', error);
      setError('❌ Failed to send password reset email: ' + error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setResettingPassword(null);
    }
  };

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

  const toggleCandidateDetails = (candidateId) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(candidateId);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
          <button onClick={() => router.push('/supervisor')} style={styles.button}>
            Go to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        {/* Back Button */}
        <div style={styles.backButtonContainer}>
          <button onClick={() => router.push('/admin')} style={styles.backButton}>
            ← Back to Admin Dashboard
          </button>
        </div>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidates</h1>
            <p style={styles.subtitle}>View, reset assessments, and manage candidate accounts</p>
          </div>
          <Link href="/admin/assign-candidates" legacyBehavior>
            <a style={styles.assignButton}>
              + Assign Candidates
            </a>
          </Link>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={styles.errorMessage}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={styles.successMessage}>
            ✅ {success}
          </div>
        )}

        {/* Filter Section */}
        <div style={styles.filterSection}>
          {/* Search Bar */}
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

          {/* Supervisor Filter */}
          <div style={styles.filterContainer}>
            <span style={styles.filterIcon}>👤</span>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Supervisors ({candidates.length} candidates)</option>
              {supervisors.map(supervisor => {
                const candidateCount = candidates.filter(c => c.supervisor_id === supervisor.id).length;
                return (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.full_name || supervisor.email} ({candidateCount} candidates)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter Stats */}
          {filteredCandidates.length !== candidates.length && (
            <div style={styles.filterStats}>
              Showing {filteredCandidates.length} of {candidates.length} candidates
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSupervisor('all');
                }}
                style={styles.clearFiltersButton}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading candidates...</div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Supervisor</th>
                  <th style={styles.th}>Assessments</th>
                  <th style={styles.th}>Latest Score</th>
                  <th style={styles.th}>Actions</th>
                 </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.noData}>
                      {searchTerm || selectedSupervisor !== 'all' 
                        ? "No candidates match your filters. Try adjusting your search or filter criteria."
                        : "No candidates found. Assign candidates to get started."}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map(candidate => {
                    const latestScore = candidate.latestResult?.total_score || 0;
                    const maxScore = candidate.latestResult?.max_score || 100;
                    const percentage = latestScore && maxScore ? Math.round((latestScore/maxScore)*100) : 0;
                    const classification = getClassification(latestScore, maxScore);
                    const isExpanded = expandedCandidate === candidate.id;

                    return (
                      <React.Fragment key={candidate.id}>
                        <tr style={styles.tableRow}>
                          <td style={styles.td}>
                            <div style={styles.candidateInfo}>
                              <div style={styles.avatar}>
                                {candidate.full_name?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <div style={styles.candidateName}>
                                  {candidate.full_name || 'Unnamed Candidate'}
                                </div>
                                <div style={styles.candidateId}>
                                  ID: {candidate.id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.contactInfo}>
                              <div style={styles.email}>{candidate.email}</div>
                              {candidate.phone && <div style={styles.phone}>{candidate.phone}</div>}
                            </div>
                          </td>
                          <td style={styles.td}>
                            {candidate.supervisor ? (
                              <div>
                                <div style={styles.supervisorName}>{candidate.supervisor.full_name}</div>
                                <div style={styles.supervisorEmail}>{candidate.supervisor.email}</div>
                              </div>
                            ) : (
                              <span style={styles.unassignedBadge}>Unassigned</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div style={styles.assessmentBadges}>
                              <span style={{...styles.badge, background: '#E8F5E9', color: '#2E7D32'}}>
                                ✅ {candidate.completedAssessments} completed
                              </span>
                              <span style={{...styles.badge, background: '#E3F2FD', color: '#1565C0'}}>
                                🔓 {candidate.unblockedAssessments} unblocked
                              </span>
                              <span style={{...styles.badge, background: '#FFF3E0', color: '#F57C00'}}>
                                🔒 {candidate.blockedAssessments} blocked
                              </span>
                            </div>
                            {candidate.assessments?.length > 0 && (
                              <button
                                onClick={() => toggleCandidateDetails(candidate.id)}
                                style={styles.viewDetailsButton}
                              >
                                {isExpanded ? '▲ Hide Assessments' : '▼ View Assessments'}
                              </button>
                            )}
                          </td>
                          <td style={styles.td}>
                            {candidate.latestResult ? (
                              <div>
                                <span style={{
                                  ...styles.scoreBadge,
                                  background: percentage >= 85 ? '#E8F5E9' :
                                             percentage >= 70 ? '#E3F2FD' :
                                             percentage >= 55 ? '#FFF3E0' : '#FFEBEE',
                                  color: percentage >= 85 ? '#2E7D32' :
                                         percentage >= 70 ? '#1565C0' :
                                         percentage >= 55 ? '#F57C00' : '#C62828'
                                }}>
                                  {latestScore}/{maxScore} ({percentage}%)
                                </span>
                                <div style={styles.classification}>{classification.label}</div>
                                <div style={styles.completedDate}>
                                  {formatDate(candidate.latestResult.completed_at)}
                                </div>
                              </div>
                            ) : (
                              <span style={styles.noScore}>Not started</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionGroup}>
                              <Link href={`/supervisor/${candidate.id}`} legacyBehavior>
                                <a style={styles.viewButton}>
                                  📄 View Report
                                </a>
                              </Link>
                              <button
                                style={styles.resetPasswordButton}
                                onClick={() => handleResetPassword(candidate.id, candidate.email, candidate.full_name)}
                                disabled={resettingPassword === candidate.id}
                              >
                                {resettingPassword === candidate.id ? '⏳' : '🔑 Reset Password'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Row for Assessments */}
                        {isExpanded && candidate.assessments?.length > 0 && (
                          <tr style={styles.expandedRow}>
                            <td colSpan="6" style={styles.expandedCell}>
                              <div style={styles.expandedContent}>
                                <h4 style={styles.expandedTitle}>Individual Assessments</h4>
                                <div style={styles.assessmentsGrid}>
                                  {candidate.assessments.map((assessment) => {
                                    const result = candidate.results?.find(r => r.assessment_id === assessment.assessment_id);
                                    const isProcessing = processingAssessment?.candidateId === candidate.id && 
                                                        processingAssessment?.assessmentId === assessment.assessment_id;

                                    return (
                                      <div key={assessment.id} style={{
                                        ...styles.assessmentCard,
                                        borderLeftColor: result ? '#4CAF50' : 
                                                       assessment.status === 'unblocked' ? '#2196F3' : '#FF9800'
                                      }}>
                                        <div style={styles.assessmentHeader}>
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
                                          <div style={styles.assessmentDetails}>
                                            <div>Score: {result.total_score}/{result.max_score} 
                                              ({Math.round((result.total_score/result.max_score)*100)}%)
                                            </div>
                                            <div style={styles.assessmentDate}>
                                              Completed: {formatDate(result.completed_at)}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div style={styles.assessmentActions}>
                                          {result ? (
                                            <>
                                              <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} legacyBehavior>
                                                <a style={styles.viewFullReportLink}>View Full Report</a>
                                              </Link>
                                              <button
                                                onClick={() => handleResetAssessment(
                                                  candidate.id,
                                                  assessment.assessment_id,
                                                  assessment.assessments?.title,
                                                  candidate.full_name
                                                )}
                                                disabled={isProcessing}
                                                style={styles.resetButton}
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
                                              style={styles.resetButton}
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
                  })
                )}
              </tbody>
            </table>
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
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  backButtonContainer: {
    marginBottom: '20px'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#0A1929',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#F8FAFC',
      transform: 'translateX(-2px)'
    }
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
    fontSize: '24px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  assignButton: {
    padding: '12px 24px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(10,25,41,0.3)'
    }
  },
  errorMessage: {
    padding: '12px 20px',
    background: '#FFEBEE',
    color: '#C62828',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  successMessage: {
    padding: '12px 20px',
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  filterSection: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchContainer: {
    position: 'relative',
    flex: 2,
    minWidth: '250px'
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
    padding: '12px 12px 12px 36px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    ':focus': {
      borderColor: '#0A1929',
      boxShadow: '0 0 0 3px rgba(10,25,41,0.1)'
    }
  },
  clearButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#999',
    fontSize: '16px'
  },
  filterContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '250px'
  },
  filterIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999',
    fontSize: '16px',
    zIndex: 1
  },
  filterSelect: {
    width: '100%',
    padding: '12px 12px 12px 36px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    ':focus': {
      borderColor: '#0A1929',
      boxShadow: '0 0 0 3px rgba(10,25,41,0.1)'
    }
  },
  filterStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    background: '#E3F2FD',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1565C0'
  },
  clearFiltersButton: {
    background: 'none',
    border: 'none',
    color: '#1565C0',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
    padding: '4px 8px',
    ':hover': {
      color: '#0A1929'
    }
  },
  tableContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '900px'
  },
  tableHeadRow: {
    background: '#F8FAFC',
    borderBottom: '2px solid #0A1929'
  },
  th: {
    textAlign: 'left',
    padding: '15px 20px',
    fontWeight: 600,
    color: '#0A1929'
  },
  td: {
    padding: '15px 20px',
    borderBottom: '1px solid #E2E8F0',
    verticalAlign: 'top'
  },
  tableRow: {
    '&:hover': {
      background: '#F8FAFC'
    }
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    fontStyle: 'italic'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
    background: 'white',
    borderRadius: '16px'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600
  },
  candidateName: {
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '2px'
  },
  candidateId: {
    fontSize: '11px',
    color: '#718096',
    fontFamily: 'monospace'
  },
  contactInfo: {
    fontSize: '13px'
  },
  email: {
    color: '#0A1929',
    marginBottom: '2px'
  },
  phone: {
    fontSize: '11px',
    color: '#718096'
  },
  supervisorName: {
    fontWeight: 500,
    color: '#0A1929',
    marginBottom: '2px'
  },
  supervisorEmail: {
    fontSize: '11px',
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
  assessmentBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    display: 'inline-block'
  },
  viewDetailsButton: {
    background: 'none',
    border: '1px solid #0A1929',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    color: '#0A1929',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#0A1929',
      color: 'white'
    }
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '4px'
  },
  classification: {
    fontSize: '11px',
    color: '#64748B',
    marginTop: '2px'
  },
  completedDate: {
    fontSize: '10px',
    color: '#94A3B8',
    marginTop: '2px'
  },
  noScore: {
    fontSize: '12px',
    color: '#9E9E9E',
    fontStyle: 'italic'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  viewButton: {
    padding: '6px 12px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-block',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)'
    }
  },
  resetPasswordButton: {
    padding: '6px 12px',
    background: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#F57C00',
      transform: 'translateY(-1px)'
    }
  },
  expandedRow: {
    background: '#F8FAFC'
  },
  expandedCell: {
    padding: '20px 30px'
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '15px'
  },
  assessmentCard: {
    borderLeft: '4px solid',
    padding: '15px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  assessmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  assessmentTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  },
  assessmentStatus: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 500
  },
  assessmentDetails: {
    fontSize: '12px',
    color: '#4A5568',
    marginBottom: '12px'
  },
  assessmentDate: {
    fontSize: '10px',
    color: '#94A3B8',
    marginTop: '4px'
  },
  assessmentActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px'
  },
  viewFullReportLink: {
    background: '#0A1929',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '11px',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A'
    }
  },
  resetButton: {
    background: '#2196F3',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1976D2'
    }
  },
  unauthorized: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
    background: 'white',
    borderRadius: '16px',
    maxWidth: '400px',
    margin: '100px auto'
  },
  button: {
    padding: '10px 20px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    marginTop: '20px'
  }
};
