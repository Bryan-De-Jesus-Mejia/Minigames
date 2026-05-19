import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { useLanguage } from '../context/LanguageContext'
import { UsernameInput } from '../components/UsernameInput'
import './Memory.css'

type DifficultyKey = 'easy' | 'medium' | 'hard'

type DifficultyConfig = {
  key: DifficultyKey
  rows: number
  cols: number
  pairs: number
  cellSize: number
}

const DIFFICULTIES: DifficultyConfig[] = [
  { key: 'easy',   rows: 4, cols: 4, pairs: 8,  cellSize: 90 },
  { key: 'medium', rows: 5, cols: 6, pairs: 15, cellSize: 80 },
  { key: 'hard',   rows: 7, cols: 8, pairs: 28, cellSize: 70 },
]

const ALL_LANGS = [
  'javascript', 'typescript', 'html5', 'css3', 'react', 'nodejs',
  'python', 'java', 'php', 'cplusplus', 'csharp', 'go',
  'rust', 'ruby', 'swift', 'kotlin', 'vuejs', 'angularjs',
  'docker', 'git', 'mongodb', 'postgresql', 'mysql', 'redis',
  'linux', 'bash', 'graphql', 'sass',
]

type CardState = {
  id: number
  lang: string
  flipped: boolean
  matched: boolean
}

type GamePhase = 'idle' | 'playing' | 'locked' | 'won'

