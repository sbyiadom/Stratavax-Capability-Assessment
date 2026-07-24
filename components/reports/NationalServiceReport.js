// components/reports/NationalServiceReport.js - FIXED

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';

// ============================================================
// STYLES - Keep all your existing styles (I'm omitting them for brevity)
// ============================================================

// ============================================================
// COMPONENT - FIXED TO USE PROPS
// ============================================================
export default function NationalServiceReport({ 
  report, 
  onBack,
  behavioralMatrix: propBehavioralMatrix,      // ← ADDED: Receive from parent
  loadingBehavioral: propLoadingBehavioral     // ← ADDED: Receive from parent
}) {
  // State for behavioral matrix
  const [localBehavioralMatrix, setLocalBehavioralMatrix] = useState(null);
  const [localLoadingBehavioral, setLocalLoadingBehavioral] = useState(false);
  
  // Use prop data if available, otherwise use local state
  const behavioralMatrix = propBehavioralMatrix !== undefined ? propBehavioralMatrix : localBehavioralMatrix;
  const loadingBehavioral = propLoadingBehavioral !== undefined ? propLoadingBehavioral : localLoadingBehavioral;
  
  const [showBehavioral, setShowBehavioral] = useState(false);

  // Only fetch locally if prop is NOT provided
  useEffect(() => {
    // If propBehavioralMatrix is provided, use it and don't fetch
    if (propBehavioralMatrix !== undefined) {
      console.log('[NationalServiceReport] Using behavioralMatrix from props:', propBehavioralMatrix);
      return;
    }
    
    // Otherwise fetch locally
    console.log('[NationalServiceReport] No prop provided, fetching locally');
    const resultId = report?.resultId || report?.id || report?.result_id;
    if (resultId) {
      fetchBehavioralMatrix(resultId);
    }
  }, [report, propBehavioralMatrix]);

  const fetchBehavioralMatrix = async (id) => {
    try {
      setLocalLoadingBehavioral(true);
      console.log('[Behavioral] Local fetch for resultId:', id);
      
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        console.log('[Behavioral] No token found');
        setLocalLoadingBehavioral(false);
        return;
      }

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('[Behavioral] Local API Response:', data);
      
      if (data.success) {
        let matrix = data.behavioralMatrix || data.matrixData || data.data || data.result;
        if (matrix) {
          console.log('[Behavioral] Local matrix data:', matrix);
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

  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  // ============================================================
  // EXTRACT DATA - Keep all your existing data extraction logic
  // ============================================================
  const reportData = report.report_data || report;
  
  const candidateInfo = reportData.candidateInfo || report.candidateInfo || {};
  const candidateName = reportData.candidateName || candidateInfo.fullName || report.candidateName || 'Candidate';
  const university = reportData.university || candidateInfo.university || report.university || 'N/A';
  const programme = reportData.programme || candidateInfo.programme || report.programme || 'N/A';
  const graduationYear = reportData.graduationYear || candidateInfo.graduationYear || report.graduationYear || 'N/A';
  const preferredDepartment = reportData.preferredDepartment || candidateInfo.preferredDepartment || report.preferredDepartment || 'Not Specified';
  
  const completed_at = reportData.completed_at || report.completed_at || null;
  const assessmentDate = candidateInfo.assessmentDate || 
    (completed_at ? new Date(completed_at).toLocaleDateString() : 'N/A');

  // ============================================================
  // EXTRACT CATEGORY SCORES - Keep your existing logic
  // ============================================================
  let categoryScores = [];
  
  if (reportData.category_scores && Array.isArray(reportData.category_scores) && reportData.category_scores.length > 0) {
    categoryScores = reportData.category_scores;
  } else if (report.category_scores && Array.isArray(report.category_scores) && report.category_scores.length > 0) {
    categoryScores = report.category_scores;
  } else if (reportData.categoryBreakdown && Array.isArray(reportData.categoryBreakdown) && reportData.categoryBreakdown.length > 0) {
    categoryScores = reportData.categoryBreakdown;
  } else if (report.categoryBreakdown && Array.isArray(report.categoryBreakdown) && report.categoryBreakdown.length > 0) {
    categoryScores = report.categoryBreakdown;
  }

  console.log('[Report] category_scores count:', categoryScores.length);

  // ============================================================
  // SPLIT INTO WORKPLACE AND INTELLECTUAL - Keep your existing logic
  // ============================================================
  const workplaceSubCategories = [];
  const intellectualSubCategories = [];

  const workplaceCategoryNames = [
    'Safety & Risk Awareness',
    'Technical Fundamentals',
    'Communication & Teamwork',
    'Ownership & Integrity',
    'Workplace Ethics',
    'Professional Conduct',
    'Work Ethic'
  ];

  const intellectualCategoryNames = [
    'Problem Solving & Troubleshooting',
    'Logical Reasoning',
    'Numerical Reasoning',
    'Measurement & Engineering Units',
    'Learning Agility',
    'Cognitive Ability',
    'Analytical Thinking'
  ];

  if (categoryScores && categoryScores.length > 0) {
    categoryScores.forEach(cat => {
      const categoryName = safeString(cat.category || cat.name || '');
      const percentage = Number(cat.percentage || cat.score || 0);
      
      const isWorkplace = workplaceCategoryNames.some(name => 
        categoryName.toLowerCase().includes(name.toLowerCase())
      );
      
      const isIntellectual = intellectualCategoryNames.some(name => 
        categoryName.toLowerCase().includes(name.toLowerCase())
      );

      if (isWorkplace) {
        workplaceSubCategories.push({ ...cat, category: categoryName, percentage });
      } else if (isIntellectual) {
        intellectualSubCategories.push({ ...cat, category: categoryName, percentage });
      } else {
        const lowerName = categoryName.toLowerCase();
        if (lowerName.includes('safety') || lowerName.includes('technical') || 
            lowerName.includes('communication') || lowerName.includes('teamwork') ||
            lowerName.includes('ownership') || lowerName.includes('integrity') ||
            lowerName.includes('workplace') || lowerName.includes('ethics') ||
            lowerName.includes('professional') || lowerName.includes('conduct')) {
          workplaceSubCategories.push({ ...cat, category: categoryName, percentage });
        } else {
          intellectualSubCategories.push({ ...cat, category: categoryName, percentage });
        }
      }
    });
  }

  console.log('[Report] Workplace sub-categories:', workplaceSubCategories.length);
  console.log('[Report] Intellectual sub-categories:', intellectualSubCategories.length);

  // ============================================================
  // CALCULATE AVERAGES - Keep your existing logic
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

  console.log('[Report] Calculated Workplace:', displayWorkplace);
  console.log('[Report] Calculated Intellectual:', displayIntellectual);
  console.log('[Report] Calculated Overall:', displayOverall);

  // ============================================================
  // RECOMMENDATION LOGIC - Keep your existing logic
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

  if (reportData.recommendation && reportData.recommendation !== 'N/A') {
    recommendationLevel = safeString(reportData.recommendation);
  } else if (report.recommendation && report.recommendation !== 'N/A') {
    recommendationLevel = safeString(report.recommendation);
  }

  // ============================================================
  // RECOMMENDATION DETAILS - Keep your existing logic
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
  // RENDER HELPERS - Keep your existing logic
  // ============================================================
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
  // ✅ CHECK IF BEHAVIORAL DATA EXISTS - ULTRA SIMPLE
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
                  <div style={styles.strengthContent}>
                    <div style={styles.strengthName}>{categoryName}</div>
                    <div style={styles.strengthScore}>{Math.round(percentage)}%</div>
                    <div style={styles.strengthBar}>
                      <div style={{ ...styles.strengthBarFill, width: Math.min(percentage, 100) + '%' }} />
                    </div>
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
          <div style={styles.developmentGrid}>
            {developmentAreas.map((area, index) => {
              const percentage = area.percentage || 0;
              const categoryName = area.category || area.name || 'Unknown';
              return (
                <div key={index} style={styles.developmentCard}>
                  <div style={styles.developmentRank}>{index + 1}</div>
                  <div style={styles.developmentContent}>
                    <div style={styles.developmentName}>{categoryName}</div>
                    <div style={styles.developmentScore}>{Math.round(percentage)}%</div>
                    <div style={styles.developmentBar}>
                      <div style={{ ...styles.developmentBarFill, width: Math.min(percentage, 100) + '%' }} />
                    </div>
                    <div style={styles.developmentGap}>
                      Gap to 70% target: {Math.round(70 - percentage)}%
                    </div>
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
                <span style={styles.placementIcon}>•</span>
                <span style={styles.placementName}>{dept}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          BEHAVIORAL MATRIX SECTION
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
              <div style={styles.behavioralStats}>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Total Time</span>
                  <span style={styles.behavioralValue}>
                    {formatTime(behavioralMatrix.timing?.totalTimeSeconds || 0)}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Avg Time per Question</span>
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
              
              <div style={styles.riskSummary}>
                <p>
                  Behavioral flags: {behavioralMatrix.behavior?.violations || 0} violation(s), {behavioralMatrix.behavior?.tabSwitches || 0} tab switches.
                </p>
                {behavioralMatrix.riskAssessment?.detail && (
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    {behavioralMatrix.riskAssessment.detail}
                  </p>
                )}
              </div>
              
              {behavioralMatrix.flaggedQuestions && behavioralMatrix.flaggedQuestions.length > 0 && (
                <div style={styles.flaggedQuestions}>
                  <h4 style={styles.flaggedTitle}>Flagged Questions</h4>
                  <ul style={styles.flaggedList}>
                    {behavioralMatrix.flaggedQuestions.slice(0, 10).map((q, index) => (
                      <li key={index} style={styles.flaggedItem}>
                        Question {q.question_id}: {q.time_seconds}s
                        {q.changed ? ' - Changed' : ''}
                        {q.violation ? ' - Violation' : ''}
                      </li>
                    ))}
                    {behavioralMatrix.flaggedQuestions.length > 10 && (
                      <li style={styles.flaggedItem}>... and {behavioralMatrix.flaggedQuestions.length - 10} more</li>
                    )}
                  </ul>
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
        <button onClick={() => window.print()} style={styles.printButton}>
          Print Report
        </button>
      </div>
    </div>
  );
}
