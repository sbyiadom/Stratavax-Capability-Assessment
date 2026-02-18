/**
 * Personalized Report Generator
 * Creates unique, detailed reports based on candidate's actual responses
 * No two candidates will have the same report
 */

export function generatePersonalizedReport(candidateId, assessmentType, responses, candidateName = 'Candidate') {
  
  // Organize responses by section and subsection
  const sectionData = {};
  const subsectionData = {};
  
  // First, organize all responses
  responses.forEach(response => {
    const section = response.section;
    const subsection = response.subsection;
    const score = response.score;
    const maxScore = 5;
    
    // Initialize section if needed
    if (!sectionData[section]) {
      sectionData[section] = {
        total: 0,
        count: 0,
        maxPossible: 0,
        subsections: {}
      };
    }
    
    // Initialize subsection if needed
    if (!sectionData[section].subsections[subsection]) {
      sectionData[section].subsections[subsection] = {
        total: 0,
        count: 0,
        maxPossible: 0,
        responses: []
      };
    }
    
    // Add to section totals
    sectionData[section].total += score;
    sectionData[section].count += 1;
    sectionData[section].maxPossible += maxScore;
    
    // Add to subsection totals
    sectionData[section].subsections[subsection].total += score;
    sectionData[section].subsections[subsection].count += 1;
    sectionData[section].subsections[subsection].maxPossible += maxScore;
    sectionData[section].subsections[subsection].responses.push({
      question: response.question_text,
      answer: response.answer_text,
      score: score,
      maxScore: maxScore
    });
    
    // Also store in flat structure for easy access
    if (!subsectionData[subsection]) {
      subsectionData[subsection] = {
        section,
        total: 0,
        count: 0,
        maxPossible: 0,
        responses: []
      };
    }
    subsectionData[subsection].total += score;
    subsectionData[subsection].count += 1;
    subsectionData[subsection].maxPossible += maxScore;
    subsectionData[subsection].responses.push({
      question: response.question_text,
      answer: response.answer_text,
      score: score,
      maxScore: maxScore
    });
  });
  
  // Calculate percentages and generate analysis for each section/subsection
  const detailedAnalysis = {};
  const strengths = [];
  const weaknesses = [];
  const allRecommendations = [];
  
  let totalScore = 0;
  let totalMaxPossible = 0;
  
  Object.keys(sectionData).forEach(section => {
    const sectionInfo = sectionData[section];
    const sectionPercentage = Math.round((sectionInfo.total / sectionInfo.maxPossible) * 100);
    const sectionAverage = (sectionInfo.total / sectionInfo.count).toFixed(1);
    
    totalScore += sectionInfo.total;
    totalMaxPossible += sectionInfo.maxPossible;
    
    detailedAnalysis[section] = {
      totalScore: sectionInfo.total,
      maxPossible: sectionInfo.maxPossible,
      percentage: sectionPercentage,
      average: sectionAverage,
      questionCount: sectionInfo.count,
      subsections: {}
    };
    
    // Analyze each subsection
    Object.keys(sectionInfo.subsections).forEach(subsection => {
      const subInfo = sectionInfo.subsections[subsection];
      const subPercentage = Math.round((subInfo.total / subInfo.maxPossible) * 100);
      const subAverage = (subInfo.total / subInfo.count).toFixed(1);
      
      // Store subsection data
      detailedAnalysis[section].subsections[subsection] = {
        totalScore: subInfo.total,
        maxPossible: subInfo.maxPossible,
        percentage: subPercentage,
        average: subAverage,
        questionCount: subInfo.count,
        responses: subInfo.responses
      };
      
      // Generate subsection-specific analysis
      const analysis = generateSubsectionAnalysis(
        assessmentType, 
        section, 
        subsection, 
        subPercentage, 
        subAverage, 
        subInfo
      );
      
      detailedAnalysis[section].subsections[subsection].analysis = analysis.text;
      detailedAnalysis[section].subsections[subsection].traits = analysis.traits;
      detailedAnalysis[section].subsections[subsection].strengths = analysis.strengths;
      detailedAnalysis[section].subsections[subsection].weaknesses = analysis.weaknesses;
      detailedAnalysis[section].subsections[subsection].recommendations = analysis.recommendations;
      
      // Track strengths and weaknesses
      if (subPercentage >= 80) {
        strengths.push({
          area: subsection,
          section: section,
          percentage: subPercentage,
          score: subInfo.total,
          maxPossible: subInfo.maxPossible,
          analysis: analysis.text,
          recommendations: analysis.recommendations
        });
      } else if (subPercentage <= 60) {
        weaknesses.push({
          area: subsection,
          section: section,
          percentage: subPercentage,
          score: subInfo.total,
          maxPossible: subInfo.maxPossible,
          analysis: analysis.text,
          recommendations: analysis.recommendations
        });
        
        // Add recommendations to global list
        allRecommendations.push(...analysis.recommendations);
      }
    });
  });
  
  const overallPercentage = Math.round((totalScore / totalMaxPossible) * 100);
  
  // Generate overall profile based on assessment type
  const overallProfile = generateOverallProfile(assessmentType, overallPercentage, strengths, weaknesses);
  
  // Generate personalized development plan
  const developmentPlan = generateDevelopmentPlan(weaknesses, strengths, assessmentType);
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    candidateName,
    assessmentType,
    overallPercentage,
    strengths,
    weaknesses
  );
  
  // Generate unique insights based on response patterns
  const uniqueInsights = generateUniqueInsights(responses, sectionData, subsectionData);
  
  // Create final report
  const report = {
    reportId: `${candidateId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    generatedAt: new Date().toISOString(),
    candidateId,
    candidateName,
    assessmentType,
    overallScore: totalScore,
    maxScore: totalMaxPossible,
    overallPercentage,
    executiveSummary,
    overallProfile: overallProfile.text,
    overallTraits: overallProfile.traits,
    overallRecommendations: overallProfile.recommendations,
    
    // Detailed breakdown
    detailedAnalysis,
    
    // Strengths and weaknesses
    strengths: strengths.sort((a, b) => b.percentage - a.percentage),
    weaknesses: weaknesses.sort((a, b) => a.percentage - b.percentage),
    
    // Recommendations
    keyRecommendations: [...new Set(allRecommendations)].slice(0, 10),
    
    // Development plan
    developmentPlan,
    
    // Unique insights
    uniqueInsights,
    
    // Raw data for reference
    responseCount: responses.length,
    sectionsAnalyzed: Object.keys(sectionData).length,
    subsectionsAnalyzed: Object.keys(subsectionData).length
  };
  
  return report;
}

/**
 * Generate subsection-specific analysis
 */
function generateSubsectionAnalysis(assessmentType, section, subsection, percentage, average, data) {
  
  const text = '';
  const traits = [];
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];
  
  // Base analysis on percentage
  if (percentage >= 90) {
    strengths.push(`Exceptional understanding of ${subsection}`);
    traits.push('Mastery Level');
    recommendations.push(`Serve as a mentor for others in ${subsection}`);
    recommendations.push(`Take on complex challenges involving ${subsection}`);
  } else if (percentage >= 80) {
    strengths.push(`Strong grasp of ${subsection} concepts`);
    traits.push('Advanced');
    recommendations.push(`Continue developing ${subsection} through practical application`);
  } else if (percentage >= 70) {
    strengths.push(`Good foundation in ${subsection}`);
    traits.push('Proficient');
    recommendations.push(`Practice ${subsection} skills in real scenarios`);
  } else if (percentage >= 60) {
    weaknesses.push(`Inconsistent application of ${subsection} principles`);
    traits.push('Developing');
    recommendations.push(`Focus on ${subsection} through targeted training`);
    recommendations.push(`Seek mentorship in ${subsection}`);
  } else if (percentage >= 50) {
    weaknesses.push(`Limited understanding of ${subsection} fundamentals`);
    traits.push('Foundational');
    recommendations.push(`Complete foundational training in ${subsection}`);
    recommendations.push(`Work on basic ${subsection} concepts`);
  } else {
    weaknesses.push(`Significant gaps in ${subsection} knowledge`);
    traits.push('Needs Improvement');
    recommendations.push(`Intensive coaching required in ${subsection}`);
    recommendations.push(`Start with basic ${subsection} fundamentals`);
  }
  
  // Add specific insights based on response patterns
  const correctAnswers = data.responses.filter(r => r.score >= 4).length;
  const partialAnswers = data.responses.filter(r => r.score === 3).length;
  const wrongAnswers = data.responses.filter(r => r.score <= 2).length;
  
  let insightText = '';
  if (correctAnswers === data.count) {
    insightText = ` Perfect score across all ${subsection} questions.`;
    strengths.push(`Perfect performance in ${subsection}`);
  } else if (correctAnswers > partialAnswers + wrongAnswers) {
    insightText = ` Strong understanding with some nuanced concepts missed.`;
    weaknesses.push(`Missed nuanced ${subsection} concepts`);
  } else if (partialAnswers > wrongAnswers) {
    insightText = ` Has foundational knowledge but needs deeper understanding.`;
    weaknesses.push(`Surface-level understanding of ${subsection}`);
  } else {
    insightText = ` Struggles with core ${subsection} concepts.`;
    weaknesses.push(`Fundamental gaps in ${subsection} knowledge`);
  }
  
  const analysisText = `Performance in ${subsection}: ${percentage}% (${average}/5 average).${insightText}`;
  
  return {
    text: analysisText,
    traits: [...new Set(traits)],
    strengths: [...new Set(strengths)],
    weaknesses: [...new Set(weaknesses)],
    recommendations: [...new Set(recommendations)]
  };
}

/**
 * Generate overall profile based on assessment type
 */
function generateOverallProfile(assessmentType, percentage, strengths, weaknesses) {
  
  let text = '';
  let traits = [];
  let recommendations = [];
  
  // Determine profile based on assessment type and percentage
  switch(assessmentType) {
    case 'general':
      if (percentage >= 90) {
        text = 'Exceptional all-round performer. Demonstrates mastery across all competency areas. Ready for complex roles and increased responsibility.';
        traits = ['Versatile', 'High-Performing', 'Strategic'];
        recommendations = ['Fast-track for leadership development', 'Assign as mentor for other candidates'];
      } else if (percentage >= 80) {
        text = 'Strong all-round performer with solid capabilities across most areas. Shows good potential for growth.';
        traits = ['Capable', 'Reliable', 'Growth-oriented'];
        recommendations = ['Provide stretch assignments', 'Focus on targeted development areas'];
      } else if (percentage >= 70) {
        text = 'Competent performer with clear strengths and some development needs. Good foundation to build upon.';
        traits = ['Developing', 'Solid foundation', 'Potential'];
        recommendations = ['Create structured development plan', 'Focus on key improvement areas'];
      } else {
        text = 'Foundational level with significant development opportunities. Needs structured support and training.';
        traits = ['Developing', 'Learning', 'Needs support'];
        recommendations = ['Provide foundational training', 'Assign mentor for guidance'];
      }
      break;
      
    case 'leadership':
      if (percentage >= 90) {
        text = 'Exceptional leadership potential. Demonstrates strategic thinking, emotional intelligence, and people development skills. Ready for senior leadership role.';
        traits = ['Strategic', 'Inspirational', 'Empathetic', 'Decisive'];
        recommendations = ['Promote to senior leadership', 'Assign as mentor for emerging leaders'];
      } else if (percentage >= 80) {
        text = 'Strong leadership foundation with good people management skills. Shows potential for growth into higher leadership roles.';
        traits = ['Supportive', 'Decisive', 'Team-oriented'];
        recommendations = ['Provide leadership development program', 'Give team lead responsibilities'];
      } else if (percentage >= 70) {
        text = 'Developing leader with good potential. Needs experience in strategic thinking and conflict resolution.';
        traits = ['Emerging', 'Supportive', 'Learning'];
        recommendations = ['Assign to lead small projects', 'Provide leadership coaching'];
      } else {
        text = 'Early-stage leadership development. Needs foundational management training and mentorship.';
        traits = ['Developing', 'Needs training', 'Potential'];
        recommendations = ['Complete management training', 'Work with experienced leader mentor'];
      }
      break;
      
    case 'cognitive':
      if (percentage >= 90) {
        text = 'Exceptional cognitive abilities. Demonstrates strong analytical, logical, and critical thinking skills. Ready for complex problem-solving roles.';
        traits = ['Analytical', 'Strategic', 'Quick learner'];
        recommendations = ['Assign to complex strategic initiatives', 'Leverage for data-driven decisions'];
      } else if (percentage >= 80) {
        text = 'Strong cognitive abilities with good analytical and reasoning skills. Effective at problem-solving.';
        traits = ['Analytical', 'Logical', 'Practical'];
        recommendations = ['Provide challenging analytical tasks', 'Involve in process improvement'];
      } else if (percentage >= 70) {
        text = 'Solid cognitive foundation with developing analytical skills. Performs well on structured problems.';
        traits = ['Practical', 'Methodical', 'Developing'];
        recommendations = ['Provide structured problem-solving frameworks', 'Practice analytical thinking'];
      } else {
        text = 'Cognitive skills developing. Benefits from clear structure and guidance.';
        traits = ['Developing', 'Needs support', 'Practical'];
        recommendations = ['Provide clear instructions and frameworks', 'Start with simpler problems'];
      }
      break;
      
    case 'technical':
      if (percentage >= 90) {
        text = 'Exceptional technical expertise. Deep understanding of systems, processes, and troubleshooting. Ready for senior technical role.';
        traits = ['Technical expert', 'Systems thinker', 'Problem-solver'];
        recommendations = ['Promote to technical lead', 'Assign as technical mentor'];
      } else if (percentage >= 80) {
        text = 'Strong technical foundation with good practical knowledge. Effective at technical problem-solving.';
        traits = ['Technically capable', 'Process-aware', 'Reliable'];
        recommendations = ['Provide advanced technical training', 'Involve in complex technical projects'];
      } else if (percentage >= 70) {
        text = 'Solid technical skills with developing expertise. Good on routine technical tasks.';
        traits = ['Developing', 'Hands-on', 'Learning'];
        recommendations = ['Provide hands-on technical training', 'Work with experienced technicians'];
      } else {
        text = 'Technical skills developing. Needs hands-on training and support.';
        traits = ['Learning', 'Needs training', 'Developing'];
        recommendations = ['Complete technical fundamentals training', 'Shadow experienced technicians'];
      }
      break;
      
    case 'performance':
      if (percentage >= 90) {
        text = 'Exceptional understanding of performance metrics and data-driven management. Ready for performance management roles.';
        traits = ['Data-driven', 'Metrics-oriented', 'Strategic'];
        recommendations = ['Assign to performance improvement initiatives', 'Lead metric development'];
      } else if (percentage >= 80) {
        text = 'Strong grasp of performance metrics and their application. Good at tracking and improving performance.';
        traits = ['Analytical', 'Goal-oriented', 'Practical'];
        recommendations = ['Involve in goal-setting processes', 'Track team performance metrics'];
      } else if (percentage >= 70) {
        text = 'Good understanding of basic metrics with developing analytical skills.';
        traits = ['Developing', 'Practical', 'Learning'];
        recommendations = ['Provide training on performance metrics', 'Practice with KPI tracking'];
      } else {
        text = 'Basic understanding of performance metrics. Needs development in data-driven decision making.';
        traits = ['Learning', 'Needs training', 'Developing'];
        recommendations = ['Complete performance metrics training', 'Work with data regularly'];
      }
      break;
      
    case 'cultural':
      if (percentage >= 90) {
        text = 'Ideal cultural fit. Demonstrates perfect alignment with organizational values, work ethic, and interpersonal skills.';
        traits = ['Values-driven', 'Highly ethical', 'Proactive', 'Adaptable'];
        recommendations = ['Serve as cultural ambassador', 'Lead new hire onboarding'];
      } else if (percentage >= 80) {
        text = 'Strong cultural alignment with demonstrated values and work ethic. Good team player.';
        traits = ['Values-aligned', 'Ethical', 'Proactive'];
        recommendations = ['Involve in team building activities', 'Model positive behaviors'];
      } else if (percentage >= 70) {
        text = 'Good cultural fit with room to develop in specific areas. Shows alignment with core values.';
        traits = ['Aligned', 'Developing', 'Willing'];
        recommendations = ['Focus on specific value areas', 'Provide cultural mentoring'];
      } else {
        text = 'Cultural fit needs development. Focus needed on values alignment and workplace behaviors.';
        traits = ['Developing', 'Needs guidance', 'Learning'];
        recommendations = ['Provide cultural orientation', 'Pair with values mentor'];
      }
      break;
      
    case 'personality':
      if (percentage >= 90) {
        text = 'Well-balanced personality profile with strong emotional intelligence and self-awareness.';
        traits = ['Self-aware', 'Emotionally intelligent', 'Balanced'];
        recommendations = ['Leverage as team mediator', 'Model emotional intelligence'];
      } else if (percentage >= 80) {
        text = 'Good personality fit with consistent behavioral patterns and self-awareness.';
        traits = ['Consistent', 'Aware', 'Appropriate'];
        recommendations = ['Continue developing self-awareness', 'Practice emotional regulation'];
      } else if (percentage >= 70) {
        text = 'Developing behavioral awareness. Working on adapting style to different situations.';
        traits = ['Learning', 'Developing', 'Trying'];
        recommendations = ['Practice self-reflection', 'Seek feedback on behaviors'];
      } else {
        text = 'Building foundational behavioral skills. Needs guidance on workplace behaviors.';
        traits = ['Learning', 'Following', 'Developing'];
        recommendations = ['Provide behavioral coaching', 'Practice social awareness'];
      }
      break;
      
    default:
      text = `Overall performance: ${percentage}% with ${strengths.length} key strengths and ${weaknesses.length} development areas.`;
      traits = ['Capable', 'Developing'];
      recommendations = ['Focus on key development areas', 'Leverage identified strengths'];
  }
  
  return { text, traits, recommendations };
}

/**
 * Generate personalized development plan
 */
function generateDevelopmentPlan(weaknesses, strengths, assessmentType) {
  
  const plan = {
    immediate: [], // 0-30 days
    shortTerm: [], // 30-60 days
    longTerm: []   // 60-90+ days
  };
  
  // Immediate actions - focus on top 3 weaknesses
  weaknesses.slice(0, 3).forEach(w => {
    plan.immediate.push({
      area: w.area,
      section: w.section,
      action: `Begin focused development in ${w.area}`,
      recommendation: w.recommendations[0] || `Complete training in ${w.area}`,
      timeframe: '0-30 days',
      priority: 'High'
    });
  });
  
  // Short-term actions - next 3 weaknesses
  weaknesses.slice(3, 6).forEach(w => {
    plan.shortTerm.push({
      area: w.area,
      section: w.section,
      action: `Continue development in ${w.area}`,
      recommendation: w.recommendations[1] || `Practice ${w.area} skills`,
      timeframe: '30-60 days',
      priority: 'Medium'
    });
  });
  
  // Long-term actions - leverage strengths
  strengths.slice(0, 3).forEach(s => {
    plan.longTerm.push({
      area: s.area,
      section: s.section,
      action: `Leverage strength in ${s.area}`,
      recommendation: s.recommendations[0] || `Mentor others in ${s.area}`,
      timeframe: '60-90+ days',
      priority: 'Development'
    });
  });
  
  return plan;
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(candidateName, assessmentType, percentage, strengths, weaknesses) {
  
  let summary = `${candidateName} completed the ${assessmentType} assessment with an overall score of ${percentage}%. `;
  
  if (strengths.length > 0) {
    summary += `Key strengths include ${strengths.slice(0, 3).map(s => s.area).join(', ')}. `;
  }
  
  if (weaknesses.length > 0) {
    summary += `Development areas include ${weaknesses.slice(0, 3).map(w => w.area).join(', ')}. `;
  }
  
  if (percentage >= 80) {
    summary += 'Overall, this candidate demonstrates strong capabilities and is ready for increased responsibility.';
  } else if (percentage >= 60) {
    summary += 'Overall, this candidate shows good potential with targeted development needs.';
  } else {
    summary += 'Overall, this candidate requires structured development and support to build foundational skills.';
  }
  
  return summary;
}

/**
 * Generate unique insights based on response patterns
 */
function generateUniqueInsights(responses, sectionData, subsectionData) {
  
  const insights = [];
  
  // Analyze response patterns
  const perfectSubsections = [];
  const strugglingSubsections = [];
  
  Object.keys(subsectionData).forEach(sub => {
    const data = subsectionData[sub];
    const percentage = (data.total / data.maxPossible) * 100;
    
    if (percentage === 100) {
      perfectSubsections.push(sub);
    } else if (percentage < 50) {
      strugglingSubsections.push(sub);
    }
  });
  
  if (perfectSubsections.length > 0) {
    insights.push(`Perfect scores achieved in: ${perfectSubsections.join(', ')}`);
  }
  
  if (strugglingSubsections.length > 0) {
    insights.push(`Significant development needed in: ${strugglingSubsections.join(', ')}`);
  }
  
  // Analyze consistency
  const scores = responses.map(r => r.score);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = Math.sqrt(scores.map(s => Math.pow(s - averageScore, 2)).reduce((a, b) => a + b, 0) / scores.length);
  
  if (variance < 1) {
    insights.push('Response pattern shows high consistency - candidate has stable knowledge across areas.');
  } else if (variance > 2) {
    insights.push('Response pattern shows significant variation - candidate has uneven knowledge with clear strengths and weaknesses.');
  }
  
  // Count correct vs incorrect
  const correctCount = responses.filter(r => r.score >= 4).length;
  const partialCount = responses.filter(r => r.score === 3).length;
  const incorrectCount = responses.filter(r => r.score <= 2).length;
  
  insights.push(`Response breakdown: ${correctCount} correct, ${partialCount} partial, ${incorrectCount} incorrect`);
  
  return insights;
}
