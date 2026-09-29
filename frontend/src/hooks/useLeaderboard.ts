import { useCallback, useEffect, useRef, useState } from 'react'
import { createGameSession, fetchLeaderboard, submitScore } from '../lib/api'
import type { LeaderboardEntry, LeaderboardResult, Metric } from '../lib/api'
import { useUsername } from './useUsername'

type UseLeaderboardOptions = {
  game: string
  /** null while the player has not picked a difficulty/mode yet. */
  difficulty: string | null
  metric: Metric
  /** Open a signed session so a result can be submitted (the play route). */
  session?: boolean
  /** Load the public board on mount (the leaderboard route). */
  autoLoad?: boolean
}

/**
 * Owns everything leaderboard-related for a game: the signed session token, the
 * one-shot result submission and the board itself. Minesweeper, Memory and
 * Tetris each used to carry their own copy of this state machine.
 */
export function useLeaderboard({
  game,
  difficulty,
  metric,
  session = false,
  autoLoad = false,
}: UseLeaderboardOptions) {
  const { username } = useUsername()
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [playerRank, setPlayerRank] = useState<number | null>(null)
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null)

  const tokenRef = useRef<string | null>(null)
  const submittedRef = useRef(false)
  /** Bumped on every new session so stale responses can be discarded. */
  const sessionIdRef = useRef(0)

  const applyResult = useCallback((result: LeaderboardResult) => {
    setEntries(result.entries)
    setPlayerRank(result.playerRank ?? null)
    setPlayerEntry(result.playerEntry ?? null)
  }, [])

  const reset = useCallback(() => {
    sessionIdRef.current += 1
    tokenRef.current = null
    submittedRef.current = false
    setEntries(null)
    setPlayerRank(null)
    setPlayerEntry(null)
    setSubmitting(false)
  }, [])

  /** Discards any in-flight result and opens a fresh signed session. */
  const startSession = useCallback(() => {
    reset()
    if (!difficulty) return
    const sessionId = sessionIdRef.current
    void createGameSession(game, difficulty).then((token) => {
      if (sessionIdRef.current !== sessionId) return
      tokenRef.current = token
    })
  }, [difficulty, game, reset])

  const submit = useCallback(
    async (value: number) => {
      if (submittedRef.current || !difficulty) return
      submittedRef.current = true

      const token = tokenRef.current
      if (!token) return

      const sessionId = sessionIdRef.current
      setPlayerRank(null)
      setPlayerEntry(null)
      setSubmitting(true)
      const result = await submitScore(token, username, metric, value)
      if (sessionIdRef.current !== sessionId) return
      if (result) applyResult(result)
      setSubmitting(false)
    },
    [applyResult, difficulty, metric, username],
  )

  // Open a session whenever the game (re)starts on a playable route.
  useEffect(() => {
    if (!session || !difficulty) return
    startSession()
  }, [difficulty, session, startSession])

  // Load the public board on the leaderboard route.
  useEffect(() => {
    if (!autoLoad || !difficulty) return
    let cancelled = false
    setLoading(true)
    void fetchLeaderboard(game, difficulty, username).then((result) => {
      if (cancelled) return
      applyResult(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [applyResult, autoLoad, difficulty, game, username])

  return { entries, loading, submitting, playerRank, playerEntry, startSession, submit }
}
