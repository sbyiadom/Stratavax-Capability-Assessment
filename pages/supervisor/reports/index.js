// pages/supervisor/reports/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';
import { supabase } from '../../../supabase/client';

export default function ReportsIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalAssessments: 62,
    averageScore: 89,
    totalPrograms: 12,
    totalCandidates: 65,
    completedAssessments: 65,
    pendingReview: 0
  });

  // This would normally fetch data from your database
  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setReports([
        { id: 1, candidate: 'John Doe', university: 'KNUST', program: 'BSc Mechanical Engineering', score: 92, status: 'Completed', date: '2026-08-15' },
        { id: 2, candidate: 'Jane Smith', university: 'University of Mines and Technology', program: 'Telecommunication Engineering', score: 78, status: 'Pending', date: '2026-08-14' },
        { id: 3, candidate: 'Bob Johnson', university: 'Kumasi Technical University', program: 'B-Tech Electrical and Electronics', score: 85, status: 'Completed', date: '2026-08-13' },
        { id: 4, candidate: 'Alice Brown', university: 'Accra Technical University', program: 'BSc Agricultural Engineering', score: 91, status: 'Completed', date: '2026-08-12' },
        { id: 5, candidate: 'Charlie Wilson', university: 'KNUST', program: 'Chemical Engineering', score: 67, status: 'Failed', date: '2026-08-11' },
        { id: 6, candidate: 'Diana Ross', university: 'Regional Maritime University', program: 'Mechanical Engineering Plant Option', score: 88, status: 'Completed', date: '2026-08-10' },
        { id: 7, candidate: 'Eve Adams', university: 'Koforidua Technical University', program: 'Electrical Engineering', score: 94, status: 'Completed', date: '2026-08-09' },
        { id: 8, candidate: 'Frank Castle', university: 'University of Mines and Technology', program: 'BSc Mechanical Engineering', score: 73, status: 'Pending', date: '2026-08-08' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#48bb78';
      case 'Pending': return '#ed8936';
      case 'Failed': return '#fc8181';
      default: return '#a0aec0';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#fc8181';
  };

  // Filter reports based on active tab
  const filteredReports = activeTab === 'national' 
    ? reports.filter(r => r.status === 'Completed' || r.status === 'Pending')
    : reports;

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Reports Dashboard</h1>
          <p style={styles.subtitle}>View and manage assessment reports</p>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📋</div>
            <div>
              <div style={styles.statsValue}>{stats.totalAssessments}</div>
              <div style={styles.statsLabel}>Total Assessments</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📈</div>
            <div>
              <div style={styles.statsValue}>{stats.averageScore}%</div>
              <div style={styles.statsLabel}>Average Score</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>🎓</div>
            <div>
              <div style={styles.statsValue}>{stats.totalPrograms}</div>
              <div style={styles.statsLabel}>Programs</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>👥</div>
            <div>
              <div style={styles.statsValue}>{stats.totalCandidates}</div>
              <div style={styles.statsLabel}>Total Candidates</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('national')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'national' ? '#0A1929' : 'white',
              color: activeTab === 'national' ? 'white' : '#4A5568',
              borderBottom: activeTab === 'national' ? '3px solid #2563EB' : '3px solid transparent'
            }}
          >
            📋 National Service Reports
          </button>
          <button
            onClick={() => setActiveTab('other')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'other' ? '#0A1929' : 'white',
              color: activeTab === 'other' ? 'white' : '#4A5568',
              borderBottom: activeTab === 'other' ? '3px solid #2563EB' : '3px solid transparent'
            }}
          >
            📊 Other Assessment Reports
          </button>
        </div>

        {/* Reports Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading reports...</p>
            </div>
          ) : (
            <>
              <div style={styles.tableHeader}>
                <div style={styles.tableTitle}>
                  {activeTab === 'national' ? 'National Service Reports' : 'Other Assessment Reports'}
                </div>
                <div style={styles.tableActions}>
                  <button style={styles.exportButton}>
                    📥 Export CSV
                  </button>
                  <button style={styles.printButton}>
                    🖨️ Print
                  </button>
                </div>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHeadCell}>Candidate</th>
                    <th style={styles.tableHeadCell}>University</th>
                    <th style={styles.tableHeadCell}>Program</th>
                    <th style={styles.tableHeadCell}>Score</th>
                    <th style={styles.tableHeadCell}>Status</th>
                    <th style={styles.tableHeadCell}>Date</th>
                    <th style={styles.tableHeadCell}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.emptyState}>
                        <div style={styles.emptyStateContent}>
                          <span style={styles.emptyStateIcon}>📭</span>
                          <p>No {activeTab === 'national' ? 'national service' : 'other'} reports found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr key={report.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{report.candidate}</td>
                        <td style={styles.tableCell}>{report.university}</td>
                        <td style={styles.tableCell}>{report.program}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.scoreBadge,
                            background: getScoreColor(report.score)
                          }}>
                            {report.score}%
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            background: getStatusColor(report.status)
                          }}>
                            {report.status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{report.date}</td>
                        <td style={styles.tableCell}>
                          <button
                            onClick={() => router.push(`/supervisor/reports/${report.id}`)}
                            style={styles.viewButton}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Top Universities Ranking */}
        <div style={styles.rankingContainer}>
          <h3 style={styles.rankingTitle}>🏆 Top Universities Ranking</h3>
          <div style={styles.rankingList}>
            {['KNUST', 'University of Mines and Technology', 'Kumasi Technical University', 'Accra Technical University', 'Koforidua Technical University'].map((uni, index) => (
              <div key={uni} style={styles.rankingItem}>
                <span style={styles.rankingPosition}>#{index + 1}</span>
                <span style={styles.rankingName}>{uni}</span>
                <span style={styles.rankingScore}>{(90 - index * 3)}%</span>
              </div>
            ))}
          </div>
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
  header: {
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  statsCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statsIcon: {
    fontSize: '32px'
  },
  statsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0A1929'
  },
  statsLabel: {
    fontSize: '14px',
    color: '#718096'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tabButton: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    flex: 1
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0'
  },
  tableTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0A1929'
  },
  tableActions: {
    display: 'flex',
    gap: '8px'
  },
  exportButton: {
    padding: '6px 16px',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  printButton: {
    padding: '6px 16px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeadRow: {
    background: '#F8FAFC'
  },
  tableHeadCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '2px solid #E2E8F0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4A5568'
  },
  tableRow: {
    transition: 'background 0.2s ease',
    ':hover': {
      background: '#F8FAFC'
    }
  },
  tableCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#2D3748'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  viewButton: {
    padding: '4px 12px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.2s ease'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyStateContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  emptyStateIcon: {
    fontSize: '48px'
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
  rankingContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  rankingTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0A1929',
    margin: '0 0 16px 0'
  },
  rankingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '10px 16px',
    background: '#F8FAFC',
    borderRadius: '8px',
    transition: 'background 0.2s ease'
  },
  rankingPosition: {
    fontWeight: 'bold',
    color: '#4A5568',
    minWidth: '40px'
  },
  rankingName: {
    flex: 1,
    fontWeight: '500',
    color: '#2D3748'
  },
  rankingScore: {
    fontWeight: '600',
    color: '#48bb78'
  }
};
