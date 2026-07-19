// components/admin/AssessmentExpiration.js

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';

export default function AssessmentExpiration() {
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentExpiration, setCurrentExpiration] = useState(null);

  // Fetch current expiration date
  useEffect(() => {
    fetchCurrentExpiration();
  }, []);

  async function fetchCurrentExpiration() {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('expires_at')
        .eq('title', 'National Service Recruitment Assessment')
        .single();

      if (error) throw error;
      
      if (data?.expires_at) {
        setCurrentExpiration(new Date(data.expires_at).toLocaleDateString());
        setExpiresAt(data.expires_at.split('T')[0]);
      }
    } catch (error) {
      console.error('Error fetching expiration:', error);
    }
  }

  async function handleSetExpiration(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/set-assessment-expiration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          expiresAt: new Date(expiresAt).toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to set expiration');
      }

      setMessage({ type: 'success', text: 'Expiration date set successfully!' });
      fetchCurrentExpiration();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveExpiration() {
    if (!confirm('Remove expiration date? The assessment will never expire.')) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch('/api/admin/set-assessment-expiration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiresAt: null })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove expiration');
      }

      setMessage({ type: 'success', text: 'Expiration removed successfully!' });
      setCurrentExpiration(null);
      setExpiresAt('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>National Service Assessment Expiration</h3>
      <p style={styles.description}>
        Set a date when the National Service assessment will automatically be blocked for all candidates.
      </p>

      {currentExpiration && (
        <div style={styles.currentInfo}>
          <span style={styles.currentLabel}>Current Expiration:</span>
          <span style={styles.currentDate}>{currentExpiration}</span>
        </div>
      )}

      <form onSubmit={handleSetExpiration} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Expiration Date</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            style={styles.input}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? 'Saving...' : 'Set Expiration'}
          </button>
          
          {currentExpiration && (
            <button
              type="button"
              onClick={handleRemoveExpiration}
              disabled={loading}
              style={styles.removeButton}
            >
              Remove Expiration
            </button>
          )}
        </div>
      </form>

      {message && (
        <div style={{
          ...styles.message,
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b'
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    maxWidth: '500px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0 0 8px 0'
  },
  description: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0'
  },
  currentInfo: {
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  currentLabel: {
    fontSize: '14px',
    color: '#475569'
  },
  currentDate: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569'
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px'
  },
  submitButton: {
    padding: '10px 20px',
    background: '#0b2a4e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    flex: 1
  },
  removeButton: {
    padding: '10px 20px',
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '12px'
  }
};
