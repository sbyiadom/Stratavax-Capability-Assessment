// pages/supervisor/manage-candidate/[id].js

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../supabase/client";

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

function initials(value) {
  var text = safeText(value, "C").trim();
  var parts = text.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return text ? text[0].toUpperCase() : "C";
}

function calculatePercentage(score, maxScore, fallbackPercentage) {
  var scoreValue = safeNumber(score, null);
  var maxValue = safeNumber(maxScore, null);
  var fallbackValue = safeNumber(fallbackPercentage, null);

  if (scoreValue !== null && maxValue !== null && maxValue > 0) {
    return Math.round((scoreValue / maxValue) * 100);
  }

  if (fallbackValue !== null && fallbackValue !== undefined && Number.isFinite(Number(fallbackValue))) {
    return Math.round(Number(fallbackValue));
  }

  return 0;
}

function getClassification(percentage) {
  var value = safeNumber(percentage, 0);
  if (value >= 85) return { label: "Exceptional", color: "#0f766e", bg: "#ecfdf3" };
  if (value >= 75) return { label: "Strong Performer", color: "#2563eb", bg: "#eff6ff" };
  if (value >= 65) return { label: "Capable", color: "#4f46e5", bg: "#eef2ff" };
  if (value >= 55) return { label: "Developing", color: "#d97706", bg: "#fffaeb" };
  if (value >= 40) return { label: "At Risk", color: "#ea580c", bg: "#fff7ed" };
  if (value > 0) return { label: "High Risk", color: "#b42318", bg: "#fef3f2" };
  return { label: "No Data", color: "#667085", bg: "#f2f4f7" };
}

function getStatus(assessment) {
  if (assessment.result || assessment.status === "completed") return { label: "Completed", color: "#027a48", bg: "#ecfdf3", icon: "✓" };
  if (assessment.status === "unblocked") return { label: "Ready", color: "#175cd3", bg: "#eff8ff", icon: "↗" };
  if (assessment.status === "blocked") return { label: "Blocked", color: "#c2410c", bg: "#fff7ed", icon: "●" };
  return { label: safeText(assessment.status, "Scheduled"), color: "#475467", bg: "#f2f4f7", icon: "•" };
}

