import { describe, expect, it } from 'vitest'
import { normalizeLeaderboardUsername } from './leaderboard'

describe('normalizeLeaderboardUsername', () => {
  it('rejects the default unconfigured Player name', () => {
    expect(normalizeLeaderboardUsername('Player')).toBeNull()
    expect(normalizeLeaderboardUsername(' player ')).toBeNull()
    expect(normalizeLeaderboardUsername('PLAYER')).toBeNull()
  })

  it('keeps real usernames trimmed and capped', () => {
    expect(normalizeLeaderboardUsername('  Alex  ')).toBe('Alex')
    expect(normalizeLeaderboardUsername('a'.repeat(40))).toHaveLength(30)
  })

  it('rejects empty or non-string values', () => {
    expect(normalizeLeaderboardUsername('   ')).toBeNull()
    expect(normalizeLeaderboardUsername(undefined)).toBeNull()
    expect(normalizeLeaderboardUsername(null)).toBeNull()
  })
})
