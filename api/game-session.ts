import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { signToken } from './_lib/token'
import { checkRateLimit, getClientIp } from './_lib/rate-limit'

const GAME_SESSION_LIMIT = 30
const GAME_SESSION_WINDOW_MS = 60_000

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rateLimitResult = checkRateLimit(
    `game-session:${getClientIp(req.headers)}`,
    GAME_SESSION_LIMIT,
    GAME_SESSION_WINDOW_MS,
  )
  if (!rateLimitResult.allowed) {
    if (rateLimitResult.retryAfterMs !== undefined) {
      res.setHeader('Retry-After', Math.ceil(rateLimitResult.retryAfterMs / 1000))
    }
    return res.status(429).json({ error: 'Too many requests' })
  }

  const { game, difficulty } = (req.body ?? {}) as Record<string, unknown>
  if (typeof game !== 'string' || typeof difficulty !== 'string') {
    return res.status(400).json({ error: 'game and difficulty are required' })
  }
  const VALID_GAMES = ['minesweeper', 'memory', 'snake', 'tetris']
  const VALID_DIFFICULTIES_BY_GAME: Record<string, string[]> = {
    minesweeper: ['easy', 'medium', 'hard'],
    memory: ['easy', 'medium', 'hard'],
    snake: ['easy', 'medium', 'hard'],
    tetris: ['classic', 'marathon', 'zen'],
  }
  if (!VALID_GAMES.includes(game) || !VALID_DIFFICULTIES_BY_GAME[game]?.includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid game or difficulty' })
  }
  const token = signToken({
    game,
    difficulty,
    iat: Math.floor(Date.now() / 1000),
    nonce: randomUUID(),
  })
  return res.status(200).json({ token })
}
