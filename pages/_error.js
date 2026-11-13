// pages/_error.js
// Global error boundary for the Stratavax platform.
// Catches React rendering errors and displays a branded fallback.

import { useRouter } from 'next/router';
import Image from 'next/image';

function Error({ statusCode, title, message }) {
  const router = useRouter();

  return (
    <div style={styles.pageContainer}>
      <div style={styles.pageBackground} />
      
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <Image src="/images/stratavax-logo.png" alt="Stratavax" width={48} height={48} />
          <span style={styles.brandName}>STRATAVAX</span>
        </div>

        <div style={styles.iconContainer}>
          {statusCode === 404 ? '🔍' : '⚠️'}
        </div>

        <h1 style={styles.title}>
          {statusCode ? `Error ${statusCode}` : title || 'Something went wrong'}
        </h1>
        
        <p style={styles.message}>
          {statusCode === 404
            ? "We couldn't find the page you were looking for."
            : message || "An unexpected error occurred. Our team has been notified and is looking into it."}
        </p>

        <div style={styles.actions}>
          <button 
            onClick={() => router.reload()} 
            style={styles.primaryButton}
          >
            Try Again
          </button>
          <button 
            onClick={() => router.push('/')} 
            style={styles.secondaryButton}
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '20px',
    fontFamily: 'inherit',
  },
  pageBackground: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #0a1929 0%, #1a237e 100%)',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 24px 64px rgba(10, 25, 41, 0.4)',
  },
  logoWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  brandName: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0a1929',
    letterSpacing: '2px',
  },
  iconContainer: {
    fontSize: '48px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '15px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 32px 0',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #1a237e, #4f46e5)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(26, 35, 126, 0.2)',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: 'white',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

export default Error;
