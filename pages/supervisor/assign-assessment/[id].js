// pages/supervisor/assign-assessment/[id].js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../supabase/client";

// ======================================================
// SAFE HELPERS
// ======================================================

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

function getInitials(value) {
  var text = safeText(value, "C").trim();
  var parts = text.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return text ? text.charAt(0).toUpperCase() : "C";
}

function normalizeTypeName(type) {
  if (!type || type === "general") return "General";
  return String(type)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

function getTypeColors(code, assessmentType) {
  var gradientStart = assessmentType && assessmentType.gradient_start ? assessmentType.gradient_start : null;
  var gradientEnd = assessmentType && assessmentType.gradient_end ? assessmentType.gradient_end : null;

  if (gradientStart && gradientEnd) {
    return { bg: "#eef4ff", color: gradientStart, gradient: "linear-gradient(135deg, " + gradientStart + " 0%, " + gradientEnd + " 100%)" };
  }

  if (code === "leadership" || code === "strategic_leadership") return { bg: "#f5f3ff", color: "#6d28d9", gradient: "linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)" };
  if (code === "behavioral" || code === "soft_skills") return { bg: "#ecfeff", color: "#0e7490", gradient: "linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)" };
  if (code === "manufacturing" || code === "manufacturing_baseline") return { bg: "#ecfdf3", color: "#027a48", gradient: "linear-gradient(135deg, #027a48 0%, #22c55e 100%)" };
  if (code === "technical") return { bg: "#fff7ed", color: "#c2410c", gradient: "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)" };
  if (code === "cognitive") return { bg: "#eff6ff", color: "#1d4ed8", gradient: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)" };
  if (code === "cultural") return { bg: "#f8fafc", color: "#475467", gradient: "linear-gradient(135deg, #475467 0%, #94a3b8 100%)" };

  return { bg: "#f2f4f7", color: "#344054", gradient: "linear-gradient(135deg, #344054 0%, #667085 100%)" };
}

function getStatusStyle(status) {
  if (status === "completed") return { label: "Completed", icon: "✓", color: "#027a48", bg: "#ecfdf3" };
  if (status === "unblocked") return { label: "Ready", icon: "↗", color: "#175cd3", bg: "#eff8ff" };
  if (status === "blocked") return { label: "Blocked", icon: "●", color: "#c2410c", bg: "#fff7ed" };
  if (status) return { label: normalizeTypeName(status), icon: "•", color: "#475467", bg: "#f2f4f7" };
  return { label: "Not Assigned", icon: "○", color: "#667085", bg: "#f2f4f7" };
}

// ======================================================
// UI COMPONENTS
// ======================================================

function Pill(props) {
  return (
    <span style={{ ...styles.pill, color: props.color, background: props.bg }}>
      {props.icon && <span>{props.icon}</span>}
      {props.children}
    </span>
  );
}

function StatCard(props) {
  return (
    <div style={{ ...styles.statCard, background: props.background }}>
      <div style={styles.statIcon}>{props.icon}</div>
      <div>
        <p style={styles.statLabel}>{props.label}</p>
        <p style={styles.statValue}>{props.value}</p>
        <p style={styles.statNote}>{props.note}</p>
      </div>
    </div>
  );
}

function EmptyState(props) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{props.icon || "📋"}</div>
      <h3 style={styles.emptyTitle}>{props.title}</h3>
      <p style={styles.emptyText}>{props.message}</p>
    </div>
  );
}

// ======================================================
// PAGE COMPONENT
// ======================================================

