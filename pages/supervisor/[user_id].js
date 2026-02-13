import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/client";
import AppLayout from "../../components/AppLayout";

// ===== BACKGROUND CONFIGURATION =====
const BACKGROUND_CONFIG = {
  bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80',
  pattern: 'https://www.transparenttextures.com/patterns/cubes.png',
  overlay: 'linear-gradient(135deg, rgba(102,126,234,0.95) 0%, rgba(118,75,162,0.95) 100%)'
};

// ===== ASSESSMENT TYPE CONFIGURATIONS =====
const assessmentTypes = [
  { 
    id: 'all', 
    label: 'All Assessments', 
    icon: '📋', 
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b, #475569)'
  },
  { 
    id: 'behavioral', 
    label: 'Behavioral', 
    icon: '🧠', 
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    description: 'Communication, teamwork, emotional intelligence'
  },
  { 
    id: 'cognitive', 
    label: 'Cognitive', 
    icon: '💡', 
    color: '#4A6FA5',
    gradient: 'linear-gradient(135deg, #4A6FA5, #6B8EC9)',
    description: 'Problem-solving, critical thinking, analysis'
  },
  { 
    id: 'cultural', 
    label: 'Cultural', 
    icon: '🤝', 
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50, #81C784)',
    description: 'Values alignment, organizational fit'
  },
  { 
    id: 'manufacturing', 
    label: 'Manufacturing', 
    icon: '⚙️', 
    color: '#F44336',
    gradient: 'linear-gradient(135deg, #F44336, #EF5350)',
    description: 'Technical skills, equipment knowledge'
  },
  { 
    id: 'leadership', 
    label: 'Leadership', 
    icon: '👑', 
    color: '#FFC107',
    gradient: 'linear-gradient(135deg, #FFC107, #FFD54F)',
    description: 'Vision, influence, team development'
  }
];

// Helper functions
const getScoreColor = (score) => {
  if (score >= 80) return '#4CAF50';
  if (score >= 65) return '#2196F3';
  if (score >= 50) return '#FF9800';
  return '#F44336';
};

const getScoreGradient = (score) => {
  if (score >= 80) return 'linear-gradient(135deg, #4CAF50, #2E7D32)';
  if (score >= 65) return 'linear-gradient(135deg, #2196F3, #1565C0)';
  if (score >= 50) return 'linear-gradient(135deg, #FF9800, #F57C00)';
  return 'linear-gradient(135deg, #F44336, #C62828)';
};

const getRiskBadge = (riskLevel) => {
  switch(riskLevel) {
    case 'high':
      return { 
        label: '⚠️ High Risk', 
        color: '#C62828', 
        bg: '#FFEBEE',
        gradient: 'linear-gradient(135deg, #F44336, #D32F2F)',
        icon: '🔴'
      };
    case 'medium':
      return { 
        label: '⚡ Medium Risk', 
        color: '#F57C00', 
        bg: '#FFF3E0',
        gradient: 'linear-gradient(135deg, #FF9800, #F57C00)',
        icon: '🟡'
      };
    default:
      return { 
        label: '✅ Low Risk', 
        color: '#2E7D32', 
        bg: '#E8F5E9',
        gradient: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
        icon: '🟢'
      };
  }
};

