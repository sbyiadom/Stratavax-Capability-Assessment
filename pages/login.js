// pages/login.js - WITH STRATAVAX LOGO AND BACKGROUND IMAGE

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
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
      <div style={styles.backgroundImage} />
      {/* Gradient Overlay */}
      <div style={styles.overlay} />
      
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <Image 
            src="/images/stratavax-logo.svg" 
            alt="Stratavax" 
            width={64} 
            height={64}
            priority
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
          <Link href="/forgot-password" style={styles.link}>Forgot Password?</Link>
          <span style={styles.divider}>|</span>
          <Link href="/register" style={styles.link}>Create Account</Link>
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
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url("/images/login-bg.jpg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
    transform: 'scale(1.05)'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.85) 0%, rgba(26, 35, 126, 0.75) 50%, rgba(13, 71, 161, 0.85) 100%)',
    zIndex: 1
  },
  card: {
    position: 'relative',
    zIndex: 2,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.15)'
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '12px 0 4px 0',
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
    textAlign: 'center',
    fontSize: '14px',
    color: '#64748b'
  },
  divider: {
    color: '#e2e8f0',
    margin: '0 8px'
  },
  link: {
    color: '#1a237e',
    fontWeight: '500',
    textDecoration: 'none'
  }
};

export default Login;
