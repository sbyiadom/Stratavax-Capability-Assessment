// components/reports/StratavaxReport.js
// FIXED: Derive strengths/weaknesses from category scores
// Phase 6: Added CompetencyReport section (reads result.competencySummary)
// Phase 6.5: Replaced top stat cards with supervisor-relevant metrics.
// Phase 7E (2026-09-30): overallScore now reads result.percentage_score
//   verbatim instead of averaging category percentages.
// Phase 7J (2026-10-02): Section cards now read from utils/sectionNarratives.
//   Each section in category_scores is rendered as a self-contained card with:
//     • Section name and score
//     • What this section measures (from sectionDefinitions)
//     • What the score suggests (from sectionSummaries, banded)
//     • Supervisor implication (from sectionImplications, banded)
//   Content is picked deterministically per candidate via pickNarrative.
// Phase 7K (2026-10-02): Header adjustments + commentary threshold fixes.
//   • Classification line hidden for cognitive assessments (it was meaningless).
//   • Risk Level label becomes "Proctoring Risk" for cognitive.
//   • Behavioural commentary thresholds recalibrated — 11 right-click attempts
//     no longer triggers "significant disregard for assessment rules".
//     Commentary now scales at >10 / >30 violations and >5 / >20 tab switches,
//     matching the risk-level thresholds used by the submit endpoint.

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import CompetencyReport from './CompetencyReport';
import {
  getBandKey,
  pickNarrative,
  getSectionDefinition,
} from '../../utils/sectionNarratives';
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
  if (!proctoringData) return null;
  const summary = proctoringData.summary || proctoringData;
  const totalSeconds = summary.duration || 0;
  const totalDurationFormatted = formatTime(totalSeconds);
  const totalQuestions = reportData.totalQuestions || report.totalQuestions || 10;
  const avgTimePerQuestion = totalSeconds > 0 ? formatAvgTime(totalSeconds / totalQuestions) : '0s';
  return {
    totalTime: totalDurationFormatted,
    avgTimePerQuestion,
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
  if (value >= 65) return 'Capable';
  if (value >= 55) return 'Developing';
  if (value >= 40) return 'At Risk';
  return 'High Risk';
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
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return 'N/A'; }
}

