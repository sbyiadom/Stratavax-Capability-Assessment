// pages/admin/index.js - CLEAN DASHBOARD WITH SCROLLING FIX
// All navigation is now in the sidebar

import { useEffect, useState, useMemo, Fragment } from "react";
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';

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

// ============================================================
// CONSOLIDATION FUNCTIONS
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
  
  if (cleanLower.includes('mechanical') || cleanLower.includes('mech') ||
      lower === 'me' || lower.includes('me ')) {
    return 'BSc Mechanical Engineering';
  }
  
  if (cleanLower.includes('chemical') || cleanLower.includes('chem') ||
      lower === 'che' || lower.includes('che ')) {
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
  
  if (cleanLower.includes('agricultural') || cleanLower.includes('agric') ||
      lower === 'age' || lower.includes('age ')) {
    return 'BSc Agricultural Engineering';
  }
  
  if (cleanLower.includes('petroleum') || cleanLower.includes('petrol') ||
      lower === 'pe' || lower.includes('pe ')) {
    return 'BSc Petroleum Engineering';
  }
  
  if (cleanLower.includes('geological') || cleanLower.includes('geo') ||
      lower === 'ge' || lower.includes('ge ')) {
    return 'BSc Geological Engineering';
  }
  
  if (cleanLower.includes('geomatic')) return 'BSc Geomatic Engineering';
  
  if (cleanLower.includes('materials') || cleanLower.includes('material') ||
      lower === 'mte' || lower.includes('mte ')) {
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
  
  if (cleanLower.includes('political science') || cleanLower.includes('politics') ||
      cleanLower.includes('political')) {
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
  
  if (cleanLower.includes('mathematics') || cleanLower.includes('math') ||
      lower === 'maths' || lower.includes('maths ')) {
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
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e3f2fd',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: COLORS.primary,
    fontWeight: 600,
    fontSize: '12px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: COLORS.primary,
    '&:hover': { backgroundColor: COLORS.primary, color: 'white' },
  }),
};

// ============================================================
// SIDEBAR COMPONENT - WITH WORKING NAVIGATION
// ============================================================
function Sidebar({ isOpen, toggleSidebar, activePage, setActivePage, handleLogout }) {
  const router = useRouter();
  
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      ),
      href: '/admin'
    },
    { 
      id: 'candidates', 
      label: 'Candidates', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ),
      href: '/admin/manage-candidates'
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      ),
      href: '/admin/reports'
    },
    { 
      id: 'assessments', 
      label: 'Assessments', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      ),
      href: '/admin/assign-assessments'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
      ),
      href: '/admin/system-settings'
    },
  ];

  const handleNavigation = (item) => {
    setActivePage(item.id);
    if (window.innerWidth < 768) toggleSidebar();
    router.push(item.href);
  };

  return (
    <div style={{
      ...stylesSidebar.sidebar,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    }}>
      <div style={stylesSidebar.logoArea}>
        <div style={stylesSidebar.logoIcon}>S</div>
        <span style={stylesSidebar.logoText}>Stratavax</span>
      </div>

      <nav style={stylesSidebar.nav}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item)}
            style={{
              ...stylesSidebar.navItem,
              backgroundColor: activePage === item.id ? COLORS.sidebarHover : 'transparent',
              borderLeft: activePage === item.id ? `3px solid ${COLORS.accent}` : '3px solid transparent',
            }}
          >
            <span style={stylesSidebar.navIcon}>{item.icon}</span>
            <span style={stylesSidebar.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={stylesSidebar.bottomNav}>
        <button onClick={handleLogout} style={stylesSidebar.navItem}>
          <span style={stylesSidebar.navIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span style={stylesSidebar.navLabel}>Logout</span>
        </button>
      </div>
    </div>
  );
}

