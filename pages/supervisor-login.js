import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";

export default function SupervisorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is a supervisor by looking up their email
        const { data: supervisor } = await supabase
          .from("supervisors")
          .select("id, role")
          .eq("email", session.user.email)
          .eq("is_active", true)
          .maybeSingle();

        if (supervisor) {
          // Create local session for supervisor dashboard
          const supervisorSession = {
            id: supervisor.id,
            email: session.user.email,
            loggedIn: true,
            loginTime: new Date().toISOString()
          };
          localStorage.setItem("supervisorSession", JSON.stringify(supervisorSession));
          router.push("/supervisor");
        }
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First, attempt to sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("Invalid email or password");
      }

      if (!authData.user) {
        throw new Error("Invalid email or password");
      }

      // Now that we're authenticated, query the supervisors table using email
      const { data: supervisor, error: supervisorError } = await supabase
        .from("supervisors")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (supervisorError) {
        console.error("Supervisor query error:", supervisorError);
        await supabase.auth.signOut();
        throw new Error("Error accessing supervisor data");
      }

      if (!supervisor) {
        // If no supervisor record found, sign out the auth user
        await supabase.auth.signOut();
        throw new Error("You don't have supervisor access");
      }

      // Update last login timestamp
      await supabase
        .from("supervisors")
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", supervisor.id);

      // Create local session for supervisor dashboard
      const supervisorSession = {
        id: supervisor.id,
        user_id: authData.user.id,
        email: supervisor.email,
        full_name: supervisor.full_name,
        role: supervisor.role,
        loggedIn: true,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem("supervisorSession", JSON.stringify(supervisorSession));

      // Redirect to supervisor dashboard
      router.push("/supervisor");
      
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
      
      // Sign out if there was an error
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Supervisor Login</h1>
          <p style={styles.subtitle}>Access the talent assessment dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.error}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supervisor@company.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={styles.passwordInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div style={styles.options}>
            <Link href="/supervisor-forgot-password" style={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.loginButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <span style={styles.loadingContainer}>
                <span style={styles.loadingSpinner} />
                Logging in...
              </span>
            ) : (
              "Login to Dashboard"
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <Link href="/" style={styles.footerLink}>
            ← Back to Main Site
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#333',
    fontSize: '28px',
    fontWeight: 700
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  errorIcon: {
    fontSize: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333'
  },
  input: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    ':focus': {
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102,126,234,0.1)'
    }
  },
  passwordContainer: {
    position: 'relative'
  },
  passwordInput: {
    width: '100%',
    padding: '12px',
    paddingRight: '40px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    outline: 'none',
    ':focus': {
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102,126,234,0.1)'
    }
  },
  passwordToggle: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: 0
  },
  options: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  forgotLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '13px',
    ':hover': {
      textDecoration: 'underline'
    }
  },
  loginButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    marginTop: '10px'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  loadingSpinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center'
  },
  footerLink: {
    color: '#666',
    textDecoration: 'none',
    fontSize: '13px',
    ':hover': {
      color: '#667eea'
    }
  }
};
