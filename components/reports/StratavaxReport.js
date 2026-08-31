// components/reports/StratavaxReport.js - FIXED: Derive strengths/weaknesses from category scores

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import {
  getScorePhrase,
  getManufacturingPhrase,
  getScoreLevelKey,
  selectPhrase,
  replaceVariables,
  generalReportPhrases,
  scoreLevelPhrases
} from '../../utils/phraseLibrary';

// ============================================================
// FORMAT TIME HELPERS
// ============================================================
function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatAvgTime(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

// ============================================================
// EXTRACT BEHAVIORAL MATRIX
// ============================================================
function extractBehavioralMatrix(report) {
  if (!report) return null;

  const reportData = report.report_data || report || {};
  
  let proctoringData = reportData.proctoring || report.proctoring_data || null;
  
  if (!proctoringData) {
    return null;
  }

  const summary = proctoringData.summary || proctoringData;
  
  const totalSeconds = summary.duration || 0;
  const totalDurationFormatted = formatTime(totalSeconds);
  const totalQuestions = reportData.totalQuestions || report.totalQuestions || 10;
  const avgTimePerQuestion = totalSeconds > 0 ? formatAvgTime(totalSeconds / totalQuestions) : '0s';

  const matrix = {
    totalTime: totalDurationFormatted,
    avgTimePerQuestion: avgTimePerQuestion,
    answerChanges: summary.answerChanges || 0,
    tabSwitches: summary.tabSwitches || 0,
    violations: summary.totalViolations || 0,
    copyPasteAttempts: summary.copyPasteAttempts || 0,
    rightClickAttempts: summary.rightClickAttempts || 0,
    riskLevel: summary.riskLevel || 'Low Risk',
    riskScore: summary.riskScore || 0,
    externalUrlsVisited: summary.externalUrlsVisited || 0,
    riskFactors: proctoringData.riskFactors || [],
    flags: {
      violations: summary.totalViolations || 0,
      tabSwitches: summary.tabSwitches || 0,
      answerChanges: summary.answerChanges || 0
    },
    _raw: proctoringData
  };

  return matrix;
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = '') {
  return (value === null || value === undefined) ? fallback : String(value);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// ============================================================
// Universal Score Calculation
// ============================================================
function calculateScore(result) {
  let categoryScores = [];
  
  if (result.category_scores && Array.isArray(result.category_scores) && result.category_scores.length > 0) {
    categoryScores = result.category_scores;
  } else if (result.categoryScores && Array.isArray(result.categoryScores) && result.categoryScores.length > 0) {
    categoryScores = result.categoryScores;
  } else if (result.category_scores && typeof result.category_scores === 'object' && !Array.isArray(result.category_scores)) {
    categoryScores = Object.values(result.category_scores);
  }
  
  if (categoryScores.length === 0 && result.report_data) {
    try {
      let reportData = result.report_data;
      if (typeof reportData === 'string') {
        reportData = JSON.parse(reportData);
      }
      if (reportData.categoryScores && Array.isArray(reportData.categoryScores) && reportData.categoryScores.length > 0) {
        categoryScores = reportData.categoryScores;
      } else if (reportData.category_scores && Array.isArray(reportData.category_scores) && reportData.category_scores.length > 0) {
        categoryScores = reportData.category_scores;
      } else if (reportData.category_scores && typeof reportData.category_scores === 'object') {
        categoryScores = Object.values(reportData.category_scores);
      }
    } catch (e) {}
  }
  
  if (categoryScores.length > 0) {
    let totalEarned = 0;
    let totalMax = 0;
    let validPercentages = [];
    
    categoryScores.forEach(cat => {
      let score = safeNumber(cat.score || cat.earned || 0);
      let maxScore = safeNumber(cat.maxScore || cat.max || 0);
      let pct = safeNumber(cat.percentage || 0);
      
      if (score > 0 && maxScore > 0) {
        totalEarned += score;
        totalMax += maxScore;
      }
      
      if (pct > 0 && pct <= 100) {
        validPercentages.push(pct);
      }
    });
    
    if (totalEarned > 0 && totalMax > 0) {
      const calc = Math.round((totalEarned / totalMax) * 100);
      if (calc >= 0 && calc <= 100) {
        return calc;
      }
    }
    
    if (validPercentages.length > 0) {
      return Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length);
    }
  }
  
  if (result.percentage_score !== undefined && result.percentage_score !== null) {
    const val = safeNumber(result.percentage_score);
    if (val > 0 && val <= 100) {
      return val;
    }
  }
  
  if (result.total_score !== undefined && result.max_score !== undefined) {
    const total = safeNumber(result.total_score);
    const max = safeNumber(result.max_score);
    if (max > 0) {
      const calc = Math.round((total / max) * 100);
      if (calc >= 0 && calc <= 100) {
        return calc;
      }
    }
  }
  
  return 0;
}

function getLevelLabel(score) {
  const value = safeNumber(score, 0);
  if (value >= 85) return 'Exceptional';
  if (value >= 75) return 'Strong';
  if (value >= 65) return 'Adequate';
  if (value >= 55) return 'Developing';
  if (value >= 40) return 'Priority Development';
  return 'Critical Gap';
}

function getLevelColor(score) {
  const value = safeNumber(score, 0);
  if (value >= 85) return '#2e7d32';
  if (value >= 75) return '#1565c0';
  if (value >= 65) return '#f57c00';
  if (value >= 55) return '#ea580c';
  if (value >= 40) return '#c62828';
  return '#b71c1c';
}

function getGrade(score) {
  const value = safeNumber(score, 0);
  if (value >= 85) return 'A';
  if (value >= 75) return 'B';
  if (value >= 65) return 'C';
  if (value >= 55) return 'D';
  return 'F';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
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
  loadingContainer: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b'
  },
  header: {
    background: 'linear-gradient(135deg, #0b2a4e 0%, #1b4a7a 100%)',
    borderRadius: '12px',
    padding: '24px 30px',
    color: 'white',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 16px 0'
  },
  headerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px 20px',
    fontSize: '14px'
  },
  label: {
    opacity: 0.7,
    marginRight: '4px'
  },
  value: {
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eef2f7',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#0b2a4e'
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px'
  },
  statBadge: {
    display: 'inline-block',
    padding: '2px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '8px'
  },
  section: {
    marginBottom: '28px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#0b2a4e',
    margin: '0 0 12px 0'
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0'
  },
  summaryBox: {
    background: '#f8fafc',
    padding: '20px 24px',
    borderRadius: '12px',
    border: '1px solid #eef2f7'
  },
  summaryText: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#1a202c',
    margin: 0
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px'
  },
  categoryCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a202c'
  },
  categoryScore: {
    fontSize: '20px',
    fontWeight: '700'
  },
  categoryBar: {
    height: '6px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease'
  },
  categoryDetail: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '10px'
  },
  categoryAnalysis: {
    borderTop: '1px solid #eef2f7',
    paddingTop: '10px'
  },
  categorySummary: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155',
    margin: '0 0 6px 0'
  },
  categorySupervisor: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
    fontStyle: 'italic'
  },
  strengthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px'
  },
  strengthCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  strengthHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  strengthNumber: {
    width: '28px',
    height: '28px',
    background: '#2e7d32',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0
  },
  strengthName: {
    flex: 1,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a202c'
  },
  strengthScore: {
    fontSize: '18px',
    fontWeight: '700'
  },
  strengthDescription: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155',
    margin: '0 0 6px 0'
  },
  strengthNote: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
    fontStyle: 'italic'
  },
  developmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px'
  },
  developmentCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  developmentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  developmentNumber: {
    width: '28px',
    height: '28px',
    background: '#c62828',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0
  },
  developmentName: {
    flex: 1,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a202c'
  },
  developmentScore: {
    fontSize: '18px',
    fontWeight: '700'
  },
  developmentDescription: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155',
    margin: '0 0 6px 0'
  },
  developmentNote: {
    fontSize: '13px',
    color: '#475569',
    margin: 0,
    fontStyle: 'italic'
  },
  recommendationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px'
  },
  recommendationCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #eef2f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  recommendationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  recommendationNumber: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a202c'
  },
  recommendationPriority: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 12px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    color: '#475569'
  },
  recommendationText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155',
    margin: '0 0 6px 0'
  },
  recommendationAction: {
    fontSize: '13px',
    color: '#475569',
    margin: '0 0 4px 0'
  },
  recommendationImpact: {
    fontSize: '13px',
    color: '#475569',
    margin: 0
  },
  emptyState: {
    background: '#f8fafc',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #eef2f7'
  },
  emptyStateSub: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '8px'
  },
  actions: {
    textAlign: 'center',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #eef2f7'
  },
  printButton: {
    padding: '12px 32px',
    background: '#0b2a4e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
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
  recommendationBox: {
    marginTop: '12px',
    padding: '12px 16px',
    background: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d'
  },
  recommendationTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#92400e',
    margin: '0 0 6px 0'
  },
  recommendationList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#78350f'
  },
  cleanCommentary: {
    marginTop: '12px',
    padding: '12px 16px',
    background: '#dcfce7',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    fontSize: '13px',
    color: '#166534'
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
  loadingBehavioral: {
    textAlign: 'center',
    padding: '20px',
    color: '#64748b'
  }
};

