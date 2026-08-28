// pages/admin/manage-candidates.js
// COMPLETE WITH PROGRAM NORMALIZATION AND FILTERS

import { useEffect, useState, useMemo } from "react";
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

// ============================================================
// PROGRAM NORMALIZATION UTILITIES
// ============================================================

const ABBREVIATIONS = {
  'bsc': 'BSc',
  'b.sc': 'BSc',
  'b. sc': 'BSc',
  'b.s.c': 'BSc',
  'bachelor': 'Bachelor',
  'btech': 'B-Tech',
  'b.tech': 'B-Tech',
  'b-tech': 'B-Tech',
  'hnd': 'HND',
  'eng': 'Engineering',
  'engr': 'Engineering',
  'elec': 'Electrical',
  'electronics': 'Electronics',
  'electronic': 'Electronics',
  'mech': 'Mechanical',
  'mechanical': 'Mechanical',
  'admin': 'Administration',
  'adminis': 'Administration',
  'of': 'of',
  'and': 'and',
  'in': 'in',
  'with': 'with',
  '&': 'and',
  '/': 'and',
  '-': ' ',
  '_': ' ',
  'plant': 'Plant',
  'option': 'Option',
  'automobile': 'Automobile',
  'auto': 'Automobile',
  'production': 'Production',
  'manufacturing': 'Manufacturing',
  'technology': 'Technology',
  'telecommunication': 'Telecommunication',
  'telecom': 'Telecommunication',
  'information': 'Information',
  'it': 'Information Technology',
  'computer': 'Computer',
  'science': 'Science',
  'mathematics': 'Mathematics',
  'math': 'Mathematics',
  'statistics': 'Statistics',
  'physics': 'Physics',
  'chemistry': 'Chemistry',
  'biology': 'Biology',
  'biochemistry': 'Biochemistry',
  'chemical': 'Chemical',
  'petroleum': 'Petroleum',
  'petrochemical': 'Petrochemical',
  'renewable': 'Renewable',
  'energy': 'Energy',
  'environmental': 'Environmental',
  'civil': 'Civil',
  'structural': 'Structural',
  'geomatic': 'Geomatic',
  'geological': 'Geological',
  'mining': 'Mining',
  'minerals': 'Minerals',
  'metallurgy': 'Metallurgy',
  'materials': 'Materials',
  'industrial': 'Industrial',
  'manufacturing': 'Manufacturing',
  'automotive': 'Automotive',
  'marine': 'Marine',
  'aerospace': 'Aerospace',
  'biomedical': 'Biomedical',
  'mechatronics': 'Mechatronics',
  'robotics': 'Robotics',
  'control': 'Control',
  'instrumentation': 'Instrumentation',
  'power': 'Power',
  'communication': 'Communication',
  'networking': 'Networking',
  'cybersecurity': 'Cybersecurity',
  'data': 'Data',
  'analytics': 'Analytics',
  'business': 'Business',
  'administration': 'Administration',
  'management': 'Management',
  'marketing': 'Marketing',
  'finance': 'Finance',
  'accounting': 'Accounting',
  'economics': 'Economics',
  'human': 'Human',
  'resource': 'Resource',
  'psychology': 'Psychology',
  'sociology': 'Sociology',
  'geography': 'Geography',
  'history': 'History',
  'political': 'Political',
  'education': 'Education',
  'arts': 'Arts',
  'humanities': 'Humanities'
};

function normalizeProgramName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  
  // Remove extra spaces and clean
  let cleaned = raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into words and map abbreviations
  const words = cleaned.split(' ');
  const mappedWords = words.map(word => {
    const lower = word.toLowerCase();
    return ABBREVIATIONS[lower] || word.charAt(0).toUpperCase() + word.slice(1);
  });
  
  return mappedWords.join(' ');
}

