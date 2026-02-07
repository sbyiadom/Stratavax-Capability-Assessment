import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function AddSupervisor() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);

  // Check supervisor authentication
  useEffect(() => {
    const checkSupervisorAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn) {
            setIsSupervisor(true);
          } else {
            router.push("/supervisor-login");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };

    checkSupervisorAuth();
  }, [router]);

  const handleAddSupervisor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            role: "supervisor",
            is_supervisor: true
          }
        }
      });

      if (authError) {
        // If user already exists, we still add them as supervisor
        if (authError.message.includes("already registered")) {
          // Get existing user ID
          const { data: existingUser } = await supabase
            .from("auth.users")
            .select("id")
            .eq("email", email)
            .single();

          if (existingUser) {
            // Add to supervisors table
            const { error: supervisorError } = await supabase
              .from("supervisors")
              .upsert({
                user_id: existingUser.id,
                email: email,
                full_name: name,
                role: "supervisor",
                is_active: true,
                permissions: ["view_dashboard", "view_reports", "manage_candidates"]
              }, { onConflict: "email" });

            if (supervisorError) throw supervisorError;

            setSuccess(`${name} added as supervisor! They already have an auth account and can login with their existing password.`);
            setName("");
            setEmail("");
            setPassword("");
            setLoading(false);
            return;
          }
        }
        throw authError;
      }

      // 2. Add to supervisors table
      const { error: supervisorError } = await supabase
        .from("supervisors")
        .insert({
          user_id: authData.user.id,
          email: email,
          full_name: name,
          role: "supervisor",
          is_active: true,
          permissions: ["view_dashboard", "view_reports", "manage_candidates"]
        });

      if (supervisorError) throw supervisorError;

      // 3. Add to users table
      await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: email,
          full_name: name,
          role: "supervisor"
        });

      setSuccess(`✅ ${name} added as supervisor successfully!\n\nEmail: ${email}\nPassword: ${password}\n\nShare these credentials securely. They need to check email for confirmation.`);
      
      // Clear form
      setName("");
      setEmail("");
      setPassword("");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  if (!isSupervisor) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/supervisor-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}>
        <p style={{ textAlign: "center", color: "white" }}>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/images/supervisor-bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: "40px",
        borderRadius: "15px",
        width: "100%",
        maxWidth: "550px",
        boxShadow: "0 15px 50px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "2px solid #e3f2fd",
          paddingBottom: "15px"
        }}>
          <div>
            <h1 style={{ margin: 0, color: "#1565c0", fontSize: "28px" }}>Add New Supervisor</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666", fontSize: "14px" }}>
              Grant dashboard access to team members
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => router.push("/supervisor")}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "#1565c0",
                border: "1px solid #1565c0",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#1565c0";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#1565c0";
              }}
            >
              ← Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "#d32f2f",
                border: "1px solid #d32f2f",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#d32f2f";
                e.currentTarget.style.color = "white";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#d32f2f";
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div style={{ 
            padding: "15px", 
            background: "#ffebee", 
            color: "#c62828",
            borderRadius: "8px",
            marginBottom: "20px",
            borderLeft: "4px solid #c62828"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div style={{ 
            padding: "15px", 
            background: "#e8f5e9", 
            color: "#2e7d32",
            borderRadius: "8px",
            marginBottom: "20px",
            borderLeft: "4px solid #2e7d32",
            whiteSpace: "pre-line"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>✅</span>
              <span>{success}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleAddSupervisor}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="Enter supervisor's full name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              style={{ 
                width: "100%",
                padding: "12px 15px", 
                borderRadius: "8px", 
                border: "2px solid #e0e0e0",
                fontSize: "16px",
                boxSizing: "border-box",
                transition: "border 0.2s"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1565c0"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
              Email *
            </label>
            <input
              type="email"
              placeholder="Enter supervisor's email address"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: "100%",
                padding: "12px 15px", 
                borderRadius: "8px", 
                border: "2px solid #e0e0e0",
                fontSize: "16px",
                boxSizing: "border-box",
                transition: "border 0.2s"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1565c0"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
            />
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
              Temporary Password *
            </label>
            <input
              type="password"
              placeholder="Set initial password (min. 6 characters)"
              value={password}
              required
              minLength="6"
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: "100%",
                padding: "12px 15px", 
                borderRadius: "8px", 
                border: "2px solid #e0e0e0",
                fontSize: "16px",
                boxSizing: "border-box",
                transition: "border 0.2s"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1565c0"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e0e0e0"}
            />
            <div style={{ fontSize: "13px", color: "#666", marginTop: "8px", paddingLeft: "5px" }}>
              <span style={{ color: "#1565c0" }}>ℹ️</span> Supervisor will use this password for first login
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              backgroundColor: loading ? "#ccc" : "#4CAF50",
              background: loading ? "#ccc" : "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "all 0.3s",
              boxShadow: loading ? "none" : "0 4px 15px rgba(76, 175, 80, 0.3)"
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(76, 175, 80, 0.4)";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(76, 175, 80, 0.3)";
              }
            }}
          >
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <div style={{ 
                  width: "20px", 
                  height: "20px", 
                  border: "2px solid white",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                <span>Adding Supervisor...</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>👥</span>
                <span>Add Supervisor</span>
              </div>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: "35px",
          padding: "25px",
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          borderRadius: "10px",
          border: "1px solid #e0e0e0"
        }}>
          <h3 style={{ 
            margin: "0 0 15px 0", 
            color: "#1565c0", 
            fontSize: "17px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ fontSize: "20px" }}>📋</span>
            Supervisor Access Information
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: "20px",
            color: "#555",
            fontSize: "14px",
            lineHeight: 1.7
          }}>
            <li><strong>Login URL:</strong> <code>/supervisor-login</code></li>
            <li><strong>Dashboard URL:</strong> <code>/supervisor</code></li>
            <li><strong>Permissions:</strong> View dashboard, reports, and manage candidates</li>
            <li><strong>Email Confirmation:</strong> New supervisors will receive confirmation email</li>
            <li><strong>Security:</strong> Share credentials securely via encrypted channels</li>
          </ul>
        </div>

        <div style={{ 
          marginTop: "25px", 
          textAlign: "center",
          fontSize: "13px",
          color: "#777",
          paddingTop: "20px",
          borderTop: "1px solid #eee"
        }}>
          <p style={{ margin: 0 }}>
            <span style={{ color: "#1565c0", fontWeight: "500" }}>Note:</span> Supervisors have full access to candidate assessment data and analytics.
          </p>
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
