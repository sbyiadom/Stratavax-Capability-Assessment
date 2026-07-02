// components/reports/StratavaxReport.js

import React from 'react';

export default function StratavaxReport({ result, onBack }) {
  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}
      
      <div style={styles.header}>
        <h1 style={styles.title}>Stratavax Assessment Report</h1>
        <p style={styles.subtitle}>Candidate Assessment Results</p>
      </div>

      <div style={styles.content}>
        <h2>Assessment Results</h2>
        <div style={styles.scoreDisplay}>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>Overall Score</span>
            <span style={styles.scoreValue}>{result?.percentage_score || 0}%</span>
          </div>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>Classification</span>
            <span style={styles.scoreValue}>{result?.classification || 'N/A'}</span>
          </div>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>Answered</span>
            <span style={styles.scoreValue}>{result?.answered_questions || 0} / {result?.total_questions || 0}</span>
          </div>
        </div>
      </div>

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
    background: 'linear-gradient(135deg, #0097a7 0%, #006064 100%)',
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
    margin: '0',
    opacity: 0.9
  },
  content: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  scoreDisplay: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '16px'
  },
  scoreItem: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    textAlign: 'center'
  },
  scoreLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '4px'
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a237e'
  },
  actions: {
    textAlign: 'center',
    marginTop: '20px'
  },
  printButton: {
    padding: '12px 24px',
    background: '#0097a7',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