// ============================================================
// COMPONENT
// ============================================================
export default function StratavaxReport({ 
  result, 
  candidate, 
  assessment, 
  onBack,
  behavioralMatrix: propBehavioralMatrix,
  loadingBehavioral: propLoadingBehavioral 
}) {
  const [localBehavioralMatrix, setLocalBehavioralMatrix] = useState(null);
  const [localLoadingBehavioral, setLocalLoadingBehavioral] = useState(false);
  const [showBehavioral, setShowBehavioral] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Extract report data
  const reportData = result?.report_data || result || {};
  
  // Extract behavioral matrix from report data
  const extractedMatrix = extractBehavioralMatrix(result || reportData);
  
  const behavioralMatrix = extractedMatrix ?? propBehavioralMatrix ?? localBehavioralMatrix ?? null;
  const loadingBehavioral = propLoadingBehavioral ?? localLoadingBehavioral ?? false;
  
  const hasBehavioralData = behavioralMatrix !== null && 
                            behavioralMatrix !== undefined && 
                            typeof behavioralMatrix === 'object' &&
                            Object.keys(behavioralMatrix).length > 0;

  const getBehavioralValue = (key, fallback = '0') => {
    if (!hasBehavioralData) return fallback;
    const value = behavioralMatrix[key];
    if (value === null || value === undefined) return fallback;
    return value;
  };

  useEffect(() => {
    if (extractedMatrix || propBehavioralMatrix) {
      return;
    }
    if (hasFetched) {
      return;
    }

    const resultId = result?.id || result?.result_id;
    if (resultId) {
      fetchBehavioralMatrix(resultId);
    }
  }, [result?.id, result?.result_id, extractedMatrix, propBehavioralMatrix, hasFetched]);

  const fetchBehavioralMatrix = async (id) => {
    try {
      setLocalLoadingBehavioral(true);
      console.log('[Stratavax] Fetching behavioral matrix for resultId:', id);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        console.log('[Stratavax] No token found');
        setLocalLoadingBehavioral(false);
        return;
      }

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      console.log('[Stratavax] Behavioral API Response:', data);

      if (data.success) {
        const matrix = data.behavioralMatrix || data.matrixData || data.data || data.result;
        if (matrix) {
          console.log('[Stratavax] Matrix data:', matrix);
          setLocalBehavioralMatrix(matrix);
        }
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    } finally {
      setLocalLoadingBehavioral(false);
      setHasFetched(true);
    }
  };

  const toggleBehavioral = () => {
    setShowBehavioral(!showBehavioral);
  };

  if (!result) {
    return (
      <div style={styles.loadingContainer}>
        <p>No report data available.</p>
        {onBack && (
          <button onClick={onBack} style={styles.backButton}>Back to Dashboard</button>
        )}
      </div>
    );
  }

  // ============================================================
  // 🟢 FIXED: Normalize category scores from multiple sources
  // ============================================================
  
  // 1. Extract raw category scores from various possible locations
  const rawCategoryScores = 
    result.categoryScores ??
    result.category_scores ??
    reportData.categoryScores ??
    reportData.category_scores ??
    [];
  
  // 2. Normalize to array format
  const categoryScoresArray = Array.isArray(rawCategoryScores)
    ? rawCategoryScores
    : rawCategoryScores && typeof rawCategoryScores === 'object'
      ? Object.entries(rawCategoryScores).map(([category, value]) => ({
          category,
          ...(value && typeof value === 'object' ? value : { percentage: value })
        }))
      : [];
  
  // 3. Helper to extract category name from various field names
  const getCategoryName = (item) => {
    if (!item) return '';
    const name = 
      item.category ??
      item.name ??
      item.categoryName ??
      item.category_name ??
      item.label ??
      item.title ??
      item.area ??
      item.dimension ??
      '';
    return String(name).trim();
  };
  
  // 4. Helper to extract percentage from various formats
  const getCategoryPercentage = (item) => {
    if (!item) return 0;
    
    // Check for explicit percentage
    const explicit = safeNumber(item.percentage ?? item.percentage_score, NaN);
    if (Number.isFinite(explicit)) {
      return Math.max(0, Math.min(100, explicit));
    }
    
    // Calculate from score/max
    const earned = safeNumber(item.score ?? item.earned, NaN);
    const maximum = safeNumber(
      item.maxScore ?? item.max_score ?? item.max ?? item.maxPossible ?? item.total,
      NaN
    );
    
    if (Number.isFinite(earned) && Number.isFinite(maximum) && maximum > 0) {
      return Math.max(0, Math.min(100, Math.round((earned / maximum) * 100)));
    }
    
    return 0;
  };
  
  // 5. Build normalized category scores with proper names and percentages
  const normalizedCategoryScores = categoryScoresArray
    .map((item) => ({
      ...item,
      category: getCategoryName(item),
      name: getCategoryName(item),
      percentage: getCategoryPercentage(item)
    }))
    .filter((item) => item.category && item.category !== '');
  
  // 6. 🟢 FIXED: Derive strengths from normalized categories (>= 75%)
  const strengths = normalizedCategoryScores
    .filter((item) => item.percentage >= 75)
    .sort((a, b) => b.percentage - a.percentage);
  
  // 7. 🟢 FIXED: Derive weaknesses from normalized categories (< 65%)
  const weaknesses = normalizedCategoryScores
    .filter((item) => item.percentage < 65)
    .sort((a, b) => a.percentage - b.percentage);
  
  // 8. Get recommendations (keep as-is, may need separate fix)
  const recommendations = safeArray(result.recommendations || []);
  
  // 9. Calculate overall score
  let overallScore = 0;
  
  if (normalizedCategoryScores.length > 0) {
    const validScores = normalizedCategoryScores
      .map(cat => cat.percentage)
      .filter(score => score > 0 && score <= 100);
    if (validScores.length > 0) {
      overallScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    }
  }
  
  if (overallScore === 0 && result.percentage_score) {
    overallScore = safeNumber(result.percentage_score);
  }
  
  if (overallScore === 0 && result.total_score !== undefined && result.max_score !== undefined) {
    const total = safeNumber(result.total_score);
    const max = safeNumber(result.max_score);
    if (max > 0) {
      const calc = Math.round((total / max) * 100);
      if (calc >= 0 && calc <= 100) {
        overallScore = calc;
      }
    }
  }
  
  const classification = safeText(result.classification || 'Standard Profile');
  const riskLevel = safeText(result.riskLevel || result.risk_level || 'Medium');
  
  const candidateName = safeText(candidate?.full_name || result.candidateName || 'Candidate');
  const candidateEmail = safeText(candidate?.email || result.candidateEmail || '');
  const assessmentName = safeText(assessment?.title || result.assessmentName || 'Assessment');
  
  const completedAt = result.completed_at || result.completedAt || null;
  const totalQuestions = safeNumber(result.total_questions || result.totalQuestions || 0);
  const answeredQuestions = safeNumber(result.answered_questions || result.answeredQuestions || 0);

  // ============================================================
  // Generate category analysis data
  // ============================================================
  const generateCategoryAnalysis = (category, score) => {
    const percentage = safeNumber(score, 0);
    const levelKey = getScoreLevelKey(percentage);
    const levelLabel = getLevelLabel(percentage);
    const grade = getGrade(percentage);
    
    const summaryPhrases = scoreLevelPhrases[levelKey]?.summary || [];
    const supervisorPhrases = scoreLevelPhrases[levelKey]?.supervisor || [];
    
    const summary = selectPhrase(
      summaryPhrases,
      `${category}-${percentage}-summary`
    ) || `${category} shows ${levelLabel.toLowerCase()} evidence of capability.`;
    
    const supervisorNote = selectPhrase(
      supervisorPhrases,
      `${category}-${percentage}-supervisor`
    ) || `Supervisor should provide appropriate guidance and feedback for this area.`;
    
    return {
      level: levelKey,
      label: levelLabel,
      grade: grade,
      summary: replaceVariables(summary, { 
        area: category,
        percentage: Math.round(percentage)
      }),
      supervisorNote: replaceVariables(supervisorNote, { 
        area: category,
        percentage: Math.round(percentage)
      })
    };
  };

  const categoryAnalysis = {};
  normalizedCategoryScores.forEach((cat) => {
    const name = cat.category;
    const score = cat.percentage;
    categoryAnalysis[name] = generateCategoryAnalysis(name, score);
  });

  // ============================================================
  // Generate executive summary
  // ============================================================
  const generateExecutiveSummary = () => {
    const strengthNames = strengths.slice(0, 3).map(s => s.category || s.name || '');
    const weaknessNames = weaknesses.slice(0, 2).map(w => w.category || w.name || '');
    
    let summary = '';
    
    if (overallScore >= 75) {
      summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating strong overall performance. `;
    } else if (overallScore >= 65) {
      summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating adequate overall performance with room for growth. `;
    } else if (overallScore >= 55) {
      summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating developing capability with clear opportunities for improvement. `;
    } else {
      summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating significant development opportunities. `;
    }
    
    if (strengthNames.length > 0 && strengthNames[0]) {
      const topStrengths = strengthNames.filter(n => n && n !== 'Unknown').join(', ');
      if (topStrengths) {
        summary += `Key strengths include ${topStrengths}. `;
      } else {
        summary += `Key strengths were identified across multiple categories. `;
      }
    } else {
      summary += `No dominant strength areas were identified above the current threshold. `;
    }
    
    if (weaknessNames.length > 0 && weaknessNames[0]) {
      const topWeaknesses = weaknessNames.filter(n => n && n !== 'Unknown').join(' and ');
      if (topWeaknesses) {
        summary += `Development opportunities include ${topWeaknesses}. `;
      } else {
        summary += `Development opportunities were identified in several areas. `;
      }
    } else {
      summary += `No major development areas were identified below the current threshold. `;
    }
    
    if (overallScore >= 75) {
      summary += `This profile suggests strong potential for professional growth and increased responsibility.`;
    } else if (overallScore >= 65) {
      summary += `With targeted development and practical application, the candidate can strengthen their overall capability.`;
    } else if (overallScore >= 55) {
      summary += `Structured development and focused practice will help build a stronger foundation for professional growth.`;
    } else {
      summary += `Immediate intervention and comprehensive development are recommended in the identified areas.`;
    }
    
    return summary;
  };

  // ============================================================
  // Render Behavioral Matrix Section
  // ============================================================
  const renderBehavioralSection = () => {
    if (loadingBehavioral) {
      return (
        <div style={styles.loadingBehavioral}>
          <p>Loading behavioral data...</p>
        </div>
      );
    }

    if (!hasBehavioralData) {
      return (
        <div style={styles.noBehavioralData}>
          <p>No behavioral data is available for this assessment.</p>
          <p style={styles.noBehavioralSubtext}>
            Behavioral data (tab switches, violations, answer changes, etc.)
            is only tracked for assessments completed after the behavioral tracking feature was implemented.
          </p>
        </div>
      );
    }

    const totalTime = getBehavioralValue('totalTime', '00:00:00');
    const avgTimePerQuestion = getBehavioralValue('avgTimePerQuestion', '0s');
    const answerChanges = getBehavioralValue('answerChanges', 0);
    const tabSwitches = getBehavioralValue('tabSwitches', 0);
    const violations = getBehavioralValue('violations', 0);
    const copyPasteAttempts = getBehavioralValue('copyPasteAttempts', 0);
    const rightClickAttempts = getBehavioralValue('rightClickAttempts', 0);
    const riskLevel = getBehavioralValue('riskLevel', 'Low Risk');
    const riskFactors = getBehavioralValue('riskFactors', []);

    return (
      <>
        <div style={styles.behavioralStats}>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Total Time</span>
            <span style={styles.behavioralValue}>{totalTime}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Avg Time per Question</span>
            <span style={styles.behavioralValue}>{avgTimePerQuestion}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Answer Changes</span>
            <span style={styles.behavioralValue}>{answerChanges}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Tab Switches</span>
            <span style={styles.behavioralValue}>{tabSwitches}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Violations</span>
            <span style={styles.behavioralValue}>{violations}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
            <span style={styles.behavioralValue}>{copyPasteAttempts}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Right-Click Attempts</span>
            <span style={styles.behavioralValue}>{rightClickAttempts}</span>
          </div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Risk Level</span>
            <span style={{
              ...styles.riskBadge,
              background: riskLevel === 'High Risk' || riskLevel === 'high' ? '#fee2e2' :
                        riskLevel === 'Medium Risk' || riskLevel === 'medium' ? '#fef3c7' : '#dcfce7',
              color: riskLevel === 'High Risk' || riskLevel === 'high' ? '#991b1b' :
                     riskLevel === 'Medium Risk' || riskLevel === 'medium' ? '#92400e' : '#166534'
            }}>
              {typeof riskLevel === 'string' 
                ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)
                : 'Low Risk'}
            </span>
          </div>
        </div>

        <div style={styles.riskSummary}>
          <p>
            Behavioral flags: {violations} violation(s), 
            {tabSwitches} tab switch(es), and 
            {answerChanges} answer change(s).
          </p>
          {Array.isArray(riskFactors) && riskFactors.length > 0 && (
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Risk Factors: {riskFactors.join(', ')}
            </p>
          )}
        </div>

        <div style={styles.behavioralCommentary}>
          <h4 style={styles.commentaryTitle}>Assessment Integrity Analysis</h4>

          <div style={styles.commentaryMetrics}>
            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Tab Switches:</span>
              <span style={styles.commentaryText}>
                {tabSwitches === 0
                  ? '✅ No tab switching detected. Candidate maintained focus on the assessment.'
                  : tabSwitches <= 3
                    ? `⚠️ Minimal tab switching (${tabSwitches} switches). This may indicate occasional distraction.`
                    : `❌ High tab switching (${tabSwitches} switches). This suggests significant distraction or potential external reference use.`
                }
              </span>
            </div>

            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Violations:</span>
              <span style={styles.commentaryText}>
                {violations === 0
                  ? '✅ No rule violations detected. Candidate followed all assessment guidelines.'
                  : violations <= 3
                    ? `⚠️ Minor violations (${violations} violations). These may be accidental.`
                    : `❌ High violations (${violations} violations). This indicates significant disregard for assessment rules.`
                }
              </span>
            </div>

            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Answer Changes:</span>
              <span style={styles.commentaryText}>
                {answerChanges === 0
                  ? '✅ No answer changes. Candidate was confident in their responses.'
                  : answerChanges <= 5
                    ? `⚠️ Few answer changes (${answerChanges} changes). This is normal behavior.`
                    : `❌ Many answer changes (${answerChanges} changes). This may indicate uncertainty or guessing.`
                }
              </span>
            </div>
          </div>

          {(violations > 0 || tabSwitches > 5) ? (
            <div style={styles.recommendationBox}>
              <h5 style={styles.recommendationTitle}>Recommendations</h5>
              <ul style={styles.recommendationList}>
                {tabSwitches > 20 && (
                  <li>Consider invalidating the assessment due to excessive tab switching.</li>
                )}
                {violations > 10 && (
                  <li>Immediate review required. Assessment validity is compromised.</li>
                )}
                {tabSwitches > 5 && tabSwitches <= 20 && (
                  <li>Conduct a follow-up interview to discuss potential external reference use.</li>
                )}
                {violations > 3 && violations <= 10 && (
                  <li>Review specific flagged questions and discuss with candidate.</li>
                )}
                {answerChanges > 5 && (
                  <li>Review questions where answers were changed for potential ambiguity.</li>
                )}
              </ul>
            </div>
          ) : (
            <div style={styles.cleanCommentary}>
              No concerning behavioral patterns detected. The candidate completed the assessment with integrity.
            </div>
          )}
        </div>
      </>
    );
  };

  // ============================================================
  // Render
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
        <h1 style={styles.title}>Assessment Report</h1>
        <div style={styles.headerGrid}>
          <div><span style={styles.label}>Candidate:</span> <span style={styles.value}>{candidateName}</span></div>
          {candidateEmail && <div><span style={styles.label}>Email:</span> <span style={styles.value}>{candidateEmail}</span></div>}
          <div><span style={styles.label}>Assessment:</span> <span style={styles.value}>{assessmentName}</span></div>
          <div><span style={styles.label}>Completed:</span> <span style={styles.value}>{formatDate(completedAt)}</span></div>
          <div><span style={styles.label}>Classification:</span> <span style={styles.value}>{classification}</span></div>
          <div><span style={styles.label}>Risk Level:</span> <span style={styles.value}>{riskLevel}</span></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{Math.round(overallScore)}%</div>
          <div style={styles.statLabel}>Overall Score</div>
          <div style={{ ...styles.statBadge, backgroundColor: getLevelColor(overallScore), color: '#fff' }}>
            {getLevelLabel(overallScore)}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{answeredQuestions} / {totalQuestions}</div>
          <div style={styles.statLabel}>Questions Answered</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{normalizedCategoryScores.length}</div>
          <div style={styles.statLabel}>Categories Assessed</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{strengths.length}</div>
          <div style={styles.statLabel}>Strengths Identified</div>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Executive Summary</h2>
        <div style={styles.summaryBox}>
          <p style={styles.summaryText}>{generateExecutiveSummary()}</p>
        </div>
      </div>

      {/* Category Scores */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Category Analysis</h2>
        <div style={styles.categoryGrid}>
          {normalizedCategoryScores.map((cat, index) => {
            const name = cat.category;
            const percentage = cat.percentage;
            const maxScore = safeNumber(cat.maxScore || cat.max || 100, 100);
            const earnedScore = safeNumber(cat.score || cat.earned || 0);
            const analysis = categoryAnalysis[name] || generateCategoryAnalysis(name, percentage);
            
            return (
              <div key={index} style={styles.categoryCard}>
                <div style={styles.categoryHeader}>
                  <span style={styles.categoryName}>{name}</span>
                  <span style={{ ...styles.categoryScore, color: getLevelColor(percentage) }}>
                    {Math.round(percentage)}%
                  </span>
                </div>
                
                <div style={styles.categoryBar}>
                  <div style={{ 
                    ...styles.categoryBarFill, 
                    width: Math.min(percentage, 100) + '%',
                    backgroundColor: getLevelColor(percentage)
                  }} />
                </div>
                
                <div style={styles.categoryDetail}>
                  Score: {Math.round(earnedScore)} / {Math.round(maxScore)} • Grade: {analysis.grade} • {analysis.label}
                </div>
                
                <div style={styles.categoryAnalysis}>
                  <p style={styles.categorySummary}>{analysis.summary}</p>
                  <p style={styles.categorySupervisor}><strong>Supervisor Note:</strong> {analysis.supervisorNote}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🟢 FIXED: Strengths Section - Now using derived strengths */}
      {strengths.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Strengths</h2>
          <p style={styles.sectionSubtitle}>
            The following categories are identified as strengths (score greater than or equal to 75%). These areas represent the candidate's strongest capabilities.
          </p>
          <div style={styles.strengthGrid}>
            {strengths.slice(0, 5).map((strength, index) => {
              const name = strength.category || strength.name || 'Unknown';
              const percentage = strength.percentage;
              const analysis = categoryAnalysis[name] || generateCategoryAnalysis(name, percentage);
              
              return (
                <div key={index} style={styles.strengthCard}>
                  <div style={styles.strengthHeader}>
                    <span style={styles.strengthNumber}>{index + 1}</span>
                    <span style={styles.strengthName}>{name}</span>
                    <span style={{ ...styles.strengthScore, color: getLevelColor(percentage) }}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <p style={styles.strengthDescription}>
                    {analysis.summary || `${name} shows strong evidence of capability.`}
                  </p>
                  <p style={styles.strengthNote}>
                    <strong>Implication:</strong> {analysis.supervisorNote || 'Continue to leverage this strength in appropriate assignments.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🟢 FIXED: Development Areas Section - Now using derived weaknesses */}
      {weaknesses.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Development Areas</h2>
          <p style={styles.sectionSubtitle}>
            The following categories are identified as areas for development (score below 65%). These areas represent opportunities for growth.
          </p>
          <div style={styles.developmentGrid}>
            {weaknesses.slice(0, 5).map((weakness, index) => {
              const name = weakness.category || weakness.name || 'Unknown';
              const percentage = weakness.percentage;
              const analysis = categoryAnalysis[name] || generateCategoryAnalysis(name, percentage);
              
              return (
                <div key={index} style={styles.developmentCard}>
                  <div style={styles.developmentHeader}>
                    <span style={styles.developmentNumber}>{index + 1}</span>
                    <span style={styles.developmentName}>{name}</span>
                    <span style={{ ...styles.developmentScore, color: getLevelColor(percentage) }}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <p style={styles.developmentDescription}>
                    {analysis.summary || `${name} shows opportunities for development.`}
                  </p>
                  <p style={styles.developmentNote}>
                    <strong>Development Focus:</strong> {analysis.supervisorNote || 'Consider providing additional training and support in this area.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recommendations</h2>
        {recommendations.length > 0 ? (
          <div style={styles.recommendationGrid}>
            {recommendations.map((rec, index) => (
              <div key={index} style={styles.recommendationCard}>
                <div style={styles.recommendationHeader}>
                  <span style={styles.recommendationNumber}>{index + 1}</span>
                  <span style={styles.recommendationPriority}>
                    {rec.priority || 'Medium'} Priority
                  </span>
                </div>
                <p style={styles.recommendationText}>{rec.recommendation || rec.text || rec.description || ''}</p>
                {rec.action && (
                  <p style={styles.recommendationAction}><strong>Action:</strong> {rec.action}</p>
                )}
                {rec.impact && (
                  <p style={styles.recommendationImpact}><strong>Impact:</strong> {rec.impact}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No specific recommendations are available based on the current assessment results.</p>
            <p style={styles.emptyStateSub}>Continued reinforcement, practical validation, and regular feedback are recommended to support the candidate's professional growth.</p>
          </div>
        )}
      </div>

      {/* Behavioral Matrix */}
      <div style={styles.behavioralToggleContainer}>
        <button onClick={toggleBehavioral} style={styles.behavioralToggleButton}>
          {showBehavioral ? 'Hide Behavioral Matrix' : 'Show Behavioral Matrix'}
        </button>
      </div>

      {showBehavioral && (
        <div style={styles.behavioralSection}>
          <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
          {renderBehavioralSection()}
        </div>
      )}

      {/* Print Button */}
      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>
          🖨️ Print Report
        </button>
      </div>
    </div>
  );
}
