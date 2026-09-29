import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { LeaderboardPage } from '../components/Leaderboard'
import { MenuCard, MenuOptionList } from '../components/MenuCard'
import { ResultOverlay } from '../components/ResultOverlay'
import { UsernameNotice } from '../components/UsernameNotice'
import { useLanguage } from '../context/language'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { formatTime } from '../lib/format'
import './Memory.css'

type DifficultyConfig = {
  key: 'easy' | 'medium' | 'hard'
  rows: number
  cols: number
  pairs: number
  cellSize: number
}

const DIFFICULTIES: DifficultyConfig[] = [
  { key: 'easy', rows: 4, cols: 4, pairs: 8, cellSize: 96 },
  { key: 'medium', rows: 5, cols: 6, pairs: 15, cellSize: 80 },
  { key: 'hard', rows: 7, cols: 8, pairs: 28, cellSize: 70 },
]

const ALL_LANGS = [
  'javascript', 'typescript', 'html5', 'css3', 'react', 'nodejs',
  'python', 'java', 'php', 'cplusplus', 'csharp', 'go',
  'rust', 'ruby', 'swift', 'kotlin', 'vuejs', 'angularjs',
  'docker', 'git', 'mongodb', 'postgresql', 'mysql', 'redis',
  'linux', 'bash', 'graphql', 'sass',
]

/** How long a mismatched pair stays face up. */
const MISMATCH_DELAY_MS = 900

type CardState = {
  id: number
  lang: string
  flipped: boolean
  matched: boolean
}

type GamePhase = 'idle' | 'playing' | 'locked' | 'won'

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
    cards.push({ id: i * 2, lang, flipped: false, matched: false })
    cards.push({ id: i * 2 + 1, lang, flipped: false, matched: false })
  })
  return shuffle(cards)
}

