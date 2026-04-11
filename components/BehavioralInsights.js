import React from 'react';

export default function BehavioralInsights({ behavioralData, candidateName }) {
  if (!behavioralData) return null;
  
  const getWorkStyleIcon = (style) => {
    const icons = {
      'Quick Decision Maker': '⚡',
      'Methodical Analyst': '🔍',
      'Anxious Reviser': '🔄',
      'Strategic Reviewer': '📋',
      'Adaptive Learner': '📈',
      'Balanced': '⚖️',
      'Non-Linear Thinker': '🌀',
      'Inconsistent Responder': '📊'
    };
    return icons[style] || '📊';
  };
  
  const getWorkStyleColor = (style) => {
    const colors = {
      'Quick Decision Maker': '#4CAF50',
      'Methodical Analyst': '#2196F3',
      'Anxious Reviser': '#FF9800',
      'Strategic Reviewer': '#9C27B0',
      'Adaptive Learner': '#00BCD4',
      'Balanced': '#607D8B',
      'Non-Linear Thinker': '#FF5722',
      'Inconsistent Responder': '#F44336'
    };
    return colors[style] || '#2196F3';
  };
  
  const getConfidenceColor = (level) => {
    switch(level) {
      case 'High': return '#4CAF50';
      case 'Moderate': return '#FF9800';
      case 'Low': return '#F44336';
      default: return '#2196F3';
    }
  };
  
  const getConfidenceIcon = (level) => {
    switch(level) {
      case 'High': return '💪';
      case 'Moderate': return '👍';
      case 'Low': return '🤔';
      default: return '📊';
    }
  };
  
  const getAttentionIcon = (span) => {
    if (span.includes('Declining') || span.includes('Fatigue')) return '😴';
    if (span.includes('Improving')) return '📈';
    if (span.includes('Consistent')) return '⚡';
    return '📊';
  };
  
  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🧠 Behavioral Insights</h3>
        <p style={styles.subtitle}>How {candidateName} approached the assessment - unique behavioral patterns</p>
      </div>
      
      {/* Work Style Card */}
      <div style={{
        ...styles.workStyleCard,
        borderTop: `4px solid ${getWorkStyleColor(behavioralData.work_style)}`
      }}>
        <div style={styles.workStyleHeader}>
          <span style={styles.workStyleIcon}>{getWorkStyleIcon(behavioralData.work_style)}</span>
          <div>
            <span style={styles.workStyleLabel}>Work Style</span>
            <span style={styles.workStyleValue}>{behavioralData.work_style}</span>
          </div>
        </div>
        <div style={styles.workStyleMetrics}>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Confidence</span>
            <span style={{...styles.metricValue, color: getConfidenceColor(behavioralData.confidence_level)}}>
              {getConfidenceIcon(behavioralData.confidence_level)} {behavioralData.confidence_level}
            </span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Attention Span</span>
            <span style={styles.metricValue}>
              {getAttentionIcon(behavioralData.attention_span)} {behavioralData.attention_span}
            </span>
          </div>
          <div style={styles.metric}>
            <span style={styles.metricLabel}>Decision Pattern</span>
            <span style={styles.metricValue}>{behavioralData.decision_pattern}</span>
          </div>
        </div>
      </div>
      
      {/* Timing Metrics */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>⏱️ Timing Analysis</h4>
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{formatTime(behavioralData.avg_response_time)}</span>
            <span style={styles.metricCardLabel}>Avg Response Time</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{formatTime(behavioralData.fastest_response)}</span>
            <span style={styles.metricCardLabel}>Fastest Response</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{formatTime(behavioralData.slowest_response)}</span>
            <span style={styles.metricCardLabel}>Slowest Response</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>
              {behavioralData.fatigue_factor > 0 ? '+' : ''}{behavioralData.fatigue_factor}s
            </span>
            <span style={styles.metricCardLabel}>Fatigue Factor</span>
          </div>
        </div>
        
        {/* Fatigue Warning */}
        {behavioralData.fatigue_factor > 30 && (
          <div style={styles.warningBox}>
            <span style={styles.warningIcon}>⚠️</span>
            <div>
              <strong>Significant fatigue detected</strong>
              <p style={styles.warningText}>Response times increased by {behavioralData.fatigue_factor}s in the second half. Consider break strategies for longer assessments.</p>
            </div>
          </div>
        )}
        
        {/* Consistency Indicator */}
        {behavioralData.time_variance < 20 && behavioralData.avg_response_time > 0 && (
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✅</span>
            <div>
              <strong>Highly Consistent</strong>
              <p style={styles.successText}>Response times were very consistent throughout the assessment, indicating good focus and pacing.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Answer Behavior */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🔄 Answer Behavior</h4>
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{behavioralData.total_answer_changes}</span>
            <span style={styles.metricCardLabel}>Answer Changes</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{behavioralData.improvement_rate}%</span>
            <span style={styles.metricCardLabel}>Improvement Rate</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{behavioralData.first_instinct_accuracy}%</span>
            <span style={styles.metricCardLabel}>First Instinct Accuracy</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{behavioralData.revisit_rate}%</span>
            <span style={styles.metricCardLabel}>Question Revisit Rate</span>
          </div>
        </div>
        
        {/* First Instinct Insight */}
        {behavioralData.first_instinct_accuracy > 80 && behavioralData.total_answer_changes > 3 && (
          <div style={styles.tipBox}>
            <span style={styles.tipIcon}>💡</span>
            <div>
              <strong>First Instinct Insight</strong>
              <p style={styles.tipText}>First instinct accuracy is high ({behavioralData.first_instinct_accuracy}%) but they changed answers {behavioralData.total_answer_changes} times. Encourage trusting initial responses.</p>
            </div>
          </div>
        )}
        
        {/* Improvement Insight */}
        {behavioralData.improvement_rate > 70 && behavioralData.total_answer_changes > 0 && (
          <div style={styles.tipBox}>
            <span style={styles.tipIcon}>📈</span>
            <div>
              <strong>Adaptive Learner</strong>
              <p style={styles.tipText}>Answer changes improved scores {behavioralData.improvement_rate}% of the time. This candidate learns from mistakes and adjusts effectively.</p>
            </div>
          </div>
        )}
        
        {/* Review Pattern Insight */}
        {behavioralData.revisit_rate > 50 && (
          <div style={styles.tipBox}>
            <span style={styles.tipIcon}>📋</span>
            <div>
              <strong>Strategic Reviewer</strong>
              <p style={styles.tipText}>Revisited {behavioralData.revisit_rate}% of questions. This thorough approach ensures quality but may benefit from time management strategies.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Pattern */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🗺️ Navigation Pattern</h4>
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{behavioralData.linearity_score}%</span>
            <span style={styles.metricCardLabel}>Linearity Score</span>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricCardValue}>{behavioralData.total_question_visits}</span>
            <span style={styles.metricCardLabel}>Total Visits</span>
          </div>
        </div>
        
        {/* Linearity Insight */}
        {behavioralData.linearity_score < 70 && (
          <div style={styles.tipBox}>
            <span style={styles.tipIcon}>🌀</span>
            <div>
              <strong>Non-Linear Approach</strong>
              <p style={styles.tipText}>This candidate jumps between questions rather than following a linear path. Consider providing a 'mark for review' feature to help organize their approach.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Support Recommendations */}
      <div style={styles.supportSection}>
        <h4 style={styles.supportTitle}>🎯 Recommended Support & Development</h4>
        <p style={styles.supportText}>{behavioralData.recommended_support}</p>
        {behavioralData.development_focus_areas && behavioralData.development_focus_areas.length > 0 && (
          <div style={styles.focusAreas}>
            <span style={styles.focusLabel}>Focus Areas:</span>
            {behavioralData.development_focus_areas.map((area, idx) => (
              <span key={idx} style={styles.focusTag}>{area}</span>
            ))}
          </div>
        )}
      </div>
      
      {/* Summary Card */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryHeader}>
          <span style={styles.summaryIcon}>📋</span>
          <span style={styles.summaryTitle}>At a Glance</span>
        </div>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Work Style</span>
            <span style={styles.summaryValue}>{behavioralData.work_style}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Decision Pattern</span>
            <span style={styles.summaryValue}>{behavioralData.decision_pattern}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Support Priority</span>
            <span style={styles.summaryValue}>{behavioralData.development_focus_areas?.[0] || 'Balanced approach'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '30px',
    marginBottom: '30px'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B'
  },
  workStyleCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0'
  },
  workStyleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px'
  },
  workStyleIcon: {
    fontSize: '40px'
  },
  workStyleLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748B',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  workStyleValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929'
  },
  workStyleMetrics: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    paddingTop: '12px',
    borderTop: '1px solid #E2E8F0'
  },
  metric: {
    flex: 1,
    minWidth: '100px'
  },
  metricLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  metricValue: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 600,
    color: '#0A1929'
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '16px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px'
  },
  metricCard: {
    background: '#F8FAFC',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #E2E8F0'
  },
  metricCardValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A1929',
    marginBottom: '8px'
  },
  metricCardLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  warningBox: {
    marginTop: '16px',
    padding: '16px',
    background: '#FFF3E0',
    borderRadius: '12px',
    display: 'flex',
    gap: '12px',
    borderLeft: '4px solid #F57C00'
  },
  warningIcon: {
    fontSize: '20px'
  },
  warningText: {
    fontSize: '13px',
    color: '#E65100',
    marginTop: '4px',
    lineHeight: '1.5'
  },
  successBox: {
    marginTop: '16px',
    padding: '16px',
    background: '#E8F5E9',
    borderRadius: '12px',
    display: 'flex',
    gap: '12px',
    borderLeft: '4px solid #4CAF50'
  },
  successIcon: {
    fontSize: '20px'
  },
  successText: {
    fontSize: '13px',
    color: '#2E7D32',
    marginTop: '4px',
    lineHeight: '1.5'
  },
  tipBox: {
    marginTop: '16px',
    padding: '16px',
    background: '#E3F2FD',
    borderRadius: '12px',
    display: 'flex',
    gap: '12px',
    borderLeft: '4px solid #2196F3'
  },
  tipIcon: {
    fontSize: '20px'
  },
  tipText: {
    fontSize: '13px',
    color: '#1565C0',
    marginTop: '4px',
    lineHeight: '1.5'
  },
  supportSection: {
    background: '#F0F4F8',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '24px'
  },
  supportTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '12px'
  },
  supportText: {
    fontSize: '14px',
    color: '#2D3748',
    lineHeight: '1.6',
    marginBottom: '16px'
  },
  focusAreas: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center'
  },
  focusLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#0A1929'
  },
  focusTag: {
    padding: '4px 12px',
    background: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#475569',
    border: '1px solid #E2E8F0'
  },
  summaryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '20px',
    border: '1px solid #E2E8F0'
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  summaryIcon: {
    fontSize: '18px'
  },
  summaryTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  summaryGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  summaryItem: {
    flex: 1,
    minWidth: '120px'
  },
  summaryLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '4px'
  },
  summaryValue: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  }
};
