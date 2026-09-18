// pages/admin/competency-reports.js
// Phase 6 — Admin competency rollup page.
// Picks an assessment, shows per-competency aggregate stats with discrimination flags.

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';
import AppLayout from '../../components/AppLayout';
import CompetencyReport from '../../components/reports/CompetencyReport';

export default function AdminCompetencyReports() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();

  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingRollup, setLoadingRollup] = useState(false);
  const [rollupData, setRollupData] = useState(null);
  const [error, setError] = useState(null);

  // ============================================================
  // LOAD ASSESSMENTS THAT HAVE COMPETENCY DATA
  // ============================================================
  useEffect(() => {
    if (!session) return;
    loadAssessments();
  }, [session]);

  const loadAssessments = async () => {
    try {
      setLoadingList(true);
      setError(null);

      // Distinct assessment_ids that actually have competency scores
      const { data: scoreRows, error: scoreError } = await supabase
        .from('candidate_competency_scores')
        .select('assessment_id');

      if (scoreError) {
        console.error('[Admin Competency Reports] score fetch error:', scoreError);
        setError(scoreError.message || 'Failed to load competency scores');
        setLoadingList(false);
        return;
      }

      const distinctIds = [...new Set((scoreRows || []).map(r => r.assessment_id).filter(Boolean))];

      if (distinctIds.length === 0) {
        setAssessments([]);
        setLoadingList(false);
        return;
      }

      // Fetch assessment metadata
      const { data: assessmentRows, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, title, assessment_type_id, created_at')
        .in('id', distinctIds);

      if (assessmentError) {
        console.error('[Admin Competency Reports] assessments fetch error:', assessmentError);
        setError(assessmentError.message || 'Failed to load assessments');
        setLoadingList(false);
        return;
      }

      // Filter out TEST records and sort alphabetically, then pin the biggest
      const cleaned = (assessmentRows || [])
        .filter(a => !/^TEST\s*[—\-]/i.test(a.title || ''))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

      setAssessments(cleaned);

      if (cleaned.length > 0 && !selectedAssessmentId) {
        setSelectedAssessmentId(cleaned[0].id);
      }

      setLoadingList(false);
    } catch (err) {
      console.error('[Admin Competency Reports] unexpected error:', err);
      setError(err.message || 'Unexpected error');
      setLoadingList(false);
    }
  };

  // ============================================================
  // LOAD ROLLUP FOR SELECTED ASSESSMENT
  // ============================================================
  useEffect(() => {
    if (!selectedAssessmentId || !session) return;
    fetchRollup(selectedAssessmentId);
  }, [selectedAssessmentId, session]);

  const fetchRollup = async (assessmentId) => {
    try {
      setLoadingRollup(true);
      setError(null);
      setRollupData(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Your session has expired. Please sign in again.');
        setLoadingRollup(false);
        return;
      }

      const response = await fetch(
        `/api/reports/competency-summary?assessmentId=${encodeURIComponent(assessmentId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.error || `Failed to load rollup (HTTP ${response.status}).`);
      }

      setRollupData(data);
      setLoadingRollup(false);
    } catch (err) {
      console.error('[Admin Competency Reports] rollup fetch error:', err);
      setError(err.message || 'Failed to load rollup');
      setLoadingRollup(false);
    }
  };

  // ============================================================
  // SUMMARY STRIP METRICS (computed from real data only)
  // ============================================================
  const summary = useMemo(() => {
    if (!rollupData || !Array.isArray(rollupData.competencies)) {
      return null;
    }
    const comps = rollupData.competencies;
    const lowDiscrimination = comps.filter(c => c.discrimination === 'low').length;
    const goodDiscrimination = comps.filter(c => c.discrimination === 'good').length;
    const moderateDiscrimination = comps.filter(c => c.discrimination === 'moderate').length;

    return {
      candidateCount: rollupData.candidateCount || 0,
      competencyCount: comps.length,
      lowDiscrimination,
      moderateDiscrimination,
      goodDiscrimination,
    };
  }, [rollupData]);

  // ============================================================
  // RENDER
  // ============================================================
  const handleBack = () => router.push('/admin');

  if (authLoading) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <button onClick={handleBack} style={styles.backButton}>← Back to Admin Dashboard</button>

        <div style={styles.header}>
          <h1 style={styles.title}>Competency Reports</h1>
          <p style={styles.subtitle}>
            Aggregate competency performance across candidates, with discrimination analysis.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
            {selectedAssessmentId && (
              <button
                onClick={() => fetchRollup(selectedAssessmentId)}
                style={styles.retryButton}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Assessment picker */}
        <div style={styles.pickerBar}>
          <label style={styles.pickerLabel}>Assessment</label>
          {loadingList ? (
            <div style={styles.pickerLoading}>Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div style={styles.pickerEmpty}>
              No assessments have competency data yet.
            </div>
          ) : (
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              style={styles.pickerSelect}
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          )}
        </div>

        {/* Summary strip */}
        {summary && (
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{summary.candidateCount}</div>
              <div style={styles.summaryLabel}>Candidates scored</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryValue}>{summary.competencyCount}</div>
              <div style={styles.summaryLabel}>Competencies assessed</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryValue, color: summary.lowDiscrimination > 0 ? '#92400e' : '#166534' }}>
                {summary.lowDiscrimination}
              </div>
              <div style={styles.summaryLabel}>
                Low discrimination
              </div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryValue, color: '#075985' }}>
                {summary.moderateDiscrimination}
              </div>
              <div style={styles.summaryLabel}>Moderate discrimination</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryValue, color: '#166534' }}>
                {summary.goodDiscrimination}
              </div>
              <div style={styles.summaryLabel}>Good discrimination</div>
            </div>
          </div>
        )}

        {/* Rollup body */}
        {loadingRollup ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading competency rollup...</p>
          </div>
        ) : rollupData ? (
          <CompetencyReport
            mode="rollup"
            data={rollupData}
            title={rollupData.assessmentTitle || 'Competency Rollup'}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    gap: '16px',
    color: '#64748b',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a237e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  backButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
    marginBottom: '20px',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a237e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#991b1b',
    fontSize: '14px',
  },
  retryButton: {
    padding: '4px 12px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  pickerBar: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px 18px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },
  pickerLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  pickerSelect: {
    flex: 1,
    minWidth: '240px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: 'white',
    fontSize: '14px',
    color: '#1a202c',
    cursor: 'pointer',
  },
  pickerLoading: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  pickerEmpty: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  summaryCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px 18px',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#0b2a4e',
    lineHeight: 1.1,
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontWeight: 600,
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
