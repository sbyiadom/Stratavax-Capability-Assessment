// pages/supervisor/index.js - UPGRADED WITH NORMALIZATION ENGINE & ADVANCED FILTERS
// Matches the Admin Dashboard's multi-select and program merging capabilities.

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';

// ============================================================
// CHART.JS IMPORTS
// ============================================================
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
// 🟢 THE PROGRAM NORMALIZATION ENGINE (Copied from Admin)
// ============================================================

// 1. Abbreviation Dictionary
const ABBREVIATIONS = {
  'bsc': 'BSc',
  'b.sc': 'BSc',
  'b. sc': 'BSc',
  'b.s.c': 'BSc',
  'bachelor': 'Bachelor',
  'btech': 'B-Tech',
  'b.tech': 'B-Tech',
  'b. tech': 'B-Tech',
  'eng': 'Engineering',
  'engr': 'Engineering',
  'elec': 'Electrical',
  'electronics': 'Electronics',
  'mech': 'Mechanical',
  'mechanical': 'Mechanical',
  'admin': 'Administration',
  'adminis': 'Administration',
  'of': 'of',
  'and': 'and',
  'in': 'in',
  'with': 'with'
};

// 2. Normalize a single program string
function normalizeProgramName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  
  let cleaned = raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
    
  // Split into words and replace using the dictionary
  const words = cleaned.split(' ');
  const mappedWords = words.map(word => ABBREVIATIONS[word] || word.charAt(0).toUpperCase() + word.slice(1));
  
  return mappedWords.join(' ');
}

