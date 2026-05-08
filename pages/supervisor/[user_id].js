// pages/supervisor/[user_id].js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(value, fallback = "Not available") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function decodeDeep(value) {
  if (typeof value === "string") return safeText(value, value);
  if (Array.isArray(value)) return value.map((item) => decodeDeep(item));
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((key) => {
      out[key] = decodeDeep(value[key]);
    });
    return out;
  }
  return value;
}

function round(value, places = 2) {
  const factor = Math.pow(10, places);
  return Math.round(safeNumber(value, 0) * factor) / factor;
}

function formatPercentage(value) {
  return round(value, 0) + "%";
}

function plural(count, one, many) {
  return safeNumber(count, 0) === 1 ? one : many;
}

function buildReportUrl(userId, assessmentId) {
  let url = "/api/supervisor/report?user_id=" + encodeURIComponent(userId);
  if (assessmentId) url += "&assessment_id=" + encodeURIComponent(assessmentId);
  return url;
}

function getTone(score) {
  const value = safeNumber(score, 0);
  if (value >= 85) return "excellent";
  if (value >= 75) return "strong";
  if (value >= 65) return "capable";
  if (value >= 55) return "developing";
  if (value >= 40) return "risk";
  return "critical";
}

function getToneLabel(score) {
  const tone = getTone(score);
  if (tone === "excellent") return "Excellent";
  if (tone === "strong") return "Strong";
  if (tone === "capable") return "Capable";
  if (tone === "developing") return "Developing";
  if (tone === "risk") return "At Risk";
  return "Critical";
}

function getToneColor(score) {
  const tone = getTone(score);
  if (tone === "excellent") return "#0f766e";
  if (tone === "strong") return "#2563eb";
  if (tone === "capable") return "#4f46e5";
  if (tone === "developing") return "#d97706";
  if (tone === "risk") return "#ea580c";
  return "#b42318";
}

function getToneGradient(score) {
  const tone = getTone(score);
  if (tone === "excellent") return "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)";
  if (tone === "strong") return "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)";
  if (tone === "capable") return "linear-gradient(135deg, #4338ca 0%, #8b5cf6 100%)";
  if (tone === "developing") return "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)";
  if (tone === "risk") return "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)";
  return "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)";
}

function getBadgeStyle(value) {
  const text = safeText(value, "").toLowerCase();
  if (text.includes("critical") || text.includes("high")) return styles.badgeCritical;
  if (text.includes("elevated") || text.includes("risk") || text.includes("develop")) return styles.badgeWarm;
  if (text.includes("low") || text.includes("strong") || text.includes("excellent")) return styles.badgeGood;
  return styles.badgeNeutral;
}

function getOverallScore(report) {
  const r = safeObject(report);
  return r.percentage || r.overallPercentage || r.overall_score || r.overallScore || r.totalPercentage || r.score || 0;
}

function getClassification(report) {
  const r = safeObject(report);
  return safeText(r.classification || r.overallClassification || r.performanceBand || r.performance_band || r.label || "Not classified", "Not classified");
}

function getRiskLevel(report) {
  const r = safeObject(report);
  return safeText(r.riskLevel || r.risk_level || "Not available", "Not available");
}

function getCandidateName(candidate, report) {
  const c = safeObject(candidate);
  const r = safeObject(report);
  return safeText(c.full_name || c.name || c.display_name || c.email || c.candidate_name || r.candidateName || r.candidate_name || "Candidate", "Candidate");
}

function getAssessmentName(assessment, report) {
  const a = safeObject(assessment);
  const r = safeObject(report);
  return safeText(a.title || a.name || a.assessment_name || r.assessmentName || r.assessment_name || "Assessment", "Assessment");
}

function getAssessmentId(assessment, report, fallback) {
  const a = safeObject(assessment);
  const r = safeObject(report);
  return a.id || a.assessment_id || r.assessmentId || r.assessment_id || fallback || "";
}

function getResponseCount(report) {
  const r = safeObject(report);
  return r.responseCount || r.response_count || r.totalResponses || r.total_responses || r.answeredQuestions || r.answered_questions || 0;
}

function getCategoryScores(report) {
  const r = safeObject(report);
  if (Array.isArray(r.categoryScores)) return r.categoryScores;
  if (Array.isArray(r.category_scores)) return r.category_scores;
  if (Array.isArray(r.competencyScores)) return r.competencyScores;
  if (Array.isArray(r.competency_scores)) return r.competency_scores;
  if (r.competencyScores && typeof r.competencyScores === "object") return Object.values(r.competencyScores);
  if (r.competency_scores && typeof r.competency_scores === "object") return Object.values(r.competency_scores);
  return [];
}

function getStrengths(report) {
  const r = safeObject(report);
  return safeArray(r.strengths || r.topStrengths || r.top_strengths);
}

function getDevelopmentAreas(report) {
  const r = safeObject(report);
  return safeArray(r.developmentAreas || r.development_areas || r.topDevelopmentNeeds || r.top_development_needs);
}

function getRecommendations(report) {
  const r = safeObject(report);
  return safeArray(r.recommendations || r.actionPlan || r.action_plan);
}

function getFollowUpQuestions(report) {
  const r = safeObject(report);
  return safeArray(r.followUpQuestions || r.follow_up_questions || r.supervisorQuestions || r.supervisor_questions);
}

