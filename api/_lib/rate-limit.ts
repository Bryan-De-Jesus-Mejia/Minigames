import type { IncomingHttpHeaders } from 'http'

type Bucket = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}

const buckets = new Map<string, Bucket>()

export function getClientIp(headers: IncomingHttpHeaders): string {
  const forwardedFor = headers['x-forwarded-for']
  const candidate = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.split(',')[0].trim()
  }

  const vercelForwardedFor = headers['x-vercel-forwarded-for']
  const vercelCandidate = Array.isArray(vercelForwardedFor) ? vercelForwardedFor[0] : vercelForwardedFor
  if (typeof vercelCandidate === 'string' && vercelCandidate.trim()) {
    return vercelCandidate.split(',')[0].trim()
  }

  const realIp = headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim()
  }

  return 'unknown'
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: Math.max(limit - 1, 0) }
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(bucket.resetAt - now, 0),
    }
  }

  bucket.count += 1
  return {
    allowed: true,
    remaining: Math.max(limit - bucket.count, 0),
  }
}

export function resetRateLimitState() {
  buckets.clear()
}