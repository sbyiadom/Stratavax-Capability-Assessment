// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== SECTION CONFIGURATIONS WITH BACKGROUND IMAGES =====
const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    lightBg: 'rgba(74, 111, 165, 0.1)', 
    icon: '🧠', 
    bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
    description: 'Measuring analytical thinking, memory, and logical reasoning'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    lightBg: 'rgba(156, 39, 176, 0.1)', 
    icon: '😊', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/always-grey.png',
    description: 'Evaluating traits, behaviors, and interpersonal dynamics'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    lightBg: 'rgba(211, 47, 47, 0.1)', 
    icon: '👑', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/dark-mosaic.png',
    description: 'Assessing vision, influence, and team development'
  },
  'Bottled Water Manufacturing': { 
    color: '#388E3C', 
    lightBg: 'rgba(56, 142, 60, 0.1)', 
    icon: '⚙️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
    description: 'Testing knowledge of manufacturing equipment and processes'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    lightBg: 'rgba(245, 124, 0, 0.1)', 
    icon: '📊', 
    bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/graphy.png',
    description: 'Evaluating KPI achievement and results orientation'
  },
  'Adaptability & Flexibility': { 
    color: '#FF6B6B', 
    lightBg: 'rgba(255, 107, 107, 0.1)', 
    icon: '🔄', 
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/light-wool.png',
    description: 'Handling change, ambiguity, and new situations'
  },
  'Emotional Intelligence': { 
    color: '#4ECDC4', 
    lightBg: 'rgba(78, 205, 196, 0.1)', 
    icon: '🧘', 
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
    description: 'Self-awareness, empathy, and social skills'
  },
  'Communication Skills': { 
    color: '#45B7D1', 
    lightBg: 'rgba(69, 183, 209, 0.1)', 
    icon: '💬', 
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/white-diamond.png',
    description: 'Verbal, written, and active listening abilities'
  },
  'Teamwork & Collaboration': { 
    color: '#96CEB4', 
    lightBg: 'rgba(150, 206, 180, 0.1)', 
    icon: '🤝', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cardboard.png',
    description: 'Working with others and resolving conflicts'
  },
  'Initiative & Proactivity': { 
    color: '#FFEAA7', 
    lightBg: 'rgba(255, 234, 167, 0.1)', 
    icon: '⚡', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/light-honeycomb.png',
    description: 'Taking ownership and going above and beyond'
  },
  'Time Management': { 
    color: '#DDA0DD', 
    lightBg: 'rgba(221, 160, 221, 0.1)', 
    icon: '⏰', 
    bgImage: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/diamond-upholstery.png',
    description: 'Prioritizing tasks and meeting deadlines'
  },
  'Resilience': { 
    color: '#F08A5D', 
    lightBg: 'rgba(240, 138, 93, 0.1)', 
    icon: '💪', 
    bgImage: 'https://images.unsplash.com/photo-1552674605-db6a2c6a7a7e?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/wood-pattern.png',
    description: 'Bouncing back from setbacks and stress'
  },
  'Problem-Solving': { 
    color: '#6A4C93', 
    lightBg: 'rgba(106, 76, 147, 0.1)', 
    icon: '🔍', 
    bgImage: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/stardust.png',
    description: 'Identifying and resolving complex issues'
  },
  'Critical Thinking': { 
    color: '#1982C4', 
    lightBg: 'rgba(25, 130, 196, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/brick-wall.png',
    description: 'Analyzing information and making sound decisions'
  },
  'Learning Agility': { 
    color: '#8AC926', 
    lightBg: 'rgba(138, 201, 38, 0.1)', 
    icon: '📚', 
    bgImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/45-degree-fabric-light.png',
    description: 'Quickly learning and adapting to new information'
  },
  'Creativity & Innovation': { 
    color: '#FFCA3A', 
    lightBg: 'rgba(255, 202, 58, 0.1)', 
    icon: '💡', 
    bgImage: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/confetti.png',
    description: 'Thinking outside the box and generating ideas'
  },
  'Core Values Alignment': { 
    color: '#9C89B8', 
    lightBg: 'rgba(156, 137, 184, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
    description: 'Acting in accordance with company ethics'
  },
  'Organizational Citizenship': { 
    color: '#F0A6CA', 
    lightBg: 'rgba(240, 166, 202, 0.1)', 
    icon: '🤲', 
    bgImage: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cross-scratches.png',
    description: 'Supporting colleagues beyond formal duties'
  },
  'Reliability & Dependability': { 
    color: '#B8F2E6', 
    lightBg: 'rgba(184, 242, 230, 0.1)', 
    icon: '✓', 
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/checkerboard.png',
    description: 'Consistent punctuality and work output'
  },
  'Customer Focus': { 
    color: '#A9D6E5', 
    lightBg: 'rgba(169, 214, 229, 0.1)', 
    icon: '👥', 
    bgImage: 'https://images.unsplash.com/photo-1556740714-a8395b3bf30f?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/white-diamond.png',
    description: 'Empathy and dedication to client needs'
  },
  'Safety Awareness': { 
    color: '#FCA17D', 
    lightBg: 'rgba(252, 161, 125, 0.1)', 
    icon: '⚠️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/warning.png',
    description: 'Adherence to safety protocols'
  },
  'Commercial Awareness': { 
    color: '#86A788', 
    lightBg: 'rgba(134, 167, 136, 0.1)', 
    icon: '💰', 
    bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/money.png',
    description: 'Understanding industry and business model'
  },
  'Blowing Machines': { 
    color: '#3D5A80', 
    lightBg: 'rgba(61, 90, 128, 0.1)', 
    icon: '💨', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
    description: 'PET preform heating and bottle forming'
  },
  'Labeler': { 
    color: '#EE6C4D', 
    lightBg: 'rgba(238, 108, 77, 0.1)', 
    icon: '🏷️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/label.png',
    description: 'Pressure-sensitive and shrink sleeve application'
  },
  'Filling': { 
    color: '#98C1D9', 
    lightBg: 'rgba(152, 193, 217, 0.1)', 
    icon: '💧', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/water.png',
    description: 'Volumetric filling and CIP sanitation'
  },
  'Conveyors': { 
    color: '#293241', 
    lightBg: 'rgba(41, 50, 65, 0.1)', 
    icon: '📦', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/concrete.png',
    description: 'Air conveyors and accumulation tables'
  },
  'Stretchwrappers': { 
    color: '#E0FBFC', 
    lightBg: 'rgba(224, 251, 252, 0.1)', 
    icon: '🔄', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/stretch.png',
    description: 'Film pre-stretch and pallet stabilization'
  },
  'Shrinkwrappers': { 
    color: '#C81D25', 
    lightBg: 'rgba(200, 29, 37, 0.1)', 
    icon: '🔥', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/heat.png',
    description: 'Heat tunnels and film contraction'
  },
  'Date Coders': { 
    color: '#725AC1', 
    lightBg: 'rgba(114, 90, 193, 0.1)', 
    icon: '📅', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/code.png',
    description: 'CIJ printers and thermal transfer'
  },
  'Raw Materials': { 
    color: '#5D576B', 
    lightBg: 'rgba(93, 87, 107, 0.1)', 
    icon: '🧪', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/material.png',
    description: 'PET properties and rPET sustainability'
  },
  'Vision & Strategic Thinking': { 
    color: '#FFB347', 
    lightBg: 'rgba(255, 179, 71, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/strategy.png',
    description: 'Setting direction and long-term planning'
  },
  'Team Development': { 
    color: '#5F9EA0', 
    lightBg: 'rgba(95, 158, 160, 0.1)', 
    icon: '🌱', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/growth.png',
    description: 'Coaching and building team capabilities'
  },
  'Decision-Making': { 
    color: '#C23B22', 
    lightBg: 'rgba(194, 59, 34, 0.1)', 
    icon: '⚖️', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/decision.png',
    description: 'Making sound judgments under uncertainty'
  },
  'Influence': { 
    color: '#6B5B95', 
    lightBg: 'rgba(107, 91, 149, 0.1)', 
    icon: '🗣️', 
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/influence.png',
    description: 'Persuading and building stakeholder buy-in'
  },
  'Leadership EQ': { 
    color: '#88B04B', 
    lightBg: 'rgba(136, 176, 75, 0.1)', 
    icon: '💖', 
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/eq.png',
    description: 'Empathy and social awareness in leadership'
  },
  'Conflict Resolution': { 
    color: '#FF6F61', 
    lightBg: 'rgba(255, 111, 97, 0.1)', 
    icon: '🤝', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/conflict.png',
    description: 'Mediating disputes and finding common ground'
  },
  'Delegation': { 
    color: '#92A8D1', 
    lightBg: 'rgba(146, 168, 209, 0.1)', 
    icon: '📤', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/delegate.png',
    description: 'Empowering others and distributing work'
  },
  'Leadership Integrity': { 
    color: '#955251', 
    lightBg: 'rgba(149, 82, 81, 0.1)', 
    icon: '🛡️', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/integrity.png',
    description: 'Ethical courage and role modeling'
  },
  'Innovation Leadership': { 
    color: '#B565A7', 
    lightBg: 'rgba(181, 101, 167, 0.1)', 
    icon: '💫', 
    bgImage: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/innovation.png',
    description: 'Fostering creativity and change'
  }
};

