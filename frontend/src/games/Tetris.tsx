import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { UsernameInput } from '../components/UsernameInput'
import { useLanguage } from '../context/LanguageContext'
import { useUsername } from '../hooks/useUsername'
import './Tetris.css'

type TetrisModeKey = 'classic' | 'marathon' | 'zen'

type TetrisMode = {
  key: TetrisModeKey
  titleKey: string
  summaryKey: string
  dropInterval: number
  dropStep: number
  minDropInterval: number
  startLevel: number
  linesPerLevel: number
  scoreMultiplier: number
}

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type BoardCell = PieceType | null
type Board = BoardCell[][]
type Cell = readonly [number, number]

type Piece = {
  type: PieceType
  rotation: number
  x: number
  y: number
}

type LeaderboardEntry = {
  username: string
  score: number
  date: string
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#7a91a6',
  O: '#b19362',
  T: '#8f84ba',
  S: '#779a79',
  Z: '#9f6b6b',
  J: '#6f82a8',
  L: '#b18a63',
}

const PREVIEW_SIZE = 4

const SHAPES: Record<PieceType, Cell[][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
}

const LINE_SCORE_TABLE = [0, 40, 100, 300, 1200]

const MODES: TetrisMode[] = [
  {
    key: 'classic',
    titleKey: 'tetris.mode.classic',
    summaryKey: 'tetris.mode.classic.summary',
    dropInterval: 700,
    dropStep: 45,
    minDropInterval: 140,
    startLevel: 1,
    linesPerLevel: 10,
    scoreMultiplier: 1,
  },
  {
    key: 'marathon',
    titleKey: 'tetris.mode.marathon',
    summaryKey: 'tetris.mode.marathon.summary',
    dropInterval: 420,
    dropStep: 36,
    minDropInterval: 70,
    startLevel: 3,
    linesPerLevel: 8,
    scoreMultiplier: 1.25,
  },
  {
    key: 'zen',
    titleKey: 'tetris.mode.zen',
    summaryKey: 'tetris.mode.zen.summary',
    dropInterval: 980,
    dropStep: 0,
    minDropInterval: 980,
    startLevel: 1,
    linesPerLevel: Number.POSITIVE_INFINITY,
    scoreMultiplier: 0.75,
  },
]

const CONTROL_ROWS = [
  { labelKey: 'tetris.control.move', value: '← / →' },
  { labelKey: 'tetris.control.rotate', value: '↑ / X / Z' },
  { labelKey: 'tetris.control.softDrop', value: '↓' },
  { labelKey: 'tetris.control.hardDrop', value: 'Space' },
  { labelKey: 'tetris.control.hold', value: 'C / Shift' },
] as const

const MOBILE_CONTROL_ROWS = [
  {
    labelKey: 'tetris.mobile.left',
    action: 'left',
  },
  {
    labelKey: 'tetris.mobile.rotate',
    action: 'rotate',
  },
  {
    labelKey: 'tetris.mobile.right',
    action: 'right',
  },
  {
    labelKey: 'tetris.mobile.drop',
    action: 'drop',
  },
  {
    labelKey: 'tetris.mobile.hold',
    action: 'hold',
  },
  {
    labelKey: 'tetris.mobile.hardDrop',
    action: 'hardDrop',
  },
] as const

function createEmptyRow(): BoardCell[] {
  return Array.from({ length: BOARD_WIDTH }, () => null)
}

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => createEmptyRow())
}

function randomPieceType(): PieceType {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]
}

function createPiece(type: PieceType = randomPieceType()): Piece {
  return {
    type,
    rotation: 0,
    x: 3,
    y: 0,
  }
}

function getPieceCells(piece: Piece): Cell[] {
  return SHAPES[piece.type][piece.rotation].map(([offsetX, offsetY]) => [piece.x + offsetX, piece.y + offsetY] as const)
}

