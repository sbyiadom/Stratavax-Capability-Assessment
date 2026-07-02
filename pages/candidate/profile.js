// pages/candidate/profile.js (Update your existing profile page)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabase/client';
import { useRequireAuth } from '../../utils/requireAuth';

export default function CandidateProfile() {
  const { session, loading: authLoading } = useRequireAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    university: '',
    programme: '',
    graduation_year: '',
    preferred_department: ''
  });

  useEffect(() => {
    if (!session?.user) return;
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || '',
          university: data.university || '',
          programme: data.programme || '',
          graduation_year: data.graduation_year || '',
          preferred_department: data.preferred_department || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          full_name: profile.full_name,
          university: profile.university,
          programme: profile.programme,
          graduation_year: profile.graduation_year,
          preferred_department: profile.preferred_department,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  if (authLoading || loading) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>My Profile</h1>
        <p style={styles.subtitle}>Update your personal information</p>

        {message && (
          <div style={{ 
            ...styles.message, 
            background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: message.type === 'success' ? '#2e7d32' : '#c62828'
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              style={{ ...styles.input, background: '#f5f5f5' }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>University / Institution</label>
            <input
              type="text"
              name="university"
              value={profile.university}
              onChange={handleChange}
              placeholder="Enter your university name"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Programme of Study</label>
            <input
              type="text"
              name="programme"
              value={profile.programme}
              onChange={handleChange}
              placeholder="e.g., BSc Computer Science"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Graduation Year</label>
            <select
              name="graduation_year"
              value={profile.graduation_year}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Select graduation year</option>
              {[2024, 2025, 2026, 2027, 2028].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Preferred Department</label>
            <select
              name="preferred_department"
              value={profile.preferred_department}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Select preferred department</option>
              <option value="Operations & Production">Operations & Production</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
              <option value="Technical Services">Technical Services</option>
              <option value="Administration">Administration</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Sales & Marketing">Sales & Marketing</option>
            </select>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a237e',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '24px'
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a202c'
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  saveButton: {
    padding: '12px 24px',
    background: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  }
};
