import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../supabase/client";

export default function ManageCandidate() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showUnblockModal, setShowUnblockModal] = useState(null);
  const [timeExtension, setTimeExtension] = useState(30);
  const [resetFullTime, setResetFullTime] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedAssessments, setSelectedAssessments] = useState([]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
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
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    };
    
    checkAuth();
  }, [router]);

  // Fetch candidate data
  useEffect(() => {
    if (!user_id || !currentSupervisor) return;
    
    const fetchCandidateData = async () => {
      setLoading(true);
      
      try {
        const isAdmin = currentSupervisor.role === 'admin';
        
        const { data: candidateData, error: candidateError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .single();
        
        if (candidateError) throw candidateError;
        
        if (!isAdmin && candidateData.supervisor_id !== currentSupervisor.id) {
          router.push('/supervisor');
          return;
        }
        
        let supervisorName = 'Unassigned';
        if (candidateData.supervisor_id) {
          const { data: supData } = await supabase
            .from('supervisor_profiles')
            .select('full_name')
            .eq('id', candidateData.supervisor_id)
            .single();
          if (supData) supervisorName = supData.full_name;
        }
        
        setCandidate({
          ...candidateData,
          supervisor_name: supervisorName
        });
        
        const { data: resultsData, error: resultsError } = await supabase
          .from('assessment_results')
          .select('id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid, is_auto_submitted, violation_count')
          .eq('user_id', user_id);

        if (resultsError) {
          console.error("Error fetching results:", resultsError);
        }
        
        const resultsMap = {};
        resultsData?.forEach(result => {
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
        
        const { data: accessData, error: accessError } = await supabase
          .from('candidate_assessments')
          .select('id, assessment_id, status, created_at, unblocked_at, result_id')
          .eq('user_id', user_id);
        
        if (accessError) {
          console.error("Error fetching access data:", accessError);
        }
        
        const uniqueAssessmentIds = [...new Set((accessData || []).map(a => a.assessment_id))];
        const assessmentsMap = {};
        
        for (const assessmentId of uniqueAssessmentIds) {
          const { data: assessmentData } = await supabase
            .from('assessments')
            .select(`
              id,
              title,
              description,
              assessment_type_id,
              assessment_types (
                id,
                code,
                name,
                icon,
                gradient_start,
                gradient_end
              )
            `)
            .eq('id', assessmentId)
            .single();
          
          if (assessmentData) {
            assessmentsMap[assessmentId] = assessmentData;
          }
        }
        
        const assessmentsWithDetails = (accessData || []).map(access => {
          const result = resultsMap[access.assessment_id] || null;
          const assessment = assessmentsMap[access.assessment_id];
          const typeData = assessment?.assessment_types;
          
          let displayStatus = access.status;
          if (result || access.status === 'completed') {
            displayStatus = 'completed';
          }
          
          return {
            id: access.id,
            assessment_id: access.assessment_id,
            assessment_title: assessment?.title || 'Unknown Assessment',
            assessment_type: typeData?.code || 'general',
            assessment_type_name: typeData?.name || 'General',
            type_icon: typeData?.icon || '📋',
            type_gradient_start: typeData?.gradient_start || '#667eea',
            type_gradient_end: typeData?.gradient_end || '#764ba2',
            status: displayStatus,
            created_at: access.created_at,
            unblocked_at: access.unblocked_at,
            result: result
          };
        });
        
        assessmentsWithDetails.sort((a, b) => {
          if (a.result && !b.result) return -1;
          if (!a.result && b.result) return 1;
          const dateA = a.result?.completed_at || a.created_at || 0;
          const dateB = b.result?.completed_at || b.created_at || 0;
          return new Date(dateB) - new Date(dateA);
        });
        
        setAssessments(assessmentsWithDetails);
        
      } catch (error) {
        console.error('Error fetching candidate:', error);
        setMessage({ type: 'error', text: 'Failed to load candidate data: ' + error.message });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCandidateData();
  }, [user_id, currentSupervisor, router]);

  const handleUnblock = async (assessmentId, assessmentTitle) => {
    setProcessingId(assessmentId);
    
    try {
      const response = await fetch('/api/supervisor/unblock-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user_id, 
          assessmentId,
          extendMinutes: resetFullTime ? 0 : timeExtension,
          resetTime: resetFullTime,
          performed_by: currentSupervisor.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        let msg = `✅ "${assessmentTitle}" unblocked successfully. `;
        if (resetFullTime) {
          msg += `Time reset to full 3 hours. `;
        } else if (timeExtension > 0) {
          msg += `Time extended by ${timeExtension} minutes. `;
        }
        msg += result.hasExistingProgress ? 'Candidate can continue where they left off.' : 'Candidate can start a new session.';
        setMessage({ type: 'success', text: msg });
        
        setAssessments(prev => prev.map(a => 
          a.assessment_id === assessmentId ? { ...a, status: 'unblocked' } : a
        ));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unblock assessment: ' + error.message });
    } finally {
      setProcessingId(null);
      setShowUnblockModal(null);
      setTimeExtension(30);
      setResetFullTime(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleReset = async (assessmentId, assessmentTitle) => {
    if (!confirm(`⚠️ Reset "${assessmentTitle}" for ${candidate?.full_name}?\n\nThis will DELETE all progress. The candidate will have to start over.`)) {
      return;
    }
    
    setProcessingId(assessmentId);
    
    try {
      await supabase.from('responses').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      await supabase.from('assessment_sessions').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      await supabase.from('assessment_results').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      await supabase.from('assessment_progress').delete().eq('user_id', user_id).eq('assessment_id', assessmentId);
      
      await supabase
        .from('candidate_assessments')
        .update({ status: 'blocked', unblocked_at: null, result_id: null })
        .eq('user_id', user_id)
        .eq('assessment_id', assessmentId);
      
      setMessage({ type: 'success', text: `✅ "${assessmentTitle}" reset successfully. It is now blocked.` });
      
      setAssessments(prev => prev.map(a => 
        a.assessment_id === assessmentId ? { ...a, status: 'blocked', result: null } : a
      ));
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset assessment: ' + error.message });
    } finally {
      setProcessingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBlock = async (assessmentId, assessmentTitle) => {
    if (!confirm(`Block "${assessmentTitle}" for ${candidate?.full_name}?`)) return;
    
    setProcessingId(assessmentId);
    
    try {
      await supabase
        .from('candidate_assessments')
        .update({ status: 'blocked' })
        .eq('user_id', user_id)
        .eq('assessment_id', assessmentId);
      
      setMessage({ type: 'success', text: `🔒 "${assessmentTitle}" blocked successfully.` });
      setAssessments(prev => prev.map(a => 
        a.assessment_id === assessmentId ? { ...a, status: 'blocked' } : a
      ));
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to block assessment: ' + error.message });
    } finally {
      setProcessingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const toggleSelectAssessment = (assessmentId) => {
    setSelectedAssessments(prev => 
      prev.includes(assessmentId) 
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    );
  };

  const selectAll = () => {
    const allIds = assessments.map(a => a.assessment_id);
    setSelectedAssessments(allIds);
  };

  const clearSelection = () => {
    setSelectedAssessments([]);
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

  const completedCount = assessments.filter(a => a.status === 'completed' || a.result !== null).length;
  const unblockedCount = assessments.filter(a => a.status === 'unblocked' && !a.result).length;
  const blockedCount = assessments.filter(a => a.status === 'blocked' && !a.result).length;

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0A1929', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p>Loading candidate information...</p>
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', margin: '40px auto', maxWidth: '500px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>👤</div>
          <h2>Candidate Not Found</h2>
          <p>The candidate you're looking for doesn't exist or you don't have access.</p>
          <Link href="/supervisor" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 24px', background: '#0A1929', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        {/* Header */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <Link href="/supervisor" style={{ color: '#0A1929', textDecoration: 'none', fontSize: '14px', padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              ← Back to Dashboard
            </Link>
            <Link href={`/supervisor/${candidate.id}`} style={{ background: '#0A1929', color: 'white', textDecoration: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 500 }}>
              📄 View Full Report
            </Link>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'linear-gradient(135deg, #0A1929, #1A2A3A)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 600 }}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0A1929', margin: '0 0 4px 0' }}>{candidate.full_name || 'Unnamed Candidate'}</h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0' }}>{candidate.email}</p>
              {candidate.phone && <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0' }}>📞 {candidate.phone}</p>}
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0' }}>👤 Supervisor: {candidate.supervisor_name || 'Unassigned'}</p>
              <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0' }}>📅 Joined: {formatDate(candidate.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{ padding: '12px 20px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', background: message.type === 'success' ? '#E8F5E9' : '#FFEBEE', color: message.type === 'success' ? '#2E7D32' : '#C62828' }}>
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
          <div style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, #0A1929, #1A2A3A)', color: 'white' }}>
            <span style={{ fontSize: '32px' }}>📋</span>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Total Assessments</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{assessments.length}</div>
            </div>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: '#E8F5E9' }}>
            <span style={{ fontSize: '32px' }}>✅</span>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Completed</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0A1929' }}>{completedCount}</div>
            </div>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: '#E3F2FD' }}>
            <span style={{ fontSize: '32px' }}>🔓</span>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Unblocked</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0A1929' }}>{unblockedCount}</div>
            </div>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: '#FFF3E0' }}>
            <span style={{ fontSize: '32px' }}>🔒</span>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Blocked</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0A1929' }}>{blockedCount}</div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {assessments.length > 0 && (
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" checked={selectedAssessments.length === assessments.length && assessments.length > 0} onChange={selectAll} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0A1929' }}>{selectedAssessments.length} selected</span>
            </div>
            <div>
              <button onClick={clearSelection} style={{ padding: '6px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
        )}

        {/* Assessments Table */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0A1929', margin: '0 0 20px 0' }}>Assessments</h2>
          
          {assessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <p>No assessments assigned to this candidate yet.</p>
              <Link href={`/supervisor/assign-assessment/${candidate.id}`} style={{ display: 'inline-block', marginTop: '20px', padding: '10px 24px', background: '#0A1929', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
                + Assign Assessment
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th style={{ width: '40px', padding: '15px', textAlign: 'center' }}></th>
                    <th style={{ padding: '15px', fontWeight: 600, color: '#0A1929', textAlign: 'left' }}>Assessment</th>
                    <th style={{ padding: '15px', fontWeight: 600, color: '#0A1929', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '15px', fontWeight: 600, color: '#0A1929', textAlign: 'left' }}>Score</th>
                    <th style={{ padding: '15px', fontWeight: 600, color: '#0A1929', textAlign: 'left' }}>Classification</th>
                    <th style={{ padding: '15px', fontWeight: 600, color: '#0A1929', textAlign: 'left' }}>Completed Date</th>
                    <th style={{ padding: '15px', fontWeight: 600, color: '#0A1929', textAlign: 'left' }}>Actions</th>
                  </table>
                </thead>
                <tbody>
                  {assessments.map((assessment) => {
                    const isSelected = selectedAssessments.includes(assessment.assessment_id);
                    const isProcessing = processingId === assessment.assessment_id;
                    const classification = assessment.result ? getClassification(assessment.result.score, assessment.result.max_score) : null;
                    const scorePercentage = assessment.result ? Math.round((assessment.result.score / assessment.result.max_score) * 100) : 0;
                    const isCompleted = assessment.result !== null;
                    const isUnblocked = assessment.status === 'unblocked' && !assessment.result;
                    const isBlocked = assessment.status === 'blocked' && !assessment.result;
                    
                    return (
                      <tr key={assessment.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectAssessment(assessment.assessment_id)} disabled={isCompleted} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white', background: `linear-gradient(135deg, ${assessment.type_gradient_start}, ${assessment.type_gradient_end})` }}>
                              {assessment.type_icon}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A1929', marginBottom: '2px' }}>{assessment.assessment_title}</div>
                              <div style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', display: 'inline-block', background: '#F1F5F9', color: '#37474F' }}>{assessment.assessment_type_name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, display: 'inline-block', background: isCompleted ? '#E8F5E9' : isUnblocked ? '#E3F2FD' : '#FFF3E0', color: isCompleted ? '#2E7D32' : isUnblocked ? '#1565C0' : '#F57C00' }}>
                            {isCompleted ? '✓ Completed' : isUnblocked ? '🔓 Ready' : '🔒 Blocked'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                          {assessment.result ? (
                            <div>
                              <strong>{assessment.result.score}/{assessment.result.max_score} ({scorePercentage}%)</strong>
                              {assessment.result.is_auto_submitted && (
                                <div style={{ fontSize: '10px', color: '#F44336', marginTop: '2px' }}>⚠️ Auto-submitted ({assessment.result.violation_count}/3 violations)</div>
                              )}
                            </div>
                          ) : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                          {classification ? (
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, display: 'inline-block', color: classification.color, background: `${classification.color}15` }}>
                              {classification.label}
                            </span>
                          ) : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                          {assessment.result ? <span style={{ fontSize: '12px', color: '#475569' }}>{formatDate(assessment.result.completed_at)}</span> : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {isCompleted ? (
                              <>
                                <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={{ background: '#0A1929', color: 'white', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 500 }}>
                                  📄 Report
                                </Link>
                                <button onClick={() => handleReset(assessment.assessment_id, assessment.assessment_title)} disabled={isProcessing} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                                  {isProcessing ? '⏳' : '🔄 Reset'}
                                </button>
                              </>
                            ) : isBlocked ? (
                              <button onClick={() => setShowUnblockModal({ assessmentId: assessment.assessment_id, assessmentTitle: assessment.assessment_title })} disabled={isProcessing} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                                {isProcessing ? '⏳' : '🔓 Unblock'}
                              </button>
                            ) : (
                              <button onClick={() => handleBlock(assessment.assessment_id, assessment.assessment_title)} disabled={isProcessing} style={{ background: '#FF9800', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                                {isProcessing ? '⏳' : '🔒 Block'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unblock Modal */}
      {showUnblockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <span style={{ fontSize: '28px' }}>🔓</span>
              <h3 style={{ margin: 0 }}>Unblock Assessment</h3>
              <button onClick={() => setShowUnblockModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666', padding: '4px 8px', borderRadius: '8px' }}>✕</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <p><strong>Candidate:</strong> {candidate.full_name}</p>
              <p><strong>Assessment:</strong> {showUnblockModal.assessmentTitle}</p>
              
              <div style={{ marginTop: '20px' }}>
                <h4>⏰ Time Options</h4>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', marginBottom: '8px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" checked={!resetFullTime && timeExtension === 30} onChange={() => { setResetFullTime(false); setTimeExtension(30); }} />
                  <div><strong>Extend by 30 minutes</strong><br /><span style={{ fontSize: '12px', color: '#666' }}>Add 30 minutes to remaining time</span></div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', marginBottom: '8px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" checked={!resetFullTime && timeExtension === 60} onChange={() => { setResetFullTime(false); setTimeExtension(60); }} />
                  <div><strong>Extend by 60 minutes</strong><br /><span style={{ fontSize: '12px', color: '#666' }}>Add 60 minutes to remaining time</span></div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', marginBottom: '8px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" checked={!resetFullTime && timeExtension === 120} onChange={() => { setResetFullTime(false); setTimeExtension(120); }} />
                  <div><strong>Extend by 120 minutes</strong><br /><span style={{ fontSize: '12px', color: '#666' }}>Add 120 minutes to remaining time</span></div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', marginBottom: '8px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" checked={resetFullTime} onChange={() => setResetFullTime(true)} />
                  <div><strong>Reset to full time (3 hours)</strong><br /><span style={{ fontSize: '12px', color: '#666' }}>Reset timer to 3 hours from now</span></div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', marginBottom: '8px', background: '#f8fafc', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" checked={!resetFullTime && timeExtension === 0} onChange={() => { setResetFullTime(false); setTimeExtension(0); }} />
                  <div><strong>No time change</strong><br /><span style={{ fontSize: '12px', color: '#666' }}>Just unblock without changing time</span></div>
                </label>
              </div>
              
              <div style={{ marginTop: '20px', padding: '12px', background: '#e3f2fd', borderRadius: '8px', display: 'flex', gap: '12px', fontSize: '13px', color: '#1565c0' }}>
                <span>💡</span>
                <span>Candidate will resume from where they left off. Their existing answers will be preserved.</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button onClick={() => setShowUnblockModal(null)} style={{ padding: '10px 24px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>Cancel</button>
              <button onClick={() => handleUnblock(showUnblockModal.assessmentId, showUnblockModal.assessmentTitle)} disabled={processingId === showUnblockModal.assessmentId} style={{ padding: '10px 24px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                {processingId === showUnblockModal.assessmentId ? 'Processing...' : 'Unblock Assessment'}
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
