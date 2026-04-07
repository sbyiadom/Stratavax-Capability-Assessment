import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      setLoading(false);
      return;
    }

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword
      });

      if (signInError) {
        setMessage({ type: "error", text: "Current password is incorrect" });
        setLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (updateError) {
        setMessage({ type: "error", text: updateError.message });
      } else {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/candidate-bg.jpg">
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Profile Settings</h1>
          
          <div style={styles.infoBox}>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id.substring(0, 8)}...</p>
          </div>

          <h2 style={styles.subtitle}>Change Password</h2>

          {message.text && (
            <div style={{
              ...styles.message,
              background: message.type === "success" ? "#E8F5E9" : "#FFEBEE",
              color: message.type === "success" ? "#2E7D32" : "#C62828",
              border: `1px solid ${message.type === "success" ? "#A5D6A7" : "#FFCDD2"}`
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Enter your current password"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <button
            onClick={() => router.push("/candidate/dashboard")}
            style={styles.backButton}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #0A1929",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "40px 20px"
  },
  card: {
    maxWidth: "500px",
    margin: "0 auto",
    background: "white",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#0A1929",
    marginBottom: "20px",
    textAlign: "center"
  },
  subtitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#0A1929",
    marginBottom: "20px",
    marginTop: "10px"
  },
  infoBox: {
    background: "#F8FAFC",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "30px",
    border: "1px solid #E2E8F0"
  },
  message: {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
    fontSize: "14px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0A1929"
  },
  input: {
    padding: "12px",
    border: "2px solid #E2E8F0",
    borderRadius: "8px",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s"
  },
  button: {
    background: "#0A1929",
    color: "white",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "10px"
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#64748B",
    cursor: "pointer",
    marginTop: "20px",
    fontSize: "14px",
    textAlign: "center",
    width: "100%"
  }
};
