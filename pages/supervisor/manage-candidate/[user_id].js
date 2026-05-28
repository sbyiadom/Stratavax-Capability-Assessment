// pages/supervisor/manage-candidate/[user_id].js

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
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

function getPercentage(result) {
  if (!result) return 0;
  if (result.percentage_score !== null && result.percentage_score !== undefined) {
    return Math.round(toNumber(result.percentage_score, 0));
  }
  const score = toNumber(result.total_score, 0);
  const maxScore = toNumber(result.max_score, 0);
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

function getClassification(percentage) {
  if (percentage >= 85) return { label: "High Potential", color: "#2e7d32", bg: "#e8f5e9" };
  if (percentage >= 70) return { label: "Strong Performer", color: "#1565c0", bg: "#e3f2fd" };
  if (percentage >= 55) return { label: "Developing", color: "#f57c00", bg: "#fff3e0" };
  if (percentage >= 40) return { label: "At Risk", color: "#ef6c00", bg: "#fff3e0" };
  if (percentage > 0) return { label: "High Risk", color: "#c62828", bg: "#ffebee" };
  return { label: "No Data", color: "#667085", bg: "#f2f4f7" };
}

function getInitial(name, email) {
  const source = cleanText(name, cleanText(email, "C"));
  return source.charAt(0).toUpperCase();
}

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

export default function ManageSingleCandidate() {
  const router = useRouter();
  const { user_id } = router.query;

  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [supervisorId, setSupervisorId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(null);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [sharedAccessList, setSharedAccessList] = useState({});

  useEffect(() => {
    if (!router.isReady) return;
    checkAuth();
  }, [router.isReady]);

  async function checkAuth() {
    try {
      setCheckingAuth(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;
      if (!activeSession?.user) {
        router.push("/login");
        return;
      }

      const userId = activeSession.user.id;
      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, full_name, email, role, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "supervisor" && resolvedRole !== "admin") {
        router.push("/");
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setSupervisorId(userId);
      await Promise.all([
        fetchCandidateDetails(userId),
        fetchAvailableSupervisors()
      ]);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchAvailableSupervisors() {
    try {
      const { data, error } = await supabase
        .from("supervisor_profiles")
        .select("id, full_name, email, role")
        .eq("is_active", true)
        .neq("id", supervisorId);
      
      if (!error && data) {
        setAvailableSupervisors(data);
      }
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
  }

  async function fetchSharedAccess(candidateId, assessmentId) {
    try {
      const { data, error } = await supabase
        .from("shared_report_access")
        .select("granted_to, granted_by, expires_at, supervisor_profiles!granted_to(id, full_name, email)")
        .eq("candidate_id", candidateId)
        .eq("assessment_id", assessmentId);
      
      if (!error && data) {
        setSharedAccessList(prev => ({
          ...prev,
          [`${candidateId}_${assessmentId}`]: data
        }));
      }
    } catch (error) {
      console.error("Error fetching shared access:", error);
    }
  }

  async function fetchCandidateDetails(currentSupervisorId) {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      // Check if supervisor has access to this candidate
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidate_profiles")
        .select("*, supervisor:supervisor_profiles(id, full_name, email)")
        .eq("id", user_id)
        .single();

      if (candidateError) {
        setMessage({ type: "error", text: "Candidate not found." });
        setLoading(false);
        return;
      }

      // Check permission (admin or assigned supervisor)
      const isAdmin = currentSupervisorId.role === "admin";
      const isAssignedSupervisor = candidateData.supervisor_id === currentSupervisorId.id;
      
      // Check shared access
      const { data: sharedAccess } = await supabase
        .from("shared_report_access")
        .select("*")
        .eq("candidate_id", user_id)
        .eq("granted_to", currentSupervisorId.id)
        .maybeSingle();
      
      const hasSharedAccess = sharedAccess && (!sharedAccess.expires_at || new Date(sharedAccess.expires_at) > new Date());

      if (!isAdmin && !isAssignedSupervisor && !hasSharedAccess) {
        setMessage({ type: "error", text: "You do not have permission to view this candidate." });
        setLoading(false);
        return;
      }

      setCandidate(candidateData);

      // Fetch assessments for this candidate
      const [resultsResponse, accessResponse] = await Promise.all([
        supabase
          .from("assessment_results")
          .select("id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted, assessment:assessments(id, title, assessment_types(id, name, icon, gradient_start, gradient_end))")
          .eq("user_id", user_id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("candidate_assessments")
          .select("id, assessment_id, status, result_id, created_at, unblocked_at, assessments(id, title, assessment_types(id, name, icon, gradient_start, gradient_end))")
          .eq("user_id", user_id)
      ]);

      if (resultsResponse.error) throw resultsResponse.error;
      if (accessResponse.error) throw accessResponse.error;

      const resultsMap = {};
      safeArray(resultsResponse.data).forEach(result => {
        resultsMap[result.assessment_id] = result;
      });

      const processedAssessments = safeArray(accessResponse.data).map(access => {
        const result = resultsMap[access.assessment_id] || null;
        const assessment = access.assessments || {};
        const type = assessment.assessment_types || {};
        
        return {
          id: access.id,
          assessment_id: access.assessment_id,
          title: assessment.title || "Unknown Assessment",
          type_name: type.name || "General",
          type_icon: type.icon || "📋",
          type_gradient_start: type.gradient_start || "#0f766e",
          type_gradient_end: type.gradient_end || "#14b8a6",
          status: result ? "completed" : access.status,
          result,
          completed_at: result?.completed_at,
          score: result?.total_score,
          max_score: result?.max_score,
          percentage: result?.percentage_score
        };
      });

      setAssessments(processedAssessments);
      
      // Fetch shared access for each assessment
      processedAssessments.forEach(assessment => {
        fetchSharedAccess(user_id, assessment.assessment_id);
      });

    } catch (error) {
      console.error("Error fetching candidate:", error);
      setMessage({ type: "error", text: "Failed to load candidate data." });
    } finally {
      setLoading(false);
    }
  }

  function clearMessagesAfterDelay() {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  }

  async function grantReportAccess(candidateId, assessmentId, targetSupervisorId, expiresInDays, assessmentTitle, candidateName) {
    if (!targetSupervisorId) {
      alert("Please select a supervisor");
      return;
    }

    setSharingInProgress(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;

      const response = await fetch("/api/supervisor/grant-report-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({
          candidateId,
          assessmentId,
          targetSupervisorId,
          expiresInDays: expiresInDays || 30
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Failed to grant access.");
      }

      setMessage({ type: "success", text: `Report access granted to ${result.data?.granted_to_name || "supervisor"} for ${candidateName} - ${assessmentTitle}` });
      
      await fetchSharedAccess(candidateId, assessmentId);
      setShowShareModal(null);
    } catch (error) {
      console.error("Grant access error:", error);
      setMessage({ type: "error", text: "Failed to grant access: " + getReadableError(error) });
    } finally {
      setSharingInProgress(false);
      clearMessagesAfterDelay();
    }
  }

  async function revokeReportAccess(candidateId, assessmentId, targetSupervisorId, targetSupervisorName) {
    if (!confirm(`Revoke report access for ${targetSupervisorName}?`)) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || null;

      const response = await fetch("/api/supervisor/revoke-report-access", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {})
        },
        body: JSON.stringify({
          candidateId,
          assessmentId,
          targetSupervisorId
        })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Failed to revoke access.");
      }

      setMessage({ type: "success", text: `Access revoked for ${targetSupervisorName}` });
      await fetchSharedAccess(candidateId, assessmentId);
    } catch (error) {
      console.error("Revoke access error:", error);
      setMessage({ type: "error", text: "Failed to revoke access: " + getReadableError(error) });
    } finally {
      clearMessagesAfterDelay();
    }
  }

  function openShareModal(assessment) {
    fetchSharedAccess(user_id, assessment.assessment_id);
    setShowShareModal({
      candidateId: user_id,
      candidateName: candidate?.full_name || candidate?.email || "Candidate",
      assessmentId: assessment.assessment_id,
      assessmentTitle: assessment.title,
      assessment
    });
  }

  if (checkingAuth || !router.isReady) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Loading...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.backButtonContainer}>
          <button onClick={() => router.push("/supervisor")} style={styles.backButton}>← Back to Dashboard</button>
        </div>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Candidate</h1>
            {candidate && (
              <p style={styles.subtitle}>
                {candidate.full_name || "Candidate"} • {candidate.email || "No email"}
              </p>
            )}
          </div>
          <div style={styles.headerButtons}>
            <button onClick={() => fetchCandidateDetails(supervisorId)} style={styles.refreshButton}>Refresh</button>
          </div>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === "success" ? "#e8f5e9" : "#ffebee",
            color: message.type === "success" ? "#2e7d32" : "#c62828",
            border: "1px solid " + (message.type === "success" ? "#a5d6a7" : "#ffcdd2")
          }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading assessments...</div>
        ) : (
          <div style={styles.tableContainer}>
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Assessment</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Score</th>
                    <th style={styles.th}>Completed Date</th>
                    <th style={styles.th}>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {assessments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={styles.noData}>
                        No assessments found for this candidate.
                      </td>
                    </tr>
                  ) : (
                    assessments.map((assessment) => {
                      const percentage = getPercentage(assessment.result);
                      const classification = getClassification(percentage);
                      const sharedKey = `${user_id}_${assessment.assessment_id}`;
                      const sharedWith = sharedAccessList[sharedKey] || [];
                      const isCompleted = assessment.status === "completed" || assessment.result;

                      return (
                        <React.Fragment key={assessment.id}>
                          <tr style={styles.tableRow}>
                            <td style={styles.td}>
                              <div style={styles.assessmentInfo}>
                                <div style={{ ...styles.assessmentIcon, background: `linear-gradient(135deg, ${assessment.type_gradient_start} 0%, ${assessment.type_gradient_end} 100%)` }}>
                                  {assessment.type_icon}
                                </div>
                                <div>
                                  <div style={styles.assessmentTitle}>{assessment.title}</div>
                                  <div style={styles.assessmentType}>{assessment.type_name}</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.td}>{assessment.type_name}</td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.statusBadge,
                                background: isCompleted ? "#e8f5e9" : assessment.status === "unblocked" ? "#e3f2fd" : "#fff3e0",
                                color: isCompleted ? "#2e7d32" : assessment.status === "unblocked" ? "#1565c0" : "#f57c00"
                              }}>
                                {isCompleted ? "Completed" : assessment.status === "unblocked" ? "Ready" : "Blocked"}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {isCompleted ? (
                                <span style={{ ...styles.scoreBadge, background: classification.bg, color: classification.color }}>
                                  {percentage}%
                                </span>
                              ) : (
                                <span style={styles.noScore}>—</span>
                              )}
                            </td>
                            <td style={styles.td}>
                              {assessment.completed_at ? formatDate(assessment.completed_at) : "—"}
                            </td>
                            <td style={styles.td}>
                              <div style={styles.actionGroup}>
                                {isCompleted && (
                                  <Link href={`/supervisor/${user_id}?assessment=${assessment.assessment_id}`} legacyBehavior>
                                    <a style={styles.viewButton}>View Report</a>
                                  </Link>
                                )}
                                <button
                                  onClick={() => openShareModal(assessment)}
                                  style={styles.shareButton}
                                >
                                  🔗 Share
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {sharedWith.length > 0 && (
                            <tr style={styles.sharedRow}>
                              <td colSpan="6" style={styles.sharedCell}>
                                <div style={styles.sharedAccessList}>
                                  <div style={styles.sharedAccessHeader}>Shared with:</div>
                                  {sharedWith.map(access => (
                                    <div key={access.granted_to} style={styles.sharedAccessItem}>
                                      <span>{access.supervisor_profiles?.full_name || access.granted_to}</span>
                                      <button
                                        onClick={() => revokeReportAccess(user_id, assessment.assessment_id, access.granted_to, access.supervisor_profiles?.full_name)}
                                        style={styles.revokeButton}
                                      >
                                        Revoke
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.shareModal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>🔗</span>
              <h3 style={styles.modalTitle}>Share Report</h3>
              <button onClick={() => setShowShareModal(null)} style={styles.closeButton}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p><strong>Candidate:</strong> {showShareModal.candidateName}</p>
              <p><strong>Assessment:</strong> {showShareModal.assessmentTitle}</p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Select Supervisor:</label>
                <select id="supervisorSelect" style={styles.select} defaultValue="">
                  <option value="">-- Select a supervisor --</option>
                  {availableSupervisors.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.full_name || sup.email} {sup.role === 'admin' ? '(Admin)' : ''}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Access Duration:</label>
                <select id="durationSelect" style={styles.select} defaultValue="30">
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="">No expiration</option>
                </select>
              </div>

              <div style={styles.noteBox}>
                <span>💡</span>
                <span>The supervisor will receive a notification and can view this report from their dashboard.</span>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowShareModal(null)} style={styles.cancelButton}>Cancel</button>
              <button
                onClick={() => {
                  const supervisorIdSelected = document.getElementById("supervisorSelect").value;
                  const days = document.getElementById("durationSelect").value;
                  if (!supervisorIdSelected) {
                    alert("Please select a supervisor");
                    return;
                  }
                  grantReportAccess(
                    showShareModal.candidateId,
                    showShareModal.assessmentId,
                    supervisorIdSelected,
                    days ? parseInt(days) : null,
                    showShareModal.assessmentTitle,
                    showShareModal.candidateName
                  );
                }}
                disabled={sharingInProgress}
                style={{ ...styles.grantButton, opacity: sharingInProgress ? 0.7 : 1 }}
              >
                {sharingInProgress ? "Granting..." : "Grant Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

const styles = {
  checkingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)", color: "white", padding: "20px", textAlign: "center" },
  spinner: { width: "42px", height: "42px", border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid white", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "18px" },
  checkingText: { margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "14px" },
  container: { maxWidth: "1400px", margin: "0 auto", padding: "40px 20px" },
  backButtonContainer: { marginBottom: "20px" },
  backButton: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#0a1929", cursor: "pointer" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "24px", background: "white", padding: "22px 30px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", flexWrap: "wrap" },
  headerButtons: { display: "flex", gap: "12px", flexWrap: "wrap" },
  title: { fontSize: "24px", fontWeight: 800, color: "#0a1929", margin: "0 0 5px" },
  subtitle: { fontSize: "14px", color: "#667085", margin: 0 },
  refreshButton: { padding: "12px 20px", background: "#1565c0", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" },
  message: { padding: "12px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", lineHeight: 1.5 },
  tableContainer: { background: "white", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "800px" },
  tableHeadRow: { background: "#f8fafc", borderBottom: "2px solid #0a1929" },
  th: { textAlign: "left", padding: "15px 20px", fontWeight: 800, color: "#0a1929" },
  td: { padding: "15px 20px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  tableRow: { background: "white" },
  sharedRow: { background: "#f8fafc" },
  noData: { padding: "40px", textAlign: "center", color: "#718096", fontStyle: "italic" },
  loading: { textAlign: "center", padding: "60px", color: "#667085", background: "white", borderRadius: "16px" },
  assessmentInfo: { display: "flex", alignItems: "center", gap: "12px" },
  assessmentIcon: { width: "40px", height: "40px", borderRadius: "10px", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" },
  assessmentTitle: { fontWeight: 700, color: "#0a1929", marginBottom: "2px" },
  assessmentType: { fontSize: "11px", color: "#718096" },
  statusBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 },
  scoreBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 },
  noScore: { fontSize: "12px", color: "#9e9e9e", fontStyle: "italic" },
  actionGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
  viewButton: { padding: "6px 12px", background: "#0a1929", color: "white", borderRadius: "6px", fontSize: "12px", textDecoration: "none", cursor: "pointer", display: "inline-block" },
  shareButton: { padding: "6px 12px", background: "#8b5cf6", color: "white", borderRadius: "6px", fontSize: "12px", border: "none", cursor: "pointer" },
  revokeButton: { background: "#ef4444", color: "white", border: "none", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", cursor: "pointer" },
  sharedAccessList: { display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "center" },
  sharedAccessHeader: { fontSize: "11px", color: "#667085", fontWeight: 700 },
  sharedAccessItem: { display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", background: "#e2e8f0", padding: "4px 10px", borderRadius: "20px" },
  sharedCell: { padding: "10px 20px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(5px)" },
  shareModal: { background: "white", borderRadius: "20px", maxWidth: "500px", width: "100%", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "2px solid #e2e8f0", background: "#f8fafc" },
  modalIcon: { fontSize: "28px" },
  modalTitle: { margin: 0, fontSize: "18px", color: "#0a1929" },
  closeButton: { background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#667085", padding: "4px 8px", borderRadius: "8px" },
  modalBody: { padding: "24px", overflowY: "auto", flex: 1 },
  formGroup: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontWeight: 700, color: "#0a1929", fontSize: "14px" },
  select: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", background: "white" },
  noteBox: { marginTop: "20px", padding: "12px", background: "#e3f2fd", borderRadius: "8px", display: "flex", gap: "12px", fontSize: "13px", color: "#1565c0" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" },
  cancelButton: { padding: "10px 24px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", color: "#475569" },
  grantButton: { padding: "10px 24px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 800, cursor: "pointer" }
};
