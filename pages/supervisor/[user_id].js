// pages/supervisor/[user_id].js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

// ======================================================
// SAFE HELPERS
// ======================================================

function decodeHtmlEntities(value) {
  var text;
  var previousText;
  var i;

  if (value === null || value === undefined) return value;

  text = String(value);

  for (i = 0; i < 10; i += 1) {
    previousText = text;
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#039;/g, "'");
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, " ");
    if (text === previousText) break;
  }

  return text;
}

function decodeObjectDeep(value) {
  var output;
  var keys;
  var i;

  if (typeof value === "string") return decodeHtmlEntities(value);

  if (Array.isArray(value)) {
    return value.map(function (item) {
      return decodeObjectDeep(item);
    });
  }

  if (value && typeof value === "object") {
    output = {};
    keys = Object.keys(value);
    for (i = 0; i < keys.length; i += 1) {
      output[keys[i]] = decodeObjectDeep(value[keys[i]]);
    }
    return output;
  }

  return value;
}

function safeObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "Not available";
  return decodeHtmlEntities(value);
}

function safeNumber(value, fallback) {
  var defaultValue = fallback === undefined ? 0 : fallback;
  var number = Number(value);
  if (Number.isNaN(number) || !Number.isFinite(number)) return defaultValue;
  return number;
}

function clampPercentage(value) {
  var number = safeNumber(value, 0);
  if (number < 0) return 0;
  if (number > 100) return 100;
  return number;
}

function formatPercentage(value) {
  return safeNumber(value, 0) + "%";
}

// ======================================================
// VISUAL HELPERS
// ======================================================

function getScoreTone(score) {
  var value = safeNumber(score, 0);
  if (value >= 85) return "excellent";
  if (value >= 75) return "strong";
  if (value >= 65) return "capable";
  if (value >= 55) return "developing";
  if (value >= 40) return "risk";
  return "critical";
}

function getToneLabel(score) {
  var tone = getScoreTone(score);
  if (tone === "excellent") return "Excellent";
  if (tone === "strong") return "Strong";
  if (tone === "capable") return "Capable";
  if (tone === "developing") return "Developing";
  if (tone === "risk") return "At Risk";
  return "Critical";
}

function getToneColor(score) {
  var tone = getScoreTone(score);
  if (tone === "excellent") return "#0f766e";
  if (tone === "strong") return "#2563eb";
  if (tone === "capable") return "#4f46e5";
  if (tone === "developing") return "#d97706";
  if (tone === "risk") return "#ea580c";
  return "#b42318";
}

function getToneGradient(score) {
  var tone = getScoreTone(score);
  if (tone === "excellent") return "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)";
  if (tone === "strong") return "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)";
  if (tone === "capable") return "linear-gradient(135deg, #4338ca 0%, #8b5cf6 100%)";
  if (tone === "developing") return "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)";
  if (tone === "risk") return "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)";
  return "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)";
}

function getRiskStyle(value) {
  var risk = safeText(value, "").toLowerCase();
  if (risk === "low") return styles.badgeLow;
  if (risk === "moderate") return styles.badgeModerate;
  if (risk === "elevated") return styles.badgeElevated;
  if (risk === "high") return styles.badgeHigh;
  if (risk === "critical") return styles.badgeCritical;
  return styles.badgeNeutral;
}

function getPriorityStyle(priority) {
  var value = safeText(priority, "Medium").toLowerCase();
  if (value === "critical") return styles.priorityCritical;
  if (value === "high") return styles.priorityHigh;
  if (value === "leverage") return styles.priorityLeverage;
  if (value === "low") return styles.priorityLow;
  return styles.priorityMedium;
}

// ======================================================
// REPORT DATA HELPERS
// ======================================================

function buildReportUrl(userId, assessmentId) {
  var url = "/api/supervisor/report?user_id=" + encodeURIComponent(userId);
  if (assessmentId) url += "&assessment_id=" + encodeURIComponent(assessmentId);
  return url;
}

function getCandidateName(candidate, report) {
  var c = safeObject(candidate);
  var r = safeObject(report);
  return safeText(c.full_name || c.name || c.display_name || c.email || c.candidate_name || r.candidateName || r.candidate_name || "Candidate", "Candidate");
}

function getAssessmentName(assessment, report) {
  var a = safeObject(assessment);
  var r = safeObject(report);
  return safeText(a.title || a.name || a.assessment_name || r.assessmentName || r.assessment_name || "Assessment", "Assessment");
}

