// components/reports/StratavaxReport.js - COMPLETE FIXED
// FIX: Behavioral matrix assignment with proper nullish coalescing

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

  // Extract report data
  const reportData = result?.report_data || result || {};
  
  // Extract behavioral matrix from report data
  const extractedMatrix = extractBehavioralMatrix(result || reportData);
  
  // 🟢 FIX: Use nullish coalescing with proper precedence
  const behavioralMatrix = extractedMatrix ?? propBehavioralMatrix ?? localBehavioralMatrix ?? null;
    
  const loadingBehavioral = propLoadingBehavioral ?? localLoadingBehavioral ?? false;
  const hasBehavioralData = behavioralMatrix !== null && behavioralMatrix !== undefined;

  useEffect(() => {
    if (extractedMatrix) {
      console.log('[StratavaxReport] Using extracted matrix from report');
      return;
    }
    
    if (propBehavioralMatrix !== undefined && propBehavioralMatrix !== null) {
      console.log('[StratavaxReport] Using behavioralMatrix from props');
      return;
    }

    const resultId = result?.id || result?.result_id;
    if (resultId) {
      fetchBehavioralMatrix(resultId);
    }
  }, [result, propBehavioralMatrix, extractedMatrix]);

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
  // Extract data
  // ============================================================
  const categoryScores = safeArray(result.categoryScores || result.category_scores || []);
  const strengths = safeArray(result.strengths || []);
  const weaknesses = safeArray(result.weaknesses || result.developmentAreas || []);
  const recommendations = safeArray(result.recommendations || []);
  
  const overallScore = safeNumber(result.percentage_score || result.overallScore || 0);
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
  categoryScores.forEach(cat => {
    const name = cat.category || cat.name || 'Unknown';
    const score = safeNumber(cat.percentage || cat.score || 0);
    categoryAnalysis[name] = generateCategoryAnalysis(name, score);
  });

  // ============================================================
  // Generate executive summary
  // ============================================================
  const generateExecutiveSummary = () => {
    const strengthCount = strengths.length;
    const weaknessCount = weaknesses.length;
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
    
    if (strengthCount > 0) {
      const topStrengths = strengthNames.length > 0 ? strengthNames.join(', ') : '';
      summary += `Key strengths include ${topStrengths}. `;
    } else {
      summary += `No dominant strength areas were identified above the current threshold. `;
    }
    
    if (weaknessCount > 0) {
      const topWeaknesses = weaknessNames.length > 0 ? weaknessNames.join(' and ') : '';
      summary += `Development opportunities include ${topWeaknesses}. `;
    } else {
      summary += `No major development areas were identified below the current threshold. `;
    }
    
    return summary;
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
          <div style={styles.statValue}>{categoryScores.length}</div>
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
          {categoryScores.map((cat, index) => {
            const name = cat.category || cat.name || 'Unknown';
            const percentage = safeNumber(cat.percentage || cat.score || 0);
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

      {/* Strengths Section */}
      {strengths.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Strengths</h2>
          <p style={styles.sectionSubtitle}>
            The following categories are identified as strengths (score greater than or equal to 75%). These areas represent the candidate's strongest capabilities.
          </p>
          <div style={styles.strengthGrid}>
            {strengths.slice(0, 5).map((strength, index) => {
              const name = strength.category || strength.name || 'Unknown';
              const percentage = safeNumber(strength.percentage || 0);
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
                  <p style={styles.strengthDescription}>{analysis.summary}</p>
                  <p style={styles.strengthNote}><strong>Implication:</strong> {analysis.supervisorNote}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Development Areas */}
      {weaknesses.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Development Areas</h2>
          <p style={styles.sectionSubtitle}>
            The following categories are identified as areas for development (score below 65%). These areas represent opportunities for growth.
          </p>
          <div style={styles.developmentGrid}>
            {weaknesses.slice(0, 5).map((weakness, index) => {
              const name = weakness.category || weakness.name || 'Unknown';
              const percentage = safeNumber(weakness.percentage || 0);
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
                  <p style={styles.developmentDescription}>{analysis.summary}</p>
                  <p style={styles.developmentNote}><strong>Development Focus:</strong> {analysis.supervisorNote}</p>
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
                <p style={styles.recommendationText}>{rec.recommendation || rec.text || ''}</p>
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

      {/* ============================================================
          BEHAVIORAL MATRIX SECTION - FIXED
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
              {/* Behavioral Stats with Time Tracking */}
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
                    {behavioralMatrix.avgTimePerQuestion || '0s'}
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

              {/* Risk Summary */}
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

              {/* BEHAVIORAL COMMENTARY */}
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
                </div>

                {/* Recommendations based on behavioral flags */}
                {(behavioralMatrix.violations > 0 || behavioralMatrix.tabSwitches > 5) ? (
                  <div style={styles.recommendationBox}>
                    <h5 style={styles.recommendationTitle}>Recommendations</h5>
                    <ul style={styles.recommendationList}>
                      {behavioralMatrix.tabSwitches > 20 && (
                        <li>Consider invalidating the assessment due to excessive tab switching.</li>
                      )}
                      {behavioralMatrix.violations > 10 && (
                        <li>Immediate review required. Assessment validity is compromised.</li>
                      )}
                      {behavioralMatrix.tabSwitches > 5 && behavioralMatrix.tabSwitches <= 20 && (
                        <li>Conduct a follow-up interview to discuss potential external reference use.</li>
                      )}
                      {behavioralMatrix.violations > 3 && behavioralMatrix.violations <= 10 && (
                        <li>Review specific flagged questions and discuss with candidate.</li>
                      )}
                      {behavioralMatrix.answerChanges > 5 && (
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
          ) : (
            <div style={styles.noBehavioralData}>
              <p>No behavioral data is available for this assessment.</p>
              <p style={styles.noBehavioralSubtext}>
                Behavioral data (tab switches, violations, answer changes, etc.)
                is only tracked for assessments completed after the behavioral tracking feature was implemented.
              </p>
            </div>
          )}
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
