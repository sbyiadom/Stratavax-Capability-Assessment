// pages/admin/index.js - TRUE INFOGRAPHIC DASHBOARD (FIXED SCORES & BAR CHARTS)
// FIXED: Aggressive program consolidation + dynamic filtering for all charts

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import AssessmentExpiration from "../../components/admin/AssessmentExpiration";

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
// REACT-SELECT IMPORTS
// ============================================================
import Select from 'react-select';

// ============================================================
// 🟢 NORMALIZATION ENGINE - AGGRESSIVE CONSOLIDATION
// ============================================================
const ABBREVIATIONS = {
  'bsc': 'BSc', 'b.sc': 'BSc', 'b. sc': 'BSc', 'b.s.c': 'BSc',
  'bachelor': 'Bachelor', 'btech': 'B-Tech', 'b.tech': 'B-Tech',
  'eng': 'Engineering', 'engr': 'Engineering',
  'elec': 'Electrical', 'electronics': 'Electronics',
  'mech': 'Mechanical', 'mechanical': 'Mechanical',
  'knust': 'Kwame Nkrumah University of Science and Technology',
  'ug': 'University of Ghana',
  'umat': 'University of Mines and Technology',
  'ucc': 'University of Cape Coast',
  'of': 'of', 'and': 'and', 'in': 'in', 'with': 'with',
  'admin': 'Administration', 'adminis': 'Administration',
  'procurement': 'Procurement', 'logistics': 'Logistics',
  'supply': 'Supply', 'chain': 'Chain', 'management': 'Management',
  'information': 'Information', 'technology': 'Technology',
  'communication': 'Communication', 'business': 'Business',
  'agricultural': 'Agricultural', 'chemical': 'Chemical',
  'civil': 'Civil', 'computer': 'Computer', 'industrial': 'Industrial',
  'petroleum': 'Petroleum', 'geological': 'Geological', 'geomatic': 'Geomatic',
  'materials': 'Materials', 'material': 'Materials', 'psychology': 'Psychology',
  'statistics': 'Statistics', 'mathematics': 'Mathematics', 'math': 'Mathematics',
  'secretariat': 'Secretariatship', 'mechatronics': 'Mechatronics',
  'mechatron': 'Mechatronics', 'psych': 'Psychology',
  'kpoly': 'Kumasi Technical University', 'poly': 'Technical University', 
  'tech': 'Technical', 'umat': 'University of Mines and Technology',
  'telecom': 'Telecommunications', 'renewable': 'Renewable',
  'laboratory': 'Laboratory', 'lab': 'Laboratory',
  'politics': 'Political Science', 'political': 'Political Science',
  'food': 'Food Science', 'science': 'Science'
};

const IGNORE_WORDS = new Set(['of', 'and', 'in', 'with', 'for', 'the', 'at', 'to', 'on', 'by', 'from', 'university']);

function normalizeText(raw, abbreviations = ABBREVIATIONS) {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ');
  const mappedWords = words.map(word => abbreviations[word] || word.charAt(0).toUpperCase() + word.slice(1));
  return mappedWords.join(' ');
}

