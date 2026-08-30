// pages/supervisor/index.js - COMPLETE FIXED WITH NORMALIZED DATA

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';

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

import Select from 'react-select';

// ============================================================
// 🟢 FIXED: HELPER FUNCTIONS WITH NORMALIZATION
// ============================================================

// 🟢 Normalize university names to avoid duplicates
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

// 🟢 Normalize program names
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
  
  // Map common variations
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

// 🟢 Universal score calculation
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
// SUB-COMPONENTS
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

function TabButton({ active, onClick, label, count }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        ...styles.tabButton, 
        background: active ? '#1a237e' : 'white', 
        color: active ? 'white' : '#1a237e', 
        border: active ? 'none' : '1px solid #e2e8f0',
        fontWeight: active ? '700' : '500'
      }}
    >
      {label} {count !== undefined && `(${count})`}
    </button>
  );
}

// ============================================================
// VIEW CANDIDATES TAB
// ============================================================
function ViewCandidatesTab({ candidates, onManageCandidate }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>View all candidates assigned to you. Click on a candidate to manage their assessments.</p>
      </div>
      {candidates.length === 0 ? (
        <div style={styles.emptyState}><p>No candidates assigned to you yet.</p></div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>University</th>
                <th style={styles.th}>Program</th>
                <th style={styles.th}>Assessments</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const completedCount = candidate.completedAssessments?.length || 0;
                return (
                  <tr key={candidate.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{candidate.full_name || 'Unnamed'}</div>
                      <div style={styles.cellSub}>ID: {candidate.id.substring(0, 8)}...</div>
                    </td>
                    <td style={styles.td}>{candidate.email || 'No email'}</td>
                    <td style={styles.td}>
                      {candidate.university && candidate.university !== 'Not Specified' 
                        ? candidate.university 
                        : <span style={styles.naText}>—</span>}
                    </td>
                    <td style={styles.td}>
                      {candidate.programme && candidate.programme !== 'Not Specified'
                        ? candidate.programme
                        : <span style={styles.naText}>—</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.countBadge}>{completedCount}</span>
                    </td>
                    <td style={styles.td}>
                      <button 
                        onClick={() => onManageCandidate(candidate.id)}
                        style={styles.viewButton}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ASSESSMENT TAB (All Assessments)
// ============================================================
function AssessmentTab({ reports, getScoreColor, getScoreTextColor, onViewReport }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>Filtered view of all completed assessments based on selected criteria. ({reports.length} results)</p>
      </div>
      {reports.length === 0 ? (
        <div style={styles.emptyState}><p>No assessments match your current filter selections.</p></div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Assessment</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const trueScore = calculateScore(report);
                return (
                  <tr key={report.result_id || `${report.candidate_id}-${report.assessment_id}`} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{report.candidate_name}</div>
                      <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                    </td>
                    <td style={styles.td}>{report.assessment_title}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(trueScore), color: getScoreTextColor(trueScore) }}>
                        {trueScore}%
                      </span>
                    </td>
                    <td style={styles.td}>
                      {report.result_id ? (
                        <button onClick={() => onViewReport(report.result_id)} style={styles.viewButton}>View Report</button>
                      ) : (
                        <span style={styles.pendingText}>No result</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NATIONAL SERVICE TAB
// ============================================================
function NationalServiceTab({ reports, getScoreColor, getScoreTextColor, getRecommendationColor, onViewReport }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All National Service assessment reports assigned to this supervisor. ({reports.length} reports)</p>
      </div>
      {reports.length === 0 ? (
        <div style={styles.emptyState}><p>No National Service assessments found.</p></div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Recommendation</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const overallScore = calculateScore(report);
                const isCompleted = report.status === 'completed' || report.result_id !== null;
                const displayRecommendation = calculateNationalServiceRecommendation(overallScore);

                return (
                  <tr key={report.result_id || report.candidate_id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{report.candidate_name}</div>
                      <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, background: isCompleted ? '#dcfce7' : '#fef3c7', color: isCompleted ? '#166534' : '#92400e' }}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(overallScore), color: getScoreTextColor(overallScore) }}>
                        {overallScore > 0 ? overallScore + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.recommendationBadge, color: getRecommendationColor(displayRecommendation) }}>
                        {overallScore > 0 ? displayRecommendation : 'Pending'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {isCompleted && report.result_id ? (
                        <button onClick={() => onViewReport(report.result_id)} style={styles.viewButton}>View Report</button>
                      ) : (
                        <span style={styles.pendingText}>Awaiting completion</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// OTHER ASSESSMENTS TAB
// ============================================================
function OtherAssessmentsTab({ reports, onViewReport }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All other completed assessments for candidates under your supervision. ({reports.length} reports)</p>
      </div>
      {reports.length === 0 ? (
        <div style={styles.emptyState}><p>No other assessments found.</p></div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Assessment</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const trueScore = calculateScore(report);
                return (
                  <tr key={report.result_id || `${report.candidate_id}-${report.assessment_id}`} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{report.candidate_name}</div>
                      <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                    </td>
                    <td style={styles.td}>{report.assessment_title}</td>
                    <td style={styles.td}>
                      <span style={styles.scoreBadge}>{trueScore}%</span>
                    </td>
                    <td style={styles.td}>
                      {report.result_id ? (
                        <button onClick={() => onViewReport(report.result_id)} style={styles.viewButton}>View Report</button>
                      ) : (
                        <span style={styles.pendingText}>No result</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD TAB - Shows stats and charts only
// ============================================================
function DashboardTab({ 
  stats, 
  pieChartData, 
  universityStats, 
  filteredReports, 
  filteredAverageScore, 
  programmeStats,
  COLORS 
}) {
  return (
    <div style={styles.tabPanel}>
      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <StatCard icon="👥" label="Total Candidates" value={stats.totalCandidates} />
        <StatCard icon="✓" label="Completed Assessments" value={stats.completedAssessments} />
        <StatCard icon="◉" label="Pending Review" value={stats.pendingReviews} />
        <StatCard icon="📄" label="National Service Reports" value={stats.nationalServiceReports} bg="#1a237e" />
      </div>

      {/* Charts */}
      <div style={styles.chartGrid}>
        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top Programs (Distribution)</h4>
          <div style={{ height: '280px', position: 'relative' }}>
            <Pie
              data={{
                labels: pieChartData.labels,
                datasets: [{ data: pieChartData.data, backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff' }]
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } } }}
            />
          </div>
        </div>

        <div style={styles.chartCard}>
          <h4 style={styles.chartTitle}>Top 15 Universities (Ranking)</h4>
          <div style={{ height: '280px' }}>
            <Bar
              data={{
                labels: universityStats.slice(0, 15).map(item => item.name),
                datasets: [{ label: 'Count', data: universityStats.slice(0, 15).map(item => item.value), backgroundColor: '#1a237e', borderRadius: 4 }]
              }}
              options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
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
            <span style={styles.statRowValue}>{new Set(filteredReports.map(r => getProgramKey(r.programme)).filter(p => p !== 'Not Specified')).size}</span>
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
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'dashboard';
    }
    return 'dashboard';
  });
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

  const [selectedUniversityOption, setSelectedUniversityOption] = useState(null);
  const [selectedProgramOptions, setSelectedProgramOptions] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      const url = new URL(window.location);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url);
    }
  }, [activeTab]);

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

      let exportType = 'all';
      if (activeTab === 'national_service') exportType = 'national_service';
      else if (activeTab === 'other') exportType = 'other';

      const response = await fetch(`/api/supervisor/export-reports?type=${exportType}`, {
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

  const handleViewReport = (resultId) => {
    if (!resultId) { alert('No result available.'); return; }
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleManageCandidate = (candidateId) => {
    router.push(`/supervisor/manage-candidate/${candidateId}`);
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'Highly Recommended': '#2e7d32', Recommended: '#1565c0',
      'Reserve Pool': '#f57c00', 'Not Recommended': '#c62828',
      'Not Available': '#64748b'
    };
    return colors[recommendation] || '#64748b';
  };

  const getScoreColor = (score) => {
    const value = Number(score || 0);
    if (value >= 70) return '#dcfce7';
    if (value >= 50) return '#fef3c7';
    return '#fee2e2';
  };

  const getScoreTextColor = (score) => {
    const value = Number(score || 0);
    if (value >= 70) return '#166534';
    if (value >= 50) return '#92400e';
    return '#991b1b';
  };

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c'];

  // 🟢 FIXED: Normalize university stats to remove duplicates
  const universityStats = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      const uni = getUniversityKey(r.university);
      map[uni] = (map[uni] || 0) + 1;
    });
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    // Move "Not Specified" to the bottom
    const notSpecified = sorted.findIndex(item => item.name === 'Not Specified');
    if (notSpecified > -1) {
      const item = sorted.splice(notSpecified, 1)[0];
      sorted.push(item);
    }
    return sorted;
  }, [allReports]);

  // 🟢 FIXED: Normalize program stats
  const programmeStats = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      const key = getProgramKey(r.programme);
      map[key] = (map[key] || 0) + 1;
    });
    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    // Move "Not Specified" to the bottom
    const notSpecified = sorted.findIndex(item => item.name === 'Not Specified');
    if (notSpecified > -1) {
      const item = sorted.splice(notSpecified, 1)[0];
      sorted.push(item);
    }
    return sorted;
  }, [allReports]);

  const filterReports = (reportsToFilter) => {
    let filtered = reportsToFilter;
    if (selectedUniversityOption) {
      filtered = filtered.filter(r => getUniversityKey(r.university) === selectedUniversityOption.value);
    }
    if (selectedProgramOptions.length > 0) {
      filtered = filtered.filter(r => {
        const progKey = getProgramKey(r.programme);
        return selectedProgramOptions.some(opt => opt.value === progKey);
      });
    }
    filtered = filtered.filter(r => {
      const score = calculateScore(r);
      return score >= Number(minScore) && score <= Number(maxScore);
    });
    return filtered;
  };

  const filteredReports = useMemo(() => filterReports(allReports), [allReports, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);
  const filteredNationalService = useMemo(() => filterReports(nationalServiceReports), [nationalServiceReports, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);
  const filteredOther = useMemo(() => filterReports(otherReports), [otherReports, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);

  const filteredAverageScore = useMemo(() => {
    const scores = filteredReports
      .map(r => calculateScore(r))
      .filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [filteredReports]);

  // 🟢 FIXED: Pie chart with clean labels
  const pieChartData = useMemo(() => {
    if (programmeStats.length === 0) return { labels: [], data: [] };
    // Filter out "Not Specified" and "Others"
    const validPrograms = programmeStats.filter(p => p.name !== 'Not Specified' && p.name !== 'Others');
    const top8 = validPrograms.slice(0, 8);
    const othersCount = validPrograms.slice(8).reduce((sum, item) => sum + item.value, 0);
    const labels = top8.map(item => item.name);
    const data = top8.map(item => item.value);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [programmeStats]);

  const universityOptions = useMemo(() => {
    return universityStats
      .filter(uni => uni.name !== 'Not Specified')
      .map(uni => ({ label: `${uni.name} (${uni.value})`, value: uni.name }));
  }, [universityStats]);

  const programOptions = useMemo(() => {
    return programmeStats
      .filter(p => p.name !== 'Not Specified')
      .map(p => ({ label: `${p.name} (${p.value})`, value: p.name }));
  }, [programmeStats]);

  const resetFilters = () => {
    setSelectedUniversityOption(null);
    setSelectedProgramOptions([]);
    setMinScore(0);
    setMaxScore(100);
  };

  const reportsCount = {
    all: allReports.length,
    national_service: nationalServiceReports.length,
    other: otherReports.length,
    candidates: candidates.length
  };

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
            <button onClick={fetchDashboardData} style={styles.refreshButton}>Refresh</button>
            <button onClick={handleExport} disabled={exporting} style={{ ...styles.exportButton, opacity: exporting ? 0.6 : 1, cursor: exporting ? 'not-allowed' : 'pointer' }}>
              {exporting ? '⏳ Exporting...' : '📊 Export to Excel'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}><strong>Dashboard loading issue:</strong> {errorMessage}</div>
        )}

        {/* Filters */}
        {activeTab !== 'dashboard' && activeTab !== 'view_candidates' && (
          <div style={styles.filtersBar}>
            <div style={styles.filtersRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>University:</label>
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  options={universityOptions}
                  value={selectedUniversityOption}
                  onChange={(option) => { setSelectedUniversityOption(option); setSelectedProgramOptions([]); }}
                  placeholder="Select University..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Programs:</label>
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  options={programOptions}
                  value={selectedProgramOptions}
                  onChange={(options) => setSelectedProgramOptions(options || [])}
                  placeholder="Select Programs..."
                  isMulti
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div style={styles.scoreFilterGroup}>
                <div style={styles.scoreInputWrapper}>
                  <label style={styles.filterLabelSmall}>Min:</label>
                  <input type="number" style={styles.filterInputSmall} min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
                </div>
                <div style={styles.scoreInputWrapper}>
                  <label style={styles.filterLabelSmall}>Max:</label>
                  <input type="number" style={styles.filterInputSmall} min="0" max="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
                </div>
              </div>

              <button onClick={resetFilters} style={styles.resetFilterButton}>Reset Filters</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <TabButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            label="📊 Dashboard"
          />
          <TabButton 
            active={activeTab === 'view_candidates'} 
            onClick={() => setActiveTab('view_candidates')} 
            label="My Candidates" 
            count={reportsCount.candidates}
          />
          <TabButton 
            active={activeTab === 'assessments'} 
            onClick={() => setActiveTab('assessments')} 
            label="All Assessments" 
            count={reportsCount.all}
          />
          <TabButton 
            active={activeTab === 'national_service'} 
            onClick={() => setActiveTab('national_service')} 
            label="National Service" 
            count={reportsCount.national_service}
          />
          <TabButton 
            active={activeTab === 'other'} 
            onClick={() => setActiveTab('other')} 
            label="Other Assessments" 
            count={reportsCount.other}
          />
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              stats={stats}
              pieChartData={pieChartData}
              universityStats={universityStats}
              filteredReports={filteredReports}
              filteredAverageScore={filteredAverageScore}
              programmeStats={programmeStats}
              COLORS={COLORS}
            />
          )}
          {activeTab === 'view_candidates' && (
            <ViewCandidatesTab
              candidates={candidates}
              onManageCandidate={handleManageCandidate}
            />
          )}
          {activeTab === 'assessments' && (
            <AssessmentTab
              reports={filteredReports}
              getScoreColor={getScoreColor}
              getScoreTextColor={getScoreTextColor}
              onViewReport={handleViewReport}
            />
          )}
          {activeTab === 'national_service' && (
            <NationalServiceTab
              reports={filteredNationalService}
              getScoreColor={getScoreColor}
              getScoreTextColor={getScoreTextColor}
              getRecommendationColor={getRecommendationColor}
              onViewReport={handleViewReport}
            />
          )}
          {activeTab === 'other' && (
            <OtherAssessmentsTab reports={filteredOther} onViewReport={handleViewReport} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ============================================================
// CUSTOM STYLES FOR REACT-SELECT
// ============================================================
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    borderColor: state.isFocused ? '#1a237e' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 1px #1a237e' : 'none',
    '&:hover': { borderColor: '#1a237e' },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#1a237e' : state.isFocused ? '#e3f2fd' : 'white',
    color: state.isSelected ? 'white' : '#1a202c',
    '&:active': { backgroundColor: '#1a237e' },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e3f2fd',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#1a237e',
    fontWeight: 600,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#1a237e',
    '&:hover': { backgroundColor: '#1a237e', color: 'white' },
  }),
};

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
  filtersBar: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '200px',
    flex: 1,
    maxWidth: '300px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '4px'
  },
  filterLabelSmall: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    marginRight: '6px'
  },
  scoreFilterGroup: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px'
  },
  scoreInputWrapper: {
    display: 'flex',
    alignItems: 'center'
  },
  filterInputSmall: {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    width: '60px',
    textAlign: 'center'
  },
  resetFilterButton: {
    padding: '8px 20px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#475569',
    marginLeft: 'auto',
    height: '38px',
    alignSelf: 'flex-end'
  },
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
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    background: 'white',
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1px solid #eef2f7'
  },
  tabButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    background: 'white',
    border: '1px solid #e2e8f0'
  },
  tabContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7',
    minHeight: '300px'
  },
  tabPanel: { width: '100%' },
  tabDescription: {
    marginBottom: '16px',
    padding: '8px 12px',
    background: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#475569'
  },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '12px 16px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  tr: { transition: 'background 0.2s' },
  cellName: { fontWeight: '600', color: '#1a202c' },
  cellSub: { fontSize: '12px', color: '#94a3b8' },
  countBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', background: '#eef4ff', color: '#3538cd', fontSize: '13px', fontWeight: '600' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
  scoreBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', background: '#f1f5f9' },
  recommendationBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', background: 'white', border: '1px solid #e2e8f0' },
  viewButton: { padding: '6px 12px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' },
  pendingText: { color: '#94a3b8', fontSize: '13px' },
  naText: { color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' },
  emptyState: { textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }
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
