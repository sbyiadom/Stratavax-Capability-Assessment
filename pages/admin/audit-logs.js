// pages/admin/audit-logs.js

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

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

function getInitial(name, email) {
  const source = cleanText(name, cleanText(email, "S"));
  return source.charAt(0).toUpperCase();
}

function getActionColor(action) {
  const colors = {
    login: { bg: "#e3f2fd", color: "#1565c0" },
    logout: { bg: "#e8eaf6", color: "#3949ab" },
    create: { bg: "#e8f5e9", color: "#2e7d32" },
    update: { bg: "#fff3e0", color: "#f57c00" },
    delete: { bg: "#ffebee", color: "#c62828" },
    assign: { bg: "#f3e5f5", color: "#7b1fa2" },
    unblock: { bg: "#e3f2fd", color: "#1565c0" },
    block: { bg: "#fff3e0", color: "#f57c00" },
    schedule: { bg: "#f3e5f5", color: "#6a1b9a" }
  };

  return colors[action] || { bg: "#f5f5f5", color: "#616161" };
}

function formatDate(value) {
  if (!value) return "N/A";

  try {
    const date = new Date(value);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "Today at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    if (days === 1) {
      return "Yesterday at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return "N/A";
  }
}

function getDateBoundary(dateRange) {
  const now = new Date();
  const start = new Date();

  if (dateRange === "today") {
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (dateRange === "week") {
    start.setDate(now.getDate() - 7);
    return start.toISOString();
  }

  if (dateRange === "month") {
    start.setDate(now.getDate() - 30);
    return start.toISOString();
  }

  return null;
}

function stringifyJson(value) {
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

export default function AuditLogs() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [auditTableAvailable, setAuditTableAvailable] = useState(true);

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
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setIsAdmin(true);
      await fetchLogs();
    } catch (error) {
      console.error("Audit logs auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchLogs() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      setAuditTableAvailable(true);

      let query = supabase
        .from("audit_logs")
        .select("id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at, supervisor:supervisor_profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200);

      const boundary = getDateBoundary(dateRange);
      if (boundary) query = query.gte("created_at", boundary);

      const { data, error } = await query;

      if (error) {
        console.error("Audit logs fetch warning:", error);
        setAuditTableAvailable(false);
        setLogs([]);
        setMessage({
          type: "error",
          text: "Audit logs table is not available or is not accessible. Create/configure the audit_logs table to enable persistent audit logging."
        });
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setAuditTableAvailable(false);
      setLogs([]);
      setMessage({ type: "error", text: "Failed to load audit logs: " + getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [dateRange]);

  const filteredLogs = useMemo(() => {
    return safeArray(logs).filter((log) => {
      if (filter !== "all" && log.action !== filter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          cleanText(log.supervisor?.full_name).toLowerCase().includes(term) ||
          cleanText(log.supervisor?.email).toLowerCase().includes(term) ||
          cleanText(log.action).toLowerCase().includes(term) ||
          cleanText(log.table_name).toLowerCase().includes(term) ||
          cleanText(log.record_id).toLowerCase().includes(term) ||
          cleanText(log.ip_address).toLowerCase().includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [logs, filter, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      login: filteredLogs.filter((log) => log.action === "login").length,
      create: filteredLogs.filter((log) => log.action === "create").length,
      update: filteredLogs.filter((log) => log.action === "update").length,
      delete: filteredLogs.filter((log) => log.action === "delete").length
    };
  }, [filteredLogs]);

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
          <div>
            <h1 style={styles.title}>Audit Logs</h1>
            <p style={styles.subtitle}>Review administrative and platform activity where audit logging is enabled.</p>
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

        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} style={styles.filterSelect}>
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="assign">Assign</option>
              <option value="unblock">Unblock</option>
              <option value="block">Block</option>
              <option value="schedule">Schedule</option>
            </select>

            <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} style={styles.filterSelect}>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            <input
              type="text"
              placeholder="Search logs by user, action, table, record, or IP..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button onClick={fetchLogs} style={styles.refreshButton}>Refresh</button>
        </div>

        <div style={styles.statsGrid}>
          <StatCard label="Total Events" value={stats.total} />
          <StatCard label="Logins" value={stats.login} />
          <StatCard label="Creations" value={stats.create} />
          <StatCard label="Updates" value={stats.update} />
          <StatCard label="Deletions" value={stats.delete} />
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinnerDark} />
              <p>Loading audit logs...</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Timestamp</th>
                    <th style={styles.tableHead}>User</th>
                    <th style={styles.tableHead}>Action</th>
                    <th style={styles.tableHead}>Table</th>
                    <th style={styles.tableHead}>Record ID</th>
                    <th style={styles.tableHead}>IP Address</th>
                    <th style={styles.tableHead}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.noData}>
                        {auditTableAvailable ? "No audit logs found for the selected filters." : "Audit logging is not configured yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const actionColor = getActionColor(log.action);
                      const oldData = stringifyJson(log.old_data);
                      const newData = stringifyJson(log.new_data);

                      return (
                        <tr key={log.id} style={styles.tableRow}>
                          <td style={styles.tableCell}><div style={styles.timestamp}>{formatDate(log.created_at)}</div></td>
                          <td style={styles.tableCell}>
                            {log.supervisor ? (
                              <div style={styles.userInfo}>
                                <div style={styles.userAvatar}>{getInitial(log.supervisor.full_name, log.supervisor.email)}</div>
                                <div>
                                  <div style={styles.userName}>{log.supervisor.full_name || "System"}</div>
                                  <div style={styles.userEmail}>{log.supervisor.email || ""}</div>
                                </div>
                              </div>
                            ) : (
                              <span style={styles.systemUser}>System</span>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{ ...styles.actionBadge, background: actionColor.bg, color: actionColor.color }}>
                              {cleanText(log.action, "unknown").toUpperCase()}
                            </span>
                          </td>
                          <td style={styles.tableCell}><code style={styles.tableName}>{log.table_name || "N/A"}</code></td>
                          <td style={styles.tableCell}><code style={styles.recordId}>{log.record_id ? log.record_id.substring(0, 8) + "..." : "N/A"}</code></td>
                          <td style={styles.tableCell}><span style={styles.ipAddress}>{log.ip_address || "N/A"}</span></td>
                          <td style={styles.tableCell}>
                            {(oldData || newData) ? (
                              <details style={styles.details}>
                                <summary style={styles.detailsSummary}>View Data</summary>
                                <pre style={styles.detailsPre}>{oldData ? "Old Data:\n" + oldData + "\n\n" : ""}{newData ? "New Data:\n" + newData : ""}</pre>
                              </details>
                            ) : (
                              <span style={styles.noDetails}>No details</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!auditTableAvailable && (
          <div style={styles.note}>
            <p style={styles.noteText}>
              <strong>Note:</strong> Persistent audit logging requires an <code>audit_logs</code> table and insert logic from your API/database triggers.
            </p>
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

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles = {
  checkingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)", color: "white", padding: "20px", textAlign: "center" },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  spinner: { width: "40px", height: "40px", border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "20px" },
  spinnerDark: { width: "38px", height: "38px", border: "4px solid #e2e8f0", borderTop: "4px solid #0a1929", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" },
  container: { width: "90vw", maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" },
  header: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  backButton: { color: "#0a1929", textDecoration: "none", fontSize: "14px", fontWeight: 700, padding: "8px 16px", borderRadius: "8px", border: "1px solid #0a1929" },
  title: { margin: 0, color: "#0a1929", fontSize: "24px", fontWeight: 800 },
  subtitle: { margin: "5px 0 0", color: "#667085", fontSize: "14px" },
  message: { padding: "13px 18px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  filterBar: { background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" },
  filterGroup: { display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 },
  filterSelect: { padding: "8px 16px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "white", cursor: "pointer", minWidth: "140px" },
  searchInput: { padding: "8px 16px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", minWidth: "280px", flex: 1, outline: "none" },
  refreshButton: { padding: "8px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 800, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "18px", marginBottom: "20px" },
  statCard: { background: "white", padding: "17px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #eef2f7" },
  statValue: { display: "block", fontSize: "28px", fontWeight: 800, color: "#0a1929", marginBottom: "5px" },
  statLabel: { fontSize: "12px", color: "#718096", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 },
  tableContainer: { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  loadingState: { textAlign: "center", padding: "60px", color: "#667085" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "980px" },
  tableHeadRow: { borderBottom: "2px solid #0a1929", background: "#f8fafc" },
  tableHead: { padding: "12px 15px", fontWeight: 800, color: "#0a1929", textAlign: "left", whiteSpace: "nowrap" },
  tableRow: { borderBottom: "1px solid #e2e8f0" },
  tableCell: { padding: "12px 15px", color: "#2d3748", verticalAlign: "middle" },
  noData: { padding: "40px", textAlign: "center", color: "#718096", fontStyle: "italic" },
  timestamp: { fontSize: "12px", color: "#4a5568", whiteSpace: "nowrap" },
  userInfo: { display: "flex", alignItems: "center", gap: "8px" },
  userAvatar: { width: "28px", height: "28px", borderRadius: "14px", background: "#0a1929", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800 },
  userName: { fontSize: "13px", fontWeight: 800, color: "#0a1929" },
  userEmail: { fontSize: "11px", color: "#718096" },
  systemUser: { fontSize: "13px", color: "#718096", fontStyle: "italic" },
  actionBadge: { padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 800, display: "inline-block", whiteSpace: "nowrap" },
  tableName: { background: "#edf2f7", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#2d3748" },
  recordId: { fontFamily: "monospace", fontSize: "11px", color: "#718096" },
  ipAddress: { fontSize: "12px", color: "#4a5568", fontFamily: "monospace" },
  details: { fontSize: "12px" },
  detailsSummary: { color: "#3182ce", cursor: "pointer", fontWeight: 700 },
  detailsPre: { background: "#2d3748", color: "#e2e8f0", padding: "8px", borderRadius: "4px", fontSize: "10px", overflow: "auto", maxWidth: "360px", maxHeight: "260px" },
  noDetails: { color: "#94a3b8", fontSize: "12px" },
  note: { marginTop: "20px", padding: "15px 20px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fde68a" },
  noteText: { margin: 0, color: "#92400e", fontSize: "14px" },
  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" }
};
