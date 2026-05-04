// pages/admin/manage-candidates.js

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "N/A";
  }
}

function getPercentage(result) {
  if (!result) return 0;

  if (result.percentage_score !== null && result.percentage_score !== undefined) {
    return Math.round(toNumber(result.percentage_score, 0));
  }

  const score = toNumber(result.total_score, 0);
  const maxScore = toNumber(result.max_score, 0);

  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

function getClassification(percentage) {
  if (percentage >= 85) return { label: "High Potential", color: "#2e7d32", bg: "#e8f5e9" };
  if (percentage >= 70) return { label: "Strong Performer", color: "#1565c0", bg: "#e3f2fd" };
  if (percentage >= 55) return { label: "Developing", color: "#f57c00", bg: "#fff3e0" };
  if (percentage >= 40) return { label: "At Risk", color: "#ef6c00", bg: "#fff3e0" };
  if (percentage > 0) return { label: "High Risk", color: "#c62828", bg: "#ffebee" };
  return { label: "No Data", color: "#667085", bg: "#f2f4f7" };
}

function getInitial(name, email) {
  const source = cleanText(name, cleanText(email, "C"));
  return source.charAt(0).toUpperCase();
}

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

export default function ManageCandidates() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState("all");
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [resettingPassword, setResettingPassword] = useState(null);
  const [processingAssessment, setProcessingAssessment] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showUnblockModal, setShowUnblockModal] = useState(null);
  const [timeExtension, setTimeExtension] = useState(30);
  const [resetFullTime, setResetFullTime] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    applyFilters(candidates, searchTerm, selectedSupervisor);
  }, [searchTerm, selectedSupervisor, candidates]);

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

      const userId = activeSession.user.id;
      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        router.push("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchSupervisors(), fetchCandidates()]);
    } catch (error) {
      console.error("Admin auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchSupervisors() {
    try {
      const { data, error } = await supabase
        .from("supervisor_profiles")
        .select("id, full_name, email, role, is_active")
        .in("role", ["supervisor", "admin"])
        .order("full_name", { ascending: true });

      if (error) throw error;
      setSupervisors(data || []);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
  }

  async function fetchCandidates() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidate_profiles")
        .select("*, supervisor:supervisor_profiles(id, full_name, email)")
        .order("created_at", { ascending: false });

      if (candidatesError) throw candidatesError;

      const candidateIds = safeArray(candidatesData).map((candidate) => candidate.id).filter(Boolean);

      let resultsData = [];
      let accessData = [];

      if (candidateIds.length > 0) {
        const [resultsResponse, accessResponse] = await Promise.all([
          supabase
            .from("assessment_results")
            .select("id, user_id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted, assessment:assessments(id, title, assessment_type:assessment_types(*))")
            .in("user_id", candidateIds)
            .order("completed_at", { ascending: false }),
          supabase
            .from("candidate_assessments")
            .select("id, user_id, assessment_id, status, result_id, assessments(id, title, assessment_type:assessment_types(*))")
            .in("user_id", candidateIds)
        ]);

        if (resultsResponse.error) throw resultsResponse.error;
        if (accessResponse.error) throw accessResponse.error;

        resultsData = resultsResponse.data || [];
        accessData = accessResponse.data || [];
      }

      const resultsByUser = {};
      safeArray(resultsData).forEach((result) => {
        if (!resultsByUser[result.user_id]) resultsByUser[result.user_id] = [];
        resultsByUser[result.user_id].push(result);
      });

      const accessByUser = {};
      safeArray(accessData).forEach((access) => {
        if (!accessByUser[access.user_id]) accessByUser[access.user_id] = [];
        accessByUser[access.user_id].push(access);
      });

      const enrichedCandidates = safeArray(candidatesData).map((candidate) => {
        const results = resultsByUser[candidate.id] || [];
        const assessments = accessByUser[candidate.id] || [];
        const completedAssessments = results.length;
        const totalAssessments = assessments.length;
        const unblockedAssessments = assessments.filter((assessment) => assessment.status === "unblocked").length;
        const blockedAssessments = assessments.filter((assessment) => assessment.status === "blocked").length;
        const inProgressAssessments = assessments.filter((assessment) => assessment.status === "in_progress").length;
        const latestResult = results[0] || null;

        return {
          ...candidate,
          completedAssessments,
          totalAssessments,
          unblockedAssessments,
          blockedAssessments,
          inProgressAssessments,
          latestResult,
          results,
          assessments
        };
      });

      setCandidates(enrichedCandidates);
      applyFilters(enrichedCandidates, searchTerm, selectedSupervisor);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setMessage({ type: "error", text: "Failed to load candidates: " + getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(candidatesList, search, supervisorId) {
    let filtered = [...safeArray(candidatesList)];

    if (supervisorId !== "all") {
      filtered = filtered.filter((candidate) => candidate.supervisor_id === supervisorId);
    }

    if (cleanText(search).trim()) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter((candidate) => {
        return (
          cleanText(candidate.full_name).toLowerCase().includes(term) ||
          cleanText(candidate.email).toLowerCase().includes(term) ||
          cleanText(candidate.phone).toLowerCase().includes(term)
        );
      });
    }

    setFilteredCandidates(filtered);
  }

  function clearMessagesAfterDelay() {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  }

  async function handleUnblockAssessment(candidateId, assessmentId, assessmentTitle, candidateName) {
    setProcessingAssessment({ candidateId, assessmentId });
    setMessage({ type: "", text: "" });

    try {
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
          assessmentId,
          assessment_id: assessmentId,
          extendMinutes: resetFullTime ? 0 : timeExtension,
          resetTime: resetFullTime
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Failed to unblock assessment.");
      }

      let successText = "Assessment unblocked for " + cleanText(candidateName, "candidate") + ".";

      if (resetFullTime) {
        successText += " Time reset to full 3 hours.";
      } else if (timeExtension > 0) {
        successText += " Time extended by " + timeExtension + " minutes.";
      }

      setMessage({ type: "success", text: successText });
      await fetchCandidates();
    } catch (error) {
      console.error("Unblock assessment error:", error);
      setMessage({ type: "error", text: "Failed to unblock assessment: " + getReadableError(error) });
    } finally {
      setProcessingAssessment(null);
      setShowUnblockModal(null);
      setTimeExtension(30);
      setResetFullTime(false);
      clearMessagesAfterDelay();
    }
  }

  async function handleResetPassword(candidateId, candidateEmail, candidateName) {
    if (!candidateEmail) {
      setMessage({ type: "error", text: "Candidate email is missing." });
      return;
    }

    const confirmed = window.confirm("Send password reset email to " + cleanText(candidateName, candidateEmail) + "?");
    if (!confirmed) return;

    setResettingPassword(candidateId);
    setMessage({ type: "", text: "" });

    try {
      const redirectTo = typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(candidateEmail, { redirectTo });
      if (error) throw error;

      setMessage({ type: "success", text: "Password reset email sent to " + candidateEmail + "." });
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage({ type: "error", text: "Failed to send password reset email: " + getReadableError(error) });
    } finally {
      setResettingPassword(null);
      clearMessagesAfterDelay();
    }
  }

  function toggleCandidateDetails(candidateId) {
    setExpandedCandidate((current) => (current === candidateId ? null : candidateId));
  }

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking admin access...</p>
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
        <div style={styles.backButtonContainer}>
          <button onClick={() => router.push("/admin")} style={styles.backButton}>← Back to Admin Dashboard</button>
        </div>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidates</h1>
            <p style={styles.subtitle}>View candidates, unblock assessments, and manage candidate account access.</p>
          </div>
          <div style={styles.headerButtons}>
            <button onClick={fetchCandidates} style={styles.refreshButton}>Refresh</button>
            <Link href="/admin/assign-assessments" legacyBehavior>
              <a style={styles.assignAssessmentsButton}>📋 Assign Assessments</a>
            </Link>
            <Link href="/admin/assign-candidates" legacyBehavior>
              <a style={styles.assignButton}>+ Assign Supervisors</a>
            </Link>
          </div>
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

        <div style={styles.filterSection}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search candidates by name, email, or phone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && <button onClick={() => setSearchTerm("")} style={styles.clearButton}>×</button>}
          </div>

          <div style={styles.filterContainer}>
            <span style={styles.filterIcon}>👤</span>
            <select value={selectedSupervisor} onChange={(event) => setSelectedSupervisor(event.target.value)} style={styles.filterSelect}>
              <option value="all">All Supervisors ({candidates.length} candidates)</option>
              {supervisors.map((supervisor) => {
                const count = candidates.filter((candidate) => candidate.supervisor_id === supervisor.id).length;
                return (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.full_name || supervisor.email} ({count} candidates)
                  </option>
                );
              })}
            </select>
          </div>

          {(filteredCandidates.length !== candidates.length || searchTerm || selectedSupervisor !== "all") && (
            <div style={styles.filterStats}>
              Showing {filteredCandidates.length} of {candidates.length} candidates
              <button onClick={() => { setSearchTerm(""); setSelectedSupervisor("all"); }} style={styles.clearFiltersButton}>Clear Filters</button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading candidates...</div>
        ) : (
          <div style={styles.tableContainer}>
            <div style={styles.tableScroll}>
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
                      <td colSpan="6" style={styles.noData}>{searchTerm || selectedSupervisor !== "all" ? "No candidates match your filters." : "No candidates found."}</td>
                    </tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const latestResult = candidate.latestResult;
                      const percentage = getPercentage(latestResult);
                      const classification = getClassification(percentage);
                      const isExpanded = expandedCandidate === candidate.id;

                      return (
                        <React.Fragment key={candidate.id}>
                          <tr style={styles.tableRow}>
                            <td style={styles.td}>
                              <div style={styles.candidateInfo}>
                                <div style={styles.avatar}>{getInitial(candidate.full_name, candidate.email)}</div>
                                <div>
                                  <div style={styles.candidateName}>{candidate.full_name || "Unnamed Candidate"}</div>
                                  <div style={styles.candidateId}>ID: {candidate.id ? candidate.id.substring(0, 8) : "N/A"}...</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.contactInfo}>
                                <div style={styles.email}>{candidate.email || "No email"}</div>
                                {candidate.phone && <div style={styles.phone}>{candidate.phone}</div>}
                              </div>
                            </td>
                            <td style={styles.td}>
                              {candidate.supervisor ? (
                                <div>
                                  <div style={styles.supervisorName}>{candidate.supervisor.full_name || "Supervisor"}</div>
                                  <div style={styles.supervisorEmail}>{candidate.supervisor.email}</div>
                                </div>
                              ) : (
                                <span style={styles.unassignedBadge}>Unassigned</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <div style={styles.assessmentBadges}>
                                <span style={{ ...styles.badge, background: "#e8f5e9", color: "#2e7d32" }}>✅ {candidate.completedAssessments} completed</span>
                                <span style={{ ...styles.badge, background: "#e3f2fd", color: "#1565c0" }}>🔓 {candidate.unblockedAssessments} ready</span>
                                <span style={{ ...styles.badge, background: "#fff3e0", color: "#f57c00" }}>🔒 {candidate.blockedAssessments} blocked</span>
                              </div>
                              {candidate.assessments?.length > 0 && (
                                <button onClick={() => toggleCandidateDetails(candidate.id)} style={styles.viewDetailsButton}>
                                  {isExpanded ? "▲ Hide Assessments" : "▼ View Assessments"}
                                </button>
                              )}
                            </td>
                            <td style={styles.td}>
                              {latestResult ? (
                                <div>
                                  <span style={{ ...styles.scoreBadge, background: classification.bg, color: classification.color }}>
                                    {toNumber(latestResult.total_score, 0)}/{toNumber(latestResult.max_score, 0)} ({percentage}%)
                                  </span>
                                  <div style={styles.classification}>{classification.label}</div>
                                  <div style={styles.completedDate}>{formatDate(latestResult.completed_at)}</div>
                                </div>
                              ) : (
                                <span style={styles.noScore}>Not started</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              <div style={styles.actionGroup}>
                                <Link href={`/supervisor/${candidate.id}`} legacyBehavior>
                                  <a style={styles.viewButton}>📄 View Report</a>
                                </Link>
                                <button
                                  style={styles.resetPasswordButton}
                                  onClick={() => handleResetPassword(candidate.id, candidate.email, candidate.full_name)}
                                  disabled={resettingPassword === candidate.id}
                                >
                                  {resettingPassword === candidate.id ? "Sending..." : "🔑 Reset Password"}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && candidate.assessments?.length > 0 && (
                            <tr style={styles.expandedRow}>
                              <td colSpan="6" style={styles.expandedCell}>
                                <div style={styles.expandedContent}>
                                  <h4 style={styles.expandedTitle}>Individual Assessments</h4>
                                  <div style={styles.assessmentsGrid}>
                                    {candidate.assessments.map((assessment) => {
                                      const result = candidate.results?.find((item) => item.assessment_id === assessment.assessment_id);
                                      const resultPercentage = getPercentage(result);
                                      const isProcessing = processingAssessment?.candidateId === candidate.id && processingAssessment?.assessmentId === assessment.assessment_id;

                                      return (
                                        <div key={assessment.id} style={{
                                          ...styles.assessmentCard,
                                          borderLeftColor: result ? "#4caf50" : assessment.status === "unblocked" ? "#2196f3" : "#ff9800"
                                        }}>
                                          <div style={styles.assessmentHeader}>
                                            <span style={styles.assessmentTitle}>{assessment.assessments?.title || "Assessment"}</span>
                                            <span style={{
                                              ...styles.assessmentStatus,
                                              background: result ? "#e8f5e9" : assessment.status === "unblocked" ? "#e3f2fd" : "#fff3e0",
                                              color: result ? "#2e7d32" : assessment.status === "unblocked" ? "#1565c0" : "#f57c00"
                                            }}>
                                              {result ? "Completed" : assessment.status === "unblocked" ? "Ready" : "Blocked"}
                                            </span>
                                          </div>

                                          {result && (
                                            <div style={styles.assessmentDetails}>
                                              <div>Score: {toNumber(result.total_score, 0)}/{toNumber(result.max_score, 0)} ({resultPercentage}%)</div>
                                              <div style={styles.assessmentDate}>Completed: {formatDate(result.completed_at)}</div>
                                            </div>
                                          )}

                                          <div style={styles.assessmentActions}>
                                            <button
                                              onClick={() => setShowUnblockModal({
                                                candidateId: candidate.id,
                                                assessmentId: assessment.assessment_id,
                                                assessmentTitle: assessment.assessments?.title || "Assessment",
                                                candidateName: candidate.full_name || candidate.email || "Candidate"
                                              })}
                                              disabled={isProcessing}
                                              style={styles.unblockButton}
                                            >
                                              {isProcessing ? "Processing..." : "🔓 Unblock"}
                                            </button>
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
          </div>
        )}
      </div>

      {showUnblockModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.unblockModal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>🔓</span>
              <h3 style={styles.modalTitle}>Unblock Assessment</h3>
              <button onClick={() => setShowUnblockModal(null)} style={styles.closeButton}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p><strong>Candidate:</strong> {showUnblockModal.candidateName}</p>
              <p><strong>Assessment:</strong> {showUnblockModal.assessmentTitle}</p>

              <div style={styles.timeOptions}>
                <h4 style={styles.timeTitle}>Time Options</h4>
                <TimeOption checked={!resetFullTime && timeExtension === 30} onChange={() => { setResetFullTime(false); setTimeExtension(30); }} title="Extend by 30 minutes" text="Add 30 minutes to remaining time" />
                <TimeOption checked={!resetFullTime && timeExtension === 60} onChange={() => { setResetFullTime(false); setTimeExtension(60); }} title="Extend by 1 hour" text="Add 60 minutes to remaining time" />
                <TimeOption checked={!resetFullTime && timeExtension === 120} onChange={() => { setResetFullTime(false); setTimeExtension(120); }} title="Extend by 2 hours" text="Add 120 minutes to remaining time" />
                <TimeOption checked={resetFullTime} onChange={() => setResetFullTime(true)} title="Reset to full time" text="Reset timer to 3 hours from now" />
                <TimeOption checked={!resetFullTime && timeExtension === 0} onChange={() => { setResetFullTime(false); setTimeExtension(0); }} title="No time change" text="Unblock without changing time" />
              </div>

              <div style={styles.noteBox}><span>💡</span><span>Existing answers will be preserved where available.</span></div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowUnblockModal(null)} style={styles.cancelButton}>Cancel</button>
              <button
                onClick={() => handleUnblockAssessment(showUnblockModal.candidateId, showUnblockModal.assessmentId, showUnblockModal.assessmentTitle, showUnblockModal.candidateName)}
                disabled={Boolean(processingAssessment)}
                style={{ ...styles.unblockButtonLarge, opacity: processingAssessment ? 0.7 : 1 }}
              >
                {processingAssessment ? "Processing..." : "Unblock Assessment"}
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

function TimeOption({ checked, onChange, title, text }) {
  return (
    <div style={styles.optionCard}>
      <label style={styles.radioLabel}>
        <input type="radio" checked={checked} onChange={onChange} />
        <div>
          <strong>{title}</strong>
          <span style={styles.optionText}>{text}</span>
        </div>
      </label>
    </div>
  );
}

const styles = {
  checkingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)", color: "white", padding: "20px", textAlign: "center" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "18px" },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "40px 20px" },
  backButtonContainer: { marginBottom: "20px" },
  backButton: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#0a1929", cursor: "pointer" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  headerButtons: { display: "flex", gap: "12px", flexWrap: "wrap" },
  title: { fontSize: "24px", fontWeight: 800, color: "#0a1929", margin: "0 0 5px" },
  subtitle: { fontSize: "14px", color: "#667085", margin: 0 },
  refreshButton: { padding: "12px 20px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
  assignAssessmentsButton: { padding: "12px 20px", background: "#2196f3", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: 700, textDecoration: "none", cursor: "pointer" },
  assignButton: { padding: "12px 20px", background: "#0a1929", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: 700, textDecoration: "none", cursor: "pointer" },
  message: { padding: "12px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  filterSection: { display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" },
  searchContainer: { position: "relative", flex: 2, minWidth: "250px" },
  searchIcon: { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: "16px" },
  searchInput: { width: "100%", padding: "12px 38px 12px 36px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  clearButton: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "18px" },
  filterContainer: { position: "relative", flex: 1, minWidth: "250px" },
  filterIcon: { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: "16px", zIndex: 1 },
  filterSelect: { width: "100%", padding: "12px 12px 12px 36px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "white", cursor: "pointer", outline: "none", boxSizing: "border-box" },
  filterStats: { display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px", background: "#e3f2fd", borderRadius: "8px", fontSize: "13px", color: "#1565c0" },
  clearFiltersButton: { background: "none", border: "none", color: "#1565c0", cursor: "pointer", fontSize: "12px", textDecoration: "underline", padding: "4px 8px" },
  tableContainer: { background: "white", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "980px" },
  tableHeadRow: { background: "#f8fafc", borderBottom: "2px solid #0a1929" },
  th: { textAlign: "left", padding: "15px 20px", fontWeight: 800, color: "#0a1929" },
  td: { padding: "15px 20px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
  tableRow: { background: "white" },
  noData: { padding: "40px", textAlign: "center", color: "#718096", fontStyle: "italic" },
  loading: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px" },
  candidateInfo: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "40px", height: "40px", borderRadius: "20px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 800 },
  candidateName: { fontWeight: 800, color: "#0a1929", marginBottom: "2px" },
  candidateId: { fontSize: "11px", color: "#718096", fontFamily: "monospace" },
  contactInfo: { fontSize: "13px" },
  email: { color: "#0a1929", marginBottom: "2px" },
  phone: { fontSize: "11px", color: "#718096" },
  supervisorName: { fontWeight: 700, color: "#0a1929", marginBottom: "2px" },
  supervisorEmail: { fontSize: "11px", color: "#718096" },
  unassignedBadge: { fontSize: "11px", background: "#ffebee", color: "#c62828", padding: "2px 8px", borderRadius: "12px", display: "inline-block" },
  assessmentBadges: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" },
  badge: { padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, display: "inline-block" },
  viewDetailsButton: { background: "none", border: "1px solid #0a1929", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", color: "#0a1929", cursor: "pointer" },
  scoreBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, marginBottom: "4px" },
  classification: { fontSize: "11px", color: "#64748b", marginTop: "2px" },
  completedDate: { fontSize: "10px", color: "#94a3b8", marginTop: "2px" },
  noScore: { fontSize: "12px", color: "#9e9e9e", fontStyle: "italic" },
  actionGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
  viewButton: { padding: "6px 12px", background: "#0a1929", color: "white", borderRadius: "6px", fontSize: "12px", textDecoration: "none", cursor: "pointer", display: "inline-block" },
  resetPasswordButton: { padding: "6px 12px", background: "#ff9800", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" },
  expandedRow: { background: "#f8fafc" },
  expandedCell: { padding: "20px 30px" },
  expandedContent: { width: "100%" },
  expandedTitle: { margin: "0 0 15px", fontSize: "14px", fontWeight: 800, color: "#0a1929" },
  assessmentsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "15px" },
  assessmentCard: { borderLeft: "4px solid", padding: "15px", background: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  assessmentHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" },
  assessmentTitle: { fontSize: "13px", fontWeight: 800, color: "#0a1929" },
  assessmentStatus: { padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700 },
  assessmentDetails: { fontSize: "12px", color: "#4a5568", marginBottom: "12px" },
  assessmentDate: { fontSize: "10px", color: "#94a3b8", marginTop: "4px" },
  assessmentActions: { display: "flex", gap: "8px", marginTop: "8px" },
  unblockButton: { background: "#2196f3", color: "white", padding: "5px 10px", borderRadius: "4px", border: "none", fontSize: "11px", cursor: "pointer" },
  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(5px)" },
  unblockModal: { background: "white", borderRadius: "20px", maxWidth: "500px", width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  modalIcon: { fontSize: "28px" },
  modalTitle: { margin: 0, fontSize: "18px", color: "#0a1929" },
  closeButton: { background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#667085", padding: "4px 8px", borderRadius: "8px" },
  modalBody: { padding: "24px", overflowY: "auto", flex: 1 },
  timeOptions: { marginTop: "20px" },
  timeTitle: { margin: "0 0 12px", color: "#0a1929" },
  optionCard: { marginBottom: "12px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" },
  radioLabel: { display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" },
  optionText: { display: "block", fontSize: "12px", color: "#667085", marginTop: "3px" },
  noteBox: { marginTop: "20px", padding: "12px", background: "#e3f2fd", borderRadius: "8px", display: "flex", gap: "12px", fontSize: "13px", color: "#1565c0" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" },
  cancelButton: { padding: "10px 24px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", color: "#475569" },
  unblockButtonLarge: { padding: "10px 24px", background: "#2196f3", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 800, cursor: "pointer" }
};
