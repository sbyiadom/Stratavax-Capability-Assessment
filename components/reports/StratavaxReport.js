// components/reports/StratavaxReport.js

import React, { useState } from 'react';

export default function StratavaxReport({ result, candidate, assessment, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!result) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  console.log('[StratavaxReport] Result data:', result);
  console.log('[StratavaxReport] Category scores:', result.categoryScores);

  // Extract data from result (which now has all the calculated data)
  const candidateName = candidate?.full_name || result?.candidate_profiles?.full_name || result?.candidate_profiles?.fullName || 'Candidate';
  const candidateEmail = candidate?.email || result?.candidate_profiles?.email || result?.candidate_profiles?.emailAddress || '';
  const assessmentTitle = assessment?.title || result?.assessments?.title || result?.assessment_title || 'Assessment';
  
  // Get score from result (already calculated)
  const overallScore = result?.percentage_score || result?.score || result?.percentage || 0;
  const finalScore = typeof overallScore === 'string' ? parseFloat(overallScore) : Number(overallScore);
  const parsedScore = isNaN(finalScore) ? 0 : finalScore;
  
  // Get classification and risk level
  const classification = result?.classification || getClassification(parsedScore);
  const riskLevel = result?.riskLevel || getRiskLevel(parsedScore);
  const riskColor = getRiskColor(riskLevel);
  
  // Get category scores from result (now populated by the API)
  const categoryScores = result?.categoryScores || result?.category_scores || [];
  const strengths = result?.strengths || [];
  const weaknesses = result?.weaknesses || result?.developmentAreas || [];
  const recommendations = result?.recommendations || [];
  
  // Get interpretations
  const executiveSummary = result?.executiveSummary || result?.executive_summary || '';
  const supervisorImplication = result?.supervisorImplication || result?.supervisor_implication || '';

  console.log('[StratavaxReport] Category scores count:', categoryScores.length);
  console.log('[StratavaxReport] Strengths count:', strengths.length);
  console.log('[StratavaxReport] Weaknesses count:', weaknesses.length);
  console.log('[StratavaxReport] Recommendations count:', recommendations.length);

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'categories', label: 'Categories' },
    { id: 'strengths', label: 'Strengths' },
    { id: 'weaknesses', label: 'Weaknesses' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  // Sort category scores by percentage descending
  const sortedCategories = [...categoryScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

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

      {/* Score Cards */}
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

      {/* Executive Summary */}
      {executiveSummary && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📝 Executive Summary</h2>
          <div style={styles.summaryCard}>
            <p style={styles.summaryText}>{executiveSummary}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
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
            {tab.id === 'categories' && categoryScores.length > 0 && (
              <span style={styles.tabBadge}>{categoryScores.length}</span>
            )}
            {tab.id === 'strengths' && strengths.length > 0 && (
              <span style={styles.tabBadge}>{strengths.length}</span>
            )}
            {tab.id === 'weaknesses' && weaknesses.length > 0 && (
              <span style={styles.tabBadge}>{weaknesses.length}</span>
            )}
            {tab.id === 'recommendations' && recommendations.length > 0 && (
              <span style={styles.tabBadge}>{recommendations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {/* ============================================================
            OVERVIEW TAB
            ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            {/* Summary stats */}
            <div style={styles.overviewStats}>
              <div style={styles.overviewStat}>
                <span style={styles.overviewStatValue}>{categoryScores.length}</span>
                <span style={styles.overviewStatLabel}>Categories</span>
              </div>
              <div style={styles.overviewStat}>
                <span style={styles.overviewStatValue}>{strengths.length}</span>
                <span style={styles.overviewStatLabel}>Strengths</span>
              </div>
              <div style={styles.overviewStat}>
                <span style={styles.overviewStatValue}>{weaknesses.length}</span>
                <span style={styles.overviewStatLabel}>Development Areas</span>
              </div>
              <div style={styles.overviewStat}>
                <span style={styles.overviewStatValue}>{recommendations.length}</span>
                <span style={styles.overviewStatLabel}>Recommendations</span>
              </div>
            </div>

            {/* Quick category overview */}
            {sortedCategories.length > 0 && (
              <div style={styles.quickCategories}>
                <h3 style={styles.quickCategoriesTitle}>Category Overview</h3>
                <div style={styles.quickCategoriesGrid}>
                  {sortedCategories.slice(0, 6).map((cat, index) => (
                    <div key={index} style={styles.quickCategoryItem}>
                      <span style={styles.quickCategoryName}>{cat.category || cat.name}</span>
                      <span style={styles.quickCategoryScore}>{Math.round(cat.percentage || 0)}%</span>
                    </div>
                  ))}
                </div>
                {sortedCategories.length > 6 && (
                  <p style={styles.quickCategoriesMore}>+ {sortedCategories.length - 6} more categories</p>
                )}
              </div>
            )}

            {/* Supervisor Implication */}
            {supervisorImplication && (
              <div style={styles.supervisorNote}>
                <strong>👤 Supervisor Note:</strong>
                <p>{supervisorImplication}</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            CATEGORIES TAB
            ============================================================ */}
        {activeTab === 'categories' && (
          <div>
            {sortedCategories.length > 0 ? (
              <div style={styles.categoryGrid}>
                {sortedCategories.map((cat, index) => {
                  const percentage = cat.percentage || 0;
                  return (
                    <div key={index} style={styles.categoryCard}>
                      <div style={styles.categoryHeader}>
                        <span style={styles.categoryName}>{cat.category || cat.name || 'Category'}</span>
                        <span style={styles.categoryScore}>{Math.round(percentage)}%</span>
                      </div>
                      <div style={styles.categoryBar}>
                        <div style={{ ...styles.categoryBarFill, width: Math.min(percentage, 100) + '%' }} />
                      </div>
                      <div style={styles.categoryDetail}>
                        Score: {Math.round(cat.score || 0)} / {Math.round(cat.maxScore || 100)}
                      </div>
                      {cat.comment && (
                        <div style={styles.categoryComment}>{cat.comment}</div>
                      )}
                      {cat.grade && (
                        <div style={styles.categoryGrade}>Grade: {cat.grade}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No category data available.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            STRENGTHS TAB
            ============================================================ */}
        {activeTab === 'strengths' && (
          <div>
            {strengths.length > 0 ? (
              <div style={styles.strengthGrid}>
                {strengths.map((strength, index) => {
                  const percentage = strength.percentage || 0;
                  return (
                    <div key={index} style={styles.strengthCard}>
                      <div style={styles.strengthRank}>{index + 1}</div>
                      <div style={styles.strengthContent}>
                        <div style={styles.strengthName}>{strength.category || strength.name || 'Area'}</div>
                        <div style={styles.strengthScore}>{Math.round(percentage)}%</div>
                        <div style={styles.strengthBar}>
                          <div style={{ ...styles.strengthBarFill, width: Math.min(percentage, 100) + '%' }} />
                        </div>
                        {strength.comment && (
                          <div style={styles.strengthComment}>{strength.comment}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No strengths identified. This may indicate areas for development.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            WEAKNESSES TAB
            ============================================================ */}
        {activeTab === 'weaknesses' && (
          <div>
            {weaknesses.length > 0 ? (
              <div style={styles.developmentGrid}>
                {weaknesses.map((weakness, index) => {
                  const percentage = weakness.percentage || 0;
                  return (
                    <div key={index} style={styles.developmentCard}>
                      <div style={styles.developmentRank}>{index + 1}</div>
                      <div style={styles.developmentContent}>
                        <div style={styles.developmentName}>{weakness.category || weakness.name || 'Area'}</div>
                        <div style={styles.developmentScore}>{Math.round(percentage)}%</div>
                        <div style={styles.developmentBar}>
                          <div style={{ ...styles.developmentBarFill, width: Math.min(percentage, 100) + '%' }} />
                        </div>
                        {weakness.gapToTarget !== undefined && (
                          <div style={styles.developmentGap}>
                            Gap to target: {Math.round(weakness.gapToTarget || (80 - percentage))}%
                          </div>
                        )}
                        {weakness.comment && (
                          <div style={styles.developmentComment}>{weakness.comment}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>No significant development areas identified.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            RECOMMENDATIONS TAB
            ============================================================ */}
        {activeTab === 'recommendations' && (
          <div>
            {recommendations.length > 0 ? (
              <div style={styles.recommendationList}>
                {recommendations.map((rec, index) => (
                  <div key={index} style={styles.recommendationCard}>
                    <div style={styles.recommendationHeader}>
                      <span style={{ ...styles.priorityBadge, background: getPriorityColor(rec.priority || 'Medium') }}>
                        {rec.priority || 'Medium'}
                      </span>
                      <span style={styles.recommendationCategory}>{rec.category || rec.area || 'Area'}</span>
                      {rec.gap !== undefined && (
                        <span style={styles.recommendationGap}>Gap: {Math.round(rec.gap)}%</span>
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
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  
  // Header
  header: { textAlign: 'center', padding: '30px 20px 20px', background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)', borderRadius: '12px', color: 'white', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' },
  subtitle: { fontSize: '18px', margin: '0 0 16px 0', opacity: 0.9 },
  candidateInfo: { background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px 20px', marginTop: '8px' },
  candidateInfoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', textAlign: 'left' },
  infoLabel: { fontSize: '12px', opacity: 0.7, display: 'block', marginBottom: '2px' },
  infoValue: { fontSize: '15px', fontWeight: '500', display: 'block' },
  
  // Score Cards
  scoreGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  scoreCard: { background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' },
  scoreLabel: { fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '8px' },
  scoreValue: { fontSize: '32px', fontWeight: '700', color: '#1a237e' },
  scoreBand: { fontSize: '16px', fontWeight: '600', marginTop: '8px' },
  
  // Executive Summary
  section: { marginBottom: '30px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#1a237e', marginBottom: '16px' },
  summaryCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  summaryText: { fontSize: '15px', color: '#1a202c', lineHeight: '1.8', margin: 0 },
  
  // Tabs
  tabsContainer: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' },
  tabButton: { padding: '12px 20px', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' },
  tabBadge: { background: '#e2e8f0', color: '#475569', borderRadius: '12px', padding: '0 8px', fontSize: '12px', fontWeight: '600' },
  tabContent: { minHeight: '200px' },
  
  // Overview Stats
  overviewStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' },
  overviewStat: { background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' },
  overviewStatValue: { fontSize: '28px', fontWeight: '700', color: '#1a237e', display: 'block' },
  overviewStatLabel: { fontSize: '14px', color: '#64748b' },
  
  // Quick Categories
  quickCategories: { background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' },
  quickCategoriesTitle: { fontSize: '16px', fontWeight: '600', color: '#1a202c', margin: '0 0 12px 0' },
  quickCategoriesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' },
  quickCategoryItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px' },
  quickCategoryName: { fontSize: '14px', color: '#475569' },
  quickCategoryScore: { fontSize: '14px', fontWeight: '600', color: '#1a237e' },
  quickCategoriesMore: { fontSize: '13px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' },
  
  // Supervisor Note
  supervisorNote: { background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  
  // Categories
  categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  categoryCard: { background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  categoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  categoryName: { fontSize: '14px', fontWeight: '500', color: '#475569' },
  categoryScore: { fontSize: '20px', fontWeight: '700', color: '#1a237e' },
  categoryBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' },
  categoryBarFill: { height: '100%', background: 'linear-gradient(90deg, #1a237e, #0d47a1)', borderRadius: '4px' },
  categoryDetail: { fontSize: '12px', color: '#94a3b8' },
  categoryComment: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  categoryGrade: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  
  // Strengths
  strengthGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  strengthCard: { display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  strengthRank: { width: '32px', height: '32px', background: '#2e7d32', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  strengthContent: { flex: 1 },
  strengthName: { fontSize: '14px', fontWeight: '500', color: '#1a202c', marginBottom: '4px' },
  strengthScore: { fontSize: '16px', fontWeight: '700', color: '#2e7d32', marginBottom: '4px' },
  strengthBar: { height: '4px', background: '#e8f5e9', borderRadius: '2px', overflow: 'hidden' },
  strengthBarFill: { height: '100%', background: 'linear-gradient(90deg, #43a047, #2e7d32)', borderRadius: '2px' },
  strengthComment: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  
  // Development Areas
  developmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  developmentCard: { display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  developmentRank: { width: '32px', height: '32px', background: '#c62828', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  developmentContent: { flex: 1 },
  developmentName: { fontSize: '14px', fontWeight: '500', color: '#1a202c', marginBottom: '4px' },
  developmentScore: { fontSize: '16px', fontWeight: '700', color: '#c62828', marginBottom: '4px' },
  developmentBar: { height: '4px', background: '#ffebee', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' },
  developmentBarFill: { height: '100%', background: 'linear-gradient(90deg, #ef5350, #c62828)', borderRadius: '2px' },
  developmentGap: { fontSize: '12px', color: '#94a3b8' },
  developmentComment: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  
  // Recommendations
  recommendationList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  recommendationCard: { background: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  recommendationHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' },
  priorityBadge: { padding: '2px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: 'white' },
  recommendationCategory: { fontSize: '14px', fontWeight: '600', color: '#1a202c' },
  recommendationGap: { fontSize: '12px', color: '#94a3b8' },
  recommendationText: { fontSize: '14px', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.6 },
  recommendationAction: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  recommendationImpact: { fontSize: '13px', color: '#64748b', marginTop: '4px' },
  
  // Empty State
  emptyState: { textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' },
  
  // Actions
  actions: { textAlign: 'center', marginTop: '30px' },
  printButton: { padding: '12px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#64748b' }
};
