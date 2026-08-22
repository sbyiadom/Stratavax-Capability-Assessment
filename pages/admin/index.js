// pages/admin/index.js - FULLY CORRECTED WITH AGGRESSIVE CONSOLIDATION
// FIXED: Shows ALL consolidated groups (no "Others"), catches all variations

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
// AGGRESSIVE UNIVERSITY CONSOLIDATION - CATCHES ALL VARIATIONS
// ============================================================
function consolidateUniversityName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  
  const lower = raw.toLowerCase().trim();
  
  // Remove extra spaces and clean
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  
  // ============================================================
  // UNIVERSITY OF MINES AND TECHNOLOGY - ALL VARIATIONS
  // ============================================================
  if (lower.includes('mines') && lower.includes('technology') || 
      lower === 'umat' || 
      lower.includes('umat') ||
      lower.includes('university of mines') ||
      lower.includes('u.m.a.t') ||
      lower.includes('umat, tarkwa') ||
      lower.includes('umat tarkwa') ||
      lower.includes('mines and technology') ||
      lower.includes('mines & technology') ||
      lower.includes('tarkwa') && lower.includes('mines')) {
    return 'University of Mines and Technology (UMaT)';
  }
  
  // ============================================================
  // KNUST - ALL VARIATIONS
  // ============================================================
  if (lower.includes('kwame nkrumah') || 
      lower === 'knust' ||
      lower.includes('knust') ||
      lower.includes('k.n.u.s.t') ||
      lower.includes('kwame nkrumah university') ||
      lower.includes('k.n.u.s.t') ||
      lower.includes('knust -') ||
      lower.includes('knust-')) {
    return 'Kwame Nkrumah University of Science and Technology (KNUST)';
  }
  
  // ============================================================
  // UNIVERSITY OF GHANA - ALL VARIATIONS
  // ============================================================
  if (lower.includes('university of ghana') || 
      lower === 'ug' ||
      lower.includes('ug ') ||
      lower === 'legon' ||
      lower.includes('legon') ||
      lower.includes('u.g') ||
      lower.includes('university of ghana-') ||
      lower.includes('university of ghana ')) {
    return 'University of Ghana (UG)';
  }
  
  // ============================================================
  // UNIVERSITY OF CAPE COAST
  // ============================================================
  if (lower.includes('cape coast') || 
      lower === 'ucc' ||
      lower.includes('ucc ') ||
      lower.includes('u.c.c') ||
      lower.includes('university of cape coast')) {
    return 'University of Cape Coast (UCC)';
  }
  
  // ============================================================
  // TAKORADI TECHNICAL UNIVERSITY
  // ============================================================
  if (lower.includes('takoradi') && lower.includes('technical')) {
    return 'Takoradi Technical University';
  }
  
  // ============================================================
  // KUMASI TECHNICAL UNIVERSITY
  // ============================================================
  if (lower.includes('kumasi') && lower.includes('technical')) {
    return 'Kumasi Technical University';
  }
  
  // ============================================================
  // ACCRA TECHNICAL UNIVERSITY
  // ============================================================
  if (lower.includes('accra') && lower.includes('technical')) {
    return 'Accra Technical University';
  }
  
  // ============================================================
  // KOFORIDUA TECHNICAL UNIVERSITY
  // ============================================================
  if (lower.includes('koforidua') && lower.includes('technical')) {
    return 'Koforidua Technical University';
  }
  
  // ============================================================
  // SUNYANI TECHNICAL UNIVERSITY
  // ============================================================
  if (lower.includes('sunyani') && lower.includes('technical')) {
    return 'Sunyani Technical University';
  }
  
  // ============================================================
  // CAPE COAST TECHNICAL UNIVERSITY
  // ============================================================
  if (lower.includes('cape coast') && lower.includes('technical')) {
    return 'Cape Coast Technical University';
  }
  
  // ============================================================
  // HO TECHNICAL UNIVERSITY
  // ============================================================
  if ((lower.includes('ho') || lower.includes('ho ')) && lower.includes('technical')) {
    return 'Ho Technical University';
  }
  
  // ============================================================
  // UNIVERSITY OF ENERGY AND NATURAL RESOURCES
  // ============================================================
  if (lower.includes('energy') && lower.includes('natural resources')) {
    return 'University of Energy and Natural Resources';
  }
  
  // ============================================================
  // UNIVERSITY FOR DEVELOPMENT STUDIES
  // ============================================================
  if (lower.includes('development studies') || 
      lower === 'uds' || 
      lower.includes('uds ') ||
      lower.includes('u.d.s') ||
      lower.includes('university for development')) {
    return 'University for Development Studies (UDS)';
  }
  
  // ============================================================
  // PENTECOST UNIVERSITY
  // ============================================================
  if (lower.includes('pentecost')) {
    return 'Pentecost University';
  }
  
  // ============================================================
  // UNIVERSITY OF PROFESSIONAL STUDIES
  // ============================================================
  if (lower.includes('professional studies') || 
      lower === 'upsa' || 
      lower.includes('upsa ') ||
      lower.includes('u.p.s.a')) {
    return 'University of Professional Studies (UPSA)';
  }
  
  // ============================================================
  // GHANA COMMUNICATION TECHNOLOGY UNIVERSITY
  // ============================================================
  if (lower.includes('communication technology') || 
      lower === 'gctu' || 
      lower.includes('gctu ') ||
      lower.includes('g.c.t.u')) {
    return 'Ghana Communication Technology University (GCTU)';
  }
  
  // ============================================================
  // REGIONAL MARITIME UNIVERSITY
  // ============================================================
  if (lower.includes('maritime') || 
      lower === 'rmu' || 
      lower.includes('rmu ') ||
      lower.includes('regional maritime')) {
    return 'Regional Maritime University (RMU)';
  }
  
  // ============================================================
  // ALL NATIONS UNIVERSITY
  // ============================================================
  if (lower.includes('all nations') || 
      lower === 'anu' || 
      lower.includes('anu ')) {
    return 'All Nations University';
  }
  
  // ============================================================
  // ACCRA INSTITUTE OF TECHNOLOGY
  // ============================================================
  if (lower.includes('accra institute') || 
      lower.includes('ait') ||
      lower.includes('a.i.t')) {
    return 'Accra Institute of Technology (AIT)';
  }
  
  // ============================================================
  // KOFORIDUA POLYTECHNIC / KPoly
  // ============================================================
  if (lower.includes('koforidua poly') || 
      lower === 'kpoly' || 
      lower.includes('kpoly ') ||
      lower.includes('k.poly') ||
      lower.includes('koforidua polytechnic')) {
    return 'Koforidua Polytechnic (KPoly)';
  }
  
  // ============================================================
  // UNIVERSITY OF SKILLS TRAINING
  // ============================================================
  if (lower.includes('skills training') || 
      lower.includes('entrepreneurial') ||
      lower.includes('skills training and entrepreneurial')) {
    return 'University of Skills Training and Entrepreneurial Development';
  }
  
  // ============================================================
  // CENTRAL UNIVERSITY
  // ============================================================
  if (lower.includes('central university')) {
    return 'Central University';
  }
  
  // ============================================================
  // WISCONSIN INTERNATIONAL UNIVERSITY
  // ============================================================
  if (lower.includes('wisconsin')) {
    return 'Wisconsin International University';
  }
  
  // ============================================================
  // CHRISTIAN SERVICE UNIVERSITY
  // ============================================================
  if (lower.includes('christian service')) {
    return 'Christian Service University';
  }
  
  // ============================================================
  // DATA LINK UNIVERSITY
  // ============================================================
  if (lower.includes('data link')) {
    return 'Data Link University';
  }
  
  // ============================================================
  // BLUE CREST UNIVERSITY
  // ============================================================
  if (lower.includes('blue crest')) {
    return 'Blue Crest University';
  }
  
  // ============================================================
  // GARDEN CITY UNIVERSITY
  // ============================================================
  if (lower.includes('garden city')) {
    return 'Garden City University';
  }
  
  // ============================================================
  // METHODIST UNIVERSITY
  // ============================================================
  if (lower.includes('methodist')) {
    return 'Methodist University';
  }
  
  // ============================================================
  // PRESBYTERIAN UNIVERSITY
  // ============================================================
  if (lower.includes('presbyterian')) {
    return 'Presbyterian University';
  }
  
  // ============================================================
  // VALLEY VIEW UNIVERSITY
  // ============================================================
  if (lower.includes('valley view')) {
    return 'Valley View University';
  }
  
  // ============================================================
  // ZION UNIVERSITY
  // ============================================================
  if (lower.includes('zion')) {
    return 'Zion University';
  }
  
  // ============================================================
  // KENTUCKY UNIVERSITY
  // ============================================================
  if (lower.includes('kentucky')) {
    return 'Kentucky University';
  }
  
  // ============================================================
  // HARVARD UNIVERSITY (just in case 😄)
  // ============================================================
  if (lower.includes('harvard')) {
    return 'Harvard University';
  }
  
  // Return cleaned version
  return cleaned;
}

