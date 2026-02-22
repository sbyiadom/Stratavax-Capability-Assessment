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
  const [loginMode, setLoginMode] = useState('candidate'); // 'candidate' or 'supervisor'

  const handleCandidateLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('🔵 Candidate login attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        throw new Error("Invalid email or password");
      }

      // Store candidate session
      const sessionData = {
        loggedIn: true,
        user_id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        role: 'candidate',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        timestamp: Date.now()
      };
      
      localStorage.setItem("userSession", JSON.stringify(sessionData));
      console.log('✅ Candidate logged in, redirecting to dashboard');
      router.push('/candidate/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupervisorLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('🟠 Supervisor login attempt for:', email);
      
      // First authenticate
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        throw new Error("Invalid email or password");
      }

      console.log('✅ Auth successful, checking supervisor status...');

      // Check if user exists in supervisor_profiles
      const { data: supervisor, error: supervisorError } = await supabase
        .from('supervisor_profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (supervisorError) {
        console.error('Supervisor check error:', supervisorError);
        throw new Error("Error checking supervisor status");
      }

      if (!supervisor) {
        // If not found in supervisor_profiles, sign out and show error
        await supabase.auth.signOut();
        throw new Error("No supervisor account found with these credentials");
      }

      // Store supervisor session
      const sessionData = {
        loggedIn: true,
        user_id: data.user.id,
        email: data.user.email,
        full_name: supervisor.full_name,
        role: supervisor.role || 'supervisor',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        timestamp: Date.now()
      };
      
      localStorage.setItem("userSession", JSON.stringify(sessionData));
      console.log('✅ Supervisor logged in with role:', sessionData.role);

      // Redirect based on role
      if (supervisor.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/supervisor');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout background="/images/login-bg.jpg">
      <div style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        padding: 40,
        borderRadius: 16,
        width: 380,
        margin: "auto",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
      }}>
        <div style={{ marginBottom: 10, textAlign: "center" }}>
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

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: '#f0f0f0',
          padding: '4px'
        }}>
          <button
            onClick={() => setLoginMode('candidate')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: loginMode === 'candidate' ? '#4CAF50' : 'transparent',
              color: loginMode === 'candidate' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
          >
            👤 Candidate
          </button>
          <button
            onClick={() => setLoginMode('supervisor')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: loginMode === 'supervisor' ? '#1565c0' : 'transparent',
              color: loginMode === 'supervisor' ? 'white' : '#666',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
          >
            👑 Supervisor
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={loginMode === 'candidate' ? handleCandidateLogin : handleSupervisorLogin}>
          <div style={{ textAlign: "left", marginBottom: "15px" }}>
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

          <div style={{ textAlign: "left", marginBottom: "20px" }}>
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
              width: "100%",
              padding: 15,
              background: loading ? "#ccc" : (loginMode === 'candidate' ? "#4CAF50" : "#1565c0"),
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background 0.3s"
            }}
          >
            {loading ? "Logging in..." : `Login as ${loginMode === 'candidate' ? 'Candidate' : 'Supervisor'}`}
          </button>
        </form>

        <div style={{ 
          marginTop: "20px", 
          fontSize: "14px", 
          color: "#666",
          textAlign: "center"
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
      </div>
    </AppLayout>
  );
}
