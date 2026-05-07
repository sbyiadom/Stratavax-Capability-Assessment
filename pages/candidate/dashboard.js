// pages/candidate/dashboard.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useRequireAuth } from "../../utils/requireAuth";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function decodeHtmlEntities(value) {
  let text;
  let previousText;

  if (value === null || value === undefined) return value;
  text = String(value);

  // Decode repeatedly because some values are double-encoded.
  for (let i = 0; i < 10; i += 1) {
    previousText = text;
    text = text.replace(/&amp;amp;/gi, "&");
    text = text.replace(/&amp;lt;/gi, "<");
    text = text.replace(/&amp;gt;/gi, ">"
    );
    text = text.replace(/&amp;quot;/gi, '"');
    text = text.replace(/&amp;#039;/gi, "'");
    text = text.replace(/&amp;#39;/gi, "'");
    text = text.replace(/&amp;nbsp;/gi, " ");

    // Common single-encoding patterns
    text = text.replace(/&amp;/gi, "&");
    text = text.replace(/&lt;/gi, "<");
    text = text.replace(/&gt;/gi, ">"
    );
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#039;/gi, "'");
    text = text.replace(/&#39;/gi, "'");
    text = text.replace(/&nbsp;/gi, " ");

    if (text === previousText) break;
  }

  return text;
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

  const rawPercentage = record.percentage_score ?? record.percentage ?? null;
  const score = record.total_score ?? record.score ?? null;
  const maxScore = record.max_score ?? null;

  if (score !== null && score !== undefined && maxScore !== null && maxScore !== undefined && toNumber(maxScore, 0) > 0) {
    return Math.round((toNumber(score, 0) / toNumber(maxScore, 0)) * 100);
  }

  if (rawPercentage !== null && rawPercentage !== undefined && rawPercentage !== "") {
    return Math.round(toNumber(rawPercentage, 0));
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
  if (status === "completed") {
    return {
      label: scorePercentage !== null ? "Completed • " + scorePercentage + "%" : "Completed",
      bg: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
      icon: "✓"
    };
  }

  if (status === "in_progress") {
    return {
      label: "In Progress",
      bg: "#dbeafe",
      color: "#1e40af",
      border: "1px solid #93c5fd",
      icon: "↗"
    };
  }

  if (status === "unblocked") {
    return {
      label: "Ready to Start",
      bg: "#e8f5e9",
      color: "#2e7d32",
      border: "1px solid #4caf50",
      icon: "🔓"
    };
  }

  return {
    label: "Blocked",
    bg: "#f5f5f5",
    color: "#667085",
    border: "1px solid #e0e0e0",
    icon: "🔒"
  };
}

// Platform-wide priority rules for duplicate assessments under the same type.
function getAssessmentPriority(assessment, accessMap, resultMap, latestSessionMap) {
  const access = accessMap[assessment.id] || null;
  const result = resultMap[assessment.id] || null;
  const session = latestSessionMap[assessment.id] || null;

  // If reset/unblocked with no results, prefer this one.
  if (access && access.status === "unblocked" && !access.result_id && !access.completed_at && !result) return 100;
  if (session && session.status === "in_progress" && (!access || access.status !== "blocked")) return 90;
  if (result || (access && (access.status === "completed" || access.result_id || access.completed_at))) return 80;
  if (access && access.status === "blocked") return 70;
  if (access) return 60;
  return 0;
}

function removeDuplicateAssessments(assessments, accessMap, resultMap, latestSessionMap) {
  const map = new Map();

  safeArray(assessments).forEach((assessment) => {
    const typeCode = assessment.assessment_type?.code || "general";
    const existing = map.get(typeCode);

    if (!existing) {
      map.set(typeCode, assessment);
      return;
    }

    const currentPriority = getAssessmentPriority(assessment, accessMap, resultMap, latestSessionMap);
    const existingPriority = getAssessmentPriority(existing, accessMap, resultMap, latestSessionMap);

    if (currentPriority > existingPriority) {
      map.set(typeCode, assessment);
    }
  });

  return Array.from(map.values());
}

// PLATFORM-WIDE STATUS RULES
// IMPORTANT: Do NOT treat historical completed sessions as completion.
// Completion is authoritative only via candidate_assessments or assessment_results.
function determineCardStatus(access, latestSession, result) {
  const isCompleted = Boolean(
    !!result ||
      (access && (access.status === "completed" || access.result_id || access.completed_at))
  );

  if (isCompleted) return "completed";

  // If assignment unblocked, candidate must see Ready to Start.
  if (access && access.status === "unblocked") return "unblocked";

  // In progress should be driven by an active session, but never override explicit blocked.
  if (latestSession && latestSession.status === "in_progress" && (!access || access.status !== "blocked")) return "in_progress";

  return "blocked";
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

  const excludedTypes = ["manufacturing"]; // keep your existing exclusion

  useEffect(() => {
    if (!session?.user) return;
    fetchDashboardData(session.user);
  }, [session]);

  async function fetchDashboardData(user) {
    try {
      setLoading(true);
      setErrorMessage("");

      const userId = user.id;

      const profilePromise = supabase
        .from("candidate_profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      const typesPromise = supabase
        .from("assessment_types")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      const assessmentsPromise = supabase
        .from("assessments")
        .select("*, assessment_type:assessment_types(*)")
        .eq("is_active", true);

      // Candidate assignment state
      const accessPromise = supabase
        .from("candidate_assessments")
        .select("id, assessment_id, status, result_id, completed_at, unblocked_at, created_at, session_id")
        .eq("user_id", userId);

      const sessionsPromise = supabase
        .from("assessment_sessions")
        .select("id, assessment_id, status, time_spent_seconds, updated_at, expires_at")
        .eq("user_id", userId);

      const resultsPromise = supabase
        .from("assessment_results")
        .select("id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted")
        .eq("user_id", userId);

      const [profileResponse, typesResponse, assessmentsResponse, accessResponse, sessionsResponse, resultsResponse] = await Promise.all([
        profilePromise,
        typesPromise,
        assessmentsPromise,
        accessPromise,
        sessionsPromise,
        resultsPromise
      ]);

      if (profileResponse.data?.full_name) {
        setUserName(profileResponse.data.full_name);
      } else {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Candidate");
      }

      if (typesResponse.error) throw typesResponse.error;
      if (assessmentsResponse.error) throw assessmentsResponse.error;
      if (accessResponse.error) throw accessResponse.error;
      if (sessionsResponse.error) throw sessionsResponse.error;
      if (resultsResponse.error) throw resultsResponse.error;

      const filteredTypes = safeArray(typesResponse.data).filter((type) => !excludedTypes.includes(type.code));
      const filteredAssessments = safeArray(assessmentsResponse.data).filter((assessment) => !excludedTypes.includes(assessment.assessment_type?.code));

      const accessMap = {};
      safeArray(accessResponse.data).forEach((item) => {
        accessMap[item.assessment_id] = item;
      });

      const latestSessionMap = {};
      safeArray(sessionsResponse.data).forEach((item) => {
        const existing = latestSessionMap[item.assessment_id];
        if (!existing || new Date(item.updated_at || 0).getTime() > new Date(existing.updated_at || 0).getTime()) {
          latestSessionMap[item.assessment_id] = item;
        }
      });

      const resultMap = {};
      safeArray(resultsResponse.data).forEach((item) => {
        const existing = resultMap[item.assessment_id];
        if (!existing || new Date(item.completed_at || 0).getTime() > new Date(existing.completed_at || 0).getTime()) {
          resultMap[item.assessment_id] = item;
        }
      });

      const uniqueAssessments = removeDuplicateAssessments(filteredAssessments, accessMap, resultMap, latestSessionMap);

      const typeOptions = filteredTypes.map((type) => ({
        id: type.code,
        label: decodeHtmlEntities(type.name),
        shortLabel: type.code === "manufacturing_baseline" ? "Mfg Baseline" : decodeHtmlEntities(type.name || type.code),
        description: decodeHtmlEntities(type.description || type.name + " assessment"),
        icon: type.icon || "📋",
        gradientStart: type.gradient_start || getAssessmentColor(type.code).color,
        gradientEnd: type.gradient_end || getAssessmentColor(type.code).color,
        color: type.color || getAssessmentColor(type.code).color,
        areas: Array.isArray(type.category_config) ? type.category_config.map(decodeHtmlEntities) : getDefaultAssessmentAreas(type.code)
      }));

      const cards = uniqueAssessments.map((assessment) => {
        const typeCode = assessment.assessment_type?.code || "general";
        const access = accessMap[assessment.id] || null;
        const latestSession = latestSessionMap[assessment.id] || null;
        const result = resultMap[assessment.id] || null;
        const scorePercentage = getScorePercentage(result);
        const status = determineCardStatus(access, latestSession, result);

        return {
          id: assessment.id,
          title: decodeHtmlEntities(assessment.title || "Assessment"),
          description: decodeHtmlEntities(assessment.description || "Assessment assigned by your supervisor."),
          typeCode,
          typeName: decodeHtmlEntities(assessment.assessment_type?.name || typeCode),
          icon: assessment.assessment_type?.icon || "📋",
          status,
          scorePercentage: scorePercentage !== null ? scorePercentage : null,
          completedAt: (result && result.completed_at) || (access && access.completed_at) || null,
          unblockedAt: access && access.unblocked_at ? access.unblocked_at : null,
          session: latestSession,
          result,
          access
        };
      });

      setAssessmentTypes(typeOptions);
      setAssessmentCards(cards);

      const firstReadyType =
        typeOptions.find((type) =>
          cards.some((card) => card.typeCode === type.id && (card.status === "unblocked" || card.status === "in_progress"))
        ) || null;

      const firstAvailableType =
        firstReadyType ||
        typeOptions.find((type) => cards.some((card) => card.typeCode === type.id)) ||
        typeOptions[0] ||
        null;

      if (firstAvailableType) {
        setActiveTab(firstAvailableType.id);
        setSelectedAssessmentAreas(firstAvailableType.areas || []);
      }
    } catch (error) {
      console.error("Error loading candidate dashboard:", error);
      setErrorMessage(error?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
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
      alert("This assessment has already been completed and cannot be retaken unless your supervisor resets it.");
      return;
    }

    if (card.status !== "unblocked" && card.status !== "in_progress") {
      alert("This assessment is currently blocked. Please contact your supervisor to unblock it.");
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
  const activeStatus = activeAssessment ? getStatusConfig(activeAssessment.status, activeAssessment.scorePercentage) : null;

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingBackground} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingText}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageBackground} />
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <h1 style={styles.headerTitle}>STRATAVAX</h1>
              <span style={styles.headerDivider}>|</span>
              <span style={styles.headerSubtitle}>Assessment Portal</span>
            </div>
            <div style={styles.headerRight}>
              <Link href="/candidate/profile" legacyBehavior>
                <a style={styles.profileButton}>👤 Profile</a>
              </Link>
              <button onClick={handleSignOut} style={styles.logoutButton}>Sign Out</button>
            </div>
          </div>
        </div>

        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h2 style={styles.welcomeTitle}>
              Welcome back, <span style={styles.welcomeName}>{userName}</span>
            </h2>
            <p style={styles.welcomeText}>
              {readyCount + inProgressCount > 0
                ? "You have " + (readyCount + inProgressCount) + " assessment(s) ready or in progress."
                : "No assessments are currently ready. Contact your supervisor to unlock assessments."}
            </p>
          </div>
          <div style={styles.progressBadge}>
            <span style={styles.progressCount}>{completedCount}</span>
            <span style={styles.progressTotal}>/{totalAssessments}</span>
            <span style={styles.progressLabel}>Completed</span>
          </div>
        </div>

        <div style={styles.mainContent}>
          {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}

          <div style={styles.tabsContainer}>
            {assessmentTypes.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasAssessment = !!getAssessmentByType(tab.id);
              const colors = getAssessmentColor(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => hasAssessment && handleTabChange(tab.id)}
                  disabled={!hasAssessment}
                  style={{
                    ...styles.tabButton,
                    background: isActive ? colors.gradient : "rgba(255,255,255,0.9)",
                    color: isActive ? "white" : colors.color,
                    border: isActive ? "none" : "1px solid " + colors.color + "40",
                    opacity: hasAssessment ? 1 : 0.45,
                    boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.2)" : "none"
                  }}
                >
                  <span style={styles.tabLabel}>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {activeAssessment ? (
            <div style={styles.assessmentDetailsSection}>
              <div style={{ ...styles.card, border: "1px solid " + activeColors.color + "40" }}>
                <div style={styles.cardHeader}>
                  <div style={{ ...styles.cardIconLarge, background: activeColors.gradient }}>
                    {activeTypeConfig?.icon || activeAssessment.icon || "📋"}
                  </div>
                  <div style={styles.cardInfo}>
                    <h3 style={styles.cardTitle}>{activeAssessment.title}</h3>
                    <p style={styles.cardDescription}>{activeAssessment.description}</p>
                    <div style={styles.cardMeta}>
                      <span style={styles.metaItem}><span style={styles.metaIcon}>⏱️</span> 180 minutes</span>
                      <span style={styles.metaItem}><span style={styles.metaIcon}>📋</span> 100 questions</span>
                      <span style={styles.metaItem}><span style={styles.metaIcon}>🎯</span> One attempt</span>
                    </div>
                    {activeAssessment.completedAt && <p style={styles.completedText}>Completed: {formatDate(activeAssessment.completedAt)}</p>}
                  </div>
                  <div style={styles.cardStatus}>
                    <span style={{ ...styles.statusBadge, background: activeStatus.bg, color: activeStatus.color, border: activeStatus.border }}>
                      {activeStatus.icon} {activeStatus.label}
                    </span>
                  </div>
                </div>

                {activeAssessment.status === "completed" ? (
                  <button disabled style={{ ...styles.startButton, background: "#e0e0e0", color: "#667085", cursor: "not-allowed", boxShadow: "none" }}>
                    Assessment Completed
                  </button>
                ) : activeAssessment.status === "unblocked" || activeAssessment.status === "in_progress" ? (
                  <button onClick={() => handleStartAssessment(activeAssessment)} style={{ ...styles.startButton, background: activeColors.gradient }}>
                    {activeAssessment.status === "in_progress" ? "Continue Assessment →" : "Start Assessment →"}
                  </button>
                ) : (
                  <button disabled style={{ ...styles.startButton, background: "#e0e0e0", color: "#9e9e9e", cursor: "not-allowed", boxShadow: "none" }}>
                    Contact Supervisor to Unblock
                  </button>
                )}
              </div>

              {selectedAssessmentAreas.length > 0 && (
                <div style={{ ...styles.areasSection, borderTop: "4px solid " + activeColors.color }}>
                  <h3 style={styles.areasTitle}>Key Assessment Areas</h3>
                  <div style={styles.areasGrid}>
                    {selectedAssessmentAreas.map((area, index) => (
                      <div key={index} style={styles.areaItem}>
                        <span style={{ ...styles.areaBullet, color: activeColors.color }}>•</span>
                        <span style={styles.areaText}>{decodeHtmlEntities(area)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyState}><p>No assessment available for this type.</p></div>
          )}

          <div style={styles.progressSection}>
            <h3 style={styles.sectionTitle}>Your Progress</h3>
            <div style={styles.progressGrid}>
              {assessmentTypes.map((type) => {
                const card = getAssessmentByType(type.id);
                const colors = getAssessmentColor(type.id);
                const score = card?.scorePercentage ?? null;
                const status = card ? getStatusConfig(card.status, score) : getStatusConfig("blocked", null);

                return (
                  <div key={type.id} style={{ ...styles.progressItem, border: "1px solid " + colors.color + "40", background: status.bg }}>
                    <div style={styles.progressItemLeft}>
                      <div style={{ ...styles.progressColorDot, background: colors.gradient }} />
                      <span style={{ ...styles.progressName, color: colors.color }}>{type.shortLabel}</span>
                    </div>
                    <span style={{ ...styles.progressStatus, color: status.color }}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.infoNote}>
            <span style={styles.infoIcon}>ℹ️</span>
            <span>
              <strong>Note:</strong> Assessments must be unblocked by your supervisor before starting. If an assessment has been reset, refresh the dashboard and it will show as ready.
            </span>
          </div>

          <div style={styles.guidelinesWrapper}>
            <div style={styles.guidelinesBackground} />
            <div style={styles.guidelinesContent}>
              <div style={styles.guidelinesHeader}>
                <span style={styles.guidelinesIcon}>📋</span>
                <h3 style={styles.guidelinesTitle}>Assessment Guidelines</h3>
              </div>
              <div style={styles.guidelinesGrid}>
                <Guideline icon="⏱️" title="3-Hour Time Limit" text="All assessments have a 3-hour time limit. The timer starts when the assessment begins." />
                <Guideline icon="🔄" title="One Attempt Only" text="Each assessment can only be taken once unless reset by a supervisor." />
                <Guideline icon="🔓" title="Supervisor Access" text="A supervisor must unblock each assessment before the assessment can be started." />
                <Guideline icon="💾" title="Auto-Save Enabled" text="Answers are automatically saved. In-progress assessments can be resumed." />
              </div>
              <div style={styles.tipCard}>
                <span style={styles.tipIcon}>💡</span>
                <div style={styles.tipContent}><strong>Pro Tip:</strong> If an assessment was reset but still appears blocked, sign out and reload the dashboard.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Guideline(props) {
  return (
    <div style={styles.guidelineCard}>
      <div style={styles.guidelineIconWrapper}><span style={styles.guidelineIcon}>{props.icon}</span></div>
      <div style={styles.guidelineTextWrapper}>
        <h4 style={styles.guidelineTitle}>{props.title}</h4>
        <p style={styles.guidelineText}>{props.text}</p>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: { position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden" },
  pageBackground: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url(/images/dashboard1-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", zIndex: -1 },
  content: { position: "relative", zIndex: 1, minHeight: "100vh", width: "100%" },
  loadingContainer: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  loadingBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url(/images/loading-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.7)", zIndex: 0 },
  loadingContent: { position: "relative", textAlign: "center", color: "white", zIndex: 1, textShadow: "2px 2px 4px rgba(0,0,0,0.5)" },
  loadingLogo: { fontSize: "32px", fontWeight: "700", marginBottom: "20px", letterSpacing: "2px", color: "white" },
  loadingSpinner: { width: "50px", height: "50px", border: "4px solid rgba(255,255,255,0.2)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" },
  loadingText: { fontSize: "16px", opacity: 0.9 },
  header: { padding: "16px 24px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.2)" },
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
  tabButton: { padding: "8px 20px", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "500", transition: "all 0.2s", fontFamily: "inherit", backdropFilter: "blur(10px)" },
  tabLabel: { textTransform: "capitalize" },
  assessmentDetailsSection: { marginBottom: "32px" },
  card: { background: "white", borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  cardHeader: { display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" },
  cardIconLarge: { width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", color: "white", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  cardInfo: { flex: 1, minWidth: "250px" },
  cardTitle: { fontSize: "20px", fontWeight: "600", margin: "0 0 8px 0", color: "#0f172a" },
  cardDescription: { margin: "0 0 10px", color: "#475569", fontSize: "14px", lineHeight: 1.5 },
  cardMeta: { display: "flex", gap: "24px", fontSize: "14px", color: "#475569", flexWrap: "wrap" },
  metaItem: { display: "flex", alignItems: "center", gap: "6px" },
  metaIcon: { fontSize: "16px" },
  completedText: { margin: "10px 0 0", color: "#667085", fontSize: "12px" },
  cardStatus: { minWidth: "140px", textAlign: "right" },
  statusBadge: { padding: "6px 16px", borderRadius: "30px", fontSize: "13px", fontWeight: "600", display: "inline-block" },
  startButton: { padding: "12px 24px", color: "white", border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600", cursor: "pointer", alignSelf: "flex-end", transition: "all 0.2s", minWidth: "200px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
  areasSection: { background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" },
  areasTitle: { fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" },
  areasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" },
  areaItem: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" },
  areaBullet: { fontSize: "18px", fontWeight: "bold" },
  areaText: { fontSize: "14px", color: "#334155" },
  emptyState: { textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", marginBottom: "30px", border: "1px solid #e2e8f0", color: "#64748b", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
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
  guidelinesWrapper: { position: "relative", borderRadius: "16px", overflow: "hidden", marginTop: "20px" },
  guidelinesBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url(https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80)", backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.3)" },
  guidelinesContent: { position: "relative", padding: "40px", background: "linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)", backdropFilter: "blur(10px)" },
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
