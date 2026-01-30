export function calculateElapsedSeconds(startTime, previousElapsed = 0) {
  const start = new Date(startTime).getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / 1000) + previousElapsed;
}

export function remainingSeconds(elapsed, total) {
  return Math.max(total - elapsed, 0);
}

export function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
