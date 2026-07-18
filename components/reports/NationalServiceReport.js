// components/reports/NationalServiceReport.js - FIXED with safe string conversion

import React, { useEffect } from 'react';

export default function NationalServiceReport({ report, onBack }) {
  useEffect(() => {
    console.log('[NationalServiceReport] Report received:', report);
    console.log('[NationalServiceReport] category_scores:', report?.category_scores);
  }, [report]);

  if (!report) {
    return <div style={styles.loading}>Loading report...</div>;
  }

  // ============================================================
  // SAFE STRING CONVERSION HELPER
  // ============================================================
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      // If it's an object with a recommendation property, try that
      if (value.recommendation) return String(value.recommendation);
      if (value.level) return String(value.level);
      if (value.label) return String(value.label);
      return JSON.stringify(value);
    }
    return String(value);
  };

  const safeLowerCase = (value) => {
    const str = safeString(value);
    return str.toLowerCase();
  };

  // ============================================================
  // Extract data from multiple possible locations
  // ============================================================
  const reportData = report.report_data || report;
  
  // Candidate info
  const candidateInfo = reportData.candidateInfo || report.candidateInfo || {};
  const candidateName = reportData.candidateName || candidateInfo.fullName || report.candidateName || 'Candidate';
  const university = reportData.university || candidateInfo.university || report.university || 'N/A';
  const programme = reportData.programme || candidateInfo.programme || report.programme || 'N/A';
  const graduationYear = reportData.graduationYear || candidateInfo.graduationYear || report.graduationYear || 'N/A';
  const preferredDepartment = reportData.preferredDepartment || candidateInfo.preferredDepartment || report.preferredDepartment || 'Not Specified';
  
  // Scores
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

  // ============================================================
  // FIX: Safe extraction of recommendation
  // ============================================================
  let recommendationLevel = 'Not Recommended';
  
  // Try multiple possible locations for the recommendation
  if (reportData.recommendation) {
    recommendationLevel = safeString(reportData.recommendation);
  } else if (report.recommendation) {
    recommendationLevel = safeString(report.recommendation);
  } else if (reportData.recommendationLevel) {
    recommendationLevel = safeString(reportData.recommendationLevel);
  } else if (report.recommendationLevel) {
    recommendationLevel = safeString(report.recommendationLevel);
  } else if (reportData.level) {
    recommendationLevel = safeString(reportData.level);
  } else if (reportData.label) {
    recommendationLevel = safeString(reportData.label);
  }
  
  // Ensure we have a valid string
  if (!recommendationLevel || recommendationLevel === '') {
    // Calculate based on scores
    const workplace = Number(workplace_readiness) || 0;
    const intellectual = Number(intellectual_capability) || 0;
    if (workplace >= 85 && intellectual >= 85) {
      recommendationLevel = 'Highly Recommended';
    } else if (workplace >= 75 && intellectual >= 75) {
      recommendationLevel = 'Recommended';
    } else if (workplace >= 65 && intellectual >= 65) {
      recommendationLevel = 'Reserve Pool';
    } else {
      recommendationLevel = 'Not Recommended';
    }
  }

  // Completion date
  const completed_at = reportData.completed_at || report.completed_at || null;
  const assessmentDate = candidateInfo.assessmentDate || 
    (completed_at ? new Date(completed_at).toLocaleDateString() : 'N/A');

  // ============================================================
  // Extract category_scores
  // ============================================================
  let categoryScores = [];
  
  if (reportData.category_scores && Array.isArray(reportData.category_scores) && reportData.category_scores.length > 0) {
    categoryScores = reportData.category_scores;
  } else if (report.category_scores && Array.isArray(report.category_scores) && report.category_scores.length > 0) {
    categoryScores = report.category_scores;
  } else if (reportData.categoryBreakdown && Array.isArray(reportData.categoryBreakdown) && reportData.categoryBreakdown.length > 0) {
    categoryScores = reportData.categoryBreakdown;
  } else if (report.categoryBreakdown && Array.isArray(report.categoryBreakdown) && report.categoryBreakdown.length > 0) {
    categoryScores = report.categoryBreakdown;
  } else if (reportData.categoryScores && Array.isArray(reportData.categoryScores) && reportData.categoryScores.length > 0) {
    categoryScores = reportData.categoryScores;
  } else if (report.categoryScores && Array.isArray(report.categoryScores) && report.categoryScores.length > 0) {
    categoryScores = report.categoryScores;
  }

  console.log('[Report] category_scores count:', categoryScores.length);

  // ============================================================
  // SPLIT INTO WORKPLACE AND INTELLECTUAL
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
      const categoryName = safeString(cat.category || cat.name || '');
      const percentage = Number(cat.percentage || cat.score || 0);
      
      const isWorkplace = workplaceCategoryNames.some(name => 
        categoryName.toLowerCase().includes(name.toLowerCase())
      );
      
      const isIntellectual = intellectualCategoryNames.some(name => 
        categoryName.toLowerCase().includes(name.toLowerCase())
      );

      if (isWorkplace) {
        workplaceSubCategories.push({ ...cat, category: categoryName, percentage });
      } else if (isIntellectual) {
        intellectualSubCategories.push({ ...cat, category: categoryName, percentage });
      } else {
        const lowerName = categoryName.toLowerCase();
        if (lowerName.includes('safety') || lowerName.includes('technical') || 
            lowerName.includes('communication') || lowerName.includes('teamwork') ||
            lowerName.includes('ownership') || lowerName.includes('integrity') ||
            lowerName.includes('workplace') || lowerName.includes('ethics') ||
            lowerName.includes('professional') || lowerName.includes('conduct')) {
          workplaceSubCategories.push({ ...cat, category: categoryName, percentage });
        } else if (lowerName.includes('problem') || lowerName.includes('logical') ||
                   lowerName.includes('numerical') || lowerName.includes('measurement') ||
                   lowerName.includes('engineering') || lowerName.includes('learning') ||
                   lowerName.includes('cognitive') || lowerName.includes('analytical')) {
          intellectualSubCategories.push({ ...cat, category: categoryName, percentage });
        } else {
          // Default to intellectual
          intellectualSubCategories.push({ ...cat, category: categoryName, percentage });
        }
      }
    });
  }

  console.log('[Report] Workplace sub-categories:', workplaceSubCategories.length);
  console.log('[Report] Intellectual sub-categories:', intellectualSubCategories.length);

  // ============================================================
  // RENDER HELPERS WITH SAFE STRING HANDLING
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
    const l = safeString(level).toLowerCase();
    if (l.includes('highly')) return '#2e7d32';
    if (l.includes('recommend')) return '#1565c0';
    if (l.includes('reserve')) return '#f57c00';
    if (l.includes('not')) return '#c62828';
    return '#333';
  };

  const getRecommendationBg = (level) => {
    const l = safeString(level).toLowerCase();
    if (l.includes('highly')) return '#e8f5e9';
    if (l.includes('recommend')) return '#e3f2fd';
    if (l.includes('reserve')) return '#fff3e0';
    if (l.includes('not')) return '#ffebee';
    return '#f5f5f5';
  };

  const getBandColor = (band) => {
    const b = safeString(band).toLowerCase();
    if (b === 'excellent' || b === 'exceptional' || b === 'ready') return '#2e7d32';
    if (b === 'strong' || b === 'high potential') return '#1565c0';
    if (b === 'developing' || b === 'moderate potential') return '#f57c00';
    if (b === 'needs improvement' || b === 'development required') return '#c62828';
    return '#333';
  };

  const getRecommendationNarrative = (level) => {
    const l = safeString(level).toLowerCase();
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

  // Top strengths and development areas
  const allSubCategories = [...workplaceSubCategories, ...intellectualSubCategories];
  const topStrengths = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 3);

  const developmentAreas = [...allSubCategories]
    .filter(c => (c.percentage || 0) > 0 && (c.percentage || 0) < 60)
    .sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

  // Suggested placements
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

  // ============================================================
  // RENDER
  // ============================================================
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

      {/* Rest of the component remains the same... */}
      {/* ... (keep the rest of the JSX from the previous version) ... */}
    </div>
  );
}

// ... (keep the styles object) ...
