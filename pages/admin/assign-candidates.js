// pages/admin/assign-candidates.js
// COMPLETE FIXED VERSION - Displays ALL assigned supervisors correctly
// FIXED: Properly saves and displays multiple supervisors

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function getInitial(name, email) {
  const source = cleanText(name, cleanText(email, "C"));
  return source.charAt(0).toUpperCase();
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

function getReadableError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error) || "Something went wrong.";
}

export default function AssignCandidates() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [selectedBulkSupervisors, setSelectedBulkSupervisors] = useState([]);
  const [processingCandidate, setProcessingCandidate] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showMultiSelect, setShowMultiSelect] = useState({});

  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      setCheckingAuth(true);
      setMessage({ type: "", text: "" });

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const activeSession = data?.session || null;

      if (!activeSession?.user) {
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      const metadataRole = activeSession.user.user_metadata?.role || null;

      const { data: profile, error: profileError } = await supabase
        .from("supervisor_profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", activeSession.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      const resolvedRole = profile?.role || metadataRole;

      if (resolvedRole !== "admin") {
        setMessage({ type: "error", text: "Admin access is required." });
        router.push("/supervisor");
        return;
      }

      if (profile?.is_active === false) {
        setMessage({ type: "error", text: "This admin account is inactive." });
        await supabase.auth.signOut();
        if (typeof window !== "undefined") localStorage.removeItem("userSession");
        router.push("/login");
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Admin auth error:", error);
      setMessage({ type: "error", text: getReadableError(error) });
      router.push("/login");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const [candidatesResponse, supervisorsResponse] = await Promise.all([
        supabase
          .from("candidate_profiles")
          .select("id, full_name, email, phone, created_at, supervisor_id, supervisor:supervisor_profiles(id, full_name, email)")
          .order("created_at", { ascending: false }),
        supabase
          .from("supervisor_profiles")
          .select("id, full_name, email, role, is_active")
          .in("role", ["supervisor", "admin"])
          .eq("is_active", true)
          .order("full_name", { ascending: true })
      ]);

      if (candidatesResponse.error) throw candidatesResponse.error;
      if (supervisorsResponse.error) throw supervisorsResponse.error;

      const candidateRows = candidatesResponse.data || [];
      const supervisorRows = supervisorsResponse.data || [];

      // Fetch existing multiple assignments via API
      const candidateIds = candidateRows.map(c => c.id);
      let multipleAssignments = {};

      if (candidateIds.length > 0) {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        if (token) {
          try {
            const response = await fetch('/api/admin/supervisor-assignments', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ candidateIds })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.assignments) {
                multipleAssignments = data.assignments;
                console.log('[Fetch] Loaded assignments for', Object.keys(multipleAssignments).length, 'candidates');
              }
            } else {
              console.log('[Fetch] API returned', response.status);
            }
          } catch (err) {
            console.log('[Fetch] Error loading assignments:', err.message);
          }
        }
      }

      setCandidates(candidateRows);
      setSupervisors(supervisorRows);

      // 🟢 FIXED: Merge legacy supervisor_id with multi-assignments
      const initialSelected = {};
      candidateRows.forEach((candidate) => {
        const multi = multipleAssignments[candidate.id] || [];
        const legacySupervisor = candidate.supervisor_id ? [candidate.supervisor_id] : [];
        // Merge and deduplicate - keep ALL supervisors
        const allSupervisors = [...new Set([...multi, ...legacySupervisor])];
        initialSelected[candidate.id] = allSupervisors;
        
        // 🟢 FIXED: If multiple supervisors exist, show multi-select mode by default
        if (allSupervisors.length > 1) {
          initialShowMulti[candidate.id] = true;
        }
      });
      setSelectedSupervisors(initialSelected);

      const initialShowMulti = {};
      candidateRows.forEach((candidate) => {
        const hasMultiple = (initialSelected[candidate.id] || []).length > 1;
        initialShowMulti[candidate.id] = hasMultiple;
      });
      setShowMultiSelect(initialShowMulti);

    } catch (error) {
      console.error("Error fetching assignment data:", error);
      setMessage({ type: "error", text: "Failed to load assignment data: " + getReadableError(error) });
    } finally {
      setLoading(false);
    }
  }

  function filteredCandidates() {
    let filtered = [...candidates];

    if (filterSupervisor === "unassigned") {
      filtered = filtered.filter((candidate) => {
        const multi = selectedSupervisors[candidate.id] || [];
        return !candidate.supervisor_id && multi.length === 0;
      });
    } else if (filterSupervisor !== "all") {
      filtered = filtered.filter((candidate) => {
        const multi = selectedSupervisors[candidate.id] || [];
        return candidate.supervisor_id === filterSupervisor || multi.includes(filterSupervisor);
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((candidate) => {
        return (
          cleanText(candidate.full_name).toLowerCase().includes(term) ||
          cleanText(candidate.email).toLowerCase().includes(term) ||
          cleanText(candidate.phone).toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }

  function getUnassignedCandidates() {
    return candidates.filter((candidate) => {
      const multi = selectedSupervisors[candidate.id] || [];
      return !candidate.supervisor_id && multi.length === 0;
    });
  }

  function clearMessageAfterDelay() {
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 4500);
  }

  async function syncMultipleAssignments(candidateId, supervisorIds) {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const uniqueSupervisorIds = [...new Set(supervisorIds)];

    const response = await fetch('/api/admin/supervisors/assign-multiple', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        candidateId,
        supervisorIds: uniqueSupervisorIds
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[API Error]', response.status, result);
      throw new Error(result.error || `API returned ${response.status}`);
    }

    if (!result.success) {
      const detailedErrors = result.results
        ?.filter(r => !r.success)
        ?.map(r => `${r.candidateId || 'candidate'}: ${r.error || 'Unknown error'}`)
        ?.join(' | ');

      throw new Error(
        detailedErrors ||
        result.error ||
        result.message ||
        'Failed to assign supervisors'
      );
    }

    if (result.results) {
      const failed = result.results.filter(r => !r.success);
      if (failed.length > 0) {
        const detailedErrors = failed
          .map(r => `${r.candidateId || 'candidate'}: ${r.error || 'Unknown error'}`)
          .join(' | ');
        throw new Error(`${failed.length} assignment(s) failed: ${detailedErrors}`);
      }
    }

    return result;
  }

  async function handleAssign(candidateId) {
    const supervisorIds = selectedSupervisors[candidateId] || [];
    const candidate = candidates.find((item) => item.id === candidateId);

    if (supervisorIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one supervisor before assigning." });
      return;
    }

    try {
      setProcessingCandidate(candidateId);
      setMessage({ type: "", text: "" });

      await syncMultipleAssignments(candidateId, supervisorIds);

      setMessage({ type: "success", text: `Candidate assigned to ${supervisorIds.length} supervisor(s) successfully.` });
      await fetchData();
      clearMessageAfterDelay();
    } catch (error) {
      console.error("Error assigning candidate:", error);
      setMessage({ type: "error", text: "Failed to assign candidate: " + getReadableError(error) });
    } finally {
      setProcessingCandidate(null);
    }
  }

  async function handleClearAssignment(candidateId) {
    const confirmed = window.confirm("Clear all supervisor assignments for this candidate?");
    if (!confirmed) return;

    try {
      setProcessingCandidate(candidateId);
      setMessage({ type: "", text: "" });

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/supervisors/clear-assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API returned ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear assignments');
      }

      setMessage({ type: "success", text: "All supervisor assignments cleared." });
      await fetchData();
      clearMessageAfterDelay();
    } catch (error) {
      console.error("Error clearing assignment:", error);
      setMessage({ type: "error", text: "Failed to clear assignment: " + getReadableError(error) });
    } finally {
      setProcessingCandidate(null);
    }
  }

  async function handleBulkAssign() {
    const unassigned = getUnassignedCandidates();

    if (unassigned.length === 0) {
      setMessage({ type: "error", text: "No unassigned candidates found." });
      return;
    }

    if (!selectedBulkSupervisors || selectedBulkSupervisors.length === 0) {
      setMessage({ type: "error", text: "Please select at least one supervisor for bulk assignment." });
      return;
    }

    const uniqueBulkSupervisors = [...new Set(selectedBulkSupervisors)];

    const supervisorNames = uniqueBulkSupervisors.map(id => {
      const sup = supervisors.find(s => s.id === id);
      return sup?.full_name || sup?.email || id;
    }).join(', ');

    const confirmed = window.confirm(
      "Assign " + unassigned.length + " unassigned candidate(s) to " + supervisorNames + "?"
    );

    if (!confirmed) return;

    try {
      setBulkProcessing(true);
      setMessage({ type: "", text: "" });

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const candidateIds = unassigned.map(c => c.id);

      const response = await fetch('/api/admin/supervisors/assign-multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateIds,
          supervisorIds: uniqueBulkSupervisors,
          isBulk: true
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API returned ${response.status}`);
      }

      if (!result.success) {
        const detailedErrors = result.results
          ?.filter(r => !r.success)
          ?.map(r => `${r.candidateId || 'candidate'}: ${r.error || 'Unknown error'}`)
          ?.join(' | ');
        throw new Error(detailedErrors || result.error || 'Failed to assign supervisors');
      }

      setSelectedBulkSupervisors([]);
      setMessage({ type: "success", text: `Bulk assignment completed for ${unassigned.length} candidate(s).` });
      await fetchData();
      clearMessageAfterDelay();
    } catch (error) {
      console.error("Bulk assignment error:", error);
      setMessage({ type: "error", text: "Failed to complete bulk assignment: " + getReadableError(error) });
    } finally {
      setBulkProcessing(false);
    }
  }

  // 🟢 FIXED: Toggle between single and multi-select
  const toggleMultiSelect = (candidateId) => {
    setShowMultiSelect(prev => {
      const newState = !prev[candidateId];
      
      // If switching TO single select (from multi), keep only the first selected supervisor
      if (!newState) {
        const current = selectedSupervisors[candidateId] || [];
        if (current.length > 1) {
          // Keep only the first one when switching to single mode
          setSelectedSupervisors(prevSelected => ({
            ...prevSelected,
            [candidateId]: current.slice(0, 1)
          }));
        }
      }
      
      return {
        ...prev,
        [candidateId]: newState
      };
    });
  };

  // 🟢 FIXED: Handle supervisor toggle in multi-select mode
  const handleSupervisorToggle = (candidateId, supervisorId) => {
    setSelectedSupervisors(prev => {
      const current = prev[candidateId] || [];
      if (current.includes(supervisorId)) {
        // Remove supervisor
        return { ...prev, [candidateId]: current.filter(id => id !== supervisorId) };
      } else {
        // Add supervisor
        return { ...prev, [candidateId]: [...current, supervisorId] };
      }
    });
  };

  // 🟢 FIXED: Handle single select change
  const handleSingleSelectChange = (candidateId, supervisorId) => {
    setSelectedSupervisors(prev => ({
      ...prev,
      [candidateId]: supervisorId ? [supervisorId] : []
    }));
  };

  const visibleCandidates = filteredCandidates();
  const assignedCount = candidates.filter((candidate) => {
    const multi = selectedSupervisors[candidate.id] || [];
    return candidate.supervisor_id || multi.length > 0;
  }).length;
  const unassignedCount = candidates.filter((candidate) => {
    const multi = selectedSupervisors[candidate.id] || [];
    return !candidate.supervisor_id && multi.length === 0;
  }).length;

  if (checkingAuth) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p style={styles.checkingText}>Checking authorization...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout background="/images/admin-bg.jpg">
        <div style={styles.unauthorized}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
          <button onClick={() => router.push("/supervisor")} style={styles.button}>Go to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/admin" legacyBehavior>
            <a style={styles.backButton}>← Back to Admin</a>
          </Link>
          <div style={styles.headerTitleBlock}>
            <h1 style={styles.title}>Assign Candidates to Supervisors</h1>
            <p style={styles.subtitle}>Manage candidate ownership and supervisor visibility. Select multiple supervisors per candidate.</p>
          </div>
          <button onClick={fetchData} style={styles.refreshButton}>Refresh</button>
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

        <div style={styles.statsGrid}>
          <StatCard icon="👥" label="Total Candidates" value={candidates.length} />
          <StatCard icon="✅" label="Assigned" value={assignedCount} />
          <StatCard icon="⏳" label="Unassigned" value={unassignedCount} />
          <StatCard icon="👑" label="Active Supervisors" value={supervisors.length} />
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search candidates by name, email, or phone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <select value={filterSupervisor} onChange={(event) => setFilterSupervisor(event.target.value)} style={styles.filterSelect}>
              <option value="all">All Candidates</option>
              <option value="unassigned">Unassigned Only</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  Assigned to: {supervisor.full_name || supervisor.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinnerDark} />
              <p>Loading candidates...</p>
            </div>
          ) : (
            <>
              {unassignedCount > 0 && (
                <div style={styles.bulkActions}>
                  <span style={styles.bulkLabel}>Bulk Assign Unassigned:</span>
                  <div style={styles.bulkMultiSelect}>
                    <select
                      multiple
                      value={selectedBulkSupervisors}
                      onChange={(event) => {
                        const options = event.target.options;
                        const values = [];
                        for (let i = 0; i < options.length; i++) {
                          if (options[i].selected) values.push(options[i].value);
                        }
                        setSelectedBulkSupervisors(values);
                      }}
                      style={styles.bulkMultiSelectInput}
                    >
                      {supervisors.map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.full_name || supervisor.email} {supervisor.role === "admin" ? "(Admin)" : ""}
                        </option>
                      ))}
                    </select>
                    <span style={styles.multiSelectHint}>Hold Ctrl/Cmd to select multiple</span>
                  </div>
                  <button
                    onClick={handleBulkAssign}
                    disabled={selectedBulkSupervisors.length === 0 || bulkProcessing}
                    style={{
                      ...styles.bulkButton,
                      opacity: selectedBulkSupervisors.length === 0 || bulkProcessing ? 0.5 : 1,
                      cursor: selectedBulkSupervisors.length === 0 || bulkProcessing ? "not-allowed" : "pointer"
                    }}
                  >
                    {bulkProcessing ? "Assigning..." : `Assign All (${unassignedCount})`}
                  </button>
                </div>
              )}

              <div style={styles.resultSummary}>Showing {visibleCandidates.length} of {candidates.length} candidates</div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.tableHead}>Candidate</th>
                      <th style={styles.tableHead}>Contact</th>
                      <th style={styles.tableHead}>Current Supervisor(s)</th>
                      <th style={styles.tableHead}>Assign Supervisors</th>
                      <th style={styles.tableHead}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={styles.noData}>No candidates match the current filter.</td>
                      </tr>
                    ) : (
                      visibleCandidates.map((candidate) => {
                        const candidateSelectedSupervisors = selectedSupervisors[candidate.id] || [];
                        const isProcessing = processingCandidate === candidate.id;
                        const isAssignDisabled = candidateSelectedSupervisors.length === 0 || isProcessing;
                        const isMultiSelect = showMultiSelect[candidate.id] || false;

                        // 🟢 FIXED: Get ALL supervisor names from selectedSupervisors
                        const supervisorIds = selectedSupervisors[candidate.id] || [];
                        const supervisorNames = supervisorIds
                          .map(id => supervisors.find(s => s.id === id)?.full_name || id)
                          .filter(name => name);
                        const uniqueSupervisorNames = [...new Set(supervisorNames)];

                        const hasMultipleSupervisors = uniqueSupervisorNames.length > 1;

                        return (
                          <tr key={candidate.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateInfo}>
                                <div style={styles.candidateAvatar}>{getInitial(candidate.full_name, candidate.email)}</div>
                                <div>
                                  <div style={styles.candidateName}>{candidate.full_name || "Unnamed"}</div>
                                  <div style={styles.candidateId}>ID: {candidate.id ? candidate.id.substring(0, 8) : "N/A"}...</div>
                                  <div style={styles.createdDate}>Created: {formatDate(candidate.created_at)}</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateEmail}>{candidate.email || "No email"}</div>
                              {candidate.phone && <div style={styles.candidatePhone}>{candidate.phone}</div>}
                            </td>
                            <td style={styles.tableCell}>
                              {uniqueSupervisorNames.length > 0 ? (
                                <div style={styles.assignedBadge}>
                                  {uniqueSupervisorNames.map((name, index) => (
                                    <span key={index} style={styles.assignedName}>
                                      {name}
                                    </span>
                                  ))}
                                  {hasMultipleSupervisors && (
                                    <span style={styles.multipleBadge}>
                                      {uniqueSupervisorNames.length} supervisors
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={styles.unassignedBadge}>Unassigned</span>
                              )}
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.assignContainer}>
                                {!isMultiSelect ? (
                                  <div style={styles.singleSelectMode}>
                                    <select
                                      value={candidateSelectedSupervisors[0] || ""}
                                      onChange={(e) => handleSingleSelectChange(candidate.id, e.target.value)}
                                      style={styles.assignSelect}
                                    >
                                      <option value="">Select Supervisor</option>
                                      {supervisors.map((supervisor) => (
                                        <option key={supervisor.id} value={supervisor.id}>
                                          {supervisor.full_name || supervisor.email} {supervisor.role === "admin" ? "(Admin)" : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => toggleMultiSelect(candidate.id)}
                                      style={styles.multiToggleButton}
                                    >
                                      Multiple
                                    </button>
                                  </div>
                                ) : (
                                  <div style={styles.multiSelectMode}>
                                    <div style={styles.checkboxGroup}>
                                      {supervisors.map((supervisor) => (
                                        <label key={supervisor.id} style={styles.checkboxLabel}>
                                          <input
                                            type="checkbox"
                                            checked={candidateSelectedSupervisors.includes(supervisor.id)}
                                            onChange={() => handleSupervisorToggle(candidate.id, supervisor.id)}
                                            style={styles.checkbox}
                                          />
                                          {supervisor.full_name || supervisor.email}
                                        </label>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => toggleMultiSelect(candidate.id)}
                                      style={styles.multiToggleButton}
                                    >
                                      Single
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.actionGroup}>
                                <button
                                  onClick={() => handleAssign(candidate.id)}
                                  disabled={isAssignDisabled}
                                  style={{
                                    ...styles.assignButton,
                                    opacity: isAssignDisabled ? 0.5 : 1,
                                    cursor: isAssignDisabled ? "not-allowed" : "pointer"
                                  }}
                                >
                                  {isProcessing ? "Saving..." : "Assign"}
                                </button>
                                {(candidate.supervisor_id || (selectedSupervisors[candidate.id] || []).length > 0) && (
                                  <button
                                    onClick={() => handleClearAssignment(candidate.id)}
                                    disabled={isProcessing}
                                    style={{
                                      ...styles.clearAssignmentButton,
                                      opacity: isProcessing ? 0.5 : 1,
                                      cursor: isProcessing ? "not-allowed" : "pointer"
                                    }}
                                  >
                                    Clear All
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  checkingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a1929 0%, #1a2a3a 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center"
  },
  checkingText: {
    margin: 0,
    color: "rgba(255,255,255,0.9)",
    fontSize: "14px"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255,255,255,0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px"
  },
  spinnerDark: {
    width: "38px",
    height: "38px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #0a1929",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px"
  },
  container: {
    width: "90vw",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "30px 20px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
    background: "white",
    padding: "22px 30px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    flexWrap: "wrap"
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: "260px"
  },
  backButton: {
    color: "#0a1929",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 700,
    padding: "9px 16px",
    borderRadius: "8px",
    border: "1px solid #0a1929",
    display: "inline-block"
  },
  refreshButton: {
    padding: "10px 18px",
    background: "#1565c0",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer"
  },
  title: {
    margin: 0,
    color: "#0a1929",
    fontSize: "24px",
    fontWeight: 800
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#667085",
    fontSize: "14px"
  },
  message: {
    padding: "13px 18px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "18px",
    marginBottom: "24px"
  },
  statCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "1px solid #eef2f7"
  },
  statIcon: {
    fontSize: "32px"
  },
  statLabel: {
    fontSize: "13px",
    color: "#718096",
    marginBottom: "4px",
    fontWeight: 700
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#0a1929"
  },
  filterBar: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    marginBottom: "20px",
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    alignItems: "center"
  },
  searchBox: {
    flex: 2,
    minWidth: "250px"
  },
  searchInput: {
    width: "100%",
    padding: "11px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box"
  },
  filterGroup: {
    flex: 1,
    minWidth: "220px"
  },
  filterSelect: {
    width: "100%",
    padding: "11px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    background: "white",
    cursor: "pointer",
    boxSizing: "border-box"
  },
  bulkActions: {
    background: "#f0f9f0",
    padding: "15px 20px",
    borderRadius: "10px",
    marginBottom: "20px",
    display: "flex",
    gap: "15px",
    alignItems: "center",
    flexWrap: "wrap",
    border: "1px solid #c6f6d5"
  },
  bulkLabel: {
    fontWeight: 800,
    color: "#0a5c2e"
  },
  bulkMultiSelect: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  bulkMultiSelectInput: {
    padding: "8px",
    border: "2px solid #c6f6d5",
    borderRadius: "8px",
    fontSize: "14px",
    minWidth: "250px",
    background: "white",
    height: "80px"
  },
  multiSelectHint: {
    fontSize: "11px",
    color: "#718096"
  },
  bulkButton: {
    padding: "9px 20px",
    background: "#0a5c2e",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer"
  },
  tableContainer: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
  },
  loadingState: {
    textAlign: "center",
    padding: "60px",
    color: "#667085"
  },
  resultSummary: {
    marginBottom: "14px",
    fontSize: "13px",
    color: "#667085",
    fontWeight: 700
  },
  tableWrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    minWidth: "900px"
  },
  tableHeadRow: {
    borderBottom: "2px solid #0a1929",
    background: "#f8fafc"
  },
  tableHead: {
    padding: "15px",
    fontWeight: 800,
    color: "#0a1929",
    textAlign: "left"
  },
  tableRow: {
    borderBottom: "1px solid #e2e8f0"
  },
  tableCell: {
    padding: "15px",
    verticalAlign: "top"
  },
  noData: {
    padding: "40px",
    textAlign: "center",
    color: "#718096",
    fontStyle: "italic"
  },
  candidateInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  candidateAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "20px",
    background: "#0a1929",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: 800
  },
  candidateName: {
    fontWeight: 800,
    color: "#0a1929",
    marginBottom: "4px"
  },
  candidateId: {
    fontSize: "11px",
    color: "#718096",
    fontFamily: "monospace"
  },
  createdDate: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "3px"
  },
  candidateEmail: {
    fontSize: "14px",
    color: "#0a1929",
    marginBottom: "4px"
  },
  candidatePhone: {
    fontSize: "12px",
    color: "#718096"
  },
  assignedBadge: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  assignedName: {
    fontWeight: 800,
    color: "#0a1929",
    fontSize: "14px",
    display: "block"
  },
  assignedSeparator: {
    color: "#94a3b8"
  },
  multipleBadge: {
    display: "inline-block",
    padding: "2px 10px",
    background: "#e3f2fd",
    color: "#1565c0",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 700,
    marginTop: "4px"
  },
  unassignedBadge: {
    display: "inline-block",
    padding: "4px 12px",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 800
  },
  assignContainer: {
    minWidth: "220px"
  },
  singleSelectMode: {
    display: "flex",
    gap: "6px",
    alignItems: "center"
  },
  multiSelectMode: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  assignSelect: {
    flex: 1,
    padding: "8px 12px",
    border: "2px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px",
    background: "white",
    cursor: "pointer",
    minWidth: "160px"
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "120px",
    overflowY: "auto",
    padding: "4px 8px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    cursor: "pointer"
  },
  checkbox: {
    cursor: "pointer"
  },
  multiToggleButton: {
    padding: "4px 12px",
    background: "#e2e8f0",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    color: "#0a1929"
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  assignButton: {
    padding: "8px 16px",
    background: "#4caf50",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer"
  },
  clearAssignmentButton: {
    padding: "8px 16px",
    background: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer"
  },
  unauthorized: {
    textAlign: "center",
    padding: "60px",
    color: "#667085",
    background: "white",
    borderRadius: "16px",
    maxWidth: "400px",
    margin: "100px auto"
  },
  button: {
    padding: "10px 20px",
    background: "#0a1929",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    marginTop: "20px"
  }
};
