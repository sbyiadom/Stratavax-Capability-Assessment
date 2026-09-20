// pages/supervisor/batch-manage.js
// Phase 7B:
//   • Auth now calls /api/supervisor/me (server-side, RLS-safe) instead of
//     trusting user_metadata.role on the client.
//   • Removed the broken "Import CSV" button and BulkImportModal component.
//     The modal POSTed to /api/admin/batch-import, which does not exist —
//     clicking Import would silently 404. The feature will be rebuilt as a
//     proper endpoint in a later session.
//   • Everything else (list, view, delete, bulk delete, stats) is preserved.
//
// Reads:  GET  /api/supervisor/batch-manage/list
// Deletes: POST /api/supervisor/batch-delete-candidates

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SupervisorBatchManage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [candidates, setCandidates] = useState([]);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);

  useEffect(() => {
    checkSupervisorAuth();
  }, []);

  async function checkSupervisorAuth() {
    try {
      setCheckingAuth(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      const accessToken = activeSession.access_token;
      if (!accessToken) {
        router.replace("/login");
        return;
      }

      // Server-side profile lookup (RLS-safe, matches supervisor/add-candidate.js)
      const meResponse = await fetch("/api/supervisor/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
      });

      let mePayload;
      try {
        mePayload = await meResponse.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${meResponse.status}).`);
      }

      if (!meResponse.ok || !mePayload.success) {
        if (meResponse.status === 401 || meResponse.status === 403) {
          if (typeof window !== "undefined") localStorage.removeItem("userSession");
          router.replace("/login");
          return;
        }
        throw new Error(mePayload.error || `Failed to load profile (HTTP ${meResponse.status}).`);
      }

      const profile = mePayload.profile;

      if (!profile || !profile.role) {
        setMessage({ type: "error", text: "Supervisor access is required." });
        router.replace("/login");
        return;
      }

      if (profile.role !== "supervisor" && profile.role !== "admin") {
        setMessage({ type: "error", text: "Supervisor access is required." });
        router.replace("/login");
        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      setCurrentSupervisor({
        id: profile.id,
        email: profile.email || activeSession.user.email,
        name:
          profile.full_name ||
          activeSession.user.user_metadata?.full_name ||
          activeSession.user.email,
        role: profile.role,
      });

      await loadCandidates(accessToken);
    } catch (error) {
      console.error("Batch manage auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.replace("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  const loadCandidates = async (explicitToken) => {
    try {
      setLoading(true);

      let token = explicitToken;
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token;
      }

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/supervisor/batch-manage/list", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to load candidates (HTTP ${response.status}).`);
      }

      setCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
    } catch (error) {
      console.error("[Supervisor] Error loading candidates:", error);
      setCandidates([]);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (
      !confirm(
        "Are you sure you want to delete this candidate? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch("/api/supervisor/batch-delete-candidates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ candidateIds: [candidateId] }),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to delete candidate (HTTP ${response.status}).`);
      }

      setMessage({ type: "success", text: "Candidate deleted successfully." });
      await loadCandidates();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = candidates.filter((c) => c.selected).map((c) => c.id);
    if (selectedIds.length === 0) {
      setMessage({ type: "error", text: "No candidates selected for deletion." });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} candidate(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch("/api/supervisor/batch-delete-candidates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ candidateIds: selectedIds }),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to delete candidates (HTTP ${response.status}).`);
      }

      setMessage({
        type: "success",
        text: `${selectedIds.length} candidate(s) deleted successfully.`,
      });
      await loadCandidates();
    } catch (error) {
      console.error("Error bulk deleting candidates:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking supervisor access...</p>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <button onClick={() => router.push("/supervisor")} style={styles.backButton}>
                ← Back to Dashboard
              </button>
              <h1 style={styles.title}>📦 Batch Manage</h1>
              <p style={styles.subtitle}>
                Manage your candidates in bulk.
                {currentSupervisor?.name && ` 👑 ${currentSupervisor.name}`}
              </p>
            </div>
            <div style={styles.headerActions}>
              <button
                onClick={() => router.push("/supervisor/add-candidate")}
                style={styles.importButton}
              >
                + Add Candidate
              </button>
            </div>
          </div>

          {message.text && (
            <div
              style={{
                ...styles.message,
                background: message.type === "success" ? "#e8f5e9" : "#ffebee",
                color: message.type === "success" ? "#2e7d32" : "#c62828",
                border:
                  "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2"),
              }}
            >
              {message.text}
            </div>
          )}

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{candidates.length}</div>
              <div style={styles.statLabel}>Total Candidates</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {candidates.filter((c) => c.university).length}
              </div>
              <div style={styles.statLabel}>With University</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {candidates.filter((c) => c.programme).length}
              </div>
              <div style={styles.statLabel}>With Program</div>
            </div>
          </div>

          <div style={styles.bulkActions}>
            <button
              onClick={() => {
                const allSelected = candidates.every((c) => c.selected);
                setCandidates(candidates.map((c) => ({ ...c, selected: !allSelected })));
              }}
              style={styles.bulkActionButton}
            >
              {candidates.every((c) => c.selected) ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={handleBulkDelete}
              style={styles.bulkDeleteButton}
              disabled={!candidates.some((c) => c.selected)}
            >
              🗑️ Delete Selected ({candidates.filter((c) => c.selected).length})
            </button>
          </div>

          <div style={styles.tableContainer}>
            <div style={styles.tableWrapper}>
              {loading ? (
                <div style={styles.loadingState}>
                  <div style={styles.spinner} />
                  <p>Loading candidates...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📭</div>
                  <h3 style={styles.emptyTitle}>No Candidates Found</h3>
                  <p style={styles.emptyText}>
                    You haven't added any candidates yet. Add them individually to get
                    started.
                  </p>
                  <div style={styles.emptyActions}>
                    <button
                      onClick={() => router.push("/supervisor/add-candidate")}
                      style={styles.emptyButtonPrimary}
                    >
                      + Add Candidate
                    </button>
                  </div>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={candidates.every((c) => c.selected)}
                          onChange={() => {
                            const allSelected = candidates.every((c) => c.selected);
                            setCandidates(
                              candidates.map((c) => ({ ...c, selected: !allSelected }))
                            );
                          }}
                        />
                      </th>
                      <th style={styles.th}>Candidate</th>
                      <th style={styles.th}>University</th>
                      <th style={styles.th}>Program</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.id} style={styles.tr}>
                        <td style={styles.td}>
                          <input
                            type="checkbox"
                            checked={candidate.selected || false}
                            onChange={() => {
                              setCandidates(
                                candidates.map((c) =>
                                  c.id === candidate.id
                                    ? { ...c, selected: !c.selected }
                                    : c
                                )
                              );
                            }}
                          />
                        </td>
                        <td style={styles.td}>
                          <div style={styles.candidateName}>
                            {candidate.full_name || "Unknown"}
                          </div>
                          <div style={styles.candidateEmail}>
                            {candidate.email || ""}
                          </div>
                        </td>
                        <td style={styles.td}>{candidate.university || "N/A"}</td>
                        <td style={styles.td}>{candidate.programme || "N/A"}</td>
                        <td style={styles.td}>{candidate.phone || "N/A"}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() =>
                              router.push(`/supervisor/manage-candidate/${candidate.id}`)
                            }
                            style={styles.actionButton}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            style={styles.deleteActionButton}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  checkingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center",
  },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  container: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "30px 20px",
  },
  card: {
    width: "100%",
    maxWidth: "1200px",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "18px",
    padding: "36px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.45)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: { flex: 1 },
  headerActions: { display: "flex", gap: "12px", flexWrap: "wrap" },
  backButton: {
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#475569",
    marginBottom: "12px",
  },
  title: { margin: "0 0 8px", color: "#0a1929", fontSize: "26px", fontWeight: 800 },
  subtitle: { margin: "0 0 4px", color: "#667085", fontSize: "14px", lineHeight: 1.6 },
  importButton: {
    padding: "10px 20px",
    background: "#0a1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  message: {
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  statCard: {
    background: "#f8fafc",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  statNumber: { fontSize: "24px", fontWeight: "700", color: "#0a1929" },
  statLabel: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" },
  bulkActions: { display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
  bulkActionButton: {
    padding: "6px 16px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#475569",
  },
  bulkDeleteButton: {
    padding: "6px 16px",
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    color: "#991b1b",
  },
  tableContainer: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    background: "#f8fafc",
    fontWeight: "600",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "middle",
  },
  tr: { transition: "background 0.2s" },
  candidateName: { fontWeight: "500", color: "#1a202c" },
  candidateEmail: { fontSize: "12px", color: "#94a3b8" },
  actionButton: {
    padding: "4px 12px",
    background: "#4299e1",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    marginRight: "4px",
  },
  deleteActionButton: {
    padding: "4px 12px",
    background: "#fc8181",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  loadingState: {
    padding: "60px 20px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  emptyState: { padding: "60px 20px", textAlign: "center" },
  emptyIcon: { fontSize: "48px", display: "block", marginBottom: "16px" },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0a1929",
    margin: "0 0 8px 0",
  },
  emptyText: { fontSize: "14px", color: "#94a3b8", margin: "0 0 20px 0" },
  emptyActions: { display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" },
  emptyButtonPrimary: {
    padding: "10px 24px",
    background: "#0a1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  emptyButtonSecondary: {
    padding: "10px 24px",
    background: "#f1f5f9",
    color: "#0a1929",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  footer: { marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" },
  footerText: {
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
  },
};
