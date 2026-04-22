// pages/assessment/terminated.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TerminatedPage() {
  const router = useRouter();
  const { reason, count, answered, total } = router.query;
  
  const [violationCount, setViolationCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    setViolationCount(parseInt(count) || 0);
    setAnsweredCount(parseInt(answered) || 0);
    setTotalQuestions(parseInt(total) || 0);
  }, [count, answered, total]);

  const completionPercentage = totalQuestions > 0 
    ? Math.round((answeredCount / totalQuestions) * 100) 
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.background} />
      
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <div style={styles.icon}>🚫</div>
        </div>
        
        <h1 style={styles.title}>Assessment Terminated</h1>
        
        <div style={styles.divider} />
        
        <div style={styles.messageBox}>
          <p style={styles.message}>
            Your assessment has been <strong>auto-submitted and terminated</strong> due to 
            <span style={styles.highlight}> {violationCount} rule violations</span>.
          </p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{violationCount}</div>
            <div style={styles.statLabel}>Violations</div>
            <div style={styles.statNote}>Max allowed: 3</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{answeredCount}</div>
            <div style={styles.statLabel}>Questions Answered</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{totalQuestions}</div>
            <div style={styles.statLabel}>Total Questions</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{completionPercentage}%</div>
            <div style={styles.statLabel}>Completion Rate</div>
          </div>
        </div>

        <div style={styles.warningBox}>
          <span style={styles.warningIcon}>⚠️</span>
          <div>
            <strong>Invalid Result</strong>
            <p style={styles.warningText}>
              This assessment result is <strong>INVALID</strong> because it was auto-submitted due to rule violations.
              Your supervisor has been notified.
            </p>
          </div>
        </div>

        <div style={styles.violationList}>
          <h4 style={styles.listTitle}>Violations detected:</h4>
          <ul style={styles.list}>
            <li>❌ Copy/Paste attempts</li>
            <li>❌ Screenshot attempts</li>
            <li>❌ Right-click / context menu</li>
            <li>❌ DevTools / inspect element</li>
          </ul>
          <p style={styles.note}>
            ℹ️ Note: Tab switching is allowed and does NOT count as a violation.
          </p>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Your score has been calculated based only on the questions you answered.
            Unanswered questions received 0 points.
          </p>
        </div>

        <div style={styles.actionButtons}>
          <Link href="/candidate/dashboard" style={styles.primaryButton}>
            ← Return to Dashboard
          </Link>
          <Link href="/candidate/support" style={styles.secondaryButton}>
            Contact Support
          </Link>
        </div>

        <p style={styles.footerNote}>
          If you believe this is an error, please contact your supervisor or support.
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
    animation: 'fadeIn 0.5s ease-out',
  },
  iconContainer: {
    marginBottom: '20px',
  },
  icon: {
    fontSize: '80px',
    animation: 'pulse 0.5s ease-out',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#1e293b',
    marginBottom: '16px',
  },
  divider: {
    width: '60px',
    height: '4px',
    background: 'linear-gradient(135deg, #f44336, #ff9800)',
    margin: '0 auto 24px',
    borderRadius: '2px',
  },
  messageBox: {
    background: '#FEF2F2',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #FEE2E2',
  },
  message: {
    fontSize: '16px',
    color: '#991B1B',
    lineHeight: '1.5',
    margin: 0,
  },
  highlight: {
    fontWeight: 800,
    fontSize: '18px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#F8FAFC',
    padding: '16px 8px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #E2E8F0',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#1e293b',
    lineHeight: 1.2,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statNote: {
    fontSize: '10px',
    color: '#94A3B8',
    marginTop: '4px',
  },
  warningBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: '#FFF3E0',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #FFE0B2',
    textAlign: 'left',
  },
  warningIcon: {
    fontSize: '24px',
  },
  warningText: {
    fontSize: '13px',
    color: '#E65100',
    margin: '4px 0 0 0',
  },
  violationList: {
    textAlign: 'left',
    background: '#F8FAFC',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid #E2E8F0',
  },
  listTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '12px',
  },
  list: {
    margin: '0 0 8px 0',
    paddingLeft: '20px',
    color: '#475569',
    fontSize: '13px',
    lineHeight: '1.8',
  },
  note: {
    fontSize: '11px',
    color: '#64748B',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  infoBox: {
    background: '#E3F2FD',
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #BBDEFB',
  },
  infoText: {
    fontSize: '12px',
    color: '#1565C0',
    margin: 0,
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  primaryButton: {
    flex: 1,
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  secondaryButton: {
    flex: 1,
    padding: '14px 24px',
    background: '#F1F5F9',
    color: '#475569',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    transition: 'all 0.2s',
    border: '1px solid #E2E8F0',
  },
  footerNote: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0,
  },
};
