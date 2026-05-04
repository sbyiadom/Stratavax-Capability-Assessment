// pages/candidate/dashboard.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function text(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function errorText(error) {
  return error?.message || String(error || "Something went wrong.");
}

function typeObj(assessment) {
  return assessment?.assessment_type || assessment?.assessment_types || {};
}

function typeCode(assessment) {
  return typeObj(assessment)?.code || "general";
}

function typeName(assessment) {
  return typeObj(assessment)?.name || "Assessment";
}

function iconOf(assessment) {
  return typeObj(assessment)?.icon || "📋";
}

function colorsFor(code) {
  const colors = {
    general: { bg: "#dbeafe", color: "#1e40af", gradient: "linear-gradient(135deg,#1d4ed8,#1e3a8a)" },
    leadership: { bg: "#ede9fe", color: "#5b21b6", gradient: "linear-gradient(135deg,#7c3aed,#5b21b6)" },
    strategic_leadership: { bg: "#e0e7ff", color: "#3730a3", gradient: "linear-gradient(135deg,#1e3a8a,#5b21b6)" },
    cognitive: { bg: "#cffafe", color: "#0e7490", gradient: "linear-gradient(135deg,#0891b2,#0e7490)" },
    technical: { bg: "#fee2e2", color: "#991b1b", gradient: "linear-gradient(135deg,#dc2626,#991b1b)" },
    personality: { bg: "#ccfbf1", color: "#115e59", gradient: "linear-gradient(135deg,#0d9488,#115e59)" },
    performance: { bg: "#ffedd5", color: "#c2410c", gradient: "linear-gradient(135deg,#ea580c,#c2410c)" },
    behavioral: { bg: "#f3e8ff", color: "#6b21a5", gradient: "linear-gradient(135deg,#9333ea,#6b21a5)" },
    cultural: { bg: "#dcfce7", color: "#047857", gradient: "linear-gradient(135deg,#059669,#047857)" },
    manufacturing_baseline: { bg: "#dcfce7", color: "#1b5e20", gradient: "linear-gradient(135deg,#2e7d32,#1b5e20)" }
  };
  return colors[code] || colors.general;
}

function formatDate(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not set";
  }
}

