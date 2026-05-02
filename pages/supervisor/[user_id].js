// pages/supervisor/[user_id].js

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

// ======================================================
// SAFE HELPERS
// ======================================================

function decodeHtmlEntities(value) {
  if (value === null || value === undefined) {
    return value;
  }

  var text = String(value);
  text = text.replace(new RegExp("&" + "amp;", "g"), "&");
  text = text.replace(new RegExp("&" + "lt;", "g"), "<");
  text = text.replace(new RegExp("&" + "gt;", "g"), ">");
  text = text.replace(new RegExp("&" + "quot;", "g"), '"');
  text = text.replace(new RegExp("&" + "#039;", "g"), "'");
  return text;
}

function safeObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function safeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function safeText(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback || "Not available";
  }

  return decodeHtmlEntities(value);
}

function safeNumber(value, fallback) {
  var defaultValue = fallback === undefined ? 0 : fallback;
  var number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
}

function formatPercentage(value) {
  return safeNumber(value, 0) + "%";
}

function buildReportUrl(userId, assessmentId) {
  var url = "/api/supervisor/report?user_id=" + encodeURIComponent(userId);

  if (assessmentId) {
    url += "&assessment_id=" + encodeURIComponent(assessmentId);
  }

  return url;
}

function getCandidateName(candidate, report) {
  var c = safeObject(candidate);
  var r = safeObject(report);

  return safeText(
    c.full_name ||
      c.name ||
      c.display_name ||
      c.email ||
      c.candidate_name ||
      r.candidateName ||
      r.candidate_name ||
      "Candidate",
    "Candidate"
  );
}

function getAssessmentName(assessment, report) {
  var a = safeObject(assessment);
  var r = safeObject(report);

  return safeText(
    a.title ||
      a.name ||
      a.assessment_name ||
      r.assessmentName ||
      r.assessment_name ||
      "Assessment",
    "Assessment"
  );
}

function getOverallScore(report) {
  var r = safeObject(report);

  return (
    r.percentage ||
    r.overallPercentage ||
    r.overall_score ||
    r.totalPercentage ||
    r.score ||
    0
  );
}

function getClassification(report) {
  var r = safeObject(report);

  return safeText(
    r.classification ||
      r.overallClassification ||
      r.performanceBand ||
      r.label ||
      "Not classified",
    "Not classified"
  );
}

function getRiskLevel(report) {
  var r = safeObject(report);

  return safeText(r.riskLevel || r.risk_level || "Not available", "Not available");
}

function getResponseCount(report) {
  var r = safeObject(report);

  return r.responseCount || r.response_count || 0;
}

function getCategoryScores(report) {
  var r = safeObject(report);

  if (Array.isArray(r.categoryScores)) return r.categoryScores;
  if (Array.isArray(r.category_scores)) return r.category_scores;
  if (Array.isArray(r.competencyScores)) return r.competencyScores;
  if (Array.isArray(r.competency_scores)) return r.competency_scores;

  if (r.competencyScores && typeof r.competencyScores === "object") {
    return Object.values(r.competencyScores);
  }

  if (r.competency_scores && typeof r.competency_scores === "object") {
    return Object.values(r.competency_scores);
  }

  return [];
}

function getStrengths(report) {
  var r = safeObject(report);

  if (Array.isArray(r.strengths)) return r.strengths;
  if (Array.isArray(r.topStrengths)) return r.topStrengths;

  return [];
}

function getDevelopmentAreas(report) {
  var r = safeObject(report);

  if (Array.isArray(r.developmentAreas)) return r.developmentAreas;
  if (Array.isArray(r.topDevelopmentNeeds)) return r.topDevelopmentNeeds;

  return [];
}

function getRecommendations(report) {
  var r = safeObject(report);

  if (Array.isArray(r.recommendations)) return r.recommendations;

  return [];
}

function getBehavioralInsights(report) {
  var r = safeObject(report);

  return (
    r.behavioralInsights ||
    r.behavioralSummary ||
    r.behavioral_summary ||
    null
  );
}

function getRoleReadiness(report) {
  var r = safeObject(report);

  return safeText(
    r.roleReadiness ||
      r.role_readiness ||
      r.readinessStatement ||
      r.readiness_statement ||
      "No role readiness statement is available yet.",
    "No role readiness statement is available yet."
  );
}

function getFollowUpQuestions(report) {
  var r = safeObject(report);

  if (Array.isArray(r.followUpQuestions)) return r.followUpQuestions;
  if (Array.isArray(r.follow_up_questions)) return r.follow_up_questions;

  return [];
}

