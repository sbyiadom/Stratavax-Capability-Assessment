// pages/candidate/dashboard.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

function getType(assessment) {
  return assessment?.assessment_type || assessment?.assessment_types || {};
}

function getTypeCode(assessment) {
  return getType(assessment)?.code || "general";
}

function getTypeName(assessment) {
  return getType(assessment)?.name || "Assessment";
}

function getTypeIcon(assessment) {
  return getType(assessment)?.icon || "📋";
}

function getColors(code) {
  const map = {
    general: { bg: "#dbeafe", color: "#1e40af", gradient: "linear-gradient(135deg, #1d4ed8, #1e3a8a)" },
    leadership: { bg: "#ede9fe", color: "#5b21b6", gradient: "linear-gradient(135deg, #7c3aed, #5b21b6)" },
    strategic_leadership: { bg: "#e0e7ff", color: "#3730a3", gradient: "linear-gradient(135deg, #1e3a8a, #5b21b6)" },
    cognitive: { bg: "#cffafe", color: "#0e7490", gradient: "linear-gradient(135deg, #0891b2, #0e7490)" },
    technical: { bg: "#fee2e2", color: "#991b1b", gradient: "linear-gradient(135deg, #dc2626, #991b1b)" },
    personality: { bg: "#ccfbf1", color: "#115e59", gradient: "linear-gradient(135deg, #0d9488, #115e59)" },
    performance: { bg: "#ffedd5", color: "#c2410c", gradient: "linear-gradient(135deg, #ea580c, #c2410c)" },
    behavioral: { bg: "#f3e8ff", color: "#6b21a5", gradient: "linear-gradient(135deg, #9333ea, #6b21a5)" },
    cultural: { bg: "#dcfce7", color: "#047857", gradient: "linear-gradient(135deg, #059669, #047857)" },
    manufacturing_baseline: { bg: "#dcfce7", color: "#1b5e20", gradient: "linear-gradient(135deg, #2e7d32, #1b5e20)" }
  };
  return map[code] || map.general;
}

function formatDateTime(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    return "Not set";
  }
}

