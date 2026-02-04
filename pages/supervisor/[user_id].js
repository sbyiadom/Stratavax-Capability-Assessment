// pages/supervisor/[user_id].js
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

  // Fetch candidate data
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);

        // 1. Get candidate classification data
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select(`
            *,
            users (email, full_name, created_at)
          `)
          .eq("user_id", user_id)
          .single();

        if (classificationError) throw classificationError;

        // 2. Get candidate's responses with questions and answers
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select(`
            question_id,
            answer_id,
            questions (
              question_text,
              section,
              subsection
            ),
            answers (
              answer_text,
              score,
              interpretation,
              trait_category,
              strength_level
            )
          `)
          .eq("user_id", user_id)
          .eq("assessment_id", '11111111-1111-1111-1111-111111111111');

        if (responsesError) throw responsesError;

        // 3. Calculate category scores
        const categoryTotals = {};
        const categoryCounts = {};
        
        responsesData?.forEach(response => {
          const section = response.questions?.section;
          const score = response.answers?.score || 0;
          
          if (section) {
            categoryTotals[section] = (categoryTotals[section] || 0) + score;
            categoryCounts[section] = (categoryCounts[section] || 0) + 1;
          }
        });

        const calculatedCategoryScores = {};
        Object.keys(categoryTotals).forEach(section => {
          const total = categoryTotals[section];
          const count = categoryCounts[section];
          calculatedCategoryScores[section] = {
            total,
            average: count > 0 ? Math.round(total / count) : 0,
            count
          };
        });

        // 4. Identify strengths and weaknesses
        const candidateStrengths = [];
        const candidateWeaknesses = [];
        const candidateRecommendations = [];

        responsesData?.forEach(response => {
          const answer = response.answers;
          const question = response.questions;
          
          if (answer && question) {
            // Strength: score >= 4
            if (answer.score >= 4) {
              candidateStrengths.push({
                category: question.section,
                subcategory: question.subsection,
                trait: answer.trait_category,
                interpretation: answer.interpretation,
                strength: answer.strength_level,
                score: answer.score
              });
            }
            
            // Weakness: score <= 2
            if (answer.score <= 2) {
              candidateWeaknesses.push({
                category: question.section,
                subcategory: question.subsection,
                trait: answer.trait_category,
                interpretation: answer.interpretation,
                score: answer.score
              });
            }
          }
        });

        // 5. Generate recommendations
        candidateWeaknesses.forEach(weakness => {
          let recommendation = "";
          
          switch(weakness.category) {
            case 'Cognitive Abilities':
              recommendation = "Consider cognitive training exercises and problem-solving workshops.";
              break;
            case 'Personality Assessment':
              recommendation = "Engage in personality development sessions and emotional intelligence training.";
              break;
            case 'Leadership Potential':
              recommendation = "Participate in leadership workshops and mentorship programs.";
              break;
            case 'Bottled Water Manufacturing':
              recommendation = "Attend technical training and industry-specific skill development.";
              break;
            case 'Performance Metrics':
              recommendation = "Focus on goal-setting and performance tracking improvement.";
              break;
            default:
              recommendation = "Consider targeted training in this area.";
          }
          
          candidateRecommendations.push({
            category: weakness.category,
            subcategory: weakness.subcategory,
            issue: weakness.interpretation || `Low score in ${weakness.trait}`,
            recommendation
          });
        });

        setCandidate(classificationData);
        setResponses(responsesData || []);
        setCategoryScores(calculatedCategoryScores);
        setStrengths(candidateStrengths);
        setWeaknesses(candidateWeaknesses);
        setRecommendations(candidateRecommendations);

      } catch (err) {
        console.error("Error fetching candidate data:", err);
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
            The requested candidate data could not be found.
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
              <p style={{ 
                margin: "0", 
                color: "#666",
                fontSize: "16px"
              }}>
                {candidate.users?.full_name || "Anonymous Candidate"} • {candidate.users?.email || "No email"}
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
                  {candidate.total_score}/100
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
                    {candidate.total_score >= 90 ? 'A' :
                     candidate.total_score >= 75 ? 'B' :
                     candidate.total_score >= 60 ? 'C' :
                     candidate.total_score >= 40 ? 'D' : 'E'}
                  </div>
                </div>
                <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.8 }}>
                  Grade
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
                      {data.count} questions
                    </p>
                  </div>
                  <div style={{ 
                    fontSize: "28px", 
                    fontWeight: "700",
                    color: getCategoryColor(category)
                  }}>
                    {data.average}
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
                    width: `${data.average * 10}%`, 
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
                  <span>Average Score</span>
                  <span>{data.total} total points</span>
                </div>
              </div>
            ))}
          </div>
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
                color: "#888"
              }}>
                No significant strengths identified
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px" 
              }}>
                {strengths.slice(0, 5).map((strength, index) => (
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
                        {strength.trait || strength.category}
                      </div>
                      <div style={{ 
                        padding: "3px 8px",
                        background: "#4CAF50",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        Score: {strength.score}
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
                      color: "#666"
                    }}>
                      <strong>Category:</strong> {strength.category} • {strength.subcategory}
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
                color: "#888"
              }}>
                No significant weaknesses identified
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gap: "15px" 
              }}>
                {weaknesses.slice(0, 5).map((weakness, index) => (
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
                        {weakness.trait || weakness.category}
                      </div>
                      <div style={{ 
                        padding: "3px 8px",
                        background: "#F44336",
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        Score: {weakness.score}
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
                      color: "#666"
                    }}>
                      <strong>Category:</strong> {weakness.category} • {weakness.subcategory}
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
              color: "#888"
            }}>
              No specific recommendations available
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {recommendations.slice(0, 6).map((rec, index) => (
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
                        {rec.subcategory}
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
                      color: "#333"
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
                      lineHeight: 1.5
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
          <h2 style={{ margin: "0 0 20px 0", color: "#333" }}>
            Detailed Responses ({responses.length})
          </h2>
          
          {responses.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "30px",
              color: "#888"
            }}>
              No response data available
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gap: "15px",
              maxHeight: "400px",
              overflowY: "auto",
              paddingRight: "10px"
            }}>
              {responses.map((response, index) => (
                <div key={index} style={{
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
                        {response.questions?.subsection}
                      </div>
                      
                      <div style={{ 
                        fontSize: "14px", 
                        color: "#333",
                        background: "white",
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                        marginBottom: "10px"
                      }}>
                        <strong>Response:</strong> {response.answers?.answer_text}
                      </div>
                      
                      {response.answers?.interpretation && (
                        <div style={{ 
                          fontSize: "13px", 
                          color: "#555",
                          fontStyle: "italic"
                        }}>
                          "{response.answers.interpretation}"
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      marginLeft: "20px",
                      textAlign: "center",
                      minWidth: "80px"
                    }}>
                      <div style={{ 
                        width: "50px", 
                        height: "50px",
                        borderRadius: "50%",
                        background: getScoreColor(response.answers?.score || 0),
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "18px",
                        margin: "0 auto 8px"
                      }}>
                        {response.answers?.score || 0}
                      </div>
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#666",
                        fontWeight: "600"
                      }}>
                        Score
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
