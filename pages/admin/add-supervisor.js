// pages/admin/add-supervisor.js

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

function getReadableError(error) {
  if (!error) return "Failed to add supervisor.";

  const message = String(error.message || error.error || error || "");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("already") || lowerMessage.includes("duplicate")) {
    return "A supervisor or user account already exists with this email address.";
  }

  if (lowerMessage.includes("password")) {
    return message || "The password does not meet the required standard.";
  }

  if (lowerMessage.includes("permission") || lowerMessage.includes("unauthorized") || lowerMessage.includes("forbidden")) {
    return "You do not have permission to perform this action.";
  }

  return message || "Failed to add supervisor.";
}

export default function AddSupervisor() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

      const { data: adminProfile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = adminProfile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Admin access is required." });
        router.push("/supervisor");
        return;
      }

      if (adminProfile?.is_active === false) {
        setMessage({ type: "error", text: "This admin account is inactive." });
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Admin auth check error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function checkSupervisorEmailExists(emailAddress) {
    try {
      const { data, error } = await supabase
        .from("supervisor_profiles")
        .select("id, email")
        .eq("email", emailAddress)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return Boolean(data);
    } catch (error) {
      console.error("Supervisor email check warning:", error);
      return false;
    }
  }

  async function handleAddSupervisor(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const fullName = cleanName(name);
    const emailAddress = cleanEmail(email);

    if (!fullName) {
      setMessage({ type: "error", text: "Please enter the supervisor full name." });
      return;
    }

    if (!emailAddress) {
      setMessage({ type: "error", text: "Please enter the supervisor email address." });
      return;
    }

    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "Temporary password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);

      const exists = await checkSupervisorEmailExists(emailAddress);
      if (exists) {
        setMessage({ type: "error", text: "A supervisor profile already exists with this email address." });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;

      const response = await fetch("/api/admin/add-supervisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({
          email: emailAddress,
          password,
          full_name: fullName,
          role: "supervisor"
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Failed to add supervisor");
      }

      setMessage({
        type: "success",
        text: "Supervisor added successfully. Share the login credentials securely."
      });

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Add supervisor error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("userSession");
    router.push("/login");
  }

  if (checkingAuth || !isAdmin) {
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

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.pageWrap}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Add New Supervisor</h1>
              <p style={styles.subtitle}>Create a supervisor account and grant dashboard access.</p>
            </div>
            <div style={styles.headerActions}>
              <button type="button" onClick={() => router.push("/admin")} style={styles.backButton}>← Admin</button>
              <button type="button" onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
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

          <form onSubmit={handleAddSupervisor} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                placeholder="Enter supervisor full name"
                value={name}
                required
                onChange={(event) => setName(event.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="supervisor@company.com"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Temporary Password</label>
              <input
                type="password"
                placeholder="Set initial password"
                value={password}
                required
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                style={styles.input}
              />
              <div style={styles.hint}>Minimum 6 characters. The supervisor should change this after first login.</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Temporary Password</label>
              <input
                type="password"
                placeholder="Confirm initial password"
                value={confirmPassword}
                required
                minLength={6}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.submitButton, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Adding Supervisor..." : "Add Supervisor"}
            </button>
          </form>

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>Supervisor Access Information</h3>
            <ul style={styles.infoList}>
              <li>Login URL: <code>/login</code> then select Supervisor mode.</li>
              <li>Dashboard URL: <code>/supervisor</code></li>
              <li>Role assigned: <code>supervisor</code></li>
              <li>Supervisor credentials should be shared through a secure channel.</li>
              <li>Supervisor should change the temporary password after first login.</li>
            </ul>
          </div>
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
  checkingText: {
    margin: 0,
    color: "rgba(255,255,255,0.9)",
    fontSize: "14px"
  },
  pageWrap: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px"
  },
  card: {
    width: "100%",
    maxWidth: "760px",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "18px",
    padding: "34px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.4)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap"
  },
  title: {
    margin: 0,
    color: "#0a1929",
    fontSize: "28px",
    fontWeight: 800
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#667085",
    fontSize: "14px"
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  backButton: {
    padding: "9px 16px",
    background: "#1565c0",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700
  },
  logoutButton: {
    padding: "9px 16px",
    background: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700
  },
  message: {
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "22px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0a1929"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d0d5dd",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    background: "white"
  },
  hint: {
    fontSize: "12px",
    color: "#667085"
  },
  submitButton: {
    gridColumn: "1 / -1",
    width: "100%",
    padding: "14px",
    background: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontWeight: 800,
    fontSize: "16px"
  },
  infoBox: {
    marginTop: "28px",
    padding: "20px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0"
  },
  infoTitle: {
    margin: "0 0 14px",
    color: "#0a1929",
    fontSize: "16px",
    fontWeight: 800
  },
  infoList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.7
  }
};
