// components/reports/NationalServiceReport.js - COMPLETE FIXED FILE
// FIX: Properly displays behavioral matrix from report_data.proctoring

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '20px'
  },
  header: {
    textAlign: 'center',
    padding: '30px 20px 20px',
    background: 'linear-gradient(135deg, #0b2a4e 0%, #1b4a7a 100%)',
    borderRadius: '12px',
    color: 'white',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 16px 0'
  },
  candidateInfo: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '16px 20px',
    marginTop: '8px'
  },
  candidateInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    textAlign: 'left'
  },
  infoLabel: {
    fontSize: '12px',
    opacity: 0.7,
    display: 'block',
    marginBottom: '2px'
  },
  infoValue: {
    fontSize: '15px',
    fontWeight: '500',
    display: 'block'
  },
  banner: {
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  bannerIcon: {
    fontSize: '32px',
    lineHeight: '1'
  },
  bannerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '4px'
  },
  bannerNarrative: {
    fontSize: '14px',
    color: '#1a202c',
    lineHeight: '1.6'
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  scoreCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  scoreLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '8px'
  },
  scoreValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0b2a4e'
  },
  scoreBand: {
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '8px'
  },
  subCategoryCount: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#0b2a4e',
    margin: 0
  },
  sectionScore: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0b2a4e',
    background: '#e8eaf6',
    padding: '4px 16px',
    borderRadius: '20px'
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  categoryCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '10px'
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569'
  },
  categoryScore: {
    fontSize: '20px',
    fontWeight: '700'
  },
  categoryBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px'
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: '4px'
  },
  categoryDetail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  categoryComment: {
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '4px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    color: '#64748b'
  },
  strengthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  strengthCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  strengthRank: {
    width: '32px',
    height: '32px',
    background: '#2e7d32',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0
  },
  developmentRank: {
    width: '32px',
    height: '32px',
    background: '#c62828',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0
  },
  cardContent: {
    flex: 1
  },
  cardName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c',
    marginBottom: '4px'
  },
  cardScore: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '4px'
  },
  placementContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  placementDescription: {
    fontSize: '14px',
    color: '#475569',
    marginBottom: '16px'
  },
  placementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },
  placementCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px'
  },
  statCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0b2a4e'
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  actions: {
    textAlign: 'center',
    marginTop: '20px'
  },
  printButton: {
    padding: '12px 24px',
    background: '#0b2a4e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  },
  // 🟢 BEHAVIORAL MATRIX STYLES
  behavioralToggleContainer: {
    marginTop: '24px',
    textAlign: 'center'
  },
  behavioralToggleButton: {
    padding: '10px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  behavioralSection: {
    marginTop: '24px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  behavioralTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 16px 0',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0'
  },
  behavioralStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  behavioralStat: {
    background: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  behavioralLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px'
  },
  behavioralValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929'
  },
  noBehavioralData: {
    textAlign: 'center',
    padding: '30px 20px',
    color: '#64748b'
  },
  noBehavioralSubtext: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '8px'
  },
  cleanAssessment: {
    padding: '16px 20px',
    background: '#dcfce7',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    marginBottom: '16px'
  },
  riskBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600'
  },
  riskSummary: {
    padding: '12px 16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '12px',
    fontSize: '14px',
    color: '#475569'
  },
  behavioralCommentary: {
    marginTop: '16px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  commentaryTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0'
  },
  commentaryMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  commentaryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '6px 0',
    borderBottom: '1px solid #f8fafc'
  },
  commentaryLabel: {
    fontWeight: '600',
    color: '#475569',
    minWidth: '120px',
    fontSize: '13px',
    flexShrink: 0
  },
  commentaryText: {
    fontSize: '13px',
    color: '#1a202c',
    lineHeight: '1.5'
  },
  loadingBehavioral: {
    textAlign: 'center',
    padding: '20px',
    color: '#64748b'
  },
  // 🟢 EXTERNAL URLS STYLES
  externalUrlsSection: {
    marginTop: '16px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflowX: 'auto'
  },
  externalUrlsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  externalUrlsTable: {
    overflowX: 'auto'
  },
  urlTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    minWidth: '600px'
  },
  urlTableHeader: {
    background: '#f8fafc',
    borderBottom: '2px solid #e2e8f0'
  },
  urlTableHeaderCell: {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#64748b',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  urlTableRow: {
    borderBottom: '1px solid #f1f5f9'
  },
  urlTableCell: {
    padding: '8px 12px',
    verticalAlign: 'middle',
    fontSize: '13px'
  },
  domainBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    background: '#f1f5f9',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#1a202c'
  },
  urlLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '12px',
    wordBreak: 'break-all'
  },
  moreUrlsNote: {
    padding: '8px 12px',
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  domainSummary: {
    marginTop: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  domainSummaryTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 8px 0'
  },
  domainTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  domainTag: {
    padding: '4px 12px',
    background: 'white',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#475569'
  }
};

