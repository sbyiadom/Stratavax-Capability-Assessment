// pages/supervisor/[user_id].js - APPROACH 1.5 + RISK LEVEL FIX
// Keeps the hero banner, score panel, and action buttons from the original
// supervisor report design. Replaces the tab content with <StratavaxReport />
// so that the supervisor path, admin path, and any other report reader see
// the same section cards, hand-authored narratives, and behavioural matrix.
//
// 2026-10-02: Risk level resolution fix — no hardcoded 'Medium' fallback.
// Phase 8 (2026-10-03): local getTone/getToneLabel/getToneColor deleted.
//   Now delegates to utils/scoring.getClassificationDetailsFromPercentage.
//   This was the fifth copy of the band table in the codebase; it now
//   uses the shared one.

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import ResetAssessmentButton from "../../components/ResetAssessmentButton";
import StratavaxReport from "../../components/reports/StratavaxReport";
import {
  getClassificationDetailsFromPercentage,
  calculateResultScore,
  toNumber,
} from "../../utils/scoring";

// ============================================================
// RISK LEVEL RESOLUTION
// Prefer the DB column (result.risk_level). Fall back to the report object's
// copy, then to the proctoring summary, then to a value derived from
// risk_score. Never return a hardcoded default like 'Medium'.
// ============================================================
function resolveRiskLevel(result, report, proctoringData) {
  const fromResult = result?.risk_level || result?.riskLevel;
  const fromReport = report?.riskLevel || report?.risk_level;
  const fromProctoring = proctoringData?.summary?.riskLevel || proctoringData?.summary?.risk_level;

  const candidate = fromResult || fromReport || fromProctoring;
  if (typeof candidate === 'string' && candidate.trim() !== '') {
    return candidate;
  }

  const score = Number(
    result?.risk_score ??
    report?.riskScore ??
    proctoringData?.summary?.riskScore
  );
  if (Number.isFinite(score)) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  return 'Not available';
}

// ============================================================
// HELPERS
// ============================================================
function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  return toNumber(value, fallback);
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

function isValidUUID(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

// Band-derived colour and gradient, shared band table.
function getToneColor(score) {
  return getClassificationDetailsFromPercentage(score).color;
}

function getToneGradient(score) {
  const band = getClassificationDetailsFromPercentage(score).band;
  if (band === "exceptional") return "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)";
  if (band === "strong") return "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)";
  if (band === "adequate") return "linear-gradient(135deg, #4338ca 0%, #8b5cf6 100%)";
  if (band === "developing") return "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)";
  if (band === "priority_development") return "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)";
  return "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)";
}

function getToneLabel(score) {
  return getClassificationDetailsFromPercentage(score).label;
}

function getBadgeStyle(value) {
  const text = safeText(value, "").toLowerCase();
  if (text.includes("critical") || text.includes("high")) return styles.badgeCritical;
  if (text.includes("elevated") || text.includes("risk") || text.includes("develop") || text.includes("medium")) return styles.badgeWarm;
  if (text.includes("low") || text.includes("strong") || text.includes("excellent")) return styles.badgeGood;
  return styles.badgeNeutral;
}

function ProgressBar({ value, color }) {
  const v = Math.max(0, Math.min(100, safeNumber(value, 0)));
  return (
    <div style={styles.progressTrack}>
      <div style={{ width: v + "%", height: "100%", borderRadius: 999, background: color || getToneColor(v) }} />
    </div>
  );
}

// ============================================================
// EXTRACT BEHAVIORAL DATA — for the matrix summary on the hero panel
// ============================================================
function extractBehavioralData(report) {
  const proctoring = report?.proctoring_data || {};
  const summary = proctoring?.summary || {};
  const behavioral = report?.report_data?.behavioral || {};

  const MAX_REASONABLE_SECONDS = 8 * 60 * 60;
  const isTimeAbnormal =
    summary.isTimeAbnormal ||
    behavioral.isTimeAbnormal ||
    summary.duration > MAX_REASONABLE_SECONDS ||
    behavioral.totalTime > MAX_REASONABLE_SECONDS;

  const totalTime = summary.duration || behavioral.totalTime || 0;
  let totalTimeFormatted = summary.durationFormatted || behavioral.totalTimeFormatted || '00:00:00';
  let avgTimePerQuestion = summary.avgTimePerQuestion || behavioral.avgTimePerQuestion || '0s';

  if (isTimeAbnormal || totalTime > MAX_REASONABLE_SECONDS) {
    totalTimeFormatted = '> 8 hrs (session left open)';
    avgTimePerQuestion = 'N/A';
  }

  return {
    totalTime: totalTime,
    totalTimeFormatted: totalTimeFormatted,
    avgTimePerQuestion: avgTimePerQuestion,
    answerChanges: summary.answerChanges || behavioral.answerChanges || 0,
    tabSwitches: summary.tabSwitches || behavioral.tabSwitches || 0,
    violations: summary.totalViolations || behavioral.violations || 0,
    copyPasteAttempts: summary.copyPasteAttempts || behavioral.copyPasteAttempts || 0,
    rightClickAttempts: summary.rightClickAttempts || behavioral.rightClickAttempts || 0,
    externalUrlsVisited: summary.externalUrlsVisited || behavioral.externalUrlsVisited || 0,
    riskLevel: summary.riskLevel || behavioral.riskLevel || 'low',
    riskScore: summary.riskScore || behavioral.riskScore || 0,
    isTimeAbnormal: isTimeAbnormal || totalTime > MAX_REASONABLE_SECONDS
  };
}

// ============================================================
// AUTH HELPER
// ============================================================
async function ensureValidSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session) {
    console.error('[Supervisor Report] No valid session');
    return null;
  }
  return sessionData.session;
}

