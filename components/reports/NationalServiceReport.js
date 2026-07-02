// components/reports/NationalServiceReport.js

import React from 'react';

export default function NationalServiceReport({ report, onBack }) {
  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  const {
    candidateName,
    assessmentName,
    dimensions,
    recommendation,
    categoryBreakdown,
    statistics,
    executiveSummary
  } = report;

  const getRecommendationColor = (level) => {
    switch (level) {
      case 'Highly Recommended': return '#2e7d32';
      case 'Recommended': return '#1565c0';
      case 'Reserve Pool': return '#f57c00';
      case 'Not Recommended': return '#c62828';
      default: return '#333';
    }
  };

  const getBandColor = (band) => {
    switch (band) {
      case 'Excellent':
      case 'Exceptional': return '#2e7d32';
      case 'Ready':
      case 'High Potential': return '#1565c0';
      case 'Developing':
      case 'Moderate Potential': return '#f57c00';
      case 'Needs Improvement':
      case 'Development Required': return '#c62828';
      default: return '#333';
    }
  };

  return (
    <div style={styles.container}>
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>National Service Recruitment Assessment</h1>
        <p style={styles.subtitle}>Report for {candidateName}</p>
        <p style={styles.date}>Completed: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Executive Score Cards */}
      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Workplace Readiness</div>
          <div style={styles.scoreValue}>{dimensions.workplaceReadiness}%</div>
          <div style={{ ...styles.scoreBand, color: getBandColor(executiveSummary.workplaceBand) }}>
            {executiveSummary.workplaceBand}
          </div>
        </div>

        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Intellectual Capability</div>
          <div style={styles.scoreValue}>{dimensions.intellectualCapability}%</div>
          <div style={{ ...styles.scoreBand, color: getBandColor(executiveSummary.intellectualBand) }}>
            {executiveSummary.intellectualBand}
          </div>
        </div>

        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{dimensions.overallScore}%</div>
        </div>

        <div style={{ ...styles.scoreCard, background: getRecommendationColor(recommendation.level) + '15', border: '2px solid ' + getRecommendationColor(recommendation.level) }}>
          <div style={styles.scoreLabel}>Final Recommendation</div>
          <div style={{ ...styles.scoreValue, fontSize: '20px', color: getRecommendationColor(recommendation.level) }}>
            {recommendation.level}
          </div>
        </div>
      </div>

      {/* Recommendation Description */}
      <div style={styles.recommendationBox}>
        <p style={styles.recommendationText}>{recommendation.description}</p>
      </div>

      {/* Category Breakdown */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Category Breakdown</h2>
        <div style={styles.categoryGrid}>
          {categoryBreakdown.map((cat, index) => (
            <div key={index} style={styles.categoryCard}>
              <div style={styles.categoryName}>{cat.category}</div>
              <div style={styles.categoryScore}>{cat.percentage}%</div>
              <div style={styles.categoryBar}>
                <div style={{ ...styles.categoryBarFill, width: Math.min(cat.percentage, 100) + '%' }} />
              </div>
              <div style={styles.categoryDetail}>
                {Math.round(cat.earned)} / {Math.round(cat.max)} points
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Assessment Statistics</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{statistics.totalAnswered}</div>
            <div style={styles.statLabel}>Answered Questions</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{statistics.totalQuestions}</div>
            <div style={styles.statLabel}>Total Questions</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{Math.round((statistics.totalAnswered / statistics.totalQuestions) * 100)}%</div>
            <div style={styles.statLabel}>Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Printable version button */}
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
    margin: '0 0 4px 0',
    opacity: 0.9
  },
  date: {
    fontSize: '14px',
    margin: '0',
    opacity: 0.7
  },
  scoreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
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
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '8px'
  },
  recommendationBox: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    border: '1px solid #e2e8f0'
  },
  recommendationText: {
    fontSize: '16px',
    color: '#1a202c',
    margin: 0,
    lineHeight: 1.6
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
    borderRadius: '3px',
    transition: 'width 0.8s ease-out'
  },
  categoryDetail: {
    fontSize: '12px',
    color: '#94a3b8'
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
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e'
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
