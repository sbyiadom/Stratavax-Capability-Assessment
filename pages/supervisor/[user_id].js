// pages/supervisor/[user_id].js

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

function safeObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback || "Not available";
  }

  return String(value);
}

function safeNumber(value, fallback) {
  const defaultValue = fallback === undefined ? 0 : fallback;
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
}

function formatPercentage(value) {
  return safeNumber(value, 0) + "%";
}

function getCandidateName(candidate, report) {
  const c = safeObject(candidate);
  const r = safeObject(report);

  return (
    c.full_name ||
    c.name ||
    c.email ||
    r.candidateName ||
    r.candidate_name ||
    "Candidate"
  );
}

function getOverallScore(report) {
  const r = safeObject(report);

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
  const r = safeObject(report);

  return (
    r.classification ||
    r.overallClassification ||
    r.performanceBand ||
    r.label ||
    "Not classified"
  );
}

function getCategoryScores(report) {
  const r = safeObject(report);

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
  const r = safeObject(report);

  if (Array.isArray(r.strengths)) return r.strengths;
  if (Array.isArray(r.topStrengths)) return r.topStrengths;

  if (
    r.competencySummary &&
    Array.isArray(r.competencySummary.topStrengths)
  ) {
    return r.competencySummary.topStrengths;
  }

  if (
    r.competency_summary &&
    Array.isArray(r.competency_summary.top_strengths)
  ) {
    return r.competency_summary.top_strengths;
  }

  return [];
}

function getDevelopmentAreas(report) {
  const r = safeObject(report);

  if (Array.isArray(r.developmentAreas)) return r.developmentAreas;
  if (Array.isArray(r.topDevelopmentNeeds)) return r.topDevelopmentNeeds;

  if (
    r.competencySummary &&
    Array.isArray(r.competencySummary.topDevelopmentNeeds)
  ) {
    return r.competencySummary.topDevelopmentNeeds;
  }

  if (
    r.competency_summary &&
    Array.isArray(r.competency_summary.top_development_needs)
  ) {
    return r.competency_summary.top_development_needs;
  }

  return [];
}

function getRecommendations(report) {
  const r = safeObject(report);

  if (Array.isArray(r.recommendations)) return r.recommendations;

  if (
    r.competencySummary &&
    Array.isArray(r.competencySummary.recommendations)
  ) {
    return r.competencySummary.recommendations;
  }

  if (
    r.competency_summary &&
    Array.isArray(r.competency_summary.recommendations)
  ) {
    return r.competency_summary.recommendations;
  }

  return [];
}

