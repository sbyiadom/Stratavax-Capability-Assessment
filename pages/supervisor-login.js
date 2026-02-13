// pages/supervisor-login.js - WITH BEAUTIFUL BACKGROUND IMAGE
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SupervisorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkExistingSession = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (supervisorSession) {
          try {
            const session = JSON.parse(supervisorSession);
            if (session.loggedIn && session.expires > Date.now()) {
              router.push("/supervisor");
            } else {
              // Session expired, remove it
              localStorage.removeItem("supervisorSession");
            }
          } catch {
            localStorage.removeItem("supervisorSession");
          }
        }
      }
    };

    checkExistingSession();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // 1. Check if supervisor exists in supervisors table
      const { data: supervisorData, error: supervisorError } = await supabase
        .from("supervisors")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (supervisorError || !supervisorData) {
        setError("Invalid credentials. Please check your email and password.");
        setLoading(false);
        return;
      }

      // 2. Verify password using btoa hash
      const inputHash = btoa(password);
      
      // Check against stored hash in supervisors table
      if (supervisorData.password_hash !== inputHash) {
        setError("Invalid credentials. Please check your email and password.");
        setLoading(false);
        return;
      }

      // 3. Create session data
      const sessionData = {
        loggedIn: true,
        userId: supervisorData.id,
        email: supervisorData.email,
        name: supervisorData.name || supervisorData.email.split('@')[0],
        role: 'supervisor',
        permissions: supervisorData.permissions || ['view_reports', 'manage_candidates'],
        expires: rememberMe ? Date.now() + (30 * 24 * 60 * 60 * 1000) : Date.now() + (8 * 60 * 60 * 1000), // 30 days or 8 hours
        loginTime: new Date().toISOString(),
        lastActivity: Date.now()
      };

      // 4. Store session
      localStorage.setItem("supervisorSession", JSON.stringify(sessionData));
      
      // 5. Update last login time in database
      await supabase
        .from("supervisors")
        .update({ last_login: new Date().toISOString() })
        .eq("id", supervisorData.id);

      // 6. Redirect to supervisor dashboard
      router.push("/supervisor");

    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/supervisor-forgot-password");
  };

  return (
    <div style={styles.container}>
      {/* Background Image with Overlay */}
      <div style={styles.backgroundImage} />
      <div style={styles.overlay} />
      
      {/* Login Card */}
      <div style={styles.card}>
        {/* Header with Glass Effect */}
        <div style={styles.header}>
          <h1 style={styles.title}>Supervisor Portal</h1>
          <p style={styles.subtitle}>
            Talent Assessment Management System
          </p>
        </div>

        {/* Login Form */}
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Welcome Back</h2>

          {error && (
            <div style={styles.errorAlert}>
              <span style={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email Input */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Email Address
              </label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={styles.input}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={styles.inputGroup}>
              <div style={styles.passwordHeader}>
                <label style={styles.label}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.showPasswordButton}
                >
                  {showPassword ? "👁️ Hide" : "👁️ Show"}
                </button>
              </div>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={styles.input}
                  onFocus={(e) => e.target.style.borderColor = "#4F46E5"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={styles.optionsRow}>
              <label style={styles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.checkbox}
                  disabled={loading}
                />
                <span style={styles.rememberText}>Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={styles.forgotButton}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                ...(loading && styles.loginButtonDisabled)
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)")}
              onMouseOut={(e) => !loading && (e.target.style.background = "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)")}
            >
              {loading ? (
                <div style={styles.loadingContent}>
                  <div style={styles.spinner} />
                  <span>Signing In...</span>
                </div>
              ) : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              Need access? Contact your system administrator
            </p>
            <p style={styles.copyright}>
              © {new Date().getFullYear()} Talent Assessment System
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ===== STYLES WITH BACKGROUND IMAGE =====
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden"
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1920&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    animation: "float 20s ease-in-out infinite",
    transform: "scale(1.1)"
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)",
    backdropFilter: "blur(3px)"
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "450px",
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    borderRadius: "24px",
    boxShadow: "0 30px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
    overflow: "hidden",
    animation: "fadeIn 0.6s ease-out"
  },
  header: {
    background: "linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%)",
    backdropFilter: "blur(5px)",
    padding: "40px 30px",
    textAlign: "center",
    color: "white",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  },
  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "800",
    letterSpacing: "1px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)"
  },
  subtitle: {
    margin: "10px 0 0 0",
    opacity: 0.9,
    fontSize: "15px",
    fontWeight: "500"
  },
  formContainer: {
    padding: "40px 35px",
    background: "rgba(255,255,255,0.05)"
  },
  formTitle: {
    margin: "0 0 30px 0",
    color: "white",
    fontSize: "24px",
    fontWeight: "600",
    textAlign: "center",
    textShadow: "0 2px 5px rgba(0,0,0,0.2)"
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "15px 20px",
    background: "rgba(239, 68, 68, 0.2)",
    backdropFilter: "blur(5px)",
    color: "#fff",
    borderRadius: "12px",
    marginBottom: "25px",
    fontSize: "14px",
    border: "1px solid rgba(239, 68, 68, 0.3)"
  },
  errorIcon: {
    fontSize: "18px"
  },
  inputGroup: {
    marginBottom: "25px"
  },
  passwordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  label: {
    color: "rgba(255,255,255,0.9)",
    fontSize: "14px",
    fontWeight: "600",
    letterSpacing: "0.5px"
  },
  showPasswordButton: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
    transition: "all 0.2s"
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  inputIcon: {
    position: "absolute",
    left: "15px",
    color: "rgba(255,255,255,0.5)",
    fontSize: "16px",
    zIndex: 1
  },
  input: {
    width: "100%",
    padding: "14px 15px 14px 45px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "12px",
    fontSize: "15px",
    color: "white",
    boxSizing: "border-box",
    transition: "all 0.3s",
    outline: "none"
  },
  optionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px"
  },
  rememberLabel: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    gap: "8px"
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#4F46E5"
  },
  rememberText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: "14px"
  },
  forgotButton: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.8)",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
    textDecorationColor: "rgba(255,255,255,0.3)"
  },
  loginButton: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
    marginBottom: "20px"
  },
  loginButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed"
  },
  loadingContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px"
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid white",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  footer: {
    textAlign: "center",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)"
  },
  footerText: {
    margin: "0 0 5px 0",
    color: "rgba(255,255,255,0.6)",
    fontSize: "13px"
  },
  copyright: {
    margin: 0,
    color: "rgba(255,255,255,0.4)",
    fontSize: "12px"
  }
};
