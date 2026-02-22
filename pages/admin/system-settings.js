import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SystemSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState({
    site_name: "Stratavax",                       // snake_case to match DB
    support_email: "support@stratavax.com",       // snake_case
    default_assessment_time_limit: 180,           // snake_case
    default_passing_score: 80,                     // snake_case
    enable_registration: true,                     // snake_case
    require_email_confirmation: true,               // snake_case
    session_timeout: 60,                            // snake_case
    max_login_attempts: 5,                          // snake_case
    maintenance_mode: false                          // snake_case
  });
  const [message, setMessage] = useState({ type: '', text: '' });

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
      loadSettings();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading settings:', error);
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          ...settings,
          updated_at: new Date().toISOString(),
          updated_by: userSession.user_id
        });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: '✅ Settings saved successfully!' 
      });

      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ 
        type: 'error', 
        text: `❌ Failed to save settings: ${error.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isAdmin) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Checking authorization...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading settings...</p>
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
          <h1 style={styles.title}>System Settings</h1>
        </div>

        {message.text && (
          <div style={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        <div style={styles.settingsGrid}>
          {/* General Settings */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>⚙️ General Settings</h2>
            <div style={styles.sectionContent}>
              <div style={styles.settingRow}>
                <label style={styles.label}>Site Name</label>
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  style={styles.input}
                  placeholder="Stratavax"
                />
              </div>

              <div style={styles.settingRow}>
                <label style={styles.label}>Support Email</label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  style={styles.input}
                  placeholder="support@example.com"
                />
              </div>

              <div style={styles.settingRow}>
                <label style={styles.label}>Enable Public Registration</label>
                <div style={styles.toggleContainer}>
                  <button
                    onClick={() => handleChange('enable_registration', true)}
                    style={{
                      ...styles.toggleButton,
                      background: settings.enable_registration ? '#4CAF50' : '#E2E8F0',
                      color: settings.enable_registration ? 'white' : '#2D3748'
                    }}
                  >
                    Enabled
                  </button>
                  <button
                    onClick={() => handleChange('enable_registration', false)}
                    style={{
                      ...styles.toggleButton,
                      background: !settings.enable_registration ? '#F44336' : '#E2E8F0',
                      color: !settings.enable_registration ? 'white' : '#2D3748'
                    }}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              <div style={styles.settingRow}>
                <label style={styles.label}>Require Email Confirmation</label>
                <div style={styles.toggleContainer}>
                  <button
                    onClick={() => handleChange('require_email_confirmation', true)}
                    style={{
                      ...styles.toggleButton,
                      background: settings.require_email_confirmation ? '#4CAF50' : '#E2E8F0',
                      color: settings.require_email_confirmation ? 'white' : '#2D3748'
                    }}
                  >
                    Required
                  </button>
                  <button
                    onClick={() => handleChange('require_email_confirmation', false)}
                    style={{
                      ...styles.toggleButton,
                      background: !settings.require_email_confirmation ? '#F44336' : '#E2E8F0',
                      color: !settings.require_email_confirmation ? 'white' : '#2D3748'
                    }}
                  >
                    Not Required
                  </button>
                </div>
              </div>

              <div style={styles.settingRow}>
                <label style={styles.label}>Maintenance Mode</label>
                <div style={styles.toggleContainer}>
                  <button
                    onClick={() => handleChange('maintenance_mode', true)}
                    style={{
                      ...styles.toggleButton,
                      background: settings.maintenance_mode ? '#F44336' : '#E2E8F0',
                      color: settings.maintenance_mode ? 'white' : '#2D3748'
                    }}
                  >
                    On
                  </button>
                  <button
                    onClick={() => handleChange('maintenance_mode', false)}
                    style={{
                      ...styles.toggleButton,
                      background: !settings.maintenance_mode ? '#4CAF50' : '#E2E8F0',
                      color: !settings.maintenance_mode ? 'white' : '#2D3748'
                    }}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Settings */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📋 Assessment Settings</h2>
            <div style={styles.sectionContent}>
              <div style={styles.settingRow}>
                <label style={styles.label}>Default Time Limit (minutes)</label>
                <input
                  type="number"
                  value={settings.default_assessment_time_limit}
                  onChange={(e) => handleChange('default_assessment_time_limit', parseInt(e.target.value))}
                  style={styles.input}
                  min="30"
                  max="300"
                />
              </div>

              <div style={styles.settingRow}>
                <label style={styles.label}>Default Passing Score (%)</label>
                <input
                  type="number"
                  value={settings.default_passing_score}
                  onChange={(e) => handleChange('default_passing_score', parseInt(e.target.value))}
                  style={styles.input}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔒 Security Settings</h2>
            <div style={styles.sectionContent}>
              <div style={styles.settingRow}>
                <label style={styles.label}>Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => handleChange('session_timeout', parseInt(e.target.value))}
                  style={styles.input}
                  min="5"
                  max="240"
                />
              </div>

              <div style={styles.settingRow}>
                <label style={styles.label}>Max Login Attempts</label>
                <input
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value))}
                  style={styles.input}
                  min="3"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📊 Database Status</h2>
            <div style={styles.sectionContent}>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Supervisors</span>
                <span style={styles.statusValue}>✅ Active</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Candidates</span>
                <span style={styles.statusValue}>✅ Active</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Assessments</span>
                <span style={styles.statusValue}>✅ Active</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>System Settings Table</span>
                <span style={styles.statusValue}>✅ Created</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={styles.saveSection}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
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
    maxWidth: '1200px',
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
  successMessage: {
    background: '#E8F5E9',
    color: '#2E7D32',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #A5D6A7'
  },
  errorMessage: {
    background: '#FFEBEE',
    color: '#C62828',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #EF9A9A'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    margin: 0,
    padding: '15px 20px',
    background: '#F8FAFC',
    borderBottom: '2px solid #0A1929',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929'
  },
  sectionContent: {
    padding: '20px'
  },
  settingRow: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#2D3748'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '2px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: '#0A1929'
    }
  },
  toggleContainer: {
    display: 'flex',
    gap: '10px'
  },
  toggleButton: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #E2E8F0'
  },
  statusLabel: {
    fontSize: '14px',
    color: '#4A5568'
  },
  statusValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2E7D32'
  },
  saveSection: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  saveButton: {
    padding: '14px 40px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(10,25,41,0.3)'
    }
  }
};
