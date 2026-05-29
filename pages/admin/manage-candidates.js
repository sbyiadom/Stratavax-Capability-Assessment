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
    return <div style={{ padding: 40 }}>Loading dashboard...</div>;
  }

  return (
    <AppLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.title}>Manage Candidates</h1>
          <p style={styles.subtitle}>Interactive control panel for candidate assessments</p>
        </div>

        <div style={styles.panel}>
          <div style={styles.tableHeader}>
            <div>Candidate</div>
            <div>Assessments</div>
            <div>Status</div>
            <div>Performance</div>
            <div>Action</div>
          </div>

          {candidates.map((c) => {
            const latest = c.latest;
            const percent = latest?.percentage_score
              ? Math.round(Number(latest.percentage_score))
              : 0;

            const isOpen = expanded === c.id;

            const reportUrl = latest
              ? `/supervisor/${c.id}?assessment=${latest.assessment_id}`
              : `/supervisor/${c.id}`;

            return (
              <div key={c.id}>
                <div
                  style={{ ...styles.row, ...(isOpen ? styles.activeRow : {}) }}
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  <div>
                    <div style={styles.name}>{c.full_name || "Candidate"}</div>
                    <div style={styles.email}>{c.email}</div>
                  </div>

                  <div>{c.results.length}</div>

                  <div>
                    {latest ? (
                      <span style={styles.badgeGreen}>Completed</span>
                    ) : (
                      <span style={styles.badgeAmber}>Not Started</span>
                    )}
                  </div>

                  <div>
                    {latest ? (
                      <>
                        <div style={styles.score}>{percent}%</div>
                        <div style={styles.bar}>
                          <div
                            style={{ ...styles.fill, width: `${percent}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <span style={styles.na}>—</span>
                    )}
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Link href={reportUrl}>
                      <a style={styles.btnPrimary}>View</a>
                    </Link>
                  </div>
                </div>

                {isOpen && (
                  <div style={styles.expand}>
                    <h4 style={styles.sectionTitle}>Assessments</h4>

                    {c.results.length === 0 && (
                      <div style={styles.empty}>No assessments yet</div>
                    )}

                    {c.results.map((r) => {
                      const score = Math.round(Number(r.percentage_score));

                      return (
                        <div key={r.id} style={styles.card}>
                          <div style={styles.cardRow}>
                            <span>{r.assessment_id}</span>
                            <span style={styles.cardScore}>{score}%</span>
                          </div>

                          <Link href={`/supervisor/${c.id}?assessment=${r.assessment_id}`}>
                            <a style={styles.btnSecondary}>Open Report</a>
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
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    padding: "32px"
  },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 700 },
  subtitle: { color: "#6b7280" },

  panel: {
    background: "white",
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    overflow: "hidden"
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    padding: 16,
    background: "#f1f5f9",
    fontWeight: 600
  },

  row: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
    padding: 16,
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    transition: "0.2s"
  },

  activeRow: { background: "#f9fafb" },

  name: { fontWeight: 600 },
  email: { fontSize: 12, color: "#6b7280" },

  score: { fontWeight: 600 },
  na: { color: "#9ca3af" },

  bar: {
    height: 6,
    background: "#e5e7eb",
    borderRadius: 4,
    marginTop: 4
  },
  fill: {
    height: "100%",
    background: "linear-gradient(90deg,#22c55e,#16a34a)",
    borderRadius: 4
  },

  badgeGreen: {
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 10px",
    borderRadius: 99,
    fontSize: 12
  },

  badgeAmber: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "4px 10px",
    borderRadius: 99,
    fontSize: 12
  },

  btnPrimary: {
    background: "#0f172a",
    color: "white",
    padding: "6px 12px",
    borderRadius: 6,
    textDecoration: "none"
  },

  expand: {
    padding: 16,
    background: "#f9fafb"
  },

  sectionTitle: { marginBottom: 10 },

  card: {
    background: "white",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },

  cardRow: {
    display: "flex",
    justifyContent: "space-between"
  },

  cardScore: { fontWeight: 600 },

  btnSecondary: {
    display: "inline-block",
    marginTop: 6,
    padding: "5px 10px",
    background: "#1e293b",
    color: "white",
    borderRadius: 4,
    textDecoration: "none"
  },

  empty: { color: "#9ca3af" }
};
