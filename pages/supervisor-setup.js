// pages/supervisor-setup.js - UPDATED WORKING VERSION
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SupervisorSetup() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "supervisor",
    permissions: ["view_reports", "manage_candidates"]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in as supervisor
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (supervisorSession) {
          try {
            const session = JSON.parse(supervisorSession);
            if (session.loggedIn && session.expires > Date.now()) {
              setIsAuthenticated(true);
            } else {
              // Session expired
              localStorage.removeItem("supervisorSession");
              router.push("/supervisor-login");
            }
          } catch {
            localStorage.removeItem("supervisorSession");
            router.push("/supervisor-login");
          }
        } else {
          router.push("/supervisor-login");
        }
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation
    if (!adminKey) {
      setError("Please enter the admin key");
      setLoading(false);
      return;
    }

    // You can set your own admin key here
    const expectedAdminKey = "TalentAdmin2024!SetupKey@Secure";
    if (adminKey !== expectedAdminKey) {
      setError("Invalid admin key");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      // Check if supervisor already exists
      const { data: existingSupervisor, error: checkError } = await supabase
        .from("supervisors")
        .select("id")
        .eq("email", formData.email.toLowerCase().trim())
        .single();

      if (!checkError && existingSupervisor) {
        setError("A supervisor with this email already exists");
        setLoading(false);
        return;
      }

      // Create password hash using btoa (same as login)
      const passwordHash = btoa(formData.password);

      // Insert new supervisor
      const { data, error: insertError } = await supabase
        .from("supervisors")
        .insert({
          email: formData.email.toLowerCase().trim(),
          password_hash: passwordHash,
          name: formData.name,
          role: formData.role,
          permissions: formData.permissions,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        setError("Failed to create supervisor account: " + insertError.message);
        setLoading(false);
        return;
      }

      setSuccess(`✅ Supervisor account created successfully!`);
      
      // Show credentials clearly
      setTimeout(() => {
        alert(`Supervisor Account Created!\n\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nIMPORTANT: Save these credentials.`);
      }, 100);

      // Clear form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "supervisor",
        permissions: ["view_reports", "manage_candidates"]
      });
      setAdminKey("");

    } catch (err) {
      console.error("Setup error:", err);
      setError("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <p style={{ textAlign: "center" }}>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      padding: "20px" 
    }}>
      <div style={{
        width: "100%",
        maxWidth: "500px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        padding: "40px",
        border: "1px solid #e0e0e0"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ 
            margin: "0 0 10px 0", 
            color: "#1565c0",
            fontSize: "28px",
            fontWeight: "700"
          }}>
            Add New Supervisor
          </h1>
          <p style={{ 
            color: "#666", 
            margin: 0,
            fontSize: "14px"
          }}>
            Create a new supervisor account for the Talent Assessment System
          </p>
        </div>
        
        {error && (
          <div style={{
            padding: "15px",
            background: "#ffebee",
            color: "#c62828",
            borderRadius: "8px",
            marginBottom: "20px",
            borderLeft: "4px solid #f44336",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: "15px",
            background: "#e8f5e9",
            color: "#2e7d32",
            borderRadius: "8px",
            marginBottom: "20px",
            borderLeft: "4px solid #4caf50",
            fontSize: "14px"
          }}>
            {success}
            <p style={{ margin: "10px 0 0 0", fontSize: "13px", fontWeight: "600" }}>
              Account created successfully! The new supervisor can now login.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Admin Key Section */}
          <div style={{ marginBottom: "25px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600", 
              color: "#333",
              fontSize: "14px"
            }}>
              Admin Security Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin security key"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box",
                background: "#f8f9fa"
              }}
              required
            />
            <div style={{ 
              marginTop: "8px", 
              fontSize: "12px", 
              color: "#666",
              padding: "8px",
              background: "#f0f7ff",
              borderRadius: "4px",
              border: "1px dashed #1565c0"
            }}>
              🔒 For security: Use the admin key to verify you're authorized to create supervisor accounts.
            </div>
          </div>

          {/* Divider */}
          <div style={{ 
            height: "1px", 
            background: "#e0e0e0", 
            margin: "25px 0",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "white",
              padding: "0 15px",
              color: "#999",
              fontSize: "12px"
            }}>
              Supervisor Details
            </div>
          </div>

          {/* Supervisor Details */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600", 
              color: "#333",
              fontSize: "14px"
            }}>
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600", 
              color: "#333",
              fontSize: "14px"
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="supervisor@company.com"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600", 
              color: "#333",
              fontSize: "14px"
            }}>
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Minimum 6 characters"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px", 
              fontWeight: "600", 
              color: "#333",
              fontSize: "14px"
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Re-enter password"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: loading ? "#999" : "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseOver={(e) => !loading && (e.target.style.background = "#0d47a1")}
            onMouseOut={(e) => !loading && (e.target.style.background = "#1565c0")}
          >
            {loading ? (
              <>
                <div style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid white",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Creating Account...
              </>
            ) : "Create Supervisor Account"}
          </button>
        </form>

        {/* Important Notes */}
        <div style={{ 
          marginTop: "30px", 
          padding: "20px", 
          background: "#f8f9fa", 
          borderRadius: "8px",
          border: "1px solid #e0e0e0"
        }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "14px" }}>
            ⚠️ Important Information
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: "20px", 
            fontSize: "13px", 
            color: "#666",
            lineHeight: 1.6
          }}>
            <li>Supervisors can access all candidate reports and analytics</li>
            <li>Passwords are hashed using btoa (base64 encoding)</li>
            <li>New supervisors can login immediately after creation</li>
            <li>Keep the admin key secure and do not share it</li>
            <li>Default permissions: view_reports, manage_candidates</li>
          </ul>
        </div>

        {/* Navigation */}
        <div style={{ 
          marginTop: "25px", 
          paddingTop: "20px", 
          borderTop: "1px solid #eee", 
          textAlign: "center" 
        }}>
          <button
            onClick={() => router.push("/supervisor")}
            style={{
              padding: "10px 20px",
              background: "none",
              color: "#1565c0",
              border: "1px solid #1565c0",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              marginRight: "10px"
            }}
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => router.push("/supervisor-login")}
            style={{
              padding: "10px 20px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            Go to Login Page
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
