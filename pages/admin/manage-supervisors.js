import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function ManageSupervisors() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check if user is in supervisors table with admin role
      const { data } = await supabase
        .from('supervisors')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (data?.role === 'admin') {
        setIsAdmin(true);
        fetchSupervisors();
      } else {
        router.push('/supervisor');
      }
    };
    checkAdmin();
  }, []);

  const fetchSupervisors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supervisors')
        .select(`
          *,
          users:user_id (
            email,
            user_metadata
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupervisors(data || []);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupervisor = async () => {
    try {
      // First check if user exists in auth
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        alert('User not found. They must register first.');
        return;
      }

      // Add to supervisors table
      const { error } = await supabase
        .from('supervisors')
        .insert({
          user_id: userData.id,
          full_name: fullName,
          email: email,
          role: 'supervisor',
          is_active: true
        });

      if (error) throw error;

      alert('Supervisor added successfully!');
      setShowAddModal(false);
      setEmail('');
      setFullName('');
      fetchSupervisors();
    } catch (error) {
      console.error('Error adding supervisor:', error);
      alert('Error adding supervisor');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('supervisors')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchSupervisors();
    } catch (error) {
      console.error('Error updating supervisor:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this supervisor?')) return;

    try {
      const { error } = await supabase
        .from('supervisors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSupervisors();
    } catch (error) {
      console.error('Error deleting supervisor:', error);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
          <button onClick={() => router.push('/supervisor')}>Go to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Manage Supervisors</h1>
          <button style={styles.addButton} onClick={() => setShowAddModal(true)}>
            + Add Supervisor
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supervisors.map(sup => (
                <tr key={sup.id}>
                  <td>{sup.full_name}</td>
                  <td>{sup.email}</td>
                  <td>{sup.role}</td>
                  <td>
                    <span style={{
                      ...styles.statusBadge,
                      background: sup.is_active ? '#4caf5020' : '#f4433620',
                      color: sup.is_active ? '#2e7d32' : '#c62828'
                    }}>
                      {sup.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(sup.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      style={styles.actionButton}
                      onClick={() => handleToggleStatus(sup.id, sup.is_active)}
                    >
                      {sup.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      style={{...styles.actionButton, background: '#f44336', color: 'white'}}
                      onClick={() => handleDelete(sup.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add Supervisor Modal */}
        {showAddModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Add New Supervisor</h2>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => setShowAddModal(false)}>
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
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#333',
    margin: 0
  },
  addButton: {
    padding: '12px 24px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  th: {
    textAlign: 'left',
    padding: '15px',
    background: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: 600,
    color: '#333'
  },
  td: {
    padding: '15px',
    borderBottom: '1px solid #f0f0f0',
    color: '#555'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600
  },
  actionButton: {
    padding: '6px 12px',
    margin: '0 5px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#666'
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
    zIndex: 1000
  },
  modal: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '400px',
    maxWidth: '90%'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  },
  cancelButton: {
    padding: '10px 20px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '10px 20px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  unauthorized: {
    textAlign: 'center',
    padding: '60px',
    color: '#666'
  }
};
