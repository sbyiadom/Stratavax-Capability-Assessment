// pages/supervisor/index.js
// CLEAN VERSION - Removed redundant tabs, better styling

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

function calculateNationalServiceRecommendation(workplace, intellectual, overall) {
  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  if (workplace >= 50 || intellectual >= 50 || overall >= 50) return 'Consider for Development';
  return 'Not Recommended';
}

function calculateTrueScore(report) {
  if (report.is_national_service || report.isNationalService) {
    const workplace = Number(report.workplace_readiness || 0);
    const intellectual = Number(report.intellectual_capability || 0);
    if (workplace > 0 || intellectual > 0) {
      return Math.round((workplace + intellectual) / 2);
    }
  }

  const rawCategories = report.category_scores || report.report_data?.category_scores || report.report_data?.categoryBreakdown;
  
  if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
    const categories = Object.entries(rawCategories).map(([category, data]) => ({
      category,
      percentage: Math.round(data.percentage || 0)
    }));
    const validScores = categories.filter(cat => cat.percentage > 0);
    if (validScores.length > 0) {
      const sum = validScores.reduce((acc, cat) => acc + cat.percentage, 0);
      return Math.round(sum / validScores.length);
    }
  }

  if (Array.isArray(rawCategories) && rawCategories.length > 0) {
    const validScores = rawCategories
      .map(c => Number(c.percentage || c.score || 0))
      .filter(s => s > 0);
    if (validScores.length > 0) {
      const sum = validScores.reduce((a, b) => a + b, 0);
      return Math.round(sum / validScores.length);
    }
  }

  return Math.round(Number(report.score || report.percentage_score || report.overallScore || 0));
}

// ============================================================
// ENHANCED PROGRAM NORMALIZATION
// ============================================================
const ABBREVIATIONS = {
  'bsc': 'BSc', 'b.sc': 'BSc', 'b. sc': 'BSc', 'b.s.c': 'BSc',
  'bachelor': 'Bachelor', 'btech': 'B-Tech', 'b.tech': 'B-Tech',
  'b-tech': 'B-Tech', 'hnd': 'HND',
  'eng': 'Engineering', 'engr': 'Engineering',
  'elec': 'Electrical', 'electronics': 'Electronics',
  'electronic': 'Electronics',
  'mech': 'Mechanical', 'mechanical': 'Mechanical',
  'admin': 'Administration', 'adminis': 'Administration',
  'of': 'of', 'and': 'and', 'in': 'in', 'with': 'with',
  '&': 'and', '/': 'and', '-': ' ', '_': ' ',
  'plant': 'Plant', 'option': 'Option',
  'automobile': 'Automobile', 'auto': 'Automobile',
  'production': 'Production', 'manufacturing': 'Manufacturing',
  'technology': 'Technology', 'telecommunication': 'Telecommunication',
  'telecom': 'Telecommunication', 'information': 'Information',
  'it': 'Information Technology', 'computer': 'Computer',
  'science': 'Science', 'mathematics': 'Mathematics',
  'math': 'Mathematics', 'statistics': 'Statistics',
  'chemical': 'Chemical', 'petroleum': 'Petroleum',
  'renewable': 'Renewable', 'energy': 'Energy',
  'environmental': 'Environmental', 'civil': 'Civil',
  'geomatic': 'Geomatic', 'geological': 'Geological',
  'minerals': 'Minerals', 'materials': 'Materials',
  'industrial': 'Industrial', 'agricultural': 'Agricultural',
  'marine': 'Marine', 'biomedical': 'Biomedical',
  'mechatronics': 'Mechatronics', 'instrumentation': 'Instrumentation',
  'control': 'Control', 'power': 'Power',
  'communication': 'Communication', 'networking': 'Networking',
  'business': 'Business', 'management': 'Management',
  'marketing': 'Marketing', 'finance': 'Finance',
  'accounting': 'Accounting', 'economics': 'Economics',
  'human': 'Human', 'resource': 'Resource',
  'psychology': 'Psychology', 'sociology': 'Sociology',
  'geography': 'Geography', 'history': 'History',
  'political': 'Political', 'education': 'Education',
  'arts': 'Arts', 'humanities': 'Humanities'
};

