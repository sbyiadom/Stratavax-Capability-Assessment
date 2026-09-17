// pages/admin/bulk-assign.js
// Phase 3 item 7: bulk candidate <-> assessment assignment.
// Phase 3 item 8: fires confirmation email after a successful write.
//
// Two modes:
//   byAssessment  — pick many assessments, pick many candidates   (A)
//   byCandidate   — pick one candidate, pick many assessments     (B)
//
// Calls POST /api/admin/assessments/bulk-assign.
// Then, per candidate × assessment pair that landed in 'scheduled' or
// 'unblocked', calls utils/emailService to send the candidate a confirmation.
// Email delivery is gated by NEXT_PUBLIC_EMAIL_DELIVERY_ENABLED — until
// Phase 8, emails are logged but not delivered.

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import {
  sendScheduleNotification,
  sendAssignmentNotification
} from "../../utils/emailService";

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

function localToIso(local) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function BulkAssign() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const [mode, setMode] = useState("byAssessment");
  const [selectedAssessments, setSelectedAssessments] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [singleCandidateId, setSingleCandidateId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("all");

  const [selectedAction, setSelectedAction] = useState("assign");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");

  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [failures, setFailures] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [emailIssues, setEmailIssues] = useState([]);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    setSelectedCandidates([]);
    setSingleCandidateId("");
    setSelectedAssessments([]);
    setMessage({ type: "", text: "" });
    setFailures([]);
    setSkipped([]);
    setEmailIssues([]);
  }, [mode]);

  useEffect(() => {
    if (selectedAction === "block") {
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
      console.error("Error fetching bulk-assign data:", error);
      setMessage({ type: "error", text: "Failed to load data: " + getReadableError(error) });
    } finally {
      setLoading(false);
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

  function toggleAssessment(id) {
    setSelectedAssessments((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      return [...current, id];
    });
  }

  function handleSelectCandidate(candidateId) {
    setSelectedCandidates((current) => {
      if (current.includes(candidateId)) return current.filter((id) => id !== candidateId);
      return [...current, candidateId];
    });
  }

  function handleSelectAll() {
    const visibleIds = filteredCandidates().map((c) => c.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCandidates.includes(id));
    if (allVisibleSelected) {
      setSelectedCandidates((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedCandidates((current) => Array.from(new Set([...current, ...visibleIds])));
    }
  }

  function buildSchedulePayload() {
    if (selectedAction === "block") {
      return { ok: true, schedule: undefined };
    }
    const hasStart = scheduleStart !== "";
    const hasEnd = scheduleEnd !== "";
    if (!hasStart && !hasEnd) return { ok: true, schedule: undefined };
    if (!hasStart || !hasEnd) {
      return { ok: false, error: "Provide both a start and an end for the schedule, or leave both blank." };
    }
    const startIso = localToIso(scheduleStart);
    const endIso = localToIso(scheduleEnd);
    if (!startIso || !endIso) {
      return { ok: false, error: "Schedule start/end are not valid timestamps." };
    }
    if (new Date(startIso) >= new Date(endIso)) {
      return { ok: false, error: "Schedule start must be before the end." };
    }
    return { ok: true, schedule: { start: startIso, end: endIso } };
  }

  function validateSelections() {
    if (selectedAssessments.length === 0) {
      return "Please select at least one assessment.";
    }
    if (mode === "byAssessment") {
      if (selectedCandidates.length === 0) {
        return "Please select at least one candidate.";
      }
    } else {
      if (!singleCandidateId) {
        return "Please select a candidate.";
      }
    }
    return null;
  }

  // Fire confirmation emails for every (candidate × assessment) pair that
  // successfully landed in 'scheduled' or 'unblocked'. Best-effort: an email
  // failure never rolls back the DB write.
  async function sendConfirmations({ pairs, action, schedule }) {
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));
    const assessmentMap = new Map(assessments.map((a) => [a.id, a]));
    const issues = [];
    let sent = 0;
    let failed = 0;
    let dryRun = 0;

    for (const pair of pairs) {
      const candidate = candidateMap.get(pair.candidateId);
      const assessment = assessmentMap.get(pair.assessmentId);
      if (!candidate?.email || !assessment?.title) {
        issues.push({
          candidateId: pair.candidateId,
          assessmentId: pair.assessmentId,
          error: "Missing candidate email or assessment title"
        });
        failed += 1;
        continue;
      }

      try {
        let result;
        if (schedule && schedule.start && schedule.end) {
          result = await sendScheduleNotification({
            candidateEmail: candidate.email,
            candidateName: candidate.full_name,
            assessmentTitle: assessment.title,
            scheduledStart: schedule.start,
            scheduledEnd: schedule.end,
            supervisorName: candidate.supervisor?.full_name || null
          });
        } else {
          result = await sendAssignmentNotification({
            candidateEmail: candidate.email,
            candidateName: candidate.full_name,
            assessmentTitle: assessment.title,
            supervisorName: candidate.supervisor?.full_name || null
          });
        }

        if (result?.success && result?.dryRun) dryRun += 1;
        else if (result?.success) sent += 1;
        else {
          failed += 1;
          issues.push({
            candidateId: pair.candidateId,
            assessmentId: pair.assessmentId,
            error: result?.error || "Unknown email error"
          });
        }
      } catch (err) {
        failed += 1;
        issues.push({
          candidateId: pair.candidateId,
          assessmentId: pair.assessmentId,
          error: err?.message || "Unknown email error"
        });
      }
    }

    return { sent, failed, dryRun, issues };
  }

  async function handleSubmit() {
    const validationError = validateSelections();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    const scheduleResult = buildSchedulePayload();
    if (!scheduleResult.ok) {
      setMessage({ type: "error", text: scheduleResult.error });
      return;
    }

    const candidateIds = mode === "byAssessment" ? selectedCandidates : [singleCandidateId];

    try {
      setProcessing(true);
      setMessage({ type: "", text: "" });
      setFailures([]);
      setSkipped([]);
      setEmailIssues([]);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated.");

      const response = await fetch("/api/admin/assessments/bulk-assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode,
          action: selectedAction,
          assessmentIds: selectedAssessments,
          candidateIds,
          schedule: scheduleResult.schedule
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        throw new Error(data?.error || `Request failed (${response.status}).`);
      }

      const wrote = data.written ?? 0;
      const skippedRows = safeArray(data.skipped);
      const failedRows = safeArray(data.failed);

      // Fire confirmation emails only for statuses that mean "candidate has access".
      // block produces no email; scheduled + unblocked do.
      let emailSummary = null;
      const targetStatus = data.targetStatus;
      const shouldEmail = targetStatus === "scheduled" || targetStatus === "unblocked";

      if (shouldEmail && wrote > 0) {
        // Rebuild the pairs the API actually wrote (skip protected rows).
        const skippedSet = new Set(
          skippedRows.map((s) => `${s.candidateId}::${s.assessmentId}`)
        );
        const allPairs = [];
        for (const candidateId of candidateIds) {
          for (const assessmentId of selectedAssessments) {
            const key = `${candidateId}::${assessmentId}`;
            if (!skippedSet.has(key)) allPairs.push({ candidateId, assessmentId });
          }
        }

        emailSummary = await sendConfirmations({
          pairs: allPairs,
          action: selectedAction,
          schedule: scheduleResult.schedule
        });
      }

      const skippedCount = skippedRows.length;
      const failedCount = failedRows.length;

      if (failedCount === 0) {
        let msg = `Wrote ${wrote} assignment(s). Skipped ${skippedCount} protected row(s).`;
        if (emailSummary) {
          if (emailSummary.dryRun > 0) {
            msg += ` Confirmation emails queued (dry-run): ${emailSummary.dryRun}.`;
          }
          if (emailSummary.sent > 0) {
            msg += ` Confirmation emails sent: ${emailSummary.sent}.`;
          }
          if (emailSummary.failed > 0) {
            msg += ` Email failures: ${emailSummary.failed}.`;
          }
        }
        setMessage({ type: "success", text: msg });
      } else {
        setMessage({
          type: "error",
          text: `Wrote ${wrote}; skipped ${skippedCount}; failed ${failedCount}. See details below.`
        });
      }

      setSkipped(skippedRows);
      setFailures(failedRows);
      setEmailIssues(emailSummary?.issues || []);

      setSelectedCandidates([]);
      setSingleCandidateId("");
    } catch (error) {
      console.error("Bulk assign error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setProcessing(false);
    }
  }

  function getActionButtonText() {
    const hasWindow = scheduleStart !== "" && scheduleEnd !== "";
    if (selectedAction === "assign") return hasWindow ? "Assign and Schedule" : "Assign and Unblock";
    if (selectedAction === "unblock") return hasWindow ? "Schedule Unblock" : "Unblock";
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
  const allVisibleSelected =
    visibleCandidates.length > 0 &&
    visibleCandidates.every((candidate) => selectedCandidates.includes(candidate.id));
  const showScheduleInputs = selectedAction === "assign" || selectedAction === "unblock";
  const hasAnyWindow = scheduleStart !== "" || scheduleEnd !== "";

  const selectedCandidateObj =
    mode === "byCandidate" ? candidates.find((c) => c.id === singleCandidateId) : null;

  const totalPairs =
    mode === "byAssessment"
      ? selectedAssessments.length * selectedCandidates.length
      : selectedAssessments.length * (singleCandidateId ? 1 : 0);

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
          <button onClick={() => router.push("/supervisor")} style={styles.button}>
            Go to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/admin" legacyBehavior>
            <a style={styles.backButton}>← Back to Admin</a>
          </Link>
          <h1 style={styles.title}>Bulk Assign Assessments</h1>
          <p style={styles.subtitle}>
            Assign assessments to candidates in either direction. Completed and in-progress
            attempts are never overwritten. Confirmation emails are queued after a successful write.
          </p>
        </div>

        {message.text && (
          <div
            style={{
              ...styles.message,
              background: message.type === "success" ? "#e8f5e9" : "#ffebee",
              color: message.type === "success" ? "#2e7d32" : "#c62828",
              border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
            }}
          >
            {message.text}
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Direction</h3>
          <div style={styles.modeGrid}>
            <ModeButton
              active={mode === "byAssessment"}
              title="Assessments → Candidates"
              desc="Pick one or more assessments, then choose the candidates who should receive them."
              onClick={() => setMode("byAssessment")}
            />
            <ModeButton
              active={mode === "byCandidate"}
              title="Candidate → Assessments"
              desc="Pick one candidate, then choose the assessments to assign to them."
              onClick={() => setMode("byCandidate")}
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            1. Select Assessment{selectedAssessments.length !== 1 ? "s" : ""}
            <span style={styles.assessmentHint}>
              {selectedAssessments.length} selected
            </span>
          </h3>
          {loading ? (
            <div style={styles.loadingState}>Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div style={styles.noData}>No active assessments found.</div>
          ) : (
            <div style={styles.assessmentGrid}>
              {assessments.map((assessment) => {
                const isSelected = selectedAssessments.includes(assessment.id);
                const typeName = assessment.assessment_type?.name || "AS";
                const badgeText = typeName.substring(0, 2).toUpperCase();
                const hash = assessment.id
                  .split("")
                  .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
                const hue = hash % 360;

                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => toggleAssessment(assessment.id)}
                    style={{
                      ...styles.assessmentCard,
                      border: isSelected ? "2px solid #0a1929" : "1px solid #e2e8f0",
                      background: isSelected ? "#f8fafc" : "white"
                    }}
                  >
                    <div
                      style={{
                        ...styles.assessmentBadge,
                        background: `hsl(${hue}, 60%, 85%)`,
                        color: `hsl(${hue}, 80%, 25%)`
                      }}
                    >
                      {badgeText}
                    </div>
                    <div style={styles.assessmentInfo}>
                      <div style={styles.assessmentTitle}>{assessment.title}</div>
                      <div style={styles.assessmentType}>
                        {assessment.assessment_type?.name || "Assessment"}
                      </div>
                    </div>
                    {isSelected && <div style={styles.selectedBadge}>✓</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.section}>
          {mode === "byAssessment" ? (
            <>
              <h3 style={styles.sectionTitle}>
                2. Select Candidates
                <span style={styles.assessmentHint}>
                  {selectedCandidates.length} selected
                </span>
              </h3>

              <div style={styles.filterBar}>
                <div style={styles.searchBox}>
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <div style={styles.filterGroup}>
                  <select
                    value={filterSupervisor}
                    onChange={(event) => setFilterSupervisor(event.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="all">All Candidates</option>
                    <option value="unassigned">Unassigned Only</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        Supervised by: {supervisor.full_name || supervisor.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.tableContainer}>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeadRow}>
                        <th style={styles.thCheckbox}>
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={handleSelectAll}
                            style={styles.checkbox}
                          />
                        </th>
                        <th style={styles.tableHead}>Candidate</th>
                        <th style={styles.tableHead}>Email</th>
                        <th style={styles.tableHead}>Supervisor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCandidates.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={styles.noData}>
                            No candidates found.
                          </td>
                        </tr>
                      ) : (
                        visibleCandidates.map((candidate) => (
                          <tr key={candidate.id} style={styles.tableRow}>
                            <td style={styles.tdCheckbox}>
                              <input
                                type="checkbox"
                                checked={selectedCandidates.includes(candidate.id)}
                                onChange={() => handleSelectCandidate(candidate.id)}
                                style={styles.checkbox}
                              />
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateInfo}>
                                <div style={styles.candidateAvatar}>
                                  {getInitial(candidate.full_name, candidate.email)}
                                </div>
                                <div>
                                  <div style={styles.candidateName}>
                                    {candidate.full_name || "Unnamed Candidate"}
                                  </div>
                                  <div style={styles.candidateId}>
                                    ID: {candidate.id ? candidate.id.substring(0, 8) : "N/A"}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateEmail}>
                                {candidate.email || "No email"}
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              {candidate.supervisor ? (
                                <span style={styles.supervisorName}>
                                  {candidate.supervisor.full_name || candidate.supervisor.email}
                                </span>
                              ) : (
                                <span style={styles.unassignedBadge}>Unassigned</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 style={styles.sectionTitle}>2. Select Candidate</h3>

              <div style={styles.filterBar}>
                <div style={styles.searchBox}>
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    style={styles.searchInput}
                  />
                </div>
              </div>

              {selectedCandidateObj && (
                <div style={styles.selectedCandidateBanner}>
                  <div style={styles.candidateInfo}>
                    <div style={styles.candidateAvatar}>
                      {getInitial(selectedCandidateObj.full_name, selectedCandidateObj.email)}
                    </div>
                    <div>
                      <div style={styles.candidateName}>
                        {selectedCandidateObj.full_name || "Unnamed Candidate"}
                      </div>
                      <div style={styles.candidateEmail}>
                        {selectedCandidateObj.email || "No email"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSingleCandidateId("")}
                    style={styles.scheduleClear}
                  >
                    Clear
                  </button>
                </div>
              )}

              <div style={styles.candidatePickerList}>
                {visibleCandidates.length === 0 ? (
                  <div style={styles.noData}>No candidates found.</div>
                ) : (
                  visibleCandidates.slice(0, 60).map((candidate) => {
                    const isSelected = singleCandidateId === candidate.id;
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setSingleCandidateId(candidate.id)}
                        style={{
                          ...styles.candidatePickerItem,
                          border: isSelected ? "2px solid #0a1929" : "1px solid #e2e8f0",
                          background: isSelected ? "#f8fafc" : "white"
                        }}
                      >
                        <div style={styles.candidateAvatar}>
                          {getInitial(candidate.full_name, candidate.email)}
                        </div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={styles.candidateName}>
                            {candidate.full_name || "Unnamed Candidate"}
                          </div>
                          <div style={styles.candidateEmail}>
                            {candidate.email || "No email"}
                          </div>
                        </div>
                        {isSelected && <span style={styles.selectedBadge}>✓</span>}
                      </button>
                    );
                  })
                )}
                {visibleCandidates.length > 60 && (
                  <div style={styles.moreHint}>
                    Showing first 60 matches. Narrow with search to find others.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>3. Choose Action</h3>
          <div style={styles.actionGrid}>
            <ActionButton
              active={selectedAction === "assign"}
              color="#0a1929"
              title="Assign and Unblock"
              desc="Create access and make ready"
              onClick={() => setSelectedAction("assign")}
            />
            <ActionButton
              active={selectedAction === "unblock"}
              color="#2196f3"
              title="Unblock"
              desc="Make existing access ready"
              onClick={() => setSelectedAction("unblock")}
            />
            <ActionButton
              active={selectedAction === "block"}
              color="#f57c00"
              title="Block"
              desc="Restrict assessment access"
              onClick={() => setSelectedAction("block")}
            />
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
                    onClick={() => {
                      setScheduleStart("");
                      setScheduleEnd("");
                    }}
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

        <div style={styles.section}>
          <div style={styles.summaryBar}>
            <div style={styles.selectionSummary}>
              <span style={styles.selectedCount}>{totalPairs}</span>
              <span>
                pair(s) will be processed
                {selectedAssessments.length > 0 &&
                  ` — ${selectedAssessments.length} assessment(s) × ${
                    mode === "byAssessment" ? selectedCandidates.length : singleCandidateId ? 1 : 0
                  } candidate(s)`}
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={processing || totalPairs === 0}
              style={{
                ...styles.submitButton,
                background: getActionButtonColor(),
                opacity: processing || totalPairs === 0 ? 0.6 : 1,
                cursor: processing || totalPairs === 0 ? "not-allowed" : "pointer"
              }}
            >
              {processing
                ? "Processing..."
                : `${getActionButtonText()} (${totalPairs})`}
            </button>
          </div>

          {skipped.length > 0 && (
            <div style={styles.reportBlock}>
              <div style={styles.reportTitle}>Skipped ({skipped.length})</div>
              <div style={styles.reportHint}>
                These rows are already completed or in progress and were left untouched.
              </div>
              <ul style={styles.reportList}>
                {skipped.slice(0, 20).map((row, i) => (
                  <li key={i} style={styles.reportItem}>
                    <code>{String(row.candidateId).substring(0, 8)}</code> ×{" "}
                    <code>{String(row.assessmentId).substring(0, 8)}</code> — {row.reason}
                  </li>
                ))}
              </ul>
              {skipped.length > 20 && (
                <div style={styles.reportHint}>…and {skipped.length - 20} more.</div>
              )}
            </div>
          )}

          {failures.length > 0 && (
            <div style={{ ...styles.reportBlock, borderColor: "#fecaca", background: "#fef2f2" }}>
              <div style={{ ...styles.reportTitle, color: "#991b1b" }}>
                Failures ({failures.length})
              </div>
              <ul style={styles.reportList}>
                {failures.slice(0, 20).map((row, i) => (
                  <li key={i} style={{ ...styles.reportItem, color: "#991b1b" }}>
                    <code>{String(row.candidateId).substring(0, 8)}</code> ×{" "}
                    <code>{String(row.assessmentId).substring(0, 8)}</code> — {row.error}
                  </li>
                ))}
              </ul>
              {failures.length > 20 && (
                <div style={styles.reportHint}>…and {failures.length - 20} more.</div>
              )}
            </div>
          )}

          {emailIssues.length > 0 && (
            <div style={{ ...styles.reportBlock, borderColor: "#fde68a", background: "#fffbeb" }}>
              <div style={{ ...styles.reportTitle, color: "#92400e" }}>
                Email issues ({emailIssues.length})
              </div>
              <div style={styles.reportHint}>
                Assignments succeeded; these confirmation emails could not be queued.
              </div>
              <ul style={styles.reportList}>
                {emailIssues.slice(0, 20).map((row, i) => (
                  <li key={i} style={{ ...styles.reportItem, color: "#92400e" }}>
                    <code>{String(row.candidateId).substring(0, 8)}</code> ×{" "}
                    <code>{String(row.assessmentId).substring(0, 8)}</code> — {row.error}
                  </li>
                ))}
              </ul>
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

function ModeButton({ active, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.modeButton,
        background: active ? "#0a1929" : "white",
        color: active ? "white" : "#0a1929",
        border: active ? "1px solid #0a1929" : "1px solid #e2e8f0"
      }}
    >
      <span style={styles.modeTitle}>{title}</span>
      <span style={{ ...styles.modeDesc, color: active ? "rgba(255,255,255,0.75)" : "#667085" }}>
        {desc}
      </span>
    </button>
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
  subtitle: { margin: 0, color: "#667085", fontSize: "14px", lineHeight: 1.6 },
  message: { padding: "12px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  section: { background: "white", borderRadius: "16px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  sectionTitle: { fontSize: "18px", fontWeight: 800, color: "#0a1929", margin: "0 0 20px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  assessmentHint: { fontSize: "14px", fontWeight: 500, color: "#667085" },

  modeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" },
  modeButton: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px", padding: "20px", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  modeTitle: { fontSize: "16px", fontWeight: 800 },
  modeDesc: { fontSize: "12px", lineHeight: 1.5 },

  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" },
  assessmentCard: { display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "12px", cursor: "pointer", position: "relative", textAlign: "left", fontFamily: "inherit" },
  assessmentBadge: { width: "36px", height: "36px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0 },
  assessmentInfo: { flex: 1, overflow: "hidden" },
  assessmentTitle: { fontSize: "14px", fontWeight: 800, color: "#0a1929", marginBottom: "4px" },
  assessmentType: { fontSize: "12px", color: "#667085" },
  selectedBadge: { fontSize: "16px", color: "#0a1929", fontWeight: 800 },

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
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "700px" },
  tableHeadRow: { borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  tableHead: { padding: "12px 16px", fontWeight: 800, color: "#0a1929", textAlign: "left" },
  thCheckbox: { width: "40px", padding: "12px 8px", textAlign: "center" },
  tableCell: { padding: "12px 16px", borderBottom: "1px solid #e2e8f0" },
  tdCheckbox: { padding: "12px 8px", textAlign: "center", borderBottom: "1px solid #e2e8f0" },
  checkbox: { width: "18px", height: "18px", cursor: "pointer" },
  tableRow: { background: "white" },

  candidateInfo: { display: "flex", alignItems: "center", gap: "12px" },
  candidateAvatar: { width: "36px", height: "36px", borderRadius: "18px", background: "linear-gradient(135deg, #0a1929, #1a2a3a)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, flexShrink: 0 },
  candidateName: { fontWeight: 800, color: "#0a1929", marginBottom: "2px" },
  candidateId: { fontSize: "10px", color: "#718096", fontFamily: "monospace" },
  candidateEmail: { fontSize: "13px", color: "#667085" },
  supervisorName: { fontSize: "13px", color: "#0a1929", fontWeight: 700 },
  unassignedBadge: { display: "inline-block", padding: "2px 8px", background: "#fef2f2", color: "#b91c1c", borderRadius: "12px", fontSize: "11px", fontWeight: 800 },

  candidatePickerList: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "8px" },
  candidatePickerItem: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", background: "white" },
  selectedCandidateBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" },
  moreHint: { fontSize: "12px", color: "#667085", padding: "8px 12px", fontStyle: "italic" },

  noData: { padding: "40px", textAlign: "center", color: "#718096" },
  loadingState: { padding: "35px", textAlign: "center", color: "#667085" },

  summaryBar: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "16px" },
  selectionSummary: { display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "14px" },
  selectedCount: { fontSize: "20px", fontWeight: 800, color: "#0a1929" },
  submitButton: { padding: "12px 32px", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 800 },

  reportBlock: { marginTop: "16px", border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "10px", padding: "12px 16px" },
  reportTitle: { fontSize: "13px", fontWeight: 800, color: "#0a1929", marginBottom: "4px" },
  reportHint: { fontSize: "12px", color: "#667085", marginBottom: "6px" },
  reportList: { margin: "6px 0 0 18px", padding: 0, fontSize: "12px", color: "#475569" },
  reportItem: { marginBottom: "3px" },

  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" }
};
