// pages/supervisor/index.js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

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

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "N/A";
  }
}

function getInitials(nameOrEmail) {
  var text = safeText(nameOrEmail, "C").trim();
  var parts;
  if (!text) return "C";
  parts = text.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  return text.charAt(0).toUpperCase();
}

function calculatePercentage(score, maxScore, fallbackPercentage) {
  var percentage = safeNumber(fallbackPercentage, null);
  var scoreValue;
  var maxValue;

  if (percentage !== null && percentage !== undefined && Number.isFinite(Number(percentage))) {
    return Math.round(Number(percentage));
  }

  scoreValue = safeNumber(score, 0);
  maxValue = safeNumber(maxScore, 0);

  if (maxValue <= 0) return 0;
  return Math.round((scoreValue / maxValue) * 100);
}

function getClassificationFromPercentage(percentage) {
  var value = safeNumber(percentage, 0);

  if (value >= 85) return { label: "Exceptional", color: "#0f766e", background: "#ecfdf3" };
  if (value >= 75) return { label: "Strong Performer", color: "#2563eb", background: "#eff6ff" };
  if (value >= 65) return { label: "Capable", color: "#4f46e5", background: "#eef2ff" };
  if (value >= 55) return { label: "Developing", color: "#d97706", background: "#fffaeb" };
  if (value >= 40) return { label: "At Risk", color: "#ea580c", background: "#fff7ed" };
  if (value > 0) return { label: "High Risk", color: "#b42318", background: "#fef3f2" };

  return { label: "No Data", color: "#667085", background: "#f2f4f7" };
}

function getStatusBadge(status) {
  if (status === "completed") return { label: "Completed", icon: "✓", color: "#027a48", background: "#ecfdf3" };
  if (status === "unblocked") return { label: "Ready", icon: "↗", color: "#175cd3", background: "#eff8ff" };
  if (status === "blocked") return { label: "Blocked", icon: "●", color: "#c2410c", background: "#fff7ed" };
  return { label: safeText(status, "Unknown"), icon: "•", color: "#475467", background: "#f2f4f7" };
}

function getCandidateBestResult(candidate) {
  var completed = safeArray(candidate.assessments).filter(function (item) {
    return item.result !== null && item.result !== undefined;
  });

  completed.sort(function (a, b) {
    var aDate = a.result && a.result.completed_at ? new Date(a.result.completed_at).getTime() : 0;
    var bDate = b.result && b.result.completed_at ? new Date(b.result.completed_at).getTime() : 0;
    return bDate - aDate;
  });

  return completed.length > 0 ? completed[0] : null;
}

function getAssessmentDisplayType(type) {
  if (!type || type === "general") return "General";
  return String(type)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

// ======================================================
// SMALL UI COMPONENTS
// ======================================================

function StatCard(props) {
  return (
    <div style={{ ...styles.statCard, background: props.background }}>
      <div style={styles.statIcon}>{props.icon}</div>
      <div>
        <p style={styles.statLabel}>{props.label}</p>
        <p style={styles.statValue}>{props.value}</p>
        {props.note && <p style={styles.statNote}>{props.note}</p>}
      </div>
    </div>
  );
}

function Pill(props) {
  return (
    <span style={{ ...styles.pill, color: props.color, background: props.background, borderColor: props.borderColor || props.background }}>
      {props.icon && <span>{props.icon}</span>}
      {props.children}
    </span>
  );
}

function EmptyState(props) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{props.icon || "⌕"}</div>
      <h3 style={styles.emptyTitle}>{props.title}</h3>
      <p style={styles.emptyText}>{props.message}</p>
    </div>
  );
}

function ProgressBar(props) {
  var value = safeNumber(props.value, 0);
  if (value < 0) value = 0;
  if (value > 100) value = 100;

  return (
    <div style={styles.progressTrack}>
      <div style={{ width: value + "%", height: "100%", borderRadius: "999px", background: props.color || "#0f766e" }} />
    </div>
  );
}

// ======================================================
// PAGE COMPONENT
// ======================================================

