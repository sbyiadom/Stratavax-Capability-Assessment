// pages/supervisor/reports/index.js - COMPLETE FIXED WITH PROPER SCORES

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// 🟢 FIXED: Extract score from ANY possible location in the data
function extractScore(result) {
  // First, log the full result to see what we're working with
  console.log('[extractScore] Full result:', JSON.stringify(result, null, 2));
  
  // Check direct fields on the result
  if (result.score !== undefined && result.score !== null && result.score !== 0) {
    console.log('[extractScore] Found score directly:', result.score);
    return safeNumber(result.score);
  }
  if (result.percentage_score !== undefined && result.percentage_score !== null && result.percentage_score !== 0) {
    console.log('[extractScore] Found percentage_score:', result.percentage_score);
    return safeNumber(result.percentage_score);
  }
  if (result.overallScore !== undefined && result.overallScore !== null && result.overallScore !== 0) {
    console.log('[extractScore] Found overallScore:', result.overallScore);
    return safeNumber(result.overallScore);
  }
  if (result.overall_score !== undefined && result.overall_score !== null && result.overall_score !== 0) {
    console.log('[extractScore] Found overall_score:', result.overall_score);
    return safeNumber(result.overall_score);
  }
  if (result.total_score !== undefined && result.total_score !== null && result.total_score !== 0) {
    console.log('[extractScore] Found total_score:', result.total_score);
    return safeNumber(result.total_score);
  }
  if (result.final_score !== undefined && result.final_score !== null && result.final_score !== 0) {
    console.log('[extractScore] Found final_score:', result.final_score);
    return safeNumber(result.final_score);
  }
  if (result.result !== undefined && result.result !== null && result.result !== 0) {
    console.log('[extractScore] Found result:', result.result);
    return safeNumber(result.result);
  }
  
  // Check in report_data
  if (result.report_data) {
    try {
      let reportData = result.report_data;
      if (typeof reportData === 'string') {
        reportData = JSON.parse(reportData);
      }
      
      console.log('[extractScore] report_data parsed:', JSON.stringify(reportData, null, 2));
      
      // Check all possible score locations in report_data
      if (reportData.score !== undefined && reportData.score !== null && reportData.score !== 0) {
        console.log('[extractScore] Found score in report_data:', reportData.score);
        return safeNumber(reportData.score);
      }
      if (reportData.percentage_score !== undefined && reportData.percentage_score !== null && reportData.percentage_score !== 0) {
        console.log('[extractScore] Found percentage_score in report_data:', reportData.percentage_score);
        return safeNumber(reportData.percentage_score);
      }
      if (reportData.overallScore !== undefined && reportData.overallScore !== null && reportData.overallScore !== 0) {
        console.log('[extractScore] Found overallScore in report_data:', reportData.overallScore);
        return safeNumber(reportData.overallScore);
      }
      if (reportData.overall_score !== undefined && reportData.overall_score !== null && reportData.overall_score !== 0) {
        console.log('[extractScore] Found overall_score in report_data:', reportData.overall_score);
        return safeNumber(reportData.overall_score);
      }
      if (reportData.totalScore !== undefined && reportData.totalScore !== null && reportData.totalScore !== 0) {
        console.log('[extractScore] Found totalScore in report_data:', reportData.totalScore);
        return safeNumber(reportData.totalScore);
      }
      if (reportData.total_score !== undefined && reportData.total_score !== null && reportData.total_score !== 0) {
        console.log('[extractScore] Found total_score in report_data:', reportData.total_score);
        return safeNumber(reportData.total_score);
      }
      if (reportData.finalScore !== undefined && reportData.finalScore !== null && reportData.finalScore !== 0) {
        console.log('[extractScore] Found finalScore in report_data:', reportData.finalScore);
        return safeNumber(reportData.finalScore);
      }
      if (reportData.final_score !== undefined && reportData.final_score !== null && reportData.final_score !== 0) {
        console.log('[extractScore] Found final_score in report_data:', reportData.final_score);
        return safeNumber(reportData.final_score);
      }
      if (reportData.result !== undefined && reportData.result !== null && reportData.result !== 0) {
        console.log('[extractScore] Found result in report_data:', reportData.result);
        return safeNumber(reportData.result);
      }
      if (reportData.percentage !== undefined && reportData.percentage !== null && reportData.percentage !== 0) {
        console.log('[extractScore] Found percentage in report_data:', reportData.percentage);
        return safeNumber(reportData.percentage);
      }
      if (reportData.total !== undefined && reportData.total !== null && reportData.total !== 0) {
        console.log('[extractScore] Found total in report_data:', reportData.total);
        return safeNumber(reportData.total);
      }
      
      // Check in dimensions
      if (reportData.dimensions) {
        if (reportData.dimensions.overallScore !== undefined && reportData.dimensions.overallScore !== 0) {
          console.log('[extractScore] Found dimensions.overallScore:', reportData.dimensions.overallScore);
          return safeNumber(reportData.dimensions.overallScore);
        }
        if (reportData.dimensions.overall_score !== undefined && reportData.dimensions.overall_score !== 0) {
          console.log('[extractScore] Found dimensions.overall_score:', reportData.dimensions.overall_score);
          return safeNumber(reportData.dimensions.overall_score);
        }
        if (reportData.dimensions.percentage_score !== undefined && reportData.dimensions.percentage_score !== 0) {
          console.log('[extractScore] Found dimensions.percentage_score:', reportData.dimensions.percentage_score);
          return safeNumber(reportData.dimensions.percentage_score);
        }
        if (reportData.dimensions.score !== undefined && reportData.dimensions.score !== 0) {
          console.log('[extractScore] Found dimensions.score:', reportData.dimensions.score);
          return safeNumber(reportData.dimensions.score);
        }
        if (reportData.dimensions.total !== undefined && reportData.dimensions.total !== 0) {
          console.log('[extractScore] Found dimensions.total:', reportData.dimensions.total);
          return safeNumber(reportData.dimensions.total);
        }
      }
      
      // Check in scores object
      if (reportData.scores) {
        if (reportData.scores.overall !== undefined && reportData.scores.overall !== 0) {
          console.log('[extractScore] Found scores.overall:', reportData.scores.overall);
          return safeNumber(reportData.scores.overall);
        }
        if (reportData.scores.total !== undefined && reportData.scores.total !== 0) {
          console.log('[extractScore] Found scores.total:', reportData.scores.total);
          return safeNumber(reportData.scores.total);
        }
        if (reportData.scores.percentage !== undefined && reportData.scores.percentage !== 0) {
          console.log('[extractScore] Found scores.percentage:', reportData.scores.percentage);
          return safeNumber(reportData.scores.percentage);
        }
        if (reportData.scores.score !== undefined && reportData.scores.score !== 0) {
          console.log('[extractScore] Found scores.score:', reportData.scores.score);
          return safeNumber(reportData.scores.score);
        }
        if (reportData.scores.result !== undefined && reportData.scores.result !== 0) {
          console.log('[extractScore] Found scores.result:', reportData.scores.result);
          return safeNumber(reportData.scores.result);
        }
      }
      
      // Check in results object
      if (reportData.results) {
        if (reportData.results.overall !== undefined && reportData.results.overall !== 0) {
          console.log('[extractScore] Found results.overall:', reportData.results.overall);
          return safeNumber(reportData.results.overall);
        }
        if (reportData.results.total !== undefined && reportData.results.total !== 0) {
          console.log('[extractScore] Found results.total:', reportData.results.total);
          return safeNumber(reportData.results.total);
        }
        if (reportData.results.score !== undefined && reportData.results.score !== 0) {
          console.log('[extractScore] Found results.score:', reportData.results.score);
          return safeNumber(reportData.results.score);
        }
        if (reportData.results.percentage !== undefined && reportData.results.percentage !== 0) {
          console.log('[extractScore] Found results.percentage:', reportData.results.percentage);
          return safeNumber(reportData.results.percentage);
        }
      }
      
      // Check in data object
      if (reportData.data) {
        if (reportData.data.score !== undefined && reportData.data.score !== 0) {
          console.log('[extractScore] Found data.score:', reportData.data.score);
          return safeNumber(reportData.data.score);
        }
        if (reportData.data.overallScore !== undefined && reportData.data.overallScore !== 0) {
          console.log('[extractScore] Found data.overallScore:', reportData.data.overallScore);
          return safeNumber(reportData.data.overallScore);
        }
        if (reportData.data.percentage !== undefined && reportData.data.percentage !== 0) {
          console.log('[extractScore] Found data.percentage:', reportData.data.percentage);
          return safeNumber(reportData.data.percentage);
        }
        if (reportData.data.result !== undefined && reportData.data.result !== 0) {
          console.log('[extractScore] Found data.result:', reportData.data.result);
          return safeNumber(reportData.data.result);
        }
      }
    } catch (e) {
      console.log('Error parsing report_data:', e);
    }
  }
  
  console.log('[extractScore] No score found, returning 0');
  return 0;
}

