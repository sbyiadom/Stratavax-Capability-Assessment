import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function ManageCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const { data: candidateData } = await supabase
      .from("candidate_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: results } = await supabase
      .from("assessment_results")
      .select("*")
      .order("completed_at", { ascending: false });

    const resultsMap = {};
    (results || []).forEach((r) => {
      if (!resultsMap[r.user_id]) resultsMap[r.user_id] = [];
      resultsMap[r.user_id].push(r);
    });

    const enriched = (candidateData || []).map((c) => ({
      ...c,
      results: resultsMap[c.id] || [],
      latestResult: (resultsMap[c.id] || [])[0] || null
    }));

    setCandidates(enriched);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading candidates...</div>;
  }

  return (
    <AppLayout>
      <div style={styles.container}>
        <h1 style={styles.title}>Manage Candidates</h1>

        <table style={styles.table}>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Assessments</th>
              <th>Status</th>
              <th>Latest Score</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {candidates.map((candidate) => {
              const latest = candidate.latestResult;
              const percentage = latest?.percentage_score
                ? Math.round(Number(latest.percentage_score))
                : 0;

              const reportUrl = latest
                ? `/supervisor/${candidate.id}?assessment=${latest.assessment_id}`
                : `/supervisor/${candidate.id}`;

              return (
                <tr key={candidate.id}>
                  <td>
                    <strong>{candidate.full_name || candidate.email}</strong>
                    <div style={styles.subText}>{candidate.email}</div>
                  </td>

                  <td>{candidate.results.length}</td>

                  <td>
                    {latest ? (
                      <span style={styles.completed}>✅ Completed</span>
                    ) : (
                      <span style={styles.pending}>⏳ Not Started</span>
                    )}
                  </td>

                  <td>
                    {latest ? (
                      <span style={styles.score}>{percentage}%</span>
                    ) : (
                      <span style={styles.na}>N/A</span>
                    )}
                  </td>

                  <td>
                    <Link href={reportUrl}>
                      <a style={styles.button}>View Report</a>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

const styles = {
  container: {
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "20px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    borderRadius: "12px",
    overflow: "hidden"
  },
  subText: {
    fontSize: "12px",
    color: "#666"
  },
  score: {
    fontWeight: "bold",
    color: "#027a48"
  },
  na: {
    color: "#999"
  },
  completed: {
    color: "#027a48",
    fontWeight: "bold"
  },
  pending: {
    color: "#d97706",
    fontWeight: "bold"
  },
  button: {
    background: "#0a1929",
    color: "white",
    padding: "6px 12px",
    borderRadius: "6px",
    textDecoration: "none"
  }
};