// ============================================================
// AGGRESSIVE PROGRAM CONSOLIDATION - CATCHES ALL VARIATIONS
// ============================================================
function consolidateProgramName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  
  const lower = raw.toLowerCase().trim();
  
  // Remove common prefixes for better matching
  const cleanForMatch = (str) => {
    return str
      .toLowerCase()
      .replace(/bsc|b\.sc|b sc|bachelor|ba|b\.a|b a|b-tech|btech|b\.tech|diploma|hnd/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const cleanLower = cleanForMatch(raw);
  
  // ============================================================
  // ELECTRICAL/ELECTRONIC ENGINEERING - ALL VARIATIONS
  // ============================================================
  if (cleanLower.includes('electrical') || 
      cleanLower.includes('electronic') || 
      cleanLower.includes('elect/electron') || 
      cleanLower.includes('electrical/electronic') ||
      cleanLower.includes('electrical electronic') || 
      cleanLower.includes('electrical and electronic') ||
      cleanLower.includes('electrical & electronic') ||
      lower === 'eee' ||
      lower.includes('eee ')) {
    return 'BSc Electrical/Electronic Engineering';
  }
  
  // ============================================================
  // MECHANICAL ENGINEERING - ALL VARIATIONS
  // ============================================================
  if (cleanLower.includes('mechanical') || 
      cleanLower.includes('mech') ||
      lower === 'me' ||
      lower.includes('me ') ||
      cleanLower.includes('mechanical engineering')) {
    return 'BSc Mechanical Engineering';
  }
  
  // ============================================================
  // CHEMICAL ENGINEERING
  // ============================================================
  if (cleanLower.includes('chemical') || 
      cleanLower.includes('chem') ||
      lower === 'che' ||
      lower.includes('che ') ||
      cleanLower.includes('chemical engineering')) {
    return 'BSc Chemical Engineering';
  }
  
  // ============================================================
  // CIVIL ENGINEERING
  // ============================================================
  if (cleanLower.includes('civil') || 
      lower === 'ce' || 
      lower.includes('ce ') ||
      cleanLower.includes('civil engineering')) {
    return 'BSc Civil Engineering';
  }
  
  // ============================================================
  // COMPUTER ENGINEERING
  // ============================================================
  if (cleanLower.includes('computer') || 
      lower === 'cpe' || 
      lower.includes('cpe ') ||
      cleanLower.includes('computer engineering')) {
    return 'BSc Computer Engineering';
  }
  
  // ============================================================
  // INDUSTRIAL ENGINEERING
  // ============================================================
  if (cleanLower.includes('industrial') || 
      lower === 'ie' || 
      lower.includes('ie ') ||
      cleanLower.includes('industrial engineering')) {
    return 'BSc Industrial Engineering';
  }
  
  // ============================================================
  // AGRICULTURAL ENGINEERING
  // ============================================================
  if (cleanLower.includes('agricultural') || 
      cleanLower.includes('agric') ||
      lower === 'age' ||
      lower.includes('age ') ||
      cleanLower.includes('agricultural engineering')) {
    return 'BSc Agricultural Engineering';
  }
  
  // ============================================================
  // PETROLEUM ENGINEERING
  // ============================================================
  if (cleanLower.includes('petroleum') || 
      cleanLower.includes('petrol') ||
      lower === 'pe' ||
      lower.includes('pe ') ||
      cleanLower.includes('petroleum engineering')) {
    return 'BSc Petroleum Engineering';
  }
  
  // ============================================================
  // GEOLOGICAL ENGINEERING
  // ============================================================
  if (cleanLower.includes('geological') || 
      cleanLower.includes('geo') ||
      lower === 'ge' ||
      lower.includes('ge ') ||
      cleanLower.includes('geological engineering')) {
    return 'BSc Geological Engineering';
  }
  
  // ============================================================
  // GEOMATIC ENGINEERING
  // ============================================================
  if (cleanLower.includes('geomatic') ||
      cleanLower.includes('geomatic engineering')) {
    return 'BSc Geomatic Engineering';
  }
  
  // ============================================================
  // MATERIALS ENGINEERING
  // ============================================================
  if (cleanLower.includes('materials') || 
      cleanLower.includes('material') ||
      lower === 'mte' ||
      lower.includes('mte ') ||
      cleanLower.includes('materials engineering')) {
    return 'BSc Materials Engineering';
  }
  
  // ============================================================
  // TELECOMMUNICATIONS ENGINEERING
  // ============================================================
  if (cleanLower.includes('telecommunications') || 
      cleanLower.includes('telecom') ||
      cleanLower.includes('telecommunication') ||
      lower === 'tele' ||
      lower.includes('tele ') ||
      cleanLower.includes('telecommunications engineering')) {
    return 'BSc Telecommunications Engineering';
  }
  
  // ============================================================
  // RENEWABLE ENERGY ENGINEERING
  // ============================================================
  if (cleanLower.includes('renewable') || 
      cleanLower.includes('energy') ||
      cleanLower.includes('renewable energy')) {
    return 'BSc Renewable Energy Engineering';
  }
  
  // ============================================================
  // AUTOMOBILE ENGINEERING
  // ============================================================
  if (cleanLower.includes('automobile') || 
      cleanLower.includes('auto') ||
      cleanLower.includes('automobile engineering')) {
    return 'BSc Automobile Engineering';
  }
  
  // ============================================================
  // INFORMATION TECHNOLOGY
  // ============================================================
  if (cleanLower.includes('information technology') || 
      cleanLower.includes('info tech') ||
      lower === 'it' ||
      lower.includes('it ') ||
      cleanLower.includes('information technology management') ||
      cleanLower.includes('business information technology')) {
    return 'BSc Information Technology';
  }
  
  // ============================================================
  // INFORMATION SYSTEMS
  // ============================================================
  if (cleanLower.includes('information systems') || 
      cleanLower.includes('info systems') ||
      cleanLower.includes('information system')) {
    return 'BSc Information Systems';
  }
  
  // ============================================================
  // BIOMEDICAL ENGINEERING
  // ============================================================
  if (cleanLower.includes('biomedical') || 
      cleanLower.includes('bio medical') ||
      cleanLower.includes('biomedical engineering')) {
    return 'BSc Biomedical Engineering';
  }
  
  // ============================================================
  // MINERALS ENGINEERING
  // ============================================================
  if (cleanLower.includes('minerals') || 
      cleanLower.includes('mining') ||
      cleanLower.includes('minerals engineering')) {
    return 'BSc Minerals Engineering';
  }
  
  // ============================================================
  // PSYCHOLOGY
  // ============================================================
  if (cleanLower.includes('psychology') || 
      cleanLower.includes('psych')) {
    return 'BA Psychology';
  }
  
  // ============================================================
  // POLITICAL SCIENCE
  // ============================================================
  if (cleanLower.includes('political science') || 
      cleanLower.includes('politics') ||
      cleanLower.includes('political')) {
    return 'BA Political Science';
  }
  
  // ============================================================
  // LABORATORY TECHNOLOGY
  // ============================================================
  if (cleanLower.includes('laboratory') || 
      cleanLower.includes('lab') ||
      cleanLower.includes('laboratory technology')) {
    return 'BSc Laboratory Technology';
  }
  
  // ============================================================
  // FOOD SCIENCE
  // ============================================================
  if (cleanLower.includes('food science') || 
      cleanLower.includes('food') ||
      cleanLower.includes('food science and postharvest technology')) {
    return 'BSc Food Science and Postharvest Technology';
  }
  
  // ============================================================
  // STATISTICS AND MATHEMATICS
  // ============================================================
  if ((cleanLower.includes('statistics') || cleanLower.includes('stat')) && 
      (cleanLower.includes('mathematics') || cleanLower.includes('math'))) {
    return 'BSc Statistics and Mathematics';
  }
  
  // ============================================================
  // MATHEMATICS
  // ============================================================
  if (cleanLower.includes('mathematics') || 
      cleanLower.includes('math') ||
      lower === 'maths' ||
      lower.includes('maths ')) {
    return 'BSc Mathematics';
  }
  
  // ============================================================
  // STATISTICS
  // ============================================================
  if (cleanLower.includes('statistics') || 
      cleanLower.includes('stat')) {
    return 'BSc Statistics';
  }
  
  // ============================================================
  // ACCOUNTING
  // ============================================================
  if (cleanLower.includes('accounting')) {
    return 'BSc Accounting';
  }
  
  // ============================================================
  // ACCOUNTING AND ECONOMICS
  // ============================================================
  if (cleanLower.includes('accounting') && cleanLower.includes('economics')) {
    return 'BSc Accounting and Economics';
  }
  
  // ============================================================
  // ECONOMICS
  // ============================================================
  if (cleanLower.includes('economics')) {
    return 'BSc Economics';
  }
  
  // ============================================================
  // BUSINESS ADMINISTRATION / MANAGEMENT
  // ============================================================
  if (cleanLower.includes('business administration') || 
      cleanLower.includes('business admin') ||
      cleanLower.includes('management') ||
      cleanLower.includes('admin') || 
      cleanLower.includes('secretariat') ||
      cleanLower.includes('secretariatship')) {
    return 'Business Administration';
  }
  
  // ============================================================
  // MARKETING
  // ============================================================
  if (cleanLower.includes('marketing')) {
    return 'BSc Marketing';
  }
  
  // ============================================================
  // HUMAN RESOURCE MANAGEMENT
  // ============================================================
  if (cleanLower.includes('human resource') || 
      cleanLower.includes('hr')) {
    return 'BSc Human Resource Management';
  }
  
  // ============================================================
  // PUBLIC ADMINISTRATION
  // ============================================================
  if (cleanLower.includes('public administration')) {
    return 'BSc Public Administration';
  }
  
  // ============================================================
  // PUBLIC HEALTH
  // ============================================================
  if (cleanLower.includes('public health')) {
    return 'BSc Public Health';
  }
  
  // ============================================================
  // NURSING
  // ============================================================
  if (cleanLower.includes('nursing')) {
    return 'BSc Nursing';
  }
  
  // ============================================================
  // MIDWIFERY
  // ============================================================
  if (cleanLower.includes('midwifery')) {
    return 'BSc Midwifery';
  }
  
  // ============================================================
  // ARCHITECTURE
  // ============================================================
  if (cleanLower.includes('architecture')) {
    return 'BSc Architecture';
  }
  
  // ============================================================
  // ESTATE MANAGEMENT
  // ============================================================
  if (cleanLower.includes('estate management') || 
      cleanLower.includes('estate')) {
    return 'BSc Estate Management';
  }
  
  // ============================================================
  // QUANTITY SURVEYING
  // ============================================================
  if (cleanLower.includes('quantity surveying') || 
      cleanLower.includes('surveying')) {
    return 'BSc Quantity Surveying';
  }
  
  // ============================================================
  // ARTS
  // ============================================================
  if (cleanLower.includes('arts') || 
      lower.includes('ba ') || 
      lower.includes('b.a ') ||
      cleanLower.includes('ba arts')) {
    return 'BA Arts';
  }
  
  // ============================================================
  // BIOLOGICAL SCIENCES
  // ============================================================
  if (cleanLower.includes('biological') || 
      cleanLower.includes('biology')) {
    return 'BSc Biological Sciences';
  }
  
  // ============================================================
  // CHEMISTRY
  // ============================================================
  if (cleanLower.includes('chemistry')) {
    return 'BSc Chemistry';
  }
  
  // ============================================================
  // PHYSICS
  // ============================================================
  if (cleanLower.includes('physics')) {
    return 'BSc Physics';
  }
  
  // ============================================================
  // If we have "BSc" or "BA" in the original, clean it up
  // ============================================================
  if (raw.includes('BSc') || raw.includes('B.Sc') || raw.includes('B sc') || raw.includes('Bachelor')) {
    let cleaned = raw.replace(/BSc|B\.Sc|B Sc|Bachelor/g, '').trim();
    cleaned = cleaned.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    if (cleaned && cleaned.length > 2) return `BSc ${cleaned}`;
  }
  
  if (raw.includes('BA') || raw.includes('B.A') || raw.includes('B A')) {
    let cleaned = raw.replace(/BA|B\.A|B A/g, '').trim();
    cleaned = cleaned.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    if (cleaned && cleaned.length > 2) return `BA ${cleaned}`;
  }
  
  // Default - clean up and return
  let cleaned = raw
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  cleaned = cleaned.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return cleaned || raw;
}

// ============================================================
// GET UNIQUE MASTER NAMES WITH MERGING
// ============================================================
function getUniqueMasterNames(rawItems, consolidateFn) {
  if (!rawItems || rawItems.length === 0) return { groups: [], masterToRawMap: {} };
  
  const map = {};
  const rawToMasterMap = {};
  
  // First pass: consolidate all items
  rawItems.forEach(raw => {
    const consolidated = consolidateFn(raw);
    if (!map[consolidated]) {
      map[consolidated] = [];
    }
    map[consolidated].push(raw);
    rawToMasterMap[raw] = consolidated;
  });
  
  // Second pass: merge similar master names (case insensitive)
  const masterNames = Object.keys(map);
  const mergedMap = {};
  const processed = new Set();
  
  masterNames.forEach(name1 => {
    if (processed.has(name1)) return;
    
    const group = [name1];
    processed.add(name1);
    
    masterNames.forEach(name2 => {
      if (processed.has(name2)) return;
      
      // Check if names are similar (case insensitive)
      const n1 = name1.toLowerCase();
      const n2 = name2.toLowerCase();
      
      // If one contains the other or they share significant words
      const words1 = n1.split(' ');
      const words2 = n2.split(' ');
      const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
      
      if (commonWords.length >= 2 || n1.includes(n2) || n2.includes(n1)) {
        processed.add(name2);
        group.push(name2);
      }
    });
    
    // Use the longest name as master
    const master = group.reduce((a, b) => a.length >= b.length ? a : b);
    mergedMap[master] = [];
    
    group.forEach(name => {
      // Merge all raw items from this group
      map[name].forEach(raw => {
        if (!mergedMap[master].includes(raw)) {
          mergedMap[master].push(raw);
        }
      });
    });
  });
  
  return { 
    groups: Object.keys(mergedMap), 
    masterToRawMap: mergedMap 
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
  const [allResults, setAllResults] = useState([]);

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

    return allCandidates.map(c => ({
      ...c,
      score: scoreMap[c.id] || 0,
      hasResult: !!scoreMap[c.id],
      resultDetails: resultMap[c.id] || null,
      consolidatedProgram: consolidateProgramName(c.programme),
      consolidatedUniversity: consolidateUniversityName(c.university)
    }));
  }, [allCandidates, allResults]);

  // ============================================================
  // GROUP NORMALIZATION - USING AGGRESSIVE CONSOLIDATION
  // ============================================================
  const rawUniversities = useMemo(() => candidatesWithScores.map(c => c.university).filter(Boolean), [candidatesWithScores]);
  const rawPrograms = useMemo(() => candidatesWithScores.map(c => c.programme).filter(Boolean), [candidatesWithScores]);

  const uniGroup = useMemo(() => getUniqueMasterNames(rawUniversities, consolidateUniversityName), [rawUniversities]);
  const progGroup = useMemo(() => getUniqueMasterNames(rawPrograms, consolidateProgramName), [rawPrograms]);

  // ============================================================
  // DEBUG: Log all unique universities and programs
  // ============================================================
  useEffect(() => {
    // Log all unique universities and their consolidated versions
    const unis = candidatesWithScores.map(c => c.university).filter(Boolean);
    const uniqueUnis = [...new Set(unis)];
    
    console.log('=== ALL UNIQUE UNIVERSITIES (' + uniqueUnis.length + ' total) ===');
    const uniMap = {};
    uniqueUnis.forEach(u => {
      const consolidated = consolidateUniversityName(u);
      if (!uniMap[consolidated]) uniMap[consolidated] = [];
      uniMap[consolidated].push(u);
    });
    
    const sortedUnis = Object.keys(uniMap).sort((a, b) => uniMap[b].length - uniMap[a].length);
    sortedUnis.forEach(master => {
      console.log(`\n📌 MASTER: "${master}" (${uniMap[master].length} variations)`);
      uniMap[master].forEach(raw => {
        console.log(`   └─ "${raw}"`);
      });
    });
    
    // Log all unique programs and their consolidated versions
    const progs = candidatesWithScores.map(c => c.programme).filter(Boolean);
    const uniqueProgs = [...new Set(progs)];
    
    console.log('\n\n=== ALL UNIQUE PROGRAMS (' + uniqueProgs.length + ' total) ===');
    const progMap = {};
    uniqueProgs.forEach(p => {
      const consolidated = consolidateProgramName(p);
      if (!progMap[consolidated]) progMap[consolidated] = [];
      progMap[consolidated].push(p);
    });
    
    const sortedProgs = Object.keys(progMap).sort((a, b) => progMap[b].length - progMap[a].length);
    sortedProgs.forEach(master => {
      console.log(`\n📌 MASTER: "${master}" (${progMap[master].length} variations)`);
      progMap[master].forEach(raw => {
        console.log(`   └─ "${raw}"`);
      });
    });
  }, [candidatesWithScores]);

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

    filtered = filtered.filter(c => {
      return c.score >= Number(minScore) && c.score <= Number(maxScore);
    });

    return filtered;
  }, [candidatesWithScores, selectedUniversityOption, selectedProgramOptions, minScore, maxScore]);

  // ============================================================
  // FILTERED ANALYTICS
  // ============================================================
  const filteredUniversityAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.university) return;
      // Use consolidated name for grouping
      const name = c.consolidatedUniversity || c.university;
      if (!map[name]) {
        map[name] = { 
          candidates: 0, 
          scoreTotal: 0,
          rawNames: new Set()
        };
      }
      map[name].candidates += 1;
      map[name].scoreTotal += c.score;
      map[name].rawNames.add(c.university);
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      candidates: data.candidates,
      avgScore: data.candidates > 0 ? Math.round(data.scoreTotal / data.candidates) : 0,
      rawVariants: Array.from(data.rawNames)
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredCandidates]);

  const filteredProgramAnalytics = useMemo(() => {
    const map = {};
    filteredCandidates.forEach(c => {
      if (!c.programme) return;
      // Use consolidated name for grouping
      const name = c.consolidatedProgram || c.programme;
      if (!map[name]) {
        map[name] = { 
          candidates: 0, 
          scoreTotal: 0,
          rawVariants: new Set()
        };
      }
      map[name].candidates += 1;
      map[name].scoreTotal += c.score;
      map[name].rawVariants.add(c.programme);
    });
    return Object.entries(map).map(([name, data]) => ({
      name,
      candidates: data.candidates,
      avgScore: data.candidates > 0 ? Math.round(data.scoreTotal / data.candidates) : 0,
      rawVariants: Array.from(data.rawVariants)
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredCandidates]);

  const filteredGlobalAverageScore = useMemo(() => {
    const scores = filteredCandidates.map(c => c.score).filter(s => s > 0);
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

  // ============================================================
  // PIE CHARTS - SHOW ALL GROUPS (NO "OTHERS" CATEGORY)
  // ============================================================
  const filteredUniversityPieData = useMemo(() => {
    const labels = filteredUniversityAnalytics.map(u => u.name);
    const data = filteredUniversityAnalytics.map(u => u.candidates);
    return { labels, data };
  }, [filteredUniversityAnalytics]);

  const filteredProgramPieData = useMemo(() => {
    const labels = filteredProgramAnalytics.map(p => p.name);
    const data = filteredProgramAnalytics.map(p => p.candidates);
    return { labels, data };
  }, [filteredProgramAnalytics]);

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
      ]);

      // Log any errors
      if (supervisorCount.error) console.error("Supervisor count error:", supervisorCount.error);
      if (candidateCount.error) console.error("Candidate count error:", candidateCount.error);
      if (assessmentCount.error) console.error("Assessment count error:", assessmentCount.error);
      if (completedCount.error) console.error("Completed count error:", completedCount.error);
      if (resultCount.error) console.error("Result count error:", resultCount.error);
      if (inProgressCount.error) console.error("In progress count error:", inProgressCount.error);

      const accessRows = safeArray(accessResponse?.data || []);
      const unblockedCount = accessRows.filter((item) => item.status === "unblocked").length;
      const blockedCount = accessRows.filter((item) => item.status === "blocked").length;

      setStats({
        totalSupervisors: supervisorCount.count || 0,
        totalCandidates: candidateCount.count || 0,
        totalAssessments: assessmentCount.count || 0,
        completedAssessments: completedCount.count || 0,
        unblockedAssessments: unblockedCount || 0,
        blockedAssessments: blockedCount || 0,
        inProgressSessions: inProgressCount.count || 0,
        totalResults: resultCount.count || 0
      });

      setAllCandidates(allCandidatesResponse?.data || []);
      setRecentCandidates(recentCandidatesResponse?.data || []);
      setAllResults(resultsResponse?.data || []);
      
      console.log("Fetched results count:", resultsResponse?.data?.length || 0);
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
          <StatCard icon="👥" label="Filtered Candidates" value={filteredTotalCandidates} subValue={`of ${stats.totalCandidates} total`} />
          <StatCard icon="📊" label="Avg Score" value={`${filteredGlobalAverageScore}%`} />
          <StatCard icon="✅" label="Pass Rate" value={`${filteredGlobalPassRate}%`} />
          <StatCard icon="📚" label="Programs in Filter" value={filteredProgramAnalytics.length} />
          <StatCard icon="📋" label="Active Assessments" value={stats.totalAssessments} />
          <StatCard icon="✓" label="Completed" value={stats.completedAssessments} />
          <StatCard icon="◉" label="In Progress" value={stats.inProgressSessions} />
          <StatCard icon="📈" label="Result Records" value={stats.totalResults} />
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

        {/* PIE CHARTS - SHOW ALL GROUPS, NO "OTHERS" */}
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

        {/* BAR CHARTS */}
        <div style={styles.barChartGrid}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Top Universities (By Avg Score)</h4>
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
            <h4 style={styles.chartTitle}>Top Programs (By Avg Score)</h4>
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

        {/* SCORE DISTRIBUTION */}
        <div style={{ ...styles.chartCard, marginBottom: '24px' }}>
          <h4 style={styles.chartTitle}>Score Distribution {selectedProgramOptions.length > 0 || selectedUniversityOption ? '(Filtered)' : '(All)'}</h4>
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
