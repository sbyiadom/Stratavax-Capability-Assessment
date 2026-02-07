import { useState } from "react";
import { supabase } from "../supabase/client";
import AppLayout from "../components/AppLayout";

export default function CreateSupervisorAuth() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const createAuthAccount = async () => {
    setError("");
    setSuccess("");

    try {
      // Create auth account for supervisor
      const { data, error } = await supabase.auth.signUp({
        email: "supervisor@stratax.com",
        password: password,
        options: {
          data: {
            name: "Supervisor Admin",
            role: "supervisor",
            is_supervisor: true
          }
        }
      });

      if (error) {
        // If user already exists, try to sign in to get the user_id
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: "supervisor@stratax.com",
          password: password
        });

        if (signInError) {
          throw new Error(`Auth exists but password is wrong. ${signInError.message}`);
        }

        // Update supervisors table with user_id
        const { error: updateError } = await supabase
          .from("supervisors")
          .update({ user_id: signInData.user.id })
          .eq("email", "supervisor@stratax.com");

        if (updateError) throw updateError;

        setSuccess(`Supervisor auth already exists! Updated record with user ID: ${signInData.user.id}`);
        return;
      }

      // Update supervisors table with the new user_id
      const { error: updateError } = await supabase
        .from("supervisors")
        .update({ user_id: data.user.id })
        .eq("email", "supervisor@stratax.com");

      if (updateError) throw updateError;

      setSuccess(`Auth account created successfully! User ID: ${data.user.id}\n\nEmail: supervisor@stratax.com\nPassword: ${password}\n\nSave this password securely!`);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AppLayout>
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "20px"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ margin: "0 0 20px 0", color: "#1565c0" }}>
            Create Supervisor Auth Account
          </h1>
          
          <div style={{ 
            padding: "20px", 
            background: "#e3f2fd", 
            borderRadius: "8px",
            marginBottom: "20px"
          }}>
            <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>
              Supervisor Details:
            </p>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              <li>Name: <strong>Supervisor Admin</strong></li>
              <li>Email: <strong>supervisor@stratax.com</strong></li>
              <li>Already exists in supervisors table</li>
            </ul>
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
              marginBottom: "20px",
              whiteSpace: "pre-line"
            }}>
              {success}
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
              Set Password *
            </label>
            <input
              type="password"
              placeholder="Enter password for supervisor"
              value={password}
              required
              minLength="6"
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: "100%",
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #ddd"
              }}
            />
            <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
              Minimum 6 characters. Supervisor will use this to login.
            </div>
          </div>

          <button
            onClick={createAuthAccount}
            disabled={!password || password.length < 6}
            style={{
              width: "100%",
              padding: "14px",
              background: !password || password.length < 6 ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: !password || password.length < 6 ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "16px"
            }}
          >
            Create Auth Account
          </button>

          <div style={{ 
            marginTop: "30px", 
            paddingTop: "20px", 
            borderTop: "1px solid #eee"
          }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>What happens:</h3>
            <ol style={{ margin: 0, paddingLeft: "20px", color: "#555", lineHeight: 1.6 }}>
              <li>Creates authentication account for supervisor@stratax.com</li>
              <li>Links the auth user_id to the supervisors table</li>
              <li>Supervisor can login at /supervisor-login</li>
              <li>After login, they'll have access to /supervisor dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
