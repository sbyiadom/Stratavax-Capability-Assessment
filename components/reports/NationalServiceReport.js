// components/reports/NationalServiceReport.js - FULLY CORRECTED WITH BEHAVIORAL COMMENTARY

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
  // ============================================================
  // BEHAVIORAL COMMENTARY STYLES - ADDED BACK
  // ============================================================
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
    borderBottom: '2px solid #e2e8f0'
  },
  commentaryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #f8fafc'
  },
  commentaryLabel: {
    fontWeight: '600',
    color: '#475569',
    minWidth: '130px',
    fontSize: '13px',
    flexShrink: 0
  },
  commentaryText: {
    fontSize: '13px',
    color: '#1a202c',
    lineHeight: '1.5'
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
  riskSummaryBox: {
    marginTop: '12px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  riskSummaryText: {
    fontSize: '13px',
    color: '#1a202c',
    margin: '0 0 4px 0'
  },
  riskDetailText: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px 0'
  },
  riskActionText: {
    fontSize: '13px',
    color: '#1a202c',
    margin: 0
  },
  flaggedQuestions: {
    marginTop: '12px'
  },
  flaggedTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0a1929',
    margin: '0 0 8px 0'
  },
  flaggedList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  flaggedItem: {
    padding: '6px 12px',
    background: '#f8fafc',
    borderRadius: '4px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
    color: '#475569'
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
export default function NationalServiceReport({
  report,
  onBack,
  behavioralMatrix: propBehavioralMatrix,
  loadingBehavioral: propLoadingBehavioral
}) {
  const [localBehavioralMatrix, setLocalBehavioralMatrix] = useState(null);
  const [localLoadingBehavioral, setLocalLoadingBehavioral] = useState(false);
  const [showBehavioral, setShowBehavioral] = useState(false);

  const behavioralMatrix = propBehavioralMatrix !== undefined ? propBehavioralMatrix : localBehavioralMatrix;
  const loadingBehavioral = propLoadingBehavioral !== undefined ? propLoadingBehavioral : localLoadingBehavioral;

  useEffect(() => {
    if (propBehavioralMatrix !== undefined) return;

    const resultId = report?.resultId || report?.id || report?.result_id;
    if (resultId) {
      fetchBehavioralMatrix(resultId);
    }
  }, [report, propBehavioralMatrix]);

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
        const matrix = data.behavioralMatrix || data.matrixData || data.data || data.result;
        if (matrix) {
          setLocalBehavioralMatrix(matrix);
        }
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
    } finally {
      setLocalLoadingBehavioral(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

  const toDisplayScore = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.round(numericValue) : fallback;
  };

  const getCategoryAverage = (items) => {
    if (!items || items.length === 0) return 0;
    return Math.round(items.reduce((sum, cat) => sum + (Number(cat.percentage) || 0), 0) / items.length);
  };

  const hasBehavioralData = behavioralMatrix !== null && behavioralMatrix !== undefined;

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

  const workplaceKeywords = [
    'safety', 'risk', 'hazard', 'technical', 'fundamentals',
    'problem', 'troubleshooting', 'communication', 'teamwork',
    'collaboration', 'ownership', 'integrity', 'accountability',
    'professional', 'conduct', 'work_ethic', 'ethics', 'workplace',
    'readiness', 'learning', 'agility', 'adaptability'
  ];

  const intellectualKeywords = [
    'numerical', 'math', 'logical', 'logic', 'reasoning',
    'measurement', 'engineering', 'units', 'spatial', 'analysis',
    'critical', 'analytical', 'decision', 'intellectual', 'cognitive',
    'capability'
  ];

  if (categoryScores && categoryScores.length > 0) {
    categoryScores.forEach(cat => {
      const categoryName = safeString(cat.category || cat.name || cat.key || 'Unknown');
      const lowerName = categoryName.toLowerCase().replace(/\s+/g, '_');
      const percentage = Number(cat.percentage ?? cat.score_percentage ?? 0);
      const dimension = safeString(cat.dimension || '').toLowerCase();
      const normalizedCat = { ...cat, category: categoryName, percentage: Number.isFinite(percentage) ? percentage : 0 };

      if (dimension === 'workplace') {
        workplaceSubCategories.push(normalizedCat);
      } else if (dimension === 'intellectual') {
        intellectualSubCategories.push(normalizedCat);
      } else if (workplaceKeywords.some(keyword => lowerName.includes(keyword))) {
        workplaceSubCategories.push(normalizedCat);
      } else if (intellectualKeywords.some(keyword => lowerName.includes(keyword))) {
        intellectualSubCategories.push(normalizedCat);
      } else {
        intellectualSubCategories.push(normalizedCat);
      }
    });
  }

  // ============================================================
  // DISPLAY SCORES
  // ============================================================
  const allCategories = [...workplaceSubCategories, ...intellectualSubCategories];

  const fallbackWorkplace = getCategoryAverage(workplaceSubCategories);
  const fallbackIntellectual = getCategoryAverage(intellectualSubCategories);
  const fallbackOverall = getCategoryAverage(allCategories);

  const displayWorkplace = toDisplayScore(
    reportData?.dimensions?.workplaceReadiness ??
    reportData?.scores?.workplace ??
    reportData?.workplaceReadiness ??
    reportData?.workplace_readiness ??
    report?.workplaceReadiness ??
    report?.workplace_readiness,
    fallbackWorkplace
  );

  const displayIntellectual = toDisplayScore(
    reportData?.dimensions?.intellectualCapability ??
    reportData?.scores?.intellectual ??
    reportData?.intellectualCapability ??
    reportData?.intellectual_capability ??
    report?.intellectualCapability ??
    report?.intellectual_capability,
    fallbackIntellectual
  );

  const displayOverall = Math.round((displayWorkplace + displayIntellectual) / 2);

  console.log('[Report] Display Workplace:', displayWorkplace);
  console.log('[Report] Display Intellectual:', displayIntellectual);
  console.log('[Report] Display Overall:', displayOverall);

  // ============================================================
  // RECOMMENDATION LOGIC
  // ============================================================
  let recommendationLevel = 'Not Recommended';

  if (displayOverall >= 85) {
    recommendationLevel = 'Highly Recommended';
  } else if (displayOverall >= 70) {
    recommendationLevel = 'Recommended';
  } else if (displayOverall >= 50) {
    recommendationLevel = 'Reserve Pool';
  } else {
    recommendationLevel = 'Not Recommended';
  }

  if (reportData.recommendation && reportData.recommendation !== 'N/A') {
    recommendationLevel = safeString(reportData.recommendation);
  } else if (report.recommendation && report.recommendation !== 'N/A') {
    recommendationLevel = safeString(report.recommendation);
  }

  const getRecommendationDetails = (level, workplace, intellectual, overall) => {
    const details = {
      'Highly Recommended': {
        label: 'Highly Recommended',
        color: '#2e7d32',
        bg: '#e8f5e9',
        icon: '★',
        narrative: `This candidate demonstrates strong workplace readiness (${workplace}%) and intellectual capability (${intellectual}%). With an overall score of ${overall}%, the candidate is strongly recommended.`
      },
      'Recommended': {
        label: 'Recommended',
        color: '#1565c0',
        bg: '#e3f2fd',
        icon: '✓',
        narrative: `This candidate demonstrates acceptable workplace readiness (${workplace}%) and intellectual capability (${intellectual}%). With an overall score of ${overall}%, the candidate is recommended for placement.`
      },
      'Reserve Pool': {
        label: 'Reserve Pool',
        color: '#f57c00',
        bg: '#fff3e0',
        icon: '●',
        narrative: `This candidate may be considered for reserve placement. Workplace readiness is ${workplace}%, intellectual capability is ${intellectual}%, and overall score is ${overall}%.`
      },
      'Not Recommended': {
        label: 'Not Recommended',
        color: '#c62828',
        bg: '#ffebee',
        icon: '!',
        narrative: `This candidate does not currently meet the required threshold for placement. Workplace readiness is ${workplace}%, intellectual capability is ${intellectual}%, and overall score is ${overall}%.`
      }
    };

    return details[level] || {
      label: 'Review Required',
      color: '#64748b',
      bg: '#f1f5f9',
      icon: '?',
      narrative: 'Assessment results require management review.'
    };
  };

  const recommendationDetails = getRecommendationDetails(recommendationLevel, displayWorkplace, displayIntellectual, displayOverall);

  const getCategoryComment = (percentage) => {
    if (percentage >= 90) return { text: 'Exceptional', color: '#2e7d32' };
    if (percentage >= 80) return { text: 'Strong', color: '#2e7d32' };
    if (percentage >= 70) return { text: 'Competent', color: '#1565c0' };
    if (percentage >= 60) return { text: 'Adequate', color: '#f57c00' };
    if (percentage >= 50) return { text: 'Development Required', color: '#ea580c' };
    return { text: 'Critical Gap', color: '#c62828' };
  };

  const sortedWorkplace = [...workplaceSubCategories].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  const sortedIntellectual = [...intellectualSubCategories].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const allSubCategories = [...workplaceSubCategories, ...intellectualSubCategories];
  const topStrengths = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 3);

  const developmentAreas = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0 && (c.percentage || 0) < 60)
    .sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

  const getSuggestedPlacements = () => {
    if (Array.isArray(report.suggestedPlacement) && report.suggestedPlacement.length > 0) {
      return report.suggestedPlacement;
    }
    if (Array.isArray(reportData.suggestedDepartments) && reportData.suggestedDepartments.length > 0) {
      return reportData.suggestedDepartments;
    }

    if (displayOverall >= 85) {
      return ['Operations & Production Management', 'Quality Assurance & Control', 'Supply Chain & Logistics', 'Technical Services'];
    }
    if (displayOverall >= 70) {
      return ['Production Support', 'Maintenance & Engineering', 'Quality Control', 'Warehouse & Distribution'];
    }
    if (displayOverall >= 50) {
      return ['Structured Training Programs', 'Supervised Development Roles'];
    }
    return ['Foundation Training', 'Supervised Onboarding'];
  };

  const suggestedPlacements = getSuggestedPlacements();

  const renderCategoryGrid = (items) => {
    if (!items || items.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p>No sub-category data available.</p>
        </div>
      );
    }

    return (
      <div style={styles.categoryGrid}>
        {items.map((cat, index) => {
          const percentage = Number(cat.percentage) || 0;
          const comment = getCategoryComment(percentage);
          const categoryName = cat.category || cat.name || 'Unknown';
          const score = cat.score ?? cat.earned ?? 0;
          const maxScore = cat.maxScore ?? cat.max ?? 100;

          return (
            <div key={index} style={styles.categoryCard}>
              <div style={styles.categoryHeader}>
                <span style={styles.categoryName}>{categoryName}</span>
                <span style={{ ...styles.categoryScore, color: comment.color }}>{Math.round(percentage)}%</span>
              </div>
              <div style={styles.categoryBar}>
                <div style={{ ...styles.categoryBarFill, width: Math.min(percentage, 100) + '%', background: comment.color }} />
              </div>
              <div style={styles.categoryDetail}>{Math.round(score)} / {Math.round(maxScore)} points</div>
              <div style={{ ...styles.categoryComment, color: comment.color }}>{comment.text}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>Back to Dashboard</button>
      )}

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

      <div style={{ ...styles.banner, background: recommendationDetails.bg, border: `3px solid ${recommendationDetails.color}` }}>
        <div style={styles.bannerContent}>
          <div style={{ ...styles.bannerIcon, color: recommendationDetails.color }}>{recommendationDetails.icon}</div>
          <div>
            <div style={{ ...styles.bannerTitle, color: recommendationDetails.color }}>{recommendationDetails.label}</div>
            <div style={styles.bannerNarrative}>{recommendationDetails.narrative}</div>
          </div>
        </div>
      </div>

      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Workplace Readiness</div>
          <div style={styles.scoreValue}>{displayWorkplace}%</div>
          <div style={{ ...styles.scoreBand, color: displayWorkplace >= 70 ? '#2e7d32' : displayWorkplace >= 50 ? '#f57c00' : '#c62828' }}>
            {displayWorkplace >= 70 ? 'Ready' : displayWorkplace >= 50 ? 'Developing' : 'Needs Improvement'}
          </div>
          <div style={styles.subCategoryCount}>{sortedWorkplace.length} sub-categories assessed</div>
        </div>

        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Intellectual Capability</div>
          <div style={styles.scoreValue}>{displayIntellectual}%</div>
          <div style={{ ...styles.scoreBand, color: displayIntellectual >= 70 ? '#2e7d32' : displayIntellectual >= 50 ? '#f57c00' : '#c62828' }}>
            {displayIntellectual >= 70 ? 'Ready' : displayIntellectual >= 50 ? 'Developing' : 'Development Required'}
          </div>
          <div style={styles.subCategoryCount}>{sortedIntellectual.length} sub-categories assessed</div>
        </div>

        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{displayOverall}%</div>
          <div style={{ ...styles.scoreBand, color: displayOverall >= 70 ? '#2e7d32' : displayOverall >= 50 ? '#f57c00' : '#c62828' }}>
            {displayOverall >= 70 ? 'Recommended' : displayOverall >= 50 ? 'Conditional' : 'Not Recommended'}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Workplace Readiness - Sub-Category Breakdown</h2>
          <span style={styles.sectionScore}>{displayWorkplace}%</span>
        </div>
        {renderCategoryGrid(sortedWorkplace)}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Intellectual Capability - Sub-Category Breakdown</h2>
          <span style={styles.sectionScore}>{displayIntellectual}%</span>
        </div>
        {renderCategoryGrid(sortedIntellectual)}
      </div>

      {topStrengths.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Top Strengths</h2>
          <div style={styles.strengthGrid}>
            {topStrengths.map((strength, index) => (
              <div key={index} style={styles.strengthCard}>
                <div style={styles.strengthRank}>{index + 1}</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardName}>{strength.category || strength.name || 'Unknown'}</div>
                  <div style={{ ...styles.cardScore, color: '#2e7d32' }}>{Math.round(strength.percentage || 0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {developmentAreas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Development Areas</h2>
          <div style={styles.strengthGrid}>
            {developmentAreas.map((area, index) => (
              <div key={index} style={styles.strengthCard}>
                <div style={styles.developmentRank}>{index + 1}</div>
                <div style={styles.cardContent}>
                  <div style={styles.cardName}>{area.category || area.name || 'Unknown'}</div>
                  <div style={{ ...styles.cardScore, color: '#c62828' }}>{Math.round(area.percentage || 0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Suggested Placement</h2>
        <div style={styles.placementContainer}>
          <p style={styles.placementDescription}>Based on the candidate's performance profile, the following recommendations are suggested:</p>
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
          BEHAVIORAL MATRIX SECTION - WITH FULL COMMENTARY
          ============================================================ */}
      <div style={styles.behavioralToggleContainer}>
        <button onClick={() => setShowBehavioral(!showBehavioral)} style={styles.behavioralToggleButton}>
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
              {/* Behavioral Stats - Figures */}
              <div style={styles.behavioralStats}>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Total Time</span>
                  <span style={styles.behavioralValue}>
                    {formatTime(behavioralMatrix.timing?.totalTimeSeconds || 0)}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Avg Time / Question</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.timing?.averageTimePerQuestion || 0}s
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Answer Changes</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.answerChanges || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Tab Switches</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.tabSwitches || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Violations</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.violations || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Copy/Paste Attempts</span>
                  <span style={styles.behavioralValue}>
                    {(behavioralMatrix.behavior?.copyAttempts || 0) + (behavioralMatrix.behavior?.pasteAttempts || 0)}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Right-Click Attempts</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.rightClickAttempts || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Risk Level</span>
                  <span style={{
                    ...styles.riskBadge,
                    background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                               behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                    color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                           behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
                  }}>
                    {behavioralMatrix.riskAssessment?.level || 'Low Risk'}
                  </span>
                </div>
              </div>

              {/* Risk Summary */}
              <div style={styles.riskSummary}>
                <p>
                  Behavioral flags: {behavioralMatrix.behavior?.violations || 0} violation(s), {behavioralMatrix.behavior?.tabSwitches || 0} tab switches, and {behavioralMatrix.behavior?.answerChanges || 0} answer changes.
                </p>
              </div>

              {/* ============================================================
                  BEHAVIORAL COMMENTARY - FULLY RESTORED
                  ============================================================ */}
              {behavioralMatrix?.behavior && (
                <div style={styles.behavioralCommentary}>
                  <h4 style={styles.commentaryTitle}>Behavioral Analysis &amp; Recommendations</h4>

                  {/* Tab Switches Commentary */}
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Tab Switches:</span>
                    <span style={styles.commentaryText}>
                      {behavioralMatrix.behavior.tabSwitches === 0
                        ? 'No tab switching detected. Candidate maintained focus on the assessment.'
                        : behavioralMatrix.behavior.tabSwitches <= 5
                          ? `Minimal tab switching (${behavioralMatrix.behavior.tabSwitches} switches). This may indicate occasional distraction.`
                          : behavioralMatrix.behavior.tabSwitches <= 20
                            ? `Moderate tab switching (${behavioralMatrix.behavior.tabSwitches} switches). Candidate may have been referencing external materials.`
                            : `High tab switching (${behavioralMatrix.behavior.tabSwitches} switches). This suggests significant distraction or potential external reference use.`
                      }
                    </span>
                  </div>

                  {/* Violations Commentary */}
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Violations:</span>
                    <span style={styles.commentaryText}>
                      {behavioralMatrix.behavior.violations === 0
                        ? 'No rule violations detected. Candidate followed all assessment guidelines.'
                        : behavioralMatrix.behavior.violations <= 3
                          ? `Minor violations (${behavioralMatrix.behavior.violations} violations). These may be accidental or due to unfamiliarity with the assessment interface.`
                          : behavioralMatrix.behavior.violations <= 10
                            ? `Moderate violations (${behavioralMatrix.behavior.violations} violations). Candidate may have attempted to circumvent assessment rules.`
                            : `High violations (${behavioralMatrix.behavior.violations} violations). This indicates significant disregard for assessment rules.`
                      }
                    </span>
                  </div>

                  {/* Answer Changes Commentary */}
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Answer Changes:</span>
                    <span style={styles.commentaryText}>
                      {behavioralMatrix.behavior.answerChanges === 0
                        ? 'No answer changes. Candidate answered confidently without second-guessing.'
                        : behavioralMatrix.behavior.answerChanges <= 3
                          ? `Minimal answer changes (${behavioralMatrix.behavior.answerChanges} changes). Candidate showed some hesitation on a few questions.`
                          : behavioralMatrix.behavior.answerChanges <= 10
                            ? `Moderate answer changes (${behavioralMatrix.behavior.answerChanges} changes). Candidate may have been uncertain about several answers.`
                            : `High answer changes (${behavioralMatrix.behavior.answerChanges} changes). Candidate showed significant uncertainty throughout the assessment.`
                      }
                    </span>
                  </div>

                  {/* Average Time Commentary */}
                  <div style={styles.commentaryItem}>
                    <span style={styles.commentaryLabel}>Avg Response Time:</span>
                    <span style={styles.commentaryText}>
                      {behavioralMatrix.timing?.averageTimePerQuestion <= 15
                        ? 'Fast average response time. Candidate answered quickly, which may indicate strong confidence or potential rushing.'
                        : behavioralMatrix.timing?.averageTimePerQuestion <= 45
                          ? 'Normal average response time. Candidate took reasonable time to consider each question.'
                          : behavioralMatrix.timing?.averageTimePerQuestion <= 90
                            ? 'Extended average response time. Candidate took longer than average on questions.'
                            : 'Very long average response time. Candidate spent excessive time on questions.'
                      }
                    </span>
                  </div>

                  {/* Risk Assessment */}
                  <div style={styles.riskSummaryBox}>
                    <p style={styles.riskSummaryText}>
                      <strong>Risk Assessment:</strong> {behavioralMatrix.riskAssessment?.summary || 'No behavioral concerns detected.'}
                    </p>
                    {behavioralMatrix.riskAssessment?.detail && (
                      <p style={styles.riskDetailText}>{behavioralMatrix.riskAssessment.detail}</p>
                    )}
                    {behavioralMatrix.riskAssessment?.action && (
                      <p style={styles.riskActionText}>
                        <strong>Recommendation:</strong> {behavioralMatrix.riskAssessment.action}
                      </p>
                    )}
                  </div>

                  {/* Flagged Questions */}
                  {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                    <div style={styles.flaggedQuestions}>
                      <h5 style={styles.flaggedTitle}>Flagged Questions</h5>
                      <ul style={styles.flaggedList}>
                        {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                          <li key={index} style={styles.flaggedItem}>
                            Question {q.question_id}: {q.time_seconds}s
                            {q.changed ? ' - Changed' : ''}
                            {q.violation ? ' - Violation' : ''}
                            {q.comment ? ` - ${q.comment}` : ''}
                          </li>
                        ))}
                        {behavioralMatrix.flaggedQuestions.length > 10 && (
                          <li style={styles.flaggedItem}>... and {behavioralMatrix.flaggedQuestions.length - 10} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
        <button onClick={() => window.print()} style={styles.printButton}>Print Report</button>
      </div>
    </div>
  );
}
