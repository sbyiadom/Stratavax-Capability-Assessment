// pages/supervisor-forgot-password.js

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../components/AppLayout";
import { supabase } from "../supabase/client";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getReadableResetError(error) {
  if (!error) return "Unable to send reset link. Please try again.";

  const message = String(error.message || error || "");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("email")) {
    return "Please enter a valid email address.";
  }

  if (lowerMessage.includes("rate") || lowerMessage.includes("too many")) {
    return "Too many reset attempts. Please wait a few minutes and try again.";
  }

  return message || "Unable to send reset link. Please try again.";
}

export default function SupervisorForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function verifySupervisorExists(emailAddress) {
    const { data, error } = await supabase
      .from("supervisor_profiles")
      .select("id, email, full_name, role")
      .eq("email", emailAddress)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const emailAddress = cleanEmail(email);

    if (!emailAddress) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }

    try {
      setLoading(true);

      const supervisor = await verifySupervisorExists(emailAddress);

      if (!supervisor) {
        setMessage({
          type: "error",
          text: "No supervisor account was found with this email address. Please confirm the email or contact an administrator."
        });
        return;
      }

      const redirectTo = typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(emailAddress, {
        redirectTo
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Password reset instructions have been sent. Please check your email and follow the reset link."
      });

      setTimeout(() => {
        router.push("/login");
      }, 4500);
    } catch (error) {
      console.error("Supervisor password reset error:", error);
      setMessage({ type: "error", text: getReadableResetError(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout background="/images/login-bg.jpg" showNavigation={false}>
      <div style={styles.centerOverlay}>
        <div style={styles.card}>
          <div style={styles.brandSection}>
            <div style={styles.brandIcon}>👑</div>
            <h1 style={styles.brandTitle}>Supervisor Password Reset</h1>
            <p style={styles.brandSubtitle}>Enter your supervisor email address to receive a secure reset link.</p>
          </div>

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

          <form onSubmit={handleResetPassword}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Supervisor Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={styles.input}
                placeholder="supervisor@company.com"
                disabled={loading}
                required
              />
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.primaryButton, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Sending Reset Link..." : "Send Reset Link"}
            </button>
          </form>

          <div style={styles.actionsRow}>
            <button type="button" onClick={() => router.push("/login")} style={styles.secondaryButton}>
              Back to Login
            </button>
          </div>

          <div style={styles.footerText}>
            <span>Remember your password? </span>
            <Link href="/login" legacyBehavior>
              <a style={styles.link}>Sign in here</a>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
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
    width: "430px",
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
    fontSize: "26px",
    fontWeight: "700",
    letterSpacing: "-0.5px"
  },
  brandSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "13px",
    margin: 0,
    lineHeight: 1.5
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
    marginBottom: "20px"
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
  actionsRow: {
    marginTop: "14px"
  },
  secondaryButton: {
    width: "100%",
    padding: "13px",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px"
  },
  footerText: {
    marginTop: "22px",
    textAlign: "center",
    paddingTop: "18px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.65)",
    fontSize: "13px"
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontWeight: "600"
  }
};
