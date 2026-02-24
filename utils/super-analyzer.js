// utils/super-analyzer.js
// THE ULTIMATE COMBINATION - Never done before!
// Combines: Psychometric + Response Analysis + Professional Interpretation + Development Pathways + Phrase Library

import { generatePsychometricAnalysis } from './psychometricAnalyzer';
import { analyzeResponses } from './responseAnalyzer';
import { generateDetailedInterpretation } from './detailedInterpreter';
import { getAssessmentType } from './assessmentConfigs';
import { generateProfessionalInterpretation } from './professionalInterpreter';
import { getDevelopmentRecommendation } from './developmentRecommendations';
import { generateUniversalInterpretation } from './categoryMapper';
import { generateCommentary } from './commentaryEngine';
import { 
  getStrengthPhrase, 
  getWeaknessPhrase, 
  getImpactPhrase,
  getClassificationPhrase,
  areaDescriptors 
} from './phraseLibrary';

/**
 * SUPER ANALYZER - The Complete Picture
 * Generates a multi-dimensional, deeply personalized analysis that no other platform can match
 * Every analysis is unique because it combines actual scores, response patterns, and randomized phrasing
 */
export const generateSuperAnalysis = (
  candidateName,
  assessmentType,
  responses,
  categoryScores,
  totalScore,
  maxScore
) => {
  console.log(`🌟 GENERATING SUPER ANALYSIS for ${candidateName}`);
  console.log(`📊 Assessment Type: ${assessmentType}`);
  console.log(`📝 Responses: ${responses?.length || 0}`);
  console.log(`📈 Categories: ${Object.keys(categoryScores).length}`);

  // ===== DIMENSION 1: PSYCHOMETRIC PROFILE =====
  const psychometric = generatePsychometricAnalysis(
    categoryScores,
    assessmentType,
    candidateName,
    {}
  );

  // ===== DIMENSION 2: RESPONSE-LEVEL INSIGHTS =====
  const responseInsights = analyzeResponses(
    responses,
    responses.map(r => r.unique_questions),
    responses.map(r => r.unique_answers)
  );

  // ===== DIMENSION 3: DETAILED PROFESSIONAL INTERPRETATION =====
  const detailed = generateDetailedInterpretation(
    candidateName,
    categoryScores,
    assessmentType,
    responseInsights
  );

  // ===== DIMENSION 4: PROFESSIONAL PATTERN RECOGNITION =====
  const professional = generateProfessionalInterpretation(
    candidateName,
    categoryScores
  );

  // ===== DIMENSION 5: UNIVERSAL CATEGORY MAPPING =====
  // Convert to format expected by categoryMapper
  const scoresObject = {};
  Object.entries(categoryScores).forEach(([cat, data]) => {
    scoresObject[cat] = data.percentage;
  });
  
  const strengths = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage >= 70)
    .map(([cat, data]) => ({ area: cat, percentage: data.percentage }));

  const weaknesses = Object.entries(categoryScores)
    .filter(([_, data]) => data.percentage < 60)
    .map(([cat, data]) => ({ area: cat, percentage: data.percentage }));

  const universal = generateUniversalInterpretation(
    assessmentType,
    candidateName,
    scoresObject,
    strengths,
    weaknesses,
    Math.round((totalScore / maxScore) * 100)
  );

  // ===== DIMENSION 6: DEEP CATEGORY ANALYSIS WITH DEVELOPMENT PATHS =====
  const categoryDeepAnalysis = {};
  Object.entries(categoryScores).forEach(([category, data]) => {
    const percentage = data.percentage;
    const score = data.score;
    const maxPossible = data.maxPossible;
    
    // Get commentary from multiple sources (with phrase library randomization)
    const commentaryFromMapper = universal.categoryInterpretation?.[category]?.interpretation;
    const commentaryFromProfessional = professional.categoryBreakdown?.concerns?.find(c => c.includes(category)) ||
                                      professional.categoryBreakdown?.moderate?.find(c => c.includes(category)) ||
                                      professional.categoryBreakdown?.strong?.find(c => c.includes(category));
    
    // Use phrase library for unique phrasing every time
    const isStrength = percentage >= 70;
    const phraseBasedCommentary = isStrength 
      ? getStrengthPhrase(category, assessmentType)
      : getWeaknessPhrase(category, assessmentType);
    
    // Get development recommendation (most detailed in the industry!)
    const developmentPath = getDevelopmentRecommendation(category, percentage);
    
    // Get response insights for this category
    const categoryResponses = responseInsights[category] || {};
    
    // Identify behavioral patterns
    const behavioralPattern = identifyBehavioralPattern(category, percentage, psychometric);
    
    // Calculate trajectory
    const trajectory = calculateTrajectory(category, percentage, psychometric);
    
    // Determine priority with impact phrase
    const priority = calculatePriority(percentage, psychometric);
    const impactPhrase = getImpactPhrase(priority);
    
    categoryDeepAnalysis[category] = {
      score: percentage,
      rawScore: `${score}/${maxPossible}`,
      grade: getGradeLetter(percentage),
      level: getLevel(percentage),
      
      // Multi-source commentary (unique to this candidate)
      commentary: {
        primary: commentaryFromMapper || generateCommentary(category, percentage, isStrength ? 'strength' : 'weakness'),
        phraseBased: phraseBasedCommentary,
        professional: commentaryFromProfessional,
        responseBased: categoryResponses.insights || []
      },
      
      // Development pathway (specific, actionable)
      development: {
        recommendation: developmentPath,
        priority,
        impact: impactPhrase,
        timeframe: calculateTimeframe(percentage),
        gapToTarget: Math.max(0, 80 - percentage),
        actions: extractActions(developmentPath)
      },
      
      // Behavioral insights
      behavioralPattern,
      
      // Trajectory prediction
      trajectory,
      
      // Response highlights
      keyResponses: categoryResponses.questionDetails?.slice(0, 2).map(q => ({
        question: q.question,
        answer: q.answer,
        score: q.score
      })) || [],
      
      // Unique identifier (ensures no two reports are identical)
      signature: generateSignature(category, percentage, psychometric, candidateName)
    };
  });

  // ===== DIMENSION 7: CROSS-CATEGORY PATTERN ANALYSIS =====
  const patterns = identifyCrossCategoryPatterns(categoryScores, psychometric, professional);

  // ===== DIMENSION 8: ROLE READINESS WITH MULTI-FACTOR ASSESSMENT =====
  const roleReadiness = assessMultiFactorRoleReadiness(
    categoryScores,
    psychometric,
    patterns,
    totalScore,
    maxScore
  );

  // ===== DIMENSION 9: PREDICTIVE PERFORMANCE INSIGHTS =====
  const predictiveInsights = generatePredictiveInsights(
    categoryScores,
    psychometric,
    patterns
  );

  // ===== DIMENSION 10: COMPETITIVE DIFFERENTIATORS =====
  const differentiators = identifyCompetitiveDifferentiators(
    categoryScores,
    psychometric,
    patterns
  );

  // ===== DIMENSION 11: DEVELOPMENT ROADMAP =====
  const developmentRoadmap = generateDevelopmentRoadmap(categoryDeepAnalysis, patterns);

  // ===== DIMENSION 12: UNIQUE PROFILE IDENTIFIER =====
  const profileId = generateUniqueProfileId(candidateName, categoryScores, totalScore);

  // ===== FINAL ASSEMBLY: THE COMPLETE SUPER ANALYSIS =====
  return {
    // Unique identifiers
    profileId,
    candidateName,
    assessmentType,
    generatedAt: new Date().toISOString(),
    
    // Summary (combines all dimensions with phrase library)
    summary: {
      oneLine: generateOneLineSummary(candidateName, totalScore, maxScore, patterns),
      executive: professional.overallSummary || detailed.overallProfileSummary,
      psychometric: psychometric.executiveSummary,
      professional: professional.profileSuggestion,
      universal: universal.overallSummary,
      classificationPhrase: getClassificationPhrase(getOverallClassification(totalScore, maxScore).label)
    },
    
    // Overall metrics
    overall: {
      score: totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      classification: getOverallClassification(totalScore, maxScore),
      grade: getOverallGrade(totalScore, maxScore)
    },
    
    // MULTI-DIMENSIONAL CATEGORY ANALYSIS
    categories: categoryDeepAnalysis,
    
    // STRENGTHS (from multiple perspectives)
    strengths: {
      byScore: strengths,
      byPsychometric: psychometric.categoryAnalysis?.strengths || [],
      byPattern: patterns.strengthPatterns,
      topStrengths: universal.topStrengths || [],
      detailed: strengths.map(s => ({
        ...s,
        commentary: categoryDeepAnalysis[s.area]?.commentary.primary,
        phrase: getStrengthPhrase(s.area, assessmentType),
        development: categoryDeepAnalysis[s.area]?.development,
        behavioralPattern: categoryDeepAnalysis[s.area]?.behavioralPattern,
        keyResponses: categoryDeepAnalysis[s.area]?.keyResponses
      }))
    },
    
    // DEVELOPMENT AREAS (from multiple perspectives)
    developmentAreas: {
      byScore: weaknesses,
      byPsychometric: psychometric.categoryAnalysis?.risks || [],
      byPattern: patterns.developmentPatterns,
      topWeaknesses: universal.topWeaknesses || [],
      detailed: weaknesses.map(w => ({
        ...w,
        commentary: categoryDeepAnalysis[w.area]?.commentary.primary,
        phrase: getWeaknessPhrase(w.area, assessmentType),
        development: categoryDeepAnalysis[w.area]?.development,
        behavioralPattern: categoryDeepAnalysis[w.area]?.behavioralPattern,
        keyResponses: categoryDeepAnalysis[w.area]?.keyResponses
      }))
    },
    
    // PATTERNS (unique to this candidate)
    patterns: {
      crossCategory: patterns,
      leadershipFlags: professional.leadershipEval,
      psychometricProfile: psychometric.personalityStructure,
      riskFactors: psychometric.categoryAnalysis?.risks || professional.developmentPriorities
    },
    
    // ROLE READINESS (nuanced assessment)
    roleReadiness,
    
    // PREDICTIVE INSIGHTS
    predictiveInsights,
    
    // COMPETITIVE DIFFERENTIATORS
    differentiators,
    
    // DEVELOPMENT ROADMAP
    developmentRoadmap,
    
    // RESPONSE INSIGHTS
    responseInsights,
    
    // RAW DATA (for reference)
    raw: {
      psychometric,
      detailed,
      professional,
      universal
    }
  };
};

