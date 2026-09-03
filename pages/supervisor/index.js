// pages/supervisor/index.js - COMPLETE FIXED
// Dashboard only shows summary stats and charts
// ADDED: Reset Assessment button in Quick Navigation

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';
import ResetAssessmentButton from '../../components/ResetAssessmentButton';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ============================================================
// HELPER FUNCTIONS WITH NORMALIZATION
// ============================================================

function getUniversityKey(university) {
  if (!university || university === 'Not Specified' || university === '') return 'Not Specified';
  
  const normalized = university
    .toLowerCase()
    .replace(/university of /g, '')
    .replace(/technical university/g, 'Tech Uni')
    .replace(/university/g, 'Uni')
    .trim();
  
  const mapping = {
    'kwame nkrumah university of science and technology': 'KNUST',
    'kwame nkrumah uni of science and tech': 'KNUST',
    'knust': 'KNUST',
    'accra technical university': 'Accra Technical University',
    'accra tech uni': 'Accra Technical University',
    'kumasi technical university': 'Kumasi Technical University',
    'kumasi tech uni': 'Kumasi Technical University',
    'university of mines and technology': 'University of Mines and Technology',
    'university of mines & technology': 'University of Mines and Technology',
    'u mat': 'University of Mines and Technology',
    'koforidua technical university': 'Koforidua Technical University',
    'koforidua tech uni': 'Koforidua Technical University',
    'regional maritime university': 'Regional Maritime University',
    'regional maritime uni': 'Regional Maritime University',
    'sunyani technical university': 'Sunyani Technical University',
    'sunyani tech uni': 'Sunyani Technical University',
    'cape coast technical university': 'Cape Coast Technical University',
    'ho technical university': 'Ho Technical University',
    'university of energy and natural resources': 'University of Energy and Natural Resources',
    'uenr': 'University of Energy and Natural Resources',
    'university of ghana': 'University of Ghana',
    'ug': 'University of Ghana',
    'university of cape coast': 'University of Cape Coast',
    'ucc': 'University of Cape Coast',
  };
  
  return mapping[normalized] || university;
}

function getProgramKey(program) {
  if (!program || program === 'Not Specified' || program === '') return 'Not Specified';
  
  const normalized = program
    .toLowerCase()
    .replace(/bsc/g, 'BSc')
    .replace(/b.sc/g, 'BSc')
    .replace(/bachelor/g, 'BSc')
    .replace(/btech/g, 'B-Tech')
    .replace(/b.tech/g, 'B-Tech')
    .replace(/b-tech/g, 'B-Tech')
    .replace(/hnd/g, 'HND')
    .replace(/engineering/g, 'Eng')
    .replace(/eng/g, 'Eng')
    .trim();
  
  const mapping = {
    'mechanical engineering': 'BSc Mechanical Engineering',
    'mechanical eng': 'BSc Mechanical Engineering',
    'mech eng': 'BSc Mechanical Engineering',
    'electrical engineering': 'B-Tech Electrical and Electronics Engineering',
    'electrical eng': 'B-Tech Electrical and Electronics Engineering',
    'telecommunication engineering': 'Telecommunication Engineering',
    'telecom eng': 'Telecommunication Engineering',
    'chemical engineering': 'Chemical Engineering',
    'chemical eng': 'Chemical Engineering',
    'agricultural engineering': 'BSc Agricultural Engineering',
    'agric eng': 'BSc Agricultural Engineering',
    'mechanical engineering plant option': 'Mechanical Engineering Plant Option',
    'mechanical eng plant': 'Mechanical Engineering Plant Option',
  };
  
  return mapping[normalized] || normalized;
}

function calculateScore(report) {
  // Behavioral & Soft Skills: use percentage_score
  if (report.assessment_id === '671bf00f-46cc-46f5-a217-d5a90dafb9b6' ||
      report.assessment_title === 'Behavioral & Soft Skills') {
    if (report.percentage_score) return Number(report.percentage_score);
  }
  
  // All other assessments: use category_scores
  const categoryScores = report.category_scores || report.report_data?.categoryScores || [];
  if (Array.isArray(categoryScores) && categoryScores.length > 0) {
    const validScores = categoryScores
      .map(cat => Number(cat.percentage || cat.score || 0))
      .filter(score => score > 0 && score <= 100);
    if (validScores.length > 0) {
      return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    }
  }
  
  if (report.percentage_score) {
    const val = Number(report.percentage_score);
    if (val > 0 && val <= 100) return val;
  }
  
  if (report.total_score !== undefined && report.max_score !== undefined) {
    const total = Number(report.total_score);
    const max = Number(report.max_score);
    if (max > 0) {
      const calc = Math.round((total / max) * 100);
      if (calc >= 0 && calc <= 100) return calc;
    }
  }
  
  return 0;
}