export default function SupervisorDashboard() {
  var router = useRouter();

  var candidatesState = useState([]);
  var candidates = candidatesState[0];
  var setCandidates = candidatesState[1];

  var filteredState = useState([]);
  var filteredCandidates = filteredState[0];
  var setFilteredCandidates = filteredState[1];

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var supervisorState = useState(null);
  var currentSupervisor = supervisorState[0];
  var setCurrentSupervisor = supervisorState[1];

  var selectedTypeState = useState("all");
  var selectedAssessmentType = selectedTypeState[0];
  var setSelectedAssessmentType = selectedTypeState[1];

  var assessmentTypesState = useState([]);
  var assessmentTypes = assessmentTypesState[0];
  var setAssessmentTypes = assessmentTypesState[1];

  var searchState = useState("");
  var searchTerm = searchState[0];
  var setSearchTerm = searchState[1];

  var expandedState = useState(null);
  var expandedCandidate = expandedState[0];
  var setExpandedCandidate = expandedState[1];

  var statusState = useState("all");
  var filterStatus = statusState[0];
  var setFilterStatus = statusState[1];

  var errorState = useState("");
  var errorMessage = errorState[0];
  var setErrorMessage = errorState[1];

  var statsState = useState({
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0,
    completionRate: 0
  });
  var stats = statsState[0];
  var setStats = statsState[1];

  useEffect(function () {
    if (!router.isReady) return;

    if (router.query.expanded) setExpandedCandidate(String(router.query.expanded));
    if (router.query.search) setSearchTerm(String(router.query.search));
    if (router.query.filterType && router.query.filterType !== "all") setSelectedAssessmentType(String(router.query.filterType));
    if (router.query.filterStatus && router.query.filterStatus !== "all") setFilterStatus(String(router.query.filterStatus));
  }, [router.isReady]);

  useEffect(function () {
    if (!router.isReady) return;

    var query = {};
    if (expandedCandidate) query.expanded = expandedCandidate;
    if (searchTerm) query.search = searchTerm;
    if (selectedAssessmentType !== "all") query.filterType = selectedAssessmentType;
    if (filterStatus !== "all") query.filterStatus = filterStatus;

    router.replace({ pathname: router.pathname, query: query }, undefined, { shallow: true });
  }, [expandedCandidate, searchTerm, selectedAssessmentType, filterStatus, router.isReady]);

  useEffect(function () {
    function checkAuth() {
      var userSession;
      var session;

      if (typeof window === "undefined") return;

      userSession = localStorage.getItem("userSession");
      if (!userSession) {
        router.push("/login");
        return;
      }

      try {
        session = JSON.parse(userSession);
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

    var cancelled = false;

    async function fetchData() {
      var isAdmin;
      var candidatesQuery;
      var candidatesResponse;
      var candidatesData;
      var processedCandidates;
      var typeMap = {};
      var totalAssessments = 0;
      var completedAssessments = 0;
      var unblockedAssessments = 0;
      var blockedAssessments = 0;
      var completionRate = 0;

      try {
        setLoading(true);
        setErrorMessage("");
        isAdmin = currentSupervisor.role === "admin";

        candidatesQuery = supabase
          .from("candidate_profiles")
          .select("id, full_name, email, phone, created_at, supervisor_id");

        if (!isAdmin) {
          candidatesQuery = candidatesQuery.eq("supervisor_id", currentSupervisor.id);
        }

        candidatesResponse = await candidatesQuery.order("created_at", { ascending: false });

        if (candidatesResponse.error) throw candidatesResponse.error;

        candidatesData = safeArray(candidatesResponse.data);

        processedCandidates = await Promise.all(candidatesData.map(async function (candidate) {
          var resultsResponse;
          var accessResponse;
          var resultsMap = {};
          var assessmentsWithDetails;
          var completedList;
          var unblockedList;
          var blockedList;
          var assessmentBreakdown = {};
          var latestAssessment;

          resultsResponse = await supabase
            .from("assessment_results")
            .select("id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid")
            .eq("user_id", candidate.id);

          safeArray(resultsResponse.data).forEach(function (result) {
            resultsMap[result.assessment_id] = {
              id: result.id,
              score: result.total_score,
              max_score: result.max_score,
              percentage: result.percentage_score,
              completed_at: result.completed_at,
              is_valid: result.is_valid
            };
          });

          accessResponse = await supabase
            .from("candidate_assessments")
            .select("id, assessment_id, status, created_at, unblocked_at, result_id, assessments(id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end))")
            .eq("user_id", candidate.id);

          assessmentsWithDetails = safeArray(accessResponse.data).map(function (access) {
            var result = resultsMap[access.assessment_id] || null;
            var displayStatus = access.status;
            var assessment = access.assessments || {};
            var typeData = assessment.assessment_types || {};
            var typeCode = typeData.code || "general";
            var typeName = typeData.name || getAssessmentDisplayType(typeCode);

            if (result || access.result_id) displayStatus = "completed";

            typeMap[typeCode] = typeName;

            return {
              id: access.id,
              assessment_id: access.assessment_id,
              assessment_title: assessment.title || "Unknown Assessment",
              assessment_description: assessment.description || "",
              assessment_type: typeCode,
              assessment_type_name: typeName,
              type_icon: typeData.icon || "📋",
              type_gradient_start: typeData.gradient_start || "#0f766e",
              type_gradient_end: typeData.gradient_end || "#14b8a6",
              status: displayStatus,
              created_at: access.created_at,
              unblocked_at: access.unblocked_at,
              result: result
            };
          });

          assessmentsWithDetails.sort(function (a, b) {
            var aDate = a.result && a.result.completed_at ? new Date(a.result.completed_at).getTime() : new Date(a.created_at || 0).getTime();
            var bDate = b.result && b.result.completed_at ? new Date(b.result.completed_at).getTime() : new Date(b.created_at || 0).getTime();
            return bDate - aDate;
          });

          completedList = assessmentsWithDetails.filter(function (item) { return item.status === "completed" || item.result !== null; });
          unblockedList = assessmentsWithDetails.filter(function (item) { return item.status === "unblocked" && !item.result; });
          blockedList = assessmentsWithDetails.filter(function (item) { return item.status === "blocked" && !item.result; });

          assessmentsWithDetails.forEach(function (assessment) {
            assessmentBreakdown[assessment.assessment_type] = (assessmentBreakdown[assessment.assessment_type] || 0) + 1;
          });

          latestAssessment = completedList.length > 0 ? completedList[0] : null;

          return {
            id: candidate.id,
            full_name: candidate.full_name || "Unnamed Candidate",
            email: candidate.email || "No email provided",
            phone: candidate.phone || "",
            created_at: candidate.created_at,
            totalAssessments: assessmentsWithDetails.length,
            completedAssessments: completedList.length,
            unblockedAssessments: unblockedList.length,
            blockedAssessments: blockedList.length,
            assessment_breakdown: assessmentBreakdown,
            latestAssessment: latestAssessment,
            assessments: assessmentsWithDetails,
            selectedAssessmentType: assessmentsWithDetails[0] ? assessmentsWithDetails[0].assessment_type : null
          };
        }));

        if (cancelled) return;

        processedCandidates.forEach(function (candidate) {
          totalAssessments += candidate.totalAssessments;
          completedAssessments += candidate.completedAssessments;
          unblockedAssessments += candidate.unblockedAssessments;
          blockedAssessments += candidate.blockedAssessments;
        });

        if (totalAssessments > 0) completionRate = Math.round((completedAssessments / totalAssessments) * 100);

        setCandidates(processedCandidates);
        setFilteredCandidates(processedCandidates);
        setAssessmentTypes([{ code: "all", name: "All Assessments" }].concat(Object.keys(typeMap).sort().map(function (key) {
          return { code: key, name: typeMap[key] || getAssessmentDisplayType(key) };
        })));
        setStats({
          totalCandidates: processedCandidates.length,
          totalAssessments: totalAssessments,
          completedAssessments: completedAssessments,
          unblockedAssessments: unblockedAssessments,
          blockedAssessments: blockedAssessments,
          completionRate: completionRate
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching dashboard data:", error);
        setErrorMessage(error && error.message ? error.message : "Unable to load supervisor dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return function () {
      cancelled = true;
    };
  }, [currentSupervisor]);

  useEffect(function () {
    var filtered = candidates.slice();

    if (selectedAssessmentType !== "all") {
      filtered = filtered.filter(function (candidate) {
        return safeNumber(candidate.assessment_breakdown && candidate.assessment_breakdown[selectedAssessmentType], 0) > 0;
      });
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(function (candidate) {
        if (filterStatus === "completed") return candidate.completedAssessments > 0;
        if (filterStatus === "unblocked") return candidate.unblockedAssessments > 0;
        if (filterStatus === "blocked") return candidate.blockedAssessments > 0;
        if (filterStatus === "not-started") return candidate.completedAssessments === 0;
        return true;
      });
    }

    if (searchTerm.trim()) {
      var term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(function (candidate) {
        return (
          safeText(candidate.full_name, "").toLowerCase().indexOf(term) >= 0 ||
          safeText(candidate.email, "").toLowerCase().indexOf(term) >= 0 ||
          safeText(candidate.id, "").toLowerCase().indexOf(term) >= 0
        );
      });
    }

    setFilteredCandidates(filtered);
  }, [candidates, selectedAssessmentType, filterStatus, searchTerm]);

  var dashboardSubtitle = useMemo(function () {
    if (!currentSupervisor) return "";
    if (currentSupervisor.role === "admin") return "Admin view across all candidates and assessments";
    return "Assigned candidates and assessment progress";
  }, [currentSupervisor]);

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  }

  function toggleCandidateDetails(candidateId) {
    setExpandedCandidate(expandedCandidate === candidateId ? null : candidateId);
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedAssessmentType("all");
    setFilterStatus("all");
    setExpandedCandidate(null);
  }

  if (!currentSupervisor) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.centerLoader}>
          <div style={styles.spinner} />
        </div>
        <style jsx>{spinStyles}</style>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.pageShell}>
        <div style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <div style={styles.heroBadge}>Supervisor Workspace</div>
            <h1 style={styles.heroTitle}>Supervisor Dashboard</h1>
            <p style={styles.heroSubtitle}>{dashboardSubtitle}</p>
            <p style={styles.heroMeta}>Welcome, {safeText(currentSupervisor.name || currentSupervisor.email, "Supervisor")}</p>
          </div>

          <div style={styles.heroActions}>
            <button type="button" style={styles.refreshButton} onClick={function () { router.reload(); }}>
              Refresh
            </button>
            <button type="button" onClick={handleLogout} style={styles.logoutButton}>
              Sign Out
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard icon="👥" label="Candidates" value={stats.totalCandidates} note="Assigned profiles" background="linear-gradient(135deg, #0f172a 0%, #334155 100%)" />
          <StatCard icon="📋" label="Assessments" value={stats.totalAssessments} note="Total assigned" background="linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)" />
          <StatCard icon="✓" label="Completed" value={stats.completedAssessments} note={stats.completionRate + "% completion"} background="linear-gradient(135deg, #047857 0%, #34d399 100%)" />
          <StatCard icon="↗" label="Ready" value={stats.unblockedAssessments} note="Awaiting completion" background="linear-gradient(135deg, #4338ca 0%, #8b5cf6 100%)" />
          <StatCard icon="●" label="Blocked" value={stats.blockedAssessments} note="Not yet released" background="linear-gradient(135deg, #c2410c 0%, #fb923c 100%)" />
        </div>

        <div style={styles.filterCard}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>⌕</span>
            <input
              type="text"
              placeholder="Search by name, email, or candidate ID..."
              value={searchTerm}
              onChange={function (event) { setSearchTerm(event.target.value); }}
              style={styles.searchInput}
            />
          </div>

          <select value={filterStatus} onChange={function (event) { setFilterStatus(event.target.value); }} style={styles.selectInput}>
            <option value="all">All Status</option>
            <option value="completed">Completed Only</option>
            <option value="unblocked">Ready Only</option>
            <option value="blocked">Blocked Only</option>
            <option value="not-started">Not Started</option>
          </select>

          <select value={selectedAssessmentType} onChange={function (event) { setSelectedAssessmentType(event.target.value); }} style={styles.selectInput}>
            {assessmentTypes.map(function (type) {
              return <option key={type.code} value={type.code}>{type.name}</option>;
            })}
          </select>

          <button type="button" style={styles.clearButton} onClick={clearFilters}>Clear</button>
        </div>

        <div style={styles.contentCard}>
          <div style={styles.contentHeader}>
            <div>
              <h2 style={styles.contentTitle}>Assigned Candidates</h2>
              <p style={styles.contentSubtitle}>{filteredCandidates.length} of {candidates.length} candidate(s) shown</p>
            </div>
            <Pill color="#175cd3" background="#eff8ff">Live assessment overview</Pill>
          </div>

          {errorMessage && (
            <div style={styles.errorBox}>
              <strong>Dashboard error:</strong> {errorMessage}
            </div>
          )}

          {loading ? (
            <div style={styles.loadingBlock}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading candidates and assessments...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <EmptyState title="No candidates found" message="No candidates match the selected search and filter criteria." icon="⌕" />
          ) : (
            <div style={styles.candidateList}>
              {filteredCandidates.map(function (candidate) {
                var latestAssessment = getCandidateBestResult(candidate);
                var latestPercentage = latestAssessment && latestAssessment.result ? calculatePercentage(latestAssessment.result.score, latestAssessment.result.max_score, latestAssessment.result.percentage) : 0;
                var classification = getClassificationFromPercentage(latestPercentage);
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

                      <div style={styles.candidateScoreBlock}>
                        <div style={styles.scoreTopLine}>
                          <span style={styles.scoreValue}>{latestAssessment ? latestPercentage + "%" : "N/A"}</span>
                          <Pill color={classification.color} background={classification.background}>{classification.label}</Pill>
                        </div>
                        <ProgressBar value={latestPercentage} color={classification.color} />
                        <p style={styles.lastActive}>Last completed: {latestAssessment && latestAssessment.result ? formatDate(latestAssessment.result.completed_at) : "Never"}</p>
                      </div>

                      <div style={styles.assessmentSummaryPills}>
                        <Pill color="#027a48" background="#ecfdf3">✓ {candidate.completedAssessments} completed</Pill>
                        <Pill color="#175cd3" background="#eff8ff">↗ {candidate.unblockedAssessments} ready</Pill>
                        <Pill color="#c2410c" background="#fff7ed">● {candidate.blockedAssessments} blocked</Pill>
                      </div>

                      <div style={styles.rowActions}>
                        <Link href={`/supervisor/manage-candidate/${candidate.id}`} style={styles.secondaryLink}>Profile</Link>
                        <button type="button" onClick={function () { toggleCandidateDetails(candidate.id); }} style={styles.primaryButtonSmall}>
                          {isExpanded ? "Hide" : "Assessments"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={styles.assessmentPanel}>
                        <div style={styles.assessmentPanelHeader}>
                          <h4 style={styles.assessmentPanelTitle}>Assessment Details</h4>
                          <span style={styles.assessmentPanelMeta}>{candidate.assessments.length} assigned</span>
                        </div>

                        {candidate.assessments.length === 0 ? (
                          <EmptyState title="No assessments assigned" message="This candidate does not currently have any assessment access records." icon="📋" />
                        ) : (
                          <div style={styles.assessmentGrid}>
                            {candidate.assessments.map(function (assessment) {
                              var badge = getStatusBadge(assessment.status);
                              var percentage = assessment.result ? calculatePercentage(assessment.result.score, assessment.result.max_score, assessment.result.percentage) : 0;
                              var assessmentClassification = getClassificationFromPercentage(percentage);

                              return (
                                <div key={assessment.id} style={styles.assessmentCard}>
                                  <div style={styles.assessmentTop}>
                                    <div style={{ ...styles.assessmentTypeIcon, background: "linear-gradient(135deg, " + assessment.type_gradient_start + " 0%, " + assessment.type_gradient_end + " 100%)" }}>
                                      {assessment.type_icon}
                                    </div>
                                    <div style={styles.assessmentTitleBlock}>
                                      <h5 style={styles.assessmentTitle}>{assessment.assessment_title}</h5>
                                      <p style={styles.assessmentType}>{assessment.assessment_type_name}</p>
                                    </div>
                                  </div>

                                  <div style={styles.assessmentMiddle}>
                                    <Pill icon={badge.icon} color={badge.color} background={badge.background}>{badge.label}</Pill>
                                    {assessment.result && (
                                      <Pill color={assessmentClassification.color} background={assessmentClassification.background}>{percentage}%</Pill>
                                    )}
                                  </div>

                                  {assessment.result && (
                                    <div style={styles.assessmentProgressWrap}>
                                      <ProgressBar value={percentage} color={assessmentClassification.color} />
                                      <p style={styles.completedDate}>Completed: {formatDate(assessment.result.completed_at)}</p>
                                    </div>
                                  )}

                                  <div style={styles.assessmentActions}>
                                    {assessment.result ? (
                                      <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={styles.reportLink}>View Report</Link>
                                    ) : assessment.status === "unblocked" ? (
                                      <span style={styles.waitingText}>Candidate can take this assessment.</span>
                                    ) : (
                                      <span style={styles.waitingText}>Assessment is currently blocked.</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
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
  pageShell: {
    maxWidth: "1420px",
    margin: "0 auto",
    padding: "30px 20px 48px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
  },
  centerLoader: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh"
  },
  spinner: {
    width: "42px",
    height: "42px",
    border: "4px solid rgba(15, 23, 42, 0.15)",
    borderTopColor: "#0f172a",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "22px",
    padding: "30px",
    borderRadius: "28px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)",
    color: "#ffffff",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)"
  },
  heroLeft: {
    minWidth: 0
  },
  heroBadge: {
    display: "inline-flex",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.16)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "12px"
  },
  heroTitle: {
    margin: 0,
    fontSize: "42px",
    lineHeight: 1.08,
    color: "#ffffff"
  },
  heroSubtitle: {
    margin: "12px 0 0",
    color: "rgba(255,255,255,0.86)",
    fontSize: "16px"
  },
  heroMeta: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,0.72)",
    fontSize: "13px"
  },
  heroActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end"
  },
  refreshButton: {
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: 900
  },
  logoutButton: {
    border: 0,
    background: "#ef4444",
    color: "#ffffff",
    padding: "11px 18px",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 12px 24px rgba(239, 68, 68, 0.28)"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "20px"
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px",
    borderRadius: "22px",
    color: "#ffffff",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.14)",
    minHeight: "100px"
  },
  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 900
  },
  statLabel: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  statValue: {
    margin: "4px 0 0",
    fontSize: "30px",
    lineHeight: 1,
    fontWeight: 900,
    color: "#ffffff"
  },
  statNote: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "rgba(255,255,255,0.75)"
  },
  filterCard: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) 190px 220px 90px",
    gap: "12px",
    alignItems: "center",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #eaecf0",
    borderRadius: "22px",
    padding: "14px",
    marginBottom: "20px",
    boxShadow: "0 16px 42px rgba(16, 24, 40, 0.08)"
  },
  searchWrap: {
    position: "relative",
    minWidth: 0
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#667085",
    fontWeight: 900
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px 13px 38px",
    border: "1px solid #d0d5dd",
    borderRadius: "14px",
    outline: "none",
    fontSize: "14px",
    color: "#101828",
    background: "#ffffff"
  },
  selectInput: {
    width: "100%",
    padding: "13px 12px",
    border: "1px solid #d0d5dd",
    borderRadius: "14px",
    outline: "none",
    fontSize: "14px",
    color: "#101828",
    background: "#ffffff"
  },
  clearButton: {
    border: 0,
    padding: "13px 14px",
    borderRadius: "14px",
    background: "#101828",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900
  },
  contentCard: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #eaecf0",
    borderRadius: "26px",
    padding: "22px",
    boxShadow: "0 20px 56px rgba(16, 24, 40, 0.09)"
  },
  contentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px"
  },
  contentTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "24px"
  },
  contentSubtitle: {
    margin: "5px 0 0",
    color: "#667085",
    fontSize: "13px"
  },
  errorBox: {
    marginBottom: "16px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#b42318",
    fontSize: "14px"
  },
  loadingBlock: {
    minHeight: "260px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px"
  },
  loadingText: {
    margin: 0,
    color: "#667085",
    fontSize: "14px"
  },
  candidateList: {
    display: "grid",
    gap: "14px"
  },
  candidateCard: {
    border: "1px solid #eaecf0",
    borderRadius: "22px",
    background: "#ffffff",
    overflow: "hidden",
    boxShadow: "0 10px 28px rgba(16, 24, 40, 0.05)"
  },
  candidateMainRow: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1.2fr) minmax(230px, 0.8fr) minmax(250px, 1fr) 170px",
    gap: "16px",
    alignItems: "center",
    padding: "18px"
  },
  candidateIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    flex: "0 0 auto"
  },
  candidateName: {
    margin: 0,
    color: "#101828",
    fontSize: "16px",
    overflowWrap: "anywhere"
  },
  candidateEmail: {
    margin: "4px 0 0",
    color: "#475467",
    fontSize: "13px",
    overflowWrap: "anywhere"
  },
  candidateId: {
    margin: "4px 0 0",
    color: "#98a2b3",
    fontSize: "11px"
  },
  candidateScoreBlock: {
    minWidth: 0
  },
  scoreTopLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px"
  },
  scoreValue: {
    color: "#101828",
    fontSize: "24px",
    fontWeight: 900
  },
  progressTrack: {
    width: "100%",
    height: "9px",
    borderRadius: "999px",
    background: "#e4e7ec",
    overflow: "hidden"
  },
  lastActive: {
    margin: "7px 0 0",
    color: "#667085",
    fontSize: "12px"
  },
  assessmentSummaryPills: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap"
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: 900,
    whiteSpace: "nowrap"
  },
  rowActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    flexWrap: "wrap"
  },
  secondaryLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "#f2f4f7",
    color: "#344054",
    fontSize: "13px",
    fontWeight: 900
  },
  primaryButtonSmall: {
    border: 0,
    padding: "10px 12px",
    borderRadius: "12px",
    background: "#101828",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 900,
    cursor: "pointer"
  },
  assessmentPanel: {
    borderTop: "1px solid #eaecf0",
    background: "#f8fafc",
    padding: "18px"
  },
  assessmentPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },
  assessmentPanelTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "16px"
  },
  assessmentPanelMeta: {
    color: "#667085",
    fontSize: "12px",
    fontWeight: 800
  },
  assessmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px"
  },
  assessmentCard: {
    background: "#ffffff",
    border: "1px solid #eaecf0",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 8px 22px rgba(16, 24, 40, 0.04)"
  },
  assessmentTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px"
  },
  assessmentTypeIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: 900,
    flex: "0 0 auto"
  },
  assessmentTitleBlock: {
    minWidth: 0
  },
  assessmentTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "15px",
    overflowWrap: "anywhere"
  },
  assessmentType: {
    margin: "4px 0 0",
    color: "#667085",
    fontSize: "12px"
  },
  assessmentMiddle: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px"
  },
  assessmentProgressWrap: {
    marginBottom: "12px"
  },
  completedDate: {
    margin: "7px 0 0",
    color: "#667085",
    fontSize: "12px"
  },
  assessmentActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px"
  },
  reportLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    width: "100%",
    padding: "11px 12px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 900
  },
  waitingText: {
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.5
  },
  emptyState: {
    padding: "38px 20px",
    border: "1px dashed #cbd5e1",
    borderRadius: "22px",
    background: "#ffffff",
    textAlign: "center"
  },
  emptyIcon: {
    width: "54px",
    height: "54px",
    margin: "0 auto 12px",
    borderRadius: "18px",
    background: "#eff6ff",
    color: "#175cd3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 900
  },
  emptyTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "18px"
  },
  emptyText: {
    margin: "8px auto 0",
    maxWidth: "520px",
    color: "#667085",
    lineHeight: 1.6,
    fontSize: "14px"
  }
};
