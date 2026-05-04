// pages/candidate/dashboard.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getScorePercentage(record) {
  if (!record) return null;
  const percentage = record.percentage_score ?? record.percentage ?? null;
  const score = record.total_score ?? record.score ?? null;
  const maxScore = record.max_score ?? null;

  if (score !== null && score !== undefined && maxScore !== null && maxScore !== undefined && toNumber(maxScore, 0) > 0) {
    return Math.round((toNumber(score, 0) / toNumber(maxScore, 0)) * 100);
  }

  if (percentage !== null && percentage !== undefined && percentage !== "") {
    return Math.round(toNumber(percentage, 0));
  }

  return null;
}

function getAssessmentColor(typeCode) {
  const colors = {
    general: { gradient: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)", color: "#2563eb", light: "#dbeafe" },
    leadership: { gradient: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)", color: "#7c3aed", light: "#ede9fe" },
    cognitive: { gradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)", color: "#0891b2", light: "#cffafe" },
    cultural: { gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "#059669", light: "#d1fae5" },
    personality: { gradient: "linear-gradient(135deg, #0d9488 0%, #115e59 100%)", color: "#0d9488", light: "#ccfbf1" },
    strategic_leadership: { gradient: "linear-gradient(135deg, #1e3a8a 0%, #5b21b6 100%)", color: "#5b21b6", light: "#e9d8fd" },
    performance: { gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", color: "#ea580c", light: "#ffedd5" },
    technical: { gradient: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", color: "#dc2626", light: "#fee2e2" },
    behavioral: { gradient: "linear-gradient(135deg, #9333ea 0%, #6b21a5 100%)", color: "#9333ea", light: "#f3e8ff" },
    manufacturing_baseline: { gradient: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)", color: "#2e7d32", light: "#e8f5e9" }
  };
  return colors[typeCode] || colors.general;
}

function getDefaultAssessmentAreas(typeCode) {
  const areas = {
    general: ["Cognitive Ability", "Communication", "Cultural & Attitudinal Fit", "Emotional Intelligence", "Ethics & Integrity", "Leadership & Management", "Performance Metrics", "Personality & Behavioral", "Problem-Solving", "Technical & Manufacturing"],
    leadership: ["Change Leadership & Agility", "Communication & Influence", "Cultural Alignment", "Decision-Making & Problem-Solving", "Execution & Results Orientation", "People Management & Coaching", "Resilience & Stress Management", "Role Readiness", "Vision & Strategic Thinking"],
    cognitive: ["Logical / Abstract Reasoning", "Mechanical Reasoning", "Memory & Attention", "Numerical Reasoning", "Perceptual Speed & Accuracy", "Spatial Reasoning", "Verbal Reasoning"],
    technical: ["CIP & Maintenance", "Conveyors & Line Efficiency", "Filling & Bottling", "Packaging & Labeling", "Safety & Efficiency", "Water Treatment & Quality"],
    performance: ["Employee Engagement and Behavior", "Financial and Operational Performance", "Goal Achievement and Strategic Alignment", "Productivity and Efficiency", "Work Quality and Effectiveness"],
    cultural: ["Attitude", "Core Values", "Environmental Fit", "Interpersonal", "Leadership", "Work Style"],
    personality: ["Ownership", "Collaboration", "Action", "Analysis", "Risk Tolerance", "Structure"],
    strategic_leadership: ["Vision / Strategy", "People Leadership", "Decision Making", "Accountability", "Emotional Intelligence", "Execution Drive", "Ethics"],
    behavioral: ["Adaptability", "Clinical", "Collaboration", "Communication Style", "Decision-Making", "FBA", "Leadership"],
    manufacturing_baseline: ["Technical Fundamentals", "Troubleshooting", "Numerical Aptitude", "Safety & Work Ethic"]
  };
  return areas[typeCode] || ["General Assessment"];
}

function getStatusConfig(status, scorePercentage) {
  if (status === "completed") return { label: scorePercentage !== null ? "Completed • " + scorePercentage + "%" : "Completed", bg: "#dcfce7", color: "#166534", border: "1px solid #86efac", icon: "✓" };
  if (status === "in_progress") return { label: "In Progress", bg: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd", icon: "↗" };
  if (status === "unblocked") return { label: "Ready to Start", bg: "#e8f5e9", color: "#2e7d32", border: "1px solid #4caf50", icon: "🔓" };
  if (status === "not_assigned") return { label: "Not Assigned", bg: "#f5f5f5", color: "#667085", border: "1px solid #e0e0e0", icon: "○" };
  return { label: "Blocked", bg: "#fff3e0", color: "#f57c00", border: "1px solid #ffcc80", icon: "🔒" };
}

function canStartAssessment(status) {
  return status === "unblocked" || status === "in_progress";
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (error) {
    return "N/A";
  }
}

async function safeQuery(queryBuilder, fallbackValue, label) {
  try {
    const response = await queryBuilder;
    if (response.error) {
      console.warn(label + " query warning:", response.error.message);
      return fallbackValue;
    }
    return response.data || fallbackValue;
  } catch (error) {
    console.warn(label + " query warning:", error?.message || error);
    return fallbackValue;
  }
}

export default function CandidateDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Candidate");
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [assessmentCards, setAssessmentCards] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [selectedAssessmentAreas, setSelectedAssessmentAreas] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const excludedTypes = ["manufacturing"];

  useEffect(() => {
    unlockPageInteraction();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchDashboardData(session.user);
  }, [session]);

  function unlockPageInteraction() {
    if (typeof document === "undefined") return;

    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.pointerEvents = "auto";
    document.body.style.overflowY = "auto";
    document.body.style.pointerEvents = "auto";

    const nextRoot = document.getElementById("__next");
    if (nextRoot) {
      nextRoot.style.overflowY = "auto";
      nextRoot.style.pointerEvents = "auto";
    }

    document.querySelectorAll("[inert]").forEach((element) => {
      element.removeAttribute("inert");
    });

    document.querySelectorAll("[aria-hidden='true']").forEach((element) => {
      if (element.id === "__next" || element.closest("#__next")) {
        element.removeAttribute("aria-hidden");
      }
    });
  }

  async function fetchDashboardData(user) {
    try {
      setLoading(true);
      setErrorMessage("");

      const userId = user.id;

      const profileResponse = await supabase
        .from("candidate_profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      if (profileResponse.data?.full_name) setUserName(profileResponse.data.full_name);
      else setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Candidate");

      const typesResponse = await supabase
        .from("assessment_types")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (typesResponse.error) throw typesResponse.error;

      const assessmentsResponse = await supabase
        .from("assessments")
        .select("*, assessment_type:assessment_types(*)")
        .eq("is_active", true);

      if (assessmentsResponse.error) throw assessmentsResponse.error;

      const accessRows = await safeQuery(
        supabase
          .from("candidate_assessments")
          .select("id, assessment_id, status, result_id, completed_at, unblocked_at, created_at")
          .eq("user_id", userId),
        [],
        "candidate_assessments"
      );

      const sessionRows = await safeQuery(
        supabase
          .from("assessment_sessions")
          .select("id, assessment_id, status, time_spent_seconds, updated_at, expires_at")
          .eq("user_id", userId),
        [],
        "assessment_sessions"
      );

      const resultRows = await safeQuery(
        supabase
          .from("assessment_results")
          .select("id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted")
          .eq("user_id", userId),
        [],
        "assessment_results"
      );

      const filteredTypes = safeArray(typesResponse.data).filter((type) => !excludedTypes.includes(type.code));
      const filteredAssessments = safeArray(assessmentsResponse.data).filter((assessment) => !excludedTypes.includes(assessment.assessment_type?.code));
      const uniqueAssessments = removeDuplicateAssessments(filteredAssessments);

      const accessMap = {};
      safeArray(accessRows).forEach((item) => { accessMap[item.assessment_id] = item; });

      const latestSessionMap = {};
      safeArray(sessionRows).forEach((item) => {
        const existing = latestSessionMap[item.assessment_id];
        if (!existing || new Date(item.updated_at || 0).getTime() > new Date(existing.updated_at || 0).getTime()) latestSessionMap[item.assessment_id] = item;
      });

      const resultMap = {};
      safeArray(resultRows).forEach((item) => {
        const existing = resultMap[item.assessment_id];
        if (!existing || new Date(item.completed_at || 0).getTime() > new Date(existing.completed_at || 0).getTime()) resultMap[item.assessment_id] = item;
      });

      const typeOptions = filteredTypes.map((type) => ({
        id: type.code,
        label: type.name,
        shortLabel: type.code === "manufacturing_baseline" ? "Mfg Baseline" : type.name || type.code,
        description: type.description || type.name + " assessment",
        icon: type.icon || "📋",
        color: type.color || getAssessmentColor(type.code).color,
        areas: Array.isArray(type.category_config) ? type.category_config : getDefaultAssessmentAreas(type.code)
      }));

      const cards = uniqueAssessments.map((assessment) => {
        const typeCode = assessment.assessment_type?.code || "general";
        const access = accessMap[assessment.id] || null;
        const latestSession = latestSessionMap[assessment.id] || null;
        const result = resultMap[assessment.id] || null;
        const scorePercentage = getScorePercentage(result);

        let status = access ? "blocked" : "not_assigned";
        if (result || access?.status === "completed" || latestSession?.status === "completed") status = "completed";
        else if (latestSession?.status === "in_progress") status = "in_progress";
        else if (access?.status === "unblocked") status = "unblocked";
        else if (access?.status === "blocked") status = "blocked";

        return {
          id: assessment.id,
          title: assessment.title || "Assessment",
          description: assessment.description || "Assessment assigned by your supervisor.",
          typeCode,
          typeName: assessment.assessment_type?.name || typeCode,
          icon: assessment.assessment_type?.icon || "📋",
          status,
          scorePercentage,
          completedAt: result?.completed_at || access?.completed_at || null,
          unblockedAt: access?.unblocked_at || null,
          session: latestSession,
          result,
          access
        };
      });

      setAssessmentTypes(typeOptions);
      setAssessmentCards(cards);

      const firstType = typeOptions[0] || null;
      if (firstType) {
        setActiveTab((current) => current || firstType.id);
        setSelectedAssessmentAreas(firstType.areas || []);
      }
    } catch (error) {
      console.error("Error loading candidate dashboard:", error);
      setErrorMessage(error?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  function removeDuplicateAssessments(assessments) {
    const map = new Map();
    safeArray(assessments).forEach((assessment) => {
      const typeCode = assessment.assessment_type?.code || "general";
      if (!map.has(typeCode)) map.set(typeCode, assessment);
    });
    return Array.from(map.values());
  }

  function handleTabChange(typeId) {
    const typeConfig = assessmentTypes.find((type) => type.id === typeId);
    setActiveTab(typeId);
    setSelectedAssessmentAreas(typeConfig?.areas || getDefaultAssessmentAreas(typeId));
  }

  function getAssessmentByType(typeCode) {
    return assessmentCards.find((card) => card.typeCode === typeCode) || null;
  }

  function handleStartAssessment(card) {
    if (!card) return;
    if (card.status === "completed") {
      alert("This assessment has already been completed and cannot be retaken.");
      return;
    }
    if (!canStartAssessment(card.status)) {
      if (card.status === "not_assigned") alert("This assessment has not been assigned to you yet. Please contact your supervisor.");
      else alert("This assessment is currently blocked. Please contact your supervisor to unblock it.");
      return;
    }
    router.push("/assessment/" + card.id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const completedCount = assessmentCards.filter((card) => card.status === "completed").length;
  const readyCount = assessmentCards.filter((card) => card.status === "unblocked").length;
  const inProgressCount = assessmentCards.filter((card) => card.status === "in_progress").length;
  const totalAssessments = assessmentCards.length;
  const activeTypeConfig = assessmentTypes.find((type) => type.id === activeTab) || assessmentTypes[0] || null;
  const activeAssessment = activeTab ? getAssessmentByType(activeTab) : null;
  const activeColors = getAssessmentColor(activeTab || "general");
  const activeStatus = activeAssessment ? getStatusConfig(activeAssessment.status, activeAssessment.scorePercentage) : getStatusConfig("not_assigned", null);

  const progressItems = useMemo(() => assessmentTypes.map((type) => {
    const card = getAssessmentByType(type.id);
    const colors = getAssessmentColor(type.id);
    const status = card ? getStatusConfig(card.status, card.scorePercentage) : getStatusConfig("not_assigned", null);
    return { type, card, colors, status };
  }), [assessmentTypes, assessmentCards]);

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your dashboard...</div>
        </div>
        <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return null;

  return (
    <main id="candidate-dashboard-interactive-root" style={styles.pageContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>STRATAVAX</h1>
            <span style={styles.headerDivider}>|</span>
            <span style={styles.headerSubtitle}>Assessment Portal</span>
          </div>
          <div style={styles.headerRight}>
            <Link href="/candidate/profile" legacyBehavior><a style={styles.profileButton}>👤 Profile</a></Link>
            <button type="button" onClick={handleSignOut} style={styles.logoutButton}>Sign Out</button>
          </div>
        </div>
      </header>

      <section style={styles.welcomeSection}>
        <div style={styles.welcomeContent}>
          <h2 style={styles.welcomeTitle}>Welcome back, <span style={styles.welcomeName}>{userName}</span></h2>
          <p style={styles.welcomeText}>
            {readyCount + inProgressCount > 0 ? "You have " + (readyCount + inProgressCount) + " assessment(s) ready or in progress." : "You can view and move through the dashboard. Assessment start is locked until assigned and unblocked."}
          </p>
        </div>
        <div style={styles.progressBadge}><span style={styles.progressCount}>{completedCount}</span><span style={styles.progressTotal}>/{totalAssessments}</span><span style={styles.progressLabel}>Completed</span></div>
      </section>

      <section style={styles.mainContent}>
        {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

        <div style={styles.tabsContainer}>
          {assessmentTypes.map((tab) => {
            const isActive = activeTab === tab.id;
            const colors = getAssessmentColor(tab.id);
            const card = getAssessmentByType(tab.id);
            const status = card ? getStatusConfig(card.status, card.scorePercentage) : getStatusConfig("not_assigned", null);
            return (
              <button key={tab.id} type="button" onClick={() => handleTabChange(tab.id)} style={{ ...styles.tabButton, background: isActive ? colors.gradient : "rgba(255,255,255,0.96)", color: isActive ? "white" : colors.color, border: isActive ? "1px solid transparent" : "1px solid " + colors.color + "40", boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.2)" : "none" }}>
                <span style={styles.tabLabel}>{tab.shortLabel}</span>
                <span style={{ ...styles.tabStatusMini, background: status.bg, color: status.color }}>{status.label}</span>
              </button>
            );
          })}
        </div>

        {activeAssessment ? (
          <div style={styles.assessmentDetailsSection}>
            <div style={{ ...styles.card, border: "1px solid " + activeColors.color + "40" }}>
              <div style={styles.cardHeader}>
                <div style={{ ...styles.cardIconLarge, background: activeColors.gradient }}>{activeTypeConfig?.icon || activeAssessment.icon || "📋"}</div>
                <div style={styles.cardInfo}>
                  <h3 style={styles.cardTitle}>{activeAssessment.title}</h3>
                  <p style={styles.cardDescription}>{activeAssessment.description}</p>
                  <div style={styles.cardMeta}><span style={styles.metaItem}>⏱️ 180 minutes</span><span style={styles.metaItem}>📋 100 questions</span><span style={styles.metaItem}>🎯 One attempt</span></div>
                  {activeAssessment.completedAt && <p style={styles.completedText}>Completed: {formatDate(activeAssessment.completedAt)}</p>}
                  {activeAssessment.status === "not_assigned" && <p style={styles.accessText}>This assessment is visible, but has not been assigned yet.</p>}
                  {activeAssessment.status === "blocked" && <p style={styles.accessText}>This assessment is assigned but blocked. Ask your supervisor to unblock it.</p>}
                </div>
                <div style={styles.cardStatus}><span style={{ ...styles.statusBadge, background: activeStatus.bg, color: activeStatus.color, border: activeStatus.border }}>{activeStatus.icon} {activeStatus.label}</span></div>
              </div>

              {activeAssessment.status === "completed" ? (
                <button type="button" disabled style={styles.disabledButton}>Assessment Completed</button>
              ) : canStartAssessment(activeAssessment.status) ? (
                <button type="button" onClick={() => handleStartAssessment(activeAssessment)} style={{ ...styles.startButton, background: activeColors.gradient }}>{activeAssessment.status === "in_progress" ? "Continue Assessment →" : "Start Assessment →"}</button>
              ) : (
                <button type="button" disabled style={styles.disabledButton}>{activeAssessment.status === "not_assigned" ? "Not Assigned" : "Contact Supervisor to Unblock"}</button>
              )}
            </div>

            {selectedAssessmentAreas.length > 0 && <AssessmentAreas areas={selectedAssessmentAreas} color={activeColors.color} />}
          </div>
        ) : (
          <div style={styles.assessmentDetailsSection}>
            <div style={{ ...styles.card, border: "1px solid " + activeColors.color + "40" }}>
              <div style={styles.cardHeader}>
                <div style={{ ...styles.cardIconLarge, background: activeColors.gradient }}>{activeTypeConfig?.icon || "📋"}</div>
                <div style={styles.cardInfo}><h3 style={styles.cardTitle}>{activeTypeConfig?.label || "Assessment"}</h3><p style={styles.cardDescription}>This assessment category is visible, but no active assessment has been configured for this category yet.</p></div>
                <div style={styles.cardStatus}><span style={{ ...styles.statusBadge, background: activeStatus.bg, color: activeStatus.color, border: activeStatus.border }}>{activeStatus.icon} {activeStatus.label}</span></div>
              </div>
              <button type="button" disabled style={styles.disabledButton}>Not Assigned</button>
            </div>
            {selectedAssessmentAreas.length > 0 && <AssessmentAreas areas={selectedAssessmentAreas} color={activeColors.color} />}
          </div>
        )}

        <div style={styles.progressSection}>
          <h3 style={styles.sectionTitle}>Your Progress</h3>
          <div style={styles.progressGrid}>{progressItems.map(({ type, colors, status }) => <div key={type.id} style={{ ...styles.progressItem, border: "1px solid " + colors.color + "40", background: status.bg }}><div style={styles.progressItemLeft}><div style={{ ...styles.progressColorDot, background: colors.gradient }} /><span style={{ ...styles.progressName, color: colors.color }}>{type.shortLabel}</span></div><span style={{ ...styles.progressStatus, color: status.color }}>{status.label}</span></div>)}</div>
        </div>

        <div style={styles.infoNote}><span style={styles.infoIcon}>ℹ️</span><span><strong>Note:</strong> You can move through the dashboard freely. Only assessment start is locked until the assessment is assigned and unblocked.</span></div>

        <div style={styles.guidelinesWrapper}>
          <div style={styles.guidelinesContent}>
            <div style={styles.guidelinesHeader}><span style={styles.guidelinesIcon}>📋</span><h3 style={styles.guidelinesTitle}>Assessment Guidelines</h3></div>
            <div style={styles.guidelinesGrid}><Guideline icon="⏱️" title="3-Hour Time Limit" text="All assessments have a 3-hour time limit. The timer starts when the assessment begins." /><Guideline icon="🔄" title="One Attempt Only" text="Each assessment can only be taken once. Ensure the assessment is completed in a suitable environment." /><Guideline icon="🔓" title="Supervisor Access" text="A supervisor must unblock each assessment before the assessment can be started." /><Guideline icon="💾" title="Auto-Save Enabled" text="Answers are automatically saved. In-progress assessments can be resumed." /></div>
            <div style={styles.tipCard}><span style={styles.tipIcon}>💡</span><div style={styles.tipContent}><strong>Pro Tip:</strong> If an assessment shows as blocked, contact your supervisor to request access.</div></div>
          </div>
        </div>
      </section>

      <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <style jsx global>{`
        html, body, #__next {
          min-height: 100%;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          pointer-events: auto !important;
        }
        #candidate-dashboard-interactive-root,
        #candidate-dashboard-interactive-root * {
          pointer-events: auto !important;
        }
        #candidate-dashboard-interactive-root button:disabled {
          pointer-events: none !important;
        }
      `}</style>
    </main>
  );
}

function AssessmentAreas({ areas, color }) {
  return <div style={{ ...styles.areasSection, borderTop: "4px solid " + color }}><h3 style={styles.areasTitle}>Key Assessment Areas</h3><div style={styles.areasGrid}>{areas.map((area, index) => <div key={index} style={styles.areaItem}><span style={{ ...styles.areaBullet, color }}>•</span><span style={styles.areaText}>{area}</span></div>)}</div></div>;
}

function Guideline(props) {
  return <div style={styles.guidelineCard}><div style={styles.guidelineIconWrapper}><span style={styles.guidelineIcon}>{props.icon}</span></div><div style={styles.guidelineTextWrapper}><h4 style={styles.guidelineTitle}>{props.title}</h4><p style={styles.guidelineText}>{props.text}</p></div></div>;
}

const styles = {
  pageContainer: { minHeight: "100vh", width: "100%", overflowX: "hidden", overflowY: "auto", backgroundImage: "linear-gradient(rgba(15,23,42,0.35), rgba(15,23,42,0.35)), url(/images/dashboard1-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", paddingBottom: "40px", position: "relative", zIndex: 2147483647 },
  loadingContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" },
  loadingContent: { textAlign: "center", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" },
  loadingLogo: { fontSize: "32px", fontWeight: "700", marginBottom: "20px", letterSpacing: "2px", color: "white" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid rgba(255,255,255,0.2)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  loadingText: { fontSize: "16px", opacity: 0.9 },
  header: { padding: "16px 24px", background: "rgba(15,23,42,0.72)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.2)" },
  headerContent: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { fontSize: "20px", fontWeight: "700", color: "white", margin: 0, letterSpacing: "1px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  headerDivider: { color: "rgba(255,255,255,0.7)", fontSize: "20px", fontWeight: "300" },
  headerSubtitle: { fontSize: "16px", color: "rgba(255,255,255,0.9)", fontWeight: "400", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  profileButton: { padding: "8px 20px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "500", backdropFilter: "blur(10px)", textDecoration: "none", display: "inline-block" },
  logoutButton: { padding: "8px 20px", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "500", backdropFilter: "blur(10px)" },
  welcomeSection: { maxWidth: "1200px", margin: "32px auto 24px", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" },
  welcomeContent: { flex: 1 },
  welcomeTitle: { fontSize: "24px", fontWeight: "600", margin: "0 0 4px 0", color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  welcomeName: { color: "#ffd700" },
  welcomeText: { fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" },
  progressBadge: { background: "rgba(255,255,255,0.15)", padding: "8px 20px", borderRadius: "30px", display: "flex", alignItems: "baseline", gap: "4px", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(10px)" },
  progressCount: { fontSize: "20px", fontWeight: "700", color: "white" },
  progressTotal: { fontSize: "14px", color: "rgba(255,255,255,0.7)" },
  progressLabel: { fontSize: "13px", color: "rgba(255,255,255,0.7)", marginLeft: "8px" },
  mainContent: { maxWidth: "1200px", margin: "0 auto", padding: "0 20px 40px" },
  errorBox: { marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", background: "#fff5f5", border: "1px solid #fecaca", color: "#b42318" },
  tabsContainer: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" },
  tabButton: { padding: "8px 20px", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "500", transition: "all 0.2s", fontFamily: "inherit", backdropFilter: "blur(10px)", display: "inline-flex", alignItems: "center", gap: "8px" },
  tabLabel: { textTransform: "capitalize" },
  tabStatusMini: { fontSize: "10px", padding: "3px 7px", borderRadius: "12px", fontWeight: "700" },
  assessmentDetailsSection: { marginBottom: "32px" },
  card: { background: "white", borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  cardHeader: { display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" },
  cardIconLarge: { width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", color: "white", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  cardInfo: { flex: 1, minWidth: "250px" },
  cardTitle: { fontSize: "20px", fontWeight: "600", margin: "0 0 8px 0", color: "#0f172a" },
  cardDescription: { margin: "0 0 10px", color: "#475569", fontSize: "14px", lineHeight: 1.5 },
  cardMeta: { display: "flex", gap: "24px", fontSize: "14px", color: "#475569", flexWrap: "wrap" },
  metaItem: { display: "flex", alignItems: "center", gap: "6px" },
  completedText: { margin: "10px 0 0", color: "#667085", fontSize: "12px" },
  accessText: { margin: "10px 0 0", color: "#92400e", fontSize: "13px", fontWeight: 600 },
  cardStatus: { minWidth: "140px", textAlign: "right" },
  statusBadge: { padding: "6px 16px", borderRadius: "30px", fontSize: "13px", fontWeight: "600", display: "inline-block" },
  startButton: { padding: "12px 24px", color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", alignSelf: "flex-end", transition: "all 0.2s", minWidth: "200px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  disabledButton: { padding: "12px 24px", background: "#e0e0e0", color: "#9e9e9e", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "not-allowed", alignSelf: "flex-end", minWidth: "200px", boxShadow: "none" },
  areasSection: { background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" },
  areasTitle: { fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" },
  areasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" },
  areaItem: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" },
  areaBullet: { fontSize: "18px", fontWeight: "bold" },
  areaText: { fontSize: "14px", color: "#334155" },
  progressSection: { marginBottom: "24px" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "white", margin: "0 0 16px 0", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" },
  progressGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" },
  progressItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "10px", gap: "10px" },
  progressItemLeft: { display: "flex", alignItems: "center", gap: "10px" },
  progressColorDot: { width: "8px", height: "8px", borderRadius: "4px" },
  progressName: { fontSize: "14px", fontWeight: "600" },
  progressStatus: { fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "20px" },
  infoNote: { marginBottom: "24px", padding: "12px 20px", background: "rgba(227,242,253,0.95)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", color: "#1565c0", fontSize: "14px", border: "1px solid #90caf9", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  infoIcon: { fontSize: "18px" },
  guidelinesWrapper: { borderRadius: "16px", overflow: "hidden", marginTop: "20px" },
  guidelinesContent: { padding: "40px", background: "linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)", backdropFilter: "blur(10px)" },
  guidelinesHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" },
  guidelinesIcon: { fontSize: "28px" },
  guidelinesTitle: { fontSize: "22px", fontWeight: "600", color: "white", margin: 0 },
  guidelinesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "30px" },
  guidelineCard: { display: "flex", alignItems: "flex-start", gap: "15px", padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", backdropFilter: "blur(5px)", border: "1px solid rgba(255,255,255,0.1)" },
  guidelineIconWrapper: { width: "44px", height: "44px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 },
  guidelineIcon: { fontSize: "22px" },
  guidelineTextWrapper: { flex: 1 },
  guidelineTitle: { fontSize: "15px", fontWeight: "600", color: "white", margin: "0 0 6px 0" },
  guidelineText: { fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", margin: 0 },
  tipCard: { display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", background: "rgba(37,99,235,0.15)", borderRadius: "10px", border: "1px solid rgba(37,99,235,0.3)" },
  tipIcon: { fontSize: "24px" },
  tipContent: { fontSize: "14px", color: "#e2e8f0", lineHeight: "1.5" }
};
