// components/QuestionCard.js
import React from 'react';

// Array of background images including both URL and local images
const backgroundImages = [
  'https://thumbs.dreamstime.com/b/happy-students-giving-high-five-school-education-friendship-concept-33187252.jpg',
  'https://img.freepik.com/free-photo/friends-people-group-teamwork-diversity_53876-31488.jpg?semt=ais_hybrid&w=740&q=80',
  'https://img.freepik.com/free-photo/people-studying-together-communicating_23-2147656354.jpg',
  '/images/backgrounds/cognitive-bg.jpg',
  '/images/backgrounds/personality-bg.jpg',
  '/images/backgrounds/leadership-bg.jpg',
  '/images/backgrounds/technical-bg.jpg',
  '/images/backgrounds/performance-bg.jpg'
];

export default function QuestionCard({ question, selected, onSelect, disabled, questionIndex }) {
  // Select a background image based on question index
  const bgIndex = questionIndex % backgroundImages.length;
  const backgroundImage = backgroundImages[bgIndex];
  
  // Fallback color if image fails to load
  const fallbackColor = 'rgba(255, 255, 255, 0.95)';
  
  return (
    <div 
      style={{ 
        background: `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), 
                    url('${backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '15px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backdropFilter: 'blur(3px)'
      }}
      onError={(e) => {
        // Fallback if background image fails to load
        e.currentTarget.style.background = fallbackColor;
        e.currentTarget.style.backgroundImage = 'none';
      }}
    >
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr', 
        gap: '10px',
        backdropFilter: 'blur(5px)'
      }}>
        {question.options && question.options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => !disabled && onSelect(option.id)}
            disabled={disabled}
            style={{
              padding: '16px 18px',
              background: selected === option.id ? 
                'rgba(227, 242, 253, 0.95)' : 
                'rgba(255, 255, 255, 0.9)',
              border: `2px solid ${selected === option.id ? '#1565c0' : 'rgba(224, 224, 224, 0.7)'}`,
              borderRadius: '12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontSize: '16px',
              lineHeight: 1.5,
              transition: 'all 0.2s',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              opacity: disabled ? 0.7 : 1,
              boxShadow: selected === option.id ? 
                '0 4px 12px rgba(21, 101, 192, 0.25)' : 
                '0 2px 6px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)',
              minHeight: '65px'
            }}
            onMouseOver={(e) => {
              if (!disabled && selected !== option.id) {
                e.currentTarget.style.background = 'rgba(227, 242, 253, 0.85)';
                e.currentTarget.style.borderColor = '#90caf9';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.12)';
              }
            }}
            onMouseOut={(e) => {
              if (!disabled && selected !== option.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.borderColor = 'rgba(224, 224, 224, 0.7)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
              }
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: `2px solid ${selected === option.id ? '#1565c0' : '#ccc'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: selected === option.id ? '#1565c0' : 'rgba(255, 255, 255, 0.8)',
              fontWeight: 'bold',
              fontSize: '14px',
              color: selected === option.id ? 'white' : '#666',
              boxShadow: selected === option.id ? '0 2px 6px rgba(21, 101, 192, 0.4)' : 'none'
            }}>
              {String.fromCharCode(65 + index)}
            </div>
            <span style={{ 
              flex: 1,
              fontWeight: selected === option.id ? '600' : '500'
            }}>
              {option.answer_text}
            </span>
            
            {selected === option.id && (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#1565c0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                animation: 'pulse 1.5s infinite'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'white'
                }} />
              </div>
            )}
          </button>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