export default function AssignAssessment() {
  var router = useRouter();
  var candidateId = router.query.id || router.query.candidate_id || router.query.user_id;

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var submittingState = useState(false);
  var submitting = submittingState[0];
  var setSubmitting = submittingState[1];

  var supervisorState = useState(null);
  var currentSupervisor = supervisorState[0];
  var setCurrentSupervisor = supervisorState[1];

  var candidateState = useState(null);
  var candidate = candidateState[0];
  var setCandidate = candidateState[1];

  var assessmentsState = useState([]);
  var assessments = assessmentsState[0];
  var setAssessments = assessmentsState[1];

  var selectedState = useState({});
  var selectedAssessments = selectedState[0];
  var setSelectedAssessments = selectedState[1];

  var errorState = useState("");
  var error = errorState[0];
  var setError = errorState[1];

  var successState = useState("");
  var success = successState[0];
  var setSuccess = successState[1];

  var searchState = useState("");
  var searchTerm = searchState[0];
  var setSearchTerm = searchState[1];

  var typeFilterState = useState("all");
  var typeFilter = typeFilterState[0];
  var setTypeFilter = typeFilterState[1];

  var statusFilterState = useState("all");
  var statusFilter = statusFilterState[0];
  var setStatusFilter = statusFilterState[1];

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
            setCurrentSupervisor({
              id: supabaseSession.user.id,
              email: supabaseSession.user.email,
              name: (supabaseSession.user.user_metadata && supabaseSession.user.user_metadata.full_name) || supabaseSession.user.email,
              role: userRole
            });
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
        if (session.loggedIn && (session.role === "supervisor" || session.role === "admin")) {
          setCurrentSupervisor({ id: session.user_id, email: session.email, name: session.full_name || session.email, role: session.role });
        } else {
          router.push("/login");
        }
      } catch (authError) {
        router.push("/login");
      }
    }

    checkAuth();
  }, [router]);

  useEffect(function () {
    if (!router.isReady || !currentSupervisor || !candidateId) return;

    var cancelled = false;

    async function loadData() {
      var isAdmin;
      var candidateQuery;
      var candidateResponse;
      var assessmentsResponse;
      var assignedResponse;
      var assignedMap = {};
      var selection = {};

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        isAdmin = currentSupervisor.role === "admin";

        candidateQuery = supabase.from("candidate_profiles").select("*").eq("id", candidateId);
        if (!isAdmin) candidateQuery = candidateQuery.eq("supervisor_id", currentSupervisor.id);

        candidateResponse = await candidateQuery.single();
        if (candidateResponse.error || !candidateResponse.data) throw new Error("Candidate not found or not assigned to you.");

        assessmentsResponse = await supabase
          .from("assessments")
          .select("*, assessment_type:assessment_types(*)")
          .eq("is_active", true)
          .order("title", { ascending: true });

        if (assessmentsResponse.error) throw assessmentsResponse.error;

        assignedResponse = await supabase
          .from("candidate_assessments")
          .select("id, assessment_id, status, result_id, created_at, unblocked_at")
          .eq("user_id", candidateId);

        if (assignedResponse.error) throw assignedResponse.error;

        safeArray(assignedResponse.data).forEach(function (assignment) {
          assignedMap[assignment.assessment_id] = assignment;
        });

        safeArray(assessmentsResponse.data).forEach(function (assessment) {
          var assigned = assignedMap[assessment.id] || null;
          selection[assessment.id] = {
            selected: !!assigned,
            originalSelected: !!assigned,
            status: assigned ? assigned.status : null,
            resultId: assigned ? assigned.result_id : null,
            assignmentId: assigned ? assigned.id : null
          };
        });

        if (!cancelled) {
          setCandidate(candidateResponse.data);
          setAssessments(safeArray(assessmentsResponse.data));
          setSelectedAssessments(selection);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError && loadError.message ? loadError.message : "Failed to load assignment data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return function () {
      cancelled = true;
    };
  }, [router.isReady, currentSupervisor, candidateId]);

  var typeOptions = useMemo(function () {
    var map = {};
    safeArray(assessments).forEach(function (assessment) {
      var type = assessment.assessment_type || {};
      var code = type.code || "general";
      map[code] = type.name || normalizeTypeName(code);
    });
    return Object.keys(map).sort().map(function (code) { return { code: code, name: map[code] }; });
  }, [assessments]);

  var filteredAssessments = useMemo(function () {
    var term = searchTerm.toLowerCase().trim();

    return safeArray(assessments).filter(function (assessment) {
      var type = assessment.assessment_type || {};
      var code = type.code || "general";
      var selected = selectedAssessments[assessment.id] && selectedAssessments[assessment.id].selected;
      var status = selectedAssessments[assessment.id] ? selectedAssessments[assessment.id].status : null;
      var title = safeText(assessment.title, "").toLowerCase();
      var description = safeText(assessment.description, "").toLowerCase();
      var typeName = safeText(type.name || normalizeTypeName(code), "").toLowerCase();

      if (typeFilter !== "all" && code !== typeFilter) return false;
      if (statusFilter === "assigned" && !selected) return false;
      if (statusFilter === "not-assigned" && selected) return false;
      if (statusFilter === "completed" && status !== "completed") return false;
      if (statusFilter === "ready" && status !== "unblocked") return false;
      if (statusFilter === "blocked" && status !== "blocked") return false;

      if (!term) return true;
      return title.indexOf(term) >= 0 || description.indexOf(term) >= 0 || typeName.indexOf(term) >= 0;
    });
  }, [assessments, selectedAssessments, searchTerm, typeFilter, statusFilter]);

  var selectedCount = Object.keys(selectedAssessments).filter(function (id) { return selectedAssessments[id] && selectedAssessments[id].selected; }).length;
  var originalSelectedCount = Object.keys(selectedAssessments).filter(function (id) { return selectedAssessments[id] && selectedAssessments[id].originalSelected; }).length;
  var changedCount = Object.keys(selectedAssessments).filter(function (id) {
    var item = selectedAssessments[id];
    return item && item.selected !== item.originalSelected;
  }).length;

  function handleToggleAssessment(assessmentId) {
    setSelectedAssessments(function (previous) {
      var current = previous[assessmentId] || { selected: false, originalSelected: false, status: null };
      var next = { ...previous };

      if (current.status === "completed" && current.selected) {
        setError("Completed assessments cannot be removed from this page. Reset the assessment first if removal is required.");
        return previous;
      }

      next[assessmentId] = { ...current, selected: !current.selected };
      setError("");
      setSuccess("");
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedAssessments(function (previous) {
      var next = { ...previous };
      filteredAssessments.forEach(function (assessment) {
        var current = next[assessment.id] || { selected: false, originalSelected: false, status: null };
        next[assessment.id] = { ...current, selected: true };
      });
      return next;
    });
  }

  function clearVisible() {
    setSelectedAssessments(function (previous) {
      var next = { ...previous };
      filteredAssessments.forEach(function (assessment) {
        var current = next[assessment.id] || { selected: false, originalSelected: false, status: null };
        if (current.status !== "completed") next[assessment.id] = { ...current, selected: false };
      });
      return next;
    });
  }

  async function handleSave() {
    var currentResponse;
    var currentIds;
    var selectedIds;
    var toAdd;
    var toRemove;
    var addRows;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      currentResponse = await supabase.from("candidate_assessments").select("assessment_id, status").eq("user_id", candidateId);
      if (currentResponse.error) throw currentResponse.error;

      currentIds = safeArray(currentResponse.data).map(function (item) { return String(item.assessment_id); });
      selectedIds = Object.keys(selectedAssessments).filter(function (id) { return selectedAssessments[id] && selectedAssessments[id].selected; }).map(String);

      toAdd = selectedIds.filter(function (id) { return currentIds.indexOf(id) < 0; });
      toRemove = currentIds.filter(function (id) {
        var state = selectedAssessments[id];
        var currentAssignment = safeArray(currentResponse.data).find(function (item) { return String(item.assessment_id) === String(id); });
        if (currentAssignment && currentAssignment.status === "completed") return false;
        return selectedIds.indexOf(id) < 0 && state && state.selected === false;
      });

      if (toAdd.length > 0) {
        addRows = toAdd.map(function (assessmentId) {
          return {
            user_id: candidateId,
            assessment_id: assessmentId,
            status: "blocked",
            created_at: new Date().toISOString()
          };
        });

        var addResponse = await supabase.from("candidate_assessments").insert(addRows);
        if (addResponse.error) throw addResponse.error;
      }

      if (toRemove.length > 0) {
        var removeResponse = await supabase.from("candidate_assessments").delete().eq("user_id", candidateId).in("assessment_id", toRemove);
        if (removeResponse.error) throw removeResponse.error;
      }

      setSelectedAssessments(function (previous) {
        var next = { ...previous };
        Object.keys(next).forEach(function (id) {
          next[id] = { ...next[id], originalSelected: next[id].selected, status: next[id].selected && !next[id].status ? "blocked" : next[id].status };
        });
        return next;
      });

      setSuccess("Assignments updated successfully for " + safeText(candidate && candidate.full_name, "candidate") + ". Newly assigned assessments are blocked by default and can be unblocked from the candidate profile.");
    } catch (saveError) {
      setError(saveError && saveError.message ? saveError.message : "Failed to save assignments.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentSupervisor || loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading assignment workspace...</p>
        </div>
        <style jsx>{spinStyles}</style>
      </AppLayout>
    );
  }

  if (error && !candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.errorContainer}>
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>!</div>
            <h2 style={styles.errorTitle}>Assignment Page Error</h2>
            <p style={styles.errorText}>{error}</p>
            <Link href="/supervisor" style={styles.primaryLink}>Back to Dashboard</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.pageShell}>
        <div style={styles.heroCard}>
          <div style={styles.heroTopRow}>
            <Link href={candidate ? `/supervisor/manage-candidate/${candidate.id}` : "/supervisor"} style={styles.backLink}>← Back to Candidate</Link>
            <Pill color="#ffffff" bg="rgba(255,255,255,0.16)">Supervisor: {safeText(currentSupervisor.name, currentSupervisor.email)}</Pill>
          </div>

          <div style={styles.heroMain}>
            <div style={styles.avatar}>{getInitials(candidate && (candidate.full_name || candidate.email))}</div>
            <div style={styles.heroTextBlock}>
              <div style={styles.heroBadge}>Assignment Workspace</div>
              <h1 style={styles.heroTitle}>Assign Assessments</h1>
              <p style={styles.heroSubtitle}>{safeText(candidate && candidate.full_name, "Candidate")}</p>
              <p style={styles.heroMeta}>{safeText(candidate && candidate.email, "No email provided")}</p>
            </div>
            <div style={styles.summaryPanel}>
              <p style={styles.summaryLabel}>Selected</p>
              <p style={styles.summaryValue}>{selectedCount}</p>
              <p style={styles.summaryNote}>{changedCount} pending change(s)</p>
            </div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard icon="📋" label="Available" value={assessments.length} note="Active assessments" background="linear-gradient(135deg, #0f172a 0%, #334155 100%)" />
          <StatCard icon="✓" label="Assigned" value={selectedCount} note="Currently selected" background="linear-gradient(135deg, #047857 0%, #34d399 100%)" />
          <StatCard icon="●" label="Existing" value={originalSelectedCount} note="Already assigned" background="linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)" />
          <StatCard icon="✎" label="Changes" value={changedCount} note="Before save" background="linear-gradient(135deg, #c2410c 0%, #fb923c 100%)" />
        </div>

        <div style={styles.contentCard}>
          {error && <div style={styles.errorMessage}>{error}</div>}
          {success && <div style={styles.successMessage}>{success}</div>}

          <div style={styles.noteBox}>
            <strong>Important:</strong> Newly assigned assessments are blocked by default. Unblock them from the candidate profile when the candidate should be allowed to start.
          </div>

          <div style={styles.filterBar}>
            <input
              type="text"
              value={searchTerm}
              onChange={function (event) { setSearchTerm(event.target.value); }}
              placeholder="Search assessment title, type, or description..."
              style={styles.searchInput}
            />

            <select value={statusFilter} onChange={function (event) { setStatusFilter(event.target.value); }} style={styles.selectInput}>
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="not-assigned">Not Assigned</option>
              <option value="completed">Completed</option>
              <option value="ready">Ready</option>
              <option value="blocked">Blocked</option>
            </select>

            <select value={typeFilter} onChange={function (event) { setTypeFilter(event.target.value); }} style={styles.selectInput}>
              <option value="all">All Types</option>
              {typeOptions.map(function (type) {
                return <option key={type.code} value={type.code}>{type.name}</option>;
              })}
            </select>

            <button type="button" style={styles.lightButton} onClick={selectAllVisible}>Select Visible</button>
            <button type="button" style={styles.lightButton} onClick={clearVisible}>Clear Visible</button>
          </div>

          {filteredAssessments.length === 0 ? (
            <EmptyState title="No assessments found" message="No assessments match the current search and filter selection." icon="⌕" />
          ) : (
            <div style={styles.assessmentsGrid}>
              {filteredAssessments.map(function (assessment) {
                var type = assessment.assessment_type || {};
                var code = type.code || "general";
                var colors = getTypeColors(code, type);
                var state = selectedAssessments[assessment.id] || { selected: false, status: null };
                var isSelected = !!state.selected;
                var status = getStatusStyle(state.status);
                var isCompleted = state.status === "completed";

                return (
                  <article key={assessment.id} style={{ ...styles.assessmentCard, borderColor: isSelected ? colors.color : "#eaecf0", background: isSelected ? colors.bg : "#ffffff" }}>
                    <div style={styles.cardHeader}>
                      <div style={{ ...styles.assessmentIcon, background: colors.gradient }}>{type.icon || "📋"}</div>
                      <div style={styles.cardInfo}>
                        <h3 style={styles.assessmentTitle}>{safeText(assessment.title, "Untitled Assessment")}</h3>
                        <Pill color={colors.color} bg="#ffffff">{type.name || normalizeTypeName(code)}</Pill>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={function () { handleToggleAssessment(assessment.id); }}
                        disabled={isCompleted}
                        style={styles.checkbox}
                      />
                    </div>

                    <p style={styles.assessmentDescription}>{safeText(assessment.description, "Complete this assessment as assigned by the supervisor.")}</p>

                    <div style={styles.metaRow}>
                      <span>⏱ 180 min</span>
                      <span>📋 Assessment</span>
                      <span>🎯 Supervisor assigned</span>
                    </div>

                    <div style={styles.cardFooter}>
                      <Pill icon={status.icon} color={status.color} bg={status.bg}>{status.label}</Pill>
                      {state.originalSelected && !state.selected && !isCompleted && <Pill color="#c2410c" bg="#fff7ed">Pending removal</Pill>}
                      {!state.originalSelected && state.selected && <Pill color="#027a48" bg="#ecfdf3">Pending add</Pill>}
                      {isCompleted && <Pill color="#027a48" bg="#ecfdf3">Locked</Pill>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div style={styles.buttonGroup}>
            <Link href={candidate ? `/supervisor/manage-candidate/${candidate.id}` : "/supervisor"} style={styles.cancelButton}>Cancel</Link>
            <button type="button" onClick={handleSave} disabled={submitting || changedCount === 0} style={submitting || changedCount === 0 ? styles.saveButtonDisabled : styles.saveButton}>
              {submitting ? "Saving..." : changedCount === 0 ? "No Changes" : "Save Assignments"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{spinStyles}</style>
    </AppLayout>
  );
}

// ======================================================
// STYLES
// ======================================================

var spinStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

var styles = {
  loadingContainer: { minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", color: "#101828" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(15, 23, 42, 0.15)", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" },
  loadingText: { margin: 0, color: "#475467", fontSize: "14px" },
  pageShell: { maxWidth: "1280px", margin: "0 auto", padding: "30px 20px 48px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
  heroCard: { background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)", color: "#ffffff", borderRadius: "30px", padding: "28px", marginBottom: "20px", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)" },
  heroTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "22px" },
  backLink: { color: "#ffffff", textDecoration: "none", padding: "9px 14px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", fontSize: "13px", fontWeight: 900 },
  heroMain: { display: "grid", gridTemplateColumns: "82px minmax(0, 1fr) 240px", gap: "18px", alignItems: "center" },
  avatar: { width: "76px", height: "76px", borderRadius: "26px", background: "rgba(255,255,255,0.18)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: 900, border: "1px solid rgba(255,255,255,0.24)" },
  heroTextBlock: { minWidth: 0 },
  heroBadge: { display: "inline-flex", padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.14)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" },
  heroTitle: { margin: 0, color: "#ffffff", fontSize: "38px", lineHeight: 1.08 },
  heroSubtitle: { margin: "10px 0 0", color: "rgba(255,255,255,0.86)", fontSize: "16px", overflowWrap: "anywhere" },
  heroMeta: { margin: "6px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "13px", overflowWrap: "anywhere" },
  summaryPanel: { background: "rgba(255,255,255,0.95)", color: "#101828", borderRadius: "22px", padding: "18px", boxShadow: "0 18px 45px rgba(15,23,42,0.16)" },
  summaryLabel: { margin: 0, color: "#667085", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" },
  summaryValue: { margin: "8px 0 0", fontSize: "38px", lineHeight: 1, fontWeight: 900 },
  summaryNote: { margin: "8px 0 0", color: "#667085", fontSize: "12px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" },
  statCard: { display: "flex", alignItems: "center", gap: "14px", padding: "20px", borderRadius: "22px", color: "#ffffff", minHeight: "96px", boxShadow: "0 18px 42px rgba(15,23,42,0.14)" },
  statIcon: { width: "46px", height: "46px", borderRadius: "16px", background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900 },
  statLabel: { margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { margin: "4px 0 0", color: "#ffffff", fontSize: "30px", lineHeight: 1, fontWeight: 900 },
  statNote: { margin: "5px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "12px" },
  contentCard: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "26px", padding: "22px", boxShadow: "0 20px 56px rgba(16,24,40,0.09)" },
  noteBox: { padding: "14px 16px", borderRadius: "16px", background: "#eff8ff", color: "#175cd3", border: "1px solid #b2ddff", marginBottom: "18px", lineHeight: 1.5, fontSize: "14px" },
  errorMessage: { padding: "14px 16px", borderRadius: "16px", background: "#fef3f2", color: "#b42318", border: "1px solid #fecaca", marginBottom: "18px", fontWeight: 800 },
  successMessage: { padding: "14px 16px", borderRadius: "16px", background: "#ecfdf3", color: "#027a48", border: "1px solid #bbf7d0", marginBottom: "18px", fontWeight: 800 },
  filterBar: { display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 170px 190px 130px 120px", gap: "10px", marginBottom: "18px" },
  searchInput: { width: "100%", boxSizing: "border-box", padding: "13px 14px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  selectInput: { width: "100%", padding: "13px 12px", border: "1px solid #d0d5dd", borderRadius: "14px", outline: "none", color: "#101828", background: "#ffffff" },
  lightButton: { border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", padding: "10px 12px", borderRadius: "14px", cursor: "pointer", fontWeight: 900, fontSize: "12px" },
  assessmentsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "14px", marginBottom: "20px" },
  assessmentCard: { border: "2px solid #eaecf0", borderRadius: "22px", padding: "18px", transition: "all 0.2s ease", boxShadow: "0 10px 28px rgba(16,24,40,0.05)" },
  cardHeader: { display: "grid", gridTemplateColumns: "48px minmax(0,1fr) 24px", gap: "12px", alignItems: "center", marginBottom: "14px" },
  assessmentIcon: { width: "46px", height: "46px", borderRadius: "15px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900 },
  cardInfo: { minWidth: 0 },
  assessmentTitle: { margin: "0 0 8px", color: "#101828", fontSize: "16px", overflowWrap: "anywhere" },
  checkbox: { width: "20px", height: "20px", cursor: "pointer" },
  assessmentDescription: { margin: "0 0 14px", color: "#475467", fontSize: "13px", lineHeight: 1.55, minHeight: "42px" },
  metaRow: { display: "flex", gap: "8px", flexWrap: "wrap", color: "#667085", fontSize: "12px", marginBottom: "14px" },
  cardFooter: { display: "flex", gap: "8px", flexWrap: "wrap" },
  pill: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "999px", border: "1px solid transparent", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  buttonGroup: { display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap", paddingTop: "8px" },
  cancelButton: { textDecoration: "none", padding: "12px 18px", borderRadius: "14px", background: "#f2f4f7", color: "#344054", fontWeight: 900 },
  saveButton: { border: 0, padding: "12px 18px", borderRadius: "14px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", cursor: "pointer", fontWeight: 900 },
  saveButtonDisabled: { border: 0, padding: "12px 18px", borderRadius: "14px", background: "#98a2b3", color: "#ffffff", cursor: "not-allowed", fontWeight: 900 },
  emptyState: { padding: "44px 20px", border: "1px dashed #cbd5e1", borderRadius: "22px", background: "#ffffff", textAlign: "center", marginBottom: "20px" },
  emptyIcon: { width: "54px", height: "54px", margin: "0 auto 12px", borderRadius: "18px", background: "#eff6ff", color: "#175cd3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900 },
  emptyTitle: { margin: 0, color: "#101828", fontSize: "18px" },
  emptyText: { margin: "8px auto 0", maxWidth: "520px", color: "#667085", lineHeight: 1.6, fontSize: "14px" },
  errorContainer: { minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" },
  errorBox: { background: "#ffffff", padding: "40px", borderRadius: "24px", textAlign: "center", maxWidth: "480px", boxShadow: "0 20px 56px rgba(16,24,40,0.12)" },
  errorIcon: { width: "54px", height: "54px", margin: "0 auto 12px", borderRadius: "18px", background: "#fef3f2", color: "#b42318", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900 },
  errorTitle: { margin: 0, color: "#101828" },
  errorText: { color: "#667085", lineHeight: 1.6 },
  primaryLink: { display: "inline-flex", marginTop: "18px", textDecoration: "none", padding: "11px 16px", borderRadius: "12px", background: "#101828", color: "#ffffff", fontWeight: 900 }
};
