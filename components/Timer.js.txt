// components/Timer.js
import { formatTime } from "../utils/time";

export default function Timer({ elapsed, totalSeconds }) {
  return (
    <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 10 }}>
      Time Remaining: {formatTime(totalSeconds - elapsed)}
    </div>
  );
}
