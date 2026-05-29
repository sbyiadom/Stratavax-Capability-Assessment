// pages/admin/manage-candidates.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "N/A";
  }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function ManageCandidates() {
  const router = useRouter();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    try {
      setLoading(true);

      // ✅ Candidates
      const { data: candidateData } = await supabase
        .from("candidate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // ✅ Results WITH assessment titles
      const { data: results } = await supabase
        .from("assessment_results")
        .select(`
          *,
          assessments (
            id,
            title
          )
        `)
        .order("completed_at", { ascending: false });

      const map = {};

      (results || []).forEach((r) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r);
      });

      const enriched = (candidateData || []).map((c) => ({
        ...c,
        results: map[c.id] || [],
        latest: (map[c.id] || [])[0] || null
      }));

      setCandidates(enriched);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedCandidate(prev => (prev === id ? null : id));
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidates</h1>
            <p style={styles.subtitle}>
              View all assessment reports per candidate
            </p>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div style={styles.loading}>Loading candidates...</div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Assessments</th>
                  <th style={styles.th}>Latest Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={styles.noData}>
                      No candidates found
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
                    const latest = c.latest;
                    const score = latest
                      ? Math.round(toNumber(latest.percentage_score))
                      : null;

                    return (
                      <>
                        {/* MAIN ROW */}
                        <tr
                          key={c.id}
                          style={styles.row}
                          onClick={() => toggleExpand(c.id)}
                        >
                          <td style={styles.td}>
                            <div style={styles.userInfo}>
                              <div style={styles.avatar}>
                                {c.full_name?.charAt(0) || "C"}
                              </div>

                              <div>
                                <div style={styles.name}>
                                  {c.full_name || "Candidate"}
                                </div>
                                <div style={styles.email}>
                                  {c.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={styles.td}>
                            {c.results.length}
                          </td>

                          <td style={styles.td}>
                            {score !== null ? `${score}%` : "—"}
                          </td>

                          <td
                            style={styles.td}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {latest && (
                              <button
                                style={styles.button}
                                onClick={() =>
                                  router.push(
                                    `/supervisor/${c.id}?assessment=${latest.assessment_id}`
                                  )
                                }
                              >
                                View Latest
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* EXPANDED SECTION */}
                        {expandedCandidate === c.id && (
                          <tr>
                            <td colSpan="4" style={styles.expandRow}>
                              <div style={styles.expandPanel}>

                                <h4>Assessment Reports</h4>

                                {c.results.length === 0 ? (
                                  <div>No reports</div>
                                ) : (
                                  c.results.map((r) => {
                                    const score = Math.round(
                                      toNumber(r.percentage_score)
                                    );

                                    return (
                                      <div key={r.id} style={styles.card}>

                                        {/* ✅ TITLE instead of ID */}
                                        <div style={styles.cardTop}>
                                          <strong>
                                            {r.assessments?.title || "Unnamed Assessment"}
                                          </strong>

                                          <span>{score}%</span>
                                        </div>

                                        <div style={styles.meta}>
                                          Completed: {formatDate(r.completed_at)}
                                        </div>

                                        <button
                                          style={styles.smallButton}
                                          onClick={() =>
                                            router.push(
                                              `/supervisor/${c.id}?assessment=${r.assessment_id}`
                                            )
                                          }
                                        >
                                          Open Report
                                        </button>

                                      </div>
                                    );
                                  })
                                )}

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* ================== STYLES ================== */

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px"
  },

  header: {
    marginBottom: "30px",
    background: "white",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },

  title: { margin: 0 },
  subtitle: { color: "#666" },

  tableContainer: {
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse"
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#f8fafc"
  },

  td: {
    padding: "15px",
    borderBottom: "1px solid #eee"
  },

  row: { cursor: "pointer" },

  noData: {
    textAlign: "center",
    padding: "30px"
  },

  userInfo: {
    display: "flex",
    gap: "10px",
    alignItems: "center"
  },

  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "#0A1929",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  name: { fontWeight: "600" },
  email: { fontSize: "12px", color: "#666" },

  button: {
    padding: "6px 12px",
    background: "#0A1929",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  expandRow: {
    background: "#f9fafb"
  },

  expandPanel: {
    padding: "15px"
  },

  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "10px",
    background: "white"
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between"
  },

  meta: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px"
  },

  smallButton: {
    marginTop: "8px",
    padding: "5px 10px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  },

  loading: {
    textAlign: "center",
    padding: "40px"
  }
};
