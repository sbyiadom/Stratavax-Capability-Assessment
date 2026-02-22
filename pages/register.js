// pages/register.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";
import AppLayout from "../components/AppLayout";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: name, 
            name: name,
            role: "candidate",
            is_supervisor: false,  // Important: marks this as a candidate
            user_type: "candidate"  // Additional flag for clarity
          }
        },
      });

      if (error) throw error;

      alert("Registration successful! Please check your email for confirmation and then log in.");
      router.push("/login");
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout background="/images/register-bg.jpg">
      <div style={styles.container}>
        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.header}>
            <h2 style={styles.title}>Register as Candidate</h2>
            <p style={styles.subtitle}>Create your account to start assessments</p>
          </div>

          {error && (
            <div style={styles.errorAlert}>
              <span style={styles.errorIcon}>⚠️</span>
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Create a secure password"
              value={password}
              required
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <p style={styles.hint}>Must be at least 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              Already have an account?{' '}
              <a href="/login" style={styles.link}>Login</a>
            </p>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: '40px',
    borderRadius: '16px',
    width: '400px',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(10px)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '10px'
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  errorAlert: {
    backgroundColor: '#FFEBEE',
    border: '1px solid #FFCDD2',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  errorIcon: {
    fontSize: '18px'
  },
  errorText: {
    color: '#B71C1C',
    fontSize: '14px',
    flex: 1
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid #E2E8F0',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: '#0A1929'
    }
  },
  hint: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#718096'
  },
  submitButton: {
    padding: '14px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '10px',
    ':hover': {
      backgroundColor: '#45a049',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
    }
  },
  footer: {
    textAlign: 'center',
    borderTop: '1px solid #E2E8F0',
    paddingTop: '20px',
    marginTop: '10px'
  },
  footerText: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  link: {
    color: '#0A1929',
    textDecoration: 'none',
    fontWeight: 600,
    ':hover': {
      textDecoration: 'underline'
    }
  }
};
