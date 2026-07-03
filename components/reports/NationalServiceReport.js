// components/reports/NationalServiceReport.js

import React from 'react';

export default function NationalServiceReport({ report, onBack }) {
  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  console.log('[Report] categoryBreakdown:', report.categoryBreakdown);

  const {
    candidateName = 'Candidate',
    dimensions = {},
    recommendation = {},
    categoryBreakdown = [],
    statistics = {},
    executiveSummary = {},
    candidateInfo = {},
  } = report;

  const getRecommendationColor = (level) => {
    switch (level) {
      case 'Highly Recommended': return '#2e7d32';
      case 'Recommended': return '#1565c0';
      case 'Reserve Pool': return '#f57c00';
      case 'Not Recommended': return '#c62828';
      default: return '#333';
    }
  };

  const getRecommendationBg = (level) => {
    switch (level) {
      case 'Highly Recommended': return '#e8f5e9';
      case 'Recommended': return '#e3f2fd';
      case 'Reserve Pool': return '#fff3e0';
      case 'Not Recommended': return '#ffebee';
      default: return '#f5f5f5';
    }
  };

  const getBandColor = (band) => {
    switch (band) {
      case 'Excellent':
      case 'Exceptional': return '#2e7d32';
      case 'Ready':
      case 'High Potential': return '#1565c0';
      case 'Developing':
      case 'Moderate Potential': return '#f57c00';
      case 'Needs Improvement':
      case 'Development Required': return '#c62828';
      default: return '#333';
    }
  };

  const getRecommendationNarrative = (level) => {
    switch (level) {
      case 'Highly Recommended':
        return 'This candidate demonstrates exceptional workplace readiness and intellectual capability. They are strongly recommended for immediate placement.';
      case 'Recommended':
        return 'This candidate demonstrates strong workplace readiness and intellectual capability. They are recommended for placement with standard supervision.';
      case 'Reserve Pool':
        return 'This candidate demonstrates adequate workplace readiness and intellectual capability. They may be considered for the reserve pool.';
      case 'Not Recommended':
        return 'This candidate does not currently meet the required thresholds. Targeted development in key areas is recommended.';
      default:
        return 'Assessment results indicate that the candidate\'s profile should be reviewed by the hiring team.';
    }
  };

  const getCategoryComment = (percentage) => {
    if (percentage >= 75) return '✅ Strong capability';
    if (percentage >= 65) return '⚡ Adequate performance';
    if (percentage >= 50) return '🔸 Development area';
    return '🔴 Critical development area';
  };

  // Filter categories by dimension
  const workplaceCategories = categoryBreakdown.filter(cat => cat.dimension === 'workplace');
  const intellectualCategories = categoryBreakdown.filter(cat => cat.dimension === 'intellectual');

  // Top strengths (top 3)
  const topStrengths = [...categoryBreakdown]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  // Development areas (below 65%)
  const developmentAreas = [...categoryBreakdown]
    .filter(item => item.percentage < 65)
    .sort((a, b) => a.percentage - b.percentage);

  const workplaceScore = dimensions.workplaceReadiness || 0;
  const intellectualScore = dimensions.intellectualCapability || 0;
  const overallScore = dimensions.overallScore || 0;

  const recommendationLevel = recommendation.level || 'Not Recommended';
  const recommendationColor = getRecommendationColor(recommendationLevel);
  const recommendationBg = getRecommendationBg(recommendationLevel);
  const recommendationNarrative = getRecommendationNarrative(recommendationLevel);

  // Company departments
  const companyDepartments = [
    { name: 'Manufacturing', icon: '🏭', subDepts: ['Production', 'Engineering/Maintenance', 'SHEQ', 'Quality Operations', 'Raw Materials & Warehouse', 'Utilities', 'Planning'] },
    { name: 'Supply Chain / Logistics', icon: '🚚', subDepts: ['Warehousing', 'Distribution', 'Fleet', 'Transport'] },
    { name: 'Procurement', icon: '📋', subDepts: [] },
    { name: 'Finance', icon: '💰', subDepts: [] },
    { name: 'Human Resources', icon: '👥', subDepts: [] },
    { name: 'Commercial', icon: '📊', subDepts: ['Sales', 'Trade Marketing', 'Customer Service'] },
    { name: 'Information Technology (IT)', icon: '💻', subDepts: [] },
    { name: 'Legal & Compliance', icon: '⚖️', subDepts: [] },
    { name: 'Corporate Affairs / Public Affairs', icon: '📢', subDepts: [] }
  ];

  const threshold = 60;
  const recommendedDepartments = companyDepartments.filter(
    d => workplaceScore >= threshold || intellectualScore >= threshold
  );

  return (
    <div style={styles.container}>
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>National Service Recruitment Assessment</h1>
        <div style={styles.candidateInfo}>
          <div style={styles.candidateInfoGrid}>
            <div><span style={styles.infoLabel}>Candidate:</span><span style={styles.infoValue}>{candidateInfo.fullName || candidateName}</span></div>
            <div><span style={styles.infoLabel}>University:</span><span style={styles.infoValue}>{candidateInfo.university || 'N/A'}</span></div>
            <div><span style={styles.infoLabel}>Programme:</span><span style={styles.infoValue}>{candidateInfo.programme || 'N/A'}</span></div>
            <div><span style={styles.infoLabel}>Graduation Year:</span><span style={styles.infoValue}>{candidateInfo.graduationYear || 'N/A'}</span></div>
            <div><span style={styles.infoLabel}>Preferred Department:</span><span style={styles.infoValue}>{candidateInfo.preferredDepartment || 'Not Specified'}</span></div>
            <div><span style={styles.infoLabel}>Assessment Date:</span><span style={styles.infoValue}>{candidateInfo.assessmentDate || new Date().toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div style={{ ...styles.banner, background: recommendationBg, border: `3px solid ${recommendationColor}` }}>
        <div style={styles.bannerContent}>
          <div style={{ ...styles.bannerIcon, color: recommendationColor }}>
            {recommendationLevel === 'Highly Recommended' ? '⭐' :
             recommendationLevel === 'Recommended' ? '✅' :
             recommendationLevel === 'Reserve Pool' ? '📋' : '⚠️'}
          </div>
          <div>
            <div style={{ ...styles.bannerTitle, color: recommendationColor }}>{recommendationLevel}</div>
            <div style={styles.bannerNarrative}>{recommendationNarrative}</div>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div style={styles.scoreGrid}>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Workplace Readiness</div>
          <div style={styles.scoreValue}>{workplaceScore}%</div>
          <div style={{ ...styles.scoreBand, color: getBandColor(executiveSummary.workplaceBand) }}>
            {executiveSummary.workplaceBand || 'N/A'}
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Intellectual Capability</div>
          <div style={styles.scoreValue}>{intellectualScore}%</div>
          <div style={{ ...styles.scoreBand, color: getBandColor(executiveSummary.intellectualBand) }}>
            {executiveSummary.intellectualBand || 'N/A'}
          </div>
        </div>
        <div style={styles.scoreCard}>
          <div style={styles.scoreLabel}>Overall Score</div>
          <div style={styles.scoreValue}>{overallScore}%</div>
        </div>
      </div>

      {/* Workplace Readiness Breakdown */}
      {workplaceCategories.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🛠️ Workplace Readiness - Topic Breakdown</h2>
          <div style={styles.categoryGrid}>
            {workplaceCategories.map((cat, index) => (
              <div key={index} style={styles.categoryCard}>
                <div style={styles.categoryName}>{cat.category}</div>
                <div style={styles.categoryScore}>{cat.percentage}%</div>
                <div style={styles.categoryBar}>
                  <div style={{ ...styles.categoryBarFill, width: Math.min(cat.percentage, 100) + '%' }} />
                </div>
                <div style={styles.categoryDetail}>
                  {Math.round(cat.earned || 0)} / {Math.round(cat.max || 10)} points
                </div>
                <div style={styles.categoryComment}>{getCategoryComment(cat.percentage)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intellectual Capability Breakdown */}
      {intellectualCategories.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🧠 Intellectual Capability - Topic Breakdown</h2>
          <div style={styles.categoryGrid}>
            {intellectualCategories.map((cat, index) => (
              <div key={index} style={styles.categoryCard}>
                <div style={styles.categoryName}>{cat.category}</div>
                <div style={styles.categoryScore}>{cat.percentage}%</div>
                <div style={styles.categoryBar}>
                  <div style={{ ...styles.categoryBarFill, width: Math.min(cat.percentage, 100) + '%' }} />
                </div>
                <div style={styles.categoryDetail}>
                  {Math.round(cat.earned || 0)} / {Math.round(cat.max || 10)} points
                </div>
                <div style={styles.categoryComment}>{getCategoryComment(cat.percentage)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Strengths */}
      {topStrengths.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🌟 Top Strengths</h2>
          <div style={styles.strengthGrid}>
            {topStrengths.map((strength, index) => (
              <div key={index} style={styles.strengthCard}>
                <div style={styles.strengthRank}>{index + 1}</div>
                <div style={styles.strengthContent}>
                  <div style={styles.strengthName}>{strength.category}</div>
                  <div style={styles.strengthScore}>{strength.percentage}%</div>
                  <div style={styles.strengthBar}>
                    <div style={{ ...styles.strengthBarFill, width: Math.min(strength.percentage, 100) + '%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Development Areas */}
      {developmentAreas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📈 Development Areas</h2>
          <div style={styles.developmentGrid}>
            {developmentAreas.map((area, index) => (
              <div key={index} style={styles.developmentCard}>
                <div style={styles.developmentRank}>{index + 1}</div>
                <div style={styles.developmentContent}>
                  <div style={styles.developmentName}>{area.category}</div>
                  <div style={styles.developmentScore}>{area.percentage}%</div>
                  <div style={styles.developmentBar}>
                    <div style={{ ...styles.developmentBarFill, width: Math.min(area.percentage, 100) + '%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Placement */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🎯 Suggested Placement</h2>
        <div style={styles.placementContainer}>
          <p style={styles.placementDescription}>
            Based on the candidate's performance profile, the following departments are recommended:
          </p>
          <div style={styles.placementGrid}>
            {recommendedDepartments.length > 0 ? (
              recommendedDepartments.map((dept, index) => (
                <div key={index} style={styles.placementCard}>
                  <div style={styles.placementHeader}>
                    <span style={styles.placementIcon}>{dept.icon}</span>
                    <span style={styles.placementName}>{dept.name}</span>
                  </div>
                  {dept.subDepts && dept.subDepts.length > 0 && (
                    <div style={styles.placementSubDepts}>
                      {dept.subDepts.map((sub, idx) => (
                        <span key={idx} style={styles.placementSubDeptTag}>{sub}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={styles.placementEmpty}>
                <p>Based on the current scores, the candidate would benefit from structured training and development before departmental placement.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Statistics */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📊 Assessment Statistics</h2>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{workplaceScore}%</div>
            <div style={styles.statLabel}>Workplace Readiness</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{intellectualScore}%</div>
            <div style={styles.statLabel}>Intellectual Capability</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{overallScore}%</div>
            <div style={styles.statLabel}>Overall Score</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{statistics.totalAnswered || 0} / {statistics.totalQuestions || 0}</div>
            <div style={styles.statLabel}>Questions Answered</div>
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={() => window.print()} style={styles.printButton}>
          🖨️ Print Report
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  backButton: { padding: '8px 16px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569', marginBottom: '20px' },
  header: { textAlign: 'center', padding: '30px 20px 20px', background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)', borderRadius: '12px', color: 'white', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '700', margin: '0 0 16px 0' },
  candidateInfo: { background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px 20px', marginTop: '8px' },
  candidateInfoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', textAlign: 'left' },
  infoLabel: { fontSize: '12px', opacity: 0.7, display: 'block', marginBottom: '2px' },
  infoValue: { fontSize: '15px', fontWeight: '500', display: 'block' },
  banner: { borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  bannerContent: { display: 'flex', alignItems: 'flex-start', gap: '16px' },
  bannerIcon: { fontSize: '32px', lineHeight: '1' },
  bannerTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '4px' },
  bannerNarrative: { fontSize: '14px', color: '#1a202c', lineHeight: '1.6' },
  scoreGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  scoreCard: { background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' },
  scoreLabel: { fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '8px' },
  scoreValue: { fontSize: '32px', fontWeight: '700', color: '#1a237e' },
  scoreBand: { fontSize: '14px', fontWeight: '600', marginTop: '8px' },
  section: { marginBottom: '30px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#1a237e', marginBottom: '16px' },
  categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' },
  categoryCard: { background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  categoryName: { fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '6px' },
  categoryScore: { fontSize: '20px', fontWeight: '700', color: '#1a237e', marginBottom: '8px' },
  categoryBar: { height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' },
  categoryBarFill: { height: '100%', background: 'linear-gradient(90deg, #1a237e, #0d47a1)', borderRadius: '3px' },
  categoryDetail: { fontSize: '12px', color: '#94a3b8' },
  categoryComment: { fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' },
  strengthGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  strengthCard: { display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  strengthRank: { width: '32px', height: '32px', background: '#2e7d32', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  strengthContent: { flex: 1 },
  strengthName: { fontSize: '14px', fontWeight: '500', color: '#1a202c', marginBottom: '4px' },
  strengthScore: { fontSize: '16px', fontWeight: '700', color: '#2e7d32', marginBottom: '4px' },
  strengthBar: { height: '4px', background: '#e8f5e9', borderRadius: '2px', overflow: 'hidden' },
  strengthBarFill: { height: '100%', background: 'linear-gradient(90deg, #43a047, #2e7d32)', borderRadius: '2px' },
  developmentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  developmentCard: { display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  developmentRank: { width: '32px', height: '32px', background: '#c62828', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 },
  developmentContent: { flex: 1 },
  developmentName: { fontSize: '14px', fontWeight: '500', color: '#1a202c', marginBottom: '4px' },
  developmentScore: { fontSize: '16px', fontWeight: '700', color: '#c62828', marginBottom: '4px' },
  developmentBar: { height: '4px', background: '#ffebee', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' },
  developmentBarFill: { height: '100%', background: 'linear-gradient(90deg, #ef5350, #c62828)', borderRadius: '2px' },
  placementContainer: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  placementDescription: { fontSize: '14px', color: '#475569', marginBottom: '16px' },
  placementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  placementCard: { padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' },
  placementHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  placementIcon: { fontSize: '20px' },
  placementName: { fontSize: '15px', fontWeight: '600', color: '#1a202c' },
  placementSubDepts: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  placementSubDeptTag: { fontSize: '12px', padding: '2px 10px', background: '#e2e8f0', borderRadius: '12px', color: '#475569' },
  placementEmpty: { padding: '16px', background: '#fef3c7', borderRadius: '8px', color: '#92400e' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' },
  statCard: { background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#1a237e' },
  statLabel: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  actions: { textAlign: 'center', marginTop: '20px' },
  printButton: { padding: '12px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#64748b' }
};
