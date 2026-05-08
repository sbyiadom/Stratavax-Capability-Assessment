// pages/supervisor/index.js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function safeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

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

function percentageFromResult(result) {
  if (!result) return 0;
  const score = safeNumber(result.score ?? result.total_score, null);
  const maxScore = safeNumber(result.max_score ?? result.maxScore, null);
  const fallback = safeNumber(result.percentage ?? result.percentage_score, null);
  if (score !== null && maxScore !== null && maxScore > 0) return Math.round((score / maxScore) * 100);
  if (fallback !== null) return Math.round(fallback);
  return 0;
}

function getClassification(percentage) {
  const value = safeNumber(percentage, 0);
  if (value >= 85) return { label: "Exceptional", color: "#0f766e", bg: "#ecfdf3" };
  if (value >= 75) return { label: "Strong", color: "#2563eb", bg: "#eff6ff" };
  if (value >= 65) return { label: "Capable", color: "#4f46e5", bg: "#eef2ff" };
  if (value >= 55) return { label: "Developing", color: "#d97706", bg: "#fffaeb" };
  if (value > 0) return { label: "At Risk", color: "#b42318", bg: "#fef3f2" };
  return { label: "No Data", color: "#667085", bg: "#f2f4f7" };
}

function getInitials(value) {
  const text = safeText(value, "C").trim();
  const parts = text.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return text ? text.charAt(0).toUpperCase() : "C";
}

function displayTypeName(type) {
  if (!type || type === "general") return "General";
  return String(type)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
}

function getStatusBadge(status, hasResult) {
  if (hasResult || status === "completed") return { label: "Completed", color: "#027a48", bg: "#ecfdf3", icon: "✓" };
  if (status === "unblocked") return { label: "Ready", color: "#175cd3", bg: "#eff8ff", icon: "↗" };
  if (status === "blocked") return { label: "Blocked", color: "#c2410c", bg: "#fff7ed", icon: "●" };
  return { label: safeText(status, "Scheduled"), color: "#475467", bg: "#f2f4f7", icon: "•" };
}

function getLatestCompletedAssessment(candidate) {
  const completed = safeArray(candidate.assessments).filter(function (item) {
    return item.result !== null && item.result !== undefined;
  });
  completed.sort(function (a, b) {
    const aDate = a.result && a.result.completed_at ? new Date(a.result.completed_at).getTime() : 0;
    const bDate = b.result && b.result.completed_at ? new Date(b.result.completed_at).getTime() : 0;
    return bDate - aDate;
  });
  return completed.length > 0 ? completed[0] : null;
}

function Pill({ children, color, bg }) {
  return <span style={{ ...styles.pill, color: color || "#344054", background: bg || "#f2f4f7" }}>{children}</span>;
}

function ProgressBar({ value, color }) {
  const safeValue = Math.max(0, Math.min(100, safeNumber(value, 0)));
  return (
    <div style={styles.progressTrack}>
      <div style={{ width: safeValue + "%", height: "100%", borderRadius: 999, background: color || "#0f766e" }} />
    </div>
  );
}

function MetricCard({ label, value, note, icon, color, bg }) {
  return (
    <div style={styles.metricCard}>
      <div style={{ ...styles.metricIcon, color: color || "#175cd3", background: bg || "#eef4ff" }}>{icon}</div>
      <div style={styles.metricTextWrap}>
        <p style={styles.metricLabel}>{label}</p>
        <p style={styles.metricValue}>{value}</p>
        {note ? <p style={styles.metricNote}>{note}</p> : null}
      </div>
    </div>
  );
}

function TabButton({ active, label, icon, count, onClick }) {
  return (
    <button type="button" style={active ? styles.tabButtonActive : styles.tabButton} onClick={onClick}>
      <span>{icon}</span>
      <span>{label}</span>
      {count !== undefined ? <span style={active ? styles.tabCountActive : styles.tabCount}>{count}</span> : null}
    </button>
  );
}

async function getSupervisorAccessToken() {
  const auth = await supabase.auth.getSession();
  const session = auth && auth.data ? auth.data.session : null;
  return session && session.access_token ? session.access_token : null;
}

async function fetchWithSupervisorAuth(url, body) {
  const token = await getSupervisorAccessToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {})
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  return { response, data };
}

