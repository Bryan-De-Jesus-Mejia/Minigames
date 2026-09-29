/** mm:ss.mmm — used by every time-based leaderboard and HUD. */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const milliseconds = Math.floor((totalSeconds % 1) * 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}
