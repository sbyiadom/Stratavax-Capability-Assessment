// pages/admin/manage-supervisors.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
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

function getInitials(name, email) {
  const source = cleanName(name) || cleanEmail(email) || "S";
  return source.charAt(0).toUpperCase();
}

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  const message = String(error.message || error.error || error || "");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("already") || lowerMessage.includes("duplicate")) {
    return "A supervisor account already exists with this email address.";
  }

  if (lowerMessage.includes("permission") || lowerMessage.includes("forbidden") || lowerMessage.includes("unauthorized")) {
    return "You do not have permission to perform this action.";
  }

  if (lowerMessage.includes("password")) {
    return message || "Password does not meet the required standard.";
  }

  return message || "Something went wrong.";
}

export default function ManageSupervisors() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

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
      await fetchSupervisors();
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
      setLoading(true);

      const { data, error } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSupervisors(data || []);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  function resetModal() {
    setShowAddModal(false);
    setSaving(false);
    setFormData({ fullName: "", email: "", password: "", confirmPassword: "" });
  }

  async function handleAddSupervisor(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    setMessage({ type: "", text: "" });

    const fullName = cleanName(formData.fullName);
    const email = cleanEmail(formData.email);
    const password = String(formData.password || "");
    const confirmPassword = String(formData.confirmPassword || "");

    if (!fullName || !email || !password || !confirmPassword) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setSaving(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;

      const response = await fetch("/api/admin/add-supervisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: "supervisor"
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Failed to add supervisor.");
      }

      setMessage({ type: "success", text: "Supervisor added successfully." });
      resetModal();
      await fetchSupervisors();
    } catch (error) {
      console.error("Error adding supervisor:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(supervisor) {
    if (!supervisor?.id) return;

    if (supervisor.role === "admin") {
      setMessage({ type: "error", text: "Admin accounts cannot be deactivated from this page." });
      return;
    }

    try {
      setMessage({ type: "", text: "" });

      const { error } = await supabase
        .from("supervisor_profiles")
        .update({
          is_active: !supervisor.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", supervisor.id);

      if (error) throw error;

      setMessage({
        type: "success",
        text: supervisor.is_active ? "Supervisor deactivated successfully." : "Supervisor activated successfully."
      });

      await fetchSupervisors();
    } catch (error) {
      console.error("Error updating supervisor status:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("userSession");
    router.push("/login");
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
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Supervisors</h1>
            <p style={styles.subtitle}>View, activate, or deactivate supervisor accounts.</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.secondaryButton} onClick={fetchSupervisors}>Refresh</button>
            <button style={styles.addButton} onClick={() => setShowAddModal(true)}>+ Add Supervisor</button>
            <button style={styles.logoutButton} onClick={handleLogout}>Sign Out</button>
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

        {loading ? (
          <div style={styles.loading}>Loading supervisors...</div>
        ) : (
          <div style={styles.tableContainer}>
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Added</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.noData}>No supervisors found. Click Add Supervisor to create one.</td>
                    </tr>
                  ) : (
                    supervisors.map((supervisor) => (
                      <tr key={supervisor.id}>
                        <td style={styles.td}>
                          <div style={styles.supervisorInfo}>
                            <div style={styles.avatar}>{getInitials(supervisor.full_name, supervisor.email)}</div>
                            <span>{supervisor.full_name || "Unnamed"}</span>
                          </div>
                        </td>
                        <td style={styles.td}>{supervisor.email || "N/A"}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.roleBadge,
                            background: supervisor.role === "admin" ? "#ffebee" : "#e3f2fd",
                            color: supervisor.role === "admin" ? "#c62828" : "#1565c0"
                          }}>
                            {supervisor.role === "admin" ? "Administrator" : "Supervisor"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            background: supervisor.is_active ? "#e8f5e9" : "#ffebee",
                            color: supervisor.is_active ? "#2e7d32" : "#c62828"
                          }}>
                            {supervisor.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={styles.td}>{formatDate(supervisor.created_at)}</td>
                        <td style={styles.td}>
                          <button
                            style={{
                              ...styles.actionButton,
                              background: supervisor.is_active ? "#ff9800" : "#4caf50",
                              opacity: supervisor.role === "admin" ? 0.5 : 1,
                              cursor: supervisor.role === "admin" ? "not-allowed" : "pointer"
                            }}
                            disabled={supervisor.role === "admin"}
                            onClick={() => handleToggleStatus(supervisor)}
                          >
                            {supervisor.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showAddModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Add New Supervisor</h2>
              <form onSubmit={handleAddSupervisor}>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleFormChange}
                  style={styles.input}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleFormChange}
                  style={styles.input}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Temporary Password"
                  value={formData.password}
                  onChange={handleFormChange}
                  style={styles.input}
                  minLength={6}
                  required
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Temporary Password"
                  value={formData.confirmPassword}
                  onChange={handleFormChange}
                  style={styles.input}
                  minLength={6}
                  required
                />

                <div style={styles.modalInfo}>
                  <p style={styles.infoText}>Supervisor access details:</p>
                  <ul style={styles.infoList}>
                    <li>Login at <code>/login</code> and select Supervisor mode.</li>
                    <li>Dashboard URL: <code>/supervisor</code></li>
                    <li>Supervisors should change temporary passwords after first login.</li>
                  </ul>
                </div>

                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelButton} onClick={resetModal}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ ...styles.saveButton, opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Adding..." : "Add Supervisor"}
                  </button>
                </div>
              </form>
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
  checkingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center"
  },
  spinner: {
    width: "42px",
    height: "42px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "18px"
  },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  title: { fontSize: "24px", fontWeight: 800, color: "#0a1929", margin: "0 0 5px" },
  subtitle: { fontSize: "14px", color: "#667085", margin: 0 },
  headerActions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  addButton: { padding: "12px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { padding: "12px 20px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
  logoutButton: { padding: "12px 20px", background: "#d32f2f", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
  message: { padding: "14px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  tableContainer: { background: "white", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "780px" },
  th: { textAlign: "left", padding: "15px 20px", background: "#f8fafc", borderBottom: "2px solid #0a1929", fontWeight: 800, color: "#0a1929" },
  td: { padding: "15px 20px", borderBottom: "1px solid #e2e8f0", color: "#2d3748" },
  noData: { padding: "40px", textAlign: "center", color: "#718096", fontStyle: "italic" },
  supervisorInfo: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: { width: "32px", height: "32px", borderRadius: "16px", background: "#0a1929", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800 },
  roleBadge: { padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 800, display: "inline-block" },
  statusBadge: { padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 800, display: "inline-block" },
  actionButton: { padding: "7px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "white" },
  loading: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)", padding: "20px" },
  modal: { background: "white", padding: "30px", borderRadius: "16px", width: "460px", maxWidth: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalTitle: { fontSize: "20px", fontWeight: 800, margin: "0 0 20px", color: "#0a1929" },
  input: { width: "100%", padding: "12px", marginBottom: "14px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", outline: "none" },
  modalInfo: { background: "#f8fafc", padding: "15px", borderRadius: "8px", margin: "18px 0", border: "1px solid #e2e8f0" },
  infoText: { margin: "0 0 10px", fontWeight: 800, color: "#0a1929" },
  infoList: { margin: 0, paddingLeft: "20px", color: "#4a5568", fontSize: "13px", lineHeight: 1.6 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  cancelButton: { padding: "10px 20px", background: "#e2e8f0", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, color: "#2d3748" },
  saveButton: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 800 },
  unauthorized: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px", maxWidth: "400px", margin: "100px auto" },
  button: { padding: "10px 20px", background: "#0a1929", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700, marginTop: "20px" }
};
