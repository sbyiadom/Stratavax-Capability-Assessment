// pages/register.js

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";
import AppLayout from "../components/AppLayout";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getReadableSignupError(error) {
  if (!error) return "Registration failed. Please try again.";

  const message = String(error.message || error || "").toLowerCase();

  if (message.includes("already registered") || message.includes("already exists") || message.includes("user already registered")) {
    return "An account already exists with this email. Please log in or use password reset.";
  }

  if (message.includes("password")) {
    return error.message || "Password does not meet the required standard.";
  }

  if (message.includes("email")) {
    return error.message || "Please enter a valid email address.";
  }

  return error.message || "Registration failed. Please try again.";
}

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  async function createCandidateProfile(user, fullName, emailAddress) {
    try {
      const { error } = await supabase
        .from("candidate_profiles")
        .upsert({
          id: user.id,
          email: emailAddress,
          full_name: fullName,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (error) {
        console.error("Candidate profile creation warning:", error);
      }
    } catch (profileError) {
      console.error("Candidate profile creation exception:", profileError);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    const fullName = cleanName(name);
    const emailAddress = cleanEmail(email);

    if (!fullName) {
      setMessage({ type: "error", text: "Please enter your full name." });
      return;
    }

    if (!emailAddress) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }

    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    try {
      setLoading(true);

      const redirectTo = typeof window !== "undefined" ? window.location.origin + "/login" : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: emailAddress,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            name: fullName,
            role: "candidate",
            is_supervisor: false,
            user_type: "candidate"
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        await createCandidateProfile(data.user, fullName, emailAddress);
      }

      setMessage({
        type: "success",
        text: "Registration successful. Please check your email for confirmation, then log in."
      });

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/login");
      }, 2200);
    } catch (registerError) {
      console.error("Registration error:", registerError);
      setMessage({ type: "error", text: getReadableSignupError(registerError) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout background="/images/register-bg.jpg" showNavigation={false}>
      <div style={styles.centerOverlay}>
        <form onSubmit={handleRegister} style={styles.card}>
          <div style={styles.brandSection}>
            <div style={styles.brandIcon}>📝</div>
            <h1 style={styles.brandTitle}>Create Account</h1>
            <p style={styles.brandSubtitle}>Register as a candidate to access assigned assessments.</p>
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

          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
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
              placeholder="you@example.com"
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
              placeholder="Create a secure password"
              value={password}
              required
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              style={styles.input}
            />
            <p style={styles.hint}>Password must be at least 6 characters.</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              required
              minLength={6}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...styles.submitButton, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Creating Account..." : "Register"}
          </button>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Already have an account?{" "}
              <Link href="/login" legacyBehavior>
                <a style={styles.link}>Login</a>
              </Link>
            </p>
          </div>
        </form>
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
    minHeight: "100vh",
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
    border: "1px solid rgba(255,255,255,0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  brandSection: {
    marginBottom: "6px",
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
  message: {
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "13px",
    textAlign: "center",
    lineHeight: 1.5
  },
  formGroup: {
    textAlign: "left"
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
  hint: {
    margin: "6px 0 0",
    fontSize: "12px",
    color: "rgba(255,255,255,0.65)"
  },
  submitButton: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
    color: "#1a1a2e",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "15px",
    marginTop: "4px"
  },
  footer: {
    textAlign: "center",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: "18px",
    marginTop: "4px"
  },
  footerText: {
    margin: 0,
    color: "rgba(255,255,255,0.65)",
    fontSize: "13px"
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontWeight: "600"
  }
};
