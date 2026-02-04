import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Only fetch data if supervisor is authenticated
  useEffect(() => {
    if (!isSupervisor) return;

    const fetchCandidates = async () => {
      try {
        // Get all users who have responses
        const { data: talentData, error: talentError } = await supabase
          .from("talent_classification")
          .select(`
            user_id,
            total_score,
            classification,
            users (email, full_name)
          `)
          .order("total_score", { ascending: false });

        if (talentError) throw talentError;

        setCandidates(talentData || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching candidates:", err);
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [isSupervisor]);

  if (!isSupervisor) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <p style={{ textAlign: "center" }}>Checking authentication...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("supervisorSession");
    router.push("/supervisor-login");
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading candidates…</p>;
  if (!candidates.length) return <p style={{ textAlign: "center" }}>No candidates have taken the assessment yet.</p>;

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "85vw", margin: "auto", padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h1 style={{ marginBottom: 10 }}>Supervisor Dashboard</h1>
          <button
            onClick={handleLogout}
            style={{
              background: "#d32f2f",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Logout
          </button>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            marginTop: 20,
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            borderRadius: "8px",
            overflow: "hidden"
          }}
        >
          <thead>
            <tr style={{ 
              borderBottom: "2px solid #1565c0",
              backgroundColor: "#f5f5f5"
            }}>
              <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Candidate</th>
              <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Email</th>
              <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Total Score</th>
              <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Classification</th>
              <th style={{ padding: "15px", fontWeight: "600", color: "#333" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.user_id} style={{ 
                borderBottom: "1px solid #eee",
                transition: "background 0.2s"
              }}>
                <td style={{ padding: "15px" }}>{c.users?.full_name || "N/A"}</td>
                <td style={{ padding: "15px" }}>{c.users?.email || "N/A"}</td>
                <td style={{ padding: "15px", fontWeight: "500" }}>{c.total_score}</td>
                <td style={{ 
                  padding: "15px", 
                  color: "#1565c0",
                  fontWeight: "600"
                }}>
                  {c.classification}
                </td>
                <td style={{ padding: "15px" }}>
                  <Link href={`/supervisor/${c.user_id}`} legacyBehavior>
                    <a style={{ 
                      color: "#fff", 
                      background: "#1565c0", 
                      padding: "8px 16px", 
                      borderRadius: "5px",
                      textDecoration: "none",
                      display: "inline-block",
                      fontWeight: "500",
                      transition: "background 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#0d47a1"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#1565c0"}
                    >
                      View Report
                    </a>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
