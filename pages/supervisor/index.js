// pages/supervisor/index.js

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback || "";
  return String(value);
}

function safeNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallbackValue;
  return numberValue;
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (error) {
    return "N/A";
  }
}

function calculatePercentage(score, maxScore, fallbackPercentage) {
  var scoreValue = safeNumber(score, null);
  var maxValue = safeNumber(maxScore, null);
  var fallbackValue = safeNumber(fallbackPercentage, null);
  if (scoreValue !== null && maxValue !== null && maxValue > 0) return Math.round((scoreValue / maxValue) * 100);
  if (fallbackValue !== null && fallbackValue !== undefined && Number.isFinite(Number(fallbackValue))) return Math.round(Number(fallbackValue));
  return 0;
}

function getClassification(percentage) {
  var value = safeNumber(percentage, 0);
  if (value >= 85) return { label: "Exceptional", color: "#0f766e", bg: "#ecfdf3" };
  if (value >= 75) return { label: "Strong", color: "#2563eb", bg: "#eff6ff" };
  if (value >= 65) return { label: "Capable", color: "#4f46e5", bg: "#eef2ff" };
  if (value >= 55) return { label: "Developing", color: "#d97706", bg: "#fffaeb" };
  if (value > 0) return { label: "At Risk", color: "#b42318", bg: "#fef3f2" };
  return { label: "No Data", color: "#667085", bg: "#f2f4f7" };
}

function getInitials(value) {
  var text = safeText(value, "C").trim();
  var parts = text.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return text ? text.charAt(0).toUpperCase() : "C";
}

function getStatusBadge(status, hasResult) {
  if (hasResult || status === "completed") return { label: "Completed", icon: "✓", color: "#027a48", bg: "#ecfdf3" };
  if (status === "unblocked") return { label: "Ready", icon: "↗", color: "#175cd3", bg: "#eff8ff" };
  if (status === "blocked") return { label: "Blocked", icon: "●", color: "#c2410c", bg: "#fff7ed" };
  return { label: safeText(status, "Scheduled"), icon: "•", color: "#475467", bg: "#f2f4f7" };
}

