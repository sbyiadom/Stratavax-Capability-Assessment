// components/reports/ReportViewer.js

import React, { useState, useEffect } from 'react';
import NationalServiceReport from './NationalServiceReport';
import StratavaxReport from './StratavaxReport';

export default function ReportViewer({ resultId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [reportType, setReportType] = useState(null);

  useEffect(() => {
    if (!resultId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        
        // Fetch the result
        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
        }

        console.log('[ReportViewer] Data received:', data);
        
        // Extract data from response
        const result = data.result || data;
        const report = result?.report_data || data.report || {};
        
        setResultData(result);
        setReportData(report);
        
        // Extract candidate and assessment info
        if (result) {
          const candidate = result.candidate_profiles || 
                           result.candidateProfile || 
                           result.candidate || 
                           {};
          setCandidateData(candidate);
          
          const assessment = result.assessments || 
                            result.assessment || 
                            result.assessment_data ||
                            {};
          setAssessmentData(assessment);
        }
        
        // Determine report type from report_data.reportType
        const reportTypeFromData = report?.reportType || 'stratavax';
        setReportType(reportTypeFromData);
        console.log('[ReportViewer] Report type:', reportTypeFromData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReport();
  }, [resultId]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <h2>Error Loading Report</h2>
        <p>{error}</p>
        <button onClick={onBack} style={styles.errorButton}>Go Back</button>
      </div>
    );
  }

  // ============================================================
  // CHANGE 4: Route to appropriate report component
  // ============================================================
  
  // National Service Report
  if (reportType === 'national_service' && reportData) {
    console.log('[ReportViewer] Rendering National Service Report');
    return (
      <NationalServiceReport 
        report={reportData} 
        onBack={onBack} 
      />
    );
  }

  // Stratavax Report (default)
  if (reportData && resultData) {
    console.log('[ReportViewer] Rendering Stratavax Report');
    return (
      <StratavaxReport 
        result={resultData}
        candidate={candidateData}
        assessment={assessmentData}
        onBack={onBack}
      />
    );
  }

  // Fallback - should never reach here
  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}
      
      <div style={styles.header}>
        <h1 style={styles.title}>Assessment Results</h1>
        <p style={styles.subtitle}>Report</p>
      </div>

      <div style={styles.content}>
        <div style={styles.scoreDisplay}>
          <div style={styles.scoreItem}>
            <span style={styles.scoreLabel}>Overall Score</span>
            <span style={styles.scoreValue}>{resultData?.percentage_score || 0}%</span>
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '16px'
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
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  }
};

// Add keyframe animation for spinner
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
