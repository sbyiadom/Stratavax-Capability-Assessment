import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== SECTION CONFIGURATIONS WITH BEAUTIFUL BACKGROUNDS =====
const SECTION_CONFIG = {
  // General Assessment
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    lightBg: 'rgba(74, 111, 165, 0.1)', 
    icon: '🧠', 
    bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    lightBg: 'rgba(156, 39, 176, 0.1)', 
    icon: '😊', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #da22ff 0%, #9733ee 100%)'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    lightBg: 'rgba(211, 47, 47, 0.1)', 
    icon: '👑', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  'Bottled Water Manufacturing': { 
    color: '#388E3C', 
    lightBg: 'rgba(56, 142, 60, 0.1)', 
    icon: '⚙️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    lightBg: 'rgba(245, 124, 0, 0.1)', 
    icon: '📊', 
    bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'
  },
  
  // Behavioral
  'Adaptability & Flexibility': { 
    color: '#FF6B6B', 
    lightBg: 'rgba(255, 107, 107, 0.1)', 
    icon: '🔄', 
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'
  },
  'Emotional Intelligence': { 
    color: '#4ECDC4', 
    lightBg: 'rgba(78, 205, 196, 0.1)', 
    icon: '🧘', 
    bgImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)'
  },
  'Communication Skills': { 
    color: '#45B7D1', 
    lightBg: 'rgba(69, 183, 209, 0.1)', 
    icon: '💬', 
    bgImage: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'
  },
  'Teamwork & Collaboration': { 
    color: '#96CEB4', 
    lightBg: 'rgba(150, 206, 180, 0.1)', 
    icon: '🤝', 
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  },
  'Initiative & Proactivity': { 
    color: '#FFEAA7', 
    lightBg: 'rgba(255, 234, 167, 0.1)', 
    icon: '⚡', 
    bgImage: 'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)'
  },
  'Time Management': { 
    color: '#DDA0DD', 
    lightBg: 'rgba(221, 160, 221, 0.1)', 
    icon: '⏰', 
    bgImage: 'https://images.unsplash.com/photo-1510130315046-1e47cc196aa0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)'
  },
  'Resilience': { 
    color: '#F08A5D', 
    lightBg: 'rgba(240, 138, 93, 0.1)', 
    icon: '💪', 
    bgImage: 'https://images.unsplash.com/photo-1551632811-561732d4dfdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)'
  },
  
  // Cognitive
  'Problem-Solving': { 
    color: '#6A4C93', 
    lightBg: 'rgba(106, 76, 147, 0.1)', 
    icon: '🔍', 
    bgImage: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)'
  },
  'Critical Thinking': { 
    color: '#1982C4', 
    lightBg: 'rgba(25, 130, 196, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'
  },
  'Learning Agility': { 
    color: '#8AC926', 
    lightBg: 'rgba(138, 201, 38, 0.1)', 
    icon: '📚', 
    bgImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)'
  },
  'Creativity & Innovation': { 
    color: '#FFCA3A', 
    lightBg: 'rgba(255, 202, 58, 0.1)', 
    icon: '💡', 
    bgImage: 'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'
  },
  
  // Cultural
  'Core Values Alignment': { 
    color: '#9C89B8', 
    lightBg: 'rgba(156, 137, 184, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)'
  },
  'Organizational Citizenship': { 
    color: '#F0A6CA', 
    lightBg: 'rgba(240, 166, 202, 0.1)', 
    icon: '🤲', 
    bgImage: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
  },
  'Reliability & Dependability': { 
    color: '#B8F2E6', 
    lightBg: 'rgba(184, 242, 230, 0.1)', 
    icon: '✓', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)'
  },
  'Customer Focus': { 
    color: '#A9D6E5', 
    lightBg: 'rgba(169, 214, 229, 0.1)', 
    icon: '👥', 
    bgImage: 'https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)'
  },
  'Safety Awareness': { 
    color: '#FCA17D', 
    lightBg: 'rgba(252, 161, 125, 0.1)', 
    icon: '⚠️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)'
  },
  'Commercial Awareness': { 
    color: '#86A788', 
    lightBg: 'rgba(134, 167, 136, 0.1)', 
    icon: '💰', 
    bgImage: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 100%)'
  },
  
  // Manufacturing
  'Blowing Machines': { 
    color: '#3D5A80', 
    lightBg: 'rgba(61, 90, 128, 0.1)', 
    icon: '💨', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)'
  },
  'Labeler': { 
    color: '#EE6C4D', 
    lightBg: 'rgba(238, 108, 77, 0.1)', 
    icon: '🏷️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)'
  },
  'Filling': { 
    color: '#98C1D9', 
    lightBg: 'rgba(152, 193, 217, 0.1)', 
    icon: '💧', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'
  },
  'Conveyors': { 
    color: '#293241', 
    lightBg: 'rgba(41, 50, 65, 0.1)', 
    icon: '📦', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #283048 0%, #859398 100%)'
  },
  'Stretchwrappers': { 
    color: '#E0FBFC', 
    lightBg: 'rgba(224, 251, 252, 0.1)', 
    icon: '🔄', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)'
  },
  'Shrinkwrappers': { 
    color: '#C81D25', 
    lightBg: 'rgba(200, 29, 37, 0.1)', 
    icon: '🔥', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%)'
  },
  'Date Coders': { 
    color: '#725AC1', 
    lightBg: 'rgba(114, 90, 193, 0.1)', 
    icon: '📅', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)'
  },
  'Raw Materials': { 
    color: '#5D576B', 
    lightBg: 'rgba(93, 87, 107, 0.1)', 
    icon: '🧪', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 100%)'
  },
  
  // Leadership
  'Vision & Strategic Thinking': { 
    color: '#FFB347', 
    lightBg: 'rgba(255, 179, 71, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'
  },
  'Team Development': { 
    color: '#5F9EA0', 
    lightBg: 'rgba(95, 158, 160, 0.1)', 
    icon: '🌱', 
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  },
  'Decision-Making': { 
    color: '#C23B22', 
    lightBg: 'rgba(194, 59, 34, 0.1)', 
    icon: '⚖️', 
    bgImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)'
  },
  'Influence': { 
    color: '#6B5B95', 
    lightBg: 'rgba(107, 91, 149, 0.1)', 
    icon: '🗣️', 
    bgImage: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)'
  },
  'Leadership EQ': { 
    color: '#88B04B', 
    lightBg: 'rgba(136, 176, 75, 0.1)', 
    icon: '💖', 
    bgImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)'
  },
  'Conflict Resolution': { 
    color: '#FF6F61', 
    lightBg: 'rgba(255, 111, 97, 0.1)', 
    icon: '🤝', 
    bgImage: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'
  },
  'Delegation': { 
    color: '#92A8D1', 
    lightBg: 'rgba(146, 168, 209, 0.1)', 
    icon: '📤', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'
  },
  'Leadership Integrity': { 
    color: '#955251', 
    lightBg: 'rgba(149, 82, 81, 0.1)', 
    icon: '🛡️', 
    bgImage: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)'
  },
  'Innovation Leadership': { 
    color: '#B565A7', 
    lightBg: 'rgba(181, 101, 167, 0.1)', 
    icon: '💫', 
    bgImage: 'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80',
    gradient: 'linear-gradient(135deg, #da22ff 0%, #9733ee 100%)'
  }
};