function calculateNationalServiceRecommendation(score) {
  const s = Number(score || 0);
  if (s >= 85) return 'Highly Recommended';
  if (s >= 75) return 'Recommended';
  if (s >= 65) return 'Reserve Pool';
  return 'Not Recommended';
}

// ============================================================
// STAT CARD COMPONENT
// ============================================================
function StatCard({ icon, label, value, bg = 'white' }) {
  return (
    <div style={{ ...styles.statCard, background: bg }}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={{ ...styles.statLabel, color: bg === '#1a237e' ? 'rgba(255,255,255,0.8)' : '#718096' }}>
          {label}
        </div>
        <div style={{ ...styles.statValue, color: bg === '#1a237e' ? 'white' : '#0a1929' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT - Dashboard Only (No Tabs)
// ============================================================
export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [nationalServiceReports, setNationalServiceReports] = useState([]);
  const [otherReports, setOtherReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completedAssessments: 0,
    pendingReviews: 0,
    nationalServiceReports: 0
  });

  useEffect(() => {
    if (!session) return;
    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      const token = sessionData?.session?.access_token || session?.access_token;
      if (!token) throw new Error('No active access token found.');

      const response = await fetch('/api/supervisor/dashboard', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Failed to load supervisor dashboard.');
      }

      const candidateRows = Array.isArray(payload.candidates) ? payload.candidates : [];
      const nsRows = Array.isArray(payload.nationalServiceReports) ? payload.nationalServiceReports : [];
      const otherRows = Array.isArray(payload.otherReports) ? payload.otherReports : [];
      const flatReports = [...nsRows, ...otherRows];
      const dashboardStats = payload.stats || {};

      setCandidates(candidateRows);
      setNationalServiceReports(nsRows);
      setOtherReports(otherRows);
      setAllReports(flatReports);
      setStats({
        totalCandidates: Number(dashboardStats.totalCandidates || 0),
        completedAssessments: Number(dashboardStats.completedAssessments || 0),
        pendingReviews: Number(dashboardStats.pendingReviews || 0),
        nationalServiceReports: Number(dashboardStats.nationalServiceReports || 0)
      });
    } catch (error) {
      console.error('[Supervisor Dashboard] Load error:', error);
      setErrorMessage(error?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/supervisor/export-reports?type=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supervisor-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c'];

  const universityStats = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      const uni = getUniversityKey(r.university);
      map[uni] = (map[uni] || 0) + 1;
    });
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    const notSpecified = sorted.findIndex(item => item.name === 'Not Specified');
    if (notSpecified > -1) {
      const item = sorted.splice(notSpecified, 1)[0];
      sorted.push(item);
    }
    return sorted;
  }, [allReports]);

  const programmeStats = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      const key = getProgramKey(r.programme);
      map[key] = (map[key] || 0) + 1;
    });
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    const notSpecified = sorted.findIndex(item => item.name === 'Not Specified');
    if (notSpecified > -1) {
      const item = sorted.splice(notSpecified, 1)[0];
      sorted.push(item);
    }
    return sorted;
  }, [allReports]);

  const pieChartData = useMemo(() => {
    if (programmeStats.length === 0) return { labels: [], data: [] };
    const validPrograms = programmeStats.filter(p => p.name !== 'Not Specified' && p.name !== 'Others');
    const top8 = validPrograms.slice(0, 8);
    const othersCount = validPrograms.slice(8).reduce((sum, item) => sum + item.value, 0);
    const labels = top8.map(item => item.name);
    const data = top8.map(item => item.value);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [programmeStats]);

  const filteredReports = allReports;
  const filteredAverageScore = useMemo(() => {
    const scores = filteredReports
      .map(r => calculateScore(r))
      .filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [filteredReports]);

  if (authLoading || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Manage your candidates and review assessment reports.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>🔄 Refresh</button>
            <button 
              onClick={handleExport} 
              disabled={exporting} 
              style={{ 
                ...styles.exportButton, 
                opacity: exporting ? 0.6 : 1, 
                cursor: exporting ? 'not-allowed' : 'pointer' 
              }}
            >
              {exporting ? '⏳ Exporting...' : '📊 Export to Excel'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}><strong>Dashboard loading issue:</strong> {errorMessage}</div>
        )}

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <StatCard icon="👥" label="Total Candidates" value={stats.totalCandidates} />
          <StatCard icon="✓" label="Completed Assessments" value={stats.completedAssessments} />
          <StatCard icon="◉" label="Pending Review" value={stats.pendingReviews} />
          <StatCard icon="📄" label="National Service Reports" value={stats.nationalServiceReports} bg="#1a237e" />
        </div>

        {/* Charts Grid */}
        <div style={styles.chartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Top Programs (Distribution)</h4>
            <div style={{ height: '280px', position: 'relative' }}>
              <Pie
                data={{
                  labels: pieChartData.labels,
                  datasets: [{ 
                    data: pieChartData.data, 
                    backgroundColor: COLORS, 
                    borderWidth: 2, 
                    borderColor: '#fff' 
                  }]
                }}
                options={{ 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { 
                      position: 'right', 
                      labels: { boxWidth: 12, padding: 10, font: { size: 11 } } 
                    } 
                  } 
                }}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Top 15 Universities (Ranking)</h4>
            <div style={{ height: '280px' }}>
              <Bar
                data={{
                  labels: universityStats.slice(0, 15).map(item => item.name),
                  datasets: [{ 
                    label: 'Count', 
                    data: universityStats.slice(0, 15).map(item => item.value), 
                    backgroundColor: '#1a237e', 
                    borderRadius: 4 
                  }]
                }}
                options={{ 
                  indexAxis: 'y', 
                  maintainAspectRatio: false, 
                  plugins: { legend: { display: false } }, 
                  scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } 
                }}
              />
            </div>
          </div>

          <div style={styles.statsCardLarge}>
            <h4 style={styles.panelHeader}>📊 Platform Overview</h4>
            <div style={styles.statRow}>
              <span style={styles.statRowLabel}>Total Assessments</span>
              <span style={styles.statRowValue}>{filteredReports.length}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statRowLabel}>Average Score</span>
              <span style={{...styles.statRowValue, color: filteredAverageScore >= 70 ? '#2e7d32' : '#c62828'}}>
                {filteredAverageScore > 0 ? `${filteredAverageScore}%` : 'N/A'}
              </span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statRowLabel}>Number of Programs</span>
              <span style={styles.statRowValue}>
                {new Set(filteredReports.map(r => getProgramKey(r.programme)).filter(p => p !== 'Not Specified')).size}
              </span>
            </div>
            <div style={styles.topProgramContainer}>
              <div style={styles.topProgramLabel}>Most Popular Program:</div>
              <div style={styles.topProgramValue}>
                {programmeStats.length > 0 && programmeStats[0].name !== 'Not Specified' 
                  ? programmeStats[0].name 
                  : 'No programs specified'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div style={styles.quickNav}>
          <h4 style={styles.quickNavTitle}>Quick Navigation</h4>
          <div style={styles.quickNavGrid}>
            <button onClick={() => router.push('/supervisor/manage-candidate')} style={styles.quickNavButton}>
              👥 View Candidates
            </button>
            <button onClick={() => router.push('/supervisor/add-candidate')} style={styles.quickNavButton}>
              ➕ Add Candidate
            </button>
            <button onClick={() => router.push('/supervisor/assign-assessment')} style={styles.quickNavButton}>
              📋 Assign Assessment
            </button>
            <button onClick={() => router.push('/supervisor/reports?tab=national')} style={styles.quickNavButton}>
              🇬🇭 National Service Reports
            </button>
            <button onClick={() => router.push('/supervisor/reports?tab=other')} style={styles.quickNavButton}>
              📄 Other Assessment Reports
            </button>
            <button onClick={() => router.push('/supervisor/export-dashboard')} style={styles.quickNavButton}>
              📊 Export Dashboard
            </button>
            {/* ✅ RESET ASSESSMENT - Quick navigation */}
            <button 
              onClick={() => router.push('/supervisor/manage-candidate')} 
              style={{...styles.quickNavButton, background: '#fee2e2', borderColor: '#fecaca'}}
            >
              🔄 Reset Assessment
            </button>
          </div>
        </div>
      </div>

      {/* Add keyframe animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
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
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
    background: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#0a1929', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  headerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  refreshButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569'
  },
  exportButton: {
    padding: '8px 20px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  statIcon: { fontSize: '28px' },
  statLabel: { fontSize: '11px', color: '#718096', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  statValue: { fontSize: '22px', fontWeight: 800, color: '#0a1929' },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px'
  },
  chartCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  statsCardLarge: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  panelHeader: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  statRowLabel: {
    fontSize: '14px',
    color: '#475569'
  },
  statRowValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0a1929'
  },
  topProgramContainer: {
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '12px'
  },
  topProgramLabel: {
    fontSize: '12px',
    color: '#64748b'
  },
  topProgramValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    marginTop: '2px'
  },
  quickNav: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  quickNavTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 16px 0'
  },
  quickNavGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  quickNavButton: {
    padding: '10px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a202c',
    textAlign: 'left',
    transition: 'all 0.2s',
    '&:hover': {
      background: '#eef4ff',
      borderColor: '#1a237e'
    }
  }
};
