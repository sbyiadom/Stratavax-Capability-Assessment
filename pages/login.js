// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";
import AppLayout from "../components/AppLayout";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginType, setLoginType] = useState("candidate"); // 'candidate' or 'supervisor'
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        throw new Error("User not found or incorrect password");
      }

      // Check user role from metadata
      const userRole = data.user.user_metadata?.role;
      const isSupervisor = data.user.user_metadata?.is_supervisor;

      // Redirect based on login type and user role
      if (loginType === "supervisor") {
        if (userRole !== "supervisor" && !isSupervisor) {
          await supabase.auth.signOut();
          throw new Error("You are not authorized as a supervisor. Please use candidate login.");
        }
        // Redirect to supervisor dashboard
        router.push("/supervisor/dashboard");
      } else {
        // For candidates, allow login even if they have supervisor metadata
        // but redirect to assessment
        router.push("/assessment/pre");
      }

    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout background="/images/login-bg.jpg">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            padding: "30px",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "400px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          {/* Login Type Tabs */}
          <div
            style={{
              display: "flex",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              marginBottom: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => setLoginType("candidate")}
              style={{
                flex: 1,
                padding: "14px",
                backgroundColor: loginType === "candidate" ? "#3b82f6" : "#f9fafb",
                color: loginType === "candidate" ? "white" : "#6b7280",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "16px",
                transition: "all 0.3s ease",
              }}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => setLoginType("supervisor")}
              style={{
                flex: 1,
                padding: "14px",
                backgroundColor: loginType === "supervisor" ? "#8b5cf6" : "#f9fafb",
                color: loginType === "supervisor" ? "white" : "#6b7280",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "16px",
                transition: "all 0.3s ease",
              }}
            >
              Supervisor
            </button>
          </div>

          <h1
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#1f2937",
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            {loginType === "candidate" ? "Candidate Login" : "Supervisor Login"}
          </h1>

          <p
            style={{
              color: "#6b7280",
              textAlign: "center",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            {loginType === "candidate"
              ? "Login to take your assessment"
              : "Login to access supervisor dashboard"}
          </p>

          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "16px",
                  transition: "border 0.3s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "16px",
                  transition: "border 0.3s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: loginType === "candidate" ? "#3b82f6" : "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "16px",
                transition: "all 0.3s ease",
                opacity: loading ? 0.7 : 1,
                marginTop: "10px",
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = 
                    loginType === "candidate" ? "#2563eb" : "#7c3aed";
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = 
                    loginType === "candidate" ? "#3b82f6" : "#8b5cf6";
                }
              }}
            >
              {loading
                ? "Logging in..."
                : loginType === "candidate"
                ? "Login as Candidate"
                : "Login as Supervisor"}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              {loginType === "candidate" ? (
                <>
                  Don't have an account?{" "}
                  <a
                    href="/register"
                    style={{
                      color: "#3b82f6",
                      fontWeight: "500",
                      textDecoration: "none",
                    }}
                    onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
                    onMouseOut={(e) => (e.target.style.textDecoration = "none")}
                  >
                    Register here
                  </a>
                </>
              ) : (
                "Need supervisor access? Contact your administrator."
              )}
            </p>
          </div>

          {/* Mobile Responsive Adjustments */}
          <style jsx>{`
            @media (max-width: 640px) {
              div[style] {
                padding: 20px !important;
                max-width: 90% !important;
              }
              h1 {
                font-size: 20px !important;
              }
              button {
                min-height: 44px !important;
              }
              input {
                min-height: 44px !important;
                font-size: 16px !important; /* Prevents zoom on iOS */
              }
            }
            
            @media (min-width: 641px) and (max-width: 768px) {
              div[style] {
                max-width: 450px !important;
              }
            }
          `}</style>
        </div>
      </div>
    </AppLayout>
  );
}
