// pages/supervisor/[user_id].js - UNIVERSAL FIX
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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
  const [debugInfo, setDebugInfo] = useState("");

  // Common category names - adjust based on your data
  const POSSIBLE_CATEGORIES = [
    'Technical Competence',
    'Leadership Skills', 
    'Problem Solving',
    'Communication Skills',
    'Personality Assessment',
    'Technical',
    'Leadership',
    'Problem-Solving',
    'Communication',
    'Personality',
    'Cognitive',
    'Behavioral'
  ];

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

  // Fetch ALL data in one optimized query
  useEffect(() => {
    if (!isSupervisor || !user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        setDebugInfo(`Fetching data for: ${user_id}`);

        // 1. Get candidate classification
        const { data: classificationData, error: classificationError } = await supabase
          .from("talent_classification")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (classificationError) {
          console.error("Classification error:", classificationError);
          setCandidate(null);
        } else {
          setCandidate(classificationData);
          setDebugInfo(prev => prev + ` | Classification score: ${classificationData?.total_score}`);
        }

        // 2. Try to get user info from multiple sources
        try {
          // First try the API
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
                full_name: users[0].full_name || users[0].email.split('@')[0]
              });
            }
          }
        } catch (apiError) {
          console.log("API failed, trying Supabase directly");
          // Try to get from auth.users if API fails
          const { data: authData } = await supabase.auth.admin.getUserById(user_id);
          if (authData?.user) {
            setUserInfo({
              email: authData.user.email,
              full_name: authData.user.user_metadata?.full_name || authData.user.email.split('@')[0]
            });
          }
        }

        // 3. Get ALL responses for this user with related data
        console.log("Fetching complete response data...");
        
        // OPTION A: Try with direct query first
        let allResponses = [];
        
        // First, get all responses for this user
        const { data: responsesData, error: responsesError } = await supabase
          .from("responses")
          .select("*")
          .eq("user_id", user_id);

        if (responsesError) {
          console.error("Responses error:", responsesError);
          setDebugInfo(prev => prev + ` | Responses error: ${responsesError.message}`);
        } else if (responsesData && responsesData.length > 0) {
          console.log(`Found ${responsesData.length} responses`);
          setDebugInfo(prev => prev + ` | Found ${responsesData.length} responses`);
          
          // Now get ALL questions and answers to match
          const { data: allQuestions } = await supabase
            .from("questions")
            .select("*");
            
          const { data: allAnswers } = await supabase
            .from("answers")
            .select("*");
          
          console.log(`Questions: ${allQuestions?.length}, Answers: ${allAnswers?.length}`);
          
          // Create lookup maps
          const questionsMap = {};
          allQuestions?.forEach(q => {
            questionsMap[q.id] = q;
          });
          
          const answersMap = {};
          allAnswers?.forEach(a => {
            answersMap[a.id] = a;
          });
          
          // Process each response
          allResponses = responsesData.map(response => {
            const question = questionsMap[response.question_id];
            const answer = answersMap[response.answer_id];
            
            // Determine category - check multiple possible fields
            let category = "Unknown";
            if (question) {
              category = question.category || question.section || question.type || question.domain || "Unknown";
            }
            
            return {
              ...response,
              question: question || { 
                id: response.question_id,
                question_text: `Question ${response.question_id}`,
                category: "Unknown"
              },
              answer: answer || {
                id: response.answer_id,
                answer_text: "Answer not available",
                score: 0,
                interpretation: "No interpretation"
              },
              category: category,
              score: answer?.score || 0
            };
          });
          
          console.log("Processed responses:", allResponses.length);
          
          // Calculate category scores
          const categoryStats = {};
          
          // Initialize with possible categories
          POSSIBLE_CATEGORIES.forEach(cat => {
            categoryStats[cat] = {
              totalScore: 0,
              questionCount: 0,
              averageScore: 0,
              percentage: 0
            };
          });
          
          // Add "Unknown" category for any responses that don't match
          categoryStats["Unknown"] = {
            totalScore: 0,
            questionCount: 0,
            averageScore: 0,
            percentage: 0
          };
          
          // Group responses by category
          allResponses.forEach(response => {
            const category = response.category;
            const score = response.score;
            
            // Normalize category name
            let normalizedCategory = "Unknown";
            POSSIBLE_CATEGORIES.forEach(cat => {
              if (category.toLowerCase().includes(cat.toLowerCase())) {
                normalizedCategory = cat;
              }
            });
            
            if (!categoryStats[normalizedCategory]) {
              categoryStats[normalizedCategory] = {
                totalScore: 0,
                questionCount: 0,
                averageScore: 0,
                percentage: 0
              };
            }
            
            categoryStats[normalizedCategory].totalScore += score;
            categoryStats[normalizedCategory].questionCount += 1;
          });
          
          // Calculate averages and percentages
          Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            if (stats.questionCount > 0) {
              stats.averageScore = (stats.totalScore / stats.questionCount).toFixed(2);
              const maxPossibleScore = stats.questionCount * 5;
              stats.percentage = Math.round((stats.totalScore / maxPossibleScore) * 100);
            }
          });
          
          // Filter out empty categories
          const filteredStats = {};
          Object.keys(categoryStats).forEach(category => {
            if (categoryStats[category].questionCount > 0) {
              filteredStats[category] = categoryStats[category];
            }
          });
          
          console.log("Category statistics:", filteredStats);
          setCategoryScores(filteredStats);
          
          // Identify strengths and weaknesses
          const candidateStrengths = [];
          const candidateWeaknesses = [];
          
          allResponses.forEach(response => {
            const score = response.score;
            const category = response.category;
            
            if (score >= 4) {
              candidateStrengths.push({
                category: category,
                question: response.question?.question_text?.substring(0, 100) || "Question",
                score: score,
                interpretation: response.answer?.interpretation || `Strong in ${category}`
              });
            }
            
            if (score <= 2) {
              candidateWeaknesses.push({
                category: category,
                question: response.question?.question_text?.substring(0, 100) || "Question",
                score: score,
                interpretation: response.answer?.interpretation || `Needs improvement in ${category}`
              });
            }
          });
          
          setStrengths(candidateStrengths);
          setWeaknesses(candidateWeaknesses);
          
          // Generate basic recommendations
          const candidateRecommendations = [];
          
          // Check each category for weaknesses
          Object.keys(filteredStats).forEach(category => {
            const catWeaknesses = candidateWeaknesses.filter(w => w.category === category);
            if (catWeaknesses.length > 0) {
              candidateRecommendations.push({
                category: category,
                issue: `${catWeaknesses.length} area${catWeaknesses.length > 1 ? 's' : ''} need improvement`,
                recommendation: `Focus on improving ${category.toLowerCase()} skills through targeted training.`,
                priority: catWeaknesses.length > 3 ? "High" : catWeaknesses.length > 1 ? "Medium" : "Low"
              });
            }
          });
          
          setRecommendations(candidateRecommendations);
          setResponses(allResponses);
          
        } else {
          console.log("No responses found");
          setDebugInfo(prev => prev + " | No responses found");
        }

      } catch (err) {
        console.error("General error:", err);
        setDebugInfo(prev => prev + ` | Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [isSupervisor, user_id]);

  // Rest of the component remains the same...
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
      'Technical Competence': '#4A6FA5',
      'Technical': '#4A6FA5',
      'Leadership Skills': '#D32F2F',
      'Leadership': '#D32F2F',
      'Problem Solving': '#388E3C',
      'Problem-Solving': '#388E3C',
      'Communication Skills': '#F57C00',
      'Communication': '#F57C00',
      'Personality Assessment': '#9C27B0',
      'Personality': '#9C27B0',
      'Cognitive': '#607D8B',
      'Behavioral': '#795548',
      'Unknown': '#666'
    };
    return colors[category] || '#666';
  };

  const calculateGrade = (score) => {
    if (score >= 450) return 'A+';
    if (score >= 400) return 'A';
    if (score >= 350) return 'B';
    if (score >= 300) return 'C';
    if (score >= 250) return 'D';
    return 'E';
  };

  // Loading and error states remain the same...
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
            No assessment data found for this candidate.
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

  // The JSX render remains mostly the same, just updating the category scores display
  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "90vw", margin: "auto", padding: "30px 20px" }}>
        {/* Debug info at top */}
        {debugInfo && (
          <div style={{ 
            marginBottom: "20px",
            padding: "10px 15px",
            background: "#f5f5f5",
            borderRadius: "6px",
            borderLeft: "4px solid #1565c0",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "#333"
          }}>
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}

        {/* Header - same as before */}
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
                  {candidate.total_score}/500
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

        {/* Category Scores - UPDATED */}
        <div style={{ 
          background: "white", 
          padding: "25px", 
          borderRadius: "12px", 
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          marginBottom: "30px"
        }}>
          <h2 style={{ margin: "0 0 25px 0", color: "#333" }}>Performance by Category</h2>
          
          {responses.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <p><strong>No assessment responses found.</strong></p>
              <p style={{ fontSize: "14px", marginTop: "10px", color: "#666" }}>
                The candidate has a classification but no detailed responses were found in the database.
              </p>
            </div>
          ) : Object.keys(categoryScores).length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px",
              color: "#888",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "15px" }}>📊</div>
              <p>Found {responses.length} responses but couldn't categorize them.</p>
              <div style={{ 
                marginTop: "20px",
                padding: "15px",
                background: "#fff3e0",
                borderRadius: "6px"
              }}>
                <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>Found categories:</p>
                <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                  {Array.from(new Set(responses.map(r => r.category))).join(", ")}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "20px" 
            }}>
              {Object.entries(categoryScores).map(([category, stats]) => (
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
                        {stats.questionCount} questions • Average: {stats.averageScore}/5
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ 
                        fontSize: "28px", 
                        fontWeight: "700",
                        color: getCategoryColor(category)
                      }}>
                        {stats.percentage}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        Score
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
                      width: `${stats.percentage}%`, 
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
                      <div>{stats.totalScore}/{stats.questionCount * 5}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "600" }}>Questions</div>
                      <div>{stats.questionCount}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "600" }}>Average</div>
                      <div>{stats.averageScore}/5</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The rest of the component (Strengths, Weaknesses, Recommendations, Responses) remains the same */}
        {/* ... */}
        
      </div>
    </AppLayout>
  );
}
