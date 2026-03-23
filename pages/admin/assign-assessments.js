import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

export default function AssignAssessments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [selectedAction, setSelectedAction] = useState("assign"); // assign, unblock, block
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupervisor, setFilterSupervisor] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [candidateAssessmentStatus, setCandidateAssessmentStatus] = useState({});

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const userSession = localStorage.getItem("userSession");
      if (!userSession) {
        router.push("/login");
        return;
      }

      const session = JSON.parse(userSession);
      
      const { data: profile, error } = await supabase
        .from('supervisor_profiles')
        .select('role')
        .eq('id', session.user_id)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
        return;
      }

      if (!profile || profile.role !== 'admin') {
        alert('Admin access required');
        router.push('/supervisor');
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          supervisor_id,
          supervisor:supervisor_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;

      // Fetch all active assessments
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`
          id,
          title,
          description,
          assessment_type:assessment_types(id, code, name, icon)
        `)
        .eq('is_active', true)
        .order('title');

      if (assessmentsError) throw assessmentsError;

      // Fetch all supervisors for filter
      const { data: supervisorsData, error: supervisorsError } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (supervisorsError) throw supervisorsError;

      setCandidates(candidatesData || []);
      setAssessments(assessmentsData || []);
      setSupervisors(supervisorsData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch assessment status for selected assessment
  useEffect(() => {
    const fetchAssessmentStatus = async () => {
      if (!selectedAssessment) return;

      try {
        const { data, error } = await supabase
          .from('candidate_assessments')
          .select('user_id, status')
          .eq('assessment_id', selectedAssessment);

        if (error) throw error;

        const statusMap = {};
        (data || []).forEach(item => {
          statusMap[item.user_id] = item.status;
        });
        setCandidateAssessmentStatus(statusMap);
      } catch (error) {
        console.error('Error fetching assessment status:', error);
      }
    };

    fetchAssessmentStatus();
  }, [selectedAssessment]);

  const handleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id));
    }
  };

  const handleSelectCandidate = (candidateId) => {
    if (selectedCandidates.includes(candidateId)) {
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId));
    } else {
      setSelectedCandidates([...selectedCandidates, candidateId]);
    }
  };

  const getCandidateStatus = (candidateId) => {
    const status = candidateAssessmentStatus[candidateId];
    if (!status) return 'unassigned';
    return status;
  };

  const handleSubmit = async () => {
    if (!selectedAssessment) {
      setError('Please select an assessment');
      return;
    }
    if (selectedCandidates.length === 0) {
      setError('Please select at least one candidate');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const candidateId of selectedCandidates) {
        try {
          if (selectedAction === 'assign') {
            // Check if record exists
            const { data: existing, error: checkError } = await supabase
              .from('candidate_assessments')
              .select('id')
              .eq('user_id', candidateId)
              .eq('assessment_id', selectedAssessment)
              .maybeSingle();

            if (existing) {
              // Update to unblocked
              const { error } = await supabase
                .from('candidate_assessments')
                .update({ 
                  status: 'unblocked',
                  unblocked_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
              if (!error) successCount++;
              else errorCount++;
            } else {
              // Create new
              const { error } = await supabase
                .from('candidate_assessments')
                .insert({
                  user_id: candidateId,
                  assessment_id: selectedAssessment,
                  status: 'unblocked',
                  unblocked_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              if (!error) successCount++;
              else errorCount++;
            }
          } 
          else if (selectedAction === 'unblock') {
            const { error } = await supabase
              .from('candidate_assessments')
              .update({ 
                status: 'unblocked',
                unblocked_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', candidateId)
              .eq('assessment_id', selectedAssessment);
            if (!error) successCount++;
            else errorCount++;
          } 
          else if (selectedAction === 'block') {
            const { error } = await supabase
              .from('candidate_assessments')
              .update({ 
                status: 'blocked',
                unblocked_at: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', candidateId)
              .eq('assessment_id', selectedAssessment);
            if (!error) successCount++;
            else errorCount++;
          }
        } catch (err) {
          errorCount++;
          console.error(`Error processing candidate ${candidateId}:`, err);
        }
      }

      if (successCount > 0) {
        const actionText = selectedAction === 'assign' ? 'assigned/unblocked' : 
                          selectedAction === 'unblock' ? 'unblocked' : 'blocked';
        setSuccess(`✅ Successfully ${actionText} ${successCount} candidate(s) for "${assessments.find(a => a.id === selectedAssessment)?.title}"`);
      }
      if (errorCount > 0) {
        setError(`⚠️ Failed to process ${errorCount} candidate(s)`);
      }

      // Refresh statuses
      const { data } = await supabase
        .from('candidate_assessments')
        .select('user_id, status')
        .eq('assessment_id', selectedAssessment);
      
      const statusMap = {};
      (data || []).forEach(item => {
        statusMap[item.user_id] = item.status;
      });
      setCandidateAssessmentStatus(statusMap);
      
      setSelectedCandidates([]);
      
    } catch (error) {
      console.error('Error processing:', error);
      setError('Failed to process request: ' + error.message);
    } finally {
      setProcessing(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  const getActionButtonText = () => {
    switch(selectedAction) {
      case 'assign': return 'Assign & Unblock';
      case 'unblock': return 'Unblock';
      case 'block': return 'Block';
      default: return 'Process';
    }
  };

  const getActionButtonColor = () => {
    switch(selectedAction) {
      case 'assign': return '#0A1929';
      case 'unblock': return '#2196F3';
      case 'block': return '#F57C00';
      default: return '#0A1929';
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = searchTerm === '' || 
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterSupervisor === 'all' || 
      (filterSupervisor === 'unassigned' && !c.supervisor_id) ||
      c.supervisor_id === filterSupervisor;
    
    return matchesSearch && matchesFilter;
  });

  const selectedAssessmentObj = assessments.find(a => a.id === selectedAssessment);

  if (!isAdmin) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Checking authorization...</p>
      </div>
    );
  }

  return (
    <AppLayout background="/images/admin-bg.jpg">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <Link href="/admin/manage-candidates" legacyBehavior>
            <a style={styles.backButton}>← Back to Manage Candidates</a>
          </Link>
          <h1 style={styles.title}>Assign Assessments</h1>
          <p style={styles.subtitle}>Manage candidate access to assessments (Assign, Unblock, or Block)</p>
        </div>

        {error && <div style={styles.errorMessage}>⚠️ {error}</div>}
        {success && <div style={styles.successMessage}>✅ {success}</div>}

        {/* Step 1: Select Assessment */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>1. Select Assessment</h3>
          <div style={styles.assessmentGrid}>
            {assessments.map(assessment => (
              <div
                key={assessment.id}
                onClick={() => {
                  setSelectedAssessment(assessment.id);
                  setSelectedCandidates([]);
                }}
                style={{
                  ...styles.assessmentCard,
                  border: selectedAssessment === assessment.id ? '2px solid #0A1929' : '1px solid #E2E8F0',
                  background: selectedAssessment === assessment.id ? '#F8FAFC' : 'white'
                }}
              >
                <div style={styles.assessmentIcon}>
                  {assessment.assessment_type?.icon || '📋'}
                </div>
                <div style={styles.assessmentInfo}>
                  <div style={styles.assessmentTitle}>{assessment.title}</div>
                  <div style={styles.assessmentType}>{assessment.assessment_type?.name || 'Assessment'}</div>
                </div>
                {selectedAssessment === assessment.id && (
                  <div style={styles.selectedBadge}>✓ Selected</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Choose Action */}
        {selectedAssessment && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>2. Choose Action</h3>
            <div style={styles.actionGrid}>
              <button
                onClick={() => setSelectedAction('assign')}
                style={{
                  ...styles.actionButton,
                  background: selectedAction === 'assign' ? '#0A1929' : 'white',
                  color: selectedAction === 'assign' ? 'white' : '#0A1929',
                  border: selectedAction === 'assign' ? 'none' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>📋</span>
                <span>Assign & Unblock</span>
                <span style={styles.actionDesc}>Give access to take assessment</span>
              </button>
              <button
                onClick={() => setSelectedAction('unblock')}
                style={{
                  ...styles.actionButton,
                  background: selectedAction === 'unblock' ? '#2196F3' : 'white',
                  color: selectedAction === 'unblock' ? 'white' : '#2196F3',
                  border: selectedAction === 'unblock' ? 'none' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>🔓</span>
                <span>Unblock</span>
                <span style={styles.actionDesc}>Unblock existing assessments</span>
              </button>
              <button
                onClick={() => setSelectedAction('block')}
                style={{
                  ...styles.actionButton,
                  background: selectedAction === 'block' ? '#F57C00' : 'white',
                  color: selectedAction === 'block' ? 'white' : '#F57C00',
                  border: selectedAction === 'block' ? 'none' : '1px solid #E2E8F0'
                }}
              >
                <span style={styles.actionIcon}>🔒</span>
                <span>Block</span>
                <span style={styles.actionDesc}>Block access to assessment</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Candidates */}
        {selectedAssessment && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              3. Select Candidates
              {selectedAssessmentObj && (
                <span style={styles.assessmentHint}>
                  for "{selectedAssessmentObj.title}"
                </span>
              )}
            </h3>
            
            {/* Filters */}
            <div style={styles.filterBar}>
              <div style={styles.searchBox}>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <div style={styles.filterGroup}>
                <select
                  value={filterSupervisor}
                  onChange={(e) => setFilterSupervisor(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Candidates</option>
                  <option value="unassigned">Unassigned Only</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      Supervised by: {s.full_name || s.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate Table */}
            <div style={styles.tableContainer}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeadRow}>
                      <th style={styles.thCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                          onChange={handleSelectAll}
                          style={styles.checkbox}
                        />
                      </th>
                      <th style={styles.tableHead}>Candidate</th>
                      <th style={styles.tableHead}>Email</th>
                      <th style={styles.tableHead}>Supervisor</th>
                      <th style={styles.tableHead}>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={styles.noData}>
                          No candidates found
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map(candidate => {
                        const status = getCandidateStatus(candidate.id);
                        let statusColor = '#9E9E9E';
                        let statusBg = '#F5F5F5';
                        let statusText = 'Not Assigned';
                        let statusIcon = '📭';
                        
                        if (status === 'unblocked') {
                          statusColor = '#2E7D32';
                          statusBg = '#E8F5E9';
                          statusText = 'Unblocked / Ready';
                          statusIcon = '✅';
                        } else if (status === 'blocked') {
                          statusColor = '#F57C00';
                          statusBg = '#FFF3E0';
                          statusText = 'Blocked';
                          statusIcon = '🔒';
                        }
                        
                        return (
                          <tr key={candidate.id} style={styles.tableRow}>
                            <td style={styles.tdCheckbox}>
                              <input
                                type="checkbox"
                                checked={selectedCandidates.includes(candidate.id)}
                                onChange={() => handleSelectCandidate(candidate.id)}
                                style={styles.checkbox}
                              />
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateInfo}>
                                <div style={styles.candidateAvatar}>
                                  {candidate.full_name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                  <div style={styles.candidateName}>{candidate.full_name || 'Unnamed Candidate'}</div>
                                  <div style={styles.candidateId}>ID: {candidate.id.substring(0, 8)}...</div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.candidateEmail}>{candidate.email}</div>
                            </td>
                            <td style={styles.tableCell}>
                              {candidate.supervisor ? (
                                <span style={styles.supervisorName}>
                                  {candidate.supervisor.full_name || candidate.supervisor.email}
                                </span>
                              ) : (
                                <span style={styles.unassignedBadge}>Unassigned</span>
                              )}
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.statusBadge,
                                background: statusBg,
                                color: statusColor
                              }}>
                                {statusIcon} {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selection Summary & Submit */}
            <div style={styles.summaryBar}>
              <div style={styles.selectionSummary}>
                <span style={styles.selectedCount}>{selectedCandidates.length}</span>
                <span>candidate(s) selected</span>
                {selectedCandidates.length > 0 && (
                  <button onClick={() => setSelectedCandidates([])} style={styles.clearSelection}>
                    Clear
                  </button>
                )}
              </div>
              {selectedCandidates.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={processing}
                  style={{
                    ...styles.submitButton,
                    background: getActionButtonColor(),
                    opacity: processing ? 0.6 : 1,
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processing ? 'Processing...' : `${getActionButtonText()} (${selectedCandidates.length})`}
                </button>
              )}
            </div>
          </div>
        )}
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

const styles = {
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0A1929 0%, #1A2A3A 100%)',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  backButton: {
    display: 'inline-block',
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '15px',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    ':hover': {
      background: '#F8FAFC'
    }
  },
  title: {
    margin: '0 0 5px 0',
    color: '#0A1929',
    fontSize: '28px',
    fontWeight: 600
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: '14px'
  },
  errorMessage: {
    padding: '12px 20px',
    background: '#FFEBEE',
    color: '#C62828',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  successMessage: {
    padding: '12px 20px',
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  section: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0A1929',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  assessmentHint: {
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#666'
  },
  assessmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  assessmentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }
  },
  assessmentIcon: {
    fontSize: '32px'
  },
  assessmentInfo: {
    flex: 1
  },
  assessmentTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0A1929',
    marginBottom: '4px'
  },
  assessmentType: {
    fontSize: '12px',
    color: '#666'
  },
  selectedBadge: {
    position: 'absolute',
    top: '8px',
    right: '12px',
    fontSize: '12px',
    color: '#0A1929',
    fontWeight: 500
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  },
  actionIcon: {
    fontSize: '24px'
  },
  actionDesc: {
    fontSize: '11px',
    fontWeight: 'normal',
    opacity: 0.7
  },
  filterBar: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  searchBox: {
    flex: 2,
    minWidth: '250px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    ':focus': {
      borderColor: '#0A1929'
    }
  },
  filterGroup: {
    flex: 1,
    minWidth: '200px'
  },
  filterSelect: {
    width: '100%',
    padding: '10px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer'
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '20px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    borderBottom: '2px solid #E2E8F0',
    background: '#F8FAFC'
  },
  tableHead: {
    padding: '12px 16px',
    fontWeight: 600,
    color: '#0A1929',
    textAlign: 'left'
  },
  thCheckbox: {
    width: '40px',
    padding: '12px 8px',
    textAlign: 'center'
  },
  tableCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0'
  },
  tdCheckbox: {
    padding: '12px 8px',
    textAlign: 'center',
    borderBottom: '1px solid #E2E8F0'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  tableRow: {
    ':hover': {
      background: '#F8FAFC'
    }
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  candidateAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #0A1929, #1A2A3A)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600
  },
  candidateName: {
    fontWeight: 500,
    color: '#0A1929',
    marginBottom: '2px'
  },
  candidateId: {
    fontSize: '10px',
    color: '#718096',
    fontFamily: 'monospace'
  },
  candidateEmail: {
    fontSize: '13px',
    color: '#0A1929'
  },
  supervisorName: {
    fontSize: '13px',
    color: '#0A1929'
  },
  unassignedBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    background: '#FEF2F2',
    color: '#B91C1C',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096'
  },
  summaryBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #E2E8F0',
    flexWrap: 'wrap',
    gap: '16px'
  },
  selectionSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  selectedCount: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0A1929'
  },
  clearSelection: {
    background: 'none',
    border: 'none',
    color: '#F57C00',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
    padding: '4px 8px',
    ':hover': {
      color: '#0A1929'
    }
  },
  submitButton: {
    padding: '12px 32px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }
  }
};
