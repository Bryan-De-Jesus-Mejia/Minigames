import { describe, it, expect, beforeEach } from 'vitest'
import { signToken, verifyToken } from './token'

beforeEach(() => {
  process.env.HMAC_SECRET = 'test-secret-at-least-32-bytes-ok'
})

describe('signToken / verifyToken', () => {
  it('round-trips a valid payload', () => {
    const payload = {
      game: 'minesweeper',
      difficulty: 'easy',
      iat: Math.floor(Date.now() / 1000),
      nonce: 'abc-123',
    }
    const token = signToken(payload)
    const result = verifyToken(token)
    expect(result).toMatchObject({ game: 'minesweeper', difficulty: 'easy' })
  })

  it('returns null when the signature is tampered', () => {
    const payload = {
      game: 'minesweeper',
      difficulty: 'easy',
      iat: Math.floor(Date.now() / 1000),
      nonce: 'abc-123',
    }
    const token = signToken(payload)
    const tampered = token.slice(0, -3) + 'xxx'
    expect(verifyToken(tampered)).toBeNull()
  })

  it('returns null for a token older than 2 hours', () => {
    const payload = {
      game: 'minesweeper',
      difficulty: 'easy',
      iat: Math.floor(Date.now() / 1000) - 7201,
      nonce: 'abc-123',
    }
    const token = signToken(payload)
    expect(verifyToken(token)).toBeNull()
  })

  it('returns null for a malformed string', () => {
    expect(verifyToken('not-a-token')).toBeNull()
    expect(verifyToken('')).toBeNull()
  })
})