function getProgramGroups(programs) {
  if (!programs || programs.length === 0) return [];
  
  const groups = [];
  const processed = new Set();
  
  // Sort programs by length (longest first) to keep the most descriptive master
  const sortedPrograms = [...programs].sort((a, b) => b.length - a.length);
  
  sortedPrograms.forEach(p => {
    const normalized = normalizeProgramName(p);
    if (processed.has(normalized)) return;
    
    // Find all programs similar to this one
    const group = [p];
    const master = normalized;
    processed.add(normalized);
    
    sortedPrograms.forEach(p2 => {
      if (p === p2) return;
      const norm2 = normalizeProgramName(p2);
      if (processed.has(norm2)) return;
      
      const words1 = master.split(' ');
      const words2 = norm2.split(' ');
      const intersection = words1.filter(w => words2.includes(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const similarity = union > 0 ? intersection / union : 0;
      
      // If they share more than 50% of words, group them
      if (similarity > 0.5) {
        group.push(p2);
        processed.add(norm2);
      }
    });
    
    // Find the most common variation as the master label
    const masterLabel = group.reduce((a, b) => a.length >= b.length ? a : b);
    
    groups.push({
      master: master,
      displayName: masterLabel,
      variants: group,
      count: group.length
    });
  });
  
  // Sort groups by count (most variants first) then alphabetically
  return groups.sort((a, b) => b.count - a.count || a.master.localeCompare(b.master));
}

function getMasterProgramName(program, groups) {
  if (!program) return '';
  const normalized = normalizeProgramName(program);
  
  for (const group of groups) {
    if (group.variants.includes(program)) {
      return group.master;
    }
    // Also check normalized match
    if (normalized === group.master) {
      return group.master;
    }
  }
  return program;
}

// ============================================================
// FILTER COMPONENT
// ============================================================
function FilterBar({
  universityOptions,
  programGroups,
  selectedUniversity,
  setSelectedUniversity,
  selectedProgram,
  setSelectedProgram,
  selectedStatus,
  setSelectedStatus,
  searchQuery,
  setSearchQuery,
  clearFilters,
  totalFiltered,
  totalCandidates
}) {
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "in_progress", label: "In Progress" },
    { value: "not_started", label: "Not Started" }
  ];

  return (
    <div style={filterStyles.container}>
      <div style={filterStyles.searchRow}>
        <div style={filterStyles.searchWrapper}>
          <span style={filterStyles.searchIcon}>🔍</span>
          <input
            type="text"
            style={filterStyles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              style={filterStyles.clearSearch}
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={filterStyles.filterRow}>
        <div style={filterStyles.filterGroup}>
          <label style={filterStyles.filterLabel}>University</label>
          <select
            style={filterStyles.filterSelect}
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
          >
            <option value="">All Universities</option>
            {universityOptions.map((uni) => (
              <option key={uni} value={uni}>
                {uni}
              </option>
            ))}
          </select>
        </div>

        <div style={filterStyles.filterGroup}>
          <label style={filterStyles.filterLabel}>Program</label>
          <select
            style={filterStyles.filterSelect}
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
          >
            <option value="">All Programs</option>
            {programGroups.map((group) => (
              <option key={group.master} value={group.master}>
                {group.displayName} {group.count > 1 ? `(${group.count} variants)` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={filterStyles.filterGroup}>
          <label style={filterStyles.filterLabel}>Status</label>
          <select
            style={filterStyles.filterSelect}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={filterStyles.filterActions}>
          <button style={filterStyles.clearButton} onClick={clearFilters}>
            Clear Filters
          </button>
          <span style={filterStyles.resultCount}>
            Showing {totalFiltered} of {totalCandidates} candidates
          </span>
        </div>
      </div>
    </div>
  );
}

const filterStyles = {
  container: {
    background: "white",
    borderRadius: "12px",
    padding: "20px 24px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #eef2f7"
  },
  searchRow: {
    marginBottom: "16px"
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    fontSize: "16px",
    color: "#94a3b8"
  },
  searchInput: {
    width: "100%",
    padding: "10px 40px 10px 36px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#f8fafc",
    outline: "none",
    transition: "all 0.2s"
  },
  clearSearch: {
    position: "absolute",
    right: "10px",
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 8px"
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "flex-end"
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    flex: "1",
    minWidth: "160px"
  },
  filterLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "4px"
  },
  filterSelect: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    background: "#f8fafc",
    color: "#1a202c",
    outline: "none",
    cursor: "pointer",
    width: "100%"
  },
  filterActions: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    paddingTop: "4px"
  },
  clearButton: {
    padding: "8px 20px",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    whiteSpace: "nowrap"
  },
  resultCount: {
    fontSize: "13px",
    color: "#64748b",
    whiteSpace: "nowrap"
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ManageCandidates() {
  const router = useRouter();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [error, setError] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Fetch candidates
  useEffect(() => {
    fetchCandidates();
  }, []);

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

      const assessmentIds = [
        ...new Set(
          (resultsData || [])
            .map((r) => r.assessment_id)
            .filter(Boolean)
        )
      ];

      let assessmentNameMap = {};

      if (assessmentIds.length > 0) {
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from("assessments")
          .select("id, title")
          .in("id", assessmentIds);

        if (assessmentsError) throw assessmentsError;

        assessmentNameMap = (assessmentsData || []).reduce((acc, item) => {
          acc[item.id] = item.title;
          return acc;
        }, {});
      }

      const resultsWithTitles = (resultsData || []).map((result) => ({
        ...result,
        assessment_title:
          assessmentNameMap[result.assessment_id] || "Unnamed Assessment"
      }));

      const resultMap = {};
      resultsWithTitles.forEach((result) => {
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

  // ============================================================
  // UNIQUE VALUES FOR FILTERS
  // ============================================================
  const universityOptions = useMemo(() => {
    const unis = new Set();
    candidates.forEach((c) => {
      if (c.university) unis.add(c.university);
    });
    return Array.from(unis).sort();
  }, [candidates]);

  // 🟢 PROGRAM GROUPS (Normalized)
  const programGroups = useMemo(() => {
    const allPrograms = [];
    candidates.forEach(c => {
      if (c.programme) allPrograms.push(c.programme);
    });
    return getProgramGroups(allPrograms);
  }, [candidates]);

  // ============================================================
  // FILTER LOGIC
  // ============================================================
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((c) =>
        (c.full_name?.toLowerCase() || "").includes(query) ||
        (c.email?.toLowerCase() || "").includes(query)
      );
    }

    // University filter
    if (selectedUniversity) {
      filtered = filtered.filter((c) => c.university === selectedUniversity);
    }

    // 🟢 Program filter - matches any variant of the selected master program
    if (selectedProgram) {
      const group = programGroups.find(g => g.master === selectedProgram);
      if (group) {
        const variants = group.variants;
        filtered = filtered.filter((c) => 
          variants.some(variant => c.programme === variant)
        );
      }
    }

    // Status filter
    if (selectedStatus === "completed") {
      filtered = filtered.filter((c) => c.latest !== null);
    } else if (selectedStatus === "not_started") {
      filtered = filtered.filter((c) => c.latest === null);
    } else if (selectedStatus === "in_progress") {
      filtered = filtered.filter((c) => c.results.length > 0 && c.latest?.completed_at === null);
    }

    return filtered;
  }, [candidates, searchQuery, selectedUniversity, selectedProgram, selectedStatus, programGroups]);

  // ============================================================
  // HANDLERS
  // ============================================================
  function clearFilters() {
    setSearchQuery("");
    setSelectedUniversity("");
    setSelectedProgram("");
    setSelectedStatus("all");
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

  // ============================================================
  // RENDER
  // ============================================================
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
          <>
            <FilterBar
              universityOptions={universityOptions}
              programGroups={programGroups}
              selectedUniversity={selectedUniversity}
              setSelectedUniversity={setSelectedUniversity}
              selectedProgram={selectedProgram}
              setSelectedProgram={setSelectedProgram}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              clearFilters={clearFilters}
              totalFiltered={filteredCandidates.length}
              totalCandidates={candidates.length}
            />

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Candidate</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>University</th>
                    <th style={styles.th}>Program</th>
                    <th style={styles.th}>Reports</th>
                    <th style={styles.th}>Latest Score</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={styles.noData}>
                        {searchQuery || selectedUniversity || selectedProgram || selectedStatus !== "all"
                          ? "No candidates match your filters."
                          : "No candidates found."}
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const latest = candidate.latest;
                      const latestScore = latest
                        ? Math.round(toNumber(latest.percentage_score, 0))
                        : 0;
                      const scoreStyle = getScoreStyle(latestScore);
                      const isExpanded = expandedCandidate === candidate.id;

                      // Determine status
                      let statusText = "Not Started";
                      let statusBg = "#FFF3E0";
                      let statusColor = "#E65100";

                      if (latest) {
                        if (latest.completed_at) {
                          statusText = "Completed";
                          statusBg = "#E8F5E9";
                          statusColor = "#2E7D32";
                        } else {
                          statusText = "In Progress";
                          statusBg = "#FFF8E1";
                          statusColor = "#F57F17";
                        }
                      }

                      return (
                        <FragmentRow
                          key={candidate.id}
                          candidate={candidate}
                          latest={latest}
                          latestScore={latestScore}
                          scoreStyle={scoreStyle}
                          isExpanded={isExpanded}
                          statusText={statusText}
                          statusBg={statusBg}
                          statusColor={statusColor}
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
          </>
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
  statusText,
  statusBg,
  statusColor,
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
              <div style={styles.candidateName}>
                {candidate.full_name || "Unnamed Candidate"}
              </div>
              <div style={styles.candidateMeta}>ID: {candidate.id}</div>
            </div>
          </div>
        </td>

        <td style={styles.td}>{candidate.email || "No email"}</td>

        <td style={styles.td}>{candidate.university || "—"}</td>

        <td style={styles.td}>{candidate.programme || "—"}</td>

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
          <span
            style={{
              ...styles.statusBadge,
              background: statusBg,
              color: statusColor
            }}
          >
            {statusText}
          </span>
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

            {candidate.results.length > 0 && (
              <button style={styles.expandButton} onClick={onToggleExpand}>
                {isExpanded ? "Hide Reports" : "Show Reports"}
              </button>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan="8" style={styles.expandCell}>
            <div style={styles.expandPanel}>
              <div style={styles.expandHeader}>
                <h3 style={styles.expandTitle}>Assessment Reports</h3>
                <span style={styles.expandSubtext}>
                  {candidate.results.length} report{candidate.results.length === 1 ? "" : "s"} found
                </span>
              </div>

              {candidate.results.length === 0 ? (
                <div style={styles.emptyExpand}>
                  This candidate has no completed assessment reports yet.
                </div>
              ) : (
                <div style={styles.reportList}>
                  {candidate.results.map((result) => {
                    const score = Math.round(toNumber(result.percentage_score, 0));
                    const itemStyle = getScoreStyle(score);

                    return (
                      <div key={result.id} style={styles.reportCard}>
                        <div style={styles.reportCardTop}>
                          <div>
                            <div style={styles.reportTitle}>
                              {result.assessment_title || "Unnamed Assessment"}
                            </div>
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

// ============================================================
// STYLES
// ============================================================
const styles = {
  container: {
    maxWidth: "1400px",
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
    cursor: "pointer",
    transition: "background 0.15s"
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
    fontWeight: 600,
    flexShrink: 0
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
    borderRadius: "999px",
    transition: "width 0.3s ease"
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
    wordBreak: "break-word"
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
  }
};
