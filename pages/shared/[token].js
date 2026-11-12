// pages/shared/[token].js
// Public read-only report page for external sharing.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Head from "next/head";

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return value;
  }
}

export default function SharedReportPage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    if (!token) return;
    
    async function fetchReport() {
      try {
        const res = await fetch(`/api/shared/${token}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load report");
        }

        setReport(data.report);
        setExpiresAt(data.expires_at);
      } catch (err) {
        console.error("Shared report error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [token]);

  if (loading) {
    return (
      <div style={styles.centeredContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading secure report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centeredContainer}>
        <div style={styles.errorIcon}>✕</div>
        <h1 style={styles.errorTitle}>Report Unavailable</h1>
        <p style={styles.errorText}>{error}</p>
        <p style={styles.errorSub}>Please contact the person who shared this link with you for a new one.</p>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={styles.pageContainer}>
      <Head>
        <title>Assessment Report — Stratavax</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top Banner */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brand}>
            <Image src="/images/stratavax-logo.png" alt="Stratavax" width={32} height={32} />
            <span style={styles.brandName}>STRATAVAX</span>
          </div>
          <div style={styles.badge}>
            Shared Access
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Expiry notice */}
        {expiresAt && (
          <div style={styles.expiryNotice}>
            <span style={styles.expiryIcon}>⏳</span>
            <span>This secure link expires on <strong>{formatDate(expiresAt)}</strong>.</span>
          </div>
        )}

        {/* Report Header */}
        <div style={styles.reportHeader}>
          <div>
            <h1 style={styles.reportTitle}>Assessment Report</h1>
            <p style={styles.reportSubtitle}>Confidential Candidate Evaluation</p>
          </div>
          <div style={styles.scoreCircle}>
            <div style={styles.scoreValue}>{Math.round(report.overallScore)}%</div>
            <div style={styles.scoreLabel}>Overall</div>
          </div>
        </div>

        {/* Candidate Info */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Candidate Details</h2>
          <div style={styles.grid2}>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Name</span>
              <span style={styles.dataValue}>{report.candidate_name}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Email</span>
              <span style={styles.dataValue}>{report.candidate_email}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>University</span>
              <span style={styles.dataValue}>{report.university || "N/A"}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Programme</span>
              <span style={styles.dataValue}>{report.programme || "N/A"}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Preferred Department</span>
              <span style={styles.dataValue}>{report.preferred_department || "N/A"}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Completed On</span>
              <span style={styles.dataValue}>{formatDate(report.completed_at)}</span>
            </div>
          </div>
        </div>

        {/* Assessment Details */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Assessment Details</h2>
          <div style={styles.grid2}>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Assessment</span>
              <span style={styles.dataValue}>{report.assessment_title}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Type</span>
              <span style={styles.dataValue}>{report.assessment_type_name}</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Workplace Readiness</span>
              <span style={styles.dataValue}>{Math.round(report.workplace_readiness)}%</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Intellectual Capability</span>
              <span style={styles.dataValue}>{Math.round(report.intellectual_capability)}%</span>
            </div>
            <div style={styles.dataPoint}>
              <span style={styles.dataLabel}>Recommendation</span>
              <span style={{ 
                ...styles.dataValue, 
                color: report.recommendation?.includes('Recommended') ? '#16a34a' : 
                       report.recommendation === 'Reserve Pool' ? '#d97706' : '#64748b' 
              }}>
                {report.recommendation || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {report.category_scores && report.category_scores.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Category Breakdown</h2>
            <div style={styles.categoryList}>
              {report.category_scores.map((cat, idx) => {
                const score = Math.round(cat.percentage || cat.score || 0);
                return (
                  <div key={idx} style={styles.categoryRow}>
                    <div style={styles.categoryName}>{cat.category || cat.name}</div>
                    <div style={styles.progressBarContainer}>
                      <div style={{ ...styles.progressBarFill, width: `${score}%` }} />
                    </div>
                    <div style={styles.categoryValue}>{score}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>Generated securely by the Stratavax Talent Assessment Platform.</p>
      </footer>

      <style jsx global>{`
        body {
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media print {
          body { background: white; }
          header, footer, .expiryNotice { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          div[style*="box-shadow"] { box-shadow: none !important; border: 1px solid #e2e8f0; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageContainer: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  
  header: { background: "#0a1929", padding: "16px 24px" },
  headerContent: { maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandName: { color: "white", fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  badge: { background: "rgba(255,255,255,0.1)", color: "#ffd700", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,215,0,0.3)" },

  main: { flex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 24px", width: "100%", boxSizing: "border-box" },

  expiryNotice: { display: "flex", alignItems: "center", gap: 12, background: "rgba(59, 130, 246, 0.1)", color: "#1e40af", padding: "12px 16px", borderRadius: 8, fontSize: 14, marginBottom: 24, border: "1px solid rgba(59, 130, 246, 0.2)" },
  expiryIcon: { fontSize: 18 },

  reportHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  reportTitle: { fontSize: 28, fontWeight: 800, color: "#0a1929", margin: "0 0 8px 0" },
  reportSubtitle: { fontSize: 14, color: "#64748b", margin: 0 },
  scoreCircle: { width: 90, height: 90, borderRadius: "50%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(10,25,41,0.08)", border: "4px solid #6366f1" },
  scoreValue: { fontSize: 24, fontWeight: 800, color: "#0a1929", lineHeight: 1 },
  scoreLabel: { fontSize: 10, textTransform: "uppercase", fontWeight: 700, color: "#64748b", marginTop: 4 },

  card: { background: "white", borderRadius: 16, padding: "24px", boxShadow: "0 2px 8px rgba(10,25,41,0.04)", border: "1px solid #f1f5f9", marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#0a1929", margin: "0 0 20px 0", paddingBottom: 12, borderBottom: "1px solid #f1f5f9" },

  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 },
  dataPoint: { display: "flex", flexDirection: "column", gap: 4 },
  dataLabel: { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" },
  dataValue: { fontSize: 15, color: "#1e293b", fontWeight: 500 },

  categoryList: { display: "flex", flexDirection: "column", gap: 16 },
  categoryRow: { display: "flex", alignItems: "center", gap: 16 },
  categoryName: { width: 180, fontSize: 14, fontWeight: 500, color: "#334155" },
  progressBarContainer: { flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", background: "#6366f1", borderRadius: 4 },
  categoryValue: { width: 40, textAlign: "right", fontSize: 14, fontWeight: 700, color: "#0a1929" },

  centeredContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 20, textAlign: "center" },
  spinner: { width: 40, height: 40, border: "4px solid #e2e8f0", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 20 },
  loadingText: { fontSize: 16, color: "#64748b", fontWeight: 500 },
  errorIcon: { width: 64, height: 64, borderRadius: "50%", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  errorTitle: { fontSize: 24, fontWeight: 700, color: "#0a1929", margin: "0 0 12px 0" },
  errorText: { fontSize: 16, color: "#64748b", margin: "0 0 24px 0", maxWidth: 400 },
  errorSub: { fontSize: 14, color: "#94a3b8", margin: 0 },

  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: 13 },
};
