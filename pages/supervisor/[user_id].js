// pages/supervisor/[user_id].js - COMPLETE WORKING VERSION
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [userInfo, setUserInfo] = useState({ email: "", full_name: "" });
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Check supervisor authentication
  useEffect(() => {
    const checkSupervisorAuth = () => {
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

    checkSupervisorAuth();
  }, [router]);

  // Fetch candidate data - WORKING VERSION
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);

        // 1. Get candidate info from talent_classification first
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (classificationError) {
          console.error("Error fetching classification:", classificationError);
          setCandidate(null);
        } else {
          setCandidate(classificationData);
        }

        // 2. Get user info via API
        try {
          const response = await fetch('/api/admin/get-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: [user_id] })
          });

          if (response.ok) {
            const { users } = await response.json();
            if (users.length > 0) {
              setUserInfo({
                email: users[0].email,
                full_name: users[0].full_name
              });
            }
          }
        } catch (apiError) {
          console.error('Failed to fetch user info:', apiError);
        }

        // 3. Get candidate's responses - SIMPLIFIED AND WORKING
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(`
            id,
            question_id,
            answer_id,
            user_id,
            assessment_id,
            created_at
          `)
          .eq("user_id", user_id)
          .eq("assessment_id", '11111111-1111-1111-1111-111111111111');

        if (responsesError) {
          console.error("Error fetching responses:", responsesError);
          setResponses([]);
        } else if (responsesData && responsesData.length > 0) {
          console.log("Found responses:", responsesData.length);
          
          // Get detailed question and answer data
          const questionIds = [...new Set(responsesData.map(r => r.question_id))];
          const answerIds = [...new Set(responsesData.map(r => r.answer_id))];

          // Get questions
          const { data: questionsData } = await supabase
            .from("questions")
            .select("id, question_text, section, subsection")
            .in("id", questionIds);

          // Get answers with scores
          const { data: answersData } = await supabase
            .from("answers")
            .select("id, answer_text, score, interpretation, trait_category, strength_level")
            .in("id", answerIds);

          // Create maps for quick lookup
          const questionsMap = {};
          questionsData?.forEach(q => {
            questionsMap[q.id] = q;
          });

          const answersMap = {};
          answersData?.forEach(a => {
            answersMap[a.id] = a;
          });

          // Combine the data
          const detailedResponses = responsesData.map(response => {
            const question = questionsMap[response.question_id];
            const answer = answersMap[response.answer_id];
            
            return {
              ...response,
              questions: question || { 
                question_text: `Question ${response.question_id}`, 
                section: "Unknown", 
                subsection: "" 
              },
              answers: answer || { 
                answer_text: "Answer not available", 
                score: 0, 
                interpretation: "No interpretation available" 
              }
            };
          });

          setResponses(detailedResponses);

          // 4. Calculate category scores
          const categoryTotals = {};
          const categoryCounts = {};
          const categoryMaxScores = {};
          
          detailedResponses.forEach(response => {
            const section = response.questions?.section;
            const score = response.answers?.score || 0;
            
            if (section) {
              categoryTotals[section] = (categoryTotals[section] || 0) + score;
              categoryCounts[section] = (categoryCounts[section] || 0) + 1;
              // Max score per question is 5
              categoryMaxScores[section] = (categoryMaxScores[section] || 0) + 5;
            }
          });

          const calculatedCategoryScores = {};
          Object.keys(categoryTotals).forEach(section => {
            const total = categoryTotals[section];
            const count = categoryCounts[section];
            const maxPossible = categoryMaxScores[section];
            const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
            
            calculatedCategoryScores[section] = {
              total,
              average: count > 0 ? (total / count).toFixed(1) : 0,
              count,
              percentage,
              maxPossible
            };
          });

          setCategoryScores(calculatedCategoryScores);

          // 5. Identify strengths and weaknesses
          const candidateStrengths = [];
          const candidateWeaknesses = [];
          
          detailedResponses.forEach(response => {
            const answer = response.answers;
            const question = response.questions;
            const score = answer?.score;
            
            if (score !== undefined && question) {
              // Strength: score >= 4 (out of 5)
              if (score >= 4) {
                candidateStrengths.push({
                  category: question.section,
                  subcategory: question.subsection,
                  trait: answer.trait_category || question.section,
                  interpretation: answer.interpretation || `Strong performance (score: ${score}/5)`,
                  strength: answer.strength_level || "High",
                  score: score,
                  question: question.question_text.substring(0, 100) + (question.question_text.length > 100 ? "..." : "")
                });
              }
              
              // Weakness: score <= 2 (out of 5)
              if (score <= 2) {
                candidateWeaknesses.push({
                  category: question.section,
                  subcategory: question.subsection,
                  trait: answer.trait_category || question.section,
                  interpretation: answer.interpretation || `Needs improvement (score: ${score}/5)`,
                  score: score,
                  question: question.question_text.substring(0, 100) + (question.question_text.length > 100 ? "..." : "")
                });
              }
            }
          });

          // 6. Generate recommendations based on weaknesses
          const candidateRecommendations = [];
          
          // Group weaknesses by category for better recommendations
          const weaknessesByCategory = {};
          candidateWeaknesses.forEach(weakness => {
            if (!weaknessesByCategory[weakness.category]) {
              weaknessesByCategory[weakness.category] = [];
            }
            weaknessesByCategory[weakness.category].push(weakness);
          });

          // Create recommendations for categories with weaknesses
          Object.entries(weaknessesByCategory).forEach(([category, categoryWeaknesses]) => {
            const weakCount = categoryWeaknesses.length;
            let recommendation = "";
            
            switch(category) {
              case 'Cognitive Abilities':
                recommendation = `Based on ${weakCount} areas needing improvement, recommend: 1) Cognitive training exercises, 2) Problem-solving workshops, 3) Analytical thinking development programs.`;
                break;
              case 'Personality Assessment':
                recommendation = `Address ${weakCount} areas with: 1) Personality development sessions, 2) Emotional intelligence training, 3) Interpersonal skills workshops.`;
                break;
              case 'Leadership Potential':
                recommendation = `Improve ${weakCount} leadership areas through: 1) Leadership workshops, 2) Mentorship programs, 3) Team management training.`;
                break;
              case 'Bottled Water Manufacturing':
                recommendation = `Enhance ${weakCount} technical areas with: 1) Technical training sessions, 2) Industry-specific workshops, 3) Hands-on practice.`;
                break;
              case 'Performance Metrics':
                recommendation = `Strengthen ${weakCount} performance areas via: 1) Goal-setting strategies, 2) Performance tracking improvement, 3) Productivity techniques.`;
                break;
              default:
                recommendation = `Focus on ${weakCount} areas with targeted training and practical exercises.`;
            }
            
            candidateRecommendations.push({
              category,
              subcategory: categoryWeaknesses[0]?.subcategory || "General",
              issue: `${weakCount} area${weakCount > 1 ? 's' : ''} need${weakCount > 1 ? '' : 's'} improvement in ${category}`,
              recommendation,
              priority: weakCount > 3 ? "High" : weakCount > 1 ? "Medium" : "Low"
            });
          });

          // If no weaknesses but candidate exists, add general recommendation
          if (candidateWeaknesses.length === 0 && candidateStrengths.length > 0) {
            candidateRecommendations.push({
              category: "Overall Performance",
              subcategory: "Development",
              issue: "Strong performance across all categories",
              recommendation: "Continue current development path. Consider advanced training or leadership roles to further develop strengths.",
              priority: "Informational"
            });
          }

          setStrengths(candidateStrengths);
          setWeaknesses(candidateWeaknesses);
          setRecommendations(candidateRecommendations);

        } else {
          console.log("No responses found for this candidate");
          setResponses([]);
        }

      } catch (err) {
        console.error("Error in fetchCandidateData:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  const getScoreColor = (score) => {
    if (score >= 4) return "#4CAF50";
    if (score >= 3) return "#FF9800";
    return "#F44336";
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Cognitive Abilities': '#4A6FA5',
      'Personality Assessment': '#9C27B0',
      'Leadership Potential': '#D32F2F',
      'Bottled Water Manufacturing': '#388E3C',
      'Performance Metrics': '#F57C00'
    };
    return colors[category] || '#666';
  };

  // Calculate grade based on score
  const calculateGrade = (score) => {
    if (score >= 450) return 'A+';
    if (score >= 400) return 'A';
    if (score >= 350) return 'B';
    if (score >= 300) return 'C';
    if (score >= 250) return 'D';
    return 'E';
  };

  if (!isSupervisor) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <p style={{ textAlign: "center" }}>Checking authentication...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "400px" 
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ 
              width: "50px", 
              height: "50px", 
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #1565c0",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }} />
            <p style={{ color: "#666" }}>Loading candidate report...</p>
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

  if (!candidate) {
    return (
      <AppLayout background="/images/supervisor-bg.jpg">
        <div style={{ 
          width: "90vw", 
          margin: "auto", 
          padding: "40px 20px",
          textAlign: "center" 
        }}>
          <h1 style={{ color: "#666", marginBottom: "20px" }}>Candidate Not Found</h1>
          <p style={{ color: "#888", marginBottom: "30px" }}>
            No assessment data found for this candidate. They may not have completed the assessment.
          </p>
          <button
            onClick={handleBack}
            style={{
              padding: "12px 24px",
              background: "#1565c0",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            marginBottom: "20px" 
          }}>
            <div>
              <button
                onClick={handleBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1565c0",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "0",
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                ← Back to Dashboard
              </button>
              <h1 style={{ 
                margin: "0 0 10px 0", 
                color: "#333",
                fontSize: "28px"
              }}>
                Candidate Performance Report
              </h1>
              <div style={{ 
                margin: "0", 
                color: "#666",
                fontSize: "16px"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "5px" }}>
                  {userInfo.full_name || "Candidate"}
                </div>
                <div style={{ color: "#1565c0" }}>
                  {userInfo.email || "No email available"}
                </div>
              </div>
            </div>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px 20px", 
              borderRadius: "10px",
              minWidth: "200px",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ 
                fontSize: "14px", 
                color: "#666", 
                marginBottom: "5px" 
              }}>
                Overall Classification
              </div>
              <div style={{ 
                fontSize: "20px", 
                fontWeight: "700",
                color: candidate.classification === 'Top Talent' ? "#4CAF50" :
                       candidate.classification === 'High Potential' ? "#2196F3" :
                       candidate.classification === 'Solid Performer' ? "#FF9800" :
                       candidate.classification === 'Developing' ? "#9C27B0" : "#F44336"
              }}>
                {candidate.classification}
              </div>
            </div>
          </div>

          {/* Overall Score Card */}
          <div style={{
            background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
            color: "white",
            padding: "25px",
            borderRadius: "12px",
            marginBottom: "30px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>Overall Assessment Score</div>
                <div style={{ fontSize: "48px", fontWeight: "700", margin: "10px 0" }}>
                  {candidate.total_score}
                </div>
                <div style={{ fontSize: "14px", opacity: 0.9 }}>
                  Based on {responses.length} responses across {Object.keys(categoryScores).length} categories
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "5px solid rgba(255,255,255,0.2)"
                }}>
                  <div style={{ fontSize: "32px", fontWeight: "700" }}>
                    {calculateGrade(candidate.total_score)}
                  </div>
                </div>
                <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.8 }}>
                  Performance Grade
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Scores */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Performance by Category</h2>
          {Object.keys(categoryScores).length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <p>No category scores available. The candidate may not have completed all sections.</p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
              gap: "20px" 
            }}>
              {Object.entries(categoryScores).map(([category, data]) => (
                <div key={category} style={{
                  borderLeft: `4px solid ${getCategoryColor(category)}`,
                  padding: "20px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "15px"
                  }}>
                    <div>
                      <h3 style={{ 
                        margin: "0 0 5px 0", 
                        color: getCategoryColor(category),
                        fontSize: "18px"
                      }}>
                        {category}
                      </h3>
                      <p style={{ 
                        margin: 0, 
                        fontSize: "14px", 
                        color: "#666" 
                      }}>
                        {data.count} questions • Average: {data.average}/5
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ 
                        fontSize: "28px", 
                        fontWeight: "700",
                        color: getCategoryColor(category)
                      }}>
                        {data.percentage}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        of max
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    height: "10px", 
                    background: "#e0e0e0", 
                    borderRadius: "5px",
                    overflow: "hidden",
                    marginBottom: "8px"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${data.percentage}%`, 
                      background: getCategoryColor(category),
                      borderRadius: "5px"
                    }} />
                  </div>
                  
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    fontSize: "12px", 
                    color: "#666",
                    marginTop: "10px"
                  }}>
                    <div>
                      <div style={{ fontWeight: "600" }}>Total Score</div>
                      <div>{data.total}/{data.maxPossible}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "600" }}>Average</div>
                      <div>{data.average}/5</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "600" }}>Completion</div>
                      <div>{data.percentage}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strengths and Weaknesses */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "30px",
          marginBottom: "30px"
        }}>
          {/* Strengths */}
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ 
                width: "30px", 
                height: "30px", 
                background: "#4CAF50",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                ✓
              </span>
              Key Strengths ({strengths.length})
            </h2>
            
            {strengths.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "30px",
                color: "#888",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "15px" }}>🏆</div>
                <p>No specific strengths identified. Review responses for detailed analysis.</p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "10px"
              }}>
                {strengths.slice(0, 10).map((strength, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "rgba(76, 175, 80, 0.1)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #4CAF50"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600",
                        color: "#2e7d32"
                      }}>
                        {strength.trait}
                      </div>
                      <div style={{ 
                        padding: "3px 8px",
                        background: "#4CAF50",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {strength.score}/5
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#333",
                      marginBottom: "8px",
                      lineHeight: 1.4
                    }}>
                      {strength.interpretation}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span><strong>Category:</strong> {strength.category}</span>
                      <span><strong>Level:</strong> {strength.strength}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weaknesses */}
          <div style={{ 
            background: "white", 
            padding: "25px", 
            borderRadius: "12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
          }}>
            <h2 style={{ 
              margin: "0 0 20px 0", 
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <span style={{ 
                width: "30px", 
                height: "30px", 
                background: "#F44336",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "16px"
              }}>
                !
              </span>
              Areas for Improvement ({weaknesses.length})
            </h2>
            
            {weaknesses.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "30px",
                color: "#888",
                background: "#f8f9fa",
                borderRadius: "8px"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "15px" }}>✅</div>
                <p>No significant weaknesses identified. Candidate shows balanced performance.</p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "10px"
              }}>
                {weaknesses.slice(0, 10).map((weakness, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "rgba(244, 67, 54, 0.1)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #F44336"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600",
                        color: "#c62828"
                      }}>
                        {weakness.trait}
                      </div>
                      <div style={{ 
                        padding: "3px 8px",
                        background: "#F44336",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {weakness.score}/5
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#333",
                      marginBottom: "8px",
                      lineHeight: 1.4
                    }}>
                      {weakness.interpretation}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span><strong>Category:</strong> {weakness.category}</span>
                      <span><strong>Subcategory:</strong> {weakness.subcategory}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ 
            margin: "0 0 20px 0", 
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{ 
              width: "30px", 
              height: "30px", 
              background: "#FF9800",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "16px"
            }}>
              💡
            </span>
            Development Recommendations
          </h2>
          
          {recommendations.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "30px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📈</div>
              <p>No specific recommendations available. Candidate shows strong overall performance.</p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
              gap: "20px" 
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: "#fff3e0",
                  borderRadius: "8px",
                  border: "1px solid #ffe0b2",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "15px"
                  }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: getCategoryColor(rec.category),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      {rec.category.charAt(0)}
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        {rec.category}
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666"
                      }}>
                        {rec.subcategory} • Priority: <span style={{ 
                          color: rec.priority === "High" ? "#F44336" : 
                                 rec.priority === "Medium" ? "#FF9800" : "#4CAF50",
                          fontWeight: "600"
                        }}>
                          {rec.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      Issue:
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      padding: "8px",
                      background: "white",
                      borderRadius: "6px"
                    }}>
                      {rec.issue}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: "500",
                      color: "#666",
                      marginBottom: "5px"
                    }}>
                      Recommendation:
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      lineHeight: 1.5,
                      padding: "8px",
                      background: "rgba(255,255,255,0.7)",
                      borderRadius: "6px"
                    }}>
                      {rec.recommendation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Response Details */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "20px" 
          }}>
            <h2 style={{ margin: 0, color: "#333" }}>
              Detailed Responses ({responses.length})
            </h2>
            <div style={{ fontSize: "14px", color: "#666" }}>
              {responses.length > 0 ? "Scroll to view all responses" : "No responses available"}
            </div>
          </div>
          
          {responses.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📝</div>
              <p>No response data available for this candidate.</p>
              <p style={{ fontSize: "14px", marginTop: "10px" }}>
                This could mean the candidate hasn't completed the assessment or there's an issue with the data.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gap: "15px",
              maxHeight: "500px",
              overflowY: "auto",
              paddingRight: "10px"
            }}>
              {responses.map((response, index) => (
                <div key={response.id || index} style={{
                  padding: "20px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${getScoreColor(response.answers?.score || 0)}`
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "10px"
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "5px"
                      }}>
                        Q{index + 1}: {response.questions?.question_text}
                      </div>
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#666",
                        marginBottom: "10px"
                      }}>
                        <span style={{ 
                          padding: "2px 8px",
                          background: getCategoryColor(response.questions?.section),
                          color: "white",
                          borderRadius: "4px",
                          marginRight: "8px"
                        }}>
                          {response.questions?.section}
                        </span>
                        {response.questions?.subsection && (
