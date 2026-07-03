// pages/candidate/results/[resultId].js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import { useRequireAuth } from '../../../utils/requireAuth';

export default function CandidateResults() {
  const router = useRouter();
  const { resultId } = router.query;
  const { session, loading: authLoading } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!resultId || !session) return;

    const fetchResult = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load results');
        }

        setResult(data.result);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId, session]);

  const handleBack = () => {
    router.push('/candidate/dashboard');
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2>Error Loading Results</h2>
        <p>{error}</p>
        <button onClick={handleBack} style={styles.errorButton}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={handleBack} style={styles.backButton}>
        ← Back to Dashboard
      </button>
      
      <div style={styles.header}>
        <h1 style={styles.title}>Assessment Complete!</h1>
        <p style={styles.subtitle}>Thank you for completing the assessment.</p>
      </div>

      <div style={styles.content}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Your Score</div>
          <div style={styles.scoreValue}>{result?.percentage_score || 0}%</div>
        </div>
        
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Questions Answered</span>
            <span style={styles.infoValue}>{result?.answered_questions || 0} / {result?.total_questions || 0}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Completed</span>
            <span style={styles.infoValue}>{result?.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Status</span>
            <span style={{ ...styles.infoValue, color: result?.is_valid ? '#2e7d32' : '#f57c00' }}>
              {result?.is_valid ? '✅ Valid Submission' : '⚠️ Auto-submitted'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.note}>
        <p>📋 Your results have been recorded. Your supervisor will review your assessment.</p>
      </div>
    </div>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    background: '#f8fafc'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    maxWidth: '500px',
    margin: '40px auto',
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  errorButton: {
    padding: '10px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px'
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
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
    background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
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
    fontSize: '16px',
    margin: '0',
    opacity: 0.9
  },
  content: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  scoreCard: {
    textAlign: 'center',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '24px'
  },
  scoreLabel: {
    fontSize: '14px',
    color: '#64748b',
    display: 'block',
    marginBottom: '8px'
  },
  scoreValue: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#1a237e'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  infoItem: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    textAlign: 'center'
  },
  infoLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '4px'
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c'
  },
  note: {
    marginTop: '20px',
    padding: '16px',
    background: '#e3f2fd',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#1565c0',
    fontSize: '14px'
  }
};

// Add keyframe animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
