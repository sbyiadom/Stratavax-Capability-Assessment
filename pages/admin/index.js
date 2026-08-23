// pages/admin/index.js - COMPLETE CORRECTED FILE
// FIXED: No-result candidates treated as null (not zero)
// FIXED: Pass rate only includes candidates with valid scores
// FIXED: Score 100% included in histogram
// FIXED: University and program averages only from completers
// FIXED: Specific program rules before general rules
// FIXED: Shows Total Reports, National Service, Stratavax counts

import { useEffect, useState, useMemo, Fragment } from "react";
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

// ============================================================
// UNIVERSAL AGGRESSIVE UNIVERSITY CONSOLIDATION
// ============================================================
function consolidateUniversityName(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return 'Not Specified';
  }
  
  const lower = raw.toLowerCase().trim();
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  
  // KNUST
  if (lower === 'knust' ||
      lower.includes('knust') ||
      lower.includes('k.n.u.s.t') ||
      lower.includes('kwame nkrumah') ||
      lower.includes('kwmane nkrumah') ||
      (lower.includes('kwame') && lower.includes('nkrumah'))) {
    return 'Kwame Nkrumah University of Science and Technology (KNUST)';
  }
  
  // UMaT
  if (lower === 'umat' ||
      lower.includes('umat') ||
      lower.includes('u.m.a.t') ||
      (lower.includes('mines') && lower.includes('technology')) ||
      (lower.includes('mine') && lower.includes('technology')) ||
      (lower.includes('mines') && lower.includes('tech')) ||
      (lower.includes('mines') && lower.includes('tarkwa')) ||
      (lower.includes('university of mines'))) {
    return 'University of Mines and Technology (UMaT)';
  }
  
  // UG
  if (lower === 'ug' ||
      lower.includes('ug ') ||
      lower.includes('u.g') ||
      lower === 'legon' ||
      lower.includes('legon') ||
      lower.includes('university of ghana')) {
    return 'University of Ghana (UG)';
  }
  
  // UCC
  if (lower === 'ucc' ||
      lower.includes('ucc ') ||
      lower.includes('u.c.c') ||
      lower.includes('cape coast') ||
      lower.includes('capecoast') ||
      lower.includes('university of cape coast')) {
    return 'University of Cape Coast (UCC)';
  }
  
  // KSTU
  if (lower === 'kstu' ||
      lower.includes('kstu ') ||
      lower.includes('k.s.t.u') ||
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
  if ((lower.includes('koforidua') || lower.includes('korforidua')) && 
      lower.includes('technical')) {
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
  if (lower === 'uds' ||
      lower.includes('uds ') ||
      lower.includes('u.d.s') ||
      lower.includes('development studies') ||
      lower.includes('university for development')) {
    return 'University for Development Studies (UDS)';
  }
  
  // University of Education Winneba
  if (lower.includes('education') && lower.includes('winneba')) {
    return 'University of Education, Winneba';
  }
  
  // Federal University of Technology
  if (lower.includes('federal') && lower.includes('technology')) {
    return 'Federal University of Technology';
  }
  
  // GCTU
  if (lower === 'gctu' ||
      lower.includes('gctu ') ||
      lower.includes('g.c.t.u') ||
      lower.includes('communication technology') ||
      lower.includes('communications technology') ||
      lower.includes('ghana communication')) {
    return 'Ghana Communication Technology University (GCTU)';
  }
  
  // Pentecost University
  if (lower.includes('pentecost')) {
    return 'Pentecost University';
  }
  
  // UPSA
  if (lower === 'upsa' ||
      lower.includes('upsa ') ||
      lower.includes('u.p.s.a') ||
      lower.includes('professional studies')) {
    return 'University of Professional Studies (UPSA)';
  }
  
  // RMU
  if (lower === 'rmu' ||
      lower.includes('rmu ') ||
      lower.includes('regional maritime') ||
      lower.includes('maritime')) {
    return 'Regional Maritime University (RMU)';
  }
  
  // KPoly
  if (lower === 'kpoly' ||
      lower.includes('kpoly ') ||
      lower.includes('k.poly') ||
      lower.includes('koforidua poly') ||
      lower.includes('koforidua polytechnic')) {
    return 'Koforidua Polytechnic (KPoly)';
  }
  
  // University of Skills Training
  if (lower.includes('skills training') || 
      lower.includes('entrepreneurial')) {
    return 'University of Skills Training and Entrepreneurial Development';
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
  
  // ANU
  if (lower === 'anu' ||
      lower.includes('anu ') ||
      lower.includes('all nations')) {
    return 'All Nations University';
  }
  
  // AIT
  if (lower.includes('ait') ||
      lower.includes('a.i.t') ||
      lower.includes('accra institute')) {
    return 'Accra Institute of Technology (AIT)';
  }
  
  // Wisconsin International University
  if (lower.includes('wisconsin')) {
    return 'Wisconsin International University';
  }
  
  // Christian Service University
  if (lower.includes('christian service')) {
    return 'Christian Service University';
  }
  
  // Data Link University
  if (lower.includes('data link')) {
    return 'Data Link University';
  }
  
  // Blue Crest University
  if (lower.includes('blue crest')) {
    return 'Blue Crest University';
  }
  
  // Garden City University
  if (lower.includes('garden city')) {
    return 'Garden City University';
  }
  
  // Methodist University
  if (lower.includes('methodist')) {
    return 'Methodist University';
  }
  
  // Presbyterian University
  if (lower.includes('presbyterian')) {
    return 'Presbyterian University';
  }
  
  // University of Uyo
  if (lower.includes('uyo')) {
    return 'University of Uyo';
  }
  
  // Marwadi University
  if (lower.includes('marwadi')) {
    return 'Marwadi University';
  }
  
  // University of Technology and Applied Sciences
  if (lower.includes('technology and applied sciences')) {
    return 'University of Technology and Applied Sciences';
  }
  
  // AAMUSTED
  if (lower.includes('aamusted')) {
    return 'AAMUSTED';
  }
  
  // Annoited Technical Training Institute
  if (lower.includes('annoited') || lower.includes('anointed')) {
    return 'Annoited Technical Training Institute';
  }
  
  // Default
  if (!raw || raw.trim() === '') {
    return 'Not Specified';
  }
  
  return cleaned;
}

// ============================================================
// PROGRAM CONSOLIDATION - WITH CORRECTED RULE ORDERING
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
  
  // ✅ FIX: More specific Accounting and Economics rule BEFORE general Accounting
  if (cleanLower.includes('accounting') && cleanLower.includes('economics')) {
    return 'BSc Accounting and Economics';
  }
  
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
  
  let cleaned = raw
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  cleaned = cleaned.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return cleaned || 'Unknown';
}

function getUniqueMasterNames(rawItems, consolidateFn) {
  if (!rawItems || rawItems.length === 0) return { groups: [], masterToRawMap: {} };
  
  const map = {};
  
  rawItems.forEach(raw => {
    const consolidated = consolidateFn(raw);
    if (!map[consolidated]) {
      map[consolidated] = [];
    }
    map[consolidated].push(raw);
  });
  
  return { 
    groups: Object.keys(map), 
    masterToRawMap: map 
  };
}

// ============================================================
// CUSTOM SELECT STYLES
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
// MAIN COMPONENT
// ============================================================
export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const [selectedUniversityOption, setSelectedUniversityOption] = useState(null);
  const [selectedProgramOptions, setSelectedProgramOptions] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [expandedUniversity, setExpandedUniversity] = useState(null);

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
  // DATA PREPARATION - ✅ FIXED: No-result candidates are null
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
      if (!statusMap[ca.user_id]) {
        statusMap[ca.user_id] = [];
      }
      statusMap[ca.user_id].push(ca.status);
    });

    return allCandidates.map(c => {
      // ✅ FIX: Use hasOwnProperty to check for existence (not truthiness)
      const hasResult = Object.prototype.hasOwnProperty.call(scoreMap, c.id);
      
      return {
        ...c,
        score: hasResult ? scoreMap[c.id] : null, // null = no result
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
      filtered = filtered.filter(c => {
        return rawVariants.includes(c.university) || c.university === selectedUniversityOption.value;
      });
    }

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

    // ✅ FIX: Score filter only applies to candidates with results
    filtered = filtered.filter(c => {
      if (c.hasResult && c.score !== null) {
        return c.score >= Number(minScore) && c.score <= Number(maxScore);
      }
      return true; // Keep non-completers for status counts
    });

    return filtered;
  }, [candidatesWithScores, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);

  // ============================================================
  // ✅ FIXED: Pass Rate - Only includes candidates with valid scores
  // ============================================================
  const filteredGlobalPassRate = useMemo(() => {
    const scores = filteredCandidates
      .filter(c => c.hasResult && c.score !== null && Number.isFinite(c.score))
      .map(c => c.score)
      .filter(s => s !== null);
    
    if (scores.length === 0) return 0;
    
    const passed = scores.filter(s => s >= 70).length;
    return Math.round((passed / scores.length) * 100);
  }, [filteredCandidates]);

  // ============================================================
  // ✅ FIXED: Average Score - Only includes candidates with valid scores
  // ============================================================
  const filteredGlobalAverageScore = useMemo(() => {
    const scores = filteredCandidates
      .filter(c => c.hasResult && c.score !== null && Number.isFinite(c.score))
      .map(c => c.score)
      .filter(s => s !== null);
    
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [filteredCandidates]);

  const filteredTotalCandidates = filteredCandidates.length;
  const filteredCompletedCandidates = filteredCandidates.filter(c => c.hasResult).length;

  // ============================================================
  // ✅ FIXED: University Analytics - Exclude non-completers from averages
  // ============================================================
  const filteredUniversityAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.university) return;
      const name = c.consolidatedUniversity || c.university;
      
      if (!map[name]) {
        map[name] = { 
          totalCandidates: 0,
          completedCandidates: 0,
          scoreTotal: 0,
          rawNames: new Set()
        };
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
      completionRate: data.totalCandidates > 0 
        ? Math.round((data.completedCandidates / data.totalCandidates) * 100) 
        : 0,
      avgScore: data.completedCandidates > 0 
        ? Math.round(data.scoreTotal / data.completedCandidates) 
        : null,
      rawVariants: Array.from(data.rawNames)
    })).sort((a, b) => {
      if (a.completionRate !== b.completionRate) return b.completionRate - a.completionRate;
      return (b.avgScore || 0) - (a.avgScore || 0);
    });
  }, [filteredCandidates]);

  // ============================================================
  // ✅ FIXED: Program Analytics - Exclude non-completers from averages
  // ============================================================
  const filteredProgramAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.programme) return;
      const name = c.consolidatedProgram || c.programme;
      
      if (!map[name]) {
        map[name] = { 
          totalCandidates: 0,
          completedCandidates: 0,
          scoreTotal: 0,
          rawVariants: new Set()
        };
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
      completionRate: data.totalCandidates > 0 
        ? Math.round((data.completedCandidates / data.totalCandidates) * 100) 
        : 0,
      avgScore: data.completedCandidates > 0 
        ? Math.round(data.scoreTotal / data.completedCandidates) 
        : null,
      rawVariants: Array.from(data.rawVariants)
    })).sort((a, b) => {
      if (a.completionRate !== b.completionRate) return b.completionRate - a.completionRate;
      return (b.avgScore || 0) - (a.avgScore || 0);
    });
  }, [filteredCandidates]);

  // ============================================================
  // ✅ FIXED: Score Distribution - Include 100% in last bin
  // ============================================================
  const filteredScoreDistribution = useMemo(() => {
    const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const counts = new Array(bins.length - 1).fill(0);
    
    filteredCandidates.forEach(c => {
      if (!c.hasResult || c.score === null || !Number.isFinite(c.score)) return;
      
      const score = c.score;
      
      for (let i = 0; i < bins.length - 1; i++) {
        const isLastBin = i === bins.length - 2;
        // ✅ FIX: Include 100% in the last bin
        if (score >= bins[i] && (score < bins[i + 1] || (isLastBin && score <= bins[i + 1]))) {
          counts[i]++;
          break;
        }
      }
    });
    
    return { bins, counts };
  }, [filteredCandidates]);

  // ============================================================
  // PIE CHARTS
  // ============================================================
  const filteredUniversityPieData = useMemo(() => {
    const labels = filteredUniversityAnalytics.map(u => u.name);
    const data = filteredUniversityAnalytics.map(u => u.totalCandidates);
    return { labels, data };
  }, [filteredUniversityAnalytics]);

  const filteredProgramPieData = useMemo(() => {
    const labels = filteredProgramAnalytics.map(p => p.name);
    const data = filteredProgramAnalytics.map(p => p.totalCandidates);
    return { labels, data };
  }, [filteredProgramAnalytics]);

  const COLORS = ['#1a237e', '#2e7d32', '#f57c00', '#c62828', '#1565c0', '#4a148c', '#00695c', '#bf360c', '#78909c', '#8d6e63', '#4e342e', '#3e2723', '#4a148c', '#1a237e', '#0d47a1', '#00695c', '#2e7d32', '#827717', '#f57f17', '#e65100', '#bf360c', '#880e4f', '#4a148c', '#1a237e'];

  // ============================================================
  // FILTER DROPDOWN OPTIONS
  // ============================================================
  const universityOptions = useMemo(() => {
    return uniGroup.groups.sort().map(name => ({ 
      label: name, 
      value: name,
      rawVariants: uniGroup.masterToRawMap[name] || []
    }));
  }, [uniGroup]);

  const programOptions = useMemo(() => {
    return progGroup.groups.sort().map(name => ({ 
      label: name, 
      value: name,
      rawVariants: progGroup.masterToRawMap[name] || []
    }));
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

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }
      
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
      if (error.message?.includes("JWT") || error.message?.includes("token")) {
        await supabase.auth.signOut();
        router.push("/login");
      }
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboardData() {
    try {
      console.log("Fetching admin dashboard data...");

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
      ]);

      if (supervisorCount.error) console.error("Supervisor count error:", supervisorCount.error);
      if (candidateCount.error) console.error("Candidate count error:", candidateCount.error);
      if (assessmentCount.error) console.error("Assessment count error:", assessmentCount.error);
      if (completedCount.error) console.error("Completed count error:", completedCount.error);
      if (resultCount.error) console.error("Result count error:", resultCount.error);
      if (inProgressCount.error) console.error("In progress count error:", inProgressCount.error);

      const accessRows = safeArray(accessResponse?.data || []);
      const unblockedCount = accessRows.filter((item) => item.status === "unblocked").length;
      const blockedCount = accessRows.filter((item) => item.status === "blocked").length;

      const resultsData = resultsResponse?.data || [];
      const nationalServiceCount = resultsData.filter(
        r => r.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID
      ).length;
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
      
      console.log("Fetched results count:", resultsData.length || 0);
      console.log("National Service:", nationalServiceCount);
      console.log("Stratavax:", stratavaxCount);
      console.log("Candidates count:", allCandidatesResponse?.data?.length || 0);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("userSession");
      sessionStorage.removeItem("supabase.auth.token");
    }
    router.push("/login");
  }

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading admin dashboard...</p>
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

  // Calculate overall stats
  const totalRegistered = universityBreakdown?.reduce((sum, u) => sum + u.totalCandidates, 0) || 0;
  const totalCompleted = universityBreakdown?.reduce((sum, u) => sum + u.completedCandidates, 0) || 0;
  const totalInProgress = universityBreakdown?.reduce((sum, u) => sum + u.inProgress, 0) || 0;
  const totalNotStarted = universityBreakdown?.reduce((sum, u) => sum + u.notStarted, 0) || 0;
  const totalBlocked = universityBreakdown?.reduce((sum, u) => sum + u.blocked, 0) || 0;
  const totalUnblocked = universityBreakdown?.reduce((sum, u) => sum + u.unblocked, 0) || 0;
  const totalScheduled = universityBreakdown?.reduce((sum, u) => sum + u.scheduled, 0) || 0;

  // ============================================================
  // ✅ FIXED: University Breakdown - Uses hasResult for completed
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
      
      // ✅ FIX: Use hasResult (from assessment_results) for completed
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
      if (!map[name].programs[prog]) {
        map[name].programs[prog] = 0;
      }
      map[name].programs[prog] += 1;
    });
    
    return Object.entries(map).map(([name, data]) => ({
      name,
      totalCandidates: data.totalCandidates,
      completedCandidates: data.completedCandidates,
      inProgress: data.inProgress,
      notStarted: data.notStarted,
      blocked: data.blocked,
      unblocked: data.unblocked,
      scheduled: data.scheduled,
      programs: Object.entries(data.programs)
        .sort((a, b) => b[1] - a[1])
        .map(([prog, count]) => ({ name: prog, count })),
      completionRate: data.totalCandidates > 0 
        ? Math.round((data.completedCandidates / data.totalCandidates) * 100) 
        : 0
    })).sort((a, b) => b.totalCandidates - a.totalCandidates);
  }, [candidatesWithScores]);

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

        {/* STATS CARDS */}
        <div style={styles.statsRow}>
          <StatCard icon="👥" label="Total Candidates" value={totalRegistered} />
          <StatCard icon="📊" label="Total Reports" value={stats.totalResults || 0} />
          <StatCard icon="✅" label="Unique Completed" value={totalCompleted} />
          <StatCard icon="📋" label="National Service" value={stats.nationalServiceReports || 0} />
          <StatCard icon="📄" label="Stratavax" value={stats.stratavaxReports || 0} />
          <StatCard icon="🔄" label="In Progress" value={totalInProgress} />
          <StatCard icon="🔒" label="Blocked" value={totalBlocked} />
          <StatCard icon="📊" label="Avg Score" value={`${filteredGlobalAverageScore}%`} />
        </div>

        {/* FILTERS BAR */}
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
                  if (option) setSelectedProgramOptions([]);
                }}
                placeholder="Select University..."
                isClearable
                styles={customSelectStyles}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Programs:</label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                <button onClick={handleSelectAllPrograms} style={styles.smallButton}>Select All</button>
                <button onClick={handleClearPrograms} style={styles.smallButton}>Clear</button>
              </div>
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

        {/* UNIVERSITY BREAKDOWN TABLE - ✅ FIXED: Expanded row below university */}
        <div style={styles.breakdownContainer}>
          <div style={styles.breakdownHeader}>
            <h2 style={styles.breakdownTitle}>University Breakdown</h2>
            <div style={styles.breakdownSummary}>
              <span>🏛️ {universityBreakdown.length} Universities</span>
              <span>👥 {totalRegistered} Candidates</span>
              <span>✅ {totalCompleted} Completed</span>
              <span>🔄 {totalInProgress} In Progress</span>
              <span>🔒 {totalBlocked} Blocked</span>
            </div>
          </div>
          <div style={styles.breakdownTableWrapper}>
            <table style={styles.breakdownTable}>
              <thead>
                <tr>
                  <th style={styles.breakdownTh}>University</th>
                  <th style={styles.breakdownTh}>Total</th>
                  <th style={styles.breakdownTh}>✅ Completed</th>
                  <th style={styles.breakdownTh}>🔄 In Progress</th>
                  <th style={styles.breakdownTh}>📅 Scheduled</th>
                  <th style={styles.breakdownTh}>🔓 Unblocked</th>
                  <th style={styles.breakdownTh}>🔒 Blocked</th>
                  <th style={styles.breakdownTh}>⏳ Not Started</th>
                  <th style={styles.breakdownTh}>Programs</th>
                </tr>
              </thead>
              <tbody>
                {universityBreakdown.map((uni) => (
                  <Fragment key={uni.name}>
                    <tr style={styles.breakdownTr}>
                      <td style={styles.breakdownTd}>
                        <strong>{uni.name}</strong>
                        {uni.name === 'Not Specified' && (
                          <span style={{ marginLeft: '8px', fontSize: '10px', color: '#f57c00', background: '#fff3e0', padding: '2px 8px', borderRadius: '4px' }}>
                            No University
                          </span>
                        )}
                      </td>
                      <td style={styles.breakdownTd}>{uni.totalCandidates}</td>
                      <td style={{ ...styles.breakdownTd, color: '#2e7d32', fontWeight: 600 }}>{uni.completedCandidates}</td>
                      <td style={{ ...styles.breakdownTd, color: '#f57c00', fontWeight: 600 }}>{uni.inProgress}</td>
                      <td style={{ ...styles.breakdownTd, color: '#1565c0', fontWeight: 600 }}>{uni.scheduled}</td>
                      <td style={{ ...styles.breakdownTd, color: '#0d47a1', fontWeight: 600 }}>{uni.unblocked}</td>
                      <td style={{ ...styles.breakdownTd, color: '#c62828', fontWeight: 600 }}>{uni.blocked}</td>
                      <td style={{ ...styles.breakdownTd, color: '#94a3b8' }}>{uni.notStarted}</td>
                      <td style={styles.breakdownTd}>
                        <button 
                          onClick={() => toggleUniversityExpand(uni.name)}
                          style={styles.expandButton}
                        >
                          {expandedUniversity === uni.name ? 'Hide' : `Show ${uni.programs.length}`}
                        </button>
                      </td>
                    </tr>
                    {/* ✅ FIX: Expanded row rendered immediately below the university row */}
                    {expandedUniversity === uni.name && (
                      <tr>
                        <td colSpan="9" style={styles.expandedRow}>
                          <div style={styles.programBreakdown}>
                            <h4 style={styles.programBreakdownTitle}>
                              📚 Program Distribution for {uni.name}
                            </h4>
                            <div style={styles.programTags}>
                              {uni.programs.map((prog, idx) => (
                                <span key={idx} style={styles.programTag}>
                                  {prog.name}: <strong>{prog.count}</strong>
                                </span>
                              ))}
                            </div>
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

        {/* PIE CHARTS */}
        <div style={styles.pieChartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>University Distribution {selectedUniversityOption ? `(${selectedUniversityOption.label})` : '(All)'}</h4>
            <div style={{ height: '250px', position: 'relative' }}>
              <Pie
                data={{
                  labels: filteredUniversityPieData.labels,
                  datasets: [{ 
                    data: filteredUniversityPieData.data, 
                    backgroundColor: COLORS.slice(0, filteredUniversityPieData.labels.length), 
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
            <h4 style={styles.chartTitle}>Program Distribution {selectedProgramOptions.length > 0 ? '(Filtered)' : '(All)'}</h4>
            <div style={{ height: '250px', position: 'relative' }}>
              <Pie
                data={{
                  labels: filteredProgramPieData.labels,
                  datasets: [{ 
                    data: filteredProgramPieData.data, 
                    backgroundColor: COLORS.slice(0, filteredProgramPieData.labels.length), 
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

        {/* BAR CHARTS - ✅ FIXED: Show completion rate and sample size */}
        <div style={styles.barChartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Top Universities</h4>
            <div style={{ height: '400px' }}>
              <Bar
                data={{
                  labels: filteredUniversityAnalytics.slice(0, 15).map(u => 
                    `${u.name} (${u.completedCandidates}/${u.totalCandidates})`
                  ),
                  datasets: [{
                    label: 'Completion Rate %',
                    data: filteredUniversityAnalytics.slice(0, 15).map(u => u.completionRate),
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
            <h4 style={styles.chartTitle}>Top Programs</h4>
            <div style={{ height: '400px' }}>
              <Bar
                data={{
                  labels: filteredProgramAnalytics.slice(0, 15).map(p => 
                    `${p.name} (${p.completedCandidates}/${p.totalCandidates})`
                  ),
                  datasets: [{
                    label: 'Completion Rate %',
                    data: filteredProgramAnalytics.slice(0, 15).map(p => p.completionRate),
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

        {/* SCORE DISTRIBUTION - ✅ FIXED: Shows 100% correctly */}
        <div style={{ ...styles.chartCard, marginBottom: '24px' }}>
          <h4 style={styles.chartTitle}>Score Distribution {selectedProgramOptions.length > 0 || selectedUniversityOption ? '(Filtered)' : '(All)'}</h4>
          <div style={{ height: '250px' }}>
            <Bar
              data={{
                labels: filteredScoreDistribution.bins.slice(0, -1).map((b, i) => 
                  i === filteredScoreDistribution.bins.length - 2 
                    ? `${b}-${filteredScoreDistribution.bins[i+1]}%` 
                    : `${b}-${filteredScoreDistribution.bins[i+1]}%`
                ),
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
          <ActionCard href="/admin/add-supervisor" icon="➕" title="Add Supervisor" description="Create new supervisor accounts with dashboard access." />
          <ActionCard href="/admin/manage-supervisors" icon="👥" title="Manage Supervisors" description="View, activate, deactivate, or update supervisor accounts." />
          <ActionCard href="/admin/manage-candidates" icon="🎓" title="Manage Candidates" description="View candidate profiles, reset access, and review activity." />
          <ActionCard href="/admin/assign-candidates" icon="🔗" title="Assign Supervisors" description="Assign candidates to specific supervisors for management." />
          <ActionCard href="/admin/assign-assessments" icon="📋" title="Assign Assessments" description="Assign, unblock, or block candidate assessments." />
          <ActionCard href="/admin/batch-manage" icon="📦" title="Batch Manage" description="Perform bulk administrative actions and candidate updates." />
          <ActionCard href="/admin/audit-logs" icon="📜" title="Audit Logs" description="View system activity, access events, and administrative actions." />
          <ActionCard href="/admin/system-settings" icon="⚙️" title="System Settings" description="Configure platform settings and assessment parameters." />
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
            {allResults.length === 0 ? (
              <div style={styles.emptyState}>No results found.</div>
            ) : (
              <div style={styles.list}>
                {allResults.slice(0, 6).map((result) => {
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

// ============================================================
// STYLES
// ============================================================
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '12px 14px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #eef2f7'
  },
  statIcon: { fontSize: '20px' },
  statLabel: { fontSize: '9px', color: '#718096', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  statValue: { fontSize: '18px', fontWeight: 800, color: '#0a1929' },
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
  smallButton: {
    padding: '2px 10px',
    fontSize: '11px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#334155',
    fontWeight: '600'
  },
  breakdownContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    overflowX: 'auto'
  },
  breakdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  breakdownTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0a1929',
    margin: 0
  },
  breakdownSummary: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap'
  },
  breakdownTableWrapper: {
    overflowX: 'auto'
  },
  breakdownTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '800px'
  },
  breakdownTh: {
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#f8fafc',
    whiteSpace: 'nowrap'
  },
  breakdownTr: {
    borderBottom: '1px solid #e2e8f0',
    '&:hover': {
      background: '#f8fafc'
    }
  },
  breakdownTd: {
    padding: '8px 10px',
    fontSize: '13px',
    color: '#1a202c',
    verticalAlign: 'middle'
  },
  expandButton: {
    padding: '3px 10px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#334155',
    fontWeight: 500,
    '&:hover': {
      background: '#d0d8e0'
    }
  },
  expandedRow: {
    padding: '16px 20px',
    background: '#f8fafc'
  },
  programBreakdown: {
    padding: '12px 16px'
  },
  programBreakdownTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  programTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  programTag: {
    padding: '4px 12px',
    background: 'white',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#475569',
    whiteSpace: 'nowrap'
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
};

// ============================================================
// SUB-COMPONENTS
// ============================================================
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
