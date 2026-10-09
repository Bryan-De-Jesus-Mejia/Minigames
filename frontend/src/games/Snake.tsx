import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { LeaderboardPage } from '../components/Leaderboard'
import { MenuCard, MenuOptionList } from '../components/MenuCard'
import { ResultOverlay } from '../components/ResultOverlay'
import { UsernameNotice } from '../components/UsernameNotice'
import { ArrowIcon } from '../components/icons'
import { useLanguage } from '../context/language'
import { useLeaderboard } from '../hooks/useLeaderboard'
import './Snake.css'

type Direction = 'up' | 'down' | 'left' | 'right'
type Point = { x: number; y: number }

type Difficulty = {
  key: 'easy' | 'medium' | 'hard'
  cols: number
  rows: number
  cellSize: number
  /** Milliseconds per move at the start of a run. */
  startInterval: number
  /** The fastest the snake ever moves, however much food is eaten. */
  minInterval: number
  /** How much faster each speed-up makes the snake. */
  intervalStep: number
  /** Food eaten between one speed-up and the next. */
  foodPerLevel: number
  scoreMultiplier: number
}

const DIFFICULTIES: Difficulty[] = [
  { key: 'easy', cols: 15, rows: 15, cellSize: 34, startInterval: 160, minInterval: 80, intervalStep: 8, foodPerLevel: 4, scoreMultiplier: 1 },
  { key: 'medium', cols: 19, rows: 19, cellSize: 28, startInterval: 130, minInterval: 65, intervalStep: 7, foodPerLevel: 4, scoreMultiplier: 1.25 },
  { key: 'hard', cols: 23, rows: 23, cellSize: 24, startInterval: 105, minInterval: 55, intervalStep: 6, foodPerLevel: 3, scoreMultiplier: 1.5 },
]

const FOOD_BASE_SCORE = 10
/** Minimum drag distance, in pixels, before a touch gesture counts as a swipe. */
const SWIPE_THRESHOLD = 24
/** Direction changes buffered ahead of what's currently executing. */
const DIRECTION_QUEUE_LIMIT = 2

const DIRECTION_DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function createInitialSnake(difficulty: Difficulty): Point[] {
  const y = Math.floor(difficulty.rows / 2)
  const headX = Math.floor(difficulty.cols / 2)
  // Three segments laid out horizontally, head on the right, moving right.
  return [
    { x: headX, y },
    { x: headX - 1, y },
    { x: headX - 2, y },
  ]
}

