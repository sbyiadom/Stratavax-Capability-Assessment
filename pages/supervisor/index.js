// pages/supervisor/index.js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) { return Array.isArray(value) ? value : []; }
function safeText(value, fallback) { return value === null || value === undefined || value === "" ? fallback || "" : String(value); }
function safeNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback === undefined ? 0 : fallback); }
function formatDate(value) { try { return value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"; } catch (e) { return "N/A"; } }
function calculatePercentage(score, maxScore, fallbackPercentage) {
  const s = safeNumber(score, null); const m = safeNumber(maxScore, null); const f = safeNumber(fallbackPercentage, null);
  if (s !== null && m !== null && m > 0) return Math.round((s / m) * 100);
  if (f !== null && f !== undefined && Number.isFinite(Number(f))) return Math.round(Number(f));
  return 0;
}
function getClassification(percentage) {
  const v = safeNumber(percentage, 0);
  if (v >= 85) return { label: "Exceptional", color: "#0f766e", bg: "#ecfdf3" };
  if (v >= 75) return { label: "Strong", color: "#2563eb", bg: "#eff6ff" };
  if (v >= 65) return { label: "Capable", color: "#4f46e5", bg: "#eef2ff" };
  if (v >= 55) return { label: "Developing", color: "#d97706", bg: "#fffaeb" };
  if (v > 0) return { label: "At Risk", color: "#b42318", bg: "#fef3f2" };
  return { label: "No Data", color: "#667085", bg: "#f2f4f7" };
}
function getInitials(value) {
  const text = safeText(value, "C").trim(); const parts = text.split(" ").filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : text ? text[0].toUpperCase() : "C";
}
function displayTypeName(type) {
  if (!type || type === "general") return "General";
  return String(type).replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
function getStatusBadge(status, hasResult) {
  if (hasResult || status === "completed") return { label: "Completed", icon: "✓", color: "#027a48", bg: "#ecfdf3" };
  if (status === "unblocked") return { label: "Ready", icon: "↗", color: "#175cd3", bg: "#eff8ff" };
  if (status === "blocked") return { label: "Blocked", icon: "●", color: "#c2410c", bg: "#fff7ed" };
  return { label: safeText(status, "Scheduled"), icon: "•", color: "#475467", bg: "#f2f4f7" };
}
function getBestCompletedAssessment(candidate) {
  const completed = safeArray(candidate.assessments).filter((item) => item.result);
  completed.sort((a, b) => new Date((b.result && b.result.completed_at) || 0).getTime() - new Date((a.result && a.result.completed_at) || 0).getTime());
  return completed.length > 0 ? completed[0] : null;
}
function Pill({ color, bg, children }) { return <span style={{ ...styles.pill, color, background: bg }}>{children}</span>; }
function ProgressBar({ value, color }) {
  const v = Math.max(0, Math.min(100, safeNumber(value, 0)));
  return <div style={styles.progressTrack}><div style={{ width: v + "%", height: "100%", borderRadius: 999, background: color || "#0f766e" }} /></div>;
}
function StatCard({ label, value, note, icon, bg, color }) {
  return <div style={styles.statCard}><div style={{ ...styles.statIcon, background: bg || "#eef4ff", color: color || "#175cd3" }}>{icon}</div><div><p style={styles.statLabel}>{label}</p><p style={styles.statValue}>{value}</p>{note ? <p style={styles.statNote}>{note}</p> : null}</div></div>;
}
function TabButton({ active, icon, label, count, onClick }) {
  return <button type="button" style={active ? styles.tabActive : styles.tabButton} onClick={onClick}><span>{icon}</span><span>{label}</span>{count !== undefined ? <span style={active ? styles.tabCountActive : styles.tabCount}>{count}</span> : null}</button>;
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
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body || {}) });
  let data = {};
  try { data = await response.json(); } catch (e) { data = {}; }
  return { response, data };
}