type LeaderboardEntry = {
  username: string
  time: number
  date: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(pairs: number): CardState[] {
  const langs = shuffle(ALL_LANGS).slice(0, pairs)
  const cards: CardState[] = []
  langs.forEach((lang, i) => {
    cards.push({ id: i * 2,     lang, flipped: false, matched: false })
    cards.push({ id: i * 2 + 1, lang, flipped: false, matched: false })
  })
  return shuffle(cards)
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const milliseconds = Math.floor((totalSeconds % 1) * 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

export default function Memory() {
  const { lang, difficulty: difficultyParam } = useParams<{ lang: string; difficulty?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const [cards, setCards] = useState<CardState[]>([])
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [firstFlipId, setFirstFlipId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [scoreRecorded, setScoreRecorded] = useState(false)
  const [apiLeaderboard, setApiLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [playerRank, setPlayerRank] = useState<number | null>(null)
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const sessionTokenRef = useRef<string | null>(null)
  const gameIdRef = useRef(0)

  const difficulty = DIFFICULTIES.find(d => d.key === difficultyParam) ?? null
  const isLeaderboardPage = location.pathname.endsWith('/leaderboard')

  const hasCustomUsername = () => {
    const stored = localStorage.getItem('minigames-username')
    return stored !== null && stored !== 'Player'
  }

  const getParentRoute = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length <= 1) return `/${lang}`
    return `/${parts.slice(0, -1).join('/')}`
  }

  function startNewGame(diff: DifficultyConfig) {
    gameIdRef.current += 1
    setCards(buildDeck(diff.pairs))
    setPhase('idle')
    setFirstFlipId(null)
    setStartTime(null)
    setElapsedTime(0)
    setScoreRecorded(false)
    setApiLeaderboard(null)
    setPlayerRank(null)
    setPlayerEntry(null)
    sessionTokenRef.current = null
    fetch('/api/game-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'memory', difficulty: diff.key }),
    })
      .then(r => r.json())
      .then((data: { token: string }) => { sessionTokenRef.current = data.token })
      .catch(() => {})
  }

  useEffect(() => {
    if (!difficulty) {
      setCards([])
      setPhase('idle')
      setFirstFlipId(null)
      setStartTime(null)
      setElapsedTime(0)
      setScoreRecorded(false)
      sessionTokenRef.current = null
      setApiLeaderboard(null)
      setPlayerRank(null)
      setPlayerEntry(null)
      return
    }
    startNewGame(difficulty)
  }, [difficultyParam])

  useEffect(() => {
    if (!isLeaderboardPage || !difficulty) return
    setLeaderboardLoading(true)
    const username = localStorage.getItem('minigames-username') ?? 'Player'
    fetch(`/api/leaderboard?game=memory&difficulty=${difficulty.key}&username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then((data: { entries: LeaderboardEntry[]; playerRank?: number; playerEntry?: LeaderboardEntry }) => {
        setApiLeaderboard(data.entries)
        if (data.playerRank !== undefined) setPlayerRank(data.playerRank)
        if (data.playerEntry !== undefined) setPlayerEntry(data.playerEntry)
      })
      .catch(() => setApiLeaderboard([]))
      .finally(() => setLeaderboardLoading(false))
  }, [isLeaderboardPage, difficulty?.key])

  useEffect(() => {
    if (!startTime || phase === 'won') return
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000)
    }, 50)
    return () => clearInterval(interval)
  }, [startTime, phase])

  async function recordWinTime(time: number) {
    if (scoreRecorded || !sessionTokenRef.current || !difficulty) return
    setScoreRecorded(true)
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: sessionTokenRef.current,
          username: localStorage.getItem('minigames-username') ?? 'Player',
          time,
        }),
      })
      if (res.ok) {
        const data = await res.json() as {
          entries: LeaderboardEntry[]
          playerRank?: number
          playerEntry?: LeaderboardEntry
        }
        setApiLeaderboard(data.entries)
        if (data.playerRank !== undefined) setPlayerRank(data.playerRank)
        if (data.playerEntry !== undefined) setPlayerEntry(data.playerEntry)
      }
    } catch { /* score submission failed silently */ }
  }

  useEffect(() => {
    if (phase === 'won' || cards.length === 0) return
    if (cards.every(c => c.matched)) {
      const finalTime = startTime ? (Date.now() - startTime) / 1000 : elapsedTime
      setPhase('won')
      void recordWinTime(finalTime)
    }
  }, [cards])

  function handleCardClick(id: number) {
    if (phase === 'locked' || phase === 'won') return
    const card = cards.find(c => c.id === id)
    if (!card || card.flipped || card.matched) return

    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c))

    if (phase === 'idle') {
      setPhase('playing')
      setStartTime(Date.now())
    }

    if (firstFlipId === null) {
      setFirstFlipId(id)
      return
    }

    const firstCard = cards.find(c => c.id === firstFlipId)!
    const fId = firstFlipId
    setFirstFlipId(null)
    setPhase('locked')

    if (firstCard.lang === card.lang) {
      setCards(prev => prev.map(c =>
        c.id === fId || c.id === id ? { ...c, flipped: true, matched: true } : c
      ))
      setPhase('playing')
    } else {
      const capturedGameId = gameIdRef.current
      setTimeout(() => {
        if (gameIdRef.current !== capturedGameId) return
        setCards(prev => prev.map(c =>
          c.id === fId || c.id === id ? { ...c, flipped: false } : c
        ))
        setPhase('playing')
      }, 900)
    }
  }

  function renderLeaderboard() {
    if (leaderboardLoading) {
      return <div className="mem-leaderboard-empty">Loading...</div>
    }
    const entries = apiLeaderboard ?? []
    const podiumEntries = entries.slice(0, 3)
    const listEntries = entries.slice(3, 15)

    return (
      <div className="mem-leaderboard-layout">
        <div className="mem-podium">
          {podiumEntries.length === 0 ? (
            <div className="mem-leaderboard-empty">{t('leaderboard.empty')}</div>
          ) : (
            podiumEntries.map((entry, index) => {
              const place = index + 1
              return (
                <div
                  key={`${difficulty!.key}-${entry.time}-${entry.date}`}
                  className={`mem-podium-slot mem-podium-${place}`}
                >
                  <div className="mem-podium-place">#{place}</div>
                  <div className="mem-podium-username">{entry.username}</div>
                  <div className="mem-podium-time">{formatTime(entry.time)}</div>
                  <div className="mem-podium-date">{new Date(entry.date).toLocaleDateString()}</div>
                </div>
              )
            })
          )}
        </div>

        {listEntries.length > 0 && (
          <ol className="mem-leaderboard-list">
            {listEntries.map((entry, index) => {
              const place = index + 4
              return (
                <li
                  key={`${difficulty!.key}-${entry.time}-${entry.date}`}
                  className="mem-leaderboard-item"
                >
                  <span className="mem-rank">#{place}</span>
                  <span className="mem-score-user">{entry.username}</span>
                  <span className="mem-score-time">{formatTime(entry.time)}</span>
                  <span className="mem-score-date">{new Date(entry.date).toLocaleDateString()}</span>
                </li>
              )
            })}
          </ol>
        )}

        {playerRank !== null && playerRank > 15 && playerEntry !== null && (
          <>
            <div className="mem-leaderboard-separator">· · ·</div>
            <ol className="mem-leaderboard-list">
              <li className="mem-leaderboard-item mem-leaderboard-item-you">
                <span className="mem-rank">#{playerRank}</span>
                <span className="mem-score-user">{playerEntry.username}</span>
                <span className="mem-score-time">{formatTime(playerEntry.time)}</span>
                <span className="mem-score-date">{new Date(playerEntry.date).toLocaleDateString()}</span>
              </li>
            </ol>
          </>
        )}
      </div>
    )
  }

  if (!difficulty) {
    return (
      <GameFrame gameName={t('memory')} onBack={() => navigate(`/${lang}`)}>
        <div className="mem-container mem-menu">
          <div className="mem-menu-card">
            <div className="mem-menu-title">{t('difficulty.choose')}</div>
            <div className="mem-menu-username">
              <span className="mem-menu-username-label">{t('username.label')}</span>
              <UsernameInput />
            </div>
            <div className="mem-menu-list">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.key}
                  className="mem-menu-button"
                  onClick={() => navigate(`/${lang}/memory/${d.key}`)}
                  type="button"
                >
                  <span>{t(`difficulty.${d.key}`)}</span>
                  <span>{d.cols}×{d.rows} · {d.pairs} {t('memory.pairs')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GameFrame>
    )
  }

  if (isLeaderboardPage) {
    return (
      <GameFrame
        gameName={t('memory')}
        onBack={() => navigate(getParentRoute())}
        leaderboardHref={`/${lang}/memory/${difficulty.key}/leaderboard`}
      >
        <div className="mem-container mem-menu mem-leaderboard-page">
          <div className="mem-leaderboard-card">
            <div className="mem-leaderboard-title">
              {t('leaderboard.title')} · {t(`difficulty.${difficulty.key}`)}
            </div>
            <div className="mem-leaderboard-meta">
              {difficulty.cols}×{difficulty.rows} · {difficulty.pairs} {t('memory.pairs')}
            </div>
            {renderLeaderboard()}
          </div>
        </div>
      </GameFrame>
    )
  }

  return (
    <GameFrame
      gameName={t('memory')}
      onBack={() => navigate(getParentRoute())}
      leaderboardHref={`/${lang}/memory/${difficulty.key}/leaderboard`}
    >
      <div className="mem-container">
        {!noticeDismissed && !hasCustomUsername() && (
          <div className="mem-username-notice">
            <span>{t('username.notice')}</span>
            <button
              className="mem-notice-dismiss"
              onClick={() => setNoticeDismissed(true)}
              type="button"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mem-game">
          <div className="mem-header">
            <div className="mem-info">
              {t(`difficulty.${difficulty.key}`)} · {difficulty.cols}×{difficulty.rows} · {t('btn.timer')}: <span className="mem-timer">{formatTime(elapsedTime)}</span>
            </div>
            <div className="mem-controls">
              <button
                className="mem-btn"
                onClick={() => navigate(`/${lang}/memory`)}
                type="button"
              >
                {t('btn.difficulty')}
              </button>
              <button
                className="mem-btn"
                onClick={() => startNewGame(difficulty)}
                type="button"
              >
                {t('btn.reset')}
              </button>
            </div>
          </div>

          <div className="mem-board-wrapper">
            <div
              className="mem-board"
              style={{
                gridTemplateColumns: `repeat(${difficulty.cols}, ${difficulty.cellSize}px)`,
              } as React.CSSProperties}
            >
              {cards.map(card => (
                <div
                  key={card.id}
                  className={`mem-card${card.flipped || card.matched ? ' flipped' : ''}${card.matched ? ' matched' : ''}`}
                  onClick={() => handleCardClick(card.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={card.matched ? card.lang : 'hidden card'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') handleCardClick(card.id)
                  }}
                >
                  <div className="mem-card-inner">
                    <div className="mem-card-front">&lt;/&gt;</div>
                    <div className="mem-card-back">
                      <img
                        src={`/icons/langs/${card.lang}.svg`}
                        alt={card.lang}
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {phase === 'won' && (
          <div className="mem-overlay">
            <div>{t('memory.won')} · {formatTime(elapsedTime)}</div>
            {playerRank !== null && (
              <div className="mem-overlay-rank">#{playerRank}</div>
            )}
            <div className="mem-overlay-actions">
              <button
                className="mem-overlay-btn"
                onClick={() => startNewGame(difficulty)}
                type="button"
              >
                {t('memory.newGame')}
              </button>
              <button
                className="mem-overlay-btn"
                onClick={() => navigate(`/${lang}/memory/${difficulty.key}/leaderboard`)}
                type="button"
              >
                {t('leaderboard.view')}
              </button>
            </div>
          </div>
        )}
      </div>
    </GameFrame>
  )
}
