// pages/admin/analytics/index.js
// Phase 6: Recruitment Analytics Dashboard with Charts + Funnel.

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/client";
import { useRequireAuth } from "../../../utils/requireAuth";
import AppLayout from "../../../components/AppLayout";
import Head from "next/head";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function AdminAnalytics() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState({
    totalCandidates: 0, newCandidatesLast30Days: 0, totalAssessments: 0,
    averageScore: 0, highestScore: 0, lowestScore: 0,
    recommendationRate: 0, activeSharedLinks: 0,
    chartData: [], recommendationData: [],
  });
  const [funnel, setFunnel] = useState({
    totalStarted: 0, completed: 0, inProgress: 0, abandoned: 0,
    completionRate: 0, avgEngagementMinutes: 0,
    abandonmentChart: [], dataHealth: { warning: false },
  });

  useEffect(() => {
    if (!session) return;
    fetchAll();
  }, [session]);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { setError("Not authenticated"); return; }

      const [kpiRes, funnelRes] = await Promise.all([
        fetch("/api/admin/analytics/kpis", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/analytics/funnel", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const kpiData = await kpiRes.json();
      const funnelData = await funnelRes.json();

      if (!kpiRes.ok || !kpiData.success) throw new Error(kpiData.error || "Failed to load KPIs");
      if (!funnelRes.ok || !funnelData.success) throw new Error(funnelData.error || "Failed to load funnel");

      setKpis(kpiData.kpis);
      setFunnel(funnelData.funnel);
    } catch (err) {
      console.error("Analytics error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleBack = () => router.push("/admin");

  // --- Bar chart (score distribution) ---
  const barChartData = useMemo(() => ({
    labels: (kpis.chartData || []).map(d => d.range),
    datasets: [{
      label: 'Number of Candidates',
      data: (kpis.chartData || []).map(d => d.count),
      backgroundColor: '#6366f1',
      borderRadius: 6,
      maxBarThickness: 60,
    }],
  }), [kpis.chartData]);

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(10, 25, 41, 0.9)', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 12 }, precision: 0 } },
    },
  };

  // --- Doughnut chart (recommendation breakdown) ---
  const doughnutData = useMemo(() => ({
    labels: (kpis.recommendationData || []).map(d => d.name),
    datasets: [{
      data: (kpis.recommendationData || []).map(d => d.value),
      backgroundColor: (kpis.recommendationData || []).map(d => d.color),
      borderWidth: 0, hoverOffset: 8,
    }],
  }), [kpis.recommendationData]);

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } } },
      tooltip: { backgroundColor: 'rgba(10, 25, 41, 0.9)', padding: 10, cornerRadius: 8 },
    },
  };

  // --- Funnel chart (abandonment by question range) ---
  const funnelChartData = useMemo(() => ({
    labels: (funnel.abandonmentChart || []).map(d => d.range),
    datasets: [{
      label: 'Candidates who stopped here',
      data: (funnel.abandonmentChart || []).map(d => d.count),
      backgroundColor: '#dc2626',
      borderRadius: 6,
      maxBarThickness: 40,
    }],
  }), [funnel.abandonmentChart]);

  const funnelChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(10, 25, 41, 0.9)', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 12 }, precision: 0 } },
    },
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
        <button onClick={handleBack} style={styles.backButton}>← Back to Dashboard</button>

        <div style={styles.headerCard}>
          <h1 style={styles.title}>Recruitment Analytics</h1>
          <p style={styles.subtitle}>
            High-level KPIs, funnel analysis, and aggregate statistics across the entire Stratavax pipeline.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span>{error}</span>
            <button onClick={fetchAll} style={styles.retryButton}>Retry</button>
          </div>
        )}

        {/* ============ FUNNEL SECTION ============ */}
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Assessment Completion Funnel</h2>
          <p style={styles.sectionSub}>
            Sessions started after {new Date(funnel.cutoffDate).toLocaleDateString()}.
          </p>
        </div>

        {funnel.dataHealth.warning && (
          <div style={styles.warningBanner}>
            ⚠️ <strong>Data health warning:</strong> {funnel.dataHealth.sessionsWithZeroTime} of {funnel.dataHealth.totalCompleted} completed sessions have no tracked engagement time. Averages may be affected.
          </div>
        )}

        <div style={styles.funnelStats}>
          <div style={styles.funnelStatCard}>
            <div style={styles.funnelStatLabel}>Started</div>
            <div style={styles.funnelStatValue}>{funnel.totalStarted}</div>
            <div style={styles.funnelStatSub}>Assessments opened</div>
          </div>
          <div style={styles.funnelArrow}>→</div>
          <div style={styles.funnelStatCard}>
            <div style={styles.funnelStatLabel}>Completed</div>
            <div style={{ ...styles.funnelStatValue, color: '#16a34a' }}>{funnel.completed}</div>
            <div style={styles.funnelStatSub}>{funnel.completionRate}% completion rate</div>
          </div>
          <div style={styles.funnelArrow}>+</div>
          <div style={styles.funnelStatCard}>
            <div style={styles.funnelStatLabel}>In Progress</div>
            <div style={{ ...styles.funnelStatValue, color: '#d97706' }}>{funnel.inProgress}</div>
            <div style={styles.funnelStatSub}>{funnel.abandoned} stale (24h+)</div>
          </div>
          <div style={styles.funnelArrow}>·</div>
          <div style={styles.funnelStatCard}>
            <div style={styles.funnelStatLabel}>Avg Engagement</div>
            <div style={styles.funnelStatValue}>{funnel.avgEngagementMinutes}<span style={styles.unit}>m</span></div>
            <div style={styles.funnelStatSub}>Per completed session</div>
          </div>
        </div>

        {/* Abandonment Chart */}
        {funnel.abandonmentChart && funnel.abandonmentChart.length > 0 && (
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Where Candidates Stop</h3>
            <p style={styles.chartSub}>Distribution of in-progress sessions by last-reached question.</p>
            <div style={styles.chartWrapper}>
              <Bar data={funnelChartData} options={funnelChartOptions} />
            </div>
          </div>
        )}

        {/* ============ KPI SECTION ============ */}
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Platform KPIs</h2>
        </div>

        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Candidates</div>
            <div style={styles.kpiValue}>{kpis.totalCandidates.toLocaleString()}</div>
            <div style={styles.kpiSub}>Registered on platform</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>New (30d)</div>
            <div style={styles.kpiValue}>{kpis.newCandidatesLast30Days > 0 ? `+${kpis.newCandidatesLast30Days}` : "0"}</div>
            <div style={styles.kpiSub}>Growth in last 30 days</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Assessments</div>
            <div style={styles.kpiValue}>{kpis.totalAssessments.toLocaleString()}</div>
            <div style={styles.kpiSub}>Total results generated</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Shared Links</div>
            <div style={styles.kpiValue}>{kpis.activeSharedLinks}</div>
            <div style={styles.kpiSub}>Currently active</div>
          </div>
        </div>

        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Average Score</div>
            <div style={styles.kpiValue}>{kpis.averageScore}%</div>
            <div style={styles.kpiSub}>Across all assessments</div>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, width: `${kpis.averageScore}%` }} />
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Recommendation Rate</div>
            <div style={styles.kpiValue}>{kpis.recommendationRate}%</div>
            <div style={styles.kpiSub}>Recommended or higher</div>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, background: '#16a34a', width: `${kpis.recommendationRate}%` }} />
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Highest Score</div>
            <div style={styles.kpiValue}>{kpis.highestScore}%</div>
            <div style={styles.kpiSub}>Top performer</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Lowest Score</div>
            <div style={styles.kpiValue}>{kpis.lowestScore}%</div>
            <div style={styles.kpiSub}>Needs most development</div>
          </div>
        </div>

        {/* ============ CHARTS SECTION ============ */}
        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Score Distribution</h3>
            <p style={styles.chartSub}>How candidate scores are spread across ranges.</p>
            <div style={styles.chartWrapper}>
              {kpis.chartData && kpis.chartData.length > 0 ? (
                <Bar data={barChartData} options={barChartOptions} />
              ) : (
                <div style={styles.chartEmpty}>No data yet</div>
              )}
            </div>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Recommendation Breakdown</h3>
            <p style={styles.chartSub}>How candidates were classified by the scoring engine.</p>
            <div style={styles.chartWrapper}>
              {kpis.recommendationData && kpis.recommendationData.some(d => d.value > 0) ? (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              ) : (
                <div style={styles.chartEmpty}>No data yet</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' },
  loadingSpinner: { width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #1a237e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  headerCard: {
    marginBottom: '30px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '24px 32px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 12px rgba(10, 25, 41, 0.05)',
  },
  title: { fontSize: '28px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: '0' },
  sectionHeader: { marginTop: '32px', marginBottom: '16px' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#0a1929', margin: '0 0 4px 0' },
  sectionSub: { fontSize: '13px', color: '#64748b', margin: 0 },
  warningBanner: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#92400e',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  funnelStats: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '24px',
  },
  funnelStatCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  funnelStatLabel: { fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  funnelStatValue: { fontSize: '28px', fontWeight: '800', color: '#0a1929', lineHeight: 1, marginBottom: '6px' },
  unit: { fontSize: '16px', marginLeft: '2px', fontWeight: '600' },
  funnelStatSub: { fontSize: '12px', color: '#94a3b8' },
  funnelArrow: { fontSize: '20px', color: '#94a3b8', fontWeight: '600' },
  errorBox: { background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991b1b' },
  retryButton: { padding: '4px 12px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  kpiCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  kpiLabel: { fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  kpiValue: { fontSize: '32px', fontWeight: '800', color: '#0a1929', lineHeight: 1, marginBottom: '8px' },
  kpiSub: { fontSize: '12px', color: '#94a3b8' },
  progressBarContainer: { height: '6px', background: '#f1f5f9', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' },
  progressBarFill: { height: '100%', background: '#6366f1', borderRadius: '4px', transition: 'width 0.5s ease' },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' },
  chartCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  chartTitle: { fontSize: '18px', fontWeight: '700', color: '#0a1929', margin: '0 0 4px 0' },
  chartSub: { fontSize: '14px', color: '#64748b', margin: 0 },
  chartWrapper: { width: '100%', height: '320px', marginTop: '20px', position: 'relative' },
  chartEmpty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