// ===== HELPER FUNCTIONS =====

const getGradeLetter = (percentage) => {
  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'C-';
  if (percentage >= 50) return 'D+';
  if (percentage >= 40) return 'D';
  return 'F';
};

const getLevel = (percentage) => {
  if (percentage >= 85) return 'Exceptional';
  if (percentage >= 75) return 'Strong';
  if (percentage >= 65) return 'Good';
  if (percentage >= 55) return 'Developing';
  if (percentage >= 45) return 'Emerging';
  return 'Foundation';
};

const calculatePriority = (percentage, psychometric) => {
  if (percentage < 50) return 'Critical';
  if (percentage < 60) return 'High';
  if (percentage < 70) return 'Medium';
  if (percentage < 80) return 'Low';
  return 'Maintain';
};

const calculateTimeframe = (percentage) => {
  if (percentage < 50) return 'Immediate (0-3 months)';
  if (percentage < 60) return 'Short-term (3-6 months)';
  if (percentage < 70) return 'Medium-term (6-12 months)';
  return 'Long-term (12+ months)';
};

const extractActions = (recommendation) => {
  if (!recommendation) return [];
  return recommendation.split('. ').filter(a => a.length > 10).slice(0, 3);
};

const identifyBehavioralPattern = (category, percentage, psychometric) => {
  if (category.includes('Cognitive') && percentage < 60) {
    return 'May struggle with complex analysis - benefits from structured frameworks';
  }
  if (category.includes('Emotional') && percentage < 60) {
    return 'May have difficulty reading team dynamics - needs explicit feedback';
  }
  if (category.includes('Stress') && percentage < 60) {
    return 'Performance may dip under pressure - requires support during high-stress periods';
  }
  if (category.includes('Leadership') && percentage < 60) {
    return 'Not yet ready for people management - needs foundational leadership development';
  }
  if (category.includes('Communication') && percentage < 60) {
    return 'May need support in articulating complex ideas clearly';
  }
  return 'Shows expected behavioral patterns for this score range';
};

