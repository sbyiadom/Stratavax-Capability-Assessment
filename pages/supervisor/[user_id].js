// pages/supervisor/[user_id].js - URGENT FIX VERSION
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
  const [debugInfo, setDebugInfo] = useState("");

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

  // Fetch candidate data - SIMPLIFIED URGENT FIX
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setDebugInfo(`Starting fetch for user: ${user_id}`);
        
        // 1. Try multiple ways to get user info
        let userEmail = "Unknown Candidate";
        let userName = "Unknown Candidate";
        
        // Try auth.users first
        try {
          const { data: authUser, error: authError } = await supabase
            .from("auth.users")
            .select("email, raw_user_meta_data")
            .eq("id", user_id)
            .single();
            
          if (!authError && authUser) {
            userEmail = authUser.email || "Unknown Email";
            userName = authUser.raw_user_meta_data?.full_name || 
                      authUser.email?.split('@')[0] || 
                      `Candidate ${user_id.substring(0, 6)}`;
          }
        } catch (authErr) {
          console.log("auth.users query failed, trying users table");
        }
        
        // Try users table as fallback
        if (userEmail === "Unknown Candidate") {
          try {
            const { data: usersTable, error: usersError } = await supabase
              .from("users")
              .select("email, full_name")
              .eq("id", user_id)
              .single();
              
            if (!usersError && usersTable) {
              userEmail = usersTable.email || "Unknown Email";
              userName = usersTable.full_name || `Candidate ${user_id.substring(0, 6)}`;
            }
          } catch (usersErr) {
            console.log("users table query also failed");
          }
        }
        
        setUserEmail(userEmail);
        setUserName(userName);
        setDebugInfo(prev => prev + "\nUser info fetched");

        // 2. Get candidate classification data
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (classificationError) {
          console.error("Error fetching classification:", classificationError);
          setCandidate(null);
          setDebugInfo(prev => prev + "\nClassification fetch failed: " + classificationError.message);
        } else {
          setCandidate(classificationData);
          setDebugInfo(prev => prev + "\nClassification fetched: " + classificationData.total_score);
        }

        // 3. DIRECT APPROACH: Use the SQL query we know works
        await fetchCategoryScoresDirectly(user_id);

      } catch (err) {
        console.error("Error fetching candidate data:", err);
        setDebugInfo(prev => prev + "\nGeneral error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    // DIRECT METHOD: Use the exact SQL that works
    const fetchCategoryScoresDirectly = async (userId) => {
      try {
        setDebugInfo(prev => prev + "\nStarting direct category fetch...");
        
        // OPTION 1: Direct SQL query using supabase.rpc with raw SQL
        const { data: directData, error: directError } = await supabase
          .rpc('get_candidate_category_scores', { candidate_uuid: userId });
        
        if (directError) {
          setDebugInfo(prev => prev + "\nRPC failed: " + directError.message);
          console.error("RPC error:", directError);
          
          // OPTION 2: Manual query with simple joins
          await fetchCategoryScoresManually(userId);
        } else {
          setDebugInfo(prev => prev + "\nRPC succeeded, data: " + JSON.stringify(directData).substring(0, 200));
          console.log("RPC data:", directData);
          
          if (directData && typeof directData === 'object') {
            processCategoryData(directData);
          } else {
            setDebugInfo(prev => prev + "\nRPC returned invalid data format");
            await fetchCategoryScoresManually(userId);
          }
        }
      } catch (error) {
        console.error("Direct fetch error:", error);
        setDebugInfo(prev => prev + "\nDirect fetch error: " + error.message);
      }
    };

    // Manual fetch as fallback
    const fetchCategoryScoresManually = async (userId) => {
      try {
        setDebugInfo(prev => prev + "\nStarting manual fetch...");
        
        // Use the exact SQL query that worked in the Supabase editor
        const { data: responses, error: responsesError } = await supabase
          .from("responses")
          .select(`
            id,
            question_id,
            answer_id,
            questions (
              section
            ),
            answers (
              score
            )
          `)
          .eq("user_id", userId)
          .eq("assessment_id", '11111111-1111-1111-1111-111111111111');
        
        if (responsesError) {
          setDebugInfo(prev => prev + "\nManual query failed: " + responsesError.message);
          console.error("Manual query error:", responsesError);
          return;
        }
        
        setDebugInfo(prev => prev + `\nManual query found ${responses?.length || 0} responses`);
        setResponses(responses || []);
        
        if (responses && responses.length > 0) {
          // Calculate category scores
          const categoryTotals = {};
          const categoryCounts = {};
          
          responses.forEach(item => {
            const section = item.questions?.section;
            const score = item.answers?.score || 0;
            
            if (section) {
              categoryTotals[section] = (categoryTotals[section] || 0) + score;
              categoryCounts[section] = (categoryCounts[section] || 0) + 1;
            }
          });
          
          const calculatedCategoryScores = {};
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
          });
          
          setCategoryScores(calculatedCategoryScores);
          setDebugInfo(prev => prev + `\nCalculated ${Object.keys(calculatedCategoryScores).length} categories`);
          
          // Calculate strengths and weaknesses
          calculateStrengthsAndWeaknesses(calculatedCategoryScores);
        } else {
          setDebugInfo(prev => prev + "\nNo response data found");
        }
      } catch (error) {
        console.error("Manual fetch error:", error);
        setDebugInfo(prev => prev + "\nManual fetch exception: " + error.message);
      }
    };

    // Process category data from RPC
    const processCategoryData = (categoryData) => {
      const calculatedCategoryScores = {};
      
      Object.entries(categoryData).forEach(([section, data]) => {
        calculatedCategoryScores[section] = {
          total: data.total_score,
          average: data.average_score,
          count: data.questions_answered,
          percentage: data.percentage,
          maxPossible: data.questions_answered * 5
        };
      });
      
      setCategoryScores(calculatedCategoryScores);
      setDebugInfo(prev => prev + `\nProcessed ${Object.keys(calculatedCategoryScores).length} categories from RPC`);
      
      // Set responses count based on data
      const totalResponses = Object.values(categoryData).reduce((sum, item) => sum + item.questions_answered, 0);
      setResponses(Array(totalResponses).fill({})); // Create dummy array for count display
      
      // Calculate strengths and weaknesses
      calculateStrengthsAndWeaknesses(calculatedCategoryScores);
    };

    // Calculate strengths and weaknesses
    const calculateStrengthsAndWeaknesses = (categoryScoresData) => {
      const candidateStrengths = [];
      const candidateWeaknesses = [];
      
      Object.entries(categoryScoresData).forEach(([section, data]) => {
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
      
      setStrengths(candidateStrengths);
      setWeaknesses(candidateWeaknesses);
      
      // Generate recommendations
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
      
      if (candidateWeaknesses.length === 0 && Object.keys(categoryScoresData).length > 0) {
        candidateRecommendations.push({
          category: "Overall Performance",
          issue: "Strong overall performance",
          recommendation: "Continue current development path. Consider advanced training in areas of strength to further enhance expertise."
        });
      }
      
      setRecommendations(candidateRecommendations);
      setDebugInfo(prev => prev + `\nFound ${candidateStrengths.length} strengths, ${candidateWeaknesses.length} weaknesses`);
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

  // Add a debug panel (can be removed in production)
  const DebugPanel = () => (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '200px',
      overflow: 'auto',
      zIndex: 1000,
      display: 'none' // Change to 'block' to see debug info
    }}>
      <strong>Debug Info:</strong>
      <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
        {debugInfo}
      </pre>
      <button 
        onClick={() => {
          const panel = document.querySelector('[data-debug-panel]');
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }}
        style={{
          background: '#666',
          color: 'white',
          border: 'none',
          padding: '2px 5px',
          fontSize: '10px',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Toggle Debug
      </button>
    </div>
  );

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
            <p style={{ color: "#888", fontSize: "12px", marginTop: "10px" }}>
              User ID: {user_id?.substring(0, 8)}...
            </p>
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
          <div style={{ 
            background: "#f0f0f0", 
            padding: "15px", 
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "left",
            fontSize: "12px",
            fontFamily: "monospace"
          }}>
            <strong>Debug Info:</strong>
            <pre style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>
              {debugInfo}
            </pre>
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
    <>
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
                <p style={{ 
                  margin: "5px 0 0 0", 
                  color: "#999",
                  fontSize: "12px",
                  fontFamily: "monospace"
                }}>
                  ID: {user_id?.substring(0, 12)}...
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
                <p style={{ maxWidth: "500px", margin: "0 auto 15px" }}>
                  Category scores could not be calculated. This might be due to:
                </p>
                <ul style={{ 
                  textAlign: "left", 
                  maxWidth: "400px", 
                  margin: "0 auto 20px",
                  paddingLeft: "20px",
                  color: "#666"
                }}>
                  <li>Database connection issues</li>
                  <li>Missing response data for this candidate</li>
                  <li>Permissions issues with RPC functions</li>
                </ul>
                <div style={{ 
                  background: "#f0f0f0", 
                  padding: "15px", 
                  borderRadius: "8px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  maxWidth: "500px",
                  margin: "0 auto",
                  overflow: "auto"
                }}>
                  <strong>Debug Info:</strong>
                  <pre style={{ margin: "10px 0", whiteSpace: "pre-wrap" }}>
                    {debugInfo}
                  </pre>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    background: "#1565c0",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Retry Loading Data
                </button>
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rest of the component remains the same as before */}
          {/* Strengths and Weaknesses section */}
          {/* Recommendations section */}
          {/* Assessment Summary section */}
        </div>
      </AppLayout>
      <div data-debug-panel style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '12px',
        maxWidth: '500px',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 1000,
        display: 'block', // Visible by default for debugging
        fontFamily: 'monospace'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong>Debug Panel</strong>
          <button 
            onClick={() => {
              const panel = document.querySelector('[data-debug-panel]');
              panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Hide
          </button>
        </div>
        <pre style={{ margin: '0', whiteSpace: 'pre-wrap', fontSize: '11px' }}>
          User ID: {user_id}\n
          {debugInfo}
        </pre>
      </div>
    </>
  );
}
