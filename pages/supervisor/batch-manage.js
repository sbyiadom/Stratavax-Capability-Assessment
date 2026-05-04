// pages/supervisor/batch-manage.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getInitial(name, email) {
  const source = cleanText(name, cleanText(email, "C"));
  return source.charAt(0).toUpperCase();
}

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

function getAssessmentColors(assessmentTypeCode) {
  const colors = {
    leadership: { gradient_start: "#7c3aed", gradient_end: "#5b21b6" },
    cognitive: { gradient_start: "#0891b2", gradient_end: "#0e7490" },
    technical: { gradient_start: "#dc2626", gradient_end: "#991b1b" },
    personality: { gradient_start: "#0d9488", gradient_end: "#115e59" },
    performance: { gradient_start: "#ea580c", gradient_end: "#c2410c" },
    behavioral: { gradient_start: "#9333ea", gradient_end: "#6b21a5" },
    cultural: { gradient_start: "#059669", gradient_end: "#047857" },
    strategic_leadership: { gradient_start: "#1e3a8a", gradient_end: "#5b21b6" },
    manufacturing_baseline: { gradient_start: "#2e7d32", gradient_end: "#1b5e20" },
    general: { gradient_start: "#607d8b", gradient_end: "#455a64" }
  };

  return colors[assessmentTypeCode] || colors.general;
}

function getStatusBadge(status) {
  if (status === "unblocked") return { text: "Ready", color: "#2e7d32", bg: "#e8f5e9" };
  if (status === "blocked") return { text: "Blocked", color: "#f57c00", bg: "#fff3e0" };
  if (status === "completed") return { text: "Completed", color: "#1565c0", bg: "#e3f2fd" };
  if (status === "scheduled") return { text: "Scheduled", color: "#6a1b9a", bg: "#f3e5f5" };
  if (status === "in_progress") return { text: "In Progress", color: "#854d0e", bg: "#fef9c3" };
  return { text: "Not Assigned", color: "#667085", bg: "#f5f5f5" };
}

function formatDateTime(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    return "Not set";
  }
}

function createLocalDateTimeMinimum() {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localNow.toISOString().slice(0, 16);
}

