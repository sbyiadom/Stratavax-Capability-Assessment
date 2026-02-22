import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function ManageSupervisors() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem("userSession");
        
        if (userSession) {
          try {
            const session = JSON.parse(userSession);
            
            // Verify admin status from database
            const { data: profile, error } = await supabase
              .from('supervisor_profiles')
              .select('role')
              .eq('id', session.user_id)
              .maybeSingle();

            if (error) {
              console.error('Error checking admin:', error);
              router.push('/login');
              return;
            }

            if (profile?.role === 'admin') {
              setIsAdmin(true);
              fetchSupervisors();
            } else {
              router.push('/supervisor');
            }
          } catch (e) {
            console.error('Auth error:', e);
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      }
    };
    checkAdmin();
  }, [router]);

  const fetchSupervisors = async () => {
    try {
      setLoading(true);
      
      // Fetch supervisors from database (not localStorage)
      const { data, error } = await supabase
        .from('supervisor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSupervisors(data || []);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      alert('Failed to load supervisors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupervisor = async () => {
    setError('');
    setSuccess('');

    if (!fullName || !email || !password) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      // Check if supervisor already exists
      const { data: existing } = await supabase
        .from('supervisor_profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        setError('Supervisor with this email already exists');
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'supervisor',
            is_supervisor: true
          }
        }
      });

      if (authError) throw authError;

      // Supervisor profile is automatically created by trigger
      // But we can update it if needed
      const { error: updateError } = await supabase
        .from('supervisor_profiles')
        .update({ 
          full_name: fullName,
          role: 'supervisor',
          is_active: true 
        })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;

      setSuccess(`✅ Supervisor added successfully!\n\nEmail: ${email}\nPassword: ${password}\n\nShare these credentials securely.`);
      
      // Clear form
      setEmail('');
      setFullName('');
      setPassword('');
      
      // Refresh list
      fetchSupervisors();
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error adding supervisor:', error);
      setError(error.message || 'Error adding supervisor');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('supervisor_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      fetchSupervisors();
    } catch (error) {
      console.error('Error updating supervisor:', error);
      alert('Failed to update supervisor status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this supervisor? This action cannot be undone.')) return;

    try {
      // Delete from auth.users (cascade will handle supervisor_profiles)
      const { error } = await supabase.auth.admin.deleteUser(id);
      
      if (error) throw error;
      
      fetchSupervisors();
    } catch (error) {
      console.error('Error deleting supervisor:', error);
      alert('Failed to delete supervisor');
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
          <button onClick={() => router.push('/supervisor')} style={styles.button}>
            Go to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Supervisors</h1>
            <p style={styles.subtitle}>View, activate, or remove existing supervisors</p>
          </div>
          <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
            + Add Supervisor
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading supervisors...</div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Added</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.noData}>
                      No supervisors found. Click "Add Supervisor" to create one.
                    </td>
                  </tr>
                ) : (
                  supervisors.map(sup => (
                    <tr key={sup.id}>
                      <td style={styles.td}>
                        <div style={styles.supervisorInfo}>
                          <div style={styles.avatar}>
                            {sup.full_name?.charAt(0) || 'S'}
                          </div>
                          {sup.full_name || 'Unnamed'}
                        </div>
                      </td>
                      <td style={styles.td}>{sup.email}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.roleBadge,
                          background: sup.role === 'admin' ? '#FFEBEE' : '#E3F2FD',
                          color: sup.role === 'admin' ? '#C62828' : '#1565C0'
                        }}>
                          {sup.role === 'admin' ? 'Administrator' : 'Supervisor'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          background: sup.is_active ? '#E8F5E9' : '#FFEBEE',
                          color: sup.is_active ? '#2E7D32' : '#C62828'
                        }}>
                          {sup.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {sup.created_at ? new Date(sup.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            style={{
                              ...styles.actionButton,
                              background: sup.is_active ? '#ff9800' : '#4CAF50'
                            }}
                            onClick={() => handleToggleStatus(sup.id, sup.is_active)}
                          >
                            {sup.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            style={{...styles.actionButton, background: '#f44336'}}
                            onClick={() => handleDelete(sup.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Supervisor Modal */}
        {showAddModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Add New Supervisor</h2>
              
              {error && (
                <div style={styles.errorMessage}>
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div style={styles.successMessage}>
                  ✅ {success}
                </div>
              )}

              <input
                type="text"
                placeholder="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
              <input
                type="password"
                placeholder="Password * (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                minLength="6"
              />
              
              <div style={styles.modalInfo}>
                <p style={styles.infoText}>
                  📋 New supervisors will:
                </p>
                <ul style={styles.infoList}>
                  <li>Login at <code>/login</code> (Supervisor mode)</li>
                  <li>Access dashboard at <code>/supervisor</code></li>
                  <li>See only candidates assigned to them</li>
                </ul>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => {
                  setShowAddModal(false);
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setFullName('');
                  setPassword('');
                }}>
                  Cancel
                </button>
                <button style={styles.saveButton} onClick={handleAddSupervisor}>
                  Add Supervisor
                </button>
              </div>
            </div>
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  addButton: {
    padding: '12px 24px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(10,25,41,0.3)'
    }
  },
  tableContainer: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    textAlign: 'left',
    padding: '15px 20px',
    background: '#F8FAFC',
    borderBottom: '2px solid #0A1929',
    fontWeight: 600,
    color: '#0A1929'
  },
  td: {
    padding: '15px 20px',
    borderBottom: '1px solid #E2E8F0',
    color: '#2D3748'
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    fontStyle: 'italic'
  },
  supervisorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    background: '#0A1929',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    color: 'white',
    transition: 'all 0.2s ease',
    ':hover': {
      opacity: 0.9,
      transform: 'translateY(-1px)'
    }
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
    background: 'white',
    borderRadius: '16px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)'
  },
  modal: {
    background: 'white',
    padding: '30px',
    borderRadius: '16px',
    width: '450px',
    maxWidth: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#0A1929'
  },
  errorMessage: {
    padding: '12px',
    background: '#FFEBEE',
    color: '#C62828',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  successMessage: {
    padding: '12px',
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    whiteSpace: 'pre-line'
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: '#0A1929'
    }
  },
  modalInfo: {
    background: '#F8FAFC',
    padding: '15px',
    borderRadius: '8px',
    margin: '20px 0'
  },
  infoText: {
    margin: '0 0 10px 0',
    fontWeight: 600,
    color: '#0A1929'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#4A5568',
    fontSize: '13px',
    lineHeight: 1.6
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#E2E8F0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#2D3748',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#CBD5E0'
    }
  },
  saveButton: {
    padding: '10px 20px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(10,25,41,0.3)'
    }
  },
  unauthorized: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
    background: 'white',
    borderRadius: '16px',
    maxWidth: '400px',
    margin: '100px auto'
  },
  button: {
    padding: '10px 20px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    marginTop: '20px',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#1A2A3A'
    }
  }
};