function getBehavioralInsights(report) {
  const r = safeObject(report);
  return r.behavioralInsights || r.behavioral_insights || r.behavioralSummary || r.behavioral_summary || null;
}

function getRoleReadiness(report) {
  const r = safeObject(report);
  return safeText(
    r.roleReadiness ||
      r.role_readiness ||
      r.readinessStatement ||
      r.readiness_statement ||
      r.roleReadinessStatement ||
      r.role_readiness_statement ||
      "No role readiness statement is available yet.",
    "No role readiness statement is available yet."
  );
}

function getRowTitle(row) {
  const item = safeObject(row);
  return safeText(item.category || item.name || item.competency || item.title, "General");
}

function getRowPercentage(row) {
  const item = safeObject(row);
  return item.percentage || item.score || item.currentScore || item.current_score || 0;
}

function getRowNarrative(row) {
  const item = safeObject(row);
  return safeText(
    item.narrative ||
      item.supervisorMeaning ||
      item.supervisor_meaning ||
      item.supervisorImplication ||
      item.supervisor_implication ||
      item.comment ||
      item.performanceComment ||
      item.performance_comment ||
      item.recommendation ||
      item.description,
    "No interpretation available."
  );
}

function normalizeBehavior(behavioralInsights, responseCount) {
  const b = safeObject(behavioralInsights);
  let answered = safeNumber(b.answeredQuestions || b.answered_questions || b.responseCount || b.response_count || responseCount, safeNumber(responseCount, 0));
  let totalQuestions = safeNumber(b.totalQuestions || b.total_questions || b.questionCount || b.question_count, 0);
  let averageTime = safeNumber(b.averageTimePerQuestion || b.average_time_per_question || b.averageTime || b.average_time, 0);
  let totalTime = safeNumber(b.totalTimeSpent || b.total_time_spent || b.totalTime || b.total_time, 0);
  let totalChanges = safeNumber(b.totalChanges || b.total_changes || b.answerChanges || b.answer_changes, 0);
  let averageChanges = safeNumber(b.averageChangesPerQuestion || b.average_changes_per_question || b.averageChanges || b.average_changes, 0);
  let violations = safeNumber(b.violationCount || b.violation_count || b.violations || b.totalViolations || b.total_violations, 0);

  if (averageTime <= 0 && totalTime > 0 && answered > 0) averageTime = totalTime / answered;
  if (totalTime <= 0 && averageTime > 0 && answered > 0) totalTime = averageTime * answered;
  if (averageChanges <= 0 && totalChanges > 0 && answered > 0) averageChanges = totalChanges / answered;

  return {
    answered,
    totalQuestions,
    unanswered: totalQuestions > 0 ? Math.max(0, totalQuestions - answered) : 0,
    averageTime,
    totalTime,
    totalChanges,
    averageChanges,
    violations
  };
}

function buildBehavioralNarrative(behavioralInsights, responseCount, overallScore, classification) {
  const b = normalizeBehavior(behavioralInsights, responseCount);
  const observations = [];
  const flags = [];
  const answeredText = b.answered > 0 ? b.answered + " " + plural(b.answered, "recorded response", "recorded responses") : "the recorded responses";

  if (b.averageTime > 0) {
    if (b.averageTime < 2) {
      observations.push("The candidate moved through questions very quickly, with an average response time of " + round(b.averageTime, 2) + " seconds per question.");
      flags.push("Very rapid response time may indicate high confidence, but may also indicate limited reflection on some items.");
    } else if (b.averageTime < 8) {
      observations.push("The candidate maintained a brisk pace, averaging " + round(b.averageTime, 2) + " seconds per question.");
    } else if (b.averageTime <= 45) {
      observations.push("The candidate used a measured pace, averaging " + round(b.averageTime, 2) + " seconds per question.");
    } else {
      observations.push("The candidate spent a relatively long time on each item, averaging " + round(b.averageTime, 2) + " seconds per question.");
      flags.push("Longer response time may reflect careful consideration, but may also indicate hesitation or difficulty with some questions.");
    }
  } else {
    observations.push("The timing record is limited, so response-time behavior should be interpreted cautiously.");
  }

  if (b.totalChanges === 0) {
    observations.push("No answer changes were recorded, indicating a stable first-choice response pattern.");
  } else if (b.averageChanges <= 0.05) {
    observations.push("The candidate made " + b.totalChanges + " " + plural(b.totalChanges, "answer change", "answer changes") + ", which is low relative to " + answeredText + ". This suggests limited second-guessing after initial selections.");
  } else if (b.averageChanges <= 0.2) {
    observations.push("The candidate made " + b.totalChanges + " " + plural(b.totalChanges, "answer change", "answer changes") + ", showing some review and adjustment without indicating major instability.");
  } else {
    observations.push("The candidate made " + b.totalChanges + " " + plural(b.totalChanges, "answer change", "answer changes") + ", indicating frequent answer revision and possible uncertainty on several items.");
    flags.push("Frequent answer changes should be reviewed alongside the competency breakdown and follow-up questions before a final readiness decision.");
  }

  if (b.violations > 0) {
    flags.push("The assessment recorded " + b.violations + " platform rule " + plural(b.violations, "violation", "violations") + ". Review the session behavior before relying fully on the result.");
  }

  if (b.totalQuestions > 0 && b.unanswered > 0) {
    flags.push("The candidate had " + b.unanswered + " unanswered " + plural(b.unanswered, "question", "questions") + ". Consider whether the score fully represents capability.");
  }

  const paragraphs = [];
  paragraphs.push("Behavioral tracking reviewed " + answeredText + " from the assessment session. " + observations.join(" "));

  if (flags.length > 0) {
    paragraphs.push("Supervisor interpretation: " + flags.join(" "));
  } else {
    paragraphs.push("Supervisor interpretation: The response behavior appears stable. The available timing and answer-change indicators do not show major behavioral red flags, but should still be interpreted together with the score, classification, and role-readiness decision.");
  }

  paragraphs.push("Decision support note: Behavioral indicators do not replace the assessment score or supervisor judgment. They explain how the candidate engaged with the platform while completing the assessment. Current classification: " + safeText(classification, "Not classified") + "; current score: " + formatPercentage(overallScore) + ".");

  return {
    data: b,
    paragraphs,
    flags,
    paceLabel: b.averageTime > 0 && b.averageTime < 2 ? "Very Fast" : b.averageTime <= 8 ? "Fast" : b.averageTime <= 45 ? "Measured" : "Slow",
    stabilityLabel: b.totalChanges === 0 ? "Very Stable" : b.averageChanges <= 0.05 ? "Stable" : b.averageChanges <= 0.2 ? "Moderate Review" : "High Revision",
    focusLabel: flags.length > 0 ? "Review Required" : "No Major Concern"
  };
}

