import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { LeaderboardPage } from '../components/Leaderboard'
import { MenuCard, MenuOptionList } from '../components/MenuCard'
import { ResultOverlay } from '../components/ResultOverlay'
import { useLanguage } from '../context/language'
import { useLeaderboard } from '../hooks/useLeaderboard'
import './Tetris.css'

type TetrisMode = {
  key: 'classic' | 'marathon' | 'zen'
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

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const PREVIEW_SIZE = 4
/** Delay between repeats while a mobile move button is held down. */
const MOBILE_REPEAT_MS = 85

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
]

type MobileAction = 'left' | 'right' | 'rotate' | 'drop' | 'hold' | 'hardDrop'

type MobileControl = {
  labelKey: string
  action: MobileAction
  /** Width in the six-column touch pad; a third of a row by default. */
  size?: 'half' | 'wide'
  /** Keeps firing while held down. */
  repeat?: boolean
}

const MOBILE_CONTROLS: MobileControl[] = [
  { labelKey: 'tetris.mobile.hold', action: 'hold', size: 'wide' },
  { labelKey: 'tetris.mobile.left', action: 'left', repeat: true },
  { labelKey: 'tetris.mobile.rotate', action: 'rotate' },
  { labelKey: 'tetris.mobile.right', action: 'right', repeat: true },
  { labelKey: 'tetris.mobile.drop', action: 'drop', size: 'half' },
  { labelKey: 'tetris.mobile.hardDrop', action: 'hardDrop', size: 'half' },
]

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
  return { type, rotation: 0, x: 3, y: 0 }
}

function getPieceCells(piece: Piece): Cell[] {
  return SHAPES[piece.type][piece.rotation].map(
    ([offsetX, offsetY]) => [piece.x + offsetX, piece.y + offsetY] as const,
  )
}

function cellKeys(cells: Cell[]): Set<string> {
  return new Set(cells.map(([x, y]) => `${x}:${y}`))
}

function getPreviewCells(pieceType: PieceType): Set<string> {
  return cellKeys(getPieceCells({ type: pieceType, rotation: 0, x: 0, y: 0 }))
}

