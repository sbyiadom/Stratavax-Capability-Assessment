// pages/admin/analytics/index.js
// Phase 6: Recruitment Analytics Dashboard.
// Displays aggregate KPIs for admin oversight.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/client";
import { useRequireAuth } from "../../../utils/requireAuth";
import AppLayout from "../../../components/AppLayout";
import Head from "next/head";

export default function AdminAnalytics() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState({
    totalCandidates: 0,
    newCandidatesLast30Days: 0,
    totalAssessments: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    recommendationRate: 0,
    activeSharedLinks: 0,
  });

  useEffect(() => {
    if (!session) return;
    fetchKPIs();
  }, [session]);

  async function fetchKPIs() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch("/api/admin/analytics/kpis", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load analytics");
      }

      setKpis(data.kpis);
    } catch (err) {
      console.error("Analytics error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleBack = () => {
    router.push("/admin");
  };

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading analytics...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <Head><title>Recruitment Analytics | Stratavax Admin</title></Head>
      
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>

        {/* Header Card (Fixed Contrast) */}
        <div style={styles.headerCard}>
          <h1 style={styles.title}>Recruitment Analytics</h1>
          <p style={styles.subtitle}>
            High-level KPIs and aggregate statistics across the entire Stratavax pipeline.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>{error}</span>
            <button onClick={fetchKPIs} style={styles.retryButton}>Retry</button>
          </div>
        )}

        {/* KPI Grid */}
        <div style={styles.kpiGrid}>
          {/* Card 1: Total Candidates */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Candidates</div>
            <div style={styles.kpiValue}>{kpis.totalCandidates.toLocaleString()}</div>
            <div style={styles.kpiSub}>Registered on platform</div>
          </div>

          {/* Card 2: New Candidates (30d) */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>New Candidates (30d)</div>
            <div style={styles.kpiValue}>
              {kpis.newCandidatesLast30Days > 0 ? `+${kpis.newCandidatesLast30Days}` : "0"}
            </div>
            <div style={styles.kpiSub}>Growth in the last 30 days</div>
          </div>

          {/* Card 3: Total Assessments */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Assessments Completed</div>
            <div style={styles.kpiValue}>{kpis.totalAssessments.toLocaleString()}</div>
            <div style={styles.kpiSub}>Total results generated</div>
          </div>

          {/* Card 4: Active Shared Links */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Active Shared Links</div>
            <div style={styles.kpiValue}>{kpis.activeSharedLinks}</div>
            <div style={styles.kpiSub}>Currently valid external links</div>
          </div>
        </div>

        <div style={styles.kpiGrid}>
          {/* Card 5: Average Score */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Average Score</div>
            <div style={styles.kpiValue}>{kpis.averageScore}%</div>
            <div style={styles.kpiSub}>Across all completed assessments</div>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, width: `${kpis.averageScore}%` }} />
            </div>
          </div>

          {/* Card 6: Recommendation Rate */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Recommendation Rate</div>
            <div style={styles.kpiValue}>{kpis.recommendationRate}%</div>
            <div style={styles.kpiSub}>Candidates Recommended or Higher</div>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, background: '#16a34a', width: `${kpis.recommendationRate}%` }} />
            </div>
          </div>

          {/* Card 7: Highest Score */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Highest Score</div>
            <div style={styles.kpiValue}>{kpis.highestScore}%</div>
            <div style={styles.kpiSub}>Top performing candidate</div>
          </div>

          {/* Card 8: Lowest Score */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Lowest Score</div>
            <div style={styles.kpiValue}>{kpis.lowestScore}%</div>
            <div style={styles.kpiSub}>Needs the most development</div>
          </div>
        </div>

        {/* Placeholder for future charts */}
        <div style={styles.chartPlaceholder}>
          <div style={styles.chartIcon}>📈</div>
          <h3 style={styles.chartTitle}>Score Distribution</h3>
          <p style={styles.chartSub}>A histogram of candidate scores will appear here in a future update.</p>
        </div>

      </div>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '20px'
  },
  // NEW FIXED HEADER CARD
  headerCard: {
    marginBottom: '30px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '24px 32px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 12px rgba(10, 25, 41, 0.05)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#991b1b'
  },
  retryButton: {
    padding: '4px 12px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  kpiCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  kpiLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },
  kpiValue: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#0a1929',
    lineHeight: 1,
    marginBottom: '8px'
  },
  kpiSub: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  progressBarContainer: {
    height: '6px',
    background: '#f1f5f9',
    borderRadius: '4px',
    marginTop: '12px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: '#6366f1',
    borderRadius: '4px',
    transition: 'width 0.5s ease'
  },
  chartPlaceholder: {
    background: 'white',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    border: '1px dashed #cbd5e1',
    marginBottom: '20px'
  },
  chartIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '8px'
  },
  chartSub: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  }
};

// Add keyframe animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
