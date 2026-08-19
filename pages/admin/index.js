// pages/admin/index.js - TRUE INFOGRAPHIC DASHBOARD
// Uses 641 candidates, shows university & program analytics, and diverse charts.

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
// 🟢 SCORE CALCULATION ENGINE
// ============================================================
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
// 🟢 THE PROGRAM NORMALIZATION ENGINE
// ============================================================
const ABBREVIATIONS = {
  'bsc': 'BSc', 'b.sc': 'BSc', 'b. sc': 'BSc', 'b.s.c': 'BSc',
  'bachelor': 'Bachelor', 'btech': 'B-Tech', 'b.tech': 'B-Tech',
  'eng': 'Engineering', 'engr': 'Engineering',
  'elec': 'Electrical', 'electronics': 'Electronics',
  'mech': 'Mechanical', 'mechanical': 'Mechanical',
  'admin': 'Administration', 'adminis': 'Administration',
  'of': 'of', 'and': 'and', 'in': 'in', 'with': 'with'
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
  // 🟢 INFOGRAPHIC ANALYTICS CALCULATIONS (WHOLE DATASET)
  // ============================================================
  
  // 1. Overall Stats (Based on ALL candidates)
  const globalAverageScore = useMemo(() => {
    const scores = allCandidates.map(c => calculateTrueScore(c)).filter(s => s > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [allCandidates]);

  const globalPassRate = useMemo(() => {
    const scores = allCandidates.map(c => calculateTrueScore(c));
    if (scores.length === 0) return 0;
    const passed = scores.filter(s => s >= 70).length;
    return Math.round((passed / scores.length) * 100);
  }, [allCandidates]);

  // 2. University Analytics (Count, Avg Score, Program Count)
  const universityAnalytics = useMemo(() => {
    const map = {};
    allCandidates.forEach(c => {
      if (!c.university) return;
      if (!map[c.university]) {
        map[c.university] = { candidates: 0, scoreTotal: 0, programs: new Set() };
      }
      map[c.university].candidates += 1;
      map[c.university].scoreTotal += calculateTrueScore(c);
      if (c.programme) map[c.university].programs.add(c.programme);
    });
    
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        candidates: data.candidates,
        avgScore: Math.round(data.scoreTotal / data.candidates),
        programs: data.programs.size
      }))
      .sort((a, b) => b.candidates - a.candidates);
  }, [allCandidates]);

  // 3. Program Analytics (Avg Score)
  const programAnalytics = useMemo(() => {
    const map = {};
    allCandidates.forEach(c => {
      if (!c.programme) return;
      if (!map[c.programme]) {
        map[c.programme] = { candidates: 0, scoreTotal: 0 };
      }
      map[c.programme].candidates += 1;
      map[c.programme].scoreTotal += calculateTrueScore(c);
    });
    
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        candidates: data.candidates,
        avgScore: Math.round(data.scoreTotal / data.candidates)
      }))
      .sort((a, b) => b.candidates - a.candidates);
  }, [allCandidates]);

  // 4. Pie Chart Data (University Distribution)
  const universityPieData = useMemo(() => {
    const top8 = universityAnalytics.slice(0, 8);
    const othersCount = universityAnalytics.slice(8).reduce((sum, u) => sum + u.candidates, 0);
    const labels = top8.map(u => u.name);
    const data = top8.map(u => u.candidates);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [universityAnalytics]);

  // 5. Pie Chart Data (Program Distribution)
  const programPieData = useMemo(() => {
    const top8 = programAnalytics.slice(0, 8);
    const othersCount = programAnalytics.slice(8).reduce((sum, p) => sum + p.candidates, 0);
    const labels = top8.map(p => p.name);
    const data = top8.map(p => p.candidates);
    if (othersCount > 0) { labels.push('Others'); data.push(othersCount); }
    return { labels, data };
  }, [programAnalytics]);

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c'];

  // 6. Program Normalization for Filters
  const rawPrograms = useMemo(() => {
    return allCandidates.map(c => c.programme).filter(Boolean);
  }, [allCandidates]);

  const { groups: uniqueProgramMasterNames, masterToRawMap } = useMemo(() => {
    return getUniqueMasterNames(rawPrograms);
  }, [rawPrograms]);

  const universityOptions = useMemo(() => {
    const map = {};
    allCandidates.forEach(c => {
      if (c.university) map[c.university] = true;
    });
    return Object.keys(map).sort().map(uni => ({ label: uni, value: uni }));
  }, [allCandidates]);

  const programOptions = useMemo(() => {
    return uniqueProgramMasterNames.map(p => ({ label: p, value: p }));
  }, [uniqueProgramMasterNames]);

  const resetFilters = () => {
    setSelectedUniversityOption(null);
    setSelectedProgramOptions([]);
    setMinScore(0);
    setMaxScore(100);
  };

  // ============================================================
  // AUTH & FETCH
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

      if (resolvedRole !== "admin") { setAuthError("Admin access is required."); router.push("/supervisor"); return; }
      if (profile?.is_active === false) { await supabase.auth.signOut(); router.push("/login"); return; }

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

      const [ supervisorCount, candidateCount, assessmentCount, completedCount, resultCount, inProgressCount, accessResponse, allCandidatesResponse, recentCandidatesResponse, resultsResponse ] = await Promise.all([
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
            recommendation,
            candidate_profiles:user_id(full_name, email),
            assessments:assessment_id(title)
          `)
          .order("completed_at", { ascending: false })
          .limit(6)
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

        {/* 🟢 NEW INFOGRAPHIC STATS CARDS (Global) */}
        <div style={styles.statsRow}>
          <StatCard icon="👥" label="Total Candidates" value={stats.totalCandidates} />
          <StatCard icon="📊" label="Average Score" value={`${globalAverageScore}%`} />
          <StatCard icon="✅" label="Pass Rate (≥70%)" value={`${globalPassRate}%`} />
          <StatCard icon="📚" label="Total Programs" value={uniqueProgramMasterNames.length} />
          <StatCard icon="📋" label="Active Assessments" value={stats.totalAssessments} />
          <StatCard icon="✓" label="Completed" value={stats.completedAssessments} />
          <StatCard icon="◉" label="In Progress" value={stats.inProgressSessions} />
          <StatCard icon="📈" label="Result Records" value={stats.totalResults} />
        </div>

        {/* 🟢 ADVANCED FILTERS BAR */}
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

        {/* 🟢 INFOGRAPHIC CHARTS GRID (University & Program Pie Charts) */}
        <div style={styles.chartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>University Distribution (By Candidates)</h4>
            <div style={{ height: '250px', position: 'relative' }}>
              <Pie
                data={{
                  labels: universityPieData.labels,
                  datasets: [{ data: universityPieData.data, backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff' }]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } } }}
              />
            </div>
          </div>

          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Program Distribution (By Candidates)</h4>
            <div style={{ height: '250px', position: 'relative' }}>
              <Pie
                data={{
                  labels: programPieData.labels,
                  datasets: [{ data: programPieData.data, backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff' }]
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } } }}
              />
            </div>
          </div>
        </div>

        {/* 🟢 DETAILED ANALYTICS TABLES */}
        <div style={styles.analyticsTablesGrid}>
          <div style={styles.analyticsCard}>
            <h4 style={styles.analyticsTitle}>University Performance Overview</h4>
            <div style={styles.scrollTable}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>University</th>
                    <th style={styles.th}>Candidates</th>
                    <th style={styles.th}>Avg Score</th>
                    <th style={styles.th}>Programs</th>
                  </tr>
                </thead>
                <tbody>
                  {universityAnalytics.slice(0, 15).map((uni, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{uni.name}</td>
                      <td style={styles.td}>{uni.candidates}</td>
                      <td style={styles.td}>{uni.avgScore}%</td>
                      <td style={styles.td}>{uni.programs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.analyticsCard}>
            <h4 style={styles.analyticsTitle}>Program Performance Overview</h4>
            <div style={styles.scrollTable}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Programme</th>
                    <th style={styles.th}>Candidates</th>
                    <th style={styles.th}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {programAnalytics.slice(0, 15).map((prog, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{prog.name}</td>
                      <td style={styles.td}>{prog.candidates}</td>
                      <td style={styles.td}>{prog.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ACTION CARDS & EXTENSIONS */}
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
                {recentResults.map((result) => (
                  <div key={result.id} style={styles.listItem}>
                    <div>
                      <div style={styles.listTitle}>
                        {result.candidate_profiles?.full_name || 
                         result.candidate_profiles?.email || 
                         "Candidate"}
                      </div>
                      <div style={styles.listMeta}>
                        {result.assessments?.title || "Assessment"} • {formatDate(result.completed_at)}
                      </div>
                    </div>
                    <div style={styles.scoreBadge}>
                      {Math.round(toNumber(result.percentage_score, 0))}%
                    </div>
                  </div>
                ))}
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
      <a style={styles.actionCard}>
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
  
  // 🟢 UPDATED STATS GRID
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

  // 🟢 FILTERS BAR STYLES
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

  // 🟢 CHART GRID STYLES
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

  // 🟢 ANALYTICS TABLES STYLES
  analyticsTablesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '30px'
  },
  analyticsCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7'
  },
  analyticsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  scrollTable: {
    maxHeight: '300px',
    overflowY: 'auto'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '10px 12px', textAlign: 'left', background: '#f8fafc', fontWeight: '600', color: '#475569', position: 'sticky', top: 0, borderBottom: '2px solid #e2e8f0' },
  td: { padding: '10px 12px', borderBottom: '1px solid #eef2f7' },
  tr: { transition: 'background 0.2s' },

  // ACTION CARDS
  actionCardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "18px", marginBottom: "30px" },
  actionCard: { background: "white", padding: "20px", borderRadius: "12px", textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #eef2f7", cursor: "pointer" },
  actionCardIcon: { fontSize: "32px" },
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
  scoreBadge: { fontSize: "13px", color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "6px 12px", borderRadius: "999px", fontWeight: 800 }
};
