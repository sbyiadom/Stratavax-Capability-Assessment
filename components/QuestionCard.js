export default function QuestionCard({ question, selected, onSelect, disabled = false }) {
  // Determine answer style based on question section
  const getAnswerStyle = (section) => {
    switch(section) {
      case 'Cognitive Abilities':
        return { 
          type: 'cognitive', 
          labels: ['A', 'B', 'C', 'D'],
          description: 'Select the correct answer' 
        };
      case 'Personality Assessment':
        return { 
          type: 'likert', 
          labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
          description: 'Rate how much you agree' 
        };
      case 'Leadership Potential':
        return { 
          type: 'frequency', 
          labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
          description: 'How frequently does this apply?' 
        };
      case 'Technical Competence':
        return { 
          type: 'proficiency', 
          labels: ['Beginner', 'Basic', 'Competent', 'Proficient', 'Expert'],
          description: 'Rate your proficiency level' 
        };
      case 'Performance Metrics':
        return { 
          type: 'rating', 
          labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'],
          description: 'Rate your performance' 
        };
      default:
        return { 
          type: 'default', 
          labels: [],
          description: 'Select an option' 
        };
    }
  };

  const answerStyle = getAnswerStyle(question.section);

  return (
    <div>
      <p style={{ fontWeight: 600, fontSize: "18px", marginBottom: "20px" }}>
        {question.question_text}
      </p>
      
      {/* Show answer type hint */}
      {question.section !== 'Cognitive Abilities' && (
        <div style={{ 
          fontSize: "14px", 
          color: "#666", 
          backgroundColor: "#f5f5f5", 
          padding: "8px 12px", 
          borderRadius: "6px",
          marginBottom: "15px",
          borderLeft: "3px solid #ccc"
        }}>
          <strong>Instructions:</strong> {answerStyle.description}
        </div>
      )}
      
      {/* Special hint for cognitive questions */}
      {question.section === 'Cognitive Abilities' && (
        <div style={{ 
          fontSize: "14px", 
          color: "#1565c0", 
          backgroundColor: "#e3f2fd", 
          padding: "8px 12px", 
          borderRadius: "6px",
          marginBottom: "15px",
          borderLeft: "3px solid #1565c0"
        }}>
          <strong>Select the correct answer:</strong> Choose the most accurate option.
        </div>
      )}
      
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt, index) => {
          // For cognitive questions, show A/B/C/D labels
          const label = question.section === 'Cognitive Abilities' 
            ? answerStyle.labels[index] + '. '
            : '';
          
          // For other sections, use the scale labels
          const answerText = question.section === 'Cognitive Abilities' 
            ? opt.answer_text 
            : `${answerStyle.labels[index]}: ${opt.answer_text}`;
          
          return (
            <button
              key={opt.id}
              onClick={() => !disabled && onSelect(opt.id)}
              disabled={disabled}
              style={{
                padding: "12px 15px",
                borderRadius: 8,
                border: selected === opt.id ? "2px solid #4CAF50" : "1px solid #ccc",
                background: selected === opt.id ? "#e8f5e9" : "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                opacity: disabled ? 0.7 : 1,
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "50px"
              }}
              onMouseEnter={(e) => {
                if (!disabled && selected !== opt.id) {
                  e.currentTarget.style.background = "#f8f9fa";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && selected !== opt.id) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <span style={{ flex: 1 }}>
                <strong style={{ color: question.section === 'Cognitive Abilities' ? "#1565c0" : "#333" }}>
                  {label}
                </strong>
                {answerText}
              </span>
              
              {/* Show score in development mode */}
              {process.env.NODE_ENV === 'development' && (
                <span style={{
                  fontSize: "11px",
                  color: "#666",
                  backgroundColor: "#f0f0f0",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  marginLeft: "10px",
                  fontWeight: "500",
                  minWidth: "60px",
                  textAlign: "center"
                }}>
                  Score: {opt.score}/5
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