export default function SupervisorDashboard() {
  const router = useRouter();
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [assessmentOptions, setAssessmentOptions] = useState([]);
  const [resetAssessmentId, setResetAssessmentId] = useState("");
  const [resetMode, setResetMode] = useState("all");
  const [resetCandidates, setResetCandidates] = useState([]);
  const [selectedMap, setSelectedMap] = useState({});
  const [action, setAction] = useState({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "", result: null });

  const selectedCount = useMemo(() => Object.keys(selectedMap).filter((key) => selectedMap[key] === true).length, [selectedMap]);

  const dashboardStats = useMemo(() => {
    let totalAssessments = 0, completed = 0, ready = 0, blocked = 0;
    candidates.forEach((candidate) => {
      totalAssessments += safeNumber(candidate.totalAssessments, 0);
      completed += safeNumber(candidate.completedAssessments, 0);
      ready += safeNumber(candidate.readyAssessments, 0);
      blocked += safeNumber(candidate.blockedAssessments, 0);
    });
    return { totalCandidates: candidates.length, totalAssessments, completed, ready, blocked, completionRate: totalAssessments > 0 ? Math.round((completed / totalAssessments) * 100) : 0 };
  }, [candidates]);

  const assessmentSummary = useMemo(() => {
    const map = {};
    candidates.forEach((candidate) => {
      safeArray(candidate.assessments).forEach((assessment) => {
        const id = assessment.assessment_id;
        if (!id) return;
        if (!map[id]) map[id] = { id, title: assessment.assessment_title || "Unknown Assessment", type: assessment.assessment_type_name || "General", icon: assessment.type_icon || "📋", total: 0, completed: 0, ready: 0, blocked: 0 };
        map[id].total += 1;
        if (assessment.status === "completed" || assessment.result) map[id].completed += 1;
        else if (assessment.status === "unblocked") map[id].ready += 1;
        else if (assessment.status === "blocked") map[id].blocked += 1;
      });
    });
    return Object.values(map).sort((a, b) => a.title.localeCompare(b.title));
  }, [candidates]);

  const completedReports = useMemo(() => {
    const rows = [];
    candidates.forEach((candidate) => {
      safeArray(candidate.assessments).forEach((assessment) => {
        if (assessment.result) {
          const percentage = calculatePercentage(assessment.result.score, assessment.result.max_score, assessment.result.percentage);
          rows.push({ candidate, assessment, percentage, classification: getClassification(percentage), completedAt: assessment.result.completed_at });
        }
      });
    });
    rows.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
    return rows;
  }, [candidates]);

  const reportCandidateGroups = useMemo(() => {
    const map = {};
    completedReports.forEach((row) => {
      const candidateId = row.candidate.id;
      if (!map[candidateId]) map[candidateId] = { candidate: row.candidate, reports: [] };
      map[candidateId].reports.push(row);
    });
    return Object.values(map).sort((a, b) => a.candidate.full_name.localeCompare(b.candidate.full_name));
  }, [completedReports]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const authResult = await supabase.auth.getSession();
        const supabaseSession = authResult && authResult.data ? authResult.data.session : null;
        if (supabaseSession) {
          const meta = supabaseSession.user && supabaseSession.user.user_metadata ? supabaseSession.user.user_metadata : {};
          const role = meta.role;
          if (role === "supervisor" || role === "admin") {
            setCurrentSupervisor({ id: supabaseSession.user.id, email: supabaseSession.user.email, name: meta.full_name || supabaseSession.user.email, role });
            return;
          }
        }
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem("userSession");
        if (!stored) { router.push("/login"); return; }
        const session = JSON.parse(stored);
        if (session.loggedIn && (session.role === "supervisor" || session.role === "admin")) setCurrentSupervisor({ id: session.user_id, email: session.email, name: session.full_name || session.email, role: session.role });
        else router.push("/login");
      } catch (error) { router.push("/login"); }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!currentSupervisor) return;
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true); setErrorMessage("");
        const isAdmin = currentSupervisor.role === "admin";
        let candidatesQuery = supabase.from("candidate_profiles").select("id, full_name, email, phone, created_at, supervisor_id");
        if (!isAdmin) candidatesQuery = candidatesQuery.eq("supervisor_id", currentSupervisor.id);
        const candidatesResponse = await candidatesQuery.order("created_at", { ascending: false });
        if (candidatesResponse.error) throw candidatesResponse.error;
        const assessmentOptionMap = {};
        const processedCandidates = await Promise.all(safeArray(candidatesResponse.data).map(async (candidate) => {
          const resultsResponse = await supabase.from("assessment_results").select("id, assessment_id, total_score, max_score, percentage_score, completed_at").eq("user_id", candidate.id);
          const resultsMap = {};
          safeArray(resultsResponse.data).forEach((result) => { resultsMap[result.assessment_id] = { id: result.id, score: result.total_score, max_score: result.max_score, percentage: result.percentage_score, completed_at: result.completed_at }; });
          const accessResponse = await supabase.from("candidate_assessments").select("id, assessment_id, status, created_at, unblocked_at, result_id").eq("user_id", candidate.id);
          const accessData = safeArray(accessResponse.data);
          const assessmentIds = Array.from(new Set(accessData.map((item) => item.assessment_id).filter(Boolean)));
          const assessmentMap = {};
          if (assessmentIds.length > 0) {
            const assessmentsResponse = await supabase.from("assessments").select("id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end)").in("id", assessmentIds);
            safeArray(assessmentsResponse.data).forEach((assessment) => { assessmentMap[assessment.id] = assessment; assessmentOptionMap[assessment.id] = assessment.title || "Unknown Assessment"; });
          }
          const assessmentsWithDetails = accessData.map((access) => {
            const result = resultsMap[access.assessment_id] || null;
            const assessment = assessmentMap[access.assessment_id] || {};
            const type = assessment.assessment_types || {};
            let displayStatus = access.status;
            if (result || access.result_id || displayStatus === "completed") displayStatus = "completed";
            return { id: access.id, assessment_id: access.assessment_id, assessment_title: assessment.title || "Unknown Assessment", assessment_type_name: type.name || displayTypeName(type.code || "general"), type_icon: type.icon || "📋", type_gradient_start: type.gradient_start || "#0f766e", type_gradient_end: type.gradient_end || "#14b8a6", status: displayStatus, created_at: access.created_at, unblocked_at: access.unblocked_at, result };
          });
          const completedList = assessmentsWithDetails.filter((item) => item.status === "completed" || item.result);
          const readyList = assessmentsWithDetails.filter((item) => item.status === "unblocked" && !item.result);
          const blockedList = assessmentsWithDetails.filter((item) => item.status === "blocked" && !item.result);
          return { id: candidate.id, full_name: candidate.full_name || "Unnamed Candidate", email: candidate.email || "No email provided", phone: candidate.phone || "", created_at: candidate.created_at, totalAssessments: assessmentsWithDetails.length, completedAssessments: completedList.length, readyAssessments: readyList.length, blockedAssessments: blockedList.length, latestAssessment: getBestCompletedAssessment({ assessments: assessmentsWithDetails }), assessments: assessmentsWithDetails };
        }));
        if (cancelled) return;
        setCandidates(processedCandidates); setFilteredCandidates(processedCandidates);
        setAssessmentOptions(Object.keys(assessmentOptionMap).sort((a, b) => assessmentOptionMap[a].localeCompare(assessmentOptionMap[b])).map((id) => ({ id, title: assessmentOptionMap[id] })));
      } catch (error) { if (!cancelled) setErrorMessage(error && error.message ? error.message : "Unable to load supervisor dashboard data."); }
      finally { if (!cancelled) setLoading(false); }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [currentSupervisor]);

  useEffect(() => {
    let filtered = candidates.slice();
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((candidate) => safeText(candidate.full_name, "").toLowerCase().includes(term) || safeText(candidate.email, "").toLowerCase().includes(term) || safeText(candidate.id, "").toLowerCase().includes(term));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((candidate) => {
        if (statusFilter === "completed") return candidate.completedAssessments > 0;
        if (statusFilter === "ready") return candidate.readyAssessments > 0;
        if (statusFilter === "blocked") return candidate.blockedAssessments > 0;
        if (statusFilter === "no_result") return candidate.completedAssessments === 0;
        return true;
      });
    }
    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, statusFilter]);

  async function loadAssessmentResetCandidates() {
    if (!resetAssessmentId) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select an assessment first.", result: null }); return; }
    setAction({ loading: false, dryRunLoading: false, loadLoading: true, message: "", error: "", result: null });
    setResetCandidates([]); setSelectedMap({});
    try {
      const { response, data } = await fetchWithSupervisorAuth("/api/supervisor/assessment-reset-candidates", { assessmentId: resetAssessmentId, mode: resetMode });
      if (!response.ok || !data || data.success !== true) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: data && (data.message || data.error) ? data.message || data.error : "Unable to load reset candidates.", result: data }); return; }
      setResetCandidates(safeArray(data.candidates));
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: data.count + " candidate(s) loaded for selected assessment.", error: "", result: data });
    } catch (error) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: error && error.message ? error.message : "Unable to load reset candidates.", result: null }); }
  }
  function toggleCandidateSelection(userId) { setSelectedMap((prev) => ({ ...prev, [userId]: !prev[userId] })); }
  function selectAllLoadedCandidates() { const next = {}; resetCandidates.forEach((candidate) => { next[candidate.userId] = true; }); setSelectedMap(next); }
  function clearSelectedCandidates() { setSelectedMap({}); }
  function buildBulkItems() { return Object.keys(selectedMap).filter((userId) => selectedMap[userId] === true).map((userId) => ({ userId, assessmentId: resetAssessmentId })); }
  async function runAssessmentBulkReset(dryRun) {
    if (!resetAssessmentId) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select an assessment first.", result: null }); return; }
    const items = buildBulkItems();
    if (items.length === 0) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select at least one candidate to reset.", result: null }); return; }
    if (!dryRun && typeof window !== "undefined") { const promptText = "You are about to reset " + items.length + " candidate(s) for ONLY the selected assessment. Other assessments will not be touched. Type RESET to continue."; if (window.prompt(promptText) !== "RESET") return; }
    setAction({ loading: !dryRun, dryRunLoading: dryRun, loadLoading: false, message: "", error: "", result: null });
    try {
      const { response, data } = await fetchWithSupervisorAuth("/api/supervisor/bulk-reset-assessments", { dryRun: dryRun === true, confirmBulkReset: dryRun === true ? false : true, items });
      if (!response.ok || !data) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: data && (data.message || data.error) ? data.message || data.error : "Bulk reset request failed.", result: data }); return; }
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: dryRun ? "Dry run completed. Review summary before actual reset." : "Bulk reset completed. Refreshing dashboard...", error: "", result: data });
      if (!dryRun) { setSelectedMap({}); setTimeout(() => router.reload(), 1200); }
    } catch (error) { setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: error && error.message ? error.message : "Bulk reset failed.", result: null }); }
  }
  async function handleLogout() { await supabase.auth.signOut(); if (typeof window !== "undefined") localStorage.removeItem("userSession"); router.push("/login"); }

  function renderOverviewTab() {
    return <div style={styles.tabStack}><div style={styles.statGrid}><StatCard label="Candidates" value={dashboardStats.totalCandidates} note="Assigned to workspace" icon="👥" bg="#eef4ff" color="#175cd3" /><StatCard label="Completed" value={dashboardStats.completed} note="Submitted assessments" icon="✓" bg="#ecfdf3" color="#027a48" /><StatCard label="Ready" value={dashboardStats.ready} note="Available to candidates" icon="↗" bg="#eff8ff" color="#175cd3" /><StatCard label="Blocked" value={dashboardStats.blocked} note="Awaiting release/reset" icon="●" bg="#fff7ed" color="#c2410c" /></div><div style={styles.overviewGrid}><section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Progress Summary</p><h2 style={styles.sectionTitle}>Assessment Completion</h2></div><Pill color="#175cd3" bg="#eff8ff">{dashboardStats.completionRate}% complete</Pill></div><ProgressBar value={dashboardStats.completionRate} color="#0f766e" /><p style={styles.bodyText}>{dashboardStats.completed} of {dashboardStats.totalAssessments} assigned assessment records are completed.</p></section><section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Reports</p><h2 style={styles.sectionTitle}>Candidates with Reports</h2></div><button type="button" style={styles.textButton} onClick={() => setActiveTab("reports")}>View reports</button></div><div style={styles.compactList}>{reportCandidateGroups.slice(0, 5).map((group) => <div key={group.candidate.id} style={styles.compactRow}><div><strong>{group.candidate.full_name}</strong><span>{group.reports.length} completed report{group.reports.length === 1 ? "" : "s"}</span></div><Pill color="#175cd3" bg="#eff8ff">{group.reports.length}</Pill></div>)}{reportCandidateGroups.length === 0 ? <div style={styles.emptyInline}>No completed reports yet.</div> : null}</div></section></div><section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Quick Actions</p><h2 style={styles.sectionTitle}>Common Supervisor Tasks</h2></div></div><div style={styles.quickActionGrid}><button type="button" style={styles.quickActionCard} onClick={() => setActiveTab("candidates")}><span style={styles.quickActionIcon}>👥</span><strong>Find Candidate</strong><span>Search candidates and open assessment details.</span></button><button type="button" style={styles.quickActionCard} onClick={() => setActiveTab("reports")}><span style={styles.quickActionIcon}>📊</span><strong>Navigate Reports</strong><span>Select candidate then assessment report.</span></button><button type="button" style={styles.quickActionCard} onClick={() => setActiveTab("bulk-reset")}><span style={styles.quickActionIcon}>♻️</span><strong>Bulk Reset</strong><span>Run dry run first, then reset.</span></button><button type="button" style={styles.quickActionCard} onClick={() => router.reload()}><span style={styles.quickActionIcon}>🔄</span><strong>Refresh Data</strong><span>Reload dashboard records.</span></button></div></section></div>;
  }
  function renderCandidateFilters() {
    return <div style={styles.filterBar}><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email, or candidate ID..." style={styles.searchInput} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.filterSelect}><option value="all">All candidates</option><option value="completed">Has completed result</option><option value="ready">Has ready assessment</option><option value="blocked">Has blocked assessment</option><option value="no_result">No completed result</option></select></div>;
  }
  function renderCandidateList() {
    if (loading) return <div style={styles.loadingBlock}><div style={styles.spinner} /><p style={styles.loadingText}>Loading candidates and assessments...</p></div>;
    if (filteredCandidates.length === 0) return <div style={styles.emptyState}>No candidates found.</div>;
    return <div style={styles.candidateList}>{filteredCandidates.map((candidate) => {
      const latestAssessment = candidate.latestAssessment;
      const latestPercentage = latestAssessment && latestAssessment.result ? calculatePercentage(latestAssessment.result.score, latestAssessment.result.max_score, latestAssessment.result.percentage) : 0;
      const classification = getClassification(latestPercentage); const isExpanded = expandedCandidate === candidate.id;
      return <div key={candidate.id} style={styles.candidateCard}><div style={styles.candidateMainRow}><div style={styles.candidateIdentity}><div style={styles.avatar}>{getInitials(candidate.full_name || candidate.email)}</div><div><h3 style={styles.candidateName}>{candidate.full_name}</h3><p style={styles.candidateEmail}>{candidate.email}</p><p style={styles.candidateId}>ID: {safeText(candidate.id, "").substring(0, 12)}...</p></div></div><div style={styles.scoreBlock}><div style={styles.scoreTopLine}><span style={styles.scoreValue}>{latestAssessment ? latestPercentage + "%" : "N/A"}</span><Pill color={classification.color} bg={classification.bg}>{classification.label}</Pill></div><ProgressBar value={latestPercentage} color={classification.color} /><p style={styles.lastActive}>Last completed: {latestAssessment && latestAssessment.result ? formatDate(latestAssessment.result.completed_at) : "Never"}</p></div><div style={styles.summaryPills}><Pill color="#027a48" bg="#ecfdf3">✓ {candidate.completedAssessments} completed</Pill><Pill color="#175cd3" bg="#eff8ff">↗ {candidate.readyAssessments} ready</Pill><Pill color="#c2410c" bg="#fff7ed">● {candidate.blockedAssessments} blocked</Pill></div><div style={styles.rowActions}><button type="button" onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)} style={styles.primaryButton}>{isExpanded ? "Hide" : "Assessments"}</button></div></div>{isExpanded ? <div style={styles.assessmentPanel}><div style={styles.assessmentGrid}>{candidate.assessments.map((assessment) => { const status = getStatusBadge(assessment.status, assessment.result !== null); const percentage = assessment.result ? calculatePercentage(assessment.result.score, assessment.result.max_score, assessment.result.percentage) : 0; const assessmentClassification = getClassification(percentage); return <div key={assessment.id} style={styles.assessmentCard}><div style={styles.assessmentTop}><div style={{ ...styles.assessmentIcon, background: "linear-gradient(135deg, " + assessment.type_gradient_start + " 0%, " + assessment.type_gradient_end + " 100%)" }}>{assessment.type_icon}</div><div><h4 style={styles.assessmentTitle}>{assessment.assessment_title}</h4><p style={styles.assessmentType}>{assessment.assessment_type_name}</p></div></div><div style={styles.assessmentPills}><Pill color={status.color} bg={status.bg}>{status.icon} {status.label}</Pill>{assessment.result ? <Pill color={assessmentClassification.color} bg={assessmentClassification.bg}>{percentage}%</Pill> : null}</div>{assessment.result ? <React.Fragment><ProgressBar value={percentage} color={assessmentClassification.color} /><p style={styles.lastActive}>Completed: {formatDate(assessment.result.completed_at)}</p><Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={styles.reportLink}>View Report</Link></React.Fragment> : <p style={styles.waitingText}>{assessment.status === "unblocked" ? "Candidate can take this assessment." : "Assessment is currently blocked or scheduled."}</p>}</div>; })}</div></div> : null}</div>;
    })}</div>;
  }
  function renderCandidatesTab() { return <section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Candidate Directory</p><h2 style={styles.sectionTitle}>Assigned Candidates</h2><p style={styles.sectionSubtitle}>{filteredCandidates.length} of {candidates.length} candidate(s) shown</p></div><Pill color="#175cd3" bg="#eff8ff">Search and open reports</Pill></div>{renderCandidateFilters()}{errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}{renderCandidateList()}</section>; }
  function renderAssessmentsTab() { return <section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Assessment Progress</p><h2 style={styles.sectionTitle}>Assessments Overview</h2><p style={styles.sectionSubtitle}>Progress grouped by assessment.</p></div><Pill color="#175cd3" bg="#eff8ff">{assessmentSummary.length} assessment(s)</Pill></div><div style={styles.assessmentSummaryGrid}>{assessmentSummary.map((item) => { const completedPercent = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0; return <article key={item.id} style={styles.assessmentSummaryCard}><div style={styles.assessmentSummaryTop}><div style={styles.assessmentSummaryIcon}>{item.icon}</div><div><h3 style={styles.assessmentSummaryTitle}>{item.title}</h3><p style={styles.assessmentSummaryMeta}>{item.type}</p></div></div><ProgressBar value={completedPercent} color="#0f766e" /><div style={styles.assessmentSummaryStats}><Pill color="#027a48" bg="#ecfdf3">✓ {item.completed}</Pill><Pill color="#175cd3" bg="#eff8ff">↗ {item.ready}</Pill><Pill color="#c2410c" bg="#fff7ed">● {item.blocked}</Pill></div><p style={styles.lastActive}>{completedPercent}% completed across {item.total} assignment(s)</p></article>; })}{assessmentSummary.length === 0 ? <div style={styles.emptyState}>No assessment assignments found.</div> : null}</div></section>; }
  function renderBulkResetTab() { return <section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Controlled Reset Workflow</p><h2 style={styles.sectionTitle}>Bulk Reset by Assessment</h2><p style={styles.sectionSubtitle}>Recommended sequence: select assessment → load candidates → dry run → reset selected.</p></div><Pill color="#c2410c" bg="#fff7ed">Assessment-specific reset</Pill></div><div style={styles.stepGrid}><div style={styles.stepCard}><strong>1</strong><span>Select one assessment</span></div><div style={styles.stepCard}><strong>2</strong><span>Load matching candidates</span></div><div style={styles.stepCard}><strong>3</strong><span>Run Dry Run first</span></div><div style={styles.stepCard}><strong>4</strong><span>Bulk Reset Selected</span></div></div><div style={styles.bulkGrid}><select value={resetAssessmentId} onChange={(e) => { setResetAssessmentId(e.target.value); setResetCandidates([]); setSelectedMap({}); }} style={styles.selectInput}><option value="">Select assessment...</option>{assessmentOptions.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</select><select value={resetMode} onChange={(e) => { setResetMode(e.target.value); setResetCandidates([]); setSelectedMap({}); }} style={styles.selectInput}><option value="all">All assigned candidates</option><option value="completed">Completed candidates</option><option value="incomplete">Started but incomplete</option><option value="ready">Ready/unstarted candidates</option></select><button type="button" style={styles.loadButton} onClick={loadAssessmentResetCandidates} disabled={action.loadLoading || !resetAssessmentId}>{action.loadLoading ? "Loading..." : "Load Candidates"}</button></div>{resetCandidates.length > 0 ? <div style={styles.resetCandidatePanel}><div style={styles.resetCandidateHeader}><strong>{resetCandidates.length} candidate(s) loaded</strong><span>{selectedCount} selected</span><button type="button" style={styles.lightButton} onClick={selectAllLoadedCandidates}>Select All</button><button type="button" style={styles.lightButton} onClick={clearSelectedCandidates}>Clear</button><button type="button" style={styles.dryRunButton} onClick={() => runAssessmentBulkReset(true)} disabled={action.dryRunLoading || action.loading || selectedCount === 0}>{action.dryRunLoading ? "Checking..." : "Dry Run"}</button><button type="button" style={styles.dangerButton} onClick={() => runAssessmentBulkReset(false)} disabled={action.dryRunLoading || action.loading || selectedCount === 0}>{action.loading ? "Resetting..." : "Bulk Reset Selected"}</button></div><div style={styles.resetCandidateList}>{resetCandidates.map((candidate) => { const selected = selectedMap[candidate.userId] === true; return <label key={candidate.userId} style={selected ? styles.resetCandidateSelected : styles.resetCandidateRow}><input type="checkbox" checked={selected} onChange={() => toggleCandidateSelection(candidate.userId)} /><div style={styles.resetCandidateInfo}><strong>{candidate.fullName}</strong><span>{candidate.email}</span></div><Pill color="#175cd3" bg="#eff8ff">{candidate.resetCategory}</Pill><span style={styles.resetMeta}>Responses: {candidate.responseCount}</span><span style={styles.resetMeta}>Sessions: {candidate.sessionCount}</span></label>; })}</div></div> : null}{action.error ? <div style={styles.bulkError}>{action.error}</div> : null}{action.message ? <div style={styles.bulkSuccess}>{action.message}</div> : null}{action.result ? <div style={styles.bulkSummary}><strong>Summary:</strong> {safeNumber(action.result.successful, 0)} successful, {safeNumber(action.result.failed, 0)} failed, {safeNumber(action.result.totalDeduped || action.result.count, 0)} total.</div> : null}</section>; }
  function renderReportsTab() {
    return <section style={styles.workspaceCard}><div style={styles.sectionHeaderRow}><div><p style={styles.sectionEyebrow}>Reports</p><h2 style={styles.sectionTitle}>Candidate Reports</h2><p style={styles.sectionSubtitle}>A candidate can have multiple reports from different assessments. Select the candidate group, then open the exact assessment report.</p></div><Pill color="#027a48" bg="#ecfdf3">{completedReports.length} report(s)</Pill></div><div style={styles.reportGroupList}>{reportCandidateGroups.map((group) => { const candidate = group.candidate; const reports = group.reports; const latestReport = reports[0]; const latestClassification = latestReport ? latestReport.classification : getClassification(0); return <article key={candidate.id} style={styles.reportGroupCard}><div style={styles.reportGroupHeader}><div style={styles.reportIdentity}><div style={styles.avatarSmall}>{getInitials(candidate.full_name || candidate.email)}</div><div><h3 style={styles.reportCandidateName}>{candidate.full_name}</h3><p style={styles.reportMeta}>{candidate.email}</p><p style={styles.reportMeta}>{reports.length} completed assessment report{reports.length === 1 ? "" : "s"}</p></div></div><div style={styles.reportGroupSummary}><Pill color="#175cd3" bg="#eff8ff">{reports.length} report{reports.length === 1 ? "" : "s"}</Pill>{latestReport ? <Pill color={latestClassification.color} bg={latestClassification.bg}>Latest: {latestReport.percentage}%</Pill> : null}</div></div><div style={styles.reportAssessmentList}>{reports.map((row) => <div key={row.candidate.id + row.assessment.assessment_id + row.completedAt} style={styles.reportAssessmentRow}><div style={styles.reportAssessmentInfo}><div style={{ ...styles.reportAssessmentIcon, background: "linear-gradient(135deg, " + row.assessment.type_gradient_start + " 0%, " + row.assessment.type_gradient_end + " 100%)" }}>{row.assessment.type_icon}</div><div><strong>{row.assessment.assessment_title}</strong><span>{row.assessment.assessment_type_name}</span><span>Completed: {formatDate(row.completedAt)}</span></div></div><div style={styles.reportScoreBlock}><strong style={{ color: row.classification.color }}>{row.percentage}%</strong><Pill color={row.classification.color} bg={row.classification.bg}>{row.classification.label}</Pill></div><Link href={`/supervisor/${row.candidate.id}?assessment=${row.assessment.assessment_id}`} style={styles.reportButton}>Open Report</Link></div>)}</div></article>; })}{reportCandidateGroups.length === 0 ? <div style={styles.emptyState}>No completed reports found.</div> : null}</div></section>;
  }
  function renderActiveTab() { if (activeTab === "candidates") return renderCandidatesTab(); if (activeTab === "assessments") return renderAssessmentsTab(); if (activeTab === "bulk-reset") return renderBulkResetTab(); if (activeTab === "reports") return renderReportsTab(); return renderOverviewTab(); }

  if (!currentSupervisor) return <AppLayout background="/images/supervisor-bg.jpg"><div style={styles.centerLoader}><div style={styles.spinner} /></div><style jsx>{spinStyles}</style></AppLayout>;
  return <AppLayout background="/images/supervisor-bg.jpg"><div style={styles.pageShell}><div style={styles.heroCard}><div><div style={styles.heroBadge}>Supervisor Workspace</div><h1 style={styles.heroTitle}>Supervisor Dashboard</h1><p style={styles.heroSubtitle}>{currentSupervisor.role === "admin" ? "Admin view across all candidates and assessments" : "Assigned candidates and assessment progress"}</p><p style={styles.heroMeta}>Welcome, {safeText(currentSupervisor.name, currentSupervisor.email)}</p></div><div style={styles.heroActions}><button type="button" style={styles.refreshButton} onClick={() => router.reload()}>Refresh</button><button type="button" style={styles.logoutButton} onClick={handleLogout}>Sign Out</button></div></div><div style={styles.tabShell}><TabButton active={activeTab === "overview"} icon="🏠" label="Overview" onClick={() => setActiveTab("overview")} /><TabButton active={activeTab === "candidates"} icon="👥" label="Candidates" count={candidates.length} onClick={() => setActiveTab("candidates")} /><TabButton active={activeTab === "assessments"} icon="📋" label="Assessments" count={assessmentSummary.length} onClick={() => setActiveTab("assessments")} /><TabButton active={activeTab === "bulk-reset"} icon="♻️" label="Bulk Reset" onClick={() => setActiveTab("bulk-reset")} /><TabButton active={activeTab === "reports"} icon="📊" label="Reports" count={completedReports.length} onClick={() => setActiveTab("reports")} /></div>{errorMessage && activeTab !== "candidates" ? <div style={styles.errorBox}>{errorMessage}</div> : null}{renderActiveTab()}</div><style jsx>{spinStyles}</style></AppLayout>;
}

