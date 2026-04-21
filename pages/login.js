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
  
  // Forgot Password State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

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

      // Ensure user metadata has role
      if (data.user.user_metadata?.role !== 'candidate') {
        await supabase.auth.updateUser({
          data: { role: 'candidate' }
        });
      }

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
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        console.error('Auth error:', error);
        throw new Error("Invalid email or password");
      }

      console.log('✅ Auth successful, user ID:', data.user.id);

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

      await supabase.auth.updateUser({
        data: { 
          role: supervisorData.role || 'supervisor',
          full_name: supervisorData.full_name 
        }
      });

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

  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);

    try {
      const response = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          newPassword: 'Temp123!'
        })
      });

      const data = await response.json();

      if (data.success) {
        setResetMessage({ 
          type: 'success', 
          text: `✅ Password reset successfully!\n\nTemporary password: Temp123!\n\nPlease log in with this temporary password and change it immediately in your Profile settings.` 
        });
        // Clear email field after 6 seconds
        setTimeout(() => {
          setShowResetModal(false);
          setResetEmail("");
          setResetMessage(null);
        }, 6000);
      } else {
        setResetMessage({ 
          type: 'error', 
          text: data.error || 'User not found. Please check your email address.' 
        });
      }
    } catch (err) {
      setResetMessage({ type: 'error', text: 'Something went wrong. Please try again later.' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AppLayout background="/images/login-bg.jpg" showNavigation={false}>
      {/* Glassmorphism Container - Centers the card */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.3)'
      }}>
        
        {/* Glass Card */}
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(20px)",
          padding: "48px 40px",
          borderRadius: "24px",
          width: "420px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          transition: "transform 0.3s ease"
        }}>
          
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <div style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "32px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
            }}>
              🏢
            </div>
            <h1 style={{ 
              marginBottom: 8, 
              color: "white",
              fontSize: "28px",
              fontWeight: "700",
              letterSpacing: "-0.5px"
            }}>
              Stratavax
            </h1>
            <p style={{ 
              color: "rgba(255,255,255,0.7)", 
              fontSize: "13px",
              margin: 0,
              letterSpacing: "0.5px"
            }}>
              Talent Assessment Portal
            </p>
          </div>

          {/* Mode Toggle - Glass Style */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '24px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '5px'
          }}>
            <button
              onClick={() => setLoginMode('candidate')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                background: loginMode === 'candidate' ? 'rgba(255,255,255,0.95)' : 'transparent',
                color: loginMode === 'candidate' ? '#1a1a2e' : 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              👤 Candidate
            </button>
            <button
              onClick={() => setLoginMode('supervisor')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                background: loginMode === 'supervisor' ? 'rgba(255,255,255,0.95)' : 'transparent',
                color: loginMode === 'supervisor' ? '#1a1a2e' : 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              👑 Supervisor
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              backdropFilter: "blur(10px)",
              color: "#fee2e2",
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "13px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={loginMode === 'candidate' ? handleCandidateLogin : handleSupervisorLogin}>
            <div style={{ textAlign: "left", marginBottom: "18px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.9)",
                fontSize: "13px"
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
                  padding: "14px 16px",
                  borderRadius: "14px", 
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255, 255, 255, 0.1)",
                  fontSize: "14px",
                  color: "white",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.5)";
                  e.target.style.background = "rgba(255, 255, 255, 0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.2)";
                  e.target.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              />
            </div>

            <div style={{ textAlign: "left", marginBottom: "22px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.9)",
                fontSize: "13px"
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
                  padding: "14px 16px",
                  borderRadius: "14px", 
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255, 255, 255, 0.1)",
                  fontSize: "14px",
                  color: "white",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.5)";
                  e.target.style.background = "rgba(255, 255, 255, 0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.2)";
                  e.target.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading 
                  ? "rgba(255,255,255,0.3)" 
                  : "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                color: "#1a1a2e",
                border: "none",
                borderRadius: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "700",
                fontSize: "15px",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }
              }}
            >
              {loading ? "Logging in..." : `Login as ${loginMode === 'candidate' ? 'Candidate' : 'Supervisor'}`}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div style={{ 
            marginTop: "20px", 
            textAlign: "center"
          }}>
            <button
              onClick={() => setShowResetModal(true)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: "13px",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.color = "white"}
              onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.7)"}
            >
              Forgot Password?
            </button>
          </div>

          <div style={{ 
            marginTop: "24px", 
            fontSize: "13px", 
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255,255,255,0.1)"
          }}>
            <p style={{ margin: 0 }}>
              Don't have an account?{" "}
              <Link href="/register" legacyBehavior>
                <a style={{ 
                  color: "white", 
                  textDecoration: "none",
                  fontWeight: "600"
                }}>
                  Register here
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Reset Password Modal - Glass Style */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(30, 30, 40, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                Reset Password
              </h3>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetEmail("");
                  setResetMessage(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.color = 'rgba(255,255,255,0.7)';
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '13px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '14px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    transition: 'all 0.2s'
                  }}
                  placeholder="Enter your email address"
                  required
                  onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.5)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}
                />
              </div>

              {resetMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '20px',
                  whiteSpace: 'pre-line',
                  background: resetMessage.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: resetMessage.type === 'success' ? '#bbf7d0' : '#fecaca',
                  border: `1px solid ${resetMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {resetMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: resetLoading ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            
            <div style={{
              marginTop: '16px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center'
            }}>
              <p>A temporary password will be set to: <strong style={{ color: 'white' }}>Temp123!</strong></p>
              <p>After logging in, go to Profile → Change Password to set a new password.</p>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