function getPreviewCells(pieceType: PieceType): Set<string> {
  return new Set(
    getPieceCells({ type: pieceType, rotation: 0, x: 0, y: 0 }).map(([x, y]) => `${x}:${y}`),
  )
}

function canPlace(board: Board, piece: Piece): boolean {
  return getPieceCells(piece).every(([x, y]) => {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
      return false
    }

    return board[y][x] === null
  })
}

function getLandingPiece(board: Board, piece: Piece): Piece {
  let landingPiece = piece

  while (canPlace(board, { ...landingPiece, y: landingPiece.y + 1 })) {
    landingPiece = { ...landingPiece, y: landingPiece.y + 1 }
  }

  return landingPiece
}

function mergePiece(board: Board, piece: Piece): Board {
  const nextBoard = board.map((row) => row.slice())

  for (const [x, y] of getPieceCells(piece)) {
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      nextBoard[y][x] = piece.type
    }
  }

  return nextBoard
}

function clearCompleteLines(board: Board): { board: Board; clearedLines: number } {
  const remainingRows = board.filter((row) => row.some((cell) => cell === null))
  const clearedLines = BOARD_HEIGHT - remainingRows.length
  const nextBoard = Array.from({ length: clearedLines }, () => createEmptyRow()).concat(remainingRows)

  return {
    board: nextBoard,
    clearedLines,
  }
}

function getLevelForLines(mode: TetrisMode, lines: number): number {
  return mode.startLevel + Math.floor(lines / mode.linesPerLevel)
}

function scoreForLines(clearedLines: number, level: number, scoreMultiplier: number): number {
  return Math.round(LINE_SCORE_TABLE[clearedLines] * level * scoreMultiplier)
}

function getDropInterval(mode: TetrisMode, lines: number): number {
  const level = getLevelForLines(mode, lines)
  return Math.max(mode.minDropInterval, mode.dropInterval - ((level - mode.startLevel) * mode.dropStep))
}

