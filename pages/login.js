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
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleCandidateLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        throw new Error("Invalid email or password");
      }

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
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        throw new Error("Invalid email or password");
      }

      let supervisor = null;
      
      const result = await supabase
        .from('supervisor_profiles')
        .select('*')
        .eq('id', data.user.id);
      
      supervisor = result.data;

      if (!supervisor || supervisor.length === 0) {
        const { data: byEmail } = await supabase
          .from('supervisor_profiles')
          .select('*')
          .eq('email', email);
        
        if (byEmail && byEmail.length > 0) {
          supervisor = byEmail;
        } else {
          await supabase.auth.signOut();
          throw new Error("No supervisor account found with these credentials");
        }
      }

      const supervisorData = supervisor[0];

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

      if (supervisorData.role === 'admin') {
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
          text: `✅ Password reset successfully!\n\nTemporary password: Temp123!\n\nPlease log in with this temporary password and change it immediately.` 
        });
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
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(2px)'
      }}>
        {/* Left Column - Platform Information */}
        <div style={{
          flex: 1,
          maxWidth: '500px',
          marginRight: '60px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}>
          {/* Brand - Transparent */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #1565c0 0%, #0A1929 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px'
              }}>
                🏢
              </div>
              <div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: 0,
                  color: '#0A1929'
                }}>
                  Stratavax
                </h1>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '13px' }}>
                  Talent Assessment Platform
                </p>
              </div>
            </div>
            
            <h2 style={{
              fontSize: '32px',
              fontWeight: '800',
              margin: '0 0 16px',
              lineHeight: 1.2,
              color: '#0A1929'
            }}>
              Professional Skills<br />Assessment Platform
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#475569',
              lineHeight: 1.6,
              marginBottom: '8px'
            }}>
              Stratavax provides comprehensive skill assessment tools for candidates 
              and powerful analytics for supervisors to track organizational talent.
            </p>
          </div>

          {/* Platform Features - Transparent Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📋</div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#0A1929' }}>Skill Assessments</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Role-specific evaluation tests</p>
            </div>
            
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📊</div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#0A1929' }}>Real-time Results</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Instant performance feedback</p>
            </div>
            
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📈</div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#0A1929' }}>Progress Analytics</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Track improvement over time</p>
            </div>
            
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              transition: 'transform 0.2s, background 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🏅</div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', color: '#0A1929' }}>Certificates</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Verified achievement badges</p>
            </div>
          </div>

          {/* Trust indicators - Transparent */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span style={{ fontWeight: '600', color: '#0A1929', fontSize: '14px' }}>Secure & Private</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span style={{ fontWeight: '600', color: '#0A1929', fontSize: '14px' }}>Role-Based Access Control</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span style={{ fontWeight: '600', color: '#0A1929', fontSize: '14px' }}>Enterprise-Grade Security</span>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form (Transparent) */}
        <div style={{
          width: '450px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          border: '1px solid rgba(255, 255, 255, 0.4)'
        }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h2 style={{ 
              marginBottom: "8px", 
              color: "#0A1929",
              fontSize: "28px",
              fontWeight: "700"
            }}>
              Welcome Back
            </h2>
            <p style={{ 
              color: "#64748B", 
              fontSize: "14px",
              margin: 0
            }}>
              Sign in to access your account
            </p>
          </div>

          {/* Mode Toggle - Transparent */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '28px',
            borderRadius: '12px',
            background: 'rgba(241, 245, 249, 0.7)',
            padding: '4px',
            backdropFilter: 'blur(5px)'
          }}>
            <button
              onClick={() => setLoginMode('candidate')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: loginMode === 'candidate' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                color: loginMode === 'candidate' ? '#1565c0' : '#64748b',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxShadow: loginMode === 'candidate' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              🎓 Candidate Access
            </button>
            <button
              onClick={() => setLoginMode('supervisor')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: loginMode === 'supervisor' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                color: loginMode === 'supervisor' ? '#1565c0' : '#64748b',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxShadow: loginMode === 'supervisor' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              👔 Supervisor Portal
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: "rgba(254, 226, 226, 0.9)",
              backdropFilter: "blur(10px)",
              color: "#991B1B",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "13px",
              border: "1px solid rgba(254, 202, 202, 0.5)"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={loginMode === 'candidate' ? handleCandidateLogin : handleSupervisorLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "#0A1929",
                fontSize: "13px"
              }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "12px 14px",
                  borderRadius: "10px", 
                  border: "1px solid rgba(203, 213, 225, 0.5)",
                  background: "rgba(255, 255, 255, 0.8)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "all 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1565c0";
                  e.target.style.background = "rgba(255, 255, 255, 0.95)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(203, 213, 225, 0.5)";
                  e.target.style.background = "rgba(255, 255, 255, 0.8)";
                }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "#0A1929",
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
                  padding: "12px 14px",
                  borderRadius: "10px", 
                  border: "1px solid rgba(203, 213, 225, 0.5)",
                  background: "rgba(255, 255, 255, 0.8)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "all 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1565c0";
                  e.target.style.background = "rgba(255, 255, 255, 0.95)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(203, 213, 225, 0.5)";
                  e.target.style.background = "rgba(255, 255, 255, 0.8)";
                }}
              />
            </div>

            <div style={{ marginBottom: "24px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1565c0",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500"
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "rgba(148, 163, 184, 0.8)" : "#1565c0",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "15px",
                transition: "all 0.2s",
                backdropFilter: "blur(5px)"
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = "#0A1929";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = "#1565c0";
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{ 
            marginTop: "24px", 
            fontSize: "13px", 
            color: "#64748B",
            textAlign: "center",
            paddingTop: "20px",
            borderTop: "1px solid rgba(226, 232, 240, 0.5)"
          }}>
            <p style={{ margin: 0 }}>
              Don't have an account?{" "}
              <Link href="/register" legacyBehavior>
                <a style={{ 
                  color: "#1565c0", 
                  textDecoration: "none",
                  fontWeight: "600"
                }}>
                  Contact your administrator
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Reset Password Modal - Transparent */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255, 255, 255, 0.4)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#0A1929',
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
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#0A1929',
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
                    padding: '12px',
                    border: '1px solid rgba(203, 213, 225, 0.5)',
                    borderRadius: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}
                  placeholder="Enter your email address"
                  required
                  onFocus={(e) => e.target.style.borderColor = "#1565c0"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(203, 213, 225, 0.5)"}
                />
              </div>

              {resetMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  whiteSpace: 'pre-line',
                  background: resetMessage.type === 'success' ? 'rgba(240, 253, 244, 0.9)' : 'rgba(254, 242, 242, 0.9)',
                  color: resetMessage.type === 'success' ? '#166534' : '#991B1B',
                  border: `1px solid ${resetMessage.type === 'success' ? 'rgba(187, 247, 208, 0.5)' : 'rgba(254, 226, 226, 0.5)'}`,
                  backdropFilter: 'blur(10px)'
                }}>
                  {resetMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: resetLoading ? 'rgba(148, 163, 184, 0.8)' : '#1565c0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!resetLoading) e.target.style.background = "#0A1929";
                }}
                onMouseLeave={(e) => {
                  if (!resetLoading) e.target.style.background = "#1565c0";
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <div style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#64748B',
              textAlign: 'center'
            }}>
              Temporary password: <strong>Temp123!</strong><br />
              Change it after logging in.
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
