// components/reports/StratavaxReport.js - PROFESSIONAL VERSION (No Emojis)

import React from 'react';
import {
  getScorePhrase,
  getManufacturingPhrase,
  getScoreLevelKey,
  selectPhrase,
  replaceVariables,
  generalReportPhrases,
  scoreLevelPhrases
} from '../../utils/phraseLibrary';

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

export default function StratavaxReport({ result, candidate, assessment, onBack }) {
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
  // Generate robust analysis for each category
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
  // Generate category analysis data
  // ============================================================
  const categoryAnalysis = {};
  categoryScores.forEach(cat => {
    const name = cat.category || cat.name || 'Unknown';
    const score = safeNumber(cat.percentage || cat.score || 0);
    categoryAnalysis[name] = generateCategoryAnalysis(name, score);
  });

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
            The following categories are identified as strengths (score ≥ 75%). These areas represent the candidate's strongest capabilities.
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

      {/* Print Button */}
      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>
          Print Report
        </button>
      </div>
    </div>
  );
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
  }
};