function isWithinSchedule(accessRecord) {
  if (!accessRecord?.is_scheduled && accessRecord?.status !== "scheduled") return true;

  const now = new Date();
  const start = accessRecord?.scheduled_start ? new Date(accessRecord.scheduled_start) : null;
  const end = accessRecord?.scheduled_end ? new Date(accessRecord.scheduled_end) : null;

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function getAccessInfo(accessRecord, resultRecord) {
  if (resultRecord || accessRecord?.status === "completed" || accessRecord?.result_id) {
    return {
      key: "completed",
      label: "Completed",
      canStart: false,
      buttonText: "Completed",
      badgeBg: "#e3f2fd",
      badgeColor: "#1565c0",
      helper: "This assessment has already been completed."
    };
  }

  if (!accessRecord) {
    return {
      key: "not_assigned",
      label: "Not Assigned",
      canStart: false,
      buttonText: "Not Assigned",
      badgeBg: "#f5f5f5",
      badgeColor: "#667085",
      helper: "This assessment is visible, but it has not been assigned to you yet."
    };
  }

  if (accessRecord.status === "unblocked") {
    if (!isWithinSchedule(accessRecord)) {
      return {
        key: "scheduled_locked",
        label: "Scheduled",
        canStart: false,
        buttonText: "Not Yet Available",
        badgeBg: "#f3e5f5",
        badgeColor: "#6a1b9a",
        helper: "This assessment is scheduled from " + formatDateTime(accessRecord.scheduled_start) + " to " + formatDateTime(accessRecord.scheduled_end) + "."
      };
    }

    return {
      key: "ready",
      label: "Ready",
      canStart: true,
      buttonText: "Start Assessment",
      badgeBg: "#e8f5e9",
      badgeColor: "#2e7d32",
      helper: "This assessment is assigned and unblocked. You can start it now."
    };
  }

  if (accessRecord.status === "scheduled") {
    if (isWithinSchedule(accessRecord)) {
      return {
        key: "ready_scheduled",
        label: "Ready",
        canStart: true,
        buttonText: "Start Assessment",
        badgeBg: "#e8f5e9",
        badgeColor: "#2e7d32",
        helper: "This scheduled assessment is currently available."
      };
    }

    return {
      key: "scheduled",
      label: "Scheduled",
      canStart: false,
      buttonText: "Scheduled",
      badgeBg: "#f3e5f5",
      badgeColor: "#6a1b9a",
      helper: "This assessment is scheduled from " + formatDateTime(accessRecord.scheduled_start) + " to " + formatDateTime(accessRecord.scheduled_end) + "."
    };
  }

  if (accessRecord.status === "in_progress") {
    return {
      key: "in_progress",
      label: "In Progress",
      canStart: true,
      buttonText: "Continue Assessment",
      badgeBg: "#fef9c3",
      badgeColor: "#854d0e",
      helper: "This assessment is already in progress."
    };
  }

  return {
    key: "blocked",
    label: "Blocked",
    canStart: false,
    buttonText: "Contact Supervisor to Unblock",
    badgeBg: "#fff3e0",
    badgeColor: "#f57c00",
    helper: "This assessment is assigned but blocked. You can view and move through the dashboard, but you cannot start until it is unblocked."
  };
}

export default function CandidateDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [candidateAssessments, setCandidateAssessments] = useState([]);
  const [assessmentResults, setAssessmentResults] = useState([]);
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
              user_metadata: {
                role: parsed.role,
                full_name: parsed.full_name
              }
            };
          }
        } catch (error) {
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

      const candidateProfile = profileResponse.data || {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email || "Candidate",
        email: user.email || "",
        phone: "",
        supervisor_id: null
      };

      setCandidate(candidateProfile);

      const [assessmentsResponse, accessResponse, resultsResponse] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, title, description, is_active, assessment_type:assessment_types(id, code, name, icon)")
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

      if (assessmentsResponse.error) throw assessmentsResponse.error;
      if (accessResponse.error) throw accessResponse.error;
      if (resultsResponse.error) throw resultsResponse.error;

      const assessmentRows = assessmentsResponse.data || [];
      setAssessments(assessmentRows);
      setCandidateAssessments(accessResponse.data || []);
      setAssessmentResults(resultsResponse.data || []);

      if (assessmentRows.length > 0) {
        setSelectedAssessmentId((current) => current || assessmentRows[0].id);
      }
    } catch (error) {
      console.error("Candidate dashboard load error:", error);
      setMessage({ type: "error", text: "Failed to load dashboard: " + getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") localStorage.removeItem("userSession");
      router.push("/login");
    } catch (error) {
      router.push("/login");
    }
  }

  function accessFor(assessmentId) {
    return candidateAssessments.find((item) => item.assessment_id === assessmentId) || null;
  }

  function resultFor(assessmentId) {
    return assessmentResults.find((item) => item.assessment_id === assessmentId) || null;
  }

  function startAssessment(assessment) {
    const info = getAccessInfo(accessFor(assessment.id), resultFor(assessment.id));

    if (!info.canStart) {
      setMessage({ type: "error", text: info.helper });
      return;
    }

    router.push("/candidate/assessment/" + assessment.id);
  }

  const selectedAssessment = useMemo(() => {
    return assessments.find((item) => item.id === selectedAssessmentId) || assessments[0] || null;
  }, [assessments, selectedAssessmentId]);

  const selectedInfo = selectedAssessment ? getAccessInfo(accessFor(selectedAssessment.id), resultFor(selectedAssessment.id)) : null;

  const completedCount = assessments.filter((assessment) => {
    const info = getAccessInfo(accessFor(assessment.id), resultFor(assessment.id));
    return info.key === "completed";
  }).length;

  const readyCount = assessments.filter((assessment) => {
    const info = getAccessInfo(accessFor(assessment.id), resultFor(assessment.id));
    return info.canStart;
  }).length;

  if (loading) {
    return (
      <AppLayout background="/images/candidate-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading dashboard...</p>
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
    <AppLayout background="/images/candidate-bg.jpg">
      <div style={styles.page}>
        <div style={styles.topBar}>
          <div style={styles.brandBlock}>
            <span style={styles.brand}>STRATAVAX</span>
            <span style={styles.divider}>|</span>
            <span style={styles.portalText}>Assessment Portal</span>
          </div>
          <div style={styles.topActions}>
            <Link href="/candidate/profile" legacyBehavior>
              <a style={styles.profileButton}>Profile</a>
            </Link>
            <button type="button" onClick={handleSignOut} style={styles.signOutButton}>Sign Out</button>
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
          <div style={{
            ...styles.message,
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
          }}>
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
                const colors = getColors(getTypeCode(assessment));
                const isSelected = selectedAssessment?.id === assessment.id;
                const info = getAccessInfo(accessFor(assessment.id), resultFor(assessment.id));

                return (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => setSelectedAssessmentId(assessment.id)}
                    style={{
                      ...styles.tabButton,
                      background: isSelected ? colors.color : colors.bg,
                      color: isSelected ? "white" : colors.color,
                      border: isSelected ? "1px solid " + colors.color : "1px solid rgba(255,255,255,0.35)"
                    }}
                  >
                    <span>{assessment.title}</span>
                    <small style={{ ...styles.tabStatus, background: info.badgeBg, color: info.badgeColor }}>{info.label}</small>
                  </button>
                );
              })}
            </div>

            {selectedAssessment && selectedInfo && (
              <div style={styles.assessmentCard}>
                <div style={styles.assessmentMain}>
                  <div style={{ ...styles.assessmentIcon, background: getColors(getTypeCode(selectedAssessment)).gradient }}>{getTypeIcon(selectedAssessment)}</div>
                  <div style={styles.assessmentTextBlock}>
                    <h2 style={styles.assessmentTitle}>{selectedAssessment.title}</h2>
                    <p style={styles.assessmentDescription}>{selectedAssessment.description || "Comprehensive assessment covering relevant capability areas."}</p>
                    <div style={styles.metaRow}>
                      <span>180 minutes</span>
                      <span>100 questions</span>
                      <span>One attempt</span>
                      <span>{getTypeName(selectedAssessment)}</span>
                    </div>
                    <p style={styles.helperText}>{selectedInfo.helper}</p>
                  </div>
                </div>

                <div style={styles.actionBlock}>
                  <span style={{ ...styles.statusBadge, background: selectedInfo.badgeBg, color: selectedInfo.badgeColor }}>{selectedInfo.label}</span>
                  <button
                    type="button"
                    onClick={() => startAssessment(selectedAssessment)}
                    disabled={!selectedInfo.canStart}
                    style={{
                      ...styles.startButton,
                      background: selectedInfo.canStart ? "#0a1929" : "#cbd5e1",
                      color: selectedInfo.canStart ? "white" : "#475569",
                      cursor: selectedInfo.canStart ? "pointer" : "not-allowed"
                    }}
                  >
                    {selectedInfo.buttonText}
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
  tabButton: { borderRadius: "22px", padding: "11px 18px", fontSize: "14px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.12)" },
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