function getAssessmentIdFromData(assessment, report, fallback) {
  var a = safeObject(assessment);
  var r = safeObject(report);
  return a.id || a.assessment_id || r.assessmentId || r.assessment_id || fallback || "";
}

function getOverallScore(report) {
  var r = safeObject(report);
  return r.percentage || r.overallPercentage || r.overall_score || r.overallScore || r.totalPercentage || r.score || 0;
}

function getClassification(report) {
  var r = safeObject(report);
  return safeText(r.classification || r.overallClassification || r.performanceBand || r.performance_band || r.label || "Not classified", "Not classified");
}

function getRiskLevel(report) {
  var r = safeObject(report);
  return safeText(r.riskLevel || r.risk_level || "Not available", "Not available");
}

function getResponseCount(report) {
  var r = safeObject(report);
  return r.responseCount || r.response_count || r.totalResponses || r.total_responses || 0;
}

function getCategoryScores(report) {
  var r = safeObject(report);
  if (Array.isArray(r.categoryScores)) return r.categoryScores;
  if (Array.isArray(r.category_scores)) return r.category_scores;
  if (Array.isArray(r.competencyScores)) return r.competencyScores;
  if (Array.isArray(r.competency_scores)) return r.competency_scores;
  if (r.competencyScores && typeof r.competencyScores === "object") return Object.values(r.competencyScores);
  if (r.competency_scores && typeof r.competency_scores === "object") return Object.values(r.competency_scores);
  return [];
}

function getStrengths(report) {
  var r = safeObject(report);
  if (Array.isArray(r.strengths)) return r.strengths;
  if (Array.isArray(r.topStrengths)) return r.topStrengths;
  if (Array.isArray(r.top_strengths)) return r.top_strengths;
  return [];
}

function getDevelopmentAreas(report) {
  var r = safeObject(report);
  if (Array.isArray(r.developmentAreas)) return r.developmentAreas;
  if (Array.isArray(r.development_areas)) return r.development_areas;
  if (Array.isArray(r.topDevelopmentNeeds)) return r.topDevelopmentNeeds;
  if (Array.isArray(r.top_development_needs)) return r.top_development_needs;
  return [];
}

function getRecommendations(report) {
  var r = safeObject(report);
  if (Array.isArray(r.recommendations)) return r.recommendations;
  if (Array.isArray(r.actionPlan)) return r.actionPlan;
  if (Array.isArray(r.action_plan)) return r.action_plan;
  return [];
}

function getFollowUpQuestions(report) {
  var r = safeObject(report);
  if (Array.isArray(r.followUpQuestions)) return r.followUpQuestions;
  if (Array.isArray(r.follow_up_questions)) return r.follow_up_questions;
  if (Array.isArray(r.supervisorQuestions)) return r.supervisorQuestions;
  if (Array.isArray(r.supervisor_questions)) return r.supervisor_questions;
  return [];
}

function getBehavioralInsights(report) {
  var r = safeObject(report);
  return r.behavioralInsights || r.behavioral_insights || r.behavioralSummary || r.behavioral_summary || null;
}

function getRoleReadiness(report) {
  var r = safeObject(report);
  return safeText(r.roleReadiness || r.role_readiness || r.readinessStatement || r.readiness_statement || r.roleReadinessStatement || r.role_readiness_statement || "No role readiness statement is available yet.", "No role readiness statement is available yet.");
}

function getRowTitle(row) {
  var item = safeObject(row);
  return safeText(item.category || item.name || item.competency || item.title, "General");
}

function getRowPercentage(row) {
  var item = safeObject(row);
  return item.percentage || item.score || item.currentScore || item.current_score || 0;
}

function getRowNarrative(row) {
  var item = safeObject(row);
  return safeText(item.narrative || item.supervisorMeaning || item.supervisor_meaning || item.supervisorImplication || item.supervisor_implication || item.comment || item.performanceComment || item.performance_comment || item.recommendation || item.description, "No interpretation available.");
}

function getRowAction(row) {
  var item = safeObject(row);
  return safeText(item.action || item.suggestedAction || item.suggested_action || "", "");
}

