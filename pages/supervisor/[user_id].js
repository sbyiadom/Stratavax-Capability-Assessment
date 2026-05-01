// pages/supervisor/[user_id].js

import React, { useEffect, useState("");import React, { useEffect, useState } from "react";

        try {
          /*
           * This page tries common report API routes.
           * If your project uses a different endpoint, only change the URLs below.
           */
          const urls = [
            "/api/supervisor/report?user_id=" + encodeURIComponent(userId),
            "/api/generate-report?user_id=" + encodeURIComponent(userId),
            "/api/report?user_id=" + encodeURIComponent(userId)
          ];

          let loadedData = null;
          let lastError = "";

          for (let i = 0; i < urls.length; i += 1) {
            try {
              const response = await fetch(urls[i]);

              if (response.ok) {
                loadedData = await response.json();
                break;
              }

              lastError = "Request failed with status " + response.status;
            } catch (requestError) {
              lastError =
                requestError && requestError.message
                  ? requestError.message
                  : "Unable to load report.";
            }
          }

          if (!isMounted) return;

          if (!loadedData) {
            setCandidate(null);
            setGeneratedReport(null);
            setErrorMessage(
              lastError ||
                "No supervisor report data was returned for this candidate."
            );
            setLoading(false);
            return;
          }

          const data = safeObject(loadedData);

          setCandidate(
            data.candidate ||
              data.user ||
              data.profile ||
              data.candidateProfile ||
              null
          );

          setGeneratedReport(
            data.generatedReport ||
              data.report ||
              data.assessmentReport ||
              data.result ||
              data
          );

          setLoading(false);
        } catch (error) {
          if (!isMounted) return;

          setCandidate(null);
          setGeneratedReport(null);
          setErrorMessage(
            error && error.message
              ? error.message
              : "Something went wrong while loading the supervisor report."
          );
          setLoading(false);
        }
      };

      loadSupervisorReport();

      return function () {
        isMounted = false;
      };
    },
    [userId]
  );

  const report = safeObject(generatedReport);
  const categoryScores = getCategoryScores(report);
  const recommendations = getRecommendations(report);
  const strengths = getStrengths(report);
  const developmentAreas = getDevelopmentAreas(report);
  const overallScore = getOverallScore(report);
  const classification = getClassification(report);
  const candidateName = getCandidateName(candidate, report);

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
            <p style={styles.loading}>Loading supervisor report...</p>
          </section>
        )}

        {!loading && errorMessage && (
          <section style={styles.errorCard}>
            <h2 style={styles.sectionTitle}>Report not loaded</h2>
            <p style={styles.errorText}>{errorMessage}</p>
            <p style={styles.mutedText}>
              The page compiled successfully, but the report API did not return
              data. Check the report API endpoint or candidate report data.
            </p>
          </section>
        )}

        {!loading && !errorMessage && (
          <>
            <section style={styles.grid}>
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Summary</h2>
                <p style={styles.bodyText}>
                  {safeText(
                    report.overallAssessment ||
                      report.summary ||
                      report.executiveSummary ||
                      report.interpretation,
                    "No written summary is available yet."
                  )}
                </p>
              </div>

              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Supervisor Implication</h2>
                <p style={styles.bodyText}>
                  {safeText(
                    report.supervisorImplication ||
                      report.supervisor_implication ||
                      report.recommendationSummary,
                    "No supervisor implication has been generated yet."
                  )}
                </p>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Category / Competency Scores</h2>
                <span style={styles.badge}>{categoryScores.length} items</span>
              </div>

              {categoryScores.length === 0 ? (
                <p style={styles.mutedText}>
                  No category or competency scores were found in the generated
                  report.
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

                {strengths.length === 0 ? (
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

                {developmentAreas.length === 0 ? (
                  <p style={styles.mutedText}>
                    No development areas available.
                  </p>
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
          </>
        )}
      </div>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

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

  loading: {
    margin: 0,
    color: "#344054",
    fontWeight: 600
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

import { useRouter } from "next/router";

// ======================================================
// SAFE HELPERS
// ======================================================

const safeArray = function (value) {
  return Array.isArray(value) ? value : [];
};

const safeObject = function (value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
};

const safeText = function (value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback || "Not available";
  }

  return String(value);
};

const safeNumber = function (value, fallback) {
  const defaultValue = fallback === undefined ? 0 : fallback;
  const number = Number(value);

  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return defaultValue;
  }

  return number;
};

const formatPercentage = function (value) {
  return safeNumber(value, 0) + "%";
};

const getCategoryScores = function (generatedReport) {
  const report = safeObject(generatedReport);

  if (Array.isArray(report.categoryScores)) {
    return report.categoryScores;
  }

  if (Array.isArray(report.category_scores)) {
    return report.category_scores;
  }

  if (Array.isArray(report.competencyScores)) {
    return report.competencyScores;
  }

  if (report.competencyScores && typeof report.competencyScores === "object") {
    return Object.values(report.competencyScores);
  }

  if (report.competency_scores && typeof report.competency_scores === "object") {
    return Object.values(report.competency_scores);
  }

  return [];
};

const getRecommendations = function (generatedReport) {
  const report = safeObject(generatedReport);

  if (Array.isArray(report.recommendations)) {
    return report.recommendations;
  }

  if (
    report.competencySummary &&
    Array.isArray(report.competencySummary.recommendations)
  ) {
    return report.competencySummary.recommendations;
  }

  if (
    report.competency_summary &&
    Array.isArray(report.competency_summary.recommendations)
  ) {
    return report.competency_summary.recommendations;
  }

  return [];
};

const getStrengths = function (generatedReport) {
  const report = safeObject(generatedReport);

  if (Array.isArray(report.strengths)) {
    return report.strengths;
  }

  if (Array.isArray(report.topStrengths)) {
    return report.topStrengths;
  }

  if (
    report.competencySummary &&
    Array.isArray(report.competencySummary.topStrengths)
  ) {
    return report.competencySummary.topStrengths;
  }

  return [];
};

const getDevelopmentAreas = function (generatedReport) {
  const report = safeObject(generatedReport);

  if (Array.isArray(report.developmentAreas)) {
    return report.developmentAreas;
  }

  if (Array.isArray(report.topDevelopmentNeeds)) {
    return report.topDevelopmentNeeds;
  }

  if (
    report.competencySummary &&
    Array.isArray(report.competencySummary.topDevelopmentNeeds)
  ) {
    return report.competencySummary.topDevelopmentNeeds;
  }

  return [];
};

const getOverallScore = function (generatedReport) {
  const report = safeObject(generatedReport);

  return (
    report.percentage ||
    report.overallPercentage ||
    report.overall_score ||
    report.score ||
    report.totalPercentage ||
    0
  );
};

const getClassification = function (generatedReport) {
  const report = safeObject(generatedReport);

  return (
    report.classification ||
    report.overallClassification ||
    report.performanceBand ||
    report.label ||
    "Not classified"
  );
};

const getCandidateName = function (candidate, generatedReport) {
  const c = safeObject(candidate);
  const report = safeObject(generatedReport);

  return (
    c.full_name ||
    c.name ||
    c.email ||
    report.candidateName ||
    report.candidate_name ||
    "Candidate"
  );
};

// ======================================================
// PAGE COMPONENT
// ======================================================

export default function SupervisorUserReportPage() {
  const router = useRouter();
  const userId = router.query.user_id;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  useEffect(
    function () {
      if (!userId) return;

      let isMounted = true;

      const loadSupervisorReport = async function () {
        setLoading(true);