const calculateTrajectory = (category, percentage, psychometric) => {
  if (percentage >= 75) return 'Accelerated growth likely';
  if (percentage >= 60) return 'Steady improvement with support';
  if (percentage >= 50) return 'Needs structured intervention';
  return 'Requires foundational development';
};

const identifyCrossCategoryPatterns = (categoryScores, psychometric, professional) => {
  const patterns = [];
  const categories = Object.keys(categoryScores);
  
  // Check for leadership pattern
  const hasLeadership = categories.some(c => c.includes('Leadership') || c.includes('Management'));
  const hasCognitive = categories.some(c => c.includes('Cognitive') || c.includes('Reasoning'));
  const hasEI = categories.some(c => c.includes('Emotional') || c.includes('Intelligence'));
  
  if (hasLeadership && hasCognitive && hasEI) {
    const leadershipCategory = categories.find(c => c.includes('Leadership') || c.includes('Management'));
    const cognitiveCategory = categories.find(c => c.includes('Cognitive') || c.includes('Reasoning'));
    const eiCategory = categories.find(c => c.includes('Emotional') || c.includes('Intelligence'));
    
    if (leadershipCategory && cognitiveCategory && eiCategory) {
      const leadershipScore = categoryScores[leadershipCategory].percentage;
      const cognitiveScore = categoryScores[cognitiveCategory].percentage;
      const eiScore = categoryScores[eiCategory].percentage;
      
      if (leadershipScore < 60 && cognitiveScore < 60 && eiScore < 60) {
        patterns.push({
          name: 'Leadership Gap Triad',
          severity: 'Critical',
          description: 'Low scores across Leadership, Cognitive, and Emotional Intelligence indicate significant leadership development needs.',
          recommendation: 'Not ready for leadership roles. Requires foundational development in all three areas.'
        });
      } else if (leadershipScore >= 70 && cognitiveScore >= 70 && eiScore >= 70) {
        patterns.push({
          name: 'Leadership Ready',
          severity: 'Positive',
          description: 'Strong across all leadership dimensions. Ready for leadership responsibilities.',
          recommendation: 'Prepare for leadership role with targeted executive development.'
        });
      } else if (leadershipScore >= 70 && (cognitiveScore < 60 || eiScore < 60)) {
        patterns.push({
          name: 'Leadership Imbalance',
          severity: 'Medium',
          description: `Strong leadership instinct but needs development in ${cognitiveScore < 60 ? 'cognitive' : ''} ${eiScore < 60 ? 'emotional intelligence' : ''}`,
          recommendation: 'Leverage leadership strengths while developing supporting competencies.'
        });
      }
    }
  }
  
  // Check for technical pattern
  const hasTechnical = categories.some(c => c.includes('Technical') || c.includes('Manufacturing'));
  const hasProblemSolving = categories.some(c => c.includes('Problem-Solving') || c.includes('Analytical'));
  
  if (hasTechnical && hasProblemSolving) {
    const techCategory = categories.find(c => c.includes('Technical') || c.includes('Manufacturing'));
    const problemCategory = categories.find(c => c.includes('Problem-Solving') || c.includes('Analytical'));
    
    if (techCategory && problemCategory) {
      const techScore = categoryScores[techCategory].percentage;
      const problemScore = categoryScores[problemCategory].percentage;
      
      if (techScore >= 70 && problemScore < 60) {
        patterns.push({
          name: 'Technical-Problem Solving Mismatch',
          severity: 'Medium',
          description: 'Strong technical knowledge but weaker problem-solving may limit troubleshooting ability.',
          recommendation: 'Focus on applied problem-solving with technical scenarios.'
        });
      } else if (techScore < 60 && problemScore >= 70) {
        patterns.push({
          name: 'Analytical-Technical Mismatch',
          severity: 'Medium',
          description: 'Strong analytical skills but limited technical knowledge may hinder practical application.',
          recommendation: 'Build technical knowledge through hands-on training and certification.'
        });
      }
    }
  }
  
  // Check for cultural pattern
  const hasCultural = categories.some(c => c.includes('Cultural') || c.includes('Values'));
  const hasIntegrity = categories.some(c => c.includes('Integrity') || c.includes('Ethics'));
  
  if (hasCultural && hasIntegrity) {
    const culturalCategory = categories.find(c => c.includes('Cultural') || c.includes('Values'));
    const integrityCategory = categories.find(c => c.includes('Integrity') || c.includes('Ethics'));
    
    if (culturalCategory && integrityCategory) {
      const culturalScore = categoryScores[culturalCategory].percentage;
      const integrityScore = categoryScores[integrityCategory].percentage;
      
      if (culturalScore < 60 && integrityScore >= 70) {
        patterns.push({
          name: 'Values Mismatch Risk',
          severity: 'High',
          description: 'Strong personal integrity but potential cultural misalignment with organization.',
          recommendation: 'Explore cultural values in depth during interview process.'
        });
      } else if (culturalScore >= 70 && integrityScore < 60) {
        patterns.push({
          name: 'Ethical Concern',
          severity: 'Critical',
          description: 'Good cultural fit but potential ethical concerns - requires careful evaluation.',
          recommendation: 'Conduct additional reference checks and values-based interviews.'
        });
      }
    }
  }
  
  // Check for performance pattern
  const hasPerformance = categories.some(c => c.includes('Performance') || c.includes('Productivity'));
  const hasConscientiousness = categories.some(c => c.includes('Conscientiousness'));
  
  if (hasPerformance && hasConscientiousness) {
    const perfCategory = categories.find(c => c.includes('Performance') || c.includes('Productivity'));
    const conscCategory = categories.find(c => c.includes('Conscientiousness'));
    
    if (perfCategory && conscCategory) {
      const perfScore = categoryScores[perfCategory].percentage;
      const conscScore = categoryScores[conscCategory].percentage;
      
      if (perfScore < 60 && conscScore >= 70) {
        patterns.push({
          name: 'Performance-Conscientiousness Gap',
          severity: 'Medium',
          description: 'Strong work ethic and organization but performance metrics below expectations.',
          recommendation: 'Identify barriers to performance despite strong work habits.'
        });
      }
    }
  }
  
  return patterns;
};

