// pages/forgot-password.js

import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../supabase/client';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      // Check if this is a supervisor account
      const { data: supervisor } = await supabase
        .from('supervisor_profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      // If supervisor, redirect to supervisor reset page
      if (supervisor) {
        router.push('/supervisor-forgot-password');
        setLoading(false);
        return;
      }

      // Otherwise, send reset email for candidate
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push('/login');
      }, 4000);

    } catch (error) {
      console.error('Reset error:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundImage} />
      <div style={styles.overlay} />
      
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <Image 
            src="/images/stratavax-logo.png" 
            alt="Stratavax" 
            width={56} 
            height={56}
            priority
          />
          <h1 style={styles.title}>Stratavax</h1>
          <p style={styles.subtitle}>Reset your password</p>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Check your email</h3>
            <p style={styles.successText}>Password reset link has been sent.</p>
            <p style={styles.successSubtext}>Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <span style={styles.errorIcon}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <Link href="/login" style={styles.link}>Back to Login</Link>
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
    fontSize: '26px',
    fontWeight: '700',
    color: '#1a237e',
    margin: '10px 0 4px 0',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontWeight: '400'
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#991b1b',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  errorIcon: {
    fontSize: '16px'
  },
  successBox: {
    background: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '16px'
  },
  successIcon: {
    fontSize: '48px',
    color: '#16a34a',
    marginBottom: '8px'
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#166534',
    margin: '0 0 8px 0'
  },
  successText: {
    fontSize: '14px',
    color: '#15803d',
    margin: '0 0 4px 0'
  },
  successSubtext: {
    fontSize: '13px',
    color: '#64748b',
    margin: '8px 0 0 0'
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
  submitButton: {
    padding: '14px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '4px',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50px'
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#64748b',
    display: 'flex',
    justifyContent: 'center',
    gap: '8px'
  },
  divider: {
    color: '#e2e8f0'
  },
  link: {
    color: '#1a237e',
    fontWeight: '500',
    textDecoration: 'none'
  }
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
