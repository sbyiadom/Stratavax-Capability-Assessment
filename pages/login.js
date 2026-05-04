// pages/login.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";
import AppLayout from "../components/AppLayout";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getSafeName(user) {
  if (!user) return "User";
  return user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
}

function buildSessionData(user, authSession, role, fullName) {
  return {
    loggedIn: true,
    user_id: user.id,
    email: user.email,
    full_name: fullName || getSafeName(user),
    role: role || "candidate",
    access_token: authSession?.access_token || null,
    refresh_token: authSession?.refresh_token || null,
    timestamp: Date.now()
  };
}

async function getSupervisorProfile(userId, email) {
  const byIdResponse = await supabase
    .from("supervisor_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (byIdResponse.error && byIdResponse.error.code !== "PGRST116") {
    throw byIdResponse.error;
  }

  if (byIdResponse.data) return byIdResponse.data;

  const byEmailResponse = await supabase
    .from("supervisor_profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (byEmailResponse.error && byEmailResponse.error.code !== "PGRST116") {
    throw byEmailResponse.error;
  }

  return byEmailResponse.data || null;
}

async function getCandidateProfile(userId, email, user) {
  const profileResponse = await supabase
    .from("candidate_profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (profileResponse.error && profileResponse.error.code !== "PGRST116") {
    throw profileResponse.error;
  }

  if (profileResponse.data) return profileResponse.data;

  const fallbackName = getSafeName(user);

  const insertResponse = await supabase
    .from("candidate_profiles")
    .upsert({
      id: userId,
      email,
      full_name: fallbackName,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" })
    .select("id, full_name, email")
    .maybeSingle();

  if (insertResponse.error && insertResponse.error.code !== "PGRST116") {
    console.error("Candidate profile upsert warning:", insertResponse.error);
  }

  return insertResponse.data || { id: userId, email, full_name: fallbackName };
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("candidate");
  const [checkingSession, setCheckingSession] = useState(true);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const authResponse = await supabase.auth.getSession();
      const currentSession = authResponse?.data?.session || null;
      const currentUser = currentSession?.user || null;

      if (!currentUser) {
        setCheckingSession(false);
        return;
      }

      const role = currentUser.user_metadata?.role || null;

      if (role === "admin") {
        router.replace("/admin");
        return;
      }

      if (role === "supervisor") {
        router.replace("/supervisor");
        return;
      }

      if (role === "candidate") {
        router.replace("/candidate/dashboard");
        return;
      }

      setCheckingSession(false);
    } catch (sessionError) {
      console.error("Session check warning:", sessionError);
      setCheckingSession(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const safeEmail = cleanEmail(email);

      if (!safeEmail || !password) {
        throw new Error("Please enter your email and password.");
      }

      await supabase.auth.signOut();
      localStorage.removeItem("userSession");

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password
      });

      if (signInError || !data?.user) {
        throw new Error("Invalid email or password.");
      }

      const user = data.user;
      const authSession = data.session;

      if (loginMode === "supervisor") {
        const supervisorProfile = await getSupervisorProfile(user.id, safeEmail);

        if (!supervisorProfile) {
          await supabase.auth.signOut();
          localStorage.removeItem("userSession");
          throw new Error("No supervisor account found for these credentials.");
        }

        const role = supervisorProfile.role || "supervisor";
        const fullName = supervisorProfile.full_name || getSafeName(user);

        await supabase.auth.updateUser({
          data: {
            role,
            full_name: fullName
          }
        });

        localStorage.setItem("userSession", JSON.stringify(buildSessionData(user, authSession, role, fullName)));

        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/supervisor");
        }

        return;
      }

      const candidateProfile = await getCandidateProfile(user.id, safeEmail, user);
      const candidateName = candidateProfile?.full_name || getSafeName(user);

      await supabase.auth.updateUser({
        data: {
          role: "candidate",
          full_name: candidateName
        }
      });

      localStorage.setItem("userSession", JSON.stringify(buildSessionData(user, authSession, "candidate", candidateName)));
      router.push("/candidate/dashboard");
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError(loginError?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setResetLoading(true);
    setResetMessage(null);

    try {
      const safeEmail = cleanEmail(resetEmail);
      if (!safeEmail) throw new Error("Please enter your email address.");

      const redirectTo = typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(safeEmail, {
        redirectTo
      });

      if (resetError) throw resetError;

      setResetMessage({
        type: "success",
        text: "If an account exists for this email, a password reset link has been sent. Please check your inbox."
      });

      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail("");
        setResetMessage(null);
      }, 5000);
    } catch (resetError) {
      console.error("Password reset error:", resetError);
      setResetMessage({
        type: "error",
        text: resetError?.message || "Unable to send reset link. Please try again later."
      });
    } finally {
      setResetLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <AppLayout background="/images/login-bg.jpg" showNavigation={false}>
        <div style={styles.centerOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Checking session...</p>
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

  return (
    <AppLayout background="/images/login-bg.jpg" showNavigation={false}>
      <div style={styles.centerOverlay}>
        <div style={styles.card}>
          <div style={styles.brandSection}>
            <div style={styles.brandIcon}>🏢</div>
            <h1 style={styles.brandTitle}>Stratavax</h1>
            <p style={styles.brandSubtitle}>Talent Assessment Portal</p>
          </div>

          <div style={styles.modeToggle}>
            <button type="button" onClick={() => setLoginMode("candidate")} style={loginMode === "candidate" ? styles.modeButtonActive : styles.modeButton}>
              👤 Candidate
            </button>
            <button type="button" onClick={() => setLoginMode("supervisor")} style={loginMode === "supervisor" ? styles.modeButtonActive : styles.modeButton}>
              👑 Supervisor
            </button>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                required
                onChange={(event) => setPassword(event.target.value)}
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.loginButton, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Logging in..." : "Login as " + (loginMode === "candidate" ? "Candidate" : "Supervisor")}
            </button>
          </form>

          <div style={styles.forgotWrapper}>
            <button type="button" onClick={() => setShowResetModal(true)} style={styles.forgotButton}>
              Forgot Password?
            </button>
          </div>

          <div style={styles.registerWrapper}>
            <p style={styles.registerText}>
              Do not have an account?{" "}
              <Link href="/register" legacyBehavior>
                <a style={styles.registerLink}>Register here</a>
              </Link>
            </p>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Reset Password</h3>
              <button type="button" onClick={() => { setShowResetModal(false); setResetEmail(""); setResetMessage(null); }} style={styles.modalCloseButton}>×</button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  style={styles.input}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {resetMessage && (
                <div style={{
                  ...styles.resetMessage,
                  background: resetMessage.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  color: resetMessage.type === "success" ? "#bbf7d0" : "#fecaca",
                  border: "1px solid " + (resetMessage.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)")
                }}>
                  {resetMessage.text}
                </div>
              )}

              <button type="submit" disabled={resetLoading} style={{ ...styles.loginButton, opacity: resetLoading ? 0.7 : 1 }}>
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div style={styles.resetNote}>
              A secure password reset link will be sent to the email address if the account exists.
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.55);
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  centerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "rgba(0,0,0,0.3)"
  },
  loadingCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(20px)",
    padding: "30px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    textAlign: "center"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 14px"
  },
  loadingText: { margin: 0, color: "white" },
  card: {
    backgroundColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(20px)",
    padding: "48px 40px",
    borderRadius: "24px",
    width: "420px",
    maxWidth: "100%",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)"
  },
  brandSection: { marginBottom: "24px", textAlign: "center" },
  brandIcon: {
    width: "64px",
    height: "64px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: "32px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
  },
  brandTitle: { margin: "0 0 8px", color: "white", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" },
  brandSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: 0, letterSpacing: "0.5px" },
  modeToggle: { display: "flex", gap: "10px", marginBottom: "24px", borderRadius: "14px", background: "rgba(0,0,0,0.25)", padding: "5px" },
  modeButton: { flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: "transparent", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  modeButtonActive: { flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: "rgba(255,255,255,0.95)", color: "#1a1a2e", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  errorBox: { backgroundColor: "rgba(239,68,68,0.2)", color: "#fee2e2", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontSize: "13px", border: "1px solid rgba(239,68,68,0.3)", textAlign: "center" },
  formGroup: { textAlign: "left", marginBottom: "18px" },
  label: { display: "block", marginBottom: "8px", fontWeight: "500", color: "rgba(255,255,255,0.9)", fontSize: "13px" },
  input: { width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", fontSize: "14px", color: "white", boxSizing: "border-box", outline: "none" },
  loginButton: { width: "100%", padding: "14px", background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)", color: "#1a1a2e", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: "700", fontSize: "15px" },
  forgotWrapper: { marginTop: "20px", textAlign: "center" },
  forgotButton: { background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: "13px" },
  registerWrapper: { marginTop: "24px", fontSize: "13px", color: "rgba(255,255,255,0.55)", textAlign: "center", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" },
  registerText: { margin: 0 },
  registerLink: { color: "white", textDecoration: "none", fontWeight: "600" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { background: "rgba(30,30,40,0.95)", backdropFilter: "blur(20px)", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  modalTitle: { fontSize: "22px", fontWeight: "700", color: "white", margin: 0 },
  modalCloseButton: { background: "rgba(255,255,255,0.1)", border: "none", width: "32px", height: "32px", borderRadius: "10px", fontSize: "20px", cursor: "pointer", color: "rgba(255,255,255,0.7)" },
  resetMessage: { padding: "12px", borderRadius: "12px", fontSize: "13px", marginBottom: "20px", whiteSpace: "pre-line" },
  resetNote: { marginTop: "16px", fontSize: "12px", color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.5 }
};
