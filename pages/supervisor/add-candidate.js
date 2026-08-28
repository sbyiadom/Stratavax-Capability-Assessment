// pages/supervisor/add-candidate.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

function generateCandidatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "Strat@";
  for (let index = 0; index < 8; index += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result + "9";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AddCandidate() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [createdCandidate, setCreatedCandidate] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    university: "",
    program: "",
    password: generateCandidatePassword(),
    send_invite: false
  });

  useEffect(() => {
    checkSupervisorAuth();
  }, []);

  const canSubmit = useMemo(() => {
    return cleanText(form.full_name).trim() && 
           isValidEmail(cleanText(form.email).trim()) && 
           cleanText(form.university).trim() &&
           cleanText(form.program).trim() &&
           (form.send_invite || cleanText(form.password).length >= 8);
  }, [form]);

  async function checkSupervisorAuth() {
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
        setMessage({ type: "error", text: "Supervisor access is required." });
        router.push("/login");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setIsSupervisor(true);
      setCurrentSupervisor({
        id: activeSession.user.id,
        email: activeSession.user.email,
        name: profile?.full_name || activeSession.user.user_metadata?.full_name || activeSession.user.email,
        role: resolvedRole
      });
    } catch (error) {
      console.error("Add candidate auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function resetForm() {
    setForm({
      full_name: "",
      email: "",
      phone: "",
      university: "",
      program: "",
      password: generateCandidatePassword(),
      send_invite: false
    });
    setCreatedCandidate(null);
    setTemporaryPassword("");
    setMessage({ type: "", text: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!cleanText(form.full_name).trim()) {
      setMessage({ type: "error", text: "Candidate full name is required." });
      return;
    }

    if (!isValidEmail(cleanText(form.email).trim())) {
      setMessage({ type: "error", text: "A valid candidate email is required." });
      return;
    }

    if (!cleanText(form.university).trim()) {
      setMessage({ type: "error", text: "University is required." });
      return;
    }

    if (!cleanText(form.program).trim()) {
      setMessage({ type: "error", text: "Program of study is required." });
      return;
    }

    if (!form.send_invite && cleanText(form.password).length < 8) {
      setMessage({ type: "error", text: "Temporary password must be at least 8 characters." });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      setCreatedCandidate(null);
      setTemporaryPassword("");

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;

      // Check if candidate already exists
      const { data: existing, error: checkError } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', cleanText(form.email).trim().toLowerCase())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        throw new Error("A candidate with this email already exists.");
      }

      // Create the candidate using the admin API endpoint (or use a supervisor-specific one)
      const response = await fetch("/api/admin/add-candidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({
          full_name: cleanText(form.full_name).trim(),
          email: cleanText(form.email).trim().toLowerCase(),
          phone: cleanText(form.phone).trim(),
          university: cleanText(form.university).trim(),
          program: cleanText(form.program).trim(),
          supervisor_id: currentSupervisor.id,
          password: form.send_invite ? "" : form.password,
          send_invite: form.send_invite
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to create candidate.");
      }

      setCreatedCandidate(result.candidate || null);
      setTemporaryPassword(result.temporary_password || "");
      setMessage({ 
        type: "success", 
        text: result.message || "Candidate created successfully." 
      });

      // Reset form but keep success message
      setForm((previous) => ({
        ...previous,
        full_name: "",
        email: "",
        phone: "",
        university: "",
        program: "",
        password: generateCandidatePassword(),
        send_invite: false
      }));

      // Auto-redirect after 5 seconds
      setTimeout(() => {
        router.push('/supervisor/manage-candidate');
      }, 5000);

    } catch (error) {
      console.error("Add candidate submit error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  async function copyTemporaryPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setMessage({ type: "success", text: "Temporary password copied to clipboard." });
    } catch (error) {
      setMessage({ type: "error", text: "Could not copy password. Please copy it manually." });
    }
  }

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking supervisor access...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isSupervisor) {
    return (
      <AppLayout>
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button onClick={() => router.push("/supervisor")} style={styles.button}>Go to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            onClick={() => router.push('/supervisor/manage-candidate')}
            style={styles.backButton}
          >
            ← Back to Candidates
          </button>
          <div>
            <h1 style={styles.title}>Add New Candidate</h1>
            <p style={styles.subtitle}>Create a candidate account and profile.</p>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.supervisorBadge}>
              👑 {currentSupervisor?.name || 'Supervisor'}
            </span>
          </div>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
          }}>
            {message.type === "success" && <span style={{ marginRight: '8px' }}>✅</span>}
            {message.type === "error" && <span style={{ marginRight: '8px' }}>⚠️</span>}
            {message.text}
            {message.type === "success" && (
              <p style={styles.redirectingText}>Redirecting to candidate list in 5 seconds...</p>
            )}
          </div>
        )}

        <div style={styles.layoutGrid}>
          <form onSubmit={handleSubmit} style={styles.formCard}>
            <h2 style={styles.sectionTitle}>Candidate Details</h2>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(event) => updateField("full_name", event.target.value)}
                style={styles.input}
                placeholder="Enter candidate full name"
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                style={styles.input}
                placeholder="candidate@example.com"
                required
              />
              <p style={styles.hint}>Candidate will use this email to login</p>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>University *</label>
              <select
                value={form.university}
                onChange={(event) => updateField("university", event.target.value)}
                style={styles.input}
                required
              >
                <option value="">Select University</option>
                <option value="KNUST">KNUST</option>
                <option value="University of Mines and Technology">University of Mines and Technology</option>
                <option value="Kumasi Technical University">Kumasi Technical University</option>
                <option value="Accra Technical University">Accra Technical University</option>
                <option value="Koforidua Technical University">Koforidua Technical University</option>
                <option value="Regional Maritime University">Regional Maritime University</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Program of Study *</label>
              <input
                type="text"
                value={form.program}
                onChange={(event) => updateField("program", event.target.value)}
                style={styles.input}
                placeholder="e.g., BSc Mechanical Engineering"
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Phone Number (Optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                style={styles.input}
                placeholder="+233 XX XXX XXXX"
              />
            </div>

            <div style={styles.optionBox}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.send_invite}
                  onChange={(event) => updateField("send_invite", event.target.checked)}
                />
                Send Supabase invite email instead of setting a temporary password
              </label>
            </div>

            {!form.send_invite && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Temporary Password</label>
                <div style={styles.passwordRow}>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    style={styles.input}
                    required
                  />
                  <button type="button" onClick={() => updateField("password", generateCandidatePassword())} style={styles.generateButton}>Generate</button>
                </div>
                <p style={styles.hint}>Share this temporary password securely with the candidate. The candidate can change the password later.</p>
              </div>
            )}

            <div style={styles.infoBox}>
              <h4 style={styles.infoTitle}>📋 What happens next:</h4>
              <ul style={styles.infoList}>
                <li>A temporary password will be generated automatically</li>
                <li>The candidate will be assigned to you as their supervisor</li>
                <li>Share the credentials with the candidate securely</li>
                <li>The candidate can login at <code style={styles.code}>/login</code> (Candidate mode)</li>
                <li>You'll be able to view their assessment reports once completed</li>
              </ul>
            </div>

            <div style={styles.actionRow}>
              <button type="button" onClick={resetForm} style={styles.secondaryButton}>Clear</button>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                style={{ 
                  ...styles.submitButton, 
                  opacity: loading || !canSubmit ? 0.6 : 1, 
                  cursor: loading || !canSubmit ? "not-allowed" : "pointer" 
                }}
              >
                {loading ? "Creating..." : "Add Candidate"}
              </button>
            </div>
          </form>

          <div style={styles.sideCard}>
            <h2 style={styles.sectionTitle}>After Candidate Creation</h2>
            <div style={styles.infoBoxSide}>
              <strong>Next steps:</strong>
              <ol style={styles.list}>
                <li>Confirm the candidate appears in Manage Candidates.</li>
                <li>Assign assessments to the candidate.</li>
                <li>Share login details securely if a temporary password was used.</li>
                <li>Monitor candidate progress in the dashboard.</li>
              </ol>
            </div>

            {createdCandidate && (
              <div style={styles.successPanel}>
                <h3 style={styles.successTitle}>✅ Candidate Created</h3>
                <p style={styles.detailText}><strong>Name:</strong> {createdCandidate.full_name}</p>
                <p style={styles.detailText}><strong>Email:</strong> {createdCandidate.email}</p>
                <p style={styles.detailText}><strong>University:</strong> {createdCandidate.university || 'Not specified'}</p>
                <p style={styles.detailText}><strong>Program:</strong> {createdCandidate.program || 'Not specified'}</p>
                {temporaryPassword && (
                  <div style={styles.passwordPanel}>
                    <p style={styles.detailText}><strong>Temporary Password:</strong></p>
                    <code style={styles.passwordCode}>{temporaryPassword}</code>
                    <button type="button" onClick={copyTemporaryPassword} style={styles.copyButton}>Copy Password</button>
                  </div>
                )}
                <div style={styles.linkRow}>
                  <button onClick={() => router.push('/supervisor/manage-candidate')} style={styles.primaryLink}>
                    Manage Candidates
                  </button>
                  <button onClick={() => router.push('/supervisor/assign-assessment')} style={styles.secondaryLink}>
                    Assign Assessments
                  </button>
                </div>
              </div>
            )}
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
  checkingText: { 
    margin: 0, 
    color: "rgba(255,255,255,0.9)", 
    fontSize: "14px" 
  },
  spinner: { 
    width: "40px", 
    height: "40px", 
    border: "4px solid rgba(255,255,255,0.3)", 
    borderTop: "4px solid white", 
    borderRadius: "50%", 
    animation: "spin 1s linear infinite", 
    marginBottom: "20px" 
  },
  container: { 
    width: "90vw", 
    maxWidth: "1200px", 
    margin: "0 auto", 
    padding: "30px 20px" 
  },
  header: { 
    display: "flex", 
    alignItems: "center", 
    gap: "20px", 
    marginBottom: "24px", 
    background: "white", 
    padding: "22px 30px", 
    borderRadius: "16px", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)", 
    flexWrap: "wrap" 
  },
  backButton: { 
    color: "#0a1929", 
    textDecoration: "none", 
    fontSize: "14px", 
    fontWeight: 700, 
    padding: "8px 16px", 
    borderRadius: "8px", 
    border: "1px solid #0a1929", 
    background: "transparent", 
    cursor: "pointer",
    transition: "all 0.2s ease",
    ':hover': {
      background: "#0a1929",
      color: "white"
    }
  },
  title: { 
    margin: 0, 
    color: "#0a1929", 
    fontSize: "24px", 
    fontWeight: 800 
  },
  subtitle: { 
    margin: "5px 0 0", 
    color: "#667085", 
    fontSize: "14px" 
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto'
  },
  supervisorBadge: {
    padding: '8px 16px',
    background: '#E3F2FD',
    color: '#1565C0',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600
  },
  redirectingText: {
    marginTop: '8px',
    fontSize: '13px',
    fontWeight: 500,
    opacity: 0.8
  },
  message: { 
    padding: "13px 18px", 
    borderRadius: "10px", 
    marginBottom: "20px", 
    fontSize: "14px", 
    lineHeight: 1.5 
  },
  layoutGrid: { 
    display: "grid", 
    gridTemplateColumns: "minmax(0, 1.3fr) minmax(300px, 0.7fr)", 
    gap: "22px", 
    alignItems: "start" 
  },
  formCard: { 
    background: "white", 
    borderRadius: "16px", 
    padding: "24px", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)", 
    border: "1px solid #eef2f7" 
  },
  sideCard: { 
    background: "white", 
    borderRadius: "16px", 
    padding: "24px", 
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)", 
    border: "1px solid #eef2f7" 
  },
  sectionTitle: { 
    margin: "0 0 20px", 
    color: "#0a1929", 
    fontSize: "18px", 
    fontWeight: 800 
  },
  fieldGroup: { 
    marginBottom: "18px" 
  },
  label: { 
    display: "block", 
    marginBottom: "8px", 
    fontSize: "14px", 
    fontWeight: 800, 
    color: "#2d3748" 
  },
  input: { 
    width: "100%", 
    padding: "11px 12px", 
    border: "2px solid #e2e8f0", 
    borderRadius: "8px", 
    fontSize: "14px", 
    outline: "none", 
    boxSizing: "border-box", 
    background: "white",
    transition: "border-color 0.2s ease",
    ':focus': {
      borderColor: "#0a1929"
    }
  },
  passwordRow: { 
    display: "flex", 
    gap: "10px" 
  },
  generateButton: { 
    padding: "10px 16px", 
    background: "#1565c0", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    fontSize: "13px", 
    fontWeight: 800, 
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  hint: { 
    margin: "7px 0 0", 
    color: "#667085", 
    fontSize: "12px", 
    lineHeight: 1.5 
  },
  optionBox: { 
    background: "#f8fafc", 
    border: "1px solid #e2e8f0", 
    borderRadius: "10px", 
    padding: "12px", 
    marginBottom: "18px" 
  },
  checkboxLabel: { 
    display: "flex", 
    gap: "10px", 
    alignItems: "flex-start", 
    color: "#334155", 
    fontSize: "13px", 
    lineHeight: 1.5, 
    cursor: "pointer" 
  },
  infoBox: {
    background: '#F8FAFC',
    padding: '16px',
    borderRadius: '8px',
    margin: '10px 0 20px 0'
  },
  infoTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#4A5568',
    fontSize: '13px',
    lineHeight: '1.8'
  },
  code: {
    background: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  actionRow: { 
    display: "flex", 
    justifyContent: "flex-end", 
    gap: "12px", 
    marginTop: "24px", 
    flexWrap: "wrap" 
  },
  submitButton: { 
    padding: "12px 26px", 
    background: "#0a1929", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    fontSize: "14px", 
    fontWeight: 800,
    transition: "all 0.2s ease",
    ':hover': {
      background: "#1a2a3a",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(10,25,41,0.3)"
    }
  },
  secondaryButton: { 
    padding: "12px 22px", 
    background: "#f1f5f9", 
    color: "#0a1929", 
    border: "1px solid #cbd5e1", 
    borderRadius: "8px", 
    fontSize: "14px", 
    fontWeight: 800, 
    cursor: "pointer",
    transition: "all 0.2s ease",
    ':hover': {
      background: "#e2e8f0"
    }
  },
  infoBoxSide: { 
    background: "#f8fafc", 
    border: "1px solid #e2e8f0", 
    borderRadius: "10px", 
    padding: "14px", 
    color: "#334155", 
    fontSize: "13px", 
    lineHeight: 1.6 
  },
  list: { 
    margin: "10px 0 0", 
    paddingLeft: "20px" 
  },
  successPanel: { 
    marginTop: "20px", 
    background: "#e8f5e9", 
    border: "1px solid #a5d6a7", 
    borderRadius: "12px", 
    padding: "16px", 
    color: "#2e7d32" 
  },
  successTitle: { 
    margin: "0 0 12px", 
    color: "#2e7d32", 
    fontSize: "16px", 
    fontWeight: 800 
  },
  detailText: { 
    margin: "6px 0", 
    fontSize: "13px", 
    lineHeight: 1.5 
  },
  passwordPanel: { 
    marginTop: "12px", 
    padding: "12px", 
    background: "white", 
    borderRadius: "10px" 
  },
  passwordCode: { 
    display: "block", 
    padding: "10px", 
    background: "#0a1929", 
    color: "white", 
    borderRadius: "8px", 
    marginBottom: "10px", 
    fontSize: "13px", 
    wordBreak: "break-all" 
  },
  copyButton: { 
    padding: "8px 12px", 
    background: "#1565c0", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    fontSize: "12px", 
    fontWeight: 800, 
    cursor: "pointer",
    transition: "all 0.2s ease",
    ':hover': {
      background: "#0d47a1"
    }
  },
  linkRow: { 
    display: "flex", 
    gap: "10px", 
    flexWrap: "wrap", 
    marginTop: "14px" 
  },
  primaryLink: { 
    padding: "9px 12px", 
    background: "#0a1929", 
    color: "white", 
    borderRadius: "8px", 
    border: "none",
    textDecoration: "none", 
    fontSize: "12px", 
    fontWeight: 800, 
    cursor: "pointer",
    transition: "all 0.2s ease",
    ':hover': {
      background: "#1a2a3a"
    }
  },
  secondaryLink: { 
    padding: "9px 12px", 
    background: "white", 
    color: "#0a1929", 
    border: "1px solid #cbd5e1", 
    borderRadius: "8px", 
    textDecoration: "none", 
    fontSize: "12px", 
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ':hover': {
      background: "#f8fafc"
    }
  },
  unauthorized: { 
    textAlign: "center", 
    padding: "60px", 
    color: "#667085", 
    background: "white", 
    borderRadius: "16px", 
    maxWidth: "400px", 
    margin: "100px auto" 
  },
  button: { 
    padding: "10px 20px", 
    background: "#0a1929", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    cursor: "pointer", 
    fontSize: "14px", 
    fontWeight: 700, 
    marginTop: "20px" 
  }
};
