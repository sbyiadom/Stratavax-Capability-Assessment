// pages/register.js - COMPLETE REGISTRATION PAGE

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../supabase/client';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    programme: '',
    graduationYear: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            role: 'candidate',
            full_name: formData.fullName.trim(),
            university: formData.university.trim(),
            programme: formData.programme.trim(),
            graduation_year: formData.graduationYear.trim()
          }
        }
      });

      if (authError) {
        setError(authError.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Create candidate profile
      const { error: profileError } = await supabase
        .from('candidate_profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            university: formData.university.trim(),
            programme: formData.programme.trim(),
            graduation_year: formData.graduationYear.trim(),
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // User is created but profile failed - still show success but with warning
        setSuccess(true);
        setError('Account created but profile setup incomplete. Please contact support.');
        setLoading(false);
        return;
      }

      // Step 3: Assign National Service assessment to the candidate
      try {
        // Get the National Service assessment ID
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('id')
          .eq('title', 'National Service Recruitment Assessment')
          .single();

        if (!assessmentError && assessmentData) {
          // Assign the assessment to the candidate
          await supabase
            .from('candidate_assessments')
            .insert([
              {
                user_id: authData.user.id,
                assessment_id: assessmentData.id,
                status: 'unblocked', // National Service is always unblocked
                created_at: new Date().toISOString()
              }
            ]);
        }
      } catch (assignError) {
        console.error('Assessment assignment error:', assignError);
        // Don't fail registration if assignment fails
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.background} />
      
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logoEmoji}>📊</div>
          <h1 style={styles.title}>Stratavax</h1>
          <p style={styles.subtitle}>Create your candidate account</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.successBox}>
            ✅ Account created successfully! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
              placeholder="Min 6 characters"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={styles.input}
              placeholder="Confirm your password"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>University</label>
            <input
              type="text"
              name="university"
              value={formData.university}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your university"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Programme / Course</label>
            <input
              type="text"
              name="programme"
              value={formData.programme}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your programme"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Graduation Year</label>
            <input
              type="text"
              name="graduationYear"
              value={formData.graduationYear}
              onChange={handleChange}
              style={styles.input}
              placeholder="e.g., 2025"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              ...styles.registerButton,
              opacity: (loading || success) ? 0.7 : 1
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account? <Link href="/login" style={styles.link}>Login</Link>
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
    maxWidth: '440px',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.2)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  logoEmoji: {
    fontSize: '48px',
    marginBottom: '8px'
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
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#991b1b',
    fontSize: '14px'
  },
  successBox: {
    background: '#dcfce7',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#166534',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
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
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    transition: 'all 0.2s',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#f8fafc'
  },
  registerButton: {
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
  link: {
    color: '#1a237e',
    fontWeight: '600',
    textDecoration: 'none'
  }
};
