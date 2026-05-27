import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './_lib/token'
import { readLeaderboard, appendScore } from './_lib/sheets'

const DEFAULT_USERNAME = 'Player'

export function normalizeLeaderboardUsername(username: unknown): string | null {
  if (typeof username !== 'string') return null

  const trimmed = username.trim().slice(0, 30)
  if (!trimmed) return null
  if (trimmed.toLowerCase() === DEFAULT_USERNAME.toLowerCase()) return null

  return trimmed
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { game, difficulty, username } = req.query
    if (typeof game !== 'string' || typeof difficulty !== 'string') {
      return res.status(400).json({ error: 'game and difficulty query params required' })
    }
    try {
      const normalizedUsername = normalizeLeaderboardUsername(username)
      const opts = normalizedUsername ? { username: normalizedUsername } : undefined
      const result = await readLeaderboard(game, difficulty, opts)
      // Skip cache when looking up a player's personal rank so it's always fresh
      if (opts) {
        res.setHeader('Cache-Control', 'no-store')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
      }
      return res.status(200).json(result)
    } catch (err) {
      console.error('readLeaderboard failed:', err)
      return res.status(500).json({ error: 'Failed to read leaderboard' })
    }
  }

  if (req.method === 'POST') {
    const { token, username, time } = (req.body ?? {}) as Record<string, unknown>
    if (typeof token !== 'string' || typeof time !== 'number') {
      return res.status(400).json({ error: 'token and time are required' })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    if (time < 0.5 || time > 7200) {
      return res.status(400).json({ error: 'Time out of plausible range' })
    }
    const safeUsername = normalizeLeaderboardUsername(username)
    const date = new Date().toISOString()
    try {
      if (safeUsername) {
        await appendScore(payload.game, payload.difficulty, safeUsername, time, date)
      }
      const result = await readLeaderboard(
        payload.game,
        payload.difficulty,
        safeUsername ? { username: safeUsername } : undefined,
      )
      return res.status(200).json(result)
    } catch (err) {
      console.error('submit score failed:', err)
      return res.status(500).json({ error: 'Failed to submit score' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