function extractRecommendation(result) {
  const possibleFields = ['recommendation', 'classification', 'status', 'result_status'];
  
  for (const field of possibleFields) {
    if (result[field]) {
      const val = String(result[field]);
      if (val && val !== 'Pending' && val !== 'pending') {
        return val;
      }
    }
  }
  
  if (result.report_data) {
    try {
      let reportData = result.report_data;
      if (typeof reportData === 'string') {
        reportData = JSON.parse(reportData);
      }
      if (reportData.recommendation) return reportData.recommendation;
      if (reportData.classification) return reportData.classification;
      if (reportData.result) return reportData.result;
      if (reportData.overallResult) return reportData.overallResult;
      if (reportData.status) return reportData.status;
    } catch (e) {}
  }
  
  return 'N/A';
}

function calculateNationalServiceScores(reportData, categoryScores, result) {
  let workplaceReadiness = 0;
  let intellectualCapability = 0;
  let overallScore = 0;

  if (reportData) {
    if (reportData.workplaceReadiness) workplaceReadiness = safeNumber(reportData.workplaceReadiness);
    else if (reportData.workplace_readiness) workplaceReadiness = safeNumber(reportData.workplace_readiness);
    else if (reportData.dimensions?.workplaceReadiness) workplaceReadiness = safeNumber(reportData.dimensions.workplaceReadiness);
    
    if (reportData.intellectualCapability) intellectualCapability = safeNumber(reportData.intellectualCapability);
    else if (reportData.intellectual_capability) intellectualCapability = safeNumber(reportData.intellectual_capability);
    else if (reportData.dimensions?.intellectualCapability) intellectualCapability = safeNumber(reportData.dimensions.intellectualCapability);
    
    if (reportData.overallScore) overallScore = safeNumber(reportData.overallScore);
    else if (reportData.percentage_score) overallScore = safeNumber(reportData.percentage_score);
    else if (reportData.dimensions?.overallScore) overallScore = safeNumber(reportData.dimensions.overallScore);
  }

  if (!workplaceReadiness && result) {
    workplaceReadiness = safeNumber(result.workplace_readiness);
    intellectualCapability = safeNumber(result.intellectual_capability);
    overallScore = safeNumber(result.percentage_score);
  }

  return { workplaceReadiness, intellectualCapability, overallScore };
}

function calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability) {
  const workplace = Number(workplaceReadiness || 0);
  const intellectual = Number(intellectualCapability || 0);

  if (workplace >= 85 && intellectual >= 85) return 'Highly Recommended';
  if (workplace >= 75 && intellectual >= 75) return 'Recommended';
  if (workplace >= 65 && intellectual >= 65) return 'Reserve Pool';
  return 'Not Recommended';
}

export default function ReportsIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('national');
  const [allReports, setAllReports] = useState([]);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    averageScore: 0,
    completedAssessments: 0,
    pendingReview: 0,
    failed: 0
  });
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const tab = router.query.tab;
    if (tab === 'other') {
      setActiveTab('other');
    } else if (tab === 'national') {
      setActiveTab('national');
    }
  }, [router.query.tab]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('supervisor_profiles')
        .select('id, full_name, email')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentSupervisor(profile);
      }

      const { data: candidates, error: candidatesError } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, university, programme')
        .eq('supervisor_id', session.user.id);

      if (candidatesError) {
        console.error('Candidates error:', candidatesError);
        setLoading(false);
        return;
      }

      if (!candidates || candidates.length === 0) {
        setAllReports([]);
        setStats({
          totalAssessments: 0,
          averageScore: 0,
          completedAssessments: 0,
          pendingReview: 0,
          failed: 0
        });
        setLoading(false);
        return;
      }

      const candidateIds = candidates.map(c => c.id);

      let assessmentResults = [];

      try {
        const { data, error } = await supabase
          .from('assessment_results')
          .select(`
            *,
            assessments:assessment_id (
              id,
              title,
              description
            )
          `)
          .in('user_id', candidateIds);

        if (!error && data && data.length > 0) {
          assessmentResults = data;
          console.log('📊 Total assessment results found:', data.length);
        } else if (error) {
          console.error('Error fetching assessment_results:', error);
        }
      } catch (e) {
        console.error('Error fetching assessment_results:', e);
      }

      if (!assessmentResults || assessmentResults.length === 0) {
        setAllReports([]);
        setStats({
          totalAssessments: 0,
          averageScore: 0,
          completedAssessments: 0,
          pendingReview: 0,
          failed: 0
        });
        setLoading(false);
        return;
      }

      // Process all reports
      const processedReports = [];

      assessmentResults.forEach((result, index) => {
        const candidate = candidates.find(c => c.id === result.user_id);
        const assessment = result.assessments || {};
        const assessmentTitle = assessment?.title || 'Untitled Assessment';
        const assessmentId = result.assessment_id;

        console.log(`\n📝 Processing report ${index + 1}:`);
        console.log(`  - Candidate: ${candidate?.full_name}`);
        console.log(`  - Assessment ID: ${assessmentId}`);
        console.log(`  - Assessment Title: ${assessmentTitle}`);
        console.log(`  - Result ID: ${result.id}`);

        const isNationalService = 
          assessmentId === NATIONAL_SERVICE_ASSESSMENT_ID ||
          assessmentTitle === 'National Service Recruitment Assessment';

        let reportData = {};
        try {
          reportData = typeof result.report_data === 'string' 
            ? JSON.parse(result.report_data) 
            : (result.report_data || {});
        } catch (e) {
          reportData = {};
        }

        const categoryScores = reportData.categoryScores || 
                               reportData.category_scores || 
                               result.category_scores || [];

        let displayScore = 0;
        let workplaceReadiness = 0;
        let intellectualCapability = 0;
        let recommendation = 'N/A';

        if (isNationalService) {
          const calculated = calculateNationalServiceScores(reportData, categoryScores, result);
          displayScore = calculated.overallScore;
          workplaceReadiness = calculated.workplaceReadiness;
          intellectualCapability = calculated.intellectualCapability;
          recommendation = calculateNationalServiceRecommendation(workplaceReadiness, intellectualCapability);
          console.log(`  - National Service - Score: ${displayScore}%`);
        } else {
          displayScore = extractScore(result);
          recommendation = extractRecommendation(result);
          console.log(`  - Other Assessment - Score: ${displayScore}%`);
        }

        processedReports.push({
          id: result.id,
          candidate_name: candidate?.full_name || 'Unknown',
          candidate_email: candidate?.email || '',
          candidate_university: candidate?.university || 'Not Specified',
          candidate_programme: candidate?.programme || 'Not Specified',
          user_id: result.user_id,
          assessment_id: assessmentId,
          assessment_title: assessmentTitle,
          isNationalService: isNationalService,
          displayScore: displayScore,
          workplaceReadiness: workplaceReadiness,
          intellectualCapability: intellectualCapability,
          recommendation: recommendation,
          status: result.status || 'Pending',
          completed_at: result.completed_at,
          created_at: result.created_at,
          raw_result: result
        });
      });

      setAllReports(processedReports);

      const nationalCount = processedReports.filter(r => r.isNationalService === true).length;
      const otherCount = processedReports.filter(r => r.isNationalService === false).length;
      console.log(`\n📊 BREAKDOWN: ${nationalCount} National Service, ${otherCount} Other Assessments`);

      updateStats(processedReports, activeTab);

    } catch (error) {
      console.error('Error loading reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const updateStats = (reports, tab) => {
    const filtered = tab === 'national' 
      ? reports.filter(r => r.isNationalService === true)
      : reports.filter(r => r.isNationalService === false);

    let totalScore = 0;
    let scoreCount = 0;
    let completed = 0;
    let pending = 0;
    let failed = 0;

    filtered.forEach(r => {
      if (r.displayScore > 0) {
        totalScore += r.displayScore;
        scoreCount++;
      }
      const status = (r.status || '').toLowerCase();
      if (status === 'completed' || status === 'complete') completed++;
      else if (status === 'pending' || status === 'in progress') pending++;
      else if (status === 'failed' || status === 'fail') failed++;
    });

    setStats({
      totalAssessments: filtered.length,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      completedAssessments: completed,
      pendingReview: pending,
      failed: failed
    });
  };

  useEffect(() => {
    if (allReports.length > 0) {
      updateStats(allReports, activeTab);
    }
  }, [activeTab, allReports]);

  const getFilteredReports = () => {
    if (allReports.length === 0) return [];
    return activeTab === 'national' 
      ? allReports.filter(r => r.isNationalService === true)
      : allReports.filter(r => r.isNationalService === false);
  };

  const filteredReports = getFilteredReports();

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    switch(s) {
      case 'completed': return '#48bb78';
      case 'complete': return '#48bb78';
      case 'pending': return '#ed8936';
      case 'in progress': return '#4299e1';
      case 'failed': return '#fc8181';
      case 'fail': return '#fc8181';
      default: return '#a0aec0';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#fc8181';
  };

  const getRecommendationBadge = (recommendation) => {
    const styles = {
      background: recommendation === 'Highly Recommended' ? '#dcfce7' :
                 recommendation === 'Recommended' ? '#dbeafe' :
                 recommendation === 'Reserve Pool' ? '#fef3c7' : '#fee2e2',
      color: recommendation === 'Highly Recommended' ? '#166534' :
             recommendation === 'Recommended' ? '#1e40af' :
             recommendation === 'Reserve Pool' ? '#92400e' : '#991b1b'
    };
    return styles;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.push(`/supervisor/reports?tab=${tab}`, undefined, { shallow: true });
  };

  return (
    <AppLayout>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>
              {activeTab === 'national' ? '📋 National Service Reports' : '📊 Other Assessment Reports'}
            </h1>
            <p style={styles.subtitle}>
              View and manage {activeTab === 'national' ? 'National Service' : 'other'} assessment reports
              {currentSupervisor && ` — ${currentSupervisor.full_name || currentSupervisor.email}`}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.exportButton}>📥 Export CSV</button>
            <button style={styles.printButton}>🖨️ Print</button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
            <button onClick={loadData} style={styles.retryButton}>Retry</button>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📋</div>
            <div>
              <div style={styles.statsValue}>{stats.totalAssessments}</div>
              <div style={styles.statsLabel}>Total Assessments</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📈</div>
            <div>
              <div style={styles.statsValue}>{stats.averageScore}%</div>
              <div style={styles.statsLabel}>Average Score</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>✅</div>
            <div>
              <div style={styles.statsValue}>{stats.completedAssessments}</div>
              <div style={styles.statsLabel}>Completed</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>⏳</div>
            <div>
              <div style={styles.statsValue}>{stats.pendingReview}</div>
              <div style={styles.statsLabel}>Pending Review</div>
            </div>
          </div>
        </div>

        <div style={styles.tabContainer}>
          <button
            onClick={() => handleTabChange('national')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'national' ? '#0A1929' : 'white',
              color: activeTab === 'national' ? 'white' : '#4A5568',
              borderBottom: activeTab === 'national' ? '3px solid #2563EB' : '3px solid transparent'
            }}
          >
            📋 National Service Reports
          </button>
          <button
            onClick={() => handleTabChange('other')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'other' ? '#0A1929' : 'white',
              color: activeTab === 'other' ? 'white' : '#4A5568',
              borderBottom: activeTab === 'other' ? '3px solid #2563EB' : '3px solid transparent'
            }}
          >
            📊 Other Assessment Reports
          </button>
        </div>

        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <p>Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <h3 style={styles.emptyTitle}>
                No {activeTab === 'national' ? 'National Service' : 'Other Assessment'} Reports Found
              </h3>
              <p style={styles.emptyText}>
                There are no {activeTab === 'national' ? 'National Service' : 'other assessment'} reports available for your candidates yet.
              </p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.tableHeadCell}>Candidate</th>
                  <th style={styles.tableHeadCell}>University</th>
                  <th style={styles.tableHeadCell}>Program</th>
                  <th style={styles.tableHeadCell}>Assessment</th>
                  <th style={styles.tableHeadCell}>Score</th>
                  {activeTab === 'national' && (
                    <th style={styles.tableHeadCell}>Recommendation</th>
                  )}
                  <th style={styles.tableHeadCell}>Status</th>
                  <th style={styles.tableHeadCell}>Date</th>
                  <th style={styles.tableHeadCell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={styles.candidateName}>{report.candidate_name}</div>
                      <div style={styles.candidateEmail}>{report.candidate_email}</div>
                    </td>
                    <td style={styles.tableCell}>{report.candidate_university}</td>
                    <td style={styles.tableCell}>{report.candidate_programme}</td>
                    <td style={styles.tableCell}>{report.assessment_title}</td>
                    <td style={styles.tableCell}>
                      {report.displayScore > 0 ? (
                        <span style={{
                          ...styles.scoreBadge,
                          background: getScoreColor(report.displayScore)
                        }}>
                          {report.displayScore}%
                        </span>
                      ) : (
                        <span style={styles.noScoreBadge}>Pending</span>
                      )}
                    </td>
                    {activeTab === 'national' && (
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.recommendationBadge,
                          ...getRecommendationBadge(report.recommendation || 'Not Recommended')
                        }}>
                          {report.recommendation || 'Not Recommended'}
                        </span>
                      </td>
                    )}
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        background: getStatusColor(report.status)
                      }}>
                        {report.status || 'Pending'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {report.completed_at ? new Date(report.completed_at).toISOString().split('T')[0] : 
                       report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : 'N/A'}
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        onClick={() => router.push(`/supervisor/reports/${report.id}`)}
                        style={styles.viewButton}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
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

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    flex: 1
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#991b1b'
  },
  retryButton: {
    padding: '4px 12px',
    background: '#991b1b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  exportButton: {
    padding: '8px 20px',
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  printButton: {
    padding: '8px 20px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  statsCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statsIcon: {
    fontSize: '32px'
  },
  statsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0A1929'
  },
  statsLabel: {
    fontSize: '14px',
    color: '#718096'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  tabButton: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    flex: 1
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    background: '#F8FAFC'
  },
  tableHeadCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '2px solid #E2E8F0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4A5568',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    transition: 'background 0.2s ease'
  },
  tableCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#2D3748',
    verticalAlign: 'middle'
  },
  candidateName: {
    fontWeight: '500',
    color: '#1a202c'
  },
  candidateEmail: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white'
  },
  noScoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
    background: '#f1f5f9'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  recommendationBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  viewButton: {
    padding: '4px 12px',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.2s ease'
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0A1929',
    margin: '0 0 8px 0'
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E2E8F0',
    borderTop: '4px solid #0A1929',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
