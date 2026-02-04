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
      // ... your existing fetchCandidates code ...
    };

    fetchCandidates();
  }, [isSupervisor]);

  if (!isSupervisor) {
    return <p style={{ textAlign: "center" }}>Checking authentication...</p>;
  }

  // ... rest of your existing code ...
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  if (loading) return <p style={{ textAlign: "center" }}>Loading candidates…</p>;
  if (!candidates.length) return <p style={{ textAlign: "center" }}>No candidates have taken the assessment yet.</p>;

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "85vw", margin: "auto", padding: 20 }}>
        <h1 style={{ textAlign: "center", marginBottom: 20 }}>Supervisor Dashboard</h1>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            marginTop: 20,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th style={{ padding: "10px" }}>Candidate</th>
              <th style={{ padding: "10px" }}>Email</th>
              <th style={{ padding: "10px" }}>Total Score</th>
              <th style={{ padding: "10px" }}>Classification</th>
              <th style={{ padding: "10px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.user_id} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "10px" }}>{c.users?.full_name || "N/A"}</td>
                <td style={{ padding: "10px" }}>{c.users?.email || "N/A"}</td>
                <td style={{ padding: "10px" }}>{c.total_score}</td>
                <td style={{ padding: "10px", color: "#1565c0" }}>{c.classification}</td>
                <td style={{ padding: "10px" }}>
                  <Link href={`/supervisor/${c.user_id}`}>
                    <a style={{ color: "#fff", background: "#1565c0", padding: "5px 10px", borderRadius: 5 }}>View Report</a>
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

