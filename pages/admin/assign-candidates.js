// pages/admin/assign-candidates.js

import { useEffect, useState } from "react";
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

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

export default function AssignCandidates() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [selectedBulkSupervisor, setSelectedBulkSupervisor] = useState("");
  const [processingCandidate, setProcessingCandidate] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    checkAdminAuth();
  }, []);

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
        setMessage({ type: "error", text: "This admin account is inactive." });
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

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

      const [candidatesResponse, supervisorsResponse] = await Promise.all([
        supabase
          .from("candidate_profiles")
          .select("id, full_name, email, phone, created_at, supervisor_id, supervisor:supervisor_profiles(id, full_name, email)")
          .order("created_at", { ascending: false }),
        supabase
          .from("supervisor_profiles")
          .select("id, full_name, email, role, is_active")
          .in("role", ["supervisor", "admin"])
          .eq("is_active", true)
          .order("full_name", { ascending: true })
      ]);

      if (candidatesResponse.error) throw candidatesResponse.error;
      if (supervisorsResponse.error) throw supervisorsResponse.error;

      const candidateRows = candidatesResponse.data || [];
      const supervisorRows = supervisorsResponse.data || [];

      setCandidates(candidateRows);
      setSupervisors(supervisorRows);

      const initialSelected = {};
      candidateRows.forEach((candidate) => {
        initialSelected[candidate.id] = candidate.supervisor_id || "";
      });
      setSelectedSupervisor(initialSelected);
    } catch (error) {
      console.error("Error fetching assignment data:", error);
      setMessage({ type: "error", text: "Failed to load assignment data: " + getReadableError(error) });
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

  function getUnassignedCandidates() {
    return candidates.filter((candidate) => !candidate.supervisor_id);
  }

  function clearMessageAfterDelay() {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 4500);
  }

  async function handleAssign(candidateId) {
    const supervisorId = selectedSupervisor[candidateId] || "";
    const candidate = candidates.find((item) => item.id === candidateId);

    if (!supervisorId) {
      setMessage({ type: "error", text: "Please select a supervisor before assigning." });
      return;
    }

    if (candidate?.supervisor_id === supervisorId) {
      setMessage({ type: "error", text: "This candidate is already assigned to the selected supervisor." });
      return;
    }

    try {
      setProcessingCandidate(candidateId);
      setMessage({ type: "", text: "" });

      const { error } = await supabase
        .from("candidate_profiles")
        .update({
          supervisor_id: supervisorId,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidateId);

      if (error) throw error;

      setMessage({ type: "success", text: "Candidate assigned successfully." });
      await fetchData();
      clearMessageAfterDelay();
    } catch (error) {
      console.error("Error assigning candidate:", error);
      setMessage({ type: "error", text: "Failed to assign candidate: " + getReadableError(error) });
    } finally {
      setProcessingCandidate(null);
    }
  }

  async function handleClearAssignment(candidateId) {
    const confirmed = window.confirm("Clear this candidate supervisor assignment?");
    if (!confirmed) return;

    try {
      setProcessingCandidate(candidateId);
      setMessage({ type: "", text: "" });

      const { error } = await supabase
        .from("candidate_profiles")
        .update({
          supervisor_id: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidateId);

      if (error) throw error;

      setMessage({ type: "success", text: "Candidate assignment cleared successfully." });
      await fetchData();
      clearMessageAfterDelay();
    } catch (error) {
      console.error("Error clearing assignment:", error);
      setMessage({ type: "error", text: "Failed to clear assignment: " + getReadableError(error) });
    } finally {
      setProcessingCandidate(null);
    }
  }

  async function handleBulkAssign() {
    const unassigned = getUnassignedCandidates();

    if (unassigned.length === 0) {
      setMessage({ type: "error", text: "No unassigned candidates found." });
      return;
    }

    if (!selectedBulkSupervisor) {
      setMessage({ type: "error", text: "Please select a supervisor for bulk assignment." });
      return;
    }

    const supervisor = supervisors.find((item) => item.id === selectedBulkSupervisor);
    const confirmed = window.confirm("Assign " + unassigned.length + " unassigned candidate(s) to " + (supervisor?.full_name || supervisor?.email || "the selected supervisor") + "?");

    if (!confirmed) return;

    try {
      setBulkProcessing(true);
      setMessage({ type: "", text: "" });

      const candidateIds = unassigned.map((candidate) => candidate.id);

      const { error } = await supabase
        .from("candidate_profiles")
        .update({
          supervisor_id: selectedBulkSupervisor,
          updated_at: new Date().toISOString()
        })
        .in("id", candidateIds);

      if (error) throw error;

      setSelectedBulkSupervisor("");
      setMessage({ type: "success", text: "Bulk assignment completed successfully." });
      await fetchData();
      clearMessageAfterDelay();
    } catch (error) {
      console.error("Bulk assignment error:", error);
      setMessage({ type: "error", text: "Failed to complete bulk assignment: " + getReadableError(error) });
    } finally {
      setBulkProcessing(false);
    }
  }

  const visibleCandidates = filteredCandidates();
  const assignedCount = candidates.filter((candidate) => candidate.supervisor_id).length;
  const unassignedCount = candidates.filter((candidate) => !candidate.supervisor_id).length;

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
          <Link href="/admin" legacyBehavior>
            <a style={styles.backButton}>← Back to Admin</a>
          </Link>
          <div style={styles.headerTitleBlock}>
            <h1 style={styles.title}>Assign Candidates to Supervisors</h1>
            <p style={styles.subtitle}>Manage candidate ownership and supervisor visibility.</p>
          </div>
          <button onClick={fetchData} style={styles.refreshButton}>Refresh</button>
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

        <div style={styles.statsGrid}>
          <StatCard icon="👥" label="Total Candidates" value={candidates.length} />
          <StatCard icon="✅" label="Assigned" value={assignedCount} />
          <StatCard icon="⏳" label="Unassigned" value={unassignedCount} />
          <StatCard icon="👑" label="Active Supervisors" value={supervisors.length} />
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search candidates by name, email, or phone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <select value={filterSupervisor} onChange={(event) => setFilterSupervisor(event.target.value)} style={styles.filterSelect}>
              <option value="all">All Candidates</option>
              <option value="unassigned">Unassigned Only</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  Assigned to: {supervisor.full_name || supervisor.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinnerDark} />
              <p>Loading candidates...</p>
            </div>
          ) : (
            <>
              {unassignedCount > 0 && (
                <div style={styles.bulkActions}>
                  <span style={styles.bulkLabel}>Bulk Assign Unassigned:</span>
                  <select value={selectedBulkSupervisor} onChange={(event) => setSelectedBulkSupervisor(event.target.value)} style={styles.bulkSelect}>
                    <option value="">Select Supervisor</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.full_name || supervisor.email} {supervisor.role === "admin" ? "(Admin)" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!selectedBulkSupervisor || bulkProcessing}
                    style={{
                      ...styles.bulkButton,
                      opacity: !selectedBulkSupervisor || bulkProcessing ? 0.5 : 1,
                      cursor: !selectedBulkSupervisor || bulkProcessing ? "not-allowed" : "pointer"
                    }}
                  >
                    {bulkProcessing ? "Assigning..." : "Assign All (" + unassignedCount + ")"}
                  </button>
                </div>
              )}

              <div style={styles.resultSummary}>Showing {visibleCandidates.length} of {candidates.length} candidates</div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.tableHead}>Candidate</th>
                      <th style={styles.tableHead}>Contact</th>
                      <th style={styles.tableHead}>Current Supervisor</th>
                      <th style={styles.tableHead}>Assign To</th>
                      <th style={styles.tableHead}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={styles.noData}>No candidates match the current filter.</td>
                      </tr>
                    ) : (
                      visibleCandidates.map((candidate) => {
                        const candidateSelectedSupervisor = selectedSupervisor[candidate.id] || "";
                        const isProcessing = processingCandidate === candidate.id;
                        const isAssignDisabled = !candidateSelectedSupervisor || candidateSelectedSupervisor === candidate.supervisor_id || isProcessing;

                        return (
                          <tr key={candidate.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateInfo}>
                                <div style={styles.candidateAvatar}>{getInitial(candidate.full_name, candidate.email)}</div>
                                <div>
                                  <div style={styles.candidateName}>{candidate.full_name || "Unnamed"}</div>
                                  <div style={styles.candidateId}>ID: {candidate.id ? candidate.id.substring(0, 8) : "N/A"}...</div>
                                  <div style={styles.createdDate}>Created: {formatDate(candidate.created_at)}</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateEmail}>{candidate.email || "No email"}</div>
                              {candidate.phone && <div style={styles.candidatePhone}>{candidate.phone}</div>}
                            </td>
                            <td style={styles.tableCell}>
                              {candidate.supervisor ? (
                                <div style={styles.assignedBadge}>
                                  <span style={styles.assignedName}>{candidate.supervisor.full_name || "Supervisor"}</span>
                                  <span style={styles.assignedEmail}>{candidate.supervisor.email}</span>
                                </div>
                              ) : (
                                <span style={styles.unassignedBadge}>Unassigned</span>
                              )}
                            </td>
                            <td style={styles.tableCell}>
                              <select
                                value={candidateSelectedSupervisor}
                                onChange={(event) => setSelectedSupervisor((previous) => ({ ...previous, [candidate.id]: event.target.value }))}
                                style={styles.assignSelect}
                              >
                                <option value="">Select Supervisor</option>
                                {supervisors.map((supervisor) => (
                                  <option key={supervisor.id} value={supervisor.id}>
                                    {supervisor.full_name || supervisor.email} {supervisor.role === "admin" ? "(Admin)" : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.actionGroup}>
                                <button
                                  onClick={() => handleAssign(candidate.id)}
                                  disabled={isAssignDisabled}
                                  style={{
                                    ...styles.assignButton,
                                    opacity: isAssignDisabled ? 0.5 : 1,
                                    cursor: isAssignDisabled ? "not-allowed" : "pointer"
                                  }}
                                >
                                  {isProcessing ? "Saving..." : "Assign"}
                                </button>
                                {candidate.supervisor_id && (
                                  <button
                                    onClick={() => handleClearAssignment(candidate.id)}
                                    disabled={isProcessing}
                                    style={{
                                      ...styles.clearAssignmentButton,
                                      opacity: isProcessing ? 0.5 : 1,
                                      cursor: isProcessing ? "not-allowed" : "pointer"
                                    }}
                                  >
                                    Clear
                                  </button>
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
            </>
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

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  checkingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)", color: "white", padding: "20px", textAlign: "center" },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  spinner: { width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "20px" },
  spinnerDark: { width: "38px", height: "38px", border: "4px solid #e2e8f0", borderTop: "4px solid #0a1929", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" },
  container: { width: "90vw", maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  headerTitleBlock: { flex: 1, minWidth: "260px" },
  backButton: { color: "#0a1929", textDecoration: "none", fontSize: "14px", fontWeight: 700, padding: "9px 16px", borderRadius: "8px", border: "1px solid #0a1929", display: "inline-block" },
  refreshButton: { padding: "10px 18px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
  title: { margin: 0, color: "#0a1929", fontSize: "24px", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#667085", fontSize: "14px" },
  message: { padding: "13px 18px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "18px", marginBottom: "24px" },
  statCard: { background: "white", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #eef2f7" },
  statIcon: { fontSize: "32px" },
  statLabel: { fontSize: "13px", color: "#718096", marginBottom: "4px", fontWeight: 700 },
  statValue: { fontSize: "24px", fontWeight: 800, color: "#0a1929" },
  filterBar: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", marginBottom: "20px", display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" },
  searchBox: { flex: 2, minWidth: "250px" },
  searchInput: { width: "100%", padding: "11px 16px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" },
  filterGroup: { flex: 1, minWidth: "220px" },
  filterSelect: { width: "100%", padding: "11px 16px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "white", cursor: "pointer", boxSizing: "border-box" },
  bulkActions: { background: "#f0f9f0", padding: "15px 20px", borderRadius: "10px", marginBottom: "20px", display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", border: "1px solid #c6f6d5" },
  bulkLabel: { fontWeight: 800, color: "#0a5c2e" },
  bulkSelect: { padding: "9px 16px", border: "2px solid #c6f6d5", borderRadius: "8px", fontSize: "14px", minWidth: "250px", background: "white" },
  bulkButton: { padding: "9px 20px", background: "#0a5c2e", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 800, cursor: "pointer" },
  tableContainer: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  loadingState: { textAlign: "center", padding: "60px", color: "#667085" },
  resultSummary: { marginBottom: "14px", fontSize: "13px", color: "#667085", fontWeight: 700 },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "900px" },
  tableHeadRow: { borderBottom: "2px solid #0a1929", background: "#f8fafc" },
  tableHead: { padding: "15px", fontWeight: 800, color: "#0a1929", textAlign: "left" },
  tableRow: { borderBottom: "1px solid #e2e8f0" },
  tableCell: { padding: "15px", verticalAlign: "top" },
  noData: { padding: "40px", textAlign: "center", color: "#718096", fontStyle: "italic" },
  candidateInfo: { display: "flex", alignItems: "center", gap: "12px" },
  candidateAvatar: { width: "40px", height: "40px", borderRadius: "20px", background: "#0a1929", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800 },
  candidateName: { fontWeight: 800, color: "#0a1929", marginBottom: "4px" },
  candidateId: { fontSize: "11px", color: "#718096", fontFamily: "monospace" },
  createdDate: { fontSize: "11px", color: "#94a3b8", marginTop: "3px" },
  candidateEmail: { fontSize: "14px", color: "#0a1929", marginBottom: "4px" },
  candidatePhone: { fontSize: "12px", color: "#718096" },
  assignedBadge: { display: "flex", flexDirection: "column", gap: "2px" },
  assignedName: { fontWeight: 800, color: "#0a1929", fontSize: "14px" },
  assignedEmail: { fontSize: "12px", color: "#718096" },
  unassignedBadge: { display: "inline-block", padding: "4px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: "20px", fontSize: "12px", fontWeight: 800 },
  assignSelect: { width: "100%", padding: "8px 12px", border: "2px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", background: "white", cursor: "pointer" },
  actionGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
  assignButton: { padding: "8px 16px", background: "#4caf50", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 800, cursor: "pointer" },
  clearAssignmentButton: { padding: "8px 16px", background: "#f44336", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 800, cursor: "pointer" },
  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" }
};
