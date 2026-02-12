// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../supabase/client";
import AppLayout from "../components/AppLayout";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error || !data.user) {
      setError("User not found or incorrect password");
      setLoading(false);
      return;
    }

    // Redirect to candidate dashboard instead of pre-assessment
router.push("/candidate/dashboard");
  };

  return (
    <AppLayout background="/images/login-bg.jpg">
      <form
        onSubmit={handleLogin}
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          padding: 40,
          borderRadius: 16,
          width: 380,
          margin: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <h1 style={{ 
            marginBottom: 5, 
            color: "#1565c0",
            fontSize: "28px"
          }}>
            🏢 Stratavax
          </h1>
          <p style={{ 
            color: "#666", 
            fontSize: "16px",
            margin: 0
          }}>
            Talent Assessment Portal
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: "left" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
            color: "#333",
            fontSize: "14px"
          }}>
            Email
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: "100%", 
              padding: 12,
              borderRadius: 8, 
              border: "2px solid #ddd",
              fontSize: "16px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ textAlign: "left" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
            color: "#333",
            fontSize: "14px"
          }}>
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
              padding: 12,
              borderRadius: 8, 
              border: "2px solid #ddd",
              fontSize: "16px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 15,
            backgroundColor: loading ? "#81c784" : "#4CAF50",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            marginTop: 10,
            transition: "background 0.3s"
          }}
        >
          {loading ? "Logging in..." : "Login as Candidate"}
        </button>

        <div style={{ 
          marginTop: "25px", 
          paddingTop: "20px", 
          borderTop: "1px solid #eee", 
          textAlign: "center" 
        }}>
          <p style={{ 
            color: "#666", 
            marginBottom: "15px",
            fontSize: "14px"
          }}>
            Are you a supervisor?
          </p>
          <Link href="/supervisor-login" legacyBehavior>
            <a style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#1565c0",
              color: "white",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              transition: "background 0.3s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
            onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}
            >
              Login as Supervisor
            </a>
          </Link>
          <p style={{ 
            fontSize: "12px", 
            color: "#888", 
            marginTop: "10px",
            fontStyle: "italic"
          }}>
            Supervisor access only. Candidates please login above.
          </p>
        </div>

        <div style={{ 
          marginTop: "20px", 
          fontSize: "14px", 
          color: "#666" 
        }}>
          <p style={{ margin: 0 }}>
            Don't have an account?{" "}
            <Link href="/register" legacyBehavior>
              <a style={{ 
                color: "#1565c0", 
                textDecoration: "none",
                fontWeight: "500"
              }}>
                Register here
              </a>
            </Link>
          </p>
        </div>
      </form>
    </AppLayout>
  );
}

