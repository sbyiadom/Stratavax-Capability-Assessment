import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SupervisorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // 2. Check if user is in supervisors table and active
      const { data: supervisor, error: supervisorError } = await supabase
        .from('supervisors')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (supervisorError || !supervisor) {
        // Not a supervisor, sign them out
        await supabase.auth.signOut();
        throw new Error("You don't have supervisor access or your account is inactive");
      }

      // 3. Update last login
      await supabase
        .from('supervisors')
        .update({ last_login: new Date().toISOString() })
        .eq('id', supervisor.id);

      // 4. Store session in localStorage
      localStorage.setItem("supervisorSession", JSON.stringify({
        loggedIn: true,
        user_id: authData.user.id,
        email: supervisor.email,
        full_name: supervisor.full_name,
        role: supervisor.role,
        permissions: supervisor.permissions
      }));

      // 5. Redirect based on role
      if (supervisor.role === 'admin') {
        router.push("/admin");
      } else {
        router.push("/supervisor");
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🏢 Stratavax</div>
        <h1 style={styles.title}>Supervisor Login</h1>
        
        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="Enter your email"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.5 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={styles.links}>
          <a href="/login" style={styles.link}>Candidate Login</a>
          <span style={styles.separator}>|</span>
          <a href="/supervisor-forgot-password" style={styles.link}>Forgot Password?</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '20px',
    color: '#1565c0'
  },
  title: {
    margin: '0 0 30px 0',
    color: '#333',
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 600
  },
  errorAlert: {
    padding: '12px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: 500,
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'border 0.2s',
    ':focus': {
      borderColor: '#1565c0',
      outline: 'none'
    }
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: '#1565c0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginBottom: '20px',
    ':hover': {
      background: '#0d47a1'
    }
  },
  links: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  link: {
    color: '#1565c0',
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  separator: {
    color: '#666'
  }
};
