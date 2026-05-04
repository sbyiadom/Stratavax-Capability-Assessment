// pages/reset-password.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../components/AppLayout";
import { supabase } from "../supabase/client";

function getReadableError(error) {
  if (!error) return "Something went wrong. Please try again.";
  const message = error.message || String(error);

  if (message.toLowerCase().includes("auth session missing")) {
    return "Password reset session was not found. Please request a new reset link from the login page.";
  }

  if (message.toLowerCase().includes("expired")) {
    return "This password reset link has expired. Please request a new reset link.";
  }

  return message;
}

export default function ResetPassword() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    initializeRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      if (listener && listener.subscription) listener.subscription.unsubscribe();
    };
  }, []);

  async function initializeRecoverySession() {
    try {
      setCheckingSession(true);
      setMessage({ type: "", text: "" });

      if (router.query.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(String(router.query.code));
        if (error) throw error;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data && data.session) {
        setHasRecoverySession(true);
      } else {
        setHasRecoverySession(false);
        setMessage({
          type: "error",
          text: "No active password reset session was found. Please request a new reset link from the login page."
        });
      }
    } catch (error) {
      console.error("Reset session error:", error);
      setHasRecoverySession(false);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setCheckingSession(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    if (!hasRecoverySession) {
      setMessage({
        type: "error",
        text: "Password reset session is not active. Please request a new reset link from the login page."
      });
      return;
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      setMessage({ type: "error", text: "Please enter and confirm your new password." });
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password updated successfully. Redirecting to login..."
      });

      setFormData({ newPassword: "", confirmPassword: "" });

      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, 1800);
    } catch (error) {
      console.error("Password update error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout background="/images/login-bg.jpg" showNavigation={false}>
      <div style={styles.centerOverlay}>
        <div style={styles.card}>
          <div style={styles.brandSection}>
            <div style={styles.brandIcon}>🔐</div>
            <h1 style={styles.brandTitle}>Reset Password</h1>
            <p style={styles.brandSubtitle}>Create a new password for your Stratavax account.</p>
          </div>

          {checkingSession ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Validating reset link...</p>
            </div>
          ) : (
            <>
              {message.text && (
                <div style={{
                  ...styles.message,
                  background: message.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  color: message.type === "success" ? "#bbf7d0" : "#fecaca",
                  border: "1px solid " + (message.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)")
                }}>
                  {message.text}
                </div>
              )}

              {hasRecoverySession && (
                <form onSubmit={handleUpdatePassword}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      required
                      style={styles.input}
                    />
                  </div>

                  <button type="submit" disabled={loading} style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}

              <div style={styles.footerText}>
                <Link href="/login" legacyBehavior>
                  <a style={styles.link}>Back to Login</a>
                </Link>
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
    background: "rgba(0,0,0,0.35)"
  },
  card: {
    width: "420px",
    maxWidth: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(20px)",
    padding: "44px 38px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)"
  },
  brandSection: {
    marginBottom: "24px",
    textAlign: "center"
  },
  brandIcon: {
    width: "64px",
    height: "64px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: "32px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
  },
  brandTitle: {
    margin: "0 0 8px",
    color: "white",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.5px"
  },
  brandSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "13px",
    margin: 0,
    lineHeight: 1.5
  },
  loadingBox: {
    textAlign: "center",
    padding: "16px 0"
  },
  spinner: {
    width: "42px",
    height: "42px",
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 14px"
  },
  loadingText: {
    margin: 0,
    color: "rgba(255,255,255,0.85)",
    fontSize: "14px"
  },
  message: {
    padding: "12px 14px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "13px",
    textAlign: "center",
    lineHeight: 1.5
  },
  formGroup: {
    textAlign: "left",
    marginBottom: "18px"
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    fontSize: "13px"
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    fontSize: "14px",
    color: "white",
    boxSizing: "border-box",
    outline: "none"
  },
  primaryButton: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
    color: "#1a1a2e",
    border: "none",
    borderRadius: "14px",
    fontWeight: "700",
    fontSize: "15px"
  },
  footerText: {
    marginTop: "22px",
    textAlign: "center",
    paddingTop: "18px",
    borderTop: "1px solid rgba(255,255,255,0.1)"
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "13px"
  }
};