export default function Tetris() {
  const { lang, mode: modeParam, action: actionParam } = useParams<{ lang: string; mode?: string; action?: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { username } = useUsername()

  const selectedMode = MODES.find((mode) => mode.key === modeParam) ?? null
  const isPlaying = selectedMode !== null && actionParam === 'play'
  const isLeaderboardPage = selectedMode !== null && actionParam === 'leaderboard'

  const [board, setBoard] = useState<Board>(() => createEmptyBoard())
  const [piece, setPiece] = useState<Piece>(() => createPiece())
  const [nextPiece, setNextPiece] = useState<Piece>(() => createPiece())
  const [heldPiece, setHeldPiece] = useState<PieceType | null>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[] | null>(null)
  const [scoreSubmitting, setScoreSubmitting] = useState(false)

  const boardRef = useRef(board)
  const pieceRef = useRef(piece)
  const nextPieceRef = useRef(nextPiece)
  const heldPieceRef = useRef(heldPiece)
  const holdUsedRef = useRef(false)
  const scoreRef = useRef(score)
  const linesRef = useRef(lines)
  const gameOverRef = useRef(gameOver)
  const dropTimeoutRef = useRef<number | null>(null)
  const mobileRepeatTimeoutRef = useRef<number | null>(null)
  const mobileRepeatIntervalRef = useRef<number | null>(null)
  const sessionTokenRef = useRef<string | null>(null)
  const scoreSubmittedRef = useRef(false)

  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { pieceRef.current = piece }, [piece])
  useEffect(() => { nextPieceRef.current = nextPiece }, [nextPiece])
  useEffect(() => { heldPieceRef.current = heldPiece }, [heldPiece])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { sessionTokenRef.current = sessionToken }, [sessionToken])

  const goBack = () => {
    navigate(`/${lang}`)
  }

  const restartGame = useCallback(() => {
    const freshBoard = createEmptyBoard()
    const freshPiece = createPiece()
    const freshNextPiece = createPiece()

    boardRef.current = freshBoard
    pieceRef.current = freshPiece
    nextPieceRef.current = freshNextPiece
    heldPieceRef.current = null
    holdUsedRef.current = false
    scoreRef.current = 0
    linesRef.current = 0
    gameOverRef.current = false

    setBoard(freshBoard)
    setPiece(freshPiece)
    setNextPiece(freshNextPiece)
    setHeldPiece(null)
    setScore(0)
    setLines(0)
    setGameOver(false)
    scoreSubmittedRef.current = false
  }, [])

  const movePiece = useCallback((deltaX: number, deltaY: number) => {
    if (gameOverRef.current) {
      return false
    }

    const currentPiece = pieceRef.current
    const nextPiece = {
      ...currentPiece,
      x: currentPiece.x + deltaX,
      y: currentPiece.y + deltaY,
    }

    if (!canPlace(boardRef.current, nextPiece)) {
      return false
    }

    pieceRef.current = nextPiece
    setPiece(nextPiece)
    return true
  }, [])

  const rotatePiece = useCallback((direction: 1 | -1) => {
    if (gameOverRef.current) {
      return false
    }

    const currentPiece = pieceRef.current
    const nextRotation = (currentPiece.rotation + direction + 4) % 4

    for (const offsetX of [0, -1, 1, -2, 2]) {
      const rotatedPiece = {
        ...currentPiece,
        rotation: nextRotation,
        x: currentPiece.x + offsetX,
      }

      if (canPlace(boardRef.current, rotatedPiece)) {
        pieceRef.current = rotatedPiece
        setPiece(rotatedPiece)
        return true
      }
    }

    return false
  }, [])

  const lockPiece = useCallback(() => {
    const currentPiece = pieceRef.current
    const lockedBoard = mergePiece(boardRef.current, currentPiece)
    const { board: clearedBoard, clearedLines } = clearCompleteLines(lockedBoard)

    const nextLines = linesRef.current + clearedLines
    const nextLevel = selectedMode ? getLevelForLines(selectedMode, nextLines) : 1

    if (clearedLines > 0) {
      const points = selectedMode ? scoreForLines(clearedLines, nextLevel, selectedMode.scoreMultiplier) : scoreForLines(clearedLines, nextLevel, 1)
      linesRef.current = nextLines
      scoreRef.current += points
      setLines(nextLines)
      setScore(scoreRef.current)
    }

    boardRef.current = clearedBoard
    setBoard(clearedBoard)

    const queuedPiece = nextPieceRef.current
    const freshNextPiece = createPiece()
    const nextSpawnPiece = createPiece(queuedPiece.type)

    nextPieceRef.current = freshNextPiece
    setNextPiece(freshNextPiece)

    if (canPlace(clearedBoard, nextSpawnPiece)) {
      pieceRef.current = nextSpawnPiece
      setPiece(nextSpawnPiece)
      holdUsedRef.current = false
      return
    }

    gameOverRef.current = true
    setGameOver(true)
  }, [selectedMode])

  const softDrop = useCallback(() => {
    if (movePiece(0, 1)) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      return
    }

    lockPiece()
  }, [lockPiece, movePiece])

  const hardDrop = useCallback(() => {
    let distance = 0

    while (movePiece(0, 1)) {
      distance += 1
    }

    if (distance > 0) {
      scoreRef.current += distance * 2
      setScore(scoreRef.current)
    }

    lockPiece()
  }, [lockPiece, movePiece])

  const stopMobileRepeat = useCallback(() => {
    if (mobileRepeatTimeoutRef.current !== null) {
      window.clearTimeout(mobileRepeatTimeoutRef.current)
      mobileRepeatTimeoutRef.current = null
    }

    if (mobileRepeatIntervalRef.current !== null) {
      window.clearInterval(mobileRepeatIntervalRef.current)
      mobileRepeatIntervalRef.current = null
    }
  }, [])

  const startMobileRepeat = useCallback((deltaX: -1 | 1) => {
    stopMobileRepeat()
    movePiece(deltaX, 0)
    mobileRepeatIntervalRef.current = window.setInterval(() => {
      movePiece(deltaX, 0)
    }, 85)
  }, [movePiece, stopMobileRepeat])

  const holdPiece = useCallback(() => {
    if (gameOverRef.current || holdUsedRef.current) {
      return false
    }

    const currentPiece = pieceRef.current
    const nextHeldPiece = currentPiece.type

    if (heldPieceRef.current === null) {
      const queuedPiece = nextPieceRef.current
      const freshNextPiece = createPiece()
      const nextSpawnPiece = createPiece(queuedPiece.type)

      nextPieceRef.current = freshNextPiece
      setNextPiece(freshNextPiece)

      if (!canPlace(boardRef.current, nextSpawnPiece)) {
        gameOverRef.current = true
        setGameOver(true)
        return false
      }

      heldPieceRef.current = nextHeldPiece
      setHeldPiece(nextHeldPiece)
      pieceRef.current = nextSpawnPiece
      setPiece(nextSpawnPiece)
      holdUsedRef.current = true
      return true
    }

    const swappedPiece = createPiece(heldPieceRef.current)

    if (!canPlace(boardRef.current, swappedPiece)) {
      gameOverRef.current = true
      setGameOver(true)
      return false
    }

    heldPieceRef.current = nextHeldPiece
    setHeldPiece(nextHeldPiece)
    pieceRef.current = swappedPiece
    setPiece(swappedPiece)
    holdUsedRef.current = true
    return true
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    restartGame()
  }, [isPlaying, restartGame, selectedMode?.key])

  useEffect(() => {
    if (!isPlaying || !selectedMode) {
      setSessionToken(null)
      return
    }

    sessionTokenRef.current = null
    setSessionToken(null)

    fetch('/api/game-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'tetris', difficulty: selectedMode.key }),
    })
      .then((response) => response.json())
      .then((data: { token: string }) => {
        sessionTokenRef.current = data.token
        setSessionToken(data.token)
      })
      .catch(() => {
        sessionTokenRef.current = null
        setSessionToken(null)
      })
  }, [isPlaying, selectedMode?.key])

  useEffect(() => {
    if (!isPlaying || !gameOver || !selectedMode || scoreSubmittedRef.current || !sessionTokenRef.current) {
      return
    }

    const submitScore = async () => {
      scoreSubmittedRef.current = true
      setScoreSubmitting(true)
      try {
        const response = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: sessionTokenRef.current,
            username,
            score,
          }),
        })

        if (response.ok) {
          const data = await response.json() as { entries: LeaderboardEntry[]; playerRank?: number; playerEntry?: LeaderboardEntry }
          setLeaderboardEntries(data.entries)
        }
      } catch {
        // Ignore submission failure; the player can retry by restarting.
      } finally {
        setScoreSubmitting(false)
      }
    }

    void submitScore()
  }, [gameOver, isPlaying, score, selectedMode?.key, username])

  useEffect(() => {
    if (!isLeaderboardPage || !selectedMode) {
      return
    }

    let cancelled = false
    setLeaderboardLoading(true)

    fetch(`/api/leaderboard?game=tetris&difficulty=${selectedMode.key}&username=${encodeURIComponent(username)}`)
      .then((response) => response.json())
      .then((data: { entries: LeaderboardEntry[]; playerRank?: number; playerEntry?: LeaderboardEntry }) => {
        if (cancelled) return
        setLeaderboardEntries(data.entries)
      })
      .catch(() => {
        if (cancelled) return
        setLeaderboardEntries([])
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isLeaderboardPage, selectedMode?.key, username])

  useEffect(() => {
    if (!isPlaying || gameOver) {
      return
    }

    const scheduleNextDrop = () => {
      if (!selectedMode || gameOverRef.current) {
        return
      }

      const dropDelay = getDropInterval(selectedMode, linesRef.current)

      dropTimeoutRef.current = window.setTimeout(() => {
        dropTimeoutRef.current = null

        if (gameOverRef.current) {
          return
        }

        if (!movePiece(0, 1)) {
          lockPiece()
        }

        scheduleNextDrop()
      }, dropDelay)
    }

    scheduleNextDrop()

    return () => {
      if (dropTimeoutRef.current !== null) {
        window.clearTimeout(dropTimeoutRef.current)
        dropTimeoutRef.current = null
      }
    }
  }, [gameOver, isPlaying, lockPiece, movePiece, selectedMode])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const code = event.code

      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight' || key.startsWith('arrow') || key === 'x' || key === 'z' || key === 'r' || key === 'c') {
        event.preventDefault()
      }

      if (gameOverRef.current) {
        if (key === 'r' || code === 'Enter') {
          restartGame()
        }
        return
      }

      if (code === 'Space') {
        hardDrop()
        return
      }

      if (key === 'c' || code === 'ShiftLeft' || code === 'ShiftRight') {
        holdPiece()
        return
      }

      switch (key) {
        case 'arrowleft':
          movePiece(-1, 0)
          break
        case 'arrowright':
          movePiece(1, 0)
          break
        case 'arrowdown':
          softDrop()
          break
        case 'arrowup':
        case 'x':
          rotatePiece(1)
          break
        case 'z':
          rotatePiece(-1)
          break
        case 'r':
          rotatePiece(1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hardDrop, holdPiece, isPlaying, movePiece, restartGame, rotatePiece, softDrop])

  const activeCells = useMemo(() => {
    return new Set(getPieceCells(piece).map(([x, y]) => `${x}:${y}`))
  }, [piece])

  const landingPiece = useMemo(() => getLandingPiece(board, piece), [board, piece])

  const landingCells = useMemo(() => {
    return new Set(getPieceCells(landingPiece).map(([x, y]) => `${x}:${y}`))
  }, [landingPiece])

  const previewCells = useMemo(() => {
    return getPreviewCells(nextPiece.type)
  }, [nextPiece])

  const holdPreviewCells = useMemo(() => {
    return heldPiece ? getPreviewCells(heldPiece) : new Set<string>()
  }, [heldPiece])

  const handleMobileControl = useCallback((action: typeof MOBILE_CONTROL_ROWS[number]['action']) => {
    switch (action) {
      case 'left':
        startMobileRepeat(-1)
        break
      case 'right':
        startMobileRepeat(1)
        break
      case 'rotate':
        rotatePiece(1)
        break
      case 'drop':
        softDrop()
        break
      case 'hold':
        holdPiece()
        break
      case 'hardDrop':
        hardDrop()
        break
      default:
        break
    }
  }, [hardDrop, holdPiece, rotatePiece, softDrop, startMobileRepeat])

  useEffect(() => {
    return () => {
      stopMobileRepeat()
    }
  }, [stopMobileRepeat])

  if (!selectedMode) {
    return (
      <GameFrame gameName={t('tetris')} onBack={goBack}>
        <div className="tet-container tet-menu">
          <div className="tet-menu-card">
            <h2 className="tet-menu-title">{t('tetris.menu.title')}</h2>

            <div className="tet-menu-username">
              <span className="tet-menu-username-label">{t('username.label')}</span>
              <UsernameInput />
            </div>

            <div className="tet-mode-list">
              {MODES.map((mode) => (
                <button
                  key={mode.key}
                  className="tet-mode-button"
                  onClick={() => navigate(`/${lang}/tetris/${mode.key}`)}
                  type="button"
                >
                  <span className="tet-mode-name">{t(mode.titleKey)}</span>
                  <span className="tet-mode-summary">{t(mode.summaryKey)}</span>
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
        gameName={t('tetris')}
        onBack={() => navigate(`/${lang}/tetris/${selectedMode.key}`)}
      >
        <div className="tet-container tet-leaderboard-page">
          <div className="tet-leaderboard-card">
            <div className="tet-leaderboard-title">{t('leaderboard.title')} · {t(selectedMode.titleKey)}</div>

            {leaderboardLoading ? (
              <div className="tet-leaderboard-loading">{t('leaderboard.calculatingPlace')}</div>
            ) : leaderboardEntries && leaderboardEntries.length > 0 ? (
              <ol className="tet-leaderboard-list">
                {leaderboardEntries.map((entry, index) => (
                  <li key={`${entry.username}-${entry.date}-${index}`} className={`tet-leaderboard-item ${entry.username === username ? 'tet-leaderboard-item-you' : ''}`}>
                    <span className="tet-leaderboard-rank">{index + 1}</span>
                    <span className="tet-leaderboard-user">{entry.username}</span>
                    <strong className="tet-leaderboard-score">{entry.score}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="tet-leaderboard-empty">{t('leaderboard.empty')}</div>
            )}
          </div>
        </div>
      </GameFrame>
    )
  }

  if (!isPlaying) {
    return (
      <GameFrame gameName={t('tetris')} onBack={() => navigate(`/${lang}/tetris`)} leaderboardHref={`/${lang}/tetris/${selectedMode.key}/leaderboard`}>
        <div className="tet-container tet-setup">
          <div className="tet-setup-card">
            <h2 className="tet-setup-title">{t(selectedMode.titleKey)}</h2>

            <div className="tet-control-grid">
              <div className="tet-control-grid-title">{t('tetris.control.title')}</div>
              {CONTROL_ROWS.map((row) => (
                <div className="tet-control-row" key={row.labelKey}>
                  <span className="tet-control-label">{t(row.labelKey)}</span>
                  <span className="tet-control-value">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="tet-setup-actions">
              <button
                className="tet-start-button tet-primary-button"
                type="button"
                onClick={() => navigate(`/${lang}/tetris/${selectedMode.key}/play`)}
              >
                {t('btn.start')}
              </button>
            </div>
          </div>
        </div>
      </GameFrame>
    )
  }

  return (
    <GameFrame gameName={t('tetris')} onBack={() => navigate(`/${lang}/tetris/${selectedMode.key}`)} leaderboardHref={`/${lang}/tetris/${selectedMode.key}/leaderboard`}>
      <div className="tet-container tet-play">
        <div className="tet-play-card">
          <div className="tet-play-layout">
            <div className="tet-board-shell">
              <div className="tet-board" role="grid" aria-label={`${t('tetris')} ${t('tetris.hud.mode')}: ${t(selectedMode.titleKey)}`}>
                {board.map((row, rowIndex) => (
                  row.map((cell, columnIndex) => {
                    const key = `${columnIndex}:${rowIndex}`
                    const activeType = activeCells.has(key) ? piece.type : cell
                    const isLandingCell = !activeType && landingCells.has(key)

                    return (
                      <div
                        key={key}
                        className={`tet-cell ${activeType ? 'tet-cell-filled' : ''} ${isLandingCell ? 'tet-cell-ghost' : ''}`}
                        style={activeType ? { backgroundColor: PIECE_COLORS[activeType] } : isLandingCell ? { borderColor: 'rgba(255, 255, 255, 0.18)' } : undefined}
                      />
                    )
                  })
                ))}
              </div>

              {gameOver ? (
                <div className="tet-gameover-overlay">
                  <div className="tet-gameover-card">
                    <div className="tet-gameover-title">{t('game.over')}</div>
                    <div className="tet-gameover-score">{score}</div>
                    {scoreSubmitting ? <div className="tet-gameover-submitting">{t('leaderboard.calculatingPlace')}</div> : null}
                    <button className="tet-start-button tet-primary-button" onClick={restartGame} type="button">
                      {t('btn.reset')}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="tet-mobile-controls" aria-label={t('tetris.mobile.title')}>
                <button type="button" className="tet-mobile-control tet-mobile-control-wide" onPointerDown={(event) => { event.preventDefault(); handleMobileControl('hold') }}>
                  {t('tetris.mobile.hold')}
                </button>
                <button
                  type="button"
                  className="tet-mobile-control"
                  onPointerDown={(event) => { event.preventDefault(); handleMobileControl('left') }}
                  onPointerUp={stopMobileRepeat}
                  onPointerCancel={stopMobileRepeat}
                  onPointerLeave={stopMobileRepeat}
                >
                  {t('tetris.mobile.left')}
                </button>
                <button type="button" className="tet-mobile-control" onPointerDown={(event) => { event.preventDefault(); handleMobileControl('rotate') }}>
                  {t('tetris.mobile.rotate')}
                </button>
                <button
                  type="button"
                  className="tet-mobile-control"
                  onPointerDown={(event) => { event.preventDefault(); handleMobileControl('right') }}
                  onPointerUp={stopMobileRepeat}
                  onPointerCancel={stopMobileRepeat}
                  onPointerLeave={stopMobileRepeat}
                >
                  {t('tetris.mobile.right')}
                </button>
                <button type="button" className="tet-mobile-control tet-mobile-control-wide" onPointerDown={(event) => { event.preventDefault(); handleMobileControl('drop') }}>
                  {t('tetris.mobile.drop')}
                </button>
                <button type="button" className="tet-mobile-control tet-mobile-control-wide" onPointerDown={(event) => { event.preventDefault(); handleMobileControl('hardDrop') }}>
                  {t('tetris.mobile.hardDrop')}
                </button>
              </div>
            </div>

            <aside className="tet-sidebar">
              <div className="tet-sidebar-header">
                <div className="tet-play-kicker">{t('tetris.hud.mode')}</div>
                <h2 className="tet-play-title">{t(selectedMode.titleKey)}</h2>
              </div>

              <div className="tet-hold-panel">
                <div className="tet-stat-label">{t('tetris.hud.hold')}</div>
                <div className="tet-next-grid" role="grid" aria-label={t('tetris.hud.hold')}>
                  {Array.from({ length: PREVIEW_SIZE * PREVIEW_SIZE }, (_, index) => {
                    const x = index % PREVIEW_SIZE
                    const y = Math.floor(index / PREVIEW_SIZE)
                    const key = `${x}:${y}`
                    const activeType = heldPiece && holdPreviewCells.has(key) ? heldPiece : null

                    return (
                      <div
                        key={key}
                        className={`tet-next-cell ${activeType ? 'tet-next-cell-filled' : ''}`}
                        style={activeType ? { backgroundColor: PIECE_COLORS[activeType] } : undefined}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="tet-next-panel">
                <div className="tet-stat-label">{t('tetris.hud.next')}</div>
                <div className="tet-next-grid" role="grid" aria-label={t('tetris.hud.next')}>
                  {Array.from({ length: PREVIEW_SIZE * PREVIEW_SIZE }, (_, index) => {
                    const x = index % PREVIEW_SIZE
                    const y = Math.floor(index / PREVIEW_SIZE)
                    const key = `${x}:${y}`
                    const activeType = previewCells.has(key) ? nextPiece.type : null

                    return (
                      <div
                        key={key}
                        className={`tet-next-cell ${activeType ? 'tet-next-cell-filled' : ''}`}
                        style={activeType ? { backgroundColor: PIECE_COLORS[activeType] } : undefined}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="tet-stat">
                <span className="tet-stat-label">{t('tetris.hud.score')}</span>
                <strong className="tet-stat-value">{score}</strong>
              </div>
              <div className="tet-stat">
                <span className="tet-stat-label">{t('tetris.hud.lines')}</span>
                <strong className="tet-stat-value">{lines}</strong>
              </div>

              <div className="tet-sidebar-actions">
                <button className="tet-start-button tet-primary-button" onClick={restartGame} type="button">
                  {t('btn.reset')}
                </button>
                <button className="tet-back-button" onClick={() => navigate(`/${lang}/tetris/${selectedMode.key}`)} type="button">
                  {t('btn.back')}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </GameFrame>
  )
}