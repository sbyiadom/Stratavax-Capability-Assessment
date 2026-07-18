// components/reports/NationalServiceReport.js - FIXED VERSION

import React, { useEffect } from 'react';

export default function NationalServiceReport({ report, onBack }) {
  useEffect(() => {
    console.log('[NationalServiceReport] Report received:', report);
    console.log('[NationalServiceReport] Report keys:', Object.keys(report || {}));
    console.log('[NationalServiceReport] category_scores:', report?.category_scores);
    console.log('[NationalServiceReport] report_data?:', report?.report_data);
  }, [report]);

  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  // ============================================================
  // FIX: Extract data from multiple possible locations
  // ============================================================
  // Try to get data from report.report_data if it exists (nested format)
  const reportData = report.report_data || report;
  
  // Extract candidate info
  const candidateInfo = reportData.candidateInfo || report.candidateInfo || {};
  const candidateName = reportData.candidateName || candidateInfo.fullName || report.candidateName || 'Candidate';
  const university = reportData.university || candidateInfo.university || report.university || 'N/A';
  const programme = reportData.programme || candidateInfo.programme || report.programme || 'N/A';
  const graduationYear = reportData.graduationYear || candidateInfo.graduationYear || report.graduationYear || 'N/A';
  const preferredDepartment = reportData.preferredDepartment || candidateInfo.preferredDepartment || report.preferredDepartment || 'Not Specified';
  
  // Extract scores - try multiple locations
  const workplace_readiness = 
    reportData.workplace_readiness !== undefined ? reportData.workplace_readiness :
    reportData.workplaceReadiness !== undefined ? reportData.workplaceReadiness :
    report.workplace_readiness !== undefined ? report.workplace_readiness :
    report.dimensions?.workplaceReadiness || 0;
  
  const intellectual_capability = 
    reportData.intellectual_capability !== undefined ? reportData.intellectual_capability :
    reportData.intellectualCapability !== undefined ? reportData.intellectualCapability :
    report.intellectual_capability !== undefined ? report.intellectual_capability :
    report.dimensions?.intellectualCapability || 0;
  
  const percentage_score = 
    reportData.percentage_score !== undefined ? reportData.percentage_score :
    reportData.overallScore !== undefined ? reportData.overallScore :
    report.percentage_score !== undefined ? report.percentage_score :
    report.overallScore || 0;
  
  // Extract recommendation
  const recommendationLevel = 
    reportData.recommendation || 
    report.recommendation || 
    report.recommendationLevel || 
    'Not Recommended';
  
  // Extract completion date
  const completed_at = reportData.completed_at || report.completed_at || null;
  const assessmentDate = candidateInfo.assessmentDate || 
    (completed_at ? new Date(completed_at).toLocaleDateString() : 'N/A');
  
  // ============================================================
  // FIX: Extract category_scores from multiple possible locations
  // ============================================================
  let categoryScores = [];
  
  // Try reportData.category_scores (from the API)
  if (reportData.category_scores && Array.isArray(reportData.category_scores) && reportData.category_scores.length > 0) {
    categoryScores = reportData.category_scores;
    console.log('[Report] Using reportData.category_scores:', categoryScores.length);
  } 
  // Try report.category_scores
  else if (report.category_scores && Array.isArray(report.category_scores) && report.category_scores.length > 0) {
    categoryScores = report.category_scores;
    console.log('[Report] Using report.category_scores:', categoryScores.length);
  }
  // Try reportData.categoryBreakdown
  else if (reportData.categoryBreakdown && Array.isArray(reportData.categoryBreakdown) && reportData.categoryBreakdown.length > 0) {
    categoryScores = reportData.categoryBreakdown;
    console.log('[Report] Using reportData.categoryBreakdown:', categoryScores.length);
  }
  // Try report.categoryBreakdown
  else if (report.categoryBreakdown && Array.isArray(report.categoryBreakdown) && report.categoryBreakdown.length > 0) {
    categoryScores = report.categoryBreakdown;
    console.log('[Report] Using report.categoryBreakdown:', categoryScores.length);
  }
  // Try reportData.categoryScores
  else if (reportData.categoryScores && Array.isArray(reportData.categoryScores) && reportData.categoryScores.length > 0) {
    categoryScores = reportData.categoryScores;
    console.log('[Report] Using reportData.categoryScores:', categoryScores.length);
  }
  // Try report.categoryScores
  else if (report.categoryScores && Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
    categoryScores = report.categoryScores;
    console.log('[Report] Using report.categoryScores:', categoryScores.length);
  }
  // Fallback: try to find category data in the report data
  else {
    // Check if there's a categories or dimensions object
    if (reportData.categories && Array.isArray(reportData.categories)) {
      categoryScores = reportData.categories;
    } else if (reportData.dimensions && reportData.dimensions.categories) {
      categoryScores = reportData.dimensions.categories;
    } else if (reportData.subCategories) {
      categoryScores = reportData.subCategories;
    } else if (report.dimensions && report.dimensions.categories) {
      categoryScores = report.dimensions.categories;
    }
  }

  // ============================================================
  // SPLIT SUB-CATEGORIES INTO WORKPLACE AND INTELLECTUAL
  // ============================================================
  const workplaceSubCategories = [];
  const intellectualSubCategories = [];

  const workplaceCategoryNames = [
    'Safety & Risk Awareness',
    'Technical Fundamentals',
    'Communication & Teamwork',
    'Ownership & Integrity',
    'Workplace Ethics',
    'Professional Conduct',
    'Work Ethic'
  ];

  const intellectualCategoryNames = [
    'Problem Solving & Troubleshooting',
    'Logical Reasoning',
    'Numerical Reasoning',
    'Measurement & Engineering Units',
    'Learning Agility',
    'Cognitive Ability',
    'Analytical Thinking'
  ];

  if (categoryScores && categoryScores.length > 0) {
    categoryScores.forEach(cat => {
      const categoryName = cat.category || cat.name || '';
      
      const isWorkplace = workplaceCategoryNames.some(name => 
        categoryName.toLowerCase().includes(name.toLowerCase())
      );
      
      const isIntellectual = intellectualCategoryNames.some(name => 
        categoryName.toLowerCase().includes(name.toLowerCase())
      );

      if (isWorkplace) {
        workplaceSubCategories.push(cat);
      } else if (isIntellectual) {
        intellectualSubCategories.push(cat);
      } else {
        const lowerName = categoryName.toLowerCase();
        if (lowerName.includes('safety') || lowerName.includes('technical') || 
            lowerName.includes('communication') || lowerName.includes('teamwork') ||
            lowerName.includes('ownership') || lowerName.includes('integrity') ||
            lowerName.includes('workplace') || lowerName.includes('ethics') ||
            lowerName.includes('professional') || lowerName.includes('conduct')) {
          workplaceSubCategories.push(cat);
        } else if (lowerName.includes('problem') || lowerName.includes('logical') ||
                   lowerName.includes('numerical') || lowerName.includes('measurement') ||
                   lowerName.includes('engineering') || lowerName.includes('learning') ||
                   lowerName.includes('cognitive') || lowerName.includes('analytical')) {
          intellectualSubCategories.push(cat);
        } else {
          // Default: put it in the category it most likely belongs to
          // If it has a dimension field, use that
          if (cat.dimension === 'workplace') {
            workplaceSubCategories.push(cat);
          } else if (cat.dimension === 'intellectual') {
            intellectualSubCategories.push(cat);
          } else {
            // Unknown - put in both? No, just put in intellectual
            intellectualSubCategories.push(cat);
          }
        }
      }
    });
  }

  console.log('[Report] Workplace sub-categories:', workplaceSubCategories.length);
  console.log('[Report] Intellectual sub-categories:', intellectualSubCategories.length);
  console.log('[Report] Workplace score:', workplace_readiness);
  console.log('[Report] Intellectual score:', intellectual_capability);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const getCategoryComment = (percentage) => {
    if (percentage >= 90) return { text: 'Exceptional', color: '#2e7d32' };
    if (percentage >= 80) return { text: 'Strong', color: '#2e7d32' };
    if (percentage >= 70) return { text: 'Competent', color: '#1565c0' };
    if (percentage >= 60) return { text: 'Adequate', color: '#f57c00' };
    if (percentage >= 50) return { text: 'Development Required', color: '#ea580c' };
    return { text: 'Critical Gap', color: '#c62828' };
  };

  const getRecommendationColor = (level) => {
    if (!level) return '#333';
    const l = level.toLowerCase();
    if (l.includes('highly')) return '#2e7d32';
    if (l.includes('recommend')) return '#1565c0';
    if (l.includes('reserve')) return '#f57c00';
    if (l.includes('not')) return '#c62828';
    return '#333';
  };

  const getRecommendationBg = (level) => {
    if (!level) return '#f5f5f5';
    const l = level.toLowerCase();
    if (l.includes('highly')) return '#e8f5e9';
    if (l.includes('recommend')) return '#e3f2fd';
    if (l.includes('reserve')) return '#fff3e0';
    if (l.includes('not')) return '#ffebee';
    return '#f5f5f5';
  };

  const getBandColor = (band) => {
    if (!band) return '#333';
    const b = band.toString().toLowerCase();
    if (b === 'excellent' || b === 'exceptional' || b === 'ready') return '#2e7d32';
    if (b === 'strong' || b === 'high potential') return '#1565c0';
    if (b === 'developing' || b === 'moderate potential') return '#f57c00';
    if (b === 'needs improvement' || b === 'development required') return '#c62828';
    return '#333';
  };

  const getRecommendationNarrative = (level) => {
    if (!level) return 'Assessment results indicate that the candidate\'s profile should be reviewed by the hiring team.';
    const l = level.toLowerCase();
    if (l.includes('highly')) {
      return 'This candidate demonstrates exceptional workplace readiness and intellectual capability. They are strongly recommended for immediate placement.';
    }
    if (l.includes('recommend')) {
      return 'This candidate demonstrates strong workplace readiness and intellectual capability. They are recommended for placement with standard supervision.';
    }
    if (l.includes('reserve')) {
      return 'This candidate demonstrates adequate workplace readiness and intellectual capability. They may be considered for the reserve pool.';
    }
    if (l.includes('not')) {
      return 'This candidate does not currently meet the required thresholds. Targeted development in key areas is recommended.';
    }
    return 'Assessment results indicate that the candidate\'s profile should be reviewed by the hiring team.';
  };

  const recommendationColor = getRecommendationColor(recommendationLevel);
  const recommendationBg = getRecommendationBg(recommendationLevel);
  const recommendationNarrative = getRecommendationNarrative(recommendationLevel);

  // Calculate overall score
  const overallScore = workplace_readiness > 0 || intellectual_capability > 0 
    ? Math.round((Number(workplace_readiness) + Number(intellectual_capability)) / 2) 
    : Number(percentage_score);

  // Sort categories
  const sortedWorkplace = [...workplaceSubCategories].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  const sortedIntellectual = [...intellectualSubCategories].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // Get top strengths and development areas
  const allSubCategories = [...workplaceSubCategories, ...intellectualSubCategories];
  const topStrengths = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 3);

  const developmentAreas = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0 && (c.percentage || 0) < 60)
    .sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

  // Get suggested placements
  const getSuggestedPlacements = () => {
    if (report.suggestedPlacement && report.suggestedPlacement.length > 0) {
      return report.suggestedPlacement;
    }
    if (reportData.suggestedDepartments && reportData.suggestedDepartments.length > 0) {
      return reportData.suggestedDepartments;
    }
    
    const workplace = Number(workplace_readiness) || 0;
    const intellectual = Number(intellectual_capability) || 0;
    const overall = (workplace + intellectual) / 2;
    
    if (workplace >= 85 && intellectual >= 85) {
      return ['Operations & Production Management', 'Quality Assurance & Control', 'Supply Chain & Logistics', 'Technical Services'];
    } else if (workplace >= 75 && intellectual >= 75) {
      return ['Production Support', 'Maintenance & Engineering', 'Quality Control', 'Warehouse & Distribution'];
    } else if (workplace >= 65 && intellectual >= 65) {
      return ['General Operations', 'Administrative Support', 'Entry-Level Technical Roles'];
    } else if (overall >= 50) {
      return ['Structured Training Programs', 'Supervised Development Roles'];
    } else {
      return ['Foundation Training', 'Supervised Onboarding'];
    }
  };

  const suggestedPlacements = getSuggestedPlacements();

  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>National Service Recruitment Assessment</h1>
        <div style={styles.candidateInfo}>
          <div style={styles.candidateInfoGrid}>
            <div><span style={styles.infoLabel}>Candidate:</span><span style={styles.infoValue}>{candidateName}</span></div>
            <div><span style={styles.infoLabel}>University:</span><span style={styles.infoValue}>{university}</span></div>
            <div><span style={styles.infoLabel}>Programme:</span><span style={styles.infoValue}>{programme}</span></div>
            <div><span style={styles.infoLabel}>Graduation Year:</span><span style={styles.infoValue}>{graduationYear}</span></div>
            <div><span style={styles.infoLabel}>Preferred Department:</span><span style={styles.infoValue}>{preferredDepartment}</span></div>
            <div><span style={styles.infoLabel}>Assessment Date:</span><span style={styles.infoValue}>{assessmentDate}</span></div>
          </div>
        </div>
      </div>

      {/* Recommendation Banner */}
      <div style={{ ...styles.banner, background: recommendationBg, border: `3px solid ${recommendationColor}` }}>
        <div style={styles.bannerContent}>
          <div style={{ ...styles.bannerIcon, color: recommendationColor }}>
            {recommendationLevel.includes('Highly') ? '★' :
             recommendationLevel.includes('Recommend') ? '✓' :
             recommendationLevel.includes('Reserve') ? '●' : '⚠'}
          </div>
          <div>
            <div style={{ ...styles.bannerTitle, color: recommendationColor }}>{recommendationLevel}</div>
            <div style={styles.bannerNarrative}>{recommendationNarrative}</div>
          </div>
        </div>
      </div>

      {/* Score Cards - Main Categories */}
      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Workplace Readiness</div>
          <div style={styles.scoreValue}>{Math.round(workplace_readiness)}%</div>
          <div style={{ ...styles.scoreBand, color: getBandColor(workplace_readiness >= 70 ? 'Ready' : workplace_readiness >= 50 ? 'Developing' : 'Needs Improvement') }}>
            {workplace_readiness >= 70 ? 'Ready' : workplace_readiness >= 50 ? 'Developing' : 'Needs Improvement'}
          </div>
          <div style={styles.subCategoryCount}>
            {sortedWorkplace.length} sub-categories assessed
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Intellectual Capability</div>
          <div style={styles.scoreValue}>{Math.round(intellectual_capability)}%</div>
          <div style={{ ...styles.scoreBand, color: getBandColor(intellectual_capability >= 70 ? 'Ready' : intellectual_capability >= 50 ? 'Developing' : 'Development Required') }}>
            {intellectual_capability >= 70 ? 'Ready' : intellectual_capability >= 50 ? 'Developing' : 'Development Required'}
          </div>
          <div style={styles.subCategoryCount}>
            {sortedIntellectual.length} sub-categories assessed
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{Math.round(overallScore)}%</div>
          <div style={{ ...styles.scoreBand, color: overallScore >= 70 ? '#2e7d32' : overallScore >= 50 ? '#f57c00' : '#c62828' }}>
            {overallScore >= 70 ? 'Recommended' : overallScore >= 50 ? 'Conditional' : 'Not Recommended'}
          </div>
        </div>
      </div>

      {/* Workplace Readiness - Sub-Category Breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Workplace Readiness - Sub-Category Breakdown</h2>
          <span style={styles.sectionScore}>{Math.round(workplace_readiness)}%</span>
        </div>
        {sortedWorkplace.length > 0 ? (
          <div style={styles.categoryGrid}>
            {sortedWorkplace.map((cat, index) => {
              const percentage = cat.percentage || 0;
              const comment = getCategoryComment(percentage);
              const categoryName = cat.category || cat.name || 'Unknown';
              const score = cat.score || cat.earned || 0;
              const maxScore = cat.maxScore || cat.max || 100;
              
              return (
                <div key={index} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryName}>{categoryName}</span>
                    <span style={{ ...styles.categoryScore, color: comment.color }}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <div style={styles.categoryBar}>
                    <div style={{ ...styles.categoryBarFill, width: Math.min(percentage, 100) + '%', background: comment.color }} />
                  </div>
                  <div style={styles.categoryDetail}>
                    {Math.round(score)} / {Math.round(maxScore)} points
                  </div>
                  <div style={{ ...styles.categoryComment, color: comment.color }}>
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No sub-category data available for Workplace Readiness.</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              Category scores will appear here once available.
            </p>
          </div>
        )}
      </div>

      {/* Intellectual Capability - Sub-Category Breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Intellectual Capability - Sub-Category Breakdown</h2>
          <span style={styles.sectionScore}>{Math.round(intellectual_capability)}%</span>
        </div>
        {sortedIntellectual.length > 0 ? (
          <div style={styles.categoryGrid}>
            {sortedIntellectual.map((cat, index) => {
              const percentage = cat.percentage || 0;
              const comment = getCategoryComment(percentage);
              const categoryName = cat.category || cat.name || 'Unknown';
              const score = cat.score || cat.earned || 0;
              const maxScore = cat.maxScore || cat.max || 100;
              
              return (
                <div key={index} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryName}>{categoryName}</span>
                    <span style={{ ...styles.categoryScore, color: comment.color }}>
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <div style={styles.categoryBar}>
                    <div style={{ ...styles.categoryBarFill, width: Math.min(percentage, 100) + '%', background: comment.color }} />
                  </div>
                  <div style={styles.categoryDetail}>
                    {Math.round(score)} / {Math.round(maxScore)} points
                  </div>
                  <div style={{ ...styles.categoryComment, color: comment.color }}>
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No sub-category data available for Intellectual Capability.</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              Category scores will appear here once available.
            </p>
          </div>
        )}
      </div>

      {/* Top Strengths */}
      {topStrengths.length > 0 && topStrengths[0].percentage > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Top Strengths</h2>
          <div style={styles.strengthGrid}>
            {topStrengths.map((strength, index) => {
              const percentage = strength.percentage || 0;
              const categoryName = strength.category || strength.name || 'Unknown';
              return (
                <div key={index} style={styles.strengthCard}>
                  <div style={styles.strengthRank}>{index + 1}</div>
                  <div style={styles.strengthContent}>
                    <div style={styles.strengthName}>{categoryName}</div>
                    <div style={styles.strengthScore}>{Math.round(percentage)}%</div>
                    <div style={styles.strengthBar}>
                      <div style={{ ...styles.strengthBarFill, width: Math.min(percentage, 100) + '%' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Development Areas */}
      {developmentAreas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Development Areas</h2>
          <div style={styles.developmentGrid}>
            {developmentAreas.map((area, index) => {
              const percentage = area.percentage || 0;
              const categoryName = area.category || area.name || 'Unknown';
              return (
                <div key={index} style={styles.developmentCard}>
                  <div style={styles.developmentRank}>{index + 1}</div>
                  <div style={styles.developmentContent}>
                    <div style={styles.developmentName}>{categoryName}</div>
                    <div style={styles.developmentScore}>{Math.round(percentage)}%</div>
                    <div style={styles.developmentBar}>
                      <div style={{ ...styles.developmentBarFill, width: Math.min(percentage, 100) + '%' }} />
                    </div>
                    <div style={styles.developmentGap}>
                      Gap to 70% target: {Math.round(70 - percentage)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Placement */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Suggested Placement</h2>
        <div style={styles.placementContainer}>
          <p style={styles.placementDescription}>
            Based on the candidate's performance profile, the following recommendations are suggested:
          </p>
          <div style={styles.placementGrid}>
            {suggestedPlacements.map((dept, index) => (
              <div key={index} style={styles.placementCard}>
                <span style={styles.placementIcon}>•</span>
                <span style={styles.placementName}>{dept}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assessment Statistics */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Assessment Statistics</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{Math.round(workplace_readiness)}%</div>
            <div style={styles.statLabel}>Workplace Readiness</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{Math.round(intellectual_capability)}%</div>
            <div style={styles.statLabel}>Intellectual Capability</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{Math.round(overallScore)}%</div>
            <div style={styles.statLabel}>Overall Score</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{allSubCategories.length || 0}</div>
            <div style={styles.statLabel}>Sub-Categories Assessed</div>
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>
          Print Report
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { 
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '20px', 
    fontFamily: 'system-ui, -apple-system, sans-serif' 
  },
  backButton: { 
    padding: '8px 16px', 
    background: 'transparent', 
    border: '1px solid #e2e8f0', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '14px', 
    color: '#475569', 
    marginBottom: '20px' 
  },
  header: { 
    textAlign: 'center', 
    padding: '30px 20px 20px', 
    background: 'linear-gradient(135deg, #0b2a4e 0%, #1b4a7a 100%)', 
    borderRadius: '12px', 
    color: 'white', 
    marginBottom: '30px' 
  },
  title: { 
    fontSize: '28px', 
    fontWeight: '700', 
    margin: '0 0 16px 0' 
  },
  candidateInfo: { 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '8px', 
    padding: '16px 20px', 
    marginTop: '8px' 
  },
  candidateInfoGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '12px', 
    textAlign: 'left' 
  },
  infoLabel: { 
    fontSize: '12px', 
    opacity: 0.7, 
    display: 'block', 
    marginBottom: '2px' 
  },
  infoValue: { 
    fontSize: '15px', 
    fontWeight: '500', 
    display: 'block' 
  },
  banner: { 
    borderRadius: '12px', 
    padding: '20px 24px', 
    marginBottom: '24px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
  },
  bannerContent: { 
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: '16px' 
  },
  bannerIcon: { 
    fontSize: '32px', 
    lineHeight: '1' 
  },
  bannerTitle: { 
    fontSize: '20px', 
    fontWeight: '700', 
    marginBottom: '4px' 
  },
  bannerNarrative: { 
    fontSize: '14px', 
    color: '#1a202c', 
    lineHeight: '1.6' 
  },
  scoreGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '20px', 
    marginBottom: '30px' 
  },
  scoreCard: { 
    background: 'white', 
    padding: '24px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
    textAlign: 'center',
    border: '1px solid #e2e8f0' 
  },
  scoreLabel: { 
    fontSize: '14px', 
    color: '#64748b', 
    fontWeight: '500', 
    marginBottom: '8px' 
  },
  scoreValue: { 
    fontSize: '32px', 
    fontWeight: '700', 
    color: '#0b2a4e' 
  },
  scoreBand: { 
    fontSize: '14px', 
    fontWeight: '600', 
    marginTop: '8px' 
  },
  subCategoryCount: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px'
  },
  section: { 
    marginBottom: '30px' 
  },
  sectionHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '16px' 
  },
  sectionTitle: { 
    fontSize: '20px', 
    fontWeight: '600', 
    color: '#0b2a4e', 
    margin: 0 
  },
  sectionScore: { 
    fontSize: '18px', 
    fontWeight: '700', 
    color: '#0b2a4e', 
    background: '#e8eaf6', 
    padding: '4px 16px', 
    borderRadius: '20px' 
  },
  categoryGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '16px' 
  },
  categoryCard: { 
    background: 'white', 
    padding: '16px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
    border: '1px solid #e2e8f0' 
  },
  categoryHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '8px' 
  },
  categoryName: { 
    fontSize: '14px', 
    fontWeight: '500', 
    color: '#475569' 
  },
  categoryScore: { 
    fontSize: '20px', 
    fontWeight: '700' 
  },
  categoryBar: { 
    height: '8px', 
    background: '#e2e8f0', 
    borderRadius: '4px', 
    overflow: 'hidden', 
    marginBottom: '6px' 
  },
  categoryBarFill: { 
    height: '100%', 
    borderRadius: '4px' 
  },
  categoryDetail: { 
    fontSize: '12px', 
    color: '#94a3b8' 
  },
  categoryComment: { 
    fontSize: '13px', 
    fontWeight: '500', 
    marginTop: '4px' 
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    color: '#64748b'
  },
  strengthGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '16px' 
  },
  strengthCard: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '16px', 
    background: 'white', 
    padding: '16px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
    border: '1px solid #e2e8f0' 
  },
  strengthRank: { 
    width: '32px', 
    height: '32px', 
    background: '#2e7d32', 
    color: 'white', 
    borderRadius: '50%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '14px', 
    fontWeight: '700', 
    flexShrink: 0 
  },
  strengthContent: { 
    flex: 1 
  },
  strengthName: { 
    fontSize: '14px', 
    fontWeight: '500', 
    color: '#1a202c', 
    marginBottom: '4px' 
  },
  strengthScore: { 
    fontSize: '16px', 
    fontWeight: '700', 
    color: '#2e7d32', 
    marginBottom: '4px' 
  },
  strengthBar: { 
    height: '4px', 
    background: '#e8f5e9', 
    borderRadius: '2px', 
    overflow: 'hidden' 
  },
  strengthBarFill: { 
    height: '100%', 
    background: 'linear-gradient(90deg, #43a047, #2e7d32)', 
    borderRadius: '2px' 
  },
  developmentGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '16px' 
  },
  developmentCard: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '16px', 
    background: 'white', 
    padding: '16px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
    border: '1px solid #e2e8f0' 
  },
  developmentRank: { 
    width: '32px', 
    height: '32px', 
    background: '#c62828', 
    color: 'white', 
    borderRadius: '50%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '14px', 
    fontWeight: '700', 
    flexShrink: 0 
  },
  developmentContent: { 
    flex: 1 
  },
  developmentName: { 
    fontSize: '14px', 
    fontWeight: '500', 
    color: '#1a202c', 
    marginBottom: '4px' 
  },
  developmentScore: { 
    fontSize: '16px', 
    fontWeight: '700', 
    color: '#c62828', 
    marginBottom: '4px' 
  },
  developmentBar: { 
    height: '4px', 
    background: '#ffebee', 
    borderRadius: '2px', 
    overflow: 'hidden', 
    marginBottom: '4px' 
  },
  developmentBarFill: { 
    height: '100%', 
    background: 'linear-gradient(90deg, #ef5350, #c62828)', 
    borderRadius: '2px' 
  },
  developmentGap: { 
    fontSize: '12px', 
    color: '#94a3b8' 
  },
  placementContainer: { 
    background: 'white', 
    padding: '20px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
    border: '1px solid #e2e8f0' 
  },
  placementDescription: { 
    fontSize: '14px', 
    color: '#475569', 
    marginBottom: '16px' 
  },
  placementGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
    gap: '12px' 
  },
  placementCard: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    padding: '12px 16px', 
    background: '#f8fafc', 
    borderRadius: '8px', 
    border: '1px solid #e2e8f0' 
  },
  placementIcon: { 
    fontSize: '18px' 
  },
  placementName: { 
    fontSize: '14px', 
    fontWeight: '500', 
    color: '#1a202c' 
  },
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
    gap: '16px' 
  },
  statCard: { 
    background: 'white', 
    padding: '16px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
    textAlign: 'center', 
    border: '1px solid #e2e8f0' 
  },
  statValue: { 
    fontSize: '24px', 
    fontWeight: '700', 
    color: '#0b2a4e' 
  },
  statLabel: { 
    fontSize: '12px', 
    color: '#94a3b8', 
    marginTop: '4px' 
  },
  actions: { 
    textAlign: 'center', 
    marginTop: '20px' 
  },
  printButton: { 
    padding: '12px 24px', 
    background: '#0b2a4e', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    fontSize: '16px', 
    fontWeight: '600', 
    cursor: 'pointer' 
  },
  loading: { 
    textAlign: 'center', 
    padding: '40px', 
    fontSize: '18px', 
    color: '#64748b' 
  }
};