function withinSchedule(row) {
  if (!row?.is_scheduled && row?.status !== "scheduled") return true;
  const now = new Date();
  const start = row?.scheduled_start ? new Date(row.scheduled_start) : null;
  const end = row?.scheduled_end ? new Date(row.scheduled_end) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function accessInfo(access, result) {
  if (result || access?.status === "completed" || access?.result_id) {
    return { key: "completed", label: "Completed", canStart: false, button: "Completed", bg: "#e3f2fd", color: "#1565c0", help: "This assessment has already been completed." };
  }

  if (!access) {
    return { key: "not_assigned", label: "Not Assigned", canStart: false, button: "Not Assigned", bg: "#f5f5f5", color: "#667085", help: "This assessment has not been assigned yet. You can view details, but cannot start it." };
  }

  if (access.status === "unblocked") {
    if (!withinSchedule(access)) {
      return { key: "scheduled_locked", label: "Scheduled", canStart: false, button: "Not Yet Available", bg: "#f3e5f5", color: "#6a1b9a", help: "Available from " + formatDate(access.scheduled_start) + " to " + formatDate(access.scheduled_end) + "." };
    }
    return { key: "ready", label: "Ready", canStart: true, button: "Start Assessment", bg: "#e8f5e9", color: "#2e7d32", help: "This assessment is assigned and unblocked. You can start it now." };
  }

  if (access.status === "scheduled") {
    if (withinSchedule(access)) {
      return { key: "ready_scheduled", label: "Ready", canStart: true, button: "Start Assessment", bg: "#e8f5e9", color: "#2e7d32", help: "This scheduled assessment is currently available." };
    }
    return { key: "scheduled", label: "Scheduled", canStart: false, button: "Scheduled", bg: "#f3e5f5", color: "#6a1b9a", help: "Available from " + formatDate(access.scheduled_start) + " to " + formatDate(access.scheduled_end) + "." };
  }

  if (access.status === "in_progress") {
    return { key: "in_progress", label: "In Progress", canStart: true, button: "Continue Assessment", bg: "#fef9c3", color: "#854d0e", help: "This assessment is already in progress." };
  }

  return { key: "blocked", label: "Blocked", canStart: false, button: "Contact Supervisor to Unblock", bg: "#fff3e0", color: "#f57c00", help: "This assessment is assigned but blocked. You can move through the dashboard, but you cannot start this assessment until it is unblocked." };
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [candidateAssessments, setCandidateAssessments] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function getCurrentUser() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data?.session?.user) return data.session.user;

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userSession");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.user_id) {
            return {
              id: parsed.user_id,
              email: parsed.email,
              user_metadata: { role: parsed.role, full_name: parsed.full_name }
            };
          }
        } catch {
          localStorage.removeItem("userSession");
        }
      }
    }
    return null;
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const user = await getCurrentUser();
      if (!user?.id) {
        router.push("/login");
        return;
      }

      const role = user.user_metadata?.role || null;
      if (role && role !== "candidate") {
        router.push(role === "admin" ? "/admin" : "/supervisor");
        return;
      }

      const profileResponse = await supabase
        .from("candidate_profiles")
        .select("id, full_name, email, phone, supervisor_id, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileResponse.error) throw profileResponse.error;

      const profile = profileResponse.data || {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email || "Candidate",
        email: user.email || ""
      };

      setCandidate(profile);

      const [assessmentResponse, accessResponse, resultResponse] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, title, description, duration_minutes, time_limit, question_count, total_questions, is_active, assessment_type:assessment_types(id, code, name, icon)")
          .eq("is_active", true)
          .order("title", { ascending: true }),
        supabase
          .from("candidate_assessments")
          .select("id, user_id, assessment_id, status, result_id, completed_at, unblocked_at, is_scheduled, scheduled_start, scheduled_end, created_at, updated_at")
          .eq("user_id", user.id),
        supabase
          .from("assessment_results")
          .select("id, user_id, assessment_id, score, completed_at, created_at")
          .eq("user_id", user.id)
      ]);

      if (assessmentResponse.error) throw assessmentResponse.error;
      if (accessResponse.error) throw accessResponse.error;
      if (resultResponse.error) throw resultResponse.error;

      const assessmentRows = assessmentResponse.data || [];
      setAssessments(assessmentRows);
      setCandidateAssessments(accessResponse.data || []);
      setResults(resultResponse.data || []);

      if (assessmentRows.length > 0) setSelectedAssessmentId(assessmentRows[0].id);
    } catch (error) {
      console.error("Candidate dashboard load error:", error);
      setMessage({ type: "error", text: "Failed to load dashboard: " + errorText(error) });
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("userSession");
    router.push("/login");
  }

  function accessFor(assessmentId) {
    return candidateAssessments.find((item) => item.assessment_id === assessmentId) || null;
  }

  function resultFor(assessmentId) {
    return results.find((item) => item.assessment_id === assessmentId) || null;
  }

  function startAssessment(assessment) {
    const info = accessInfo(accessFor(assessment.id), resultFor(assessment.id));
    if (!info.canStart) {
      setMessage({ type: "error", text: info.help });
      return;
    }
    router.push("/candidate/assessment/" + assessment.id);
  }

  const selectedAssessment = useMemo(() => {
    return assessments.find((item) => item.id === selectedAssessmentId) || assessments[0] || null;
  }, [assessments, selectedAssessmentId]);

  const selectedInfo = selectedAssessment ? accessInfo(accessFor(selectedAssessment.id), resultFor(selectedAssessment.id)) : null;

  const completedCount = assessments.filter((assessment) => accessInfo(accessFor(assessment.id), resultFor(assessment.id)).key === "completed").length;
  const readyCount = assessments.filter((assessment) => accessInfo(accessFor(assessment.id), resultFor(assessment.id)).canStart).length;

  if (loading) {
    return (
      <AppLayout background="/images/candidate-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading dashboard...</p>
        </div>
        <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/candidate-bg.jpg">
      <div style={styles.page}>
        <div style={styles.topBar}>
          <div style={styles.brandBlock}>
            <span style={styles.brand}>STRATAVAX</span>
            <span style={styles.divider}>|</span>
            <span style={styles.portalText}>Assessment Portal</span>
          </div>
          <div style={styles.topActions}>
            <Link href="/candidate/profile" legacyBehavior><a style={styles.profileButton}>Profile</a></Link>
            <button type="button" onClick={signOut} style={styles.signOutButton}>Sign Out</button>
          </div>
        </div>

        <div style={styles.hero}>
          <div>
            <h1 style={styles.welcomeTitle}>Welcome back, <span style={styles.nameHighlight}>{candidate?.full_name || candidate?.email || "Candidate"}</span></h1>
            <p style={styles.welcomeText}>You have {readyCount} assessment(s) ready or in progress.</p>
          </div>
          <div style={styles.progressPill}><strong>{completedCount}</strong> / {assessments.length} Completed</div>
        </div>

        {message.text && (
          <div style={{ ...styles.message, background: message.type === "success" ? "#e8f5e9" : "#ffebee", color: message.type === "success" ? "#2e7d32" : "#c62828", border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2") }}>
            {message.text}
          </div>
        )}

        {assessments.length === 0 ? (
          <div style={styles.emptyCard}>
            <h2>No assessments available</h2>
            <p>No active assessments are currently configured.</p>
          </div>
        ) : (
          <>
            <div style={styles.tabsWrap}>
              {assessments.map((assessment) => {
                const colors = colorsFor(typeCode(assessment));
                const isSelected = selectedAssessment?.id === assessment.id;
                const info = accessInfo(accessFor(assessment.id), resultFor(assessment.id));
                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => setSelectedAssessmentId(assessment.id)}
                    style={{ ...styles.tabButton, background: isSelected ? colors.color : colors.bg, color: isSelected ? "white" : colors.color }}
                  >
                    <span>{assessment.title}</span>
                    <small style={{ ...styles.tabStatus, background: info.bg, color: info.color }}>{info.label}</small>
                  </button>
                );
              })}
            </div>

            {selectedAssessment && selectedInfo && (
              <div style={styles.assessmentCard}>
                <div style={styles.assessmentMain}>
                  <div style={{ ...styles.assessmentIcon, background: colorsFor(typeCode(selectedAssessment)).gradient }}>{iconOf(selectedAssessment)}</div>
                  <div style={styles.assessmentTextBlock}>
                    <h2 style={styles.assessmentTitle}>{selectedAssessment.title}</h2>
                    <p style={styles.assessmentDescription}>{selectedAssessment.description || "Comprehensive assessment covering relevant capability areas."}</p>
                    <div style={styles.metaRow}>
                      <span>{selectedAssessment.duration_minutes || selectedAssessment.time_limit || 180} minutes</span>
                      <span>{selectedAssessment.question_count || selectedAssessment.total_questions || "100"} questions</span>
                      <span>One attempt</span>
                      <span>{typeName(selectedAssessment)}</span>
                    </div>
                    <p style={styles.helperText}>{selectedInfo.help}</p>
                  </div>
                </div>

                <div style={styles.actionBlock}>
                  <span style={{ ...styles.statusBadge, background: selectedInfo.bg, color: selectedInfo.color }}>{selectedInfo.label}</span>
                  <button
                    type="button"
                    onClick={() => startAssessment(selectedAssessment)}
                    disabled={!selectedInfo.canStart}
                    style={{ ...styles.startButton, background: selectedInfo.canStart ? "#0a1929" : "#cbd5e1", color: selectedInfo.canStart ? "white" : "#475569", cursor: selectedInfo.canStart ? "pointer" : "not-allowed" }}
                  >
                    {selectedInfo.button}
                  </button>
                </div>
              </div>
            )}

            <div style={styles.detailsGrid}>
              <div style={styles.detailsCard}>
                <h3 style={styles.detailsTitle}>Dashboard Logic</h3>
                <p style={styles.detailsText}>The dashboard remains active for all assessment statuses. Only the start button is locked until an assessment is assigned and unblocked.</p>
              </div>
              <div style={styles.detailsCard}>
                <h3 style={styles.detailsTitle}>Access Rules</h3>
                <ul style={styles.rulesList}>
                  <li>Not Assigned: visible but cannot start.</li>
                  <li>Blocked: visible but cannot start.</li>
                  <li>Ready: start button enabled.</li>
                  <li>Completed: already submitted.</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}

const styles = {
  page: { width: "95vw", maxWidth: "1500px", margin: "0 auto", padding: "24px 20px 60px", color: "#0f172a" },
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px", color: "white" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(255,255,255,0.35)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" },
  topBar: { background: "rgba(15,23,42,0.82)", padding: "22px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", color: "white", marginBottom: "26px" },
  brandBlock: { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  brand: { fontSize: "22px", fontWeight: 800, letterSpacing: "1px" },
  divider: { color: "rgba(255,255,255,0.4)" },
  portalText: { color: "rgba(255,255,255,0.75)", fontSize: "15px" },
  topActions: { display: "flex", alignItems: "center", gap: "12px" },
  profileButton: { padding: "10px 20px", borderRadius: "22px", background: "rgba(255,255,255,0.12)", color: "white", textDecoration: "none", fontWeight: 700, border: "1px solid rgba(255,255,255,0.16)" },
  signOutButton: { padding: "10px 20px", borderRadius: "22px", background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.16)", fontWeight: 700, cursor: "pointer" },
  hero: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "20px" },
  welcomeTitle: { margin: 0, color: "white", fontSize: "26px", fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.35)" },
  nameHighlight: { color: "#facc15" },
  welcomeText: { margin: "6px 0 0", color: "rgba(255,255,255,0.85)", fontSize: "15px" },
  progressPill: { background: "rgba(255,255,255,0.18)", color: "white", padding: "16px 24px", borderRadius: "28px", border: "1px solid rgba(255,255,255,0.22)", fontSize: "14px" },
  message: { padding: "14px 18px", borderRadius: "10px", marginBottom: "18px", fontSize: "14px", lineHeight: 1.5 },
  tabsWrap: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" },
  tabButton: { border: "none", borderRadius: "22px", padding: "11px 18px", fontSize: "14px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.12)" },
  tabStatus: { fontSize: "10px", padding: "3px 7px", borderRadius: "12px", fontWeight: 800 },
  assessmentCard: { background: "rgba(255,255,255,0.94)", borderRadius: "20px", padding: "30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", boxShadow: "0 18px 45px rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.45)", marginBottom: "28px" },
  assessmentMain: { display: "flex", alignItems: "flex-start", gap: "24px", flex: 1 },
  assessmentIcon: { width: "74px", height: "74px", borderRadius: "18px", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", boxShadow: "0 10px 22px rgba(0,0,0,0.22)", flexShrink: 0 },
  assessmentTextBlock: { flex: 1 },
  assessmentTitle: { margin: "0 0 8px", color: "#0f172a", fontSize: "24px", fontWeight: 900 },
  assessmentDescription: { margin: "0 0 16px", color: "#334155", fontSize: "15px", lineHeight: 1.5 },
  metaRow: { display: "flex", gap: "22px", flexWrap: "wrap", color: "#475569", fontSize: "14px", marginBottom: "14px" },
  helperText: { margin: 0, color: "#64748b", fontSize: "13px", lineHeight: 1.5 },
  actionBlock: { minWidth: "260px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "16px" },
  statusBadge: { display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: "22px", fontSize: "13px", fontWeight: 900 },
  startButton: { minWidth: "230px", padding: "14px 24px", borderRadius: "12px", border: "none", fontSize: "15px", fontWeight: 900, boxShadow: "0 8px 18px rgba(0,0,0,0.12)" },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" },
  detailsCard: { background: "rgba(255,255,255,0.94)", borderRadius: "16px", padding: "24px", boxShadow: "0 12px 30px rgba(0,0,0,0.16)", borderTop: "4px solid #1d4ed8" },
  detailsTitle: { margin: "0 0 10px", color: "#0f172a", fontSize: "18px", fontWeight: 900 },
  detailsText: { margin: 0, color: "#334155", lineHeight: 1.6, fontSize: "14px" },
  rulesList: { margin: 0, paddingLeft: "20px", color: "#334155", lineHeight: 1.7, fontSize: "14px" },
  emptyCard: { background: "rgba(255,255,255,0.94)", borderRadius: "18px", padding: "40px", textAlign: "center", color: "#334155" }
};
