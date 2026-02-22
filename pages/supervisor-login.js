import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Login() {
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
      console.log('Attempting login for:', email);

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        throw new Error(data.error || `Login failed`);
      }

      // Store session data
      const sessionData = {
        loggedIn: true,
        user_id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        role: data.role,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        timestamp: Date.now()
      };
      
      localStorage.setItem("userSession", JSON.stringify(sessionData));
      
      console.log('Session stored, role:', data.role);

      // Redirect based on role
      if (data.role === 'admin') {
        router.push('/admin');
      } else if (data.role === 'supervisor') {
        router.push('/supervisor');
      } else {
        router.push('/candidate/dashboard');
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      backgroundImage: 'url(/images/login-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
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
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '40px',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    logo: {
      fontSize: '28px',
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: '15px',
      color: 'white',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
    },
    title: {
      margin: '0 0 30px 0',
      color: 'white',
      textAlign: 'center',
      fontSize: '26px',
      fontWeight: 600
    },
    errorAlert: {
      padding: '12px',
      background: 'rgba(211, 47, 47, 0.2)',
      color: 'white',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px',
      textAlign: 'center',
      border: '1px solid rgba(211, 47, 47, 0.3)'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: 'white',
      fontWeight: 500,
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      fontSize: '16px',
      background: 'rgba(255, 255, 255, 0.15)',
      color: 'white',
      outline: 'none',
      transition: 'all 0.2s ease',
      ':focus': {
        borderColor: 'rgba(255, 255, 255, 0.8)',
        background: 'rgba(255, 255, 255, 0.25)'
      }
    },
    submitButton: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      marginBottom: '20px',
      transition: 'all 0.2s ease',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }
    },
    links: {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      fontSize: '14px'
    },
    link: {
      color: 'white',
      textDecoration: 'none',
      cursor: 'pointer',
      opacity: 0.9,
      ':hover': {
        opacity: 1,
        textDecoration: 'underline'
      }
    },
    separator: {
      color: 'rgba(255, 255, 255, 0.6)'
    },
    registerLink: {
      marginTop: '20px',
      textAlign: 'center',
      borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      paddingTop: '20px'
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.backgroundImage} />
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>🏢 Stratavax</div>
          <h1 style={styles.title}>Welcome Back</h1>
          
          {error && <div style={styles.errorAlert}>{error}</div>}

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
            <Link href="/register" legacyBehavior>
              <a style={styles.link}>Create Account</a>
            </Link>
            <span style={styles.separator}>|</span>
            <Link href="/forgot-password" legacyBehavior>
              <a style={styles.link}>Forgot Password?</a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