export default function SupervisorUserReportPage() {
  const router = useRouter();
  const userId = router.query.user_id;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(
    function () {
      if (!userId) return;

      let mounted = true;

      async function loadReport() {
        setLoading(true);
        setErrorMessage("");

        try {
          const urls = [
            "/api/supervisor/report?user_id=" + encodeURIComponent(userId),
            "/api/generate-report?user_id=" + encodeURIComponent(userId),
            "/api/report?user_id=" + encodeURIComponent(userId)
          ];

          let data = null;
          let lastError = "";

          for (let i = 0; i < urls.length; i += 1) {
            try {
              const response = await fetch(urls[i]);

              if (response.ok) {
                data = await response.json();
                break;
              }

              lastError = "Request failed with status " + response.status;
            } catch (requestError) {
              lastError =
                requestError && requestError.message
                  ? requestError.message
                  : "Unable to fetch report";
            }
          }

          if (!mounted) return;

          if (!data) {
            setCandidate(null);
            setReport(null);
            setErrorMessage(
              lastError || "No report data was returned for this candidate."
            );
            setLoading(false);
            return;
          }

          const cleanData = safeObject(data);

          setCandidate(
            cleanData.candidate ||
              cleanData.user ||
              cleanData.profile ||
              cleanData.candidateProfile ||
              null
          );

          setReport(
            cleanData.generatedReport ||
              cleanData.report ||
              cleanData.assessmentReport ||
              cleanData.result ||
              cleanData
          );

          setLoading(false);
        } catch (error) {
          if (!mounted) return;

          setCandidate(null);
          setReport(null);
          setErrorMessage(
            error && error.message
              ? error.message
              : "Something went wrong while loading the report."
          );
          setLoading(false);
        }
      }

      loadReport();

      return function () {
        mounted = false;
      };
    },
    [userId]
  );

  const cleanReport = safeObject(report);
  const categoryScores = getCategoryScores(cleanReport);
  const strengths = getStrengths(cleanReport);
  const developmentAreas = getDevelopmentAreas(cleanReport);
  const recommendations = getRecommendations(cleanReport);
  const candidateName = getCandidateName(candidate, cleanReport);
  const overallScore = getOverallScore(cleanReport);
  const classification = getClassification(cleanReport);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Supervisor Assessment Report</p>
            <h1 style={styles.title}>{candidateName}</h1>
            <p style={styles.subtitle}>
              Candidate ID: {safeText(userId, "Not available")}
            </p>
          </div>

          <div style={styles.scoreCard}>
            <p style={styles.scoreLabel}>Overall Score</p>
            <p style={styles.scoreValue}>{formatPercentage(overallScore)}</p>
            <p style={styles.classification}>{classification}</p>
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
              The page is compiling, but no report API returned data.
            </p>
          </section>
        )}

        {!loading && !errorMessage && (
          <React.Fragment>
            <section style={styles.grid}>
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Summary</h2>
                <p style={styles.bodyText}>
                  {safeText(
                    cleanReport.overallAssessment ||
                      cleanReport.summary ||
                      cleanReport.executiveSummary ||
                      cleanReport.interpretation,
                    "No summary is available yet."
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

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Category / Competency Scores</h2>
                <span style={styles.badge}>{categoryScores.length}</span>
              </div>

              {categoryScores.length === 0 ? (
                <p style={styles.mutedText}>
                  No category or competency scores were found.
                </p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Area</th>
                        <th style={styles.th}>Score</th>
                        <th style={styles.th}>Classification</th>
                        <th style={styles.th}>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryScores.map(function (item, index) {
                        const row = safeObject(item);

                        return (
                          <tr key={index}>
                            <td style={styles.td}>
                              {safeText(
                                row.category || row.name || row.competency,
                                "General"
                              )}
                            </td>
                            <td style={styles.td}>
                              {formatPercentage(
                                row.percentage || row.score || row.currentScore
                              )}
                            </td>
                            <td style={styles.td}>
                              {safeText(
                                row.classification ||
                                  row.label ||
                                  row.scoreLevel,
                                "Not classified"
                              )}
                            </td>
                            <td style={styles.td}>
                              {safeText(
                                row.comment ||
                                  row.performanceComment ||
                                  row.supervisorImplication,
                                "No comment available"
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
                  <span style={styles.badge}>{strengths.length}</span>
                </div>

                {safeArray(strengths).length === 0 ? (
                  <p style={styles.mutedText}>No strengths available.</p>
                ) : (
                  <ul style={styles.list}>
                    {strengths.map(function (item, index) {
                      const row = safeObject(item);

                      return (
                        <li key={index} style={styles.listItem}>
                          <strong>
                            {safeText(
                              row.name || row.category || row.competency,
                              "Strength"
                            )}
                          </strong>
                          <span style={styles.listMeta}>
                            {formatPercentage(row.percentage || row.score)}
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
                  <span style={styles.badge}>{developmentAreas.length}</span>
                </div>

                {safeArray(developmentAreas).length === 0 ? (
                  <p style={styles.mutedText}>No development areas available.</p>
                ) : (
                  <ul style={styles.list}>
                    {developmentAreas.map(function (item, index) {
                      const row = safeObject(item);

                      return (
                        <li key={index} style={styles.listItem}>
                          <strong>
                            {safeText(
                              row.name || row.category || row.competency,
                              "Development area"
                            )}
                          </strong>
                          <span style={styles.listMeta}>
                            {formatPercentage(row.percentage || row.score)}
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
                <h2 style={styles.sectionTitle}>Recommendations</h2>
                <span style={styles.badge}>{recommendations.length}</span>
              </div>

              {recommendations.length === 0 ? (
                <p style={styles.mutedText}>
                  No recommendations have been generated yet.
                </p>
              ) : (
                <div style={styles.recommendationList}>
                  {recommendations.map(function (item, index) {
                    const row = safeObject(item);

                    return (
                      <article key={index} style={styles.recommendationCard}>
                        <div style={styles.recommendationHeader}>
                          <h3 style={styles.recommendationTitle}>
                            {safeText(
                              row.competency || row.category || row.title,
                              "Recommendation"
                            )}
                          </h3>
                          <span style={styles.priority}>
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
                            <strong>Action:</strong> {row.action}
                          </p>
                        )}

                        {row.impact && (
                          <p style={styles.mutedText}>
                            <strong>Impact:</strong> {row.impact}
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

const styles = {
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
    minWidth: "220px",
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
    fontWeight: 700
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #eaecf0",
    color: "#344054",
    verticalAlign: "top"
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

  listMeta: {
    fontWeight: 800,
    color: "#0f766e"
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

  priority: {
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#fff7ed",
    color: "#c2410c",
    fontSize: "12px",
    fontWeight: 800
  },

  actionText: {
    margin: "10px 0 0",
    color: "#344054",
    lineHeight: 1.6,
    fontSize: "14px"
  }
};
