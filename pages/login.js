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
  const [loginMode, setLoginMode] = useState('candidate');

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
        console.error('Auth error:', error);
        throw new Error("Invalid email or password");
      }

      console.log('✅ Auth successful, user ID:', data.user.id);
      console.log('✅ Auth email:', data.user.email);

      // Try to query supervisor_profiles
      console.log('🔍 Querying supervisor_profiles...');
      
      let supervisor = null;
      let queryError = null;
      
      try {
        const result = await supabase
          .from('supervisor_profiles')
          .select('*')
          .eq('id', data.user.id);
        
        supervisor = result.data;
        queryError = result.error;
        
        console.log('📊 Query result:', { 
          data: supervisor, 
          error: queryError,
          status: result.status,
          statusText: result.statusText
        });
        
      } catch (queryErr) {
        console.error('💥 Query exception:', queryErr);
        throw new Error(`Database query failed: ${queryErr.message}`);
      }

      if (queryError) {
        console.error('❌ Supervisor query error details:', queryError);
        
        // Check specific error codes
        if (queryError.code === '42P01') {
          throw new Error("Supervisor table does not exist");
        } else if (queryError.code === '42501' || queryError.message?.includes('permission')) {
          throw new Error("Permission denied - check RLS policies");
        } else {
          throw new Error(`Database error: ${queryError.message}`);
        }
      }

      if (!supervisor || supervisor.length === 0) {
        console.log('❌ No supervisor found with ID:', data.user.id);
        
        // Try searching by email as fallback
        console.log('🔍 Trying fallback search by email...');
        const { data: byEmail, error: emailError } = await supabase
          .from('supervisor_profiles')
          .select('*')
          .eq('email', email);
        
        console.log('📊 Email search result:', { data: byEmail, error: emailError });
        
        if (byEmail && byEmail.length > 0) {
          console.log('✅ Found supervisor by email:', byEmail[0]);
          supervisor = byEmail;
        } else {
          await supabase.auth.signOut();
          throw new Error("No supervisor account found with these credentials");
        }
      }

      const supervisorData = supervisor[0];
      console.log('✅ Supervisor found:', { 
        id: supervisorData.id,
        email: supervisorData.email,
        role: supervisorData.role,
        name: supervisorData.full_name 
      });

      // Store supervisor session
      const sessionData = {
        loggedIn: true,
        user_id: data.user.id,
        email: data.user.email,
        full_name: supervisorData.full_name,
        role: supervisorData.role || 'supervisor',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        timestamp: Date.now()
      };
      
      localStorage.setItem("userSession", JSON.stringify(sessionData));
      console.log('✅ Session stored, redirecting based on role:', sessionData.role);

      // Redirect based on role
      if (supervisorData.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/supervisor');
      }

    } catch (err) {
      console.error('🔴 Login error:', err);
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
