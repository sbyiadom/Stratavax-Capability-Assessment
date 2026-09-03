// components/ResetAssessmentButton.js
import { useState } from 'react';
import { supabase } from '../supabase/client';

export default function ResetAssessmentButton({ 
  candidateId, 
  assessmentId, 
  assessmentName,
  candidateName,
  onReset,
  variant = 'button' // 'button' or 'icon' or 'inline'
}) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use the bulk reset API (handles single reset too)
      const response = await fetch('/api/supervisor/bulk-reset-assessments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [
            {
              userId: candidateId,
              assessmentId: assessmentId
            }
          ],
          confirmBulkReset: true,
          dryRun: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to reset assessment');
      }

      // Check if the reset was successful
      const result = data.results && data.results[0];
      if (result && result.reset === false) {
        throw new Error(result.error || 'Reset failed');
      }

      alert(`✅ "${assessmentName}" has been reset successfully! ${candidateName ? `${candidateName} can now retake it.` : ''}`);
      
      setShowConfirm(false);
      
      if (onReset) {
        onReset();
      }

    } catch (error) {
      console.error('Reset error:', error);
      setError(error.message || 'Failed to reset assessment');
      alert(`❌ Failed to reset: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Icon variant (small, for tables)
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          title="Reset Assessment"
          style={{
            background: 'none',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            opacity: loading ? 0.5 : 1,
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s',
            color: '#dc2626'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {loading ? '⏳' : '🔄'}
        </button>

        {showConfirm && (
          <ResetConfirmModal
            assessmentName={assessmentName}
            candidateName={candidateName}
            loading={loading}
            onConfirm={handleReset}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </>
    );
  }

  // Inline variant (small button)
  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          style={{
            padding: '4px 12px',
            background: loading ? '#94a3b8' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          {loading ? '...' : 'Reset'}
        </button>

        {showConfirm && (
          <ResetConfirmModal
            assessmentName={assessmentName}
            candidateName={candidateName}
            loading={loading}
            onConfirm={handleReset}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </>
    );
  }

  // Default: Full button
  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        style={{
          padding: '8px 20px',
          background: loading ? '#94a3b8' : '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.2)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#b91c1c';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = loading ? '#94a3b8' : '#dc2626';
        }}
      >
        {loading ? '⏳ Resetting...' : '🔄 Reset Assessment'}
      </button>

      {showConfirm && (
        <ResetConfirmModal
          assessmentName={assessmentName}
          candidateName={candidateName}
          loading={loading}
          onConfirm={handleReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// Reset Confirmation Modal Component
function ResetConfirmModal({ assessmentName, candidateName, loading, onConfirm, onCancel }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Confirm Assessment Reset</h3>
        <p style={styles.modalText}>
          Are you sure you want to reset <strong>"{assessmentName}"</strong>
          {candidateName && <span> for <strong>{candidateName}</strong></span>}?
          <br /><br />
          This will:
          <br />
          • Delete all previous responses and answers
          <br />
          • Remove the completed status
          <br />
          • Clear all behavioral metrics and violations
          <br />
          • Allow the candidate to retake the assessment from scratch
          <br /><br />
          <span style={{ color: '#dc2626', fontWeight: '600' }}>
            ⚠️ This action cannot be undone!
          </span>
        </p>
        {loading && (
          <div style={styles.loadingBar}>
            <span style={styles.loadingSpinner}></span>
            Resetting assessment...
          </div>
        )}
        <div style={styles.modalActions}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={styles.modalCancel}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...styles.modalConfirm,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Resetting...' : 'Yes, Reset Assessment'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.2s ease'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 12px 0'
  },
  modalText: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '0 0 24px 0'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  modalCancel: {
    padding: '10px 24px',
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  modalConfirm: {
    padding: '10px 24px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s'
  },
  loadingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    background: '#f1f5f9',
    borderRadius: '8px',
    marginBottom: '16px',
    color: '#475569',
    fontSize: '14px'
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(0,0,0,0.1)',
    borderTop: '3px solid #dc2626',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block'
  }
};

// Add animation styles to global or component
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;
document.head.appendChild(styleSheet);