export default function Memory() {
  const { lang, difficulty: difficultyParam } = useParams<{ lang: string; difficulty?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const difficulty = DIFFICULTIES.find((d) => d.key === difficultyParam) ?? null
  const isLeaderboardPage = location.pathname.endsWith('/leaderboard')

  const [cards, setCards] = useState<CardState[]>([])
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [firstFlipId, setFirstFlipId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  /** Bumped on every deal so a pending flip-back cannot touch a new deck. */
  const dealIdRef = useRef(0)

  const leaderboard = useLeaderboard({
    game: 'memory',
    difficulty: difficulty?.key ?? null,
    metric: 'time',
    session: !isLeaderboardPage,
    autoLoad: isLeaderboardPage,
  })
  const { submit, startSession } = leaderboard

  const deal = useCallback(() => {
    dealIdRef.current += 1
    setCards(difficulty ? buildDeck(difficulty.pairs) : [])
    setPhase('idle')
    setFirstFlipId(null)
    setStartTime(null)
    setElapsedTime(0)
  }, [difficulty])

  useEffect(() => {
    deal()
  }, [deal])

  useEffect(() => {
    if (!startTime || phase === 'won') return
    const interval = setInterval(() => setElapsedTime((Date.now() - startTime) / 1000), 50)
    return () => clearInterval(interval)
  }, [startTime, phase])

  // Win once every card is matched.
  useEffect(() => {
    if (phase === 'won' || cards.length === 0) return
    if (!cards.every((card) => card.matched)) return

    const finalTime = startTime ? (Date.now() - startTime) / 1000 : elapsedTime
    setPhase('won')
    setElapsedTime(finalTime)
    void submit(finalTime)
  }, [cards, elapsedTime, phase, startTime, submit])

  const handleCardClick = (id: number) => {
    if (phase === 'locked' || phase === 'won') return
    const card = cards.find((c) => c.id === id)
    if (!card || card.flipped || card.matched) return

    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)))

    if (phase === 'idle') {
      setPhase('playing')
      setStartTime(Date.now())
    }

    if (firstFlipId === null) {
      setFirstFlipId(id)
      return
    }

    const firstCard = cards.find((c) => c.id === firstFlipId)!
    const firstId = firstFlipId
    setFirstFlipId(null)
    const isPair = (c: CardState) => c.id === firstId || c.id === id

    if (firstCard.lang === card.lang) {
      setCards((prev) => prev.map((c) => (isPair(c) ? { ...c, flipped: true, matched: true } : c)))
      return
    }

    setPhase('locked')
    const dealId = dealIdRef.current
    setTimeout(() => {
      if (dealIdRef.current !== dealId) return
      setCards((prev) => prev.map((c) => (isPair(c) ? { ...c, flipped: false } : c)))
      setPhase('playing')
    }, MISMATCH_DELAY_MS)
  }

  const reset = () => {
    deal()
    startSession()
  }

  if (!difficulty) {
    return (
      <GameFrame gameName={t('memory')} onBack={() => navigate(`/${lang}`)}>
        <div className="game-page game-page--center">
          <MenuCard title={t('difficulty.choose')} withUsername>
            <MenuOptionList
              options={DIFFICULTIES.map((option) => ({
                key: option.key,
                label: t(`difficulty.${option.key}`),
                meta: `${option.cols}×${option.rows}`,
              }))}
              onSelect={(key) => navigate(`/${lang}/memory/${key}`)}
            />
          </MenuCard>
        </div>
      </GameFrame>
    )
  }

  const leaderboardHref = `/${lang}/memory/${difficulty.key}/leaderboard`

  if (isLeaderboardPage) {
    return (
      <GameFrame
        gameName={t('memory')}
        onBack={() => navigate(`/${lang}/memory/${difficulty.key}`)}
        leaderboardHref={leaderboardHref}
      >
        <LeaderboardPage
          title={`${t('leaderboard.title')} · ${t(`difficulty.${difficulty.key}`)}`}
          meta={`${difficulty.cols}×${difficulty.rows} · ${difficulty.pairs} ${t('memory.pairs')}`}
          metric="time"
          entries={leaderboard.entries}
          loading={leaderboard.loading}
          playerRank={leaderboard.playerRank}
          playerEntry={leaderboard.playerEntry}
        />
      </GameFrame>
    )
  }

  return (
    <GameFrame
      gameName={t('memory')}
      onBack={() => navigate(`/${lang}/memory`)}
      leaderboardHref={leaderboardHref}
    >
      <div className="game-page game-page--scroll">
        <UsernameNotice />

        <div className="game-hud">
          <div className="game-hud-info">
            {t(`difficulty.${difficulty.key}`)} · {difficulty.cols}×{difficulty.rows} ·{' '}
            {t('btn.timer')}: <span className="timer">{formatTime(elapsedTime)}</span>
          </div>
          <div className="game-hud-actions">
            <button className="btn" onClick={() => navigate(`/${lang}/memory`)} type="button">
              {t('btn.difficulty')}
            </button>
            <button className="btn" onClick={reset} type="button">
              {t('btn.reset')}
            </button>
          </div>
        </div>

        <div className="mem-board-wrapper">
          <div
            className="mem-board"
            style={
              { gridTemplateColumns: `repeat(${difficulty.cols}, ${difficulty.cellSize}px)` } as CSSProperties
            }
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className={`mem-card${card.flipped || card.matched ? ' flipped' : ''}${
                  card.matched ? ' matched' : ''
                }`}
                onClick={() => handleCardClick(card.id)}
                role="button"
                tabIndex={0}
                aria-label={card.matched ? card.lang : 'hidden card'}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') handleCardClick(card.id)
                }}
              >
                <div className="mem-card-inner">
                  <div className="mem-card-front">&lt;/&gt;</div>
                  <div className="mem-card-back">
                    <img src={`/icons/langs/${card.lang}.svg`} alt={card.lang} draggable={false} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {phase === 'won' && (
          <ResultOverlay
            tone="success"
            title={t('game.win')}
            detail={formatTime(elapsedTime)}
            pending={leaderboard.submitting}
            rank={leaderboard.playerRank}
          />
        )}
      </div>
    </GameFrame>
  )
}
