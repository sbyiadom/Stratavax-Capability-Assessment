// components/QuestionCard.js
export default function QuestionCard({ question, selected, onSelect }) {
  return (
    <div>
      <p style={{ fontWeight: 600 }}>{question.question_text}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: selected === opt.id ? "2px solid #4CAF50" : "1px solid #ccc",
              background: selected === opt.id ? "#e8f5e9" : "#fff",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {opt.answer_text}
          </button>
        ))}
      </div>
    </div>
  );
}