// AGGRESSIVE PROGRAM CONSOLIDATION
function consolidateProgramName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  
  const lower = raw.toLowerCase();
  
  // Electrical/Electronic Engineering
  if (lower.includes('electrical') || lower.includes('electronic') || lower.includes('elect/electron')) {
    return 'BSc Electrical/Electronic Engineering';
  }
  // Mechanical Engineering
  if (lower.includes('mechanical') || lower.includes('mech')) {
    return 'BSc Mechanical Engineering';
  }
  // Chemical Engineering
  if (lower.includes('chemical') || lower.includes('chem')) {
    return 'BSc Chemical Engineering';
  }
  // Civil Engineering
  if (lower.includes('civil')) {
    return 'BSc Civil Engineering';
  }
  // Computer Engineering
  if (lower.includes('computer')) {
    return 'BSc Computer Engineering';
  }
  // Industrial Engineering
  if (lower.includes('industrial')) {
    return 'BSc Industrial Engineering';
  }
  // Agricultural Engineering
  if (lower.includes('agricultural') || lower.includes('agric')) {
    return 'BSc Agricultural Engineering';
  }
  // Petroleum Engineering
  if (lower.includes('petroleum') || lower.includes('petrol')) {
    return 'BSc Petroleum Engineering';
  }
  // Geological Engineering
  if (lower.includes('geological') || lower.includes('geo')) {
    return 'BSc Geological Engineering';
  }
  // Geomatic Engineering
  if (lower.includes('geomatic')) {
    return 'BSc Geomatic Engineering';
  }
  // Materials Engineering
  if (lower.includes('materials') || lower.includes('material')) {
    return 'BSc Materials Engineering';
  }
  // Telecommunications Engineering
  if (lower.includes('telecommunications') || lower.includes('telecom')) {
    return 'BSc Telecommunications Engineering';
  }
  // Renewable Energy Engineering
  if (lower.includes('renewable') || lower.includes('energy')) {
    return 'BSc Renewable Energy Engineering';
  }
  // Psychology
  if (lower.includes('psychology') || lower.includes('psych')) {
    return 'BA Psychology';
  }
  // Political Science
  if (lower.includes('political science') || lower.includes('politics')) {
    return 'BA Political Science';
  }
  // Laboratory Technology
  if (lower.includes('laboratory') || lower.includes('lab')) {
    return 'BSc Laboratory Technology';
  }
  // Food Science
  if (lower.includes('food science') || lower.includes('food')) {
    return 'BSc Food Science';
  }
  // Statistics/Mathematics
  if (lower.includes('statistics') || lower.includes('mathematics') || lower.includes('math')) {
    return 'BSc Statistics and Mathematics';
  }
  // Management/Business
  if (lower.includes('management') || lower.includes('business') || lower.includes('admin')) {
    return 'Business Administration';
  }
  // Arts
  if (lower.includes('arts') || lower.includes('ba ')) {
    return 'BA Arts';
  }
  // Default - try to clean up
  return raw;
}

function getUniqueMasterNames(rawItems) {
  if (!rawItems || rawItems.length === 0) return { groups: [], masterToRawMap: {} };
  
  const groups = [];
  const masterToRawMap = {};
  const processed = new Set();
  
  // First, consolidate all raw names
  const consolidatedMap = {};
  rawItems.forEach(raw => {
    const consolidated = consolidateProgramName(raw);
    if (!consolidatedMap[consolidated]) {
      consolidatedMap[consolidated] = [];
    }
    consolidatedMap[consolidated].push(raw);
  });
  
  // Get unique consolidated names
  const uniqueConsolidated = Object.keys(consolidatedMap);
  
  uniqueConsolidated.forEach(name => {
    if (!processed.has(name)) {
      processed.add(name);
      groups.push(name);
      masterToRawMap[name] = consolidatedMap[name] || [];
    }
  });
  
  return { groups, masterToRawMap };
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "N/A";
  }
}

