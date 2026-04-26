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

  useEffect(() => {
    const { expanded, search, filterType, filterStatus: status } = router.query;
    if (expanded) setExpandedCandidate(expanded);
    if (search) setSearchTerm(search);
    if (filterType && filterType !== 'all') setSelectedAssessmentType(filterType);
    if (status && status !== 'all') setFilterStatus(status);
  }, [router.query]);

  useEffect(() => {
    const query = {};
    if (expandedCandidate) query.expanded = expandedCandidate;
    if (searchTerm) query.search = searchTerm;
    if (selectedAssessmentType !== 'all') query.filterType = selectedAssessmentType;
    if (filterStatus !== 'all') query.filterStatus = filterStatus;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [expandedCandidate, searchTerm, selectedAssessmentType, filterStatus]);

  useEffect(() => {
    const checkAuth = async () => {
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

  useEffect(() => {
    if (!currentSupervisor) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const isAdmin = currentSupervisor.role === 'admin';

        let candidatesQuery = supabase.from('candidate_profiles').select('id, full_name, email, phone, created_at, supervisor_id');
        if (!isAdmin) {
          candidatesQuery = candidatesQuery.eq('supervisor_id', currentSupervisor.id);
        }
        const { data: candidatesData, error: candidatesError } = await candidatesQuery.order('created_at', { ascending: false });
        if (candidatesError) throw candidatesError;

        const processedCandidates = await Promise.all((candidatesData || []).map(async (candidate) => {
          const { data: resultsData } = await supabase
            .from('assessment_results')
            .select('id, assessment_id, total_score, max_score, percentage_score, completed_at, is_valid')
            .eq('user_id', candidate.id);

          const resultsMap = {};
          (resultsData || []).forEach(result => {
            resultsMap[result.assessment_id] = {
              id: result.id,
              score: result.total_score,
              max_score: result.max_score,
              percentage: result.percentage_score,
              completed_at: result.completed_at,
              is_valid: result.is_valid
            };
          });

          const { data: accessData } = await supabase
            .from('candidate_assessments')
            .select('id, assessment_id, status, created_at, unblocked_at, result_id, assessments(id, title, description, assessment_type_id, assessment_types(id, code, name, icon, gradient_start, gradient_end))')
            .eq('user_id', candidate.id);

          const assessmentsWithDetails = (accessData || []).map(access => {
            const result = resultsMap[access.assessment_id] || null;
            let displayStatus = access.status;
            if (result || access.result_id) {
              displayStatus = 'completed';
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
              status: displayStatus,
              created_at: access.created_at,
              result: result
            };
          });

          const completedAssessments = assessmentsWithDetails.filter(a => a.result !== null);
          const unblockedAssessments = assessmentsWithDetails.filter(a => a.status === 'unblocked' && !a.result);
          const blockedAssessments = assessmentsWithDetails.filter(a => a.status === 'blocked' && !a.result);
          const assessmentBreakdown = {};
          assessmentsWithDetails.forEach(a => {
            const type = a.assessment_type || 'unknown';
            assessmentBreakdown[type] = (assessmentBreakdown[type] || 0) + 1;
          });

          return {
            id: candidate.id,
            full_name: candidate.full_name || 'Unnamed Candidate',
            email: candidate.email || 'No email provided',
            phone: candidate.phone,
            created_at: candidate.created_at,
            totalAssessments: assessmentsWithDetails.length,
            completedAssessments: completedAssessments.length,
            unblockedAssessments: unblockedAssessments.length,
            blockedAssessments: blockedAssessments.length,
            assessment_breakdown: assessmentBreakdown,
            latestAssessment: completedAssessments[0],
            assessments: assessmentsWithDetails,
            selectedAssessmentType: assessmentsWithDetails[0]?.assessment_type || null
          };
        }));

        setCandidates(processedCandidates);
        setFilteredCandidates(processedCandidates);

        const types = new Set();
        let totalAssessments = 0;
        let completedAssessments = 0;
        let unblockedAssessments = 0;
        let blockedAssessments = 0;

        processedCandidates.forEach(candidate => {
          totalAssessments += candidate.totalAssessments;
          completedAssessments += candidate.completedAssessments;
          unblockedAssessments += candidate.unblockedAssessments;
          blockedAssessments += candidate.blockedAssessments;
          Object.keys(candidate.assessment_breakdown || {}).forEach(type => types.add(type));
        });

        setAssessmentTypes(['all', ...Array.from(types)]);
        setStats({ totalCandidates: processedCandidates.length, totalAssessments, completedAssessments, unblockedAssessments, blockedAssessments, byType: {} });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentSupervisor]);

  useEffect(() => {
    let filtered = [...candidates];
    if (selectedAssessmentType !== 'all') {
      filtered = filtered.filter(c => c.assessment_breakdown?.[selectedAssessmentType] > 0);
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
      filtered = filtered.filter(c => c.full_name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term));
    }
    setFilteredCandidates(filtered);
  }, [candidates, selectedAssessmentType, filterStatus, searchTerm]);

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
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userSession");
    router.push("/login");
  };

  const toggleCandidateDetails = (candidateId) => {
    setExpandedCandidate(expandedCandidate === candidateId ? null : candidateId);
  };

  if (!currentSupervisor) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #ccc', borderTopColor: '#0A1929', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'white', padding: '20px 30px', borderRadius: '16px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#0A1929', fontSize: '28px' }}>Supervisor Dashboard</h1>
            <p style={{ margin: '5px 0 0', color: '#666' }}>Welcome, {currentSupervisor.name || currentSupervisor.email}</p>
          </div>
          <button onClick={handleLogout} style={{ padding: '10px 24px', background: '#F44336', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Sign Out</button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '30px' }}>
          {[
            { icon: '👥', label: 'My Candidates', value: stats.totalCandidates, bg: '#0A1929' },
            { icon: '📋', label: 'Total Assessments', value: stats.totalAssessments, bg: '#1E3A5F' },
            { icon: '✅', label: 'Completed', value: stats.completedAssessments, bg: '#2E7D32' },
            { icon: '🔓', label: 'Unblocked', value: stats.unblockedAssessments, bg: '#2196F3' },
            { icon: '🔒', label: 'Blocked', value: stats.blockedAssessments, bg: '#F57C00' }
          ].map((stat, i) => (
            <div key={i} style={{ padding: '20px', borderRadius: '16px', color: 'white', background: stat.bg, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '32px' }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{stat.label}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div style={{ background: 'white', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <option value="all">All Status</option>
            <option value="completed">Completed Only</option>
            <option value="unblocked">Unblocked Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
          <select value={selectedAssessmentType} onChange={(e) => setSelectedAssessmentType(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
            {assessmentTypes.map(type => <option key={type} value={type}>{type === 'all' ? 'All Assessments' : type}</option>)}
          </select>
        </div>

        {/* Candidates Table */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', overflowX: 'auto' }}>
          <h2 style={{ marginBottom: '20px' }}>My Assigned Candidates</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No candidates found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Candidate</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Assessments</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Classification</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Last Active</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(candidate => {
                  const latestScore = candidate.latestAssessment?.result?.score || 0;
                  const maxScore = candidate.latestAssessment?.result?.max_score || 100;
                  const classification = getClassification(latestScore, maxScore);
                  const isExpanded = expandedCandidate === candidate.id;

                  return (
                    <React.Fragment key={candidate.id}>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: '#0A1929', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{candidate.full_name?.charAt(0) || 'C'}</div>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{candidate.full_name}</div>
                              <div style={{ fontSize: '11px', color: '#999' }}>ID: {candidate.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>{candidate.email}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#E8F5E9', color: '#2E7D32' }}>✅ {candidate.completedAssessments} completed</span>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#E3F2FD', color: '#1565C0' }}>🔓 {candidate.unblockedAssessments} unblocked</span>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', background: '#FFF3E0', color: '#F57C00' }}>🔒 {candidate.blockedAssessments} blocked</span>
                          </div>
                          {candidate.assessments.length > 0 && (
                            <button onClick={() => toggleCandidateDetails(candidate.id)} style={{ marginTop: '8px', background: 'none', border: '1px solid #ccc', borderRadius: '15px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}>
                              {isExpanded ? '▲ Hide Assessments' : '▼ View Assessments'}
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: `${classification.color}15`, color: classification.color, border: `1px solid ${classification.color}30` }}>{classification.label}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{candidate.latestAssessment?.result ? formatDate(candidate.latestAssessment.result.completed_at) : 'Never'}</td>
                        <td style={{ padding: '12px' }}>
                          <Link href={`/supervisor/manage-candidate/${candidate.id}`} style={{ background: '#0A1929', color: 'white', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px' }}>View Profile</Link>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" style={{ padding: '20px', background: '#f8fafc' }}>
                            <div>
                              <h4 style={{ margin: '0 0 15px 0' }}>Assessment Details</h4>
                              {candidate.assessments.map(assessment => (
                                <div key={assessment.id} style={{ padding: '15px', marginBottom: '10px', background: 'white', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  <div>
                                    <div style={{ fontWeight: 'bold' }}>{assessment.assessment_title}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{assessment.assessment_type_name}</div>
                                  </div>
                                  <div>
                                    {assessment.result ? (
                                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#E8F5E9', color: '#2E7D32' }}>✓ Completed - {Math.round((assessment.result.score / assessment.result.max_score) * 100)}%</span>
                                    ) : assessment.status === 'unblocked' ? (
                                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#E3F2FD', color: '#1565C0' }}>🔓 Ready</span>
                                    ) : (
                                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#FFF3E0', color: '#F57C00' }}>🔒 Blocked</span>
                                    )}
                                  </div>
                                  {assessment.result && (
                                    <Link href={`/supervisor/${candidate.id}?assessment=${assessment.assessment_id}`} style={{ background: '#0A1929', color: 'white', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '12px' }}>View Report</Link>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
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
