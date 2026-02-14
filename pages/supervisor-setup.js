import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SupervisorSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: ""
  });

  // Check if any supervisors exist
  useEffect(() => {
    const checkSupervisors = async () => {
      const { count, error } = await supabase
        .from("supervisors")
        .select("*", { count: 'exact', head: true });

      if (!error && count > 0) {
        // Supervisors exist, redirect to login
        router.push("/supervisor-login");
      }
    };

    checkSupervisors();
  }, [router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from("supervisors")
        .select("id")
        .eq("email", formData.email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        throw new Error("Email already registered");
      }

      // Create supervisor
      const { data, error } = await supabase
        .from("supervisors")
        .insert({
          full_name: formData.full_name,
          email: formData.email.toLowerCase().trim(),
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/supervisor-login");
      }, 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Supervisor Setup</h1>
          <p style={styles.subtitle}>Create the first supervisor account</p>
        </div>

        {/* Success Message */}
        {success && (
          <div style={styles.success}>
            <span style={styles.successIcon}>✅</span>
            <div>
              <strong>Setup Complete!</strong>
              <p style={styles.successText}>
                Supervisor account created successfully. Redirecting to login...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !success && (
          <div style={styles.error}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Setup Form */}
        {!success && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="supervisor@company.com"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                required
                style={styles.input}
              />
              <p style={styles.hint}>Must be at least 8 characters long</p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.setupButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <span style={styles.loadingContainer}>
                  <span style={styles.loadingSpinner} />
                  Creating Account...
                </span>
              ) : (
                "Create Supervisor Account"
              )}
            </button>
          </form>
        )}

        {/* Info Box */}
        <div style={styles.info}>
          <p style={styles.infoTitle}>📋 Important Information</p>
          <ul style={styles.infoList}>
            <li>This will create the first supervisor account</li>
            <li>Only one supervisor account can be created through this page</li>
            <li>Additional supervisors can be added later from the admin panel</li>
            <li>Keep your credentials secure</li>
          </ul>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={() => router.push("/supervisor-login")}
            style={styles.backButton}
          >
            ← Back to Login
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#333',
    fontSize: '28px',
    fontWeight: 700
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  success: {
    display: 'flex',
    gap: '12px',
    background: '#e8f5e9',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  successIcon: {
    fontSize: '20px'
  },
  successText: {
    margin: '5px 0 0 0',
    fontSize: '13px',
    color: '#2e7d32'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  errorIcon: {
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333'
  },
  input: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102,126,234,0.1)'
    }
  },
  hint: {
    margin: '4px 0 0 0',
    fontSize: '11px',
    color: '#666'
  },
  setupButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    marginTop: '10px'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  loadingSpinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  info: {
    marginTop: '30px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },
  infoTitle: {
    margin: '0 0 10px 0',
    fontSize: '13px',
    fontWeight: 600,
    color: '#333'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.6'
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '13px',
    textDecoration: 'underline',
    padding: 0
  }
};
