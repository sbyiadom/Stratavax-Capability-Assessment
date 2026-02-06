// pages/supervisor/[user_id].js - FINAL CORRECTED VERSION
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
  const [responses, setResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [strengths, setStrengths] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

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

  // Fetch candidate data - FINAL CORRECTED VERSION
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);

        // 1. Get candidate info from users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (userError) {
          console.error("Error fetching user:", userError);
          setUserEmail("Unknown Candidate");
          setUserName("Unknown Candidate");
        } else {
          setUserEmail(userData?.email || "Unknown Candidate");
          setUserName(userData?.full_name || "Unknown Candidate");
        }

        // 2. Get candidate classification data
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

        // 3. Get basic response count
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select("question_id, answer_id")
          .eq("user_id", user_id)
          .eq("assessment_id", '11111111-1111-1111-1111-111111111111');

        if (responsesError) {
          console.error("Error fetching responses:", responsesError);
          setResponses([]);
        } else {
          setResponses(responsesData || []);
        }

        // 4. Calculate category scores using RPC function
        await calculateCategoryScores(user_id);

      } catch (err) {
        console.error("Error fetching candidate data:", err);
      } finally {
        setLoading(false);
      }
    };

    // Function to calculate category scores - CORRECTED FOR RPC
    const calculateCategoryScores = async (userId) => {
      try {
        // Call the RPC function that we know works
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_candidate_category_scores', { candidate_uuid: userId });
        
        if (rpcError) {
          console.error("RPC function error:", rpcError);
          // Fall back to manual calculation
          await calculateManually(userId);
          return;
        }
        
        console.log("RPC result received:", rpcResult);
        
        if (rpcResult && typeof rpcResult === 'object') {
          // Process the RPC result - it's the JSON object we saw in the test
          const categoryData = rpcResult;
          const calculatedCategoryScores = {};
          const candidateStrengths = [];
          const candidateWeaknesses = [];
          
          // Convert the RPC result to our format
          Object.entries(categoryData).forEach(([section, data]) => {
            calculatedCategoryScores[section] = {
              total: data.total_score,
              average: data.average_score,
              count: data.questions_answered,
              percentage: data.percentage,
              maxPossible: data.questions_answered * 5
            };
            
            // Identify strengths and weaknesses based on category percentage
            if (data.percentage >= 70) {
              candidateStrengths.push({
                category: section,
                score: data.percentage,
                interpretation: `Strong performance in ${section} with ${data.percentage}% score`
              });
            } else if (data.percentage <= 50) {
              candidateWeaknesses.push({
                category: section,
                score: data.percentage,
                interpretation: `Needs improvement in ${section} with ${data.percentage}% score`
              });
            }
          });
          
          setCategoryScores(calculatedCategoryScores);
          
          // Generate recommendations based on weaknesses
          const candidateRecommendations = candidateWeaknesses.map(weakness => {
            let recommendation = "";
            
            switch(weakness.category) {
              case 'Cognitive Abilities':
                recommendation = "Consider cognitive training exercises and problem-solving workshops to enhance analytical thinking.";
                break;
              case 'Personality Assessment':
                recommendation = "Engage in personality development sessions and emotional intelligence training for better interpersonal skills.";
                break;
              case 'Leadership Potential':
                recommendation = "Participate in leadership workshops, mentorship programs, and team management exercises.";
                break;
              case 'Technical Competence':
                recommendation = "Attend technical training, industry-specific workshops, and hands-on practice sessions.";
                break;
              case 'Performance Metrics':
                recommendation = "Focus on goal-setting strategies, performance tracking improvement, and productivity enhancement techniques.";
                break;
              default:
                recommendation = "Consider targeted training and development programs in this specific area.";
            }
            
            return {
              category: weakness.category,
              issue: weakness.interpretation,
              recommendation: recommendation
            };
          });
          
          // Add general recommendation if no weaknesses
          if (candidateWeaknesses.length === 0 && Object.keys(calculatedCategoryScores).length > 0) {
            candidateRecommendations.push({
              category: "Overall Performance",
              issue: "Strong overall performance",
              recommendation: "Continue current development path. Consider advanced training in areas of strength to further enhance expertise."
            });
          }
          
          setStrengths(candidateStrengths);
          setWeaknesses(candidateWeaknesses);
          setRecommendations(candidateRecommendations);
          
          console.log("Category scores set:", Object.keys(calculatedCategoryScores).length, "categories");
          console.log("Strengths:", candidateStrengths.length);
          console.log("Weaknesses:", candidateWeaknesses.length);
          console.log("Recommendations:", candidateRecommendations.length);
        } else {
          console.log("RPC returned no data, falling back to manual calculation");
          await calculateManually(userId);
        }
        
      } catch (error) {
        console.error("Error calculating category scores:", error);
        // Fall back to manual calculation
        await calculateManually(userId);
      }
    };

    // Fallback manual calculation function
    const calculateManually = async (userId) => {
      try {
        console.log("Starting manual calculation...");
        const { data: categoryData, error: categoryError } = await supabase
          .from("responses")
          .select(`
            questions!inner (
              section
            ),
            answers!inner (
              score
            )
          `)
          .eq("user_id", userId)
          .eq("assessment_id", '11111111-1111-1111-1111-111111111111');

        if (categoryError) {
          console.error("Error fetching category data:", categoryError);
          return;
        }

        if (categoryData && categoryData.length > 0) {
          console.log("Manual calculation found", categoryData.length, "responses");
          const categoryTotals = {};
          const categoryCounts = {};
          
          categoryData.forEach(item => {
            const section = item.questions?.section;
            const score = item.answers?.score || 0;
            
            if (section) {
              categoryTotals[section] = (categoryTotals[section] || 0) + score;
              categoryCounts[section] = (categoryCounts[section] || 0) + 1;
            }
          });

          const calculatedCategoryScores = {};
          const candidateStrengths = [];
          const candidateWeaknesses = [];
          
          Object.keys(categoryTotals).forEach(section => {
            const total = categoryTotals[section];
            const count = categoryCounts[section];
            const maxPossible = count * 5;
            const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
            const average = count > 0 ? (total / count).toFixed(1) : 0;
            
            calculatedCategoryScores[section] = {
              total,
              average: parseFloat(average),
              count,
              percentage,
              maxPossible
            };
            
            if (percentage >= 70) {
              candidateStrengths.push({
                category: section,
                score: percentage,
                interpretation: `Strong performance in ${section} with ${percentage}% score`
              });
            } else if (percentage <= 50) {
              candidateWeaknesses.push({
                category: section,
                score: percentage,
                interpretation: `Needs improvement in ${section} with ${percentage}% score`
              });
            }
          });

          setCategoryScores(calculatedCategoryScores);
          
          const candidateRecommendations = candidateWeaknesses.map(weakness => {
            let recommendation = "";
            
            switch(weakness.category) {
              case 'Cognitive Abilities':
                recommendation = "Consider cognitive training exercises and problem-solving workshops to enhance analytical thinking.";
                break;
              case 'Personality Assessment':
                recommendation = "Engage in personality development sessions and emotional intelligence training for better interpersonal skills.";
                break;
              case 'Leadership Potential':
                recommendation = "Participate in leadership workshops, mentorship programs, and team management exercises.";
                break;
              case 'Technical Competence':
                recommendation = "Attend technical training, industry-specific workshops, and hands-on practice sessions.";
                break;
              case 'Performance Metrics':
                recommendation = "Focus on goal-setting strategies, performance tracking improvement, and productivity enhancement techniques.";
                break;
              default:
                recommendation = "Consider targeted training and development programs in this specific area.";
            }
            
            return {
              category: weakness.category,
              issue: weakness.interpretation,
              recommendation: recommendation
            };
          });
          
          if (candidateWeaknesses.length === 0 && Object.keys(calculatedCategoryScores).length > 0) {
            candidateRecommendations.push({
              category: "Overall Performance",
              issue: "Strong overall performance",
              recommendation: "Continue current development path. Consider advanced training in areas of strength to further enhance expertise."
            });
          }

          setStrengths(candidateStrengths);
          setWeaknesses(candidateWeaknesses);
          setRecommendations(candidateRecommendations);
          
          console.log("Manual calculation completed:", Object.keys(calculatedCategoryScores).length, "categories");
        } else {
          console.log("No data found for manual calculation");
        }
      } catch (error) {
        console.error("Manual calculation error:", error);
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
      'Technical Competence': '#388E3C',
      'Performance Metrics': '#F57C00'
    };
    return colors[category] || '#666';
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
            The requested candidate data could not be found. This might be because:
          </p>
          <div style={{
            textAlign: "left",
            maxWidth: "500px",
            margin: "0 auto 30px",
            padding: "20px",
            background: "#f8f9fa",
            borderRadius: "8px"
          }}>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#555" }}>
              <li>The candidate hasn't completed the assessment</li>
              <li>There's an issue with the candidate's data</li>
              <li>The candidate ID is incorrect</li>
            </ul>
          </div>
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
              <p style={{ 
                margin: "0 0 5px 0", 
                color: "#666",
                fontSize: "16px"
              }}>
                {userName}
              </p>
              <p style={{ 
                margin: "0", 
                color: "#888",
                fontSize: "14px"
              }}>
                {userEmail}
              </p>
            </div>
            <div style={{ 
              background: "#f8f9fa", 
              padding: "15px 20px", 
              borderRadius: "10px",
              minWidth: "200px"
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
            marginBottom: "30px"
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
                    {candidate.total_score >= 450 ? 'A+' :
                     candidate.total_score >= 400 ? 'A' :
                     candidate.total_score >= 350 ? 'B' :
                     candidate.total_score >= 300 ? 'C' :
                     candidate.total_score >= 250 ? 'D' : 'E'}
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
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>📊</div>
              <h3 style={{ color: "#666" }}>No Category Scores Available</h3>
              <p style={{ maxWidth: "500px", margin: "0 auto" }}>
                Category scores could not be calculated. This might be due to missing response data or database connection issues.
              </p>
              <div style={{ marginTop: "20px", fontSize: "14px", color: "#1565c0" }}>
                <strong>Debug Info:</strong> Check browser console for detailed error messages.
              </div>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
              gap: "20px" 
            }}>
              {Object.entries(categoryScores).map(([category, data]) => (
                <div key={category} style={{
                  borderLeft: `4px solid ${getCategoryColor(category)}`,
                  padding: "20px",
                  background: "#f8f9fa",
                  borderRadius: "8px"
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
                        {data.count} questions • Avg: {data.average.toFixed(1)}/5
                      </p>
                    </div>
                    <div style={{ 
                      fontSize: "28px", 
                      fontWeight: "700",
                      color: getCategoryColor(category)
                    }}>
                      {data.percentage}%
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
                    color: "#666"
                  }}>
                    <span>Score: {data.total}/{data.maxPossible}</span>
                    <span>{data.percentage}% of max</span>
                  </div>
                  
                  {/* Performance indicator */}
                  <div style={{ 
                    marginTop: "10px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: data.percentage >= 70 ? "#4CAF50" : 
                           data.percentage >= 60 ? "#FF9800" : "#F44336"
                  }}>
                    {data.percentage >= 70 ? "✓ Strong" : 
                     data.percentage >= 60 ? "○ Average" : "⚠ Needs Improvement"}
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
                <div style={{ fontSize: "36px", marginBottom: "15px" }}>📈</div>
                <p style={{ marginBottom: "10px" }}>
                  No categories scored 70% or above.
                </p>
                <p style={{ fontSize: "13px", color: "#666" }}>
                  Consider reviewing individual responses for specific question-level strengths.
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "10px"
              }}>
                {strengths.map((strength, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "rgba(76, 175, 80, 0.1)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #4CAF50"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600",
                        color: "#2e7d32"
                      }}>
                        {strength.category}
                      </div>
                      <div style={{ 
                        padding: "3px 8px",
                        background: "#4CAF50",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        Score: {strength.score}%
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      marginBottom: "5px"
                    }}>
                      {strength.interpretation}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      fontStyle: "italic"
                    }}>
                      Top {Math.round(strength.score/10)} out of 10
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
                <div style={{ fontSize: "36px", marginBottom: "15px" }}>🎯</div>
                <p style={{ marginBottom: "10px" }}>
                  All categories scored above 50%.
                </p>
                <p style={{ fontSize: "13px", color: "#666" }}>
                  Candidate shows balanced performance across all areas.
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "10px"
              }}>
                {weaknesses.map((weakness, index) => (
                  <div key={index} style={{
                    padding: "15px",
                    background: "rgba(244, 67, 54, 0.1)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #F44336"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      marginBottom: "8px"
                    }}>
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600",
                        color: "#c62828"
                      }}>
                        {weakness.category}
                      </div>
                      <div style={{ 
                        padding: "3px 8px",
                        background: "#F44336",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        Score: {weakness.score}%
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#333",
                      marginBottom: "5px"
                    }}>
                      {weakness.interpretation}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666",
                      fontStyle: "italic"
                    }}>
                      Improvement needed: {100 - weakness.score}% to reach target
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
            Development Recommendations ({recommendations.length})
          </h2>
          
          {recommendations.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "30px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "36px", marginBottom: "15px" }}>✅</div>
              <p style={{ marginBottom: "10px" }}>
                No specific development recommendations needed.
              </p>
              <p style={{ fontSize: "13px", color: "#666" }}>
                Candidate shows strong overall performance across all categories.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {recommendations.map((rec, index) => (
                <div key={index} style={{
                  padding: "20px",
                  background: "#fff3e0",
                  borderRadius: "8px",
                  border: "1px solid #ffe0b2"
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
                        Priority: {index === 0 ? "High" : index === 1 ? "Medium" : "Low"}
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
                      borderRadius: "4px",
                      borderLeft: "3px solid #FF9800"
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
                      background: "rgba(255, 255, 255, 0.7)",
                      borderRadius: "4px"
                    }}>
                      {rec.recommendation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessment Summary */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>
            Assessment Summary
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "20px",
            marginBottom: "30px"
          }}>
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #1565c0"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#1565c0" }}>
                {responses.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Total Responses
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                {responses.length}/100 questions
              </div>
            </div>
            
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #4CAF50"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#4CAF50" }}>
                {candidate.total_score}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Total Score
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Max: 500
              </div>
            </div>
            
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #9C27B0"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#9C27B0" }}>
                {Object.keys(categoryScores).length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Categories Assessed
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Out of 5 categories
              </div>
            </div>
            
            <div style={{
              padding: "20px",
              background: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              borderTop: "4px solid #FF9800"
            }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "#FF9800" }}>
                {strengths.length}
              </div>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Key Strengths
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                Areas ≥70% score
              </div>
            </div>
          </div>
          
          <div style={{ 
            textAlign: "center",
            padding: "20px",
            background: "#e3f2fd",
            borderRadius: "8px",
            border: "1px solid #bbdefb"
          }}>
            <p style={{ margin: 0, color: "#1565c0", fontSize: "14px" }}>
              <strong>Report Generated:</strong> {new Date().toLocaleDateString()} | 
              <strong> Candidate ID:</strong> {user_id?.substring(0, 8)}... | 
              <strong> Status:</strong> Completed
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