// ============================================================
// 🟢 BEHAVIORAL MATRIX HELPER - Extracts from proctoring data
// ============================================================

function extractBehavioralMatrix(report) {
  if (!report) return null;

  // Try multiple sources for proctoring data
  const proctoring = 
    report.proctoring || 
    report.report_data?.proctoring || 
    report.behavioralMatrix ||
    null;

  if (!proctoring) {
    console.log('[Behavioral Matrix] No proctoring data found');
    return null;
  }

  console.log('[Behavioral Matrix] Raw proctoring data:', proctoring);

  // Format total time
  let totalTime = '00:00:00';
  const completedAt = report.completedAt || report.completed_at;
  if (completedAt) {
    try {
      const startTime = new Date(completedAt);
      const now = new Date();
      const diffMs = now - startTime;
      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const diffSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        totalTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    } catch (e) {
      totalTime = '00:00:00';
    }
  }

  // Calculate avg time per question
  let avgTimePerQuestion = 0;
  const totalMax = report.totalMax || report.total_max || 0;
  if (totalMax > 0 && completedAt) {
    try {
      const startTime = new Date(completedAt);
      const now = new Date();
      const diffMs = now - startTime;
      if (diffMs > 0) {
        avgTimePerQuestion = Math.round(diffMs / totalMax / 1000);
      }
    } catch (e) {
      avgTimePerQuestion = 0;
    }
  }

  // Build the behavioral matrix
  const matrix = {
    totalTime: proctoring.totalTime || totalTime,
    avgTimePerQuestion: proctoring.avgTimePerQuestion || avgTimePerQuestion || 0,
    answerChanges: proctoring.answerChanges || proctoring.answer_changes || 0,
    tabSwitches: proctoring.tabSwitches || proctoring.tab_switches || 0,
    violations: proctoring.totalViolations || proctoring.violations || 0,
    copyPasteAttempts: proctoring.copyPasteAttempts || 0,
    rightClickAttempts: proctoring.rightClickAttempts || 0,
    riskLevel: proctoring.riskLevel || 'Low Risk',
    riskScore: proctoring.riskScore || 0,
    riskFactors: proctoring.riskFactors || [],
    externalUrlsVisited: proctoring.externalUrlsVisited || 0,
    flags: {
      violations: proctoring.totalViolations || proctoring.violations || 0,
      tabSwitches: proctoring.tabSwitches || 0,
      answerChanges: proctoring.answerChanges || 0
    }
  };

  console.log('[Behavioral Matrix] Extracted matrix:', matrix);
  return matrix;
}