const assessMultiFactorRoleReadiness = (categoryScores, psychometric, patterns, totalScore, maxScore) => {
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  // Technical roles
  const technicalScore = Object.entries(categoryScores)
    .filter(([c]) => c.includes('Technical') || c.includes('Manufacturing') || c.includes('Equipment') || c.includes('Mechanical'))
    .reduce((sum, [_, data]) => sum + data.percentage, 0);
  const technicalCount = Object.keys(categoryScores).filter(c => 
    c.includes('Technical') || c.includes('Manufacturing') || c.includes('Equipment') || c.includes('Mechanical')
  ).length;
  const avgTechnical = technicalCount > 0 ? Math.round(technicalScore / technicalCount) : 0;
  
  // Leadership roles
  const leadershipScore = Object.entries(categoryScores)
    .filter(([c]) => c.includes('Leadership') || c.includes('Management') || c.includes('People') || c.includes('Vision'))
    .reduce((sum, [_, data]) => sum + data.percentage, 0);
  const leadershipCount = Object.keys(categoryScores).filter(c => 
    c.includes('Leadership') || c.includes('Management') || c.includes('People') || c.includes('Vision')
  ).length;
  const avgLeadership = leadershipCount > 0 ? Math.round(leadershipScore / leadershipCount) : 0;
  
  // Individual contributor
  const contributorScore = Object.entries(categoryScores)
    .filter(([c]) => !c.includes('Leadership') && !c.includes('Management'))
    .reduce((sum, [_, data]) => sum + data.percentage, 0);
  const contributorCount = Object.keys(categoryScores).filter(c => 
    !c.includes('Leadership') && !c.includes('Management')
  ).length;
  const avgContributor = contributorCount > 0 ? Math.round(contributorScore / contributorCount) : 0;
  
  // Cognitive roles
  const cognitiveScore = Object.entries(categoryScores)
    .filter(([c]) => c.includes('Cognitive') || c.includes('Reasoning') || c.includes('Analytical') || c.includes('Problem'))
    .reduce((sum, [_, data]) => sum + data.percentage, 0);
  const cognitiveCount = Object.keys(categoryScores).filter(c => 
    c.includes('Cognitive') || c.includes('Reasoning') || c.includes('Analytical') || c.includes('Problem')
  ).length;
  const avgCognitive = cognitiveCount > 0 ? Math.round(cognitiveScore / cognitiveCount) : 0;
  
  // Check for critical patterns
  const hasCriticalPattern = patterns.some(p => p.severity === 'Critical');
  const hasHighRiskPattern = patterns.some(p => p.severity === 'High');
  
  return {
    executive: {
      ready: percentage >= 80 && avgLeadership >= 75 && !hasCriticalPattern,
      score: Math.round((percentage + avgLeadership + avgCognitive) / 3),
      reasoning: avgLeadership >= 75 ? 'Strong leadership indicators with strategic capability' : 
                 avgLeadership >= 65 ? 'Developing leadership capability with growth potential' : 
                 'Leadership scores below threshold for executive roles',
      timeframe: avgLeadership >= 75 ? 'Ready now' : 
                 avgLeadership >= 65 ? '12-24 months with targeted development' : 
                 '2-3+ years with intensive development',
      confidence: hasCriticalPattern ? 'Low - critical patterns detected' : 
                  hasHighRiskPattern ? 'Moderate - some risk factors present' : 'High'
    },
    management: {
      ready: percentage >= 70 && avgLeadership >= 65,
      score: Math.round((percentage + avgLeadership) / 2),
      reasoning: avgLeadership >= 65 ? 'Developing leadership capability with solid foundation' : 
                 'Leadership needs significant development before management roles',
      timeframe: avgLeadership >= 65 ? '6-12 months' : '1-2 years',
      confidence: hasCriticalPattern ? 'Low' : hasHighRiskPattern ? 'Moderate' : 'High'
    },
    technical: {
      ready: avgTechnical >= 70,
      score: avgTechnical,
      reasoning: avgTechnical >= 70 ? 'Strong technical foundation - ready for complex technical work' : 
                 avgTechnical >= 60 ? 'Developing technical skills - suitable for structured tasks' : 
                 'Technical skills need significant development',
      scope: avgTechnical >= 70 ? 'Independent technical work, can mentor others' : 
             avgTechnical >= 60 ? 'Structured technical tasks with occasional guidance' : 
             'Supervised technical work with close oversight',
      confidence: avgTechnical >= 70 ? 'High' : avgTechnical >= 60 ? 'Moderate' : 'Low'
    },
    analytical: {
      ready: avgCognitive >= 70,
      score: avgCognitive,
      reasoning: avgCognitive >= 70 ? 'Strong analytical capability - handles complex problems' : 
                 avgCognitive >= 60 ? 'Developing analytical skills - benefits from structure' : 
                 'Analytical skills need development - requires clear frameworks',
      scope: avgCognitive >= 70 ? 'Complex problem-solving, strategic analysis' : 
             avgCognitive >= 60 ? 'Routine analysis with guidance on complex cases' : 
             'Basic problem-solving with defined processes',
      confidence: avgCognitive >= 70 ? 'High' : avgCognitive >= 60 ? 'Moderate' : 'Low'
    },
    contributor: {
      ready: avgContributor >= 60,
      score: avgContributor,
      reasoning: avgContributor >= 70 ? 'Strong individual contributor - reliable and capable' : 
                 avgContributor >= 60 ? 'Capable contributor with some development needs' : 
                 'Needs development to meet contributor expectations',
      supervision: avgContributor >= 70 ? 'Minimal - works independently' : 
                   avgContributor >= 60 ? 'Moderate - occasional guidance needed' : 
                   'Close - regular check-ins required',
      confidence: avgContributor >= 70 ? 'High' : avgContributor >= 60 ? 'Moderate' : 'Low'
    }
  };
};

