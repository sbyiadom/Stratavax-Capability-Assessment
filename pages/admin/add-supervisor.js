import { useState, useEffect } from "react";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/login");
          return;
        }

        // Check if user is admin (you can modify this logic based on your admin check)
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (userData?.role === "admin") {
          setIsAdmin(true);
        } else {
          router.push("/"); // Redirect non-admins
        }
      } catch (error) {
        console.error("Admin check error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  const handleAddSupervisor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name,
            role: "supervisor",
            is_supervisor: true
          }
        },
      });

      if (authError) throw authError;

      // 2. Create supervisor record
      const { error: supervisorError } = await supabase
        .from("supervisors")
        .insert({
          user_id: authData.user.id,
          email: email,
          full_name: name,
          is_active: true,
          permissions: ["view_dashboard", "view_reports", "manage_candidates"]
        });

      if (supervisorError) throw supervisorError;

      // 3. Also add to users table if you use it
      const { error: usersError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: email,
          full_name: name,
          role: "supervisor"
        });

      if (usersError) {
        console.warn("Note: Could not add to users table:", usersError.message);
        // Continue even if this fails
      }

      setSuccess(`Supervisor added successfully! ${name} can now login at /supervisor-login with email: ${email}`);
      
      // Clear form
      setName("");
      setEmail("");
      setPassword("");

    } catch (err) {
      setError(err.message);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <p>Checking permissions...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect from useEffect
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          padding: "40px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ 
            margin: "0 0 10px 0", 
            color: "#1565c0", 
            textAlign: "center"
          }}>
            Add New Supervisor
          </h1>
          <p style={{ 
            textAlign: "center", 
            color: "#666", 
            marginBottom: "30px"
          }}>
            Create supervisor accounts for dashboard access
          </p>

          {error && (
            <div style={{ 
              padding: "12px", 
              background: "#ffebee", 
              color: "#c62828",
              borderRadius: "6px",
              marginBottom: "20px"
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              padding: "12px", 
              background: "#e8f5e9", 
              color: "#2e7d32",
              borderRadius: "6px",
              marginBottom: "20px"
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleAddSupervisor}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontWeight: "500",
                color: "#333"
              }}>
                Full Name
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
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontWeight: "500",
                color: "#333"
              }}>
                Email
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
              <label style={{ 
                display: "block", 
                marginBottom: "8px",
                fontWeight: "500",
                color: "#333"
              }}>
                Temporary Password
              </label>
              <input
                type="password"
                placeholder="Create initial password"
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
              <div style={{ 
                fontSize: "12px", 
                color: "#666", 
                marginTop: "5px"
              }}>
                Supervisor will use this password to login
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "#1565c0",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
              onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}
            >
              Add Supervisor
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
              <li>Default permissions: View dashboard, reports, and manage candidates</li>
              <li>Supervisor can change password after first login</li>
            </ul>
          </div>

          <div style={{ 
            textAlign: "center", 
            marginTop: "30px"
          }}>
            <button
              onClick={() => router.push("/supervisor")}
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: "#1565c0",
                border: "1px solid #1565c0",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Go to Supervisor Dashboard
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
