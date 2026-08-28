// pages/supervisor/reports/debug.js
import { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

export default function DebugReports() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDatabase();
  }, []);

  async function checkDatabase() {
    try {
      setLoading(true);

      // 1. Check assessment_results table structure - get first row
      const { data: firstResult, error: resultError } = await supabase
        .from('assessment_results')
        .select('*')
        .limit(1);

      console.log('First assessment result:', firstResult);
      console.log('Result error:', resultError);

      // 2. Get all column names from assessment_results
      let columnNames = [];
      if (firstResult && firstResult.length > 0) {
        columnNames = Object.keys(firstResult[0]);
      }

      // 3. Try to find which column holds the candidate reference
      let candidateIdColumn = null;
      let userIdColumn = null;
      let candidateRefColumn = null;

      columnNames.forEach(col => {
        const lower = col.toLowerCase();
        if (lower.includes('candidate')) candidateIdColumn = col;
        if (lower.includes('user')) userIdColumn = col;
        if (lower.includes('ref') || lower.includes('foreign')) candidateRefColumn = col;
      });

      // 4. Get all assessment_results
      const { data: allResults } = await supabase
        .from('assessment_results')
        .select('*');

      // 5. Get candidates
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email')
        .limit(5);

      // 6. Try to join using different possible column names
      let joinResults = {};
      
      if (candidateIdColumn) {
        const { data: joined } = await supabase
          .from('assessment_results')
          .select(`
            *,
            candidate_profiles!${candidateIdColumn} (id, full_name, email)
          `)
          .limit(5);
        joinResults[candidateIdColumn] = joined;
      }

      if (userIdColumn && userIdColumn !== candidateIdColumn) {
        const { data: joined } = await supabase
          .from('assessment_results')
          .select(`
            *,
            candidate_profiles!${userIdColumn} (id, full_name, email)
          `)
          .limit(5);
        joinResults[userIdColumn] = joined;
      }

      // 7. Check assessments table
      const { data: assessments } = await supabase
        .from('assessments')
        .select('*')
        .limit(5);

      setData({
        assessmentResults: allResults || [],
        assessmentResultsCount: allResults?.length || 0,
        columnNames: columnNames,
        candidateIdColumn: candidateIdColumn,
        userIdColumn: userIdColumn,
        candidateRefColumn: candidateRefColumn,
        joinResults: joinResults,
        assessments: assessments || [],
        assessmentsCount: assessments?.length || 0,
        candidates: candidates || [],
        firstResult: firstResult?.[0] || null,
        raw: {
          firstResult: firstResult,
          allResults: allResults,
          candidates: candidates,
          assessments: assessments
        }
      });

    } catch (error) {
      console.error('Debug error:', error);
      setData({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Loading debug data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <h1 style={styles.title}>🔍 Database Debug</h1>

        <div style={styles.card}>
          <h2>Assessment Results Table</h2>
          <p><strong>Total Records:</strong> {data.assessmentResultsCount}</p>
          <p><strong>Column Names:</strong></p>
          <pre style={styles.pre}>{JSON.stringify(data.columnNames, null, 2)}</pre>
          
          <p><strong>Detected Candidate Columns:</strong></p>
          <ul>
            <li><strong>Candidate ID Column:</strong> {data.candidateIdColumn || 'Not found'}</li>
            <li><strong>User ID Column:</strong> {data.userIdColumn || 'Not found'}</li>
            <li><strong>Reference Column:</strong> {data.candidateRefColumn || 'Not found'}</li>
          </ul>
        </div>

        <div style={styles.card}>
          <h2>First Assessment Result</h2>
          <pre style={styles.pre}>{JSON.stringify(data.firstResult, null, 2)}</pre>
        </div>

        <div style={styles.card}>
          <h2>All Assessment Results ({data.assessmentResultsCount})</h2>
          <pre style={styles.pre}>{JSON.stringify(data.assessmentResults, null, 2)}</pre>
        </div>

        <div style={styles.card}>
          <h2>Assessments ({data.assessmentsCount})</h2>
          <pre style={styles.pre}>{JSON.stringify(data.assessments, null, 2)}</pre>
        </div>

        <div style={styles.card}>
          <h2>Candidates (Sample)</h2>
          <pre style={styles.pre}>{JSON.stringify(data.candidates, null, 2)}</pre>
        </div>

        <div style={styles.card}>
          <h2>Join Results</h2>
          <pre style={styles.pre}>{JSON.stringify(data.joinResults, null, 2)}</pre>
        </div>

        {data.error && (
          <div style={styles.error}>
            <strong>Error:</strong> {data.error}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#0A1929',
    marginBottom: '24px'
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  pre: {
    background: '#f5f5f5',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '300px',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  },
  error: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  }
};