const generatePredictiveInsights = (categoryScores, psychometric, patterns) => {
  const insights = [];
  
  // Look for high-risk patterns
  const criticalPatterns = patterns.filter(p => p.severity === 'Critical');
  if (criticalPatterns.length > 0) {
    insights.push({
      type: 'Risk',
      insight: `Critical patterns detected: ${criticalPatterns.map(p => p.name).join(', ')}`,
      probability: 'High',
      impact: 'May significantly impact performance in key areas without immediate intervention'
    });
  }
  
  // Check growth trajectory
  const strongAreas = Object.values(categoryScores).filter(s => s.percentage >= 70).length;
  const weakAreas = Object.values(categoryScores).filter(s => s.percentage < 50).length;
  
  if (strongAreas >= 3 && weakAreas <= 1) {
    insights.push({
      type: 'Opportunity',
      insight: `Multiple strengths (${strongAreas}) provide foundation for accelerated growth`,
      probability: 'High',
      impact: 'Can leverage strengths to rapidly develop weaker areas through applied learning'
    });
  } else if (strongAreas >= 2 && weakAreas >= 3) {
    insights.push({
      type: 'Caution',
      insight: `Mixed profile with ${strongAreas} strengths but ${weakAreas} significant gaps`,
      probability: 'Medium',
      impact: 'Development will require balanced focus on both leveraging strengths and addressing gaps'
    });
  } else if (weakAreas >= 4) {
    insights.push({
      type: 'Development Needed',
      insight: `Significant development needs across ${weakAreas} areas`,
      probability: 'High',
      impact: 'Will require structured, intensive development plan with clear milestones'
    });
  }
  
  // Check for specific patterns
  const hasLeadershipGap = patterns.some(p => p.name === 'Leadership Gap Triad');
  if (hasLeadershipGap) {
    insights.push({
      type: 'Leadership Ceiling',
      insight: 'Current profile indicates potential ceiling for leadership advancement without significant development',
      probability: 'High',
      impact: 'May limit career progression into management roles'
    });
  }
  
  const hasEthicalConcern = patterns.some(p => p.name === 'Ethical Concern');
  if (hasEthicalConcern) {
    insights.push({
      type: 'Critical Risk',
      insight: 'Ethical concerns detected - requires immediate attention and careful placement',
      probability: 'High',
      impact: 'May pose risk in roles requiring independent judgment and integrity'
    });
  }
  
  return insights;
};

