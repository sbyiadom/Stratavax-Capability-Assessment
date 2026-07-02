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
  
  // NEW: Additional fields for National Service Report
  const [university, setUniversity] = useState("");
  const [programme, setProgramme] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [preferredDepartment, setPreferredDepartment] = useState("");
  
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
          university: university,
          programme: programme,
          graduation_year: graduationYear,
          preferred_department: preferredDepartment,
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });

      if (error) {
        console.error("Candidate profile creation warning:", error);
        throw error;
      }
    } catch (profileError) {
      console.error("Candidate profile creation exception:", profileError);
      throw profileError;
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

    // NEW: Validate additional fields
    if (!university) {
      setMessage({ type: "error", text: "Please enter your university/institution." });
      return;
    }

    if (!programme) {
      setMessage({ type: "error", text: "Please enter your programme of study." });
      return;
    }

    if (!graduationYear) {
      setMessage({ type: "error", text: "Please select your graduation year." });
      return;
    }

    if (!preferredDepartment) {
      setMessage({ type: "error", text: "Please select your preferred department." });
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
            user_type: "candidate",
            // Include additional fields in user metadata
            university: university,
            programme: programme,
            graduation_year: graduationYear,
            preferred_department: preferredDepartment
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        await createCandidateProfile(data.user, fullName, emailAddress);
      }

      setMessage({
        type: "success",
        text: "Registration successful! Your profile has been created. Please check your email for confirmation, then log in."
      });

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setUniversity("");
      setProgramme("");
      setGraduationYear("");
      setPreferredDepartment("");

      setTimeout(() => {
        router.push("/login");
      }, 2500);
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

          {/* Personal Information */}
          <div style={styles.sectionTitle}>Personal Information</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name *</label>
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
            <label style={styles.label}>Email Address *</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              required
              onChange={(event) => setEmail(event.target.value)}
              style={styles.input}
            />
          </div>

          {/* Academic Information */}
          <div style={styles.sectionTitle}>Academic Information</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>University / Institution *</label>
            <input
              type="text"
              placeholder="Enter your university name"
              value={university}
              required
              onChange={(event) => setUniversity(event.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Programme of Study *</label>
            <input
              type="text"
              placeholder="e.g., BSc Computer Science"
              value={programme}
              required
              onChange={(event) => setProgramme(event.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Graduation Year *</label>
            <select
              value={graduationYear}
              required
              onChange={(event) => setGraduationYear(event.target.value)}
              style={styles.select}
            >
              <option value="">Select graduation year</option>
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Preferred Department *</label>
            <select
              value={preferredDepartment}
              required
              onChange={(event) => setPreferredDepartment(event.target.value)}
              style={styles.select}
            >
              <option value="">Select preferred department</option>
              <option value="Operations & Production">Operations & Production</option>
              <option value="Quality Assurance & Control">Quality Assurance & Control</option>
              <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
              <option value="Technical Services">Technical Services</option>
              <option value="Maintenance & Engineering">Maintenance & Engineering</option>
              <option value="Administration">Administration</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Human Resources">Human Resources</option>
              <option value="Finance">Finance</option>
              <option value="Sales & Marketing">Sales & Marketing</option>
            </select>
          </div>

          {/* Account Security */}
          <div style={styles.sectionTitle}>Account Security</div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password *</label>
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
            <label style={styles.label}>Confirm Password *</label>
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
        input::placeholder, select::placeholder {
          color: rgba(255,255,255,0.55);
        }
        select option {
          color: #1a1a2e;
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
    width: "480px",
    maxWidth: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(20px)",
    padding: "44px 38px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  brandSection: {
    marginBottom: "4px",
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
    margin: "0 auto 12px",
    fontSize: "32px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
  },
  brandTitle: {
    margin: "0 0 6px",
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
  sectionTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: "14px",
    fontWeight: "600",
    marginTop: "4px",
    marginBottom: "2px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "6px"
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
    marginBottom: "6px",
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    fontSize: "13px"
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    fontSize: "14px",
    color: "white",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s"
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    fontSize: "14px",
    color: "white",
    boxSizing: "border-box",
    outline: "none",
    appearance: "none",
    cursor: "pointer"
  },
  hint: {
    margin: "4px 0 0",
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
    paddingTop: "16px",
    marginTop: "2px"
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
