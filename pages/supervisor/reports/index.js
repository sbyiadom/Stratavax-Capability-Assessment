// pages/supervisor/reports/index.js - COMPLETE FIXED WITH PROPER SCORING FOR ALL ASSESSMENT TYPES

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/client';
import AppLayout from '../../../components/AppLayout';

const NATIONAL_SERVICE_ASSESSMENT_ID = 'bdb9d46e-9fac-4d00-8478-1f649e7ac600';

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// 🟢 PROPER UNIVERSAL SCORE CALCULATION
function calculateScore(report) {
  let categoryScores = [];
  
  // Extract category_scores from various locations
  if (report.category_scores && Array.isArray(report.category_scores) && report.category_scores.length > 0) {
    categoryScores = report.category_scores;
  } else if (report.categoryScores && Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
    categoryScores = report.categoryScores;
  } else if (report.category_scores && typeof report.category_scores === 'object' && !Array.isArray(report.category_scores)) {
    categoryScores = Object.values(report.category_scores);
  }
  
  if (categoryScores.length === 0 && report.report_data) {
    try {
      let reportData = report.report_data;
      if (typeof reportData === 'string') {
        reportData = JSON.parse(reportData);
      }
      if (reportData.categoryScores && Array.isArray(reportData.categoryScores) && reportData.categoryScores.length > 0) {
        categoryScores = reportData.categoryScores;
      } else if (reportData.category_scores && Array.isArray(reportData.category_scores) && reportData.category_scores.length > 0) {
        categoryScores = reportData.category_scores;
      } else if (reportData.category_scores && typeof reportData.category_scores === 'object') {
        categoryScores = Object.values(reportData.category_scores);
      }
    } catch (e) {}
  }
  
  if (categoryScores.length > 0) {
    // 🟢 Method 1: Sum of scores / sum of maxScores (for Behavioral & Soft Skills)
    let totalEarned = 0;
    let totalMax = 0;
    let validPercentages = [];
    
    categoryScores.forEach(cat => {
      let score = safeNumber(cat.score || cat.earned || 0);
      let maxScore = safeNumber(cat.maxScore || cat.max || 0);
      let pct = safeNumber(cat.percentage || 0);
      
      // If we have valid score and maxScore, use them for total calculation
      if (score > 0 && maxScore > 0) {
        totalEarned += score;
        totalMax += maxScore;
      }
      
      // Also collect valid percentages for fallback
      if (pct > 0 && pct <= 100) {
        validPercentages.push(pct);
      }
    });
    
    // If we have totalEarned and totalMax, calculate percentage from them
    if (totalEarned > 0 && totalMax > 0) {
      const calc = Math.round((totalEarned / totalMax) * 100);
      // If the result is between 0 and 100, use it
      if (calc >= 0 && calc <= 100) {
        return calc;
      }
    }
    
    // Fallback: average of valid percentages
    if (validPercentages.length > 0) {
      return Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length);
    }
  }
  
  // Fallback: use percentage_score
  if (report.percentage_score !== undefined && report.percentage_score !== null) {
    const val = safeNumber(report.percentage_score);
    if (val > 0 && val <= 100) {
      return val;
    }
  }
  
  // Final fallback: total/max
  if (report.total_score !== undefined && report.max_score !== undefined) {
    const total = safeNumber(report.total_score);
    const max = safeNumber(report.max_score);
    if (max > 0) {
      const calc = Math.round((total / max) * 100);
      if (calc >= 0 && calc <= 100) {
        return calc;
      }
    }
  }
  
  return 0;
}

function calculateNationalServiceRecommendation(score) {
  const s = Number(score || 0);
  if (s >= 85) return 'Highly Recommended';
  if (s >= 75) return 'Recommended';
  if (s >= 65) return 'Reserve Pool';
  return 'Not Recommended';
}