export default function BatchManageAssessments() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);

  const [assessments, setAssessments] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateAssessments, setCandidateAssessments] = useState([]);

  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionType, setActionType] = useState("assign_unblock");

  const [timeExtension, setTimeExtension] = useState(30);
  const [resetFullTime, setResetFullTime] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);

  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [minDateTime, setMinDateTime] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    setMinDateTime(createLocalDateTimeMinimum());
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentSupervisor) fetchData(currentSupervisor);
  }, [currentSupervisor]);

  async function checkAuth() {
    try {
      setCheckingAuth(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "supervisor" && resolvedRole !== "admin") {
        router.push("/login");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setCurrentSupervisor({
        id: activeSession.user.id,
        email: activeSession.user.email,
        name: profile?.full_name || activeSession.user.user_metadata?.full_name || activeSession.user.email,
        role: resolvedRole
      });
    } catch (error) {
      console.error("Batch manage auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchData(supervisor) {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const assessmentsResponse = await supabase
        .from("assessments")
        .select("id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end)")
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (assessmentsResponse.error) throw assessmentsResponse.error;

      let candidateQuery = supabase
        .from("candidate_profiles")
        .select("id, full_name, email, phone, created_at, supervisor_id")
        .order("full_name", { ascending: true });

      if (supervisor.role !== "admin") {
        candidateQuery = candidateQuery.eq("supervisor_id", supervisor.id);
      }

      const candidatesResponse = await candidateQuery;
      if (candidatesResponse.error) throw candidatesResponse.error;

      const candidateRows = candidatesResponse.data || [];
      let assessmentRows = [];

      if (candidateRows.length > 0) {
        const candidateIds = candidateRows.map((candidate) => candidate.id);
        const accessResponse = await supabase
          .from("candidate_assessments")
          .select("id, user_id, assessment_id, status, score, completed_at, unblocked_at, unblocked_by, created_at, updated_at, result_id, is_scheduled, scheduled_start, scheduled_end, scheduled_by, scheduled_at")
          .in("user_id", candidateIds);

        if (accessResponse.error) throw accessResponse.error;
        assessmentRows = accessResponse.data || [];
      }

      setAssessments(assessmentsResponse.data || []);
      setCandidates(candidateRows);
      setCandidateAssessments(assessmentRows);
    } catch (error) {
      console.error("Error fetching batch manager data:", error);
      setMessage({ type: "error", text: "Failed to load data: " + getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  function getStatus(candidateId, assessmentId) {
    const record = candidateAssessments.find((item) => item.user_id === candidateId && item.assessment_id === assessmentId);
    if (!record) return "not_assigned";
    if (record.status === "completed" || record.result_id) return "completed";
    if (record.status === "in_progress") return "in_progress";
    if (record.status === "scheduled") return "scheduled";
    if (record.status === "unblocked") return "unblocked";
    return "blocked";
  }

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term === "" ||
        cleanText(candidate.full_name).toLowerCase().includes(term) ||
        cleanText(candidate.email).toLowerCase().includes(term) ||
        cleanText(candidate.phone).toLowerCase().includes(term);

      let matchesStatus = true;
      if (statusFilter !== "all" && selectedAssessment) {
        matchesStatus = getStatus(candidate.id, selectedAssessment.id) === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [candidates, candidateAssessments, searchTerm, statusFilter, selectedAssessment]);

  function assessmentColors(assessment) {
    const assessmentType = assessment?.assessment_types;
    const colors = {
      gradient_start: assessmentType?.gradient_start,
      gradient_end: assessmentType?.gradient_end
    };

    if (!colors.gradient_start || !colors.gradient_end) {
      const fallback = getAssessmentColors(assessmentType?.code);
      colors.gradient_start = fallback.gradient_start;
      colors.gradient_end = fallback.gradient_end;
    }

    return {
      gradient: "linear-gradient(135deg, " + colors.gradient_start + ", " + colors.gradient_end + ")",
      color: colors.gradient_start
    };
  }

  function toggleCandidate(candidateId) {
    setSelectedCandidates((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  function selectAll() {
    setSelectedCandidates(new Set(filteredCandidates.map((candidate) => candidate.id)));
  }

  function selectByStatus(status) {
    if (!selectedAssessment) return;
    const next = new Set();
    filteredCandidates.forEach((candidate) => {
      if (getStatus(candidate.id, selectedAssessment.id) === status) next.add(candidate.id);
    });
    setSelectedCandidates(next);
  }

  function clearAll() {
    setSelectedCandidates(new Set());
  }

  async function saveNotificationToDatabase(candidate, assessmentTitle, startAt, endAt) {
    try {
      const messageText = "Your assessment \"" + assessmentTitle + "\" has been scheduled. Available from " + formatDateTime(startAt) + " to " + formatDateTime(endAt) + ". Please log in during this window.";

      const { error } = await supabase
        .from("candidate_notifications")
        .insert({
          candidate_id: candidate.id,
          assessment_id: selectedAssessment.id,
          type: "assessment_scheduled",
          title: "New Assessment Scheduled",
          message: messageText,
          scheduled_start: startAt,
          scheduled_end: endAt,
          created_at: new Date().toISOString(),
          is_read: false
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Notification save warning:", error);
      return false;
    }
  }

  async function refreshCandidateAssessments() {
    const candidateIds = candidates.map((candidate) => candidate.id);
    if (candidateIds.length === 0) {
      setCandidateAssessments([]);
      return;
    }

    const { data, error } = await supabase
      .from("candidate_assessments")
      .select("id, user_id, assessment_id, status, score, completed_at, unblocked_at, unblocked_by, created_at, updated_at, result_id, is_scheduled, scheduled_start, scheduled_end, scheduled_by, scheduled_at")
      .in("user_id", candidateIds);

    if (error) throw error;
    setCandidateAssessments(data || []);
  }

  async function upsertCandidateAssessment(candidateId, payload) {
    const { data: existing, error: checkError } = await supabase
      .from("candidate_assessments")
      .select("id")
      .eq("user_id", candidateId)
      .eq("assessment_id", selectedAssessment.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") throw checkError;

    if (existing?.id) {
      const { error } = await supabase
        .from("candidate_assessments")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("candidate_assessments")
      .insert({
        user_id: candidateId,
        assessment_id: selectedAssessment.id,
        created_at: new Date().toISOString(),
        ...payload
      });

    if (error) throw error;
  }

  async function unblockThroughApi(candidateId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token || null;

    const response = await fetch("/api/supervisor/unblock-assessment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: "Bearer " + accessToken } : {})
      },
      body: JSON.stringify({
        userId: candidateId,
        user_id: candidateId,
        assessmentId: selectedAssessment.id,
        assessment_id: selectedAssessment.id,
        extendMinutes: resetFullTime ? 0 : timeExtension,
        resetTime: resetFullTime
      })
    });

    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.message || result?.error || "Failed to unblock assessment.");
    }
  }

  async function executeAction() {
    if (!selectedAssessment) {
      setMessage({ type: "error", text: "Please select an assessment first." });
      return;
    }

    if (selectedCandidates.size === 0) {
      setMessage({ type: "error", text: "Please select at least one candidate." });
      return;
    }

    if (actionType === "schedule") {
      if (!scheduledStart || !scheduledEnd) {
        setMessage({ type: "error", text: "Please set both start and end times before scheduling." });
        return;
      }

      if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
        setMessage({ type: "error", text: "Scheduled end time must be after scheduled start time." });
        return;
      }
    }

    const actionLabel = actionType === "assign_unblock" ? "assign and unblock" : actionType;
    const confirmed = window.confirm("Are you sure you want to " + actionLabel + " " + selectedAssessment.title + " for " + selectedCandidates.size + " candidate(s)?");
    if (!confirmed) return;

    setProcessing(true);
    setMessage({ type: "", text: "" });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const notifiedCandidates = [];

    try {
      for (const candidateId of selectedCandidates) {
        try {
          const candidate = candidates.find((item) => item.id === candidateId);
          const now = new Date().toISOString();

          if (actionType === "assign_unblock") {
            await upsertCandidateAssessment(candidateId, {
              status: "unblocked",
              unblocked_by: currentSupervisor.id,
              unblocked_at: now,
              is_scheduled: false,
              scheduled_start: null,
              scheduled_end: null,
              updated_at: now
            });
          }

          if (actionType === "schedule") {
            const startIso = new Date(scheduledStart).toISOString();
            const endIso = new Date(scheduledEnd).toISOString();

            await upsertCandidateAssessment(candidateId, {
              status: "scheduled",
              is_scheduled: true,
              scheduled_start: startIso,
              scheduled_end: endIso,
              scheduled_by: currentSupervisor.id,
              scheduled_at: now,
              updated_at: now
            });

            if (candidate) notifiedCandidates.push(candidate);
          }

          if (actionType === "unblock") {
            await unblockThroughApi(candidateId);
          }

          if (actionType === "block") {
            await upsertCandidateAssessment(candidateId, {
              status: "blocked",
              unblocked_by: null,
              unblocked_at: null,
              is_scheduled: false,
              scheduled_start: null,
              scheduled_end: null,
              updated_at: now
            });
          }

          successCount += 1;
        } catch (error) {
          errorCount += 1;
          errors.push(getReadableError(error));
          console.error("Batch action candidate error:", error);
        }
      }

      await refreshCandidateAssessments();

      let notificationCount = 0;
      if (actionType === "schedule" && notifiedCandidates.length > 0) {
        setSendingNotifications(true);
        for (const candidate of notifiedCandidates) {
          const saved = await saveNotificationToDatabase(
            candidate,
            selectedAssessment.title,
            new Date(scheduledStart).toISOString(),
            new Date(scheduledEnd).toISOString()
          );
          if (saved) notificationCount += 1;
        }
        setSendingNotifications(false);
      }

      setSelectedCandidates(new Set());

      let resultText = successCount + " successful";
      if (errorCount > 0) resultText += ", " + errorCount + " failed";
      if (errors.length > 0 && errors.length <= 2) resultText += "\n\nDetails: " + errors.join(", ");
      if (notificationCount > 0) resultText += "\n\nNotifications saved for " + notificationCount + " candidate(s).";

      setMessage({ type: successCount > 0 ? "success" : "error", text: resultText });

      if (actionType === "schedule") {
        setEnableScheduling(false);
        setScheduledStart("");
        setScheduledEnd("");
      }

      setTimeout(() => setMessage({ type: "", text: "" }), 8000);
    } catch (error) {
      console.error("Batch action error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setSendingNotifications(false);
      setProcessing(false);
    }
  }

  if (checkingAuth || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>{checkingAuth ? "Checking authorization..." : "Loading assessment manager..."}</p>
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

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <Link href={currentSupervisor?.role === "admin" ? "/admin" : "/supervisor"} legacyBehavior>
              <a style={styles.backButton}>← Back to Dashboard</a>
            </Link>
            <h1 style={styles.title}>Batch Assessment Manager</h1>
            <div style={styles.headerRight}>
              <span style={styles.supervisorBadge}>{currentSupervisor?.name || "Supervisor"}</span>
            </div>
          </div>
          <p style={styles.subtitle}>Assign, schedule, unblock, or block assessments for multiple candidates at once.</p>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Select Assessment</h2>
          {assessments.length === 0 ? (
            <div style={styles.emptyCell}>No active assessments found.</div>
          ) : (
            <div style={styles.assessmentGrid}>
              {assessments.map((assessment) => {
                const isSelected = selectedAssessment?.id === assessment.id;
                const colors = assessmentColors(assessment);
                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssessment(assessment);
                      setSelectedCandidates(new Set());
                      setMessage({ type: "", text: "" });
                      setEnableScheduling(false);
                      setScheduledStart("");
                      setScheduledEnd("");
                    }}
                    style={{
                      ...styles.assessmentCard,
                      background: isSelected ? colors.gradient : "white",
                      border: isSelected ? "1px solid transparent" : "2px solid " + colors.color + "40",
                      color: isSelected ? "white" : "#334155",
                      boxShadow: isSelected ? "0 8px 20px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.05)"
                    }}
                  >
                    <span style={styles.assessmentIcon}>{assessment.assessment_types?.icon || "📋"}</span>
                    <div>
                      <div style={styles.assessmentTitle}>{assessment.title}</div>
                      <div style={{ ...styles.assessmentType, color: isSelected ? "rgba(255,255,255,0.82)" : colors.color }}>
                        {assessment.assessment_types?.name || "Assessment"}
                      </div>
                    </div>
                    {isSelected && <span style={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedAssessment && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Choose Action</h2>
            <div style={styles.actionGrid}>
              <ActionCard active={actionType === "assign_unblock"} color="#4caf50" icon="📝" title="Assign and Unblock" desc="Give immediate access" onClick={() => { setActionType("assign_unblock"); setShowTimeOptions(false); setEnableScheduling(false); }} />
              <ActionCard active={actionType === "schedule"} color="#9c27b0" icon="📅" title="Schedule Assessment" desc="Set start and end time" onClick={() => { setActionType("schedule"); setShowTimeOptions(false); setEnableScheduling(true); }} />
              <ActionCard active={actionType === "unblock"} color="#2196f3" icon="🔓" title="Unblock" desc="Unblock existing access" onClick={() => { setActionType("unblock"); setShowTimeOptions(true); setEnableScheduling(false); }} />
              <ActionCard active={actionType === "block"} color="#f44336" icon="🔒" title="Block" desc="Block assessment access" onClick={() => { setActionType("block"); setShowTimeOptions(false); setEnableScheduling(false); }} />
            </div>

            {actionType === "schedule" && enableScheduling && (
              <div style={styles.schedulingSection}>
                <h4 style={styles.timeTitle}>Schedule Assessment Window</h4>
                <div style={styles.schedulingGrid}>
                  <div style={styles.dateTimeGroup}>
                    <label style={styles.label}>Start Date and Time</label>
                    <input type="datetime-local" value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} min={minDateTime} required style={styles.dateTimeInput} />
                    <p style={styles.hint}>Assessment becomes available at this time.</p>
                  </div>
                  <div style={styles.dateTimeGroup}>
                    <label style={styles.label}>End Date and Time</label>
                    <input type="datetime-local" value={scheduledEnd} onChange={(event) => setScheduledEnd(event.target.value)} min={scheduledStart || minDateTime} required style={styles.dateTimeInput} />
                    <p style={styles.hint}>Assessment expires at this time.</p>
                  </div>
                </div>
                <div style={styles.scheduleInfo}>📢 Candidates will see a notification in the candidate dashboard when scheduling is saved.</div>
              </div>
            )}

            {showTimeOptions && (
              <div style={styles.timeOptionsSection}>
                <h4 style={styles.timeTitle}>Time Options for Unblock</h4>
                <div style={styles.timeGrid}>
                  <TimeOption checked={!resetFullTime && timeExtension === 30} onChange={() => { setResetFullTime(false); setTimeExtension(30); }} text="Extend by 30 minutes" />
                  <TimeOption checked={!resetFullTime && timeExtension === 60} onChange={() => { setResetFullTime(false); setTimeExtension(60); }} text="Extend by 60 minutes" />
                  <TimeOption checked={!resetFullTime && timeExtension === 120} onChange={() => { setResetFullTime(false); setTimeExtension(120); }} text="Extend by 120 minutes" />
                  <TimeOption checked={resetFullTime} onChange={() => setResetFullTime(true)} text="Reset to full time" />
                  <TimeOption checked={!resetFullTime && timeExtension === 0} onChange={() => { setResetFullTime(false); setTimeExtension(0); }} text="No time change" />
                </div>
              </div>
            )}
          </div>
        )}

        {selectedAssessment && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>3. Select Candidates for {selectedAssessment.title}</h2>
            <div style={styles.filtersBar}>
              <input type="text" placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={styles.searchInput} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={styles.filterSelect}>
                <option value="all">All Status</option>
                <option value="unblocked">Ready</option>
                <option value="blocked">Blocked</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
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
              <button onClick={() => selectByStatus("in_progress")} style={styles.quickSelectBtn}>In Progress</button>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr><td colSpan="4" style={styles.emptyCell}>No candidates found matching your criteria.</td></tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const status = getStatus(candidate.id, selectedAssessment.id);
                      const badge = getStatusBadge(status);
                      const isSelected = selectedCandidates.has(candidate.id);
                      return (
                        <tr key={candidate.id} style={styles.tableRow}>
                          <td style={styles.checkboxCell}><input type="checkbox" checked={isSelected} onChange={() => toggleCandidate(candidate.id)} style={styles.checkbox} /></td>
                          <td style={styles.tableCell}>
                            <div style={styles.candidateInfo}>
                              <div style={styles.candidateAvatar}>{getInitial(candidate.full_name, candidate.email)}</div>
                              <div>
                                <div style={styles.candidateName}>{candidate.full_name || "Unnamed Candidate"}</div>
                                <div style={styles.candidateId}>ID: {candidate.id ? candidate.id.substring(0, 8) : "N/A"}...</div>
                              </div>
                            </div>
                          </td>
                          <td style={styles.tableCell}>{candidate.email || "No email"}</td>
                          <td style={styles.tableCell}><span style={{ ...styles.statusBadge, background: badge.bg, color: badge.color }}>{badge.text}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {actionType === "schedule" && enableScheduling && scheduledStart && scheduledEnd && (
              <div style={styles.scheduleSummary}>
                <strong>Schedule Summary:</strong>
                <div>Start: {formatDateTime(scheduledStart)}</div>
                <div>End: {formatDateTime(scheduledEnd)}</div>
                <div>Candidates: {selectedCandidates.size} selected</div>
              </div>
            )}

            {sendingNotifications && <div style={styles.sendingIndicator}>Saving notifications...</div>}

            <div style={styles.actionBar}>
              <div style={styles.selectedCount}>{selectedCandidates.size} candidate(s) selected</div>
              <button
                onClick={executeAction}
                disabled={processing || selectedCandidates.size === 0 || (actionType === "schedule" && (!scheduledStart || !scheduledEnd))}
                style={{
                  ...styles.executeButton,
                  opacity: processing || selectedCandidates.size === 0 || (actionType === "schedule" && (!scheduledStart || !scheduledEnd)) ? 0.6 : 1,
                  cursor: processing || selectedCandidates.size === 0 || (actionType === "schedule" && (!scheduledStart || !scheduledEnd)) ? "not-allowed" : "pointer",
                  background: actionType === "assign_unblock" ? "#4caf50" : actionType === "schedule" ? "#9c27b0" : actionType === "unblock" ? "#2196f3" : "#f44336"
                }}
              >
                {processing ? "Processing..." : actionType === "assign_unblock" ? "Assign and Unblock Selected" : actionType === "schedule" ? "Schedule Selected" : actionType === "unblock" ? "Unblock Selected" : "Block Selected"}
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

function ActionCard({ active, color, icon, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ ...styles.actionCard, background: active ? color + "18" : "white", border: active ? "2px solid " + color : "1px solid #e2e8f0" }}>
      <span style={styles.actionIcon}>{icon}</span>
      <div>
        <div style={styles.actionTitle}>{title}</div>
        <div style={styles.actionDesc}>{desc}</div>
      </div>
      {active && <span style={styles.checkmark}>✓</span>}
    </button>
  );
}

function TimeOption({ checked, onChange, text }) {
  return (
    <label style={styles.timeOption}>
      <input type="radio" checked={checked} onChange={onChange} />
      <span>{text}</span>
    </label>
  );
}

const styles = {
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" },
  spinner: { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #0a1929", borderRadius: "50%", animation: "spin 1s linear infinite" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" },
  header: { marginBottom: "30px" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "15px" },
  backButton: { color: "#0a1929", textDecoration: "none", fontSize: "14px", padding: "8px 16px", borderRadius: "20px", border: "1px solid #e2e8f0", background: "white", fontWeight: 700 },
  title: { fontSize: "24px", fontWeight: 800, color: "#0a1929", margin: 0 },
  headerRight: { display: "flex", alignItems: "center" },
  supervisorBadge: { padding: "8px 16px", background: "#e3f2fd", color: "#1565c0", borderRadius: "20px", fontSize: "14px", fontWeight: 700 },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  message: { padding: "15px 20px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", fontWeight: 600, whiteSpace: "pre-line" },
  section: { background: "white", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" },
  sectionTitle: { fontSize: "18px", fontWeight: 800, color: "#0a1929", margin: "0 0 20px" },
  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" },
  assessmentCard: { display: "flex", alignItems: "center", gap: "12px", padding: "15px", borderRadius: "12px", cursor: "pointer", textAlign: "left", position: "relative" },
  assessmentIcon: { fontSize: "28px" },
  assessmentTitle: { fontSize: "15px", fontWeight: 800, marginBottom: "4px" },
  assessmentType: { fontSize: "12px", opacity: 0.88 },
  checkmark: { position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", fontSize: "20px", fontWeight: 800 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "15px", marginBottom: "20px" },
  actionCard: { display: "flex", alignItems: "center", gap: "15px", padding: "20px", borderRadius: "12px", cursor: "pointer", textAlign: "left", position: "relative", fontFamily: "inherit" },
  actionIcon: { fontSize: "32px" },
  actionTitle: { fontSize: "16px", fontWeight: 800, marginBottom: "4px", color: "#0a1929" },
  actionDesc: { fontSize: "12px", color: "#64748b" },
  schedulingSection: { marginTop: "20px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" },
  schedulingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "16px" },
  dateTimeGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "13px", fontWeight: 800, color: "#0a1929" },
  dateTimeInput: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit" },
  hint: { fontSize: "11px", color: "#64748b", margin: 0 },
  scheduleInfo: { padding: "12px", background: "#e3f2fd", borderRadius: "8px", fontSize: "13px", color: "#1565c0" },
  scheduleSummary: { marginTop: "16px", padding: "12px 16px", background: "#f3e5f5", borderRadius: "8px", fontSize: "13px", color: "#6a1b9a" },
  sendingIndicator: { marginTop: "16px", padding: "10px", background: "#fff3e0", borderRadius: "8px", fontSize: "13px", color: "#f57c00", textAlign: "center" },
  timeOptionsSection: { marginTop: "20px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" },
  timeTitle: { fontSize: "14px", fontWeight: 800, color: "#0a1929", margin: "0 0 15px" },
  timeGrid: { display: "flex", flexWrap: "wrap", gap: "15px" },
  timeOption: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" },
  filtersBar: { display: "flex", gap: "12px", marginBottom: "15px", flexWrap: "wrap" },
  searchInput: { flex: 1, minWidth: "200px", padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none" },
  filterSelect: { padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "white", cursor: "pointer" },
  selectAllButton: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: 700 },
  clearButton: { padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: 700 },
  quickSelectBar: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "10px", background: "#f8fafc", borderRadius: "8px", flexWrap: "wrap" },
  quickSelectLabel: { fontSize: "13px", fontWeight: 700, color: "#64748b" },
  quickSelectBtn: { padding: "4px 12px", background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", fontSize: "12px", cursor: "pointer" },
  tableContainer: { overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "720px" },
  tableHeadRow: { background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  tableHead: { padding: "15px", fontWeight: 800, color: "#0a1929", textAlign: "left" },
  checkboxCell: { width: "50px", padding: "15px", textAlign: "center" },
  tableRow: { borderBottom: "1px solid #e2e8f0" },
  tableCell: { padding: "15px" },
  emptyCell: { padding: "40px", textAlign: "center", color: "#94a3b8" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  candidateInfo: { display: "flex", alignItems: "center", gap: "12px" },
  candidateAvatar: { width: "36px", height: "36px", borderRadius: "18px", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 800, color: "#0a1929" },
  candidateName: { fontWeight: 800, color: "#0a1929", marginBottom: "2px" },
  candidateId: { fontSize: "11px", color: "#718096", fontFamily: "monospace" },
  statusBadge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 800, display: "inline-block" },
  actionBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "12px" },
  selectedCount: { fontSize: "14px", color: "#475569", fontWeight: 800 },
  executeButton: { padding: "12px 30px", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 800 }
};
