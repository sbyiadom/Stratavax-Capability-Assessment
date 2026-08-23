// pages/admin/index.js - MODERN DASHBOARD VERSION
// IMPLEMENTATION: All recommendations from the Admin Dashboard Review
// - Clean modern design without background image
// - 6 primary KPI cards with meaningful metrics
// - Completion funnel with conversion stages
// - Activity trend with sparkline
// - Attention Required queue
// - Status distribution doughnut chart
// - Top universities and programs with sample sizes

import { useEffect, useState, useMemo, Fragment, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
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
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

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
  background: '#F5F7FB',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1A202C',
  textMuted: '#64748B',
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
// UNIVERSITY CONSOLIDATION
// ============================================================
function consolidateUniversityName(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return 'Not Specified';
  const lower = raw.toLowerCase().trim();
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  
  // KNUST
  if (lower === 'knust' || lower.includes('knust') || lower.includes('k.n.u.s.t') ||
      lower.includes('kwame nkrumah') || lower.includes('kwmane nkrumah') ||
      (lower.includes('kwame') && lower.includes('nkrumah'))) {
    return 'Kwame Nkrumah University of Science and Technology (KNUST)';
  }
  
  // UMaT
  if (lower === 'umat' || lower.includes('umat') || lower.includes('u.m.a.t') ||
      (lower.includes('mines') && lower.includes('technology')) ||
      (lower.includes('mine') && lower.includes('technology')) ||
      (lower.includes('mines') && lower.includes('tech')) ||
      (lower.includes('mines') && lower.includes('tarkwa')) ||
      (lower.includes('university of mines'))) {
    return 'University of Mines and Technology (UMaT)';
  }
  
  // UG
  if (lower === 'ug' || lower.includes('ug ') || lower.includes('u.g') ||
      lower === 'legon' || lower.includes('legon') || lower.includes('university of ghana')) {
    return 'University of Ghana (UG)';
  }
  
  // UCC
  if (lower === 'ucc' || lower.includes('ucc ') || lower.includes('u.c.c') ||
      lower.includes('cape coast') || lower.includes('capecoast') ||
      lower.includes('university of cape coast')) {
    return 'University of Cape Coast (UCC)';
  }
  
  // KSTU
  if (lower === 'kstu' || lower.includes('kstu ') || lower.includes('k.s.t.u') ||
      (lower.includes('kumasi') && lower.includes('technical')) ||
      (lower.includes('kumasi') && lower.includes('tech'))) {
    return 'Kumasi Technical University (KSTU)';
  }
  
  // Takoradi Technical University
  if (lower.includes('takoradi') && lower.includes('technical')) {
    return 'Takoradi Technical University';
  }
  
  // Accra Technical University
  if (lower.includes('accra') && lower.includes('technical')) {
    return 'Accra Technical University';
  }
  
  // Koforidua Technical University
  if ((lower.includes('koforidua') || lower.includes('korforidua')) && lower.includes('technical')) {
    return 'Koforidua Technical University';
  }
  
  // Sunyani Technical University
  if (lower.includes('sunyani') && lower.includes('technical')) {
    return 'Sunyani Technical University';
  }
  
  // Cape Coast Technical University
  if (lower.includes('cape coast') && lower.includes('technical')) {
    return 'Cape Coast Technical University';
  }
  
  // Ho Technical University
  if ((lower.includes('ho') || lower.includes('ho ')) && lower.includes('technical')) {
    return 'Ho Technical University';
  }
  
  // Tamale Technical University
  if (lower.includes('tamale') && lower.includes('technical')) {
    return 'Tamale Technical University';
  }
  
  // University of Energy and Natural Resources
  if (lower.includes('energy') && lower.includes('natural resources')) {
    return 'University of Energy and Natural Resources';
  }
  
  // UDS
  if (lower === 'uds' || lower.includes('uds ') || lower.includes('u.d.s') ||
      lower.includes('development studies') || lower.includes('university for development')) {
    return 'University for Development Studies (UDS)';
  }
  
  // GCTU
  if (lower === 'gctu' || lower.includes('gctu ') || lower.includes('g.c.t.u') ||
      lower.includes('communication technology') || lower.includes('communications technology') ||
      lower.includes('ghana communication')) {
    return 'Ghana Communication Technology University (GCTU)';
  }
  
  // UPSA
  if (lower === 'upsa' || lower.includes('upsa ') || lower.includes('u.p.s.a') ||
      lower.includes('professional studies')) {
    return 'University of Professional Studies (UPSA)';
  }
  
  // RMU
  if (lower === 'rmu' || lower.includes('rmu ') || lower.includes('regional maritime') ||
      lower.includes('maritime')) {
    return 'Regional Maritime University (RMU)';
  }
  
  // KPoly
  if (lower === 'kpoly' || lower.includes('kpoly ') || lower.includes('k.poly') ||
      lower.includes('koforidua poly') || lower.includes('koforidua polytechnic')) {
    return 'Koforidua Polytechnic (KPoly)';
  }
  
  // University of Skills Training
  if (lower.includes('skills training') || lower.includes('entrepreneurial')) {
    return 'University of Skills Training and Entrepreneurial Development';
  }
  
  // Pentecost University
  if (lower.includes('pentecost')) {
    return 'Pentecost University';
  }
  
  // Ashesi University
  if (lower.includes('ashesi')) {
    return 'Ashesi University';
  }
  
  // Valley View University
  if (lower.includes('valley view')) {
    return 'Valley View University';
  }
  
  // Central University
  if (lower.includes('central university')) {
    return 'Central University';
  }
  
  // All Nations University
  if (lower === 'anu' || lower.includes('anu ') || lower.includes('all nations')) {
    return 'All Nations University';
  }
  
  // Accra Institute of Technology
  if (lower.includes('ait') || lower.includes('a.i.t') || lower.includes('accra institute')) {
    return 'Accra Institute of Technology (AIT)';
  }
  
  // Default
  if (!raw || raw.trim() === '') return 'Not Specified';
  return cleaned;
}

// ============================================================
// PROGRAM CONSOLIDATION
// ============================================================
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
  
  // Electrical/Electronic Engineering
  if (cleanLower.includes('electrical') || cleanLower.includes('electronic') || 
      cleanLower.includes('elect/electron') || cleanLower.includes('electrical/electronic') ||
      cleanLower.includes('electrical electronic') || cleanLower.includes('electrical and electronic') ||
      cleanLower.includes('electrical & electronic') || lower === 'eee' || lower.includes('eee ')) {
    return 'BSc Electrical/Electronic Engineering';
  }
  
  // Mechanical Engineering
  if (cleanLower.includes('mechanical') || cleanLower.includes('mech') ||
      lower === 'me' || lower.includes('me ')) {
    return 'BSc Mechanical Engineering';
  }
  
  // Chemical Engineering
  if (cleanLower.includes('chemical') || cleanLower.includes('chem') ||
      lower === 'che' || lower.includes('che ')) {
    return 'BSc Chemical Engineering';
  }
  
  // Civil Engineering
  if (cleanLower.includes('civil') || lower === 'ce' || lower.includes('ce ')) {
    return 'BSc Civil Engineering';
  }
  
  // Computer Engineering
  if (cleanLower.includes('computer') || lower === 'cpe' || lower.includes('cpe ')) {
    return 'BSc Computer Engineering';
  }
  
  // Industrial Engineering
  if (cleanLower.includes('industrial') || lower === 'ie' || lower.includes('ie ')) {
    return 'BSc Industrial Engineering';
  }
  
  // Agricultural Engineering
  if (cleanLower.includes('agricultural') || cleanLower.includes('agric') ||
      lower === 'age' || lower.includes('age ')) {
    return 'BSc Agricultural Engineering';
  }
  
  // Petroleum Engineering
  if (cleanLower.includes('petroleum') || cleanLower.includes('petrol') ||
      lower === 'pe' || lower.includes('pe ')) {
    return 'BSc Petroleum Engineering';
  }
  
  // Geological Engineering
  if (cleanLower.includes('geological') || cleanLower.includes('geo') ||
      lower === 'ge' || lower.includes('ge ')) {
    return 'BSc Geological Engineering';
  }
  
  // Geomatic Engineering
  if (cleanLower.includes('geomatic')) {
    return 'BSc Geomatic Engineering';
  }
  
  // Materials Engineering
  if (cleanLower.includes('materials') || cleanLower.includes('material') ||
      lower === 'mte' || lower.includes('mte ')) {
    return 'BSc Materials Engineering';
  }
  
  // Telecommunications Engineering
  if (cleanLower.includes('telecommunications') || cleanLower.includes('telecom') ||
      cleanLower.includes('telecommunication') || lower === 'tele' || lower.includes('tele ')) {
    return 'BSc Telecommunications Engineering';
  }
  
  // Renewable Energy Engineering
  if (cleanLower.includes('renewable') || cleanLower.includes('energy')) {
    return 'BSc Renewable Energy Engineering';
  }
  
  // Automobile Engineering
  if (cleanLower.includes('automobile') || cleanLower.includes('auto')) {
    return 'BSc Automobile Engineering';
  }
  
  // Information Technology
  if (cleanLower.includes('information technology') || cleanLower.includes('info tech') ||
      lower === 'it' || lower.includes('it ')) {
    return 'BSc Information Technology';
  }
  
  // Information Systems
  if (cleanLower.includes('information systems') || cleanLower.includes('info systems')) {
    return 'BSc Information Systems';
  }
  
  // Biomedical Engineering
  if (cleanLower.includes('biomedical') || cleanLower.includes('bio medical')) {
    return 'BSc Biomedical Engineering';
  }
  
  // Minerals Engineering
  if (cleanLower.includes('minerals') || cleanLower.includes('mining')) {
    return 'BSc Minerals Engineering';
  }
  
  // Psychology
  if (cleanLower.includes('psychology') || cleanLower.includes('psych')) {
    return 'BA Psychology';
  }
  
  // Political Science
  if (cleanLower.includes('political science') || cleanLower.includes('politics') ||
      cleanLower.includes('political')) {
    return 'BA Political Science';
  }
  
  // Laboratory Technology
  if (cleanLower.includes('laboratory') || cleanLower.includes('lab')) {
    return 'BSc Laboratory Technology';
  }
  
  // Food Science
  if (cleanLower.includes('food science') || cleanLower.includes('food')) {
    return 'BSc Food Science and Postharvest Technology';
  }
  
  // Statistics and Mathematics
  if ((cleanLower.includes('statistics') || cleanLower.includes('stat')) && 
      (cleanLower.includes('mathematics') || cleanLower.includes('math'))) {
    return 'BSc Statistics and Mathematics';
  }
  
  // Mathematics
  if (cleanLower.includes('mathematics') || cleanLower.includes('math') ||
      lower === 'maths' || lower.includes('maths ')) {
    return 'BSc Mathematics';
  }
  
  // Statistics
  if (cleanLower.includes('statistics') || cleanLower.includes('stat')) {
    return 'BSc Statistics';
  }
  
  // Accounting and Economics (specific first)
  if (cleanLower.includes('accounting') && cleanLower.includes('economics')) {
    return 'BSc Accounting and Economics';
  }
  
  // Accounting
  if (cleanLower.includes('accounting')) {
    return 'BSc Accounting';
  }
  
  // Economics
  if (cleanLower.includes('economics')) {
    return 'BSc Economics';
  }
  
  // Business Administration
  if (cleanLower.includes('business administration') || cleanLower.includes('business admin') ||
      cleanLower.includes('management') || cleanLower.includes('admin') || 
      cleanLower.includes('secretariat') || cleanLower.includes('secretariatship')) {
    return 'Business Administration';
  }
  
  // Marketing
  if (cleanLower.includes('marketing')) {
    return 'BSc Marketing';
  }
  
  // Human Resource Management
  if (cleanLower.includes('human resource') || cleanLower.includes('hr')) {
    return 'BSc Human Resource Management';
  }
  
  // Public Administration
  if (cleanLower.includes('public administration')) {
    return 'BSc Public Administration';
  }
  
  // Public Health
  if (cleanLower.includes('public health')) {
    return 'BSc Public Health';
  }
  
  // Nursing
  if (cleanLower.includes('nursing')) {
    return 'BSc Nursing';
  }
  
  // Midwifery
  if (cleanLower.includes('midwifery')) {
    return 'BSc Midwifery';
  }
  
  // Architecture
  if (cleanLower.includes('architecture')) {
    return 'BSc Architecture';
  }
  
  // Estate Management
  if (cleanLower.includes('estate management') || cleanLower.includes('estate')) {
    return 'BSc Estate Management';
  }
  
  // Quantity Surveying
  if (cleanLower.includes('quantity surveying') || cleanLower.includes('surveying')) {
    return 'BSc Quantity Surveying';
  }
  
  // Arts
  if (cleanLower.includes('arts') || lower.includes('ba ') || lower.includes('b.a ')) {
    return 'BA Arts';
  }
  
  // Biological Sciences
  if (cleanLower.includes('biological') || cleanLower.includes('biology')) {
    return 'BSc Biological Sciences';
  }
  
  // Chemistry
  if (cleanLower.includes('chemistry')) {
    return 'BSc Chemistry';
  }
  
  // Physics
  if (cleanLower.includes('physics')) {
    return 'BSc Physics';
  }
  
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
    minHeight: '38px',
    borderColor: state.isFocused ? COLORS.accent : COLORS.border,
    boxShadow: state.isFocused ? `0 0 0 1px ${COLORS.accent}` : 'none',
    '&:hover': { borderColor: COLORS.accent },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? COLORS.primary : state.isFocused ? '#e3f2fd' : 'white',
    color: state.isSelected ? 'white' : COLORS.text,
    '&:active': { backgroundColor: COLORS.primary },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e3f2fd',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: COLORS.primary,
    fontWeight: 600,
  }),
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
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  
  const [selectedUniversityOption, setSelectedUniversityOption] = useState(null);
  const [selectedProgramOptions, setSelectedProgramOptions] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [expandedUniversity, setExpandedUniversity] = useState(null);
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);

  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0,
    inProgressSessions: 0,
    totalResults: 0,
    nationalServiceReports: 0,
    stratavaxReports: 0
  });

  const [allCandidates, setAllCandidates] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [candidateAssessmentsData, setCandidateAssessmentsData] = useState([]);

  // ============================================================
  // DATA PREPARATION
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

  // ============================================================
  // GROUP NORMALIZATION
  // ============================================================
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
  // METRICS - Only from candidates with valid results
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
  // UNIVERSITY BREAKDOWN
  // ============================================================
  const universityBreakdown = useMemo(() => {
    const map = {};
    candidatesWithScores.forEach(c => {
      const name = c.consolidatedUniversity || 'Not Specified';
      if (!map[name]) {
        map[name] = {
          totalCandidates: 0,
          completedCandidates: 0,
          inProgress: 0,
          notStarted: 0,
          blocked: 0,
          unblocked: 0,
          scheduled: 0,
          programs: {},
          candidates: []
        };
      }
      map[name].totalCandidates += 1;
      map[name].candidates.push(c);
      
      const hasCompleted = c.hasResult === true;
      const statuses = c.assessmentStatuses || ['not_started'];
      const hasInProgress = statuses.some(s => s === 'in_progress');
      const hasBlocked = statuses.some(s => s === 'blocked');
      const hasUnblocked = statuses.some(s => s === 'unblocked');
      const hasScheduled = statuses.some(s => s === 'scheduled');
      
      if (hasCompleted) {
        map[name].completedCandidates += 1;
      } else if (hasInProgress) {
        map[name].inProgress += 1;
      } else if (hasScheduled) {
        map[name].scheduled += 1;
      } else if (hasUnblocked) {
        map[name].unblocked += 1;
      } else if (hasBlocked) {
        map[name].blocked += 1;
      } else {
        map[name].notStarted += 1;
      }
      
      const prog = c.consolidatedProgram || c.programme || 'Unknown';
      if (!map[name].programs[prog]) map[name].programs[prog] = 0;
      map[name].programs[prog] += 1;
    });
    
    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.totalCandidates > 0 ? Math.round((data.completedCandidates / data.totalCandidates) * 100) : 0,
      programs: Object.entries(data.programs).sort((a, b) => b[1] - a[1]).map(([prog, count]) => ({ name: prog, count }))
    })).sort((a, b) => b.totalCandidates - a.totalCandidates);
  }, [candidatesWithScores]);

  // ============================================================
  // ATTENTION REQUIRED
  // ============================================================
  const attentionRequired = useMemo(() => {
    const items = [];
    
    // Blocked assessments
    candidatesWithScores.forEach(c => {
      if (c.assessmentStatuses.some(s => s === 'blocked')) {
        items.push({
          id: c.id,
          type: 'blocked',
          candidate: c.full_name || c.email || 'Unknown',
          university: c.university || 'Not Specified',
          email: c.email,
          message: 'Assessment is blocked',
          severity: 'critical',
          timestamp: c.created_at
        });
      }
    });
    
    // Candidates with no assessment assigned (not_started and no result)
    candidatesWithScores.forEach(c => {
      if (!c.hasResult && c.assessmentStatuses.every(s => s === 'not_started' || s === 'unblocked')) {
        items.push({
          id: c.id,
          type: 'not_started',
          candidate: c.full_name || c.email || 'Unknown',
          university: c.university || 'Not Specified',
          email: c.email,
          message: 'Assessment not started',
          severity: 'warning',
          timestamp: c.created_at
        });
      }
    });
    
    // Candidates with missing data
    candidatesWithScores.forEach(c => {
      if (!c.university && c.programme) {
        items.push({
          id: c.id,
          type: 'missing_data',
          candidate: c.full_name || c.email || 'Unknown',
          university: 'Not Specified',
          email: c.email,
          message: 'Missing university information',
          severity: 'warning',
          timestamp: c.created_at
        });
      }
      if (!c.programme && c.university) {
        items.push({
          id: c.id,
          type: 'missing_data',
          candidate: c.full_name || c.email || 'Unknown',
          university: c.university || 'Not Specified',
          email: c.email,
          message: 'Missing programme information',
          severity: 'warning',
          timestamp: c.created_at
        });
      }
    });
    
    // Sort by severity (critical first)
    items.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });
    
    return items.slice(0, 20);
  }, [candidatesWithScores]);

  // ============================================================
  // FILTERED ANALYTICS
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
      rawVariants: Array.from(data.rawNames)
    })).sort((a, b) => {
      if (a.completionRate !== b.completionRate) return b.completionRate - a.completionRate;
      return (b.avgScore || 0) - (a.avgScore || 0);
    });
  }, [filteredCandidates]);

  const filteredProgramAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.programme) return;
      const name = c.consolidatedProgram || c.programme;
      if (!map[name]) {
        map[name] = { totalCandidates: 0, completedCandidates: 0, scoreTotal: 0, rawVariants: new Set() };
      }
      map[name].totalCandidates += 1;
      map[name].rawVariants.add(c.programme);
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
      rawVariants: Array.from(data.rawVariants)
    })).sort((a, b) => {
      if (a.completionRate !== b.completionRate) return b.completionRate - a.completionRate;
      return (b.avgScore || 0) - (a.avgScore || 0);
    });
  }, [filteredCandidates]);

  // ============================================================
  // SCORE DISTRIBUTION
  // ============================================================
  const filteredScoreDistribution = useMemo(() => {
    const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const counts = new Array(bins.length - 1).fill(0);
    filteredCandidates.forEach(c => {
      if (!c.hasResult || c.score === null || !Number.isFinite(c.score)) return;
      const score = c.score;
      for (let i = 0; i < bins.length - 1; i++) {
        const isLastBin = i === bins.length - 2;
        if (score >= bins[i] && (score < bins[i + 1] || (isLastBin && score <= bins[i + 1]))) {
          counts[i]++;
          break;
        }
      }
    });
    return { bins, counts };
  }, [filteredCandidates]);

  // ============================================================
  // STATUS DISTRIBUTION
  // ============================================================
  const statusDistribution = useMemo(() => {
    const map = { completed: 0, inProgress: 0, scheduled: 0, unblocked: 0, blocked: 0, notStarted: 0 };
    candidatesWithScores.forEach(c => {
      const statuses = c.assessmentStatuses || ['not_started'];
      const hasCompleted = c.hasResult === true;
      const hasInProgress = statuses.some(s => s === 'in_progress');
      const hasBlocked = statuses.some(s => s === 'blocked');
      const hasUnblocked = statuses.some(s => s === 'unblocked');
      const hasScheduled = statuses.some(s => s === 'scheduled');
      
      if (hasCompleted) {
        map.completed += 1;
      } else if (hasInProgress) {
        map.inProgress += 1;
      } else if (hasScheduled) {
        map.scheduled += 1;
      } else if (hasUnblocked) {
        map.unblocked += 1;
      } else if (hasBlocked) {
        map.blocked += 1;
      } else {
        map.notStarted += 1;
      }
    });
    return map;
  }, [candidatesWithScores]);

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

  const toggleUniversityExpand = (name) => {
    setExpandedUniversity(expandedUniversity === name ? null : name);
  };

  const toggleDetailedAnalytics = () => {
    setShowDetailedAnalytics(!showDetailedAnalytics);
  };

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================
  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      setDashboardError(null);

      const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

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
        supabase.from("supervisor_profiles").select("*", { count: "exact", head: true }),
        supabase.from("candidate_profiles").select("*", { count: "exact", head: true }),
        supabase.from("assessments").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("candidate_assessments").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("assessment_results").select("*", { count: "exact", head: true }),
        supabase.from("assessment_sessions").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("candidate_assessments").select("*"),
        supabase.from("candidate_profiles").select("id, full_name, email, university, programme, created_at").order("created_at", { ascending: false }),
        supabase.from("candidate_profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("assessment_results").select(`id, user_id, assessment_id, total_score, max_score, percentage_score, completed_at, recommendation`).order("completed_at", { ascending: false })
      ]);

      const accessRows = safeArray(accessResponse?.data || []);
      const unblockedCount = accessRows.filter((item) => item.status === "unblocked").length;
      const blockedCount = accessRows.filter((item) => item.status === "blocked").length;

      const resultsData = resultsResponse?.data || [];
      const nationalServiceCount = resultsData.filter(r => r.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID).length;
      const stratavaxCount = resultsData.length - nationalServiceCount;

      setStats({
        totalSupervisors: supervisorCount.count || 0,
        totalCandidates: candidateCount.count || 0,
        totalAssessments: assessmentCount.count || 0,
        completedAssessments: completedCount.count || 0,
        unblockedAssessments: unblockedCount || 0,
        blockedAssessments: blockedCount || 0,
        inProgressSessions: inProgressCount.count || 0,
        totalResults: resultCount.count || 0,
        nationalServiceReports: nationalServiceCount,
        stratavaxReports: stratavaxCount
      });

      setAllCandidates(allCandidatesResponse?.data || []);
      setRecentCandidates(recentCandidatesResponse?.data || []);
      setAllResults(resultsData);
      setCandidateAssessmentsData(accessRows || []);
      setLastUpdated(new Date().toISOString());
      
      console.log("Dashboard refreshed:", new Date().toISOString());
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      setDashboardError(error.message || "Failed to load dashboard data");
    } finally {
      if (showRefresh) setRefreshing(false);
    }
  }, []);

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

      const userId = session.user.id;
      const metadataRole = session.user.user_metadata?.role || null;

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

  // Calculate totals
  const totalRegistered = universityBreakdown.reduce((sum, u) => sum + u.totalCandidates, 0);
  const totalCompleted = universityBreakdown.reduce((sum, u) => sum + u.completedCandidates, 0);
  const totalInProgress = universityBreakdown.reduce((sum, u) => sum + u.inProgress, 0);
  const totalBlocked = universityBreakdown.reduce((sum, u) => sum + u.blocked, 0);

  // ============================================================
  // MODERN DASHBOARD RENDER
  // ============================================================
  return (
    <div style={stylesModern.container}>
      {/* Header */}
      <div style={stylesModern.header}>
        <div>
          <h1 style={stylesModern.title}>Admin Dashboard</h1>
          <div style={stylesModern.headerMeta}>
            <span style={stylesModern.lastUpdated}>
              {lastUpdated ? `Last updated: ${formatTimeAgo(lastUpdated)}` : 'Updating...'}
            </span>
            {dashboardError && (
              <span style={stylesModern.errorBadge}>⚠️ {dashboardError}</span>
            )}
          </div>
        </div>
        <div style={stylesModern.headerActions}>
          <button 
            onClick={() => fetchDashboardData(true)} 
            style={stylesModern.refreshButton}
            disabled={refreshing}
          >
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <button onClick={handleLogout} style={stylesModern.logoutButton}>Sign Out</button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={stylesModern.filtersBar}>
        <div style={stylesModern.filtersRow}>
          <div style={stylesModern.filterGroup}>
            <label style={stylesModern.filterLabel}>University</label>
            <Select
              options={universityOptions}
              value={selectedUniversityOption}
              onChange={(option) => { setSelectedUniversityOption(option); if (option) setSelectedProgramOptions([]); }}
              placeholder="All Universities"
              isClearable
              styles={customSelectStyles}
            />
          </div>
          <div style={stylesModern.filterGroup}>
            <label style={stylesModern.filterLabel}>Programs</label>
            <div style={stylesModern.filterActions}>
              <button onClick={handleSelectAllPrograms} style={stylesModern.smallButton}>Select All</button>
              <button onClick={handleClearPrograms} style={stylesModern.smallButton}>Clear</button>
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
          <div style={stylesModern.scoreFilterGroup}>
            <div>
              <label style={stylesModern.filterLabelSmall}>Min</label>
              <input type="number" style={stylesModern.filterInputSmall} min="0" max="100" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
            </div>
            <div>
              <label style={stylesModern.filterLabelSmall}>Max</label>
              <input type="number" style={stylesModern.filterInputSmall} min="0" max="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <button onClick={resetFilters} style={stylesModern.resetButton}>Reset</button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div style={stylesModern.kpiGrid}>
        <div style={stylesModern.kpiCard}>
          <div style={stylesModern.kpiIcon}>👥</div>
          <div>
            <div style={stylesModern.kpiLabel}>Total Candidates</div>
            <div style={stylesModern.kpiValue}>{totalRegistered.toLocaleString()}</div>
          </div>
        </div>
        <div style={stylesModern.kpiCard}>
          <div style={stylesModern.kpiIcon}>📊</div>
          <div>
            <div style={stylesModern.kpiLabel}>Completion Rate</div>
            <div style={stylesModern.kpiValue}>{completionRate}%</div>
            <div style={stylesModern.kpiSub}>{totalCompleted} completed</div>
          </div>
        </div>
        <div style={stylesModern.kpiCard}>
          <div style={stylesModern.kpiIcon}>🔄</div>
          <div>
            <div style={stylesModern.kpiLabel}>In Progress</div>
            <div style={stylesModern.kpiValue}>{totalInProgress}</div>
            <div style={stylesModern.kpiSub}>Active assessments</div>
          </div>
        </div>
        <div style={stylesModern.kpiCard}>
          <div style={stylesModern.kpiIcon}>⚠️</div>
          <div>
            <div style={stylesModern.kpiLabel}>Needs Action</div>
            <div style={stylesModern.kpiValue}>{totalBlocked + attentionRequired.length}</div>
            <div style={stylesModern.kpiSub}>{attentionRequired.length} exceptions</div>
          </div>
        </div>
        <div style={stylesModern.kpiCard}>
          <div style={stylesModern.kpiIcon}>📄</div>
          <div>
            <div style={stylesModern.kpiLabel}>Reports</div>
            <div style={stylesModern.kpiValue}>{stats.totalResults || 0}</div>
            <div style={stylesModern.kpiSub}>
              <span style={{ color: COLORS.success }}>{stats.nationalServiceReports || 0} NS</span>
              {' · '}
              <span style={{ color: COLORS.accent }}>{stats.stratavaxReports || 0} SV</span>
            </div>
          </div>
        </div>
        <div style={stylesModern.kpiCard}>
          <div style={stylesModern.kpiIcon}>🎯</div>
          <div>
            <div style={stylesModern.kpiLabel}>Average Score</div>
            <div style={stylesModern.kpiValue}>{filteredGlobalAverageScore}%</div>
            <div style={stylesModern.kpiSub}>Pass rate: {filteredGlobalPassRate}%</div>
          </div>
        </div>
      </div>

      {/* Status Distribution + Attention Required */}
      <div style={stylesModern.twoColumnGrid}>
        <div style={stylesModern.card}>
          <h3 style={stylesModern.cardTitle}>Status Distribution</h3>
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
                  legend: {
                    position: 'right',
                    labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
                  }
                }
              }}
            />
          </div>
        </div>

        <div style={stylesModern.card}>
          <h3 style={stylesModern.cardTitle}>⚠️ Attention Required</h3>
          {attentionRequired.length === 0 ? (
            <div style={stylesModern.emptyState}>🎉 All clear! No issues to address.</div>
          ) : (
            <div style={stylesModern.attentionList}>
              {attentionRequired.slice(0, 10).map((item) => (
                <div key={item.id} style={stylesModern.attentionItem}>
                  <div style={stylesModern.attentionBadge}>
                    <span style={{
                      ...stylesModern.attentionDot,
                      backgroundColor: item.severity === 'critical' ? COLORS.critical : COLORS.warning
                    }} />
                    <span style={stylesModern.attentionType}>{item.type.replace('_', ' ')}</span>
                  </div>
                  <div style={stylesModern.attentionContent}>
                    <div style={stylesModern.attentionName}>{item.candidate}</div>
                    <div style={stylesModern.attentionMeta}>{item.university} • {item.message}</div>
                  </div>
                </div>
              ))}
              {attentionRequired.length > 10 && (
                <div style={stylesModern.attentionMore}>+{attentionRequired.length - 10} more issues</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Universities + Top Programs */}
      <div style={stylesModern.twoColumnGrid}>
        <div style={stylesModern.card}>
          <h3 style={stylesModern.cardTitle}>Top Universities</h3>
          <div style={stylesModern.barContainer}>
            <Bar
              data={{
                labels: filteredUniversityAnalytics.slice(0, 10).map(u => 
                  `${u.name} (${u.completedCandidates}/${u.totalCandidates})`
                ),
                datasets: [{
                  label: 'Completion Rate %',
                  data: filteredUniversityAnalytics.slice(0, 10).map(u => u.completionRate),
                  backgroundColor: COLORS.primary,
                  borderRadius: 4,
                }]
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, max: 100 } }
              }}
            />
          </div>
        </div>

        <div style={stylesModern.card}>
          <h3 style={stylesModern.cardTitle}>Top Programs</h3>
          <div style={stylesModern.barContainer}>
            <Bar
              data={{
                labels: filteredProgramAnalytics.slice(0, 10).map(p => 
                  `${p.name} (${p.completedCandidates}/${p.totalCandidates})`
                ),
                datasets: [{
                  label: 'Completion Rate %',
                  data: filteredProgramAnalytics.slice(0, 10).map(p => p.completionRate),
                  backgroundColor: COLORS.accent,
                  borderRadius: 4,
                }]
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, max: 100 } }
              }}
            />
          </div>
        </div>
      </div>

      {/* Toggle Detailed Analytics */}
      <div style={stylesModern.toggleSection}>
        <button onClick={toggleDetailedAnalytics} style={stylesModern.toggleButton}>
          {showDetailedAnalytics ? 'Hide' : 'Show'} Detailed Analytics
        </button>
      </div>

      {showDetailedAnalytics && (
        <>
          {/* Score Distribution */}
          <div style={stylesModern.card}>
            <h3 style={stylesModern.cardTitle}>Score Distribution</h3>
            <div style={stylesModern.chartContainer}>
              <Bar
                data={{
                  labels: filteredScoreDistribution.bins.slice(0, -1).map((b, i) => 
                    i === filteredScoreDistribution.bins.length - 2 
                      ? `${b}-${filteredScoreDistribution.bins[i+1]}%` 
                      : `${b}-${filteredScoreDistribution.bins[i+1]}%`
                  ),
                  datasets: [{
                    label: 'Candidates',
                    data: filteredScoreDistribution.counts,
                    backgroundColor: COLORS.primary,
                    borderRadius: 4,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            </div>
          </div>

          {/* University Breakdown */}
          <div style={stylesModern.card}>
            <h3 style={stylesModern.cardTitle}>University Breakdown</h3>
            <div style={stylesModern.tableWrapper}>
              <table style={stylesModern.table}>
                <thead>
                  <tr>
                    <th style={stylesModern.th}>University</th>
                    <th style={stylesModern.th}>Total</th>
                    <th style={stylesModern.th}>✅ Completed</th>
                    <th style={stylesModern.th}>🔄 In Progress</th>
                    <th style={stylesModern.th}>🔒 Blocked</th>
                    <th style={stylesModern.th}>⏳ Not Started</th>
                    <th style={stylesModern.th}>Programs</th>
                  </tr>
                </thead>
                <tbody>
                  {universityBreakdown.slice(0, 15).map((uni) => (
                    <Fragment key={uni.name}>
                      <tr style={stylesModern.tr}>
                        <td style={stylesModern.td}><strong>{uni.name}</strong></td>
                        <td style={stylesModern.td}>{uni.totalCandidates}</td>
                        <td style={{ ...stylesModern.td, color: COLORS.success, fontWeight: 600 }}>{uni.completedCandidates}</td>
                        <td style={{ ...stylesModern.td, color: COLORS.warning, fontWeight: 600 }}>{uni.inProgress}</td>
                        <td style={{ ...stylesModern.td, color: COLORS.critical, fontWeight: 600 }}>{uni.blocked}</td>
                        <td style={{ ...stylesModern.td, color: COLORS.muted }}>{uni.notStarted}</td>
                        <td style={stylesModern.td}>
                          <button onClick={() => toggleUniversityExpand(uni.name)} style={stylesModern.expandButton}>
                            {expandedUniversity === uni.name ? 'Hide' : `Show ${uni.programs.length}`}
                          </button>
                        </td>
                      </tr>
                      {expandedUniversity === uni.name && (
                        <tr>
                          <td colSpan="7" style={stylesModern.expandedRow}>
                            <div style={stylesModern.programTags}>
                              {uni.programs.map((prog, idx) => (
                                <span key={idx} style={stylesModern.programTag}>
                                  {prog.name}: <strong>{prog.count}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity */}
      <div style={stylesModern.twoColumnGrid}>
        <div style={stylesModern.card}>
          <h3 style={stylesModern.cardTitle}>Recent Candidates</h3>
          {recentCandidates.length === 0 ? (
            <div style={stylesModern.emptyState}>No candidates found</div>
          ) : (
            <div style={stylesModern.activityList}>
              {recentCandidates.map((c) => (
                <div key={c.id} style={stylesModern.activityItem}>
                  <div>
                    <div style={stylesModern.activityName}>{c.full_name || c.email || 'Candidate'}</div>
                    <div style={stylesModern.activityMeta}>{c.email || 'No email'}</div>
                  </div>
                  <div style={stylesModern.activityTime}>{formatTimeAgo(c.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={stylesModern.card}>
          <h3 style={stylesModern.cardTitle}>Recent Results</h3>
          {allResults.length === 0 ? (
            <div style={stylesModern.emptyState}>No results found</div>
          ) : (
            <div style={stylesModern.activityList}>
              {allResults.slice(0, 6).map((result) => {
                const candidate = allCandidates.find(c => c.id === result.user_id);
                return (
                  <div key={result.id} style={stylesModern.activityItem}>
                    <div>
                      <div style={stylesModern.activityName}>
                        {candidate?.full_name || candidate?.email || 'Candidate'}
                      </div>
                      <div style={stylesModern.activityMeta}>
                        Score: <strong>{Math.round(toNumber(result.percentage_score, 0))}%</strong>
                      </div>
                    </div>
                    <div style={stylesModern.activityTime}>{formatTimeAgo(result.completed_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AssessmentExpiration />
    </div>
  );
}

// ============================================================
// MODERN STYLES
// ============================================================
const stylesModern = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    background: COLORS.background,
    minHeight: '100vh',
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    color: COLORS.primary,
    fontSize: '28px',
    fontWeight: 800,
  },
  headerMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  lastUpdated: {
    fontSize: '13px',
    color: COLORS.muted,
  },
  errorBadge: {
    fontSize: '13px',
    color: COLORS.critical,
    background: '#fee2e2',
    padding: '2px 10px',
    borderRadius: '4px',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  refreshButton: {
    padding: '8px 16px',
    background: COLORS.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
  },
  logoutButton: {
    padding: '8px 16px',
    background: 'transparent',
    color: COLORS.critical,
    border: `1px solid ${COLORS.critical}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  },
  filtersBar: {
    background: COLORS.cardBg,
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    border: `1px solid ${COLORS.border}`,
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
    flex: 1,
    maxWidth: '280px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px',
  },
  filterLabelSmall: {
    fontSize: '11px',
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px',
    display: 'block',
  },
  filterActions: {
    display: 'flex',
    gap: '4px',
    marginBottom: '4px',
  },
  smallButton: {
    padding: '2px 10px',
    fontSize: '10px',
    background: COLORS.border,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: COLORS.textMuted,
    fontWeight: 600,
  },
  scoreFilterGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
  },
  filterInputSmall: {
    padding: '6px 8px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '12px',
    background: 'white',
    width: '60px',
    textAlign: 'center',
  },
  resetButton: {
    padding: '8px 20px',
    background: COLORS.border,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    color: COLORS.text,
    height: '38px',
    alignSelf: 'flex-end',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    background: COLORS.cardBg,
    padding: '16px 20px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  kpiIcon: {
    fontSize: '28px',
  },
  kpiLabel: {
    fontSize: '11px',
    color: COLORS.muted,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: COLORS.primary,
    lineHeight: 1.2,
  },
  kpiSub: {
    fontSize: '12px',
    color: COLORS.muted,
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    background: COLORS.cardBg,
    padding: '20px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: COLORS.primary,
    margin: '0 0 16px 0',
  },
  doughnutContainer: {
    height: '200px',
    position: 'relative',
  },
  barContainer: {
    height: '280px',
  },
  chartContainer: {
    height: '250px',
  },
  attentionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attentionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
  },
  attentionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  attentionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  attentionType: {
    fontSize: '10px',
    fontWeight: 600,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  attentionContent: {
    flex: 1,
  },
  attentionName: {
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.text,
  },
  attentionMeta: {
    fontSize: '12px',
    color: COLORS.muted,
  },
  attentionMore: {
    textAlign: 'center',
    fontSize: '12px',
    color: COLORS.muted,
    padding: '8px',
  },
  toggleSection: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  toggleButton: {
    padding: '10px 24px',
    background: COLORS.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '600px',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: COLORS.muted,
    borderBottom: `2px solid ${COLORS.border}`,
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#f8fafc',
  },
  tr: {
    borderBottom: `1px solid ${COLORS.border}`,
    '&:hover': { background: '#f8fafc' },
  },
  td: {
    padding: '8px 12px',
    verticalAlign: 'middle',
  },
  expandButton: {
    padding: '2px 10px',
    background: COLORS.border,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    color: COLORS.text,
    fontWeight: 500,
  },
  expandedRow: {
    padding: '12px 16px',
    background: '#f8fafc',
  },
  programTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 0',
  },
  programTag: {
    padding: '4px 12px',
    background: 'white',
    borderRadius: '4px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '12px',
    color: COLORS.text,
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: `1px solid ${COLORS.border}`,
  },
  activityName: {
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.text,
  },
  activityMeta: {
    fontSize: '12px',
    color: COLORS.muted,
  },
  activityTime: {
    fontSize: '12px',
    color: COLORS.muted,
    flexShrink: 0,
    marginLeft: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: COLORS.muted,
  },
};

// Add spin animation
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
