import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SupervisorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First, check if this is a supervisor email
      const { data: supervisorData, error: supervisorError } = await supabase
        .from("supervisors")
        .select("*")
        .eq("email", email)
        .single();

      if (supervisorError || !supervisorData) {
        throw new Error("Access denied. Supervisor credentials only.");
      }

      // For now, use a simple password check
      // In production, use Supabase Auth with proper password hashing
      if (password !== "supervisor123") { // Change this password
        throw new Error("Invalid credentials");
      }

      // Store supervisor session in localStorage
      localStorage.setItem("supervisorSession", JSON.stringify({
        email: supervisorData.email,
        name: supervisorData.full_name,
        role: supervisorData.role,
        loggedIn: true
      }));

      // Redirect to supervisor dashboard
      router.push("/supervisor");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "20px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ 
            color: "#1565c0", 
            margin: "0 0 10px 0",
            fontSize: "28px"
          }}>
            🏢 Stratavax
          </h1>
          <p style={{ color: "#666", fontSize: "16px" }}>
            Supervisor Login
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#333"
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 15px",
                border: "2px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              placeholder="supervisor@stratax.com"
            />
          </div>

          <div style={{ marginBottom: "25px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              color: "#333"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 15px",
                border: "2px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div style={{
              background: "#ffebee",
              color: "#c62828",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              background: loading ? "#90caf9" : "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.3s"
            }}
          >
            {loading ? "Logging in..." : "Login as Supervisor"}
          </button>
        </form>

        <div style={{
          marginTop: "25px",
          paddingTop: "20px",
          borderTop: "1px solid #eee",
          textAlign: "center"
        }}>
          <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
            Demo credentials: <br />
            <strong>supervisor@stratax.com</strong><br />
            Password: <strong>supervisor123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
