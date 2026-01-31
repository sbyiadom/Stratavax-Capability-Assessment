export default function QuestionCard({ question, selected, onSelect, disabled, compact = false }) {
  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr", 
      gap: "10px",
      maxHeight: "100%",
      overflow: "hidden"
    }}>
      {question.options && question.options.map((option, index) => (
        <button
          key={option.id}
          onClick={() => !disabled && onSelect(option.id)}
          disabled={disabled}
          style={{
            padding: "14px 16px",
            background: selected === option.id ? "#e3f2fd" : "white",
            border: `2px solid ${selected === option.id ? "#1565c0" : "#e0e0e0"}`,
            borderRadius: "10px",
            cursor: disabled ? "not-allowed" : "pointer",
            textAlign: "left",
            fontSize: compact ? "14px" : "15px",
            lineHeight: 1.5,
            transition: "all 0.2s",
            color: "#333",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            opacity: disabled ? 0.7 : 1,
            boxShadow: selected === option.id ? "0 2px 8px rgba(21, 101, 192, 0.2)" : "none"
          }}
        >
          <div style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: `2px solid ${selected === option.id ? "#1565c0" : "#ccc"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
            background: selected === option.id ? "#1565c0" : "transparent"
          }}>
            {selected === option.id && (
              <div style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "white"
              }} />
            )}
          </div>
          <span style={{ flex: 1 }}>{option.answer_text}</span>
        </button>
      ))}
    </div>
  );
}