// Default background for unmapped sections
const DEFAULT_BG = 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80';

// ===== FIXED TIMER FUNCTIONS =====
async function startOrResumeTimer(userId, assessmentId) {
  try {
    if (!userId || !assessmentId) return 0;

    const { data: existingTimer, error: fetchError } = await supabase
      .from("assessment_timer_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Timer fetch error:", fetchError);
      return 0;
    }

    if (existingTimer) {
      return existingTimer.elapsed_seconds;
    } else {
      const { error } = await supabase
        .from("assessment_timer_progress")
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          started_at: new Date().toISOString(),
          elapsed_seconds: 0,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return 0;
    }
  } catch (error) {
    console.error("Timer error:", error);
    return 0;
  }
}

async function saveTimerProgress(userId, assessmentId, elapsedSeconds) {
  try {
    if (!userId || !assessmentId) return;
    
    const { error } = await supabase
      .from("assessment_timer_progress")
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        elapsed_seconds: elapsedSeconds,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,assessment_id',
        ignoreDuplicates: false 
      });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to save timer:", error);
  }
}

async function markTimerAsCompleted(userId, assessmentId) {
  try {
    if (!userId || !assessmentId) return;
    
    const { error } = await supabase
      .from("assessment_timer_progress")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to mark timer as completed:", error);
  }
}

// ===== ANTI-CHEAT FUNCTIONS =====
function setupAntiCheatProtection() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && 
        (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
      e.preventDefault();
    }
    if (e.key === 'F12' || e.key === 'PrintScreen') {
      e.preventDefault();
    }
  });

  const style = document.createElement('style');
  style.innerHTML = `* { user-select: none !important; }`;
  document.head.appendChild(style);
}