function getRowTitle(row) {
  var item = safeObject(row);

  return safeText(
    item.category || item.name || item.competency || item.title,
    "General"
  );
}

function getRowPercentage(row) {
  var item = safeObject(row);

  return item.percentage || item.score || item.currentScore || 0;
}

function getRowNarrative(row) {
  var item = safeObject(row);

  return safeText(
    item.narrative ||
      item.supervisorMeaning ||
      item.supervisorImplication ||
      item.comment ||
      item.performanceComment,
    "No interpretation available."
  );
}

function getRowAction(row) {
  var item = safeObject(row);

  return safeText(item.action || "", "");
}

function getPriorityStyle(priority) {
  var value = safeText(priority, "Medium").toLowerCase();

  if (value === "critical") {
    return styles.priorityCritical;
  }

  if (value === "high") {
    return styles.priorityHigh;
  }

  if (value === "leverage") {
    return styles.priorityLeverage;
  }

  return styles.priorityMedium;
}

function shouldShowBehavioralMetrics(behavioralInsights) {
  var item = safeObject(behavioralInsights);
  var quality = safeText(item.dataQuality || item.data_quality || "", "").toLowerCase();
  var totalTime = safeNumber(item.totalTimeSpent || item.total_time_spent, 0);

  if (quality === "limited") {
    return false;
  }

  if (totalTime <= 0) {
    return false;
  }

  return true;
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

  var debugState = useState(null);
  var debugInfo = debugState[0];
  var setDebugInfo = debugState[1];

  useEffect(
    function () {
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
        setDebugInfo(null);

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
            errorText =
              data && data.error
                ? data.error
                : "Request failed with status " + response.status;

            setErrorMessage(errorText);
            setDebugInfo({
              status: response.status,
              url: url,
              data: data
            });
            setLoading(false);
            return;
          }

          cleanData = safeObject(data);

          loadedCandidate =
            cleanData.candidate ||
            cleanData.user ||
            cleanData.profile ||
            cleanData.candidateProfile ||
            null;

          loadedAssessment = cleanData.assessment || null;

          loadedReport =
            cleanData.generatedReport ||
            cleanData.report ||
            cleanData.assessmentReport ||
            cleanData.result ||
            cleanData;

          setCandidate(loadedCandidate);
          setAssessment(loadedAssessment);
          setReport(loadedReport);
          setDebugInfo({
            status: response.status,
            url: url,
            responseCount:
              cleanData.responseCount ||
              cleanData.response_count ||
              safeObject(loadedReport).responseCount ||
              safeObject(loadedReport).response_count ||
              0,
            dataSource:
              cleanData.dataSource || safeObject(loadedReport).dataSource || null
          });
          setLoading(false);
        } catch (error) {
          if (!mounted) return;

          setErrorMessage(
            error && error.message
              ? error.message
              : "Something went wrong while loading the report."
          );
          setDebugInfo({
            status: "network_error",
            message: error && error.message ? error.message : "Unknown error"
          });
          setLoading(false);
        }
      }

      loadReport();

      return function () {
        mounted = false;
      };
    },
    [router.isReady, userId, assessmentId]
  );

  var cleanReport = safeObject(report);
  var categoryScores = getCategoryScores(cleanReport);
  var strengths = getStrengths(cleanReport);
  var developmentAreas = getDevelopmentAreas(cleanReport);
  var recommendations = getRecommendations(cleanReport);
  var behavioralInsights = getBehavioralInsights(cleanReport);
  var roleReadiness = getRoleReadiness(cleanReport);
  var followUpQuestions = getFollowUpQuestions(cleanReport);
  var candidateName = getCandidateName(candidate, cleanReport);
  var assessmentName = getAssessmentName(assessment, cleanReport);
  var overallScore = getOverallScore(cleanReport);
  var classification = getClassification(cleanReport);
  var riskLevel = getRiskLevel(cleanReport);
  var responseCount = getResponseCount(cleanReport);
  var showBehavioralMetrics = shouldShowBehavioralMetrics(behavioralInsights);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Supervisor Assessment Report</p>
            <h1 style={styles.title}>{candidateName}</h1>
            <p style={styles.subtitle}>
              Assessment: {safeText(assessmentName, "Assessment")}
            </p>
            <p style={styles.subtitle}>
              Candidate ID: {safeText(userId, "Not available")}
            </p>
            <p style={styles.subtitle}>
              Assessment ID: {safeText(assessmentId, "Not available")}
            </p>
          </div>

          <div style={styles.scoreCard}>
            <p style={styles.scoreLabel}>Overall Score</p>
            <p style={styles.scoreValue}>{formatPercentage(overallScore)}</p>
            <p style={styles.classification}>{classification}</p>
            <p style={styles.smallMeta}>Risk Level: {riskLevel}</p>
            <p style={styles.smallMeta}>
              Responses: {safeNumber(responseCount, 0)}
            </p>
          </div>
        </header>

        {loading && (
          <section style={styles.card}>
            <p style={styles.bodyText}>Loading supervisor report...</p>
          </section>
        )}

        {!loading && errorMessage && (
          <section style={styles.errorCard}>
            <h2 style={styles.sectionTitle}>Report not loaded</h2>
            <p style={styles.errorText}>{errorMessage}</p>
            <p style={styles.mutedText}>
              The supervisor page loaded, but the report API did not return report data.
            </p>

            <div style={styles.debugBox}>
              <p style={styles.debugTitle}>Debug information</p>
              <p style={styles.debugText}>
                API route expected: {" "}
                <strong>
                  /api/supervisor/report?user_id={safeText(userId, "")}
                  {assessmentId ? "&assessment_id=" + assessmentId : ""}
                </strong>
              </p>
              <p style={styles.debugText}>
                Status: {" "}
                <strong>
                  {debugInfo && debugInfo.status
                    ? String(debugInfo.status)
                    : "Unknown"}
                </strong>
              </p>
            </div>
          </section>
        )}

        {!loading && !errorMessage && (
          <React.Fragment>
            <section style={styles.grid}>
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Executive Summary</h2>
                <p style={styles.bodyText}>
                  {safeText(
                    cleanReport.executiveSummary ||
                      cleanReport.summary ||
                      cleanReport.overallAssessment ||
                      cleanReport.interpretation,
                    "No executive summary is available yet."
                  )}
                </p>
              </div>

              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Supervisor Implication</h2>
                <p style={styles.bodyText}>
                  {safeText(
                    cleanReport.supervisorImplication ||
                      cleanReport.supervisor_implication ||
                      cleanReport.recommendationSummary,
                    "No supervisor implication is available yet."
                  )}
                </p>
              </div>
            </section>

            <section style={styles.cardHighlight}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Role Readiness</h2>
                <span style={styles.badgeWarning}>Readiness</span>
              </div>
              <p style={styles.bodyText}>{roleReadiness}</p>
            </section>

            {behavioralInsights && (
              <section style={styles.card}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Behavioral Insights</h2>
                  <span style={styles.badge}>Behavior</span>
                </div>

                {showBehavioralMetrics && (
                  <div style={styles.metricGrid}>
                    <div style={styles.metricBox}>
                      <p style={styles.metricLabel}>Average Time / Question</p>
                      <p style={styles.metricValue}>
                        {safeNumber(behavioralInsights.averageTimePerQuestion, 0)}s
                      </p>
                    </div>

                    <div style={styles.metricBox}>
                      <p style={styles.metricLabel}>Average Answer Changes</p>
                      <p style={styles.metricValue}>
                        {safeNumber(behavioralInsights.averageChangesPerQuestion, 0)}
                      </p>
                    </div>

                    <div style={styles.metricBox}>
                      <p style={styles.metricLabel}>Total Changes</p>
                      <p style={styles.metricValue}>
                        {safeNumber(behavioralInsights.totalChanges, 0)}
                      </p>
                    </div>
                  </div>
                )}

                <p style={styles.bodyText}>
                  {safeText(
                    behavioralInsights.note,
                    "No behavioral timing insight is available."
                  )}
                </p>
              </section>
            )}

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Category / Competency Scores</h2>
                <span style={styles.badge}>{categoryScores.length}</span>
              </div>

              {categoryScores.length === 0 ? (
                <p style={styles.mutedText}>
                  No category or competency scores were found in the generated report.
                </p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Area</th>
                        <th style={styles.th}>Score</th>
                        <th style={styles.th}>Classification</th>
                        <th style={styles.th}>Risk</th>
                        <th style={styles.th}>Narrative Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryScores.map(function (item, index) {
                        var row = safeObject(item);
                        var rowTitle = getRowTitle(row);
                        var rowPercentage = getRowPercentage(row);
                        var rowNarrative = getRowNarrative(row);
                        var rowAction = getRowAction(row);

                        return (
                          <tr key={index}>
                            <td style={styles.td}>
                              <strong>{rowTitle}</strong>
                              {row.questionCount && (
                                <div style={styles.cellMeta}>
                                  {row.questionCount} question(s)
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>
                              <strong>{formatPercentage(rowPercentage)}</strong>
                            </td>
                            <td style={styles.td}>
                              {safeText(
                                row.classification || row.label || row.scoreLevel,
                                "Not classified"
                              )}
                            </td>
                            <td style={styles.td}>
                              {safeText(row.riskLevel || row.risk_level, "N/A")}
                            </td>
                            <td style={styles.td}>
                              <p style={styles.tableNarrative}>{rowNarrative}</p>
                              {rowAction && (
                                <p style={styles.tableAction}>
                                  <strong>Action:</strong> {rowAction}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={styles.grid}>
              <div style={styles.card}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Top Strengths</h2>
                  <span style={styles.badge}>{safeArray(strengths).length}</span>
                </div>

                {safeArray(strengths).length === 0 ? (
                  <p style={styles.mutedText}>No strengths available.</p>
                ) : (
                  <ul style={styles.list}>
                    {safeArray(strengths).map(function (item, index) {
                      var row = safeObject(item);

                      return (
                        <li key={index} style={styles.listItem}>
                          <div>
                            <strong>{getRowTitle(row)}</strong>
                            <p style={styles.listDescription}>
                              {getRowNarrative(row)}
                            </p>
                          </div>
                          <span style={styles.listMeta}>
                            {formatPercentage(getRowPercentage(row))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Development Areas</h2>
                  <span style={styles.badge}>{safeArray(developmentAreas).length}</span>
                </div>

                {safeArray(developmentAreas).length === 0 ? (
                  <p style={styles.mutedText}>No development areas available.</p>
                ) : (
                  <ul style={styles.list}>
                    {safeArray(developmentAreas).map(function (item, index) {
                      var row = safeObject(item);

                      return (
                        <li key={index} style={styles.listItem}>
                          <div>
                            <strong>{getRowTitle(row)}</strong>
                            <p style={styles.listDescription}>
                              {getRowNarrative(row)}
                            </p>
                          </div>
                          <span style={styles.listMetaWarning}>
                            {formatPercentage(getRowPercentage(row))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Supervisor Follow-up Questions</h2>
                <span style={styles.badge}>{followUpQuestions.length}</span>
              </div>

              {followUpQuestions.length === 0 ? (
                <p style={styles.mutedText}>
                  No follow-up questions have been generated yet.
                </p>
              ) : (
                <div style={styles.questionList}>
                  {followUpQuestions.map(function (item, index) {
                    var row = safeObject(item);

                    return (
                      <article key={index} style={styles.questionCard}>
                        <div style={styles.recommendationHeader}>
                          <h3 style={styles.recommendationTitle}>
                            {safeText(row.category, "Follow-up Area")}
                          </h3>
                          <span style={getPriorityStyle(row.priority)}>
                            {safeText(row.priority, "Medium")}
                          </span>
                        </div>
                        <p style={styles.bodyText}>
                          {safeText(row.question, "No question text available.")}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Recommendations</h2>
                <span style={styles.badge}>{recommendations.length}</span>
              </div>

              {recommendations.length === 0 ? (
                <p style={styles.mutedText}>No recommendations have been generated yet.</p>
              ) : (
                <div style={styles.recommendationList}>
                  {recommendations.map(function (item, index) {
                    var row = safeObject(item);
                    var priorityStyle = getPriorityStyle(row.priority);

                    return (
                      <article key={index} style={styles.recommendationCard}>
                        <div style={styles.recommendationHeader}>
                          <h3 style={styles.recommendationTitle}>
                            {safeText(
                              row.competency || row.category || row.title,
                              "Recommendation"
                            )}
                          </h3>
                          <span style={priorityStyle}>
                            {safeText(row.priority, "Medium")}
                          </span>
                        </div>

                        <p style={styles.bodyText}>
                          {safeText(
                            row.recommendation || row.description,
                            "No recommendation text available."
                          )}
                        </p>

                        {row.action && (
                          <p style={styles.actionText}>
                            <strong>Action:</strong> {safeText(row.action, "")}
                          </p>
                        )}

                        {row.impact && (
                          <p style={styles.mutedText}>
                            <strong>Impact:</strong> {safeText(row.impact, "")}
                          </p>
                        )}

                        {row.followUpQuestion && (
                          <p style={styles.mutedText}>
                            <strong>Follow-up:</strong> {safeText(row.followUpQuestion, "")}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
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
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    padding: "32px 16px",
    color: "#172033",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
  },

  container: {
    maxWidth: "1180px",
    margin: "0 auto"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "stretch",
    marginBottom: "24px",
    flexWrap: "wrap"
  },

  eyebrow: {
    margin: "0 0 6px",
    color: "#667085",
    fontSize: "14px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },

  title: {
    margin: 0,
    fontSize: "34px",
    lineHeight: 1.2,
    color: "#101828"
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#667085",
    fontSize: "14px"
  },

  scoreCard: {
    minWidth: "230px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)",
    border: "1px solid #eaecf0"
  },

  scoreLabel: {
    margin: 0,
    color: "#667085",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase"
  },

  scoreValue: {
    margin: "8px 0",
    fontSize: "42px",
    fontWeight: 800,
    color: "#0f766e"
  },

  classification: {
    margin: 0,
    color: "#344054",
    fontWeight: 700
  },

  smallMeta: {
    margin: "8px 0 0",
    color: "#667085",
    fontSize: "13px"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
    marginBottom: "18px"
  },

  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(16, 24, 40, 0.06)",
    border: "1px solid #eaecf0",
    marginBottom: "18px"
  },

  cardHighlight: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(16, 24, 40, 0.06)",
    border: "1px solid #fed7aa",
    marginBottom: "18px"
  },

  errorCard: {
    background: "#fff5f5",
    borderRadius: "18px",
    padding: "22px",
    border: "1px solid #fecaca",
    marginBottom: "18px"
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px"
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#101828"
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "34px",
    height: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    background: "#eef4ff",
    color: "#3538cd",
    fontWeight: 700,
    fontSize: "13px"
  },

  badgeWarning: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "34px",
    height: "28px",
    padding: "0 10px",
    borderRadius: "999px",
    background: "#fff7ed",
    color: "#c2410c",
    fontWeight: 700,
    fontSize: "13px"
  },

  bodyText: {
    margin: 0,
    color: "#344054",
    lineHeight: 1.65,
    fontSize: "15px"
  },

  mutedText: {
    margin: "8px 0 0",
    color: "#667085",
    lineHeight: 1.6,
    fontSize: "14px"
  },

  errorText: {
    margin: "10px 0",
    color: "#b42318",
    fontWeight: 700
  },

  tableWrapper: {
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },

  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f9fafb",
    color: "#475467",
    borderBottom: "1px solid #eaecf0",
    fontWeight: 700,
    verticalAlign: "top"
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #eaecf0",
    color: "#344054",
    verticalAlign: "top"
  },

  tableNarrative: {
    margin: 0,
    color: "#344054",
    lineHeight: 1.55
  },

  tableAction: {
    margin: "8px 0 0",
    color: "#475467",
    lineHeight: 1.55,
    fontSize: "13px"
  },

  cellMeta: {
    marginTop: "4px",
    color: "#667085",
    fontSize: "12px"
  },

  list: {
    listStyle: "none",
    margin: 0,
    padding: 0
  },

  listItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 0",
    borderBottom: "1px solid #eaecf0",
    color: "#344054"
  },

  listDescription: {
    margin: "4px 0 0",
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.5
  },

  listMeta: {
    fontWeight: 800,
    color: "#0f766e",
    whiteSpace: "nowrap"
  },

  listMetaWarning: {
    fontWeight: 800,
    color: "#c2410c",
    whiteSpace: "nowrap"
  },

  recommendationList: {
    display: "grid",
    gap: "14px"
  },

  recommendationCard: {
    padding: "16px",
    borderRadius: "14px",
    background: "#f9fafb",
    border: "1px solid #eaecf0"
  },

  recommendationHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginBottom: "8px"
  },

  recommendationTitle: {
    margin: 0,
    fontSize: "16px",
    color: "#101828"
  },

  priorityHigh: {
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  priorityCritical: {
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#fef3f2",
    color: "#b42318",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  priorityMedium: {
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#fffaeb",
    color: "#b54708",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  priorityLeverage: {
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#ecfdf3",
    color: "#027a48",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap"
  },

  actionText: {
    margin: "10px 0 0",
    color: "#344054",
    lineHeight: 1.6,
    fontSize: "14px"
  },

  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "16px"
  },

  metricBox: {
    padding: "14px",
    borderRadius: "12px",
    background: "#f9fafb",
    border: "1px solid #eaecf0"
  },

  metricLabel: {
    margin: 0,
    color: "#667085",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase"
  },

  metricValue: {
    margin: "6px 0 0",
    color: "#101828",
    fontSize: "24px",
    fontWeight: 800
  },

  questionList: {
    display: "grid",
    gap: "12px"
  },

  questionCard: {
    padding: "16px",
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #eaecf0"
  },

  debugBox: {
    marginTop: "16px",
    padding: "14px",
    borderRadius: "12px",
    background: "#ffffff",
    border: "1px solid #fecaca"
  },

  debugTitle: {
    margin: "0 0 8px",
    color: "#101828",
    fontWeight: 800
  },

  debugText: {
    margin: "5px 0",
    color: "#475467",
    fontSize: "13px",
    lineHeight: 1.5
  }
};
