import { createHmac, timingSafeEqual } from 'crypto'

export interface TokenPayload {
  game: string
  difficulty: string
  iat: number
  nonce: string
}

export function signToken(payload: TokenPayload): string {
  const secret = process.env.HMAC_SECRET!
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyToken(token: string): TokenPayload | null {
  const secret = process.env.HMAC_SECRET
  if (!secret) return null
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null
  const payloadB64 = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString(),
    ) as TokenPayload
    if (Date.now() / 1000 - payload.iat > 7200) return null
    return payload
  } catch {
    return null
  }
}
