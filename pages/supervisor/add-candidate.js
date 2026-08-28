// pages/supervisor/add-candidate.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AddCandidate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    university: "",
    program: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem("userSession");
        
        if (!userSession) {
          router.push("/login");
          return;
        }
        
        try {
          const session = JSON.parse(userSession);
          if (session.loggedIn && (session.role === 'supervisor' || session.role === 'admin')) {
            setCurrentSupervisor({
              id: session.user_id,
              email: session.email,
              name: session.full_name || session.email,
              role: session.role
            });
          } else {
            router.push("/login");
          }
        } catch {
          router.push("/login");
        }
      }
    };
    checkAuth();
  }, [router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Please enter a valid email address");
      }

      const { data: existing, error: checkError } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        throw new Error("A candidate with this email already exists");
      }

      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: tempPassword,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'candidate',
            is_supervisor: false,
            university: formData.university,
            program: formData.program
          }
        }
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('candidate_profiles')
        .insert({
          id: authData.user.id,
          full_name: formData.full_name,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone || null,
          university: formData.university || null,
          program: formData.program || null,
          supervisor_id: currentSupervisor.id,
          created_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      setSuccess(`✅ Candidate added successfully!\n\nName: ${formData.full_name}\nEmail: ${formData.email}\nTemporary Password: ${tempPassword}\n\nShare these credentials with the candidate.`);
      
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        university: "",
        program: ""
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/supervisor/manage-candidate');
      }, 3000);

    } catch (err) {
      console.error('Error adding candidate:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentSupervisor) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            onClick={() => router.push('/supervisor/manage-candidate')}
            style={styles.backButton}
          >
            ← Back to Candidates
          </button>
          <h1 style={styles.title}>Add New Candidate</h1>
          <div style={styles.headerRight}>
            <span style={styles.supervisorBadge}>
              👑 {currentSupervisor.name}
            </span>
          </div>
        </div>

        <div style={styles.formContainer}>
          {error && (
            <div style={styles.errorMessage}>
              <span style={styles.errorIcon}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={styles.successMessage}>
              <span style={styles.successIcon}>✅</span>
              <pre style={styles.successPre}>{success}</pre>
              <p style={styles.redirectingText}>Redirecting to candidate list...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Enter candidate's full name"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="candidate@example.com"
                style={styles.input}
              />
              <p style={styles.hint}>Candidate will use this email to login</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>University *</label>
              <select
                name="university"
                value={formData.university}
                onChange={handleChange}
                required
                style={styles.input}
              >
                <option value="">Select University</option>
                <option value="KNUST">KNUST</option>
                <option value="University of Mines and Technology">University of Mines and Technology</option>
                <option value="Kumasi Technical University">Kumasi Technical University</option>
                <option value="Accra Technical University">Accra Technical University</option>
                <option value="Koforidua Technical University">Koforidua Technical University</option>
                <option value="Regional Maritime University">Regional Maritime University</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Program of Study *</label>
              <input
                type="text"
                name="program"
                value={formData.program}
                onChange={handleChange}
                required
                placeholder="e.g., BSc Mechanical Engineering"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number (Optional)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+233 XX XXX XXXX"
                style={styles.input}
              />
            </div>

            <div style={styles.infoBox}>
              <h4 style={styles.infoTitle}>📋 What happens next:</h4>
              <ul style={styles.infoList}>
                <li>A temporary password will be generated automatically</li>
                <li>The candidate will be assigned to you as their supervisor</li>
                <li>Share the credentials with the candidate securely</li>
                <li>The candidate can login at <code>/login</code> (Candidate mode)</li>
                <li>You'll be able to view their assessment reports once completed</li>
              </ul>
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={() => router.push('/supervisor/manage-candidate')}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...styles.submitButton,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Adding Candidate...' : 'Add Candidate'}
              </button>
            </div>
          </form>
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
  loadingContainer: {
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: '30px 20px'
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
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #0A1929',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '24px',
    fontWeight: 600
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  supervisorBadge: {
    padding: '8px 16px',
    background: '#E3F2FD',
    color: '#1565C0',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600
  },
  formContainer: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#FFEBEE',
    color: '#C62828',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #FFCDD2'
  },
  errorIcon: {
    fontSize: '20px'
  },
  successMessage: {
    background: '#E8F5E9',
    color: '#2E7D32',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #A5D6A7'
  },
  successIcon: {
    fontSize: '24px',
    display: 'block',
    marginBottom: '10px'
  },
  successPre: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '1.6'
  },
  redirectingText: {
    marginTop: '10px',
    fontSize: '13px',
    color: '#2E7D32',
    fontWeight: 500,
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2D3748'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '15px',
    transition: 'all 0.2s ease',
    outline: 'none',
    background: 'white',
    width: '100%'
  },
  hint: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#718096'
  },
  infoBox: {
    background: '#F8FAFC',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '10px'
  },
  infoTitle: {
    margin: '0 0 15px 0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#0A1929'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#4A5568',
    fontSize: '14px',
    lineHeight: '1.8'
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px'
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    background: '#E2E8F0',
    color: '#2D3748',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.2s ease'
  },
  submitButton: {
    flex: 1,
    padding: '14px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
