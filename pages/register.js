// pages/register.js - Fixed without redirect URL

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getReadableSignupError(error) {
  if (!error) return "Registration failed. Please try again.";

  const message = String(error.message || error || "").toLowerCase();

  if (message.includes("already registered") || message.includes("already exists")) {
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

// ============================================================
// NATIONAL SERVICE ASSESSMENT - HARDCODED ID
// ============================================================
const NATIONAL_SERVICE_ASSESSMENT_ID = "bdb9d46e-9fac-4d00-8478-1f649e7ac600";

async function autoAssignNationalService(candidateId) {
  try {
    console.log(`[Auto-Assign] Assigning National Service to candidate: ${candidateId}`);

    const { data: existing, error: checkError } = await supabase
      .from("candidate_assessments")
      .select("id, status")
      .eq("user_id", candidateId)
      .eq("assessment_id", NATIONAL_SERVICE_ASSESSMENT_ID)
      .maybeSingle();

    if (checkError) {
      console.warn("[Auto-Assign] Check error:", checkError.message);
    }

    if (existing) {
      console.log(`[Auto-Assign] Already exists with status: ${existing.status}`);
      if (existing.status === "blocked") {
        const { error: updateError } = await supabase
          .from("candidate_assessments")
          .update({
            status: "unblocked",
            unblocked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (updateError) {
          console.warn("[Auto-Assign] Unblock error:", updateError.message);
          return false;
        }
        return true;
      }
      return true;
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from("candidate_assessments")
      .insert({
        user_id: candidateId,
        assessment_id: NATIONAL_SERVICE_ASSESSMENT_ID,
        status: "unblocked",
        unblocked_at: now,
        created_at: now,
        updated_at: now
      });

    if (insertError) {
      console.error("[Auto-Assign] Insert error:", insertError.message);
      return false;
    }

    console.log(`[Auto-Assign] ✅ National Service assigned to candidate ${candidateId}`);
    return true;

  } catch (error) {
    console.error("[Auto-Assign] Error:", error);
    return false;
  }
}

async function createCandidateProfile(user, fullName, emailAddress, university, programme, graduationYear, preferredDepartment) {
  try {
    const profileData = {
      id: user.id,
      email: emailAddress,
      full_name: fullName,
      university: university || null,
      programme: programme || null,
      graduation_year: graduationYear || null,
      preferred_department: preferredDepartment || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("candidate_profiles")
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error("Profile creation error:", error);
      throw error;
    }

    return data;
  } catch (profileError) {
    console.error("Profile creation exception:", profileError);
    throw profileError;
  }
}

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [university, setUniversity] = useState("");
  const [programme, setProgramme] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [preferredDepartment, setPreferredDepartment] = useState("");
  
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

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
      setMessage({ type: "", text: "" });

      // REMOVED: redirect_to parameter - this was causing the 500 error
      const { data, error } = await supabase.auth.signUp({
        email: emailAddress,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
            role: "candidate",
            is_supervisor: false,
            user_type: "candidate"
          }
        }
      });

      if (error) {
        console.error("Sign up error:", error);
        throw error;
      }

      if (!data?.user) {
        throw new Error("No user data returned from sign up.");
      }

      console.log("✅ User created:", data.user.id);

      await createCandidateProfile(
        data.user,
        fullName,
        emailAddress,
        university,
        programme,
        graduationYear,
        preferredDepartment
      );

      await autoAssignNationalService(data.user.id);

      setMessage({
        type: "success",
        text: "Registration successful! Please check your email for confirmation, then log in."
      });

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
      }, 3000);

    } catch (registerError) {
      console.error("Registration error:", registerError);
      setMessage({ 
        type: "error", 
        text: getReadableSignupError(registerError) 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.background}>
        <div style={styles.backgroundOverlay} />
      </div>
      
      <div style={styles.centerOverlay}>
        <form onSubmit={handleRegister} style={styles.card}>
          <div style={styles.brandSection}>
            <img 
              src="/images/stratavax-logo.png" 
              alt="Stratavax" 
              style={styles.brandLogo}
            />
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
                <option key={year} value={year} style={styles.option}>{year}</option>
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
    </div>
  );
}

const styles = {
  pageContainer: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  background: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: "url(/images/register-bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    zIndex: 0
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)",
    zIndex: 1
  },
  centerOverlay: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    width: "100%"
  },
  card: {
    width: "480px",
    maxWidth: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    padding: "40px 36px",
    borderRadius: "24px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxHeight: "90vh",
    overflowY: "auto"
  },
  brandSection: { marginBottom: "2px", textAlign: "center" },
  brandLogo: {
    width: "70px",
    height: "70px",
    objectFit: "contain",
    marginBottom: "10px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto"
  },
  brandTitle: { margin: "0 0 6px", color: "white", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px", textShadow: "0 2px 8px rgba(0,0,0,0.3)" },
  brandSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: "13px", margin: 0, lineHeight: 1.5, textShadow: "0 1px 4px rgba(0,0,0,0.3)" },
  sectionTitle: { color: "rgba(255,255,255,0.9)", fontSize: "14px", fontWeight: "600", marginTop: "4px", marginBottom: "2px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px", letterSpacing: "0.3px", textShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  message: { padding: "12px 14px", borderRadius: "12px", fontSize: "13px", textAlign: "center", lineHeight: 1.5, backdropFilter: "blur(10px)" },
  formGroup: { textAlign: "left" },
  label: { display: "block", marginBottom: "6px", fontWeight: "500", color: "rgba(255,255,255,0.9)", fontSize: "13px", letterSpacing: "0.2px", textShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", fontSize: "14px", color: "white", boxSizing: "border-box", outline: "none", transition: "all 0.3s ease", fontFamily: "inherit", backdropFilter: "blur(4px)" },
  select: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", fontSize: "14px", color: "white", boxSizing: "border-box", outline: "none", appearance: "none", cursor: "pointer", transition: "all 0.3s ease", fontFamily: "inherit", backdropFilter: "blur(4px)" },
  option: { color: "#1a1a2e", background: "white", padding: "8px" },
  hint: { margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.6)", textShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  submitButton: { width: "100%", padding: "14px", background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)", color: "#1a1a2e", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: "700", fontSize: "15px", marginTop: "4px", transition: "all 0.3s ease", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" },
  footer: { textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px", marginTop: "2px" },
  footerText: { margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "13px", textShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  link: { color: "white", textDecoration: "none", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.2)" }
};
