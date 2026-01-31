export default function QuestionCard({ question, selected, onSelect, disabled }) {
  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr", 
      gap: "8px"
    }}>
      {question.options && question.options.map((option, index) => (
        <button
          key={option.id}
          onClick={() => !disabled && onSelect(option.id)}
          disabled={disabled}
          style={{
            padding: "14px 16px",
            background: selected === option.id ? 
              "rgba(227, 242, 253, 0.9)" : 
              "rgba(255, 255, 255, 0.7)",
            border: `2px solid ${selected === option.id ? "#1565c0" : "rgba(224, 224, 224, 0.7)"}`,
            borderRadius: "10px",
            cursor: disabled ? "not-allowed" : "pointer",
            textAlign: "left",
            fontSize: "15px",
            lineHeight: 1.5,
            transition: "all 0.2s",
            color: "#333",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            opacity: disabled ? 0.7 : 1,
            boxShadow: selected === option.id ? 
              "0 2px 8px rgba(21, 101, 192, 0.3)" : 
              "0 2px 4px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)"
          }}
          onMouseOver={(e) => {
            if (!disabled && selected !== option.id) {
              e.target.style.background = "rgba(227, 242, 253, 0.6)";
              e.target.style.borderColor = "#90caf9";
            }
          }}
          onMouseOut={(e) => {
            if (!disabled && selected !== option.id) {
              e.target.style.background = "rgba(255, 255, 255, 0.7)";
              e.target.style.borderColor = "rgba(224, 224, 224, 0.7)";
            }
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
            background: selected === option.id ? "#1565c0" : "rgba(255, 255, 255, 0.5)"
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
