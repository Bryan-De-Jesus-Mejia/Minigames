import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './_lib/token'
import { readLeaderboard, appendScore } from './_lib/sheets'
import { checkRateLimit, getClientIp } from './_lib/rate-limit'

const DEFAULT_USERNAME = 'Player'
const LEADERBOARD_SUBMIT_LIMIT = 10
const LEADERBOARD_SUBMIT_WINDOW_MS = 60_000
const LEADERBOARD_LOOKUP_LIMIT = 120
const LEADERBOARD_LOOKUP_WINDOW_MS = 60_000

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
      const rateLimitResult = checkRateLimit(
        `leaderboard:get:${getClientIp(req.headers)}`,
        LEADERBOARD_LOOKUP_LIMIT,
        LEADERBOARD_LOOKUP_WINDOW_MS,
      )
      if (!rateLimitResult.allowed) {
        if (rateLimitResult.retryAfterMs !== undefined) {
          res.setHeader('Retry-After', Math.ceil(rateLimitResult.retryAfterMs / 1000))
        }
        return res.status(429).json({ error: 'Too many requests' })
      }

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
    const { token, username, time, score } = (req.body ?? {}) as Record<string, unknown>
    if (typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    const isScoreGame = payload.game === 'tetris'
    const rawValue = isScoreGame ? score : time
    if (typeof rawValue !== 'number') {
      return res.status(400).json({ error: isScoreGame ? 'score is required' : 'time is required' })
    }
    if (isScoreGame) {
      if (!Number.isInteger(rawValue) || rawValue < 0 || rawValue > 1_000_000) {
        return res.status(400).json({ error: 'Score out of plausible range' })
      }
    } else if (rawValue < 0.5 || rawValue > 7200) {
      return res.status(400).json({ error: 'Time out of plausible range' })
    }

    const rateLimitResult = checkRateLimit(
      `leaderboard:post:${getClientIp(req.headers)}`,
      LEADERBOARD_SUBMIT_LIMIT,
      LEADERBOARD_SUBMIT_WINDOW_MS,
    )
    if (!rateLimitResult.allowed) {
      if (rateLimitResult.retryAfterMs !== undefined) {
        res.setHeader('Retry-After', Math.ceil(rateLimitResult.retryAfterMs / 1000))
      }
      return res.status(429).json({ error: 'Too many requests' })
    }

    const safeUsername = normalizeLeaderboardUsername(username)
    const date = new Date().toISOString()
    try {
      if (safeUsername) {
        await appendScore(payload.game, payload.difficulty, safeUsername, rawValue, date)
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
