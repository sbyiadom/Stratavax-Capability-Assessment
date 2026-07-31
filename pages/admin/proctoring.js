// pages/admin/proctoring.js

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useRouter } from 'next/router';

export default function AdminProctoring() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch('/api/admin/proctoring-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        setLogs(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getViolationColor = (type) => {
    const colors = {
      'tab_switch_external': '#dc2626',
      'external_url_visit': '#dc2626',
      'external_link_click': '#dc2626',
      'tab_switch': '#f59e0b',
      'copy_paste': '#f59e0b',
      'right_click': '#f59e0b',
      'fullscreen_exit': '#f59e0b',
      'window_switch': '#f59e0b',
      'keyboard_shortcut': '#64748b',
      'dev_tools_attempt': '#dc2626'
    };
    return colors[type] || '#64748b';
  };

  const getViolationLabel = (type) => {
    const labels = {
      'tab_switch_external': '🔴 External Tab Switch',
      'external_url_visit': '🔴 External URL Visit',
      'external_link_click': '🔴 External Link Click',
      'tab_switch': '🟡 Tab Switch',
      'copy_paste': '🟡 Copy/Paste',
      'right_click': '🟡 Right Click',
      'fullscreen_exit': '🟡 Fullscreen Exit',
      'window_switch': '🟡 Window Switch',
      'keyboard_shortcut': '⚪ Keyboard Shortcut',
      'dev_tools_attempt': '🔴 Dev Tools Attempt'
    };
    return labels[type] || type;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'search_engine': '🔍',
      'ai_tool': '🤖',
      'social_media': '📱',
      'messaging': '💬',
      'educational': '📚',
      'code_reference': '💻',
      'email': '📧',
      'other': '🌐'
    };
    return icons[category] || '🌐';
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.violation_type === filter);

  const violationTypes = [...new Set(logs.map(log => log.violation_type))];

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>📊 Proctoring Logs</h1>
        <div style={styles.loading}>Loading proctoring data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>📊 Proctoring Logs</h1>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>📊 Proctoring Logs</h1>
      <p style={styles.subtitle}>Monitor candidate behavior during assessments</p>
      
      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{logs.length}</div>
          <div style={styles.statLabel}>Total Violations</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {logs.filter(l => l.violation_type?.includes('external')).length}
          </div>
          <div style={styles.statLabel}>External Site Visits</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {logs.filter(l => l.violation_type === 'tab_switch' || l.violation_type === 'tab_switch_external').length}
          </div>
          <div style={styles.statLabel}>Tab Switches</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {logs.filter(l => l.violation_type === 'copy_paste').length}
          </div>
          <div style={styles.statLabel}>Copy/Paste Attempts</div>
        </div>
      </div>

      {/* Filter */}
      <div style={styles.filterBar}>
        <button 
          onClick={() => setFilter('all')}
          style={{ 
            ...styles.filterButton, 
            background: filter === 'all' ? '#0b2a4e' : '#f1f5f9', 
            color: filter === 'all' ? 'white' : '#475569' 
          }}
        >
          All ({logs.length})
        </button>
        {violationTypes.map(type => (
          <button 
            key={type}
            onClick={() => setFilter(type)}
            style={{ 
              ...styles.filterButton, 
              background: filter === type ? '#0b2a4e' : '#f1f5f9', 
              color: filter === type ? 'white' : '#475569' 
            }}
          >
            {getViolationLabel(type)} ({logs.filter(l => l.violation_type === type).length})
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Type</th>
              <th style={styles.tableHeaderCell}>User</th>
              <th style={styles.tableHeaderCell}>Assessment</th>
              <th style={styles.tableHeaderCell}>Details</th>
              <th style={styles.tableHeaderCell}>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No proctoring logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    <span style={{
                      ...styles.violationBadge,
                      background: getViolationColor(log.violation_type) + '20',
                      color: getViolationColor(log.violation_type)
                    }}>
                      {getViolationLabel(log.violation_type)}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={{ fontWeight: 500 }}>
                      {log.user_profiles?.full_name || log.user_id?.substring(0, 8)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {log.user_profiles?.email || 'No email'}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    {log.assessments?.title || log.assessment_id?.substring(0, 8)}
                  </td>
                  <td style={styles.tableCell}>
                    {log.violation_details && (
                      <div style={{ fontSize: '13px' }}>
                        {log.violation_details.toDomain && (
                          <div style={{ marginBottom: '2px' }}>
                            <span style={{ fontWeight: 600 }}>
                              {getCategoryIcon(log.violation_details.category)} {log.violation_details.toDomain}
                            </span>
                            {log.violation_details.category && (
                              <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>
                                ({log.violation_details.category})
                              </span>
                            )}
                          </div>
                        )}
                        {log.violation_details.url && (
                          <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all' }}>
                            <span style={{ color: '#2563eb' }}>🔗</span> {log.violation_details.url}
                          </div>
                        )}
                        {log.violation_details.duration && (
                          <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                            ⏱ Duration: {Math.round(log.violation_details.duration)}s
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ ...styles.tableCell, fontSize: '13px', color: '#64748b' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  subtitle: {
    color: '#64748b',
    marginBottom: '24px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0b2a4e'
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px'
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '20px'
  },
  filterButton: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px'
  },
  tableHeader: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s'
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    verticalAlign: 'middle'
  },
  violationBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    whiteSpace: 'nowrap'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b'
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px'
  }
};