function shouldShowBehavioralMetrics(behavioralInsights) {
  var item = safeObject(behavioralInsights);
  var quality = safeText(item.dataQuality || item.data_quality || "", "").toLowerCase();
  var totalTime = safeNumber(item.totalTimeSpent || item.total_time_spent, 0);
  if (quality === "limited") return false;
  if (totalTime <= 0) return false;
  return true;
}

function getTabCount(tab, data) {
  if (tab === "overview") return "";
  if (tab === "categories") return data.categoryScores.length;
  if (tab === "strengths") return data.strengths.length;
  if (tab === "development") return data.developmentAreas.length;
  if (tab === "questions") return data.followUpQuestions.length;
  if (tab === "recommendations") return data.recommendations.length;
  return "";
}

// ======================================================
// UI COMPONENTS
// ======================================================

function ProgressBar(props) {
  var value = clampPercentage(props.value);
  var color = props.color || getToneColor(value);
  return (
    <div style={styles.progressTrack}>
      <div style={{ width: value + "%", height: "100%", borderRadius: "999px", background: color, transition: "width 0.45s ease" }} />
    </div>
  );
}

function MetricCard(props) {
  return (
    <div style={styles.metricCard}>
      <div style={{ ...styles.metricIcon, background: props.background || "#eef4ff", color: props.color || "#3538cd" }}>{props.icon}</div>
      <div>
        <p style={styles.metricCardLabel}>{safeText(props.label, "Metric")}</p>
        <p style={styles.metricCardValue}>{props.value}</p>
        {props.note && <p style={styles.metricCardNote}>{safeText(props.note, "")}</p>}
      </div>
    </div>
  );
}

function SectionShell(props) {
  return (
    <section style={props.highlight ? styles.sectionShellHighlight : styles.sectionShell}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.sectionEyebrow}>{safeText(props.eyebrow || "Report Section", "Report Section")}</p>
          <h2 style={styles.sectionTitle}>{safeText(props.title, "Section")}</h2>
        </div>
        {props.badge !== undefined && props.badge !== null && props.badge !== "" && <span style={props.badgeStyle || styles.badgeNeutral}>{props.badge}</span>}
      </div>
      {props.children}
    </section>
  );
}

function EmptyState(props) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{props.icon || "✓"}</div>
      <p style={styles.emptyTitle}>{safeText(props.title, "Nothing to show")}</p>
      <p style={styles.emptyText}>{safeText(props.message, "No information is available for this section.")}</p>
    </div>
  );
}

// ======================================================
// PAGE COMPONENT
// ======================================================