// ============================================================
// PAGE
// ============================================================
export default function SupervisorUserReportPage() {
  const router = useRouter();
  const userId = router.query.user_id;
  const assessmentId = router.query.assessment || router.query.assessment_id;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [report, setReport] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    if (!userId) return;

    if (!isValidUUID(userId)) {
      setErrorMessage("Invalid report URL. This page expects a candidate UUID in the path.");
      setLoading(false);
      return;
    }

    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, userId, assessmentId]);

  async function loadReport() {
    setLoading(true);
    setErrorMessage("");
    setCandidate(null);
    setAssessment(null);
    setReport(null);
    setPdfError("");

    if (!isValidUUID(userId)) {
      setErrorMessage("Invalid report URL. This page expects a candidate UUID in the path.");
      setLoading(false);
      return;
    }

    try {
      const session = await ensureValidSession();
      if (!session) {
        setErrorMessage('Please sign in to view this report.');
        setLoading(false);
        return;
      }

      const token = session.access_token;
      if (!token) {
        setErrorMessage('Unauthorized: No valid access token found. Please sign in again.');
        setLoading(false);
        return;
      }

      const url = `/api/supervisor/reports?user_id=${userId}${assessmentId ? `&assessment_id=${assessmentId}` : ''}`;
      console.log("[Supervisor Report] Fetching from URL:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("[Supervisor Report] Invalid API response:", parseError);
        setErrorMessage(`The report server returned an invalid response. HTTP status: ${response.status}`);
        setLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        if (response.status === 401) {
          setErrorMessage(data?.error || 'Your session is invalid or has expired. Please sign in again.');
          setLoading(false);
          return;
        }
        if (response.status === 403) {
          setErrorMessage(data?.error || 'You do not have permission to view this report.');
          setLoading(false);
          return;
        }
        setErrorMessage(data?.error || data?.message || `Failed to load report. HTTP status: ${response.status}`);
        setLoading(false);
        return;
      }

      // Single report path (assessment_id provided)
      if (assessmentId && data.generatedReport) {
        const loadedReport = data.generatedReport;
        const loadedCandidate = data.candidate || null;
        const loadedAssessment = data.assessment || null;

        if (!loadedReport) {
          setErrorMessage("No report data found for this assessment.");
          setLoading(false);
          return;
        }

        setCandidate(decodeDeep(loadedCandidate));
        setAssessment(decodeDeep(loadedAssessment));
        setReport(decodeDeep(loadedReport));
        setLoading(false);
        return;
      }

      // List format
      const reports = data.reports || [];
      const candidates = data.candidates || [];
      const loadedCandidate = candidates.find(c => c.id === userId) || null;

      let loadedReport = null;
      if (assessmentId) {
        loadedReport = reports.find(r => r.assessment_id === assessmentId) || null;
      }
      if (!loadedReport && reports.length > 0) {
        loadedReport = reports[0];
      }

      if (!loadedReport) {
        setErrorMessage("No report data found for this candidate.");
        setLoading(false);
        return;
      }

      const loadedAssessment = {
        id: loadedReport.assessment_id,
        title: loadedReport.assessment_title || 'Assessment',
      };

      setCandidate(decodeDeep(loadedCandidate));
      setAssessment(decodeDeep(loadedAssessment));
      setReport(decodeDeep(loadedReport));
      setLoading(false);
    } catch (error) {
      console.error("[Supervisor Report] Load error:", error);
      setErrorMessage(error?.message || "Something went wrong while loading the report.");
      setLoading(false);
    }
  }

  async function downloadPdfReport() {
    if (!userId || !assessmentId) {
      setPdfError("Cannot generate PDF because candidate ID or assessment ID is missing.");
      return;
    }

    setPdfLoading(true);
    setPdfError("");

    try {
      const session = await ensureValidSession();
      if (!session) {
        setPdfError("Please sign in to download the report.");
        setPdfLoading(false);
        return;
      }

      const token = session.access_token;

      const response = await fetch("/api/generate-pdf-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, assessmentId })
      });

      if (!response.ok) {
        let errorData = null;
        try { errorData = await response.json(); } catch (e) { errorData = null; }
        setPdfError(errorData?.message || errorData?.error || "PDF generation failed. Please try again.");
        setPdfLoading(false);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = safeText(candidate?.full_name || report?.candidateName || "Candidate", "Candidate").replace(/[^a-zA-Z0-9_-]+/g, "_");
      link.href = downloadUrl;
      link.download = fileName + "_supervisor_report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setPdfLoading(false);
    } catch (error) {
      setPdfError(error?.message || "PDF generation failed. Please try again.");
      setPdfLoading(false);
    }
  }

  // ============================================================
  // DERIVED VALUES
  // ============================================================
  const cleanReport = safeObject(decodeDeep(report));

  const candidateName = cleanReport.candidateName || candidate?.full_name || candidate?.email || "Candidate";
  const assessmentName = cleanReport.assessmentName || assessment?.title || "Assessment";

  // Phase 8: shared score resolver — same function every other page uses.
  const scoreInfo = calculateResultScore(cleanReport);
  const overallScore = scoreInfo.percentage;
  const classification = cleanReport.classification || cleanReport.overallClassification || scoreInfo.classification || "Not classified";

  const riskLevel = resolveRiskLevel(
    cleanReport,
    cleanReport,
    cleanReport?.proctoring_data
  );

  const responseCount = cleanReport.responseCount || cleanReport.answered_questions || 0;

  const scoreColor = scoreInfo.color;
  const scoreGradient = getToneGradient(overallScore);

  const behavioralData = extractBehavioralData(cleanReport);
  const behavioralMetrics = {
    totalTime: behavioralData.totalTimeFormatted,
    avgTimePerQuestion: behavioralData.avgTimePerQuestion,
    answerChanges: behavioralData.answerChanges,
    tabSwitches: behavioralData.tabSwitches,
    violations: behavioralData.violations,
    copyPasteAttempts: behavioralData.copyPasteAttempts,
    rightClickAttempts: behavioralData.rightClickAttempts,
    riskLevel: behavioralData.riskLevel,
    riskScore: behavioralData.riskScore,
    isTimeAbnormal: behavioralData.isTimeAbnormal
  };

  // ============================================================
  // LOADING / ERROR STATES
  // ============================================================
  if (loading) {
    return (
      <AppLayout>
        <div style={styles.page}>
          <div style={styles.backgroundBlobOne} />
          <div style={styles.backgroundBlobTwo} />
          <div style={styles.container}>
            <section style={styles.sectionShell}>
              <div style={styles.loadingBar}><div style={styles.loadingPulse} /></div>
              <p style={styles.bodyText}>Loading supervisor report...</p>
            </section>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (errorMessage) {
    return (
      <AppLayout>
        <div style={styles.page}>
          <div style={styles.backgroundBlobOne} />
          <div style={styles.backgroundBlobTwo} />
          <div style={styles.container}>
            <section style={styles.errorCard}>
              <h2 style={styles.sectionTitle}>Report not loaded</h2>
              <p style={styles.errorText}>{errorMessage}</p>
              <p style={styles.mutedText}>The supervisor page loaded, but the report API did not return report data.</p>
              <button onClick={() => router.push("/supervisor")} style={styles.backButton}>Back to Dashboard</button>
            </section>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!report) {
    return (
      <AppLayout>
        <div style={styles.page}>
          <div style={styles.backgroundBlobOne} />
          <div style={styles.backgroundBlobTwo} />
          <div style={styles.container}>
            <section style={styles.errorCard}>
              <h2 style={styles.sectionTitle}>No Report Found</h2>
              <p style={styles.errorText}>No assessment report found for this candidate.</p>
              <button onClick={() => router.push("/supervisor")} style={styles.backButton}>Back to Dashboard</button>
            </section>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ============================================================
  // SUCCESS RENDER
  // ============================================================
  return (
    <AppLayout>
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
                <p style={styles.heroMeta}>Assessment ID: {safeText(assessmentId, "Not available")}</p>
              </div>

              <div style={styles.scorePanel}>
                <p style={styles.scorePanelLabel}>Overall Score</p>
                <p style={{ ...styles.scorePanelValue, color: scoreColor }}>{formatPercentage(overallScore)}</p>
                <ProgressBar value={overallScore} color={scoreColor} />
                <div style={styles.scorePanelFooter}>
                  <span style={styles.classificationBadge}>{classification}</span>
                  <span style={styles.classificationBadge}>{scoreInfo.label}</span>
                  <span style={getBadgeStyle(riskLevel)}>{riskLevel}</span>
                </div>
                <p style={styles.scorePanelMeta}>Responses: {safeNumber(responseCount, 0)}</p>

                <div style={{ marginTop: '12px' }}>
                  <ResetAssessmentButton
                    candidateId={userId}
                    assessmentId={assessmentId}
                    assessmentName={assessmentName}
                    candidateName={candidateName}
                    onReset={loadReport}
                    variant="button"
                  />
                </div>

                <button
                  type="button"
                  style={pdfLoading ? styles.buttonDisabled : styles.downloadButton}
                  onClick={downloadPdfReport}
                  disabled={pdfLoading || loading}
                >
                  {pdfLoading ? "Generating PDF..." : "Download PDF"}
                </button>
                {pdfError ? <p style={styles.pdfError}>{pdfError}</p> : null}
              </div>
            </div>
          </header>

          <div style={styles.reportSection}>
            <StratavaxReport
              result={cleanReport}
              candidate={candidate}
              assessment={assessment}
              onBack={() => router.push(`/supervisor/${userId}`)}
              behavioralMatrix={null}
              loadingBehavioral={false}
            />
          </div>

          <section style={styles.behavioralMatrixSection}>
            <h3 style={styles.matrixTitle}>🧠 Behavioral Matrix</h3>

            <div style={styles.matrixTableWrapper}>
              <table style={styles.matrixTable}>
                <thead>
                  <tr>
                    <th style={styles.matrixTh}>TOTAL TIME</th>
                    <th style={styles.matrixTh}>AVG TIME PER QUESTION</th>
                    <th style={styles.matrixTh}>ANSWER CHANGES</th>
                    <th style={styles.matrixTh}>TAB SWITCHES</th>
                    <th style={styles.matrixTh}>VIOLATIONS</th>
                    <th style={styles.matrixTh}>COPY/PASTE</th>
                    <th style={styles.matrixTh}>RIGHT-CLICK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.matrixTd}>{behavioralMetrics.totalTime}</td>
                    <td style={styles.matrixTd}>{behavioralMetrics.avgTimePerQuestion}</td>
                    <td style={styles.matrixTd}>{behavioralMetrics.answerChanges}</td>
                    <td style={styles.matrixTd}>{behavioralMetrics.tabSwitches}</td>
                    <td style={styles.matrixTd}>{behavioralMetrics.violations}</td>
                    <td style={styles.matrixTd}>{behavioralMetrics.copyPasteAttempts}</td>
                    <td style={styles.matrixTd}>{behavioralMetrics.rightClickAttempts}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={styles.matrixFooter}>
              <span style={styles.matrixRisk}>
                Risk Level: <strong style={{
                  color: behavioralMetrics.riskLevel === 'high' ? '#dc2626' :
                         behavioralMetrics.riskLevel === 'medium' ? '#f59e0b' : '#16a34a'
                }}>
                  {behavioralMetrics.riskLevel.charAt(0).toUpperCase() + behavioralMetrics.riskLevel.slice(1)}
                </strong>
                {' '}(Score: {behavioralMetrics.riskScore})
                {behavioralMetrics.isTimeAbnormal && (
                  <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '11px' }}>
                    ⚠️ Session left open
                  </span>
                )}
              </span>
              <span style={styles.matrixFlags}>
                Behavioral flags: {behavioralMetrics.violations} violation(s), {behavioralMetrics.tabSwitches} tab switch(es), {behavioralMetrics.answerChanges} answer change(s).
              </span>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "28px 16px 48px",
    color: "#172033",
    position: "relative",
    overflow: "hidden",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },
  backgroundBlobOne: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "999px",
    background: "rgba(20, 184, 166, 0.18)",
    top: "-160px",
    right: "-120px",
    filter: "blur(10px)",
  },
  backgroundBlobTwo: {
    position: "absolute",
    width: "360px",
    height: "360px",
    borderRadius: "999px",
    background: "rgba(79, 70, 229, 0.12)",
    bottom: "-160px",
    left: "-120px",
    filter: "blur(12px)",
  },
  container: { maxWidth: "1220px", margin: "0 auto", position: "relative", zIndex: 1 },
  hero: {
    borderRadius: "30px",
    padding: "30px",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
    marginBottom: "20px",
    color: "#ffffff",
  },
  heroContent: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 310px",
    gap: "24px",
    alignItems: "stretch",
  },
  heroTextBlock: { display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "230px" },
  heroBadge: {
    display: "inline-flex",
    width: "fit-content",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.18)",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "14px",
  },
  heroTitle: { margin: 0, fontSize: "44px", lineHeight: 1.1, color: "#ffffff", textShadow: "0 2px 18px rgba(0,0,0,0.15)" },
  heroSubtitle: { margin: "14px 0 0", fontSize: "17px", color: "rgba(255,255,255,0.9)" },
  heroMeta: { margin: "8px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.78)", overflowWrap: "anywhere" },
  scorePanel: {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(255,255,255,0.55)",
    borderRadius: "24px",
    padding: "22px",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
    color: "#172033",
  },
  scorePanelLabel: { margin: 0, color: "#667085", fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" },
  scorePanelValue: { margin: "10px 0 10px", fontSize: "48px", lineHeight: 1, fontWeight: 900 },
  scorePanelFooter: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "14px" },
  scorePanelMeta: { margin: "12px 0 0", color: "#667085", fontSize: "13px" },
  classificationBadge: {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#f2f4f7",
    color: "#344054",
    fontSize: "12px",
    fontWeight: 900,
  },
  downloadButton: {
    marginTop: "16px",
    width: "100%",
    border: 0,
    borderRadius: "14px",
    padding: "13px 14px",
    background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "14px",
    boxShadow: "0 12px 26px rgba(15, 118, 110, 0.28)",
  },
  buttonDisabled: {
    marginTop: "16px",
    width: "100%",
    border: 0,
    borderRadius: "14px",
    padding: "13px 14px",
    background: "#98a2b3",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "not-allowed",
    fontSize: "14px",
  },
  pdfError: { margin: "10px 0 0", color: "#b42318", fontSize: "12px", lineHeight: 1.4 },
  progressTrack: { width: "100%", height: "10px", borderRadius: "999px", background: "#e4e7ec", overflow: "hidden" },
  reportSection: {
    background: "rgba(255,255,255,0.95)",
    borderRadius: "24px",
    padding: "8px",
    marginBottom: "18px",
    boxShadow: "0 18px 48px rgba(16, 24, 40, 0.07)",
  },
  sectionShell: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #eaecf0",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 18px 48px rgba(16, 24, 40, 0.07)",
    marginBottom: "18px",
  },
  sectionTitle: { margin: 0, fontSize: "22px", color: "#101828" },
  bodyText: { margin: "0 0 12px", color: "#344054", lineHeight: 1.7, fontSize: "15px" },
  mutedText: { margin: "8px 0 0", color: "#667085", lineHeight: 1.6, fontSize: "14px" },
  loadingBar: { height: "10px", borderRadius: "999px", overflow: "hidden", background: "#e4e7ec", marginBottom: "14px" },
  loadingPulse: { height: "100%", width: "45%", borderRadius: "999px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)" },
  errorCard: {
    background: "#fff5f5",
    borderRadius: "24px",
    padding: "24px",
    border: "1px solid #fecaca",
    marginBottom: "18px",
    textAlign: "center",
  },
  errorText: { margin: "10px 0", color: "#b42318", fontWeight: 900 },
  backButton: {
    padding: "10px 24px",
    background: "#0a1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "16px",
  },
  badgeNeutral: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "7px 11px",
    background: "#eef4ff",
    color: "#3538cd",
    fontWeight: 900,
    fontSize: "12px",
  },
  badgeWarm: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "7px 11px",
    background: "#fff7ed",
    color: "#c2410c",
    fontWeight: 900,
    fontSize: "12px",
  },
  badgeGood: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "7px 11px",
    background: "#ecfdf3",
    color: "#027a48",
    fontWeight: 900,
    fontSize: "12px",
  },
  badgeCritical: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "7px 11px",
    background: "#fef3f2",
    color: "#b42318",
    fontWeight: 900,
    fontSize: "12px",
  },
  behavioralMatrixSection: {
    background: "white",
    borderRadius: "12px",
    padding: "16px 20px",
    marginTop: "18px",
    marginBottom: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  matrixTitle: { fontSize: "14px", fontWeight: 600, color: "#0a1929", margin: "0 0 12px 0" },
  matrixTableWrapper: { overflowX: "auto", marginBottom: "10px" },
  matrixTable: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "600px" },
  matrixTh: {
    textAlign: "left",
    padding: "8px 10px",
    background: "#f8fafc",
    borderBottom: "2px solid #0a1929",
    fontWeight: 600,
    color: "#0a1929",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
  },
  matrixTd: {
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "#2d3748",
    fontSize: "13px",
    fontWeight: 500,
  },
  matrixFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "10px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "8px",
  },
  matrixRisk: { fontSize: "13px", fontWeight: 500, color: "#475569" },
  matrixFlags: { fontSize: "13px", color: "#64748b" },
};
