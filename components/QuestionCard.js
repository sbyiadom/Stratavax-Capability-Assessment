export default function QuestionCard({ question, selected, onSelect, disabled = false }) {
  
  // Check if question has options
  const hasOptions = question.options && question.options.length > 0;
  
  // If no options, show a message
  if (!hasOptions) {
    return (
      <div style={{ 
        padding: "20px", 
        backgroundColor: "#fff3cd", 
        border: "1px solid #ffeaa7",
        borderRadius: "8px",
        textAlign: "center"
      }}>
        <p style={{ color: "#856404", margin: 0 }}>
          No answer options available for this question. Please contact support.
        </p>
        <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
          Question ID: {question.id} | Section: {question.section}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ 
        fontWeight: 600, 
        fontSize: "18px", 
        marginBottom: "20px",
        lineHeight: "1.5"
      }}>
        {question.question_text}
      </p>
      
      {/* Answer type indicator */}
      <div style={{ 
        fontSize: "14px", 
        color: "#666", 
        backgroundColor: "#f8f9fa", 
        padding: "8px 12px", 
        borderRadius: "6px",
        marginBottom: "20px",
        borderLeft: "3px solid #6c757d"
      }}>
        <strong>Instructions:</strong> {
          question.section === 'Cognitive Abilities' 
            ? 'Select the correct answer (A, B, C, or D)' 
            : 'Select the option that best describes you'
        }
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {question.options.map((opt, index) => {
          // Label for cognitive questions
          const label = question.section === 'Cognitive Abilities' 
            ? ['A', 'B', 'C', 'D'][index] + '. '
            : '';
          
          return (
            <button
              key={opt.id}
              onClick={() => !disabled && onSelect(opt.id)}
              disabled={disabled}
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                border: selected === opt.id ? "2px solid #4CAF50" : "1px solid #dee2e6",
                background: selected === opt.id ? "#e8f5e9" : "#fff",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                opacity: disabled ? 0.6 : 1,
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "60px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                {/* Option label */}
                <div style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: selected === opt.id ? "#4CAF50" : "#6c757d",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "14px",
                  flexShrink: 0
                }}>
                  {label || (index + 1)}
                </div>
                
                {/* Answer text */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>
                    {opt.answer_text}
                  </div>
                  
                  {/* Show score in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666", 
                      marginTop: "4px",
                      fontFamily: "monospace"
                    }}>
                      ID: {opt.id} | Score: {opt.score}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Selection indicator */}
              {selected === opt.id && (
                <div style={{ color: "#4CAF50", fontSize: "20px", marginLeft: "10px" }}>
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginTop: "20px", 
          padding: "10px", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "6px",
          fontSize: "12px",
          color: "#666"
        }}>
          <strong>Debug:</strong> Question ID: {question.id} | Options: {question.options?.length || 0} | 
          Selected: {selected || 'none'}
        </div>
      )}
    </div>
  );
}
