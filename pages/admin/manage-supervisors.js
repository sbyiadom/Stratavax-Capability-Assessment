import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function ManageSupervisors() {
  const router = useRouter();
  const [supervisors, setSupervisors] = useState([]);
  const [newSupervisor, setNewSupervisor] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch existing supervisors
  const fetchSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSupervisors(data || []);
    } catch (err) {
      console.error("Error fetching supervisors:", err);
      setError("Failed to load supervisors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newSupervisor.email,
        password: newSupervisor.password,
        options: {
          data: {
            name: newSupervisor.name,
            role: "supervisor",
            is_supervisor: true
          }
        }
      });

      if (authError) throw authError;

      // 2. Create supervisor record
      const { error: supervisorError } = await supabase
        .from("supervisors")
        .upsert({
          user_id: authData.user.id,
          email: newSupervisor.email,
          full_name: newSupervisor.name,
          role: "supervisor",
          is_active: true,
          permissions: ["view_dashboard", "view_reports", "manage_candidates"]
        }, { onConflict: "email" });

      if (supervisorError) throw supervisorError;

      // 3. Add to users table
      const { error: usersError } = await supabase
        .from("users")
        .upsert({
          id: authData.user.id,
          email: newSupervisor.email,
          full_name: newSupervisor.name,
          role: "supervisor"
        }, { onConflict: "id" });

      if (usersError) {
        console.warn("Note: Could not update users table:", usersError.message);
      }

      setSuccess(`Supervisor ${newSupervisor.name} created successfully!`);
      setNewSupervisor({ name: "", email: "", password: "" });
      fetchSupervisors();

    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateAuth = async (supervisor) => {
    if (!confirm(`Create auth account for ${supervisor.full_name}? They will login with email: ${supervisor.email}`)) {
      return;
    }

    try {
      // Generate a random password
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: supervisor.email,
        password: tempPassword,
        options: {
          data: {
            name: supervisor.full_name,
            role: "supervisor",
            is_supervisor: true
          }
        }
      });

      if (authError) {
        // Try signIn to check if user exists
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: supervisor.email,
          password: "dummy" // Will fail, but we check error message
        });

        if (signInError && signInError.message.includes("Invalid login credentials")) {
          // User exists, update supervisor record
          const { data: userData } = await supabase
            .from("auth.users")
            .select("id")
            .eq("email", supervisor.email)
            .single();

          if (userData) {
            await supabase
              .from("supervisors")
              .update({ user_id: userData.id })
              .eq("id", supervisor.id);

            alert(`Supervisor ${supervisor.full_name} already has auth account. Linked successfully.`);
          }
        } else {
          throw authError;
        }
      } else {
        // Update supervisor with user_id
        await supabase
          .from("supervisors")
          .update({ user_id: authData.user.id })
          .eq("id", supervisor.id);

        alert(`Auth account created for ${supervisor.full_name}\nEmail: ${supervisor.email}\nTemp Password: ${tempPassword}\n\nShare this password securely!`);
      }

      fetchSupervisors();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleActive = async (supervisor) => {
    try {
      const { error } = await supabase
        .from("supervisors")
        .update({ is_active: !supervisor.is_active })
        .eq("id", supervisor.id);

      if (error) throw error;
      
      fetchSupervisors();
      setSuccess(`Supervisor ${supervisor.full_name} ${!supervisor.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <p>Loading supervisors...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px 20px" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <div>
            <h1 style={{ margin: 0, color: "#1565c0" }}>Manage Supervisors</h1>
            <p style={{ margin: "5px 0 0 0", color: "#666" }}>
              Create and manage supervisor dashboard access
            </p>
          </div>
          <button
            onClick={() => router.push("/supervisor")}
            style={{
              padding: "10px 20px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Go to Dashboard
          </button>
        </div>

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
            marginBottom: "20px"
          }}>
            {success}
          </div>
        )}

        {/* Create New Supervisor Form */}
        <div style={{ 
          background: "white", 
          padding: "30px", 
          borderRadius: "12px",
          marginBottom: "30px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Create New Supervisor</h2>
          <form onSubmit={handleCreateSupervisor}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
              gap: "20px",
              marginBottom: "20px"
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={newSupervisor.name}
                  required
                  onChange={(e) => setNewSupervisor({...newSupervisor, name: e.target.value})}
                  style={{ 
                    width: "100%",
                    padding: "12px", 
                    borderRadius: "8px", 
                    border: "1px solid #ddd"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newSupervisor.email}
                  required
                  onChange={(e) => setNewSupervisor({...newSupervisor, email: e.target.value})}
                  style={{ 
                    width: "100%",
                    padding: "12px", 
                    borderRadius: "8px", 
                    border: "1px solid #ddd"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
                  Password *
                </label>
                <input
                  type="password"
                  placeholder="Create password"
                  value={newSupervisor.password}
                  required
                  minLength="6"
                  onChange={(e) => setNewSupervisor({...newSupervisor, password: e.target.value})}
                  style={{ 
                    width: "100%",
                    padding: "12px", 
                    borderRadius: "8px", 
                    border: "1px solid #ddd"
                  }}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{
                padding: "12px 30px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "16px"
              }}
            >
              Create Supervisor Account
            </button>
          </form>
        </div>

        {/* Supervisors List */}
        <div style={{ 
          background: "white", 
          padding: "30px", 
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>Existing Supervisors</h2>
          
          {supervisors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
              No supervisors found. Create your first supervisor above.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #1565c0" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Name</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Email</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Auth Status</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.map((supervisor) => (
                    <tr key={supervisor.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: "500" }}>{supervisor.full_name}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {supervisor.role}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>{supervisor.email}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: supervisor.user_id ? "#e8f5e9" : "#fff3e0",
                          color: supervisor.user_id ? "#2e7d32" : "#f57c00"
                        }}>
                          {supervisor.user_id ? "✅ Auth Linked" : "⚠️ No Auth"}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: supervisor.is_active ? "#e8f5e9" : "#ffebee",
                          color: supervisor.is_active ? "#2e7d32" : "#c62828",
                          cursor: "pointer"
                        }}
                        onClick={() => handleToggleActive(supervisor)}
                        >
                          {supervisor.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: "10px" }}>
                          {!supervisor.user_id && (
                            <button
                              onClick={() => handleUpdateAuth(supervisor)}
                              style={{
                                padding: "8px 16px",
                                background: "#2196F3",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500"
                              }}
                            >
                              Create Auth
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/supervisor-login?email=${encodeURIComponent(supervisor.email)}`)}
                            style={{
                              padding: "8px 16px",
                              background: "#4CAF50",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500"
                            }}
                          >
                            Test Login
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ 
            marginTop: "30px", 
            padding: "20px", 
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>Instructions</h3>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#555", lineHeight: 1.6 }}>
              <li><strong>Create Auth:</strong> Creates authentication account for supervisor to login</li>
              <li><strong>Test Login:</strong> Opens login page with supervisor's email pre-filled</li>
              <li><strong>Status:</strong> Click to toggle between Active/Inactive</li>
              <li>Supervisors login at: <code>/supervisor-login</code></li>
              <li>Dashboard: <code>/supervisor</code></li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
