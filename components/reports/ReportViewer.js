// components/reports/ReportViewer.js

import React, { useState, useEffect } from 'react';
import NationalServiceReport from './NationalServiceReport';

// If you have an existing Stratavax report component, import it here
// Otherwise, we'll create a placeholder
import StratavaxReport from './StratavaxReport';

export default function ReportViewer({ resultId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState(null);

  useEffect(() => {
    if (!resultId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/assessment-report/${resultId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load report');
        }

        setReportData(data);
        
        // Determine report type from assessment
        if (data.result?.assessment_id) {
          const assessmentResponse = await fetch(`/api/assessment/${data.result.assessment_id}`);
          const assessmentData = await assessmentResponse.json();
          
          // Check if it's a National Service assessment
          if (assessmentData?.assessment_type?.code === 'national_service') {
            setReportType('national_service');
          } else {
            setReportType('stratavax');
          }
        }

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

  // Render the appropriate report based on type
  if (reportType === 'national_service') {
    return (
      <NationalServiceReport 
        report={reportData.report} 
        onBack={onBack} 
      />
    );
  }

  // Default: Stratavax report (your existing report)
  return (
    <StratavaxReport 
      result={reportData.result}
      onBack={onBack}
    />
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