function assessmentTypeName(value) {
  if (!value || value === "general") return "General";
  return String(value).replace(/_/g, " ").replace(/-/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

function Pill(props) {
  return <span style={{ ...styles.pill, color: props.color, background: props.bg }}>{props.children}</span>;
}

function ProgressBar(props) {
  var value = safeNumber(props.value, 0);
  if (value < 0) value = 0;
  if (value > 100) value = 100;
  return <div style={styles.progressTrack}><div style={{ width: value + "%", height: "100%", background: props.color, borderRadius: "999px" }} /></div>;
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

export default function ManageCandidate() {
  var router = useRouter();
  var candidateId = router.query.id || router.query.user_id || router.query.candidate_id;

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var candidateState = useState(null);
  var candidate = candidateState[0];
  var setCandidate = candidateState[1];

  var assessmentsState = useState([]);
  var assessments = assessmentsState[0];
  var setAssessments = assessmentsState[1];

  var supervisorState = useState(null);
  var supervisor = supervisorState[0];
  var setSupervisor = supervisorState[1];

  var messageState = useState(null);
  var message = messageState[0];
  var setMessage = messageState[1];

  var processingState = useState(null);
  var processingId = processingState[0];
  var setProcessingId = processingState[1];

  var modalState = useState(null);
  var unblockModal = modalState[0];
  var setUnblockModal = modalState[1];

  var timeState = useState(30);
  var timeExtension = timeState[0];
  var setTimeExtension = timeState[1];

  var resetState = useState(false);
  var resetFullTime = resetState[0];
  var setResetFullTime = resetState[1];

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
            setSupervisor({
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
          setSupervisor({ id: session.user_id, email: session.email, name: session.full_name || session.email, role: session.role });
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
    if (!router.isReady || !candidateId || !supervisor) return;

    var cancelled = false;

    async function loadData() {
      var isAdmin;
      var candidateResponse;
      var candidateData;
      var supervisorName = "Unassigned";
      var supervisorResponse;
      var resultsResponse;
      var accessResponse;
      var resultsMap = {};
      var accessData;
      var ids;
      var assessmentResponse;
      var assessmentMap = {};
      var mappedAssessments;

      setLoading(true);
      setMessage(null);

      try {
        isAdmin = supervisor.role === "admin";

        candidateResponse = await supabase.from("candidate_profiles").select("*").eq("id", candidateId).single();
        if (candidateResponse.error) throw candidateResponse.error;
        candidateData = candidateResponse.data;

        if (!isAdmin && candidateData.supervisor_id !== supervisor.id) {
          router.push("/supervisor");
          return;
        }

        if (candidateData.supervisor_id) {
          supervisorResponse = await supabase.from("supervisor_profiles").select("full_name").eq("id", candidateData.supervisor_id).single();
          if (supervisorResponse.data && supervisorResponse.data.full_name) supervisorName = supervisorResponse.data.full_name;
        }

        resultsResponse = await supabase
          .from("assessment_results")
          .select("id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted, violation_count")
          .eq("user_id", candidateId);

        safeArray(resultsResponse.data).forEach(function (result) {
          resultsMap[result.assessment_id] = {
            id: result.id,
            score: result.total_score,
            max_score: result.max_score,
            percentage: result.percentage_score,
            completed_at: result.completed_at,
            is_valid: result.is_valid,
            is_auto_submitted: result.is_auto_submitted,
            violation_count: result.violation_count
          };
        });

        accessResponse = await supabase
          .from("candidate_assessments")
          .select("id, assessment_id, status, created_at, unblocked_at, result_id")
          .eq("user_id", candidateId);

        if (accessResponse.error) throw accessResponse.error;
        accessData = safeArray(accessResponse.data);
        ids = Array.from(new Set(accessData.map(function (item) { return item.assessment_id; }).filter(Boolean)));

        if (ids.length > 0) {
          assessmentResponse = await supabase
            .from("assessments")
            .select("id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end)")
            .in("id", ids);

          safeArray(assessmentResponse.data).forEach(function (assessment) {
            assessmentMap[assessment.id] = assessment;
          });
        }

        mappedAssessments = accessData.map(function (access) {
          var assessment = assessmentMap[access.assessment_id] || {};
          var type = assessment.assessment_types || {};
          var result = resultsMap[access.assessment_id] || null;
          var status = access.status;
          var code = type.code || "general";

          if (result || access.result_id || status === "completed") status = "completed";

          return {
            id: access.id,
            assessment_id: access.assessment_id,
            assessment_title: assessment.title || "Unknown Assessment",
            assessment_description: assessment.description || "",
            assessment_type: code,
            assessment_type_name: type.name || assessmentTypeName(code),
            type_icon: type.icon || "📋",
            type_gradient_start: type.gradient_start || "#0f766e",
            type_gradient_end: type.gradient_end || "#14b8a6",
            status: status,
            created_at: access.created_at,
            unblocked_at: access.unblocked_at,
            result: result
          };
        });

        mappedAssessments.sort(function (a, b) {
          if (a.result && !b.result) return -1;
          if (!a.result && b.result) return 1;
          return new Date((b.result && b.result.completed_at) || b.created_at || 0).getTime() - new Date((a.result && a.result.completed_at) || a.created_at || 0).getTime();
        });

        if (!cancelled) {
          setCandidate({ ...candidateData, supervisor_name: supervisorName });
          setAssessments(mappedAssessments);
        }
      } catch (error) {
        if (!cancelled) setMessage({ type: "error", text: "Failed to load candidate data: " + (error && error.message ? error.message : "Unknown error") });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return function () {
      cancelled = true;
    };
  }, [router.isReady, candidateId, supervisor, router]);

  var completedCount = assessments.filter(function (item) { return item.result || item.status === "completed"; }).length;
  var readyCount = assessments.filter(function (item) { return item.status === "unblocked" && !item.result; }).length;
  var blockedCount = assessments.filter(function (item) { return item.status === "blocked" && !item.result; }).length;
  var completionRate = assessments.length > 0 ? Math.round((completedCount / assessments.length) * 100) : 0;

  var latestCompleted = useMemo(function () {
    var completed = assessments.filter(function (item) { return item.result; });
    completed.sort(function (a, b) {
      return new Date((b.result && b.result.completed_at) || 0).getTime() - new Date((a.result && a.result.completed_at) || 0).getTime();
    });
    return completed.length > 0 ? completed[0] : null;
  }, [assessments]);

  var latestPercentage = latestCompleted && latestCompleted.result ? calculatePercentage(latestCompleted.result.score, latestCompleted.result.max_score, latestCompleted.result.percentage) : 0;
  var latestClassification = getClassification(latestPercentage);

  function showMessage(type, text) {
    setMessage({ type: type, text: text });
    setTimeout(function () { setMessage(null); }, 6000);
  }

  async function handleUnblock(assessmentId, assessmentTitle) {
    var response;
    var result;
    var text;

    setProcessingId(assessmentId);

    try {
      response = await fetch("/api/supervisor/unblock-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: candidateId,
          assessmentId: assessmentId,
          extendMinutes: resetFullTime ? 0 : timeExtension,
          resetTime: resetFullTime,
          performed_by: supervisor.id
        })
      });

      result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || result.error || "Unblock failed");

      text = "✓ " + assessmentTitle + " unblocked successfully. ";
      if (resetFullTime) text += "Time reset to full time. ";
      else if (timeExtension > 0) text += "Time extended by " + timeExtension + " minutes. ";
      text += result.hasExistingProgress ? "Candidate can continue where they left off." : "Candidate can start a new session.";

      setAssessments(function (previous) {
        return previous.map(function (item) {
          return item.assessment_id === assessmentId ? { ...item, status: "unblocked" } : item;
        });
      });

      showMessage("success", text);
    } catch (error) {
      showMessage("error", "Failed to unblock assessment: " + (error && error.message ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
      setUnblockModal(null);
      setTimeExtension(30);
      setResetFullTime(false);
    }
  }

  async function handleBlock(assessmentId, assessmentTitle) {
    if (!window.confirm("Block \"" + assessmentTitle + "\"?")) return;
    setProcessingId(assessmentId);
    try {
      await supabase.from("candidate_assessments").update({ status: "blocked" }).eq("user_id", candidateId).eq("assessment_id", assessmentId);
      setAssessments(function (previous) {
        return previous.map(function (item) { return item.assessment_id === assessmentId ? { ...item, status: "blocked" } : item; });
      });
      showMessage("success", "Assessment blocked successfully.");
    } catch (error) {
      showMessage("error", "Failed to block assessment: " + (error && error.message ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReset(assessmentId, assessmentTitle) {
    if (!window.confirm("Reset \"" + assessmentTitle + "\"?\n\nThis will delete all progress and results for this assessment.")) return;
    setProcessingId(assessmentId);
    try {
      await supabase.from("responses").delete().eq("user_id", candidateId).eq("assessment_id", assessmentId);
      await supabase.from("assessment_sessions").delete().eq("user_id", candidateId).eq("assessment_id", assessmentId);
      await supabase.from("assessment_results").delete().eq("user_id", candidateId).eq("assessment_id", assessmentId);
      await supabase.from("assessment_progress").delete().eq("user_id", candidateId).eq("assessment_id", assessmentId);
      await supabase.from("candidate_assessments").update({ status: "blocked", unblocked_at: null, result_id: null }).eq("user_id", candidateId).eq("assessment_id", assessmentId);
      setAssessments(function (previous) {
        return previous.map(function (item) { return item.assessment_id === assessmentId ? { ...item, status: "blocked", result: null } : item; });
      });
      showMessage("success", "Assessment reset successfully.");
    } catch (error) {
      showMessage("error", "Failed to reset assessment: " + (error && error.message ? error.message : "Unknown error"));
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.centerLoader}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading candidate information...</p>
        </div>
        <style jsx>{spinStyles}</style>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.notFoundCard}>
          <div style={styles.notFoundIcon}>👤</div>
          <h2 style={styles.notFoundTitle}>Candidate Not Found</h2>
          <p style={styles.notFoundText}>The candidate does not exist or you do not have access.</p>
          <Link href="/supervisor" style={styles.primaryLink}>Back to Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.pageShell}>
        <div style={styles.heroCard}>
          <div style={styles.heroTopRow}>
            <Link href="/supervisor" style={styles.backLink}>← Back to Dashboard</Link>
            <div style={styles.heroActions}>
              {latestCompleted && <Link href={`/supervisor/${candidate.id}?assessment=${latestCompleted.assessment_id}`} style={styles.reportHeroLink}>View Latest Report</Link>}
              <Link href={`/supervisor/assign-assessment/${candidate.id}`} style={styles.assignLink}>+ Assign Assessment</Link>
            </div>
          </div>

          <div style={styles.profileRow}>
            <div style={styles.avatar}>{initials(candidate.full_name || candidate.email)}</div>
            <div style={styles.profileMain}>
              <div style={styles.profileBadge}>Candidate Profile</div>
              <h1 style={styles.profileName}>{safeText(candidate.full_name, "Unnamed Candidate")}</h1>
              <div style={styles.profileMetaGrid}>
                <span>{safeText(candidate.email, "No email provided")}</span>
                {candidate.phone && <span>Phone: {candidate.phone}</span>}
                <span>Supervisor: {safeText(candidate.supervisor_name, "Unassigned")}</span>
                <span>Joined: {formatDate(candidate.created_at)}</span>
              </div>
            </div>
            <div style={styles.latestScoreCard}>
              <p style={styles.latestScoreLabel}>Latest Score</p>
              <p style={{ ...styles.latestScoreValue, color: latestClassification.color }}>{latestCompleted ? latestPercentage + "%" : "N/A"}</p>
              <ProgressBar value={latestPercentage} color={latestClassification.color} />
              <div style={styles.latestScoreFooter}><Pill color={latestClassification.color} bg={latestClassification.bg}>{latestClassification.label}</Pill></div>
            </div>
          </div>
        </div>

        {message && <div style={message.type === "success" ? styles.successMessage : styles.errorMessage}>{message.text}</div>}

        <div style={styles.statsGrid}>
          <StatCard icon="📋" label="Total" value={assessments.length} note="Assigned assessments" background="linear-gradient(135deg, #0f172a 0%, #334155 100%)" />
          <StatCard icon="✓" label="Completed" value={completedCount} note={completionRate + "% complete"} background="linear-gradient(135deg, #047857 0%, #34d399 100%)" />
          <StatCard icon="↗" label="Ready" value={readyCount} note="Available to candidate" background="linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)" />
          <StatCard icon="●" label="Blocked" value={blockedCount} note="Locked assessments" background="linear-gradient(135deg, #c2410c 0%, #fb923c 100%)" />
        </div>

        <div style={styles.contentCard}>
          <div style={styles.contentHeader}>
            <div>
              <h2 style={styles.contentTitle}>Assessments</h2>
              <p style={styles.contentSubtitle}>Manage assessment status, reports, resets, and release access.</p>
            </div>
            <Pill color="#175cd3" bg="#eff8ff">{assessments.length} assigned</Pill>
          </div>

          {assessments.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h3 style={styles.emptyTitle}>No assessments assigned</h3>
              <p style={styles.emptyText}>Assign an assessment to make it available for this candidate.</p>
              <Link href={`/supervisor/assign-assessment/${candidate.id}`} style={styles.primaryLink}>+ Assign Assessment</Link>
            </div>
          ) : (
            <div style={styles.assessmentGrid}>
              {assessments.map(function (assessment) {
                var status = getStatus(assessment);
                var hasResult = assessment.result !== null;
                var percentage = hasResult ? calculatePercentage(assessment.result.score, assessment.result.max_score, assessment.result.percentage) : 0;
                var classification = getClassification(percentage);
                var isProcessing = processingId === assessment.assessment_id;

                return (
                  <article key={assessment.id} style={styles.assessmentCard}>
                    <div style={styles.assessmentCardTop}>
                      <div style={{ ...styles.assessmentIcon, background: "linear-gradient(135deg, " + assessment.type_gradient_start + " 0%, " + assessment.type_gradient_end + " 100%)" }}>{assessment.type_icon}</div>
                      <div style={styles.assessmentTitleBlock}>
                        <h3 style={styles.assessmentTitle}>{assessment.assessment_title}</h3>
                        <p style={styles.assessmentType}>{assessment.assessment_type_name}</p>
                      </div>
                    </div>

                    <div style={styles.assessmentPills}>
                      <Pill color={status.color} bg={status.bg}>{status.icon} {status.label}</Pill>
                      {hasResult && <Pill color={classification.color} bg={classification.bg}>{classification.label}</Pill>}
                      {hasResult && assessment.result.is_auto_submitted && <Pill color="#b42318" bg="#fef3f2">Auto-submitted</Pill>}
                    </div>

                    {hasResult ? (
                      <div style={styles.resultBox}>
                        <div style={styles.resultTopLine}>
                          <strong style={{ color: classification.color, fontSize: "28px" }}>{percentage}%</strong>
                          <span style={styles.resultScore}>{safeNumber(assessment.result.score, 0)}/{safeNumber(assessment.result.max_score, 0)}</span>
                        </div>
                        <ProgressBar value={percentage} color={classification.color} />
                        <p style={styles.resultMeta}>Completed: {formatDate(assessment.result.completed_at)}</p>
                        {assessment.result.is_auto_submitted && <p style={styles.autoSubmitText}>Auto-submitted after {safeNumber(assessment.result.violation_count, 0)}/3 violation(s).</p>}
                      </div>
                    ) : (
                      <div style={styles.pendingBox}>
                        <p style={styles.pendingText}>{assessment.status === "unblocked" ? "Candidate can currently access this assessment." : assessment.status === "blocked" ? "This assessment is currently blocked." : "Assessment is awaiting candidate action."}</p>
                        <p style={styles.resultMeta}>Assigned: {formatDate(assessment.created_at)}</p>
                        {assessment.unblocked_at && <p style={styles.resultMeta}>Last unblocked: {formatDate(assessment.unblocked_at)}</p>}
                      </div>
                    )}

                    <div style={styles.cardActions}>
                      {hasResult ? (
                        <React.Fragment>
                          <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={styles.reportLink}>View Report</Link>
                          <button type="button" onClick={function () { handleReset(assessment.assessment_id, assessment.assessment_title); }} disabled={isProcessing} style={styles.resetButton}>{isProcessing ? "Processing..." : "Reset"}</button>
                        </React.Fragment>
                      ) : assessment.status === "blocked" ? (
                        <button type="button" onClick={function () { setUnblockModal({ assessmentId: assessment.assessment_id, assessmentTitle: assessment.assessment_title }); }} disabled={isProcessing} style={styles.unblockButton}>{isProcessing ? "Processing..." : "Unblock"}</button>
                      ) : (
                        <button type="button" onClick={function () { handleBlock(assessment.assessment_id, assessment.assessment_title); }} disabled={isProcessing} style={styles.blockButton}>{isProcessing ? "Processing..." : "Block"}</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {unblockModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}>↗</div>
              <div>
                <h3 style={styles.modalTitle}>Unblock Assessment</h3>
                <p style={styles.modalSubtitle}>{unblockModal.assessmentTitle}</p>
              </div>
              <button type="button" onClick={function () { setUnblockModal(null); }} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalText}><strong>Candidate:</strong> {candidate.full_name}</p>
              <p style={styles.modalText}><strong>Assessment:</strong> {unblockModal.assessmentTitle}</p>
              <div style={styles.optionStack}>
                <h4 style={styles.optionTitle}>Time Options</h4>
                {[30, 60, 120].map(function (minutes) {
                  return (
                    <label key={minutes} style={styles.optionRow}>
                      <input type="radio" checked={!resetFullTime && timeExtension === minutes} onChange={function () { setResetFullTime(false); setTimeExtension(minutes); }} />
                      <span><strong>Extend by {minutes} minutes</strong><br /><small>Add {minutes} minutes to remaining time</small></span>
                    </label>
                  );
                })}
                <label style={styles.optionRow}>
                  <input type="radio" checked={resetFullTime} onChange={function () { setResetFullTime(true); }} />
                  <span><strong>Reset to full time</strong><br /><small>Reset timer to full assessment duration</small></span>
                </label>
                <label style={styles.optionRow}>
                  <input type="radio" checked={!resetFullTime && timeExtension === 0} onChange={function () { setResetFullTime(false); setTimeExtension(0); }} />
                  <span><strong>No time change</strong><br /><small>Only unblock access without changing time</small></span>
                </label>
              </div>
              <div style={styles.infoBox}>Existing answers are preserved. The candidate can continue from where they stopped if previous progress exists.</div>
            </div>
            <div style={styles.modalFooter}>
              <button type="button" onClick={function () { setUnblockModal(null); }} style={styles.cancelButton}>Cancel</button>
              <button type="button" onClick={function () { handleUnblock(unblockModal.assessmentId, unblockModal.assessmentTitle); }} disabled={processingId === unblockModal.assessmentId} style={styles.modalPrimaryButton}>{processingId === unblockModal.assessmentId ? "Processing..." : "Unblock Assessment"}</button>
            </div>
          </div>
        </div>
      )}

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
  pageShell: { maxWidth: "1280px", margin: "0 auto", padding: "30px 20px 48px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' },
  centerLoader: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "16px" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(15, 23, 42, 0.15)", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 1s linear infinite" },
  loadingText: { margin: 0, color: "#475467", fontSize: "14px" },
  notFoundCard: { textAlign: "center", padding: "60px 24px", background: "#ffffff", borderRadius: "24px", margin: "40px auto", maxWidth: "520px", boxShadow: "0 20px 56px rgba(16,24,40,0.1)" },
  notFoundIcon: { fontSize: "60px", marginBottom: "16px" },
  notFoundTitle: { margin: 0, color: "#101828" },
  notFoundText: { color: "#667085", lineHeight: 1.6 },
  heroCard: { background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0f766e 100%)", color: "#ffffff", borderRadius: "30px", padding: "28px", marginBottom: "20px", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)" },
  heroTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "22px" },
  backLink: { color: "#ffffff", textDecoration: "none", padding: "9px 14px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", fontSize: "13px", fontWeight: 900 },
  heroActions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  reportHeroLink: { color: "#ffffff", textDecoration: "none", padding: "10px 16px", borderRadius: "14px", background: "rgba(255,255,255,0.16)", fontSize: "13px", fontWeight: 900 },
  assignLink: { color: "#101828", textDecoration: "none", padding: "10px 16px", borderRadius: "14px", background: "#ffffff", fontSize: "13px", fontWeight: 900 },
  profileRow: { display: "grid", gridTemplateColumns: "92px minmax(0, 1fr) 300px", gap: "20px", alignItems: "center" },
  avatar: { width: "82px", height: "82px", borderRadius: "28px", background: "rgba(255,255,255,0.18)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 900, border: "1px solid rgba(255,255,255,0.24)" },
  profileMain: { minWidth: 0 },
  profileBadge: { display: "inline-flex", padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.14)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" },
  profileName: { margin: 0, color: "#ffffff", fontSize: "36px", lineHeight: 1.08, overflowWrap: "anywhere" },
  profileMetaGrid: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px", color: "rgba(255,255,255,0.78)", fontSize: "13px" },
  latestScoreCard: { background: "rgba(255,255,255,0.95)", color: "#101828", borderRadius: "22px", padding: "20px", boxShadow: "0 18px 45px rgba(15,23,42,0.16)" },
  latestScoreLabel: { margin: 0, color: "#667085", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" },
  latestScoreValue: { margin: "8px 0 10px", fontSize: "42px", lineHeight: 1, fontWeight: 900 },
  latestScoreFooter: { marginTop: "12px" },
  successMessage: { padding: "14px 18px", borderRadius: "16px", marginBottom: "18px", background: "#ecfdf3", color: "#027a48", border: "1px solid #bbf7d0", fontWeight: 800 },
  errorMessage: { padding: "14px 18px", borderRadius: "16px", marginBottom: "18px", background: "#fef3f2", color: "#b42318", border: "1px solid #fecaca", fontWeight: 800 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" },
  statCard: { display: "flex", alignItems: "center", gap: "14px", padding: "20px", borderRadius: "22px", color: "#ffffff", minHeight: "96px", boxShadow: "0 18px 42px rgba(15,23,42,0.14)" },
  statIcon: { width: "46px", height: "46px", borderRadius: "16px", background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900 },
  statLabel: { margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { margin: "4px 0 0", color: "#ffffff", fontSize: "30px", lineHeight: 1, fontWeight: 900 },
  statNote: { margin: "5px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "12px" },
  contentCard: { background: "rgba(255,255,255,0.96)", border: "1px solid #eaecf0", borderRadius: "26px", padding: "22px", boxShadow: "0 20px 56px rgba(16,24,40,0.09)" },
  contentHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px" },
  contentTitle: { margin: 0, color: "#101828", fontSize: "24px" },
  contentSubtitle: { margin: "5px 0 0", color: "#667085", fontSize: "13px" },
  assessmentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "14px" },
  assessmentCard: { background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "22px", padding: "18px", boxShadow: "0 10px 28px rgba(16,24,40,0.05)" },
  assessmentCardTop: { display: "grid", gridTemplateColumns: "46px minmax(0,1fr)", gap: "12px", alignItems: "center", marginBottom: "14px" },
  assessmentIcon: { width: "44px", height: "44px", borderRadius: "15px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 900 },
  assessmentTitleBlock: { minWidth: 0 },
  assessmentTitle: { margin: 0, color: "#101828", fontSize: "16px", overflowWrap: "anywhere" },
  assessmentType: { margin: "4px 0 0", color: "#667085", fontSize: "12px" },
  assessmentPills: { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" },
  pill: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", borderRadius: "999px", border: "1px solid transparent", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  resultBox: { background: "#f8fafc", borderRadius: "16px", padding: "14px", marginBottom: "14px" },
  resultTopLine: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" },
  resultScore: { color: "#667085", fontWeight: 900, fontSize: "13px" },
  resultMeta: { margin: "8px 0 0", color: "#667085", fontSize: "12px" },
  autoSubmitText: { margin: "8px 0 0", color: "#b42318", fontSize: "12px", fontWeight: 800 },
  pendingBox: { background: "#f8fafc", borderRadius: "16px", padding: "14px", marginBottom: "14px" },
  pendingText: { margin: 0, color: "#344054", fontSize: "13px", lineHeight: 1.55 },
  progressTrack: { width: "100%", height: "9px", borderRadius: "999px", background: "#e4e7ec", overflow: "hidden" },
  cardActions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  reportLink: { flex: 1, textAlign: "center", textDecoration: "none", padding: "11px 12px", borderRadius: "12px", background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)", color: "#ffffff", fontWeight: 900, fontSize: "13px" },
  unblockButton: { width: "100%", border: 0, padding: "11px 12px", borderRadius: "12px", background: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)", color: "#ffffff", fontWeight: 900, cursor: "pointer" },
  blockButton: { width: "100%", border: 0, padding: "11px 12px", borderRadius: "12px", background: "#c2410c", color: "#ffffff", fontWeight: 900, cursor: "pointer" },
  resetButton: { border: 0, padding: "11px 12px", borderRadius: "12px", background: "#344054", color: "#ffffff", fontWeight: 900, cursor: "pointer" },
  primaryLink: { display: "inline-flex", marginTop: "18px", textDecoration: "none", padding: "11px 16px", borderRadius: "12px", background: "#101828", color: "#ffffff", fontWeight: 900 },
  emptyState: { padding: "44px 20px", border: "1px dashed #cbd5e1", borderRadius: "22px", background: "#ffffff", textAlign: "center" },
  emptyIcon: { width: "54px", height: "54px", margin: "0 auto 12px", borderRadius: "18px", background: "#eff6ff", color: "#175cd3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900 },
  emptyTitle: { margin: 0, color: "#101828", fontSize: "18px" },
  emptyText: { margin: "8px auto 0", maxWidth: "520px", color: "#667085", lineHeight: 1.6, fontSize: "14px" },
  modalBackdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalCard: { background: "#ffffff", borderRadius: "24px", maxWidth: "540px", width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" },
  modalHeader: { display: "grid", gridTemplateColumns: "46px minmax(0, 1fr) 40px", alignItems: "center", gap: "12px", padding: "20px 22px", borderBottom: "1px solid #eaecf0", background: "#f8fafc" },
  modalIcon: { width: "42px", height: "42px", borderRadius: "14px", background: "#eff8ff", color: "#175cd3", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "20px" },
  modalTitle: { margin: 0, color: "#101828", fontSize: "18px" },
  modalSubtitle: { margin: "4px 0 0", color: "#667085", fontSize: "13px", overflowWrap: "anywhere" },
  modalClose: { border: 0, background: "transparent", color: "#667085", fontSize: "28px", cursor: "pointer" },
  modalBody: { padding: "22px", overflowY: "auto" },
  modalText: { margin: "0 0 8px", color: "#344054", fontSize: "14px" },
  optionStack: { marginTop: "18px", display: "grid", gap: "10px" },
  optionTitle: { margin: "0 0 4px", color: "#101828" },
  optionRow: { display: "flex", alignItems: "flex-start", gap: "12px", padding: "13px", borderRadius: "14px", background: "#f8fafc", cursor: "pointer", color: "#344054", lineHeight: 1.45 },
  infoBox: { marginTop: "18px", padding: "13px", borderRadius: "14px", background: "#eff8ff", color: "#175cd3", fontSize: "13px", lineHeight: 1.5 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 22px", borderTop: "1px solid #eaecf0", background: "#f8fafc" },
  cancelButton: { border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", padding: "11px 16px", borderRadius: "12px", cursor: "pointer", fontWeight: 900 },
  modalPrimaryButton: { border: 0, background: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)", color: "#ffffff", padding: "11px 16px", borderRadius: "12px", cursor: "pointer", fontWeight: 900 }
};
