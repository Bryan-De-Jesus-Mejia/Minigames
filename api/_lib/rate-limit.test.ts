import { beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, getClientIp, resetRateLimitState } from './rate-limit'

beforeEach(() => {
  resetRateLimitState()
})

describe('rate limit helpers', () => {
  it('extracts the client ip from forwarded headers', () => {
    expect(getClientIp({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' })).toBe('203.0.113.10')
    expect(getClientIp({ 'x-vercel-forwarded-for': '198.51.100.7' })).toBe('198.51.100.7')
    expect(getClientIp({ 'x-real-ip': '192.0.2.5' })).toBe('192.0.2.5')
    expect(getClientIp({})).toBe('unknown')
  })

  it('allows requests until the limit is reached', () => {
    const first = checkRateLimit('ip-1', 2, 1000, 100)
    const second = checkRateLimit('ip-1', 2, 1000, 200)
    const third = checkRateLimit('ip-1', 2, 1000, 300)

    expect(first).toMatchObject({ allowed: true, remaining: 1 })
    expect(second).toMatchObject({ allowed: true, remaining: 0 })
    expect(third.allowed).toBe(false)
    expect(third.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after the window elapses', () => {
    expect(checkRateLimit('ip-2', 1, 1000, 100).allowed).toBe(true)
    expect(checkRateLimit('ip-2', 1, 1000, 200).allowed).toBe(false)
    expect(checkRateLimit('ip-2', 1, 1000, 1200).allowed).toBe(true)
  })
})