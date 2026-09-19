// pages/admin/index.js - CLEAN DASHBOARD WITH REAL METRICS
// Phase 6.5: All numbers come from real data. No hardcoded deltas.
// Fake formulas removed. Neutral delta badges.
// Phase 7A: row-level data fetched from /api/admin/dashboard-data.
// Removed client-side supervisor_profiles read and four direct Supabase reads.

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AssessmentExpiration from "../../components/admin/AssessmentExpiration";
import AdminSidebar from "../../components/AdminSidebar";

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
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// ============================================================
// REACT-SELECT IMPORTS
// ============================================================
import Select from 'react-select';

// ============================================================
// COLOR SYSTEM
// ============================================================
const COLORS = {
  primary: '#0F2747',
  primaryLight: '#1a3a6b',
  accent: '#2563EB',
  success: '#16A34A',
  warning: '#F59E0B',
  critical: '#DC2626',
  muted: '#64748B',
  background: '#F1F5F9',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1A202C',
  textMuted: '#64748B',
  sidebarBg: '#0F2747',
  sidebarHover: '#1a3a6b',
};

const STATUS_COLORS = {
  completed: '#16A34A',
  inProgress: '#F59E0B',
  scheduled: '#2563EB',
  unblocked: '#0D47A1',
  blocked: '#DC2626',
  notStarted: '#94A3B8',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
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

function formatTimeAgo(date) {
  if (!date) return "N/A";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Render a neutral delta. Both directions use the same style.
// Arrow + magnitude only. No color editorializing.
function formatDelta(deltaPct) {
  if (deltaPct === null || deltaPct === undefined) {
    return { text: '—', direction: 'flat' };
  }
  const rounded = Math.round(deltaPct * 10) / 10;
  if (rounded === 0) return { text: 'no change', direction: 'flat' };
  const arrow = rounded > 0 ? '↑' : '↓';
  const magnitude = Math.abs(rounded);
  return {
    text: `${arrow} ${magnitude}%`,
    direction: rounded > 0 ? 'up' : 'down',
  };
}

// ============================================================
// CONSOLIDATION FUNCTIONS (unchanged — used for university/program filters)
// ============================================================
function consolidateUniversityName(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return 'Not Specified';
  const lower = raw.toLowerCase().trim();
  const cleaned = raw.replace(/\s+/g, ' ').trim();

  if (lower === 'knust' || lower.includes('knust') || lower.includes('k.n.u.s.t') ||
      lower.includes('kwame nkrumah') || lower.includes('kwmane nkrumah') ||
      (lower.includes('kwame') && lower.includes('nkrumah'))) {
    return 'Kwame Nkrumah University of Science and Technology (KNUST)';
  }

  if (lower === 'umat' || lower.includes('umat') || lower.includes('u.m.a.t') ||
      (lower.includes('mines') && lower.includes('technology')) ||
      (lower.includes('mine') && lower.includes('technology')) ||
      (lower.includes('mines') && lower.includes('tech')) ||
      (lower.includes('mines') && lower.includes('tarkwa')) ||
      (lower.includes('university of mines'))) {
    return 'University of Mines and Technology (UMaT)';
  }

  if (lower === 'ug' || lower.includes('ug ') || lower.includes('u.g') ||
      lower === 'legon' || lower.includes('legon') || lower.includes('university of ghana')) {
    return 'University of Ghana (UG)';
  }

  if (lower === 'ucc' || lower.includes('ucc ') || lower.includes('u.c.c') ||
      lower.includes('cape coast') || lower.includes('capecoast') ||
      lower.includes('university of cape coast')) {
    return 'University of Cape Coast (UCC)';
  }

  if (lower === 'kstu' || lower.includes('kstu ') || lower.includes('k.s.t.u') ||
      (lower.includes('kumasi') && lower.includes('technical')) ||
      (lower.includes('kumasi') && lower.includes('tech'))) {
    return 'Kumasi Technical University (KSTU)';
  }

  if (lower.includes('takoradi') && lower.includes('technical')) return 'Takoradi Technical University';
  if (lower.includes('accra') && lower.includes('technical')) return 'Accra Technical University';
  if ((lower.includes('koforidua') || lower.includes('korforidua')) && lower.includes('technical')) {
    return 'Koforidua Technical University';
  }
  if (lower.includes('sunyani') && lower.includes('technical')) return 'Sunyani Technical University';
  if (lower.includes('cape coast') && lower.includes('technical')) return 'Cape Coast Technical University';
  if ((lower.includes('ho') || lower.includes('ho ')) && lower.includes('technical')) return 'Ho Technical University';
  if (lower.includes('tamale') && lower.includes('technical')) return 'Tamale Technical University';
  if (lower.includes('energy') && lower.includes('natural resources')) return 'University of Energy and Natural Resources';

  if (lower === 'uds' || lower.includes('uds ') || lower.includes('u.d.s') ||
      lower.includes('development studies') || lower.includes('university for development')) {
    return 'University for Development Studies (UDS)';
  }

  if (lower === 'gctu' || lower.includes('gctu ') || lower.includes('g.c.t.u') ||
      lower.includes('communication technology') || lower.includes('communications technology') ||
      lower.includes('ghana communication')) {
    return 'Ghana Communication Technology University (GCTU)';
  }

  if (lower === 'upsa' || lower.includes('upsa ') || lower.includes('u.p.s.a') ||
      lower.includes('professional studies')) {
    return 'University of Professional Studies (UPSA)';
  }

  if (lower === 'rmu' || lower.includes('rmu ') || lower.includes('regional maritime') ||
      lower.includes('maritime')) {
    return 'Regional Maritime University (RMU)';
  }

  if (lower === 'kpoly' || lower.includes('kpoly ') || lower.includes('k.poly') ||
      lower.includes('koforidua poly') || lower.includes('koforidua polytechnic')) {
    return 'Koforidua Polytechnic (KPoly)';
  }

  if (lower.includes('skills training') || lower.includes('entrepreneurial')) {
    return 'University of Skills Training and Entrepreneurial Development';
  }

  if (lower.includes('pentecost')) return 'Pentecost University';
  if (lower.includes('ashesi')) return 'Ashesi University';
  if (lower.includes('valley view')) return 'Valley View University';
  if (lower.includes('central university')) return 'Central University';

  if (lower === 'anu' || lower.includes('anu ') || lower.includes('all nations')) {
    return 'All Nations University';
  }

  if (lower.includes('ait') || lower.includes('a.i.t') || lower.includes('accra institute')) {
    return 'Accra Institute of Technology (AIT)';
  }

  if (!raw || raw.trim() === '') return 'Not Specified';
  return cleaned;
}

function consolidateProgramName(raw) {
  if (!raw || typeof raw !== 'string') return 'Unknown';
  const lower = raw.toLowerCase().trim();

  const cleanForMatch = (str) => {
    return str
      .toLowerCase()
      .replace(/bsc|b\.sc|b sc|bachelor|ba|b\.a|b a|b-tech|btech|b\.tech|diploma|hnd/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanLower = cleanForMatch(raw);

  if (cleanLower.includes('electrical') || cleanLower.includes('electronic') ||
      cleanLower.includes('elect/electron') || cleanLower.includes('electrical/electronic') ||
      cleanLower.includes('electrical electronic') || cleanLower.includes('electrical and electronic') ||
      cleanLower.includes('electrical & electronic') || lower === 'eee' || lower.includes('eee ')) {
    return 'BSc Electrical/Electronic Engineering';
  }
  if (cleanLower.includes('mechanical') || cleanLower.includes('mech') || lower === 'me' || lower.includes('me ')) {
    return 'BSc Mechanical Engineering';
  }
  if (cleanLower.includes('chemical') || cleanLower.includes('chem') || lower === 'che' || lower.includes('che ')) {
    return 'BSc Chemical Engineering';
  }
  if (cleanLower.includes('civil') || lower === 'ce' || lower.includes('ce ')) {
    return 'BSc Civil Engineering';
  }
  if (cleanLower.includes('computer') || lower === 'cpe' || lower.includes('cpe ')) {
    return 'BSc Computer Engineering';
  }
  if (cleanLower.includes('industrial') || lower === 'ie' || lower.includes('ie ')) {
    return 'BSc Industrial Engineering';
  }
  if (cleanLower.includes('agricultural') || cleanLower.includes('agric') || lower === 'age' || lower.includes('age ')) {
    return 'BSc Agricultural Engineering';
  }
  if (cleanLower.includes('petroleum') || cleanLower.includes('petrol') || lower === 'pe' || lower.includes('pe ')) {
    return 'BSc Petroleum Engineering';
  }
  if (cleanLower.includes('geological') || cleanLower.includes('geo') || lower === 'ge' || lower.includes('ge ')) {
    return 'BSc Geological Engineering';
  }
  if (cleanLower.includes('geomatic')) return 'BSc Geomatic Engineering';
  if (cleanLower.includes('materials') || cleanLower.includes('material') || lower === 'mte' || lower.includes('mte ')) {
    return 'BSc Materials Engineering';
  }
  if (cleanLower.includes('telecommunications') || cleanLower.includes('telecom') ||
      cleanLower.includes('telecommunication') || lower === 'tele' || lower.includes('tele ')) {
    return 'BSc Telecommunications Engineering';
  }
  if (cleanLower.includes('renewable') || cleanLower.includes('energy')) {
    return 'BSc Renewable Energy Engineering';
  }
  if (cleanLower.includes('automobile') || cleanLower.includes('auto')) {
    return 'BSc Automobile Engineering';
  }
  if (cleanLower.includes('information technology') || cleanLower.includes('info tech') ||
      lower === 'it' || lower.includes('it ')) {
    return 'BSc Information Technology';
  }
  if (cleanLower.includes('information systems') || cleanLower.includes('info systems')) {
    return 'BSc Information Systems';
  }
  if (cleanLower.includes('biomedical') || cleanLower.includes('bio medical')) {
    return 'BSc Biomedical Engineering';
  }
  if (cleanLower.includes('minerals') || cleanLower.includes('mining')) {
    return 'BSc Minerals Engineering';
  }
  if (cleanLower.includes('psychology') || cleanLower.includes('psych')) {
    return 'BA Psychology';
  }
  if (cleanLower.includes('political science') || cleanLower.includes('politics') || cleanLower.includes('political')) {
    return 'BA Political Science';
  }
  if (cleanLower.includes('laboratory') || cleanLower.includes('lab')) {
    return 'BSc Laboratory Technology';
  }
  if (cleanLower.includes('food science') || cleanLower.includes('food')) {
    return 'BSc Food Science and Postharvest Technology';
  }
  if ((cleanLower.includes('statistics') || cleanLower.includes('stat')) &&
      (cleanLower.includes('mathematics') || cleanLower.includes('math'))) {
    return 'BSc Statistics and Mathematics';
  }
  if (cleanLower.includes('mathematics') || cleanLower.includes('math') || lower === 'maths' || lower.includes('maths ')) {
    return 'BSc Mathematics';
  }
  if (cleanLower.includes('statistics') || cleanLower.includes('stat')) {
    return 'BSc Statistics';
  }
  if (cleanLower.includes('accounting') && cleanLower.includes('economics')) {
    return 'BSc Accounting and Economics';
  }
  if (cleanLower.includes('accounting')) return 'BSc Accounting';
  if (cleanLower.includes('economics')) return 'BSc Economics';
  if (cleanLower.includes('business administration') || cleanLower.includes('business admin') ||
      cleanLower.includes('management') || cleanLower.includes('admin') ||
      cleanLower.includes('secretariat') || cleanLower.includes('secretariatship')) {
    return 'Business Administration';
  }
  if (cleanLower.includes('marketing')) return 'BSc Marketing';
  if (cleanLower.includes('human resource') || cleanLower.includes('hr')) {
    return 'BSc Human Resource Management';
  }
  if (cleanLower.includes('public administration')) return 'BSc Public Administration';
  if (cleanLower.includes('public health')) return 'BSc Public Health';
  if (cleanLower.includes('nursing')) return 'BSc Nursing';
  if (cleanLower.includes('midwifery')) return 'BSc Midwifery';
  if (cleanLower.includes('architecture')) return 'BSc Architecture';
  if (cleanLower.includes('estate management') || cleanLower.includes('estate')) {
    return 'BSc Estate Management';
  }
  if (cleanLower.includes('quantity surveying') || cleanLower.includes('surveying')) {
    return 'BSc Quantity Surveying';
  }
  if (cleanLower.includes('arts') || lower.includes('ba ') || lower.includes('b.a ')) {
    return 'BA Arts';
  }
  if (cleanLower.includes('biological') || cleanLower.includes('biology')) {
    return 'BSc Biological Sciences';
  }
  if (cleanLower.includes('chemistry')) return 'BSc Chemistry';
  if (cleanLower.includes('physics')) return 'BSc Physics';

  let cleaned = raw.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  return cleaned || 'Unknown';
}

function getUniqueMasterNames(rawItems, consolidateFn) {
  if (!rawItems || rawItems.length === 0) return { groups: [], masterToRawMap: {} };
  const map = {};
  rawItems.forEach(raw => {
    const consolidated = consolidateFn(raw);
    if (!map[consolidated]) map[consolidated] = [];
    map[consolidated].push(raw);
  });
  return { groups: Object.keys(map), masterToRawMap: map };
}

// ============================================================
// CUSTOM SELECT STYLES
// ============================================================
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '32px',
    borderColor: state.isFocused ? COLORS.accent : COLORS.border,
    boxShadow: state.isFocused ? `0 0 0 1px ${COLORS.accent}` : 'none',
    '&:hover': { borderColor: COLORS.accent },
    fontSize: '13px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? COLORS.primary : state.isFocused ? '#e3f2fd' : 'white',
    color: state.isSelected ? 'white' : COLORS.text,
    '&:active': { backgroundColor: COLORS.primary },
    fontSize: '13px',
  }),
  multiValue: (base) => ({ ...base, backgroundColor: '#e3f2fd' }),
  multiValueLabel: (base) => ({ ...base, color: COLORS.primary, fontWeight: 600, fontSize: '12px' }),
  multiValueRemove: (base) => ({
    ...base,
    color: COLORS.primary,
    '&:hover': { backgroundColor: COLORS.primary, color: 'white' },
  }),
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedUniversityOption, setSelectedUniversityOption] = useState(null);
  const [selectedProgramOptions, setSelectedProgramOptions] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  // Real metrics from /api/admin/dashboard-stats
  const [dashStats, setDashStats] = useState(null);
  const [dashStatsError, setDashStatsError] = useState(null);

  const [allCandidates, setAllCandidates] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [candidateAssessmentsData, setCandidateAssessmentsData] = useState([]);

  // ============================================================
  // SIDEBAR TOGGLE
  // ============================================================
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================================
  // DATA PREPARATION (for filters + charts + recent lists)
  // ============================================================
  const candidatesWithScores = useMemo(() => {
    const scoreMap = {};
    const resultMap = {};

    allResults.forEach(r => {
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

    const statusMap = {};
    candidateAssessmentsData.forEach(ca => {
      if (!statusMap[ca.user_id]) statusMap[ca.user_id] = [];
      statusMap[ca.user_id].push(ca.status);
    });

    return allCandidates.map(c => {
      const hasResult = Object.prototype.hasOwnProperty.call(scoreMap, c.id);
      return {
        ...c,
        score: hasResult ? scoreMap[c.id] : null,
        hasResult: hasResult,
        resultDetails: hasResult ? resultMap[c.id] : null,
        consolidatedProgram: consolidateProgramName(c.programme),
        consolidatedUniversity: consolidateUniversityName(c.university),
        assessmentStatuses: statusMap[c.id] || ['not_started']
      };
    });
  }, [allCandidates, allResults, candidateAssessmentsData]);

  const rawUniversities = useMemo(() => candidatesWithScores.map(c => c.university).filter(Boolean), [candidatesWithScores]);
  const rawPrograms = useMemo(() => candidatesWithScores.map(c => c.programme).filter(Boolean), [candidatesWithScores]);

  const uniGroup = useMemo(() => getUniqueMasterNames(rawUniversities, consolidateUniversityName), [rawUniversities]);
  const progGroup = useMemo(() => getUniqueMasterNames(rawPrograms, consolidateProgramName), [rawPrograms]);

  // ============================================================
  // FILTER LOGIC
  // ============================================================
  const filteredCandidates = useMemo(() => {
    let filtered = candidatesWithScores;
    if (selectedUniversityOption) {
      const rawVariants = selectedUniversityOption.rawVariants || [];
      filtered = filtered.filter(c => rawVariants.includes(c.university) || c.university === selectedUniversityOption.value);
    }
    if (selectedProgramOptions.length > 0) {
      const allowedRawNames = [];
      selectedProgramOptions.forEach(opt => {
        const rawVariants = opt.rawVariants || [];
        allowedRawNames.push(...rawVariants);
        allowedRawNames.push(opt.value);
      });
      filtered = filtered.filter(c => allowedRawNames.includes(c.programme));
    }
    filtered = filtered.filter(c => {
      if (c.hasResult && c.score !== null) {
        return c.score >= Number(minScore) && c.score <= Number(maxScore);
      }
      return true;
    });
    return filtered;
  }, [candidatesWithScores, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);

  // ============================================================
  // FILTERED METRICS (real, from filtered candidate set)
  // ============================================================
  const completedFiltered = filteredCandidates.filter(c => c.hasResult && c.score !== null && Number.isFinite(c.score));
  const completionRate = filteredCandidates.length > 0
    ? Math.round((completedFiltered.length / filteredCandidates.length) * 100)
    : 0;

  const filteredGlobalAverageScore = useMemo(() => {
    const scores = completedFiltered.map(c => c.score).filter(s => s !== null);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [completedFiltered]);

  const filteredGlobalPassRate = useMemo(() => {
    const scores = completedFiltered.map(c => c.score).filter(s => s !== null);
    if (scores.length === 0) return 0;
    const passed = scores.filter(s => s >= 70).length;
    return Math.round((passed / scores.length) * 100);
  }, [completedFiltered]);

  // ============================================================
  // STATUS DISTRIBUTION
  // ============================================================
  const statusDistribution = useMemo(() => {
    const map = { completed: 0, inProgress: 0, scheduled: 0, unblocked: 0, blocked: 0, notStarted: 0 };
    filteredCandidates.forEach(c => {
      const statuses = c.assessmentStatuses || ['not_started'];
      const hasCompleted = c.hasResult === true;
      const hasInProgress = statuses.some(s => s === 'in_progress');
      const hasBlocked = statuses.some(s => s === 'blocked');
      const hasUnblocked = statuses.some(s => s === 'unblocked');
      const hasScheduled = statuses.some(s => s === 'scheduled');

      if (hasCompleted) map.completed += 1;
      else if (hasInProgress) map.inProgress += 1;
      else if (hasScheduled) map.scheduled += 1;
      else if (hasUnblocked) map.unblocked += 1;
      else if (hasBlocked) map.blocked += 1;
      else map.notStarted += 1;
    });
    return map;
  }, [filteredCandidates]);

  // ============================================================
  // UNIVERSITY ANALYTICS (real, from filtered set)
  // ============================================================
  const filteredUniversityAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.university) return;
      const name = c.consolidatedUniversity || c.university;
      if (!map[name]) {
        map[name] = { totalCandidates: 0, completedCandidates: 0, scoreTotal: 0, rawNames: new Set() };
      }
      map[name].totalCandidates += 1;
      map[name].rawNames.add(c.university);
      if (c.hasResult && c.score !== null && Number.isFinite(c.score)) {
        map[name].completedCandidates += 1;
        map[name].scoreTotal += c.score;
      }
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      totalCandidates: data.totalCandidates,
      completedCandidates: data.completedCandidates,
      completionRate: data.totalCandidates > 0 ? Math.round((data.completedCandidates / data.totalCandidates) * 100) : 0,
      avgScore: data.completedCandidates > 0 ? Math.round(data.scoreTotal / data.completedCandidates) : null,
    })).sort((a, b) => b.completedCandidates - a.completedCandidates).slice(0, 10);
  }, [filteredCandidates]);

  // Top performer by completion rate (min 10 candidates)
  const topPerformerByRate = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.university) return;
      const name = c.consolidatedUniversity || c.university;
      if (!map[name]) map[name] = { total: 0, completed: 0 };
      map[name].total += 1;
      if (c.hasResult) map[name].completed += 1;
    });
    const eligible = Object.entries(map)
      .filter(([, d]) => d.total >= 10)
      .map(([name, d]) => ({
        name,
        rate: Math.round((d.completed / d.total) * 100),
        total: d.total,
      }))
      .sort((a, b) => b.rate - a.rate);
    return eligible[0] || null;
  }, [filteredCandidates]);

  // ============================================================
  // FILTER OPTIONS
  // ============================================================
  const universityOptions = useMemo(() => {
    return uniGroup.groups.sort().map(name => ({ label: name, value: name, rawVariants: uniGroup.masterToRawMap[name] || [] }));
  }, [uniGroup]);

  const programOptions = useMemo(() => {
    return progGroup.groups.sort().map(name => ({ label: name, value: name, rawVariants: progGroup.masterToRawMap[name] || [] }));
  }, [progGroup]);

  const handleSelectAllPrograms = () => setSelectedProgramOptions(programOptions);
  const handleClearPrograms = () => setSelectedProgramOptions([]);
  const resetFilters = () => {
    setSelectedUniversityOption(null);
    setSelectedProgramOptions([]);
    setMinScore(0);
    setMaxScore(100);
  };

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================
  const fetchDashboardData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Real dashboard stats from the new API
      if (token) {
        try {
          const statsRes = await fetch('/api/admin/dashboard-stats', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const statsJson = await statsRes.json();
          if (statsRes.ok && statsJson.success) {
            setDashStats(statsJson);
            setDashStatsError(null);
          } else {
            setDashStatsError(statsJson.error || `HTTP ${statsRes.status}`);
          }
        } catch (err) {
          console.error('[Admin Dashboard] dashboard-stats fetch error:', err);
          setDashStatsError(err.message || 'Failed to load dashboard stats');
        }
      }

      // Row-level data for charts, filters, and recent lists
      if (token) {
        const dataRes = await fetch('/api/admin/dashboard-data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataJson = await dataRes.json();

        if (dataRes.ok && dataJson.success) {
          const candidates = dataJson.allCandidates || [];
          const results = dataJson.allResults || [];
          const assignments = safeArray(dataJson.candidateAssessments || []);

          setAllCandidates(candidates);
          // recentCandidates is derived from allCandidates — already ordered desc
          setRecentCandidates(candidates.slice(0, 6));
          setAllResults(results);
          setCandidateAssessmentsData(assignments);
          setLastUpdated(new Date().toISOString());
        } else {
          console.error('[Admin Dashboard] dashboard-data fetch failed:', dataJson.error);
          setAllCandidates([]);
          setRecentCandidates([]);
          setAllResults([]);
          setCandidateAssessmentsData([]);
        }
      }
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      if (showRefresh) setRefreshing(false);
    }
  };

  // ============================================================
  // AUTH
  // ============================================================
  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      setLoading(true);
      setAuthError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push("/login");
        return;
      }

      // Role from user_metadata only. Endpoints enforce admin server-side.
      const metadataRole = session.user.user_metadata?.role || null;

      if (metadataRole !== "admin") {
        setAuthError("Admin access is required.");
        router.push("/supervisor");
        return;
      }

      setIsAdmin(true);
      await fetchDashboardData(false);
    } catch (error) {
      console.error("Admin auth error:", error);
      if (error.message?.includes("JWT") || error.message?.includes("token")) {
        await supabase.auth.signOut();
        router.push("/login");
      }
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    sessionStorage.removeItem("supabase.auth.token");
    router.push("/login");
  }

  // ============================================================
  // RENDER STATES
  // ============================================================
  if (loading) {
    return (
      <div style={stylesModern.loadingContainer}>
        <div style={stylesModern.spinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={stylesModern.errorContainer}>
        <div style={stylesModern.errorIcon}>⚠️</div>
        <h2>Authentication Error</h2>
        <p>{authError}</p>
        <button onClick={() => router.push("/login")} style={stylesModern.primaryButton}>Go to Login</button>
      </div>
    );
  }

  if (!isAdmin) return null;

  const totalFilteredCandidates = filteredCandidates.length;
  const totalFilteredCompleted = completedFiltered.length;
  const totalFilteredInProgress = statusDistribution.inProgress;
  const totalFilteredBlocked = statusDistribution.blocked;

  // Delta renderers (neutral style)
  const candidatesDelta = dashStats ? formatDelta(dashStats.candidates?.deltaPct30) : { text: '—' };
  const results7Delta = dashStats ? formatDelta(dashStats.results?.deltaPct7) : { text: '—' };
  const results30Delta = dashStats ? formatDelta(dashStats.results?.deltaPct30) : { text: '—' };

  return (
    <div style={stylesModern.appContainer}>
      <AdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        handleLogout={handleLogout}
        userRole="admin"
      />

      <div style={stylesModern.mainContent}>
        {/* Top Bar */}
        <div style={stylesModern.topBar}>
          <div style={stylesModern.topBarLeft}>
            <button onClick={toggleSidebar} style={stylesModern.menuButton}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={stylesModern.searchWrapper}>
              <span style={stylesModern.searchIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="Search candidates, reports..." style={stylesModern.searchInput} />
            </div>
          </div>
          <div style={stylesModern.topBarRight}>
            <button onClick={() => fetchDashboardData(true)} style={stylesModern.refreshBtn} disabled={refreshing}>
              ⟳
            </button>
            <div style={stylesModern.userBadge}>
              <span style={stylesModern.userAvatar}>A</span>
              <span style={stylesModern.userName}>Admin</span>
            </div>
          </div>
        </div>

        {/* Welcome */}
        <div style={stylesModern.welcomeSection}>
          <div>
            <h1 style={stylesModern.welcomeTitle}>Welcome back, Admin! 👋</h1>
            <p style={stylesModern.welcomeSubtitle}>
              Here's what's happening with your assessment platform today.
              {lastUpdated && <span style={stylesModern.lastUpdated}> Updated: {formatTimeAgo(lastUpdated)}</span>}
            </p>
          </div>
          <div style={stylesModern.filterBadges}>
            {selectedUniversityOption && (
              <span style={stylesModern.filterBadge}>🏛️ {selectedUniversityOption.label}</span>
            )}
            {selectedProgramOptions.length > 0 && (
              <span style={stylesModern.filterBadge}>📚 {selectedProgramOptions.length} programs</span>
            )}
            {!selectedUniversityOption && selectedProgramOptions.length === 0 && (
              <span style={stylesModern.filterBadge}>📊 All Data</span>
            )}
          </div>
        </div>

        {/* API Error banner */}
        {dashStatsError && (
          <div style={stylesModern.apiError}>
            <strong>Dashboard stats error:</strong> {dashStatsError}
          </div>
        )}

        {/* KPI Cards */}
        <div style={stylesModern.kpiGrid}>
          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#e8eaf6' }}>
              <span style={stylesModern.kpiIcon}>👥</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>Total Candidates</div>
              <div style={stylesModern.kpiValue}>{totalFilteredCandidates}</div>
              <div style={stylesModern.kpiSub}>
                {dashStats ? (
                  <>
                    <span style={stylesModern.deltaNeutral}>{candidatesDelta.text}</span>
                    <span style={stylesModern.deltaNote}> vs prev 30 days</span>
                  </>
                ) : (
                  <span style={stylesModern.deltaNote}>loading trend…</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#dcfce7' }}>
              <span style={stylesModern.kpiIcon}>📊</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>Completion Rate</div>
              <div style={stylesModern.kpiValue}>{completionRate}%</div>
              <div style={stylesModern.kpiSub}>{totalFilteredCompleted} completed</div>
            </div>
          </div>

          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#fef3c7' }}>
              <span style={stylesModern.kpiIcon}>🔄</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>In Progress</div>
              <div style={stylesModern.kpiValue}>{totalFilteredInProgress}</div>
              <div style={stylesModern.kpiSub}>Active assessments</div>
            </div>
          </div>

          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#fee2e2' }}>
              <span style={stylesModern.kpiIcon}>🔒</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>Blocked</div>
              <div style={stylesModern.kpiValue}>{totalFilteredBlocked}</div>
              <div style={stylesModern.kpiSub}>Needs attention</div>
            </div>
          </div>

          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#e0f2fe' }}>
              <span style={stylesModern.kpiIcon}>📄</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>Total Reports</div>
              <div style={stylesModern.kpiValue}>{dashStats?.results?.total ?? allResults.length}</div>
              <div style={stylesModern.kpiSub}>
                <span style={{ color: COLORS.accent }}>{dashStats?.results?.last30 ?? '—'} this month</span>
              </div>
            </div>
          </div>

          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#f3e8ff' }}>
              <span style={stylesModern.kpiIcon}>🎯</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>Average Score</div>
              <div style={stylesModern.kpiValue}>{filteredGlobalAverageScore}%</div>
              <div style={stylesModern.kpiSub}>Pass rate: {filteredGlobalPassRate}%</div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div style={stylesModern.filtersRowModern}>
          <div style={stylesModern.filterGroupModern}>
            <Select
              options={universityOptions}
              value={selectedUniversityOption}
              onChange={(option) => { setSelectedUniversityOption(option); if (option) setSelectedProgramOptions([]); }}
              placeholder="All Universities"
              isClearable
              styles={customSelectStyles}
            />
          </div>
          <div style={stylesModern.filterGroupModern}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <button onClick={handleSelectAllPrograms} style={stylesModern.smallButtonModern}>Select All</button>
              <button onClick={handleClearPrograms} style={stylesModern.smallButtonModern}>Clear</button>
            </div>
            <Select
              options={programOptions}
              value={selectedProgramOptions}
              onChange={(options) => setSelectedProgramOptions(options || [])}
              placeholder="All Programs"
              isMulti
              isClearable
              styles={customSelectStyles}
            />
          </div>
          <div style={stylesModern.scoreFilterGroupModern}>
            <input type="number" style={stylesModern.filterInputSmallModern} min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="Min" />
            <input type="number" style={stylesModern.filterInputSmallModern} min="0" max="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="Max" />
          </div>
          <button onClick={resetFilters} style={stylesModern.resetButtonModern}>Reset</button>
        </div>

        {/* Charts */}
        <div style={stylesModern.chartsRow}>
          <div style={stylesModern.chartCard}>
            <h3 style={stylesModern.chartCardTitle}>Status Distribution</h3>
            <div style={stylesModern.doughnutContainer}>
              <Doughnut
                data={{
                  labels: ['Completed', 'In Progress', 'Scheduled', 'Unblocked', 'Blocked', 'Not Started'],
                  datasets: [{
                    data: [
                      statusDistribution.completed,
                      statusDistribution.inProgress,
                      statusDistribution.scheduled,
                      statusDistribution.unblocked,
                      statusDistribution.blocked,
                      statusDistribution.notStarted
                    ],
                    backgroundColor: [
                      STATUS_COLORS.completed,
                      STATUS_COLORS.inProgress,
                      STATUS_COLORS.scheduled,
                      STATUS_COLORS.unblocked,
                      STATUS_COLORS.blocked,
                      STATUS_COLORS.notStarted
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }
                  },
                  cutout: '70%',
                }}
              />
            </div>
          </div>

          <div style={stylesModern.chartCard}>
            <h3 style={stylesModern.chartCardTitle}>Top Universities</h3>
            <div style={stylesModern.barContainer}>
              <Bar
                data={{
                  labels: filteredUniversityAnalytics.map(u => u.name.substring(0, 20) + (u.name.length > 20 ? '...' : '')),
                  datasets: [{
                    label: 'Completed',
                    data: filteredUniversityAnalytics.map(u => u.completedCandidates),
                    backgroundColor: COLORS.accent,
                    borderRadius: 4,
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            </div>
          </div>
        </div>

        {/* Target / Activity / Top Performer row — all real now */}
        <div style={stylesModern.targetRow}>
          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>🎯 Completion Goal</span>
              <span style={stylesModern.targetValue}>75%</span>
            </div>
            <div style={stylesModern.targetProgress}>
              <div style={{
                ...stylesModern.targetProgressBar,
                width: `${Math.min(completionRate, 100)}%`,
                background: completionRate >= 75 ? COLORS.success : COLORS.warning,
              }} />
            </div>
            <div style={stylesModern.targetMeta}>
              <span>Current: {completionRate}%</span>
              <span style={{ color: COLORS.muted }}>
                Goal: 75%
              </span>
            </div>
          </div>

          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>📄 Results (7 days)</span>
              <span style={stylesModern.targetValue}>{dashStats?.results?.last7 ?? '—'}</span>
            </div>
            <div style={stylesModern.targetMeta}>
              <span>vs prev 7 days ({dashStats?.results?.prev7 ?? '—'})</span>
              <span style={stylesModern.deltaNeutral}>{results7Delta.text}</span>
            </div>
          </div>

          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>📄 Results (30 days)</span>
              <span style={stylesModern.targetValue}>{dashStats?.results?.last30 ?? '—'}</span>
            </div>
            <div style={stylesModern.targetMeta}>
              <span>vs prev 30 days ({dashStats?.results?.prev30 ?? '—'})</span>
              <span style={stylesModern.deltaNeutral}>{results30Delta.text}</span>
            </div>
          </div>

          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>🏆 Top by Completion Rate</span>
              <span style={stylesModern.targetValue}>
                {topPerformerByRate ? topPerformerByRate.name.substring(0, 15) + (topPerformerByRate.name.length > 15 ? '…' : '') : 'N/A'}
              </span>
            </div>
            <div style={stylesModern.targetMeta}>
              <span>
                {topPerformerByRate
                  ? `${topPerformerByRate.rate}% completion (n=${topPerformerByRate.total})`
                  : 'No university has ≥10 candidates'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={stylesModern.recentGrid}>
          <div style={stylesModern.recentCard}>
            <h3 style={stylesModern.recentTitle}>Recent Candidates</h3>
            {recentCandidates.length === 0 ? (
              <div style={stylesModern.emptyState}>No candidates found</div>
            ) : (
              <div style={stylesModern.recentList}>
                {recentCandidates.slice(0, 5).map((c) => (
                  <div key={c.id} style={stylesModern.recentItem}>
                    <div>
                      <div style={stylesModern.recentName}>{c.full_name || c.email || 'Candidate'}</div>
                      <div style={stylesModern.recentMeta}>{c.email || 'No email'}</div>
                    </div>
                    <div style={stylesModern.recentTime}>{formatTimeAgo(c.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={stylesModern.recentCard}>
            <h3 style={stylesModern.recentTitle}>Recent Results</h3>
            {allResults.length === 0 ? (
              <div style={stylesModern.emptyState}>No results found</div>
            ) : (
              <div style={stylesModern.recentList}>
                {allResults.slice(0, 5).map((result) => {
                  const candidate = allCandidates.find(c => c.id === result.user_id);
                  return (
                    <div key={result.id} style={stylesModern.recentItem}>
                      <div>
                        <div style={stylesModern.recentName}>
                          {candidate?.full_name || candidate?.email || 'Candidate'}
                        </div>
                        <div style={stylesModern.recentMeta}>
                          Score: <strong>{Math.round(toNumber(result.percentage_score, 0))}%</strong>
                        </div>
                      </div>
                      <div style={stylesModern.recentTime}>{formatTimeAgo(result.completed_at)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <AssessmentExpiration />
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const stylesModern = {
  appContainer: {
    minHeight: '100vh',
    background: COLORS.background,
    display: 'flex',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    padding: '8px 20px 20px 20px',
    marginLeft: '250px',
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
    maxHeight: '100vh',
    width: 'calc(100% - 250px)',
    maxWidth: 'calc(100% - 250px)',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.background,
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${COLORS.border}`,
    borderTop: `4px solid ${COLORS.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    maxWidth: '500px',
    margin: '40px auto',
    textAlign: 'center',
    padding: '40px',
    background: COLORS.cardBg,
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  errorIcon: { fontSize: '48px', marginBottom: '16px' },
  primaryButton: {
    padding: '10px 24px',
    background: COLORS.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
    fontSize: '14px',
    fontWeight: 600,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: COLORS.text,
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    borderRadius: '8px',
    padding: '4px 12px',
    border: `1px solid ${COLORS.border}`,
    width: '240px',
  },
  searchIcon: { color: COLORS.muted, marginRight: '8px', display: 'flex', alignItems: 'center' },
  searchInput: {
    border: 'none',
    outline: 'none',
    padding: '6px 0',
    fontSize: '13px',
    width: '100%',
    background: 'transparent',
  },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: COLORS.muted,
    padding: '4px 8px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '4px 12px 4px 4px',
    borderRadius: '20px',
    border: `1px solid ${COLORS.border}`,
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    background: COLORS.primary,
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
  },
  userName: { fontSize: '12px', fontWeight: 500, color: COLORS.text },
  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  welcomeTitle: { fontSize: '20px', fontWeight: 700, color: COLORS.primary, margin: 0 },
  welcomeSubtitle: { fontSize: '13px', color: COLORS.muted, margin: '2px 0 0 0' },
  lastUpdated: { color: COLORS.muted, fontSize: '11px', marginLeft: '8px' },
  filterBadges: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterBadge: {
    padding: '3px 10px',
    background: 'white',
    borderRadius: '10px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '11px',
    color: COLORS.text,
  },
  apiError: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '10px',
    fontSize: '13px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '12px',
  },
  kpiCard: {
    background: 'white',
    padding: '12px 16px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  kpiCardStyle: { minHeight: '72px' },
  kpiIconWrapper: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiIcon: { fontSize: '18px' },
  kpiLabel: {
    fontSize: '10px',
    color: COLORS.muted,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  kpiValue: { fontSize: '18px', fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 },
  kpiSub: { fontSize: '10px', color: COLORS.muted, marginTop: '2px' },
  // Neutral delta — same style for up and down
  deltaNeutral: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '8px',
    background: '#f1f5f9',
    color: '#334155',
    fontWeight: 600,
    fontSize: '10px',
  },
  deltaNote: { color: COLORS.muted },
  filtersRowModern: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '12px',
    background: 'white',
    padding: '10px 14px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    alignItems: 'flex-end',
  },
  filterGroupModern: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '140px',
    flex: 1,
    maxWidth: '200px',
  },
  smallButtonModern: {
    padding: '2px 8px',
    fontSize: '10px',
    background: COLORS.border,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: COLORS.textMuted,
    fontWeight: 600,
  },
  scoreFilterGroupModern: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  filterInputSmallModern: {
    padding: '5px 6px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '11px',
    background: 'white',
    width: '45px',
    textAlign: 'center',
  },
  resetButtonModern: {
    padding: '5px 14px',
    background: COLORS.border,
    border: 'none',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    color: COLORS.text,
    height: '30px',
    alignSelf: 'flex-end',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  chartCard: {
    background: 'white',
    padding: '14px 18px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  chartCardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.primary,
    margin: '0 0 10px 0',
  },
  doughnutContainer: { height: '180px', position: 'relative' },
  barContainer: { height: '180px' },
  targetRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  targetCard: {
    background: 'white',
    padding: '12px 16px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  targetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  targetLabel: { fontSize: '12px', color: COLORS.muted },
  targetValue: { fontSize: '16px', fontWeight: 700, color: COLORS.primary },
  targetProgress: {
    height: '5px',
    background: COLORS.border,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  targetProgressBar: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
  targetMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: COLORS.muted,
    alignItems: 'center',
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  recentCard: {
    background: 'white',
    padding: '14px 18px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  recentTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.primary,
    margin: '0 0 10px 0',
  },
  recentList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  recentName: { fontSize: '12px', fontWeight: 600, color: COLORS.text },
  recentMeta: { fontSize: '11px', color: COLORS.muted },
  recentTime: { fontSize: '11px', color: COLORS.muted, flexShrink: 0, marginLeft: '10px' },
  emptyState: { textAlign: 'center', padding: '16px', color: COLORS.muted, fontSize: '12px' },
};

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