export default function SupervisorDashboard() {
  const router = useRouter();

  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState("all");
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  const [reportSearch, setReportSearch] = useState("");
  const [reportAssessmentFilter, setReportAssessmentFilter] = useState("all");
  const [expandedReports, setExpandedReports] = useState({});

  const [assessmentOptions, setAssessmentOptions] = useState([]);
  const [resetAssessmentId, setResetAssessmentId] = useState("");
  const [resetMode, setResetMode] = useState("completed");
  const [resetCandidates, setResetCandidates] = useState([]);
  const [selectedMap, setSelectedMap] = useState({});
  const [action, setAction] = useState({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "", result: null });

  const selectedCount = useMemo(function () {
    return Object.keys(selectedMap).filter(function (key) {
      return selectedMap[key] === true;
    }).length;
  }, [selectedMap]);

  const dashboardStats = useMemo(function () {
    let totalAssignments = 0;
    let completed = 0;
    let ready = 0;
    let blocked = 0;

    candidates.forEach(function (candidate) {
      totalAssignments += safeNumber(candidate.totalAssessments, 0);
      completed += safeNumber(candidate.completedAssessments, 0);
      ready += safeNumber(candidate.readyAssessments, 0);
      blocked += safeNumber(candidate.blockedAssessments, 0);
    });

    return {
      totalCandidates: candidates.length,
      totalAssignments,
      completed,
      ready,
      blocked,
      completionRate: totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0
    };
  }, [candidates]);

  const assessmentSummary = useMemo(function () {
    const map = {};

    candidates.forEach(function (candidate) {
      safeArray(candidate.assessments).forEach(function (assessment) {
        const id = assessment.assessment_id;
        if (!id) return;

        if (!map[id]) {
          map[id] = {
            id,
            title: assessment.assessment_title || "Unknown Assessment",
            type: assessment.assessment_type_name || "General",
            icon: assessment.type_icon || "📋",
            gradientStart: assessment.type_gradient_start || "#0f766e",
            gradientEnd: assessment.type_gradient_end || "#14b8a6",
            total: 0,
            completed: 0,
            ready: 0,
            blocked: 0
          };
        }

        map[id].total += 1;
        if (assessment.result || assessment.status === "completed") map[id].completed += 1;
        else if (assessment.status === "unblocked") map[id].ready += 1;
        else if (assessment.status === "blocked") map[id].blocked += 1;
      });
    });

    return Object.values(map).sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
  }, [candidates]);

  const completedReports = useMemo(function () {
    const rows = [];

    candidates.forEach(function (candidate) {
      safeArray(candidate.assessments).forEach(function (assessment) {
        if (!assessment.result) return;
        const percentage = percentageFromResult(assessment.result);
        rows.push({
          candidate,
          assessment,
          percentage,
          classification: getClassification(percentage),
          completedAt: assessment.result.completed_at
        });
      });
    });

    rows.sort(function (a, b) {
      return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
    });

    return rows;
  }, [candidates]);

  const reportAssessmentOptions = useMemo(function () {
    const map = {};
    completedReports.forEach(function (row) {
      map[row.assessment.assessment_id] = row.assessment.assessment_title;
    });
    return Object.keys(map)
      .sort(function (a, b) {
        return map[a].localeCompare(map[b]);
      })
      .map(function (id) {
        return { id, title: map[id] };
      });
  }, [completedReports]);

  const reportCandidateGroups = useMemo(function () {
    const map = {};
    const term = reportSearch.toLowerCase().trim();

    completedReports.forEach(function (row) {
      const matchesAssessment = reportAssessmentFilter === "all" || row.assessment.assessment_id === reportAssessmentFilter;
      const matchesText =
        !term ||
        safeText(row.candidate.full_name, "").toLowerCase().indexOf(term) >= 0 ||
        safeText(row.candidate.email, "").toLowerCase().indexOf(term) >= 0 ||
        safeText(row.assessment.assessment_title, "").toLowerCase().indexOf(term) >= 0;

      if (!matchesAssessment || !matchesText) return;

      if (!map[row.candidate.id]) map[row.candidate.id] = { candidate: row.candidate, reports: [] };
      map[row.candidate.id].reports.push(row);
    });

    return Object.values(map).sort(function (a, b) {
      return a.candidate.full_name.localeCompare(b.candidate.full_name);
    });
  }, [completedReports, reportSearch, reportAssessmentFilter]);

  const filteredCandidates = useMemo(function () {
    let list = candidates.slice();
    const term = candidateSearch.toLowerCase().trim();

    if (term) {
      list = list.filter(function (candidate) {
        return (
          safeText(candidate.full_name, "").toLowerCase().indexOf(term) >= 0 ||
          safeText(candidate.email, "").toLowerCase().indexOf(term) >= 0 ||
          safeText(candidate.id, "").toLowerCase().indexOf(term) >= 0
        );
      });
    }

    if (candidateStatusFilter !== "all") {
      list = list.filter(function (candidate) {
        if (candidateStatusFilter === "completed") return candidate.completedAssessments > 0;
        if (candidateStatusFilter === "ready") return candidate.readyAssessments > 0;
        if (candidateStatusFilter === "blocked") return candidate.blockedAssessments > 0;
        if (candidateStatusFilter === "no_result") return candidate.completedAssessments === 0;
        return true;
      });
    }

    return list;
  }, [candidates, candidateSearch, candidateStatusFilter]);

  useEffect(function () {
    async function checkAuth() {
      try {
        const authResult = await supabase.auth.getSession();
        const supabaseSession = authResult && authResult.data ? authResult.data.session : null;

        if (supabaseSession) {
          const meta = supabaseSession.user && supabaseSession.user.user_metadata ? supabaseSession.user.user_metadata : {};
          const role = meta.role;
          if (role === "supervisor" || role === "admin") {
            setCurrentSupervisor({
              id: supabaseSession.user.id,
              email: supabaseSession.user.email,
              name: meta.full_name || supabaseSession.user.email,
              role
            });
            return;
          }
        }

        if (typeof window === "undefined") return;
        const stored = localStorage.getItem("userSession");
        if (!stored) {
          router.push("/login");
          return;
        }

        const session = JSON.parse(stored);
        if (session.loggedIn && (session.role === "supervisor" || session.role === "admin")) {
          setCurrentSupervisor({
            id: session.user_id,
            email: session.email,
            name: session.full_name || session.email,
            role: session.role
          });
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      }
    }

    checkAuth();
  }, [router]);

  useEffect(function () {
    if (!currentSupervisor) return;
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setErrorMessage("");

        const isAdmin = currentSupervisor.role === "admin";
        let candidatesQuery = supabase.from("candidate_profiles").select("id, full_name, email, phone, created_at, supervisor_id");
        if (!isAdmin) candidatesQuery = candidatesQuery.eq("supervisor_id", currentSupervisor.id);

        const candidatesResponse = await candidatesQuery.order("created_at", { ascending: false });
        if (candidatesResponse.error) throw candidatesResponse.error;

        const assessmentOptionMap = {};

        const processedCandidates = await Promise.all(safeArray(candidatesResponse.data).map(async function (candidate) {
          const resultsResponse = await supabase
            .from("assessment_results")
            .select("id, assessment_id, total_score, max_score, percentage_score, completed_at")
            .eq("user_id", candidate.id);

          const resultsMap = {};
          safeArray(resultsResponse.data).forEach(function (result) {
            resultsMap[result.assessment_id] = {
              id: result.id,
              score: result.total_score,
              max_score: result.max_score,
              percentage: result.percentage_score,
              completed_at: result.completed_at
            };
          });

          const accessResponse = await supabase
            .from("candidate_assessments")
            .select("id, assessment_id, status, created_at, unblocked_at, result_id")
            .eq("user_id", candidate.id);

          const accessData = safeArray(accessResponse.data);
          const assessmentIds = Array.from(new Set(accessData.map(function (item) { return item.assessment_id; }).filter(Boolean)));
          const assessmentMap = {};

          if (assessmentIds.length > 0) {
            const assessmentsResponse = await supabase
              .from("assessments")
              .select("id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end)")
              .in("id", assessmentIds);

            safeArray(assessmentsResponse.data).forEach(function (assessment) {
              assessmentMap[assessment.id] = assessment;
              assessmentOptionMap[assessment.id] = assessment.title || "Unknown Assessment";
            });
          }

          const assessmentsWithDetails = accessData.map(function (access) {
            const result = resultsMap[access.assessment_id] || null;
            const assessment = assessmentMap[access.assessment_id] || {};
            const type = assessment.assessment_types || {};
            let displayStatus = access.status;
            if (result || access.result_id || displayStatus === "completed") displayStatus = "completed";

            return {
              id: access.id,
              assessment_id: access.assessment_id,
              assessment_title: assessment.title || "Unknown Assessment",
              assessment_type_name: type.name || displayTypeName(type.code || "general"),
              type_icon: type.icon || "📋",
              type_gradient_start: type.gradient_start || "#0f766e",
              type_gradient_end: type.gradient_end || "#14b8a6",
              status: displayStatus,
              created_at: access.created_at,
              unblocked_at: access.unblocked_at,
              result
            };
          });

          const completedList = assessmentsWithDetails.filter(function (item) { return item.status === "completed" || item.result; });
          const readyList = assessmentsWithDetails.filter(function (item) { return item.status === "unblocked" && !item.result; });
          const blockedList = assessmentsWithDetails.filter(function (item) { return item.status === "blocked" && !item.result; });

          return {
            id: candidate.id,
            full_name: candidate.full_name || "Unnamed Candidate",
            email: candidate.email || "No email provided",
            phone: candidate.phone || "",
            created_at: candidate.created_at,
            totalAssessments: assessmentsWithDetails.length,
            completedAssessments: completedList.length,
            readyAssessments: readyList.length,
            blockedAssessments: blockedList.length,
            latestAssessment: getLatestCompletedAssessment({ assessments: assessmentsWithDetails }),
            assessments: assessmentsWithDetails
          };
        }));

        if (cancelled) return;

        setCandidates(processedCandidates);
        setAssessmentOptions(Object.keys(assessmentOptionMap)
          .sort(function (a, b) { return assessmentOptionMap[a].localeCompare(assessmentOptionMap[b]); })
          .map(function (id) { return { id, title: assessmentOptionMap[id] }; }));
      } catch (error) {
        if (!cancelled) setErrorMessage(error && error.message ? error.message : "Unable to load supervisor dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return function () { cancelled = true; };
  }, [currentSupervisor]);

  function switchToReports(candidateId) {
    setActiveTab("reports");
    if (candidateId) {
      setExpandedReports(function (previous) {
        return { ...previous, [candidateId]: true };
      });
    }
  }

  function toggleReportGroup(candidateId) {
    setExpandedReports(function (previous) {
      return { ...previous, [candidateId]: !previous[candidateId] };
    });
  }

  function expandAllReports() {
    const next = {};
    reportCandidateGroups.forEach(function (group) {
      next[group.candidate.id] = true;
    });
    setExpandedReports(next);
  }

  function collapseAllReports() {
    setExpandedReports({});
  }

  function resetBulkStateForAssessment(nextAssessmentId) {
    setResetAssessmentId(nextAssessmentId);
    setResetCandidates([]);
    setSelectedMap({});
    setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "", result: null });
  }

  async function loadAssessmentResetCandidates() {
    if (!resetAssessmentId) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select an assessment first.", result: null });
      return;
    }

    setAction({ loading: false, dryRunLoading: false, loadLoading: true, message: "", error: "", result: null });
    setResetCandidates([]);
    setSelectedMap({});

    try {
      const { response, data } = await fetchWithSupervisorAuth("/api/supervisor/assessment-reset-candidates", {
        assessmentId: resetAssessmentId,
        mode: resetMode
      });

      if (!response.ok || !data || data.success !== true) {
        setAction({
          loading: false,
          dryRunLoading: false,
          loadLoading: false,
          message: "",
          error: data && (data.message || data.error) ? data.message || data.error : "Unable to load reset candidates.",
          result: data
        });
        return;
      }

      setResetCandidates(safeArray(data.candidates));
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: data.count + " candidate(s) loaded for selected assessment.", error: "", result: data });
    } catch (error) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: error && error.message ? error.message : "Unable to load reset candidates.", result: null });
    }
  }

  function toggleCandidateSelection(userId) {
    setSelectedMap(function (previous) {
      return { ...previous, [userId]: !previous[userId] };
    });
  }

  function selectAllLoadedCandidates() {
    const next = {};
    resetCandidates.forEach(function (candidate) {
      next[candidate.userId] = true;
    });
    setSelectedMap(next);
  }

  function clearSelectedCandidates() {
    setSelectedMap({});
  }

  function buildBulkItems() {
    return Object.keys(selectedMap)
      .filter(function (userId) { return selectedMap[userId] === true; })
      .map(function (userId) { return { userId, assessmentId: resetAssessmentId }; });
  }

  async function runAssessmentBulkReset(dryRun) {
    if (!resetAssessmentId) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select an assessment first.", result: null });
      return;
    }

    const items = buildBulkItems();
    if (items.length === 0) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select at least one candidate to reset.", result: null });
      return;
    }

    if (!dryRun && typeof window !== "undefined") {
      const promptText = "You are about to reset " + items.length + " candidate(s) for ONLY the selected assessment. Other assessments will not be touched. Type RESET to continue.";
      if (window.prompt(promptText) !== "RESET") return;
    }

    setAction({ loading: !dryRun, dryRunLoading: dryRun, loadLoading: false, message: "", error: "", result: null });

    try {
      const { response, data } = await fetchWithSupervisorAuth("/api/supervisor/bulk-reset-assessments", {
        dryRun: dryRun === true,
        confirmBulkReset: dryRun === true ? false : true,
        items
      });

      if (!response.ok || !data) {
        setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: data && (data.message || data.error) ? data.message || data.error : "Bulk reset request failed.", result: data });
        return;
      }

      setAction({
        loading: false,
        dryRunLoading: false,
        loadLoading: false,
        message: dryRun ? "Dry run completed. Review summary before actual reset." : "Bulk reset completed. Refreshing dashboard...",
        error: "",
        result: data
      });

      if (!dryRun) {
        setSelectedMap({});
        setTimeout(function () { router.reload(); }, 1200);
      }
    } catch (error) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: error && error.message ? error.message : "Bulk reset failed.", result: null });
    }
  }

  function renderOverviewTab() {
    const latestReports = completedReports.slice(0, 5);
    return (
      <div style={styles.stack}>
        <section style={styles.metricsGrid}>
          <MetricCard label="Candidates" value={dashboardStats.totalCandidates} note="Assigned to workspace" icon="👥" color="#175cd3" bg="#eef4ff" />
          <MetricCard label="Completed" value={dashboardStats.completed} note="Submitted assessments" icon="✓" color="#027a48" bg="#ecfdf3" />
          <MetricCard label="Ready" value={dashboardStats.ready} note="Available to candidates" icon="↗" color="#175cd3" bg="#eff8ff" />
          <MetricCard label="Blocked" value={dashboardStats.blocked} note="Awaiting release/reset" icon="●" color="#c2410c" bg="#fff7ed" />
        </section>

        <section style={styles.overviewPanel}>
          <div style={styles.overviewProgressBlock}>
            <div style={styles.sectionTopLine}>
              <div>
                <p style={styles.eyebrow}>Progress Summary</p>
                <h2 style={styles.compactTitle}>Assessment Completion</h2>
              </div>
              <Pill color="#175cd3" bg="#eff8ff">{dashboardStats.completionRate}% complete</Pill>
            </div>
            <ProgressBar value={dashboardStats.completionRate} color="#0f766e" />
            <p style={styles.mutedText}>{dashboardStats.completed} of {dashboardStats.totalAssignments} assigned assessment records are completed.</p>
          </div>

          <div style={styles.overviewActivityBlock}>
            <div style={styles.sectionTopLine}>
              <div>
                <p style={styles.eyebrow}>Latest Activity</p>
                <h2 style={styles.compactTitle}>Recent Reports</h2>
              </div>
              <button type="button" style={styles.softButton} onClick={function () { switchToReports(); }}>Reports</button>
            </div>
            <div style={styles.compactList}>
              {latestReports.map(function (row) {
                return (
                  <button key={row.candidate.id + row.assessment.assessment_id + row.completedAt} type="button" style={styles.compactReportRow} onClick={function () { switchToReports(row.candidate.id); }}>
                    <span style={styles.compactReportText}><strong>{row.candidate.full_name}</strong> — {row.assessment.assessment_title}</span>
                    <Pill color={row.classification.color} bg={row.classification.bg}>{row.percentage}%</Pill>
                  </button>
                );
              })}
              {latestReports.length === 0 ? <div style={styles.emptyInline}>No completed reports yet.</div> : null}
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionTopLine}>
            <div>
              <p style={styles.eyebrow}>Quick Actions</p>
              <h2 style={styles.sectionTitle}>Common Supervisor Tasks</h2>
            </div>
          </div>
          <div style={styles.quickActionGrid}>
            <button type="button" style={styles.quickActionCard} onClick={function () { setActiveTab("candidates"); }}><span style={styles.quickActionIcon}>👥</span><strong>Find Candidate</strong><span>Search candidates and open assessment details.</span></button>
            <button type="button" style={styles.quickActionCard} onClick={function () { setActiveTab("reports"); }}><span style={styles.quickActionIcon}>📊</span><strong>Navigate Reports</strong><span>Open the exact report for each assessment.</span></button>
            <button type="button" style={styles.quickActionCard} onClick={function () { setActiveTab("assessments"); }}><span style={styles.quickActionIcon}>📋</span><strong>Review Progress</strong><span>See completion by assessment.</span></button>
            <button type="button" style={styles.quickActionCard} onClick={function () { setActiveTab("bulk-reset"); }}><span style={styles.quickActionIcon}>♻️</span><strong>Bulk Reset</strong><span>Use dry run before final reset.</span></button>
          </div>
        </section>
      </div>
    );
  }

  function renderCandidatesTab() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionTopLine}>
          <div>
            <p style={styles.eyebrow}>Candidate Directory</p>
            <h2 style={styles.sectionTitle}>Assigned Candidates</h2>
            <p style={styles.mutedText}>{filteredCandidates.length} of {candidates.length} candidate(s) shown</p>
          </div>
          <Pill color="#175cd3" bg="#eff8ff">Candidate management</Pill>
        </div>

        <div style={styles.filterBar}>
          <input value={candidateSearch} onChange={function (event) { setCandidateSearch(event.target.value); }} placeholder="Search name, email, or candidate ID..." style={styles.input} />
          <select value={candidateStatusFilter} onChange={function (event) { setCandidateStatusFilter(event.target.value); }} style={styles.select}>
            <option value="all">All candidates</option>
            <option value="completed">Has completed result</option>
            <option value="ready">Has ready assessment</option>
            <option value="blocked">Has blocked assessment</option>
            <option value="no_result">No completed result</option>
          </select>
        </div>

        {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}
        {renderCandidateList()}
      </section>
    );
  }

  function renderCandidateList() {
    if (loading) return <div style={styles.loadingBlock}><div style={styles.spinner} /><p style={styles.mutedText}>Loading candidates and assessments...</p></div>;
    if (filteredCandidates.length === 0) return <div style={styles.emptyState}>No candidates found.</div>;

    return (
      <div style={styles.listStack}>
        {filteredCandidates.map(function (candidate) {
          const latestAssessment = candidate.latestAssessment;
          const latestPercentage = latestAssessment && latestAssessment.result ? percentageFromResult(latestAssessment.result) : 0;
          const classification = getClassification(latestPercentage);
          const isExpanded = expandedCandidate === candidate.id;

          return (
            <article key={candidate.id} style={styles.candidateCard}>
              <div style={styles.candidateRow}>
                <div style={styles.identityBlock}>
                  <div style={styles.avatar}>{getInitials(candidate.full_name || candidate.email)}</div>
                  <div>
                    <h3 style={styles.rowTitle}>{candidate.full_name}</h3>
                    <p style={styles.rowSubText}>{candidate.email}</p>
                    <p style={styles.rowMeta}>ID: {safeText(candidate.id, "").substring(0, 12)}...</p>
                  </div>
                </div>

                <div style={styles.scoreBlock}>
                  <div style={styles.scoreLine}><strong>{latestAssessment ? latestPercentage + "%" : "N/A"}</strong><Pill color={classification.color} bg={classification.bg}>{classification.label}</Pill></div>
                  <ProgressBar value={latestPercentage} color={classification.color} />
                  <p style={styles.rowMeta}>Last completed: {latestAssessment && latestAssessment.result ? formatDate(latestAssessment.result.completed_at) : "Never"}</p>
                </div>

                <div style={styles.statusCluster}>
                  <Pill color="#027a48" bg="#ecfdf3">✓ {candidate.completedAssessments} completed</Pill>
                  <Pill color="#175cd3" bg="#eff8ff">↗ {candidate.readyAssessments} ready</Pill>
                  <Pill color="#c2410c" bg="#fff7ed">● {candidate.blockedAssessments} blocked</Pill>
                </div>

                <div style={styles.actionCluster}>
                  <button type="button" style={styles.darkButton} onClick={function () { setExpandedCandidate(isExpanded ? null : candidate.id); }}>{isExpanded ? "Hide" : "Assessments"}</button>
                  {candidate.completedAssessments > 0 ? <button type="button" style={styles.softButton} onClick={function () { switchToReports(candidate.id); }}>Reports</button> : null}
                </div>
              </div>

              {isExpanded ? renderCandidateAssessments(candidate) : null}
            </article>
          );
        })}
      </div>
    );
  }

  function renderCandidateAssessments(candidate) {
    return (
      <div style={styles.assessmentPanel}>
        <div style={styles.assessmentGrid}>
          {candidate.assessments.map(function (assessment) {
            const hasResult = assessment.result !== null && assessment.result !== undefined;
            const status = getStatusBadge(assessment.status, hasResult);
            const percentage = hasResult ? percentageFromResult(assessment.result) : 0;
            const classification = getClassification(percentage);

            return (
              <div key={assessment.id} style={styles.assessmentCard}>
                <div style={styles.assessmentTop}>
                  <div style={{ ...styles.assessmentIcon, background: "linear-gradient(135deg, " + assessment.type_gradient_start + " 0%, " + assessment.type_gradient_end + " 100%)" }}>{assessment.type_icon}</div>
                  <div>
                    <h4 style={styles.assessmentTitle}>{assessment.assessment_title}</h4>
                    <p style={styles.rowMeta}>{assessment.assessment_type_name}</p>
                  </div>
                </div>

                <div style={styles.statusCluster}>
                  <Pill color={status.color} bg={status.bg}>{status.icon} {status.label}</Pill>
                  {hasResult ? <Pill color={classification.color} bg={classification.bg}>{percentage}%</Pill> : null}
                </div>

                {hasResult ? (
                  <React.Fragment>
                    <ProgressBar value={percentage} color={classification.color} />
                    <p style={styles.rowMeta}>Completed: {formatDate(assessment.result.completed_at)}</p>
                    <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={styles.reportLink}>Open Report</Link>
                  </React.Fragment>
                ) : (
                  <p style={styles.mutedText}>{assessment.status === "unblocked" ? "Candidate can take this assessment." : "Assessment is currently blocked or scheduled."}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAssessmentsTab() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionTopLine}>
          <div>
            <p style={styles.eyebrow}>Assessment Progress</p>
            <h2 style={styles.sectionTitle}>Assessments Overview</h2>
            <p style={styles.mutedText}>Progress grouped by assessment.</p>
          </div>
          <Pill color="#175cd3" bg="#eff8ff">{assessmentSummary.length} assessment(s)</Pill>
        </div>

        <div style={styles.assessmentSummaryGrid}>
          {assessmentSummary.map(function (item) {
            const completedPercent = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            return (
              <article key={item.id} style={styles.assessmentSummaryCard}>
                <div style={styles.assessmentTop}>
                  <div style={{ ...styles.assessmentIcon, background: "linear-gradient(135deg, " + item.gradientStart + " 0%, " + item.gradientEnd + " 100%)" }}>{item.icon}</div>
                  <div>
                    <h3 style={styles.rowTitle}>{item.title}</h3>
                    <p style={styles.rowMeta}>{item.type}</p>
                  </div>
                </div>
                <ProgressBar value={completedPercent} color="#0f766e" />
                <div style={styles.statusCluster}>
                  <Pill color="#027a48" bg="#ecfdf3">✓ {item.completed}</Pill>
                  <Pill color="#175cd3" bg="#eff8ff">↗ {item.ready}</Pill>
                  <Pill color="#c2410c" bg="#fff7ed">● {item.blocked}</Pill>
                </div>
                <p style={styles.rowMeta}>{completedPercent}% completed across {item.total} assignment(s)</p>
              </article>
            );
          })}
          {assessmentSummary.length === 0 ? <div style={styles.emptyState}>No assessment assignments found.</div> : null}
        </div>
      </section>
    );
  }

  function renderReportsTab() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionTopLine}>
          <div>
            <p style={styles.eyebrow}>Reports</p>
            <h2 style={styles.sectionTitle}>Candidate Reports</h2>
            <p style={styles.mutedText}>Search, filter, expand a candidate, then open the exact assessment report.</p>
          </div>
          <Pill color="#027a48" bg="#ecfdf3">{completedReports.length} report(s)</Pill>
        </div>

        <div style={styles.reportToolbar}>
          <input value={reportSearch} onChange={function (event) { setReportSearch(event.target.value); }} placeholder="Search candidate, email, or assessment..." style={styles.input} />
          <select value={reportAssessmentFilter} onChange={function (event) { setReportAssessmentFilter(event.target.value); }} style={styles.select}>
            <option value="all">All assessments</option>
            {reportAssessmentOptions.map(function (item) { return <option key={item.id} value={item.id}>{item.title}</option>; })}
          </select>
          <button type="button" style={styles.softButton} onClick={expandAllReports}>Expand All</button>
          <button type="button" style={styles.softButton} onClick={collapseAllReports}>Collapse All</button>
        </div>

        <div style={styles.listStack}>
          {reportCandidateGroups.map(function (group) {
            const candidate = group.candidate;
            const reports = group.reports;
            const latestReport = reports[0];
            const isOpen = expandedReports[candidate.id] === true;

            return (
              <article key={candidate.id} style={styles.reportGroupCard}>
                <button type="button" style={styles.reportGroupHeader} onClick={function () { toggleReportGroup(candidate.id); }}>
                  <div style={styles.identityBlock}>
                    <div style={styles.avatarSmall}>{getInitials(candidate.full_name || candidate.email)}</div>
                    <div>
                      <h3 style={styles.rowTitle}>{candidate.full_name}</h3>
                      <p style={styles.rowSubText}>{candidate.email}</p>
                      <p style={styles.rowMeta}>{reports.length} completed assessment report{reports.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <div style={styles.reportGroupSummary}>
                    <Pill color="#175cd3" bg="#eff8ff">{reports.length} report{reports.length === 1 ? "" : "s"}</Pill>
                    {latestReport ? <Pill color={latestReport.classification.color} bg={latestReport.classification.bg}>Latest {latestReport.percentage}%</Pill> : null}
                    <span style={styles.chevron}>{isOpen ? "−" : "+"}</span>
                  </div>
                </button>

                {isOpen ? (
                  <div style={styles.reportAssessmentList}>
                    {reports.map(function (row) {
                      return (
                        <div key={row.candidate.id + row.assessment.assessment_id + row.completedAt} style={styles.reportAssessmentRow}>
                          <div style={styles.reportAssessmentInfo}>
                            <div style={{ ...styles.assessmentIconSmall, background: "linear-gradient(135deg, " + row.assessment.type_gradient_start + " 0%, " + row.assessment.type_gradient_end + " 100%)" }}>{row.assessment.type_icon}</div>
                            <div>
                              <h4 style={styles.assessmentTitle}>{row.assessment.assessment_title}</h4>
                              <p style={styles.rowMeta}>{row.assessment.assessment_type_name}</p>
                              <p style={styles.rowMeta}>Completed: {formatDate(row.completedAt)}</p>
                            </div>
                          </div>
                          <div style={styles.statusCluster}>
                            <strong style={{ color: row.classification.color }}>{row.percentage}%</strong>
                            <Pill color={row.classification.color} bg={row.classification.bg}>{row.classification.label}</Pill>
                          </div>
                          <Link href={`/supervisor/${row.candidate.id}?assessment=${row.assessment.assessment_id}`} style={styles.reportButton}>Open Report</Link>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
          {reportCandidateGroups.length === 0 ? <div style={styles.emptyState}>No completed reports found.</div> : null}
        </div>
      </section>
    );
  }

  function renderBulkResetTab() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionTopLine}>
          <div>
            <p style={styles.eyebrow}>Controlled Reset Workflow</p>
            <h2 style={styles.sectionTitle}>Bulk Reset by Assessment</h2>
            <p style={styles.mutedText}>Destructive action. Always dry run first, review the summary, then reset selected candidates.</p>
          </div>
          <Pill color="#c2410c" bg="#fff7ed">Assessment-specific reset</Pill>
        </div>

        <div style={styles.stepGrid}>
          <div style={styles.stepCard}><strong>1</strong><span>Select assessment</span></div>
          <div style={styles.stepCard}><strong>2</strong><span>Load candidates</span></div>
          <div style={styles.stepCard}><strong>3</strong><span>Run dry run</span></div>
          <div style={styles.stepCard}><strong>4</strong><span>Reset selected</span></div>
        </div>

        <div style={styles.bulkGrid}>
          <select value={resetAssessmentId} onChange={function (event) { resetBulkStateForAssessment(event.target.value); }} style={styles.select}>
            <option value="">Select assessment...</option>
            {assessmentOptions.map(function (assessment) { return <option key={assessment.id} value={assessment.id}>{assessment.title}</option>; })}
          </select>
          <select value={resetMode} onChange={function (event) { setResetMode(event.target.value); setResetCandidates([]); setSelectedMap({}); }} style={styles.select}>
            <option value="completed">Completed candidates</option>
            <option value="incomplete">Started but incomplete</option>
            <option value="ready">Ready/unstarted candidates</option>
            <option value="all">All assigned candidates</option>
          </select>
          <button type="button" style={styles.darkButton} onClick={loadAssessmentResetCandidates} disabled={action.loadLoading || !resetAssessmentId}>{action.loadLoading ? "Loading..." : "Load Candidates"}</button>
        </div>

        {resetCandidates.length > 0 ? (
          <div style={styles.resetPanel}>
            <div style={styles.resetHeader}>
              <strong>{resetCandidates.length} candidate(s) loaded</strong>
              <span>{selectedCount} selected</span>
              <button type="button" style={styles.softButton} onClick={selectAllLoadedCandidates}>Select All</button>
              <button type="button" style={styles.softButton} onClick={clearSelectedCandidates}>Clear</button>
              <button type="button" style={styles.blueButton} onClick={function () { runAssessmentBulkReset(true); }} disabled={action.dryRunLoading || action.loading || selectedCount === 0}>{action.dryRunLoading ? "Checking..." : "Dry Run"}</button>
              <button type="button" style={styles.dangerButton} onClick={function () { runAssessmentBulkReset(false); }} disabled={action.dryRunLoading || action.loading || selectedCount === 0}>{action.loading ? "Resetting..." : "Bulk Reset Selected"}</button>
            </div>
            <div style={styles.resetList}>
              {resetCandidates.map(function (candidate) {
                const selected = selectedMap[candidate.userId] === true;
                return (
                  <label key={candidate.userId} style={selected ? styles.resetRowSelected : styles.resetRow}>
                    <input type="checkbox" checked={selected} onChange={function () { toggleCandidateSelection(candidate.userId); }} />
                    <div style={styles.resetCandidateInfo}><strong>{candidate.fullName}</strong><span>{candidate.email}</span></div>
                    <Pill color="#175cd3" bg="#eff8ff">{candidate.resetCategory}</Pill>
                    <span style={styles.rowMeta}>Responses: {candidate.responseCount}</span>
                    <span style={styles.rowMeta}>Sessions: {candidate.sessionCount}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {action.error ? <div style={styles.errorBox}>{action.error}</div> : null}
        {action.message ? <div style={styles.successBox}>{action.message}</div> : null}
        {action.result ? <div style={styles.infoBox}><strong>Summary:</strong> {safeNumber(action.result.successful, 0)} successful, {safeNumber(action.result.failed, 0)} failed, {safeNumber(action.result.totalDeduped || action.result.count, 0)} total.</div> : null}
      </section>
    );
  }

  function renderActiveTab() {
    if (activeTab === "candidates") return renderCandidatesTab();
    if (activeTab === "assessments") return renderAssessmentsTab();
    if (activeTab === "reports") return renderReportsTab();
    if (activeTab === "bulk-reset") return renderBulkResetTab();
    return renderOverviewTab();
  }

  if (!currentSupervisor) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.centerLoader}><div style={styles.spinner} /></div>
        <style jsx>{spinStyles}</style>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.pageShell}>
        <section style={styles.headerPanel}>
          <div>
            <div style={styles.headerBadge}>Supervisor Workspace</div>
            <h1 style={styles.pageTitle}>Supervisor Dashboard</h1>
            <p style={styles.headerSubtitle}>{currentSupervisor.role === "admin" ? "Admin view across candidates and assessments" : "Assigned candidates and assessment progress"}</p>
            <p style={styles.headerMeta}>Welcome, {safeText(currentSupervisor.name, currentSupervisor.email)}</p>
          </div>
          <button type="button" style={styles.refreshButton} onClick={function () { router.reload(); }}>Refresh Data</button>
        </section>

        <nav style={styles.tabShell}>
          <TabButton active={activeTab === "overview"} icon="🏠" label="Overview" onClick={function () { setActiveTab("overview"); }} />
          <TabButton active={activeTab === "candidates"} icon="👥" label="Candidates" count={candidates.length} onClick={function () { setActiveTab("candidates"); }} />
          <TabButton active={activeTab === "assessments"} icon="📋" label="Assessments" count={assessmentSummary.length} onClick={function () { setActiveTab("assessments"); }} />
          <TabButton active={activeTab === "reports"} icon="📊" label="Reports" count={completedReports.length} onClick={function () { setActiveTab("reports"); }} />
          <TabButton active={activeTab === "bulk-reset"} icon="♻️" label="Bulk Reset" onClick={function () { setActiveTab("bulk-reset"); }} />
        </nav>

        {errorMessage && activeTab !== "candidates" ? <div style={styles.errorBox}>{errorMessage}</div> : null}
        {renderActiveTab()}
      </div>
      <style jsx>{spinStyles}</style>
    </AppLayout>
  );
}

var spinStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

var styles = {
  pageShell: { maxWidth: "1420px", margin: "0 auto", padding: "24px 20px 48px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
  centerLoader: { minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(15,23,42,0.15)", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" },

  headerPanel: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px", padding: "24px", borderRadius: "24px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)", color: "#ffffff", marginBottom: "16px", boxShadow: "0 22px 64px rgba(15,23,42,0.20)" },
  headerBadge: { display: "inline-flex", padding: "6px 11px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", color: "#ffffff", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" },
  pageTitle: { margin: 0, color: "#ffffff", fontSize: "38px", lineHeight: 1.08 },
  headerSubtitle: { margin: "10px 0 0", color: "rgba(255,255,255,0.86)", fontSize: "15px" },
  headerMeta: { margin: "7px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "13px" },
  refreshButton: { border: "1px solid rgba(255,255,255,0.34)", background: "rgba(255,255,255,0.12)", color: "#ffffff", padding: "11px 16px", borderRadius: "14px", cursor: "pointer", fontWeight: 900, whiteSpace: "nowrap" },

  tabShell: { display: "flex", gap: "9px", overflowX: "auto", padding: "9px", borderRadius: "22px", background: "rgba(255,255,255,0.94)", border: "1px solid #eaecf0", boxShadow: "0 14px 34px rgba(16,24,40,0.07)", marginBottom: "16px" },
  tabButton: { border: 0, borderRadius: "15px", padding: "11px 13px", background: "transparent", color: "#475467", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" },
  tabButtonActive: { border: 0, borderRadius: "15px", padding: "11px 13px", background: "#101828", color: "#ffffff", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(16,24,40,0.20)" },
  tabCount: { minWidth: "23px", height: "21px", padding: "0 7px", borderRadius: "999px", background: "#eef4ff", color: "#3538cd", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  tabCountActive: { minWidth: "23px", height: "21px", padding: "0 7px", borderRadius: "999px", background: "rgba(255,255,255,0.18)", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },

  stack: { display: "grid", gap: "14px" },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" },
  metricCard: { display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "20px", padding: "14px", boxShadow: "0 12px 32px rgba(16,24,40,0.06)" },
  metricIcon: { width: "42px", height: "42px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 900, flex: "0 0 auto" },
  metricTextWrap: { minWidth: 0 },
  metricLabel: { margin: 0, color: "#667085", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" },
  metricValue: { margin: "2px 0 0", color: "#101828", fontSize: "24px", lineHeight: 1.1, fontWeight: 900 },
  metricNote: { margin: "2px 0 0", color: "#667085", fontSize: "12px" },

  card: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "24px", padding: "20px", boxShadow: "0 18px 46px rgba(16,24,40,0.08)", marginBottom: "16px" },
  overviewPanel: { display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(320px, 1.1fr)", gap: "12px" },
  overviewProgressBlock: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "20px", padding: "14px", boxShadow: "0 12px 30px rgba(16,24,40,0.06)" },
  overviewActivityBlock: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "20px", padding: "14px", boxShadow: "0 12px 30px rgba(16,24,40,0.06)" },
  sectionTopLine: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" },
  eyebrow: { margin: "0 0 4px", color: "#667085", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em" },
  sectionTitle: { margin: 0, color: "#101828", fontSize: "22px", lineHeight: 1.2 },
  compactTitle: { margin: 0, color: "#101828", fontSize: "18px", lineHeight: 1.2 },
  mutedText: { margin: "7px 0 0", color: "#667085", fontSize: "13px", lineHeight: 1.5 },
  rowMeta: { margin: "4px 0 0", color: "#667085", fontSize: "12px", lineHeight: 1.4 },
  rowSubText: { margin: "4px 0 0", color: "#475467", fontSize: "13px", overflowWrap: "anywhere" },
  rowTitle: { margin: 0, color: "#101828", fontSize: "15px", overflowWrap: "anywhere" },

  quickActionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" },
  quickActionCard: { textAlign: "left", border: "1px solid #eaecf0", background: "#ffffff", borderRadius: "18px", padding: "15px", cursor: "pointer", display: "grid", gap: "8px", color: "#344054", boxShadow: "0 10px 24px rgba(16,24,40,0.04)" },
  quickActionIcon: { width: "38px", height: "38px", borderRadius: "13px", background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" },

  compactList: { display: "grid", gap: "7px" },
  compactReportRow: { width: "100%", border: "1px solid #eaecf0", borderRadius: "13px", padding: "8px 10px", background: "#ffffff", color: "#101828", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", textAlign: "left", minHeight: "42px" },
  compactReportText: { fontSize: "13px", lineHeight: 1.35, overflowWrap: "anywhere" },
  emptyInline: { padding: "16px", border: "1px dashed #cbd5e1", borderRadius: "14px", color: "#667085", textAlign: "center", fontSize: "13px" },

  filterBar: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 220px", gap: "12px", marginBottom: "16px" },
  reportToolbar: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(220px, 300px) auto auto", gap: "12px", marginBottom: "16px", alignItems: "center" },
  bulkGrid: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 230px 150px", gap: "12px", alignItems: "center" },
  input: { width: "100%", boxSizing: "border-box", padding: "12px 13px", border: "1px solid #d0d5dd", borderRadius: "13px", outline: "none", color: "#101828", background: "#ffffff" },
  select: { width: "100%", boxSizing: "border-box", padding: "12px 13px", border: "1px solid #d0d5dd", borderRadius: "13px", outline: "none", color: "#101828", background: "#ffffff" },

  listStack: { display: "grid", gap: "12px" },
  candidateCard: { border: "1px solid #eaecf0", borderRadius: "20px", background: "#ffffff", overflow: "hidden", boxShadow: "0 10px 26px rgba(16,24,40,0.04)" },
  candidateRow: { display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 0.75fr) minmax(220px, 0.8fr) 210px", gap: "14px", alignItems: "center", padding: "16px" },
  identityBlock: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
  avatar: { width: "46px", height: "46px", borderRadius: "16px", background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "0 0 auto" },
  avatarSmall: { width: "40px", height: "40px", borderRadius: "14px", background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "0 0 auto" },
  scoreBlock: { minWidth: 0 },
  scoreLine: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "7px", color: "#101828", fontSize: "22px" },
  progressTrack: { width: "100%", height: "8px", borderRadius: "999px", background: "#e4e7ec", overflow: "hidden" },
  statusCluster: { display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" },
  actionCluster: { display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" },
  pill: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "999px", border: "1px solid transparent", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },

  darkButton: { border: 0, padding: "10px 12px", borderRadius: "12px", background: "#101828", color: "#ffffff", fontSize: "13px", fontWeight: 900, cursor: "pointer", textDecoration: "none" },
  softButton: { border: 0, padding: "10px 12px", borderRadius: "12px", background: "#eef4ff", color: "#175cd3", fontSize: "13px", fontWeight: 900, cursor: "pointer", textDecoration: "none" },
  blueButton: { border: 0, padding: "10px 12px", borderRadius: "12px", background: "#1d4ed8", color: "#ffffff", fontSize: "13px", fontWeight: 900, cursor: "pointer" },
  dangerButton: { border: 0, padding: "10px 12px", borderRadius: "12px", background: "#b42318", color: "#ffffff", fontSize: "13px", fontWeight: 900, cursor: "pointer" },

  assessmentPanel: { borderTop: "1px solid #eaecf0", background: "#f8fafc", padding: "16px" },
  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" },
  assessmentCard: { background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "16px", padding: "14px", display: "grid", gap: "10px" },
  assessmentTop: { display: "flex", alignItems: "center", gap: "11px" },
  assessmentIcon: { width: "40px", height: "40px", borderRadius: "13px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 900, flex: "0 0 auto" },
  assessmentIconSmall: { width: "38px", height: "38px", borderRadius: "12px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: 900, flex: "0 0 auto" },
  assessmentTitle: { margin: 0, color: "#101828", fontSize: "14px", overflowWrap: "anywhere" },
  reportLink: { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", width: "100%", padding: "10px 12px", borderRadius: "12px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", fontSize: "13px", fontWeight: 900 },

  assessmentSummaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "12px" },
  assessmentSummaryCard: { border: "1px solid #eaecf0", borderRadius: "18px", padding: "15px", background: "#ffffff", boxShadow: "0 10px 24px rgba(16,24,40,0.04)", display: "grid", gap: "11px" },

  reportGroupCard: { border: "1px solid #eaecf0", borderRadius: "20px", background: "#ffffff", overflow: "hidden", boxShadow: "0 10px 26px rgba(16,24,40,0.04)" },
  reportGroupHeader: { width: "100%", border: 0, background: "#ffffff", padding: "15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", textAlign: "left" },
  reportGroupSummary: { display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" },
  chevron: { width: "30px", height: "30px", borderRadius: "999px", background: "#f2f4f7", color: "#344054", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px" },
  reportAssessmentList: { display: "grid", gap: "10px", padding: "0 15px 15px", borderTop: "1px solid #eaecf0" },
  reportAssessmentRow: { display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 210px 130px", gap: "12px", alignItems: "center", border: "1px solid #eaecf0", borderRadius: "15px", padding: "11px", background: "#f8fafc", marginTop: "10px" },
  reportAssessmentInfo: { display: "flex", alignItems: "center", gap: "11px", minWidth: 0 },
  reportButton: { textDecoration: "none", textAlign: "center", border: 0, padding: "10px 12px", borderRadius: "12px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", fontSize: "13px", fontWeight: 900 },

  stepGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "14px" },
  stepCard: { display: "flex", alignItems: "center", gap: "10px", border: "1px solid #eaecf0", background: "#ffffff", borderRadius: "15px", padding: "11px", color: "#344054", fontSize: "13px" },
  resetPanel: { border: "1px solid #eaecf0", borderRadius: "18px", background: "#ffffff", padding: "14px", marginTop: "14px" },
  resetHeader: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "space-between", marginBottom: "12px", color: "#344054", fontSize: "13px" },
  resetList: { display: "grid", gap: "8px", maxHeight: "380px", overflowY: "auto" },
  resetRow: { display: "grid", gridTemplateColumns: "24px minmax(220px, 1fr) auto auto auto", gap: "10px", alignItems: "center", padding: "10px", border: "1px solid #eaecf0", borderRadius: "13px", cursor: "pointer", background: "#ffffff" },
  resetRowSelected: { display: "grid", gridTemplateColumns: "24px minmax(220px, 1fr) auto auto auto", gap: "10px", alignItems: "center", padding: "10px", border: "2px solid #f04438", borderRadius: "13px", cursor: "pointer", background: "#fef3f2" },
  resetCandidateInfo: { display: "grid", gap: "2px", color: "#101828", fontSize: "13px" },

  errorBox: { padding: "12px 14px", borderRadius: "14px", border: "1px solid #fecaca", background: "#fff5f5", color: "#b42318", fontSize: "13px", marginBottom: "14px" },
  successBox: { padding: "12px 14px", borderRadius: "14px", background: "#ecfdf3", color: "#027a48", fontSize: "13px", fontWeight: 800, marginTop: "12px" },
  infoBox: { padding: "12px 14px", borderRadius: "14px", background: "#eff6ff", color: "#175cd3", fontSize: "13px", marginTop: "12px" },
  loadingBlock: { minHeight: "230px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "12px" },
  emptyState: { padding: "34px 18px", border: "1px dashed #cbd5e1", borderRadius: "20px", background: "#ffffff", textAlign: "center", color: "#667085" }
};