// 3. Group similar names using Fuzzy Logic (Levenshtein distance)
// Returns an array of unique "Master" names.
function getUniqueMasterNames(rawPrograms) {
  if (!rawPrograms || rawPrograms.length === 0) return [];
  
  // Step A: Normalize all raw programs
  const normalizedMap = {};
  rawPrograms.forEach(p => {
    const normalized = normalizeProgramName(p);
    normalizedMap[p] = normalized; // Store mapping from raw -> clean
  });

  // Step B: Get unique clean names
  const uniqueCleanNames = [...new Set(Object.values(normalizedMap))];
  
  // Step C: Group names that are extremely similar (Fuzzy matching)
  const groups = [];
  const processed = new Set();

  uniqueCleanNames.forEach(name1 => {
    if (processed.has(name1)) return;
    
    const group = [name1];
    processed.add(name1);
    
    uniqueCleanNames.forEach(name2 => {
      if (processed.has(name2)) return;
      // Calculate similarity (Jaccard Index / Overlap)
      const words1 = name1.split(' ');
      const words2 = name2.split(' ');
      const intersection = words1.filter(w => words2.includes(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const similarity = union > 0 ? intersection / union : 0;
      
      // If they share 60% of their words, they are the same program.
      if (similarity > 0.6) {
        group.push(name2);
        processed.add(name2);
      }
    });
    
    // Pick the longest name in the group as the "Master" name
    const masterName = group.reduce((a, b) => a.length >= b.length ? a : b);
    groups.push(masterName);
  });

  // 4. Create a mapping from Master Name -> List of Raw Strings
  const masterToRawMap = {};
  groups.forEach(master => {
    masterToRawMap[master] = [];
    rawPrograms.forEach(raw => {
      const clean = normalizeProgramName(raw);
      // Check if this clean name belongs to this master group
      const words1 = master.split(' ');
      const words2 = clean.split(' ');
      const intersection = words1.filter(w => words2.includes(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const similarity = union > 0 ? intersection / union : 0;
      
      if (similarity > 0.6) {
        masterToRawMap[master].push(raw);
      }
    });
  });

  return { groups, masterToRawMap };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SupervisorDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('candidates');
  const [candidates, setCandidates] = useState([]);
  const [nationalServiceReports, setNationalServiceReports] = useState([]);
  const [otherReports, setOtherReports] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    completedAssessments: 0,
    pendingReviews: 0,
    nationalServiceReports: 0
  });

  // 🟢 ADVANCED MULTI-SELECT FILTERS
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  useEffect(() => {
    if (!session) return;
    fetchDashboardData();
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setDebugInfo(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message || 'Unable to read active session.');
      }

      const token = sessionData?.session?.access_token || session?.access_token;

      if (!token) {
        throw new Error('No active access token found. Please log out and log in again.');
      }

      const response = await fetch('/api/supervisor/dashboard', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Failed to load supervisor dashboard.');
      }

      const candidateRows = Array.isArray(payload.candidates) ? payload.candidates : [];
      const nsRows = Array.isArray(payload.nationalServiceReports) ? payload.nationalServiceReports : [];
      const otherRows = Array.isArray(payload.otherReports) ? payload.otherReports : [];
      const dashboardStats = payload.stats || {};

      console.log('[Dashboard] Candidates received:', candidateRows.length);
      console.log('[Dashboard] National Service reports:', nsRows.length);
      console.log('[Dashboard] Other reports:', otherRows.length);

      setCandidates(candidateRows);
      setNationalServiceReports(nsRows);
      setOtherReports(otherRows);
      setStats({
        totalCandidates: Number(dashboardStats.totalCandidates || 0),
        completedAssessments: Number(dashboardStats.completedAssessments || 0),
        pendingReviews: Number(dashboardStats.pendingReviews || 0),
        nationalServiceReports: Number(dashboardStats.nationalServiceReports || 0)
      });
      setDebugInfo(payload.debug || null);

      const initialSelected = {};
      candidateRows.forEach((candidate) => {
        const completedAssessments = Array.isArray(candidate.completedAssessments)
          ? candidate.completedAssessments
          : [];
        if (completedAssessments.length > 0) {
          initialSelected[candidate.id] = completedAssessments[0].assessment_id;
        }
      });
      setSelectedAssessments(initialSelected);
    } catch (error) {
      console.error('[Supervisor Dashboard] Load error:', error);
      setCandidates([]);
      setNationalServiceReports([]);
      setOtherReports([]);
      setStats({
        totalCandidates: 0,
        completedAssessments: 0,
        pendingReviews: 0,
        nationalServiceReports: 0
      });
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

      if (!token) {
        throw new Error('Not authenticated');
      }

      let exportType = 'all';
      if (activeTab === 'national_service') exportType = 'national_service';
      else if (activeTab === 'other') exportType = 'other';

      const response = await fetch(`/api/supervisor/export-reports?type=${exportType}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    if (!resultId) {
      alert('No result available for this assessment.');
      return;
    }
    router.push(`/supervisor/reports/${resultId}`);
  };

  const handleAssessmentSelect = (candidateId, assessmentId) => {
    if (!assessmentId) {
      alert('Please select an assessment first.');
      return;
    }

    const candidate = candidates.find((item) => String(item.id) === String(candidateId));
    if (!candidate) {
      alert('Candidate not found. Please refresh and try again.');
      return;
    }

    const completedAssessments = Array.isArray(candidate.completedAssessments)
      ? candidate.completedAssessments
      : [];

    const assessment = completedAssessments.find(
      (item) => String(item.assessment_id) === String(assessmentId)
    );

    if (!assessment) {
      alert('Assessment not found. Please try again.');
      return;
    }

    if (assessment.result_id) {
      handleViewReport(assessment.result_id);
    } else {
      alert('This assessment does not have a result available yet.');
    }
  };

  const handleAssessmentChange = (candidateId, assessmentId) => {
    setSelectedAssessments((previous) => ({
      ...previous,
      [candidateId]: assessmentId
    }));
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'Highly Recommended': '#2e7d32',
      Recommended: '#1565c0',
      Conditional: '#f57c00',
      'Reserve Pool': '#f57c00',
      'Not Recommended': '#c62828',
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

  // ============================================================
  // DATA PROCESSING FOR CHARTS & FILTERS
  // ============================================================
  
  const universityStats = useMemo(() => {
    const map = {};
    candidates.forEach(c => {
      const uni = c.university || 'Not Specified';
      map[uni] = (map[uni] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [candidates]);

  const universityFilteredCandidates = useMemo(() => {
    if (selectedUniversity === 'all') return candidates;
    return candidates.filter(c => c.university === selectedUniversity);
  }, [candidates, selectedUniversity]);

  // 🟢 GENERATE NORMALIZED PROGRAM LIST
  const rawPrograms = useMemo(() => {
    return universityFilteredCandidates.map(c => c.programme).filter(Boolean);
  }, [universityFilteredCandidates]);

  const { groups: uniqueProgramMasterNames, masterToRawMap } = useMemo(() => {
    return getUniqueMasterNames(rawPrograms);
  }, [rawPrograms]);

  // 🟢 MULTI-SELECT FILTER USING MASTER NAMES
  const programFilteredCandidates = useMemo(() => {
    if (selectedPrograms.length === 0) return universityFilteredCandidates;
    
    // Map selected master names back to ALL raw names that belong to them
    const allowedRawNames = [];
    selectedPrograms.forEach(master => {
      const rawList = masterToRawMap[master] || [];
      allowedRawNames.push(...rawList);
    });

    return universityFilteredCandidates.filter(c => 
      allowedRawNames.includes(c.programme)
    );
  }, [universityFilteredCandidates, selectedPrograms, masterToRawMap]);

  const filteredCandidates = useMemo(() => {
    return programFilteredCandidates.filter(c => {
      // Calculate an average score for this candidate
      const scores = (c.completedAssessments || [])
        .map(a => Number(a.score || 0))
        .filter(s => s > 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return avgScore >= Number(minScore) && avgScore <= Number(maxScore);
    });
  }, [programFilteredCandidates, minScore, maxScore]);

  // 🟢 CHART DATA (Uses cleaned Master Names)
  const programmeStats = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      const raw = c.programme || 'Not Specified';
      // Map raw name back to its Master Name
      let master = 'Other';
      for (const [m, rawList] of Object.entries(masterToRawMap)) {
        if (rawList.includes(raw)) {
          master = m;
          break;
        }
      }
      map[master] = (map[master] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [filteredCandidates, masterToRawMap]);

  const filteredAverageScore = useMemo(() => {
    const scores = filteredCandidates
      .flatMap(c => (c.completedAssessments || []).map(a => a.score || 0))
      .filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [filteredCandidates]);

  const pieChartData = useMemo(() => {
    if (programmeStats.length === 0) return { labels: [], data: [] };
    const top8 = programmeStats.slice(0, 8);
    const othersCount = programmeStats.slice(8).reduce((sum, item) => sum + item.value, 0);
    const labels = top8.map(item => item.name);
    const data = top8.map(item => item.value);
    if (othersCount > 0) {
      labels.push('Others');
      data.push(othersCount);
    }
    return { labels, data };
  }, [programmeStats]);

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c'];

  const resetFilters = () => {
    setSelectedUniversity('all');
    setSelectedPrograms([]);
    setMinScore(0);
    setMaxScore(100);
  };

  // ============================================================
  // RENDER HELPER: CALCULATE RECOMMENDATION
  // ============================================================
  const calculateNationalServiceRecommendation = (workplace, intellectual, overall) => {
    if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
    if (workplace >= 75 && intellectual >= 75) return 'Recommended';
    if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
    if (workplace >= 50 || intellectual >= 50 || overall >= 50) return 'Consider for Development';
    return 'Not Recommended';
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
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.subtitle}>Manage your candidates and review assessment reports.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>Refresh</button>
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
          <div style={styles.errorBox}>
            <strong>Dashboard loading issue:</strong> {errorMessage}
          </div>
        )}

        {/* STATS CARDS ROW */}
        <div style={styles.statsRow}>
          <StatCard icon="👥" label="Total Candidates" value={stats.totalCandidates} />
          <StatCard icon="✓" label="Completed" value={stats.completedAssessments} />
          <StatCard icon="◉" label="Pending Review" value={stats.pendingReviews} />
          <div style={{ ...styles.statCard, background: '#1a237e' }}>
            <div style={{ ...styles.statIcon, color: 'white' }}>●</div>
            <div>
              <div style={{ ...styles.statLabel, color: 'rgba(255,255,255,0.8)' }}>National Service Reports</div>
              <div style={{ ...styles.statValue, color: 'white' }}>{stats.nationalServiceReports}</div>
            </div>
          </div>
        </div>

        {/* 🟢 MAIN ANALYTICS SECTION WITH FILTERS */}
        <div style={styles.analyticsWrapper}>
          <div style={styles.analyticsHeader}>
            <h3 style={styles.analyticsTitle}>Candidate Analytics</h3>
            
            <div style={styles.filtersContainer}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>University:</label>
                <select style={styles.filterSelect} value={selectedUniversity} onChange={(e) => { setSelectedUniversity(e.target.value); setSelectedPrograms([]); }}>
                  <option value="all">All Universities</option>
                  {universityStats.map(uni => (
                    <option key={uni.name} value={uni.name}>{uni.name} ({uni.value})</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Programs ({selectedPrograms.length} selected):</label>
                <select 
                  multiple 
                  style={styles.filterSelectMulti} 
                  value={selectedPrograms} 
                  onChange={(e) => {
                    const options = e.target.options;
                    const selected = [];
                    for (let i = 0; i < options.length; i++) {
                      if (options[i].selected) {
                        selected.push(options[i].value);
                      }
                    }
                    setSelectedPrograms(selected);
                  }}
                >
                  <option value="" disabled>Select Programs...</option>
                  {uniqueProgramMasterNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Min Score:</label>
                <input type="number" style={styles.filterInputSmall} min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Max Score:</label>
                <input type="number" style={styles.filterInputSmall} min="0" max="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
              </div>

              <button onClick={resetFilters} style={styles.resetFilterButton}>Reset Filters</button>
            </div>
          </div>

          <div style={styles.chartGrid}>
            {/* LEFT: PIE CHART */}
            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>
                {selectedUniversity === 'all' ? 'Top Programs (Distribution)' : `Programs at ${selectedUniversity}`}
              </h4>
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

            {/* RIGHT: HORIZONTAL BAR CHART */}
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
                      borderRadius: 4,
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

            {/* BOTTOM RIGHT: QUICK STATS */}
            <div style={styles.statsCardLarge}>
              <h4 style={styles.panelHeader}>
                {selectedUniversity === 'all' ? '📊 Platform Overview' : `📍 ${selectedUniversity}`}
              </h4>
              <div style={styles.statRow}>
                <span style={styles.statRowLabel}>Total Candidates</span>
                <span style={styles.statRowValue}>{filteredCandidates.length}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statRowLabel}>Average Score</span>
                <span style={styles.statRowValue} style={{color: filteredAverageScore >= 70 ? '#2e7d32' : '#c62828'}}>
                  {filteredAverageScore > 0 ? `${filteredAverageScore}%` : 'N/A'}
                </span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statRowLabel}>Number of Programs</span>
                <span style={styles.statRowValue}>{new Set(filteredCandidates.map(c => c.programme).filter(Boolean)).size}</span>
              </div>
              <div style={styles.topProgramContainer}>
                <div style={styles.topProgramLabel}>Most Popular Program:</div>
                <div style={styles.topProgramValue}>
                  {programmeStats.length > 0 ? programmeStats[0].name : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={styles.tabsContainer}>
          <TabButton
            active={activeTab === 'candidates'}
            onClick={() => setActiveTab('candidates')}
            label={`All Candidates (${candidates.length})`}
          />
          <TabButton
            active={activeTab === 'national_service'}
            onClick={() => setActiveTab('national_service')}
            label={`National Service (${nationalServiceReports.length})`}
          />
          <TabButton
            active={activeTab === 'other'}
            onClick={() => setActiveTab('other')}
            label={`Other Assessments (${otherReports.length})`}
          />
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'candidates' && (
            <CandidatesTab
              candidates={filteredCandidates} // Uses the filter logic
              selectedAssessments={selectedAssessments}
              onAssessmentChange={handleAssessmentChange}
              onAssessmentSelect={handleAssessmentSelect}
            />
          )}

          {activeTab === 'national_service' && (
            <NationalServiceTab
              reports={nationalServiceReports}
              getScoreColor={getScoreColor}
              getScoreTextColor={getScoreTextColor}
              getRecommendationColor={getRecommendationColor}
              onViewReport={handleViewReport}
            />
          )}

          {activeTab === 'other' && (
            <OtherAssessmentsTab
              reports={otherReports}
              onViewReport={handleViewReport}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabButton,
        background: active ? '#1a237e' : 'white',
        color: active ? 'white' : '#1a237e',
        border: active ? 'none' : '1px solid #e2e8f0'
      }}
    >
      {label}
    </button>
  );
}

function NationalServiceTab({ reports, getScoreColor, getScoreTextColor, getRecommendationColor, onViewReport }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All National Service assessment reports assigned to this supervisor. ({reports.length} reports)</p>
      </div>
      {reports.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No National Service assessments found.</p>
        </div>
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
                const status = report.status || 'unknown';
                const isCompleted = status === 'completed' || report.result_id !== null;
                const hasScores = workplaceScore > 0 || intellectualScore > 0 || overallScore > 0;

                const displayRecommendation = calculateNationalServiceRecommendation(
                  workplaceScore, intellectualScore, overallScore
                );

                return (
                  <tr key={report.result_id || report.candidate_id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{report.candidate_name}</div>
                      <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: isCompleted ? '#dcfce7' : '#fef3c7',
                        color: isCompleted ? '#166534' : '#92400e'
                      }}>
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
        <div style={styles.emptyState}>
          <p>No other assessments found.</p>
        </div>
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
              {reports.map((report) => (
                <tr key={report.result_id || `${report.candidate_id}-${report.assessment_id}`} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.cellName}>{report.candidate_name}</div>
                    <div style={styles.cellSub}>{report.university || ''} • {report.programme || ''}</div>
                  </td>
                  <td style={styles.td}>
                    {report.assessment_title}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.scoreBadge}>
                      {Math.round(Number(report.score || report.overallScore || report.percentage_score || 0))}%
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CandidatesTab({ candidates, selectedAssessments, onAssessmentChange, onAssessmentSelect }) {
  return (
    <div style={styles.tabPanel}>
      <div style={styles.tabDescription}>
        <p>All candidates assigned to you. ({candidates.length} candidates)</p>
      </div>
      {candidates.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No candidates assigned to you yet.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Completed</th>
                <th style={styles.th}>In Progress</th>
                <th style={styles.th}>Select Assessment</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                const completedAssessments = Array.isArray(candidate.completedAssessments)
                  ? candidate.completedAssessments
                  : [];
                const stats = candidate.stats || {};
                const selectedId = selectedAssessments[candidate.id] ||
                  (completedAssessments.length > 0 ? completedAssessments[0].assessment_id : '');

                return (
                  <tr key={candidate.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.cellName}>{candidate.full_name || candidate.name || 'Unnamed Candidate'}</div>
                      <div style={styles.cellSub}>{candidate.email || ''}</div>
                      <div style={styles.cellSub}>{candidate.university || ''} • {candidate.programme || ''}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statBadgeCompleted}>{stats.completed || 0}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statBadgeProgress}>{stats.inProgress || 0}</span>
                    </td>
                    <td style={styles.td}>
                      <select
                        onChange={(event) => onAssessmentChange(candidate.id, event.target.value)}
                        style={styles.assessmentDropdown}
                        value={selectedId}
                      >
                        <option value="">-- Select --</option>
                        {completedAssessments.map((assessment) => (
                          <option key={`${candidate.id}-${assessment.assessment_id}`} value={assessment.assessment_id}>
                            {assessment.title} ({Math.round(Number(assessment.score || assessment.percentage_score || 0))}%)
                          </option>
                        ))}
                        {completedAssessments.length === 0 && (
                          <option value="" disabled>No completed assessments</option>
                        )}
                      </select>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => onAssessmentSelect(candidate.id, selectedId)}
                        style={styles.viewReportButtonSmall}
                        disabled={completedAssessments.length === 0}
                      >
                        View Report
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
  debugBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#475569',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '16px',
    fontSize: '12px'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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

  // 🟢 ANALYTICS & FILTER STYLES
  analyticsWrapper: {
    marginBottom: '24px'
  },
  analyticsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  analyticsTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    margin: 0
  },
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569'
  },
  filterSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    minWidth: '140px'
  },
  filterSelectMulti: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    minWidth: '180px',
    height: '80px',
    overflowY: 'auto'
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
    padding: '6px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#475569'
  },
  chartGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
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

  // TABS & TABLES
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
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
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap'
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
  tr: { transition: 'background 0.2s' },
  cellName: { fontWeight: '600', color: '#1a202c' },
  cellSub: { fontSize: '12px', color: '#94a3b8' },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
    background: '#f1f5f9'
  },
  recommendationBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
    background: 'white',
    border: '1px solid #e2e8f0'
  },
  viewButton: {
    padding: '6px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  viewReportButtonSmall: {
    padding: '4px 12px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  pendingText: { color: '#94a3b8', fontSize: '13px' },
  assessmentDropdown: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    background: 'white',
    minWidth: '140px',
    maxWidth: '220px'
  },
  statBadgeCompleted: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#dcfce7',
    color: '#166534'
  },
  statBadgeProgress: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#dbeafe',
    color: '#1e40af'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: '8px'
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