function placeFood(difficulty: Difficulty, snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x}:${p.y}`))
  const free: Point[] = []
  for (let y = 0; y < difficulty.rows; y++) {
    for (let x = 0; x < difficulty.cols; x++) {
      if (!occupied.has(`${x}:${y}`)) free.push({ x, y })
    }
  }
  return free[Math.floor(Math.random() * free.length)]
}

function foodPoints(difficulty: Difficulty): number {
  return Math.round(FOOD_BASE_SCORE * difficulty.scoreMultiplier)
}

function getTickInterval(difficulty: Difficulty, foodEaten: number): number {
  const speedUps = Math.floor(foodEaten / difficulty.foodPerLevel)
  return Math.max(difficulty.minInterval, difficulty.startInterval - speedUps * difficulty.intervalStep)
}

export default function Snake() {
  const { lang, difficulty: difficultyParam } = useParams<{ lang: string; difficulty?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const difficulty = DIFFICULTIES.find((d) => d.key === difficultyParam) ?? null
  const isLeaderboardPage = location.pathname.endsWith('/leaderboard')

  const [snake, setSnake] = useState<Point[]>([])
  const [food, setFood] = useState<Point | null>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  // The tick loop reads these synchronously, so it never acts on stale state.
  const snakeRef = useRef<Point[]>([])
  const foodRef = useRef<Point | null>(null)
  const directionRef = useRef<Direction>('right')
  /** Buffered direction changes not yet applied, consumed one per tick so a
   *  quick double-tap (e.g. down-then-right around a corner) isn't lost when
   *  the second press lands before the next tick fires. */
  const directionQueueRef = useRef<Direction[]>([])
  const scoreRef = useRef(0)
  const foodEatenRef = useRef(0)
  const gameOverRef = useRef(false)
  const tickTimeoutRef = useRef<number | null>(null)
  const swipeStartRef = useRef<Point | null>(null)

  const leaderboard = useLeaderboard({
    game: 'snake',
    difficulty: difficulty?.key ?? null,
    metric: 'score',
    session: !isLeaderboardPage,
    autoLoad: isLeaderboardPage,
  })
  const { submit, startSession } = leaderboard

  const resetGame = useCallback(() => {
    if (!difficulty) {
      snakeRef.current = []
      foodRef.current = null
      setSnake([])
      setFood(null)
      setScore(0)
      setGameOver(false)
      return
    }

    const freshSnake = createInitialSnake(difficulty)
    const freshFood = placeFood(difficulty, freshSnake)

    snakeRef.current = freshSnake
    foodRef.current = freshFood
    directionRef.current = 'right'
    directionQueueRef.current = []
    scoreRef.current = 0
    foodEatenRef.current = 0
    gameOverRef.current = false

    setSnake(freshSnake)
    setFood(freshFood)
    setScore(0)
    setGameOver(false)
  }, [difficulty])

  useEffect(() => {
    resetGame()
  }, [resetGame])

  const restart = useCallback(() => {
    resetGame()
    startSession()
  }, [resetGame, startSession])

  /**
   * Queues a direction change instead of overwriting the pending one, so rapid
   * input isn't silently dropped. Validates against the last queued direction
   * (or the currently applied one when the queue is empty) so two buffered
   * moves can never combine into a reversal into the snake's own neck.
   */
  const queueDirection = useCallback((next: Direction) => {
    if (gameOverRef.current) return
    const queue = directionQueueRef.current
    const last = queue.length > 0 ? queue[queue.length - 1] : directionRef.current
    if (next === last || OPPOSITE_DIRECTION[next] === last) return
    if (queue.length >= DIRECTION_QUEUE_LIMIT) return
    queue.push(next)
  }, [])

  const tick = useCallback(() => {
    if (!difficulty || gameOverRef.current) return

    const direction = directionQueueRef.current.shift() ?? directionRef.current
    directionRef.current = direction
    const delta = DIRECTION_DELTAS[direction]

    const currentSnake = snakeRef.current
    const head = currentSnake[0]
    const nextHead: Point = { x: head.x + delta.x, y: head.y + delta.y }

    if (nextHead.x < 0 || nextHead.x >= difficulty.cols || nextHead.y < 0 || nextHead.y >= difficulty.rows) {
      gameOverRef.current = true
      setGameOver(true)
      return
    }

    const food0 = foodRef.current!
    const ateFood = nextHead.x === food0.x && nextHead.y === food0.y
    // The tail is about to move away, so it isn't a collision unless food was eaten.
    const body = ateFood ? currentSnake : currentSnake.slice(0, -1)
    if (body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)) {
      gameOverRef.current = true
      setGameOver(true)
      return
    }

    const nextSnake = ateFood ? [nextHead, ...currentSnake] : [nextHead, ...currentSnake.slice(0, -1)]
    snakeRef.current = nextSnake
    setSnake(nextSnake)

    if (ateFood) {
      const nextScore = scoreRef.current + foodPoints(difficulty)
      scoreRef.current = nextScore
      foodEatenRef.current += 1
      const nextFood = placeFood(difficulty, nextSnake)
      foodRef.current = nextFood
      setScore(nextScore)
      setFood(nextFood)
    }
  }, [difficulty])

  // Gravity: reschedules itself at the current speed after every move.
  useEffect(() => {
    if (!difficulty || isLeaderboardPage || gameOver) return

    const scheduleNextTick = () => {
      if (gameOverRef.current) return
      const interval = getTickInterval(difficulty, foodEatenRef.current)
      tickTimeoutRef.current = window.setTimeout(() => {
        tickTimeoutRef.current = null
        tick()
        scheduleNextTick()
      }, interval)
    }

    scheduleNextTick()

    return () => {
      if (tickTimeoutRef.current !== null) {
        window.clearTimeout(tickTimeoutRef.current)
        tickTimeoutRef.current = null
      }
    }
  }, [difficulty, gameOver, isLeaderboardPage, tick])

  // Submit once the run ends; the hook ignores repeat calls per session.
  useEffect(() => {
    if (!difficulty || isLeaderboardPage || !gameOver) return
    void submit(scoreRef.current)
  }, [difficulty, gameOver, isLeaderboardPage, submit])

  // Keyboard controls.
  useEffect(() => {
    if (!difficulty || isLeaderboardPage) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (gameOverRef.current) {
        if (key === 'r' || event.code === 'Enter') restart()
        return
      }

      let next: Direction | null = null
      if (key === 'arrowup' || key === 'w') next = 'up'
      else if (key === 'arrowdown' || key === 's') next = 'down'
      else if (key === 'arrowleft' || key === 'a') next = 'left'
      else if (key === 'arrowright' || key === 'd') next = 'right'
      if (!next) return

      event.preventDefault()
      queueDirection(next)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [difficulty, isLeaderboardPage, queueDirection, restart])

  const handlePointerDown = (event: ReactPointerEvent) => {
    swipeStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event: ReactPointerEvent) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return

    queueDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  /** head/body lookup by cell key; food is a single point, compared directly. */
  const cellMap = useMemo(() => {
    const map = new Map<string, 'head' | 'body'>()
    snake.forEach((segment, index) => {
      map.set(`${segment.x}:${segment.y}`, index === 0 ? 'head' : 'body')
    })
    return map
  }, [snake])

  if (!difficulty) {
    return (
      <GameFrame gameName={t('snake')} onBack={() => navigate(`/${lang}`)}>
        <div className="game-page game-page--center">
          <MenuCard title={t('difficulty.choose')} withUsername>
            <MenuOptionList
              options={DIFFICULTIES.map((option) => ({
                key: option.key,
                label: t(`difficulty.${option.key}`),
                meta: `${option.cols}x${option.rows}`,
              }))}
              onSelect={(key) => navigate(`/${lang}/snake/${key}`)}
            />
          </MenuCard>
        </div>
      </GameFrame>
    )
  }

  const leaderboardHref = `/${lang}/snake/${difficulty.key}/leaderboard`

  if (isLeaderboardPage) {
    return (
      <GameFrame
        gameName={t('snake')}
        onBack={() => navigate(`/${lang}/snake/${difficulty.key}`)}
        leaderboardHref={leaderboardHref}
      >
        <LeaderboardPage
          title={`${t('leaderboard.title')} · ${t(`difficulty.${difficulty.key}`)}`}
          meta={`${difficulty.cols}x${difficulty.rows}`}
          metric="score"
          entries={leaderboard.entries}
          loading={leaderboard.loading}
          playerRank={leaderboard.playerRank}
          playerEntry={leaderboard.playerEntry}
        />
      </GameFrame>
    )
  }

  return (
    <GameFrame gameName={t('snake')} onBack={() => navigate(`/${lang}/snake`)} leaderboardHref={leaderboardHref}>
      <div className="game-page game-page--fit">
        <UsernameNotice />

        <div className="game-hud">
          <div className="game-hud-info">
            {t(`difficulty.${difficulty.key}`)} · {difficulty.cols}x{difficulty.rows} · {t('hud.score')}:{' '}
            <span className="tabular">{score}</span>
          </div>
          <div className="game-hud-actions">
            <button className="btn" onClick={() => navigate(`/${lang}/snake`)} type="button">
              {t('btn.difficulty')}
            </button>
            <button className="btn" onClick={restart} type="button">
              {t('btn.reset')}
            </button>
          </div>
        </div>

        <div
          className="board-area snake-board"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div
            className="snake-grid board-fit"
            style={
              {
                '--cols': difficulty.cols,
                '--rows': difficulty.rows,
                '--ideal-width': `${difficulty.cols * difficulty.cellSize}px`,
              } as CSSProperties
            }
          >
            {Array.from({ length: difficulty.rows }, (_, y) =>
              Array.from({ length: difficulty.cols }, (_, x) => {
                const key = `${x}:${y}`
                const cellType = cellMap.get(key)
                const isFood = food?.x === x && food?.y === y
                return (
                  <div
                    key={key}
                    className={`snake-cell ${cellType ? `snake-cell-${cellType}` : ''} ${
                      isFood ? 'snake-cell-food' : ''
                    }`}
                  />
                )
              }),
            )}
          </div>
        </div>

        <div className="snake-dpad" aria-label={t('mobile.controls.title')}>
          <button
            type="button"
            className="snake-dpad-btn snake-dpad-up"
            onClick={() => queueDirection('up')}
            aria-label={t('direction.up')}
          >
            <ArrowIcon direction="up" width={20} height={20} />
          </button>
          <button
            type="button"
            className="snake-dpad-btn snake-dpad-left"
            onClick={() => queueDirection('left')}
            aria-label={t('direction.left')}
          >
            <ArrowIcon direction="left" width={20} height={20} />
          </button>
          <button
            type="button"
            className="snake-dpad-btn snake-dpad-right"
            onClick={() => queueDirection('right')}
            aria-label={t('direction.right')}
          >
            <ArrowIcon direction="right" width={20} height={20} />
          </button>
          <button
            type="button"
            className="snake-dpad-btn snake-dpad-down"
            onClick={() => queueDirection('down')}
            aria-label={t('direction.down')}
          >
            <ArrowIcon direction="down" width={20} height={20} />
          </button>
        </div>

        {gameOver && (
          <ResultOverlay
            title={t('game.over')}
            detail={score}
            pending={leaderboard.submitting}
            rank={leaderboard.playerRank}
          >
            <button className="btn btn-lg" onClick={restart} type="button">
              {t('btn.reset')}
            </button>
          </ResultOverlay>
        )}
      </div>
    </GameFrame>
  )
}
