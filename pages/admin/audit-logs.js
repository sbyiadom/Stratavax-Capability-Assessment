import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AuditLogs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const userSession = localStorage.getItem("userSession");
      if (!userSession) {
        router.push("/login");
        return;
      }

      const session = JSON.parse(userSession);
      
      const { data: profile, error } = await supabase
        .from('supervisor_profiles')
        .select('role')
        .eq('id', session.user_id)
        .maybeSingle();

      if (error || profile?.role !== 'admin') {
        alert('Admin access required');
        router.push('/supervisor');
        return;
      }

      setIsAdmin(true);
      fetchLogs();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Try to get from audit_logs table if it exists
      let { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          supervisor:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.log('Audit logs table may not exist, using sample data');
        // Generate sample data for demonstration
        data = generateSampleLogs();
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs(generateSampleLogs());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleLogs = () => {
    const actions = ['login', 'logout', 'create', 'update', 'delete', 'assign'];
    const tables = ['supervisor_profiles', 'candidate_profiles', 'assessments', 'system_settings'];
    const users = [
      { full_name: 'Samuel Boakye Yiadom', email: 'sbyiadom88@gmail.com' },
      { full_name: 'System', email: 'system@stratavax.com' }
    ];

    return Array(25).fill().map((_, i) => ({
      id: `sample-${i}`,
      user_id: i % 2 === 0 ? '19ab328a-c93c-4eaf-be9a-c7d381398170' : null,
      action: actions[Math.floor(Math.random() * actions.length)],
      table_name: tables[Math.floor(Math.random() * tables.length)],
      record_id: `rec-${Math.floor(Math.random() * 1000)}`,
      old_data: null,
      new_data: { test: 'data' },
      ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      created_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      supervisor: users[i % 2]
    }));
  };

  const getDateFilter = () => {
    const now = new Date();
    const start = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { gte: start.toISOString() };
      case 'week':
        start.setDate(now.getDate() - 7);
        return { gte: start.toISOString() };
      case 'month':
        start.setMonth(now.getMonth() - 1);
        return { gte: start.toISOString() };
      default:
        return {};
    }
  };

  const filteredLogs = logs.filter(log => {
    // Filter by action type
    if (filter !== 'all' && log.action !== filter) return false;

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches = 
        log.supervisor?.full_name?.toLowerCase().includes(term) ||
        log.supervisor?.email?.toLowerCase().includes(term) ||
        log.action?.toLowerCase().includes(term) ||
        log.table_name?.toLowerCase().includes(term) ||
        log.record_id?.toLowerCase().includes(term);
      if (!matches) return false;
    }

    return true;
  });

  const getActionColor = (action) => {
    const colors = {
      login: { bg: '#E3F2FD', color: '#1565C0' },
      logout: { bg: '#E8EAF6', color: '#3949AB' },
      create: { bg: '#E8F5E9', color: '#2E7D32' },
      update: { bg: '#FFF3E0', color: '#F57C00' },
      delete: { bg: '#FFEBEE', color: '#C62828' },
      assign: { bg: '#F3E5F5', color: '#7B1FA2' }
    };
    return colors[action] || { bg: '#F5F5F5', color: '#616161' };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString()}`;
    } else if (days === 1) {
      return `Yesterday at ${date.toLocaleTimeString()}`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  if (!isAdmin) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Checking authorization...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/admin" legacyBehavior>
            <a style={styles.backButton}>← Back to Admin</a>
          </Link>
          <h1 style={styles.title}>Audit Logs</h1>
        </div>

        {/* Filters */}
        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="assign">Assign</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button
            onClick={fetchLogs}
            style={styles.refreshButton}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{filteredLogs.length}</span>
            <span style={styles.statLabel}>Total Events</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              {filteredLogs.filter(l => l.action === 'login').length}
            </span>
            <span style={styles.statLabel}>Logins</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              {filteredLogs.filter(l => l.action === 'create').length}
            </span>
            <span style={styles.statLabel}>Creations</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              {filteredLogs.filter(l => l.action === 'delete').length}
            </span>
            <span style={styles.statLabel}>Deletions</span>
          </div>
        </div>

        {/* Logs Table */}
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading audit logs...</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Timestamp</th>
                    <th style={styles.tableHead}>User</th>
                    <th style={styles.tableHead}>Action</th>
                    <th style={styles.tableHead}>Table</th>
                    <th style={styles.tableHead}>Record ID</th>
                    <th style={styles.tableHead}>IP Address</th>
                    <th style={styles.tableHead}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.noData}>
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const actionColor = getActionColor(log.action);
                      return (
                        <tr key={log.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <div style={styles.timestamp}>
                              {formatDate(log.created_at)}
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            {log.supervisor ? (
                              <div style={styles.userInfo}>
                                <div style={styles.userAvatar}>
                                  {log.supervisor.full_name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <div style={styles.userName}>
                                    {log.supervisor.full_name || 'System'}
                                  </div>
                                  <div style={styles.userEmail}>
                                    {log.supervisor.email || ''}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span style={styles.systemUser}>System</span>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.actionBadge,
                              background: actionColor.bg,
                              color: actionColor.color
                            }}>
                              {log.action?.toUpperCase()}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <code style={styles.tableName}>
                              {log.table_name}
                            </code>
                          </td>
                          <td style={styles.tableCell}>
                            <code style={styles.recordId}>
                              {log.record_id?.substring(0, 8)}...
                            </code>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={styles.ipAddress}>
                              {log.ip_address || 'N/A'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {log.action === 'update' && log.old_data && (
                              <details style={styles.details}>
                                <summary style={styles.detailsSummary}>View Changes</summary>
                                <pre style={styles.detailsPre}>
                                  {JSON.stringify(log.old_data, null, 2)}
                                  {' ↓ '}
                                  {JSON.stringify(log.new_data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Database Setup Note */}
        <div style={styles.note}>
          <p style={styles.noteText}>
            <strong>📝 Note:</strong> To enable persistent audit logging, create an 'audit_logs' table in Supabase.
            Currently showing sample data for demonstration.
          </p>
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
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  container: {
    width: '90vw',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #0A1929',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#0A1929',
      color: 'white'
    }
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '24px',
    fontWeight: 600
  },
  filterBar: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  filterGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    flex: 1
  },
  filterSelect: {
    padding: '8px 16px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
    minWidth: '140px'
  },
  searchInput: {
    padding: '8px 16px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '250px',
    flex: 1,
    outline: 'none',
    ':focus': {
      borderColor: '#0A1929'
    }
  },
  refreshButton: {
    padding: '8px 20px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A'
    }
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  statValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 700,
    color: '#0A1929',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableContainer: {
    background: 'white',
    padding: '25px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #0A1929',
    background: '#F8FAFC'
  },
  tableHead: {
    padding: '12px 15px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    borderBottom: '1px solid #E2E8F0',
    transition: 'background 0.2s ease',
    ':hover': {
      background: '#F8FAFC'
    }
  },
  tableCell: {
    padding: '12px 15px',
    color: '#2D3748',
    verticalAlign: 'middle'
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    fontStyle: 'italic'
  },
  timestamp: {
    fontSize: '12px',
    color: '#4A5568',
    whiteSpace: 'nowrap'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '14px',
    background: '#0A1929',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0A1929'
  },
  userEmail: {
    fontSize: '11px',
    color: '#718096'
  },
  systemUser: {
    fontSize: '13px',
    color: '#718096',
    fontStyle: 'italic'
  },
  actionBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-block',
    whiteSpace: 'nowrap'
  },
  tableName: {
    background: '#EDF2F7',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#2D3748'
  },
  recordId: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#718096'
  },
  ipAddress: {
    fontSize: '12px',
    color: '#4A5568',
    fontFamily: 'monospace'
  },
  details: {
    fontSize: '12px'
  },
  detailsSummary: {
    color: '#3182CE',
    cursor: 'pointer'
  },
  detailsPre: {
    background: '#2D3748',
    color: '#E2E8F0',
    padding: '8px',
    borderRadius: '4px',
    fontSize: '10px',
    overflow: 'auto',
    maxWidth: '300px'
  },
  note: {
    marginTop: '20px',
    padding: '15px 20px',
    background: '#FEF3C7',
    borderRadius: '8px',
    border: '1px solid #FDE68A'
  },
  noteText: {
    margin: 0,
    color: '#92400E',
    fontSize: '14px'
  }
};
