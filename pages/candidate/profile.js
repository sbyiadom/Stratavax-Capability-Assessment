// pages/candidate/profile.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
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

function getScorePercentage(record) {
  if (!record) return null;

  if (record.percentage_score !== null && record.percentage_score !== undefined) {
    return Math.round(toNumber(record.percentage_score, 0));
  }

  if (record.percentage !== null && record.percentage !== undefined) {
    return Math.round(toNumber(record.percentage, 0));
  }

  const score = record.total_score ?? record.score ?? null;
  const maxScore = record.max_score ?? null;

  if (score !== null && score !== undefined && maxScore !== null && maxScore !== undefined && toNumber(maxScore, 0) > 0) {
    return Math.round((toNumber(score, 0) / toNumber(maxScore, 0)) * 100);
  }

  return null;
}

function getStatusLabel(record) {
  if (record?.is_auto_submitted) return "Auto-submitted";
  if (record?.is_valid === false) return "Completed - Review";
  return "Completed";
}

export default function CandidateProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    loadProfilePage();
  }, []);

  async function loadProfilePage() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const authResponse = await supabase.auth.getUser();
      const authUser = authResponse?.data?.user || null;

      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);
      await Promise.all([fetchCandidateProfile(authUser), fetchAssessmentHistory(authUser.id)]);
    } catch (error) {
      console.error("Error loading profile page:", error);
      setMessage({ type: "error", text: error?.message || "Unable to load profile." });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCandidateProfile(authUser) {
    try {
      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("id, full_name, email, phone, created_at, updated_at")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      const fallbackName = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Candidate";
      const resolvedProfile = data || {
        id: authUser.id,
        full_name: fallbackName,
        email: authUser.email,
        phone: ""
      };

      setProfile(resolvedProfile);
      setProfileForm({
        full_name: cleanText(resolvedProfile.full_name, fallbackName),
        phone: cleanText(resolvedProfile.phone, "")
      });
    } catch (error) {
      console.error("Error fetching candidate profile:", error);
      const fallbackName = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Candidate";
      setProfile({ id: authUser.id, full_name: fallbackName, email: authUser.email, phone: "" });
      setProfileForm({ full_name: fallbackName, phone: "" });
    }
  }

  async function fetchAssessmentHistory(userId) {
    try {
      const { data, error } = await supabase
        .from("assessment_results")
        .select("id, assessment_id, session_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted, assessments(title, assessment_type:assessment_types(name, code, icon))")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setAssessmentHistory(data || []);
    } catch (error) {
      console.error("Error fetching assessment history:", error);
      setAssessmentHistory([]);
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((previous) => ({ ...previous, [name]: value }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleUpdateProfile(event) {
    event.preventDefault();

    if (!user) return;

    const fullName = cleanText(profileForm.full_name).trim();
    const phone = cleanText(profileForm.phone).trim();

    if (!fullName) {
      setMessage({ type: "error", text: "Full name is required." });
      return;
    }

    try {
      setSavingProfile(true);
      setMessage({ type: "", text: "" });

      const payload = {
        id: user.id,
        email: user.email,
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("candidate_profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      setProfile((previous) => ({ ...(previous || {}), ...payload }));
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: error?.message || "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    if (!user?.email) {
      setMessage({ type: "error", text: "User email is not available." });
      return;
    }

    if (!passwordForm.currentPassword) {
      setMessage({ type: "error", text: "Current password is required." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    try {
      setUpdatingPassword(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      });

      if (signInError) {
        setMessage({ type: "error", text: "Current password is incorrect." });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Password updated successfully." });
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage({ type: "error", text: error?.message || "Failed to update password." });
    } finally {
      setUpdatingPassword(false);
    }
  }

  if (loading || !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading profile...</p>
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
    <AppLayout background="/images/candidate-bg.jpg">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.title}>Profile Settings</h1>
              <p style={styles.subtitleText}>Manage your candidate profile and account security.</p>
            </div>
            <button onClick={() => router.push("/candidate/dashboard")} style={styles.topBackButton}>← Dashboard</button>
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

          <div style={styles.infoBox}>
            <div style={styles.infoRow}><span>Email</span><strong>{user.email}</strong></div>
            <div style={styles.infoRow}><span>User ID</span><strong>{user.id.substring(0, 8)}...</strong></div>
            <div style={styles.infoRow}><span>Profile Created</span><strong>{formatDate(profile?.created_at)}</strong></div>
          </div>

          <form onSubmit={handleUpdateProfile} style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Candidate Information</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={profileForm.full_name}
                onChange={handleProfileChange}
                required
                style={styles.input}
                placeholder="Enter your full name"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input
                type="text"
                name="phone"
                value={profileForm.phone}
                onChange={handleProfileChange}
                style={styles.input}
                placeholder="Enter phone number if available"
              />
            </div>
            <button type="submit" disabled={savingProfile} style={{ ...styles.button, opacity: savingProfile ? 0.7 : 1 }}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>

          <form onSubmit={handleUpdatePassword} style={styles.formSection}>
            <h2 style={styles.sectionTitle}>Change Password</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
                style={styles.input}
                placeholder="Enter current password"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
                style={styles.input}
                placeholder="Enter new password"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
                style={styles.input}
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" disabled={updatingPassword} style={{ ...styles.button, opacity: updatingPassword ? 0.7 : 1 }}>
              {updatingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          <div style={styles.historySection}>
            <h2 style={styles.sectionTitle}>Assessment History</h2>
            {assessmentHistory.length === 0 ? (
              <div style={styles.emptyHistory}>No completed assessments yet.</div>
            ) : (
              <div style={styles.historyList}>
                {assessmentHistory.map((item) => {
                  const percentage = getScorePercentage(item);
                  return (
                    <div key={item.id} style={styles.historyItem}>
                      <div style={styles.historyLeft}>
                        <div style={styles.historyIcon}>{item.assessments?.assessment_type?.icon || "📋"}</div>
                        <div>
                          <div style={styles.historyTitle}>{item.assessments?.title || "Assessment"}</div>
                          <div style={styles.historyMeta}>{getStatusLabel(item)} • {formatDate(item.completed_at)}</div>
                        </div>
                      </div>
                      <div style={styles.historyScore}>{percentage !== null ? percentage + "%" : "N/A"}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => router.push("/candidate/dashboard")} style={styles.backButton}>← Back to Dashboard</button>
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
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", justifyContent: "center", background: "#f8fafc" },
  loadingText: { color: "#475569", margin: 0 },
  spinner: { width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #0a1929", borderRadius: "50%", animation: "spin 1s linear infinite" },
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "40px 20px" },
  card: { maxWidth: "760px", margin: "0 auto", background: "white", borderRadius: "16px", padding: "36px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "22px" },
  title: { fontSize: "28px", fontWeight: 700, color: "#0a1929", margin: 0 },
  subtitleText: { color: "#64748b", margin: "6px 0 0", fontSize: "14px" },
  topBackButton: { background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#334155", cursor: "pointer", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600 },
  sectionTitle: { fontSize: "20px", fontWeight: 700, color: "#0a1929", margin: "0 0 16px" },
  infoBox: { background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "24px", border: "1px solid #e2e8f0" },
  infoRow: { display: "flex", justifyContent: "space-between", gap: "16px", padding: "8px 0", borderBottom: "1px solid #e2e8f0", fontSize: "14px", color: "#475569" },
  message: { padding: "12px", borderRadius: "8px", marginBottom: "20px", textAlign: "center", fontSize: "14px" },
  formSection: { display: "flex", flexDirection: "column", gap: "16px", padding: "22px 0", borderTop: "1px solid #e2e8f0" },
  formGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "14px", fontWeight: 600, color: "#0a1929" },
  input: { padding: "12px", border: "2px solid #e2e8f0", borderRadius: "8px", fontSize: "16px", outline: "none", transition: "border-color 0.2s" },
  button: { background: "#0a1929", color: "white", padding: "14px", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 600, cursor: "pointer", marginTop: "4px" },
  historySection: { padding: "22px 0", borderTop: "1px solid #e2e8f0" },
  emptyHistory: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px", color: "#64748b", textAlign: "center" },
  historyList: { display: "flex", flexDirection: "column", gap: "10px" },
  historyItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", background: "#f8fafc" },
  historyLeft: { display: "flex", alignItems: "center", gap: "12px" },
  historyIcon: { width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: "#e0e7ff", fontSize: "20px" },
  historyTitle: { fontWeight: 700, color: "#0f172a", fontSize: "14px" },
  historyMeta: { color: "#64748b", fontSize: "12px", marginTop: "4px" },
  historyScore: { color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "999px", padding: "6px 12px", fontWeight: 700, fontSize: "13px" },
  backButton: { background: "none", border: "none", color: "#64748b", cursor: "pointer", marginTop: "20px", fontSize: "14px", textAlign: "center", width: "100%" }
};