function ProgressBar({ value, color }) {
  const v = Math.max(0, Math.min(100, safeNumber(value, 0)));
  return <div style={styles.progressTrack}><div style={{ width: v + "%", height: "100%", borderRadius: 999, background: color || getToneColor(v) }} /></div>;
}

function MetricCard({ label, value, note, icon, background, color }) {
  return (
    <div style={styles.metricCard}>
      <div style={{ ...styles.metricIcon, background: background || "#eef4ff", color: color || "#3538cd" }}>{icon}</div>
      <div>
        <p style={styles.metricCardLabel}>{label}</p>
        <p style={styles.metricCardValue}>{value}</p>
        {note ? <p style={styles.metricCardNote}>{note}</p> : null}
      </div>
    </div>
  );
}

function SectionShell({ title, eyebrow, badge, badgeStyle, highlight, children }) {
  return (
    <section style={highlight ? styles.sectionShellHighlight : styles.sectionShell}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.sectionEyebrow}>{eyebrow || "Report Section"}</p>
          <h2 style={styles.sectionTitle}>{title}</h2>
        </div>
        {badge ? <span style={badgeStyle || styles.badgeNeutral}>{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, message, icon }) {
  return <div style={styles.emptyState}><div style={styles.emptyIcon}>{icon || "✓"}</div><p style={styles.emptyTitle}>{title}</p><p style={styles.emptyText}>{message}</p></div>;
}

export default function SupervisorUserReportPage() {
  const router = useRouter();
  const userId = router.query.user_id;
  const assessmentId = router.query.assessment || router.query.assessment_id;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedRows, setExpandedRows] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    if (!router.isReady || !userId) return;
    let mounted = true;

    async function loadReport() {
      setLoading(true);
      setErrorMessage("");
      setCandidate(null);
      setAssessment(null);
      setReport(null);
      setPdfError("");

      try {
        const response = await fetch(buildReportUrl(userId, assessmentId));
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          data = null;
        }

        if (!mounted) return;

        if (!response.ok) {
          setErrorMessage(data && data.error ? data.error : "Request failed with status " + response.status);
          setLoading(false);
          return;
        }

        const cleanData = safeObject(data);
        const loadedCandidate = cleanData.candidate || cleanData.user || cleanData.profile || cleanData.candidateProfile || cleanData.candidate_profile || null;
        const loadedAssessment = cleanData.assessment || null;
        const loadedReport = cleanData.generatedReport || cleanData.generated_report || cleanData.report || cleanData.assessmentReport || cleanData.assessment_report || cleanData.result || cleanData;

        setCandidate(decodeDeep(loadedCandidate));
        setAssessment(decodeDeep(loadedAssessment));
        setReport(decodeDeep(loadedReport));
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(error && error.message ? error.message : "Something went wrong while loading the report.");
        setLoading(false);
      }
    }

    loadReport();
    return () => {
      mounted = false;
    };
  }, [router.isReady, userId, assessmentId]);

  const cleanReport = safeObject(decodeDeep(report));
  const categoryScores = safeArray(decodeDeep(getCategoryScores(cleanReport)));
  const strengths = safeArray(decodeDeep(getStrengths(cleanReport)));
  const developmentAreas = safeArray(decodeDeep(getDevelopmentAreas(cleanReport)));
  const recommendations = safeArray(decodeDeep(getRecommendations(cleanReport)));
  const followUpQuestions = safeArray(decodeDeep(getFollowUpQuestions(cleanReport)));
  const behavioralInsights = decodeDeep(getBehavioralInsights(cleanReport));

  const candidateName = getCandidateName(candidate, cleanReport);
  const assessmentName = getAssessmentName(assessment, cleanReport);
  const effectiveAssessmentId = getAssessmentId(assessment, cleanReport, assessmentId);
  const overallScore = getOverallScore(cleanReport);
  const classification = getClassification(cleanReport);
  const riskLevel = getRiskLevel(cleanReport);
  const responseCount = getResponseCount(cleanReport);
  const roleReadiness = getRoleReadiness(cleanReport);
  const scoreColor = getToneColor(overallScore);
  const scoreGradient = getToneGradient(overallScore);
  const behavioralNarrative = buildBehavioralNarrative(behavioralInsights, responseCount, overallScore, classification);

  const tabs = useMemo(() => [
    { key: "overview", label: "Overview", icon: "◈" },
    { key: "categories", label: "Categories", icon: "▦", count: categoryScores.length },
    { key: "strengths", label: "Strengths", icon: "★", count: strengths.length },
    { key: "development", label: "Development", icon: "△", count: developmentAreas.length },
    { key: "questions", label: "Questions", icon: "?", count: followUpQuestions.length },
    { key: "recommendations", label: "Recommendations", icon: "✓", count: recommendations.length }
  ], [categoryScores.length, strengths.length, developmentAreas.length, followUpQuestions.length, recommendations.length]);

  function toggleRow(key) {
    setExpandedRows((previous) => ({ ...previous, [key]: !previous[key] }));
  }

  async function downloadPdfReport() {
    if (!userId || !effectiveAssessmentId) {
      setPdfError("Cannot generate PDF because candidate ID or assessment ID is missing.");
      return;
    }

    setPdfLoading(true);
    setPdfError("");

    try {
      const response = await fetch("/api/generate-pdf-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assessmentId: effectiveAssessmentId })
      });

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = null;
        }
        setPdfError(errorData && errorData.message ? errorData.message : errorData && errorData.error ? errorData.error : "PDF generation failed. Please try again.");
        setPdfLoading(false);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = safeText(candidateName || "Candidate", "Candidate").replace(/[^a-zA-Z0-9_-]+/g, "_");
      link.href = downloadUrl;
      link.download = fileName + "_supervisor_report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setPdfLoading(false);
    } catch (error) {
      setPdfError(error && error.message ? error.message : "PDF generation failed. Please try again.");
      setPdfLoading(false);
    }
  }

  function renderBehavioralInsightsSection() {
    if (!behavioralInsights) return null;
    const b = behavioralNarrative.data;
    const showMetrics = b.totalTime > 0 || b.averageTime > 0 || b.totalChanges > 0 || b.averageChanges > 0;

    return (
      <SectionShell title="Behavioral Insights" eyebrow="Response behavior" badge={behavioralNarrative.focusLabel} badgeStyle={behavioralNarrative.flags.length > 0 ? styles.badgeWarm : styles.badgeNeutral}>
        {showMetrics ? (
          <div style={styles.miniMetrics}>
            <MetricCard label="Average Time" value={round(b.averageTime, 2) + "s"} icon="⏱" background="#ecfeff" color="#0e7490" />
            <MetricCard label="Average Changes" value={round(b.averageChanges, 2)} icon="↺" background="#f5f3ff" color="#6d28d9" />
            <MetricCard label="Total Changes" value={b.totalChanges} icon="✦" background="#fff7ed" color="#c2410c" />
            <MetricCard label="Behavioral Pace" value={behavioralNarrative.paceLabel} icon="➤" background="#eef4ff" color="#3538cd" />
            <MetricCard label="Answer Stability" value={behavioralNarrative.stabilityLabel} icon="◆" background="#ecfdf3" color="#027a48" />
            <MetricCard label="Violations" value={b.violations} icon="!" background="#fef3f2" color="#b42318" />
          </div>
        ) : null}

        <div style={styles.behaviorNarrativeBox}>
          <p style={styles.behaviorNarrativeTitle}>Supervisor Behavioral Narrative</p>
          {behavioralNarrative.paragraphs.map((paragraph, index) => (
            <p key={index} style={styles.bodyText}>{paragraph}</p>
          ))}
        </div>

        {behavioralNarrative.flags.length > 0 ? (
          <div style={styles.behaviorFlagBox}>
            <p style={styles.behaviorNarrativeTitle}>Items for Supervisor Review</p>
            <ul style={styles.behaviorList}>
              {behavioralNarrative.flags.map((flag, index) => <li key={index} style={styles.behaviorListItem}>{flag}</li>)}
            </ul>
          </div>
        ) : null}
      </SectionShell>
    );
  }

  function renderOverview() {
    return (
      <React.Fragment>
        <div style={styles.summaryGrid}>
          <SectionShell title="Executive Summary" eyebrow="Overall interpretation" badge="Summary">
            <p style={styles.bodyText}>{safeText(cleanReport.executiveSummary || cleanReport.executive_summary || cleanReport.summary || cleanReport.overallAssessment || cleanReport.overall_assessment || cleanReport.interpretation, "No executive summary is available yet.")}</p>
          </SectionShell>
          <SectionShell title="Supervisor Implication" eyebrow="Management meaning" badge="Supervisor">
            <p style={styles.bodyText}>{safeText(cleanReport.supervisorImplication || cleanReport.supervisor_implication || cleanReport.recommendationSummary || cleanReport.recommendation_summary, "No supervisor implication is available yet.")}</p>
          </SectionShell>
        </div>

        <SectionShell title="Role Readiness" eyebrow="Readiness decision" badge="Readiness" badgeStyle={styles.badgeWarm} highlight={true}>
          <p style={styles.bodyTextLarge}>{roleReadiness}</p>
        </SectionShell>

        {renderBehavioralInsightsSection()}
      </React.Fragment>
    );
  }

  function renderCategories() {
    if (categoryScores.length === 0) return <EmptyState title="No category scores found" message="No category or competency scores were found in the generated report." icon="▦" />;

    return (
      <SectionShell title="Category / Competency Scores" eyebrow="Expandable performance breakdown" badge={categoryScores.length}>
        <div style={styles.categoryDeck}>
          {categoryScores.map((item, index) => {
            const row = safeObject(decodeDeep(item));
            const rowTitle = getRowTitle(row);
            const rowPercentage = getRowPercentage(row);
            const color = getToneColor(rowPercentage);
            const key = "category-" + index;
            const isOpen = !!expandedRows[key];
            return (
              <article key={key} style={styles.categoryCard}>
                <button type="button" style={styles.categoryButton} onClick={() => toggleRow(key)}>
                  <div style={styles.categoryLeft}>
                    <div style={{ ...styles.categoryIcon, background: getToneGradient(rowPercentage) }}>{index + 1}</div>
                    <div>
                      <h3 style={styles.categoryTitle}>{rowTitle}</h3>
                      <p style={styles.categoryMeta}>{safeNumber(row.questionCount || row.question_count, 0)} question(s)</p>
                    </div>
                  </div>
                  <div style={styles.categoryRight}>
                    <strong style={{ ...styles.categoryScore, color }}>{formatPercentage(rowPercentage)}</strong>
                    <span style={getBadgeStyle(row.riskLevel || row.risk_level)}>{safeText(row.riskLevel || row.risk_level, "N/A")}</span>
                    <span style={styles.chevron}>{isOpen ? "−" : "+"}</span>
                  </div>
                </button>
                <div style={styles.categoryProgressWrap}><ProgressBar value={rowPercentage} color={color} /></div>
                {isOpen ? (
                  <div style={styles.categoryDetails}>
                    <p style={styles.bodyText}>{getRowNarrative(row)}</p>
                    {(row.action || row.suggestedAction || row.suggested_action) ? <p style={styles.actionText}><strong>Action:</strong> {safeText(row.action || row.suggestedAction || row.suggested_action, "")}</p> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  function renderInsightCards(items, type) {
    const isStrength = type === "strength";
    if (items.length === 0) {
      return <EmptyState title={isStrength ? "No strengths available" : "No priority development areas detected"} message={isStrength ? "No strengths have been identified for this candidate yet." : "The candidate scored above the development threshold across all measured areas."} icon={isStrength ? "★" : "✓"} />;
    }

    return (
      <SectionShell title={isStrength ? "Top Strengths" : "Development Areas"} eyebrow={isStrength ? "Leverage areas" : "Priority improvement areas"} badge={items.length} badgeStyle={isStrength ? styles.badgeGood : styles.badgeWarm}>
        <div style={styles.cardGrid}>
          {items.map((item, index) => {
            const row = safeObject(decodeDeep(item));
            const score = getRowPercentage(row);
            return (
              <article key={index} style={isStrength ? styles.insightCard : styles.developmentCard}>
                <div style={styles.insightTop}><span style={isStrength ? styles.strengthIcon : styles.developmentIcon}>{isStrength ? "★" : "△"}</span><strong style={{ ...styles.insightScore, color: getToneColor(score) }}>{formatPercentage(score)}</strong></div>
                <h3 style={styles.insightTitle}>{getRowTitle(row)}</h3>
                <ProgressBar value={score} color={getToneColor(score)} />
                <p style={styles.insightText}>{getRowNarrative(row)}</p>
              </article>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  function renderQuestions() {
    if (followUpQuestions.length === 0) return <EmptyState title="No follow-up questions generated" message="There are no supervisor follow-up questions available for this report." icon="?" />;

    return (
      <SectionShell title="Supervisor Follow-up Questions" eyebrow="Interview and validation prompts" badge={followUpQuestions.length}>
        <div style={styles.questionGridModern}>
          {followUpQuestions.map((item, index) => {
            const row = safeObject(decodeDeep(item));
            return (
              <article key={index} style={styles.questionCardModern}>
                <div style={styles.questionHeader}><span style={styles.questionNumber}>{index + 1}</span><span style={styles.badgeNeutral}>{safeText(row.priority, "Medium")}</span></div>
                <h3 style={styles.insightTitle}>{safeText(row.category || row.competency || row.area, "Follow-up Area")}</h3>
                <p style={styles.bodyText}>{safeText(row.question || row.prompt, "No question text available.")}</p>
              </article>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  function renderRecommendations() {
    if (recommendations.length === 0) return <EmptyState title="No recommendations generated" message="No recommendations have been generated yet." icon="✓" />;

    return (
      <SectionShell title="Recommendations" eyebrow={developmentAreas.length === 0 ? "Leverage plan" : "Action plan"} badge={recommendations.length}>
        <div style={styles.recommendationTimeline}>
          {recommendations.map((item, index) => {
            const row = safeObject(decodeDeep(item));
            return (
              <article key={index} style={styles.recommendationModern}>
                <div style={styles.timelineDot}>{index + 1}</div>
                <div style={styles.recommendationContent}>
                  <div style={styles.recommendationHeader}><h3 style={styles.recommendationTitle}>{safeText(row.competency || row.category || row.title, "Recommendation")}</h3><span style={getBadgeStyle(row.priority)}>{safeText(row.priority, "Medium")}</span></div>
                  <p style={styles.bodyText}>{safeText(row.recommendation || row.description, "No recommendation text available.")}</p>
                  {row.action ? <p style={styles.actionText}><strong>Action:</strong> {safeText(row.action, "")}</p> : null}
                  {row.impact ? <p style={styles.mutedText}><strong>Impact:</strong> {safeText(row.impact, "")}</p> : null}
                  {row.followUpQuestion || row.follow_up_question ? <p style={styles.mutedText}><strong>Follow-up:</strong> {safeText(row.followUpQuestion || row.follow_up_question, "")}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  function renderActiveTab() {
    if (activeTab === "categories") return renderCategories();
    if (activeTab === "strengths") return renderInsightCards(strengths, "strength");
    if (activeTab === "development") return renderInsightCards(developmentAreas, "development");
    if (activeTab === "questions") return renderQuestions();
    if (activeTab === "recommendations") return renderRecommendations();
    return renderOverview();
  }

  return (
    <div style={styles.page}>
      <div style={styles.backgroundBlobOne} />
      <div style={styles.backgroundBlobTwo} />
      <div style={styles.container}>
        <header style={{ ...styles.hero, background: scoreGradient }}>
          <div style={styles.heroContent}>
            <div style={styles.heroTextBlock}>
              <div style={styles.heroBadge}>Supervisor Assessment Report</div>
              <h1 style={styles.heroTitle}>{candidateName}</h1>
              <p style={styles.heroSubtitle}>Assessment: {assessmentName}</p>
              <p style={styles.heroMeta}>Candidate ID: {safeText(userId, "Not available")}</p>
              <p style={styles.heroMeta}>Assessment ID: {safeText(effectiveAssessmentId, "Not available")}</p>
            </div>

            <div style={styles.scorePanel}>
              <p style={styles.scorePanelLabel}>Overall Score</p>
              <p style={{ ...styles.scorePanelValue, color: scoreColor }}>{formatPercentage(overallScore)}</p>
              <ProgressBar value={overallScore} color={scoreColor} />
              <div style={styles.scorePanelFooter}>
                <span style={styles.classificationBadge}>{classification}</span>
                <span style={styles.classificationBadge}>{getToneLabel(overallScore)}</span>
                <span style={getBadgeStyle(riskLevel)}>{riskLevel}</span>
              </div>
              <p style={styles.scorePanelMeta}>Responses: {safeNumber(responseCount, 0)}</p>
              <button type="button" style={pdfLoading ? styles.buttonDisabled : styles.downloadButton} onClick={downloadPdfReport} disabled={pdfLoading || loading}>{pdfLoading ? "Generating PDF..." : "Download PDF"}</button>
              {pdfError ? <p style={styles.pdfError}>{pdfError}</p> : null}
            </div>
          </div>
        </header>

        <div style={styles.metricStrip}>
          <MetricCard label="Categories" value={categoryScores.length} note="Measured areas" icon="▦" background="#eef4ff" color="#3538cd" />
          <MetricCard label="Strengths" value={strengths.length} note="Leverage areas" icon="★" background="#ecfdf3" color="#027a48" />
          <MetricCard label="Development" value={developmentAreas.length} note="Priority areas" icon="△" background="#fff7ed" color="#c2410c" />
          <MetricCard label="Questions" value={followUpQuestions.length} note="Supervisor prompts" icon="?" background="#f5f3ff" color="#6d28d9" />
        </div>

        {loading ? (
          <SectionShell title="Loading report" eyebrow="Please wait">
            <div style={styles.loadingBar}><div style={styles.loadingPulse} /></div>
            <p style={styles.bodyText}>Loading supervisor report...</p>
          </SectionShell>
        ) : null}

        {!loading && errorMessage ? (
          <section style={styles.errorCard}>
            <h2 style={styles.sectionTitle}>Report not loaded</h2>
            <p style={styles.errorText}>{errorMessage}</p>
            <p style={styles.mutedText}>The supervisor page loaded, but the report API did not return report data.</p>
          </section>
        ) : null}

        {!loading && !errorMessage ? (
          <React.Fragment>
            <nav style={styles.tabBar}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button key={tab.key} type="button" style={isActive ? styles.tabActive : styles.tabButton} onClick={() => setActiveTab(tab.key)}>
                    <span style={styles.tabIcon}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined ? <span style={isActive ? styles.tabCountActive : styles.tabCount}>{tab.count}</span> : null}
                  </button>
                );
              })}
            </nav>
            <div style={styles.tabContent}>{renderActiveTab()}</div>
          </React.Fragment>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f3f6fb", padding: "28px 16px 48px", color: "#172033", position: "relative", overflow: "hidden", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
  backgroundBlobOne: { position: "absolute", width: "420px", height: "420px", borderRadius: "999px", background: "rgba(20, 184, 166, 0.18)", top: "-160px", right: "-120px", filter: "blur(10px)" },
  backgroundBlobTwo: { position: "absolute", width: "360px", height: "360px", borderRadius: "999px", background: "rgba(79, 70, 229, 0.12)", bottom: "-160px", left: "-120px", filter: "blur(12px)" },
  container: { maxWidth: "1220px", margin: "0 auto", position: "relative", zIndex: 1 },
  hero: { borderRadius: "30px", padding: "30px", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)", marginBottom: "20px", color: "#ffffff" },
  heroContent: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 310px", gap: "24px", alignItems: "stretch" },
  heroTextBlock: { display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "230px" },
  heroBadge: { display: "inline-flex", width: "fit-content", padding: "7px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.18)", color: "#ffffff", fontWeight: 800, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" },
  heroTitle: { margin: 0, fontSize: "44px", lineHeight: 1.1, color: "#ffffff", textShadow: "0 2px 18px rgba(0,0,0,0.15)" },
  heroSubtitle: { margin: "14px 0 0", fontSize: "17px", color: "rgba(255,255,255,0.9)" },
  heroMeta: { margin: "8px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.78)", overflowWrap: "anywhere" },
  scorePanel: { background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.55)", borderRadius: "24px", padding: "22px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)", color: "#172033" },
  scorePanelLabel: { margin: 0, color: "#667085", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" },
  scorePanelValue: { margin: "10px 0 10px", fontSize: "48px", lineHeight: 1, fontWeight: 900 },
  scorePanelFooter: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "14px" },
  scorePanelMeta: { margin: "12px 0 0", color: "#667085", fontSize: "13px" },
  classificationBadge: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#f2f4f7", color: "#344054", fontSize: "12px", fontWeight: 900 },
  downloadButton: { marginTop: "16px", width: "100%", border: 0, borderRadius: "14px", padding: "13px 14px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", fontWeight: 900, cursor: "pointer", fontSize: "14px", boxShadow: "0 12px 26px rgba(15, 118, 110, 0.28)" },
  buttonDisabled: { marginTop: "16px", width: "100%", border: 0, borderRadius: "14px", padding: "13px 14px", background: "#98a2b3", color: "#ffffff", fontWeight: 900, cursor: "not-allowed", fontSize: "14px" },
  pdfError: { margin: "10px 0 0", color: "#b42318", fontSize: "12px", lineHeight: 1.4 },
  progressTrack: { width: "100%", height: "10px", borderRadius: "999px", background: "#e4e7ec", overflow: "hidden" },
  metricStrip: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" },
  metricCard: { display: "flex", gap: "12px", alignItems: "center", background: "rgba(255,255,255,0.92)", border: "1px solid #eaecf0", borderRadius: "20px", padding: "16px", boxShadow: "0 14px 40px rgba(16, 24, 40, 0.06)" },
  metricIcon: { width: "42px", height: "42px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px" },
  metricCardLabel: { margin: 0, color: "#667085", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" },
  metricCardValue: { margin: "3px 0 0", color: "#101828", fontSize: "23px", fontWeight: 900 },
  metricCardNote: { margin: "2px 0 0", color: "#667085", fontSize: "12px" },
  tabBar: { display: "flex", gap: "10px", overflowX: "auto", padding: "10px", background: "rgba(255,255,255,0.78)", border: "1px solid #eaecf0", borderRadius: "22px", marginBottom: "18px", boxShadow: "0 14px 40px rgba(16, 24, 40, 0.06)", backdropFilter: "blur(8px)" },
  tabButton: { border: 0, borderRadius: "16px", padding: "11px 14px", background: "transparent", color: "#475467", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" },
  tabActive: { border: 0, borderRadius: "16px", padding: "11px 14px", background: "#101828", color: "#ffffff", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", boxShadow: "0 12px 24px rgba(16, 24, 40, 0.18)" },
  tabIcon: { fontWeight: 900 },
  tabCount: { minWidth: "24px", height: "22px", padding: "0 7px", borderRadius: "999px", background: "#eef4ff", color: "#3538cd", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  tabCountActive: { minWidth: "24px", height: "22px", padding: "0 7px", borderRadius: "999px", background: "rgba(255,255,255,0.18)", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  tabContent: { minHeight: "300px" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px" },
  sectionShell: { background: "rgba(255,255,255,0.95)", border: "1px solid #eaecf0", borderRadius: "24px", padding: "24px", boxShadow: "0 18px 48px rgba(16, 24, 40, 0.07)", marginBottom: "18px" },
  sectionShellHighlight: { background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)", border: "1px solid #fed7aa", borderRadius: "24px", padding: "24px", boxShadow: "0 18px 48px rgba(16, 24, 40, 0.07)", marginBottom: "18px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", marginBottom: "16px" },
  sectionEyebrow: { margin: "0 0 4px", color: "#667085", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" },
  sectionTitle: { margin: 0, fontSize: "22px", color: "#101828" },
  bodyText: { margin: "0 0 12px", color: "#344054", lineHeight: 1.7, fontSize: "15px" },
  bodyTextLarge: { margin: 0, color: "#344054", lineHeight: 1.75, fontSize: "16px" },
  mutedText: { margin: "8px 0 0", color: "#667085", lineHeight: 1.6, fontSize: "14px" },
  actionText: { margin: "10px 0 0", color: "#344054", lineHeight: 1.6, fontSize: "14px" },
  miniMetrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" },
  behaviorNarrativeBox: { background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #eaecf0", borderRadius: "18px", padding: "18px", marginTop: "10px" },
  behaviorFlagBox: { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "18px", padding: "18px", marginTop: "14px" },
  behaviorNarrativeTitle: { margin: "0 0 10px", color: "#101828", fontSize: "15px", fontWeight: 900 },
  behaviorList: { margin: 0, paddingLeft: "20px", color: "#344054", lineHeight: 1.7 },
  behaviorListItem: { marginBottom: "8px" },
  categoryDeck: { display: "grid", gap: "14px" },
  categoryCard: { background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "18px", overflow: "hidden", boxShadow: "0 10px 26px rgba(16, 24, 40, 0.05)" },
  categoryButton: { width: "100%", border: 0, background: "transparent", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", cursor: "pointer", textAlign: "left" },
  categoryLeft: { display: "flex", alignItems: "center", gap: "12px" },
  categoryIcon: { width: "42px", height: "42px", borderRadius: "14px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  categoryTitle: { margin: 0, fontSize: "16px", color: "#101828" },
  categoryMeta: { margin: "4px 0 0", color: "#667085", fontSize: "12px" },
  categoryRight: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" },
  categoryScore: { fontSize: "20px", fontWeight: 900 },
  chevron: { width: "30px", height: "30px", borderRadius: "999px", background: "#f2f4f7", color: "#344054", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px" },
  categoryProgressWrap: { padding: "0 16px 14px" },
  categoryDetails: { padding: "14px 16px 16px", borderTop: "1px solid #eaecf0" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" },
  insightCard: { background: "linear-gradient(135deg, #ffffff 0%, #ecfdf3 100%)", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "18px", boxShadow: "0 14px 34px rgba(16, 24, 40, 0.06)" },
  developmentCard: { background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)", border: "1px solid #fed7aa", borderRadius: "20px", padding: "18px", boxShadow: "0 14px 34px rgba(16, 24, 40, 0.06)" },
  insightTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" },
  strengthIcon: { width: "36px", height: "36px", borderRadius: "12px", background: "#dcfce7", color: "#027a48", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  developmentIcon: { width: "36px", height: "36px", borderRadius: "12px", background: "#ffedd5", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  insightScore: { fontSize: "22px", fontWeight: 900 },
  insightTitle: { margin: "0 0 10px", color: "#101828", fontSize: "17px" },
  insightText: { margin: "12px 0 0", color: "#475467", lineHeight: 1.6, fontSize: "14px" },
  questionGridModern: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
  questionCardModern: { background: "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)", border: "1px solid #ddd6fe", borderRadius: "20px", padding: "18px", boxShadow: "0 14px 34px rgba(16, 24, 40, 0.06)" },
  questionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  questionNumber: { width: "34px", height: "34px", borderRadius: "12px", background: "#ede9fe", color: "#6d28d9", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  recommendationTimeline: { display: "grid", gap: "16px" },
  recommendationModern: { display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: "14px" },
  timelineDot: { width: "38px", height: "38px", borderRadius: "14px", background: "#101828", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  recommendationContent: { background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "18px", padding: "16px", boxShadow: "0 10px 28px rgba(16, 24, 40, 0.05)" },
  recommendationHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "10px" },
  recommendationTitle: { margin: 0, fontSize: "17px", color: "#101828" },
  emptyState: { background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: "24px", padding: "34px", textAlign: "center", boxShadow: "0 14px 34px rgba(16, 24, 40, 0.04)" },
  emptyIcon: { width: "54px", height: "54px", margin: "0 auto 12px", borderRadius: "18px", background: "#ecfdf3", color: "#027a48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900 },
  emptyTitle: { margin: 0, color: "#101828", fontSize: "18px", fontWeight: 900 },
  emptyText: { margin: "8px auto 0", maxWidth: "540px", color: "#667085", lineHeight: 1.6 },
  loadingBar: { height: "10px", borderRadius: "999px", overflow: "hidden", background: "#e4e7ec", marginBottom: "14px" },
  loadingPulse: { height: "100%", width: "45%", borderRadius: "999px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)" },
  errorCard: { background: "#fff5f5", borderRadius: "24px", padding: "24px", border: "1px solid #fecaca", marginBottom: "18px" },
  errorText: { margin: "10px 0", color: "#b42318", fontWeight: 900 },
  badgeNeutral: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", padding: "7px 11px", background: "#eef4ff", color: "#3538cd", fontWeight: 900, fontSize: "12px" },
  badgeWarm: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", padding: "7px 11px", background: "#fff7ed", color: "#c2410c", fontWeight: 900, fontSize: "12px" },
  badgeGood: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", padding: "7px 11px", background: "#ecfdf3", color: "#027a48", fontWeight: 900, fontSize: "12px" },
  badgeCritical: { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", padding: "7px 11px", background: "#fef3f2", color: "#b42318", fontWeight: 900, fontSize: "12px" }
};
