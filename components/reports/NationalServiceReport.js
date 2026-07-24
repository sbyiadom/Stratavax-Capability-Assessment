// components/reports/NationalServiceReport.js - DEBUG VERSION

import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';

export default function NationalServiceReport({ report, onBack }) {
  const [behavioralMatrix, setBehavioralMatrix] = useState(null);
  const [showBehavioral, setShowBehavioral] = useState(false);
  const [loadingBehavioral, setLoadingBehavioral] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    console.log('[NationalServiceReport] Report received:', report);
    
    const resultId = report?.resultId || report?.id || report?.result_id;
    if (resultId) {
      fetchBehavioralMatrix(resultId);
    }
  }, [report]);

  const fetchBehavioralMatrix = async (id) => {
    try {
      setLoadingBehavioral(true);
      console.log('[Behavioral] Fetching for resultId:', id);
      
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        console.log('[Behavioral] No token found');
        setLoadingBehavioral(false);
        return;
      }

      const response = await fetch(`/api/assessment/behavioral-matrix?resultId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('[Behavioral] API Response:', data);
      console.log('[Behavioral] Response keys:', Object.keys(data));
      console.log('[Behavioral] behavioralMatrix:', data.behavioralMatrix);
      console.log('[Behavioral] matrixData:', data.matrixData);
      console.log('[Behavioral] data.data:', data.data);
      
      // Store debug info
      setDebugInfo({
        responseKeys: Object.keys(data),
        hasBehavioralMatrix: !!data.behavioralMatrix,
        hasMatrixData: !!data.matrixData,
        hasData: !!data.data,
        behavioralMatrixKeys: data.behavioralMatrix ? Object.keys(data.behavioralMatrix) : [],
        rawResponse: data
      });
      
      // Try to get behavioral matrix from various possible locations
      let matrix = null;
      if (data.behavioralMatrix) {
        matrix = data.behavioralMatrix;
        console.log('[Behavioral] Found behavioralMatrix');
      } else if (data.matrixData) {
        matrix = data.matrixData;
        console.log('[Behavioral] Found matrixData');
      } else if (data.data) {
        matrix = data.data;
        console.log('[Behavioral] Found data.data');
      } else if (data.result) {
        matrix = data.result;
        console.log('[Behavioral] Found data.result');
      }
      
      if (matrix) {
        console.log('[Behavioral] Matrix data:', matrix);
        console.log('[Behavioral] Matrix keys:', Object.keys(matrix));
        console.log('[Behavioral] hasBehavioralData:', matrix.hasBehavioralData);
        console.log('[Behavioral] behavior:', matrix.behavior);
        console.log('[Behavioral] behavior keys:', matrix.behavior ? Object.keys(matrix.behavior) : []);
        
        setBehavioralMatrix(matrix);
      } else {
        console.log('[Behavioral] No matrix data found in response');
        // Try to find behavioral data anywhere in the response
        console.log('[Behavioral] Full response structure:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('Error fetching behavioral matrix:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoadingBehavioral(false);
    }
  };

  const toggleBehavioral = () => {
    setShowBehavioral(!showBehavioral);
  };

  // ... (keep all your other helper functions - formatTime, safeString, etc.) ...
  // I'll include them below to keep this concise

  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  // ============================================================
  // CHECK IF BEHAVIORAL DATA EXISTS - FIXED
  // ============================================================
  const hasBehavioralData = 
    behavioralMatrix?.hasBehavioralData === true ||
    (behavioralMatrix?.behavior && Object.keys(behavioralMatrix.behavior).length > 0) ||
    (behavioralMatrix?.timing && Object.keys(behavioralMatrix.timing).length > 0) ||
    behavioralMatrix !== null;

  const hasViolations = 
    (behavioralMatrix?.behavior?.tabSwitches || 0) > 0 ||
    (behavioralMatrix?.behavior?.violations || 0) > 0 ||
    (behavioralMatrix?.behavior?.copyAttempts || 0) > 0 ||
    (behavioralMatrix?.behavior?.pasteAttempts || 0) > 0 ||
    (behavioralMatrix?.behavior?.rightClickAttempts || 0) > 0;

  // ============================================================
  // RENDER DEBUG INFO AT TOP
  // ============================================================
  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6', fontSize: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#dc3545' }}>🔍 Debug Info</h4>
          <p><strong>Response Keys:</strong> {debugInfo.responseKeys?.join(', ') || 'none'}</p>
          <p><strong>Has behavioralMatrix:</strong> {debugInfo.hasBehavioralMatrix ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Has matrixData:</strong> {debugInfo.hasMatrixData ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Has data.data:</strong> {debugInfo.hasData ? '✅ Yes' : '❌ No'}</p>
          <p><strong>behavioralMatrix keys:</strong> {debugInfo.behavioralMatrixKeys?.join(', ') || 'none'}</p>
          <p><strong>behavioralMatrix hasBehavioralData:</strong> {debugInfo.behavioralMatrixKeys?.includes('hasBehavioralData') ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Loading:</strong> {loadingBehavioral ? '⏳ Loading...' : '✅ Done'}</p>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>View Full Response</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', maxHeight: '300px', overflow: 'auto', background: '#fff', padding: '12px', borderRadius: '4px', border: '1px solid #ddd' }}>
              {JSON.stringify(debugInfo.rawResponse, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* ... keep the rest of your report content ... */}
      
      {/* ============================================================
          BEHAVIORAL MATRIX SECTION - DEBUGGING
          ============================================================ */}
      <div style={styles.behavioralToggleContainer}>
        <button onClick={toggleBehavioral} style={styles.behavioralToggleButton}>
          {showBehavioral ? 'Hide Behavioral Matrix' : 'Show Behavioral Matrix'}
        </button>
      </div>

      {showBehavioral && (
        <div style={styles.behavioralSection}>
          <h3 style={styles.behavioralTitle}>Behavioral Matrix</h3>
          
          {loadingBehavioral ? (
            <div style={styles.loadingBehavioral}>
              <p>Loading behavioral data...</p>
            </div>
          ) : behavioralMatrix && hasBehavioralData ? (
            <>
              <p style={{ color: '#166534', fontWeight: '600', marginBottom: '12px' }}>
                ✅ Behavioral data found! ({Object.keys(behavioralMatrix).length} top-level keys)
              </p>
              {/* Display matrix data */}
              <div style={styles.behavioralStats}>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Tab Switches</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.tabSwitches || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Violations</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.violations || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Answer Changes</span>
                  <span style={styles.behavioralValue}>
                    {behavioralMatrix.behavior?.answerChanges || 0}
                  </span>
                </div>
                <div style={styles.behavioralStat}>
                  <span style={styles.behavioralLabel}>Risk Level</span>
                  <span style={{
                    ...styles.riskBadge,
                    background: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#fee2e2' :
                               behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#fef3c7' : '#dcfce7',
                    color: behavioralMatrix.riskAssessment?.level === 'High Risk' ? '#991b1b' :
                           behavioralMatrix.riskAssessment?.level === 'Medium Risk' ? '#92400e' : '#166534'
                  }}>
                    {behavioralMatrix.riskAssessment?.level || 'Low Risk'}
                  </span>
                </div>
              </div>
              
              {!hasViolations ? (
                <div style={styles.cleanAssessment}>
                  <p style={{ color: '#166534', fontWeight: '600' }}>
                    ✅ This candidate completed the assessment with no behavioral violations detected.
                  </p>
                </div>
              ) : (
                <div style={styles.riskSummary}>
                  <p>{behavioralMatrix.riskAssessment?.summary || 'Behavioral data available for review.'}</p>
                </div>
              )}
            </>
          ) : (
            <div style={styles.noBehavioralData}>
              <p>No behavioral data is available for this assessment.</p>
              <p style={styles.noBehavioralSubtext}>
                Behavioral data (tab switches, violations, answer changes, etc.) 
                is only tracked for assessments completed after the behavioral tracking feature was implemented.
              </p>
              {debugInfo && (
                <p style={{ fontSize: '12px', color: '#dc3545', marginTop: '12px' }}>
                  Debug: hasBehavioralData={String(hasBehavioralData)}, 
                  behavioralMatrix={behavioralMatrix ? 'exists' : 'null'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* ... keep the rest of your component */}
    </div>
  );
}

// ... keep all your styles and helper functions ...
