// pages/supervisor-login.js - FIXED VERSION
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

  const handleDemoLogin = () => {
    setEmail("admin@talentassess.com");
    setPassword("admin123"); // Changed from demo123 to admin123
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
          padding: "30px 20px",
          textAlign: "center",
          color: "white"
        }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>
            Supervisor Portal
          </h1>
          <p style={{ 
            margin: "10px 0 0 0", 
            opacity: 0.9,
            fontSize: "14px"
          }}>
            Talent Assessment Management System
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: "30px" }}>
          <h2 style={{ 
            margin: "0 0 25px 0", 
            color: "#333",
            fontSize: "22px",
            textAlign: "center"
          }}>
            Sign In
          </h2>

          {error && (
            <div style={{
              padding: "12px 15px",
              background: "#ffebee",
              color: "#c62828",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "14px",
              borderLeft: "4px solid #f44336"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email Input */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "#555",
                fontSize: "14px",
                fontWeight: "500"
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@talentassess.com"
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1565c0"}
                onBlur={(e) => e.target.style.borderColor = "#ddd"}
                disabled={loading}
                required
              />
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: "15px" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px"
              }}>
                <label style={{
                  color: "#555",
                  fontSize: "14px",
                  fontWeight: "500"
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#1565c0",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1565c0"}
                onBlur={(e) => e.target.style.borderColor = "#ddd"}
                disabled={loading}
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px"
            }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "14px",
                color: "#555"
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    marginRight: "8px",
                    cursor: "pointer"
                  }}
                  disabled={loading}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1565c0",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: 0
                }}
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
                width: "100%",
                padding: "14px",
                background: loading ? "#999" : "#1565c0",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.3s",
                marginBottom: "15px"
              }}
              onMouseOver={(e) => !loading && (e.target.style.background = "#0d47a1")}
              onMouseOut={(e) => !loading && (e.target.style.background = "#1565c0")}
            >
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid white",
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginRight: "10px"
                  }} />
                  Signing In...
                </div>
              ) : "Sign In"}
            </button>

            {/* Demo Login Button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{
                width: "100%",
                padding: "12px",
                background: "none",
                color: "#1565c0",
                border: "1px solid #1565c0",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.3s",
                marginBottom: "20px"
              }}
              onMouseOver={(e) => {
                e.target.style.background = "#1565c0";
                e.target.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "none";
                e.target.style.color = "#1565c0";
              }}
            >
              Use Test Account (admin@talentassess.com / admin123)
            </button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: "center",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
            fontSize: "12px",
            color: "#888"
          }}>
            <p style={{ margin: 0 }}>
              Need access? Contact your system administrator
            </p>
            <p style={{ margin: "5px 0 0 0" }}>
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
      `}</style>
    </div>
  );
}
