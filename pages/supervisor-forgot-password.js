// pages/supervisor-forgot-password.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SupervisorForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      // Check if supervisor exists
      const { data: supervisorData, error: supervisorError } = await supabase
        .from("supervisors")
        .select("id, email, name")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (supervisorError || !supervisorData) {
        setError("No account found with this email address");
        setLoading(false);
        return;
      }

      // Generate reset token (in production, use proper token generation)
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in database
      const { error: tokenError } = await supabase
        .from("password_resets")
        .insert({
          email: email.toLowerCase().trim(),
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (tokenError) {
        console.error("Token storage error:", tokenError);
        setError("Failed to initiate password reset. Please try again.");
        setLoading(false);
        return;
      }

      // In production, send email with reset link
      // For demo, just show success message
      setMessage(`Password reset instructions have been sent to ${email}. Check your email.`);
      
      // Log the reset request
      await supabase
        .from("supervisor_logs")
        .insert({
          supervisor_id: supervisorData.id,
          action: "password_reset_request",
          timestamp: new Date().toISOString()
        });

    } catch (err) {
      console.error("Reset password error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
        maxWidth: "450px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
          padding: "25px 20px",
          textAlign: "center",
          color: "white"
        }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
            Reset Password
          </h1>
          <p style={{ 
            margin: "8px 0 0 0", 
            opacity: 0.9,
            fontSize: "14px"
          }}>
            Enter your email to reset your password
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "30px" }}>
          {message && (
            <div style={{
              padding: "15px",
              background: "#e8f5e9",
              color: "#2e7d32",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "14px",
              borderLeft: "4px solid #4caf50"
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              padding: "15px",
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

          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: "25px" }}>
              <label style={{
                display: "block",
                marginBottom: "10px",
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
                placeholder="supervisor@company.com"
                style={{
                  width: "100%",
                  padding: "12px 15px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
                disabled={loading}
                required
              />
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              marginBottom: "20px"
            }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: loading ? "#999" : "#1565c0",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/supervisor-login")}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "none",
                  color: "#1565c0",
                  border: "1px solid #1565c0",
                  borderRadius: "6px",
                  fontSize: "16px",
                  cursor: "pointer"
                }}
              >
                Back to Login
              </button>
            </div>
          </form>

          <div style={{
            textAlign: "center",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
            fontSize: "12px",
            color: "#888"
          }}>
            <p style={{ margin: 0 }}>
              Remember your password?{" "}
              <button
                onClick={() => router.push("/supervisor-login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1565c0",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: 0
                }}
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