function displayTypeName(type) {
  if (!type || type === "general") return "General";
  return String(type).replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

function getBestCompletedAssessment(candidate) {
  var completed = safeArray(candidate.assessments).filter(function (item) { return item.result !== null && item.result !== undefined; });
  completed.sort(function (a, b) {
    var aDate = a.result && a.result.completed_at ? new Date(a.result.completed_at).getTime() : 0;
    var bDate = b.result && b.result.completed_at ? new Date(b.result.completed_at).getTime() : 0;
    return bDate - aDate;
  });
  return completed.length > 0 ? completed[0] : null;
}

function Pill(props) {
  return <span style={{ ...styles.pill, color: props.color, background: props.bg }}>{props.children}</span>;
}

function ProgressBar(props) {
  var value = safeNumber(props.value, 0);
  if (value < 0) value = 0;
  if (value > 100) value = 100;
  return <div style={styles.progressTrack}><div style={{ width: value + "%", height: "100%", borderRadius: "999px", background: props.color || "#0f766e" }} /></div>;
}

export default function SupervisorDashboard() {
  var router = useRouter();

  var currentSupervisorState = useState(null);
  var currentSupervisor = currentSupervisorState[0];
  var setCurrentSupervisor = currentSupervisorState[1];

  var candidatesState = useState([]);
  var candidates = candidatesState[0];
  var setCandidates = candidatesState[1];

  var filteredState = useState([]);
  var filteredCandidates = filteredState[0];
  var setFilteredCandidates = filteredState[1];

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var errorState = useState("");
  var errorMessage = errorState[0];
  var setErrorMessage = errorState[1];

  var searchState = useState("");
  var searchTerm = searchState[0];
  var setSearchTerm = searchState[1];

  var expandedState = useState(null);
  var expandedCandidate = expandedState[0];
  var setExpandedCandidate = expandedState[1];

  var assessmentOptionsState = useState([]);
  var assessmentOptions = assessmentOptionsState[0];
  var setAssessmentOptions = assessmentOptionsState[1];

  var resetAssessmentState = useState("");
  var resetAssessmentId = resetAssessmentState[0];
  var setResetAssessmentId = resetAssessmentState[1];

  var resetModeState = useState("all");
  var resetMode = resetModeState[0];
  var setResetMode = resetModeState[1];

  var resetCandidateState = useState([]);
  var resetCandidates = resetCandidateState[0];
  var setResetCandidates = resetCandidateState[1];

  var selectedState = useState({});
  var selectedMap = selectedState[0];
  var setSelectedMap = selectedState[1];

  var actionState = useState({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "", result: null });
  var action = actionState[0];
  var setAction = actionState[1];

  var selectedCount = Object.keys(selectedMap).filter(function (key) { return selectedMap[key] === true; }).length;

  useEffect(function () {
    async function checkAuth() {
      var authResult;
      var supabaseSession;
      var userRole;
      var stored;
      var session;
      try {
        authResult = await supabase.auth.getSession();
        supabaseSession = authResult && authResult.data ? authResult.data.session : null;
        if (supabaseSession) {
          userRole = supabaseSession.user && supabaseSession.user.user_metadata ? supabaseSession.user.user_metadata.role : null;
          if (userRole === "supervisor" || userRole === "admin") {
            setCurrentSupervisor({ id: supabaseSession.user.id, email: supabaseSession.user.email, name: (supabaseSession.user.user_metadata && supabaseSession.user.user_metadata.full_name) || supabaseSession.user.email, role: userRole });
            return;
          }
        }
        if (typeof window === "undefined") return;
        stored = localStorage.getItem("userSession");
        if (!stored) {
          router.push("/login");
          return;
        }
        session = JSON.parse(stored);
        if (session.loggedIn && (session.role === "supervisor" || session.role === "admin")) setCurrentSupervisor({ id: session.user_id, email: session.email, name: session.full_name || session.email, role: session.role });
        else router.push("/login");
      } catch (error) {
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(function () {
    if (!currentSupervisor) return;
    var cancelled = false;

    async function fetchData() {
      var isAdmin;
      var candidatesQuery;
      var candidatesResponse;
      var candidatesData;
      var processedCandidates;
      var assessmentOptionMap = {};

      try {
        setLoading(true);
        setErrorMessage("");
        isAdmin = currentSupervisor.role === "admin";

        candidatesQuery = supabase.from("candidate_profiles").select("id, full_name, email, phone, created_at, supervisor_id");
        if (!isAdmin) candidatesQuery = candidatesQuery.eq("supervisor_id", currentSupervisor.id);
        candidatesResponse = await candidatesQuery.order("created_at", { ascending: false });
        if (candidatesResponse.error) throw candidatesResponse.error;
        candidatesData = safeArray(candidatesResponse.data);

        processedCandidates = await Promise.all(candidatesData.map(async function (candidate) {
          var resultsResponse;
          var accessResponse;
          var resultsMap = {};
          var accessData;
          var assessmentIds;
          var assessmentsResponse;
          var assessmentMap = {};
          var assessmentsWithDetails;
          var completedList;
          var readyList;
          var blockedList;
          var latestAssessment;

          resultsResponse = await supabase
            .from("assessment_results")
            .select("id, assessment_id, total_score, max_score, percentage_score, completed_at")
            .eq("user_id", candidate.id);

          safeArray(resultsResponse.data).forEach(function (result) {
            resultsMap[result.assessment_id] = { id: result.id, score: result.total_score, max_score: result.max_score, percentage: result.percentage_score, completed_at: result.completed_at };
          });

          accessResponse = await supabase
            .from("candidate_assessments")
            .select("id, assessment_id, status, created_at, unblocked_at, result_id")
            .eq("user_id", candidate.id);

          accessData = safeArray(accessResponse.data);
          assessmentIds = Array.from(new Set(accessData.map(function (item) { return item.assessment_id; }).filter(Boolean)));

          if (assessmentIds.length > 0) {
            assessmentsResponse = await supabase
              .from("assessments")
              .select("id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end)")
              .in("id", assessmentIds);

            safeArray(assessmentsResponse.data).forEach(function (assessment) {
              assessmentMap[assessment.id] = assessment;
              assessmentOptionMap[assessment.id] = assessment.title || "Unknown Assessment";
            });
          }

          assessmentsWithDetails = accessData.map(function (access) {
            var result = resultsMap[access.assessment_id] || null;
            var assessment = assessmentMap[access.assessment_id] || {};
            var type = assessment.assessment_types || {};
            var displayStatus = access.status;
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
              result: result
            };
          });

          completedList = assessmentsWithDetails.filter(function (item) { return item.status === "completed" || item.result !== null; });
          readyList = assessmentsWithDetails.filter(function (item) { return item.status === "unblocked" && !item.result; });
          blockedList = assessmentsWithDetails.filter(function (item) { return item.status === "blocked" && !item.result; });
          latestAssessment = getBestCompletedAssessment({ assessments: assessmentsWithDetails });

          return { id: candidate.id, full_name: candidate.full_name || "Unnamed Candidate", email: candidate.email || "No email provided", phone: candidate.phone || "", created_at: candidate.created_at, totalAssessments: assessmentsWithDetails.length, completedAssessments: completedList.length, readyAssessments: readyList.length, blockedAssessments: blockedList.length, latestAssessment: latestAssessment, assessments: assessmentsWithDetails };
        }));

        if (cancelled) return;
        setCandidates(processedCandidates);
        setFilteredCandidates(processedCandidates);
        setAssessmentOptions(Object.keys(assessmentOptionMap).sort(function (a, b) { return assessmentOptionMap[a].localeCompare(assessmentOptionMap[b]); }).map(function (id) { return { id: id, title: assessmentOptionMap[id] }; }));
      } catch (error) {
        if (!cancelled) setErrorMessage(error && error.message ? error.message : "Unable to load supervisor dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return function () { cancelled = true; };
  }, [currentSupervisor]);

  useEffect(function () {
    var filtered = candidates.slice();
    if (searchTerm.trim()) {
      var term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(function (candidate) {
        return safeText(candidate.full_name, "").toLowerCase().indexOf(term) >= 0 || safeText(candidate.email, "").toLowerCase().indexOf(term) >= 0 || safeText(candidate.id, "").toLowerCase().indexOf(term) >= 0;
      });
    }
    setFilteredCandidates(filtered);
  }, [candidates, searchTerm]);

  async function loadAssessmentResetCandidates() {
    var response;
    var data;
    if (!resetAssessmentId) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select an assessment first.", result: null });
      return;
    }
    setAction({ loading: false, dryRunLoading: false, loadLoading: true, message: "", error: "", result: null });
    setResetCandidates([]);
    setSelectedMap({});
    try {
      response = await fetch("/api/supervisor/assessment-reset-candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId: resetAssessmentId, mode: resetMode }) });
      data = await response.json();
      if (!response.ok || !data || data.success !== true) {
        setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: data && data.message ? data.message : "Unable to load reset candidates.", result: data });
        return;
      }
      setResetCandidates(safeArray(data.candidates));
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: data.count + " candidate(s) loaded for selected assessment.", error: "", result: data });
    } catch (error) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: error && error.message ? error.message : "Unable to load reset candidates.", result: null });
    }
  }

  function toggleCandidateSelection(userId) {
    var next = {};
    Object.keys(selectedMap).forEach(function (key) { next[key] = selectedMap[key]; });
    next[userId] = !next[userId];
    setSelectedMap(next);
  }

  function selectAllLoadedCandidates() {
    var next = {};
    resetCandidates.forEach(function (candidate) { next[candidate.userId] = true; });
    setSelectedMap(next);
  }

  function clearSelectedCandidates() {
    setSelectedMap({});
  }

  function buildBulkItems() {
    return Object.keys(selectedMap).filter(function (userId) { return selectedMap[userId] === true; }).map(function (userId) { return { userId: userId, assessmentId: resetAssessmentId }; });
  }

  async function runAssessmentBulkReset(dryRun) {
    var items;
    var response;
    var data;
    var promptText;
    if (!resetAssessmentId) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select an assessment first.", result: null });
      return;
    }
    items = buildBulkItems();
    if (items.length === 0) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: "Select at least one candidate to reset.", result: null });
      return;
    }
    if (!dryRun && typeof window !== "undefined") {
      promptText = "You are about to reset " + items.length + " candidate(s) for ONLY the selected assessment. Other assessments will not be touched. Type RESET to continue.";
      if (window.prompt(promptText) !== "RESET") return;
    }
    setAction({ loading: !dryRun, dryRunLoading: dryRun, loadLoading: false, message: "", error: "", result: null });
    try {
      response = await fetch("/api/supervisor/bulk-reset-assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dryRun: dryRun === true, confirmBulkReset: dryRun === true ? false : true, items: items }) });
      data = await response.json();
      if (!response.ok) {
        setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: data && data.message ? data.message : data && data.error ? data.error : "Bulk reset request failed.", result: data });
        return;
      }
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: dryRun ? "Dry run completed. Review summary before actual reset." : "Bulk reset completed. Refreshing dashboard...", error: "", result: data });
      if (!dryRun) {
        setSelectedMap({});
        setTimeout(function () { router.reload(); }, 1200);
      }
    } catch (error) {
      setAction({ loading: false, dryRunLoading: false, loadLoading: false, message: "", error: error && error.message ? error.message : "Bulk reset failed.", result: null });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("userSession");
    router.push("/login");
  }

  if (!currentSupervisor) {
    return <AppLayout background="/images/supervisor-bg.jpg"><div style={styles.centerLoader}><div style={styles.spinner} /></div><style jsx>{spinStyles}</style></AppLayout>;
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.pageShell}>
        <div style={styles.heroCard}>
          <div>
            <div style={styles.heroBadge}>Supervisor Workspace</div>
            <h1 style={styles.heroTitle}>Supervisor Dashboard</h1>
            <p style={styles.heroSubtitle}>{currentSupervisor.role === "admin" ? "Admin view across all candidates and assessments" : "Assigned candidates and assessment progress"}</p>
            <p style={styles.heroMeta}>Welcome, {safeText(currentSupervisor.name, currentSupervisor.email)}</p>
          </div>
          <div style={styles.heroActions}>
            <button type="button" style={styles.refreshButton} onClick={function () { router.reload(); }}>Refresh</button>
            <button type="button" style={styles.logoutButton} onClick={handleLogout}>Sign Out</button>
          </div>
        </div>

        <div style={styles.bulkCard}>
          <h2 style={styles.bulkTitle}>Bulk Reset by Assessment</h2>
          <p style={styles.bulkText}>Select one assessment, load candidates, choose the candidates to reset, run Dry Run, then Bulk Reset Selected. Only the selected assessment will be reset.</p>
          <div style={styles.bulkGrid}>
            <select value={resetAssessmentId} onChange={function (event) { setResetAssessmentId(event.target.value); setResetCandidates([]); setSelectedMap({}); }} style={styles.selectInput}>
              <option value="">Select assessment...</option>
              {assessmentOptions.map(function (assessment) { return <option key={assessment.id} value={assessment.id}>{assessment.title}</option>; })}
            </select>
            <select value={resetMode} onChange={function (event) { setResetMode(event.target.value); setResetCandidates([]); setSelectedMap({}); }} style={styles.selectInput}>
              <option value="all">All assigned candidates</option>
              <option value="completed">Completed candidates</option>
              <option value="incomplete">Started but incomplete</option>
              <option value="ready">Ready/unstarted candidates</option>
            </select>
            <button type="button" style={styles.loadButton} onClick={loadAssessmentResetCandidates} disabled={action.loadLoading || !resetAssessmentId}>{action.loadLoading ? "Loading..." : "Load Candidates"}</button>
          </div>

          {resetCandidates.length > 0 && (
            <div style={styles.resetCandidatePanel}>
              <div style={styles.resetCandidateHeader}>
                <strong>{resetCandidates.length} candidate(s) loaded</strong>
                <span>{selectedCount} selected</span>
                <button type="button" style={styles.lightButton} onClick={selectAllLoadedCandidates}>Select All</button>
                <button type="button" style={styles.lightButton} onClick={clearSelectedCandidates}>Clear</button>
                <button type="button" style={styles.dryRunButton} onClick={function () { runAssessmentBulkReset(true); }} disabled={action.dryRunLoading || action.loading || selectedCount === 0}>{action.dryRunLoading ? "Checking..." : "Dry Run"}</button>
                <button type="button" style={styles.dangerButton} onClick={function () { runAssessmentBulkReset(false); }} disabled={action.dryRunLoading || action.loading || selectedCount === 0}>{action.loading ? "Resetting..." : "Bulk Reset Selected"}</button>
              </div>
              <div style={styles.resetCandidateList}>
                {resetCandidates.map(function (candidate) {
                  var selected = selectedMap[candidate.userId] === true;
                  return (
                    <label key={candidate.userId} style={selected ? styles.resetCandidateSelected : styles.resetCandidateRow}>
                      <input type="checkbox" checked={selected} onChange={function () { toggleCandidateSelection(candidate.userId); }} />
                      <div style={styles.resetCandidateInfo}>
                        <strong>{candidate.fullName}</strong>
                        <span>{candidate.email}</span>
                      </div>
                      <Pill color="#175cd3" bg="#eff8ff">{candidate.resetCategory}</Pill>
                      <span style={styles.resetMeta}>Responses: {candidate.responseCount}</span>
                      <span style={styles.resetMeta}>Sessions: {candidate.sessionCount}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {action.error && <div style={styles.bulkError}>{action.error}</div>}
          {action.message && <div style={styles.bulkSuccess}>{action.message}</div>}
          {action.result && <div style={styles.bulkSummary}><strong>Summary:</strong> {safeNumber(action.result.successful, 0)} successful, {safeNumber(action.result.failed, 0)} failed, {safeNumber(action.result.totalDeduped || action.result.count, 0)} total.</div>}
        </div>

        <div style={styles.filterCard}>
          <input value={searchTerm} onChange={function (event) { setSearchTerm(event.target.value); }} placeholder="Search by name, email, or candidate ID..." style={styles.searchInput} />
        </div>

        <div style={styles.contentCard}>
          <div style={styles.contentHeader}>
            <div>
              <h2 style={styles.contentTitle}>Assigned Candidates</h2>
              <p style={styles.contentSubtitle}>{filteredCandidates.length} of {candidates.length} candidate(s) shown</p>
            </div>
            <Pill color="#175cd3" bg="#eff8ff">Assessment-specific reset enabled</Pill>
          </div>

          {errorMessage && <div style={styles.errorBox}>{errorMessage}</div>}
          {loading ? <div style={styles.loadingBlock}><div style={styles.spinner} /><p style={styles.loadingText}>Loading candidates and assessments...</p></div> : null}

          {!loading && filteredCandidates.length === 0 ? <div style={styles.emptyState}>No candidates found.</div> : null}

          {!loading && filteredCandidates.length > 0 && (
            <div style={styles.candidateList}>
              {filteredCandidates.map(function (candidate) {
                var latestAssessment = candidate.latestAssessment;
                var latestPercentage = latestAssessment && latestAssessment.result ? calculatePercentage(latestAssessment.result.score, latestAssessment.result.max_score, latestAssessment.result.percentage) : 0;
                var classification = getClassification(latestPercentage);
                var isExpanded = expandedCandidate === candidate.id;
                return (
                  <div key={candidate.id} style={styles.candidateCard}>
                    <div style={styles.candidateMainRow}>
                      <div style={styles.candidateIdentity}>
                        <div style={styles.avatar}>{getInitials(candidate.full_name || candidate.email)}</div>
                        <div>
                          <h3 style={styles.candidateName}>{candidate.full_name}</h3>
                          <p style={styles.candidateEmail}>{candidate.email}</p>
                          <p style={styles.candidateId}>ID: {safeText(candidate.id, "").substring(0, 12)}...</p>
                        </div>
                      </div>
                      <div style={styles.scoreBlock}>
                        <div style={styles.scoreTopLine}><span style={styles.scoreValue}>{latestAssessment ? latestPercentage + "%" : "N/A"}</span><Pill color={classification.color} bg={classification.bg}>{classification.label}</Pill></div>
                        <ProgressBar value={latestPercentage} color={classification.color} />
                        <p style={styles.lastActive}>Last completed: {latestAssessment && latestAssessment.result ? formatDate(latestAssessment.result.completed_at) : "Never"}</p>
                      </div>
                      <div style={styles.summaryPills}><Pill color="#027a48" bg="#ecfdf3">✓ {candidate.completedAssessments} completed</Pill><Pill color="#175cd3" bg="#eff8ff">↗ {candidate.readyAssessments} ready</Pill><Pill color="#c2410c" bg="#fff7ed">● {candidate.blockedAssessments} blocked</Pill></div>
                      <div style={styles.rowActions}><button type="button" onClick={function () { setExpandedCandidate(isExpanded ? null : candidate.id); }} style={styles.primaryButton}>{isExpanded ? "Hide" : "Assessments"}</button></div>
                    </div>
                    {isExpanded && <div style={styles.assessmentPanel}><div style={styles.assessmentGrid}>{candidate.assessments.map(function (assessment) {
                      var status = getStatusBadge(assessment.status, assessment.result !== null);
                      var percentage = assessment.result ? calculatePercentage(assessment.result.score, assessment.result.max_score, assessment.result.percentage) : 0;
                      var assessmentClassification = getClassification(percentage);
                      return <div key={assessment.id} style={styles.assessmentCard}><div style={styles.assessmentTop}><div style={{ ...styles.assessmentIcon, background: "linear-gradient(135deg, " + assessment.type_gradient_start + " 0%, " + assessment.type_gradient_end + " 100%)" }}>{assessment.type_icon}</div><div><h4 style={styles.assessmentTitle}>{assessment.assessment_title}</h4><p style={styles.assessmentType}>{assessment.assessment_type_name}</p></div></div><div style={styles.assessmentPills}><Pill color={status.color} bg={status.bg}>{status.icon} {status.label}</Pill>{assessment.result && <Pill color={assessmentClassification.color} bg={assessmentClassification.bg}>{percentage}%</Pill>}</div>{assessment.result ? <React.Fragment><ProgressBar value={percentage} color={assessmentClassification.color} /><p style={styles.lastActive}>Completed: {formatDate(assessment.result.completed_at)}</p><Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={styles.reportLink}>View Report</Link></React.Fragment> : <p style={styles.waitingText}>{assessment.status === "unblocked" ? "Candidate can take this assessment." : "Assessment is currently blocked or scheduled."}</p>}</div>;
                    })}</div></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
  pageShell: { maxWidth: "1420px", margin: "0 auto", padding: "30px 20px 48px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
  centerLoader: { minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(15,23,42,0.15)", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" },
  heroCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", padding: "30px", borderRadius: "28px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)", color: "#ffffff", marginBottom: "20px", boxShadow: "0 24px 80px rgba(15,23,42,0.22)" },
  heroBadge: { display: "inline-flex", padding: "7px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" },
  heroTitle: { margin: 0, color: "#ffffff", fontSize: "42px", lineHeight: 1.08 },
  heroSubtitle: { margin: "12px 0 0", color: "rgba(255,255,255,0.86)", fontSize: "16px" },
  heroMeta: { margin: "8px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "13px" },
  heroActions: { display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" },
  refreshButton: { border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.12)", color: "#ffffff", padding: "11px 16px", borderRadius: "14px", cursor: "pointer", fontWeight: 900 },
  logoutButton: { border: 0, background: "#ef4444", color: "#ffffff", padding: "11px 18px", borderRadius: "14px", cursor: "pointer", fontWeight: 900 },
  bulkCard: { background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #d0d5dd", borderRadius: "24px", padding: "18px", marginBottom: "20px", boxShadow: "0 16px 42px rgba(16,24,40,0.08)", display: "grid", gap: "14px" },
  bulkTitle: { margin: 0, color: "#101828", fontSize: "20px" },
  bulkText: { margin: "6px 0 0", color: "#667085", fontSize: "13px", lineHeight: 1.5 },
  bulkGrid: { display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 220px 150px", gap: "12px", alignItems: "center" },
  selectInput: { width: "100%", boxSizing: "border-box", padding: "13px 12px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  loadButton: { border: 0, background: "#101828", color: "#ffffff", padding: "13px 14px", borderRadius: "14px", cursor: "pointer", fontWeight: 900 },
  lightButton: { border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  dryRunButton: { border: 0, background: "#1d4ed8", color: "#ffffff", padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  dangerButton: { border: 0, background: "#b42318", color: "#ffffff", padding: "10px 12px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  resetCandidatePanel: { border: "1px solid #eaecf0", borderRadius: "18px", background: "#ffffff", padding: "14px" },
  resetCandidateHeader: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "space-between", marginBottom: "12px", color: "#344054", fontSize: "13px" },
  resetCandidateList: { display: "grid", gap: "8px", maxHeight: "360px", overflowY: "auto" },
  resetCandidateRow: { display: "grid", gridTemplateColumns: "24px minmax(220px, 1fr) auto auto auto", gap: "10px", alignItems: "center", padding: "11px", border: "1px solid #eaecf0", borderRadius: "14px", cursor: "pointer", background: "#ffffff" },
  resetCandidateSelected: { display: "grid", gridTemplateColumns: "24px minmax(220px, 1fr) auto auto auto", gap: "10px", alignItems: "center", padding: "11px", border: "2px solid #f04438", borderRadius: "14px", cursor: "pointer", background: "#fef3f2" },
  resetCandidateInfo: { display: "grid", gap: "2px", color: "#101828" },
  resetMeta: { color: "#667085", fontSize: "12px", whiteSpace: "nowrap" },
  bulkError: { padding: "12px", borderRadius: "14px", background: "#fef3f2", color: "#b42318", fontSize: "13px", fontWeight: 800 },
  bulkSuccess: { padding: "12px", borderRadius: "14px", background: "#ecfdf3", color: "#027a48", fontSize: "13px", fontWeight: 800 },
  bulkSummary: { padding: "12px", borderRadius: "14px", background: "#eff6ff", color: "#175cd3", fontSize: "13px" },
  filterCard: { display: "grid", gridTemplateColumns: "1fr", gap: "12px", background: "rgba(255,255,255,0.94)", border: "1px solid #eaecf0", borderRadius: "22px", padding: "14px", marginBottom: "20px", boxShadow: "0 16px 42px rgba(16,24,40,0.08)" },
  searchInput: { width: "100%", boxSizing: "border-box", padding: "13px 14px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  contentCard: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "26px", padding: "22px", boxShadow: "0 20px 56px rgba(16,24,40,0.09)" },
  contentHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px" },
  contentTitle: { margin: 0, color: "#101828", fontSize: "24px" },
  contentSubtitle: { margin: "5px 0 0", color: "#667085", fontSize: "13px" },
  errorBox: { marginBottom: "16px", padding: "14px 16px", borderRadius: "16px", border: "1px solid #fecaca", background: "#fff5f5", color: "#b42318", fontSize: "14px" },
  loadingBlock: { minHeight: "260px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "12px" },
  loadingText: { margin: 0, color: "#667085", fontSize: "14px" },
  candidateList: { display: "grid", gap: "14px" },
  candidateCard: { border: "1px solid #eaecf0", borderRadius: "22px", background: "#ffffff", overflow: "hidden", boxShadow: "0 10px 28px rgba(16,24,40,0.05)" },
  candidateMainRow: { display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(230px, 0.8fr) minmax(250px, 1fr) 170px", gap: "16px", alignItems: "center", padding: "18px" },
  candidateIdentity: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
  avatar: { width: "48px", height: "48px", borderRadius: "18px", background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flex: "0 0 auto" },
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
  emptyState: { padding: "38px 20px", border: "1px dashed #cbd5e1", borderRadius: "22px", background: "#ffffff", textAlign: "center" }
};
