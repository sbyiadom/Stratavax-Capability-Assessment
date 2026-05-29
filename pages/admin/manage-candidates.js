// pages/admin/manage-candidates.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US");
  } catch {
    return "N/A";
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getScoreStyle(score) {
  const value = toNumber(score, 0);

  if (value >= 85) return { color: "#0f766e", bg: "#e6fffb" };
  if (value >= 75) return { color: "#1565c0", bg: "#e3f2fd" };
  if (value >= 55) return { color: "#d97706", bg: "#fff7ed" };
  if (value > 0) return { color: "#c62828", bg: "#ffebee" };

  return { color: "#667085", bg: "#f2f4f7" };
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

      const { data: candidateData } = await supabase
        .from("candidate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // ✅ IMPORTANT: JOIN assessments table
      const { data: resultsData } = await supabase
        .from("assessment_results")
        .select(`
          *,
          assessments (
            id,
            title
          )
        `)
        .order("completed_at", { ascending: false });

      const resultMap = {};
      (resultsData || []).forEach((r) => {
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedCandidate(prev => (prev === id ? null : id));
  }

  function openLatestReport(c) {
    if (!c.latest) return;
    router.push(`/supervisor/${c.id}?assessment=${c.latest.assessment_id}`);
  }

  function openSpecificReport(userId, assessmentId) {
    router.push(`/supervisor/${userId}?assessment=${assessmentId}`);
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidates</h1>
            <p style={styles.subtitle}>Assessment reports with readable names</p>
          </div>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading candidates...</div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Reports</th>
                  <th style={styles.th}>Latest Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {candidates.map((c) => {
                  const score = c.latest ? Math.round(toNumber(c.latest.percentage_score)) : null;
                  const style = getScoreStyle(score);

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
                              <div>{c.full_name}</div>
                              <div style={styles.email}>{c.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={styles.td}>{c.results.length}</td>

                        <td style={styles.td}>
                          {score !== null ? (
                            <div>
                              <span style={{
                                ...styles.scoreBadge,
                                background: style.bg,
                                color: style.color
                              }}>
                                {score}%
                              </span>
                            </div>
                          ) : "—"}
                        </td>

                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          {c.latest && (
                            <button style={styles.button} onClick={() => openLatestReport(c)}>
                              View Latest
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* EXPANDED */}
                      {expandedCandidate === c.id && (
                        <tr>
                          <td colSpan="4" style={styles.expandRow}>
                            <div style={styles.expandPanel}>

                              <h3>Assessment Reports</h3>

                              {c.results.map((r) => (
                                <div key={r.id} style={styles.card}>

                                  <div style={styles.cardTop}>

                                    {/* ✅ TITLE INSTEAD OF ID */}
                                    <strong>
                                      {r.assessments?.title || "Unnamed Assessment"}
                                    </strong>

                                    <span>
                                      {Math.round(toNumber(r.percentage_score))}%
                                    </span>

                                  </div>

                                  <div style={styles.meta}>
                                    Completed: {formatDate(r.completed_at)}
                                  </div>

                                  <button
                                    style={styles.smallButton}
                                    onClick={() => openSpecificReport(c.id, r.assessment_id)}
                                  >
                                    Open Report
                                  </button>

                                </div>
                              ))}

                            </div>
                          </td>
                        </tr>
                      )}

                    </>
                  );
                })}
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
  container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" },
  header: {
    background: "white",
    padding: "20px",
    borderRadius: "16px",
    marginBottom: "20px"
  },
  title: { margin: 0 },
  subtitle: { color: "#666" },
  tableContainer: { background: "white", borderRadius: "16px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "15px", textAlign: "left", background: "#f8fafc" },
  td: { padding: "15px", borderBottom: "1px solid #eee" },
  row: { cursor: "pointer" },

  userInfo: { display: "flex", gap: "10px", alignItems: "center" },
  avatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "#0A1929", color: "white", display: "flex",
    alignItems: "center", justifyContent: "center"
  },
  email: { fontSize: "12px", color: "#666" },

  scoreBadge: {
    padding: "4px 10px",
    borderRadius: "12px",
    fontWeight: "600"
  },

  button: {
    background: "#0A1929",
    color: "white",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer"
  },

  expandRow: { background: "#f9fafb" },
  expandPanel: { padding: "15px" },

  card: {
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginBottom: "10px"
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

  loading: { textAlign: "center", padding: "40px" }
};