const getReadinessBadge = (readiness) => {
  switch(readiness) {
    case 'ready':
      return { 
        label: '🚀 Ready', 
        color: '#2E7D32', 
        bg: '#E8F5E9',
        icon: '✅'
      };
    case 'needs_development':
      return { 
        label: '📚 Needs Development', 
        color: '#F57C00', 
        bg: '#FFF3E0',
        icon: '📝'
      };
    case 'not_ready':
      return { 
        label: '⚠️ Not Ready', 
        color: '#C62828', 
        bg: '#FFEBEE',
        icon: '❌'
      };
    default:
      return { 
        label: '⏳ Pending', 
        color: '#64748b', 
        bg: '#F1F5F9',
        icon: '⏳'
      };
  }
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, gradient, trend, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '24px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.transform = 'translateY(-5px)';
    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
  }}
  >
    <div style={{
      position: 'absolute',
      top: '15px',
      right: '15px',
      fontSize: '48px',
      opacity: 0.1,
      color: color || '#667eea'
    }}>
      {icon}
    </div>
    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </div>
    <div style={{ fontSize: '42px', fontWeight: '700', color: '#1a2639', marginBottom: '5px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#64748b' }}>
      {subtitle}
    </div>
    {trend && (
      <div style={{
        marginTop: '15px',
        padding: '5px 10px',
        background: trend.isPositive ? '#E8F5E9' : '#FFEBEE',
        color: trend.isPositive ? '#2E7D32' : '#C62828',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-block'
      }}>
        {trend.icon} {trend.value} from last period
      </div>
    )}
  </div>
);