// ============================================================
// TYPE DETECTION
// ============================================================
function detectReportType(result, assessment) {
  const typeCode =
    assessment?.assessment_type?.code ||
    assessment?.assessmentType?.code ||
    assessment?.type_code ||
    result?.assessment_type_code ||
    result?.assessmentTypeCode ||
    null;

  if (typeCode) {
    if (typeCode === 'cognitive') return 'cognitive';
    if (typeCode === 'performance') return 'performance';
    if (typeCode === 'behavioral' || typeCode === 'cultural') return 'behavioral';
    return 'behavioral';
  }

  const title = String(assessment?.title || result?.assessmentName || '').toLowerCase();
  if (title.includes('cognitive')) return 'cognitive';
  if (title.includes('performance')) return 'performance';
  if (title.includes('behavioral') || title.includes('cultural')) return 'behavioral';

  return 'behavioral';
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  loadingContainer: { textAlign: 'center', padding: '40px', color: '#64748b' },
  header: { background: 'linear-gradient(135deg, #0b2a4e 0%, #1b4a7a 100%)', borderRadius: '12px', padding: '24px 30px', color: 'white', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', margin: '0 0 16px 0' },
  headerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 20px', fontSize: '14px' },
  label: { opacity: 0.7, marginRight: '4px' },
  value: { fontWeight: '500' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eef2f7', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  statValue: { fontSize: '26px', fontWeight: '800', color: '#0b2a4e', lineHeight: 1.1 },
  statValueSmall: { fontSize: '20px', fontWeight: '700', color: '#0b2a4e', lineHeight: 1.15 },
  statLabel: { fontSize: '12px', color: '#64748b', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 },
  statSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  statBadge: { display: 'inline-block', padding: '2px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', marginTop: '8px' },
  section: { marginBottom: '28px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#0b2a4e', margin: '0 0 12px 0' },
  sectionSubtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' },
  summaryBox: { background: '#f8fafc', padding: '20px 24px', borderRadius: '12px', border: '1px solid #eef2f7' },
  summaryText: { fontSize: '15px', lineHeight: '1.7', color: '#1a202c', margin: 0 },
  disclaimer: { background: '#eff6ff', padding: '14px 20px', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af', lineHeight: 1.6, marginTop: '12px' },

  // Section cards
  sectionCardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '18px' },
  sectionCard: { background: 'white', borderRadius: '12px', border: '1px solid #eef2f7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' },
  sectionCardHeader: { padding: '18px 22px 14px 22px', borderBottom: '1px solid #f1f5f9' },
  sectionCardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' },
  sectionCardName: { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 },
  sectionCardScore: { fontSize: '24px', fontWeight: '800', lineHeight: 1 },
  sectionCardBand: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' },
  sectionCardBar: { height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '12px' },
  sectionCardBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  sectionCardMeta: { fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontFamily: 'monospace' },
  sectionCardBody: { padding: '16px 22px 20px 22px' },
  sectionCardLabel: { fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '6px', marginTop: 0, display: 'block' },
  sectionCardDefinition: { fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 14px 0', fontStyle: 'italic' },
  sectionCardSummary: { fontSize: '14px', color: '#1e293b', lineHeight: 1.65, margin: '0 0 14px 0' },
  sectionCardImplication: { fontSize: '13px', color: '#334155', lineHeight: 1.6, margin: 0, padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #6366f1' },

  strengthGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' },
  strengthCard: { background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #eef2f7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  strengthHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  strengthNumber: { width: '28px', height: '28px', background: '#2e7d32', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 },
  strengthName: { flex: 1, fontSize: '15px', fontWeight: '600', color: '#1a202c' },
  strengthScore: { fontSize: '18px', fontWeight: '700' },
  strengthDescription: { fontSize: '14px', lineHeight: '1.6', color: '#334155', margin: '0 0 6px 0' },
  strengthNote: { fontSize: '13px', color: '#475569', margin: 0, fontStyle: 'italic' },

  developmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' },
  developmentCard: { background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #eef2f7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  developmentHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  developmentNumber: { width: '28px', height: '28px', background: '#c62828', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 },
  developmentName: { flex: 1, fontSize: '15px', fontWeight: '600', color: '#1a202c' },
  developmentScore: { fontSize: '18px', fontWeight: '700' },
  developmentDescription: { fontSize: '14px', lineHeight: '1.6', color: '#334155', margin: '0 0 6px 0' },
  developmentNote: { fontSize: '13px', color: '#475569', margin: 0, fontStyle: 'italic' },

  recommendationGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' },
  recommendationCard: { background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #eef2f7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  recommendationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  recommendationNumber: { fontSize: '14px', fontWeight: '600', color: '#1a202c' },
  recommendationPriority: { fontSize: '12px', fontWeight: '600', padding: '2px 12px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#475569' },
  recommendationText: { fontSize: '14px', lineHeight: '1.6', color: '#334155', margin: '0 0 6px 0' },
  recommendationAction: { fontSize: '13px', color: '#475569', margin: '0 0 4px 0' },
  recommendationImpact: { fontSize: '13px', color: '#475569', margin: 0 },
  emptyState: { background: '#f8fafc', padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #eef2f7' },
  emptyStateSub: { fontSize: '14px', color: '#64748b', marginTop: '8px' },
  actions: { textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eef2f7' },
  printButton: { padding: '12px 32px', background: '#0b2a4e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  behavioralToggleContainer: { marginTop: '24px', textAlign: 'center' },
  behavioralToggleButton: { padding: '10px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  behavioralSection: { marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' },
  behavioralTitle: { fontSize: '18px', fontWeight: '600', color: '#0a1929', margin: '0 0 16px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' },
  behavioralStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' },
  behavioralStat: { background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' },
  behavioralLabel: { display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' },
  behavioralValue: { fontSize: '18px', fontWeight: '700', color: '#0a1929' },
  riskBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  riskSummary: { padding: '12px 16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', fontSize: '14px', color: '#475569' },
  behavioralCommentary: { marginTop: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' },
  commentaryTitle: { fontSize: '15px', fontWeight: '600', color: '#0a1929', margin: '0 0 12px 0', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' },
  commentaryMetrics: { display: 'flex', flexDirection: 'column', gap: '8px' },
  commentaryItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f8fafc' },
  commentaryLabel: { fontWeight: '600', color: '#475569', minWidth: '120px', fontSize: '13px', flexShrink: 0 },
  commentaryText: { fontSize: '13px', color: '#1a202c', lineHeight: '1.5' },
  recommendationBox: { marginTop: '12px', padding: '12px 16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' },
  recommendationTitle2: { fontSize: '13px', fontWeight: '600', color: '#92400e', margin: '0 0 6px 0' },
  recommendationList: { margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#78350f' },
  cleanCommentary: { marginTop: '12px', padding: '12px 16px', background: '#dcfce7', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' },
  noBehavioralData: { textAlign: 'center', padding: '30px 20px', color: '#64748b' },
  noBehavioralSubtext: { fontSize: '13px', color: '#94a3b8', marginTop: '8px' },
  loadingBehavioral: { textAlign: 'center', padding: '20px', color: '#64748b' },

  performanceSplit: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
  performanceBlock: { background: 'white', padding: '20px 24px', borderRadius: '12px', border: '1px solid #eef2f7', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  performanceBlockTitle: { fontSize: '15px', fontWeight: '700', color: '#0b2a4e', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.04em' },
  performanceBlockSub: { fontSize: '13px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.5 },
  performanceBlockValue: { fontSize: '32px', fontWeight: '800', color: '#0b2a4e', lineHeight: 1.1, marginBottom: '4px' },
  performanceBlockCaption: { fontSize: '13px', color: '#64748b', marginBottom: '10px' },
  performanceBlockBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' },
  performanceBlockBarFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
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

  const reportData = result?.report_data || result || {};
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
    if (extractedMatrix || propBehavioralMatrix) return;
    if (hasFetched) return;
    const resultId = result?.id || result?.result_id;
    if (resultId) fetchBehavioralMatrix(resultId);
  }, [result?.id, result?.result_id, extractedMatrix, propBehavioralMatrix, hasFetched]);

  const fetchBehavioralMatrix = async (id) => {
    try {
      setLocalLoadingBehavioral(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { setLocalLoadingBehavioral(false); return; }
      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const matrix = data.behavioralMatrix || data.matrixData || data.data || data.result;
        if (matrix) setLocalBehavioralMatrix(matrix);
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    } finally {
      setLocalLoadingBehavioral(false);
      setHasFetched(true);
    }
  };

  const toggleBehavioral = () => setShowBehavioral(!showBehavioral);

  if (!result) {
    return (
      <div style={styles.loadingContainer}>
        <p>No report data available.</p>
        {onBack && <button onClick={onBack} style={styles.backButton}>Back to Dashboard</button>}
      </div>
    );
  }

  // ---------- Category scores normalization ----------
  const rawCategoryScores = result.categoryScores ?? result.category_scores ?? reportData.categoryScores ?? reportData.category_scores ?? [];
  const categoryScoresArray = Array.isArray(rawCategoryScores)
    ? rawCategoryScores
    : rawCategoryScores && typeof rawCategoryScores === 'object'
      ? Object.entries(rawCategoryScores).map(([category, value]) => ({
          category,
          ...(value && typeof value === 'object' ? value : { percentage: value })
        }))
      : [];

  const getCategoryName = (item) => {
    if (!item) return '';
    return String(
      item.category ?? item.name ?? item.categoryName ?? item.category_name ??
      item.label ?? item.title ?? item.area ?? item.dimension ?? ''
    ).trim();
  };

  const getCategoryPercentage = (item) => {
    if (!item) return 0;
    const explicit = safeNumber(item.percentage ?? item.percentage_score, NaN);
    if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, explicit));
    const earned = safeNumber(item.score ?? item.earned, NaN);
    const maximum = safeNumber(item.maxScore ?? item.max_score ?? item.max ?? item.maxPossible ?? item.total, NaN);
    if (Number.isFinite(earned) && Number.isFinite(maximum) && maximum > 0) {
      return Math.max(0, Math.min(100, Math.round((earned / maximum) * 100)));
    }
    return 0;
  };

  const normalizedCategoryScores = categoryScoresArray
    .map((item) => ({
      ...item,
      category: getCategoryName(item),
      name: getCategoryName(item),
      percentage: getCategoryPercentage(item)
    }))
    .filter((item) => item.category && item.category !== '');

  const sortedSections = [...normalizedCategoryScores].sort((a, b) => {
    const aName = a.category || '';
    const bName = b.category || '';
    return aName.localeCompare(bName);
  });

  const strengths = normalizedCategoryScores.filter(item => item.percentage >= 75).sort((a, b) => b.percentage - a.percentage);
  const weaknesses = normalizedCategoryScores.filter(item => item.percentage < 65).sort((a, b) => a.percentage - b.percentage);
  const recommendations = safeArray(result.recommendations || []);

  const overallScore = safeNumber(result.percentage_score, 0);

  const classification = safeText(result.classification || 'Standard Profile');
  const riskLevel = safeText(result.riskLevel || result.risk_level || 'Medium');
  const candidateName = safeText(candidate?.full_name || result.candidateName || 'Candidate');
  const candidateEmail = safeText(candidate?.email || result.candidateEmail || '');
  const assessmentName = safeText(assessment?.title || result.assessmentName || 'Assessment');
  const completedAt = result.completed_at || result.completedAt || null;

  const reportType = detectReportType(result, assessment);
  const isCognitive = reportType === 'cognitive';
  const isPerformance = reportType === 'performance';

  const narrativeSeed = `${candidate?.id || candidate?.user_id || result?.user_id || 'candidate'}:${result?.id || result?.result_id || 'result'}`;

  const getSectionNarratives = (sectionName, percentage) => {
    const band = getBandKey(percentage);
    const summary = pickNarrative(sectionName, band, narrativeSeed, 'summary');
    const implication = pickNarrative(sectionName, band, narrativeSeed, 'implication');
    const definition = getSectionDefinition(sectionName);
    return { band, summary, implication, definition };
  };

  const generateExecutiveSummary = () => {
    const strengthNames = strengths.slice(0, 3).map(s => s.category || s.name || '');
    const weaknessNames = weaknesses.slice(0, 2).map(w => w.category || w.name || '');
    let summary = '';

    if (isCognitive) {
      const sorted = [...normalizedCategoryScores].sort((a, b) => b.percentage - a.percentage);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      summary = `${candidateName} completed the ${assessmentName} with an overall score of ${Math.round(overallScore)}%. `;
      if (top) summary += `Highest section: ${top.category} at ${Math.round(top.percentage)}%. `;
      if (bottom && bottom !== top) summary += `Lowest section: ${bottom.category} at ${Math.round(bottom.percentage)}%. `;
      summary += `This assessment measures reasoning capacity across verbal, numerical, abstract, and logical domains. Results reflect relative performance at a point in time.`;
      return summary;
    }

    if (overallScore >= 75) summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating strong overall performance. `;
    else if (overallScore >= 65) summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating adequate overall performance with room for growth. `;
    else if (overallScore >= 55) summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating developing capability with clear opportunities for improvement. `;
    else summary = `${candidateName} completed the ${assessmentName} with a score of ${Math.round(overallScore)}%, indicating significant development opportunities. `;

    if (strengthNames.length > 0 && strengthNames[0]) {
      const topStrengths = strengthNames.filter(n => n && n !== 'Unknown').join(', ');
      if (topStrengths) summary += `Key strengths include ${topStrengths}. `;
    } else summary += `No dominant strength areas were identified above the current threshold. `;

    if (weaknessNames.length > 0 && weaknessNames[0]) {
      const topWeaknesses = weaknessNames.filter(n => n && n !== 'Unknown').join(' and ');
      if (topWeaknesses) summary += `Development opportunities include ${topWeaknesses}. `;
    } else summary += `No major development areas were identified below the current threshold. `;

    if (overallScore >= 75) summary += `This profile suggests strong potential for professional growth and increased responsibility.`;
    else if (overallScore >= 65) summary += `With targeted development and practical application, the candidate can strengthen their overall capability.`;
    else if (overallScore >= 55) summary += `Structured development and focused practice will help build a stronger foundation for professional growth.`;
    else summary += `Immediate intervention and comprehensive development are recommended in the identified areas.`;

    return summary;
  };

  // ---------- Behavioral matrix render (with fixed thresholds) ----------
  const renderBehavioralSection = () => {
    if (loadingBehavioral) return <div style={styles.loadingBehavioral}><p>Loading behavioral data...</p></div>;
    if (!hasBehavioralData) {
      return (
        <div style={styles.noBehavioralData}>
          <p>No behavioral data is available for this assessment.</p>
          <p style={styles.noBehavioralSubtext}>Behavioral data (tab switches, violations, answer changes, etc.) is only tracked for assessments completed after the behavioral tracking feature was implemented.</p>
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

    const normalizedRisk = String(riskLevel || '').toLowerCase();
    const isHighRisk = normalizedRisk === 'high' || normalizedRisk === 'high risk';
    const isMediumRisk = normalizedRisk === 'medium' || normalizedRisk === 'medium risk';

    return (
      <>
        <div style={styles.behavioralStats}>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Total Time</span><span style={styles.behavioralValue}>{totalTime}</span></div>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Avg Time per Question</span><span style={styles.behavioralValue}>{avgTimePerQuestion}</span></div>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Answer Changes</span><span style={styles.behavioralValue}>{answerChanges}</span></div>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Tab Switches</span><span style={styles.behavioralValue}>{tabSwitches}</span></div>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Violations</span><span style={styles.behavioralValue}>{violations}</span></div>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Copy/Paste Attempts</span><span style={styles.behavioralValue}>{copyPasteAttempts}</span></div>
          <div style={styles.behavioralStat}><span style={styles.behavioralLabel}>Right-Click Attempts</span><span style={styles.behavioralValue}>{rightClickAttempts}</span></div>
          <div style={styles.behavioralStat}>
            <span style={styles.behavioralLabel}>Risk Level</span>
            <span style={{
              ...styles.riskBadge,
              background: isHighRisk ? '#fee2e2' : isMediumRisk ? '#fef3c7' : '#dcfce7',
              color: isHighRisk ? '#991b1b' : isMediumRisk ? '#92400e' : '#166534'
            }}>
              {typeof riskLevel === 'string' ? riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) : 'Low Risk'}
            </span>
          </div>
        </div>

        <div style={styles.riskSummary}>
          <p>
            Behavioural flags: {violations} violation(s), {tabSwitches} tab switch(es), {answerChanges} answer change(s),
            {copyPasteAttempts} copy/paste attempt(s), {rightClickAttempts} right-click attempt(s).
          </p>
          {Array.isArray(riskFactors) && riskFactors.length > 0 && (
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Risk Factors: {riskFactors.join(', ')}</p>
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
                  : tabSwitches <= 5
                    ? `⚠️ Minimal tab switching (${tabSwitches}). Consistent with brief distraction; unlikely to affect validity.`
                    : tabSwitches <= 20
                      ? `⚠️ Moderate tab switching (${tabSwitches}). Worth noting, but not automatically concerning.`
                      : `❌ High tab switching (${tabSwitches}). This may indicate repeated external reference.`}
              </span>
            </div>
            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Violations:</span>
              <span style={styles.commentaryText}>
                {violations === 0
                  ? '✅ No rule violations detected. Candidate followed all assessment guidelines.'
                  : violations <= 10
                    ? `⚠️ Minor violations (${violations}). Typically corresponds to right-click attempts or accidental keystrokes.`
                    : violations <= 30
                      ? `⚠️ Moderate violations (${violations}). Review recommended before treating the score as authoritative.`
                      : `❌ High violations (${violations}). Assessment validity should be reviewed.`}
              </span>
            </div>
            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Answer Changes:</span>
              <span style={styles.commentaryText}>
                {answerChanges === 0
                  ? '✅ No answer changes. Candidate was confident in their responses.'
                  : answerChanges <= 5
                    ? `⚠️ Few answer changes (${answerChanges}). Normal deliberation behaviour.`
                    : answerChanges <= 15
                      ? `⚠️ Several answer changes (${answerChanges}). May indicate uncertainty on those questions.`
                      : `❌ Many answer changes (${answerChanges}). May indicate guessing or low confidence.`}
              </span>
            </div>
            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Copy/Paste:</span>
              <span style={styles.commentaryText}>
                {copyPasteAttempts === 0
                  ? '✅ No copy/paste attempts detected.'
                  : copyPasteAttempts <= 3
                    ? `⚠️ Few copy/paste attempts (${copyPasteAttempts}). Likely accidental.`
                    : `❌ Repeated copy/paste attempts (${copyPasteAttempts}). Review recommended.`}
              </span>
            </div>
            <div style={styles.commentaryItem}>
              <span style={styles.commentaryLabel}>Right-Click:</span>
              <span style={styles.commentaryText}>
                {rightClickAttempts === 0
                  ? '✅ No right-click attempts detected.'
                  : rightClickAttempts <= 10
                    ? `⚠️ Some right-click attempts (${rightClickAttempts}). Typically habitual rather than intentional.`
                    : `❌ Frequent right-click attempts (${rightClickAttempts}). Habitual or intentional — worth noting.`}
              </span>
            </div>
          </div>

          {(violations > 10 || tabSwitches > 20 || answerChanges > 15 || copyPasteAttempts > 3) ? (
            <div style={styles.recommendationBox}>
              <h5 style={styles.recommendationTitle2}>Recommendations</h5>
              <ul style={styles.recommendationList}>
                {tabSwitches > 50 && <li>Consider invalidating the assessment due to excessive tab switching.</li>}
                {violations > 30 && <li>Assessment validity should be reviewed before relying on the score.</li>}
                {tabSwitches > 20 && tabSwitches <= 50 && <li>Follow-up interview recommended to discuss potential external reference use.</li>}
                {violations > 10 && violations <= 30 && <li>Review specific flagged behaviours with the candidate before treating the score as authoritative.</li>}
                {answerChanges > 15 && <li>Review questions with multiple changes for potential ambiguity.</li>}
                {copyPasteAttempts > 3 && <li>Review copy/paste events — may indicate attempted external sourcing.</li>}
              </ul>
            </div>
          ) : (
            <div style={styles.cleanCommentary}>
              No concerning behavioural patterns detected at the threshold required for review. The candidate completed the assessment within expected behavioural norms.
            </div>
          )}
        </div>
      </>
    );
  };

  // ---------- Performance split ----------
  const renderPerformanceSplit = () => {
    const poSections = [
      'Achievement Orientation', 'Initiative', 'Persistence', 'Self-Management',
      'Goal Setting', 'Quality Standards', 'Learning Orientation', 'Professional Reliability'
    ];
    const baSections = [
      'Productivity & Efficiency', 'Quality & Effectiveness', 'Goal Achievement',
      'Employee Engagement', 'Financial & Operational Performance'
    ];

    const poScores = normalizedCategoryScores.filter(c => poSections.includes(c.category));
    const baScores = normalizedCategoryScores.filter(c => baSections.includes(c.category));

    const poEarned = poScores.reduce((s, c) => s + safeNumber(c.score ?? c.earned ?? 0), 0);
    const poMax = poScores.reduce((s, c) => s + safeNumber(c.maxScore ?? c.max ?? 0), 0);
    const poPct = poMax > 0 ? Math.round((poEarned / poMax) * 100) : 0;

    const baEarned = baScores.reduce((s, c) => s + safeNumber(c.score ?? c.earned ?? 0), 0);
    const baMax = baScores.reduce((s, c) => s + safeNumber(c.maxScore ?? c.max ?? 0), 0);
    const baPct = baMax > 0 ? Math.round((baEarned / baMax) * 100) : 0;

    return (
      <div style={styles.performanceSplit}>
        <div style={styles.performanceBlock}>
          <div style={styles.performanceBlockTitle}>Performance Orientation</div>
          <p style={styles.performanceBlockSub}>
            Behavioural disposition — how the candidate approaches goals, work, and self-management. Scenario-based.
          </p>
          <div style={{ ...styles.performanceBlockValue, color: getLevelColor(poPct) }}>{poPct}%</div>
          <div style={styles.performanceBlockCaption}>
            {poScores.length} sections · {poMax > 0 ? `${Math.round(poEarned)} / ${Math.round(poMax)} points` : 'no data'}
          </div>
          <div style={styles.performanceBlockBar}>
            <div style={{ ...styles.performanceBlockBarFill, width: poPct + '%', backgroundColor: getLevelColor(poPct) }} />
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{getLevelLabel(poPct)}</div>
        </div>

        <div style={styles.performanceBlock}>
          <div style={styles.performanceBlockTitle}>Business Acumen</div>
          <p style={styles.performanceBlockSub}>
            Operational knowledge — understanding of business metrics, quality, engagement, and financial performance.
          </p>
          <div style={{ ...styles.performanceBlockValue, color: getLevelColor(baPct) }}>{baPct}%</div>
          <div style={styles.performanceBlockCaption}>
            {baScores.length} sections · {baMax > 0 ? `${Math.round(baEarned)} / ${Math.round(baMax)} points` : 'no data'}
          </div>
          <div style={styles.performanceBlockBar}>
            <div style={{ ...styles.performanceBlockBarFill, width: baPct + '%', backgroundColor: getLevelColor(baPct) }} />
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{getLevelLabel(baPct)}</div>
        </div>
      </div>
    );
  };

  // ---------- Section card renderer ----------
  const renderSectionCard = (section, index) => {
    const name = section.category;
    const percentage = section.percentage;
    const maxScore = safeNumber(section.maxScore || section.max || 0);
    const earnedScore = safeNumber(section.score || section.earned || 0);
    const { summary, implication, definition } = getSectionNarratives(name, percentage);
    const bandLabel = getLevelLabel(percentage);
    const color = getLevelColor(percentage);

    return (
      <div key={index} style={styles.sectionCard}>
        <div style={styles.sectionCardHeader}>
          <div style={styles.sectionCardTopRow}>
            <h3 style={styles.sectionCardName}>{name}</h3>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...styles.sectionCardScore, color }}>{Math.round(percentage)}%</div>
              <div style={{ ...styles.sectionCardBand, color }}>{bandLabel}</div>
            </div>
          </div>
          <div style={styles.sectionCardBar}>
            <div style={{ ...styles.sectionCardBarFill, width: Math.min(percentage, 100) + '%', backgroundColor: color }} />
          </div>
          {maxScore > 0 && (
            <div style={styles.sectionCardMeta}>
              {Math.round(earnedScore)} of {Math.round(maxScore)} points
            </div>
          )}
        </div>
        <div style={styles.sectionCardBody}>
          <span style={styles.sectionCardLabel}>What this measures</span>
          <p style={styles.sectionCardDefinition}>{definition}</p>

          <span style={styles.sectionCardLabel}>What the score suggests</span>
          <p style={styles.sectionCardSummary}>{summary}</p>

          <span style={styles.sectionCardLabel}>Supervisor implication</span>
          <p style={styles.sectionCardImplication}>{implication}</p>
        </div>
      </div>
    );
  };

  // ---------- Render ----------
  return (
    <div style={styles.container}>
      {onBack && <button onClick={onBack} style={styles.backButton}>← Back to Dashboard</button>}

      <div style={styles.header}>
        <h1 style={styles.title}>Assessment Report</h1>
        <div style={styles.headerGrid}>
          <div><span style={styles.label}>Candidate:</span> <span style={styles.value}>{candidateName}</span></div>
          {candidateEmail && <div><span style={styles.label}>Email:</span> <span style={styles.value}>{candidateEmail}</span></div>}
          <div><span style={styles.label}>Assessment:</span> <span style={styles.value}>{assessmentName}</span></div>
          <div><span style={styles.label}>Completed:</span> <span style={styles.value}>{formatDate(completedAt)}</span></div>
          {!isCognitive && (
            <div><span style={styles.label}>Classification:</span> <span style={styles.value}>{classification}</span></div>
          )}
          <div><span style={styles.label}>{isCognitive ? 'Proctoring Risk:' : 'Risk Level:'}</span> <span style={styles.value}>{riskLevel}</span></div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{Math.round(overallScore)}%</div>
          <div style={styles.statLabel}>Overall Score</div>
          <div style={{ ...styles.statBadge, backgroundColor: getLevelColor(overallScore), color: '#fff' }}>
            {getLevelLabel(overallScore)}
          </div>
        </div>

        {isCognitive && (
          <>
            <div style={styles.statCard}>
              <div style={styles.statValueSmall}>{normalizedCategoryScores.length}</div>
              <div style={styles.statLabel}>Sections Assessed</div>
              <div style={styles.statSub}>Across cognitive factors</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValueSmall, color: '#0b2a4e' }}>
                {normalizedCategoryScores.length > 0
                  ? `${Math.round(Math.max(...normalizedCategoryScores.map(c => c.percentage)))}%`
                  : '—'}
              </div>
              <div style={styles.statLabel}>Highest Section</div>
              <div style={styles.statSub}>
                {normalizedCategoryScores.length > 0
                  ? normalizedCategoryScores.reduce((a, b) => a.percentage > b.percentage ? a : b).category
                  : '—'}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValueSmall, color: '#0b2a4e' }}>
                {normalizedCategoryScores.length > 0
                  ? `${Math.round(Math.min(...normalizedCategoryScores.map(c => c.percentage)))}%`
                  : '—'}
              </div>
              <div style={styles.statLabel}>Lowest Section</div>
              <div style={styles.statSub}>
                {normalizedCategoryScores.length > 0
                  ? normalizedCategoryScores.reduce((a, b) => a.percentage < b.percentage ? a : b).category
                  : '—'}
              </div>
            </div>
          </>
        )}

        {!isCognitive && !isPerformance && (
          <>
            <div style={styles.statCard}>
              <div style={styles.statValueSmall}>{normalizedCategoryScores.length}</div>
              <div style={styles.statLabel}>Sections Assessed</div>
              <div style={styles.statSub}>Across competencies</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValueSmall, color: '#2e7d32' }}>
                {strengths.length}
              </div>
              <div style={styles.statLabel}>Strengths</div>
              <div style={styles.statSub}>Sections at 75%+</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValueSmall, color: '#c62828' }}>
                {weaknesses.length}
              </div>
              <div style={styles.statLabel}>Development Areas</div>
              <div style={styles.statSub}>Sections below 65%</div>
            </div>
          </>
        )}

        {isPerformance && (
          <>
            <div style={styles.statCard}>
              <div style={styles.statValueSmall}>13</div>
              <div style={styles.statLabel}>Sections</div>
              <div style={styles.statSub}>8 orientation + 5 acumen</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValueSmall}>Mixed</div>
              <div style={styles.statLabel}>Scoring</div>
              <div style={styles.statSub}>Forced-choice + single-select</div>
            </div>
          </>
        )}
      </div>

      {isPerformance && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Performance Profile</h2>
          <p style={styles.sectionSubtitle}>
            This assessment combines two distinct measures. The scores below are separated so they can be interpreted independently.
          </p>
          {renderPerformanceSplit()}
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Executive Summary</h2>
        <div style={styles.summaryBox}>
          <p style={styles.summaryText}>{generateExecutiveSummary()}</p>
        </div>
        {isCognitive && (
          <div style={styles.disclaimer}>
            <strong>About this report:</strong> Cognitive ability assessment measures reasoning capacity at a point in time. It is a directional signal, not a diagnostic. Scores should be used alongside other evidence of capability (performance, portfolio, interviews), not in isolation.
          </div>
        )}
      </div>

      {sortedSections.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Section Analysis</h2>
          <p style={styles.sectionSubtitle}>
            Each section below shows what it measures, what the score suggests, and what the supervisor should consider.
          </p>
          <div style={styles.sectionCardGrid}>
            {sortedSections.map((section, index) => renderSectionCard(section, index))}
          </div>
        </div>
      )}

      {!isCognitive && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recommendations</h2>
          {recommendations.length > 0 ? (
            <div style={styles.recommendationGrid}>
              {recommendations.map((rec, index) => (
                <div key={index} style={styles.recommendationCard}>
                  <div style={styles.recommendationHeader}>
                    <span style={styles.recommendationNumber}>{index + 1}</span>
                    <span style={styles.recommendationPriority}>{rec.priority || 'Medium'} Priority</span>
                  </div>
                  <p style={styles.recommendationText}>{rec.recommendation || rec.text || rec.description || ''}</p>
                  {rec.action && <p style={styles.recommendationAction}><strong>Action:</strong> {rec.action}</p>}
                  {rec.impact && <p style={styles.recommendationImpact}><strong>Impact:</strong> {rec.impact}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>Section-level implications above serve as the recommendations for this report.</p>
              <p style={styles.emptyStateSub}>Continued reinforcement, practical validation, and regular feedback are recommended.</p>
            </div>
          )}
        </div>
      )}

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

      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>🖨️ Print Report</button>
      </div>
    </div>
  );
}
