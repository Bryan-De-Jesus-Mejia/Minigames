/**
 * Thin client for the two leaderboard endpoints. All three games used to inline
 * these fetch calls with slightly different error handling.
 */

/** Time-based games rank ascending; score-based games rank descending. */
export type Metric = 'time' | 'score'

export type LeaderboardEntry = {
  username: string
  time?: number
  score?: number
  date: string
}

export type LeaderboardResult = {
  entries: LeaderboardEntry[]
  playerRank?: number
  playerEntry?: LeaderboardEntry
}

export function entryValue(entry: LeaderboardEntry, metric: Metric): number {
  return (metric === 'score' ? entry.score : entry.time) ?? 0
}

/** Returns a signed session token, or null when the API is unreachable. */
export async function createGameSession(game: string, difficulty: string): Promise<string | null> {
  try {
    const response = await fetch('/api/game-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, difficulty }),
    })
    if (!response.ok) return null
    const data = (await response.json()) as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

export async function fetchLeaderboard(
  game: string,
  difficulty: string,
  username: string,
): Promise<LeaderboardResult> {
  const query = new URLSearchParams({ game, difficulty, username })
  try {
    const response = await fetch(`/api/leaderboard?${query}`)
    if (!response.ok) return { entries: [] }
    return (await response.json()) as LeaderboardResult
  } catch {
    return { entries: [] }
  }
}

/** Returns the refreshed board, or null when the submission failed. */
export async function submitScore(
  token: string,
  username: string,
  metric: Metric,
  value: number,
): Promise<LeaderboardResult | null> {
  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username, [metric]: value }),
    })
    if (!response.ok) return null
    return (await response.json()) as LeaderboardResult
  } catch {
    return null
  }
}
