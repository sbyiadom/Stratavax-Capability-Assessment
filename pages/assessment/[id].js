// pages/assessment/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";

// ===== SECTION CONFIGURATIONS WITH ENHANCED BACKGROUND IMAGES =====
const SECTION_CONFIG = {
  'Cognitive Abilities': { 
    color: '#4A6FA5', 
    lightBg: 'rgba(74, 111, 165, 0.1)', 
    icon: '🧠', 
    bgImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
    description: 'Measuring analytical thinking, memory, and logical reasoning',
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #6B8EC9 100%)'
  },
  'Personality Assessment': { 
    color: '#9C27B0', 
    lightBg: 'rgba(156, 39, 176, 0.1)', 
    icon: '😊', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/always-grey.png',
    description: 'Evaluating traits, behaviors, and interpersonal dynamics',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)'
  },
  'Leadership Potential': { 
    color: '#D32F2F', 
    lightBg: 'rgba(211, 47, 47, 0.1)', 
    icon: '👑', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/dark-mosaic.png',
    description: 'Assessing vision, influence, and team development',
    gradient: 'linear-gradient(135deg, #D32F2F 0%, #EF5350 100%)'
  },
  'Bottled Water Manufacturing': { 
    color: '#388E3C', 
    lightBg: 'rgba(56, 142, 60, 0.1)', 
    icon: '⚙️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
    description: 'Testing knowledge of manufacturing equipment and processes',
    gradient: 'linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)'
  },
  'Performance Metrics': { 
    color: '#F57C00', 
    lightBg: 'rgba(245, 124, 0, 0.1)', 
    icon: '📊', 
    bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/graphy.png',
    description: 'Evaluating KPI achievement and results orientation',
    gradient: 'linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)'
  },
  'Adaptability & Flexibility': { 
    color: '#FF6B6B', 
    lightBg: 'rgba(255, 107, 107, 0.1)', 
    icon: '🔄', 
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/light-wool.png',
    description: 'Handling change, ambiguity, and new situations',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
  },
  'Emotional Intelligence': { 
    color: '#4ECDC4', 
    lightBg: 'rgba(78, 205, 196, 0.1)', 
    icon: '🧘', 
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
    description: 'Self-awareness, empathy, and social skills',
    gradient: 'linear-gradient(135deg, #4ECDC4 0%, #7FDBD4 100%)'
  },
  'Communication Skills': { 
    color: '#45B7D1', 
    lightBg: 'rgba(69, 183, 209, 0.1)', 
    icon: '💬', 
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/white-diamond.png',
    description: 'Verbal, written, and active listening abilities',
    gradient: 'linear-gradient(135deg, #45B7D1 0%, #6EC8E0 100%)'
  },
  'Teamwork & Collaboration': { 
    color: '#96CEB4', 
    lightBg: 'rgba(150, 206, 180, 0.1)', 
    icon: '🤝', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cardboard.png',
    description: 'Working with others and resolving conflicts',
    gradient: 'linear-gradient(135deg, #96CEB4 0%, #B5DFCA 100%)'
  },
  'Initiative & Proactivity': { 
    color: '#FFEAA7', 
    lightBg: 'rgba(255, 234, 167, 0.1)', 
    icon: '⚡', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/light-honeycomb.png',
    description: 'Taking ownership and going above and beyond',
    gradient: 'linear-gradient(135deg, #FFEAA7 0%, #FFF2C9 100%)'
  },
  'Time Management': { 
    color: '#DDA0DD', 
    lightBg: 'rgba(221, 160, 221, 0.1)', 
    icon: '⏰', 
    bgImage: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/diamond-upholstery.png',
    description: 'Prioritizing tasks and meeting deadlines',
    gradient: 'linear-gradient(135deg, #DDA0DD 0%, #E9B9E9 100%)'
  },
  'Resilience': { 
    color: '#F08A5D', 
    lightBg: 'rgba(240, 138, 93, 0.1)', 
    icon: '💪', 
    bgImage: 'https://images.unsplash.com/photo-1552674605-db6a2c6a7a7e?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/wood-pattern.png',
    description: 'Bouncing back from setbacks and stress',
    gradient: 'linear-gradient(135deg, #F08A5D 0%, #F5A97F 100%)'
  },
  'Problem-Solving': { 
    color: '#6A4C93', 
    lightBg: 'rgba(106, 76, 147, 0.1)', 
    icon: '🔍', 
    bgImage: 'https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/stardust.png',
    description: 'Identifying and resolving complex issues',
    gradient: 'linear-gradient(135deg, #6A4C93 0%, #8A6BB7 100%)'
  },
  'Critical Thinking': { 
    color: '#1982C4', 
    lightBg: 'rgba(25, 130, 196, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/brick-wall.png',
    description: 'Analyzing information and making sound decisions',
    gradient: 'linear-gradient(135deg, #1982C4 0%, #3A9FD6 100%)'
  },
  'Learning Agility': { 
    color: '#8AC926', 
    lightBg: 'rgba(138, 201, 38, 0.1)', 
    icon: '📚', 
    bgImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/45-degree-fabric-light.png',
    description: 'Quickly learning and adapting to new information',
    gradient: 'linear-gradient(135deg, #8AC926 0%, #A7D95A 100%)'
  },
  'Creativity & Innovation': { 
    color: '#FFCA3A', 
    lightBg: 'rgba(255, 202, 58, 0.1)', 
    icon: '💡', 
    bgImage: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/confetti.png',
    description: 'Thinking outside the box and generating ideas',
    gradient: 'linear-gradient(135deg, #FFCA3A 0%, #FFD966 100%)'
  },
  'Core Values Alignment': { 
    color: '#9C89B8', 
    lightBg: 'rgba(156, 137, 184, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png',
    description: 'Acting in accordance with company ethics',
    gradient: 'linear-gradient(135deg, #9C89B8 0%, #B7A6CC 100%)'
  },
  'Organizational Citizenship': { 
    color: '#F0A6CA', 
    lightBg: 'rgba(240, 166, 202, 0.1)', 
    icon: '🤲', 
    bgImage: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/cross-scratches.png',
    description: 'Supporting colleagues beyond formal duties',
    gradient: 'linear-gradient(135deg, #F0A6CA 0%, #F5C1DC 100%)'
  },
  'Reliability & Dependability': { 
    color: '#B8F2E6', 
    lightBg: 'rgba(184, 242, 230, 0.1)', 
    icon: '✓', 
    bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/checkerboard.png',
    description: 'Consistent punctuality and work output',
    gradient: 'linear-gradient(135deg, #B8F2E6 0%, #D1F7EF 100%)'
  },
  'Customer Focus': { 
    color: '#A9D6E5', 
    lightBg: 'rgba(169, 214, 229, 0.1)', 
    icon: '👥', 
    bgImage: 'https://images.unsplash.com/photo-1556740714-a8395b3bf30f?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/white-diamond.png',
    description: 'Empathy and dedication to client needs',
    gradient: 'linear-gradient(135deg, #A9D6E5 0%, #C2E3EE 100%)'
  },
  'Safety Awareness': { 
    color: '#FCA17D', 
    lightBg: 'rgba(252, 161, 125, 0.1)', 
    icon: '⚠️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/warning.png',
    description: 'Adherence to safety protocols',
    gradient: 'linear-gradient(135deg, #FCA17D 0%, #FDBB9F 100%)'
  },
  'Commercial Awareness': { 
    color: '#86A788', 
    lightBg: 'rgba(134, 167, 136, 0.1)', 
    icon: '💰', 
    bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/money.png',
    description: 'Understanding industry and business model',
    gradient: 'linear-gradient(135deg, #86A788 0%, #A5C0A7 100%)'
  },
  'Blowing Machines': { 
    color: '#3D5A80', 
    lightBg: 'rgba(61, 90, 128, 0.1)', 
    icon: '💨', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/industrial.png',
    description: 'PET preform heating and bottle forming',
    gradient: 'linear-gradient(135deg, #3D5A80 0%, #5F7BA3 100%)'
  },
  'Labeler': { 
    color: '#EE6C4D', 
    lightBg: 'rgba(238, 108, 77, 0.1)', 
    icon: '🏷️', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/label.png',
    description: 'Pressure-sensitive and shrink sleeve application',
    gradient: 'linear-gradient(135deg, #EE6C4D 0%, #F28B72 100%)'
  },
  'Filling': { 
    color: '#98C1D9', 
    lightBg: 'rgba(152, 193, 217, 0.1)', 
    icon: '💧', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/water.png',
    description: 'Volumetric filling and CIP sanitation',
    gradient: 'linear-gradient(135deg, #98C1D9 0%, #B4D4E6 100%)'
  },
  'Conveyors': { 
    color: '#293241', 
    lightBg: 'rgba(41, 50, 65, 0.1)', 
    icon: '📦', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/concrete.png',
    description: 'Air conveyors and accumulation tables',
    gradient: 'linear-gradient(135deg, #293241 0%, #495979 100%)'
  },
  'Stretchwrappers': { 
    color: '#E0FBFC', 
    lightBg: 'rgba(224, 251, 252, 0.1)', 
    icon: '🔄', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/stretch.png',
    description: 'Film pre-stretch and pallet stabilization',
    gradient: 'linear-gradient(135deg, #E0FBFC 0%, #E9FDFD 100%)'
  },
  'Shrinkwrappers': { 
    color: '#C81D25', 
    lightBg: 'rgba(200, 29, 37, 0.1)', 
    icon: '🔥', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/heat.png',
    description: 'Heat tunnels and film contraction',
    gradient: 'linear-gradient(135deg, #C81D25 0%, #E04A51 100%)'
  },
  'Date Coders': { 
    color: '#725AC1', 
    lightBg: 'rgba(114, 90, 193, 0.1)', 
    icon: '📅', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/code.png',
    description: 'CIJ printers and thermal transfer',
    gradient: 'linear-gradient(135deg, #725AC1 0%, #957AD6 100%)'
  },
  'Raw Materials': { 
    color: '#5D576B', 
    lightBg: 'rgba(93, 87, 107, 0.1)', 
    icon: '🧪', 
    bgImage: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/material.png',
    description: 'PET properties and rPET sustainability',
    gradient: 'linear-gradient(135deg, #5D576B 0%, #7F7893 100%)'
  },
  'Vision & Strategic Thinking': { 
    color: '#FFB347', 
    lightBg: 'rgba(255, 179, 71, 0.1)', 
    icon: '🎯', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/strategy.png',
    description: 'Setting direction and long-term planning',
    gradient: 'linear-gradient(135deg, #FFB347 0%, #FFC876 100%)'
  },
  'Team Development': { 
    color: '#5F9EA0', 
    lightBg: 'rgba(95, 158, 160, 0.1)', 
    icon: '🌱', 
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/growth.png',
    description: 'Coaching and building team capabilities',
    gradient: 'linear-gradient(135deg, #5F9EA0 0%, #7FB1B3 100%)'
  },
  'Decision-Making': { 
    color: '#C23B22', 
    lightBg: 'rgba(194, 59, 34, 0.1)', 
    icon: '⚖️', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/decision.png',
    description: 'Making sound judgments under uncertainty',
    gradient: 'linear-gradient(135deg, #C23B22 0%, #D96A55 100%)'
  },
  'Influence': { 
    color: '#6B5B95', 
    lightBg: 'rgba(107, 91, 149, 0.1)', 
    icon: '🗣️', 
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/influence.png',
    description: 'Persuading and building stakeholder buy-in',
    gradient: 'linear-gradient(135deg, #6B5B95 0%, #8D7BB5 100%)'
  },
  'Leadership EQ': { 
    color: '#88B04B', 
    lightBg: 'rgba(136, 176, 75, 0.1)', 
    icon: '💖', 
    bgImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/eq.png',
    description: 'Empathy and social awareness in leadership',
    gradient: 'linear-gradient(135deg, #88B04B 0%, #A5C86D 100%)'
  },
  'Conflict Resolution': { 
    color: '#FF6F61', 
    lightBg: 'rgba(255, 111, 97, 0.1)', 
    icon: '🤝', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/conflict.png',
    description: 'Mediating disputes and finding common ground',
    gradient: 'linear-gradient(135deg, #FF6F61 0%, #FF8F84 100%)'
  },
  'Delegation': { 
    color: '#92A8D1', 
    lightBg: 'rgba(146, 168, 209, 0.1)', 
    icon: '📤', 
    bgImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/delegate.png',
    description: 'Empowering others and distributing work',
    gradient: 'linear-gradient(135deg, #92A8D1 0%, #B0C1E0 100%)'
  },
  'Leadership Integrity': { 
    color: '#955251', 
    lightBg: 'rgba(149, 82, 81, 0.1)', 
    icon: '🛡️', 
    bgImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/integrity.png',
    description: 'Ethical courage and role modeling',
    gradient: 'linear-gradient(135deg, #955251 0%, #B17978 100%)'
  },
  'Innovation Leadership': { 
    color: '#B565A7', 
    lightBg: 'rgba(181, 101, 167, 0.1)', 
    icon: '💫', 
    bgImage: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1920&q=80',
    pattern: 'https://www.transparenttextures.com/patterns/innovation.png',
    description: 'Fostering creativity and change',
    gradient: 'linear-gradient(135deg, #B565A7 0%, #C881BB 100%)'
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
  const [hoveredAnswer, setHoveredAnswer] = useState(null);

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

  // ===== FETCH QUESTIONS - FIXED VERSION =====
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
        
        // ===== FIXED: Removed answers!inner which was filtering out questions without answers =====
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
              score,
              strength_level,
              trait_category
            )
          `)
          .eq("assessment_id", assessmentId)
          .order("question_order", { ascending: true })
          .order("id", { ascending: true });

        if (questionsError) {
          console.error("Questions fetch error:", questionsError);
          throw new Error(`Failed to load questions: ${questionsError.message}`);
        }
        
        console.log(`✅ Received ${questionsData?.length || 0} questions`);
        
        // Verify we got all questions
        if (!questionsData || questionsData.length === 0) {
          throw new Error("No questions found for this assessment.");
        }
        
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
      // Scroll to top of question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (alreadySubmitted) return;
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      // Scroll to top of question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToQuestion = (index) => {
    if (!alreadySubmitted) {
      setCurrentIndex(index);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const loadingSectionConfig = SECTION_CONFIG[assessment?.name] || SECTION_CONFIG['Cognitive Abilities'];
    return (
      <div style={styles.loadingContainer}>
        <div style={{
          ...styles.loadingOverlay,
          backgroundImage: `url(${loadingSectionConfig?.bgImage || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80'})`
        }} />
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>
            <span style={{background: loadingSectionConfig?.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              Stratavax
            </span>
          </div>
          <div style={styles.loadingSpinnerContainer}>
            <div style={{
              ...styles.loadingSpinner,
              borderTopColor: loadingSectionConfig?.color || '#4A6FA5'
            }} />
          </div>
          <div style={styles.loadingTitle}>{assessment?.name || 'Loading Assessment...'}</div>
          <div style={styles.loadingSubtitle}>
            {expectedQuestionCount 
              ? `Loading ${expectedQuestionCount} questions...` 
              : 'Preparing your assessment. This will only take a moment.'}
          </div>
          <div style={styles.loadingProgress}>
            <div style={{
              ...styles.loadingProgressBar,
              width: questions.length > 0 ? `${(questions.length / expectedQuestionCount) * 100}%` : '30%'
            }} />
          </div>
          {fetchAttempted && questions.length === 0 && (
            <button
              onClick={handleRetry}
              style={{
                ...styles.retryButton,
                background: loadingSectionConfig?.gradient
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 10px 20px ${loadingSectionConfig?.color}40`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
              }}
            >
              🔄 Retry Loading
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
          <div style={styles.successIconLarge}>✅</div>
          <h2 style={styles.errorTitle}>Assessment Already Completed</h2>
          <p style={styles.errorText}>
            You have already submitted this assessment. Each assessment can only be taken once.
          </p>
          <button
            onClick={() => router.push('/assessment/pre')}
            style={styles.primaryButton}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(102,126,234,0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(102,126,234,0.3)';
            }}
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
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleRetry}
              style={{
                ...styles.primaryButton,
                background: 'linear-gradient(135deg, #ff9800, #f57c00)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(255,152,0,0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(255,152,0,0.2)';
              }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => router.push('/assessment/pre')}
              style={{
                ...styles.primaryButton,
                background: 'linear-gradient(135deg, #64748b, #475569)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(100,116,139,0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(100,116,139,0.2)';
              }}
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
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
    description: 'Assessment question',
    gradient: 'linear-gradient(135deg, #4A6FA5, #6B8EC9)'
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
            <div style={{
              ...styles.modalIconContainer,
              background: sectionConfig.gradient
            }}>
              📋
            </div>
            <h2 style={styles.modalTitle}>Ready to Submit?</h2>
            <div style={styles.modalBody}>
              <div style={styles.modalStats}>
                <div style={styles.modalStat}>
                  <span style={styles.modalStatLabel}>Questions Answered</span>
                  <span style={{...styles.modalStatValue, color: '#4caf50', fontWeight: '700'}}>{totalAnswered}/{questions.length}</span>
                </div>
                <div style={styles.modalStat}>
                  <span style={styles.modalStatLabel}>Completion Rate</span>
                  <span style={{...styles.modalStatValue, color: '#2196f3', fontWeight: '700'}}>{progressPercentage}%</span>
                </div>
                <div style={styles.modalStat}>
                  <span style={styles.modalStatLabel}>Time Used</span>
                  <span style={{
                    ...styles.modalStatValue,
                    color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : '#4caf50',
                    fontWeight: '700'
                  }}>
                    {formatTime(Math.floor(elapsed / 3600))}:{formatTime(Math.floor((elapsed % 3600) / 60))}:{formatTime(elapsed % 60)}
                  </span>
                </div>
              </div>
              <div style={styles.modalWarning}>
                <span style={styles.modalWarningIcon}>⚠️</span>
                <div style={styles.modalWarningText}>
                  <strong>One attempt only:</strong> After submission, you cannot retake this assessment.
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button 
                onClick={() => setShowSubmitModal(false)} 
                style={styles.modalSecondaryButton}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Continue Reviewing
              </button>
              <button 
                onClick={submitAssessment} 
                disabled={isSubmitting} 
                style={{
                  ...styles.modalPrimaryButton,
                  background: sectionConfig.gradient,
                  opacity: isSubmitting ? 0.7 : 1
                }}
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
                Your <strong>{assessment?.name || 'assessment'}</strong> has been successfully submitted.
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
        <div style={{
          ...styles.backgroundPattern,
          backgroundImage: `url(${sectionConfig.pattern})`
        }} />
        
        {/* Header */}
        <div style={{
          ...styles.header,
          background: `linear-gradient(135deg, ${sectionConfig.color} 0%, ${sectionConfig.color}dd 100%)`
        }}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button
                onClick={() => router.push('/assessment/pre')}
                style={styles.backButton}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Back to Assessment Selection"
              >
                ←
              </button>
              
              <div style={{
                ...styles.headerIcon,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(5px)'
              }}>
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
                      <span style={{
                        ...styles.headerBadge,
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white'
                      }}>
                        ✅ 100 Questions
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Timer */}
            <div style={{
              ...styles.timer,
              borderColor: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : 'rgba(255,255,255,0.3)',
              background: isTimeCritical 
                ? 'linear-gradient(135deg, rgba(211,47,47,0.2), rgba(211,47,47,0.1))'
                : isTimeWarning
                  ? 'linear-gradient(135deg, rgba(255,152,0,0.2), rgba(255,152,0,0.1))'
                  : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={styles.timerLabel}>
                <span style={styles.timerIcon}>⏱️</span>
                TIME REMAINING
              </div>
              <div style={{
                ...styles.timerValue,
                color: isTimeCritical ? '#ff8a80' : isTimeWarning ? '#ffb74d' : 'white'
              }}>
                {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
              </div>
              <div style={styles.timerFixed}>
                180 minutes total
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Cheat Banner */}
        <div style={{
          ...styles.antiCheat,
          background: `linear-gradient(135deg, ${sectionConfig.color}dd, ${sectionConfig.color})`
        }}>
          <span style={styles.antiCheatIcon}>🛡️</span>
          <span>Secure Mode Active: Copy/Paste Disabled • {questions.length} Questions Loaded</span>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressFill,
              width: `${progressPercentage}%`,
              background: sectionConfig.gradient
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
              background: `linear-gradient(135deg, ${sectionConfig.color}20, ${sectionConfig.color}10)`
            }} />
            <div style={{
              ...styles.questionPattern,
              backgroundImage: `url(${sectionConfig.pattern})`
            }} />
            
            <div style={styles.questionContent}>
              <div style={styles.sectionBadge}>
                <div style={{
                  ...styles.sectionIcon,
                  background: sectionConfig.gradient,
                  boxShadow: `0 10px 20px ${sectionConfig.color}60`
                }}>
                  {sectionConfig.icon}
                </div>
                <div>
                  <div style={styles.sectionName}>{currentSection}</div>
                  <div style={styles.sectionDescription}>{sectionConfig.description}</div>
                </div>
              </div>

              <div style={styles.questionText}>
                <span style={{
                  ...styles.questionNumber,
                  color: sectionConfig.color,
                  background: `${sectionConfig.color}15`
                }}>
                  Question {currentIndex + 1}
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
                  const isHovered = hoveredAnswer === option.id;
                  const optionLetter = String.fromCharCode(65 + index);
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(currentQuestion.id, option.id)}
                      disabled={saveStatus[currentQuestion.id] === 'saving' || alreadySubmitted}
                      style={{
                        ...styles.answerButton,
                        background: isSelected 
                          ? sectionConfig.gradient
                          : isHovered 
                            ? `${sectionConfig.color}08`
                            : 'white',
                        borderColor: isSelected ? sectionConfig.color : '#e2e8f0',
                        boxShadow: isSelected 
                          ? `0 8px 25px ${sectionConfig.color}60`
                          : isHovered
                            ? `0 4px 12px ${sectionConfig.color}30`
                            : '0 2px 4px rgba(0,0,0,0.02)',
                        transform: isSelected ? 'translateY(-2px)' : isHovered ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                      onMouseEnter={() => setHoveredAnswer(option.id)}
                      onMouseLeave={() => setHoveredAnswer(null)}
                    >
                      <div style={{
                        ...styles.answerLetter,
                        background: isSelected 
                          ? 'rgba(255,255,255,0.3)'
                          : isHovered
                            ? sectionConfig.gradient
                            : '#f1f5f9',
                        color: isSelected || isHovered ? 'white' : '#64748b',
                        boxShadow: isSelected || isHovered ? `0 4px 8px ${sectionConfig.color}40` : 'none'
                      }}>
                        {optionLetter}
                      </div>
                      <span style={{
                        ...styles.answerText,
                        color: isSelected ? 'white' : '#334155',
                        fontWeight: isSelected ? '500' : '400'
                      }}>
                        {option.answer_text}
                      </span>
                      {option.strength_level && (
                        <span style={{
                          ...styles.answerStrength,
                          background: isSelected 
                            ? 'rgba(255,255,255,0.2)'
                            : `${sectionConfig.color}15`,
                          color: isSelected ? 'white' : sectionConfig.color
                        }}>
                          {option.strength_level}
                        </span>
                      )}
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
                      : 'white',
                    color: currentIndex === 0 || alreadySubmitted ? '#94a3b8' : sectionConfig.color,
                    border: currentIndex === 0 || alreadySubmitted 
                      ? '1px solid #e2e8f0'
                      : `2px solid ${sectionConfig.color}`,
                    cursor: currentIndex === 0 || alreadySubmitted ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 || alreadySubmitted ? 0.6 : 1
                  }}
                  onMouseOver={(e) => {
                    if (currentIndex !== 0 && !alreadySubmitted) {
                      e.currentTarget.style.background = sectionConfig.gradient;
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentIndex !== 0 && !alreadySubmitted) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = sectionConfig.color;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
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
                    background: `${sectionConfig.color}15`
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
                      border: 'none',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!alreadySubmitted) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(76,175,80,0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!alreadySubmitted) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 5px 15px rgba(76,175,80,0.2)';
                      }
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
                        : sectionConfig.gradient,
                      color: alreadySubmitted ? '#94a3b8' : 'white',
                      border: 'none',
                      cursor: alreadySubmitted ? 'not-allowed' : 'pointer',
                      opacity: alreadySubmitted ? 0.6 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!alreadySubmitted) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 10px 20px ${sectionConfig.color}60`;
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!alreadySubmitted) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 5px 15px ${sectionConfig.color}40`;
                      }
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
              <span style={{
                ...styles.navigatorBadge,
                background: sectionConfig.gradient
              }}>
                {questions.length}
              </span>
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
                <div style={{...styles.statValue, color: sectionConfig.color}}>{progressPercentage}%</div>
                <div style={styles.statLabel}>Complete</div>
              </div>
            </div>

            <div style={styles.timerProgress}>
              <div style={styles.timerProgressHeader}>
                <span style={styles.timerProgressIcon}>⏰</span>
                <span style={styles.timerProgressLabel}>Time Remaining</span>
                <span style={{
                  ...styles.timerProgressValue,
                  color: isTimeCritical ? '#d32f2f' : isTimeWarning ? '#ff9800' : sectionConfig.color
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
                      : sectionConfig.gradient
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
                    onClick={() => jumpToQuestion(index)}
                    disabled={alreadySubmitted}
                    style={{
                      ...styles.gridItem,
                      background: isCurrent 
                        ? sectionConfig.gradient
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
                        ? `0 8px 16px ${sectionConfig.color}60`
                        : isCurrent
                          ? `0 4px 12px ${sectionConfig.color}40`
                          : 'none'
                    }}
                    onMouseEnter={() => setHoveredQuestion(index)}
                    onMouseLeave={() => setHoveredQuestion(null)}
                    title={`Question ${index + 1} - ${isAnswered ? 'Answered' : 'Not answered'}`}
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
            </div>

            <div style={{
              ...styles.completionBadge,
              background: questions.length === 100 ? '#e8f5e9' : '#fff3e0',
              borderColor: questions.length === 100 ? '#4caf50' : '#ff9800',
              color: questions.length === 100 ? '#2e7d32' : '#f57c00'
            }}>
              {questions.length === 100 
                ? '✅ All 100 questions loaded' 
                : `⚠️ Loaded ${questions.length} of 100 questions`}
            </div>

            <button
              onClick={() => router.push('/assessment/pre')}
              style={styles.backToSelection}
              onMouseOver={(e) => {
                e.currentTarget.style.background = sectionConfig.gradient;
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 10px 20px ${sectionConfig.color}60`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>
    </>
  );
}

// ===== ENHANCED STYLES WITH BETTER READABILITY =====
const styles = {
  loadingContainer: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    overflow: 'hidden'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.15,
    filter: 'blur(15px)',
    transform: 'scale(1.1)'
  },
  loadingContent: {
    position: 'relative',
    textAlign: 'center',
    color: 'white',
    zIndex: 1,
    maxWidth: '600px',
    padding: '40px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '48px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.5s ease'
  },
  loadingLogo: {
    fontSize: '42px',
    fontWeight: '800',
    marginBottom: '40px',
    letterSpacing: '2px',
    background: 'linear-gradient(135deg, #fff, #e2e8f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  loadingSpinnerContainer: {
    marginBottom: '40px'
  },
  loadingSpinner: {
    width: '80px',
    height: '80px',
    margin: '0 auto',
    border: '5px solid rgba(255,255,255,0.2)',
    borderTop: '5px solid',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingTitle: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '15px'
  },
  loadingSubtitle: {
    fontSize: '18px',
    opacity: 0.9,
    marginBottom: '30px'
  },
  loadingProgress: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '20px'
  },
  loadingProgressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #4A6FA5, #6B8EC9)',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  retryButton: {
    marginTop: '30px',
    padding: '14px 32px',
    border: 'none',
    borderRadius: '40px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
  },
  errorContainer: {
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
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
    background: 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(20px)',
    padding: '60px',
    borderRadius: '40px',
    maxWidth: '550px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.2)',
    animation: 'slideIn 0.5s ease'
  },
  successIconLarge: {
    width: '120px',
    height: '120px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 30px',
    fontSize: '60px',
    color: 'white',
    boxShadow: '0 20px 40px rgba(76,175,80,0.4)',
    animation: 'slideIn 0.5s ease'
  },
  errorIcon: {
    fontSize: '70px',
    marginBottom: '25px'
  },
  errorTitle: {
    color: '#1a2639',
    marginBottom: '20px',
    fontSize: '32px',
    fontWeight: '800'
  },
  errorText: {
    color: '#475569',
    marginBottom: '35px',
    fontSize: '18px',
    lineHeight: '1.7'
  },
  primaryButton: {
    padding: '16px 36px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 5px 15px rgba(102,126,234,0.3)'
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
    backgroundRepeat: 'repeat',
    opacity: 0.03,
    pointerEvents: 'none'
  },
  header: {
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: 'white',
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '22px',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(5px)'
  },
  headerIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    transition: 'transform 0.3s ease'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'white'
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.8)',
    flexWrap: 'wrap'
  },
  headerQuestion: {
    fontWeight: '600',
    background: 'rgba(255,255,255,0.2)',
    padding: '3px 10px',
    borderRadius: '20px'
  },
  headerDivider: {
    opacity: 0.5
  },
  headerSection: {
    fontWeight: '500'
  },
  headerBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600'
  },
  timer: {
    padding: '10px 25px',
    borderRadius: '50px',
    textAlign: 'center',
    border: '1px solid',
    minWidth: '200px',
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
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: 1.2,
    fontFamily: 'monospace'
  },
  timerFixed: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.7)',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  antiCheat: {
    color: 'white',
    textAlign: 'center',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderBottom: '2px solid rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  antiCheatIcon: {
    fontSize: '18px'
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
    gap: '30px',
    flexWrap: 'wrap'
  },
  questionPanel: {
    flex: '1 1 700px',
    position: 'relative',
    background: 'white',
    borderRadius: '32px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
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
    opacity: 0.15,
    transition: 'opacity 0.3s ease',
    filter: 'blur(2px)'
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
    backgroundRepeat: 'repeat',
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
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
    marginBottom: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  sectionIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: 'white',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  sectionName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '4px'
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#64748b'
  },
  questionText: {
    background: 'rgba(255,255,255,0.95)',
    padding: '35px',
    borderRadius: '24px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9'
  },
  questionNumber: {
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '15px',
    padding: '5px 15px',
    borderRadius: '30px'
  },
  questionContent: {
    fontSize: '22px',
    lineHeight: '1.6',
    color: '#1e293b',
    fontWeight: '500',
    wordBreak: 'break-word'
  },
  saveStatus: {
    padding: '14px 18px',
    border: '1px solid',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '500',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(5px)'
  },
  saveStatusIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px'
  },
  answersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  answerButton: {
    padding: '20px 24px',
    border: '2px solid',
    borderRadius: '20px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s ease',
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
  },
  answerLetter: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    flexShrink: 0,
    transition: 'all 0.2s ease'
  },
  answerText: {
    flex: 1,
    fontSize: '17px',
    lineHeight: '1.5',
    transition: 'color 0.2s ease',
    wordBreak: 'break-word',
    paddingRight: '10px'
  },
  answerStrength: {
    padding: '4px 12px',
    borderRadius: '30px',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    paddingTop: '30px',
    borderTop: '2px solid #f1f5f9',
    flexWrap: 'wrap',
    gap: '15px'
  },
  navButton: {
    padding: '14px 30px',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    minWidth: '140px'
  },
  navigationInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  navigationCounter: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b'
  },
  navigationTotal: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#64748b'
  },
  navigationProgress: {
    fontSize: '13px',
    fontWeight: '600',
    padding: '6px 16px',
    borderRadius: '30px'
  },
  navigatorPanel: {
    flex: '1 1 350px',
    background: 'white',
    borderRadius: '32px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9',
    animation: 'slideIn 0.5s ease',
    maxHeight: 'calc(100vh - 200px)',
    overflowY: 'auto',
    position: 'sticky',
    top: '100px'
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
    margin: 0,
    flex: 1
  },
  navigatorBadge: {
    padding: '4px 12px',
    borderRadius: '30px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '25px'
  },
  statCard: {
    background: '#f8fafc',
    borderRadius: '16px',
    padding: '16px 8px',
    textAlign: 'center',
    border: '1px solid #f1f5f9'
  },
  statValue: {
    fontSize: '32px',
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
    borderRadius: '20px',
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
    fontSize: '18px'
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
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
    marginBottom: '25px',
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '5px'
  },
  gridItem: {
    aspectRatio: '1',
    border: '2px solid',
    borderRadius: '14px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  legend: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    paddingTop: '20px',
    borderTop: '2px solid #f1f5f9',
    marginBottom: '20px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    background: '#f8fafc',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#475569'
  },
  legendDot: {
    width: '16px',
    height: '16px',
    borderRadius: '5px'
  },
  completionBadge: {
    padding: '14px',
    borderRadius: '16px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    border: '2px solid',
    marginBottom: '15px'
  },
  backToSelection: {
    padding: '16px',
    background: 'white',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '50px',
    fontSize: '15px',
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
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
    backdropFilter: 'blur(8px)',
    animation: 'fadeIn 0.3s ease'
  },
  modalContent: {
    background: 'white',
    padding: '45px',
    borderRadius: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.3s ease'
  },
  modalIconContainer: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 25px',
    fontSize: '50px',
    color: 'white',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  modalTitle: {
    margin: '0 0 20px 0',
    color: '#1a2639',
    fontSize: '32px',
    fontWeight: '700',
    textAlign: 'center'
  },
  modalBody: {
    margin: '30px 0'
  },
  modalStats: {
    background: '#f8fafc',
    borderRadius: '24px',
    padding: '30px',
    marginBottom: '20px',
    border: '1px solid #e3f2fd'
  },
  modalStat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    fontSize: '17px'
  },
  modalStatLabel: {
    color: '#64748b',
    fontWeight: '500'
  },
  modalStatValue: {
    fontWeight: '700',
    fontSize: '20px'
  },
  modalWarning: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '18px',
    background: '#fff8e1',
    borderRadius: '16px',
    border: '1px solid #ffe082',
    color: '#856404'
  },
  modalWarningIcon: {
    fontSize: '24px'
  },
  modalWarningText: {
    fontSize: '15px',
    lineHeight: '1.5'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '30px',
    flexWrap: 'wrap'
  },
  modalSecondaryButton: {
    padding: '14px 30px',
    background: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.2s ease'
  },
  modalPrimaryButton: {
    padding: '14px 35px',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(76,175,80,0.3)'
  },
  successIconLarge: {
    width: '120px',
    height: '120px',
    background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 25px',
    fontSize: '60px',
    color: 'white',
    boxShadow: '0 20px 40px rgba(76,175,80,0.4)'
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
    fontSize: '36px',
    color: '#2196f3',
    marginBottom: '10px',
    animation: 'pulse 1.5s ease infinite'
  },
  redirectText: {
    fontSize: '14px',
    color: '#64748b'
  }
};