function getStatus(report) {
  if (report.completed_at) {
    return 'Completed';
  }
  return report.status || 'Pending';
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

  // 🟢 FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 🟢 OPTIONS FOR FILTERS
  const [universityOptions, setUniversityOptions] = useState([]);
  const [programOptions, setProgramOptions] = useState([]);
  const [assessmentTypeOptions, setAssessmentTypeOptions] = useState([]);
  const [statusOptions] = useState(['Completed', 'Pending', 'In Progress', 'Failed']);

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
      const token = sessionData?.session?.access_token;

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/supervisor/reports', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load reports');
      }

      const { data: profile } = await supabase
        .from('supervisor_profiles')
        .select('full_name, email')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();

      if (profile) {
        setCurrentSupervisor(profile);
      }

      const reportsData = data.reports || [];

      const processedReports = reportsData.map(report => {
        const isNationalService = 
          report.assessment_id === NATIONAL_SERVICE_ASSESSMENT_ID ||
          report.is_national_service === true ||
          report.assessment_title === 'National Service Recruitment Assessment';

        const displayScore = calculateScore(report);
        
        let recommendation = report.recommendation || 'N/A';
        if (isNationalService && displayScore > 0) {
          recommendation = calculateNationalServiceRecommendation(displayScore);
        }

        const status = getStatus(report);

        return {
          id: report.result_id || report.id,
          candidate_name: report.candidate_name || 'Unknown',
          candidate_email: report.candidate_email || '',
          candidate_university: report.university || 'Not Specified',
          candidate_programme: report.programme || 'Not Specified',
          assessment_id: report.assessment_id,
          assessment_title: report.assessment_title || 'Untitled Assessment',
          assessment_type: report.assessment_type || 'general',
          displayScore: displayScore,
          recommendation: recommendation,
          status: status,
          completed_at: report.completed_at,
          created_at: report.created_at,
          isNationalService: isNationalService,
          total_score: report.total_score,
          max_score: report.max_score,
          percentage_score: report.percentage_score,
          category_scores: report.category_scores || report.report_data?.categoryScores || []
        };
      });

      setAllReports(processedReports);

      // Extract unique values for filters
      const universities = [...new Set(processedReports.map(r => r.candidate_university).filter(u => u && u !== 'Not Specified'))];
      const programs = [...new Set(processedReports.map(r => r.candidate_programme).filter(p => p && p !== 'Not Specified'))];
      const assessmentTypes = [...new Set(processedReports
        .filter(r => !r.isNationalService)
        .map(r => r.assessment_title)
        .filter(t => t && t !== 'Untitled Assessment')
      )];

      setUniversityOptions(universities.sort());
      setProgramOptions(programs.sort());
      setAssessmentTypeOptions(assessmentTypes.sort());

      updateStats(processedReports, activeTab);

    } catch (error) {
      console.error('Error loading reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const updateStats = (reports, tab) => {
    const filtered = getFilteredReportsInternal(reports, tab);
    
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
      if (r.status === 'Completed') completed++;
      else if (r.status === 'Pending' || r.status === 'In Progress') pending++;
      else if (r.status === 'Failed') failed++;
    });

    setStats({
      totalAssessments: filtered.length,
      averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      completedAssessments: completed,
      pendingReview: pending,
      failed: failed
    });
  };

  const getFilteredReportsInternal = (reports, tab) => {
    let filtered = tab === 'national' 
      ? reports.filter(r => r.isNationalService === true)
      : reports.filter(r => r.isNationalService === false);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.candidate_name.toLowerCase().includes(term) ||
        r.candidate_email.toLowerCase().includes(term) ||
        r.assessment_title.toLowerCase().includes(term) ||
        r.candidate_university.toLowerCase().includes(term) ||
        r.candidate_programme.toLowerCase().includes(term)
      );
    }

    if (selectedUniversity) {
      filtered = filtered.filter(r => r.candidate_university === selectedUniversity);
    }

    if (selectedProgram) {
      filtered = filtered.filter(r => r.candidate_programme === selectedProgram);
    }

    if (selectedAssessmentType && tab === 'other') {
      filtered = filtered.filter(r => r.assessment_title === selectedAssessmentType);
    }

    filtered = filtered.filter(r => {
      const score = r.displayScore || 0;
      return score >= minScore && score <= maxScore;
    });

    if (selectedStatus) {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    if (dateFrom) {
      filtered = filtered.filter(r => r.completed_at && new Date(r.completed_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(r => r.completed_at && new Date(r.completed_at) <= new Date(dateTo));
    }

    return filtered;
  };

  const filteredReports = useMemo(() => {
    return getFilteredReportsInternal(allReports, activeTab);
  }, [allReports, activeTab, searchTerm, selectedUniversity, selectedProgram, selectedAssessmentType, minScore, maxScore, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    if (allReports.length > 0) {
      updateStats(allReports, activeTab);
    }
  }, [allReports, activeTab, searchTerm, selectedUniversity, selectedProgram, selectedAssessmentType, minScore, maxScore, selectedStatus, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedUniversity('');
    setSelectedProgram('');
    setSelectedAssessmentType('');
    setMinScore(0);
    setMaxScore(100);
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#48bb78';
      case 'Pending': return '#ed8936';
      case 'In Progress': return '#4299e1';
      case 'Failed': return '#fc8181';
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
    resetFilters();
    router.push(`/supervisor/reports?tab=${tab}`, undefined, { shallow: true });
  };

  const activeFilterCount = [searchTerm, selectedUniversity, selectedProgram, selectedAssessmentType, minScore > 0 || maxScore < 100, selectedStatus, dateFrom, dateTo].filter(Boolean).length;

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

        {/* 🟢 FILTERS BAR */}
        <div style={styles.filtersBar}>
          <div style={styles.filtersRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>🔍 Search</label>
              <input
                type="text"
                placeholder="Search by name, email, assessment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>🏫 University</label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                style={styles.select}
              >
                <option value="">All Universities</option>
                {universityOptions.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>📚 Program</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                style={styles.select}
              >
                <option value="">All Programs</option>
                {programOptions.map(prog => (
                  <option key={prog} value={prog}>{prog}</option>
                ))}
              </select>
            </div>

            {activeTab === 'other' && assessmentTypeOptions.length > 0 && (
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>📋 Assessment Type</label>
                <select
                  value={selectedAssessmentType}
                  onChange={(e) => setSelectedAssessmentType(e.target.value)}
                  style={styles.select}
                >
                  <option value="">All Types</option>
                  {assessmentTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.filterGroupScore}>
              <label style={styles.filterLabel}>📊 Score Range</label>
              <div style={styles.scoreRange}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Min"
                  value={minScore}
                  onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  style={styles.scoreInputSmall}
                />
                <span style={styles.scoreSeparator}>to</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Max"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Math.max(0, Math.min(100, Number(e.target.value) || 100)))}
                  style={styles.scoreInputSmall}
                />
              </div>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>📌 Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={styles.select}
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroupDate}>
              <label style={styles.filterLabel}>📅 Date Range</label>
              <div style={styles.dateRange}>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={styles.dateInput}
                />
                <span style={styles.dateSeparator}>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>

            <div style={styles.filterActions}>
              <button 
                onClick={resetFilters} 
                style={{
                  ...styles.resetButton,
                  background: activeFilterCount > 0 ? '#2563EB' : '#f1f5f9',
                  color: activeFilterCount > 0 ? 'white' : '#475569'
                }}
              >
                Reset {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div style={styles.activeFilters}>
              <span style={styles.activeFiltersLabel}>Active Filters:</span>
              {searchTerm && <span style={styles.filterTag}>🔍 {searchTerm}</span>}
              {selectedUniversity && <span style={styles.filterTag}>🏫 {selectedUniversity}</span>}
              {selectedProgram && <span style={styles.filterTag}>📚 {selectedProgram}</span>}
              {selectedAssessmentType && <span style={styles.filterTag}>📋 {selectedAssessmentType}</span>}
              {(minScore > 0 || maxScore < 100) && (
                <span style={styles.filterTag}>📊 {minScore}% - {maxScore}%</span>
              )}
              {selectedStatus && <span style={styles.filterTag}>📌 {selectedStatus}</span>}
              {dateFrom && <span style={styles.filterTag}>📅 From {new Date(dateFrom).toLocaleDateString()}</span>}
              {dateTo && <span style={styles.filterTag}>📅 To {new Date(dateTo).toLocaleDateString()}</span>}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📋</div>
            <div>
              <div style={styles.statsValue}>{filteredReports.length}</div>
              <div style={styles.statsLabel}>Showing {filteredReports.length} of {allReports.filter(r => activeTab === 'national' ? r.isNationalService : !r.isNationalService).length}</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>📈</div>
            <div>
              <div style={styles.statsValue}>
                {filteredReports.filter(r => r.displayScore > 0).length > 0 
                  ? Math.round(filteredReports.filter(r => r.displayScore > 0).reduce((a, b) => a + b.displayScore, 0) / filteredReports.filter(r => r.displayScore > 0).length) 
                  : 0}%
              </div>
              <div style={styles.statsLabel}>Average Score</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>✅</div>
            <div>
              <div style={styles.statsValue}>{filteredReports.filter(r => r.status === 'Completed').length}</div>
              <div style={styles.statsLabel}>Completed</div>
            </div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsIcon}>⏳</div>
            <div>
              <div style={styles.statsValue}>{filteredReports.filter(r => r.status === 'Pending').length}</div>
              <div style={styles.statsLabel}>Pending</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
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
            📋 National Service Reports ({allReports.filter(r => r.isNationalService).length})
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
            📊 Other Assessment Reports ({allReports.filter(r => !r.isNationalService).length})
          </button>
        </div>

        {/* Table */}
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
                {activeFilterCount > 0
                  ? 'No reports match your current filters. Try adjusting your search criteria.'
                  : `There are no ${activeTab === 'national' ? 'National Service' : 'other assessment'} reports available for your candidates yet.`
                }
              </p>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} style={styles.emptyButton}>
                  Clear All Filters
                </button>
              )}
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
                        {report.status}
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
    marginBottom: '24px',
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
  filtersBar: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'flex-end'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 180px',
    minWidth: '150px'
  },
  filterGroupScore: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 160px',
    minWidth: '140px'
  },
  filterGroupDate: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 220px',
    minWidth: '200px'
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  searchInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: 'white',
    width: '100%',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: 'white',
    width: '100%',
    cursor: 'pointer'
  },
  scoreRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  scoreInputSmall: {
    padding: '8px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: 'white',
    width: '60px',
    textAlign: 'center'
  },
  scoreSeparator: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  dateInput: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    background: 'white',
    width: '130px'
  },
  dateSeparator: {
    fontSize: '12px',
    color: '#94a3b8'
  },
  filterActions: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px'
  },
  resetButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#475569',
    whiteSpace: 'nowrap',
    height: '38px',
    transition: 'all 0.2s'
  },
  activeFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0'
  },
  activeFiltersLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    marginRight: '4px'
  },
  filterTag: {
    display: 'inline-block',
    padding: '2px 10px',
    background: '#eef2ff',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#2563EB',
    fontWeight: '500'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statsCard: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  statsIcon: {
    fontSize: '28px'
  },
  statsValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#0A1929'
  },
  statsLabel: {
    fontSize: '11px',
    color: '#718096'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
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
    fontSize: '14px',
    minWidth: '900px'
  },
  tableHeadRow: {
    background: '#F8FAFC'
  },
  tableHeadCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '2px solid #E2E8F0',
    fontSize: '12px',
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
    fontSize: '13px',
    color: '#2D3748',
    verticalAlign: 'middle'
  },
  candidateName: {
    fontWeight: '500',
    color: '#1a202c'
  },
  candidateEmail: {
    fontSize: '11px',
    color: '#94a3b8'
  },
  scoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  noScoreBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#94a3b8',
    background: '#f1f5f9'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
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
    margin: '0 0 16px 0'
  },
  emptyButton: {
    padding: '8px 20px',
    background: '#0A1929',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
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
