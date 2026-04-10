import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function BatchManageAssessments() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  
  // Data states
  const [assessments, setAssessments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateAssessments, setCandidateAssessments] = useState([]);
  
  // Selection states
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionType, setActionType] = useState("unblock");
  
  // Time extension options (for unblock)
  const [timeExtension, setTimeExtension] = useState(30);
  const [resetFullTime, setResetFullTime] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  
  // UI state
  const [message, setMessage] = useState({ type: "", text: "" });

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

  // Fetch data
  useEffect(() => {
    if (!currentSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all active assessments
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('assessments')
          .select(`
            id,
            title,
            description,
            assessment_type_id,
            assessment_types (
              id,
              code,
              name,
              icon,
              gradient_start,
              gradient_end
            )
          `)
          .eq('is_active', true)
          .order('title');

        if (assessmentsError) throw assessmentsError;
        setAssessments(assessmentsData || []);

        // Fetch candidates assigned to this supervisor
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
          .order('full_name', { ascending: true });

        if (candidatesError) throw candidatesError;
        setCandidates(candidatesData || []);

        // Fetch all candidate_assessments for these candidates
        if (candidatesData && candidatesData.length > 0) {
          const candidateIds = candidatesData.map(c => c.id);
          const { data: caData, error: caError } = await supabase
            .from('candidate_assessments')
            .select(`
              id,
              user_id,
              assessment_id,
              status,
              score,
              completed_at,
              unblocked_at,
              unblocked_by,
              created_at,
              result_id
            `)
            .in('user_id', candidateIds);

          if (caError) throw caError;
          setCandidateAssessments(caData || []);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setMessage({ type: "error", text: error.message });
        setLoading(false);
      }
    };

    fetchData();
  }, [currentSupervisor]);

  // Get status for a specific candidate and assessment
  const getStatus = (candidateId, assessmentId) => {
    const record = candidateAssessments.find(
      ca => ca.user_id === candidateId && ca.assessment_id === assessmentId
    );
    
    if (!record) return "not_assigned";
    if (record.status === "completed" || record.result_id) return "completed";
    if (record.status === "unblocked") return "unblocked";
    return "blocked";
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    switch(status) {
      case "unblocked":
        return { text: "✅ Ready", color: "#2E7D32", bg: "#E8F5E9" };
      case "blocked":
        return { text: "🔒 Blocked", color: "#F57C00", bg: "#FFF3E0" };
      case "completed":
        return { text: "✓ Completed", color: "#1565C0", bg: "#E3F2FD" };
      default:
        return { text: "❌ Not Assigned", color: "#9E9E9E", bg: "#F5F5F5" };
    }
  };

  // Toggle candidate selection
  const toggleCandidate = (candidateId) => {
    const newSet = new Set(selectedCandidates);
    if (newSet.has(candidateId)) {
      newSet.delete(candidateId);
    } else {
      newSet.add(candidateId);
    }
    setSelectedCandidates(newSet);
  };

  // Select all filtered candidates
  const selectAll = () => {
    const newSet = new Set();
    filteredCandidates.forEach(c => newSet.add(c.id));
    setSelectedCandidates(newSet);
  };

  // Select only candidates with specific status
  const selectByStatus = (status) => {
    const newSet = new Set();
    filteredCandidates.forEach(candidate => {
      if (selectedAssessment && getStatus(candidate.id, selectedAssessment.id) === status) {
        newSet.add(candidate.id);
      }
    });
    setSelectedCandidates(newSet);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedCandidates(new Set());
  };

  // Execute action on selected candidates
  const executeAction = async () => {
    if (!selectedAssessment) {
      setMessage({ type: "error", text: "Please select an assessment first" });
      return;
    }

    if (selectedCandidates.size === 0) {
      setMessage({ type: "error", text: "Please select at least one candidate" });
      return;
    }

    let actionText = "";
    if (actionType === "assign_unblock") actionText = "ASSIGN & UNBLOCK";
    else if (actionType === "unblock") actionText = "UNBLOCK";
    else actionText = "BLOCK";
    
    const confirmMessage = `Are you sure you want to ${actionText} "${selectedAssessment.title}" for ${selectedCandidates.size} candidate(s)?`;
    
    if (!confirm(confirmMessage)) return;

    setProcessing(true);
    setMessage({ type: "", text: "" });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const candidateId of selectedCandidates) {
      try {
        const existing = candidateAssessments.find(
          ca => ca.user_id === candidateId && ca.assessment_id === selectedAssessment.id
        );

        if (actionType === "assign_unblock") {
          // Assign and unblock (create if not exists, or update to unblocked)
          if (existing) {
            // Update existing to unblocked
            const { error } = await supabase
              .from('candidate_assessments')
              .update({
                status: 'unblocked',
                unblocked_by: currentSupervisor.id,
                unblocked_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            
            if (error) throw error;
          } else {
            // Create new record
            const { error } = await supabase
              .from('candidate_assessments')
              .insert({
                user_id: candidateId,
                assessment_id: selectedAssessment.id,
                status: 'unblocked',
                unblocked_by: currentSupervisor.id,
                unblocked_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
            
            if (error) throw error;
          }
          successCount++;
        } 
        else if (actionType === "unblock") {
          // Just unblock (must exist)
          if (existing) {
            const { error } = await supabase
              .from('candidate_assessments')
              .update({
                status: 'unblocked',
                unblocked_by: currentSupervisor.id,
                unblocked_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            
            if (error) throw error;
            successCount++;
          } else {
            errorCount++;
            errors.push(`Candidate not assigned`);
          }
        } 
        else if (actionType === "block") {
          // Block access
          if (existing) {
            const { error } = await supabase
              .from('candidate_assessments')
              .update({
                status: 'blocked',
                unblocked_by: null,
                unblocked_at: null
              })
              .eq('id', existing.id);
            
            if (error) throw error;
            successCount++;
          } else {
            // Create blocked record
            const { error } = await supabase
              .from('candidate_assessments')
              .insert({
                user_id: candidateId,
                assessment_id: selectedAssessment.id,
                status: 'blocked',
                created_at: new Date().toISOString()
              });
            
            if (error) throw error;
            successCount++;
          }
        }
      } catch (error) {
        console.error("Error processing candidate:", error);
        errorCount++;
        errors.push(error.message);
      }
    }

    // Refresh data
    const candidateIds = candidates.map(c => c.id);
    const { data: caData } = await supabase
      .from('candidate_assessments')
      .select(`
        id,
        user_id,
        assessment_id,
        status,
        score,
        completed_at,
        unblocked_at,
        unblocked_by,
        created_at,
        result_id
      `)
      .in('user_id', candidateIds);
    setCandidateAssessments(caData || []);

    setSelectedCandidates(new Set());
    
    let messageText = `✅ ${successCount} successful`;
    if (errorCount > 0) {
      messageText += `, ❌ ${errorCount} failed`;
    }
    if (errors.length > 0 && errors.length <= 2) {
      messageText += `\n\nDetails: ${errors.join(', ')}`;
    }
    
    setMessage({ 
      type: successCount > 0 ? "success" : "error", 
      text: messageText 
    });

    setProcessing(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  // Filter candidates by search term and status
  const filteredCandidates = candidates.filter(candidate => {
    // Search filter
    const matchesSearch = searchTerm === "" || 
      candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter !== "all" && selectedAssessment) {
      const status = getStatus(candidate.id, selectedAssessment.id);
      matchesStatus = status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading assessment manager...</p>
        </div>
      </AppLayout>
    );
  }

  const assessmentColors = (assessment) => {
    const type = assessment?.assessment_types;
    return {
      gradient: `linear-gradient(135deg, ${type?.gradient_start || '#667eea'}, ${type?.gradient_end || '#764ba2'})`,
      color: type?.gradient_start || '#667eea'
    };
  };

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <Link href="/supervisor" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>📋 Batch Assessment Manager</h1>
            <div style={styles.headerRight}>
              <span style={styles.supervisorBadge}>
                👑 {currentSupervisor?.name}
              </span>
            </div>
          </div>
          <p style={styles.subtitle}>Assign, unblock, or block assessments for multiple candidates at once</p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === "success" ? "#E8F5E9" : "#FFEBEE",
            color: message.type === "success" ? "#2E7D32" : "#C62828",
            border: `1px solid ${message.type === "success" ? "#A5D6A7" : "#FFCD2D"}`
          }}>
            {message.text}
          </div>
        )}

        {/* Step 1: Select Assessment */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Select Assessment</h2>
          <div style={styles.assessmentGrid}>
            {assessments.map(assessment => {
              const isSelected = selectedAssessment?.id === assessment.id;
              const colors = assessmentColors(assessment);
              
              return (
                <button
                  key={assessment.id}
                  onClick={() => {
                    setSelectedAssessment(assessment);
                    setSelectedCandidates(new Set());
                    setMessage({ type: "", text: "" });
                  }}
                  style={{
                    ...styles.assessmentCard,
                    background: isSelected ? colors.gradient : 'white',
                    border: isSelected ? 'none' : `2px solid ${colors.color}40`,
                    color: isSelected ? 'white' : '#333',
                    boxShadow: isSelected ? '0 8px 20px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  <span style={styles.assessmentIcon}>{assessment.assessment_types?.icon || '📋'}</span>
                  <div>
                    <div style={styles.assessmentTitle}>{assessment.title}</div>
                    <div style={{
                      ...styles.assessmentType,
                      color: isSelected ? 'rgba(255,255,255,0.8)' : colors.color
                    }}>
                      {assessment.assessment_types?.name || 'Assessment'}
                    </div>
                  </div>
                  {isSelected && <span style={styles.checkmark}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Choose Action */}
        {selectedAssessment && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Choose Action</h2>
            <div style={styles.actionGrid}>
              <button
                onClick={() => {
                  setActionType("assign_unblock");
                  setShowTimeOptions(false);
                }}
                style={{
                  ...styles.actionCard,
                  background: actionType === "assign_unblock" ? '#E8F5E9' : 'white',
                  border: actionType === "assign_unblock" ? '2px solid #4CAF50' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>📝</span>
                <div>
                  <div style={styles.actionTitle}>Assign & Unblock</div>
                  <div style={styles.actionDesc}>Give access to take assessment (creates new if not exists)</div>
                </div>
                {actionType === "assign_unblock" && <span style={styles.checkmark}>✓</span>}
              </button>

              <button
                onClick={() => {
                  setActionType("unblock");
                  setShowTimeOptions(true);
                }}
                style={{
                  ...styles.actionCard,
                  background: actionType === "unblock" ? '#E3F2FD' : 'white',
                  border: actionType === "unblock" ? '2px solid #2196F3' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>🔓</span>
                <div>
                  <div style={styles.actionTitle}>Unblock</div>
                  <div style={styles.actionDesc}>Unblock existing assessments</div>
                </div>
                {actionType === "unblock" && <span style={styles.checkmark}>✓</span>}
              </button>

              <button
                onClick={() => {
                  setActionType("block");
                  setShowTimeOptions(false);
                }}
                style={{
                  ...styles.actionCard,
                  background: actionType === "block" ? '#FFEBEE' : 'white',
                  border: actionType === "block" ? '2px solid #F44336' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>🔒</span>
                <div>
                  <div style={styles.actionTitle}>Block</div>
                  <div style={styles.actionDesc}>Block access to assessment</div>
                </div>
                {actionType === "block" && <span style={styles.checkmark}>✓</span>}
              </button>
            </div>

            {/* Time Options (for unblock action) */}
            {showTimeOptions && (
              <div style={styles.timeOptionsSection}>
                <h4 style={styles.timeTitle}>⏰ Time Options (for unblock)</h4>
                <div style={styles.timeGrid}>
                  <label style={styles.timeOption}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 30}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(30);
                      }}
                    />
                    <span>Extend by 30 minutes</span>
                  </label>
                  <label style={styles.timeOption}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 60}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(60);
                      }}
                    />
                    <span>Extend by 60 minutes</span>
                  </label>
                  <label style={styles.timeOption}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 120}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(120);
                      }}
                    />
                    <span>Extend by 120 minutes</span>
                  </label>
                  <label style={styles.timeOption}>
                    <input
                      type="radio"
                      checked={resetFullTime}
                      onChange={() => setResetFullTime(true)}
                    />
                    <span>Reset to full time (3 hours)</span>
                  </label>
                  <label style={styles.timeOption}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 0}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(0);
                      }}
                    />
                    <span>No time change</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Candidates */}
        {selectedAssessment && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              3. Select Candidates for "{selectedAssessment.title}"
            </h2>
            
            {/* Filters */}
            <div style={styles.filtersBar}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="unblocked">Ready</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="not_assigned">Not Assigned</option>
              </select>
              <button onClick={selectAll} style={styles.selectAllButton}>Select All</button>
              <button onClick={clearAll} style={styles.clearButton}>Clear All</button>
            </div>

            {/* Quick Select by Status */}
            <div style={styles.quickSelectBar}>
              <span style={styles.quickSelectLabel}>Quick select:</span>
              <button onClick={() => selectByStatus("not_assigned")} style={styles.quickSelectBtn}>Not Assigned</button>
              <button onClick={() => selectByStatus("blocked")} style={styles.quickSelectBtn}>Blocked</button>
              <button onClick={() => selectByStatus("unblocked")} style={styles.quickSelectBtn}>Ready</button>
              <button onClick={() => selectByStatus("completed")} style={styles.quickSelectBtn}>Completed</button>
            </div>

            {/* Candidates Table */}
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.checkboxCell}></th>
                    <th style={styles.tableHead}>Candidate</th>
                    <th style={styles.tableHead}>Email</th>
                    <th style={styles.tableHead}>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={styles.emptyCell}>
                        No candidates found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map(candidate => {
                      const status = getStatus(candidate.id, selectedAssessment.id);
                      const statusBadge = getStatusBadge(status);
                      const isSelected = selectedCandidates.has(candidate.id);
                      
                      return (
                        <tr key={candidate.id} style={styles.tableRow}>
                          <td style={styles.checkboxCell}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCandidate(candidate.id)}
                              style={styles.checkbox}
                            />
                          </td>
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
                          <td style={styles.tableCell}>{candidate.email}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusBadge,
                              background: statusBadge.bg,
                              color: statusBadge.color
                            }}>
                              {statusBadge.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected Count & Action Button */}
            <div style={styles.actionBar}>
              <div style={styles.selectedCount}>
                {selectedCandidates.size} candidate(s) selected
              </div>
              <button
                onClick={executeAction}
                disabled={processing || selectedCandidates.size === 0}
                style={{
                  ...styles.executeButton,
                  opacity: processing || selectedCandidates.size === 0 ? 0.6 : 1,
                  cursor: processing || selectedCandidates.size === 0 ? 'not-allowed' : 'pointer',
                  background: actionType === 'assign_unblock' ? '#4CAF50' :
                             actionType === 'unblock' ? '#2196F3' : '#F44336'
                }}
              >
                {processing ? 'Processing...' : 
                  actionType === 'assign_unblock' ? '📝 Assign & Unblock Selected' :
                  actionType === 'unblock' ? '🔓 Unblock Selected' : '🔒 Block Selected'}
              </button>
            </div>
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
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    marginBottom: '30px'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #E2E8F0',
    transition: 'all 0.2s'
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0A1929',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  supervisorBadge: {
    padding: '8px 16px',
    background: '#E3F2FD',
    color: '#1565C0',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0
  },
  message: {
    padding: '15px 20px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 500,
    whiteSpace: 'pre-line'
  },
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '20px'
  },
  assessmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px'
  },
  assessmentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    position: 'relative'
  },
  assessmentIcon: {
    fontSize: '28px'
  },
  assessmentTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '4px'
  },
  assessmentType: {
    fontSize: '12px',
    opacity: 0.8
  },
  checkmark: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px'
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    position: 'relative'
  },
  actionIcon: {
    fontSize: '32px'
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px'
  },
  actionDesc: {
    fontSize: '12px',
    color: '#64748B'
  },
  timeOptionsSection: {
    marginTop: '20px',
    padding: '20px',
    background: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  timeTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 15px 0'
  },
  timeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px'
  },
  timeOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  filtersBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  },
  filterSelect: {
    padding: '10px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer'
  },
  selectAllButton: {
    padding: '10px 20px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  clearButton: {
    padding: '10px 20px',
    background: '#F1F5F9',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  quickSelectBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    padding: '10px',
    background: '#F8FAFC',
    borderRadius: '8px',
    flexWrap: 'wrap'
  },
  quickSelectLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748B'
  },
  quickSelectBtn: {
    padding: '4px 12px',
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    background: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0'
  },
  tableHead: {
    padding: '15px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left'
  },
  checkboxCell: {
    width: '50px',
    padding: '15px',
    textAlign: 'center'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background 0.2s'
  },
  tableCell: {
    padding: '15px'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#94A3B8'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  candidateAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '18px',
    background: '#E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929'
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
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block'
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #E2E8F0'
  },
  selectedCount: {
    fontSize: '14px',
    color: '#475569',
    fontWeight: 500
  },
  executeButton: {
    padding: '12px 30px',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
