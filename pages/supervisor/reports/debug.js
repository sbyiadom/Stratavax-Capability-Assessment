// pages/supervisor/reports/debug.js
import { useState, useEffect } from 'react';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

export default function DebugReports() {
  const [debugData, setDebugData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkDatabase();
  }, []);

  async function checkDatabase() {
    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      const supervisorId = session?.session?.user?.id;

      let results = {};

      // 1. Get supervisor info
      const { data: supervisor } = await supabase
        .from('supervisor_profiles')
        .select('*')
        .eq('id', supervisorId);
      results.supervisor = supervisor;

      // 2. Get ALL candidates (to see what's available)
      const { data: allCandidates } = await supabase
        .from('candidate_profiles')
        .select('*');
      results.allCandidates = allCandidates;

      // 3. Get candidates under this supervisor
      const { data: myCandidates } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('supervisor_id', supervisorId);
      results.myCandidates = myCandidates;

      // 4. Get ALL assessment_results
      const { data: allAssessmentResults } = await supabase
        .from('assessment_results')
        .select('*');
      results.allAssessmentResults = allAssessmentResults;

      // 5. Get assessment_results with candidate info using join
      const { data: resultsWithCandidates } = await supabase
        .from('assessment_results')
        .select(`
          *,
          candidate_profiles!inner (
            id,
            full_name,
            email,
            university,
            programme,
            supervisor_id
          )
        `);
      results.resultsWithCandidates = resultsWithCandidates;

      // 6. Get assessment_results filtered by supervisor's candidates
      if (myCandidates && myCandidates.length > 0) {
        const candidateIds = myCandidates.map(c => c.id);
        const { data: filteredResults } = await supabase
          .from('assessment_results')
          .select(`
            *,
            candidate_profiles!inner (
              id,
              full_name,
              email,
              university,
              programme
            )
          `)
          .in('candidate_id', candidateIds);
        results.filteredResults = filteredResults;
      }

      // 7. Get assessments table
      const { data: assessments } = await supabase
        .from('assessments')
        .select('*');
      results.assessments = assessments;

      // 8. Get assessment_results with assessment details
      if (allAssessmentResults && allAssessmentResults.length > 0) {
        const assessmentIds = [...new Set(allAssessmentResults.map(a => a.assessment_id).filter(id => id))];
        if (assessmentIds.length > 0) {
          const { data: assessmentDetails } = await supabase
            .from('assessments')
            .select('*')
            .in('id', assessmentIds);
          results.assessmentDetails = assessmentDetails;
        }
      }

      // 9. Check if there's a 'results' or 'scores' table
      try {
        const { data: resultsTable } = await supabase
          .from('results')
          .select('*')
          .limit(5);
        results.resultsTable = resultsTable;
      } catch (e) {
        results.resultsTable = { error: 'Table may not exist' };
      }

      // 10. Check candidate_assessments junction table
      try {
        const { data: candidateAssessments } = await supabase
          .from('candidate_assessments')
          .select('*')
          .limit(5);
        results.candidateAssessments = candidateAssessments;
      } catch (e) {
        results.candidateAssessments = { error: 'Table may not exist' };
      }

      // 11. Get column info by checking first row of each table
      results.columnInfo = {
        candidate_profiles: allCandidates && allCandidates.length > 0 ? Object.keys(allCandidates[0]) : [],
        assessment_results: allAssessmentResults && allAssessmentResults.length > 0 ? Object.keys(allAssessmentResults[0]) : [],
        assessments: assessments && assessments.length > 0 ? Object.keys(assessments[0]) : [],
      };

      setDebugData({
        ...results,
        supervisorId: supervisorId,
        tableInfo: {
          candidatesCount: allCandidates?.length || 0,
          myCandidatesCount: myCandidates?.length || 0,
          assessmentResultsCount: allAssessmentResults?.length || 0,
          resultsWithCandidatesCount: resultsWithCandidates?.length || 0,
          filteredResultsCount: results.filteredResults?.length || 0,
          assessmentsCount: assessments?.length || 0,
        }
      });

    } catch (error) {
      console.error('Debug error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
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
        
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={styles.summary}>
          <h2>Summary</h2>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNumber}>{debugData.tableInfo?.candidatesCount || 0}</div>
              <div style={styles.summaryLabel}>Total Candidates</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNumber}>{debugData.tableInfo?.myCandidatesCount || 0}</div>
              <div style={styles.summaryLabel}>My Candidates</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNumber}>{debugData.tableInfo?.assessmentResultsCount || 0}</div>
              <div style={styles.summaryLabel}>Assessment Results</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNumber}>{debugData.tableInfo?.resultsWithCandidatesCount || 0}</div>
              <div style={styles.summaryLabel}>Results with Candidates</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNumber}>{debugData.tableInfo?.assessmentsCount || 0}</div>
              <div style={styles.summaryLabel}>Assessments</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNumber}>{debugData.tableInfo?.filteredResultsCount || 0}</div>
              <div style={styles.summaryLabel}>Filtered Results (My Candidates)</div>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2>Supervisor ID</h2>
          <pre style={styles.pre}>{debugData.supervisorId || 'Not found'}</pre>
        </div>

        <div style={styles.section}>
          <h2>Column Information</h2>
          <div style={styles.columnInfo}>
            <div>
              <h3>candidate_profiles</h3>
              <pre style={styles.pre}>{JSON.stringify(debugData.columnInfo?.candidate_profiles, null, 2)}</pre>
            </div>
            <div>
              <h3>assessment_results</h3>
              <pre style={styles.pre}>{JSON.stringify(debugData.columnInfo?.assessment_results, null, 2)}</pre>
            </div>
            <div>
              <h3>assessments</h3>
              <pre style={styles.pre}>{JSON.stringify(debugData.columnInfo?.assessments, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2>All Candidates ({debugData.allCandidates?.length || 0})</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.allCandidates, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>My Candidates ({debugData.myCandidates?.length || 0})</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.myCandidates, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>All Assessment Results ({debugData.allAssessmentResults?.length || 0})</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.allAssessmentResults, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>Results with Candidates ({debugData.resultsWithCandidates?.length || 0})</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.resultsWithCandidates, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>Filtered Results (My Candidates) ({debugData.filteredResults?.length || 0})</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.filteredResults, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>Assessments ({debugData.assessments?.length || 0})</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.assessments, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>Assessment Details</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.assessmentDetails, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>Results Table</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.resultsTable, null, 2)}</pre>
        </div>

        <div style={styles.section}>
          <h2>Candidate Assessments Junction Table</h2>
          <pre style={styles.pre}>{JSON.stringify(debugData.candidateAssessments, null, 2)}</pre>
        </div>
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
    maxWidth: '1400px',
    margin: '0 auto'
  },
  loadingContainer: {
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
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  },
  summary: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginTop: '16px'
  },
  summaryCard: {
    background: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  summaryNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0A1929'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  section: {
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
  columnInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  }
};
