import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function ManageCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: users } = await supabase
      .from("candidate_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: results } = await supabase
      .from("assessment_results")
      .select("*")
      .order("completed_at", { ascending: false });

    const map = {};
    (results || []).forEach((r) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r);
    });

    const enriched = (users || []).map((u) => ({
      ...u,
      results: map[u.id] || [],
      latest: (map[u.id] || [])[0] || null
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

        <div style={styles.table}>
          <div style={styles.header}>
            <div>Candidate</div>
            <div>Assessments</div>
            <div>Status</div>
            <div>Score</div>
            <div>Action</div>
          </div>

          {candidates.map((c) => {
            const latest = c.latest;
            const percent = latest?.percentage_score
              ? Math.round(Number(latest.percentage_score))
              : 0;

            const expandedRow = expanded === c.id;

            const reportUrl = latest
              ? `/supervisor/${c.id}?assessment=${latest.assessment_id}`
              : `/supervisor/${c.id}`;

            return (
              <div key={c.id}>

                <div
                  style={{
                    ...styles.row,
                    background: expandedRow ? "#f1f5f9" : "white"
                  }}
                  onClick={() => setExpanded(expandedRow ? null : c.id)}
                >
                  <div>
                    <div style={styles.name}>{c.full_name || "Candidate"}</div>
                    <div style={styles.email}>{c.email}</div>
                  </div>

                  <div>{c.results.length}</div>

                  <div>
                    {latest ? (
                      <span style={styles.completed}>✅ Completed</span>
                    ) : (
                      <span style={styles.pending}>⏳ Not Started</span>
                    )}
                  </div>

                  <div style={{ width: 120 }}>
                    {latest ? (
                      <>
                        <div style={styles.score}>{percent}%</div>
                        <div style={styles.bar}>
                          <div
                            style={{
                              ...styles.fill,
                              width: `${percent}%`
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Link href={reportUrl}>
                      <a style={styles.button}>View Report</a>
                    </Link>
                  </div>
                </div>

                {expandedRow && (
                  <div style={styles.expanded}>
                    <h4>Assessments</h4>

                    {c.results.length === 0 && (
                      <div style={styles.empty}>No assessments yet</div>
                    )}

                    {c.results.map((r) => {
                      const score = Math.round(Number(r.percentage_score));

                      return (
                        <div key={r.id} style={styles.card}>
                          <div>Assessment ID: {r.assessment_id}</div>
                          <div>Score: {score}%</div>

                          <Link href={`/supervisor/${c.id}?assessment=${r.assessment_id}`}>
                            <a style={styles.smallButton}>Open</a>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

const styles = {
  container: { padding: 40, maxWidth: 1200, margin: "auto" },
  title: { fontSize: 28, marginBottom: 20 },

  table: { background: "white", borderRadius: 12 },

  header: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    padding: 16,
    fontWeight: "bold",
    borderBottom: "1px solid #ddd"
  },

  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    padding: 16,
    cursor: "pointer",
    borderBottom: "1px solid #eee"
  },

  name: { fontWeight: "bold" },
  email: { fontSize: 12, color: "#666" },

  completed: { color: "green", fontWeight: "bold" },
  pending: { color: "orange", fontWeight: "bold" },

  score: { fontWeight: "bold" },

  bar: {
    height: 6,
    background: "#eee",
    borderRadius: 4,
    marginTop: 4
  },

  fill: {
    height: "100%",
    background: "#16a34a",
    borderRadius: 4
  },

  button: {
    background: "#0a1929",
    color: "white",
    padding: "6px 12px",
    borderRadius: 6,
    textDecoration: "none"
  },

  expanded: {
    padding: 16,
    background: "#f9fafb"
  },

  card: {
    padding: 12,
    background: "white",
    border: "1px solid #ddd",
    borderRadius: 8,
    marginBottom: 8
  },

  smallButton: {
    display: "inline-block",
    marginTop: 6,
    padding: "4px 10px",
    background: "#111",
    color: "white",
    borderRadius: 4,
    textDecoration: "none"
  },

  empty: { color: "#777" }
};
