// pages/admin/analytics/index.js
// Phase 6: Recruitment Analytics Dashboard with Chart.js.

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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
    chartData: [],
    recommendationData: [],
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

  // ---------- Prepare Chart.js Data ----------
  const barChartData = useMemo(() => ({
    labels: (kpis.chartData || []).map(d => d.range),
    datasets: [
      {
        label: 'Number of Candidates',
        data: (kpis.chartData || []).map(d => d.count),
        backgroundColor: '#6366f1',
        borderRadius: 6,
        maxBarThickness: 60,
      }
    ]
  }), [kpis.chartData]);

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 25, 41, 0.9)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 12 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { size: 12 }, precision: 0 }
      }
    }
  };

  const doughnutData = useMemo(() => ({
    labels: (kpis.recommendationData || []).map(d => d.name),
    datasets: [
      {
        data: (kpis.recommendationData || []).map(d => d.value),
        backgroundColor: (kpis.recommendationData || []).map(d => d.color),
        borderWidth: 0,
        hoverOffset: 8,
      }
    ]
  }), [kpis.recommendationData]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 25, 41, 0.9)',
        padding: 10,
        cornerRadius: 8,
      }
    }
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

        {/* KPI Grid - Row 1 */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Candidates</div>
            <div style={styles.kpiValue}>{kpis.totalCandidates.toLocaleString()}</div>
            <div style={styles.kpiSub}>Registered on platform</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>New Candidates (30d)</div>
            <div style={styles.kpiValue}>
              {kpis.newCandidatesLast30Days > 0 ? `+${kpis.newCandidatesLast30Days}` : "0"}
            </div>
            <div style={styles.kpiSub}>Growth in the last 30 days</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Assessments Completed</div>
            <div style={styles.kpiValue}>{kpis.totalAssessments.toLocaleString()}</div>
            <div style={styles.kpiSub}>Total results generated</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Active Shared Links</div>
            <div style={styles.kpiValue}>{kpis.activeSharedLinks}</div>
            <div style={styles.kpiSub}>Currently valid external links</div>
          </div>
        </div>

        {/* KPI Grid - Row 2 */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Average Score</div>
            <div style={styles.kpiValue}>{kpis.averageScore}%</div>
            <div style={styles.kpiSub}>Across all completed assessments</div>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, width: `${kpis.averageScore}%` }} />
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Recommendation Rate</div>
            <div style={styles.kpiValue}>{kpis.recommendationRate}%</div>
            <div style={styles.kpiSub}>Candidates Recommended or Higher</div>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, background: '#16a34a', width: `${kpis.recommendationRate}%` }} />
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Highest Score</div>
            <div style={styles.kpiValue}>{kpis.highestScore}%</div>
            <div style={styles.kpiSub}>Top performing candidate</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Lowest Score</div>
            <div style={styles.kpiValue}>{kpis.lowestScore}%</div>
            <div style={styles.kpiSub}>Needs the most development</div>
          </div>
        </div>

        {/* 📊 Charts Section */}
        <div style={styles.chartsGrid}>
          {/* Score Distribution Bar Chart */}
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

          {/* Recommendation Breakdown Doughnut Chart */}
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
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  chartCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 4px 0'
  },
  chartSub: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  chartWrapper: {
    width: '100%',
    height: '320px',
    marginTop: '20px',
    position: 'relative',
  },
  chartEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
    fontSize: '14px',
    fontStyle: 'italic',
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
