export default function QuestionNav({ questions, answers, current, onJump, compact = false }) {
  const questionsPerRow = compact ? 10 : 10;
  const rows = Math.ceil(questions.length / questionsPerRow);
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{
          display: "flex",
          gap: "6px",
          justifyContent: "center"
        }}>
          {questions
            .slice(rowIndex * questionsPerRow, (rowIndex + 1) * questionsPerRow)
            .map((q, index) => {
              const questionNumber = rowIndex * questionsPerRow + index + 1;
              const isAnswered = answers[q.id];
              const isCurrent = current === (questionNumber - 1);
              
              return (
                <button
                  key={q.id}
                  onClick={() => onJump(questionNumber - 1)}
                  style={{
                    width: compact ? "26px" : "28px",
                    height: compact ? "26px" : "28px",
                    borderRadius: "6px",
                    border: "none",
                    background: isCurrent ? "#1565c0" : 
                              isAnswered ? "#4caf50" : "#e0e0e0",
                    color: isCurrent ? "white" : 
                          isAnswered ? "white" : "#666",
                    cursor: "pointer",
                    fontSize: compact ? "12px" : "13px",
                    fontWeight: isCurrent ? "700" : "500",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                  }}
                  title={`Question ${questionNumber}: ${isAnswered ? 'Answered' : 'Not answered'}`}
                >
                  {questionNumber}
                </button>
              );
            })}
        </div>
      ))}
      
      {/* Legend */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        marginTop: "12px",
        fontSize: "11px",
        color: "#666"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", background: "#1565c0", borderRadius: "3px" }} />
          <span>Current</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", background: "#4caf50", borderRadius: "3px" }} />
          <span>Answered</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", background: "#e0e0e0", borderRadius: "3px" }} />
          <span>Not Answered</span>
        </div>
      </div>
    </div>
  );
}
