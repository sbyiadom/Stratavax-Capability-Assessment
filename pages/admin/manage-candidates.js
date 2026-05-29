// pages/admin/manage-candidates.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "N/A";
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getScoreStyle(score) {
  const value = toNumber(score, 0);

  if (value >= 85) {
    return {
      color: "#0f766e",
      bg: "#e6fffb",
      label: "Exceptional"
    };
  }

  if (value >= 75) {
    return {
      color: "#1565c0",
      bg: "#e3f2fd",
      label: "Strong Performer"
    };
  }

  if (value >= 55) {
    return {
      color: "#d97706",
      bg: "#fff7ed",
      label: "Developing"
    };
  }

  if (value > 0) {
    return {
      color: "#c62828",
      bg: "#ffebee",
      label: "At Risk"
    };
  }

  return {
    color: "#667085",
    bg: "#f2f4f7",
    label: "No Data"
  };
}

export default function ManageCandidates() {
  const router = useRouter();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      if (typeof window === "undefined") return;

      const userSession = localStorage.getItem("userSession");

      if (!userSession) {
        router.push("/login");
        return;
      }

      try {
        const session = JSON.parse(userSession);

        const { data: profile, error: profileError } = await supabase
          .from("supervisor_profiles")
          .select("role")
          .eq("id", session.user_id)
          .maybeSingle();

        if (profileError) {
          console.error("Error checking admin:", profileError);
          router.push("/login");
          return;
        }

        if (profile?.role === "admin") {
          setIsAdmin(true);
          await fetchCandidates();
        } else {
          router.push("/supervisor");
        }
      } catch (e) {
        console.error("Auth error:", e);
        router.push("/login");
      }
    };

    checkAdmin();
  }, [router]);

  async function fetchCandidates() {
    try {
      setLoading(true);
      setError("");

      const { data: candidateData, error: candidateError } = await supabase
        .from("candidate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (candidateError) throw candidateError;

      const { data: resultsData, error: resultsError } = await supabase
        .from("assessment_results")
        .select("*")
        .order("completed_at", { ascending: false });

      if (resultsError) throw resultsError;

      const resultMap = {};
      (resultsData || []).forEach((result) => {
        if (!resultMap[result.user_id]) resultMap[result.user_id] = [];
        resultMap[result.user_id].push(result);
      });

      const enrichedCandidates = (candidateData || []).map((candidate) => {
        const results = resultMap[candidate.id] || [];
        const latest = results.length > 0 ? results[0] : null;

        return {
          ...candidate,
          results,
          latest
        };
      });

      setCandidates(enrichedCandidates);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setError(err.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(candidateId) {
    setExpandedCandidate((prev) => (prev === candidateId ? null : candidateId));
  }

  function openLatestReport(candidate) {
    if (!candidate?.latest) return;
    router.push(`/supervisor/${candidate.id}?assessment=${candidate.latest.assessment_id}`);
  }

  function openSpecificReport(candidateId, assessmentId) {
    router.push(`/supervisor/${candidateId}?assessment=${assessmentId}`);
  }

  if (!isAdmin) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
          <button onClick={() => router.push("/supervisor")} style={styles.button}>
            Go to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidates</h1>
            <p style={styles.subtitle}>
              View candidate performance, expand assessment history, and open any report directly
            </p>
          </div>

          <button style={styles.refreshButton} onClick={fetchCandidates}>
            Refresh
          </button>
        </div>

        {error ? <div style={styles.errorMessage}>⚠️ {error}</div> : null}

        {loading ? (
          <div style={styles.loading}>Loading candidates...</div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Reports</th>
                  <th style={styles.th}>Latest Score</th>
                  <th style={styles.th}>Latest Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.noData}>
                      No candidates found.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => {
                    const latest = candidate.latest;
                    const latestScore = latest ? Math.round(toNumber(latest.percentage_score, 0)) : 0;
                    const scoreStyle = getScoreStyle(latestScore);
                    const isExpanded = expandedCandidate === candidate.id;

                    return (
                      <FragmentRow
                        key={candidate.id}
                        candidate={candidate}
                        latest={latest}
                        latestScore={latestScore}
                        scoreStyle={scoreStyle}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleExpand(candidate.id)}
                        onOpenLatest={() => openLatestReport(candidate)}
                        onOpenSpecific={openSpecificReport}
                      />
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

function FragmentRow({
  candidate,
  latest,
  latestScore,
  scoreStyle,
  isExpanded,
  onToggleExpand,
  onOpenLatest,
  onOpenSpecific
}) {
  return (
    <>
      <tr
        style={{
          ...styles.dataRow,
          background: isExpanded ? "#f8fafc" : "#ffffff"
        }}
        onClick={onToggleExpand}
      >
        <td style={styles.td}>
          <div style={styles.candidateInfo}>
            <div style={styles.avatar}>
              {candidate.full_name?.charAt(0)?.toUpperCase() || "C"}
            </div>
            <div>
              <div style={styles.candidateName}>{candidate.full_name || "Unnamed Candidate"}</div>
              <div style={styles.candidateMeta}>ID: {candidate.id}</div>
            </div>
          </div>
        </td>

        <td style={styles.td}>{candidate.email || "No email"}</td>

        <td style={styles.td}>
          <span style={styles.countBadge}>{candidate.results.length}</span>
        </td>

        <td style={styles.td}>
          {latest ? (
            <div>
              <span
                style={{
                  ...styles.scoreBadge,
                  background: scoreStyle.bg,
                  color: scoreStyle.color
                }}
              >
                {latestScore}%
              </span>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${latestScore}%`,
                    background: scoreStyle.color
                  }}
                />
              </div>
            </div>
          ) : (
            <span style={styles.noValue}>—</span>
          )}
        </td>

        <td style={styles.td}>
          {latest ? (
            <span
              style={{
                ...styles.statusBadge,
                background: "#E8F5E9",
                color: "#2E7D32"
              }}
            >
              Completed
            </span>
          ) : (
            <span
              style={{
                ...styles.statusBadge,
                background: "#FFF3E0",
                color: "#E65100"
              }}
            >
              No Report
            </span>
          )}
        </td>

        <td
          style={styles.td}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div style={styles.actionGroup}>
            {latest ? (
              <button style={styles.actionButtonPrimary} onClick={onOpenLatest}>
                View Latest
              </button>
            ) : (
              <button style={styles.actionButtonMuted} disabled>
                No Report
              </button>
            )}

            <button style={styles.expandButton} onClick={onToggleExpand}>
              {isExpanded ? "Hide Reports" : "Show Reports"}
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan="6" style={styles.expandCell}>
            <div style={styles.expandPanel}>
              <div style={styles.expandHeader}>
                <h3 style={styles.expandTitle}>Assessment Reports</h3>
                <span style={styles.expandSubtext}>
                  {candidate.results.length} report{candidate.results.length === 1 ? "" : "s"} found
                </span>
              </div>

              {candidate.results.length === 0 ? (
                <div style={styles.emptyExpand}>This candidate has no completed assessment reports yet.</div>
              ) : (
                <div style={styles.reportList}>
                  {candidate.results.map((result) => {
                    const score = Math.round(toNumber(result.percentage_score, 0));
                    const itemStyle = getScoreStyle(score);

                    return (
                      <div key={result.id} style={styles.reportCard}>
                        <div style={styles.reportCardTop}>
                          <div>
                            <div style={styles.reportTitle}>Assessment ID: {result.assessment_id}</div>
                            <div style={styles.reportDate}>
                              Completed: {formatDate(result.completed_at)}
                            </div>
                          </div>

                          <span
                            style={{
                              ...styles.scoreBadge,
                              background: itemStyle.bg,
                              color: itemStyle.color
                            }}
                          >
                            {score}%
                          </span>
                        </div>

                        <div style={styles.reportMetaRow}>
                          <span>Result ID: {result.id}</span>
                          <span>Total Score: {toNumber(result.total_score, 0)}</span>
                          <span>Max Score: {toNumber(result.max_score, 0)}</span>
                        </div>

                        <div style={styles.progressTrack}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${score}%`,
                              background: itemStyle.color
                            }}
                          />
                        </div>

                        <div style={styles.reportActions}>
                          <button
                            style={styles.actionButtonPrimary}
                            onClick={() => onOpenSpecific(candidate.id, result.assessment_id)}
                          >
                            Open Report
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    background: "white",
    padding: "20px 30px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },

  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#0A1929",
    margin: "0 0 5px 0"
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: 0
  },

  refreshButton: {
    padding: "12px 24px",
    background: "#0A1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer"
  },

  tableContainer: {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    overflow: "hidden"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px"
  },

  th: {
    textAlign: "left",
    padding: "15px 20px",
    background: "#F8FAFC",
    borderBottom: "2px solid #0A1929",
    fontWeight: 600,
    color: "#0A1929"
  },

  td: {
    padding: "15px 20px",
    borderBottom: "1px solid #E2E8F0",
    color: "#2D3748",
    verticalAlign: "top"
  },

  noData: {
    padding: "40px",
    textAlign: "center",
    color: "#718096",
    fontStyle: "italic"
  },

  loading: {
    textAlign: "center",
    padding: "60px",
    color: "#666",
    background: "white",
    borderRadius: "16px"
  },

  errorMessage: {
    padding: "12px",
    background: "#FFEBEE",
    color: "#C62828",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px"
  },

  dataRow: {
    cursor: "pointer"
  },

  candidateInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "17px",
    background: "#0A1929",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 600
  },

  candidateName: {
    fontWeight: 600
  },

  candidateMeta: {
    fontSize: "11px",
    color: "#667085",
    marginTop: "2px",
    wordBreak: "break-all"
  },

  countBadge: {
    display: "inline-block",
    minWidth: "28px",
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#EEF4FF",
    color: "#3538CD",
    textAlign: "center",
    fontWeight: 600
  },

  statusBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    display: "inline-block"
  },

  scoreBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    display: "inline-block"
  },

  progressTrack: {
    height: "6px",
    background: "#E2E8F0",
    borderRadius: "999px",
    marginTop: "8px",
    overflow: "hidden"
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px"
  },

  noValue: {
    color: "#98A2B3"
  },

  actionGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },

  actionButtonPrimary: {
    padding: "6px 12px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    color: "white",
    background: "#0A1929"
  },

  actionButtonMuted: {
    padding: "6px 12px",
    border: "none",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#98A2B3",
    background: "#F2F4F7",
    cursor: "not-allowed"
  },

  expandButton: {
    padding: "6px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    background: "white",
    color: "#334155"
  },

  expandCell: {
    padding: "0",
    background: "#F8FAFC"
  },

  expandPanel: {
    padding: "20px"
  },

  expandHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },

  expandTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: "#0A1929"
  },

  expandSubtext: {
    fontSize: "12px",
    color: "#667085"
  },

  emptyExpand: {
    padding: "12px 0",
    color: "#667085"
  },

  reportList: {
    display: "grid",
    gap: "12px"
  },

  reportCard: {
    background: "white",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "14px"
  },

  reportCardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "8px"
  },

  reportTitle: {
    fontWeight: 600,
    color: "#0A1929",
    marginBottom: "4px",
    wordBreak: "break-all"
  },

  reportDate: {
    fontSize: "12px",
    color: "#667085"
  },

  reportMetaRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    fontSize: "12px",
    color: "#475467",
    marginTop: "8px"
  },

  reportActions: {
    marginTop: "12px",
    display: "flex",
    gap: "8px"
  },

  unauthorized: {
    textAlign: "center",
    padding: "60px",
    color: "#666",
    background: "white",
    borderRadius: "16px",
    maxWidth: "400px",
    margin: "100px auto"
  },

  button: {
    padding: "10px 20px",
    background: "#0A1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    marginTop: "20px"
  }
};
