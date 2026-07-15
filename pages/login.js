// pages/login.js - CLEAN VERSION (single export)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabase/client';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userRole = session.user?.user_metadata?.role || 'candidate';
        redirectUser(userRole);
      }
    };
    checkSession();
  }, []);

  const redirectUser = (role) => {
    if (role === 'admin') {
      router.push('/admin');
    } else if (role === 'supervisor') {
      router.push('/supervisor');
    } else {
      router.push('/candidate/dashboard');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError('No user found');
        setLoading(false);
        return;
      }

      const userRole = data.user.user_metadata?.role || 'candidate';
      redirectUser(userRole);

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <h1 style={styles.title}>Stratavax</h1>
          <p style={styles.subtitle}>Talent Assessment Portal</p>
        </div>

        <div style={styles.roleToggle}>
          <button
            onClick={() => setRole('candidate')}
            style={{
              ...styles.roleButton,
              background: role === 'candidate' ? '#1a237e' : 'transparent',
              color: role === 'candidate' ? 'white' : '#475569',
              border: role === 'candidate' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            Candidate
          </button>
          <button
            onClick={() => setRole('supervisor')}
            style={{
              ...styles.roleButton,
              background: role === 'supervisor' ? '#1a237e' : 'transparent',
              color: role === 'supervisor' ? 'white' : '#475569',
              border: role === 'supervisor' ? 'none' : '1px solid #e2e8f0'
            }}
          >
            Supervisor
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.loginButton,
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Logging in...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        <div style={styles.footer}>
          <a href="/forgot-password" style={styles.link}>Forgot Password?</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a1628 0%, #1a237e 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  logo: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 0 4px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  roleToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '4px'
  },
  roleButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    background: 'transparent',
    border: '1px solid #e2e8f0'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#991b1b',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none',
    fontFamily: 'inherit'
  },
  loginButton: {
    padding: '14px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '8px',
    fontFamily: 'inherit'
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center'
  },
  link: {
    color: '#1a237e',
    fontSize: '14px',
    textDecoration: 'none'
  }
};
