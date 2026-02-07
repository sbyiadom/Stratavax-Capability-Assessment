import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

export default function SetupNewSupervisor() {
  const router = useRouter();
  const [email, setEmail] = useState("admin.supervisor@stratax.com");
  const [name, setName] = useState("Supervisor Admin");
  const [password, setPassword] = useState("Admin@123456");
  const [confirmPassword, setConfirmPassword] = useState("Admin@123456");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const createSupervisor = async () => {
    setError("");
    setSuccess("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

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
        // If user exists, try to sign in to get user_id
        if (authError.message.includes("already registered")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          });

          if (signInError) {
            setError(`Account exists but password is wrong. ${signInError.message}`);
            setLoading(false);
            return;
          }

          // Update supervisors table with user_id
          await supabase
            .from("supervisors")
            .update({ 
              user_id: signInData.user.id,
              full_name: name
            })
            .eq("email", email);

          setSuccess(`Account already exists! Updated supervisor record.\n\nEmail: ${email}\nPassword: ${password}`);
          setLoading(false);
          return;
        }
        throw authError;
      }

      // 2. Update supervisors table with user_id
      await supabase
        .from("supervisors")
        .update({ 
          user_id: authData.user.id,
          full_name: name
        })
        .eq("email", email);

      // 3. Add to users table
      await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: email,
          full_name: name,
          role: "supervisor"
        });

      setSuccess(`✅ Supervisor account created successfully!\n\nEmail: ${email}\nPassword: ${password}\n\nYou can now login with these credentials.`);
      
      // Auto-login after 3 seconds
      setTimeout(() => {
        router.push(`/supervisor-login?email=${encodeURIComponent(email)}`);
      }, 3000);

    } catch (err) {
      setError(`Error: ${err.message}`);
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
      padding: "20px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "12px",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h1 style={{ 
          color: "#1565c0", 
          marginBottom: "10px",
          textAlign: "center"
        }}>
          Create New Supervisor
        </h1>
        <p style={{ 
          textAlign: "center", 
          color: "#666", 
          marginBottom: "30px"
        }}>
          Create a fresh supervisor account with guaranteed access
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ 
              width: "100%",
              padding: "12px", 
              borderRadius: "8px", 
              border: "1px solid #ddd"
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: "100%",
              padding: "12px", 
              borderRadius: "8px", 
              border: "1px solid #ddd"
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: "100%",
              padding: "12px", 
              borderRadius: "8px", 
              border: "1px solid #ddd"
            }}
          />
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ 
              width: "100%",
              padding: "12px", 
              borderRadius: "8px", 
              border: "1px solid #ddd"
            }}
          />
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

        <button
          onClick={createSupervisor}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            marginBottom: "20px"
          }}
        >
          {loading ? "Creating Account..." : "Create Supervisor Account"}
        </button>

        <div style={{ 
          padding: "20px", 
          background: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#666"
        }}>
          <strong>Default Credentials (pre-filled):</strong>
          <ul style={{ margin: "10px 0 0 0", paddingLeft: "20px" }}>
            <li>Email: admin.supervisor@stratax.com</li>
            <li>Password: Admin@123456</li>
            <li>Name: Supervisor Admin</li>
          </ul>
          <p style={{ margin: "15px 0 0 0" }}>
            <strong>Note:</strong> If account already exists, it will be updated.
          </p>
        </div>

        <div style={{ 
          textAlign: "center", 
          marginTop: "30px",
          fontSize: "14px",
          color: "#666"
        }}>
          Already have an account?{" "}
          <a href="/supervisor-login" style={{ color: "#1565c0", fontWeight: "500" }}>
            Login here
          </a>
        </div>
      </div>
    </div>
  );
}