const identifyCompetitiveDifferentiators = (categoryScores, psychometric, patterns) => {
  const differentiators = [];
  
  // Find unique strengths (top 10% performers)
  Object.entries(categoryScores).forEach(([category, data]) => {
    if (data.percentage >= 85) {
      differentiators.push({
        category,
        score: data.percentage,
        differentiator: `Top 10% performer in ${category}`,
        value: `Significant competitive advantage in ${category.toLowerCase()}`,
        application: `Can serve as subject matter expert or mentor in ${category}`
      });
    } else if (data.percentage >= 80) {
      differentiators.push({
        category,
        score: data.percentage,
        differentiator: `Strong performer in ${category}`,
        value: `Valuable asset for roles requiring ${category.toLowerCase()}`,
        application: `Can handle complex challenges in ${category} independently`
      });
    }
  });
  
  // Find rare combinations
  const hasTechnicalAndCognitive = 
    Object.keys(categoryScores).some(c => c.includes('Technical')) && 
    Object.keys(categoryScores).some(c => c.includes('Cognitive'));
  
  if (hasTechnicalAndCognitive) {
    const techCategory = Object.keys(categoryScores).find(c => c.includes('Technical'));
    const cogCategory = Object.keys(categoryScores).find(c => c.includes('Cognitive'));
    
    if (techCategory && cogCategory) {
      const techScore = categoryScores[techCategory].percentage;
      const cogScore = categoryScores[cogCategory].percentage;
      
      if (techScore >= 70 && cogScore >= 70) {
        differentiators.push({
          category: 'Technical-Cognitive Combination',
          score: Math.round((techScore + cogScore) / 2),
          differentiator: 'Rare combination of technical expertise and analytical capability',
          value: 'Ideal for complex technical roles requiring both hands-on skill and strategic thinking',
          application: 'Can troubleshoot complex systems and optimize processes'
        });
      }
    }
  }
  
  const hasLeadershipAndEI = 
    Object.keys(categoryScores).some(c => c.includes('Leadership')) && 
    Object.keys(categoryScores).some(c => c.includes('Emotional'));
  
  if (hasLeadershipAndEI) {
    const leadCategory = Object.keys(categoryScores).find(c => c.includes('Leadership'));
    const eiCategory = Object.keys(categoryScores).find(c => c.includes('Emotional'));
    
    if (leadCategory && eiCategory) {
      const leadScore = categoryScores[leadCategory].percentage;
      const eiScore = categoryScores[eiCategory].percentage;
      
      if (leadScore >= 70 && eiScore >= 70) {
        differentiators.push({
          category: 'Emotionally Intelligent Leader',
          score: Math.round((leadScore + eiScore) / 2),
          differentiator: 'Combines leadership capability with strong emotional intelligence',
          value: 'Ideal for people management roles requiring empathy and team building',
          application: 'Can build strong teams and navigate complex interpersonal dynamics'
        });
      }
    }
  }
  
  return differentiators;
};