const stylesSidebar = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '250px',
    height: '100vh',
    background: COLORS.sidebarBg,
    color: 'white',
    zIndex: 1000,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  logoArea: {
    padding: '20px 20px 10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: COLORS.accent,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    width: '100%',
    transition: 'all 0.2s',
    '&:hover': {
      background: COLORS.sidebarHover,
      color: 'white',
    },
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    textAlign: 'left',
  },
  bottomNav: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
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
  const [activePage, setActivePage] = useState('dashboard');
  
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
    totalResults: 0,
    nationalServiceReports: 0,
    stratavaxReports: 0
  });

  const [allCandidates, setAllCandidates] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [candidateAssessmentsData, setCandidateAssessmentsData] = useState([]);

  // ============================================================
  // TOGGLE SIDEBAR
  // ============================================================
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  // METRICS
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
  }, [filteredCandidates]);

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
    })).sort((a, b) => b.completedCandidates - a.completedCandidates).slice(0, 10);
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

  const totalFilteredCandidates = filteredCandidates.length;
  const totalFilteredCompleted = completedFiltered.length;
  const totalFilteredInProgress = statusDistribution.inProgress;
  const totalFilteredBlocked = statusDistribution.blocked;

  return (
    <div style={stylesModern.appContainer}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        activePage={activePage}
        setActivePage={setActivePage}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
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
              {refreshing ? '⟳' : '⟳'}
            </button>
            <div style={stylesModern.userBadge}>
              <span style={stylesModern.userAvatar}>A</span>
              <span style={stylesModern.userName}>Admin</span>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
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

        {/* KPI Cards */}
        <div style={stylesModern.kpiGrid}>
          <div style={{ ...stylesModern.kpiCard, ...stylesModern.kpiCardStyle }}>
            <div style={{ ...stylesModern.kpiIconWrapper, background: '#e8eaf6' }}>
              <span style={stylesModern.kpiIcon}>👥</span>
            </div>
            <div>
              <div style={stylesModern.kpiLabel}>Total Candidates</div>
              <div style={stylesModern.kpiValue}>{totalFilteredCandidates}</div>
              <div style={stylesModern.kpiSub}>+{Math.round(totalFilteredCandidates * 0.12)} this month</div>
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
              <div style={stylesModern.kpiValue}>{stats.totalResults || 0}</div>
              <div style={stylesModern.kpiSub}>
                <span style={{ color: COLORS.success }}>{stats.nationalServiceReports || 0} NS</span>
                {' · '}
                <span style={{ color: COLORS.accent }}>{stats.stratavaxReports || 0} SV</span>
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

        {/* Charts Row */}
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

        {/* Target vs Actual Row */}
        <div style={stylesModern.targetRow}>
          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>🎯 Target Completion</span>
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
              <span style={{ color: completionRate >= 75 ? COLORS.success : COLORS.critical }}>
                {completionRate >= 75 ? '✅ On track' : '⚠️ Below target'}
              </span>
            </div>
          </div>
          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>📈 This Week</span>
              <span style={stylesModern.targetValue}>{Math.round(totalFilteredCandidates * 0.05)}</span>
            </div>
            <div style={stylesModern.targetMeta}>
              <span>New registrations</span>
              <span style={{ color: COLORS.success }}>↑ 12%</span>
            </div>
          </div>
          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>📊 This Month</span>
              <span style={stylesModern.targetValue}>{Math.round(totalFilteredCandidates * 0.12)}</span>
            </div>
            <div style={stylesModern.targetMeta}>
              <span>New candidates</span>
              <span style={{ color: COLORS.success }}>↑ 8%</span>
            </div>
          </div>
          <div style={stylesModern.targetCard}>
            <div style={stylesModern.targetHeader}>
              <span style={stylesModern.targetLabel}>🏆 Top Performer</span>
              <span style={stylesModern.targetValue}>
                {filteredUniversityAnalytics.length > 0 ? filteredUniversityAnalytics[0].name.substring(0, 15) : 'N/A'}
              </span>
            </div>
            <div style={stylesModern.targetMeta}>
              <span>{filteredUniversityAnalytics.length > 0 ? `${filteredUniversityAnalytics[0].completionRate}% completion` : 'No data'}</span>
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

        {/* Assessment Expiration */}
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
// MODERN STYLES - WITH SCROLLING FIX
// ============================================================
const stylesModern = {
  appContainer: {
    minHeight: '100vh',
    background: COLORS.background,
    display: 'flex',
    overflow: 'hidden',  // Prevents double scrollbars
  },
  mainContent: {
    flex: 1,
    padding: '20px 24px 40px 24px',  // Added bottom padding
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
    maxHeight: '100vh',
    maxWidth: 'calc(100vw - 250px)',
    overflowY: 'auto',     // ENABLES SCROLLING
    overflowX: 'hidden',   // Prevents horizontal scroll
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
    padding: '12px 0',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
    width: '280px',
  },
  searchIcon: {
    color: COLORS.muted,
    marginRight: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    padding: '8px 0',
    fontSize: '14px',
    width: '100%',
    background: 'transparent',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    color: COLORS.muted,
    padding: '4px 8px',
    '&:hover': { color: COLORS.primary },
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
    width: '32px',
    height: '32px',
    background: COLORS.primary,
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  userName: {
    fontSize: '13px',
    fontWeight: 500,
    color: COLORS.text,
  },
  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: COLORS.primary,
    margin: 0,
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: COLORS.muted,
    margin: '4px 0 0 0',
  },
  lastUpdated: {
    color: COLORS.muted,
    fontSize: '12px',
    marginLeft: '8px',
  },
  filterBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterBadge: {
    padding: '4px 12px',
    background: 'white',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '12px',
    color: COLORS.text,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  kpiCard: {
    background: 'white',
    padding: '14px 18px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  kpiIconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIcon: {
    fontSize: '20px',
  },
  kpiLabel: {
    fontSize: '11px',
    color: COLORS.muted,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: COLORS.primary,
    lineHeight: 1.2,
  },
  kpiSub: {
    fontSize: '11px',
    color: COLORS.muted,
    marginTop: '2px',
  },
  filtersRowModern: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
    background: 'white',
    padding: '12px 16px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    alignItems: 'flex-end',
  },
  filterGroupModern: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '160px',
    flex: 1,
    maxWidth: '240px',
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
    gap: '8px',
    alignItems: 'center',
  },
  filterInputSmallModern: {
    padding: '6px 8px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '12px',
    background: 'white',
    width: '50px',
    textAlign: 'center',
  },
  resetButtonModern: {
    padding: '6px 16px',
    background: COLORS.border,
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    color: COLORS.text,
    height: '34px',
    alignSelf: 'flex-end',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  chartCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  chartCardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: COLORS.primary,
    margin: '0 0 12px 0',
  },
  doughnutContainer: {
    height: '200px',
    position: 'relative',
  },
  barContainer: {
    height: '200px',
  },
  targetRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  targetCard: {
    background: 'white',
    padding: '14px 18px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  targetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  targetLabel: {
    fontSize: '13px',
    color: COLORS.muted,
  },
  targetValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: COLORS.primary,
  },
  targetProgress: {
    height: '6px',
    background: COLORS.border,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  targetProgressBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  targetMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: COLORS.muted,
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  recentCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  recentTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: COLORS.primary,
    margin: '0 0 12px 0',
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${COLORS.border}`,
    '&:last-child': { borderBottom: 'none' },
  },
  recentName: {
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.text,
  },
  recentMeta: {
    fontSize: '12px',
    color: COLORS.muted,
  },
  recentTime: {
    fontSize: '12px',
    color: COLORS.muted,
    flexShrink: 0,
    marginLeft: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: COLORS.muted,
    fontSize: '13px',
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
