// pages/login.js
import { useState, useEffect } from "react";
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
  const [focusedField, setFocusedField] = useState(null);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Rotating background images
  const backgrounds = [
    "/images/login-bg-1.jpg",
    "/images/login-bg-2.jpg",
    "/images/login-bg-3.jpg"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgrounds.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

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
    <AppLayout background={backgrounds[backgroundIndex]} showNavigation={false}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}>
        
        {/* Two-Column Layout */}
        <div style={{
          display: 'flex',
          maxWidth: '1100px',
          width: '100%',
          gap: '30px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          
          {/* LEFT COLUMN - Mission & Features (Glass) */}
          <div style={{
            flex: 1,
            minWidth: '280px',
            maxWidth: '450px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: '32px',
            padding: '40px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            
            {/* Logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '32px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🏢
              </div>
              <div>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  margin: 0,
                  color: 'white',
                  letterSpacing: '-0.5px'
                }}>
                  Stratavax
                </h1>
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  margin: '4px 0 0',
                  letterSpacing: '0.5px'
                }}>
                  TALENT ASSESSMENT PLATFORM
                </p>
              </div>
            </div>

            {/* Mission Statement */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                margin: '0 0 16px',
                lineHeight: 1.2,
                background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Empowering Talent<br />Through Assessment
              </h2>
              <p style={{
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.8)',
                margin: 0
              }}>
                Stratavax provides comprehensive skill assessment tools for candidates 
                and powerful analytics for supervisors to track and develop organizational talent.
              </p>
            </div>

            {/* Feature Highlights - Interactive Glass Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '32px'
            }}>
              {[
                { icon: "📋", title: "Skill Assessments", desc: "Role-specific evaluation" },
                { icon: "📊", title: "Real-time Results", desc: "Instant performance data" },
                { icon: "📈", title: "Progress Analytics", desc: "Track improvement" },
                { icon: "🏅", title: "Certifications", desc: "Verified achievements" }
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{feature.icon}</div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '600', color: 'white' }}>
                    {feature.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div style={{
              display: 'flex',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              {[
                { text: "Secure & Private" },
                { text: "Role-Based Access" },
                { text: "Enterprise Security" }
              ].map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#4ade80' }}>✓</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN - Login Form (Glass) */}
          <div style={{
            width: '420px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: '32px',
            padding: '40px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            
            {/* Welcome Header */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h2 style={{ 
                marginBottom: "8px", 
                color: "white",
                fontSize: "26px",
                fontWeight: "600",
                letterSpacing: "-0.3px"
              }}>
                Welcome Back
              </h2>
              <p style={{ 
                color: "rgba(255,255,255,0.7)", 
                fontSize: "14px",
                margin: 0
              }}>
                Sign in to access your account
              </p>
            </div>

            {/* Mode Toggle */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '32px',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '4px'
            }}>
              <button
                onClick={() => setLoginMode('candidate')}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: loginMode === 'candidate' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                  color: loginMode === 'candidate' ? '#1a1a2e' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
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
                  background: loginMode === 'supervisor' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                  color: loginMode === 'supervisor' ? '#1a1a2e' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
              >
                👔 Administrator
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                backdropFilter: "blur(10px)",
                color: "#fee2e2",
                padding: "12px 16px",
                borderRadius: "12px",
                marginBottom: "24px",
                fontSize: "13px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}

            <form onSubmit={loginMode === 'candidate' ? handleCandidateLogin : handleSupervisorLogin}>
              {/* Email Field */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "rgba(255,255,255,0.9)",
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
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={{ 
                    width: "100%", 
                    padding: "14px 16px",
                    borderRadius: "14px", 
                    border: focusedField === 'email' 
                      ? "1px solid rgba(255,255,255,0.5)" 
                      : "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255, 255, 255, 0.1)",
                    fontSize: "14px",
                    color: "white",
                    boxSizing: "border-box",
                    transition: "all 0.3s ease",
                    outline: "none"
                  }}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: "24px" }}>
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
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{ 
                    width: "100%", 
                    padding: "14px 16px",
                    borderRadius: "14px", 
                    border: focusedField === 'password' 
                      ? "1px solid rgba(255,255,255,0.5)" 
                      : "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255, 255, 255, 0.1)",
                    fontSize: "14px",
                    color: "white",
                    boxSizing: "border-box",
                    transition: "all 0.3s ease",
                    outline: "none"
                  }}
                />
              </div>

              {/* Forgot Password */}
              <div style={{ marginBottom: "28px", textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: "13px",
                    transition: "color 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.color = "white"}
                  onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.6)"}
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
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Footer */}
            <div style={{ 
              marginTop: "32px", 
              fontSize: "13px", 
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.1)"
            }}>
              <p style={{ margin: 0 }}>
                Need an account?{" "}
                <Link href="/register" legacyBehavior>
                  <a style={{ 
                    color: "white", 
                    textDecoration: "none",
                    fontWeight: "600"
                  }}>
                    Contact administrator
                  </a>
                </Link>
              </p>
            </div>
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
            maxWidth: '420px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: '700', color: 'white', margin: 0 }}>
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
                    background: 'rgba(255,255,255,0.1)',
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
                  cursor: resetLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <div style={{
              marginTop: '16px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center'
            }}>
              Temporary password: <strong style={{ color: 'white' }}>Temp123!</strong>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