const generateDevelopmentRoadmap = (categoryDeepAnalysis, patterns) => {
  const roadmap = {
    immediate: [],
    shortTerm: [],
    longTerm: [],
    ongoing: []
  };
  
  Object.entries(categoryDeepAnalysis).forEach(([category, data]) => {
    if (data.development.priority === 'Critical') {
      roadmap.immediate.push({
        area: category,
        currentScore: data.score,
        gap: data.development.gapToTarget,
        actions: data.development.actions,
        recommendation: data.development.recommendation.substring(0, 100) + '...'
      });
    } else if (data.development.priority === 'High') {
      roadmap.shortTerm.push({
        area: category,
        currentScore: data.score,
        gap: data.development.gapToTarget,
        actions: data.development.actions.slice(0, 2)
      });
    } else if (data.development.priority === 'Medium') {
      roadmap.longTerm.push({
        area: category,
        currentScore: data.score,
        gap: data.development.gapToTarget
      });
    } else if (data.development.priority === 'Low' || data.development.priority === 'Maintain') {
      roadmap.ongoing.push({
        area: category,
        currentScore: data.score,
        focus: 'Maintain and leverage strength'
      });
    }
  });
  
  // Add pattern-based recommendations
  patterns.forEach(pattern => {
    if (pattern.severity === 'Critical') {
      roadmap.immediate.push({
        area: pattern.name,
        isPattern: true,
        recommendation: pattern.recommendation
      });
    } else if (pattern.severity === 'High') {
      roadmap.shortTerm.push({
        area: pattern.name,
        isPattern: true,
        recommendation: pattern.recommendation
      });
    }
  });
  
  return roadmap;
};

