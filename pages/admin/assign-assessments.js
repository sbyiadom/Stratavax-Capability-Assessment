// pages/admin/assign-assessments.js
// Phase 3 item 6: adds scheduling-window support to Assign and Unblock actions.

import React, { useEffect, useState } from "react";
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

// Format a scheduled window for display under a status badge
function formatWindow(start, end) {
  const fmt = (v) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleString(undefined, {
        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch { return null; }
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} → ${e}`;
  if (s) return `from ${s}`;
  if (e) return `until ${e}`;
  return null;
}

// datetime-local string → ISO string (or null if empty/invalid)
function localToIso(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function statusDetails(status, row) {
  if (status === "scheduled") {
    return {
      text: "Scheduled",
      bg: "#e0f2fe",
      color: "#075985",
      subtitle: row ? formatWindow(row.scheduled_start, row.scheduled_end) : null
    };
  }
  if (status === "unblocked") {
    return { text: "Unblocked / Ready", bg: "#e8f5e9", color: "#2e7d32" };
  }
  if (status === "blocked") {
    return { text: "Blocked", bg: "#fff3e0", color: "#f57c00" };
  }
  if (status === "completed") {
    return { text: "Completed", bg: "#e0f2fe", color: "#0369a1" };
  }
  if (status === "in_progress") {
    return { text: "In Progress", bg: "#fef9c3", color: "#854d0e" };
  }
  return { text: "Not Assigned", bg: "#f5f5f5", color: "#667085" };
}

export default function AssignAssessments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [selectedAction, setSelectedAction] = useState("assign");
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Maps user_id → { status, scheduled_start, scheduled_end, is_scheduled }
  const [candidateAssessmentStatus, setCandidateAssessmentStatus] = useState({});

  // Scheduling inputs (Phase 3 item 6)
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    fetchAssessmentStatus();
  }, [selectedAssessment]);

  // Clear schedule inputs when action changes away from assign/unblock
  useEffect(() => {
    if (selectedAction !== "assign" && selectedAction !== "unblock") {
      setScheduleStart("");
      setScheduleEnd("");
    }
  }, [selectedAction]);

  async function checkAdminAuth() {
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

      if (resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Admin access is required." });
        router.push("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setCurrentAdminId(activeSession.user.id);
      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Admin auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const [candidateResponse, assessmentResponse, supervisorResponse] = await Promise.all([
        supabase
          .from("candidate_profiles")
          .select("id, full_name, email, phone, supervisor_id, supervisor:supervisor_profiles(id, full_name, email)")
          .order("created_at", { ascending: false }),
        supabase
          .from("assessments")
          .select("id, title, description, is_active, assessment_type:assessment_types(id, code, name, icon)")
          .eq("is_active", true)
          .order("title", { ascending: true }),
        supabase
          .from("supervisor_profiles")
          .select("id, full_name, email, role, is_active")
          .eq("is_active", true)
          .order("full_name", { ascending: true })
      ]);

      if (candidateResponse.error) throw candidateResponse.error;
      if (assessmentResponse.error) throw assessmentResponse.error;
      if (supervisorResponse.error) throw supervisorResponse.error;

      setCandidates(candidateResponse.data || []);
      setAssessments(assessmentResponse.data || []);
      setSupervisors(supervisorResponse.data || []);
    } catch (error) {
      console.error("Error fetching assignment data:", error);
      setMessage({ type: "error", text: "Failed to load data: " + getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssessmentStatus() {
    if (!selectedAssessment) {
      setCandidateAssessmentStatus({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from("candidate_assessments")
        .select("user_id, status, is_scheduled, scheduled_start, scheduled_end")
        .eq("assessment_id", selectedAssessment);

      if (error) throw error;

      const statusMap = {};
      safeArray(data).forEach((item) => {
        statusMap[item.user_id] = {
          status: item.status,
          is_scheduled: item.is_scheduled,
          scheduled_start: item.scheduled_start,
          scheduled_end: item.scheduled_end
        };
      });
      setCandidateAssessmentStatus(statusMap);
    } catch (error) {
      console.error("Error fetching assessment status:", error);
      setMessage({ type: "error", text: "Failed to load assessment status: " + getReadableError(error) });
    }
  }

  function filteredCandidates() {
    let filtered = [...candidates];

    if (filterSupervisor === "unassigned") {
      filtered = filtered.filter((candidate) => !candidate.supervisor_id);
    } else if (filterSupervisor !== "all") {
      filtered = filtered.filter((candidate) => candidate.supervisor_id === filterSupervisor);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((candidate) => {
        return (
          cleanText(candidate.full_name).toLowerCase().includes(term) ||
          cleanText(candidate.email).toLowerCase().includes(term) ||
          cleanText(candidate.phone).toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }

  function getCandidateStatus(candidateId) {
    return candidateAssessmentStatus[candidateId] || null;
  }

  function handleSelectAll() {
    const visibleCandidates = filteredCandidates();
    const visibleIds = visibleCandidates.map((candidate) => candidate.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCandidates.includes(id));

    if (allVisibleSelected) {
      setSelectedCandidates((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedCandidates((current) => Array.from(new Set([...current, ...visibleIds])));
    }
  }

  function handleSelectCandidate(candidateId) {
    setSelectedCandidates((current) => {
      if (current.includes(candidateId)) return current.filter((id) => id !== candidateId);
      return [...current, candidateId];
    });
  }

  // Build the scheduling columns for an assign/unblock payload.
  // Returns null if inputs are invalid (caller shows error).
  function buildScheduleFields() {
    if (selectedAction !== "assign" && selectedAction !== "unblock") return {};
    const hasStart = scheduleStart !== "";
    const hasEnd = scheduleEnd !== "";
    if (!hasStart && !hasEnd) {
      return {
        is_scheduled: false,
        scheduled_start: null,
        scheduled_end: null,
        scheduled_by: null,
        scheduled_at: null
      };
    }
    if (!hasStart || !hasEnd) return null;
    const startIso = localToIso(scheduleStart);
    const endIso = localToIso(scheduleEnd);
    if (!startIso || !endIso) return null;
    if (new Date(startIso) >= new Date(endIso)) return null;
    return {
      is_scheduled: true,
      scheduled_start: startIso,
      scheduled_end: endIso,
      scheduled_by: currentAdminId,
      scheduled_at: new Date().toISOString()
    };
  }

  async function assignOrUpdateCandidateAssessment(candidateId, assessmentId, status, scheduleFields) {
    const now = new Date().toISOString();

    const { data: existing, error: checkError } = await supabase
      .from("candidate_assessments")
      .select("id")
      .eq("user_id", candidateId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") throw checkError;

    if (existing?.id) {
      const updatePayload = {
        status,
        updated_at: now,
        unblocked_at: status === "unblocked" ? now : null,
        ...scheduleFields
      };

      const { error } = await supabase
        .from("candidate_assessments")
        .update(updatePayload)
        .eq("id", existing.id);

      if (error) throw error;
      return;
    }

    const insertPayload = {
      user_id: candidateId,
      assessment_id: assessmentId,
      status,
      unblocked_at: status === "unblocked" ? now : null,
      created_at: now,
      updated_at: now,
      ...scheduleFields
    };

    const { error } = await supabase
      .from("candidate_assessments")
      .insert(insertPayload);

    if (error) throw error;
  }

  async function handleSubmit() {
    if (!selectedAssessment) {
      setMessage({ type: "error", text: "Please select an assessment." });
      return;
    }

    if (selectedCandidates.length === 0) {
      setMessage({ type: "error", text: "Please select at least one candidate." });
      return;
    }

    // Build scheduling fields (only for assign/unblock)
    const scheduleFields = buildScheduleFields();
    if (scheduleFields === null) {
      setMessage({
        type: "error",
        text: "Invalid scheduling window. Provide both start and end, and start must be before end."
      });
      return;
    }

    const isScheduled = scheduleFields.is_scheduled === true;

    try {
      setProcessing(true);
      setMessage({ type: "", text: "" });

      let successCount = 0;
      let errorCount = 0;

      // If a schedule window is set, target status becomes 'scheduled'.
      // Otherwise assign → unblocked, block → blocked, unblock → unblocked.
      let targetStatus;
      if (selectedAction === "block") targetStatus = "blocked";
      else if (isScheduled) targetStatus = "scheduled";
      else if (selectedAction === "assign" || selectedAction === "unblock") targetStatus = "unblocked";
      else targetStatus = "unblocked";

      for (const candidateId of selectedCandidates) {
        try {
          await assignOrUpdateCandidateAssessment(candidateId, selectedAssessment, targetStatus, scheduleFields);
          successCount += 1;
        } catch (error) {
          errorCount += 1;
          console.error("Error processing candidate " + candidateId + ":", error);
        }
      }

      const selectedAssessmentTitle = assessments.find((item) => item.id === selectedAssessment)?.title || "selected assessment";
      let actionText;
      if (selectedAction === "block") actionText = "blocked";
      else if (isScheduled) actionText = selectedAction === "unblock" ? "scheduled for unblock" : "scheduled";
      else if (selectedAction === "unblock") actionText = "unblocked";
      else actionText = "assigned and unblocked";

      if (successCount > 0) {
        setMessage({ type: "success", text: "Successfully " + actionText + " " + successCount + " candidate(s) for " + selectedAssessmentTitle + "." });
      }

      if (errorCount > 0) {
        setMessage({ type: "error", text: "Failed to process " + errorCount + " candidate(s)." });
      }

      setSelectedCandidates([]);
      // Do not clear scheduleStart/scheduleEnd — admin may want to reuse the window
      await fetchAssessmentStatus();
    } catch (error) {
      console.error("Assessment assignment error:", error);
      setMessage({ type: "error", text: "Failed to process request: " + getReadableError(error) });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  }

  function getActionButtonText() {
    const hasWindow = scheduleStart !== "" && scheduleEnd !== "";
    if (selectedAction === "assign") {
      return hasWindow ? "Assign and Schedule" : "Assign and Unblock";
    }
    if (selectedAction === "unblock") {
      return hasWindow ? "Schedule Unblock" : "Unblock";
    }
    if (selectedAction === "block") return "Block";
    return "Process";
  }

  function getActionButtonColor() {
    if (selectedAction === "assign") return "#0a1929";
    if (selectedAction === "unblock") return "#2196f3";
    if (selectedAction === "block") return "#f57c00";
    return "#0a1929";
  }

  const visibleCandidates = filteredCandidates();
  const selectedAssessmentObj = assessments.find((assessment) => assessment.id === selectedAssessment);
  const allVisibleSelected = visibleCandidates.length > 0 && visibleCandidates.every((candidate) => selectedCandidates.includes(candidate.id));

  const showScheduleInputs = selectedAction === "assign" || selectedAction === "unblock";
  const hasAnyWindow = scheduleStart !== "" || scheduleEnd !== "";

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking authorization...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button onClick={() => router.push("/supervisor")} style={styles.button}>Go to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/admin/manage-candidates" legacyBehavior>
            <a style={styles.backButton}>← Back to Manage Candidates</a>
          </Link>
          <h1 style={styles.title}>Assign Assessments</h1>
          <p style={styles.subtitle}>Manage candidate access to assessments.</p>
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
          <h3 style={styles.sectionTitle}>1. Select Assessment</h3>
          {loading ? (
            <div style={styles.loadingState}>Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div style={styles.noData}>No active assessments found.</div>
          ) : (
            <div style={styles.assessmentGrid}>
              {assessments.map((assessment) => {
                const typeName = assessment.assessment_type?.name || "AS";
                const badgeText = typeName.substring(0, 2).toUpperCase();
                const hash = assessment.id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
                const hue = hash % 360;

                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => { setSelectedAssessment(assessment.id); setSelectedCandidates([]); }}
                    style={{
                      ...styles.assessmentCard,
                      border: selectedAssessment === assessment.id ? "2px solid #0a1929" : "1px solid #e2e8f0",
                      background: selectedAssessment === assessment.id ? "#f8fafc" : "white"
                    }}
                  >
                    <div style={{ ...styles.assessmentBadge, background: `hsl(${hue}, 60%, 85%)`, color: `hsl(${hue}, 80%, 25%)` }}>
                      {badgeText}
                    </div>
                    <div style={styles.assessmentInfo}>
                      <div style={styles.assessmentTitle}>{assessment.title}</div>
                      <div style={styles.assessmentType}>{assessment.assessment_type?.name || "Assessment"}</div>
                    </div>
                    {selectedAssessment === assessment.id && <div style={styles.selectedBadge}>Selected</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedAssessment && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>2. Choose Action</h3>
            <div style={styles.actionGrid}>
              <ActionButton active={selectedAction === "assign"} color="#0a1929" title="Assign and Unblock" desc="Create access and make ready" onClick={() => setSelectedAction("assign")} />
              <ActionButton active={selectedAction === "unblock"} color="#2196f3" title="Unblock" desc="Make existing access ready" onClick={() => setSelectedAction("unblock")} />
              <ActionButton active={selectedAction === "block"} color="#f57c00" title="Block" desc="Restrict assessment access" onClick={() => setSelectedAction("block")} />
            </div>

            {showScheduleInputs && (
              <div style={styles.scheduleBlock}>
                <div style={styles.scheduleHeader}>
                  <div>
                    <div style={styles.scheduleTitle}>Schedule window (optional)</div>
                    <div style={styles.scheduleHint}>
                      Leave blank to make the assessment available immediately.
                      Fill both fields to schedule it — candidates cannot start outside the window.
                    </div>
                  </div>
                  {hasAnyWindow && (
                    <button
                      type="button"
                      onClick={() => { setScheduleStart(""); setScheduleEnd(""); }}
                      style={styles.scheduleClear}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div style={styles.scheduleInputs}>
                  <label style={styles.scheduleField}>
                    <span style={styles.scheduleLabel}>Starts at</span>
                    <input
                      type="datetime-local"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      style={styles.scheduleInput}
                    />
                  </label>
                  <label style={styles.scheduleField}>
                    <span style={styles.scheduleLabel}>Ends at</span>
                    <input
                      type="datetime-local"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      style={styles.scheduleInput}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedAssessment && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              3. Select Candidates
              {selectedAssessmentObj && <span style={styles.assessmentHint}>for {selectedAssessmentObj.title}</span>}
            </h3>

            <div style={styles.filterBar}>
              <div style={styles.searchBox}>
                <input type="text" placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={styles.searchInput} />
              </div>
              <div style={styles.filterGroup}>
                <select value={filterSupervisor} onChange={(event) => setFilterSupervisor(event.target.value)} style={styles.filterSelect}>
                  <option value="all">All Candidates</option>
                  <option value="unassigned">Unassigned Only</option>
                  {supervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>Supervised by: {supervisor.full_name || supervisor.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.tableContainer}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.thCheckbox}><input type="checkbox" checked={allVisibleSelected} onChange={handleSelectAll} style={styles.checkbox} /></th>
                      <th style={styles.tableHead}>Candidate</th>
                      <th style={styles.tableHead}>Email</th>
                      <th style={styles.tableHead}>Supervisor</th>
                      <th style={styles.tableHead}>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCandidates.length === 0 ? (
                      <tr><td colSpan="5" style={styles.noData}>No candidates found.</td></tr>
                    ) : (
                      visibleCandidates.map((candidate) => {
                        const row = getCandidateStatus(candidate.id);
                        const status = row?.status || "unassigned";
                        const details = statusDetails(status, row);
                        return (
                          <tr key={candidate.id} style={styles.tableRow}>
                            <td style={styles.tdCheckbox}><input type="checkbox" checked={selectedCandidates.includes(candidate.id)} onChange={() => handleSelectCandidate(candidate.id)} style={styles.checkbox} /></td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateInfo}>
                                <div style={styles.candidateAvatar}>{getInitial(candidate.full_name, candidate.email)}</div>
                                <div>
                                  <div style={styles.candidateName}>{candidate.full_name || "Unnamed Candidate"}</div>
                                  <div style={styles.candidateId}>ID: {candidate.id ? candidate.id.substring(0, 8) : "N/A"}...</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.tableCell}><div style={styles.candidateEmail}>{candidate.email || "No email"}</div></td>
                            <td style={styles.tableCell}>{candidate.supervisor ? <span style={styles.supervisorName}>{candidate.supervisor.full_name || candidate.supervisor.email}</span> : <span style={styles.unassignedBadge}>Unassigned</span>}</td>
                            <td style={styles.tableCell}>
                              <div>
                                <span style={{ ...styles.statusBadge, background: details.bg, color: details.color }}>{details.text}</span>
                                {details.subtitle && (
                                  <div style={styles.statusSubtitle}>{details.subtitle}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.summaryBar}>
              <div style={styles.selectionSummary}>
                <span style={styles.selectedCount}>{selectedCandidates.length}</span>
                <span>candidate(s) selected</span>
                {selectedCandidates.length > 0 && <button onClick={() => setSelectedCandidates([])} style={styles.clearSelection}>Clear</button>}
              </div>
              {selectedCandidates.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={processing}
                  style={{
                    ...styles.submitButton,
                    background: getActionButtonColor(),
                    opacity: processing ? 0.6 : 1,
                    cursor: processing ? "not-allowed" : "pointer"
                  }}
                >
                  {processing ? "Processing..." : getActionButtonText() + " (" + selectedCandidates.length + ")"}
                </button>
              )}
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

function ActionButton({ active, color, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.actionButton,
        background: active ? color : "white",
        color: active ? "white" : color,
        border: active ? "1px solid " + color : "1px solid #e2e8f0"
      }}
    >
      <span>{title}</span>
      <span style={styles.actionDesc}>{desc}</span>
    </button>
  );
}

const styles = {
  checkingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)", color: "white", padding: "20px", textAlign: "center" },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  spinner: { width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "20px" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" },
  header: { marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  backButton: { display: "inline-block", color: "#0a1929", textDecoration: "none", fontSize: "14px", marginBottom: "15px", padding: "7px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontWeight: 700 },
  title: { margin: "0 0 5px", color: "#0a1929", fontSize: "28px", fontWeight: 800 },
  subtitle: { margin: 0, color: "#667085", fontSize: "14px" },
  message: { padding: "12px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  section: { background: "white", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  sectionTitle: { fontSize: "18px", fontWeight: 800, color: "#0a1929", margin: "0 0 20px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  assessmentHint: { fontSize: "14px", fontWeight: 500, color: "#667085" },
  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" },
  assessmentCard: { display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "12px", cursor: "pointer", position: "relative", textAlign: "left" },
  assessmentBadge: { width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0 },
  assessmentInfo: { flex: 1, overflow: "hidden" },
  assessmentTitle: { fontSize: "14px", fontWeight: 800, color: "#0a1929", marginBottom: "4px" },
  assessmentType: { fontSize: "12px", color: "#667085" },
  selectedBadge: { position: "absolute", top: "8px", right: "12px", fontSize: "12px", color: "#0a1929", fontWeight: 800 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  actionButton: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "20px", borderRadius: "12px", fontSize: "16px", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
  actionDesc: { fontSize: "11px", fontWeight: 500, opacity: 0.75 },
  scheduleBlock: { marginTop: "20px", padding: "16px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px" },
  scheduleHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px", flexWrap: "wrap" },
  scheduleTitle: { fontSize: "14px", fontWeight: 800, color: "#0a1929" },
  scheduleHint: { fontSize: "12px", color: "#667085", marginTop: "4px", lineHeight: 1.5, maxWidth: "600px" },
  scheduleClear: { padding: "4px 12px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: "6px", color: "#667085", fontSize: "12px", fontWeight: 700, cursor: "pointer" },
  scheduleInputs: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  scheduleField: { display: "flex", flexDirection: "column", gap: "6px" },
  scheduleLabel: { fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" },
  scheduleInput: { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "white", boxSizing: "border-box", fontFamily: "inherit" },
  filterBar: { display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" },
  searchBox: { flex: 2, minWidth: "250px" },
  searchInput: { width: "100%", padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  filterGroup: { flex: 1, minWidth: "220px" },
  filterSelect: { width: "100%", padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "white", cursor: "pointer", boxSizing: "border-box" },
  tableContainer: { overflowX: "auto", marginBottom: "20px" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "850px" },
  tableHeadRow: { borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  tableHead: { padding: "12px 16px", fontWeight: 800, color: "#0a1929", textAlign: "left" },
  thCheckbox: { width: "40px", padding: "12px 8px", textAlign: "center" },
  tableCell: { padding: "12px 16px", borderBottom: "1px solid #e2e8f0" },
  tdCheckbox: { padding: "12px 8px", textAlign: "center", borderBottom: "1px solid #e2e8f0" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  tableRow: { background: "white" },
  candidateInfo: { display: "flex", alignItems: "center", gap: "12px" },
  candidateAvatar: { width: "36px", height: "36px", borderRadius: "18px", background: "linear-gradient(135deg, #0a1929, #1a2a3a)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800 },
  candidateName: { fontWeight: 800, color: "#0a1929", marginBottom: "2px" },
  candidateId: { fontSize: "10px", color: "#718096", fontFamily: "monospace" },
  candidateEmail: { fontSize: "13px", color: "#0a1929" },
  supervisorName: { fontSize: "13px", color: "#0a1929", fontWeight: 700 },
  unassignedBadge: { display: "inline-block", padding: "2px 8px", background: "#fef2f2", color: "#b91c1c", borderRadius: "12px", fontSize: "11px", fontWeight: 800 },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 800 },
  statusSubtitle: { fontSize: "11px", color: "#667085", marginTop: "4px" },
  noData: { padding: "40px", textAlign: "center", color: "#718096" },
  loadingState: { padding: "35px", textAlign: "center", color: "#667085" },
  summaryBar: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "16px" },
  selectionSummary: { display: "flex", alignItems: "center", gap: "8px" },
  selectedCount: { fontSize: "20px", fontWeight: 800, color: "#0a1929" },
  clearSelection: { background: "none", border: "none", color: "#f57c00", cursor: "pointer", fontSize: "12px", textDecoration: "underline", padding: "4px 8px" },
  submitButton: { padding: "12px 32px", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 800 },
  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" }
};
