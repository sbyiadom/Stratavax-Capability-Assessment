// pages/supervisor-login.js - UPDATED: Removed test account login button
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AppLayout from "../components/AppLayout";

export default function SupervisorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supervisorSession = localStorage.getItem("supervisorSession");
      if (supervisorSession) {
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn) {
            router.push("/supervisor");
          }
        } catch (err) {
          // Invalid session, clear it
          localStorage.removeItem("supervisorSession");
        }
      }
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simple validation
    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      // For demo purposes, accept any email/password
      // In production, this would connect to your authentication system
      const supervisorSession = {
        loggedIn: true,
        email: email,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem("supervisorSession", JSON.stringify(supervisorSession));
      
      // Redirect to supervisor dashboard
      router.push("/supervisor");
      
    } catch (err) {
      setError("Login failed. Please check your credentials.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
        padding: "20px"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
          width: "100%",
          maxWidth: "400px"
        }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1 style={{
              margin: "0 0 10px 0",
              color: "#1565c0",
              fontSize: "28px",
              fontWeight: "600"
            }}>
              Supervisor Portal
            </h1>
            <p style={{
              color: "#666",
              margin: "0",
              fontSize: "14px"
            }}>
              Access candidate performance reports
            </p>
          </div>

          {error && (
            <div style={{
              padding: "12px",
              background: "#ffebee",
              color: "#c62828",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "14px",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "#333",
                fontSize: "14px",
                fontWeight: "500"
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1565c0"}
                onBlur={(e) => e.target.style.borderColor = "#ddd"}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "#333",
                fontSize: "14px",
                fontWeight: "500"
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  fontSize: "16px",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#1565c0"}
                onBlur={(e) => e.target.style.borderColor = "#ddd"}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "#1565c0",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background 0.2s",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                if (!loading) e.target.style.background = "#0d47a1";
              }}
              onMouseOut={(e) => {
                if (!loading) e.target.style.background = "#1565c0";
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: "18px",
                    height: "18px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
            textAlign: "center"
          }}>
            <p style={{
              color: "#666",
              fontSize: "13px",
              lineHeight: 1.5,
              margin: 0
            }}>
              Contact your system administrator if you need access to the supervisor portal.
            </p>
          </div>

          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </AppLayout>
  );
}
