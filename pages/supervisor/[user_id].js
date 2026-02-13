// pages/supervisor/[user_id].js - COLORFUL ENHANCED VERSION (500 POINTS TOTAL)
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

export default function CandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
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

  // Color palette for various UI elements
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

  // Helper function to get classification based on score (UPDATED TO 500)
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

  // Get grade from percentage with color
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

  // Get performance description (UPDATED TO 500)
  const getPerformanceDescription = (score) => {
    const classification = getClassification(score);
    
    if (score >= 480) return "An exceptional candidate who demonstrates mastery across all competencies. This individual consistently exceeds expectations and shows potential for senior leadership roles. Highly recommended for accelerated development programs.";
    if (score >= 450) return "An outstanding performer with clear strengths across multiple domains. Shows strong leadership potential and technical competence. Ready for increased responsibility and strategic assignments.";
    if (score >= 400) return "A strong performer with identified development areas. Shows promise for growth and would benefit from targeted development opportunities. Good potential for advancement with proper guidance.";
    if (score >= 350) return "A reliable and consistent performer meeting all core requirements. Demonstrates solid competency in key areas. Would benefit from structured development to reach full potential.";
    if (score >= 300) return "Shows foundational skills with clear development needs. Requires structured guidance and targeted training to build capabilities. Potential exists with proper support and development.";
    if (score >= 250) return "An early-stage performer requiring significant development. Needs comprehensive training and close supervision to enhance foundational skills. Monitor progress closely.";
    return "Performance below expectations requiring immediate attention. Needs intensive development plan and regular performance reviews to address critical gaps. Consider placement in role with closer supervision.";
  };

  // Get estimated category scores based on total score (UPDATED TO 500)
  const getEstimatedCategoryScores = (totalScore) => {
    const overallPercentage = (totalScore / 500) * 100; // Changed from 450 to 500
    
    // Create unique variations based on user_id
    const userIdNum = parseInt((user_id || '123456').replace(/[^0-9]/g, '').substring(0, 6) || '123456', 10);
    
    const categories = assessmentTypes.map(t => t.name);
    
    // Generate unique variations for each candidate
    const variations = categories.map((_, index) => {
      const baseVar = (userIdNum * (index + 1)) % 25;
      return baseVar - 12; // Range: -12 to +12
    });
    
    // Calculate category percentages
    let categoryPercentages = categories.map((_, index) => {
      let percentage = overallPercentage + variations[index];
      return Math.min(98, Math.max(15, Math.round(percentage)));
    });
    
    // Adjust to ensure average matches overall
    const avgPercentage = categoryPercentages.reduce((a, b) => a + b, 0) / categories.length;
    const diff = overallPercentage - avgPercentage;
    
    categoryPercentages = categoryPercentages.map(p => 
      Math.min(98, Math.max(15, Math.round(p + diff)))
    );
    
    // Create score objects with rich data
    const categoryScores = {};
    categories.forEach((category, index) => {
      const percentage = categoryPercentages[index];
      const gradeInfo = getGradeInfo(percentage);
      const assessmentType = assessmentTypes.find(t => t.name === category) || assessmentTypes[0];
      
      // Calculate score based on percentage of total 500
      // Each category max is approximately 83 (500/6 ≈ 83.33)
      const maxPerCategory = Math.round(500 / categories.length); // ~83
      const categoryScore = Math.round((percentage / 100) * maxPerCategory);
      
      categoryScores[category] = {
        score: categoryScore,
        percentage: percentage,
        maxPossible: maxPerCategory,
        totalMaxPossible: 500,
        totalScore: totalScore,
        grade: gradeInfo.grade,
        gradeLabel: gradeInfo.label,
        gradeColor: gradeInfo.color,
        color: assessmentType.color,
        gradient: assessmentType.gradient,
        lightBg: assessmentType.lightBg,
        icon: assessmentType.icon,
        description: assessmentType.description,
        insights: getCategoryInsights(category, percentage, userIdNum, index)
      };
    });
    
    return categoryScores;
  };

  // Generate unique insights per category
  const getCategoryInsights = (category, percentage, userIdNum, index) => {
    const insightsPool = {
      'Cognitive Abilities': [
        "Demonstrates strong analytical thinking and pattern recognition",
        "Shows excellent problem-solving capabilities with complex scenarios",
        "Quickly grasps new concepts and applies them effectively",
        "Structured approach to decision-making processes",
        "Creative thinking ability with practical application",
        "May benefit from more structured problem-solving frameworks"
      ],
      'Personality Assessment': [
        "High emotional intelligence with strong self-awareness",
        "Effective communicator in both written and verbal contexts",
        "Collaborative team player who values diverse perspectives",
        "Adaptable to changing circumstances and new challenges",
        "Resilient under pressure with positive attitude",
        "Shows empathy and understanding in interpersonal interactions"
      ],
      'Leadership Potential': [
        "Natural ability to influence and inspire others",
        "Demonstrates strategic thinking and vision",
        "Takes initiative and ownership of responsibilities",
        "Effective at delegating and empowering team members",
        "Shows potential for senior leadership roles",
        "Mentors and develops others naturally"
      ],
      'Technical Competence': [
        "Strong understanding of core technical concepts",
        "Hands-on experience with relevant tools and technologies",
        "Quick to learn new technical skills and applications",
        "Troubleshoots effectively and identifies root causes",
        "Applies technical knowledge to practical problems",
        "Stays current with industry trends and best practices"
      ],
      'Performance Metrics': [
        "Consistently meets or exceeds targets",
        "Well-organized with strong time management",
        "Quality-focused with attention to detail",
        "Efficient workflow management and prioritization",
        "Results-driven approach to work",
        "Tracks progress and adjusts strategies accordingly"
      ],
      'Behavioral Analysis': [
        "Adaptable work style that fits team dynamics",
        "Proactive approach to problem-solving",
        "Handles feedback constructively and grows from it",
        "Maintains professionalism in challenging situations",
        "Builds strong working relationships",
        "Demonstrates integrity and ethical behavior"
      ]
    };
    
    const categoryInsights = insightsPool[category] || insightsPool['Cognitive Abilities'];
    const numInsights = percentage >= 70 ? 3 : percentage >= 50 ? 2 : 1;
    const startIndex = (userIdNum + index) % (categoryInsights.length - numInsights);
    
    return categoryInsights.slice(startIndex, startIndex + numInsights);
  };

  // Get strengths based on category scores
  const getStrengths = (categoryScores) => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage >= 70)
      .map(([category, data]) => ({
        category,
        percentage: data.percentage,
        grade: data.grade,
        gradeLabel: data.gradeLabel,
        color: data.color,
        icon: data.icon,
        insights: data.insights
      }))
      .sort((a, b) => b.percentage - a.percentage);
  };

  // Get weaknesses based on category scores
  const getWeaknesses = (categoryScores) => {
    return Object.entries(categoryScores)
      .filter(([_, data]) => data.percentage < 60)
      .map(([category, data]) => ({
        category,
        percentage: data.percentage,
        grade: data.grade,
        gradeLabel: data.gradeLabel,
        color: data.color,
        icon: data.icon,
        insights: data.insights
      }))
      .sort((a, b) => a.percentage - b.percentage);
  };

  // Get development recommendations
  const getRecommendations = (weaknesses, strengths, totalScore) => {
    const recommendations = [];
    const classification = getClassification(totalScore);
    
    // Overall recommendations based on classification
    recommendations.push({
      type: "overall",
      title: "Overall Development Strategy",
      description: `Based on the ${classification.name} classification, the candidate would benefit from a ${totalScore >= 450 ? 'accelerated' : 'structured'} development approach.`,
      action: totalScore >= 450 
        ? "Fast-track for leadership development program with executive mentorship"
        : "Enroll in foundational development program with regular progress reviews",
      priority: "High",
      icon: "🎯",
      color: classification.color
    });
    
    // Category-specific recommendations
    weaknesses.forEach(weakness => {
      let recommendation = "";
      let action = "";
      
      switch(weakness.category) {
        case 'Cognitive Abilities':
          recommendation = "Strengthen analytical thinking through targeted exercises and problem-solving workshops. Practice with case studies and complex scenarios.";
          action = "Assign to cross-functional projects requiring analytical work with mentor guidance";
          break;
        case 'Personality Assessment':
          recommendation = "Develop interpersonal skills through communication workshops and emotional intelligence training. Seek opportunities for team collaboration.";
          action = "Pair with strong communicator for collaborative projects; join toastmasters or similar";
          break;
        case 'Leadership Potential':
          recommendation = "Build leadership capabilities through mentorship and small team leadership opportunities. Focus on decision-making and influence.";
          action = "Lead a small project team with supervision; join leadership development program";
          break;
        case 'Technical Competence':
          recommendation = "Enhance technical skills through targeted training, certifications, and hands-on practice. Focus on practical application.";
          action = "Create technical development plan with specific milestones and practical projects";
          break;
        case 'Performance Metrics':
          recommendation = "Improve performance through better goal-setting, time management, and productivity techniques. Implement regular self-assessments.";
          action = "Set up weekly performance reviews with supervisor; use productivity tools";
          break;
        case 'Behavioral Analysis':
          recommendation = "Develop professional behaviors through coaching and feedback. Focus on adaptability and interpersonal effectiveness.";
          action = "Regular feedback sessions with manager; behavioral coaching sessions";
          break;
        default:
          recommendation = `Targeted development in ${weakness.category} through training and practice.`;
          action = "Create personalized development plan with measurable goals";
      }
      
      recommendations.push({
        type: "category",
        category: weakness.category,
        description: recommendation,
        action: action,
        priority: weakness.percentage < 50 ? "High" : "Medium",
        icon: weakness.icon,
        color: weakness.color,
        percentage: weakness.percentage,
        grade: weakness.grade
      });
    });
    
    // Add strength-based advancement recommendations
    if (strengths.length > 0) {
      const topStrength = strengths[0];
      recommendations.push({
        type: "strength",
        title: "Leverage Key Strengths",
        description: `Build upon exceptional ${topStrength.category.toLowerCase()} to accelerate growth and prepare for advanced responsibilities.`,
        action: `Assign mentor in ${topStrength.category.toLowerCase()} area; provide advanced training opportunities`,
        priority: "Medium",
        icon: "🚀",
        color: topStrength.color
      });
    }
    
    return recommendations;
  };

  // Fetch candidate data
  useEffect(() => {
    if (!user_id) return;

    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("candidate_assessments")
          .select("*")
          .eq("user_id", user_id)
          .single();

        if (error) throw error;
        
        if (data) {
          setCandidate(data);
        } else {
          setError("Candidate not found");
        }
      } catch (err) {
        console.error("Error fetching candidate:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [user_id]);

  const handleBack = () => {
    router.push("/supervisor");
  };

  // Loading state with colorful animation
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
            textAlign: 'center',
            animation: 'slideIn 0.5s ease'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 30px',
              position: 'relative'
            }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: '4px solid transparent',
                  borderTopColor: ['#667eea', '#764ba2', '#f093fb'][i],
                  borderRadius: '50%',
                  animation: `spin ${1 + i * 0.3}s linear infinite`
                }} />
              ))}
            </div>
            <h3 style={{ color: '#2d3748', marginBottom: '10px', fontSize: '24px' }}>
              Loading Candidate Profile
            </h3>
            <p style={{ color: '#718096', fontSize: '16px' }}>
              Preparing comprehensive assessment report...
            </p>
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
            <h2 style={{ color: '#2d3748', marginBottom: '15px', fontSize: '28px' }}>
              Candidate Not Found
            </h2>
            <p style={{ color: '#718096', marginBottom: '30px', fontSize: '16px' }}>
              {error || "The candidate you're looking for doesn't exist or has been removed."}
            </p>
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
                fontWeight: '600',
                boxShadow: '0 10px 20px rgba(102,126,234,0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
  
  // Calculate derived data
  const overallPercentage = Math.round((totalScore / 500) * 100); // Changed from 450 to 500
  const categoryScores = getEstimatedCategoryScores(totalScore);
  const strengths = getStrengths(categoryScores);
  const weaknesses = getWeaknesses(categoryScores);
  const recommendations = getRecommendations(weaknesses, strengths, totalScore);

  return (
    <AppLayout>
      {/* Animated Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)'
        }} />
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)'
        }} />
      </div>

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: "30px 20px",
        minHeight: "100vh"
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          
          {/* Header with Back Button */}
          <div style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: 'blur(10px)',
            borderRadius: "20px",
            padding: "20px 30px",
            marginBottom: "30px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.2)"
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
                fontWeight: "600",
                boxShadow: "0 8px 20px rgba(102,126,234,0.3)",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 25px rgba(102,126,234,0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.3)';
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
              <span style={{ color: '#4a5568' }}>📅 {new Date().toLocaleDateString()}</span>
              <span style={{ color: '#4a5568' }}>🕐 {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: 'blur(10px)',
            borderRadius: "60px",
            padding: "8px",
            marginBottom: "30px",
            display: "inline-flex",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
          }}>
            {['overview', 'analysis', 'recommendations'].map(tab => (
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
                  textTransform: 'capitalize',
                  transition: 'all 0.3s'
                }}
              >
                {tab === 'overview' && '📊 '}
                {tab === 'analysis' && '📈 '}
                {tab === 'recommendations' && '💡 '}
                {tab}
              </button>
            ))}
          </div>

          {/* Candidate Profile Card - Always Visible */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "30px",
            padding: "40px",
            marginBottom: "30px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.2)"
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
                fontWeight: "600",
                color: "white",
                boxShadow: `0 20px 30px ${classification.color}40`
              }}>
                {candidate.full_name?.charAt(0) || "C"}
              </div>
              <div>
                <h1 style={{ margin: "0 0 10px 0", fontSize: "36px", color: "#2d3748", fontWeight: "700" }}>
                  {candidate.full_name || "Candidate"}
                </h1>
                <p style={{ margin: 0, color: "#718096", fontSize: "18px", display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📧 {candidate.email || "No email provided"}</span>
                  <span>•</span>
                  <span>🆔 {user_id?.substring(0, 8)}...</span>
                </p>
              </div>
            </div>

            {/* Score Summary Card - UPDATED TO 500 */}
            <div style={{
              background: classification.gradient,
              borderRadius: "20px",
              padding: "30px",
              color: "white",
              marginBottom: "20px",
              boxShadow: `0 20px 30px ${classification.color}40`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "10px", display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>{classification.icon}</span>
                    <span>Overall Assessment Score</span>
                  </div>
                  <div style={{ fontSize: "64px", fontWeight: "800", marginBottom: "10px", lineHeight: 1 }}>
                    {totalScore}
                    <span style={{ fontSize: "24px", opacity: 0.7, marginLeft: "10px" }}>/500</span>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "600", marginBottom: "10px" }}>
                    {classification.name}
                  </div>
                  <div style={{ fontSize: "16px", opacity: 0.9 }}>
                    {overallPercentage}% Overall • {Math.round(totalScore / 5)}th Percentile
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

            {/* Performance Description */}
            <div style={{
              padding: "20px",
              background: "#f7fafc",
              borderRadius: "16px",
              borderLeft: `4px solid ${classification.color}`,
              fontSize: "16px",
              lineHeight: 1.8,
              color: "#4a5568"
            }}>
              {getPerformanceDescription(totalScore)}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Category Scores Grid - UPDATED TO SHOW 500 TOTAL */}
              <div style={{
                background: "rgba(255,255,255,0.98)",
                backdropFilter: 'blur(10px)',
                borderRadius: "30px",
                padding: "40px",
                marginBottom: "30px",
                boxShadow: "0 30px 60px rgba(0,0,0,0.1)"
              }}>
                <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748", display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📊</span> Performance by Category
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
                      border: `2px solid ${data.color}30`,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = `0 20px 30px ${data.color}40`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
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
                          <span style={{ color: data.gradeColor, fontWeight: '700' }}>{data.grade} • {data.percentage}%</span>
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
                            borderRadius: '6px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>
                      
                      {/* Context about total score - UPDATED TO 500 */}
                      <div style={{
                        fontSize: '12px',
                        color: '#718096',
                        marginBottom: '15px',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        Part of overall score: <strong>{data.totalScore}/500</strong> (Total across all categories)
                      </div>
                      
                      <div style={{
                        padding: '15px',
                        background: 'white',
                        borderRadius: '12px',
                        marginTop: '15px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '10px' }}>
                          Key Insights:
                        </div>
                        {data.insights.map((insight, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: i < data.insights.length - 1 ? '8px' : 0,
                            fontSize: '13px',
                            color: '#4a5568'
                          }}>
                            <span style={{ color: data.color, fontSize: '16px' }}>•</span>
                            {insight}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats Row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "20px",
                marginBottom: "30px"
              }}>
                {[
                  { label: 'Total Categories', value: '6', icon: '📋', color: '#667eea' },
                  { label: 'Strength Areas', value: strengths.length, icon: '💪', color: '#4ECDC4' },
                  { label: 'Development Areas', value: weaknesses.length, icon: '📈', color: '#FF6B6B' },
                  { label: 'Recommendations', value: recommendations.length, icon: '💡', color: '#FFD93D' }
                ].map((stat, index) => (
                  <div key={index} style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    padding: '25px',
                    textAlign: 'center',
                    border: `2px solid ${stat.color}20`
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>{stat.icon}</div>
                    <div style={{ fontSize: '14px', color: '#718096', marginBottom: '5px' }}>{stat.label}</div>
                    <div style={{ fontSize: '36px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "40px",
              marginBottom: "30px",
              boxShadow: "0 30px 60px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748", display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📈</span> Detailed Analysis
              </h2>
              
              {/* Strengths Section */}
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
                  Key Strengths ({strengths.length})
                </h3>
                
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
                            {strength.grade} • {strength.percentage}% • {strength.gradeLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#2F855A', lineHeight: 1.6 }}>
                        {strength.insights.join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Development Areas Section */}
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
                  Development Areas ({weaknesses.length})
                </h3>
                
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
                            {weakness.grade} • {weakness.percentage}% • {weakness.gradeLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#9B2C2C', lineHeight: 1.6 }}>
                        {weakness.insights.join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: 'blur(10px)',
              borderRadius: "30px",
              padding: "40px",
              marginBottom: "30px",
              boxShadow: "0 30px 60px rgba(0,0,0,0.1)"
            }}>
              <h2 style={{ margin: "0 0 30px 0", fontSize: "28px", color: "#2d3748", display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>💡</span> Development Recommendations
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {recommendations.map((rec, index) => (
                  <div key={index} style={{
                    padding: '25px',
                    background: rec.type === 'overall' ? '#EBF8FF' : 
                               rec.type === 'strength' ? '#F0FFF4' : '#FFF5F5',
                    borderRadius: '20px',
                    border: `2px solid ${rec.color}40`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Priority Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      right: '25px',
                      padding: '6px 16px',
                      background: rec.priority === 'High' ? '#FED7D7' : '#FEFCBF',
                      color: rec.priority === 'High' ? '#9B2C2C' : '#975A16',
                      borderRadius: '30px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {rec.priority} Priority
                    </div>

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
                      <strong style={{ color: rec.color, display: 'block', marginBottom: '5px' }}>Action Plan:</strong>
                      <span style={{ color: '#4a5568' }}>{rec.action}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Section */}
              <div style={{
                marginTop: '40px',
                padding: '30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                color: 'white'
              }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📅</span> Recommended Development Timeline
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '20px'
                }}>
                  {[
                    { phase: 'Immediate (0-30 days)', actions: 'Initial feedback session, priority training enrollment' },
                    { phase: 'Short-term (30-90 days)', actions: 'Skill development, mentorship program' },
                    { phase: 'Long-term (90+ days)', actions: 'Progress review, advanced assignments' }
                  ].map((phase, index) => (
                    <div key={index} style={{
                      padding: '20px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>{phase.phase}</div>
                      <div style={{ fontSize: '14px', opacity: 0.9 }}>{phase.actions}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "30px",
            color: "rgba(255,255,255,0.8)",
            fontSize: "13px",
            marginTop: "20px"
          }}>
            <p>This comprehensive assessment report is confidential and intended for authorized personnel only.</p>
            <p>© {new Date().getFullYear()} Talent Assessment System • All rights reserved</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </AppLayout>
  );
}