function normalizeProgramName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ');
  const mappedWords = words.map(word => ABBREVIATIONS[word] || word.charAt(0).toUpperCase() + word.slice(1));
  return mappedWords.join(' ');
}

function getUniqueMasterNames(rawPrograms) {
  if (!rawPrograms || rawPrograms.length === 0) return { groups: [], masterToRawMap: {} };
  const normalizedMap = {};
  rawPrograms.forEach(p => { normalizedMap[p] = normalizeProgramName(p); });
  const uniqueCleanNames = [...new Set(Object.values(normalizedMap))];
  const groups = [];
  const processed = new Set();
  uniqueCleanNames.forEach(name1 => {
    if (processed.has(name1)) return;
    const group = [name1];
    processed.add(name1);
    uniqueCleanNames.forEach(name2 => {
      if (processed.has(name2)) return;
      const words1 = name1.split(' ');
      const words2 = name2.split(' ');
      const intersection = words1.filter(w => words2.includes(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const similarity = union > 0 ? intersection / union : 0;
      if (similarity > 0.6) { group.push(name2); processed.add(name2); }
    });
    const masterName = group.reduce((a, b) => a.length >= b.length ? a : b);
    groups.push(masterName);
  });
  const masterToRawMap = {};
  groups.forEach(master => {
    masterToRawMap[master] = [];
    rawPrograms.forEach(raw => {
      const clean = normalizeProgramName(raw);
      const words1 = master.split(' ');
      const words2 = clean.split(' ');
      const intersection = words1.filter(w => words2.includes(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const similarity = union > 0 ? intersection / union : 0;
      if (similarity > 0.6) { masterToRawMap[master].push(raw); }
    });
  });
  return { groups, masterToRawMap };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatCard({ icon, label, value, color = '#0a1929', bg = 'white' }) {
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
// MAIN COMPONENT
// ============================================================
export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  // Get tab from URL query param or default to 'assessments'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'assessments';
    }
    return 'assessments';
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

  // Update URL when tab changes
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

  const universityStats = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      const uni = r.university || 'Not Specified';
      map[uni] = (map[uni] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [allReports]);

  const rawPrograms = useMemo(() => {
    return allReports.map(r => r.programme).filter(Boolean);
  }, [allReports]);

  const { groups: uniqueProgramMasterNames, masterToRawMap } = useMemo(() => {
    return getUniqueMasterNames(rawPrograms);
  }, [rawPrograms]);

  const filterReports = (reportsToFilter) => {
    let filtered = reportsToFilter;

    if (selectedUniversityOption) {
      filtered = filtered.filter(r => r.university === selectedUniversityOption.value);
    }

    if (selectedProgramOptions.length > 0) {
      const allowedRawNames = [];
      selectedProgramOptions.forEach(opt => {
        const rawList = masterToRawMap[opt.value] || [];
        allowedRawNames.push(...rawList);
      });
      filtered = filtered.filter(r => allowedRawNames.includes(r.programme));
    }

    filtered = filtered.filter(r => {
      const score = calculateTrueScore(r);
      return score >= Number(minScore) && score <= Number(maxScore);
    });

    return filtered;
  };

  const filteredReports = useMemo(() => filterReports(allReports), [allReports, selectedUniversityOption, selectedProgramOptions, minScore, maxScore, masterToRawMap]);
  const filteredNationalService = useMemo(() => filterReports(nationalServiceReports), [nationalServiceReports, selectedUniversityOption, selectedProgramOptions, minScore, maxScore, masterToRawMap]);
  const filteredOther = useMemo(() => filterReports(otherReports), [otherReports, selectedUniversityOption, selectedProgramOptions, minScore, maxScore, masterToRawMap]);

  const programmeStats = useMemo(() => {
    const map = {};
    filteredReports.forEach(r => {
      const raw = r.programme || 'Not Specified';
      let master = 'Other';
      for (const [m, rawList] of Object.entries(masterToRawMap)) {
        if (rawList.includes(raw)) { master = m; break; }
      }
      map[master] = (map[master] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredReports, masterToRawMap]);

  const filteredAverageScore = useMemo(() => {
    const scores = filteredReports
      .map(r => calculateTrueScore(r))
      .filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [filteredReports]);

  const pieChartData = useMemo(() => {
    if (programmeStats.length === 0) return { labels: [], data: [] };
    const top8 = programmeStats.slice(0, 8);
    const othersCount = programmeStats.slice(8).reduce((sum, item) => sum + item.value, 0);
    const labels = top8.map(item => item.name);
    const data = top8.map(item => item.value);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [programmeStats]);

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c'];

  const universityOptions = useMemo(() => {
    return universityStats.map(uni => ({ label: `${uni.name} (${uni.value})`, value: uni.name }));
  }, [universityStats]);

  const programOptions = useMemo(() => {
    return uniqueProgramMasterNames.map(p => ({ label: p, value: p }));
  }, [uniqueProgramMasterNames]);

  const resetFilters = () => {
    setSelectedUniversityOption(null);
    setSelectedProgramOptions([]);
    setMinScore(0);
    setMaxScore(100);
  };

  // Determine which reports to show based on active tab
  const getActiveReports = () => {
    if (activeTab === 'national_service') return filteredNationalService;
    if (activeTab === 'other') return filteredOther;
    return filteredReports;
  };

  const activeReports = getActiveReports();
  const reportsCount = {
    all: allReports.length,
    national_service: nationalServiceReports.length,
    other: otherReports.length
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

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <StatCard icon="👥" label="Total Candidates" value={stats.totalCandidates} />
          <StatCard icon="✓" label="Completed Assessments" value={stats.completedAssessments} />
          <StatCard icon="◉" label="Pending Review" value={stats.pendingReviews} />
          <StatCard 
            icon="📄" 
            label="National Service Reports" 
            value={stats.nationalServiceReports}
            bg="#1a237e"
            color="white"
          />
        </div>

        {/* Filters */}
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

        {/* Charts */}
        <div style={styles.chartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>
              {!selectedUniversityOption ? 'Top Programs (Distribution)' : `Programs at ${selectedUniversityOption?.value}`}
            </h4>
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
            <h4 style={styles.panelHeader}>
              {!selectedUniversityOption ? '📊 Platform Overview' : `📍 ${selectedUniversityOption?.value}`}
            </h4>
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
              <span style={styles.statRowValue}>{new Set(filteredReports.map(r => r.programme).filter(Boolean)).size}</span>
            </div>
            <div style={styles.topProgramContainer}>
              <div style={styles.topProgramLabel}>Most Popular Program:</div>
              <div style={styles.topProgramValue}>
                {programmeStats.length > 0 ? programmeStats[0].name : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 Navigation Tabs (Now using sidebar navigation instead) */}
        <div style={styles.tabsContainer}>
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
// SUB-COMPONENTS
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
                const trueScore = calculateTrueScore(report);
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
                <th style={styles.th}>Workplace Readiness</th>
                <th style={styles.th}>Intellectual Capability</th>
                <th style={styles.th}>Overall Score</th>
                <th style={styles.th}>Recommendation</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const overallScore = Number(report.score || report.overallScore || report.percentage_score || 0);
                const workplaceScore = Number(report.workplace_readiness || 0);
                const intellectualScore = Number(report.intellectual_capability || 0);
                const isCompleted = report.status === 'completed' || report.result_id !== null || (report.percentage_score !== null && report.percentage_score !== undefined);
                const hasScores = workplaceScore > 0 || intellectualScore > 0 || overallScore > 0;

                const displayRecommendation = calculateNationalServiceRecommendation(workplaceScore, intellectualScore, overallScore);

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
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(workplaceScore), color: getScoreTextColor(workplaceScore) }}>
                        {hasScores ? Math.round(workplaceScore) + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(intellectualScore), color: getScoreTextColor(intellectualScore) }}>
                        {hasScores ? Math.round(intellectualScore) + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.scoreBadge, background: getScoreColor(overallScore), color: getScoreTextColor(overallScore) }}>
                        {hasScores ? Math.round(overallScore) + '%' : '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.recommendationBadge, color: getRecommendationColor(displayRecommendation) }}>
                        {hasScores ? displayRecommendation : 'Pending'}
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
                const trueScore = calculateTrueScore(report);
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
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
  scoreBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', background: '#f1f5f9' },
  recommendationBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', background: 'white', border: '1px solid #e2e8f0' },
  viewButton: { padding: '6px 12px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' },
  pendingText: { color: '#94a3b8', fontSize: '13px' },
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
