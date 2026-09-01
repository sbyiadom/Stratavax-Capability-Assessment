// pages/supervisor/export-dashboard.js
// Export Dashboard with Behavioral Matrix Support

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../supabase/client';

export default function ExportDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('all');
  const [exportType, setExportType] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, withBehavioral: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university')
        .eq('supervisor_id', user.id)
        .order('full_name');

      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);

      // Fetch stats
      const { data: resultsData, error: resultsError } = await supabase
        .from('assessment_results')
        .select('id, report_data')
        .in('user_id', (candidatesData || []).map(c => c.id));

      if (!resultsError && resultsData) {
        const total = resultsData.length;
        const withBehavioral = resultsData.filter(r => {
          const reportData = r.report_data;
          if (!reportData) return false;
          try {
            const parsed = typeof reportData === 'string' ? JSON.parse(reportData) : reportData;
            return !!(parsed?.proctoring || parsed?.proctoring_data || parsed?.behavioral);
          } catch {
            return false;
          }
        }).length;
        setStats({ total, withBehavioral });
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      let url = '/api/supervisor/export-reports-with-behavioral?';
      const params = [];

      if (selectedCandidate !== 'all') {
        params.push(`candidateId=${selectedCandidate}`);
      }

      if (exportType !== 'all') {
        params.push(`type=${exportType}`);
      }

      url += params.join('&');

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `reports-with-behavioral-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Export error:', error);
      alert(error.message || 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading export data...</p>
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

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📊 Export Dashboard</h1>
            <p style={styles.subtitle}>
              Export assessment results with behavioral matrix data for comprehensive analysis
            </p>
          </div>
          <div style={styles.statsBadge}>
            <span>{stats.total} Reports</span>
            <span style={styles.statsDot}>•</span>
            <span style={{ color: '#059669' }}>{stats.withBehavioral} with Behavioral Data</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📋</div>
            <div>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Reports</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, background: '#ecfdf5' }}>
            <div style={styles.statIcon}>📊</div>
            <div>
              <div style={styles.statValue}>{stats.withBehavioral}</div>
              <div style={styles.statLabel}>With Behavioral Data</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, background: '#fef3c7' }}>
            <div style={styles.statIcon}>⚠️</div>
            <div>
              <div style={styles.statValue}>{stats.total - stats.withBehavioral}</div>
              <div style={styles.statLabel}>Without Behavioral Data</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Export Options</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>Select Candidate</label>
            <select 
              value={selectedCandidate} 
              onChange={(e) => setSelectedCandidate(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Candidates</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Assessment Type</label>
            <select 
              value={exportType} 
              onChange={(e) => setExportType(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Assessments</option>
              <option value="national_service">National Service</option>
              <option value="other">Other Assessments</option>
            </select>
          </div>

          <div style={styles.buttonGroup}>
            <button 
              onClick={handleExport} 
              style={styles.primaryButton}
              disabled={exporting || stats.total === 0}
            >
              {exporting ? '⏳ Exporting...' : '📥 Export with Behavioral Data'}
            </button>
          </div>

          {/* What's Included */}
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>📋 What's included in the export:</h4>
            <div style={styles.infoGrid}>
              <div>
                <h5>Candidate Information</h5>
                <ul style={styles.infoList}>
                  <li>Name, Email, University</li>
                  <li>Programme, Graduation Year</li>
                  <li>Preferred Department</li>
                </ul>
              </div>
              <div>
                <h5>Assessment Results</h5>
                <ul style={styles.infoList}>
                  <li>Overall Score, Total/Max Score</li>
                  <li>Workplace Readiness</li>
                  <li>Intellectual Capability</li>
                  <li>Category Breakdown</li>
                  <li>Recommendation</li>
                </ul>
              </div>
              <div>
                <h5>🆕 Behavioral Matrix</h5>
                <ul style={styles.infoList}>
                  <li>Total Time & Avg Time per Question</li>
                  <li>Tab Switches & Violations</li>
                  <li>Answer Changes</li>
                  <li>Copy/Paste & Right-Click Attempts</li>
                  <li>Risk Level & Risk Factors</li>
                  <li>Risk Assessment (High/Medium/Low)</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={styles.tipBox}>
            <h4 style={{ color: '#92400e', margin: '0 0 8px 0' }}>💡 Pro Tip</h4>
            <p style={{ color: '#78350f', margin: 0 }}>
              The behavioral matrix data helps you identify patterns in candidate behavior during assessments. 
              High risk indicators (excessive tab switching, violations) may require follow-up or assessment 
              invalidation. Export data for analysis in Excel or statistical software.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0A1929',
    margin: '0 0 4px 0'
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0
  },
  statsBadge: {
    padding: '8px 16px',
    background: '#f1f5f9',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statsDot: {
    color: '#94a3b8'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #eef2f7'
  },
  statIcon: {
    fontSize: '32px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0A1929'
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0A1929',
    margin: '0 0 20px 0'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    marginBottom: '6px'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d0d5dd',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    color: '#1a202c'
  },
  buttonGroup: {
    marginTop: '20px'
  },
  primaryButton: {
    width: '100%',
    padding: '14px 24px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background 0.2s'
  },
  infoBox: {
    padding: '20px',
    background: '#f0f9ff',
    borderRadius: '10px',
    border: '1px solid #bae6fd',
    marginTop: '24px'
  },
  infoTitle: {
    margin: '0 0 12px 0',
    color: '#0369a1'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  infoList: {
    margin: '4px 0 0 0',
    paddingLeft: '18px',
    color: '#475569',
    lineHeight: '1.8',
    fontSize: '14px'
  },
  tipBox: {
    padding: '16px 20px',
    background: '#fef3c7',
    borderRadius: '10px',
    border: '1px solid #fcd34d',
    marginTop: '16px'
  }
};
