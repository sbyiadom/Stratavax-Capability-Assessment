// pages/supervisor/[user_id].js - FULLY PERSONALIZED ANALYSIS BASED ON ACTUAL RESPONSES
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [answerDetails, setAnswerDetails] = useState({});
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Assessment type configurations with vibrant colors
  const assessmentTypes = [
    { 
      id: 'cognitive',
      name: 'Cognitive Abilities', 
      icon: '🧠',
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
      lightBg: '#FFE5E5',
      border: '#FFCDCD',
      description: 'Problem-solving, critical thinking, analytical reasoning'
    },
    { 
      id: 'personality',
      name: 'Personality Assessment', 
      icon: '🌟',
      color: '#4ECDC4',
      gradient: 'linear-gradient(135deg, #4ECDC4, #6FD1C9)',
      lightBg: '#E0F7F5',
      border: '#B8EFEA',
      description: 'Emotional intelligence, communication, teamwork'
    },
    { 
      id: 'leadership',
      name: 'Leadership Potential', 
      icon: '👑',
      color: '#A8E6CF',
      gradient: 'linear-gradient(135deg, #A8E6CF, #BCEAD6)',
      lightBg: '#F0FCF7',
      border: '#D4F5E6',
      description: 'Vision, influence, team development'
    },
    { 
      id: 'technical',
      name: 'Technical Competence', 
      icon: '⚙️',
      color: '#FFD93D',
      gradient: 'linear-gradient(135deg, #FFD93D, #FFE170)',
      lightBg: '#FFF8E0',
      border: '#FFEDB5',
      description: 'Manufacturing knowledge, equipment expertise'
    },
    { 
      id: 'performance',
      name: 'Performance Metrics', 
      icon: '📊',
      color: '#6C5CE7',
      gradient: 'linear-gradient(135deg, #6C5CE7, #8A7EED)',
      lightBg: '#EDEBFC',
      border: '#D4D0F5',
      description: 'Productivity, goal achievement, efficiency'
    },
    { 
      id: 'behavioral',
      name: 'Behavioral Analysis', 
      icon: '🤝',
      color: '#F9A826',
      gradient: 'linear-gradient(135deg, #F9A826, #FBB84D)',
      lightBg: '#FEF3E0',
      border: '#FDE2B3',
      description: 'Work style, adaptability, interpersonal skills'
    }
  ];

  // Color palette
  const colors = {
    primary: '#6C5CE7',
    secondary: '#A8E6CF',
    success: '#4ECDC4',
    warning: '#FFD93D',
    danger: '#FF6B6B',
    info: '#4A90E2',
    purple: '#9B59B6',
    pink: '#FD79A8',
    dark: '#2D3436',
    light: '#F9F9F9',
    text: '#2D3436',
    textLight: '#636E72',
    border: '#DFE6E9'
  };

  // Helper function to get classification based on score (out of 500)
  const getClassification = (score) => {
    if (score >= 480) return { 
      name: "Elite Talent", 
      color: colors.success,
      gradient: 'linear-gradient(135deg, #00B894, #00CEC9)',
      icon: '🏆'
    };
    if (score >= 450) return { 
      name: "Top Talent", 
      color: colors.info,
      gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
      icon: '⭐'
    };
    if (score >= 400) return { 
      name: "High Potential", 
      color: colors.warning,
      gradient: 'linear-gradient(135deg, #FDCB6E, #FFEAA7)',
      icon: '📈'
    };
    if (score >= 350) return { 
      name: "Solid Performer", 
      color: colors.secondary,
      gradient: 'linear-gradient(135deg, #00CEC9, #81ECEC)',
      icon: '💪'
    };
    if (score >= 300) return { 
      name: "Developing Talent", 
      color: colors.purple,
      gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
      icon: '🌱'
    };
    if (score >= 250) return { 
      name: "Emerging Talent", 
      color: colors.pink,
      gradient: 'linear-gradient(135deg, #E84342, #FF7675)',
      icon: '🔰'
    };
    return { 
      name: "Needs Improvement", 
      color: colors.danger,
      gradient: 'linear-gradient(135deg, #D63031, #FF7675)',
      icon: '⚠️'
    };
  };

  // Get grade from percentage
  const getGradeInfo = (percentage) => {
    if (percentage >= 90) return { grade: "A+", color: colors.success, label: "Exceptional" };
    if (percentage >= 85) return { grade: "A", color: colors.success, label: "Outstanding" };
    if (percentage >= 80) return { grade: "A-", color: colors.success, label: "Excellent" };
    if (percentage >= 75) return { grade: "B+", color: colors.info, label: "Very Good" };
    if (percentage >= 70) return { grade: "B", color: colors.info, label: "Good" };
    if (percentage >= 65) return { grade: "B-", color: colors.info, label: "Above Average" };
    if (percentage >= 60) return { grade: "C+", color: colors.warning, label: "Satisfactory" };
    if (percentage >= 55) return { grade: "C", color: colors.warning, label: "Adequate" };
    if (percentage >= 50) return { grade: "C-", color: colors.warning, label: "Developing" };
    if (percentage >= 45) return { grade: "D+", color: colors.danger, label: "Below Average" };
    if (percentage >= 40) return { grade: "D", color: colors.danger, label: "Poor" };
    return { grade: "F", color: colors.danger, label: "Unsatisfactory" };
  };

  // Fetch candidate data and responses
  useEffect(() => {
    if (!user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        // 1. Get candidate summary from candidate_assessments
        const { data: candidateData, error: candidateError } = await supabase
          .from("candidate_assessments")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (candidateError) throw candidateError;
        
        if (!candidateData) {
          setError("Candidate not found");
          setLoading(false);
          return;
        }
        
        setCandidate(candidateData);
        
        // 2. Fetch all responses with question and answer details
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(`
            id,
            question_id,
            answer_id,
            assessment_id,
            created_at
          `)
          .eq("user_id", user_id);

        if (responsesError) throw responsesError;
        
        if (!responsesData || responsesData.length === 0) {
          setError("No response data found for this candidate");
          setLoading(false);
          return;
        }

        // 3. Get unique question and answer IDs
        const questionIds = [...new Set(responsesData.map(r => r.question_id))];
        const answerIds = [...new Set(responsesData.map(r => r.answer_id))];

        // 4. Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("id, question_text, section, subsection")
          .in("id", questionIds);

        if (questionsError) throw questionsError;

        // 5. Fetch answers
        const { data: answersData, error: answersError } = await supabase
          .from("answers")
          .select("id, answer_text, score")
          .in("id", answerIds);

        if (answersError) throw answersError;

        // 6. Create lookup maps
        const questionsMap = {};
        questionsData.forEach(q => {
          questionsMap[q.id] = q;
        });

        const answersMap = {};
        answersData.forEach(a => {
          answersMap[a.id] = a;
        });

        // 7. Enrich responses with question and answer details
        const enrichedResponses = responsesData.map(response => ({
          ...response,
          question: questionsMap[response.question_id] || null,
          answer: answersMap[response.answer_id] || null
        })).filter(r => r.question && r.answer); // Only keep responses with valid question/answer

        setResponses(enrichedResponses);

        // 8. Calculate category scores
        const categoryTotals = {};
        const categoryCounts = {};
        
        enrichedResponses.forEach(response => {
          const section = response.question.section;
          const score = response.answer.score;
          
          if (!categoryTotals[section]) {
            categoryTotals[section] = 0;
            categoryCounts[section] = 0;
          }
          
          categoryTotals[section] += score;
          categoryCounts[section] += 1;
        });

        // Calculate percentages and create category scores
        const calculatedScores = {};
        let totalScore = 0;
        
        Object.keys(categoryTotals).forEach(section => {
          const total = categoryTotals[section];
          const count = categoryCounts[section];
          const maxPossible = count * 5;
          const percentage = Math.round((total / maxPossible) * 100);
          const gradeInfo = getGradeInfo(percentage);
          
          // Find matching assessment type
          const assessmentType = assessmentTypes.find(t => 
            section.includes(t.name) || t.name.includes(section)
          ) || assessmentTypes[0];
          
          calculatedScores[section] = {
            score: total,
            maxPossible,
            percentage,
            count,
            average: (total / count).toFixed(1),
            grade: gradeInfo.grade,
            gradeLabel: gradeInfo.label,
            gradeColor: gradeInfo.color,
            color: assessmentType.color,
            gradient: assessmentType.gradient,
            lightBg: assessmentType.lightBg,
            icon: assessmentType.icon,
            description: assessmentType.description
          };
          
          totalScore += total;
        });

        setCategoryScores(calculatedScores);

        // 9. Generate answer details for each category
        const details = {};
        enrichedResponses.forEach(response => {
          const section = response.question.section;
          
          if (!details[section]) {
            details[section] = [];
          }
          
          details[section].push({
            question: response.question.question_text,
            answer: response.answer.answer_text,
            score: response.answer.score,
            maxScore: 5,
            subsection: response.question.subsection
          });
        });
        
        setAnswerDetails(details);

        // 10. Analyze strengths and weaknesses
        const strong = [];
        const weak = [];

        Object.entries(calculatedScores).forEach(([section, data]) => {
          const assessmentType = assessmentTypes.find(t => 
            section.includes(t.name) || t.name.includes(section)
          ) || assessmentTypes[0];
          
          if (data.percentage >= 70) {
            strong.push({
              category: section,
              percentage: data.percentage,
              grade: data.grade,
              gradeLabel: data.gradeLabel,
              color: assessmentType.color,
              icon: assessmentType.icon,
              insights: generateInsightsForSection(section, details[section], 'strength')
            });
          } else if (data.percentage < 60) {
            weak.push({
              category: section,
              percentage: data.percentage,
              grade: data.grade,
              gradeLabel: data.gradeLabel,
              color: assessmentType.color,
              icon: assessmentType.icon,
              insights: generateInsightsForSection(section, details[section], 'weakness')
            });
          }
        });

        setStrengths(strong.sort((a, b) => b.percentage - a.percentage));
        setWeaknesses(weak.sort((a, b) => a.percentage - b.percentage));

        // 11. Generate recommendations
        const recs = generateRecommendations(weak, strong, candidateData.total_score);
        setRecommendations(recs);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [user_id]);

  // Generate insights for a section based on actual answers
  const generateInsightsForSection = (section, answers, type) => {
    const insights = [];
    
    if (type === 'strength') {
      // Find high-scoring answers (4-5)
      const highScores = answers.filter(a => a.score >= 4).slice(0, 3);
      highScores.forEach(a => {
        insights.push(`Strong performance in ${a.subsection || section}: Selected "${a.answer}" (Score: ${a.score}/5)`);
      });
    } else {
      // Find low-scoring answers (1-2)
      const lowScores = answers.filter(a => a.score <= 2).slice(0, 3);
      lowScores.forEach(a => {
        insights.push(`Development area in ${a.subsection || section}: Selected "${a.answer}" (Score: ${a.score}/5)`);
      });
    }
    
    return insights;
  };

  // Generate personalized recommendations
  const generateRecommendations = (weaknesses, strengths, totalScore) => {
    const recommendations = [];
    const classification = getClassification(totalScore);
    
    // Overall recommendation
    recommendations.push({
      type: "overall",
      title: "Overall Development Strategy",
      description: `Based on the candidate's actual response patterns and ${classification.name} classification, focus on building strengths while addressing specific gaps shown in their answers.`,
      action: totalScore >= 450 
        ? "Fast-track for leadership program; leverage demonstrated strong answers in key areas"
        : "Create personalized development plan targeting specific weak answers",
      priority: "High",
      icon: "🎯",
      color: classification.color
    });
    
    // Category-specific recommendations based on actual weak answers
    weaknesses.forEach(weakness => {
      if (weakness.insights && weakness.insights.length > 0) {
        recommendations.push({
          type: "category",
          category: weakness.category,
          description: `Based on response analysis: ${weakness.insights[0]}`,
          action: `Focus on improving understanding in ${weakness.category.toLowerCase()} through targeted training and practice`,
          priority: weakness.percentage < 50 ? "High" : "Medium",
          icon: weakness.icon,
          color: weakness.color,
          percentage: weakness.percentage,
          grade: weakness.grade
        });
      }
    });
    
    return recommendations;
  };

  const handleBack = () => {
    router.push("/supervisor");
  };

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '50px',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 30px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{ color: '#2d3748' }}>Loading Candidate Responses</h3>
            <p style={{ color: '#718096' }}>Analyzing individual answers...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !candidate) {
    return (
      <AppLayout>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '50px',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>😕</div>
            <h2 style={{ color: '#2d3748', marginBottom: '15px' }}>Error Loading Data</h2>
            <p style={{ color: '#718096', marginBottom: '30px' }}>{error || "Candidate not found"}</p>
            <button
              onClick={handleBack}
              style={{
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalScore = candidate.total_score;
  const classification = getClassification(totalScore);
  const overallPercentage = Math.round((totalScore / 500) * 100);

  return (
    <AppLayout>
      {/* Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        zIndex: 0
      }} />

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: "30px 20px",
        minHeight: "100vh"
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: 'blur(10px)',
            borderRadius: "20px",
            padding: "20px 30px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <button
              onClick={handleBack}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "50px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              ← Back to Dashboard
            </button>
            <div style={{ 
              display: 'flex', 
              gap: '15px',
              padding: '8px 20px',
              background: '#f7fafc',
              borderRadius: '50px'
            }}>
              <span>📅 {new Date().toLocaleDateString()}</span>
              <span>🕐 {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: 'blur(10px)',
            borderRadius: "60px",
            padding: "8px",
            marginBottom: "30px",
            display: "inline-flex"
          }}>
            {['overview', 'answers', 'analysis', 'recommendations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 30px",
                  background: activeTab === tab ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                  color: activeTab === tab ? 'white' : '#4a5568',
                  border: 'none',
                  borderRadius: "50px",
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'overview' && '📊 '}
                {tab === 'answers' && '📝 '}
                {tab === 'analysis' && '📈 '}
                {tab === 'recommendations' && '💡 '}
                {tab}
              </button>
            ))}
          </div>

          {/* Candidate Profile Card */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "30px",
            padding: "40px",
            marginBottom: "30px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "30px", marginBottom: "30px" }}>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "30px",
                background: classification.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "48px",
                color: "white"
              }}>
                {candidate.full_name?.charAt(0) || "C"}
              </div>
              <div>
                <h1 style={{ margin: "0 0 10px 0", fontSize: "36px", color: "#2d3748" }}>
                  {candidate.full_name || "Candidate"}
                </h1>
                <p style={{ margin: 0, color: "#718096", fontSize: "18px" }}>
                  📧 {candidate.email || "No email"} • 🆔 {user_id?.substring(0, 8)}...
                </p>
                <p style={{ margin: "10px 0 0 0", color: "#718096", fontSize: "14px" }}>
                  📝 {responses.length} questions answered • {Object.keys(categoryScores).length} categories analyzed
                </p>
              </div>
            </div>

            {/* Score Summary */}
            <div style={{
              background: classification.gradient,
              borderRadius: "20px",
              padding: "30px",
              color: "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "10px" }}>
                    {classification.icon} Overall Assessment Score
                  </div>
                  <div style={{ fontSize: "64px", fontWeight: "800", marginBottom: "10px", lineHeight: 1 }}>
                    {totalScore}
                    <span style={{ fontSize: "24px", opacity: 0.7, marginLeft: "10px" }}>/500</span>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "10px" }}>
                    {classification.name}
                  </div>
                  <div style={{ fontSize: "16px", opacity: 0.9 }}>
                    {overallPercentage}% Overall • Based on actual responses
                  </div>
                </div>
                <div style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "48px",
                  fontWeight: "700",
                  border: "5px solid rgba(255,255,255,0.3)"
                }}>
                  {overallPercentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "40px"
            }}>
              <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748" }}>
                📊 Category Performance (Based on Actual Answers)
              </h2>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "25px"
              }}>
                {Object.entries(categoryScores).map(([category, data]) => (
                  <div key={category} style={{
                    background: data.lightBg,
                    borderRadius: "20px",
                    padding: "25px",
                    border: `2px solid ${data.color}30`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '15px',
                        background: data.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        {data.icon}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#2d3748' }}>{category}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>{data.description}</p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#4a5568', fontWeight: '600' }}>
                          Score: {data.score}/{data.maxPossible}
                        </span>
                        <span style={{ color: data.gradeColor, fontWeight: '700' }}>
                          {data.grade} • {data.percentage}%
                        </span>
                      </div>
                      <div style={{
                        height: '12px',
                        background: '#e2e8f0',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${data.percentage}%`,
                          background: data.gradient,
                          borderRadius: '6px'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#718096',
                      marginBottom: '15px',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      {data.count} questions • Average: {data.average}/5 per question
                    </div>
                    
                    {answerDetails[category] && (
                      <div style={{
                        padding: '15px',
                        background: 'white',
                        borderRadius: '12px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '10px' }}>
                          Sample Answers:
                        </div>
                        {answerDetails[category].slice(0, 2).map((ans, i) => (
                          <div key={i} style={{
                            fontSize: '12px',
                            color: '#4a5568',
                            marginBottom: '8px',
                            padding: '8px',
                            background: '#f7fafc',
                            borderRadius: '6px'
                          }}>
                            <strong>Q:</strong> {ans.question.substring(0, 50)}...<br />
                            <strong>A:</strong> {ans.answer} (Score: {ans.score}/5)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answers Tab - Shows all individual responses */}
          {activeTab === 'answers' && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "40px"
            }}>
              <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748" }}>
                📝 Detailed Answer Analysis
              </h2>
              
              {Object.entries(answerDetails).map(([category, answers]) => (
                <div key={category} style={{ marginBottom: '40px' }}>
                  <h3 style={{ 
                    fontSize: '22px', 
                    color: categoryScores[category]?.color || '#2d3748',
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: `2px solid ${categoryScores[category]?.color || '#e2e8f0'}`
                  }}>
                    {category} ({answers.length} questions)
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {answers.map((ans, index) => (
                      <div key={index} style={{
                        padding: '20px',
                        background: ans.score >= 4 ? '#f0fff4' : ans.score <= 2 ? '#fff5f5' : '#f7fafc',
                        borderRadius: '12px',
                        border: `1px solid ${
                          ans.score >= 4 ? '#9AE6B4' : ans.score <= 2 ? '#FEB2B2' : '#e2e8f0'
                        }`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{
                            padding: '4px 12px',
                            background: ans.score >= 4 ? '#C6F6D5' : ans.score <= 2 ? '#FED7D7' : '#EDF2F7',
                            color: ans.score >= 4 ? '#22543D' : ans.score <= 2 ? '#742A2A' : '#4a5568',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Score: {ans.score}/5
                          </span>
                          {ans.subsection && (
                            <span style={{ color: '#718096', fontSize: '12px' }}>
                              {ans.subsection}
                            </span>
                          )}
                        </div>
                        
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '5px' }}>
                            Question:
                          </div>
                          <div style={{ fontSize: '14px', color: '#4a5568', padding: '10px', background: 'white', borderRadius: '8px' }}>
                            {ans.question}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '5px' }}>
                            Selected Answer:
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: ans.score >= 4 ? '#22543D' : ans.score <= 2 ? '#742A2A' : '#4a5568',
                            padding: '10px',
                            background: 'white',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${
                              ans.score >= 4 ? '#48BB78' : ans.score <= 2 ? '#F56565' : '#A0AEC0'
                            }`
                          }}>
                            {ans.answer}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "40px"
            }}>
              <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748" }}>
                📈 Response Pattern Analysis
              </h2>
              
              {/* Strengths */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ 
                  fontSize: '22px', 
                  color: '#2d3748', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{
                    background: '#4ECDC4',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>✓</span>
                  Key Strengths (Based on Actual Answers)
                </h3>
                
                {strengths.length === 0 ? (
                  <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>
                    No strengths identified (scores below 70% in all categories)
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {strengths.map((strength, index) => (
                      <div key={index} style={{
                        background: '#f0fff4',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '2px solid #9AE6B4'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{strength.icon}</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#22543D' }}>{strength.category}</h4>
                            <span style={{
                              padding: '4px 12px',
                              background: '#C6F6D5',
                              color: '#22543D',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {strength.grade} • {strength.percentage}%
                            </span>
                          </div>
                        </div>
                        
                        {strength.insights.map((insight, i) => (
                          <div key={i} style={{
                            fontSize: '13px',
                            color: '#2F855A',
                            marginTop: i === 0 ? 0 : '10px',
                            padding: '8px',
                            background: 'white',
                            borderRadius: '8px'
                          }}>
                            {insight}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weaknesses */}
              <div>
                <h3 style={{ 
                  fontSize: '22px', 
                  color: '#2d3748', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{
                    background: '#FF6B6B',
                    color: 'white',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>!</span>
                  Development Areas (Based on Actual Answers)
                </h3>
                
                {weaknesses.length === 0 ? (
                  <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>
                    No significant development areas identified (all scores above 60%)
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {weaknesses.map((weakness, index) => (
                      <div key={index} style={{
                        background: '#FFF5F5',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '2px solid #FEB2B2'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{weakness.icon}</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#742A2A' }}>{weakness.category}</h4>
                            <span style={{
                              padding: '4px 12px',
                              background: '#FED7D7',
                              color: '#742A2A',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {weakness.grade} • {weakness.percentage}%
                            </span>
                          </div>
                        </div>
                        
                        {weakness.insights.map((insight, i) => (
                          <div key={i} style={{
                            fontSize: '13px',
                            color: '#9B2C2C',
                            marginTop: i === 0 ? 0 : '10px',
                            padding: '8px',
                            background: 'white',
                            borderRadius: '8px'
                          }}>
                            {insight}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "40px"
            }}>
              <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748" }}>
                💡 Personalized Recommendations
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {recommendations.map((rec, index) => (
                  <div key={index} style={{
                    padding: '25px',
                    background: rec.type === 'overall' ? '#EBF8FF' : '#FFF5F5',
                    borderRadius: '20px',
                    border: `2px solid ${rec.color}40`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '15px',
                        background: rec.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: 'white'
                      }}>
                        {rec.icon}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#2d3748' }}>
                          {rec.title || rec.category}
                        </h3>
                        {rec.percentage && (
                          <span style={{
                            padding: '4px 12px',
                            background: '#EDF2F7',
                            borderRadius: '20px',
                            fontSize: '12px',
                            color: '#4a5568'
                          }}>
                            Current: {rec.grade} • {rec.percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '15px', color: '#4a5568', lineHeight: 1.6, marginBottom: '15px' }}>
                      {rec.description}
                    </p>

                    <div style={{
                      padding: '15px',
                      background: 'white',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${rec.color}`
                    }}>
                      <strong style={{ color: rec.color }}>Action Plan:</strong>
                      <span style={{ color: '#4a5568', marginLeft: '10px' }}>{rec.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </AppLayout>
  );
}