// Assessment Type Card Component
const AssessmentTypeCard = ({ type, stats, onClick, isSelected }) => {
  const typeStats = stats || { count: 0, average: 0 };
  
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? type.gradient : 'white',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
        border: isSelected ? 'none' : `2px solid ${type.color}20`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = type.color;
        }
      }}
      onMouseOut={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = `${type.color}20`;
        }
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '15px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: isSelected ? 'rgba(255,255,255,0.2)' : type.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          color: isSelected ? 'white' : 'white'
        }}>
          {type.icon}
        </div>
        <div>
          <h4 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: isSelected ? 'white' : '#1a2639'
          }}>
            {type.label}
          </h4>
          <p style={{
            margin: '5px 0 0',
            fontSize: '12px',
            color: isSelected ? 'rgba(255,255,255,0.8)' : '#64748b'
          }}>
            {type.description}
          </p>
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            fontSize: '13px',
            color: isSelected ? 'rgba(255,255,255,0.8)' : '#64748b',
            marginBottom: '5px'
          }}>
            Completed
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: isSelected ? 'white' : type.color
          }}>
            {typeStats.count}
          </div>
        </div>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: `conic-gradient(${isSelected ? 'white' : type.color} ${typeStats.average * 3.6}deg, ${isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9'} 0deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: isSelected ? 'rgba(255,255,255,0.2)' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '700',
            color: isSelected ? 'white' : type.color
          }}>
            {typeStats.average}%
          </div>
        </div>
      </div>
      
      {typeStats.count === 0 && (
        <div style={{
          marginTop: '15px',
          fontSize: '12px',
          color: isSelected ? 'rgba(255,255,255,0.8)' : '#94a3b8',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '8px',
          background: isSelected ? 'rgba(255,255,255,0.1)' : '#f8fafc',
          borderRadius: '8px'
        }}>
          No completed assessments yet
        </div>
      )}
    </div>
  );
};

// Candidate Row Component
const CandidateRow = ({ candidate, onSelect, isSelected, hoveredRow, setHoveredRow }) => {
  const isHovered = hoveredRow === candidate.user_id;
  
  return (
    <tr
      onMouseEnter={() => setHoveredRow(candidate.user_id)}
      onMouseLeave={() => setHoveredRow(null)}
      style={{
        borderBottom: '1px solid #f1f5f9',
        background: isSelected ? '#f8fafc' : 'white',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.01)' : 'scale(1)',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
        cursor: 'pointer'
      }}
      onClick={() => onSelect(candidate)}
    >
      <td style={{ padding: '20px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${candidate.color || '#667eea'}, ${candidate.color ? candidate.color + 'dd' : '#764ba2'})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '600',
            boxShadow: `0 8px 16px ${candidate.color || '#667eea'}40`
          }}>
            {candidate.user_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#1a2639', fontSize: '16px', marginBottom: '4px' }}>
              {candidate.user_name}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🆔 {candidate.user_id.substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: '20px 15px' }}>
        <div style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500' }}>
          {candidate.user_email}
        </div>
      </td>
      <td style={{ padding: '20px 15px', textAlign: 'center' }}>
        <div style={{
          background: '#E8F5E9',
          padding: '6px 16px',
          borderRadius: '30px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ fontSize: '14px' }}>✅</span>
          <span style={{ fontWeight: '600', color: '#2E7D32' }}>
            {candidate.completedCount}/6
          </span>
        </div>
      </td>
      <td style={{ padding: '20px 15px', textAlign: 'center' }}>
        <div style={{
          background: getScoreColor(candidate.averageScore) + '15',
          padding: '8px 16px',
          borderRadius: '30px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getScoreColor(candidate.averageScore)
          }} />
          <span style={{
            fontWeight: '700',
            fontSize: '18px',
            color: getScoreColor(candidate.averageScore)
          }}>
            {Math.round(candidate.averageScore)}%
          </span>
        </div>
      </td>
      <td style={{ padding: '20px 15px', textAlign: 'center' }}>
        {candidate.assessments[0] && (
          <div style={{
            background: getRiskBadge(candidate.assessments[0].risk_level).bg,
            padding: '6px 14px',
            borderRadius: '30px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${getRiskBadge(candidate.assessments[0].risk_level).color}30`
          }}>
            <span style={{ fontSize: '14px' }}>
              {getRiskBadge(candidate.assessments[0].risk_level).icon}
            </span>
            <span style={{
              color: getRiskBadge(candidate.assessments[0].risk_level).color,
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {getRiskBadge(candidate.assessments[0].risk_level).label}
            </span>
          </div>
        )}
      </td>
      <td style={{ padding: '20px 15px', textAlign: 'center' }}>
        {candidate.assessments[0] && (
          <div style={{
            background: getReadinessBadge(candidate.assessments[0].readiness).bg,
            padding: '6px 14px',
            borderRadius: '30px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: `1px solid ${getReadinessBadge(candidate.assessments[0].readiness).color}30`
          }}>
            <span style={{ fontSize: '14px' }}>
              {getReadinessBadge(candidate.assessments[0].readiness).icon}
            </span>
            <span style={{
              color: getReadinessBadge(candidate.assessments[0].readiness).color,
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {getReadinessBadge(candidate.assessments[0].readiness).label}
            </span>
          </div>
        )}
      </td>
      <td style={{ padding: '20px 15px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          <span style={{ fontSize: '14px' }}>📅</span>
          {new Date(candidate.lastActive).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </td>
    </tr>
  );
};

// Candidate Detail Modal Component
const CandidateDetailModal = ({ candidate, onClose }) => {
  if (!candidate) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '32px',
        padding: '40px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.transform = 'rotate(0)';
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${candidate.color || '#667eea'}, ${candidate.color ? candidate.color + 'dd' : '#764ba2'})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: '600',
            boxShadow: `0 15px 30px ${candidate.color || '#667eea'}60`
          }}>
            {candidate.user_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#1a2639', fontSize: '32px', fontWeight: '700' }}>
              {candidate.user_name}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📧 {candidate.user_email}</span>
              <span style={{ width: '4px', height: '4px', background: '#cbd5e1', borderRadius: '50%' }} />
              <span>🆔 {candidate.user_id.substring(0, 12)}...</span>
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '35px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            padding: '25px',
            borderRadius: '20px',
            color: 'white',
            boxShadow: '0 10px 25px rgba(102,126,234,0.3)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '10px' }}>
              Overall Performance
            </div>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '5px' }}>
              {Math.round(candidate.averageScore)}%
            </div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>
              Average across {candidate.completedCount} assessments
            </div>
          </div>
          
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>
              Completion Status
            </div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#1a2639', marginBottom: '5px' }}>
              {candidate.completedCount}/6
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Assessments completed
            </div>
            <div style={{
              marginTop: '15px',
              height: '6px',
              background: '#f1f5f9',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(candidate.completedCount / 6) * 100}%`,
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: '3px'
              }} />
            </div>
          </div>
        </div>

        {/* Assessment History */}
        <h3 style={{
          margin: '0 0 20px',
          fontSize: '20px',
          color: '#1a2639',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: '#667eea20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            📋
          </span>
          Assessment History
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '35px' }}>
          {candidate.assessments.map((assessment, index) => {
            const typeConfig = assessmentTypes.find(t => t.id === assessment.assessments?.assessment_type) || assessmentTypes[0];
            const scoreColor = getScoreColor(assessment.overall_score);
            
            return (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '16px',
                borderLeft: `6px solid ${typeConfig.color}`,
                flexWrap: 'wrap',
                gap: '15px',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: `${typeConfig.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {typeConfig.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2639', marginBottom: '5px', fontSize: '16px' }}>
                      {assessment.assessments?.name || 'Assessment'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '15px' }}>
                      <span>📅 {new Date(assessment.completed_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}</span>
                      <span>⏱️ {Math.floor(assessment.time_spent / 60)}m {assessment.time_spent % 60}s</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    textAlign: 'center',
                    background: scoreColor + '10',
                    padding: '10px 20px',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: scoreColor }}>
                      {assessment.overall_score}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Score
                    </div>
                  </div>
                  
                  <span style={{
                    padding: '8px 20px',
                    borderRadius: '30px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: assessment.passed ? '#E8F5E9' : '#FFEBEE',
                    color: assessment.passed ? '#2E7D32' : '#C62828',
                    border: `1px solid ${assessment.passed ? '#4CAF5030' : '#F4433630'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {assessment.passed ? '✓ Passed' : '✗ Failed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{
          marginTop: '30px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '15px',
          borderTop: '2px solid #f1f5f9',
          paddingTop: '30px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '14px 28px',
              background: 'white',
              color: '#64748b',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            Close
          </button>
          <button style={{
            padding: '14px 35px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            transition: 'all 0.2s ease',
            boxShadow: '0 8px 20px rgba(102,126,234,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
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
            <span style={{ fontSize: '18px' }}>📄</span>
            Download Full Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SupervisorDashboard() {
  const router = useRouter();
  const { user_id } = router.query;
  const [supervisor, setSupervisor] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    completedAssessments: 0,
    averageScore: 0,
    highPotential: 0,
    byType: {}
  });

  useEffect(() => {
    if (user_id) {
      fetchSupervisorData();
      fetchCandidates();
    }
  }, [user_id]);

  useEffect(() => {
    if (candidates.length > 0) {
      calculateStats();
    }
  }, [candidates, selectedAssessmentType, dateRange]);

  const fetchSupervisorData = async () => {
    try {
      const { data, error } = await supabase
        .from("supervisors")
        .select("*")
        .eq("id", user_id)
        .single();

      if (error) throw error;
      setSupervisor(data);
    } catch (error) {
      console.error("Error fetching supervisor:", error);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      
      const { data: results, error } = await supabase
        .from("assessment_results")
        .select(`
          *,
          assessments (
            id,
            name,
            assessment_type,
            passing_score,
            icon_name
          )
        `)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const candidateMap = new Map();
      
      results?.forEach(result => {
        if (!candidateMap.has(result.user_id)) {
          candidateMap.set(result.user_id, {
            user_id: result.user_id,
            user_name: result.user_name || result.user_email?.split('@')[0] || 'Unknown',
            user_email: result.user_email,
            assessments: [],
            averageScore: 0,
            completedCount: 0,
            lastActive: result.completed_at,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
          });
        }
        
        const candidate = candidateMap.get(result.user_id);
        candidate.assessments.push({
          ...result,
          passed: result.overall_score >= (result.assessments?.passing_score || 60)
        });
        candidate.completedCount++;
        candidate.averageScore = candidate.assessments.reduce((sum, a) => sum + a.overall_score, 0) / candidate.completedCount;
      });

      setCandidates(Array.from(candidateMap.values()));
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let filteredAssessments = [];
    
    candidates.forEach(candidate => {
      candidate.assessments.forEach(assessment => {
        if (selectedAssessmentType === "all" || assessment.assessments?.assessment_type === selectedAssessmentType) {
          
          const completedDate = new Date(assessment.completed_at);
          const now = new Date();
          let include = true;
          
          switch(dateRange) {
            case "today":
              include = completedDate.toDateString() === now.toDateString();
              break;
            case "week":
              const weekAgo = new Date(now.setDate(now.getDate() - 7));
              include = completedDate >= weekAgo;
              break;
            case "month":
              const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
              include = completedDate >= monthAgo;
              break;
            default:
              include = true;
          }
          
          if (include) {
            filteredAssessments.push(assessment);
          }
        }
      });
    });

    const total = filteredAssessments.length;
    const totalScore = filteredAssessments.reduce((sum, a) => sum + a.overall_score, 0);
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
    const highPotential = filteredAssessments.filter(a => a.overall_score >= 80).length;

    const byType = {};
    filteredAssessments.forEach(assessment => {
      const type = assessment.assessments?.assessment_type || 'unknown';
      if (!byType[type]) {
        byType[type] = { count: 0, totalScore: 0, average: 0 };
      }
      byType[type].count++;
      byType[type].totalScore += assessment.overall_score;
    });

    Object.keys(byType).forEach(type => {
      byType[type].average = Math.round(byType[type].totalScore / byType[type].count);
    });

    setStats({
      totalAssessments: total,
      completedAssessments: total,
      averageScore: avgScore,
      highPotential: highPotential,
      byType
    });
  };

  const filteredCandidates = candidates.filter(candidate => {
    if (selectedAssessmentType === "all") return true;
    return candidate.assessments.some(a => a.assessments?.assessment_type === selectedAssessmentType);
  }).filter(candidate => 
    candidate.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
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
          boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
          textAlign: 'center',
          animation: 'slideIn 0.5s ease'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 25px'
          }} />
          <div style={{ fontSize: '20px', color: '#1a2639', fontWeight: '600', marginBottom: '10px' }}>
            Loading Dashboard
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Fetching candidate data...
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
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BACKGROUND_CONFIG.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.05,
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: BACKGROUND_CONFIG.overlay,
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${BACKGROUND_CONFIG.pattern})`,
        opacity: 0.03,
        zIndex: 0
      }} />

      {/* Main Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: "30px 20px",
        minHeight: "100vh"
      }}>
        <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "24px",
            padding: "35px",
            marginBottom: "30px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            animation: 'slideIn 0.5s ease'
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              flexWrap: "wrap", 
              gap: "20px" 
            }}>
              <div>
                <h1 style={{ 
                  margin: "0 0 10px 0", 
                  fontSize: "36px",
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: "800"
                }}>
                  👋 Welcome, {supervisor?.name || 'Supervisor'}
                </h1>
                <p style={{ color: "#64748b", margin: 0, fontSize: "16px", display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📊 Overview of candidate assessments and performance metrics</span>
                  <span style={{ width: '4px', height: '4px', background: '#cbd5e1', borderRadius: '50%' }} />
                  <span>🕒 Last updated: {new Date().toLocaleTimeString()}</span>
                </p>
              </div>
              
              {/* Date Range Filter */}
              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  style={{
                    padding: "14px 25px",
                    borderRadius: "40px",
                    border: "2px solid #e2e8f0",
                    background: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    outline: "none",
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="week">📅 Last 7 days</option>
                  <option value="month">📅 Last 30 days</option>
                  <option value="today">📅 Today</option>
                  <option value="all">📅 All time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "25px",
            marginBottom: "30px"
          }}>
            <StatCard
              title="Total Assessments"
              value={stats.totalAssessments}
              subtitle={`${stats.totalAssessments} completed assessments`}
              icon="📊"
              color="#667eea"
              trend={{
                isPositive: true,
                value: '+12%',
                icon: '📈'
              }}
            />
            
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              subtitle={stats.averageScore >= 70 ? 'Above target (70%)' : 'Below target (70%)'}
              icon="🎯"
              color={stats.averageScore >= 70 ? '#4CAF50' : '#FF9800'}
              trend={{
                isPositive: stats.averageScore >= 70,
                value: stats.averageScore >= 70 ? '+5%' : '-2%',
                icon: stats.averageScore >= 70 ? '📈' : '📉'
              }}
            />
            
            <StatCard
              title="High Potential"
              value={stats.highPotential}
              subtitle="Candidates scoring 80%+"
              icon="⭐"
              color="#FFC107"
              trend={{
                isPositive: true,
                value: '+3',
                icon: '👑'
              }}
            />
            
            <StatCard
              title="Active Candidates"
              value={candidates.length}
              subtitle="Completed at least 1 assessment"
              icon="👥"
              color="#9C27B0"
            />
          </div>

          {/* Assessment Type Cards - 6 CARDS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            marginBottom: "30px"
          }}>
            {assessmentTypes.filter(t => t.id !== 'all').map(type => (
              <AssessmentTypeCard
                key={type.id}
                type={type}
                stats={stats.byType[type.id]}
                isSelected={selectedAssessmentType === type.id}
                onClick={() => setSelectedAssessmentType(type.id)}
              />
            ))}
          </div>

          {/* Candidates Table */}
          <div style={{
            background: "rgba(255,255,255,0.98)",
            backdropFilter: 'blur(10px)',
            borderRadius: "24px",
            padding: "30px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            animation: 'slideIn 0.5s ease'
          }}>
            {/* Table Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px",
              flexWrap: "wrap",
              gap: "15px"
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ margin: 0, fontSize: "24px", color: "#1a2639", fontWeight: "600" }}>
                  Candidate Performance
                </h2>
                <span style={{
                  background: '#667eea20',
                  padding: '6px 16px',
                  borderRadius: '30px',
                  fontSize: '14px',
                  color: '#667eea',
                  fontWeight: '600'
                }}>
                  {filteredCandidates.length} candidates
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: '#94a3b8'
                  }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "14px 20px 14px 45px",
                      borderRadius: "40px",
                      border: "2px solid #e2e8f0",
                      width: "300px",
                      fontSize: "14px",
                      outline: "none",
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                <button style={{
                  padding: "14px 30px",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "white",
                  border: "none",
                  borderRadius: "40px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "all 0.2s ease",
                  boxShadow: "0 8px 20px rgba(102,126,234,0.3)",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 25px rgba(102,126,234,0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.3)';
                }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  Export Report
                </button>
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "80px 20px",
                background: "#f8fafc",
                borderRadius: "16px"
              }}>
                <div style={{ fontSize: "64px", marginBottom: "20px", opacity: 0.5 }}>📊</div>
                <h3 style={{ color: "#1a2639", marginBottom: "10px", fontSize: "20px" }}>
                  {searchTerm ? 'No matching candidates' : 'No Data Available'}
                </h3>
                <p style={{ color: "#64748b", fontSize: "16px" }}>
                  {searchTerm 
                    ? `No candidates found matching "${searchTerm}"`
                    : "Candidates haven't completed any assessments yet."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      marginTop: '20px',
                      padding: '12px 30px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '40px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: "2px solid #e2e8f0",
                      background: '#f8fafc'
                    }}>
                      <th style={{ textAlign: "left", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Candidate
                      </th>
                      <th style={{ textAlign: "left", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Email
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Completed
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Avg Score
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Risk Level
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Readiness
                      </th>
                      <th style={{ textAlign: "center", padding: "20px 15px", color: "#475569", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map(candidate => (
                      <CandidateRow
                        key={candidate.user_id}
                        candidate={candidate}
                        onSelect={setSelectedCandidate}
                        isSelected={selectedCandidate?.user_id === candidate.user_id}
                        hoveredRow={hoveredRow}
                        setHoveredRow={setHoveredRow}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </AppLayout>
  );
}
