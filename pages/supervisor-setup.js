// pages/supervisor-setup.js (Admin only)
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

  // Check if user is admin (you'd have your own admin check logic)
  useEffect(() => {
    const checkAdmin = async () => {
      // Implement your admin check logic here
      const isAdmin = true; // Replace with actual check
      if (!isAdmin) {
        router.push("/supervisor-login");
      }
    };
    checkAdmin();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation
    if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_KEY) {
      setError("Invalid admin key");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      // Check if supervisor already exists
      const { data: existingSupervisor } = await supabase
        .from("supervisors")
        .select("id")
        .eq("email", formData.email.toLowerCase().trim())
        .single();

      if (existingSupervisor) {
        setError("A supervisor with this email already exists");
        setLoading(false);
        return;
      }

      // Create supervisor (with hashed password in production)
      const passwordHash = btoa(formData.password); // Use bcrypt in production

      const { data, error: insertError } = await supabase
        .from("supervisors")
        .insert({
          email: formData.email.toLowerCase().trim(),
          password_hash: passwordHash,
          name: formData.name,
          role: formData.role,
          permissions: formData.permissions,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        setError("Failed to create supervisor account");
        setLoading(false);
        return;
      }

      setSuccess(`Supervisor account created successfully for ${formData.name}`);
      
      // Reset form
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
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Setup Supervisor Account</h1>
      
      <div style={{ 
        background: "#f8f9fa", 
        padding: "30px", 
        borderRadius: "8px",
        marginTop: "20px"
      }}>
        {success && (
          <div style={{
            padding: "15px",
            background: "#e8f5e9",
            color: "#2e7d32",
            borderRadius: "6px",
            marginBottom: "20px"
          }}>
            {success}
          </div>
        )}
        
        {error && (
          <div style={{
            padding: "15px",
            background: "#ffebee",
            color: "#c62828",
            borderRadius: "6px",
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label>Admin Key</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              style={{ width: "100%", padding: "10px" }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{ width: "100%", padding: "10px" }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              style={{ width: "100%", padding: "10px" }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              style={{ width: "100%", padding: "10px" }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              style={{ width: "100%", padding: "10px" }}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating..." : "Create Supervisor Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