// ============================================================
// COMPONENT
// ============================================================
export default function NationalServiceReport({
  report,
  onBack,
  behavioralMatrix: propBehavioralMatrix,
  loadingBehavioral: propLoadingBehavioral
}) {
  const [localBehavioralMatrix, setLocalBehavioralMatrix] = useState(null);
  const [localLoadingBehavioral, setLocalLoadingBehavioral] = useState(false);
  const [showBehavioral, setShowBehavioral] = useState(true);

  // 🟢 FIRST: Try to extract from report, THEN use prop, THEN fetch
  const extractedMatrix = extractBehavioralMatrix(report);
  
  const behavioralMatrix = 
    extractedMatrix || 
    propBehavioralMatrix || 
    localBehavioralMatrix || 
    null;
    
  const loadingBehavioral = propLoadingBehavioral || localLoadingBehavioral || false;

  // 🟢 Only fetch if no data in report and no prop
  useEffect(() => {
    // If we already have extracted data, no need to fetch
    if (extractedMatrix) {
      console.log('[Behavioral Matrix] Using extracted data from report');
      return;
    }

    // If prop has data, no need to fetch
    if (propBehavioralMatrix) {
      console.log('[Behavioral Matrix] Using prop data');
      return;
    }

    // Otherwise fetch
    const resultId = report?.resultId || report?.id || report?.result_id;
    if (resultId) {
      console.log('[Behavioral Matrix] Fetching for resultId:', resultId);
      fetchBehavioralMatrix(resultId);
    }
  }, [report, propBehavioralMatrix, extractedMatrix]);

  const fetchBehavioralMatrix = async (id) => {
    try {
      setLocalLoadingBehavioral(true);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        setLocalLoadingBehavioral(false);
        return;
      }

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        const matrix = data.behavioralMatrix || data.matrixData || data.matrix || data.data || data.result || null;
        if (matrix) {
          setLocalBehavioralMatrix(matrix);
        }
      }
    } catch (error) {
      console.error('[Behavioral Matrix] Error fetching:', error);
    } finally {
      setLocalLoadingBehavioral(false);
    }
  };

  const toggleBehavioral = () => {
    setShowBehavioral(!showBehavioral);
  };

  // ============================================================
  // FORMAT TIME HELPER
  // ============================================================
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ============================================================
  // SAFE STRING CONVERSION
  // ============================================================
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      if (value.recommendation) return String(value.recommendation);
      if (value.level) return String(value.level);
      if (value.label) return String(value.label);
      return JSON.stringify(value);
    }
    return String(value);
  };

  // ============================================================
  // CALCULATE AVERAGE FROM ITEMS
  // ============================================================
  const getCategoryAverage = (items) => {
    if (!items || items.length === 0) return 0;
    return Math.round(items.reduce((sum, cat) => sum + (Number(cat.percentage) || 0), 0) / items.length);
  };

  // ============================================================
  // SAFE NUMBER CONVERSION
  // ============================================================
  const toDisplayScore = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.round(numericValue) : fallback;
  };

  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  // ============================================================
  // EXTRACT DATA
  // ============================================================
  const reportData = report.report_data || report;

  const candidateInfo = reportData.candidateInfo || report.candidateInfo || {};
  const candidateName = reportData.candidateName || candidateInfo.fullName || report.candidateName || 'Candidate';
  const university = reportData.university || candidateInfo.university || report.university || 'N/A';
  const programme = reportData.programme || candidateInfo.programme || report.programme || 'N/A';
  const graduationYear = reportData.graduationYear || candidateInfo.graduationYear || report.graduationYear || 'N/A';
  const preferredDepartment = reportData.preferredDepartment || candidateInfo.preferredDepartment || report.preferredDepartment || 'Not Specified';

  const completed_at = reportData.completed_at || report.completed_at || null;
  const assessmentDate = candidateInfo.assessmentDate || (completed_at ? new Date(completed_at).toLocaleDateString() : 'N/A');

  // ============================================================
  // EXTRACT CATEGORY SCORES
  // ============================================================
  let categoryScores = [];

  if (Array.isArray(reportData.category_scores) && reportData.category_scores.length > 0) {
    categoryScores = reportData.category_scores;
  } else if (Array.isArray(report.category_scores) && report.category_scores.length > 0) {
    categoryScores = report.category_scores;
  } else if (Array.isArray(reportData.categoryBreakdown) && reportData.categoryBreakdown.length > 0) {
    categoryScores = reportData.categoryBreakdown;
  } else if (Array.isArray(report.categoryBreakdown) && report.categoryBreakdown.length > 0) {
    categoryScores = report.categoryBreakdown;
  } else if (Array.isArray(reportData.categoryScores) && reportData.categoryScores.length > 0) {
    categoryScores = reportData.categoryScores;
  } else if (Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
    categoryScores = report.categoryScores;
  }

  // ============================================================
  // SPLIT INTO WORKPLACE AND INTELLECTUAL
  // ============================================================
  const workplaceSubCategories = [];
  const intellectualSubCategories = [];

  const workplaceCategoryNames = [
    'Communication & Teamwork',
    'Ownership & Integrity',
    'Safety & Risk Awareness',
    'Technical Fundamentals',
    'Workplace Ethics',
    'Professional Conduct',
    'Work Ethic',
    'Workplace Readiness'
  ];

  const intellectualCategoryNames = [
    'Learning Agility',
    'Problem Solving & Troubleshooting',
    'Logical Reasoning',
    'Numerical Reasoning',
    'Measurement & Engineering Units',
    'Problem Solving',
    'Critical Thinking',
    'Analytical Skills',
    'Intellectual Capability'
  ];

  if (categoryScores && categoryScores.length > 0) {
    categoryScores.forEach(cat => {
      const categoryName = safeString(cat.category || cat.name || cat.key || 'Unknown');
      const trimmedName = categoryName.trim();
      const percentage = Number(cat.percentage ?? cat.score_percentage ?? 0);
      const normalizedCat = { ...cat, category: categoryName, percentage: Number.isFinite(percentage) ? percentage : 0 };

      const isWorkplace = workplaceCategoryNames.some(catName => 
        trimmedName === catName || trimmedName.toLowerCase() === catName.toLowerCase()
      );
      
      const isIntellectual = intellectualCategoryNames.some(catName => 
        trimmedName === catName || trimmedName.toLowerCase() === catName.toLowerCase()
      );

      const dimension = safeString(cat.dimension || '').toLowerCase();

      if (dimension === 'workplace' || isWorkplace) {
        workplaceSubCategories.push(normalizedCat);
      } else if (dimension === 'intellectual' || isIntellectual) {
        intellectualSubCategories.push(normalizedCat);
      } else {
        const lowerName = trimmedName.toLowerCase();
        const workplaceKeywords = [
          'safety', 'risk', 'technical', 'communication', 'teamwork',
          'ownership', 'integrity', 'workplace', 'ethics', 'professional',
          'conduct', 'collaboration', 'work ethic', 'attitude', 'readiness'
        ];
        
        const intellectualKeywords = [
          'learning agility', 'problem solving', 'troubleshooting',
          'logical reasoning', 'numerical reasoning',
          'measurement', 'engineering units', 'engineering',
          'critical', 'analytical', 'cognitive', 'intellectual'
        ];
        
        const hasWorkplaceKeyword = workplaceKeywords.some(keyword => lowerName.includes(keyword));
        const hasIntellectualKeyword = intellectualKeywords.some(keyword => lowerName.includes(keyword));
        
        if (hasWorkplaceKeyword && !hasIntellectualKeyword) {
          workplaceSubCategories.push(normalizedCat);
        } else if (hasIntellectualKeyword && !hasWorkplaceKeyword) {
          intellectualSubCategories.push(normalizedCat);
        } else if (lowerName.includes('work') || lowerName.includes('team') || lowerName.includes('communicat')) {
          workplaceSubCategories.push(normalizedCat);
        } else {
          intellectualSubCategories.push(normalizedCat);
        }
      }
    });
  }

  // ============================================================
  // CALCULATE AVERAGES FROM SUB-CATEGORIES
  // ============================================================
  const displayWorkplace = workplaceSubCategories.length > 0 
    ? Math.round(workplaceSubCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0) / workplaceSubCategories.length)
    : 0;

  const displayIntellectual = intellectualSubCategories.length > 0 
    ? Math.round(intellectualSubCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0) / intellectualSubCategories.length)
    : 0;

  const allCategories = [...workplaceSubCategories, ...intellectualSubCategories];
  const displayOverall = allCategories.length > 0 
    ? Math.round(allCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0) / allCategories.length)
    : 0;

  // ============================================================
  // RECOMMENDATION LOGIC
  // ============================================================
  let recommendationLevel = 'Not Recommended';

  if (displayWorkplace >= 90 && displayIntellectual >= 75 && displayOverall >= 80) {
    recommendationLevel = 'Highly Recommended';
  } else if (displayWorkplace >= 75 && displayIntellectual >= 70 && displayOverall >= 70) {
    recommendationLevel = 'Recommended';
  } else if (displayWorkplace >= 65 && displayIntellectual >= 65 && displayOverall >= 65) {
    recommendationLevel = 'Reserve Pool';
  } else if (displayWorkplace >= 50 || displayIntellectual >= 50 || displayOverall >= 50) {
    recommendationLevel = 'Consider for Development';
  } else {
    recommendationLevel = 'Not Recommended';
  }

  // ============================================================
  // RECOMMENDATION DETAILS
  // ============================================================
  const getRecommendationDetails = (level, workplace, intellectual, overall) => {
    const details = {
      'Highly Recommended': {
        label: 'Highly Recommended',
        color: '#2e7d32',
        bg: '#e8f5e9',
        icon: '★',
        narrative: `This candidate demonstrates exceptional workplace readiness (${workplace}%) and strong intellectual capability (${intellectual}%). With an overall score of ${overall}%, they are strongly recommended for immediate placement.`
      },
      'Recommended': {
        label: 'Recommended',
        color: '#1565c0',
        bg: '#e3f2fd',
        icon: '✓',
        narrative: `This candidate demonstrates strong workplace readiness (${workplace}%) and solid intellectual capability (${intellectual}%). With an overall score of ${overall}%, they are recommended for placement with standard supervision.`
      },
      'Reserve Pool': {
        label: 'Reserve Pool',
        color: '#f57c00',
        bg: '#fff3e0',
        icon: '●',
        narrative: `This candidate demonstrates adequate workplace readiness (${workplace}%) and intellectual capability (${intellectual}%). With an overall score of ${overall}%, they may be considered for the reserve pool.`
      },
      'Consider for Development': {
        label: 'Consider for Development',
        color: '#ea580c',
        bg: '#fff8e1',
        icon: '○',
        narrative: `This candidate shows potential with ${workplace}% workplace readiness and ${intellectual}% intellectual capability. The candidate could benefit from structured development programs.`
      },
      'Not Recommended': {
        label: 'Not Recommended',
        color: '#c62828',
        bg: '#ffebee',
        icon: '⚠',
        narrative: `This candidate does not currently meet the required thresholds for placement. Targeted development is recommended before reconsideration.`
      }
    };

    return details[level] || {
      label: 'Review Required',
      color: '#64748b',
      bg: '#f1f5f9',
      icon: '?',
      narrative: `Assessment results indicate that the candidate's profile should be reviewed by the hiring team.`
    };
  };

  const recommendationDetails = getRecommendationDetails(recommendationLevel, displayWorkplace, displayIntellectual, displayOverall);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const getCategoryComment = (percentage) => {
    if (percentage >= 90) return { text: 'Exceptional', color: '#2e7d32' };
    if (percentage >= 80) return { text: 'Strong', color: '#2e7d32' };
    if (percentage >= 70) return { text: 'Competent', color: '#1565c0' };
    if (percentage >= 60) return { text: 'Adequate', color: '#f57c00' };
    if (percentage >= 50) return { text: 'Development Required', color: '#ea580c' };
    return { text: 'Critical Gap', color: '#c62828' };
  };

  // Sort categories
  const sortedWorkplace = [...workplaceSubCategories].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  const sortedIntellectual = [...intellectualSubCategories].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // Top strengths and development areas
  const allSubCategories = [...workplaceSubCategories, ...intellectualSubCategories];
  const topStrengths = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 3);

  const developmentAreas = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0 && (c.percentage || 0) < 60)
    .sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

  // Suggested placements
  const getSuggestedPlacements = () => {
    if (report.suggestedPlacement && report.suggestedPlacement.length > 0) {
      return report.suggestedPlacement;
    }
    if (reportData.suggestedDepartments && reportData.suggestedDepartments.length > 0) {
      return reportData.suggestedDepartments;
    }
    
    const workplace = displayWorkplace;
    const intellectual = displayIntellectual;
    const overall = (workplace + intellectual) / 2;
    
    if (workplace >= 85 && intellectual >= 85) {
      return ['Operations & Production Management', 'Quality Assurance & Control', 'Supply Chain & Logistics', 'Technical Services'];
    } else if (workplace >= 75 && intellectual >= 75) {
      return ['Production Support', 'Maintenance & Engineering', 'Quality Control', 'Warehouse & Distribution'];
    } else if (workplace >= 65 && intellectual >= 65) {
      return ['General Operations', 'Administrative Support', 'Entry-Level Technical Roles'];
    } else if (overall >= 50) {
      return ['Structured Training Programs', 'Supervised Development Roles'];
    } else {
      return ['Foundation Training', 'Supervised Onboarding'];
    }
  };

  const suggestedPlacements = getSuggestedPlacements();

  // ============================================================
  // CHECK IF BEHAVIORAL DATA EXISTS
  // ============================================================
  const hasBehavioralData = behavioralMatrix !== null && behavioralMatrix !== undefined;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>National Service Recruitment Assessment</h1>
        <div style={styles.candidateInfo}>
          <div style={styles.candidateInfoGrid}>
            <div><span style={styles.infoLabel}>Candidate:</span><span style={styles.infoValue}>{candidateName}</span></div>
            <div><span style={styles.infoLabel}>University:</span><span style={styles.infoValue}>{university}</span></div>
            <div><span style={styles.infoLabel}>Programme:</span><span style={styles.infoValue}>{programme}</span></div>
            <div><span style={styles.infoLabel}>Graduation Year:</span><span style={styles.infoValue}>{graduationYear}</span></div>
            <div><span style={styles.infoLabel}>Preferred Department:</span><span style={styles.infoValue}>{preferredDepartment}</span></div>
            <div><span style={styles.infoLabel}>Assessment Date:</span><span style={styles.infoValue}>{assessmentDate}</span></div>
          </div>
        </div>
      </div>

      {/* Recommendation Banner */}
      <div style={{ ...styles.banner, background: recommendationDetails.bg, border: `3px solid ${recommendationDetails.color}` }}>
        <div style={styles.bannerContent}>
          <div style={{ ...styles.bannerIcon, color: recommendationDetails.color }}>
            {recommendationDetails.icon}
          </div>
          <div>
            <div style={{ ...styles.bannerTitle, color: recommendationDetails.color }}>
              {recommendationDetails.label}
            </div>
            <div style={styles.bannerNarrative}>{recommendationDetails.narrative}</div>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Workplace Readiness</div>
          <div style={styles.scoreValue}>{displayWorkplace}%</div>
          <div style={{ ...styles.scoreBand, color: displayWorkplace >= 70 ? '#2e7d32' : displayWorkplace >= 50 ? '#f57c00' : '#c62828' }}>
            {displayWorkplace >= 70 ? 'Ready' : displayWorkplace >= 50 ? 'Developing' : 'Needs Improvement'}
          </div>
          <div style={styles.subCategoryCount}>
            {sortedWorkplace.length} sub-categories assessed
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Intellectual Capability</div>
          <div style={styles.scoreValue}>{displayIntellectual}%</div>
          <div style={{ ...styles.scoreBand, color: displayIntellectual >= 70 ? '#2e7d32' : displayIntellectual >= 50 ? '#f57c00' : '#c62828' }}>
            {displayIntellectual >= 70 ? 'Ready' : displayIntellectual >= 50 ? 'Developing' : 'Development Required'}
          </div>
          <div style={styles.subCategoryCount}>
            {sortedIntellectual.length} sub-categories assessed
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{displayOverall}%</div>
          <div style={{ ...styles.scoreBand, color: displayOverall >= 70 ? '#2e7d32' : displayOverall >= 50 ? '#f57c00' : '#c62828' }}>
            {displayOverall >= 70 ? 'Recommended' : displayOverall >= 50 ? 'Conditional' : 'Not Recommended'}
          </div>
        </div>
      </div>

      {/* Workplace Readiness Sub-Categories */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Workplace Readiness - Sub-Category Breakdown</h2>
          <span style={styles.sectionScore}>{displayWorkplace}%</span>
        </div>
        {sortedWorkplace.length > 0 ? (
          <div style={styles.categoryGrid}>
            {sortedWorkplace.map((cat, index) => {
              const percentage = cat.percentage || 0;
              const comment = getCategoryComment(percentage);
              const categoryName = cat.category || cat.name || 'Unknown';
              const score = cat.score || cat.earned || 0;
              const maxScore = cat.maxScore || cat.max || 100;

              return (
                <div key={index} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryName}>{categoryName}</span>
                    <span style={{ ...styles.categoryScore, color: comment.color }}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <div style={styles.categoryBar}>
                    <div style={{ ...styles.categoryBarFill, width: Math.min(percentage, 100) + '%', background: comment.color }} />
                  </div>
                  <div style={styles.categoryDetail}>
                    {Math.round(score)} / {Math.round(maxScore)} points
                  </div>
                  <div style={{ ...styles.categoryComment, color: comment.color }}>
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No sub-category data available for Workplace Readiness.</p>
          </div>
        )}
      </div>

      {/* Intellectual Capability Sub-Categories */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Intellectual Capability - Sub-Category Breakdown</h2>
          <span style={styles.sectionScore}>{displayIntellectual}%</span>
        </div>
        {sortedIntellectual.length > 0 ? (
          <div style={styles.categoryGrid}>
            {sortedIntellectual.map((cat, index) => {
              const percentage = cat.percentage || 0;
              const comment = getCategoryComment(percentage);
              const categoryName = cat.category || cat.name || 'Unknown';
              const score = cat.score || cat.earned || 0;
              const maxScore = cat.maxScore || cat.max || 100;

              return (
                <div key={index} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryName}>{categoryName}</span>
                    <span style={{ ...styles.categoryScore, color: comment.color }}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <div style={styles.categoryBar}>
                    <div style={{ ...styles.categoryBarFill, width: Math.min(percentage, 100) + '%', background: comment.color }} />
                  </div>
                  <div style={styles.categoryDetail}>
                    {Math.round(score)} / {Math.round(maxScore)} points
                  </div>
                  <div style={{ ...styles.categoryComment, color: comment.color }}>
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No sub-category data available for Intellectual Capability.</p>
          </div>
        )}
      </div>

      {/* Top Strengths */}
      {topStrengths.length > 0 && topStrengths[0].percentage > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Top Strengths</h2>
          <div style={styles.strengthGrid}>
            {topStrengths.map((strength, index) => {
              const percentage = strength.percentage || 0;
              const categoryName = strength.category || strength.name || 'Unknown';
              return (
                <div key={index} style={styles.strengthCard}>
                  <div style={styles.strengthRank}>{index + 1}</div>
                  <div style={styles.cardContent}>
                    <div style={styles.cardName}>{categoryName}</div>
                    <div style={{ ...styles.cardScore, color: '#2e7d32' }}>{Math.round(percentage)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Development Areas */}
      {developmentAreas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Development Areas</h2>
          <div style={styles.strengthGrid}>
            {developmentAreas.map((area, index) => {
              const percentage = area.percentage || 0;
              const categoryName = area.category || area.name || 'Unknown';
              return (
                <div key={index} style={styles.strengthCard}>
                  <div style={styles.developmentRank}>{index + 1}</div>
                  <div style={styles.cardContent}>
                    <div style={styles.cardName}>{categoryName}</div>
                    <div style={{ ...styles.cardScore, color: '#c62828' }}>{Math.round(percentage)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Placement */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Suggested Placement</h2>
        <div style={styles.placementContainer}>
          <p style={styles.placementDescription}>
            Based on the candidate's performance profile, the following recommendations are suggested:
          </p>
          <div style={styles.placementGrid}>
            {suggestedPlacements.map((dept, index) => (
              <div key={index} style={styles.placementCard}>
                <span>•</span>
                <span>{dept}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          🟢 BEHAVIORAL MATRIX SECTION - FIXED
          ============================================================ */}
      <div style={styles.behavioralToggleContainer}>
        <button onClick={toggleBehavioral} style={styles.behavioralToggleButton}>
          {showBehavioral ? 'Hide Behavioral Matrix' : 'Show Behavioral Matrix'}
        </button>
      </div>

      {showBehavioral && (
        <div style={styles.behavioralSection}>
          <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>

          {loadingBehavioral ? (
            <div style={styles.loadingBehavioral}>
              <p>Loading behavioral data...</p>
            </div>
          ) : behavioralMatrix && hasBehavioralData ? (
            <>
              {/* 🟢 BEHAVIORAL STATS - Shows all data from proctoring */}
              <div style={styles.behavioralStats}>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Total Time</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.totalTime || '00:00:00'}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Avg Time per Question</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.avgTimePerQuestion || 0}s
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Answer Changes</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.answerChanges || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Tab Switches</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.tabSwitches || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Violations</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.violations || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.copyPasteAttempts || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Right-Click Attempts</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.rightClickAttempts || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Risk Level</span>
                  <span style={{
                    ...styles.riskBadge,
                    background: behavioralMatrix.riskLevel === 'High Risk' || behavioralMatrix.riskLevel === 'high' ? '#fee2e2' :
                               behavioralMatrix.riskLevel === 'Medium Risk' || behavioralMatrix.riskLevel === 'medium' ? '#fef3c7' : '#dcfce7',
                    color: behavioralMatrix.riskLevel === 'High Risk' || behavioralMatrix.riskLevel === 'high' ? '#991b1b' :
                           behavioralMatrix.riskLevel === 'Medium Risk' || behavioralMatrix.riskLevel === 'medium' ? '#92400e' : '#166534'
                  }}>
                    {typeof behavioralMatrix.riskLevel === 'string' 
                      ? behavioralMatrix.riskLevel.charAt(0).toUpperCase() + behavioralMatrix.riskLevel.slice(1)
                      : 'Low Risk'}
                  </span>
                </div>
              </div>

              {/* 🟢 RISK SUMMARY */}
              <div style={styles.riskSummary}>
                <p>
                  Behavioral flags: {behavioralMatrix.violations || 0} violation(s), 
                  {behavioralMatrix.tabSwitches || 0} tab switch(es), and 
                  {behavioralMatrix.answerChanges || 0} answer change(s).
                </p>
                {behavioralMatrix.riskFactors && behavioralMatrix.riskFactors.length > 0 && (
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Risk Factors: {behavioralMatrix.riskFactors.join(', ')}
                  </p>
                )}
              </div>

              {/* 🟢 BEHAVIORAL COMMENTARY */}
              <div style={styles.behavioralCommentary}>
                <h4 style={styles.commentaryTitle}>Assessment Integrity Analysis</h4>
                <div style={styles.commentaryMetrics}>
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Tab Switches:</span>
                    <span style={styles.commentaryText}>
                      {(behavioralMatrix.tabSwitches || 0) === 0
                        ? '✅ No tab switching detected. Candidate maintained focus on the assessment.'
                        : (behavioralMatrix.tabSwitches || 0) <= 3
                          ? `⚠️ Minimal tab switching (${behavioralMatrix.tabSwitches} switches). This may indicate occasional distraction.`
                          : `❌ High tab switching (${behavioralMatrix.tabSwitches} switches). This suggests significant distraction or potential external reference use.`
                      }
                    </span>
                  </div>
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Violations:</span>
                    <span style={styles.commentaryText}>
                      {(behavioralMatrix.violations || 0) === 0
                        ? '✅ No rule violations detected. Candidate followed all assessment guidelines.'
                        : (behavioralMatrix.violations || 0) <= 3
                          ? `⚠️ Minor violations (${behavioralMatrix.violations} violations). These may be accidental.`
                          : `❌ High violations (${behavioralMatrix.violations} violations). This indicates significant disregard for assessment rules.`
                      }
                    </span>
                  </div>
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Answer Changes:</span>
                    <span style={styles.commentaryText}>
                      {(behavioralMatrix.answerChanges || 0) === 0
                        ? '✅ No answer changes. Candidate was confident in their responses.'
                        : (behavioralMatrix.answerChanges || 0) <= 5
                          ? `⚠️ Few answer changes (${behavioralMatrix.answerChanges} changes). This is normal behavior.`
                          : `❌ Many answer changes (${behavioralMatrix.answerChanges} changes). This may indicate uncertainty or guessing.`
                      }
                    </span>
                  </div>
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Risk Level:</span>
                    <span style={styles.commentaryText}>
                      {behavioralMatrix.riskLevel === 'Low Risk' || behavioralMatrix.riskLevel === 'low'
                        ? '✅ Low risk assessment. The candidate\'s score can be considered genuine and reliable.'
                        : behavioralMatrix.riskLevel === 'Medium Risk' || behavioralMatrix.riskLevel === 'medium'
                          ? `⚠️ Medium risk assessment. The candidate's score should be reviewed with caution.`
                          : `❌ High risk assessment. The candidate's score may not accurately reflect their abilities.`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.noBehavioralData}>
              <p>No behavioral data is available for this assessment.</p>
              <p style={styles.noBehavioralSubtext}>
                Behavioral data helps validate the integrity of the assessment results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Assessment Statistics */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Assessment Statistics</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{displayWorkplace}%</div>
            <div style={styles.statLabel}>Workplace Readiness</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{displayIntellectual}%</div>
            <div style={styles.statLabel}>Intellectual Capability</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{displayOverall}%</div>
            <div style={styles.statLabel}>Overall Score</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{allSubCategories.length || 0}</div>
            <div style={styles.statLabel}>Sub-Categories Assessed</div>
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>
          Print Report
        </button>
      </div>
    </div>
  );
}
