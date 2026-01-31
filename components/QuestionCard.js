export default function QuestionCard({ question, selected, onSelect, disabled, compact = false }) {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: compact ? "8px" : "12px",
      height: "100%",
      overflowY: "auto",
      paddingRight: "5px"
    }}>
      {question.options && question.options.map((option) => (
        <button
          key={option.id}
          onClick={() => !disabled && onSelect(option.id)}
          disabled={disabled}
          style={{
            padding: compact ? "12px 15px" : "15px 20px",
            background: selected === option.id ? "#e3f2fd" : "white",
            border: `2px solid ${selected === option.id ? "#1565c0" : "#e0e0e0"}`,
            borderRadius: "8px",
            cursor: disabled ? "not-allowed" : "pointer",
            textAlign: "left",
            fontSize: compact ? "14px" : "15px",
            lineHeight: 1.5,
            transition: "all 0.2s",
            color: "#333",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            opacity: disabled ? 0.7 : 1
          }}
        >
          <div style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: `2px solid ${selected === option.id ? "#1565c0" : "#ccc"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: selected === option.id ? "#1565c0" : "transparent"
          }}>
            {selected === option.id && (
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "white"
              }} />
            )}
          </div>
          {option.answer_text}
        </button>
      ))}
    </div>
  );
}
