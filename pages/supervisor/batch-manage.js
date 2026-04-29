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
  
  // Scheduling options
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [minDateTime, setMinDateTime] = useState('');
  const [sendingNotifications, setSendingNotifications] = useState(false);
  
  // UI state
  const [message, setMessage] = useState({ type: "", text: "" });

  // Set minimum date/time for scheduling (can't schedule in the past)
  useEffect(() => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setMinDateTime(localNow.toISOString().slice(0, 16));
  }, []);

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
              result_id,
              is_scheduled,
              scheduled_start,
              scheduled_end
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

  const getStatus = (candidateId, assessmentId) => {
    const record = candidateAssessments.find(
      ca => ca.user_id === candidateId && ca.assessment_id === assessmentId
    );
    
    if (!record) return "not_assigned";
    if (record.status === "completed" || record.result_id) return "completed";
    if (record.status === "unblocked") return "unblocked";
    if (record.status === "scheduled") return "scheduled";
    return "blocked";
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "unblocked":
        return { text: "Ready", color: "#2E7D32", bg: "#E8F5E9" };
      case "blocked":
        return { text: "Blocked", color: "#F57C00", bg: "#FFF3E0" };
      case "completed":
        return { text: "Completed", color: "#1565C0", bg: "#E3F2FD" };
      case "scheduled":
        return { text: "Scheduled", color: "#6A1B9A", bg: "#F3E5F5" };
      default:
        return { text: "Not Assigned", color: "#9E9E9E", bg: "#F5F5F5" };
    }
  };

  const getAssessmentColors = (assessmentTypeCode) => {
    const colors = {
      'leadership': { gradient_start: '#7c3aed', gradient_end: '#5b21b6' },
      'cognitive': { gradient_start: '#0891b2', gradient_end: '#0e7490' },
      'technical': { gradient_start: '#dc2626', gradient_end: '#991b1b' },
      'personality': { gradient_start: '#0d9488', gradient_end: '#115e59' },
      'performance': { gradient_start: '#ea580c', gradient_end: '#c2410c' },
      'behavioral': { gradient_start: '#9333ea', gradient_end: '#6b21a5' },
      'cultural': { gradient_start: '#059669', gradient_end: '#047857' },
      'general': { gradient_start: '#607D8B', gradient_end: '#455A64' },
      'strategic_leadership': { gradient_start: '#1E3A8A', gradient_end: '#5B21B6' },
      'manufacturing_baseline': { gradient_start: '#2E7D32', gradient_end: '#1B5E20' }
    };
    return colors[assessmentTypeCode] || colors.general;
  };

  const toggleCandidate = (candidateId) => {
    const newSet = new Set(selectedCandidates);
    if (newSet.has(candidateId)) {
      newSet.delete(candidateId);
    } else {
      newSet.add(candidateId);
    }
    setSelectedCandidates(newSet);
  };

  const selectAll = () => {
    const newSet = new Set();
    filteredCandidates.forEach(c => newSet.add(c.id));
    setSelectedCandidates(newSet);
  };

  const selectByStatus = (status) => {
    const newSet = new Set();
    filteredCandidates.forEach(candidate => {
      if (selectedAssessment && getStatus(candidate.id, selectedAssessment.id) === status) {
        newSet.add(candidate.id);
      }
    });
    setSelectedCandidates(newSet);
  };

  const clearAll = () => {
    setSelectedCandidates(new Set());
  };

  const saveNotificationToDatabase = async (candidate, assessmentTitle, scheduledStart, scheduledEnd) => {
    try {
      const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const startFormatted = formatDateTime(scheduledStart);
      const endFormatted = formatDateTime(scheduledEnd);

      const { error } = await supabase
        .from('candidate_notifications')
        .insert({
          candidate_id: candidate.id,
          assessment_id: selectedAssessment.id,
          type: 'assessment_scheduled',
          title: 'New Assessment Scheduled',
          message: `Your assessment "${assessmentTitle}" has been scheduled. Available from ${startFormatted} to ${endFormatted}. Please log in to take it during this time window.`,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          created_at: new Date().toISOString(),
          is_read: false
        });

      if (error) {
        console.error('Failed to save notification:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error saving notification:', error);
      return false;
    }
  };

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
    else if (actionType === "schedule") actionText = "SCHEDULE";
    else actionText = "BLOCK";
    
    const confirmMessage = `Are you sure you want to ${actionText} "${selectedAssessment.title}" for ${selectedCandidates.size} candidate(s)?`;
    
    if (!confirm(confirmMessage)) return;

    setProcessing(true);
    setMessage({ type: "", text: "" });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const notifiedCandidates = [];

    for (const candidateId of selectedCandidates) {
      try {
        const candidate = candidates.find(c => c.id === candidateId);
        const existing = candidateAssessments.find(
          ca => ca.user_id === candidateId && ca.assessment_id === selectedAssessment.id
        );

        if (actionType === "assign_unblock") {
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
          } else {
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
        else if (actionType === "schedule") {
          if (!enableScheduling || !scheduledStart || !scheduledEnd) {
            throw new Error("Please set start and end times for scheduling");
          }
          
          const assessmentData = {
            user_id: candidateId,
            assessment_id: selectedAssessment.id,
            status: 'scheduled',
            is_scheduled: true,
            scheduled_start: new Date(scheduledStart).toISOString(),
            scheduled_end: new Date(scheduledEnd).toISOString(),
            scheduled_by: currentSupervisor.id,
            scheduled_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          };
          
          if (existing) {
            const { error } = await supabase
              .from('candidate_assessments')
              .update(assessmentData)
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('candidate_assessments')
              .insert(assessmentData);
            if (error) throw error;
          }
          successCount++;
          
          if (candidate) {
            notifiedCandidates.push(candidate);
          }
        }
        else if (actionType === "unblock") {
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
        result_id,
        is_scheduled,
        scheduled_start,
        scheduled_end
      `)
      .in('user_id', candidateIds);
    setCandidateAssessments(caData || []);

    // Send notifications to scheduled candidates
    let notificationCount = 0;
    if (actionType === "schedule" && notifiedCandidates.length > 0) {
      setSendingNotifications(true);
      
      for (const candidate of notifiedCandidates) {
        const saved = await saveNotificationToDatabase(
          candidate,
          selectedAssessment.title,
          scheduledStart,
          scheduledEnd
        );
        if (saved) notificationCount++;
      }
      
      setSendingNotifications(false);
    }

    setSelectedCandidates(new Set());
    
    let messageText = `✅ ${successCount} successful`;
    if (errorCount > 0) {
      messageText += `, ❌ ${errorCount} failed`;
    }
    if (errors.length > 0 && errors.length <= 2) {
      messageText += `\n\nDetails: ${errors.join(', ')}`;
    }
    if (actionType === "schedule" && notificationCount > 0) {
      messageText += `\n\n📢 Notifications sent to ${notificationCount} candidate(s). They will see an alert in their dashboard.`;
    }
    
    setMessage({ 
      type: successCount > 0 ? "success" : "error", 
      text: messageText 
    });

    setProcessing(false);
    
    // Reset scheduling fields after action
    if (actionType === "schedule") {
      setEnableScheduling(false);
      setScheduledStart('');
      setScheduledEnd('');
    }
    
    setTimeout(() => setMessage({ type: "", text: "" }), 8000);
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = searchTerm === "" || 
      candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    const colors = getAssessmentColors(type?.code);
    return {
      gradient: `linear-gradient(135deg, ${colors.gradient_start}, ${colors.gradient_end})`,
      color: colors.gradient_start
    };
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <Link href="/supervisor" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 style={styles.title}>Batch Assessment Manager</h1>
            <div style={styles.headerRight}>
              <span style={styles.supervisorBadge}>
                {currentSupervisor?.name}
              </span>
            </div>
          </div>
          <p style={styles.subtitle}>Assign, schedule, unblock, or block assessments for multiple candidates at once</p>
        </div>

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
                    setEnableScheduling(false);
                    setScheduledStart('');
                    setScheduledEnd('');
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
                  setEnableScheduling(false);
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
                  <div style={styles.actionDesc}>Give immediate access to take assessment</div>
                </div>
                {actionType === "assign_unblock" && <span style={styles.checkmark}>✓</span>}
              </button>

              <button
                onClick={() => {
                  setActionType("schedule");
                  setShowTimeOptions(false);
                  setEnableScheduling(true);
                }}
                style={{
                  ...styles.actionCard,
                  background: actionType === "schedule" ? '#F3E5F5' : 'white',
                  border: actionType === "schedule" ? '2px solid #9C27B0' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>📅</span>
                <div>
                  <div style={styles.actionTitle}>Schedule Assessment</div>
                  <div style={styles.actionDesc}>Set start and end time for all candidates</div>
                </div>
                {actionType === "schedule" && <span style={styles.checkmark}>✓</span>}
              </button>

              <button
                onClick={() => {
                  setActionType("unblock");
                  setShowTimeOptions(true);
                  setEnableScheduling(false);
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
                  setEnableScheduling(false);
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

            {/* Scheduling Options */}
            {actionType === "schedule" && enableScheduling && (
              <div style={styles.schedulingSection}>
                <h4 style={styles.timeTitle}>Schedule Assessment Window</h4>
                <div style={styles.schedulingGrid}>
                  <div style={styles.dateTimeGroup}>
                    <label style={styles.label}>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                      min={minDateTime}
                      required
                      style={styles.dateTimeInput}
                    />
                    <p style={styles.hint}>Assessment becomes available at this time</p>
                  </div>
                  
                  <div style={styles.dateTimeGroup}>
                    <label style={styles.label}>End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                      min={scheduledStart || minDateTime}
                      required
                      style={styles.dateTimeInput}
                    />
                    <p style={styles.hint}>Assessment expires at this time</p>
                  </div>
                </div>
                
                <div style={styles.scheduleInfo}>
                  <span style={styles.scheduleInfoIcon}>📢</span>
                  <span>Candidates will receive a notification in their dashboard when scheduled. They will see an alert bell icon with the schedule details.</span>
                </div>
              </div>
            )}

            {/* Time Options for unblock */}
            {showTimeOptions && (
              <div style={styles.timeOptionsSection}>
                <h4 style={styles.timeTitle}>Time Options (for unblock)</h4>
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
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="not_assigned">Not Assigned</option>
              </select>
              <button onClick={selectAll} style={styles.selectAllButton}>Select All</button>
              <button onClick={clearAll} style={styles.clearButton}>Clear All</button>
            </div>

            <div style={styles.quickSelectBar}>
              <span style={styles.quickSelectLabel}>Quick select:</span>
              <button onClick={() => selectByStatus("not_assigned")} style={styles.quickSelectBtn}>Not Assigned</button>
              <button onClick={() => selectByStatus("blocked")} style={styles.quickSelectBtn}>Blocked</button>
              <button onClick={() => selectByStatus("scheduled")} style={styles.quickSelectBtn}>Scheduled</button>
              <button onClick={() => selectByStatus("unblocked")} style={styles.quickSelectBtn}>Ready</button>
              <button onClick={() => selectByStatus("completed")} style={styles.quickSelectBtn}>Completed</button>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.checkboxCell}></th>
                    <th style={styles.tableHead}>Candidate</th>
                    <th style={styles.tableHead}>Email</th>
                    <th style={styles.tableHead}>Current Status</th>
                  </td>
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

            {actionType === "schedule" && enableScheduling && scheduledStart && scheduledEnd && (
              <div style={styles.scheduleSummary}>
                <strong>📅 Schedule Summary:</strong>
                <div>Start: {formatDateTime(scheduledStart)}</div>
                <div>End: {formatDateTime(scheduledEnd)}</div>
                <div>Candidates: {selectedCandidates.size} selected</div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6A1B9A' }}>
                  📢 Candidates will receive a notification in their dashboard
                </div>
              </div>
            )}

            {sendingNotifications && (
              <div style={styles.sendingIndicator}>
                📢 Sending notifications...
              </div>
            )}

            <div style={styles.actionBar}>
              <div style={styles.selectedCount}>
                {selectedCandidates.size} candidate(s) selected
              </div>
              <button
                onClick={executeAction}
                disabled={processing || selectedCandidates.size === 0 || (actionType === "schedule" && (!scheduledStart || !scheduledEnd))}
                style={{
                  ...styles.executeButton,
                  opacity: processing || selectedCandidates.size === 0 || (actionType === "schedule" && (!scheduledStart || !scheduledEnd)) ? 0.6 : 1,
                  cursor: processing || selectedCandidates.size === 0 || (actionType === "schedule" && (!scheduledStart || !scheduledEnd)) ? 'not-allowed' : 'pointer',
                  background: actionType === 'assign_unblock' ? '#4CAF50' :
                             actionType === 'schedule' ? '#9C27B0' :
                             actionType === 'unblock' ? '#2196F3' : '#F44336'
                }}
              >
                {processing ? 'Processing...' : 
                  actionType === 'assign_unblock' ? 'Assign & Unblock Selected' :
                  actionType === 'schedule' ? 'Schedule Selected' :
                  actionType === 'unblock' ? 'Unblock Selected' : 'Block Selected'}
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
    gridTemplateColumns: 'repeat(4, 1fr)',
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
  schedulingSection: {
    marginTop: '20px',
    padding: '20px',
    background: '#F8FAFC',
    borderRadius: '12px',
    border: '1px solid #E2E8F0'
  },
  schedulingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '16px'
  },
  dateTimeGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  },
  dateTimeInput: {
    padding: '10px 12px',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  hint: {
    fontSize: '11px',
    color: '#64748B',
    margin: 0
  },
  scheduleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: '#E3F2FD',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1565C0'
  },
  scheduleInfoIcon: {
    fontSize: '18px'
  },
  scheduleSummary: {
    marginTop: '16px',
    padding: '12px 16px',
    background: '#F3E5F5',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#6A1B9A'
  },
  sendingIndicator: {
    marginTop: '16px',
    padding: '10px',
    background: '#FFF3E0',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#F57C00',
    textAlign: 'center'
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
    cursor: 'pointer'
  },
  clearButton: {
    padding: '10px 20px',
    background: '#F1F5F9',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
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
    cursor: 'pointer'
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
    borderBottom: '1px solid #E2E8F0'
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
    cursor: 'pointer'
  }
};
