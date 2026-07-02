// pages/candidate/results/[resultId].js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ReportViewer from '../../../components/reports/ReportViewer';

export default function ResultsPage() {
  const router = useRouter();
  const { resultId } = router.query;

  const handleBack = () => {
    router.push('/candidate/dashboard');
  };

  if (!resultId) {
    return <div>Loading...</div>;
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
  }
};
