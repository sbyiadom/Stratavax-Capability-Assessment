export default function QuestionCard({ question, selected, onSelect, disabled = false }) {
  // Determine answer style based on question section
  const getAnswerStyle = (section) => {
    switch(section) {
      case 'Cognitive Abilities':
        return { type: 'cognitive', prefix: 'A', 'B', 'C', 'D' };
      case 'Personality Assessment':
        return { type: 'likert', labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] };
      case 'Leadership Potential':
        return { type: 'frequency', labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] };
      case 'Technical Competence':
        return { type: 'proficiency', labels: ['Beginner', 'Basic', 'Competent', 'Proficient', 'Expert'] };
      case 'Performance Metrics':
        return { type: 'rating', labels: ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'] };
      default:
        return { type: 'default', labels: [] };
    }
  };

  const answerStyle = getAnswerStyle(question.section);

  return (
    <div>
      <p style={{ fontWeight: 600, fontSize: "18px", marginBottom: "20px" }}>
        {question.question_text}
      </p>
      
      {/* Show answer type hint for cognitive questions */}
      {question.section === 'Cognitive Abilities' && (
        <div style={{ 
          fontSize: "14px", 
          color: "#666", 
          backgroundColor: "#e3f2fd", 
          padding: "8px 12px", 
          borderRadius: "6px",
          marginBottom: "15px",
          borderLeft: "3px solid #1565c0"
        }}>
          <strong>Select the correct answer:</strong> Each option has a different score based on accuracy.
        </div>
      )}
      
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((opt, index) => {
          // For cognitive questions, show A/B/C/D labels
          const label = question.section === 'Cognitive Abilities' 
            ? ['A', 'B', 'C', 'D'][index] + '. '
            : '';
          
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
                justifyContent: "space-between"
              }}
              onMouseEnter={(e) => {
                if (!disabled && selected !== opt.id) {
                  e.currentTarget.style.background = "#f8f9fa";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && selected !== opt.id) {
                  e.currentTarget.style.background = "#fff";
                }
              }}
            >
              <span>
                <strong>{label}</strong>{opt.answer_text}
              </span>
              
              {/* Show score for cognitive questions in development */}
              {process.env.NODE_ENV === 'development' && (
                <span style={{
                  fontSize: "12px",
                  color: "#666",
                  backgroundColor: "#f0f0f0",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  marginLeft: "10px"
                }}>
                  Score: {opt.score}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