function canPlace(board: Board, piece: Piece): boolean {
  return getPieceCells(piece).every(([x, y]) => {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return false
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
  return {
    board: Array.from({ length: clearedLines }, () => createEmptyRow()).concat(remainingRows),
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
  return Math.max(mode.minDropInterval, mode.dropInterval - (level - mode.startLevel) * mode.dropStep)
}

/** 4x4 grid used for both the hold slot and the next-piece slot. */
function PiecePreview({ label, pieceType }: { label: string; pieceType: PieceType | null }) {
  const cells = useMemo(() => (pieceType ? getPreviewCells(pieceType) : new Set<string>()), [pieceType])

  return (
    <div className="tet-preview">
      <div className="tet-stat-label">{label}</div>
      <div className="tet-preview-grid" role="grid" aria-label={label}>
        {Array.from({ length: PREVIEW_SIZE * PREVIEW_SIZE }, (_, index) => {
          const key = `${index % PREVIEW_SIZE}:${Math.floor(index / PREVIEW_SIZE)}`
          const filled = pieceType !== null && cells.has(key)
          return (
            <div
              key={key}
              className={`tet-preview-cell ${filled ? 'tet-cell-filled' : ''}`}
              style={filled ? { backgroundColor: PIECE_COLORS[pieceType] } : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function Tetris() {
  const { lang, mode: modeParam, action: actionParam } = useParams<{
    lang: string
    mode?: string
    action?: string
  }>()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const selectedMode = MODES.find((mode) => mode.key === modeParam) ?? null
  const isPlaying = selectedMode !== null && actionParam === 'play'
  const isLeaderboardPage = selectedMode !== null && actionParam === 'leaderboard'

  const leaderboard = useLeaderboard({
    game: 'tetris',
    difficulty: selectedMode?.key ?? null,
    metric: 'score',
    session: isPlaying,
    autoLoad: isLeaderboardPage,
  })
  const { submit, startSession } = leaderboard

  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [piece, setPiece] = useState<Piece>(createPiece)
  const [nextPiece, setNextPiece] = useState<Piece>(createPiece)
  const [heldPiece, setHeldPiece] = useState<PieceType | null>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  // The game loop and key handlers read the latest state synchronously.
  const boardRef = useRef(board)
  const pieceRef = useRef(piece)
  const nextPieceRef = useRef(nextPiece)
  const heldPieceRef = useRef(heldPiece)
  const holdUsedRef = useRef(false)
  const scoreRef = useRef(score)
  const linesRef = useRef(lines)
  const gameOverRef = useRef(gameOver)
  const dropTimeoutRef = useRef<number | null>(null)
  const mobileRepeatIntervalRef = useRef<number | null>(null)

  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { pieceRef.current = piece }, [piece])
  useEffect(() => { nextPieceRef.current = nextPiece }, [nextPiece])
  useEffect(() => { heldPieceRef.current = heldPiece }, [heldPiece])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])

  const resetGame = useCallback(() => {
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
  }, [])

  /** Restart from the UI: a new run also needs a new signed session. */
  const restart = useCallback(() => {
    resetGame()
    startSession()
  }, [resetGame, startSession])

  const movePiece = useCallback((deltaX: number, deltaY: number) => {
    if (gameOverRef.current) return false

    const current = pieceRef.current
    const moved = { ...current, x: current.x + deltaX, y: current.y + deltaY }
    if (!canPlace(boardRef.current, moved)) return false

    pieceRef.current = moved
    setPiece(moved)
    return true
  }, [])

  const rotatePiece = useCallback((direction: 1 | -1) => {
    if (gameOverRef.current) return false

    const current = pieceRef.current
    const nextRotation = (current.rotation + direction + 4) % 4

    // Wall kicks: try the rotation shifted sideways before giving up.
    for (const offsetX of [0, -1, 1, -2, 2]) {
      const rotated = { ...current, rotation: nextRotation, x: current.x + offsetX }
      if (canPlace(boardRef.current, rotated)) {
        pieceRef.current = rotated
        setPiece(rotated)
        return true
      }
    }

    return false
  }, [])

  /** Spawns the queued piece; reports false when it no longer fits. */
  const spawnNextPiece = useCallback((currentBoard: Board) => {
    const spawn = createPiece(nextPieceRef.current.type)
    const freshNextPiece = createPiece()

    nextPieceRef.current = freshNextPiece
    setNextPiece(freshNextPiece)

    if (!canPlace(currentBoard, spawn)) {
      gameOverRef.current = true
      setGameOver(true)
      return false
    }

    pieceRef.current = spawn
    setPiece(spawn)
    return true
  }, [])

  const lockPiece = useCallback(() => {
    const lockedBoard = mergePiece(boardRef.current, pieceRef.current)
    const { board: clearedBoard, clearedLines } = clearCompleteLines(lockedBoard)

    if (clearedLines > 0) {
      const nextLines = linesRef.current + clearedLines
      const level = selectedMode ? getLevelForLines(selectedMode, nextLines) : 1
      linesRef.current = nextLines
      scoreRef.current += scoreForLines(clearedLines, level, selectedMode?.scoreMultiplier ?? 1)
      setLines(nextLines)
      setScore(scoreRef.current)
    }

    boardRef.current = clearedBoard
    setBoard(clearedBoard)

    if (spawnNextPiece(clearedBoard)) {
      holdUsedRef.current = false
    }
  }, [selectedMode, spawnNextPiece])

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
    while (movePiece(0, 1)) distance += 1

    if (distance > 0) {
      scoreRef.current += distance * 2
      setScore(scoreRef.current)
    }
    lockPiece()
  }, [lockPiece, movePiece])

  const holdPiece = useCallback(() => {
    if (gameOverRef.current || holdUsedRef.current) return

    const outgoing = pieceRef.current.type

    if (heldPieceRef.current === null) {
      if (!spawnNextPiece(boardRef.current)) return
    } else {
      const swapped = createPiece(heldPieceRef.current)
      if (!canPlace(boardRef.current, swapped)) {
        gameOverRef.current = true
        setGameOver(true)
        return
      }
      pieceRef.current = swapped
      setPiece(swapped)
    }

    heldPieceRef.current = outgoing
    setHeldPiece(outgoing)
    holdUsedRef.current = true
  }, [spawnNextPiece])

  const stopMobileRepeat = useCallback(() => {
    if (mobileRepeatIntervalRef.current !== null) {
      window.clearInterval(mobileRepeatIntervalRef.current)
      mobileRepeatIntervalRef.current = null
    }
  }, [])

  const startMobileRepeat = useCallback(
    (deltaX: -1 | 1) => {
      stopMobileRepeat()
      movePiece(deltaX, 0)
      mobileRepeatIntervalRef.current = window.setInterval(
        () => movePiece(deltaX, 0),
        MOBILE_REPEAT_MS,
      )
    },
    [movePiece, stopMobileRepeat],
  )

  const handleMobileControl = useCallback(
    (action: MobileAction) => {
      switch (action) {
        case 'left': startMobileRepeat(-1); break
        case 'right': startMobileRepeat(1); break
        case 'rotate': rotatePiece(1); break
        case 'drop': softDrop(); break
        case 'hold': holdPiece(); break
        case 'hardDrop': hardDrop(); break
      }
    },
    [hardDrop, holdPiece, rotatePiece, softDrop, startMobileRepeat],
  )

  useEffect(() => stopMobileRepeat, [stopMobileRepeat])

  // A fresh board whenever a run starts.
  useEffect(() => {
    if (!isPlaying) return
    resetGame()
  }, [isPlaying, resetGame, selectedMode?.key])

  // Submit once the run ends; the hook ignores repeat calls per session.
  useEffect(() => {
    if (!isPlaying || !gameOver) return
    void submit(scoreRef.current)
  }, [gameOver, isPlaying, submit])

  // Gravity.
  useEffect(() => {
    if (!isPlaying || gameOver || !selectedMode) return

    const scheduleNextDrop = () => {
      if (gameOverRef.current) return

      dropTimeoutRef.current = window.setTimeout(() => {
        dropTimeoutRef.current = null
        if (gameOverRef.current) return
        if (!movePiece(0, 1)) lockPiece()
        scheduleNextDrop()
      }, getDropInterval(selectedMode, linesRef.current))
    }

    scheduleNextDrop()

    return () => {
      if (dropTimeoutRef.current !== null) {
        window.clearTimeout(dropTimeoutRef.current)
        dropTimeoutRef.current = null
      }
    }
  }, [gameOver, isPlaying, lockPiece, movePiece, selectedMode])

  // Keyboard controls.
  useEffect(() => {
    if (!isPlaying) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const code = event.code

      const handled =
        code === 'Space' ||
        code === 'ShiftLeft' ||
        code === 'ShiftRight' ||
        key.startsWith('arrow') ||
        key === 'x' ||
        key === 'z' ||
        key === 'r' ||
        key === 'c'
      if (handled) event.preventDefault()

      if (gameOverRef.current) {
        if (key === 'r' || code === 'Enter') restart()
        return
      }

      if (code === 'Space') return hardDrop()
      if (key === 'c' || code === 'ShiftLeft' || code === 'ShiftRight') return holdPiece()

      switch (key) {
        case 'arrowleft': movePiece(-1, 0); break
        case 'arrowright': movePiece(1, 0); break
        case 'arrowdown': softDrop(); break
        case 'arrowup':
        case 'x': rotatePiece(1); break
        case 'z': rotatePiece(-1); break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hardDrop, holdPiece, isPlaying, movePiece, restart, rotatePiece, softDrop])

  const activeCells = useMemo(() => cellKeys(getPieceCells(piece)), [piece])
  const landingCells = useMemo(
    () => cellKeys(getPieceCells(getLandingPiece(board, piece))),
    [board, piece],
  )

  if (!selectedMode) {
    return (
      <GameFrame gameName={t('tetris')} onBack={() => navigate(`/${lang}`)}>
        <div className="game-page game-page--center">
          <MenuCard title={t('tetris.menu.title')} withUsername>
            <MenuOptionList
              stackOnMobile
              options={MODES.map((mode) => ({
                key: mode.key,
                label: t(mode.titleKey),
                meta: t(mode.summaryKey),
              }))}
              onSelect={(key) => navigate(`/${lang}/tetris/${key}`)}
            />
          </MenuCard>
        </div>
      </GameFrame>
    )
  }

  const modePath = `/${lang}/tetris/${selectedMode.key}`

  if (isLeaderboardPage) {
    return (
      <GameFrame gameName={t('tetris')} onBack={() => navigate(modePath)}>
        <LeaderboardPage
          title={`${t('leaderboard.title')} · ${t(selectedMode.titleKey)}`}
          metric="score"
          entries={leaderboard.entries}
          loading={leaderboard.loading}
          playerRank={leaderboard.playerRank}
          playerEntry={leaderboard.playerEntry}
        />
      </GameFrame>
    )
  }

  if (!isPlaying) {
    return (
      <GameFrame
        gameName={t('tetris')}
        onBack={() => navigate(`/${lang}/tetris`)}
        leaderboardHref={`${modePath}/leaderboard`}
      >
        <div className="game-page game-page--center">
          <MenuCard title={t(selectedMode.titleKey)}>
            <div className="tet-control-grid">
              <div className="tet-control-grid-title">{t('tetris.control.title')}</div>
              {CONTROL_ROWS.map((row) => (
                <div className="tet-control-row" key={row.labelKey}>
                  <span className="tet-control-label">{t(row.labelKey)}</span>
                  <span className="tet-control-value tabular">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="tet-setup-actions">
              <button
                className="btn btn-lg"
                type="button"
                onClick={() => navigate(`${modePath}/play`)}
              >
                {t('btn.start')}
              </button>
            </div>
          </MenuCard>
        </div>
      </GameFrame>
    )
  }

  return (
    <GameFrame
      gameName={t('tetris')}
      onBack={() => navigate(modePath)}
      leaderboardHref={`${modePath}/leaderboard`}
    >
      <div className="game-page game-page--center">
        <div className="tet-play-card">
          <div className="tet-play-layout">
            <div className="tet-board-column">
              <div className="tet-board-shell">
                <div
                  className="tet-board"
                  role="grid"
                  aria-label={`${t('tetris')} ${t('tetris.hud.mode')}: ${t(selectedMode.titleKey)}`}
                >
                  {board.map((row, rowIndex) =>
                    row.map((cell, columnIndex) => {
                      const key = `${columnIndex}:${rowIndex}`
                      const activeType = activeCells.has(key) ? piece.type : cell
                      const isGhost = !activeType && landingCells.has(key)

                      return (
                        <div
                          key={key}
                          className={`tet-cell ${activeType ? 'tet-cell-filled' : ''} ${
                            isGhost ? 'tet-cell-ghost' : ''
                          }`}
                          style={activeType ? { backgroundColor: PIECE_COLORS[activeType] } : undefined}
                        />
                      )
                    }),
                  )}
                </div>

                {gameOver ? (
                  <ResultOverlay
                    inset
                    title={t('game.over')}
                    detail={score}
                    pending={leaderboard.submitting}
                    rank={leaderboard.playerRank}
                  >
                    <button className="btn btn-lg" onClick={restart} type="button">
                      {t('btn.reset')}
                    </button>
                  </ResultOverlay>
                ) : null}
              </div>

              <div className="tet-mobile-controls" aria-label={t('tetris.mobile.title')}>
                {MOBILE_CONTROLS.map((control) => (
                  <button
                    key={control.action}
                    type="button"
                    className={`tet-mobile-control ${control.size ? `tet-mobile-control--${control.size}` : ''}`}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      handleMobileControl(control.action)
                    }}
                    onPointerUp={control.repeat ? stopMobileRepeat : undefined}
                    onPointerCancel={control.repeat ? stopMobileRepeat : undefined}
                    onPointerLeave={control.repeat ? stopMobileRepeat : undefined}
                  >
                    {t(control.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <aside className="tet-sidebar">
              <div className="tet-sidebar-header">
                <div className="tet-play-kicker">{t('tetris.hud.mode')}</div>
                <h2 className="tet-play-title">{t(selectedMode.titleKey)}</h2>
              </div>

              <PiecePreview label={t('tetris.hud.hold')} pieceType={heldPiece} />
              <PiecePreview label={t('tetris.hud.next')} pieceType={nextPiece.type} />

              <div className="tet-stat">
                <span className="tet-stat-label">{t('tetris.hud.score')}</span>
                <strong className="tet-stat-value tabular">{score}</strong>
              </div>
              <div className="tet-stat">
                <span className="tet-stat-label">{t('tetris.hud.lines')}</span>
                <strong className="tet-stat-value tabular">{lines}</strong>
              </div>

              <div className="tet-sidebar-actions">
                <button className="btn btn-lg" onClick={restart} type="button">
                  {t('btn.reset')}
                </button>
                <button className="btn btn-lg" onClick={() => navigate(modePath)} type="button">
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
