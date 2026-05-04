// pages/admin/add-candidate.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

export default function AdminAddCandidateRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    checkAdminAndRedirect();
  }, []);

  async function checkAdminAndRedirect() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Admin access is required for this page." });
        router.replace("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.replace("/login");
        return;
      }

      router.replace("/admin/manage-candidates");
    } catch (error) {
      console.error("Admin add candidate redirect error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.icon}>👥</div>
          <h1 style={styles.title}>Opening Candidate Management</h1>
          <p style={styles.subtitle}>
            The add-candidate route now redirects to the candidate management page. Candidate creation and assignment should be managed from the candidate management workflow.
          </p>

          {loading && (
            <div style={styles.loadingBlock}>
              <div style={styles.spinner} />
              <span>Redirecting...</span>
            </div>
          )}

          {message.text && (
            <div style={{
              ...styles.message,
              background: message.type === "success" ? "#e8f5e9" : "#ffebee",
              color: message.type === "success" ? "#2e7d32" : "#c62828",
              border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
            }}>
              {message.text}
            </div>
          )}

          <div style={styles.actions}>
            <Link href="/admin/manage-candidates" legacyBehavior>
              <a style={styles.primaryButton}>Open Manage Candidates</a>
            </Link>
            <Link href="/admin/assign-candidates" legacyBehavior>
              <a style={styles.secondaryButton}>Assign Candidates</a>
            </Link>
            <Link href="/admin" legacyBehavior>
              <a style={styles.secondaryButton}>Back to Admin Dashboard</a>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 20px"
  },
  card: {
    width: "100%",
    maxWidth: "580px",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "18px",
    padding: "36px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.45)",
    textAlign: "center"
  },
  icon: {
    width: "68px",
    height: "68px",
    borderRadius: "20px",
    background: "#e3f2fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    fontSize: "34px"
  },
  title: {
    margin: "0 0 8px",
    color: "#0a1929",
    fontSize: "26px",
    fontWeight: 800
  },
  subtitle: {
    margin: "0 0 24px",
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.6
  },
  loadingBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "22px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #0a1929",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  message: {
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  primaryButton: {
    padding: "11px 18px",
    background: "#0a1929",
    color: "white",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 800
  },
  secondaryButton: {
    padding: "11px 18px",
    background: "#f1f5f9",
    color: "#0a1929",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 800
  }
};
