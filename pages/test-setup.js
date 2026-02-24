import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

export default function TestSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
  }, []);

  const runSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/setup-competencies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runReprocess = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reprocess-competencies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div style={{ padding: '20px' }}>Please log in first...</div>;
  }

  return (
    <div style={{ 
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#0A1929' }}>🔧 Competency Setup Tool</h1>
      <p>Logged in as: <strong>{session.user.email}</strong></p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={runSetup} 
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Running...' : '🚀 1. Setup Competency Mappings'}
        </button>
        
        <button 
          onClick={runReprocess} 
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Running...' : '🔄 2. Reprocess Existing Results'}
        </button>
      </div>
      
      {result && (
        <div style={{ 
          marginTop: '20px',
          padding: '20px',
          background: result.success ? '#E8F5E9' : '#FFEBEE',
          borderRadius: '8px',
          border: `1px solid ${result.success ? '#4CAF50' : '#F44336'}`
        }}>
          <h3 style={{ 
            margin: '0 0 10px 0',
            color: result.success ? '#2E7D32' : '#C62828'
          }}>
            {result.success ? '✅ Success' : '❌ Failed'}
          </h3>
          
          {result.message && <p>{result.message}</p>}
          
          {result.stats && (
            <div style={{ marginTop: '15px' }}>
              <h4>Statistics:</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>📋 Competencies: <strong>{result.stats.competenciesAdded}</strong></li>
                <li>❓ Questions Processed: <strong>{result.stats.questionsProcessed}</strong></li>
                <li>🔗 Questions Mapped: <strong>{result.stats.questionsMapped}</strong></li>
                <li>📊 Total Mappings: <strong>{result.stats.totalMappings}</strong></li>
                <li>✅ Final Count: <strong>{result.stats.finalCount}</strong></li>
              </ul>
            </div>
          )}
          
          {result.reprocessing && (
            <div style={{ marginTop: '15px' }}>
              <h4>Reprocessing Results:</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>📊 Assessments Found: <strong>{result.reprocessing.totalAssessments}</strong></li>
                <li>✅ Successfully Reprocessed: <strong>{result.reprocessing.successCount}</strong></li>
                <li>❌ Failed: <strong>{result.reprocessing.failedCount}</strong></li>
              </ul>
            </div>
          )}
          
          {result.error && (
            <div style={{ color: '#C62828', marginTop: '10px' }}>
              Error: {result.error}
            </div>
          )}
          
          <pre style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '12px',
            marginTop: '20px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
