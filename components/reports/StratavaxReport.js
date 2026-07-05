// components/reports/StratavaxReport.js

import React from 'react';

export default function StratavaxReport({ result, candidate, assessment, onBack }) {
  if (!result) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  console.log('[StratavaxReport] Result data:', result);

  // Extract data with proper fallbacks
  const candidateName = candidate?.full_name || result?.candidate_profiles?.full_name || result?.candidate_profiles?.fullName || 'Candidate';
  const candidateEmail = candidate?.email || result?.candidate_profiles?.email || result?.candidate_profiles?.emailAddress || '';
  const assessmentTitle = assessment?.title || result?.assessments?.title || result?.assessment_title || 'Assessment';
  
  // Get score - handle various possible field names and types
  const score = result?.percentage_score || result?.score || result?.percentage || 0;
  const parsedScore = typeof score === 'string' ? parseFloat(score) : Number(score);
  const finalScore = isNaN(parsedScore) ? 0 : parsedScore;
  
  const classification = result?.classification || getClassification(finalScore);
  const riskLevel = result?.risk_level || result?.riskLevel || getRiskLevel(finalScore);
  
  // Get category scores
  const categoryScores = result?.category_scores || result?.categoryScores || result?.categories || [];
  const strengths = result?.strengths || [];
  const weaknesses = result?.weaknesses || result?.developmentAreas || [];
  const recommendations = result?.recommendations || [];
  
  // Get interpretations
  const interpretations = result?.interpretations || {};
  const executiveSummary = interpretations?.executiveSummary || result?.executive_summary || result?.executiveSummary || '';
  const supervisorImplication = interpretations?.supervisorImplication || result?.supervisor_implication || result?.supervisorImplication || '';
  
  console.log('[StratavaxReport] Parsed score:', finalScore);
  console.log('[StratavaxReport] Category scores:', categoryScores);

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

  const riskColor = riskLevel === 'Low' ? '#2e7d32' :
                    riskLevel === 'Moderate' ? '#1565c0' :
                    riskLevel === 'Elevated' ? '#f57c00' :
                    riskLevel === 'High' ? '#c62828' : '#b71c1c';

  return (
    <div style={styles.container}>
      {/* Back Button */}
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
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{Math.round(finalScore)}%</div>
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
      </div>

      {/* Category Scores */}
      {categoryScores && categoryScores.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Category Scores</h2>
          <div style={styles.categoryGrid}>
            {categoryScores.map((cat, index) => {
              const catScore = cat.percentage || cat.score || 0;
              return (
                <div key={index} style={styles.categoryCard}>
                  <div style={styles.categoryName}>{cat.category || cat.name || 'Category'}</div>
                  <div style={styles.categoryScore}>{Math.round(catScore)}%</div>
                  <div style={styles.categoryBar}>
                    <div style={{ ...styles.categoryBarFill, width: Math.min(catScore, 100) + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🌟 Strengths</h2>
          <div style={styles.strengthGrid}>
            {strengths.map((strength, index) => {
              const strengthScore = strength.percentage || strength.score || 0;
              return (
                <div key={index} style={styles.strengthCard}>
                  <div style={styles.strengthName}>{strength.category || strength.name || 'Area'}</div>
                  <div style={styles.strengthScore}>{Math.round(strengthScore)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Development Areas */}
      {weaknesses && weaknesses.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📈 Development Areas</h2>
          <div style={styles.developmentGrid}>
            {weaknesses.map((area, index) => {
              const areaScore = area.percentage || area.score || 0;
              return (
                <div key={index} style={styles.developmentCard}>
                  <div style={styles.developmentName}>{area.category || area.name || 'Area'}</div>
                  <div style={styles.developmentScore}>{Math.round(areaScore)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Recommendations</h2>
          <div style={styles.recommendationList}>
            {recommendations.map((rec, index) => (
              <div key={index} style={styles.recommendationCard}>
                <div style={styles.recommendationPriority}>
                  <span style={{ 
                    ...styles.priorityBadge,
                    background: rec.priority === 'High' || rec.priority === 'Critical' ? '#c62828' :
                               rec.priority === 'Medium' ? '#f57c00' : '#1565c0'
                  }}>
                    {rec.priority || 'Medium'}
                  </span>
                  <span style={styles.recommendationCategory}>{rec.category || rec.competency || 'Area'}</span>
                </div>
                <p style={styles.recommendationText}>{rec.recommendation || rec.action || rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supervisor Summary */}
      {(executiveSummary || supervisorImplication) && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📝 Supervisor Summary</h2>
          <div style={styles.summaryCard}>
            {executiveSummary && (
              <p style={styles.summaryText}>{executiveSummary}</p>
            )}
            {supervisorImplication && (
              <div style={styles.supervisorNote}>
                <strong>Supervisor Note:</strong>
                <p>{supervisorImplication}</p>
              </div>
            )}
          </div>
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
  header: {
    textAlign: 'center',
    padding: '30px 20px',
    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
    borderRadius: '12px',
    color: 'white',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '18px',
    margin: '0 0 16px 0',
    opacity: 0.9
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
    textAlign: 'center'
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
    color: '#1a237e'
  },
  scoreBand: {
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '8px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a237e',
    marginBottom: '16px'
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  categoryCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    marginBottom: '6px'
  },
  categoryScore: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: '8px'
  },
  categoryBar: {
    height: '6px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px'
  },
  categoryBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #1a237e, #0d47a1)',
    borderRadius: '3px'
  },
  strengthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  strengthCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  strengthName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  strengthScore: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2e7d32'
  },
  developmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  developmentCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  developmentName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  developmentScore: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#c62828'
  },
  recommendationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  recommendationCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  recommendationPriority: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  priorityBadge: {
    padding: '2px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  recommendationCategory: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a202c'
  },
  recommendationText: {
    fontSize: '14px',
    color: '#475569',
    margin: 0,
    lineHeight: 1.6
  },
  summaryCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  summaryText: {
    fontSize: '15px',
    color: '#1a202c',
    lineHeight: 1.6,
    margin: 0
  },
  supervisorNote: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0'
  },
  actions: {
    textAlign: 'center',
    marginTop: '20px'
  },
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
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  }
};
