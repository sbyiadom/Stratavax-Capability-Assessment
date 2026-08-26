// pages/register.js - COMPLETE WORKING VERSION WITH DUPLICATE CHECKS

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../supabase/client';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [nameAvailable, setNameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    programme: '',
    graduationYear: '',
    phone: '',
    preferredDepartment: ''
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/candidate/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear availability status when user types
    if (name === 'fullName') {
      setNameAvailable(null);
    }
    if (name === 'email') {
      setEmailAvailable(null);
    }
  };

  // Check if name is available (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.fullName.trim().length >= 3) {
        await checkNameAvailability(formData.fullName.trim());
      } else {
        setNameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.fullName]);

  // Check if email is available (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.email.trim().length >= 5 && formData.email.includes('@')) {
        await checkEmailAvailability(formData.email.trim());
      } else {
        setEmailAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const checkNameAvailability = async (name) => {
    if (!name || name.length < 3) return;
    
    setCheckingName(true);
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, full_name')
        .ilike('full_name', name);

      if (error) {
        console.error('Name check error:', error);
        return;
      }

      // Check for exact match (case insensitive)
      const exactMatch = data?.some(
        item => item.full_name.toLowerCase() === name.toLowerCase()
      );
      
      setNameAvailable(!exactMatch);
    } catch (err) {
      console.error('Name check failed:', err);
    } finally {
      setCheckingName(false);
    }
  };

  const checkEmailAvailability = async (email) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('id, email')
        .eq('email', email);

      if (error) {
        console.error('Email check error:', error);
        return;
      }

      setEmailAvailable(data?.length === 0);
    } catch (err) {
      console.error('Email check failed:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    // Check if name is already taken
    if (nameAvailable === false) {
      setError('This name is already registered. Please use a different name.');
      setLoading(false);
      return;
    }

    // Check if email is already taken
    if (emailAvailable === false) {
      setError('This email is already registered. Please login instead.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // STEP 1: Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            university: formData.university.trim(),
            programme: formData.programme.trim(),
            graduation_year: formData.graduationYear.trim(),
            phone: formData.phone.trim(),
            preferred_department: formData.preferredDepartment.trim(),
            role: 'candidate'
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        if (authError.message.includes('User already registered')) {
          setError('This email is already registered. Please login instead.');
        } else if (authError.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long.');
        } else if (authError.message.includes('email')) {
          setError('Please enter a valid email address.');
        } else {
          setError(authError.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      console.log('User created successfully:', userId);

      // STEP 2: Wait a moment for the trigger to potentially work
      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 3: Try to create profile using the database function
      console.log('Creating profile using database function...');
      const { data: functionResult, error: functionError } = await supabase.rpc('create_candidate_profile', {
        p_user_id: userId,
        p_full_name: formData.fullName.trim(),
        p_email: formData.email.trim(),
        p_phone: formData.phone.trim() || null,
        p_university: formData.university.trim() || null,
        p_programme: formData.programme.trim() || null,
        p_graduation_year: formData.graduationYear.trim() || null,
        p_preferred_department: formData.preferredDepartment.trim() || null
      });

      if (functionError) {
        console.error('Function error:', functionError);
        
        // Fallback: Try direct insert
        console.log('Trying direct insert fallback...');
        const { error: insertError } = await supabase
          .from('candidate_profiles')
          .upsert({
            id: userId,
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            university: formData.university.trim() || null,
            programme: formData.programme.trim() || null,
            graduation_year: formData.graduationYear.trim() || null,
            preferred_department: formData.preferredDepartment.trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Direct insert error:', insertError);
        } else {
          console.log('Profile created via direct insert');
        }
      } else {
        console.log('Profile created via function:', functionResult);
      }

      // STEP 4: Assign National Service assessment
      try {
        console.log('Assigning National Service assessment...');
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('id')
          .eq('title', 'National Service Recruitment Assessment')
          .maybeSingle();

        if (assessmentError) {
          console.error('Assessment fetch error:', assessmentError);
        } else if (assessmentData) {
          const { error: assignError } = await supabase
            .from('candidate_assessments')
            .upsert({
              user_id: userId,
              assessment_id: assessmentData.id,
              status: 'unblocked',
              created_at: new Date().toISOString()
            });

          if (assignError) {
            console.error('Assessment assignment error:', assignError);
          } else {
            console.log('National Service assessment assigned successfully');
          }
        } else {
          console.log('National Service assessment not found');
        }
      } catch (assignErr) {
        console.error('Assessment assignment failed:', assignErr);
      }

      // STEP 5: Success!
      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
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
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join the Stratavax Talent Assessment Platform</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={styles.successTitle}>Account Created Successfully!</h3>
            <p style={styles.successText}>Your account has been created.</p>
            <p style={styles.successSubtext}>Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    borderColor: nameAvailable === false ? '#dc2626' : 
                                nameAvailable === true ? '#16a34a' : '#e2e8f0'
                  }}
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
                {checkingName && <span style={styles.checkingIndicator}>⏳</span>}
                {nameAvailable === true && formData.fullName.length >= 3 && (
                  <span style={styles.availableIndicator}>✅ Available</span>
                )}
                {nameAvailable === false && formData.fullName.length >= 3 && (
                  <span style={styles.takenIndicator}>❌ Taken</span>
                )}
              </div>
              {nameAvailable === false && (
                <span style={styles.errorHint}>This name is already registered</span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email Address *</label>
              <div style={styles.inputWrapper}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    ...styles.input,
                    borderColor: emailAvailable === false ? '#dc2626' : 
                                emailAvailable === true ? '#16a34a' : '#e2e8f0'
                  }}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
                {checkingEmail && <span style={styles.checkingIndicator}>⏳</span>}
                {emailAvailable === true && formData.email.length >= 5 && formData.email.includes('@') && (
                  <span style={styles.availableIndicator}>✅ Available</span>
                )}
                {emailAvailable === false && formData.email.length >= 5 && formData.email.includes('@') && (
                  <span style={styles.takenIndicator}>❌ Taken</span>
                )}
              </div>
              {emailAvailable === false && (
                <span style={styles.errorHint}>This email is already registered</span>
              )}
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
                minLength="6"
                disabled={loading}
              />
              <span style={styles.hint}>Must be at least 6 characters</span>
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
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter your phone number"
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Preferred Department</label>
              <input
                type="text"
                name="preferredDepartment"
                value={formData.preferredDepartment}
                onChange={handleChange}
                style={styles.input}
                placeholder="Enter your preferred department"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || nameAvailable === false || emailAvailable === false}
              style={{
                ...styles.registerButton,
                opacity: (loading || nameAvailable === false || emailAvailable === false) ? 0.7 : 1,
                cursor: (loading || nameAvailable === false || emailAvailable === false) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <span style={styles.loadingSpinner} />
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <span>Already have an account?</span>
          <Link href="/login" style={styles.link}>Login</Link>
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
    padding: '36px 32px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.15)',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '24px'
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
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    transition: 'all 0.2s',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#f8fafc',
    width: '100%',
    paddingRight: '80px'
  },
  checkingIndicator: {
    position: 'absolute',
    right: '10px',
    fontSize: '16px'
  },
  availableIndicator: {
    position: 'absolute',
    right: '10px',
    fontSize: '13px',
    color: '#16a34a',
    fontWeight: '600'
  },
  takenIndicator: {
    position: 'absolute',
    right: '10px',
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '600'
  },
  errorHint: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '2px'
  },
  hint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px'
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
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50px'
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
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
    textDecoration: 'none',
    marginLeft: '6px'
  }
};

// Add CSS animation for spinner
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