// ===== TIMER FUNCTIONS =====
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
  if (typeof window === 'undefined') return;
  
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
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(10800);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);
  const [expectedQuestionCount, setExpectedQuestionCount] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // ===== FETCH ASSESSMENT DETAILS =====
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
          setTimeLimitSeconds(10800);
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

  // ===== FETCH QUESTIONS - FIXED VERSION - REMOVED answers!inner =====
  useEffect(() => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId || fetchAttempted) {
      return;
    }

    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        setFetchAttempted(true);
        
        console.log(`🔍 Fetching questions for assessment: ${assessmentId}`);
        
        // First, check total question count
        const { count, error: countError } = await supabase
          .from("questions")
          .select("*", { count: 'exact', head: true })
          .eq("assessment_id", assessmentId);
        
        if (countError) throw countError;
        
        setExpectedQuestionCount(count);
        console.log(`📊 Expected ${count} questions for assessment ${assessmentId}`);
        
        // ===== CRITICAL FIX: REMOVED !inner FROM answers =====
        // This was the bug! answers!inner was filtering out questions without answers
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            section,
            subsection,
            question_order,
            answers (
              id, 
              answer_text, 
              score
            )
          `)
          .eq("assessment_id", assessmentId)
          .order("question_order", { ascending: true })
          .order("id", { ascending: true });

        if (questionsError) {
          console.error("Questions fetch error:", questionsError);
          throw new Error(`Failed to load questions: ${questionsError.message}`);
        }
        
        console.log(`✅ Raw questions data:`, questionsData);
        
        // Verify we got all questions
        if (!questionsData || questionsData.length === 0) {
          throw new Error("No questions found for this assessment.");
        }
        
        console.log(`📋 Received ${questionsData.length} questions`);
        
        if (count && questionsData.length !== count) {
          console.warn(`⚠️ Expected ${count} questions but got ${questionsData.length}.`);
        }

        // Load saved answers
        const savedAnswers = await loadUserResponses(session.user.id, assessmentId);
        console.log(`💾 Loaded ${Object.keys(savedAnswers).length} saved answers`);

        // Process questions with proper randomization
        const manufacturingSections = [
          'Bottled Water Manufacturing',
          'Blowing Machines',
          'Labeler',
          'Filling',
          'Conveyors',
          'Stretchwrappers',
          'Shrinkwrappers',
          'Date Coders',
          'Raw Materials'
        ];

        const processedQuestions = questionsData.map((q, index) => {
          // Ensure answers array exists and has items
          const options = q.answers && Array.isArray(q.answers) && q.answers.length > 0
            ? q.answers.map(a => ({ 
                ...a, 
                id: parseInt(a.id),
                answer_text: a.answer_text || 'Option text missing'
              }))
            : [];
          
          const baseQuestion = {
            ...q,
            id: parseInt(q.id),
            question_number: index + 1,
            options: options
          };
          
          // Randomize answers for manufacturing sections
          if (manufacturingSections.includes(q.section)) {
            return { 
              ...baseQuestion, 
              options: trulyRandomizeAnswers([...baseQuestion.options]) 
            };
          }
          
          return baseQuestion;
        });

        console.log(`🎯 Processed ${processedQuestions.length} questions successfully`);
        setQuestions(processedQuestions);
        setAnswers(savedAnswers);
        setError(null);
        
        // Set current index to first unanswered question if any
        const firstUnanswered = processedQuestions.findIndex(q => !savedAnswers[q.id]);
        if (firstUnanswered > 0) {
          setCurrentIndex(firstUnanswered);
        }
        
      } catch (error) {
        console.error("❌ Assessment loading error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [assessmentId, isSessionReady, session?.user?.id, alreadySubmitted, fetchAttempted]);

  // ===== TIMER =====
  useEffect(() => {
    if (alreadySubmitted || !session?.user?.id || !isSessionReady || !assessmentId || !assessment || questions.length === 0) return;

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
      } catch (error) {
        console.error("Failed to initialize timer:", error);
      }
    };

    initializeTimer();

    const handleBeforeUnload = () => {
      if (session?.user?.id && localElapsed > 0) {
        saveTimerProgress(session.user.id, assessmentId, localElapsed);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(timerInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [alreadySubmitted, session?.user?.id, isSessionReady, assessmentId, assessment, questions.length, timeLimitSeconds]);

  // ===== ANTI-CHEAT =====
  useEffect(() => {
    if (!alreadySubmitted && !loading && isSessionReady && questions.length > 0) {
      setupAntiCheatProtection();
    }
  }, [alreadySubmitted, loading, isSessionReady, questions.length]);

  // ===== HANDLE ANSWER SELECTION =====
  const handleSelect = async (questionId, answerId) => {
    if (alreadySubmitted || !isSessionReady || !session?.user?.id || !assessmentId) return;

    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setSaveStatus(prev => ({ ...prev, [questionId]: "saving" }));

    try {
      await saveResponse(assessmentId, questionId, answerId, session.user.id);
      setSaveStatus(prev => ({ ...prev, [questionId]: "saved" }));
      
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[questionId];
          return newStatus;
        });
      }, 1500);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus(prev => ({ ...prev, [questionId]: "error" }));
    }
  };

  // ===== NAVIGATION =====
  const handleNext = () => {
    if (alreadySubmitted) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleBack = () => {
    if (alreadySubmitted) return;
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  // ===== SUBMIT ASSESSMENT =====
  const submitAssessment = async () => {
    if (alreadySubmitted || !session?.user?.id || !assessmentId) return;

    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    try {
      await markAsSubmitted(session.user.id, assessmentId);
      await markTimerAsCompleted(session.user.id, assessmentId);
      
      setAlreadySubmitted(true);
      localStorage.setItem(`assessment_submitted_${assessmentId}`, 'true');
      
      setShowSuccessModal(true);
      
      setTimeout(() => {
        router.push('/assessment/pre');
      }, 3000);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed. Please contact support.");
      setIsSubmitting(false);
    }
  };

  // ===== RETRY FETCH =====
  const handleRetry = () => {
    setFetchAttempted(false);
    setQuestions([]);
    setError(null);
    setLoading(true);
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingOverlay} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>🏢 Stratavax</div>
          <div style={styles.loadingSpinner} />
          <div style={styles.loadingTitle}>{assessment?.name || 'Loading Assessment...'}</div>
          <div style={styles.loadingSubtitle}>
            {expectedQuestionCount 
              ? `Loading ${expectedQuestionCount} questions...` 
              : 'Preparing your questions. This will only take a moment.'}
          </div>
          {fetchAttempted && questions.length === 0 && (
            <button
              onClick={handleRetry}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '30px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Retry Loading
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== ALREADY SUBMITTED =====
  if (alreadySubmitted) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorOverlay} />
        <div style={styles.errorCard}>
          <div style={styles.successIcon}>✅</div>
          <h2 style={styles.errorTitle}>Assessment Already Completed</h2>
          <p style={styles.errorText}>
            You have already submitted this assessment. Each assessment can only be taken once.
          </p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={styles.primaryButton}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            ← Return to Assessment Selection
          </button>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorOverlay} />
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>
            {error.includes("already submitted") ? "Already Submitted" : "Error Loading Assessment"}
          </h2>
          <p style={styles.errorText}>{error}</p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={handleRetry}
              style={{
                ...styles.primaryButton,
                background: 'linear-gradient(135deg, #ff9800, #f57c00)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => router.push('/assessment/pre')}
              style={{
                ...styles.primaryButton,
                background: 'linear-gradient(135deg, #64748b, #475569)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorOverlay} />
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>📭</div>
          <h2 style={styles.errorTitle}>No Questions Available</h2>
          <p style={styles.errorText}>
            This assessment doesn't have any questions yet. Please contact support.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={handleRetry}
              style={{
                ...styles.primaryButton,
                background: 'linear-gradient(135deg, #ff9800, #f57c00)'
              }}
            >
              🔄 Retry
            </button>
            <button
              onClick={() => router.push('/assessment/pre')}
              style={{
                ...styles.primaryButton,
                background: 'linear-gradient(135deg, #64748b, #475569)'
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  
  if (!currentQuestion) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorOverlay} />
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>❓</div>
          <h2 style={styles.errorTitle}>Question Not Found</h2>
          <p style={styles.errorText}>
            Unable to load question {currentIndex + 1}. Please try again.
          </p>
          <button
            onClick={handleRetry}
            style={styles.primaryButton}
          >
            Reload Assessment
          </button>
        </div>
      </div>
    );
  }

  const currentSection = currentQuestion?.section || 'General';
  const sectionConfig = SECTION_CONFIG[currentSection] || {
    color: '#4A6FA5',
    lightBg: 'rgba(74, 111, 165, 0.1)',
    icon: '📝',
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
    description: 'Assessment question'
  };

  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;
  const isLastQuestion = currentIndex === questions.length - 1;

  // Time calculations
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsed);
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const formatTime = (t) => t.toString().padStart(2, '0');

  const timeUsedPercentage = (elapsed / timeLimitSeconds) * 100;
  const isTimeWarning = timeUsedPercentage > 80;
  const isTimeCritical = timeUsedPercentage > 90;

  return (
    <>
      {/* Submit Modal */}
      {showSubmitModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIcon}>📋</div>
            <h2 style={styles.modalTitle}>Final Submission</h2>
            <div style={styles.modalBody}>
              <div style={styles.modalStats}>
                <div style={styles.modalStat}>
                  <span style={styles.modalStatLabel}>Questions Answered</span>
                  <span style={{...styles.modalStatValue, color: '#4caf50'}}>{totalAnswered}/{questions.length}</span>
                </div>
                <div style={styles.modalStat}>
                  <span style={styles.modalStatLabel}>Completion Rate</span>
                  <span style={{...styles.modalStatValue, color: '#2196f3'}}>{progressPercentage}%</span>
                </div>
                <div style={styles.modalStat}>
                  <span style={styles.modalStatLabel}>Time Used</span>
                  <span style={{
                    ...styles.modalStatValue,
                    color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#4caf50'
                  }}>
                    {formatTime(Math.floor(elapsed / 3600))}:{formatTime(Math.floor((elapsed % 3600) / 60))}:{formatTime(elapsed % 60)}
                  </span>
                </div>
              </div>
              <div style={styles.modalWarning}>
                <span style={styles.modalWarningIcon}>⚠️</span>
                <div>
                  <strong>One attempt only:</strong> After submission, you cannot retake this assessment.
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                onClick={() => setShowSubmitModal(false)} 
                style={styles.modalSecondaryButton}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                Continue
              </button>
              <button 
                onClick={submitAssessment} 
                disabled={isSubmitting} 
                style={styles.modalPrimaryButton}
                onMouseOver={(e) => !isSubmitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !isSubmitting && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, textAlign: 'center'}}>
            <div style={styles.successIconLarge}>✓</div>
            <h2 style={{...styles.modalTitle, color: '#2e7d32'}}>Assessment Complete! 🎉</h2>
            <div style={styles.modalBody}>
              <p style={styles.successText}>
                Your {assessment?.name || 'assessment'} has been successfully submitted.
              </p>
              <div style={styles.successRedirect}>
                <div style={styles.loadingDots}>
                  <span>.</span><span>.</span><span>.</span>
                </div>
                <p style={styles.redirectText}>Redirecting to assessment selection...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Assessment Layout */}
      <div style={styles.container}>
        {/* Background Pattern */}
        <div style={styles.backgroundPattern} />
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button
                onClick={() => router.push('/assessment/pre')}
                style={styles.backButton}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Back to Assessment Selection"
              >
                ←
              </button>
              
              <div style={styles.headerIcon}>
                {sectionConfig.icon}
              </div>
              
              <div style={styles.headerInfo}>
                <div style={styles.headerTitle}>
                  {assessment?.name || 'Assessment'}
                </div>
                <div style={styles.headerMeta}>
                  <span style={styles.headerQuestion}>
                    Q{currentIndex + 1}/{questions.length}
                  </span>
                  <span style={styles.headerDivider}>•</span>
                  <span style={styles.headerSection}>
                    {currentSection}
                  </span>
                  {questions.length === 100 && (
                    <>
                      <span style={styles.headerDivider}>•</span>
                      <span style={{...styles.headerRandomized, background: 'rgba(76,175,80,0.2)', color: '#4caf50'}}>
                        ✅ 100 Questions
                      </span>
                    </>
                  )}
                  {expectedQuestionCount && expectedQuestionCount !== questions.length && (
                    <>
                      <span style={styles.headerDivider}>•</span>
                      <span style={{...styles.headerRandomized, background: 'rgba(255,152,0,0.2)', color: '#ff9800'}}>
                        ⚠️ Expected {expectedQuestionCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Timer */}
            <div style={{
              ...styles.timer,
              borderColor: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#2196f3',
              background: isTimeCritical 
                ? 'linear-gradient(135deg, rgba(211,47,47,0.1), rgba(211,47,47,0.05))'
                : isTimeWarning
                  ? 'linear-gradient(135deg, rgba(255,152,0,0.1), rgba(255,152,0,0.05))'
                  : 'linear-gradient(135deg, rgba(33,150,243,0.1), rgba(33,150,243,0.05))'
            }}>
              <div style={styles.timerLabel}>
                <span style={styles.timerIcon}>⏱️</span>
                TIME REMAINING
              </div>
              <div style={{
                ...styles.timerValue,
                color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#1565c0'
              }}>
                {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
              </div>
              <div style={styles.timerFixed}>
                180 minutes fixed
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Cheat Banner */}
        <div style={styles.antiCheat}>
          <span style={styles.antiCheatIcon}>🛡️</span>
          <span>Anti-cheat active: Right-click, copy/paste, and text selection disabled</span>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressFill,
              width: `${progressPercentage}%`,
              background: `linear-gradient(90deg, ${sectionConfig.color}, ${sectionConfig.color}dd)`
            }} />
          </div>
          <div style={styles.progressStats}>
            <span style={styles.progressAnswered}>
              <span style={{color: sectionConfig.color, fontWeight: '700'}}>{totalAnswered}</span> answered
            </span>
            <span style={styles.progressRemaining}>
              <span style={{color: '#64748b', fontWeight: '700'}}>{questions.length - totalAnswered}</span> remaining
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Question Panel */}
          <div style={styles.questionPanel}>
            <div style={{
              ...styles.questionBackground,
              backgroundImage: `url(${sectionConfig.bgImage})`,
            }} />
            <div style={{
              ...styles.questionOverlay,
              background: `linear-gradient(135deg, ${sectionConfig.color}15, ${sectionConfig.color}05)`
            }} />
            <div style={styles.questionPattern} />
            
            <div style={styles.questionContent}>
              <div style={styles.sectionBadge}>
                <div style={{
                  ...styles.sectionIcon,
                  background: `linear-gradient(135deg, ${sectionConfig.color}, ${sectionConfig.color}dd)`,
                  boxShadow: `0 8px 16px ${sectionConfig.color}40`
                }}>
                  {sectionConfig.icon}
                </div>
                <div>
                  <div style={styles.sectionName}>{currentSection}</div>
                  <div style={styles.sectionDescription}>{sectionConfig.description}</div>
                </div>
              </div>

              <div style={styles.questionText}>
                <span style={{...styles.questionNumber, color: sectionConfig.color}}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <div style={styles.questionContent}>
                  {currentQuestion?.question_text}
                </div>
              </div>

              {saveStatus[currentQuestion?.id] && (
                <div style={{
                  ...styles.saveStatus,
                  background: saveStatus[currentQuestion.id] === 'saved' 
                    ? 'linear-gradient(135deg, rgba(76,175,80,0.1), rgba(76,175,80,0.05))'
                    : 'linear-gradient(135deg, rgba(255,152,0,0.1), rgba(255,152,0,0.05))',
                  borderColor: saveStatus[currentQuestion.id] === 'saved' 
                    ? '#4caf50' 
                    : '#ff9800',
                  color: saveStatus[currentQuestion.id] === 'saved' 
                    ? '#2e7d32' 
                    : '#f57c00'
                }}>
                  <div style={{
                    ...styles.saveStatusIcon,
                    background: saveStatus[currentQuestion.id] === 'saved' 
                      ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
                      : 'linear-gradient(135deg, #ff9800, #f57c00)'
                  }}>
                    {saveStatus[currentQuestion.id] === 'saved' ? '✓' : '⏳'}
                  </div>
                  <span>
                    {saveStatus[currentQuestion.id] === 'saved' 
                      ? 'Answer saved successfully' 
                      : 'Saving your answer...'}
                  </span>
                </div>
              )}

              <div style={styles.answersContainer}>
                {currentQuestion?.options?.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  const optionLetter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveStatus[currentQuestion.id] === 'saving' || alreadySubmitted}
                      style={{
                        ...styles.answerButton,
                        background: isSelected 
                          ? `linear-gradient(135deg, ${sectionConfig.color}15, ${sectionConfig.color}05)`
                          : 'white',
                        borderColor: isSelected ? sectionConfig.color : '#e2e8f0',
                        boxShadow: isSelected 
                          ? `0 8px 20px ${sectionConfig.color}30`
                          : '0 2px 4px rgba(0,0,0,0.02)',
                        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected && !saveStatus[currentQuestion.id] && !alreadySubmitted) {
                          e.currentTarget.style.borderColor = sectionConfig.color;
                          e.currentTarget.style.background = `${sectionConfig.color}05`;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected && !saveStatus[currentQuestion.id] && !alreadySubmitted) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div style={{
                        ...styles.answerLetter,
                        background: isSelected 
                          ? `linear-gradient(135deg, ${sectionConfig.color}, ${sectionConfig.color}dd)`
                          : '#f1f5f9',
                        color: isSelected ? 'white' : '#64748b',
                        boxShadow: isSelected ? `0 4px 8px ${sectionConfig.color}40` : 'none'
                      }}>
                        {optionLetter}
                      </div>
                      <span style={styles.answerText}>{option.answer_text}</span>
                    </button>
                  );
                })}
              </div>

              <div style={styles.navigation}>
                <button 
                  onClick={handleBack} 
                  disabled={currentIndex === 0 || alreadySubmitted}
                  style={{
                    ...styles.navButton,
                    background: currentIndex === 0 || alreadySubmitted 
                      ? '#f1f5f9' 
                      : `linear-gradient(135deg, ${sectionConfig.color}, ${sectionConfig.color}dd)`,
                    color: currentIndex === 0 || alreadySubmitted ? '#94a3b8' : 'white',
                    cursor: currentIndex === 0 || alreadySubmitted ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 || alreadySubmitted ? 0.6 : 1
                  }}
                >
                  ← Previous
                </button>
                
                <div style={styles.navigationInfo}>
                  <div style={styles.navigationCounter}>
                    {currentIndex + 1} <span style={styles.navigationTotal}>/ {questions.length}</span>
                  </div>
                  <div style={{
                    ...styles.navigationProgress,
                    color: sectionConfig.color,
                    background: `${sectionConfig.color}10`
                  }}>
                    {progressPercentage}% Complete
                  </div>
                </div>
                
                {isLastQuestion ? (
                  <button 
                    onClick={() => setShowSubmitModal(true)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.navButton,
                      background: alreadySubmitted 
                        ? '#f1f5f9' 
                        : 'linear-gradient(135deg, #4caf50, #2e7d32)',
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                  >
                    Submit Assessment
                  </button>
                ) : (
                  <button 
                    onClick={handleNext} 
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.navButton,
                      background: alreadySubmitted 
                        ? '#f1f5f9' 
                        : `linear-gradient(135deg, ${sectionConfig.color}, ${sectionConfig.color}dd)`,
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigator Panel */}
          <div style={styles.navigatorPanel}>
            <div style={styles.navigatorHeader}>
              <span style={styles.navigatorIcon}>📋</span>
              <h3 style={styles.navigatorTitle}>Question Navigator</h3>
            </div>
            
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: '#4caf50'}}>{totalAnswered}</div>
                <div style={styles.statLabel}>Answered</div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: '#64748b'}}>{questions.length - totalAnswered}</div>
                <div style={styles.statLabel}>Remaining</div>
              </div>
              <div style={styles.statCard}>
                <div style={{...styles.statValue, color: '#2196f3'}}>{progressPercentage}%</div>
                <div style={styles.statLabel}>Complete</div>
              </div>
            </div>

            <div style={styles.timerProgress}>
              <div style={styles.timerProgressHeader}>
                <span style={styles.timerProgressIcon}>⏰</span>
                <span style={styles.timerProgressLabel}>180 Minutes Fixed</span>
                <span style={{
                  ...styles.timerProgressValue,
                  color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#2196f3'
                }}>
                  {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
                </span>
              </div>
              <div style={styles.timerProgressBar}>
                <div style={{
                  ...styles.timerProgressFill,
                  width: `${(elapsed / timeLimitSeconds) * 100}%`,
                  background: isTimeCritical 
                    ? 'linear-gradient(90deg, #d32f2f, #b71c1c)'
                    : isTimeWarning
                      ? 'linear-gradient(90deg, #ff9800, #f57c00)'
                      : 'linear-gradient(90deg, #2196f3, #1976d2)'
                }} />
              </div>
              <div style={styles.timerProgressStats}>
                <span>{formatTime(Math.floor(elapsed / 3600))}:{formatTime(Math.floor((elapsed % 3600) / 60))}:{formatTime(elapsed % 60)} used</span>
                <span>{Math.round((elapsed / timeLimitSeconds) * 100)}%</span>
              </div>
            </div>

            <div style={styles.questionGrid}>
              {questions.map((q, index) => {
                const isAnswered = answers[q.id];
                const isCurrent = index === currentIndex;
                const isHovered = hoveredQuestion === index;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => !alreadySubmitted && setCurrentIndex(index)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.gridItem,
                      background: isCurrent 
                        ? `linear-gradient(135deg, ${sectionConfig.color}, ${sectionConfig.color}dd)`
                        : isAnswered 
                          ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
                          : 'white',
                      color: isCurrent || isAnswered ? 'white' : '#1e293b',
                      borderColor: isCurrent 
                        ? sectionConfig.color 
                        : isAnswered 
                          ? '#4caf50' 
                          : '#e2e8f0',
                      transform: isHovered && !alreadySubmitted ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isHovered && !alreadySubmitted 
                        ? `0 8px 16px ${sectionConfig.color}40`
                        : 'none'
                    }}
                    onMouseEnter={() => setHoveredQuestion(index)}
                    onMouseLeave={() => setHoveredQuestion(null)}
                    title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ' (Not answered)'}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{...styles.legendDot, background: '#4caf50'}} />
                <span>Answered</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{...styles.legendDot, background: sectionConfig.color}} />
                <span>Current</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{...styles.legendDot, background: 'white', border: '2px solid #e2e8f0'}} />
                <span>Pending</span>
              </div>
              <div style={styles.legendItem}>
                <span style={styles.legendIcon}>⏱️</span>
                <span>180 min</span>
              </div>
            </div>

            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: questions.length === 100 ? '#e8f5e9' : '#fff3e0',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${questions.length === 100 ? '#4caf50' : '#ff9800'}`,
              color: questions.length === 100 ? '#2e7d32' : '#f57c00',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {questions.length === 100 
                ? '✅ All 100 questions loaded successfully' 
                : `⚠️ Loaded ${questions.length} of 100 questions`}
            </div>

            <button
              onClick={() => router.push('/assessment/pre')}
              style={styles.backToSelection}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = sectionConfig.color;
                e.currentTarget.style.color = sectionConfig.color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <span style={styles.backIcon}>←</span>
              Back to Assessment Selection
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
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
      `}</style>
    </>
  );
}

// ===== STYLES =====
const styles = {
  loadingContainer: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a2639 0%, #2d3748 100%)',
    overflow: 'hidden'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    filter: 'blur(10px)'
  },
  loadingContent: {
    position: 'relative',
    textAlign: 'center',
    color: 'white',
    zIndex: 1,
    animation: 'slideIn 0.5s ease'
  },
  loadingLogo: {
    fontSize: '36px',
    fontWeight: '800',
    marginBottom: '30px',
    letterSpacing: '2px'
  },
  loadingSpinner: {
    width: '70px',
    height: '70px',
    border: '5px solid rgba(255,255,255,0.2)',
    borderTop: '5px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 30px'
  },
  loadingTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '15px'
  },
  loadingSubtitle: {
    fontSize: '16px',
    opacity: 0.9
  },
  errorContainer: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a2639 0%, #2d3748 100%)',
    padding: '20px'
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    filter: 'blur(10px)'
  },
  errorCard: {
    position: 'relative',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    padding: '50px',
    borderRadius: '32px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.5s ease'
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  errorTitle: {
    color: '#1a2639',
    marginBottom: '20px',
    fontSize: '28px',
    fontWeight: '700'
  },
  errorText: {
    color: '#64748b',
    marginBottom: '30px',
    fontSize: '16px',
    lineHeight: '1.6'
  },
  primaryButton: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 20px rgba(102,126,234,0.3)'
  },
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    position: 'relative',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://www.transparenttextures.com/patterns/cubes.png)',
    opacity: 0.05,
    pointerEvents: 'none'
  },
  header: {
    background: 'linear-gradient(135deg, #1a2639 0%, #2d3748 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)'
  },
  headerContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '20px',
    transition: 'all 0.2s ease'
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white'
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)'
  },
  headerQuestion: {
    fontWeight: '600'
  },
  headerDivider: {
    opacity: 0.5
  },
  headerSection: {
    fontWeight: '500'
  },
  headerRandomized: {
    padding: '2px 8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '20px',
    fontSize: '11px',
    fontStyle: 'italic'
  },
  timer: {
    padding: '10px 20px',
    borderRadius: '40px',
    textAlign: 'center',
    border: '1px solid',
    minWidth: '180px',
    transition: 'all 0.3s ease'
  },
  timerLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '4px',
    letterSpacing: '1px'
  },
  timerIcon: {
    fontSize: '14px'
  },
  timerValue: {
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: 1.2,
    fontFamily: 'monospace'
  },
  timerFixed: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.6)',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  antiCheat: {
    background: 'linear-gradient(135deg, #ff9800, #f57c00)',
    color: 'white',
    textAlign: 'center',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderBottom: '2px solid #e65100'
  },
  antiCheatIcon: {
    fontSize: '16px'
  },
  progressContainer: {
    maxWidth: '1600px',
    margin: '20px auto 10px',
    padding: '0 24px'
  },
  progressTrack: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b'
  },
  progressAnswered: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  progressRemaining: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  mainContent: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '0 24px 40px',
    display: 'flex',
    gap: '30px'
  },
  questionPanel: {
    flex: 7,
    position: 'relative',
    background: 'white',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'slideIn 0.5s ease'
  },
  questionBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.1,
    transition: 'opacity 0.3s ease'
  },
  questionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: 'background 0.3s ease'
  },
  questionPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'url(https://www.transparenttextures.com/patterns/cubes.png)',
    opacity: 0.03,
    pointerEvents: 'none'
  },
  questionContent: {
    position: 'relative',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  sectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
    marginBottom: '10px'
  },
  sectionIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'white',
    transition: 'transform 0.3s ease'
  },
  sectionName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '4px'
  },
  sectionDescription: {
    fontSize: '13px',
    color: '#64748b'
  },
  questionText: {
    background: 'white',
    padding: '30px',
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9'
  },
  questionNumber: {
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    padding: '4px 12px',
    background: '#f8fafc',
    borderRadius: '20px'
  },
  questionContent: {
    fontSize: '20px',
    lineHeight: '1.6',
    color: '#1e293b',
    fontWeight: '500'
  },
  saveStatus: {
    padding: '12px 16px',
    border: '1px solid',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '500'
  },
  saveStatusIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '14px'
  },
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  answerButton: {
    padding: '20px 24px',
    border: '2px solid',
    borderRadius: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
    background: 'white',
    width: '100%'
  },
  answerLetter: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    flexShrink: 0,
    transition: 'all 0.2s ease'
  },
  answerText: {
    flex: 1,
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#334155'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '30px',
    borderTop: '2px solid #f1f5f9'
  },
  navButton: {
    padding: '14px 28px',
    border: 'none',
    borderRadius: '40px',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  navigationInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  navigationCounter: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b'
  },
  navigationTotal: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#64748b'
  },
  navigationProgress: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '6px 14px',
    borderRadius: '30px'
  },
  navigatorPanel: {
    flex: 3,
    background: 'white',
    borderRadius: '24px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '320px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
    animation: 'slideIn 0.5s ease'
  },
  navigatorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '20px',
    borderBottom: '2px solid #f1f5f9',
    marginBottom: '20px'
  },
  navigatorIcon: {
    fontSize: '24px'
  },
  navigatorTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    marginBottom: '25px'
  },
  statCard: {
    background: '#f8fafc',
    borderRadius: '14px',
    padding: '16px 8px',
    textAlign: 'center',
    border: '1px solid #f1f5f9'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: 1,
    marginBottom: '6px'
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  timerProgress: {
    background: '#f8fafc',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '25px',
    border: '1px solid #f1f5f9'
  },
  timerProgressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    fontSize: '13px',
    color: '#64748b',
    flexWrap: 'wrap'
  },
  timerProgressIcon: {
    fontSize: '16px'
  },
  timerProgressLabel: {
    fontWeight: '600',
    color: '#1e293b'
  },
  timerProgressValue: {
    marginLeft: 'auto',
    fontWeight: '700',
    fontFamily: 'monospace',
    fontSize: '16px'
  },
  timerProgressBar: {
    height: '8px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px'
  },
  timerProgressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  timerProgressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b'
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '8px',
    marginBottom: '25px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '5px'
  },
  gridItem: {
    aspectRatio: '1',
    border: '2px solid',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'white'
  },
  legend: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '2px solid #f1f5f9',
    marginBottom: '20px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    background: '#f8fafc',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#475569'
  },
  legendDot: {
    width: '16px',
    height: '16px',
    borderRadius: '5px'
  },
  legendIcon: {
    fontSize: '16px'
  },
  backToSelection: {
    marginTop: '10px',
    padding: '14px',
    background: 'white',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '40px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  backIcon: {
    fontSize: '18px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
    backdropFilter: 'blur(5px)',
    animation: 'fadeIn 0.3s ease'
  },
  modalContent: {
    background: 'white',
    padding: '40px',
    borderRadius: '32px',
    maxWidth: '550px',
    width: '100%',
    boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.3s ease'
  },
  modalIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  modalTitle: {
    margin: '0 0 15px 0',
    color: '#1a2639',
    fontSize: '28px',
    fontWeight: '700',
    textAlign: 'center'
  },
  modalBody: {
    margin: '30px 0'
  },
  modalStats: {
    background: '#f8fafc',
    borderRadius: '20px',
    padding: '25px',
    marginBottom: '20px',
    border: '1px solid #e3f2fd'
  },
  modalStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    fontSize: '16px'
  },
  modalStatLabel: {
    color: '#64748b',
    fontWeight: '500'
  },
  modalStatValue: {
    fontWeight: '700',
    fontSize: '18px'
  },
  modalWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#fff8e1',
    borderRadius: '14px',
    border: '1px solid #ffe082',
    color: '#856404',
    fontSize: '14px'
  },
  modalWarningIcon: {
    fontSize: '20px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '30px'
  },
  modalSecondaryButton: {
    padding: '14px 28px',
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '40px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'all 0.2s ease'
  },
  modalPrimaryButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    color: 'white',
    border: 'none',
    borderRadius: '40px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 16px rgba(76,175,80,0.3)'
  },
  successIconLarge: {
    width: '100px',
    height: '100px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 25px',
    fontSize: '50px',
    color: 'white',
    boxShadow: '0 20px 40px rgba(76,175,80,0.3)'
  },
  successText: {
    fontSize: '18px',
    color: '#1e293b',
    marginBottom: '20px',
    textAlign: 'center',
    lineHeight: '1.6'
  },
  successRedirect: {
    textAlign: 'center',
    marginTop: '20px'
  },
  loadingDots: {
    fontSize: '32px',
    color: '#2196f3',
    marginBottom: '10px',
    animation: 'pulse 1.5s ease infinite'
  },
  redirectText: {
    fontSize: '14px',
    color: '#64748b'
  }
};
