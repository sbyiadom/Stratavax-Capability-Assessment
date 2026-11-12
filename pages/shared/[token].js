// pages/shared/[token].js
// Public read-only report page for external sharing.
// Renders the full StratavaxReport component.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Head from "next/head";
import StratavaxReport from "../../components/reports/StratavaxReport";

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
  const [reportData, setReportData] = useState(null);
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

        // Reconstruct the data shape expected by StratavaxReport
        const apiReport = data.report;
        
        const resultShape = {
          id: apiReport.id,
          percentage_score: apiReport.percentage_score,
          classification: apiReport.recommendation || 'Standard Profile',
          category_scores: apiReport.category_scores,
          completed_at: apiReport.completed_at,
          candidate_profiles: {
            full_name: apiReport.candidate_name,
            email: apiReport.candidate_email,
            university: apiReport.university,
            programme: apiReport.programme,
            graduation_year: apiReport.graduation_year,
            preferred_department: apiReport.preferred_department,
          },
          assessments: {
            title: apiReport.assessment_title,
            assessment_type: { name: apiReport.assessment_type_name }
          }
        };

        setReportData({ report: apiReport, result: resultShape });
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

  if (!reportData) return null;

  return (
    <div style={styles.pageContainer}>
      <Head>
        <title>Assessment Report — Stratavax</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top Header */}
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

      {/* Expiry Notice */}
      {expiresAt && (
        <div style={styles.expiryWrapper}>
          <div style={styles.expiryNotice}>
            <span style={styles.expiryIcon}>⏳</span>
            <span>This secure link expires on <strong>{formatDate(expiresAt)}</strong>.</span>
          </div>
        </div>
      )}

      {/* Full Report Render */}
      <main style={styles.main}>
        <StratavaxReport
          result={reportData.result}
          candidate={reportData.result.candidate_profiles}
          assessment={reportData.result.assessments}
          behavioralMatrix={reportData.report.report_data?.behavioralMatrix || null}
          onBack={null}
        />
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
          header, footer, div[style*="expiryNotice"] { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageContainer: { minHeight: "100vh", display: "flex", flexDirection: "column" },
  
  header: { background: "#0a1929", padding: "16px 24px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
  headerContent: { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandName: { color: "white", fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  badge: { background: "rgba(255,255,255,0.1)", color: "#ffd700", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,215,0,0.3)" },

  expiryWrapper: { maxWidth: 1200, margin: "0 auto", width: "100%", padding: "16px 24px 0" },
  expiryNotice: { display: "flex", alignItems: "center", gap: 12, background: "rgba(59, 130, 246, 0.1)", color: "#1e40af", padding: "12px 16px", borderRadius: 8, fontSize: 14, border: "1px solid rgba(59, 130, 246, 0.2)" },
  expiryIcon: { fontSize: 18 },

  main: { flex: 1, width: "100%" },

  centeredContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 20, textAlign: "center" },
  spinner: { width: 40, height: 40, border: "4px solid #e2e8f0", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 20 },
  loadingText: { fontSize: 16, color: "#64748b", fontWeight: 500 },
  errorIcon: { width: 64, height: 64, borderRadius: "50%", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  errorTitle: { fontSize: 24, fontWeight: 700, color: "#0a1929", margin: "0 0 12px 0" },
  errorText: { fontSize: 16, color: "#64748b", margin: "0 0 24px 0", maxWidth: 400 },
  errorSub: { fontSize: 14, color: "#94a3b8", margin: 0 },

  footer: { textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: 13 },
};
