// pages/login.js - WITH BRANDING AND BACKGROUND

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
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
      {/* Background Image */}
      <div style={styles.background} />
      
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <Image 
            src="/images/stratavax-logo.svg" 
            alt="Stratavax" 
            width={60} 
            height={60}
            style={styles.logoImage}
          />
          <h1 style={styles.title}>Stratavax</h1>
          <p style={styles.subtitle}>Talent Assessment Portal</p>
        </div>

        {/* Role Toggle */}
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
    padding: '20px',
    position: 'relative',
    overflow: 'hidden'
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #0a1628 0%, #1a237e 50%, #0d47a1 100%)',
    zIndex: 0
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  logoImage: {
    marginBottom: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontWeight: '400'
  },
  roleToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: '#f1f5f9',
    borderRadius: '12px',
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
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#475569'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    transition: 'all 0.2s',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#f8fafc'
  },
  loginButton: {
    padding: '14px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
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

export default Login;