async function getExactCount(tableName, configureQuery) {
  try {
    let query = supabase.from(tableName).select("*", { count: "exact", head: true });
    if (typeof configureQuery === "function") query = configureQuery(query);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Count error for " + tableName + ":", error);
    return 0;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const [selectedUniversityOption, setSelectedUniversityOption] = useState(null);
  const [selectedProgramOptions, setSelectedProgramOptions] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0,
    inProgressSessions: 0,
    totalResults: 0
  });

  const [allCandidates, setAllCandidates] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [recentResults, setRecentResults] = useState([]);

  // ============================================================
  // 🟢 DATA PREPARATION - Join Scores to Candidates
  // ============================================================
  const candidatesWithScores = useMemo(() => {
    const scoreMap = {};
    const resultMap = {};
    
    recentResults.forEach(r => {
      const userId = r.user_id;
      const score = toNumber(r.percentage_score);
      
      if (!scoreMap[userId] || score > scoreMap[userId]) {
        scoreMap[userId] = score;
        resultMap[userId] = {
          score: score,
          completed_at: r.completed_at,
          recommendation: r.recommendation
        };
      }
    });

    return allCandidates.map(c => ({
      ...c,
      score: scoreMap[c.id] || 0,
      hasResult: !!scoreMap[c.id],
      resultDetails: resultMap[c.id] || null,
      // Add consolidated program name
      consolidatedProgram: consolidateProgramName(c.programme)
    }));
  }, [allCandidates, recentResults]);

  // ============================================================
  // 🟢 GROUP NORMALIZATION - Using aggressive consolidation
  // ============================================================
  const rawUniversities = useMemo(() => candidatesWithScores.map(c => c.university).filter(Boolean), [candidatesWithScores]);
  const rawPrograms = useMemo(() => candidatesWithScores.map(c => c.programme).filter(Boolean), [candidatesWithScores]);

  const uniGroup = useMemo(() => getUniqueMasterNames(rawUniversities), [rawUniversities]);
  const progGroup = useMemo(() => getUniqueMasterNames(rawPrograms), [rawPrograms]);

  // ============================================================
  // 🟢 FILTER LOGIC
  // ============================================================
  const filteredCandidates = useMemo(() => {
    let filtered = candidatesWithScores;

    // Filter by University (using consolidated name)
    if (selectedUniversityOption) {
      const rawVariants = selectedUniversityOption.rawVariants || [];
      filtered = filtered.filter(c => {
        return rawVariants.includes(c.university) || c.university === selectedUniversityOption.value;
      });
    }

    // Filter by Program (using consolidated name)
    if (selectedProgramOptions.length > 0) {
      const allowedRawNames = [];
      selectedProgramOptions.forEach(opt => {
        const rawVariants = opt.rawVariants || [];
        allowedRawNames.push(...rawVariants);
        allowedRawNames.push(opt.value);
      });
      filtered = filtered.filter(c => {
        return allowedRawNames.includes(c.programme);
      });
    }

    // Filter by Score Range
    filtered = filtered.filter(c => {
      return c.score >= Number(minScore) && c.score <= Number(maxScore);
    });

    return filtered;
  }, [candidatesWithScores, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);

  // ============================================================
  // 🟢 FILTERED ANALYTICS
  // ============================================================
  
  // 1. Filtered University Analytics
  const filteredUniversityAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.university) return;
      
      let master = c.university;
      for (const [m, rawList] of Object.entries(uniGroup.masterToRawMap)) {
        if (rawList.includes(c.university)) { 
          master = m; 
          break; 
        }
      }
      
      if (!map[master]) {
        map[master] = { 
          candidates: 0, 
          scoreTotal: 0,
          rawNames: new Set()
        };
      }
      map[master].candidates += 1;
      map[master].scoreTotal += c.score;
      map[master].rawNames.add(c.university);
    });
    
    return Object.entries(map).map(([name, data]) => ({
      name,
      candidates: data.candidates,
      avgScore: data.candidates > 0 ? Math.round(data.scoreTotal / data.candidates) : 0,
      rawVariants: Array.from(data.rawNames)
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredCandidates, uniGroup.masterToRawMap]);

  // 2. Filtered Program Analytics - Using consolidated names
  const filteredProgramAnalytics = useMemo(() => {
    const map = {};
    
    filteredCandidates.forEach(c => {
      if (!c.programme) return;
      
      // Use the consolidated program name
      const consolidatedName = c.consolidatedProgram || c.programme;
      
      if (!map[consolidatedName]) {
        map[consolidatedName] = { 
          candidates: 0, 
          scoreTotal: 0,
          rawVariants: new Set()
        };
      }
      map[consolidatedName].candidates += 1;
      map[consolidatedName].scoreTotal += c.score;
      map[consolidatedName].rawVariants.add(c.programme);
    });
    
    return Object.entries(map).map(([name, data]) => ({
      name,
      candidates: data.candidates,
      avgScore: data.candidates > 0 ? Math.round(data.scoreTotal / data.candidates) : 0,
      rawVariants: Array.from(data.rawVariants)
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredCandidates]);

  // 3. Filtered Global Stats
  const filteredGlobalAverageScore = useMemo(() => {
    const scores = filteredCandidates
      .map(c => c.score)
      .filter(s => s > 0);
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [filteredCandidates]);

  const filteredGlobalPassRate = useMemo(() => {
    const scores = filteredCandidates.map(c => c.score);
    if (scores.length === 0) return 0;
    const passed = scores.filter(s => s >= 70).length;
    return Math.round((passed / scores.length) * 100);
  }, [filteredCandidates]);

  const filteredTotalCandidates = filteredCandidates.length;

  // 4. Filtered Pie Charts
  const filteredUniversityPieData = useMemo(() => {
    const top8 = filteredUniversityAnalytics.slice(0, 8);
    const othersCount = filteredUniversityAnalytics.slice(8).reduce((sum, u) => sum + u.candidates, 0);
    const labels = top8.map(u => u.name);
    const data = top8.map(u => u.candidates);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [filteredUniversityAnalytics]);

  const filteredProgramPieData = useMemo(() => {
    const top8 = filteredProgramAnalytics.slice(0, 8);
    const othersCount = filteredProgramAnalytics.slice(8).reduce((sum, p) => sum + p.candidates, 0);
    const labels = top8.map(p => p.name);
    const data = top8.map(p => p.candidates);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [filteredProgramAnalytics]);

  // 5. Score Distribution for Filtered Data
  const filteredScoreDistribution = useMemo(() => {
    const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const counts = new Array(bins.length - 1).fill(0);
    
    filteredCandidates.forEach(c => {
      const score = c.score;
      for (let i = 0; i < bins.length - 1; i++) {
        if (score >= bins[i] && score < bins[i + 1]) {
          counts[i]++;
          break;
        }
      }
    });
    return { bins, counts };
  }, [filteredCandidates]);

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c'];

  // ============================================================
  // 🟢 FILTER DROPDOWN OPTIONS (Consolidated)
  // ============================================================
  const universityOptions = useMemo(() => {
    return uniGroup.groups
      .sort()
      .map(name => ({ 
        label: name, 
        value: name,
        rawVariants: uniGroup.masterToRawMap[name] || []
      }));
  }, [uniGroup]);

  const programOptions = useMemo(() => {
    return progGroup.groups
      .sort()
      .map(name => ({ 
        label: name, 
        value: name,
        rawVariants: progGroup.masterToRawMap[name] || []
      }));
  }, [progGroup]);

  const resetFilters = () => {
    setSelectedUniversityOption(null);
    setSelectedProgramOptions([]);
    setMinScore(0);
    setMaxScore(100);
  };

  // ============================================================
  // 🟢 AUTH & FETCH
  // ============================================================
  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      setLoading(true);
      setAuthError(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;
      if (!activeSession?.user) { router.push("/login"); return; }

      const userId = activeSession.user.id;
      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;
      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") { 
        setAuthError("Admin access is required."); 
        router.push("/supervisor"); 
        return; 
      }
      if (profile?.is_active === false) { 
        await supabase.auth.signOut(); 
        router.push("/login"); 
        return; 
      }

      setIsAdmin(true);
      await fetchDashboardData();
    } catch (error) {
      console.error("Admin auth error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardData() {
    try {
      console.log("Fetching dashboard data...");

      const [
        supervisorCount, 
        candidateCount, 
        assessmentCount, 
        completedCount, 
        resultCount, 
        inProgressCount, 
        accessResponse, 
        allCandidatesResponse, 
        recentCandidatesResponse, 
        resultsResponse
      ] = await Promise.all([
        getExactCount("supervisor_profiles"),
        getExactCount("candidate_profiles"),
        getExactCount("assessments", (query) => query.eq("is_active", true)),
        getExactCount("candidate_assessments", (query) => query.eq("status", "completed")),
        getExactCount("assessment_results"),
        getExactCount("assessment_sessions", (query) => query.eq("status", "in_progress")),
        supabase.from("candidate_assessments").select("status"),
        supabase
          .from("candidate_profiles")
          .select("id, full_name, email, university, programme, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("candidate_profiles")
          .select("id, full_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("assessment_results")
          .select(`
            id, 
            user_id, 
            assessment_id, 
            total_score, 
            max_score, 
            percentage_score, 
            completed_at,
            recommendation
          `)
          .order("completed_at", { ascending: false })
          .limit(10000)
      ]);

      const accessRows = safeArray(accessResponse?.data || []);
      const unblockedCount = accessRows.filter((item) => item.status === "unblocked").length;
      const blockedCount = accessRows.filter((item) => item.status === "blocked").length;

      setStats({
        totalSupervisors: supervisorCount || 0,
        totalCandidates: candidateCount || 0,
        totalAssessments: assessmentCount || 0,
        completedAssessments: completedCount || 0,
        unblockedAssessments: unblockedCount || 0,
        blockedAssessments: blockedCount || 0,
        inProgressSessions: inProgressCount || 0,
        totalResults: resultCount || 0
      });

      setAllCandidates(allCandidatesResponse?.data || []);
      setRecentCandidates(recentCandidatesResponse?.data || []);
      setRecentResults(resultsResponse?.data || []);
      
      console.log("Fetched results count:", resultsResponse?.data?.length || 0);
      console.log("Candidates count:", allCandidatesResponse?.data?.length || 0);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("userSession");
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading admin dashboard...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.errorIcon}>!</div>
        <p style={styles.errorText}>Authentication Error</p>
        <p style={styles.errorDetail}>{authError}</p>
        <button onClick={() => router.push("/supervisor")} style={styles.backButton}>Back to Dashboard</button>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Admin Dashboard</h1>
            <p style={styles.subtitle}>System administration, users, assessments, and platform activity.</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={fetchDashboardData} style={styles.refreshButton}>Refresh</button>
            <button onClick={handleLogout} style={styles.logoutButton}>Sign Out</button>
          </div>
        </div>

        {/* 🟢 STATS CARDS - Now show FILTERED data */}
        <div style={styles.statsRow}>
          <StatCard icon="👥" label="Filtered Candidates" value={filteredTotalCandidates} subValue={`of ${stats.totalCandidates} total`} />
          <StatCard icon="📊" label="Avg Score" value={`${filteredGlobalAverageScore}%`} />
          <StatCard icon="✅" label="Pass Rate" value={`${filteredGlobalPassRate}%`} />
          <StatCard icon="📚" label="Programs in Filter" value={filteredProgramAnalytics.length} />
          <StatCard icon="📋" label="Active Assessments" value={stats.totalAssessments} />
          <StatCard icon="✓" label="Completed" value={stats.completedAssessments} />
          <StatCard icon="◉" label="In Progress" value={stats.inProgressSessions} />
          <StatCard icon="📈" label="Result Records" value={stats.totalResults} />
        </div>

        {/* 🟢 FILTERS BAR */}
        <div style={styles.filtersBar}>
          <div style={styles.filtersRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>University:</label>
              <Select
                className="react-select-container"
                classNamePrefix="react-select"
                options={universityOptions}
                value={selectedUniversityOption}
                onChange={(option) => { 
                  setSelectedUniversityOption(option); 
                  setSelectedProgramOptions([]); 
                }}
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
                <input 
                  type="number" 
                  style={styles.filterInputSmall} 
                  min="0" 
                  max="100" 
                  value={minScore} 
                  onChange={(e) => setMinScore(e.target.value)} 
                />
              </div>
              <div style={styles.scoreInputWrapper}>
                <label style={styles.filterLabelSmall}>Max:</label>
                <input 
                  type="number" 
                  style={styles.filterInputSmall} 
                  min="0" 
                  max="100" 
                  value={maxScore} 
                  onChange={(e) => setMaxScore(e.target.value)} 
                />
              </div>
            </div>

            <button onClick={resetFilters} style={styles.resetFilterButton}>Reset Filters</button>
          </div>
        </div>

        {/* 🟢 PIE CHARTS - FILTERED DATA */}
        <div style={styles.pieChartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>University Distribution (Filtered)</h4>
            <div style={{ height: '250px', position: 'relative' }}>
              <Pie
                data={{
                  labels: filteredUniversityPieData.labels,
                  datasets: [{ 
                    data: filteredUniversityPieData.data, 
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
                      labels: { 
                        boxWidth: 12, 
                        padding: 10, 
                        font: { size: 11 } 
                      } 
                    } 
                  } 
                }}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Program Distribution (Filtered)</h4>
            <div style={{ height: '250px', position: 'relative' }}>
              <Pie
                data={{
                  labels: filteredProgramPieData.labels,
                  datasets: [{ 
                    data: filteredProgramPieData.data, 
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
                      labels: { 
                        boxWidth: 12, 
                        padding: 10, 
                        font: { size: 11 } 
                      } 
                    } 
                  } 
                }}
              />
            </div>
          </div>
        </div>

        {/* 🟢 PERFORMANCE BAR CHARTS - FILTERED DATA */}
        <div style={styles.barChartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Top Universities (By Avg Score - Filtered)</h4>
            <div style={{ height: '400px' }}>
              <Bar
                data={{
                  labels: filteredUniversityAnalytics.slice(0, 15).map(u => u.name),
                  datasets: [{
                    label: 'Avg Score %',
                    data: filteredUniversityAnalytics.slice(0, 15).map(u => u.avgScore),
                    backgroundColor: '#1a237e',
                    borderRadius: 4,
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true, max: 100 } }
                }}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Top Programs (By Avg Score - Filtered)</h4>
            <div style={{ height: '400px' }}>
              <Bar
                data={{
                  labels: filteredProgramAnalytics.slice(0, 15).map(p => p.name),
                  datasets: [{
                    label: 'Avg Score %',
                    data: filteredProgramAnalytics.slice(0, 15).map(p => p.avgScore),
                    backgroundColor: '#2e7d32',
                    borderRadius: 4,
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true, max: 100 } }
                }}
              />
            </div>
          </div>
        </div>

        {/* 🟢 SCORE DISTRIBUTION - FILTERED DATA */}
        <div style={{ ...styles.chartCard, marginBottom: '24px' }}>
          <h4 style={styles.chartTitle}>Score Distribution (Filtered)</h4>
          <div style={{ height: '250px' }}>
            <Bar
              data={{
                labels: filteredScoreDistribution.bins.slice(0, -1).map((b, i) => `${b}-${filteredScoreDistribution.bins[i+1]}%`),
                datasets: [{
                  label: 'Number of Candidates',
                  data: filteredScoreDistribution.counts,
                  backgroundColor: '#1a237e',
                  borderRadius: 4,
                }]
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
              }}
            />
          </div>
        </div>

        {/* ACTION CARDS */}
        <div style={styles.actionCardsGrid}>
          <ActionCard href="/admin/add-supervisor" icon="+" title="Add Supervisor" description="Create new supervisor accounts with dashboard access." />
          <ActionCard href="/admin/manage-supervisors" icon="👥" title="Manage Supervisors" description="View, activate, deactivate, or update supervisor accounts." />
          <ActionCard href="/admin/manage-candidates" icon="🎓" title="Manage Candidates" description="View candidate profiles, reset access, and review activity." />
          <ActionCard href="/admin/assign-candidates" icon="🔗" title="Assign Supervisors" description="Assign candidates to specific supervisors for management." />
          <ActionCard href="/admin/assign-assessments" icon="📋" title="Assign Assessments" description="Assign, unblock, or block candidate assessments." />
          <ActionCard href="/admin/batch-manage" icon="📦" title="Batch Manage" description="Perform bulk administrative actions and candidate updates." />
          <ActionCard href="/admin/audit-logs" icon="▤" title="Audit Logs" description="View system activity, access events, and administrative actions." />
          <ActionCard href="/admin/system-settings" icon="⚙" title="System Settings" description="Configure platform settings and assessment parameters." />
          <ActionCard href="/admin/reports" icon="📄" title="Assessment Reports" description="View detailed assessment reports for all candidates." />
        </div>

        <div style={styles.sectionContainer}>
          <AssessmentExpiration />
        </div>

        <div style={styles.lowerGrid}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Recent Candidates</h2>
            {recentCandidates.length === 0 ? (
              <div style={styles.emptyState}>No candidates found.</div>
            ) : (
              <div style={styles.list}>
                {recentCandidates.map((candidate) => (
                  <div key={candidate.id} style={styles.listItem}>
                    <div>
                      <div style={styles.listTitle}>{candidate.full_name || candidate.email || "Candidate"}</div>
                      <div style={styles.listMeta}>{candidate.email || "No email"}</div>
                    </div>
                    <div style={styles.dateBadge}>{formatDate(candidate.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Recent Results</h2>
            {recentResults.length === 0 ? (
              <div style={styles.emptyState}>No results found.</div>
            ) : (
              <div style={styles.list}>
                {recentResults.slice(0, 6).map((result) => {
                  const candidate = allCandidates.find(c => c.id === result.user_id);
                  return (
                    <div key={result.id} style={styles.listItem}>
                      <div>
                        <div style={styles.listTitle}>
                          {candidate?.full_name || candidate?.email || "Candidate"}
                        </div>
                        <div style={styles.listMeta}>
                          Assessment • {formatDate(result.completed_at)}
                        </div>
                      </div>
                      <div style={styles.scoreBadge}>
                        {Math.round(toNumber(result.percentage_score, 0))}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
      `}</style>
    </AppLayout>
  );
}

function StatCard({ icon, label, value, subValue }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
        {subValue && <div style={{ fontSize: '12px', color: '#64748b' }}>{subValue}</div>}
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description }) {
  return (
    <Link href={href} legacyBehavior>
      <a style={styles.actionCard} className="action-card">
        <span style={styles.actionCardIcon}>{icon}</span>
        <div>
          <h3 style={styles.actionCardTitle}>{title}</h3>
          <p style={styles.actionCardDesc}>{description}</p>
        </div>
      </a>
    </Link>
  );
}

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

const styles = {
  checkingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
  errorIcon: { fontSize: "48px", marginBottom: "20px" },
  errorText: { fontSize: "20px", fontWeight: 700, marginBottom: "10px" },
  errorDetail: { fontSize: "14px", opacity: 0.85, marginBottom: "20px", maxWidth: "500px" },
  backButton: { padding: "12px 30px", background: "white", color: "#0a1929", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: 700, cursor: "pointer" },
  container: { width: "90vw", maxWidth: "1400px", margin: "0 auto", padding: "30px 20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "30px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  title: { margin: 0, color: "#0a1929", fontSize: "28px", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#667085", fontSize: "14px" },
  headerActions: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  refreshButton: { background: "#0a1929", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 },
  logoutButton: { background: "#f44336", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 },
  
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '16px 18px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
    minWidth: '180px',
    flex: 1,
    maxWidth: '280px'
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

  pieChartGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px'
  },

  barChartGrid: {
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

  actionCardsGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
    gap: "18px", 
    marginBottom: "30px" 
  },
  actionCard: { 
    background: "white", 
    padding: "20px", 
    borderRadius: "12px", 
    textDecoration: "none", 
    color: "inherit", 
    display: "flex", 
    alignItems: "center", 
    gap: "15px", 
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)", 
    border: "1px solid #eef2f7", 
    cursor: "pointer", 
    transition: "transform 0.15s ease, box-shadow 0.15s ease" 
  },
  actionCardIcon: { fontSize: "32px", flexShrink: 0 },
  actionCardTitle: { margin: 0, fontSize: "16px", fontWeight: 800, color: "#0a1929" },
  actionCardDesc: { margin: "5px 0 0", fontSize: "12px", color: "#718096", lineHeight: 1.45 },
  sectionContainer: { marginBottom: "30px" },
  lowerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "30px" },
  panel: { background: "white", borderRadius: "16px", padding: "22px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #eef2f7" },
  panelTitle: { margin: "0 0 16px", fontSize: "18px", color: "#0a1929", fontWeight: 800 },
  emptyState: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", color: "#64748b", textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: "10px" },
  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#f8fafc" },
  listTitle: { fontSize: "14px", fontWeight: 800, color: "#0f172a" },
  listMeta: { fontSize: "12px", color: "#64748b", marginTop: "4px" },
  dateBadge: { fontSize: "12px", color: "#334155", background: "#e2e8f0", padding: "5px 10px", borderRadius: "999px", whiteSpace: "nowrap" },
  scoreBadge: { fontSize: "13px", color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "6px 12px", borderRadius: "999px", fontWeight: 800 },

  '@media (max-width: 768px)': {
    pieChartGrid: { gridTemplateColumns: '1fr' },
    barChartGrid: { gridTemplateColumns: '1fr' },
    statsRow: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' },
    filterGroup: { minWidth: '140px', maxWidth: '100%' },
    scoreFilterGroup: { flexWrap: 'wrap' },
    header: { flexDirection: 'column', alignItems: 'flex-start' },
    headerActions: { width: '100%', justifyContent: 'flex-start' }
  }
};