var spinStyles = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;

var styles = {
  pageShell: { maxWidth: "1420px", margin: "0 auto", padding: "30px 20px 48px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
  centerLoader: { minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(15,23,42,0.15)", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" },
  heroCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", padding: "30px", borderRadius: "28px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)", color: "#ffffff", marginBottom: "18px", boxShadow: "0 24px 80px rgba(15,23,42,0.22)" },
  heroBadge: { display: "inline-flex", padding: "7px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" },
  heroTitle: { margin: 0, color: "#ffffff", fontSize: "42px", lineHeight: 1.08 },
  heroSubtitle: { margin: "12px 0 0", color: "rgba(255,255,255,0.86)", fontSize: "16px" },
  heroMeta: { margin: "8px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "13px" },
  heroActions: { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" },
  refreshButton: { border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.12)", color: "#ffffff", padding: "11px 16px", borderRadius: "14px", cursor: "pointer", fontWeight: 900 },
  logoutButton: { border: 0, background: "#ef4444", color: "#ffffff", padding: "11px 18px", borderRadius: "14px", cursor: "pointer", fontWeight: 900 },
  tabShell: { display: "flex", gap: "10px", overflowX: "auto", padding: "10px", borderRadius: "24px", background: "rgba(255,255,255,0.94)", border: "1px solid #eaecf0", boxShadow: "0 16px 42px rgba(16,24,40,0.08)", marginBottom: "18px" },
  tabButton: { border: 0, borderRadius: "16px", padding: "12px 14px", background: "transparent", color: "#475467", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" },
  tabActive: { border: 0, borderRadius: "16px", padding: "12px 14px", background: "#101828", color: "#ffffff", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", boxShadow: "0 12px 26px rgba(16,24,40,0.2)" },
  tabCount: { minWidth: "24px", height: "22px", padding: "0 7px", borderRadius: "999px", background: "#eef4ff", color: "#3538cd", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  tabCountActive: { minWidth: "24px", height: "22px", padding: "0 7px", borderRadius: "999px", background: "rgba(255,255,255,0.18)", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" },
  tabStack: { display: "grid", gap: "18px" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px" },
  statCard: { display: "flex", gap: "13px", alignItems: "center", background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "22px", padding: "18px", boxShadow: "0 16px 42px rgba(16,24,40,0.08)" },
  statIcon: { width: "46px", height: "46px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 900 },
  statLabel: { margin: 0, color: "#667085", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" },
  statValue: { margin: "3px 0 0", color: "#101828", fontSize: "26px", fontWeight: 900 },
  statNote: { margin: "2px 0 0", color: "#667085", fontSize: "12px" },
  overviewGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "18px" },
  workspaceCard: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "26px", padding: "22px", boxShadow: "0 20px 56px rgba(16,24,40,0.09)", marginBottom: "18px" },
  sectionHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" },
  sectionEyebrow: { margin: "0 0 4px", color: "#667085", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" },
  sectionTitle: { margin: 0, color: "#101828", fontSize: "24px" },
  sectionSubtitle: { margin: "5px 0 0", color: "#667085", fontSize: "13px" },
  bodyText: { color: "#475467", fontSize: "14px", lineHeight: 1.6, margin: "12px 0 0" },
  quickActionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" },
  quickActionCard: { textAlign: "left", border: "1px solid #eaecf0", background: "#ffffff", borderRadius: "20px", padding: "18px", cursor: "pointer", display: "grid", gap: "8px", color: "#344054", boxShadow: "0 10px 26px rgba(16,24,40,0.05)" },
  quickActionIcon: { width: "40px", height: "40px", borderRadius: "14px", background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  compactList: { display: "grid", gap: "10px" },
  compactRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", border: "1px solid #eaecf0", borderRadius: "16px", padding: "12px", background: "#ffffff" },
  emptyInline: { padding: "18px", border: "1px dashed #cbd5e1", borderRadius: "16px", color: "#667085", textAlign: "center" },
  textButton: { border: 0, background: "#eef4ff", color: "#175cd3", borderRadius: "12px", padding: "10px 12px", cursor: "pointer", fontWeight: 900 },
  filterBar: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 220px", gap: "12px", marginBottom: "18px" },
  searchInput: { width: "100%", boxSizing: "border-box", padding: "13px 14px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  filterSelect: { width: "100%", boxSizing: "border-box", padding: "13px 12px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  candidateList: { display: "grid", gap: "14px" },
  candidateCard: { border: "1px solid #eaecf0", borderRadius: "22px", background: "#ffffff", overflow: "hidden", boxShadow: "0 10px 28px rgba(16,24,40,0.05)" },
  candidateMainRow: { display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(230px, 0.8fr) minmax(250px, 1fr) 170px", gap: "16px", alignItems: "center", padding: "18px" },
  candidateIdentity: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
  avatar: { width: "48px", height: "48px", borderRadius: "18px", background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "0 0 auto" },
  avatarSmall: { width: "42px", height: "42px", borderRadius: "16px", background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "0 0 auto" },
  candidateName: { margin: 0, color: "#101828", fontSize: "16px", overflowWrap: "anywhere" },
  candidateEmail: { margin: "4px 0 0", color: "#475467", fontSize: "13px", overflowWrap: "anywhere" },
  candidateId: { margin: "4px 0 0", color: "#98a2b3", fontSize: "11px" },
  scoreBlock: { minWidth: 0 },
  scoreTopLine: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" },
  scoreValue: { color: "#101828", fontSize: "24px", fontWeight: 900 },
  progressTrack: { width: "100%", height: "9px", borderRadius: "999px", background: "#e4e7ec", overflow: "hidden" },
  lastActive: { margin: "7px 0 0", color: "#667085", fontSize: "12px" },
  summaryPills: { display: "flex", gap: "7px", flexWrap: "wrap" },
  pill: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "999px", border: "1px solid transparent", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  rowActions: { display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" },
  primaryButton: { border: 0, padding: "10px 12px", borderRadius: "12px", background: "#101828", color: "#ffffff", fontSize: "13px", fontWeight: 900, cursor: "pointer" },
  assessmentPanel: { borderTop: "1px solid #eaecf0", background: "#f8fafc", padding: "18px" },
  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" },
  assessmentCard: { background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "18px", padding: "16px", boxShadow: "0 8px 22px rgba(16,24,40,0.04)" },
  assessmentTop: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
  assessmentIcon: { width: "42px", height: "42px", borderRadius: "14px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 900 },
  assessmentTitle: { margin: 0, color: "#101828", fontSize: "15px", overflowWrap: "anywhere" },
  assessmentType: { margin: "4px 0 0", color: "#667085", fontSize: "12px" },
  assessmentPills: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" },
  reportLink: { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", width: "100%", marginTop: "12px", padding: "11px 12px", borderRadius: "12px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", fontSize: "13px", fontWeight: 900 },
  waitingText: { color: "#667085", fontSize: "13px", lineHeight: 1.5 },
  assessmentSummaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" },
  assessmentSummaryCard: { border: "1px solid #eaecf0", borderRadius: "20px", padding: "18px", background: "#ffffff", boxShadow: "0 10px 28px rgba(16,24,40,0.05)", display: "grid", gap: "12px" },
  assessmentSummaryTop: { display: "flex", alignItems: "center", gap: "12px" },
  assessmentSummaryIcon: { width: "42px", height: "42px", borderRadius: "14px", background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  assessmentSummaryTitle: { margin: 0, color: "#101828", fontSize: "16px" },
  assessmentSummaryMeta: { margin: "4px 0 0", color: "#667085", fontSize: "12px" },
  assessmentSummaryStats: { display: "flex", gap: "7px", flexWrap: "wrap" },
  stepGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px", marginBottom: "14px" },
  stepCard: { display: "flex", alignItems: "center", gap: "10px", border: "1px solid #eaecf0", background: "#ffffff", borderRadius: "16px", padding: "12px", color: "#344054", fontSize: "13px" },
  bulkGrid: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 220px 150px", gap: "12px", alignItems: "center" },
  selectInput: { width: "100%", boxSizing: "border-box", padding: "13px 12px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  loadButton: { border: 0, background: "#101828", color: "#ffffff", padding: "13px 14px", borderRadius: "14px", cursor: "pointer", fontWeight: 900 },
  lightButton: { border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  dryRunButton: { border: 0, background: "#1d4ed8", color: "#ffffff", padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  dangerButton: { border: 0, background: "#b42318", color: "#ffffff", padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  resetCandidatePanel: { border: "1px solid #eaecf0", borderRadius: "18px", background: "#ffffff", padding: "14px", marginTop: "14px" },
  resetCandidateHeader: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "space-between", marginBottom: "12px", color: "#344054", fontSize: "13px" },
  resetCandidateList: { display: "grid", gap: "8px", maxHeight: "380px", overflowY: "auto" },
  resetCandidateRow: { display: "grid", gridTemplateColumns: "24px minmax(220px, 1fr) auto auto auto", gap: "10px", alignItems: "center", padding: "11px", border: "1px solid #eaecf0", borderRadius: "14px", cursor: "pointer", background: "#ffffff" },
  resetCandidateSelected: { display: "grid", gridTemplateColumns: "24px minmax(220px, 1fr) auto auto auto", gap: "10px", alignItems: "center", padding: "11px", border: "2px solid #f04438", borderRadius: "14px", cursor: "pointer", background: "#fef3f2" },
  resetCandidateInfo: { display: "grid", gap: "2px", color: "#101828" },
  resetMeta: { color: "#667085", fontSize: "12px", whiteSpace: "nowrap" },
  bulkError: { padding: "12px", borderRadius: "14px", background: "#fef3f2", color: "#b42318", fontSize: "13px", fontWeight: 800, marginTop: "12px" },
  bulkSuccess: { padding: "12px", borderRadius: "14px", background: "#ecfdf3", color: "#027a48", fontSize: "13px", fontWeight: 800, marginTop: "12px" },
  bulkSummary: { padding: "12px", borderRadius: "14px", background: "#eff6ff", color: "#175cd3", fontSize: "13px", marginTop: "12px" },
  reportGroupList: { display: "grid", gap: "14px" },
  reportGroupCard: { border: "1px solid #eaecf0", borderRadius: "22px", padding: "16px", background: "#ffffff", boxShadow: "0 10px 28px rgba(16,24,40,0.05)" },
  reportGroupHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid #eaecf0" },
  reportGroupSummary: { display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" },
  reportAssessmentList: { display: "grid", gap: "10px" },
  reportAssessmentRow: { display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 220px 140px", gap: "14px", alignItems: "center", border: "1px solid #eaecf0", borderRadius: "16px", padding: "12px", background: "#f8fafc" },
  reportAssessmentInfo: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
  reportAssessmentIcon: { width: "40px", height: "40px", borderRadius: "14px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 900, flex: "0 0 auto" },
  reportIdentity: { display: "flex", alignItems: "center", gap: "12px" },
  reportCandidateName: { margin: 0, color: "#101828", fontSize: "15px" },
  reportMeta: { margin: "4px 0 0", color: "#667085", fontSize: "12px" },
  reportScoreBlock: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  reportButton: { textDecoration: "none", textAlign: "center", border: 0, padding: "11px 12px", borderRadius: "12px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", fontSize: "13px", fontWeight: 900 },
  errorBox: { marginBottom: "16px", padding: "14px 16px", borderRadius: "16px", border: "1px solid #fecaca", background: "#fff5f5", color: "#b42318", fontSize: "14px" },
  loadingBlock: { minHeight: "260px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "12px" },
  loadingText: { margin: 0, color: "#667085", fontSize: "14px" },
  emptyState: { padding: "38px 20px", border: "1px dashed #cbd5e1", borderRadius: "22px", background: "#ffffff", textAlign: "center", color: "#667085" }
};
