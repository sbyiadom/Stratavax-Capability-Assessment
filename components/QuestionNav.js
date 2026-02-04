// components/QuestionNav.js
export default function QuestionNav({ questions, answers, current, onJump }) {
  return (
    <div style={{ flex: 1 }}>
      <h3>Questions</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {questions.map((q, i) => {
          const answered = answers[q.id] ? true : false;
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              style={{
                width: 35,
                height: 35,
                borderRadius: "50%",
                border: current === i ? "2px solid #1565c0" : "1px solid #ccc",
                backgroundColor: answered ? "#4CAF50" : "#fff",
                color: answered ? "#fff" : "#000",
                cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
