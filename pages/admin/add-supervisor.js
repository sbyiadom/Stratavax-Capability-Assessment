import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

export default function AddSupervisor() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin authentication
  useEffect(() => {
    const checkAdminAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn && session.role === 'admin') {
            setIsAdmin(true);
          } else {
            router.push("/supervisor");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };

    checkAdminAuth();
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
            full_name: name,
            role: "supervisor"
          }
        }
      });

      if (authError) {
        // If user already exists, we'll try to handle that gracefully
        if (authError.message.includes("already registered")) {
          setSuccess(`⚠️ User with email ${email} already exists. They can login with their existing password.`);
          setName("");
          setEmail("");
          setPassword("");
          setLoading(false);
          return;
        }
        throw authError;
      }

      // 2. Store supervisor info in localStorage for demo purposes
      // In production, you'd store this in a database
      const supervisors = JSON.parse(localStorage.getItem('supervisors') || '[]');
      
      // Check if supervisor already exists
      const existingIndex = supervisors.findIndex(s => s.email === email);
      const supervisorData = {
        id: authData?.user?.id || Date.now().toString(),
        email: email,
        full_name: name,
        role: "supervisor",
        is_active: true,
        created_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        supervisors[existingIndex] = supervisorData;
      } else {
        supervisors.push(supervisorData);
      }
      
      localStorage.setItem('supervisors', JSON.stringify(supervisors));

      setSuccess(`✅ ${name} added as supervisor successfully!\n\nEmail: ${email}\nPassword: ${password}\n\nShare these credentials securely.`);
      
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

  if (!isAdmin) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/admin-bg.jpg')",
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
      background: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/admin-bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: "40px",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "500px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "20px"
        }}>
          <h1 style={{ margin: 0, color: "#1565c0" }}>Add New Supervisor</h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => router.push("/supervisor")}
              style={{
                padding: "8px 16px",
                background: "#1565c0",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ← Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                background: "#d32f2f",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <p style={{ color: "#666", marginBottom: "30px" }}>
          Grant dashboard access to other supervisors
        </p>

        {error && (
          <div style={{ 
            padding: "15px", 
            background: "#ffebee", 
            color: "#c62828",
            borderRadius: "8px",
            marginBottom: "20px"
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
            whiteSpace: "pre-line"
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleAddSupervisor}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
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
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Email *
            </label>
            <input
              type="email"
              placeholder="Enter supervisor's email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: "100%",
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Temporary Password *
            </label>
            <input
              type="password"
              placeholder="Set initial password"
              value={password}
              required
              minLength="6"
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: "100%",
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #ddd",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
              Minimum 6 characters. Supervisor will use this to login.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: loading ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background 0.2s"
            }}
          >
            {loading ? "Adding Supervisor..." : "Add Supervisor"}
          </button>
        </form>

        <div style={{ 
          marginTop: "30px",
          padding: "20px",
          background: "#f8f9fa",
          borderRadius: "8px"
        }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "16px" }}>
            Supervisor Access Information
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: "20px",
            color: "#555",
            fontSize: "14px",
            lineHeight: 1.6
          }}>
            <li>Login URL: <code>/supervisor-login</code></li>
            <li>Dashboard URL: <code>/supervisor</code></li>
            <li>Permissions: View dashboard, reports, and manage candidates</li>
            <li>New supervisors need to confirm email before first login</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
