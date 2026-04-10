import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../supabase/client";

export default function ManageCandidate() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showUnblockModal, setShowUnblockModal] = useState(null);
  const [timeExtension, setTimeExtension] = useState(30);
  const [resetFullTime, setResetFullTime] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedAssessments, setSelectedAssessments] = useState([]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession) {
        const userRole = supabaseSession.user?.user_metadata?.role;
        
        if (userRole === 'supervisor' || userRole === 'admin') {
          setCurrentSupervisor({
            id: supabaseSession.user.id,
            email: supabaseSession.user.email,
            name: supabaseSession.user.user_metadata?.full_name || supabaseSession.user.email,
            role: userRole
          });
          return;
        }
      }
      
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
            name: session.full_name || session.email,
            role: session.role
          });
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    };
    
    checkAuth();
  }, [router]);

  // Fetch candidate data
  useEffect(() => {
    if (!user_id || !currentSupervisor) return;
    
    const fetchCandidateData = async () => {
      setLoading(true);
      
      try {
        const isAdmin = currentSupervisor.role === 'admin';
        
        // Fetch candidate profile
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .single();
        
        if (candidateError) throw candidateError;
        
        if (!isAdmin && candidateData.supervisor_id !== currentSupervisor.id) {
          router.push('/supervisor');
          return;
        }
        
        // Fetch supervisor name separately
        let supervisorName = 'Unassigned';
        if (candidateData.supervisor_id) {
          const { data: supData } = await supabase
            .from('supervisor_profiles')
            .select('full_name')
            .eq('id', candidateData.supervisor_id)
            .single();
          if (supData) supervisorName = supData.full_name;
        }
        
        setCandidate({
          ...candidateData,
          supervisor_name: supervisorName
        });
        
        // STEP 1: Fetch assessment results (completed assessments)
        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('id, assessment_id, total_score, max_score, percentage_score, completed_at')
          .eq('user_id', user_id);

        if (resultsError) {
          console.error("Error fetching results:", resultsError);
        }
        
        // Create a map of results by assessment_id
        const resultsMap = {};
        resultsData?.forEach(result => {
          resultsMap[result.assessment_id] = {
            id: result.id,
            score: result.total_score,
            max_score: result.max_score,
            percentage: result.percentage_score,
            completed_at: result.completed_at
          };
        });
        
        // STEP 2: Fetch candidate assessments (assigned assessments) - SIMPLIFIED
        const { data: accessData, error: accessError } = await supabase
          .from('candidate_assessments')
          .select('id, assessment_id, status, created_at, unblocked_at, result_id, time_limit_minutes')
          .eq('user_id', user_id);
        
        if (accessError) {
          console.error("Error fetching access data:", accessError);
        }
        
        // STEP 3: Fetch assessment details for each unique assessment_id
        const uniqueAssessmentIds = [...new Set((accessData || []).map(a => a.assessment_id))];
        const assessmentsMap = {};
        
        for (const assessmentId of uniqueAssessmentIds) {
          const { data: assessmentData } = await supabase
            .from('assessments')
            .select(`
              id,
              title,
              description,
              assessment_type_id,
              assessment_types (
                code,
                name,
                icon,
                gradient_start,
                gradient_end
              )
            `)
            .eq('id', assessmentId)
            .single();
          
          if (assessmentData) {
            assessmentsMap[assessmentId] = assessmentData;
          }
        }
        
        // Combine all data
        const assessmentsWithDetails = (accessData || []).map(access => {
          const result = resultsMap[access.assessment_id] || null;
          const assessment = assessmentsMap[access.assessment_id];
          const typeData = assessment?.assessment_types;
          
          let displayStatus = access.status;
          if (result || access.status === 'completed') {
            displayStatus = 'completed';
          }
          
          return {
            id: access.id,
            assessment_id: access.assessment_id,
            assessment_title: assessment?.title || 'Unknown Assessment',
            assessment_type: typeData?.code || 'general',
            assessment_type_name: typeData?.name || 'General',
            type_icon: typeData?.icon || '📋',
            type_gradient_start: typeData?.gradient_start || '#667eea',
            type_gradient_end: typeData?.gradient_end || '#764ba2',
            status: displayStatus,
            created_at: access.created_at,
            unblocked_at: access.unblocked_at,
            time_limit_minutes: access.time_limit_minutes || 180,
            result: result
          };
        });
        
        // Sort assessments
        assessmentsWithDetails.sort((a, b) => {
          if (a.result && !b.result) return -1;
          if (!a.result && b.result) return 1;
          const dateA = a.result?.completed_at || a.created_at || 0;
          const dateB = b.result?.completed_at || b.created_at || 0;
          return new Date(dateB) - new Date(dateA);
        });
        
        setAssessments(assessmentsWithDetails);
        
      } catch (error) {
        console.error('Error fetching candidate:', error);
        setMessage({ type: 'error', text: 'Failed to load candidate data: ' + error.message });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCandidateData();
  }, [user_id, currentSupervisor, router]);

  // Rest of the handlers remain the same...
  const handleUnblock = async (assessmentId, assessmentTitle) => {
    setProcessingId(assessmentId);
    
    try {
      const response = await fetch('/api/supervisor/unblock-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user_id, 
          assessmentId,
          extendMinutes: resetFullTime ? 0 : timeExtension,
          resetTime: resetFullTime,
          performed_by: currentSupervisor.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        let msg = `✅ "${assessmentTitle}" unblocked successfully. `;
        if (resetFullTime) {
          msg += `Time reset to full 3 hours. `;
        } else if (timeExtension > 0) {
          msg += `Time extended by ${timeExtension} minutes. `;
        }
        msg += result.hasExistingProgress ? 'Candidate can continue where they left off.' : 'Candidate can start a new session.';
        setMessage({ type: 'success', text: msg });
        
        setAssessments(prev => prev.map(a => 
          a.assessment_id === assessmentId ? { ...a, status: 'unblocked' } : a
        ));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unblock assessment: ' + error.message });
    } finally {
      setProcessingId(null);
      setShowUnblockModal(null);
      setTimeExtension(30);
      setResetFullTime(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleReset = async (assessmentId, assessmentTitle) => {
    if (!confirm(`⚠️ Reset "${assessmentTitle}" for ${candidate?.full_name}?\n\nThis will DELETE all progress. The candidate will have to start over.`)) {
      return;
    }
    
    setProcessingId(assessmentId);
    
    try {
      await supabase.from('responses').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      await supabase.from('assessment_sessions').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      await supabase.from('assessment_results').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      await supabase.from('assessment_progress').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      
      await supabase
        .from('candidate_assessments')
        .update({ status: 'blocked', unblocked_at: null, result_id: null })
        .eq('user_id', user_id)
        .eq('assessment_id', assessmentId);
      
      setMessage({ type: 'success', text: `✅ "${assessmentTitle}" reset successfully. It is now blocked.` });
      
      setAssessments(prev => prev.map(a => 
        a.assessment_id === assessmentId ? { ...a, status: 'blocked', result: null } : a
      ));
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset assessment: ' + error.message });
    } finally {
      setProcessingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBlock = async (assessmentId, assessmentTitle) => {
    if (!confirm(`Block "${assessmentTitle}" for ${candidate?.full_name}?`)) return;
    
    setProcessingId(assessmentId);
    
    try {
      await supabase
        .from('candidate_assessments')
        .update({ status: 'blocked' })
        .eq('user_id', user_id)
        .eq('assessment_id', assessmentId);
      
      setMessage({ type: 'success', text: `🔒 "${assessmentTitle}" blocked successfully.` });
      setAssessments(prev => prev.map(a => 
        a.assessment_id === assessmentId ? { ...a, status: 'blocked' } : a
      ));
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to block assessment: ' + error.message });
    } finally {
      setProcessingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const toggleSelectAssessment = (assessmentId) => {
    setSelectedAssessments(prev => 
      prev.includes(assessmentId) 
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    );
  };

  const selectAll = () => {
    const allIds = assessments.map(a => a.assessment_id);
    setSelectedAssessments(allIds);
  };

  const clearSelection = () => {
    setSelectedAssessments([]);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const completedCount = assessments.filter(a => a.status === 'completed' || a.result !== null).length;
  const unblockedCount = assessments.filter(a => a.status === 'unblocked' && !a.result).length;
  const blockedCount = assessments.filter(a => a.status === 'blocked' && !a.result).length;

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading candidate information...</p>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>👤</div>
          <h2>Candidate Not Found</h2>
          <p>The candidate you're looking for doesn't exist or you don't have access.</p>
          <Link href="/supervisor" style={styles.primaryButton}>
            ← Back to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <Link href="/supervisor" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <Link href={`/supervisor/${candidate.id}`} style={styles.viewReportButton}>
              📄 View Full Report
            </Link>
          </div>
          
          <div style={styles.candidateInfo}>
            <div style={styles.avatar}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 style={styles.title}>{candidate.full_name || 'Unnamed Candidate'}</h1>
              <p style={styles.email}>{candidate.email}</p>
              {candidate.phone && <p style={styles.phone}>📞 {candidate.phone}</p>}
              <p style={styles.supervisor}>
                👤 Supervisor: {candidate.supervisor_name || 'Unassigned'}
              </p>
              <p style={styles.joined}>📅 Joined: {formatDate(candidate.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, background: 'linear-gradient(135deg, #0A1929, #1A2A3A)'}}>
            <span style={styles.statIcon}>📋</span>
            <div>
              <div style={styles.statLabel}>Total Assessments</div>
              <div style={styles.statValue}>{assessments.length}</div>
            </div>
          </div>
          <div style={{...styles.statCard, background: '#E8F5E9'}}>
            <span style={styles.statIcon}>✅</span>
            <div>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{completedCount}</div>
            </div>
          </div>
          <div style={{...styles.statCard, background: '#E3F2FD'}}>
            <span style={styles.statIcon}>🔓</span>
            <div>
              <div style={styles.statLabel}>Unblocked</div>
              <div style={styles.statValue}>{unblockedCount}</div>
            </div>
          </div>
          <div style={{...styles.statCard, background: '#FFF3E0'}}>
            <span style={styles.statIcon}>🔒</span>
            <div>
              <div style={styles.statLabel}>Blocked</div>
              <div style={styles.statValue}>{blockedCount}</div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {assessments.length > 0 && (
          <div style={styles.bulkBar}>
            <div style={styles.bulkLeft}>
              <input
                type="checkbox"
                checked={selectedAssessments.length === assessments.length && assessments.length > 0}
                onChange={selectAll}
                style={styles.bulkCheckbox}
              />
              <span style={styles.bulkCount}>{selectedAssessments.length} selected</span>
            </div>
            <div style={styles.bulkRight}>
              <button onClick={clearSelection} style={styles.bulkClearButton}>Clear</button>
            </div>
          </div>
        )}

        {/* Assessments Table */}
        <div style={styles.assessmentsSection}>
          <h2 style={styles.sectionTitle}>Assessments</h2>
          
          {assessments.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No assessments assigned to this candidate yet.</p>
              <Link href={`/supervisor/assign-assessment/${candidate.id}`} style={styles.assignLink}>
                + Assign Assessment
              </Link>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.checkboxCell}></th>
                    <th style={styles.tableHead}>Assessment</th>
                    <th style={styles.tableHead}>Status</th>
                    <th style={styles.tableHead}>Score</th>
                    <th style={styles.tableHead}>Classification</th>
                    <th style={styles.tableHead}>Completed Date</th>
                    <th style={styles.tableHead}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => {
                    const isSelected = selectedAssessments.includes(assessment.assessment_id);
                    const isProcessing = processingId === assessment.assessment_id;
                    const classification = assessment.result ? getClassification(assessment.result.score, assessment.result.max_score) : null;
                    const scorePercentage = assessment.result ? Math.round((assessment.result.score / assessment.result.max_score) * 100) : 0;
                    
                    return (
                      <tr key={assessment.id} style={styles.tableRow}>
                        <td style={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectAssessment(assessment.assessment_id)}
                            disabled={assessment.result !== null}
                            style={styles.checkbox}
                          />
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.assessmentInfo}>
                            <div style={{
                              ...styles.assessmentIcon,
                              background: `linear-gradient(135deg, ${assessment.type_gradient_start}, ${assessment.type_gradient_end})`
                            }}>
                              {assessment.type_icon}
                            </div>
                            <div>
                              <div style={styles.assessmentTitle}>{assessment.assessment_title}</div>
                              <div style={styles.assessmentType}>{assessment.assessment_type_name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            background: assessment.status === 'completed' ? '#E8F5E9' :
                                       assessment.status === 'unblocked' ? '#E3F2FD' : '#FFF3E0',
                            color: assessment.status === 'completed' ? '#2E7D32' :
                                   assessment.status === 'unblocked' ? '#1565C0' : '#F57C00'
                          }}>
                            {assessment.status === 'completed' ? '✓ Completed' : 
                             assessment.status === 'unblocked' ? '🔓 Ready' : '🔒 Blocked'}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          {assessment.result ? (
                            <strong>{assessment.result.score}/{assessment.result.max_score} ({scorePercentage}%)</strong>
                          ) : (
                            <span style={styles.notStarted}>—</span>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          {classification ? (
                            <span style={{
                              ...styles.classBadge,
                              color: classification.color,
                              background: `${classification.color}15`
                            }}>
                              {classification.label}
                            </span>
                          ) : (
                            <span style={styles.notStarted}>—</span>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          {assessment.result ? (
                            <span style={styles.completedDate}>{formatDate(assessment.result.completed_at)}</span>
                          ) : (
                            <span style={styles.notStarted}>—</span>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.actionButtons}>
                            {assessment.result ? (
                              <>
                                <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} legacyBehavior>
                                  <a style={styles.viewReportButtonSmall}>📄 Report</a>
                                </Link>
                                <button
                                  onClick={() => handleReset(assessment.assessment_id, assessment.assessment_title)}
                                  disabled={isProcessing}
                                  style={styles.resetBtn}
                                >
                                  {isProcessing ? '⏳' : '🔄 Reset'}
                                </button>
                              </>
                            ) : assessment.status === 'blocked' ? (
                              <button
                                onClick={() => setShowUnblockModal({
                                  assessmentId: assessment.assessment_id,
                                  assessmentTitle: assessment.assessment_title
                                })}
                                disabled={isProcessing}
                                style={styles.unblockBtn}
                              >
                                {isProcessing ? '⏳' : '🔓 Unblock'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlock(assessment.assessment_id, assessment.assessment_title)}
                                disabled={isProcessing}
                                style={styles.blockBtn}
                              >
                                {isProcessing ? '⏳' : '🔒 Block'}
                              </button>
                            )}
                          </div>
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

      {/* Unblock Modal */}
      {showUnblockModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>🔓</span>
              <h3>Unblock Assessment</h3>
              <button onClick={() => setShowUnblockModal(null)} style={styles.closeButton}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
              <p><strong>Candidate:</strong> {candidate.full_name}</p>
              <p><strong>Assessment:</strong> {showUnblockModal.assessmentTitle}</p>
              
              <div style={styles.timeOptions}>
                <h4>⏰ Time Options</h4>
                
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={!resetFullTime && timeExtension === 30}
                    onChange={() => {
                      setResetFullTime(false);
                      setTimeExtension(30);
                    }}
                  />
                  <div>
                    <strong>Extend by 30 minutes</strong>
                    <span>Add 30 minutes to remaining time</span>
                  </div>
                </label>
                
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={!resetFullTime && timeExtension === 60}
                    onChange={() => {
                      setResetFullTime(false);
                      setTimeExtension(60);
                    }}
                  />
                  <div>
                    <strong>Extend by 60 minutes</strong>
                    <span>Add 60 minutes to remaining time</span>
                  </div>
                </label>
                
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={!resetFullTime && timeExtension === 120}
                    onChange={() => {
                      setResetFullTime(false);
                      setTimeExtension(120);
                    }}
                  />
                  <div>
                    <strong>Extend by 120 minutes</strong>
                    <span>Add 120 minutes to remaining time</span>
                  </div>
                </label>
                
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={resetFullTime}
                    onChange={() => setResetFullTime(true)}
                  />
                  <div>
                    <strong>Reset to full time (3 hours)</strong>
                    <span>Reset timer to 3 hours from now</span>
                  </div>
                </label>
                
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={!resetFullTime && timeExtension === 0}
                    onChange={() => {
                      setResetFullTime(false);
                      setTimeExtension(0);
                    }}
                  />
                  <div>
                    <strong>No time change</strong>
                    <span>Just unblock without changing time</span>
                  </div>
                </label>
              </div>
              
              <div style={styles.noteBox}>
                <span>💡</span>
                <span>Candidate will resume from where they left off. Their existing answers will be preserved.</span>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button onClick={() => setShowUnblockModal(null)} style={styles.cancelButton}>Cancel</button>
              <button 
                onClick={() => handleUnblock(showUnblockModal.assessmentId, showUnblockModal.assessmentTitle)}
                disabled={processingId === showUnblockModal.assessmentId}
                style={styles.confirmButton}
              >
                {processingId === showUnblockModal.assessmentId ? 'Processing...' : 'Unblock Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    margin: '40px auto',
    maxWidth: '500px'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 24px',
    background: '#0A1929',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  viewReportButton: {
    background: '#0A1929',
    color: 'white',
    textDecoration: 'none',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    background: 'linear-gradient(135deg, #0A1929, #1A2A3A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: 600
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929',
    margin: '0 0 4px 0'
  },
  email: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0'
  },
  phone: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0'
  },
  supervisor: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '4px 0'
  },
  joined: {
    fontSize: '12px',
    color: '#cbd5e1',
    margin: '4px 0'
  },
  successMessage: {
    padding: '12px 20px',
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  errorMessage: {
    padding: '12px 20px',
    background: '#FFEBEE',
    color: '#C62828',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '30px'
  },
  statCard: {
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  statIcon: {
    fontSize: '32px'
  },
  statLabel: {
    fontSize: '12px',
    opacity: 0.8,
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929'
  },
  bulkBar: {
    background: '#F8FAFC',
    borderRadius: '12px',
    padding: '12px 20px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    border: '1px solid #E2E8F0'
  },
  bulkLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  bulkCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  bulkCount: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#0A1929'
  },
  bulkRight: {
    display: 'flex',
    gap: '10px'
  },
  bulkClearButton: {
    padding: '6px 16px',
    background: '#F1F5F9',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  assessmentsSection: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 20px 0'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #E2E8F0',
    background: '#F8FAFC'
  },
  tableHead: {
    padding: '15px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left'
  },
  checkboxCell: {
    width: '40px',
    padding: '12px',
    textAlign: 'center'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background 0.2s'
  },
  tableCell: {
    padding: '12px',
    verticalAlign: 'middle'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  assessmentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  assessmentIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: 'white'
  },
  assessmentTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '2px'
  },
  assessmentType: {
    fontSize: '11px',
    color: '#64748B'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block'
  },
  notStarted: {
    color: '#94A3B8',
    fontStyle: 'italic'
  },
  classBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    display: 'inline-block'
  },
  completedDate: {
    fontSize: '12px',
    color: '#475569'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  viewReportButtonSmall: {
    background: '#0A1929',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '11px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  unblockBtn: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  blockBtn: {
    background: '#FF9800',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  resetBtn: {
    background: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b'
  },
  assignLink: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 24px',
    background: '#0A1929',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(5px)'
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc'
  },
  modalIcon: {
    fontSize: '28px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '8px'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  timeOptions: {
    marginTop: '20px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    marginBottom: '8px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  noteBox: {
    marginTop: '20px',
    padding: '12px',
    background: '#e3f2fd',
    borderRadius: '8px',
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#1565c0'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    color: '#475569',
    transition: 'all 0.2s'
  },
  confirmButton: {
    padding: '10px 24px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
