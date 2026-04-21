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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.3)'
      }}>
        
        {/* Single Glass Card */}
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(18, 24, 38, 0.92)',
          backdropFilter: 'blur(16px)',
          borderRadius: '28px',
          padding: '48px 40px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transition: 'transform 0.3s ease'
        }}>
          
          {/* Logo & Brand */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px',
              boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)'
            }}>
              🏢
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              color: 'white',
              letterSpacing: '-0.5px'
            }}>
              StrataVax
            </h1>
            <p style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              margin: '6px 0 0',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Talent Assessment Platform
            </p>
          </div>

          {/* Mission Statement */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '0 8px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 10px',
              background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Empowering Talent Through Assessment
            </h2>
            <p style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.7)',
              margin: 0
            }}>
              Human capital is the bedrock of any organisation. 
              The right people in the right roles delivering the right outputs.
            </p>
          </div>

          {/* Trust Stats Row - Inspired by Evalex */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            gap: '16px',
            marginBottom: '28px',
            padding: '16px 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                95%
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Client Satisfaction
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '22px', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                83%
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Prediction Accuracy
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '22px', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                35+
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Years of Excellence
              </div>
            </div>
          </div>

          {/* Features Row - Compact */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '28px',
            justifyContent: 'center'
          }}>
            {[
              { icon: "📋", text: "Skill Assessments" },
              { icon: "📊", text: "Real-time Results" },
              { icon: "📈", text: "Progress Analytics" },
              { icon: "🏅", text: "Certifications" }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  flex: '1',
                  minWidth: '100px',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{feature.icon}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>{feature.text}</div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            marginBottom: '28px'
          }} />

          {/* Welcome Back */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h3 style={{ 
              marginBottom: "6px", 
              color: "white",
              fontSize: "22px",
              fontWeight: "600"
            }}>
              Welcome Back
            </h3>
            <p style={{ 
              color: "rgba(255,255,255,0.6)", 
              fontSize: "13px",
              margin: 0
            }}>
              Sign in to access your account
            </p>
          </div>

          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '24px',
            borderRadius: '14px',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '5px'
          }}>
            <button
              onClick={() => setLoginMode('candidate')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                background: loginMode === 'candidate' 
                  ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' 
                  : 'transparent',
                color: loginMode === 'candidate' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              🎓 Candidate
            </button>
            <button
              onClick={() => setLoginMode('supervisor')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                background: loginMode === 'supervisor' 
                  ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' 
                  : 'transparent',
                color: loginMode === 'supervisor' ? 'white' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              👔 Administrator
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#fecaca",
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
            {/* Email Field */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.8)",
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
                  padding: "14px 16px",
                  borderRadius: "14px", 
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255, 255, 255, 0.08)",
                  fontSize: "14px",
                  color: "white",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3B82F6";
                  e.target.style.background = "rgba(255, 255, 255, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  e.target.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "rgba(255,255,255,0.8)",
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
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255, 255, 255, 0.08)",
                  fontSize: "14px",
                  color: "white",
                  boxSizing: "border-box",
                  transition: "all 0.2s ease",
                  outline: "none"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3B82F6";
                  e.target.style.background = "rgba(255, 255, 255, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  e.target.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              />
            </div>

            {/* Forgot Password */}
            <div style={{ marginBottom: "24px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "13px",
                  transition: "color 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.color = "#3B82F6"}
                onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.5)"}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading 
                  ? "rgba(59, 130, 246, 0.5)" 
                  : "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                color: "white",
                border: "none",
                borderRadius: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "15px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 8px 20px -5px rgba(59, 130, 246, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div style={{ 
            marginTop: "24px", 
            fontSize: "12px", 
            color: "rgba(255,255,255,0.4)",
            textAlign: "center"
          }}>
            <p style={{ margin: 0 }}>
              Need an account?{" "}
              <Link href="/register" legacyBehavior>
                <a style={{ 
                  color: "#3B82F6", 
                  textDecoration: "none",
                  fontWeight: "500"
                }}>
                  Contact your administrator
                </a>
              </Link>
            </p>
          </div>

          {/* Trust Badge - Small */}
          <div style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "10px",
            color: "rgba(255,255,255,0.3)",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <span>✓ Secure & Private</span>
            <span>✓ Enterprise Security</span>
            <span>✓ Role-Based Access</span>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(18, 24, 38, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: '600', color: 'white', margin: 0 }}>
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
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)'
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
                  color: 'rgba(255,255,255,0.8)',
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
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {resetMessage && (
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '20px',
                  background: resetMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
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
                  background: resetLoading ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: resetLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <div style={{
              marginTop: '16px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              textAlign: 'center'
            }}>
              Temporary password: <span style={{ color: '#3B82F6' }}>Temp123!</span>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
