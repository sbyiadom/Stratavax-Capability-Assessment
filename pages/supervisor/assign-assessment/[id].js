import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../supabase/client";

export default function AssignAssessment() {
  const router = useRouter();
  const { id: candidateId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessments, setSelectedAssessments] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
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
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!currentSupervisor || !candidateId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const { data: candidateData, error: candidateError } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', candidateId)
          .eq('supervisor_id', currentSupervisor.id)
          .single();

        if (candidateError || !candidateData) {
          throw new Error("Candidate not found or not assigned to you");
        }

        setCandidate(candidateData);

        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('assessments')
          .select(`
            *,
            assessment_type:assessment_types(*)
          `)
          .eq('is_active', true)
          .order('title');

        if (assessmentsError) throw assessmentsError;

        const { data: assignedData, error: assignedError } = await supabase
          .from('candidate_assessments')
          .select('assessment_id, status')
          .eq('user_id', candidateId);

        if (assignedError) throw assignedError;

        const selection = {};
        assessmentsData?.forEach(a => {
          const assigned = assignedData?.find(ad => ad.assessment_id === a.id);
          selection[a.id] = {
            selected: !!assigned,
            status: assigned?.status || null
          };
        });
        setSelectedAssessments(selection);
        setAssessments(assessmentsData || []);

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentSupervisor, candidateId]);

  const handleToggleAssessment = (assessmentId) => {
    setSelectedAssessments(prev => ({
      ...prev,
      [assessmentId]: {
        selected: !prev[assessmentId]?.selected,
        status: prev[assessmentId]?.status
      }
    }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const { data: currentAssignments, error: fetchError } = await supabase
        .from('candidate_assessments')
        .select('assessment_id')
        .eq('user_id', candidateId);

      if (fetchError) throw fetchError;

      const currentIds = currentAssignments?.map(a => a.assessment_id) || [];
      const selectedIds = Object.entries(selectedAssessments)
        .filter(([_, value]) => value.selected)
        .map(([id]) => id);

      const toAdd = selectedIds.filter(id => !currentIds.includes(id));

      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('candidate_assessments')
          .insert(
            toAdd.map(assessmentId => ({
              user_id: candidateId,
              assessment_id: assessmentId,
              status: 'blocked',
              created_at: new Date().toISOString()
            }))
          );

        if (addError) throw addError;
      }

      const toRemove = currentIds.filter(id => !selectedIds.includes(id));

      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('candidate_assessments')
          .delete()
          .eq('user_id', candidateId)
          .in('assessment_id', toRemove);

        if (removeError) throw removeError;
      }

      setSuccess(`✅ Successfully updated assessments for ${candidate.full_name}. New assessments are BLOCKED by default. Unblock them from the dashboard.`);

    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get assessment colors based on type code
  const getAssessmentColors = (assessmentTypeCode) => {
    const colors = {
      'leadership': { bg: '#E3F2FD', color: '#1565C0' },
      'cognitive': { bg: '#E8F5E9', color: '#2E7D32' },
      'technical': { bg: '#FFEBEE', color: '#C62828' },
      'personality': { bg: '#F3E5F5', color: '#7B1FA2' },
      'performance': { bg: '#FFF3E0', color: '#EF6C00' },
      'behavioral': { bg: '#E0F2F1', color: '#00695C' },
      'cultural': { bg: '#F1F5F9', color: '#37474F' },
      'general': { bg: '#F1F5F9', color: '#37474F' },
      'manufacturing': { bg: '#E8F5E9', color: '#2E7D32' },
      'manufacturing_baseline': { bg: '#E8F5E9', color: '#2E7D32' },
      'strategic_leadership': { bg: '#EDE7F6', color: '#4527A0' }
    };
    return colors[assessmentTypeCode] || colors.general;
  };

  if (!currentSupervisor || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={styles.errorContainer}>
          <div style={styles.errorBox}>
            <h2>Error</h2>
            <p>{error}</p>
            <Link href="/supervisor" legacyBehavior>
              <a style={styles.backButton}>← Back to Dashboard</a>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Back to Dashboard</a>
          </Link>
          <h1 style={styles.title}>Assign Assessments</h1>
          <div style={styles.headerRight}>
            <span style={styles.supervisorBadge}>
              👑 {currentSupervisor.name}
            </span>
          </div>
        </div>

        {candidate && (
          <div style={styles.candidateCard}>
            <div style={styles.candidateAvatar}>
              {candidate.full_name?.charAt(0) || 'C'}
            </div>
            <div style={styles.candidateInfo}>
              <h2 style={styles.candidateName}>{candidate.full_name}</h2>
              <p style={styles.candidateEmail}>{candidate.email}</p>
              {candidate.phone && <p style={styles.candidatePhone}>{candidate.phone}</p>}
            </div>
          </div>
        )}

        <div style={styles.content}>
          {error && (
            <div style={styles.errorMessage}>
              <span>⚠️ {error}</span>
            </div>
          )}

          {success && (
            <div style={styles.successMessage}>
              <span>✅ {success}</span>
            </div>
          )}

          <div style={styles.noteBox}>
            <span style={styles.noteIcon}>ℹ️</span>
            <span><strong>Note:</strong> Newly assigned assessments are <strong>BLOCKED</strong> by default. You must manually unblock them from the dashboard before candidates can take them.</span>
          </div>

          <div style={styles.assessmentsGrid}>
            {assessments.map(assessment => {
              const assessmentTypeCode = assessment.assessment_type?.code || 'general';
              const colors = getAssessmentColors(assessmentTypeCode);
              const isSelected = selectedAssessments[assessment.id]?.selected;
              const currentStatus = selectedAssessments[assessment.id]?.status;

              return (
                <div
                  key={assessment.id}
                  style={{
                    ...styles.assessmentCard,
                    border: isSelected ? `2px solid ${colors.color}` : '1px solid #E2E8F0',
                    background: isSelected ? `${colors.bg}80` : 'white'
                  }}
                >
                  <div style={styles.cardHeader}>
                    <div style={{
                      ...styles.assessmentIcon,
                      background: colors.bg,
                      color: colors.color
                    }}>
                      {assessment.assessment_type?.icon || '📋'}
                    </div>
                    <div style={styles.cardInfo}>
                      <h3 style={styles.assessmentTitle}>{assessment.title}</h3>
                      <span style={{
                        ...styles.assessmentType,
                        background: colors.bg,
                        color: colors.color
                      }}>
                        {assessment.assessment_type?.name || 'General'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleAssessment(assessment.id)}
                      style={styles.checkbox}
                    />
                  </div>
                  
                  <p style={styles.assessmentDescription}>
                    {assessment.description || `Complete the ${assessment.title} assessment.`}
                  </p>

                  <div style={styles.cardFooter}>
                    <span style={styles.assessmentMeta}>⏱️ 180 min</span>
                    <span style={styles.assessmentMeta}>📋 100 questions</span>
                    <span style={styles.assessmentMeta}>🎯 80% passing</span>
                  </div>

                  {currentStatus && (
                    <div style={{
                      ...styles.statusBadge,
                      background: currentStatus === 'completed' ? '#E8F5E9' : 
                                 currentStatus === 'unblocked' ? '#E8F5E9' : 
                                 currentStatus === 'blocked' ? '#FFF3E0' : '#F1F5F9',
                      color: currentStatus === 'completed' ? '#2E7D32' :
                             currentStatus === 'unblocked' ? '#2E7D32' :
                             currentStatus === 'blocked' ? '#F57C00' : '#37474F'
                    }}>
                      {currentStatus === 'completed' ? '✓ Completed' : 
                       currentStatus === 'unblocked' ? '🔓 Unblocked' :
                       currentStatus === 'blocked' ? '🔒 Blocked' : '📝 Assigned'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.buttonGroup}>
            <Link href="/supervisor" legacyBehavior>
              <a style={styles.cancelButton}>Cancel</a>
            </Link>
            <button
              onClick={handleSave}
              disabled={submitting}
              style={{
                ...styles.saveButton,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
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

const styles = {
  loadingContainer: {
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
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  backButton: {
    color: '#0A1929',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #0A1929',
    transition: 'all 0.2s ease'
  },
  title: {
    margin: 0,
    color: '#0A1929',
    fontSize: '24px',
    fontWeight: 600
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  supervisorBadge: {
    padding: '8px 16px',
    background: '#E3F2FD',
    color: '#1565C0',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    maxWidth: '400px'
  },
  candidateCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0'
  },
  candidateAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    background: '#0A1929',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600
  },
  candidateInfo: {
    flex: 1
  },
  candidateName: {
    margin: '0 0 5px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#0A1929'
  },
  candidateEmail: {
    margin: '0 0 3px 0',
    fontSize: '14px',
    color: '#4A5568'
  },
  candidatePhone: {
    margin: 0,
    fontSize: '14px',
    color: '#718096'
  },
  content: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  errorMessage: {
    background: '#FFEBEE',
    color: '#C62828',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  successMessage: {
    background: '#E8F5E9',
    color: '#2E7D32',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  noteBox: {
    background: '#E3F2FD',
    color: '#1565C0',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid #90CAF9'
  },
  noteIcon: {
    fontSize: '20px'
  },
  assessmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  assessmentCard: {
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.2s ease',
    position: 'relative'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px'
  },
  assessmentIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  cardInfo: {
    flex: 1
  },
  assessmentTitle: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0A1929'
  },
  assessmentType: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'inline-block'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  assessmentDescription: {
    fontSize: '13px',
    color: '#4A5568',
    lineHeight: '1.5',
    marginBottom: '15px'
  },
  cardFooter: {
    display: 'flex',
    gap: '15px',
    fontSize: '12px',
    color: '#718096'
  },
  assessmentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  statusBadge: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end',
    marginTop: '30px'
  },
  cancelButton: {
    padding: '12px 30px',
    background: '#E2E8F0',
    color: '#2D3748',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none'
  },
  saveButton: {
    padding: '12px 30px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
