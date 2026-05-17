import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { signToken } from './_lib/token'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { game, difficulty } = (req.body ?? {}) as Record<string, unknown>
  if (typeof game !== 'string' || typeof difficulty !== 'string') {
    return res.status(400).json({ error: 'game and difficulty are required' })
  }
  const VALID_GAMES = ['minesweeper']
  const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
  if (!VALID_GAMES.includes(game) || !VALID_DIFFICULTIES.includes(difficulty)) {
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
