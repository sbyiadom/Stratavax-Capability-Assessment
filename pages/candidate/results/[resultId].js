// pages/candidate/results/[resultId].js

import { useRouter } from 'next/router';
import ReportViewer from '../../../components/reports/ReportViewer';

export default function ResultsPage() {
  const router = useRouter();
  const { resultId } = router.query;

  const handleBack = () => {
    router.push('/candidate/dashboard');
  };

  if (!resultId) {
    return (
      <div style={styles.loading}>
        <p>Loading results...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ReportViewer resultId={resultId} onBack={handleBack} />
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '20px'
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    fontSize: '18px',
    color: '#64748b'
  }
};
