// components/reports/StratavaxReport.js

import React, { useState } from 'react';

export default function StratavaxReport({ result, candidate, assessment, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!result) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  console.log('[StratavaxReport] Result data:', result);

  // Extract data from result
  const candidateName = candidate?.full_name || result?.candidate_profiles?.full_name || result?.candidate_profiles?.fullName || 'Candidate';
  const candidateEmail = candidate?.email || result?.candidate_profiles?.email || result?.candidate_profiles?.emailAddress || '';
  const assessmentTitle = assessment?.title || result?.assessments?.title || result?.assessment_title || 'Assessment';
  
  // Get score
  const overallScore = result?.percentage_score || result?.score || result?.percentage || 0;
  const finalScore = typeof overallScore === 'string' ? parseFloat(overallScore) : Number(overallScore);
  const parsedScore = isNaN(finalScore) ? 0 : finalScore;
  
  // Get classification and risk level
  const classification = result?.classification || getClassification(parsedScore);
  const riskLevel = result?.riskLevel || getRiskLevel(parsedScore);
  const riskColor = getRiskColor(riskLevel);
  
  // Get category scores, strengths, weaknesses, recommendations
  const categoryScores = result?.categoryScores || result?.category_scores || [];
  const strengths = result?.strengths || [];
  const weaknesses = result?.weaknesses || result?.developmentAreas || [];
  const recommendations = result?.recommendations || [];
  
  // Get interpretations
  const executiveSummary = result?.executiveSummary || result?.executive_summary || '';
  const supervisorImplication = result?.supervisorImplication || result?.supervisor_implication || '';
  const detailedInterpretation = result?.detailedInterpretation || {};

  // Sort category scores by percentage descending
  const sortedCategories = [...categoryScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  
  // Separate strengths and weaknesses from category scores
  const strengthCategories = sortedCategories.filter(c => (c.percentage || 0) >= 75);
  const developmentCategories = sortedCategories.filter(c => (c.percentage || 0) < 65);
  const moderateCategories = sortedCategories.filter(c => (c.percentage || 0) >= 65 && (c.percentage || 0) < 75);

  // Helper functions
  function getClassification(score) {
    if (score >= 85) return 'Exceptional';
    if (score >= 75) return 'Strong Performer';
    if (score >= 65) return 'Capable Contributor';
    if (score >= 55) return 'Developing';
    if (score >= 40) return 'At Risk';
    return 'High Risk';
  }

  function getRiskLevel(score) {
    if (score >= 75) return 'Low';
    if (score >= 65) return 'Moderate';
    if (score >= 55) return 'Elevated';
    if (score >= 40) return 'High';
    return 'Critical';
  }

  function getRiskColor(level) {
    switch (level) {
      case 'Low': return '#2e7d32';
      case 'Moderate': return '#1565c0';
      case 'Elevated': return '#f57c00';
      case 'High': return '#c62828';
      case 'Critical': return '#b71c1c';
      default: return '#333';
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 'Critical': return '#c62828';
      case 'High': return '#f57c00';
      case 'Medium': return '#1565c0';
      case 'Low': return '#2e7d32';
      default: return '#475569';
    }
  }

  function getScoreLevelLabel(percentage) {
    if (percentage >= 85) return 'Exceptional';
    if (percentage >= 75) return 'Strong';
    if (percentage >= 65) return 'Adequate';
    if (percentage >= 55) return 'Developing';
    if (percentage >= 40) return 'Priority Development';
    return 'Critical Gap';
  }

  function getScoreLevelColor(percentage) {
    if (percentage >= 85) return '#2e7d32';
    if (percentage >= 75) return '#1565c0';
    if (percentage >= 65) return '#f57c00';
    if (percentage >= 55) return '#ea580c';
    if (percentage >= 40) return '#c62828';
    return '#b71c1c';
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'strengths', label: 'Strengths' },
    { id: 'weaknesses', label: 'Development Areas' },
    { id: 'categories', label: 'All Categories' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <div style={styles.container}>
      {/* Back Button */}
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}

      {/* ============================================================
          HEADER - Clean, solid background, no duplication
          ============================================================ */}
      <div style={styles.header}>
        <h1 style={styles.title}>Assessment Report</h1>
        <p style={styles.subtitle}>{assessmentTitle}</p>
        <div style={styles.candidateInfo}>
          <div style={styles.candidateInfoGrid}>
            <div>
              <span style={styles.infoLabel}>Candidate:</span>
              <span style={styles.infoValue}>{candidateName}</span>
            </div>
            <div>
              <span style={styles.infoLabel}>Email:</span>
              <span style={styles.infoValue}>{candidateEmail || 'N/A'}</span>
            </div>
            <div>
              <span style={styles.infoLabel}>Completed:</span>
              <span style={styles.infoValue}>{result?.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div>
              <span style={styles.infoLabel}>Classification:</span>
              <span style={{ ...styles.infoValue, color: riskColor }}>{classification}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SCORE CARDS - Clean, solid backgrounds with good contrast
          ============================================================ */}
      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{Math.round(parsedScore)}%</div>
          <div style={{ ...styles.scoreBand, color: riskColor }}>
            {classification}
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Risk Level</div>
          <div style={{ ...styles.scoreValue, color: riskColor, fontSize: '24px' }}>
            {riskLevel}
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Questions Answered</div>
          <div style={styles.scoreValue}>{result?.answered_questions || 0} / {result?.total_questions || 0}</div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Categories Assessed</div>
          <div style={styles.scoreValue}>{categoryScores.length}</div>
        </div>
      </div>

      {/* ============================================================
          EXECUTIVE SUMMARY - Solid background, clear text
          ============================================================ */}
      {executiveSummary && (
        <div style={styles.executiveSummarySection}>
          <h2 style={styles.sectionTitle}>📝 Executive Summary</h2>
          <div style={styles.summaryCard}>
            <p style={styles.summaryText}>{executiveSummary}</p>
          </div>
        </div>
      )}

      {/* ============================================================
          QUICK STATS - Clean, solid backgrounds
          ============================================================ */}
      <div style={styles.quickStats}>
        <div style={styles.quickStat}>
          <span style={styles.quickStatValue}>{strengthCategories.length}</span>
          <span style={styles.quickStatLabel}>Strengths (≥75%)</span>
        </div>
        <div style={styles.quickStat}>
          <span style={styles.quickStatValue}>{moderateCategories.length}</span>
          <span style={styles.quickStatLabel}>Moderate (65-74%)</span>
        </div>
        <div style={styles.quickStat}>
          <span style={styles.quickStatValue}>{developmentCategories.length}</span>
          <span style={styles.quickStatLabel}>Development Areas (&lt;65%)</span>
        </div>
        <div style={styles.quickStat}>
          <span style={styles.quickStatValue}>{recommendations.length}</span>
          <span style={styles.quickStatLabel}>Recommendations</span>
        </div>
      </div>

      {/* ============================================================
          TABS
          ============================================================ */}
      <div style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tabButton,
              background: activeTab === tab.id ? '#1a237e' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#475569',
              borderBottom: activeTab === tab.id ? '3px solid #1a237e' : '3px solid transparent'
            }}
          >
            {tab.label}
            {tab.id === 'strengths' && strengthCategories.length > 0 && (
              <span style={styles.tabBadge}>{strengthCategories.length}</span>
            )}
            {tab.id === 'weaknesses' && developmentCategories.length > 0 && (
              <span style={styles.tabBadge}>{developmentCategories.length}</span>
            )}
            {tab.id === 'categories' && categoryScores.length > 0 && (
              <span style={styles.tabBadge}>{categoryScores.length}</span>
            )}
            {tab.id === 'recommendations' && recommendations.length > 0 && (
              <span style={styles.tabBadge}>{recommendations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ============================================================
          TAB CONTENT
          ============================================================ */}
      <div style={styles.tabContent}>
        {/* ============================================================
            OVERVIEW TAB
            ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            {/* Top Strengths */}
            {strengthCategories.length > 0 && (
              <div style={styles.overviewSection}>
                <h3 style={styles.overviewSectionTitle}>🌟 Top Strengths</h3>
                <div style={styles.overviewList}>
                  {strengthCategories.slice(0, 5).map((cat, index) => (
                    <div key={index} style={styles.overviewListItem}>
                      <span style={styles.overviewListName}>{cat.category || cat.name}</span>
                      <span style={{ ...styles.overviewListScore, color: '#2e7d32' }}>
                        {Math.round(cat.percentage || 0)}%
                      </span>
                    </div>
                  ))}
                  {strengthCategories.length > 5 && (
                    <div style={styles.overviewListMore}>
                      + {strengthCategories.length - 5} more strengths
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Development Areas */}
            {developmentCategories.length > 0 && (
              <div style={styles.overviewSection}>
                <h3 style={styles.overviewSectionTitle}>📈 Development Areas</h3>
                <div style={styles.overviewList}>
                  {developmentCategories.slice(0, 5).map((cat, index) => (
                    <div key={index} style={styles.overviewListItem}>
                      <span style={styles.overviewListName}>{cat.category || cat.name}</span>
                      <span style={{ ...styles.overviewListScore, color: '#c62828' }}>
                        {Math.round(cat.percentage || 0)}%
                      </span>
                    </div>
                  ))}
                  {developmentCategories.length > 5 && (
                    <div style={styles.overviewListMore}>
                      + {developmentCategories.length - 5} more development areas
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations Preview */}
            {recommendations.length > 0 && (
              <div style={styles.overviewSection}>
                <h3 style={styles.overviewSectionTitle}>📋 Key Recommendations</h3>
                <div style={styles.overviewRecommendations}>
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} style={styles.overviewRecItem}>
                      <span style={{ ...styles.overviewRecPriority, background: getPriorityColor(rec.priority || 'Medium') }}>
                        {rec.priority || 'Medium'}
                      </span>
                      <span style={styles.overviewRecCategory}>{rec.category}</span>
                    </div>
                  ))}
                  {recommendations.length > 3 && (
                    <div style={styles.overviewListMore}>
                      + {recommendations.length - 3} more recommendations
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Supervisor Note */}
            {supervisorImplication && (
              <div style={styles.supervisorNote}>
                <strong>👤 Supervisor Note:</strong>
                <p>{supervisorImplication}</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            STRENGTHS TAB - DETAILED
            ============================================================ */}
        {activeTab === 'strengths' && (
          <div>
            {strengthCategories.length > 0 ? (
              <div>
                <p style={styles.tabDescription}>
                  The following categories are identified as strengths (score ≥ 75%). 
                  These areas represent the candidate's strongest capabilities.
                </p>
                <div style={styles.detailGrid}>
                  {strengthCategories.map((cat, index) => {
                    const percentage = cat.percentage || 0;
                    const level = getScoreLevelLabel(percentage);
                    const levelColor = getScoreLevelColor(percentage);
                    const commentary = cat.commentary || cat.comment || '';
                    const insight = cat.insights && cat.insights.length > 0 ? cat.insights[0] : '';
                    
                    return (
                      <div key={index} style={styles.detailCard}>
                        <div style={styles.detailHeader}>
                          <div style={styles.detailRank}>{index + 1}</div>
                          <div style={styles.detailTitle}>
                            <span style={styles.detailName}>{cat.category || cat.name}</span>
                            <span style={{ ...styles.detailLevel, color: levelColor }}>{level}</span>
                          </div>
                          <span style={{ ...styles.detailScore, color: levelColor }}>
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div style={styles.detailBar}>
                          <div style={{ ...styles.detailBarFill, width: Math.min(percentage, 100) + '%' }} />
                        </div>
                        <div style={styles.detailMeta}>
                          <span>Score: {Math.round(cat.score || 0)} / {Math.round(cat.maxScore || 100)}</span>
                          <span>Grade: {cat.grade || 'N/A'}</span>
                        </div>
                        {commentary && (
                          <div style={styles.detailCommentary}>
                            <strong>Analysis:</strong> {commentary}
                          </div>
                        )}
                        {insight && (
                          <div style={styles.detailInsight}>
                            <strong>Evidence:</strong> {insight}
                          </div>
                        )}
                        {cat.supervisorImplication && (
                          <div style={styles.detailSupervisor}>
                            <strong>Supervisor Implication:</strong> {cat.supervisorImplication}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No strengths identified (no category reached the 75% threshold).</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            DEVELOPMENT AREAS TAB - DETAILED
            ============================================================ */}
        {activeTab === 'weaknesses' && (
          <div>
            {developmentCategories.length > 0 ? (
              <div>
                <p style={styles.tabDescription}>
                  The following categories are identified as development areas (score &lt; 65%). 
                  These areas should be prioritized in the candidate's development plan.
                </p>
                <div style={styles.detailGrid}>
                  {developmentCategories.map((cat, index) => {
                    const percentage = cat.percentage || 0;
                    const level = getScoreLevelLabel(percentage);
                    const levelColor = getScoreLevelColor(percentage);
                    const gap = cat.gapToTarget || (80 - percentage);
                    const commentary = cat.commentary || cat.comment || '';
                    const devRec = cat.developmentRecommendation || '';
                    const insight = cat.insights && cat.insights.length > 0 ? cat.insights[0] : '';
                    
                    return (
                      <div key={index} style={{ ...styles.detailCard, borderLeft: `4px solid ${levelColor}` }}>
                        <div style={styles.detailHeader}>
                          <div style={styles.detailRank}>{index + 1}</div>
                          <div style={styles.detailTitle}>
                            <span style={styles.detailName}>{cat.category || cat.name}</span>
                            <span style={{ ...styles.detailLevel, color: levelColor }}>{level}</span>
                          </div>
                          <span style={{ ...styles.detailScore, color: levelColor }}>
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div style={styles.detailBar}>
                          <div style={{ ...styles.detailBarFill, width: Math.min(percentage, 100) + '%', background: `linear-gradient(90deg, ${levelColor}, ${levelColor}dd)` }} />
                        </div>
                        <div style={styles.detailMeta}>
                          <span>Score: {Math.round(cat.score || 0)} / {Math.round(cat.maxScore || 100)}</span>
                          <span>Grade: {cat.grade || 'N/A'}</span>
                          <span style={{ color: '#c62828' }}>Gap to 80%: {Math.round(gap)}%</span>
                        </div>
                        {commentary && (
                          <div style={styles.detailCommentary}>
                            <strong>Analysis:</strong> {commentary}
                          </div>
                        )}
                        {insight && (
                          <div style={styles.detailInsight}>
                            <strong>Evidence:</strong> {insight}
                          </div>
                        )}
                        {devRec && (
                          <div style={styles.detailDevRec}>
                            <strong>Development Recommendation:</strong> {devRec}
                          </div>
                        )}
                        {cat.supervisorImplication && (
                          <div style={styles.detailSupervisor}>
                            <strong>Supervisor Implication:</strong> {cat.supervisorImplication}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No development areas identified (no category below the 65% threshold).</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            ALL CATEGORIES TAB
            ============================================================ */}
        {activeTab === 'categories' && (
          <div>
            <p style={styles.tabDescription}>
              Complete breakdown of all assessed categories with scores, grades, and performance levels.
            </p>
            <div style={styles.allCategoriesGrid}>
              {sortedCategories.map((cat, index) => {
                const percentage = cat.percentage || 0;
                const level = getScoreLevelLabel(percentage);
                const levelColor = getScoreLevelColor(percentage);
                const isStrength = percentage >= 75;
                const isDevelopment = percentage < 65;
                
                return (
                  <div key={index} style={{ 
                    ...styles.allCategoryCard,
                    borderLeft: `4px solid ${levelColor}`,
                    background: isStrength ? '#f0f7f0' : 
                                isDevelopment ? '#fdf0f0' : '#fafbfc'
                  }}>
                    <div style={styles.allCategoryHeader}>
                      <span style={styles.allCategoryName}>{cat.category || cat.name}</span>
                      <span style={{ ...styles.allCategoryScore, color: levelColor }}>
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    <div style={styles.allCategoryBar}>
                      <div style={{ ...styles.allCategoryBarFill, width: Math.min(percentage, 100) + '%' }} />
                    </div>
                    <div style={styles.allCategoryMeta}>
                      <span>Grade: {cat.grade || 'N/A'}</span>
                      <span style={{ color: levelColor, fontWeight: '600' }}>{level}</span>
                      <span style={{ 
                        color: isStrength ? '#2e7d32' : isDevelopment ? '#c62828' : '#f57c00',
                        fontWeight: '500'
                      }}>
                        {isStrength ? '✅ Strength' : isDevelopment ? '🔴 Development' : '⚡ Moderate'}
                      </span>
                    </div>
                    {cat.comment && (
                      <div style={styles.allCategoryComment}>{cat.comment}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            RECOMMENDATIONS TAB - DETAILED
            ============================================================ */}
        {activeTab === 'recommendations' && (
          <div>
            {recommendations.length > 0 ? (
              <div>
                <p style={styles.tabDescription}>
                  Actionable development recommendations based on the candidate's performance profile.
                </p>
                <div style={styles.recommendationList}>
                  {recommendations.map((rec, index) => (
                    <div key={index} style={{ 
                      ...styles.recommendationCard,
                      borderLeft: `4px solid ${getPriorityColor(rec.priority || 'Medium')}`
                    }}>
                      <div style={styles.recommendationHeader}>
                        <span style={{ ...styles.priorityBadge, background: getPriorityColor(rec.priority || 'Medium') }}>
                          {rec.priority || 'Medium'} Priority
                        </span>
                        <span style={styles.recommendationCategory}>{rec.category || 'Area'}</span>
                        {rec.currentScore !== undefined && (
                          <span style={styles.recommendationScore}>
                            Current: {Math.round(rec.currentScore)}%
                          </span>
                        )}
                        {rec.gapToTarget !== undefined && (
                          <span style={styles.recommendationGap}>
                            Gap: {Math.round(rec.gapToTarget)}%
                          </span>
                        )}
                      </div>
                      <p style={styles.recommendationText}>{rec.recommendation || rec.action || rec.description}</p>
                      {rec.action && rec.action !== (rec.recommendation || '') && (
                        <div style={styles.recommendationAction}>
                          <strong>Action:</strong> {rec.action}
                        </div>
                      )}
                      {rec.impact && (
                        <div style={styles.recommendationImpact}>
                          <strong>Impact:</strong> {rec.impact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No recommendations available.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Button */}
      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>
          🖨️ Print Report
        </button>
      </div>
    </div>
  );
}

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
  
  // Header - Clean, solid, no glass
  header: {
    textAlign: 'center',
    padding: '30px 20px 20px',
    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
    borderRadius: '12px',
    color: 'white',
    marginBottom: '30px'
  },
  title: { fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' },
  subtitle: { fontSize: '18px', margin: '0 0 16px 0', opacity: 0.9 },
  candidateInfo: { 
    background: 'rgba(255,255,255,0.12)', 
    borderRadius: '8px', 
    padding: '16px 20px', 
    marginTop: '8px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  candidateInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    textAlign: 'left'
  },
  infoLabel: { fontSize: '12px', opacity: 0.7, display: 'block', marginBottom: '2px' },
  infoValue: { fontSize: '15px', fontWeight: '500', display: 'block' },
  
  // Score Cards - Solid backgrounds
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  scoreCard: {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
    border: '1px solid #eef2f7'
  },
  scoreLabel: { fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '8px' },
  scoreValue: { fontSize: '28px', fontWeight: '700', color: '#1a237e' },
  scoreBand: { fontSize: '15px', fontWeight: '600', marginTop: '8px' },
  
  // Executive Summary - Solid
  executiveSummarySection: { marginBottom: '24px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#1a237e', marginBottom: '12px' },
  summaryCard: {
    background: '#f8fafc',
    padding: '20px 24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  summaryText: { fontSize: '15px', color: '#1a202c', lineHeight: '1.8', margin: 0 },
  
  // Quick Stats - Solid
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  quickStat: {
    background: '#ffffff',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  quickStatValue: { fontSize: '24px', fontWeight: '700', color: '#1a237e', display: 'block' },
  quickStatLabel: { fontSize: '12px', color: '#94a3b8' },
  
  // Tabs
  tabsContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid #e2e8f0',
    overflowX: 'auto'
  },
  tabButton: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  },
  tabBadge: {
    background: '#e2e8f0',
    color: '#475569',
    borderRadius: '12px',
    padding: '0 8px',
    fontSize: '11px',
    fontWeight: '600'
  },
  tabContent: { minHeight: '300px' },
  tabDescription: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  
  // Overview Sections - Solid
  overviewSection: {
    background: '#ffffff',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px'
  },
  overviewSectionTitle: { fontSize: '15px', fontWeight: '600', color: '#1a202c', margin: '0 0 10px 0' },
  overviewList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  overviewListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  overviewListName: { fontSize: '14px', color: '#475569' },
  overviewListScore: { fontSize: '14px', fontWeight: '600' },
  overviewListMore: { fontSize: '13px', color: '#94a3b8', textAlign: 'center', paddingTop: '6px' },
  overviewRecommendations: { display: 'flex', flexDirection: 'column', gap: '8px' },
  overviewRecItem: { display: 'flex', alignItems: 'center', gap: '10px' },
  overviewRecPriority: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white'
  },
  overviewRecCategory: { fontSize: '14px', color: '#475569' },
  
  // Supervisor Note
  supervisorNote: {
    background: '#f8fafc',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginTop: '16px'
  },
  
  // Detail Cards
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px'
  },
  detailCard: {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  detailRank: {
    width: '28px',
    height: '28px',
    background: '#1a237e',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0
  },
  detailTitle: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  detailName: { fontSize: '16px', fontWeight: '600', color: '#1a202c' },
  detailLevel: { fontSize: '12px', fontWeight: '600' },
  detailScore: { fontSize: '22px', fontWeight: '700' },
  detailBar: { height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  detailBarFill: { height: '100%', background: 'linear-gradient(90deg, #1a237e, #0d47a1)', borderRadius: '3px' },
  detailMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  detailCommentary: {
    fontSize: '14px',
    color: '#1a202c',
    padding: '10px 14px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '8px',
    lineHeight: '1.6'
  },
  detailInsight: {
    fontSize: '13px',
    color: '#475569',
    padding: '8px 14px',
    background: '#f0f7ff',
    borderRadius: '8px',
    marginBottom: '8px'
  },
  detailDevRec: {
    fontSize: '14px',
    color: '#1a202c',
    padding: '10px 14px',
    background: '#fff3e0',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #ffe0b2'
  },
  detailSupervisor: {
    fontSize: '13px',
    color: '#475569',
    padding: '8px 14px',
    background: '#f1f5f9',
    borderRadius: '8px'
  },
  
  // All Categories
  allCategoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px'
  },
  allCategoryCard: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  allCategoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  allCategoryName: { fontSize: '14px', fontWeight: '500', color: '#1a202c' },
  allCategoryScore: { fontSize: '18px', fontWeight: '700' },
  allCategoryBar: { height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' },
  allCategoryBarFill: { height: '100%', background: 'linear-gradient(90deg, #1a237e, #0d47a1)', borderRadius: '2px' },
  allCategoryMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#94a3b8',
    flexWrap: 'wrap'
  },
  allCategoryComment: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  
  // Recommendations
  recommendationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  recommendationCard: {
    background: '#ffffff',
    padding: '18px 20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  recommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  priorityBadge: {
    padding: '2px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  recommendationCategory: { fontSize: '16px', fontWeight: '600', color: '#1a202c' },
  recommendationScore: { fontSize: '13px', color: '#475569' },
  recommendationGap: { fontSize: '13px', color: '#c62828', fontWeight: '600' },
  recommendationText: { fontSize: '14px', color: '#475569', margin: '0 0 8px 0', lineHeight: '1.6' },
  recommendationAction: { fontSize: '13px', color: '#1565c0', marginTop: '4px' },
  recommendationImpact: { fontSize: '13px', color: '#2e7d32', marginTop: '4px' },
  
  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    color: '#94a3b8'
  },
  
  // Actions
  actions: { textAlign: 'center', marginTop: '30px' },
  printButton: {
    padding: '12px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#64748b' }
};