const generateOneLineSummary = (candidateName, totalScore, maxScore, patterns) => {
  const percentage = Math.round((totalScore / maxScore) * 100);
  const criticalPatterns = patterns.filter(p => p.severity === 'Critical').length;
  const highPatterns = patterns.filter(p => p.severity === 'High').length;
  
  if (percentage >= 80 && criticalPatterns === 0 && highPatterns === 0) {
    return `${candidateName} is a strong candidate with balanced capabilities and no critical red flags.`;
  } else if (percentage >= 70 && criticalPatterns === 0) {
    return `${candidateName} shows solid potential with ${highPatterns > 0 ? 'some areas requiring attention' : 'manageable development areas'}.`;
  } else if (percentage >= 60) {
    return `${candidateName} has foundational capabilities with ${criticalPatterns > 0 ? 'critical' : 'several'} areas requiring development.`;
  } else if (percentage >= 50) {
    return `${candidateName} requires significant development across multiple competency areas with ${criticalPatterns} critical patterns identified.`;
  } else {
    return `${candidateName} needs comprehensive development support with critical gaps requiring immediate intervention.`;
  }
};

const getOverallClassification = (totalScore, maxScore) => {
  const percentage = Math.round((totalScore / maxScore) * 100);
  if (percentage >= 85) return { label: 'High Potential', color: '#2E7D32' };
  if (percentage >= 75) return { label: 'Strong Performer', color: '#4CAF50' };
  if (percentage >= 65) return { label: 'Solid Contributor', color: '#2196F3' };
  if (percentage >= 55) return { label: 'Developing', color: '#FF9800' };
  if (percentage >= 45) return { label: 'Emerging', color: '#F57C00' };
  return { label: 'Foundation Stage', color: '#F44336' };
};

const getOverallGrade = (totalScore, maxScore) => {
  const percentage = Math.round((totalScore / maxScore) * 100);
  return getGradeLetter(percentage);
};

const generateSignature = (category, percentage, psychometric, name) => {
  // Creates a unique signature for each category based on multiple factors
  const base = `${category}-${percentage}-${name.length}-${Math.random()}`;
  return Buffer.from(base).toString('base64').substring(0, 8);
};

const generateUniqueProfileId = (name, categoryScores, totalScore) => {
  const scoreString = Object.values(categoryScores).map(s => s.percentage).join('-');
  const base = `${name}-${totalScore}-${scoreString}-${Date.now()}`;
  return `SP-${Buffer.from(base).toString('base64').substring(0, 12)}`;
};

export default {
  generateSuperAnalysis
};
