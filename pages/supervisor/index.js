import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function SupervisorDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('all');
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAssessments: 0,
    completedAssessments: 0,
    unblockedAssessments: 0,
    blockedAssessments: 0,
    byType: {}
  });
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [processingAssessment, setProcessingAssessment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUnblockModal, setShowUnblockModal] = useState(null);
  const [timeExtension, setTimeExtension] = useState(30);
  const [resetFullTime, setResetFullTime] = useState(false);

  // Load state from URL on mount
  useEffect(() => {
    const { expanded, search, filterType, filterStatus: status } = router.query;
    if (expanded) setExpandedCandidate(expanded);
    if (search) setSearchTerm(search);
    if (filterType && filterType !== 'all') setSelectedAssessmentType(filterType);
    if (status && status !== 'all') setFilterStatus(status);
  }, [router.query]);

  // Update URL when filters change
  useEffect(() => {
    const query = {};
    if (expandedCandidate) query.expanded = expandedCandidate;
    if (searchTerm) query.search = searchTerm;
    if (selectedAssessmentType !== 'all') query.filterType = selectedAssessmentType;
    if (filterStatus !== 'all') query.filterStatus = filterStatus;
    
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [expandedCandidate, searchTerm, selectedAssessmentType, filterStatus]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession) {
          const userRole = supabaseSession.user?.user_metadata?.role;
          
          if (userRole === 'supervisor' || userRole === 'admin') {
            setCurrentSupervisor({
              id: supabaseSession.user.id,
              email: supabaseSession.user.email,
              name: supabaseSession.user.user_metadata?.full_name || supabaseSession.user.email,
              role: userRole
            });
            
            localStorage.setItem("userSession", JSON.stringify({
              loggedIn: true,
              user_id: supabaseSession.user.id,
              email: supabaseSession.user.email,
              full_name: supabaseSession.user.user_metadata?.full_name,
              role: userRole
            }));
            
            return;
          } else if (userRole === 'candidate') {
            router.push("/candidate/dashboard");
            return;
          }
        }
        
        const userSession = localStorage.getItem("userSession");
        
        if (!userSession) {
          router.push("/login");
          return;
        }
        
        try {
          const session = JSON.parse(userSession);
          if (session.loggedIn && (session.role === 'supervisor' || session.role === 'admin')) {
            setCurrentSupervisor({
              id: session.user_id,
              email: session.email,
              name: session.full_name || session.email,
              role: session.role
            });
          } else {
            if (session.role === 'candidate') {
              router.push("/candidate/dashboard");
            } else {
              router.push("/login");
            }
          }
        } catch {
          router.push("/login");
        }
      }
    };
    
    checkAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem("userSession");
        router.push("/login");
      } else if (event === 'SIGNED_IN' && session) {
        const userRole = session.user?.user_metadata?.role;
        if (userRole === 'supervisor' || userRole === 'admin') {
          setCurrentSupervisor({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email,
            role: userRole
          });
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!currentSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const isAdmin = currentSupervisor.role === 'admin';

        let candidatesQuery = supabase
          .from('candidate_profiles')
          .select(`
            id,
            full_name,
            email,
            phone,
            created_at,
            supervisor_id
          `);

        if (!isAdmin) {
          candidatesQuery = candidatesQuery.eq('supervisor_id', currentSupervisor.id);
        }

        const { data: candidatesData, error: candidatesError } = await candidatesQuery
          .order('created_at', { ascending: false });

        if (candidatesError) throw candidatesError;

        const processedCandidates = await Promise.all(
          (candidatesData || []).map(async (candidate) => {
            
            const { data: resultsData, error: resultsError } = await supabase
              .from('assessment_results')
              .select(`
                id,
                assessment_id,
                total_score,
                max_score,
                percentage_score,
                completed_at,
                assessment_type_id
              `)
              .eq('user_id', candidate.id);

            if (resultsError) throw resultsError;

            const resultsMap = {};
            resultsData?.forEach(result => {
              resultsMap[result.assessment_id] = result;
            });

            const { data: accessData, error: accessError } = await supabase
              .from('candidate_assessments')
              .select(`
                id,
                assessment_id,
                status,
                created_at,
                unblocked_at,
                unblocked_by,
                result_id,
                assessments (
                  id,
                  title,
                  description,
                  assessment_type_id,
                  assessment_types (
                    code,
                    name,
                    icon,
                    gradient_start,
                    gradient_end
                  )
                )
              `)
              .eq('user_id', candidate.id);

            if (accessError) throw accessError;

            const assessmentsWithDetails = (accessData || []).map(access => {
              const result = resultsMap[access.assessment_id] || null;
              
              if (result && !access.result_id) {
                supabase
                  .from('candidate_assessments')
                  .update({ 
                    result_id: result.id, 
                    status: 'completed' 
                  })
                  .eq('id', access.id)
                  .then(({ error }) => {
                    if (error) console.error('Error updating result_id:', error);
                  });
              }

              const assessment = access.assessments;
              const typeData = assessment?.assessment_types;

              return {
                id: access.id,
                assessment_id: access.assessment_id,
                assessment_title: assessment?.title || 'Unknown Assessment',
                assessment_type: typeData?.code || 'general',
                assessment_type_name: typeData?.name || 'General',
                type_icon: typeData?.icon || '📋',
                type_gradient_start: typeData?.gradient_start || '#667eea',
                type_gradient_end: typeData?.gradient_end || '#764ba2',
                status: result ? 'completed' : access.status,
                created_at: access.created_at,
                unblocked_at: access.unblocked_at,
                result: result ? {
                  id: result.id,
                  score: result.total_score,
                  max_score: result.max_score,
                  percentage: result.percentage_score,
                  completed_at: result.completed_at
                } : null
              };
            });

            assessmentsWithDetails.sort((a, b) => {
              const dateA = a.result?.completed_at || a.created_at || 0;
              const dateB = b.result?.completed_at || b.created_at || 0;
              return new Date(dateB) - new Date(dateA);
            });

            const completedAssessments = assessmentsWithDetails.filter(a => a.result !== null);
            const unblockedAssessments = assessmentsWithDetails.filter(a => a.status === 'unblocked' && !a.result);
            const blockedAssessments = assessmentsWithDetails.filter(a => a.status === 'blocked' && !a.result);
            
            const assessmentBreakdown = {};
            assessmentsWithDetails.forEach(a => {
              const type = a.assessment_type || 'unknown';
              assessmentBreakdown[type] = (assessmentBreakdown[type] || 0) + 1;
            });

            const latestAssessment = completedAssessments[0];

            return {
              id: candidate.id,
              full_name: candidate.full_name || 'Unnamed Candidate',
              email: candidate.email || 'No email provided',
              phone: candidate.phone,
              created_at: candidate.created_at,
              supervisor_id: candidate.supervisor_id,
              totalAssessments: assessmentsWithDetails.length,
              completedAssessments: completedAssessments.length,
              unblockedAssessments: unblockedAssessments.length,
              blockedAssessments: blockedAssessments.length,
              assessment_breakdown: assessmentBreakdown,
              latestAssessment: latestAssessment,
              hasCompletedAssessments: completedAssessments.length > 0,
              assessments: assessmentsWithDetails,
              selectedAssessmentType: assessmentsWithDetails[0]?.assessment_type || null
            };
          })
        );

        setCandidates(processedCandidates);
        setFilteredCandidates(processedCandidates);

        const types = new Set();
        const typeCounts = {};
        let totalAssessments = 0;
        let completedAssessments = 0;
        let unblockedAssessments = 0;
        let blockedAssessments = 0;

        processedCandidates.forEach(candidate => {
          totalAssessments += candidate.totalAssessments;
          completedAssessments += candidate.completedAssessments;
          unblockedAssessments += candidate.unblockedAssessments;
          blockedAssessments += candidate.blockedAssessments;
          
          if (candidate.assessment_breakdown) {
            Object.entries(candidate.assessment_breakdown).forEach(([type, count]) => {
              if (count > 0) {
                types.add(type);
                typeCounts[type] = (typeCounts[type] || 0) + count;
              }
            });
          }
        });

        setAssessmentTypes(['all', ...Array.from(types)]);
        setStats({
          totalCandidates: processedCandidates.length,
          totalAssessments,
          completedAssessments,
          unblockedAssessments,
          blockedAssessments,
          byType: typeCounts
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentSupervisor]);

  // Filter function
  useEffect(() => {
    let filtered = [...candidates];
    
    if (selectedAssessmentType !== 'all') {
      filtered = filtered.filter(c => 
        c.assessment_breakdown?.[selectedAssessmentType] > 0
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => {
        if (filterStatus === 'completed') return c.completedAssessments > 0;
        if (filterStatus === 'unblocked') return c.unblockedAssessments > 0;
        if (filterStatus === 'blocked') return c.blockedAssessments > 0;
        return true;
      });
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c => 
        c.full_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      );
    }
    
    setFilteredCandidates(filtered);
  }, [candidates, selectedAssessmentType, filterStatus, searchTerm]);

  const handleUnblockAssessmentWithTime = async (candidateId, candidateName, assessmentId, assessmentTitle) => {
    setProcessingAssessment({ candidateId, assessmentId });

    try {
      const response = await fetch('/api/supervisor/unblock-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: candidateId, 
          assessmentId,
          extendMinutes: resetFullTime ? 0 : timeExtension,
          resetTime: resetFullTime,
          performed_by: currentSupervisor.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        let message = `✅ "${assessmentTitle}" unblocked for ${candidateName}. `;
        if (resetFullTime) {
          message += `Time reset to full 3 hours. `;
        } else if (timeExtension > 0) {
          message += `Time extended by ${timeExtension} minutes. `;
        }
        message += result.hasExistingProgress ? 'They can continue where they left off.' : 'They can start a new session.';
        alert(message);
        
        // Update local state
        setCandidates(prev => prev.map(c => {
          if (c.id === candidateId) {
            const updatedAssessments = c.assessments.map(a => {
              if (a.assessment_id === assessmentId) {
                return { ...a, status: 'unblocked' };
              }
              return a;
            });
            const unblockedCount = updatedAssessments.filter(a => a.status === 'unblocked' && !a.result).length;
            const blockedCount = updatedAssessments.filter(a => a.status === 'blocked' && !a.result).length;
            
            return { 
              ...c, 
              assessments: updatedAssessments,
              unblockedAssessments: unblockedCount,
              blockedAssessments: blockedCount
            };
          }
          return c;
        }));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error unblocking assessment:', error);
      alert('❌ Failed to unblock assessment: ' + error.message);
    } finally {
      setProcessingAssessment(null);
      setShowUnblockModal(null);
      setTimeExtension(30);
      setResetFullTime(false);
    }
  };

  const handleResetAssessment = async (candidateId, assessmentId, assessmentTitle, candidateName) => {
    if (!confirm(`Are you sure you want to reset "${assessmentTitle}" for ${candidateName}? This will delete all progress.`)) {
      return;
    }

    setProcessingAssessment({ candidateId, assessmentId });

    try {
      const { error: responsesError } = await supabase
        .from('responses')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (responsesError) throw new Error("Failed to delete responses: " + responsesError.message);

      const { error: sessionsError } = await supabase
        .from('assessment_sessions')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (sessionsError) throw new Error("Failed to delete sessions: " + sessionsError.message);

      const { error: resultsError } = await supabase
        .from('assessment_results')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (resultsError) throw new Error("Failed to delete results: " + resultsError.message);

      const { error: updateError } = await supabase
        .from('candidate_assessments')
        .update({ 
          status: 'blocked',
          unblocked_by: null,
          unblocked_at: null,
          result_id: null
        })
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (updateError) throw new Error("Failed to update assessment status: " + updateError.message);

      await supabase
        .from('assessment_progress')
        .delete()
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      alert(`✅ "${assessmentTitle}" reset successfully for ${candidateName}. It is now BLOCKED.`);
      
      // Update local state
      setCandidates(prev => prev.map(c => {
        if (c.id === candidateId) {
          const updatedAssessments = c.assessments.map(a => {
            if (a.assessment_id === assessmentId) {
              return { ...a, status: 'blocked', result: null };
            }
            return a;
          });
          const completedCount = updatedAssessments.filter(a => a.result !== null).length;
          const unblockedCount = updatedAssessments.filter(a => a.status === 'unblocked' && !a.result).length;
          const blockedCount = updatedAssessments.filter(a => a.status === 'blocked' && !a.result).length;
          
          return { 
            ...c, 
            assessments: updatedAssessments,
            completedAssessments: completedCount,
            unblockedAssessments: unblockedCount,
            blockedAssessments: blockedCount
          };
        }
        return c;
      }));
      
    } catch (error) {
      console.error('Reset error:', error);
      alert('❌ Failed to reset assessment: ' + error.message);
    } finally {
      setProcessingAssessment(null);
    }
  };

  const handleBlockAssessment = async (candidateId, candidateName, assessmentId, assessmentTitle) => {
    if (!confirm(`Block "${assessmentTitle}" for ${candidateName}?`)) {
      return;
    }

    setProcessingAssessment({ candidateId, assessmentId });

    try {
      const { error } = await supabase
        .from('candidate_assessments')
        .update({
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', candidateId)
        .eq('assessment_id', assessmentId);

      if (error) throw error;

      alert(`🔒 "${assessmentTitle}" blocked for ${candidateName}.`);
      
      // Update local state
      setCandidates(prev => prev.map(c => {
        if (c.id === candidateId) {
          const updatedAssessments = c.assessments.map(a => {
            if (a.assessment_id === assessmentId) {
              return { ...a, status: 'blocked' };
            }
            return a;
          });
          const unblockedCount = updatedAssessments.filter(a => a.status === 'unblocked' && !a.result).length;
          const blockedCount = updatedAssessments.filter(a => a.status === 'blocked' && !a.result).length;
          
          return { 
            ...c, 
            assessments: updatedAssessments,
            unblockedAssessments: unblockedCount,
            blockedAssessments: blockedCount
          };
        }
        return c;
      }));
      
    } catch (error) {
      console.error('Error blocking assessment:', error);
      alert('❌ Failed to block assessment: ' + error.message);
    } finally {
      setProcessingAssessment(null);
    }
  };

  const getClassification = (score, maxScore) => {
    if (!score || !maxScore) return { label: "No Data", color: "#9E9E9E" };
    const percentage = Math.round((score / maxScore) * 100);
    if (percentage >= 85) return { label: "High Potential", color: "#2E7D32" };
    if (percentage >= 70) return { label: "Strong Performer", color: "#4CAF50" };
    if (percentage >= 55) return { label: "Developing", color: "#FF9800" };
    if (percentage >= 40) return { label: "At Risk", color: "#F57C00" };
    return { label: "High Risk", color: "#F44336" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  };

  const toggleCandidateDetails = (candidateId) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
      router.replace({ pathname: router.pathname, query: {} }, undefined, { shallow: true });
    } else {
      setExpandedCandidate(candidateId);
    }
  };

  const handleAssessmentDropdownChange = (candidateId, assessmentType) => {
    setCandidates(prev => prev.map(c => 
      c.id === candidateId 
        ? { ...c, selectedAssessmentType: assessmentType }
        : c
    ));
  };

  if (!currentSupervisor) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Supervisor Dashboard</h1>
            <p style={styles.welcome}>Welcome back, <strong>{currentSupervisor.name || currentSupervisor.email}</strong></p>
            {currentSupervisor.role === 'admin' && (
              <p style={styles.adminBadge}>Admin • Viewing all candidates</p>
            )}
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </div>

        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)' }}>
            <div style={styles.statIcon}>👥</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>My Candidates</div>
              <div style={styles.statValue}>{stats.totalCandidates}</div>
            </div>
          </div>
          
          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #1E3A5F 0%, #2B4C7C 100%)' }}>
            <div style={styles.statIcon}>📋</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Assessments</div>
              <div style={styles.statValue}>{stats.totalAssessments}</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)' }}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completedAssessments}</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' }}>
            <div style={styles.statIcon}>🔓</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Unblocked</div>
              <div style={styles.statValue}>{stats.unblockedAssessments}</div>
            </div>
          </div>

          <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)' }}>
            <div style={styles.statIcon}>⏳</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Blocked</div>
              <div style={styles.statValue}>{stats.blockedAssessments}</div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div style={styles.searchFilterBar}>
          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={styles.clearButton}
              >
                ✕
              </button>
            )}
          </div>
          
          <div style={styles.filterGroup}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed Only</option>
              <option value="unblocked">Unblocked Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
            
            <select
              value={selectedAssessmentType}
              onChange={(e) => setSelectedAssessmentType(e.target.value)}
              style={styles.filterSelect}
            >
              {assessmentTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Assessments' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>
              My Assigned Candidates 
              {filteredCandidates.length !== candidates.length && (
                <span style={styles.filterCount}> ({filteredCandidates.length} of {candidates.length})</span>
              )}
            </h2>
            <Link href="/supervisor/add-candidate" legacyBehavior>
              <a style={styles.addButton}>+ Add New Candidate</a>
            </Link>
          </div>

          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading your candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👥</div>
              <h3>No Candidates Found</h3>
              <p>
                {searchTerm || filterStatus !== 'all' || selectedAssessmentType !== 'all' 
                  ? "No candidates match your search or filter criteria. Try adjusting your filters."
                  : "You don't have any candidates assigned to you yet. Contact an administrator to assign candidates to your account."}
              </p>
              {(searchTerm || filterStatus !== 'all' || selectedAssessmentType !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setSelectedAssessmentType('all');
                  }}
                  style={styles.clearFiltersButton}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Candidate</th>
                    <th style={styles.tableHead}>Contact</th>
                    <th style={styles.tableHead}>Assessments</th>
                    <th style={styles.tableHead}>Latest Score</th>
                    <th style={styles.tableHead}>Classification</th>
                    <th style={styles.tableHead}>Last Active</th>
                    <th style={styles.tableHead}>Actions</th>
                   </tr>
                  </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const latestScore = candidate.latestAssessment?.result?.score || 0;
                    const maxScore = candidate.latestAssessment?.result?.max_score || 100;
                    const percentage = latestScore && maxScore ? Math.round((latestScore/maxScore)*100) : 0;
                    const classification = getClassification(latestScore, maxScore);
                    const isExpanded = expandedCandidate === candidate.id;
                    const isProcessing = processingAssessment?.candidateId === candidate.id;

                    return (
                      <React.Fragment key={candidate.id}>
                        <tr style={styles.tableRow}>
                          <td style={styles.tableCell}>
                            <div style={styles.candidateInfo}>
                              <div style={styles.candidateAvatar}>
                                {candidate.full_name?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <div style={styles.candidateName}>{candidate.full_name}</div>
                                <div style={styles.candidateId}>ID: {candidate.id.substring(0, 8)}...</div>
                              </div>
                            </div>
                           </td>
                          <td style={styles.tableCell}>
                            <div style={styles.candidateEmail}>{candidate.email}</div>
                            {candidate.phone && <div style={styles.candidatePhone}>{candidate.phone}</div>}
                           </td>
                          <td style={styles.tableCell}>
                            <div style={styles.assessmentSummary}>
                              <div style={styles.summaryStats}>
                                <span style={styles.summaryCompleted}>
                                  <strong>{candidate.completedAssessments}</strong> completed
                                </span>
                                <span style={styles.summaryUnblocked}>
                                  <strong>{candidate.unblockedAssessments}</strong> unblocked
                                </span>
                                <span style={styles.summaryBlocked}>
                                  <strong>{candidate.blockedAssessments}</strong> blocked
                                </span>
                              </div>
                              {candidate.assessments.length > 0 && (
                                <button
                                  onClick={() => toggleCandidateDetails(candidate.id)}
                                  style={styles.viewAssessmentsButton}
                                >
                                  {isExpanded ? '▲ Hide Assessments' : '▼ View Assessments'}
                                </button>
                              )}
                            </div>
                           </td>
                          <td style={styles.tableCell}>
                            {candidate.latestAssessment?.result ? (
                              <span style={{
                                ...styles.scoreBadge,
                                background: percentage >= 85 ? '#E8F5E9' :
                                           percentage >= 70 ? '#E3F2FD' :
                                           percentage >= 55 ? '#FFF3E0' :
                                           percentage >= 40 ? '#F3E5F5' :
                                           '#FFEBEE',
                                color: percentage >= 85 ? '#2E7D32' :
                                      percentage >= 70 ? '#1565C0' :
                                      percentage >= 55 ? '#F57C00' :
                                      percentage >= 40 ? '#7B1FA2' :
                                      '#C62828'
                              }}>
                                {latestScore}/{maxScore} ({percentage}%)
                              </span>
                            ) : (
                              <span style={styles.noScore}>No completed assessments</span>
                            )}
                           </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.classificationBadge,
                              color: classification.color,
                              background: `${classification.color}15`,
                              border: `1px solid ${classification.color}30`
                            }}>
                              {classification.label}
                            </span>
                           </td>
                          <td style={styles.tableCell}>
                            <span style={styles.date}>
                              {candidate.latestAssessment?.result 
                                ? formatDate(candidate.latestAssessment.result.completed_at)
                                : 'Never'
                              }
                            </span>
                           </td>
                          <td style={styles.tableCell}>
                            <div style={styles.actionButtons}>
                              <Link href={`/supervisor/${candidate.id}`} legacyBehavior>
                                <a style={styles.viewButton}>
                                  View Reports
                                </a>
                              </Link>
                              <Link href={`/supervisor/assign-assessment/${candidate.id}`} legacyBehavior>
                                <a style={styles.assignButton}>
                                  Assign
                                </a>
                              </Link>
                            </div>
                           </td>
                         </tr>
                        {isExpanded && (
                          <tr style={styles.expandedRow}>
                            <td colSpan="7" style={styles.expandedCell}>
                              <div style={styles.assessmentsList}>
                                <div style={styles.assessmentsListHeader}>
                                  <h4 style={styles.assessmentsListTitle}>Individual Assessments</h4>
                                  {candidate.assessments.length > 0 && (
                                    <select
                                      value={candidate.selectedAssessmentType || candidate.assessments[0]?.assessment_type}
                                      onChange={(e) => handleAssessmentDropdownChange(candidate.id, e.target.value)}
                                      style={styles.assessmentDropdown}
                                    >
                                      {candidate.assessments.map(assessment => (
                                        <option key={assessment.assessment_id} value={assessment.assessment_type}>
                                          {assessment.assessment_type_name} 
                                          {assessment.result && ` (Score: ${Math.round((assessment.result.score/assessment.result.max_score)*100)}%)`}
                                          {!assessment.result && assessment.status === 'unblocked' && ' (Ready)'}
                                          {!assessment.result && assessment.status === 'blocked' && ' (Blocked)'}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                                
                                {/* Show only the selected assessment */}
                                {candidate.assessments
                                  .filter(assessment => {
                                    const selectedType = candidate.selectedAssessmentType || candidate.assessments[0]?.assessment_type;
                                    return assessment.assessment_type === selectedType;
                                  })
                                  .map((assessment) => {
                                    const isProcessingThis = isProcessing && 
                                      processingAssessment?.assessmentId === assessment.assessment_id;

                                    return (
                                      <div key={assessment.id} style={{
                                        ...styles.assessmentItem,
                                        border: assessment.result ? '2px solid #4CAF50' : 
                                               assessment.status === 'unblocked' ? '2px solid #2196F3' : 
                                               '1px solid #FF9800'
                                      }}>
                                        <div style={styles.assessmentItemInfo}>
                                          <div style={{
                                            ...styles.assessmentTypeIcon,
                                            background: `linear-gradient(135deg, ${assessment.type_gradient_start}, ${assessment.type_gradient_end})`
                                          }}>
                                            {assessment.type_icon}
                                          </div>
                                          <div style={styles.assessmentDetails}>
                                            <div style={styles.assessmentHeader}>
                                              <span style={styles.assessmentItemTitle}>
                                                {assessment.assessment_title}
                                              </span>
                                              <span style={{
                                                ...styles.assessmentTypeBadge,
                                                background: assessment.assessment_type === 'leadership' ? '#E3F2FD' :
                                                           assessment.assessment_type === 'cognitive' ? '#E8F5E9' :
                                                           assessment.assessment_type === 'technical' ? '#FFEBEE' :
                                                           '#F1F5F9',
                                                color: assessment.assessment_type === 'leadership' ? '#1565C0' :
                                                       assessment.assessment_type === 'cognitive' ? '#2E7D32' :
                                                       assessment.assessment_type === 'technical' ? '#C62828' :
                                                       '#37474F'
                                              }}>
                                                {assessment.assessment_type_name}
                                              </span>
                                            </div>
                                            
                                            {assessment.result ? (
                                              <>
                                                <div style={styles.assessmentScoreSection}>
                                                  <div style={styles.scoreCircle}>
                                                    <span style={styles.scoreLarge}>
                                                      {Math.round((assessment.result.score/assessment.result.max_score)*100)}%
                                                    </span>
                                                    <span style={styles.scoreLabel}>Overall</span>
                                                  </div>
                                                  <div style={styles.scoreDetails}>
                                                    <div style={styles.scoreRow}>
                                                      <span>Score:</span>
                                                      <strong>{assessment.result.score}/{assessment.result.max_score}</strong>
                                                    </div>
                                                    <div style={styles.scoreRow}>
                                                      <span>Classification:</span>
                                                      <span style={{
                                                        ...styles.classificationSmall,
                                                        color: getClassification(assessment.result.score, assessment.result.max_score).color,
                                                        background: `${getClassification(assessment.result.score, assessment.result.max_score).color}15`
                                                      }}>
                                                        {getClassification(assessment.result.score, assessment.result.max_score).label}
                                                      </span>
                                                    </div>
                                                    <div style={styles.scoreRow}>
                                                      <span>Completed:</span>
                                                      <span>{formatDate(assessment.result.completed_at)}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </>
                                            ) : (
                                              <div style={styles.noScoreSection}>
                                                <span style={styles.noScoreIcon}>📋</span>
                                                <div>
                                                  <div style={styles.noScoreTitle}>Not Started</div>
                                                  <div style={styles.noScoreSubtitle}>
                                                    {assessment.status === 'unblocked' 
                                                      ? 'Candidate can start this assessment' 
                                                      : 'Assessment is blocked. Unblock to allow candidate to take it.'}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div style={styles.assessmentItemActions}>
                                          {assessment.result ? (
                                            <>
                                              <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} legacyBehavior>
                                                <a style={styles.viewFullReportButton}>
                                                  📄 View Full Report
                                                </a>
                                              </Link>
                                              <button
                                                onClick={() => handleResetAssessment(
                                                  candidate.id,
                                                  assessment.assessment_id,
                                                  assessment.assessment_title,
                                                  candidate.full_name
                                                )}
                                                disabled={isProcessingThis}
                                                style={{
                                                  ...styles.resetButton,
                                                  opacity: isProcessingThis ? 0.5 : 1,
                                                  cursor: isProcessingThis ? 'not-allowed' : 'pointer'
                                                }}
                                              >
                                                {isProcessingThis ? '⏳' : '🔄 Reset'}
                                              </button>
                                            </>
                                          ) : assessment.status === 'blocked' ? (
                                            <button
                                              onClick={() => setShowUnblockModal({
                                                candidateId: candidate.id,
                                                candidateName: candidate.full_name,
                                                assessmentId: assessment.assessment_id,
                                                assessmentTitle: assessment.assessment_title
                                              })}
                                              disabled={isProcessingThis}
                                              style={{
                                                ...styles.unblockButton,
                                                opacity: isProcessingThis ? 0.5 : 1,
                                                cursor: isProcessingThis ? 'not-allowed' : 'pointer'
                                              }}
                                            >
                                              {isProcessingThis ? '⏳' : '🔓 Unblock'}
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleBlockAssessment(
                                                candidate.id,
                                                candidate.full_name,
                                                assessment.assessment_id,
                                                assessment.assessment_title
                                              )}
                                              disabled={isProcessingThis}
                                              style={{
                                                ...styles.blockButton,
                                                opacity: isProcessingThis ? 0.5 : 1,
                                                cursor: isProcessingThis ? 'not-allowed' : 'pointer'
                                              }}
                                            >
                                              {isProcessingThis ? '⏳' : '🔒 Block'}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                              </td>
                            </tr>
                          )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unblock Modal with Time Options */}
      {showUnblockModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.unblockModal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>🔓</span>
              <h3>Unblock Assessment</h3>
              <button onClick={() => setShowUnblockModal(null)} style={styles.closeButton}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
              <p><strong>Candidate:</strong> {showUnblockModal.candidateName}</p>
              <p><strong>Assessment:</strong> {showUnblockModal.assessmentTitle}</p>
              
              <div style={styles.timeOptions}>
                <h4>⏰ Time Options</h4>
                
                <div style={styles.optionCard}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 30}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(30);
                      }}
                    />
                    <div>
                      <strong>Extend by 30 minutes</strong>
                      <span>Add 30 minutes to remaining time</span>
                    </div>
                  </label>
                </div>
                
                <div style={styles.optionCard}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 60}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(60);
                      }}
                    />
                    <div>
                      <strong>Extend by 1 hour</strong>
                      <span>Add 60 minutes to remaining time</span>
                    </div>
                  </label>
                </div>
                
                <div style={styles.optionCard}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 120}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(120);
                      }}
                    />
                    <div>
                      <strong>Extend by 2 hours</strong>
                      <span>Add 120 minutes to remaining time</span>
                    </div>
                  </label>
                </div>
                
                <div style={styles.optionCard}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={resetFullTime}
                      onChange={() => setResetFullTime(true)}
                    />
                    <div>
                      <strong>Reset to full time (3 hours)</strong>
                      <span>Reset timer to 3 hours from now</span>
                    </div>
                  </label>
                </div>
                
                <div style={styles.optionCard}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={!resetFullTime && timeExtension === 0}
                      onChange={() => {
                        setResetFullTime(false);
                        setTimeExtension(0);
                      }}
                    />
                    <div>
                      <strong>No time change</strong>
                      <span>Just unblock without changing time</span>
                    </div>
                  </label>
                </div>
              </div>
              
              <div style={styles.noteBox}>
                <span>💡</span>
                <span>Candidate will resume from where they left off. Their existing answers will be preserved.</span>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button onClick={() => setShowUnblockModal(null)} style={styles.cancelButton}>
                Cancel
              </button>
              <button 
                onClick={() => handleUnblockAssessmentWithTime(
                  showUnblockModal.candidateId,
                  showUnblockModal.candidateName,
                  showUnblockModal.assessmentId,
                  showUnblockModal.assessmentTitle
                )}
                disabled={processingAssessment}
                style={styles.unblockButtonLarge}
              >
                {processingAssessment ? 'Processing...' : 'Unblock Assessment'}
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
  // ... keep all existing styles ...
  // Add modal styles at the end
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(5px)'
  },
  unblockModal: {
    background: 'white',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '2px solid #e2e8f0',
    background: '#f8fafc'
  },
  modalIcon: {
    fontSize: '28px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '8px',
    ':hover': {
      background: '#e2e8f0'
    }
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  timeOptions: {
    marginTop: '20px'
  },
  optionCard: {
    marginBottom: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer'
  },
  noteBox: {
    marginTop: '20px',
    padding: '12px',
    background: '#e3f2fd',
    borderRadius: '8px',
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#1565c0'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    color: '#475569',
    transition: 'all 0.2s',
    ':hover': {
      background: '#e2e8f0'
    }
  },
  unblockButtonLarge: {
    padding: '10px 24px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#1976D2',
      transform: 'translateY(-1px)'
    }
  }
};

// Note: Keep all the existing styles from the original file (the long styles object)
// I've only added the modal styles at the end. You need to merge this with your existing styles.