// ===== RANDOMIZE ANSWERS =====
function trulyRandomizeAnswers(answers) {
  if (!answers || answers.length === 0) return answers;
  const shuffled = [...answers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== SAVE RESPONSE =====
async function saveResponse(assessmentId, questionId, answerId, userId) {
  try {
    const { error } = await supabase.from("responses").upsert({
      assessment_id: assessmentId,
      question_id: parseInt(questionId),
      answer_id: parseInt(answerId),
      user_id: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'assessment_id,question_id,user_id' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Save error:", error);
    throw error;
  }
}

async function loadUserResponses(userId, assessmentId) {
  try {
    const { data } = await supabase
      .from("responses")
      .select("question_id, answer_id")
      .eq("assessment_id", assessmentId)
      .eq("user_id", userId);

    const responses = {};
    data?.forEach(r => responses[r.question_id] = r.answer_id);
    return responses;
  } catch (error) {
    console.error("Error loading responses:", error);
    return {};
  }
}

// ===== CHECK SUBMISSION =====
async function checkIfAlreadySubmitted(userId, assessmentId) {
  try {
    const { data, error } = await supabase
      .from("assessment_results")
      .select("id")
      .eq("user_id", userId)
      .eq("assessment_id", assessmentId)
      .eq("status", "completed")
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error checking completion:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in checkIfAlreadySubmitted:", error);
    return false;
  }
}

// ===== MARK AS SUBMITTED =====
async function markAsSubmitted(userId, assessmentId) {
  try {
    const response = await fetch('/api/submit-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment_id: assessmentId, user_id: userId })
    });

    const result = await response.json();
    
    if (!response.ok) {
      if (result.error?.includes("already submitted")) {
        return true;
      }
      throw new Error(result.error || 'Submission failed');
    }

    return true;
  } catch (error) {
    console.error("Failed to submit assessment:", error);
    throw error;
  }
}

export default function AssessmentPage() {
  const router = useRouter();
  const { id: assessmentId } = router.query;

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [saveStatus, setSaveStatus] = useState({});
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(10800); // 180 minutes fixed

  // ===== FETCH ASSESSMENT DETAILS - FORCED 180 MINS =====
  useEffect(() => {
    const fetchAssessmentDetails = async () => {
      if (!assessmentId || !isSessionReady || alreadySubmitted) return;
      
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("*")
          .eq("id", assessmentId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setAssessment(data);
          // FORCE 180 MINUTES FOR ALL ASSESSMENT TYPES - OVERRIDE DATABASE
          setTimeLimitSeconds(10800); // 180 minutes = 10800 seconds
          document.title = `${data.name} - Stratavax Assessment`;
        }
      } catch (error) {
        console.error("Error fetching assessment details:", error);
      }
    };
    
    fetchAssessmentDetails();
  }, [assessmentId, isSessionReady, alreadySubmitted]);

  // ===== INITIALIZE SESSION =====
  useEffect(() => {
    const initSessionAndCheck = async () => {
      if (!assessmentId) return;
      
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          
          const hasSubmitted = await checkIfAlreadySubmitted(data.session.user.id, assessmentId);
          if (hasSubmitted) {
            setAlreadySubmitted(true);
            localStorage.setItem(`assessment_submitted_${assessmentId}`, 'true');
            setError("You have already submitted this assessment. One attempt only allowed.");
            setLoading(false);
            return;
          }
          
          setIsSessionReady(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Session init error:", error);
        setError("Failed to initialize session");
        setLoading(false);
      }
    };
    initSessionAndCheck();
  }, [assessmentId, router]);

  // ===== FETCH QUESTIONS =====
  useEffect(() => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId) return;

    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            answers!inner (id, answer_text, score)
          `)
          .eq("assessment_id", assessmentId)
          .order("id");

        if (questionsError) throw new Error(`Failed to load questions: ${questionsError.message}`);
        if (!questionsData || questionsData.length === 0) throw new Error("Assessment questions not found.");

        const savedAnswers = await loadUserResponses(session.user.id, assessmentId);

        const processedQuestions = questionsData.map(q => {
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            options: q.answers.map(a => ({ ...a, id: parseInt(a.id) }))
          };
          
          // Randomize answers for manufacturing sections
          if (q.section === 'Bottled Water Manufacturing' || 
              q.section === 'Blowing Machines' ||
              q.section === 'Labeler' ||
              q.section === 'Filling' ||
              q.section === 'Conveyors' ||
              q.section === 'Stretchwrappers' ||
              q.section === 'Shrinkwrappers' ||
              q.section === 'Date Coders' ||
              q.section === 'Raw Materials') {
            return { ...baseQuestion, options: trulyRandomizeAnswers(baseQuestion.options) };
          }
          
          return baseQuestion;
        });

        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
        setError(null);
      } catch (error) {
        console.error("Assessment loading error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId, isSessionReady, session?.user?.id, alreadySubmitted]);

  // ===== TIMER =====
  useEffect(() => {
    if (alreadySubmitted || !session?.user?.id || !isSessionReady || !assessmentId || !assessment) return;

    let timerInterval;
    let localElapsed = 0;
    let isMounted = true;
    
    const initializeTimer = async () => {
      try {
        const savedElapsed = await startOrResumeTimer(session.user.id, assessmentId);
        
        if (!isMounted) return;
        
        localElapsed = savedElapsed;
        setElapsed(savedElapsed);
        setTimerLoaded(true);
        
        timerInterval = setInterval(async () => {
          if (!isMounted) return;
          
          localElapsed += 1;
          setElapsed(localElapsed);
          
          if (localElapsed % 30 === 0) {
            await saveTimerProgress(session.user.id, assessmentId, localElapsed);
          }
          
          if (localElapsed >= timeLimitSeconds) {
            clearInterval(timerInterval);
            if (!alreadySubmitted && isMounted) {
              await submitAssessment();
            }
          }
        }, 1000);
      } catch
