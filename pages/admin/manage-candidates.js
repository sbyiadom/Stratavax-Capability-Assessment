// pages/admin/manage-candidates.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

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

      const { data: candidateData, error: candidateError } = await supabase
        .from("candidate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (candidateError) throw candidateError;

      const { data: results, error: resultsError } = await supabase
        .from("assessment_results")
        .select("*")
        .order("completed_at", { ascending: false });

      if (resultsError) throw resultsError;

      const resultMap = {};

      (results || []).forEach((r) => {
        if (!resultMap[r.user_id]) resultMap[r.user_id] = [];
        resultMap[r.user_id].push(r);
      });

      const enriched = (candidateData || []).map((c) => ({
        ...c,
        results: resultMap[c.id] || [],
        latest: (resultMap[c.id] || [])[0] || null
      }));

      setCandidates(enriched);

    } catch (err) {
      console.error("Error fetching candidates:", err);
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
              View, explore, and manage candidate assessments
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
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.noData}>
                      No candidates found.
                    </td>
                  </tr>
                ) : (
                  candidates.map((c) => {
                    const latest = c.latest;
                    const score = latest
                      ? Math.round(Number(latest.percentage_score))
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
                                <div style={styles.email}>{c.email}</div>
                              </div>
                            </div>
                          </td>

                          <td style={styles.td}>{c.results.length}</td>

                          <td style={styles.td}>
                            {latest ? (
                              <span style={styles.success}>Completed</span>
                            ) : (
                              <span style={styles.warning}>Not Started</span>
                            )}
                          </td>

                          <td style={styles.td}>
                            {score !== null ? (
                              <div>
                                <strong>{score}%</strong>
                                <div style={styles.bar}>
                                  <div
                                    style={{
                                      ...styles.fill,
                                      width: `${score}%`
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
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
                                View Report
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* EXPANDED ROW */}
                        {expandedCandidate === c.id && (
                          <tr>
                            <td colSpan="5" style={styles.expandRow}>
                              {c.results.length === 0 ? (
                                <div>No assessments available</div>
                              ) : (
                                c.results.map((r) => (
                                  <div key={r.id} style={styles.card}>
                                    
                                    <div style={styles.cardTop}>
                                      <span>
                                        Assessment: {r.assessment_id}
                                      </span>
                                      <span>
                                        {Math.round(Number(r.percentage_score))}%
                                      </span>
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
                                ))
                              )}
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

/* ================= STYLES ================= */

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px"
  },

  header: {
    marginBottom: "30px",
    background: "white",
    padding: "20px 30px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },

  title: {
    fontSize: "24px",
    fontWeight: 600,
    margin: "0 0 5px"
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: 0
  },

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
    background: "#F8FAFC",
    borderBottom: "2px solid #0A1929"
  },

  td: {
    padding: "15px",
    borderBottom: "1px solid #E2E8F0"
  },

  noData: {
    padding: "40px",
    textAlign: "center",
    color: "#718096"
  },

  row: {
    cursor: "pointer"
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "16px",
    background: "#0A1929",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  name: {
    fontWeight: 600
  },

  email: {
    fontSize: "12px",
    color: "#666"
  },

  success: {
    color: "#2E7D32",
    fontWeight: 600
  },

  warning: {
    color: "#E65100",
    fontWeight: 600
  },

  bar: {
    height: "6px",
    background: "#E2E8F0",
    borderRadius: "4px",
    marginTop: "5px"
  },

  fill: {
    height: "100%",
    background: "#16a34a",
    borderRadius: "4px"
  },

  button: {
    padding: "6px 12px",
    background: "#0A1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },

  expandRow: {
    background: "#f9fafb"
  },

  card: {
    padding: "12px",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
    marginBottom: "10px",
    background: "white"
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px"
  },

  smallButton: {
    padding: "6px 10px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  loading: {
    textAlign: "center",
    padding: "60px",
    background: "white",
    borderRadius: "16px"
  }
};
