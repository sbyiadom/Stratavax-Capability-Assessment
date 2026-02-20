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
    <div style={styles.pageContainer}>
      {/* Full Page Background */}
      <div style={styles.backgroundImage} />
      
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

      <style jsx>{`
        @keyframes slowZoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  pageContainer: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden'
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(/images/supervisor-login-bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    animation: 'slowZoom 20s infinite alternate',
    zIndex: 0
  },
  container: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1
  },
  card: {
    background: 'rgba(255, 255, 255, 0.1)', // Very transparent
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '40px',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    animation: 'fadeIn 0.6s ease'
  },
  logo: {
    fontSize: '28px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '15px',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    letterSpacing: '1px'
  },
  title: {
    margin: '0 0 30px 0',
    color: 'white',
    textAlign: 'center',
    fontSize: '26px',
    fontWeight: 600,
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  errorAlert: {
    padding: '12px',
    background: 'rgba(211, 47, 47, 0.2)',
    backdropFilter: 'blur(5px)',
    color: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: 'white',
    fontWeight: 500,
    fontSize: '14px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
    letterSpacing: '0.5px'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(5px)',
    color: 'white',
    outline: 'none',
    '::placeholder': {
      color: 'rgba(255, 255, 255, 0.6)'
    },
    ':focus': {
      borderColor: 'white',
      background: 'rgba(255, 255, 255, 0.25)',
      boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)'
    }
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'rgba(21, 101, 192, 0.8)',
    backdropFilter: 'blur(5px)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '20px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
    letterSpacing: '0.5px',
    ':hover': {
      background: 'rgba(21, 101, 192, 0.95)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
      borderColor: 'white'
    }
  },
  links: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'all 0.2s',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
    opacity: 0.9,
    ':hover': {
      opacity: 1,
      textDecoration: 'underline'
    }
  },
  separator: {
    color: 'rgba(255, 255, 255, 0.6)'
  }
};