export default function SupervisorUserReportPage() {
  var router = useRouter();
  var userId = router.query.user_id;
  var assessmentId = router.query.assessment || router.query.assessment_id;

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var errorState = useState("");
  var errorMessage = errorState[0];
  var setErrorMessage = errorState[1];

  var candidateState = useState(null);
  var candidate = candidateState[0];
  var setCandidate = candidateState[1];

  var assessmentState = useState(null);
  var assessment = assessmentState[0];
  var setAssessment = assessmentState[1];

  var reportState = useState(null);
  var report = reportState[0];
  var setReport = reportState[1];

  var activeTabState = useState("overview");
  var activeTab = activeTabState[0];
  var setActiveTab = activeTabState[1];

  var expandedState = useState({});
  var expandedRows = expandedState[0];
  var setExpandedRows = expandedState[1];

  var pdfLoadingState = useState(false);
  var pdfLoading = pdfLoadingState[0];
  var setPdfLoading = pdfLoadingState[1];

  var pdfErrorState = useState("");
  var pdfError = pdfErrorState[0];
  var setPdfError = pdfErrorState[1];

  useEffect(function () {
    if (!router.isReady) return;
    if (!userId) return;

    var mounted = true;

    async function loadReport() {
      var url;
      var response;
      var data;
      var cleanData;
      var loadedCandidate;
      var loadedAssessment;
      var loadedReport;
      var errorText;

      setLoading(true);
      setErrorMessage("");
      setCandidate(null);
      setAssessment(null);
      setReport(null);
      setPdfError("");

      try {
        url = buildReportUrl(userId, assessmentId);
        response = await fetch(url);
        data = null;

        try {
          data = await response.json();
        } catch (jsonError) {
          data = null;
        }

        if (!mounted) return;

        if (!response.ok) {
          errorText = data && data.error ? data.error : "Request failed with status " + response.status;
          setErrorMessage(errorText);
          setLoading(false);
          return;
        }

        cleanData = safeObject(data);
        loadedCandidate = cleanData.candidate || cleanData.user || cleanData.profile || cleanData.candidateProfile || cleanData.candidate_profile || null;
        loadedAssessment = cleanData.assessment || null;
        loadedReport = cleanData.generatedReport || cleanData.generated_report || cleanData.report || cleanData.assessmentReport || cleanData.assessment_report || cleanData.result || cleanData;

        setCandidate(decodeObjectDeep(loadedCandidate));
        setAssessment(decodeObjectDeep(loadedAssessment));
        setReport(decodeObjectDeep(loadedReport));
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(error && error.message ? error.message : "Something went wrong while loading the report.");
        setLoading(false);
      }
    }

    loadReport();

    return function () {
      mounted = false;
    };
  }, [router.isReady, userId, assessmentId]);

  var cleanReport = safeObject(decodeObjectDeep(report));
  var categoryScores = safeArray(decodeObjectDeep(getCategoryScores(cleanReport)));
  var strengths = safeArray(decodeObjectDeep(getStrengths(cleanReport)));
  var developmentAreas = safeArray(decodeObjectDeep(getDevelopmentAreas(cleanReport)));
  var recommendations = safeArray(decodeObjectDeep(getRecommendations(cleanReport)));
  var followUpQuestions = safeArray(decodeObjectDeep(getFollowUpQuestions(cleanReport)));
  var behavioralInsights = decodeObjectDeep(getBehavioralInsights(cleanReport));

  var roleReadiness = getRoleReadiness(cleanReport);
  var candidateName = getCandidateName(candidate, cleanReport);
  var assessmentName = getAssessmentName(assessment, cleanReport);
  var effectiveAssessmentId = getAssessmentIdFromData(assessment, cleanReport, assessmentId);
  var overallScore = getOverallScore(cleanReport);
  var classification = getClassification(cleanReport);
  var riskLevel = getRiskLevel(cleanReport);
  var responseCount = getResponseCount(cleanReport);
  var scoreColor = getToneColor(overallScore);
  var scoreGradient = getToneGradient(overallScore);
  var scoreToneLabel = getToneLabel(overallScore);
  var showBehavioralMetrics = shouldShowBehavioralMetrics(behavioralInsights);

  var tabs = useMemo(function () {
    return [
      { key: "overview", label: "Overview", icon: "◈" },
      { key: "categories", label: "Categories", icon: "▦" },
      { key: "strengths", label: "Strengths", icon: "★" },
      { key: "development", label: "Development", icon: "△" },
      { key: "questions", label: "Questions", icon: "?" },
      { key: "recommendations", label: "Recommendations", icon: "✓" }
    ];
  }, []);

  var countData = {
    categoryScores: categoryScores,
    strengths: strengths,
    developmentAreas: developmentAreas,
    followUpQuestions: followUpQuestions,
    recommendations: recommendations
  };

  function toggleRow(key) {
    var next = {};
    Object.keys(expandedRows).forEach(function (itemKey) {
      next[itemKey] = expandedRows[itemKey];
    });
    next[key] = !next[key];
    setExpandedRows(next);
  }

  async function downloadPdfReport() {
    var response;
    var blob;
    var downloadUrl;
    var link;
    var fileName;
    var errorData;

    if (!userId || !effectiveAssessmentId) {
      setPdfError("Cannot generate PDF because candidate ID or assessment ID is missing.");
      return;
    }

    setPdfLoading(true);
    setPdfError("");

    try {
      response = await fetch("/api/generate-pdf-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, assessmentId: effectiveAssessmentId })
      });

      if (!response.ok) {
        errorData = null;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = null;
        }
        setPdfError(errorData && errorData.message ? errorData.message : errorData && errorData.error ? errorData.error : "PDF generation failed. Please try again.");
        setPdfLoading(false);
        return;
      }

      blob = await response.blob();
      downloadUrl = window.URL.createObjectURL(blob);
      link = document.createElement("a");
      fileName = safeText(candidateName || "Candidate", "Candidate").replace(/[^a-zA-Z0-9_-]+/g, "_");
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
          <p style={styles.bodyTextLarge}>{safeText(roleReadiness, "No role readiness statement is available yet.")}</p>
        </SectionShell>

        {behavioralInsights && (
          <SectionShell title="Behavioral Insights" eyebrow="Response behavior" badge="Behavior">
            {showBehavioralMetrics && (
              <div style={styles.miniMetrics}>
                <MetricCard label="Average Time" value={safeNumber(behavioralInsights.averageTimePerQuestion || behavioralInsights.average_time_per_question, 0) + "s"} icon="⏱" background="#ecfeff" color="#0e7490" />
                <MetricCard label="Average Changes" value={safeNumber(behavioralInsights.averageChangesPerQuestion || behavioralInsights.average_changes_per_question, 0)} icon="↺" background="#f5f3ff" color="#6d28d9" />
                <MetricCard label="Total Changes" value={safeNumber(behavioralInsights.totalChanges || behavioralInsights.total_changes, 0)} icon="✦" background="#fff7ed" color="#c2410c" />
              </div>
            )}
            <p style={styles.bodyText}>{safeText(behavioralInsights.note || behavioralInsights.summary || behavioralInsights.interpretation || "No behavioral timing insight is available.", "No behavioral timing insight is available.")}</p>
          </SectionShell>
        )}
      </React.Fragment>
    );
  }

  function renderCategories() {
    if (categoryScores.length === 0) {
      return <EmptyState title="No category scores found" message="No category or competency scores were found in the generated report." icon="▦" />;
    }

    return (
      <SectionShell title="Category / Competency Scores" eyebrow="Expandable performance breakdown" badge={categoryScores.length}>
        <div style={styles.categoryDeck}>
          {categoryScores.map(function (item, index) {
            var row = safeObject(decodeObjectDeep(item));
            var rowTitle = getRowTitle(row);
            var rowPercentage = getRowPercentage(row);
            var rowNarrative = getRowNarrative(row);
            var rowAction = getRowAction(row);
            var key = "category-" + index;
            var isOpen = expandedRows[key] || false;
            var color = getToneColor(rowPercentage);

            return (
              <article key={key} style={styles.categoryCard}>
                <button type="button" style={styles.categoryButton} onClick={function () { toggleRow(key); }}>
                  <div style={styles.categoryLeft}>
                    <div style={{ ...styles.categoryIcon, background: getToneGradient(rowPercentage) }}>{index + 1}</div>
                    <div>
                      <h3 style={styles.categoryTitle}>{rowTitle}</h3>
                      <p style={styles.categoryMeta}>{safeNumber(row.questionCount || row.question_count, 0)} question(s)</p>
                    </div>
                  </div>
                  <div style={styles.categoryRight}>
                    <strong style={{ ...styles.categoryScore, color: color }}>{formatPercentage(rowPercentage)}</strong>
                    <span style={getRiskStyle(row.riskLevel || row.risk_level)}>{safeText(row.riskLevel || row.risk_level, "N/A")}</span>
                    <span style={styles.chevron}>{isOpen ? "−" : "+"}</span>
                  </div>
                </button>

                <div style={styles.categoryProgressWrap}><ProgressBar value={rowPercentage} color={color} /></div>

                {isOpen && (
                  <div style={styles.categoryDetails}>
                    <div style={styles.detailPills}>
                      <span style={styles.classificationPill}>{safeText(row.classification || row.label || row.scoreLevel || row.score_level, "Not classified")}</span>
                      <span style={getRiskStyle(row.riskLevel || row.risk_level)}>{safeText(row.riskLevel || row.risk_level, "N/A")}</span>
                    </div>
                    <p style={styles.bodyText}>{rowNarrative}</p>
                    {rowAction && <p style={styles.actionText}><strong>Action:</strong> {rowAction}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </SectionShell>
    );
  }

  function renderStrengths() {
    if (strengths.length === 0) return <EmptyState title="No strengths available" message="No strengths have been identified for this candidate yet." icon="★" />;

    return (
      <SectionShell title="Top Strengths" eyebrow="Leverage areas" badge={strengths.length}>
        <div style={styles.cardGrid}>
          {strengths.map(function (item, index) {
            var row = safeObject(decodeObjectDeep(item));
            var score = getRowPercentage(row);
            return (
              <article key={index} style={styles.insightCard}>
                <div style={styles.insightTop}><span style={styles.strengthIcon}>★</span><strong style={{ ...styles.insightScore, color: getToneColor(score) }}>{formatPercentage(score)}</strong></div>
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

  function renderDevelopment() {
    if (developmentAreas.length === 0) return <EmptyState title="No priority development areas detected" message="The candidate scored above the development threshold across all measured areas." icon="✓" />;

    return (
      <SectionShell title="Development Areas" eyebrow="Priority improvement areas" badge={developmentAreas.length} badgeStyle={styles.badgeWarm}>
        <div style={styles.cardGrid}>
          {developmentAreas.map(function (item, index) {
            var row = safeObject(decodeObjectDeep(item));
            var score = getRowPercentage(row);
            return (
              <article key={index} style={styles.developmentCard}>
                <div style={styles.insightTop}><span style={styles.developmentIcon}>△</span><strong style={{ ...styles.insightScore, color: getToneColor(score) }}>{formatPercentage(score)}</strong></div>
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
        <div style={styles.questionGrid}>
          {followUpQuestions.map(function (item, index) {
            var row = safeObject(decodeObjectDeep(item));
            return (
              <article key={index} style={styles.questionCardModern}>
                <div style={styles.questionHeader}><span style={styles.questionNumber}>{index + 1}</span><span style={getPriorityStyle(row.priority)}>{safeText(row.priority, "Medium")}</span></div>
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
          {recommendations.map(function (item, index) {
            var row = safeObject(decodeObjectDeep(item));
            return (
              <article key={index} style={styles.recommendationModern}>
                <div style={styles.timelineDot}>{index + 1}</div>
                <div style={styles.recommendationContent}>
                  <div style={styles.recommendationHeader}><h3 style={styles.recommendationTitle}>{safeText(row.competency || row.category || row.title, "Recommendation")}</h3><span style={getPriorityStyle(row.priority)}>{safeText(row.priority, "Medium")}</span></div>
                  <p style={styles.bodyText}>{safeText(row.recommendation || row.description, "No recommendation text available.")}</p>
                  {row.action && <p style={styles.actionText}><strong>Action:</strong> {safeText(row.action, "")}</p>}
                  {row.impact && <p style={styles.mutedText}><strong>Impact:</strong> {safeText(row.impact, "")}</p>}
                  {row.followUpQuestion && <p style={styles.mutedText}><strong>Follow-up:</strong> {safeText(row.followUpQuestion, "")}</p>}
                  {row.follow_up_question && <p style={styles.mutedText}><strong>Follow-up:</strong> {safeText(row.follow_up_question, "")}</p>}
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
    if (activeTab === "strengths") return renderStrengths();
    if (activeTab === "development") return renderDevelopment();
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
              <p style={styles.heroSubtitle}>Assessment: {safeText(assessmentName, "Assessment")}</p>
              <p style={styles.heroMeta}>Candidate ID: {safeText(userId, "Not available")}</p>
              <p style={styles.heroMeta}>Assessment ID: {safeText(effectiveAssessmentId, "Not available")}</p>
            </div>

            <div style={styles.scorePanel}>
              <p style={styles.scorePanelLabel}>Overall Score</p>
              <p style={{ ...styles.scorePanelValue, color: scoreColor }}>{formatPercentage(overallScore)}</p>
              <ProgressBar value={overallScore} color={scoreColor} />
              <div style={styles.scorePanelFooter}>
                <span style={styles.classificationBadge}>{classification}</span>
                <span style={styles.classificationBadge}>{scoreToneLabel}</span>
                <span style={getRiskStyle(riskLevel)}>{riskLevel}</span>
              </div>
              <p style={styles.scorePanelMeta}>Responses: {safeNumber(responseCount, 0)}</p>
              <button type="button" style={pdfLoading ? styles.buttonDisabled : styles.downloadButton} onClick={downloadPdfReport} disabled={pdfLoading || loading}>{pdfLoading ? "Generating PDF..." : "Download PDF"}</button>
              {pdfError && <p style={styles.pdfError}>{pdfError}</p>}
            </div>
          </div>
        </header>

        <div style={styles.metricStrip}>
          <MetricCard label="Categories" value={categoryScores.length} note="Measured areas" icon="▦" background="#eef4ff" color="#3538cd" />
          <MetricCard label="Strengths" value={strengths.length} note="Leverage areas" icon="★" background="#ecfdf3" color="#027a48" />
          <MetricCard label="Development" value={developmentAreas.length} note="Priority areas" icon="△" background="#fff7ed" color="#c2410c" />
          <MetricCard label="Questions" value={followUpQuestions.length} note="Supervisor prompts" icon="?" background="#f5f3ff" color="#6d28d9" />
        </div>

        {loading && (
          <SectionShell title="Loading report" eyebrow="Please wait">
            <div style={styles.loadingBar}><div style={styles.loadingPulse} /></div>
            <p style={styles.bodyText}>Loading supervisor report...</p>
          </SectionShell>
        )}

        {!loading && errorMessage && (
          <section style={styles.errorCard}>
            <h2 style={styles.sectionTitle}>Report not loaded</h2>
            <p style={styles.errorText}>{errorMessage}</p>
            <p style={styles.mutedText}>The supervisor page loaded, but the report API did not return report data.</p>
          </section>
        )}

        {!loading && !errorMessage && (
          <React.Fragment>
            <nav style={styles.tabBar}>
              {tabs.map(function (tab) {
                var isActive = activeTab === tab.key;
                var count = getTabCount(tab.key, countData);
                return (
                  <button key={tab.key} type="button" style={isActive ? styles.tabActive : styles.tabButton} onClick={function () { setActiveTab(tab.key); }}>
                    <span style={styles.tabIcon}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {count !== "" && <span style={isActive ? styles.tabCountActive : styles.tabCount}>{count}</span>}
                  </button>
                );
              })}
            </nav>
            <div style={styles.tabContent}>{renderActiveTab()}</div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

var styles = {
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
  bodyText: { margin: 0, color: "#344054", lineHeight: 1.7, fontSize: "15px" },
  bodyTextLarge: { margin: 0, color: "#344054", lineHeight: 1.75, fontSize: "16px" },
  mutedText: { margin: "8px 0 0", color: "#667085", lineHeight: 1.6, fontSize: "14px" },
  actionText: { margin: "10px 0 0", color: "#344054", lineHeight: 1.6, fontSize: "14px" },
  miniMetrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" },
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
  categoryDetails: { padding: "0 16px 16px", borderTop: "1px solid #eaecf0" },
  detailPills: { display: "flex", gap: "8px", flexWrap: "wrap", margin: "14px 0 10px" },
  classificationPill: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#f2f4f7", color: "#344054", fontSize: "12px", fontWeight: 900 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" },
  insightCard: { background: "linear-gradient(135deg, #ffffff 0%, #ecfdf3 100%)", border: "1px solid #bbf7d0", borderRadius: "20px", padding: "18px", boxShadow: "0 14px 34px rgba(16, 24, 40, 0.06)" },
  developmentCard: { background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)", border: "1px solid #fed7aa", borderRadius: "20px", padding: "18px", boxShadow: "0 14px 34px rgba(16, 24, 40, 0.06)" },
  insightTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" },
  strengthIcon: { width: "36px", height: "36px", borderRadius: "12px", background: "#dcfce7", color: "#027a48", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  developmentIcon: { width: "36px", height: "36px", borderRadius: "12px", background: "#ffedd5", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  insightScore: { fontSize: "22px", fontWeight: 900 },
  insightTitle: { margin: "0 0 10px", color: "#101828", fontSize: "17px" },
  insightText: { margin: "12px 0 0", color: "#475467", lineHeight: 1.6, fontSize: "14px" },
  questionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
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
  badgeLow: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#ecfdf3", color: "#027a48", fontWeight: 900, fontSize: "12px" },
  badgeModerate: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#eff6ff", color: "#1d4ed8", fontWeight: 900, fontSize: "12px" },
  badgeElevated: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#fffaeb", color: "#b54708", fontWeight: 900, fontSize: "12px" },
  badgeHigh: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#fff7ed", color: "#c2410c", fontWeight: 900, fontSize: "12px" },
  badgeCritical: { display: "inline-flex", borderRadius: "999px", padding: "6px 10px", background: "#fef3f2", color: "#b42318", fontWeight: 900, fontSize: "12px" },
  priorityHigh: { padding: "6px 10px", borderRadius: "999px", background: "#fff7ed", color: "#c2410c", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  priorityCritical: { padding: "6px 10px", borderRadius: "999px", background: "#fef3f2", color: "#b42318", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  priorityMedium: { padding: "6px 10px", borderRadius: "999px", background: "#fffaeb", color: "#b54708", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  priorityLow: { padding: "6px 10px", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  priorityLeverage: { padding: "6px 10px", borderRadius: "999px", background: "#ecfdf3", color: "#027a48", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" }
};
