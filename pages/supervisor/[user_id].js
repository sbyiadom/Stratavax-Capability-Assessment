import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { generateDetailedInterpretation } from "../../utils/detailedInterpreter";
import { getClassification, getGradeInfo, getHiringRecommendation } from "../../utils/reportGenerator";
import { assessmentTypes, getAssessmentType } from "../../utils/assessmentConfigs";
import { analyzeResponses, getCategorySpecificRecommendations } from "../../utils/responseAnalyzer";
import { getDevelopmentRecommendation } from "../../utils/developmentRecommendations";
import {
  // General Assessment
  interpretIntegrity,
  interpretWorkPace,
  interpretMotivations,
  interpretNeuroticism,
  interpretExtraversion,
  interpretMixedTraits,
  interpretAgreeableness,
  interpretBehavioralStyle,
  interpretConscientiousness,
  interpretPerformanceRisks,
  interpretStressManagement,
  interpretCognitivePatterns,
  interpretEmotionalIntelligence,
  interpretOpenness,
  
  // Leadership Assessment
  interpretVision,
  interpretDecisionMaking,
  interpretInfluence,
  interpretPeopleManagement,
  interpretChangeLeadership,
  interpretExecution,
  interpretResilience,
  interpretSelfAwareness,
  
  // Cognitive Assessment
  interpretLogicalReasoning,
  interpretNumericalReasoning,
  interpretVerbalReasoning,
  interpretSpatialReasoning,
  interpretMemoryAttention,
  interpretPerceptualSpeed,
  interpretCriticalThinking,
  interpretLearningAgility,
  interpretMentalFlexibility,
  
  // Technical Assessment
  interpretTechnicalKnowledge,
  interpretSystemUnderstanding,
  interpretTroubleshooting,
  interpretPracticalApplication,
  interpretSafetyCompliance,
  interpretQualityControl,
  interpretProcessOptimization,
  interpretEquipmentOperation,
  interpretMaintenanceProcedures,
  interpretTechnicalDocumentation,
  
  // Performance Assessment
  interpretProductivity,
  interpretWorkQuality,
  interpretGoalAchievement,
  interpretAccountability,
  interpretInitiative,
  interpretCollaboration,
  interpretTimeManagement,
  interpretResultsOrientation,
  
  // Behavioral Assessment
  interpretTeamwork,
  interpretConflictResolution,
  interpretEmpathy,
  interpretActiveListening,
  interpretFeedbackReception,
  interpretInterpersonalSkills,
  interpretProfessionalism,
  
  // Cultural Assessment
  interpretValuesAlignment,
  interpretWorkEthic,
  interpretDiversityAwareness,
  interpretInclusivity,
  interpretRespect
} from "../../utils/categoryInterpreter";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  const reportRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [activeSection, setActiveSection] = useState('cover');
  const [showPrintView, setShowPrintView] = useState(false);
  const [assessmentConfig, setAssessmentConfig] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const supervisorSession = localStorage.getItem("supervisorSession");
        if (!supervisorSession) {
          router.push("/supervisor-login");
          return;
        }
        
        try {
          const session = JSON.parse(supervisorSession);
          if (session.loggedIn) {
            setIsSupervisor(true);
          } else {
            router.push("/supervisor-login");
          }
        } catch {
          router.push("/supervisor-login");
        }
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const { data: profileData } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('id', user_id)
          .maybeSingle();

        setCandidate({
          id: user_id,
          full_name: profileData?.full_name || profileData?.email?.split('@')[0] || 'Candidate',
          email: profileData?.email || 'Email not available'
        });

        const { data: resultsData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('user_id', user_id)
          .order('completed_at', { ascending: false });

        if (resultsData && resultsData.length > 0) {
          const result = resultsData[0];
          const percentage = Math.round((result.total_score / result.max_score) * 100);
          
          const assessmentTypeId = result.assessment_type || 'general';
          const config = getAssessmentType(assessmentTypeId);
          setAssessmentConfig(config);

          const { data: responsesData } = await supabase
            .from('responses')
            .select(`
              *,
              unique_questions!inner (
                id,
                section,
                subsection,
                question_text
              ),
              unique_answers!inner (
                id,
                answer_text,
                score
              )
            `)
            .eq('user_id', user_id)
            .eq('assessment_id', result.assessment_id);

          const processedResponses = responsesData?.map(r => ({
            question_id: r.question_id,
            answer_id: r.answer_id,
            category: r.unique_questions?.section || 'General',
            question_text: r.unique_questions?.question_text,
            answer_text: r.unique_answers?.answer_text,
            score: r.unique_answers?.score
          })) || [];

          const responseInsights = {};
          
          processedResponses.forEach(r => {
            if (!responseInsights[r.category]) {
              responseInsights[r.category] = {
                insights: [],
                scores: [],
                questionCount: 0,
                highScoreCount: 0,
                lowScoreCount: 0,
                questionDetails: []
              };
            }
            
            const cat = responseInsights[r.category];
            cat.insights.push(generateInsight(r.category, r.question_text, r.answer_text, r.score));
            cat.scores.push(r.score);
            cat.questionCount++;
            cat.questionDetails.push({
              question: r.question_text,
              answer: r.answer_text,
              score: r.score
            });
            
            if (r.score >= 4) cat.highScoreCount++;
            if (r.score <= 2) cat.lowScoreCount++;
          });

          Object.keys(responseInsights).forEach(cat => {
            const data = responseInsights[cat];
            const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            data.percentage = Math.round((avgScore / 5) * 100);
          });

          console.log("Response Insights:", responseInsights);
          
          const detailedInterpretation = generateDetailedInterpretation(
            profileData?.full_name || 'Candidate',
            result.category_scores,
            assessmentTypeId,
            responseInsights
          );
          
          setAssessmentData({
            source: 'results',
            assessment_id: result.assessment_id,
            assessment_type: assessmentTypeId,
            assessment_name: config.name,
            total_score: result.total_score,
            max_score: result.max_score,
            percentage: percentage,
            completed_at: result.completed_at,
            category_scores: result.category_scores || {},
            strengths: result.strengths || [],
            weaknesses: result.weaknesses || [],
            recommendations: result.recommendations || [],
            interpretations: result.interpretations || {},
            detailedInterpretation: detailedInterpretation,
            responseInsights: responseInsights
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSupervisor, user_id]);

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };

  const generateInsight = (category, questionText, answerText, score) => {
    const answerPreview = answerText.length > 60 
      ? answerText.substring(0, 60) + '...' 
      : answerText;

    if (score === 5) {
      return `Strong understanding demonstrated in responses`;
    } else if (score === 4) {
      return `Good grasp shown with room for deeper understanding`;
    } else if (score === 3) {
      return `Basic awareness demonstrated`;
    } else if (score === 2) {
      return `Limited understanding shown - needs development`;
    } else {
      return `Significant gap identified - requires attention`;
    }
  };

  const getCategoryInterpretation = (category, data, candidateName) => {
    if (!data) return `${category}: No detailed response data available.`;
    
    const categoryMap = {
      // General Assessment
      'Integrity': interpretIntegrity,
      'Work Pace': interpretWorkPace,
      'Motivations': interpretMotivations,
      'Neuroticism': interpretNeuroticism,
      'Extraversion': interpretExtraversion,
      'Mixed Traits': interpretMixedTraits,
      'Agreeableness': interpretAgreeableness,
      'Behavioral Style': interpretBehavioralStyle,
      'Conscientiousness': interpretConscientiousness,
      'Performance Risks': interpretPerformanceRisks,
      'Stress Management': interpretStressManagement,
      'Cognitive Patterns': interpretCognitivePatterns,
      'Emotional Intelligence': interpretEmotionalIntelligence,
      'Openness to Experience': interpretOpenness,
      
      // Leadership Assessment
      'Vision & Strategic Thinking': interpretVision,
      'Decision-Making & Problem-Solving': interpretDecisionMaking,
      'Communication & Influence': interpretInfluence,
      'People Management & Coaching': interpretPeopleManagement,
      'Change Leadership & Agility': interpretChangeLeadership,
      'Execution & Results Orientation': interpretExecution,
      'Resilience & Stress Management': interpretResilience,
      'Self-Awareness & Self-Regulation': interpretSelfAwareness,
      
      // Cognitive Assessment
      'Logical / Abstract Reasoning': interpretLogicalReasoning,
      'Numerical Reasoning': interpretNumericalReasoning,
      'Verbal Reasoning': interpretVerbalReasoning,
      'Spatial Reasoning': interpretSpatialReasoning,
      'Memory & Attention': interpretMemoryAttention,
      'Perceptual Speed & Accuracy': interpretPerceptualSpeed,
      'Critical Thinking': interpretCriticalThinking,
      'Learning Agility': interpretLearningAgility,
      'Mental Flexibility': interpretMentalFlexibility,
      
      // Technical Assessment
      'Technical Knowledge': interpretTechnicalKnowledge,
      'System Understanding': interpretSystemUnderstanding,
      'Troubleshooting': interpretTroubleshooting,
      'Practical Application': interpretPracticalApplication,
      'Safety & Compliance': interpretSafetyCompliance,
      'Quality Control': interpretQualityControl,
      'Process Optimization': interpretProcessOptimization,
      'Equipment Operation': interpretEquipmentOperation,
      'Maintenance Procedures': interpretMaintenanceProcedures,
      'Technical Documentation': interpretTechnicalDocumentation,
      
      // Performance Assessment
      'Productivity & Efficiency': interpretProductivity,
      'Work Quality & Effectiveness': interpretWorkQuality,
      'Goal Achievement': interpretGoalAchievement,
      'Accountability': interpretAccountability,
      'Initiative': interpretInitiative,
      'Collaboration': interpretCollaboration,
      'Time Management': interpretTimeManagement,
      'Results Orientation': interpretResultsOrientation,
      
      // Behavioral Assessment
      'Teamwork': interpretTeamwork,
      'Conflict Resolution': interpretConflictResolution,
      'Empathy': interpretEmpathy,
      'Active Listening': interpretActiveListening,
      'Feedback Reception': interpretFeedbackReception,
      'Interpersonal Skills': interpretInterpersonalSkills,
      'Professionalism': interpretProfessionalism,
      
      // Cultural Assessment
      'Values Alignment': interpretValuesAlignment,
      'Work Ethic': interpretWorkEthic,
      'Diversity Awareness': interpretDiversityAwareness,
      'Inclusivity': interpretInclusivity,
      'Respect': interpretRespect
    };

    const interpreter = Object.entries(categoryMap).find(([key]) => 
      category.includes(key) || key.includes(category)
    )?.[1];

    if (interpreter) {
      return interpreter(data, candidateName);
    }

    return `${candidateName} scored ${data.percentage}% in ${category}. ` +
      (data.percentage >= 70 ? 'This is a strength area.' :
       data.percentage >= 60 ? 'Shows basic competency with room for development.' :
       'Requires focused attention and development.');
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  if (!isSupervisor || loading) {
    return (
      <div style={styles.checkingContainer}>
        <div style={styles.spinner} />
        <p>Loading candidate report...</p>
      </div>
    );
  }

  if (!candidate || !assessmentData) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <h3>No Assessment Data Available</h3>
        <p>This candidate hasn't completed any assessments yet.</p>
        <Link href="/supervisor" legacyBehavior>
          <a style={styles.primaryButton}>← Back to Dashboard</a>
        </Link>
      </div>
    );
  }

  const classification = getClassification(assessmentData.percentage);
  const gradeInfo = getGradeInfo(assessmentData.percentage);
  const hiringRec = getHiringRecommendation(assessmentData.percentage, assessmentData.strengths, assessmentData.weaknesses);
  const strengthsList = assessmentData.strengths || [];
  const weaknessesList = assessmentData.weaknesses || [];
  const config = assessmentConfig || assessmentTypes.general;

  return (
    <AppLayout background="/images/preassessmentbg.jpg">
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/supervisor" legacyBehavior>
            <a style={styles.backButton}>← Dashboard</a>
          </Link>
          <div style={styles.headerActions}>
            <button onClick={handlePrint} style={styles.printButton}>
              🖨️ Print Report
            </button>
          </div>
        </div>

        <div style={styles.navigation}>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'cover' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('cover')}
          >
            Cover
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'executive' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('executive')}
          >
            Executive Summary
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'overview' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('overview')}
          >
            Assessment Overview
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'competencies' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('competencies')}
          >
            Competency Breakdown
          </button>
          <button 
            style={{...styles.navItem, borderBottom: activeSection === 'development' ? '3px solid #3b82f6' : '3px solid transparent'}}
            onClick={() => setActiveSection('development')}
          >
            Development Plan
          </button>
        </div>

        <div ref={reportRef} style={styles.reportContainer}>
          {/* 1️⃣ Cover Page */}
          <section style={{...styles.section, display: activeSection === 'cover' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.coverPage}>
              <div style={styles.coverHeader}>
                <h1 style={styles.coverTitle}>Stratavax Assessment Platform</h1>
                <p style={styles.coverSubtitle}>{config.name}</p>
              </div>
              
              <div style={styles.coverContent}>
                <div style={styles.coverLogo}>{config.icon}</div>
                <h2 style={styles.coverCandidateName}>{candidate.full_name}</h2>
                <p style={styles.coverDetail}>Assessment Date: {new Date(assessmentData.completed_at).toLocaleDateString()}</p>
                <p style={styles.coverDetail}>Report Generated: {new Date().toLocaleDateString()}</p>
                <div style={styles.coverBadge}>CONFIDENTIAL</div>
              </div>
              
              <div style={styles.coverFooter}>
                <p>© Stratavax Assessment Platform • All Rights Reserved</p>
              </div>
            </div>
          </section>

          {/* 2️⃣ Executive Summary */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'executive' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>2. Executive Summary - {config.name}</h2>
            </div>
            
            <div style={styles.executiveSummary}>
              <div style={styles.scoreCard}>
                <div style={styles.scoreCardHeader}>
                  <span style={styles.scoreCardLabel}>Total Score</span>
                  <span style={styles.scoreCardValue}>{assessmentData.total_score}/{assessmentData.max_score}</span>
                </div>
                <div style={styles.scoreCardBody}>
                  <div style={styles.scoreMetric}>
                    <span style={styles.scoreMetricLabel}>Percentage</span>
                    <span style={{...styles.scoreMetricValue, color: classification.color}}>{assessmentData.percentage}%</span>
                  </div>
                  <div style={styles.scoreMetric}>
                    <span style={styles.scoreMetricLabel}>Grade</span>
                    <span style={styles.scoreMetricValue}>{gradeInfo.grade} ({gradeInfo.text})</span>
                  </div>
                </div>
              </div>

              <div style={styles.classificationCard}>
                <div style={{...styles.classificationBadge, background: classification.bg, color: classification.color}}>
                  {classification.label}
                </div>
                <p style={styles.classificationDescription}>{classification.description}</p>
              </div>

              <div style={styles.verdictCard}>
                <h3 style={styles.verdictTitle}>Executive Verdict</h3>
                <div style={{...styles.verdictBadge, background: hiringRec.color, color: 'white'}}>
                  {hiringRec.recommendation}
                </div>
                <p style={styles.verdictSummary}>{hiringRec.summary}</p>
                
                <div style={styles.keyPoints}>
                  <div style={styles.keyPoint}>
                    <span style={styles.keyPointIcon}>✅</span>
                    <div>
                      <strong>Key Strength:</strong> {strengthsList[0] || 'None identified'}
                    </div>
                  </div>
                  <div style={styles.keyPoint}>
                    <span style={styles.keyPointIcon}>⚠️</span>
                    <div>
                      <strong>Major Risk:</strong> {weaknessesList[0] || 'None identified'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3️⃣ Assessment Overview */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'overview' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>3. Assessment Overview - {config.name}</h2>
            </div>
            
            <div style={styles.overviewCard}>
              <div style={styles.overviewGrid}>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Total Competencies Assessed</h4>
                  <p style={styles.overviewItemValue}>{Object.keys(assessmentData.category_scores).length}</p>
                </div>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Assessment Method</h4>
                  <p style={styles.overviewItemValue}>Multi-dimensional Assessment</p>
                  <p style={styles.overviewItemSub}>Psychometric • Behavioral • Cognitive • Technical</p>
                </div>
                <div style={styles.overviewItem}>
                  <h4 style={styles.overviewItemTitle}>Scoring Methodology</h4>
                  <p style={styles.overviewItemValue}>Weighted Category Scoring</p>
                  <p style={styles.overviewItemSub}>{config.weightage}</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4️⃣ Overall Score Summary Table */}
          <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'competencies' || showPrintView ? 'block' : 'none'}}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>4. Overall Score Summary - {config.name}</h2>
            </div>
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.tableHead}>Category</th>
                    <th style={styles.tableHead}>Score</th>
                    <th style={styles.tableHead}>Percentage</th>
                    <th style={styles.tableHead}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(assessmentData.category_scores).map(([category, data]) => {
                    const catGrade = getGradeInfo(data.percentage);
                    return (
                      <tr key={category} style={styles.tableRow}>
                        <td style={styles.tableCell}>{category}</td>
                        <td style={styles.tableCell}>{data.score}/{data.maxPossible}</td>
                        <td style={styles.tableCell}>{data.percentage}%</td>
                        <td style={styles.tableCell}>{catGrade.grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={styles.tableFooterRow}>
                    <td colSpan="4" style={styles.tableFooter}>
                      <div style={styles.totalScoreRow}>
                        <span><strong>Total Score:</strong> {assessmentData.total_score}/{assessmentData.max_score}</span>
                        <span><strong>Average:</strong> {assessmentData.percentage}%</span>
                        <span><strong>Overall Grade:</strong> {gradeInfo.grade}</span>
                        <span><strong>Classification:</strong> {classification.label}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5️⃣ Competency Breakdown */}
            <div style={styles.competencyBreakdown}>
              <h3 style={styles.subsectionTitle}>5. Competency Analysis</h3>
              
              {Object.entries(assessmentData.category_scores).map(([category, data]) => {
                const catGrade = getGradeInfo(data.percentage);
                const categoryData = assessmentData.responseInsights?.[category];
                
                return (
                  <div key={category} style={styles.competencyCard}>
                    <div style={styles.competencyHeader}>
                      <h4 style={styles.competencyName}>{category} – {data.percentage}% ({catGrade.grade})</h4>
                    </div>
                    <div style={styles.competencyBody}>
                      {categoryData ? (
                        <div style={styles.interpretationText}>
                          {getCategoryInterpretation(category, { ...categoryData, percentage: data.percentage }, candidate.full_name)}
                        </div>
                      ) : (
                        <p>No detailed response data available for this category.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 6️⃣ Strength Profile Summary */}
            <div style={styles.strengthProfile}>
              <h3 style={styles.subsectionTitle}>6. Strength Profile Summary</h3>
              <div style={styles.strengthGrid}>
                {strengthsList.map((strength, index) => {
                  const match = strength.match(/(.+) \((\d+)%\)/);
                  const category = match ? match[1] : strength;
                  const percentage = match ? match[2] : '';
                  
                  const categoryData = assessmentData.responseInsights?.[category];
                  
                  return (
                    <div key={index} style={styles.strengthCard}>
                      <span style={styles.strengthIcon}>💪</span>
                      <div style={styles.strengthContent}>
                        <div style={styles.strengthHeader}>
                          <strong>{category}</strong>
                          <span style={styles.strengthPercentage}>{percentage}%</span>
                        </div>
                        <p style={styles.strengthInsight}>Strong performance in this area</p>
                      </div>
                    </div>
                  );
                })}
                {strengthsList.length === 0 && (
                  <div style={styles.strengthCard}>
                    <span style={styles.strengthIcon}>📝</span>
                    <div>
                      <strong>No dominant strengths identified</strong>
                      <p style={styles.strengthDesc}>All areas require development attention</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7️⃣ Development Priorities */}
            <div style={styles.riskProfile}>
              <h3 style={styles.subsectionTitle}>7. Development Priorities</h3>
              <div style={styles.riskGrid}>
                {weaknessesList.map((weakness, index) => {
                  const match = weakness.match(/(.+) \((\d+)%\)/);
                  const category = match ? match[1] : weakness;
                  const percentage = parseInt(match ? match[2] : '0');
                  
                  const recommendation = getDevelopmentRecommendation(category, percentage);
                  
                  let urgencyLevel = '';
                  let urgencyColor = '';
                  if (percentage < 50) {
                    urgencyLevel = 'Critical Gap';
                    urgencyColor = '#991b1b';
                  } else if (percentage < 60) {
                    urgencyLevel = 'Significant Need';
                    urgencyColor = '#b45309';
                  } else if (percentage < 70) {
                    urgencyLevel = 'Development Opportunity';
                    urgencyColor = '#1e40af';
                  } else {
                    urgencyLevel = 'Strength to Leverage';
                    urgencyColor = '#047857';
                  }
                  
                  return (
                    <div key={index} style={styles.riskCard}>
                      <span style={styles.riskIcon}>⚠️</span>
                      <div style={styles.riskContent}>
                        <div style={styles.riskHeader}>
                          <strong>{category}</strong>
                          <span style={{...styles.riskPercentage, color: urgencyColor}}>{percentage}% - {urgencyLevel}</span>
                        </div>
                        <p style={styles.riskDescription}>
                          {recommendation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 8️⃣ Role Fit Analysis & Development Plan */}
            <section style={{...styles.section, pageBreakBefore: 'always', display: activeSection === 'development' || showPrintView ? 'block' : 'none'}}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>8. Role Fit Analysis - {config.name}</h2>
              </div>
              
              <div style={styles.roleFitCard}>
                {assessmentData.detailedInterpretation?.roleFit && (
                  <div style={styles.analysisText}>{assessmentData.detailedInterpretation.roleFit}</div>
                )}
                {!assessmentData.detailedInterpretation?.roleFit && (
                  <div style={styles.analysisText}>
                    <p><strong>Best suited for roles requiring:</strong></p>
                    <ul>
                      {strengthsList.map((s, i) => {
                        const [category] = s.split(' (');
                        return <li key={i}>• Strong {category.toLowerCase()} capabilities</li>;
                      })}
                      {strengthsList.length === 0 && (
                        <li>• Structured, supervised positions with clear guidelines</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* 9️⃣ Development Recommendations */}
              <div style={styles.timelineContainer}>
                <h3 style={styles.subsectionTitle}>9. Development Recommendations</h3>
                
                <div style={styles.timelineGrid}>
                  <div style={styles.timelinePhase}>
                    <h3 style={styles.phaseTitle}>Short-Term (0–3 Months)</h3>
                    <ul style={styles.phaseList}>
                      <li>Complete foundational training in weak areas</li>
                      <li>Structured mentoring program</li>
                      <li>Weekly feedback and progress reviews</li>
                      {weaknessesList.length > 0 && (
                        <li>Focus on {weaknessesList.slice(0, 2).map(w => w.split(' (')[0]).join(' and ')}</li>
                      )}
                    </ul>
                  </div>
                  
                  <div style={styles.timelinePhase}>
                    <h3 style={styles.phaseTitle}>Medium-Term (3–6 Months)</h3>
                    <ul style={styles.phaseList}>
                      <li>Advanced training in core competencies</li>
                      <li>Cross-functional project exposure</li>
                      <li>Skill certification courses</li>
                      <li>Apply learning to practical situations</li>
                    </ul>
                  </div>
                  
                  <div style={styles.timelinePhase}>
                    <h3 style={styles.phaseTitle}>Long-Term (6–12 Months)</h3>
                    <ul style={styles.phaseList}>
                      <li>Leadership development program</li>
                      <li>Stretch assignments</li>
                      <li>Regular reassessment of progress</li>
                      {strengthsList.length > 0 && (
                        <li>Build on {strengthsList.slice(0, 1).map(s => s.split(' (')[0]).join('')} strengths</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 🔟 Hiring Recommendation */}
              <div style={styles.hiringCard}>
                <h3 style={styles.subsectionTitle}>10. Hiring / Promotion Recommendation</h3>
                <div style={{...styles.hiringBadge, background: hiringRec.color}}>
                  {hiringRec.recommendation}
                </div>
                <p style={styles.hiringJustification}>{hiringRec.summary}</p>
                <p style={styles.hiringDetail}>
                  Based on the comprehensive {config.name}, this candidate demonstrates 
                  {assessmentData.percentage >= 65 ? ' strong potential' : ' significant development needs'} 
                  for roles requiring these competencies.
                </p>
                <div style={styles.hiringFactors}>
                  <div style={styles.hiringFactor}>
                    <strong>Supporting factors:</strong> {strengthsList.length} strength areas identified
                  </div>
                  <div style={styles.hiringFactor}>
                    <strong>Risk factors:</strong> {weaknessesList.length} areas requiring development
                  </div>
                </div>
              </div>
            </section>
          </section>
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
  checkingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    margin: '20px',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  primaryButton: {
    display: 'inline-block',
    background: '#3b82f6',
    color: 'white',
    padding: '12px 30px',
    borderRadius: '30px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    marginTop: '20px',
    transition: 'all 0.2s',
    cursor: 'pointer',
    ':hover': {
      background: '#2563eb',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)'
    }
  },
  container: {
    width: '90vw',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  backButton: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #3b82f6',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3b82f6',
      color: 'white'
    }
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  printButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#059669'
    }
  },
  navigation: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '10px',
    overflowX: 'auto',
    whiteSpace: 'nowrap'
  },
  navItem: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#4b5563',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  reportContainer: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '40px'
  },
  sectionHeader: {
    marginBottom: '30px',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '10px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#1f2937'
  },
  subsectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '30px 0 20px 0'
  },
  coverPage: {
    minHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center',
    padding: '40px 20px'
  },
  coverHeader: {
    marginBottom: '60px'
  },
  coverTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: '10px'
  },
  coverSubtitle: {
    fontSize: '18px',
    color: '#6b7280'
  },
  coverContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  coverLogo: {
    fontSize: '80px',
    marginBottom: '40px'
  },
  coverCandidateName: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '20px'
  },
  coverDetail: {
    fontSize: '16px',
    color: '#6b7280',
    margin: '5px 0'
  },
  coverBadge: {
    marginTop: '40px',
    padding: '8px 30px',
    border: '2px solid #ef4444',
    borderRadius: '40px',
    color: '#ef4444',
    fontWeight: 600,
    letterSpacing: '2px'
  },
  coverFooter: {
    marginTop: '60px',
    color: '#9ca3af',
    fontSize: '14px'
  },
  executiveSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  scoreCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  scoreCardHeader: {
    background: '#f9fafb',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  scoreCardLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280'
  },
  scoreCardValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937'
  },
  scoreCardBody: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  scoreMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  scoreMetricLabel: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  scoreMetricValue: {
    fontSize: '24px',
    fontWeight: 700
  },
  classificationCard: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  classificationBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '10px'
  },
  classificationDescription: {
    margin: 0,
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6'
  },
  verdictCard: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  verdictTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937'
  },
  verdictBadge: {
    display: 'inline-block',
    padding: '8px 20px',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '15px'
  },
  verdictSummary: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  keyPoints: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  keyPoint: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start'
  },
  keyPointIcon: {
    fontSize: '18px'
  },
  overviewCard: {
    padding: '30px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px'
  },
  overviewItem: {
    textAlign: 'center'
  },
  overviewItemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '10px'
  },
  overviewItemValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '5px'
  },
  overviewItemSub: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '40px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    background: '#f9fafb',
    borderBottom: '2px solid #3b82f6'
  },
  tableHead: {
    padding: '12px',
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  tableCell: {
    padding: '12px'
  },
  tableFooterRow: {
    background: '#f9fafb'
  },
  tableFooter: {
    padding: '15px'
  },
  totalScoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  competencyBreakdown: {
    marginTop: '40px'
  },
  competencyCard: {
    marginBottom: '30px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  competencyHeader: {
    background: '#f9fafb',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb'
  },
  competencyName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937'
  },
  competencyBody: {
    padding: '20px'
  },
  interpretationText: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#4b5563',
    whiteSpace: 'pre-wrap'
  },
  strengthProfile: {
    marginTop: '40px'
  },
  strengthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  strengthCard: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    background: '#d1fae5',
    borderRadius: '8px',
    border: '1px solid #a7f3d0'
  },
  strengthIcon: {
    fontSize: '24px'
  },
  strengthContent: {
    flex: 1
  },
  strengthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  strengthPercentage: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#065f46'
  },
  strengthInsight: {
    fontSize: '13px',
    color: '#064e3b',
    lineHeight: '1.5',
    margin: 0
  },
  strengthDesc: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: '#065f46'
  },
  riskProfile: {
    marginTop: '40px'
  },
  riskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px'
  },
  riskCard: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    background: '#fee2e2',
    borderRadius: '8px',
    border: '1px solid #fecaca'
  },
  riskIcon: {
    fontSize: '24px'
  },
  riskContent: {
    flex: 1
  },
  riskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  riskPercentage: {
    fontSize: '14px',
    fontWeight: 600
  },
  riskDescription: {
    fontSize: '13px',
    color: '#7f1d1d',
    lineHeight: '1.5',
    margin: 0
  },
  roleFitCard: {
    padding: '30px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '40px'
  },
  timelineContainer: {
    marginBottom: '40px'
  },
  timelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  timelinePhase: {
    padding: '20px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  phaseTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#3b82f6'
  },
  phaseList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#4b5563',
    lineHeight: '1.8'
  },
  hiringCard: {
    padding: '30px',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
    textAlign: 'center'
  },
  hiringBadge: {
    display: 'inline-block',
    padding: '12px 40px',
    borderRadius: '40px',
    color: 'white',
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '20px'
  },
  hiringJustification: {
    fontSize: '16px',
    color: '#1f2937',
    lineHeight: '1.6',
    marginBottom: '15px'
  },
  hiringDetail: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  hiringFactors: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    flexWrap: 'wrap'
  },
  hiringFactor: {
    fontSize: '14px',
    color: '#4b5563'
  },
  analysisText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.8',
    whiteSpace: 'pre-line'
  }
};
