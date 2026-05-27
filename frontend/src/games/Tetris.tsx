import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { UsernameInput } from '../components/UsernameInput'
import { useLanguage } from '../context/LanguageContext'
import './Tetris.css'

type TetrisModeKey = 'classic' | 'marathon' | 'zen'

type TetrisMode = {
  key: TetrisModeKey
  titleKey: string
  summaryKey: string
  dropInterval: number
  dropStep: number
  minDropInterval: number
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
  },
  {
    key: 'marathon',
    titleKey: 'tetris.mode.marathon',
    summaryKey: 'tetris.mode.marathon.summary',
    dropInterval: 520,
    dropStep: 40,
    minDropInterval: 90,
  },
  {
    key: 'zen',
    titleKey: 'tetris.mode.zen',
    summaryKey: 'tetris.mode.zen.summary',
    dropInterval: 900,
    dropStep: 30,
    minDropInterval: 220,
  },
]

const CONTROL_ROWS = [
  { labelKey: 'tetris.control.move', value: '← / →' },
  { labelKey: 'tetris.control.rotate', value: '↑ / X / Z' },
  { labelKey: 'tetris.control.softDrop', value: '↓' },
  { labelKey: 'tetris.control.hardDrop', value: 'Space' },
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

function canPlace(board: Board, piece: Piece): boolean {
  return getPieceCells(piece).every(([x, y]) => {
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
      return false
    }

    return board[y][x] === null
  })
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

function scoreForLines(clearedLines: number, level: number): number {
  return LINE_SCORE_TABLE[clearedLines] * level
}

function getDropInterval(mode: TetrisMode, level: number): number {
  return Math.max(mode.minDropInterval, mode.dropInterval - ((level - 1) * mode.dropStep))
}

export default function Tetris() {
  const { lang, mode: modeParam, action: actionParam } = useParams<{ lang: string; mode?: string; action?: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const selectedMode = MODES.find((mode) => mode.key === modeParam) ?? null
  const isPlaying = selectedMode !== null && actionParam === 'play'

  const [board, setBoard] = useState<Board>(() => createEmptyBoard())
  const [piece, setPiece] = useState<Piece>(() => createPiece())
  const [nextPiece, setNextPiece] = useState<Piece>(() => createPiece())
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const boardRef = useRef(board)
  const pieceRef = useRef(piece)
  const nextPieceRef = useRef(nextPiece)
  const scoreRef = useRef(score)
  const linesRef = useRef(lines)
  const gameOverRef = useRef(gameOver)
  const dropTimeoutRef = useRef<number | null>(null)

  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { pieceRef.current = piece }, [piece])
  useEffect(() => { nextPieceRef.current = nextPiece }, [nextPiece])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])

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
    scoreRef.current = 0
    linesRef.current = 0
    gameOverRef.current = false

    setBoard(freshBoard)
    setPiece(freshPiece)
    setNextPiece(freshNextPiece)
    setScore(0)
    setLines(0)
    setGameOver(false)
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
    const nextLevel = Math.floor(nextLines / 10) + 1

    if (clearedLines > 0) {
      const points = scoreForLines(clearedLines, nextLevel)
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
      return
    }

    gameOverRef.current = true
    setGameOver(true)
  }, [])

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

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    restartGame()
  }, [isPlaying, restartGame, selectedMode?.key])

  useEffect(() => {
    if (!isPlaying || gameOver) {
      return
    }

    const scheduleNextDrop = () => {
      if (!selectedMode || gameOverRef.current) {
        return
      }

      const dropDelay = getDropInterval(selectedMode, Math.floor(linesRef.current / 10) + 1)

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

      if (code === 'Space' || key.startsWith('arrow') || key === 'x' || key === 'z' || key === 'r') {
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
  }, [hardDrop, isPlaying, movePiece, restartGame, rotatePiece, softDrop])

  const activeCells = useMemo(() => {
    return new Set(getPieceCells(piece).map(([x, y]) => `${x}:${y}`))
  }, [piece])

  const previewCells = useMemo(() => {
    return new Set(
      getPieceCells({ ...nextPiece, x: 0, y: 0 }).map(([x, y]) => `${x}:${y}`),
    )
  }, [nextPiece])

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

  if (!isPlaying) {
    return (
      <GameFrame gameName={t('tetris')} onBack={() => navigate(`/${lang}/tetris`)}>
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
    <GameFrame gameName={t('tetris')} onBack={() => navigate(`/${lang}/tetris/${selectedMode.key}`)}>
      <div className="tet-container tet-play">
        <div className="tet-play-card">
          <div className="tet-play-layout">
            <div className="tet-board-shell">
              <div className="tet-board" role="grid" aria-label={`${t('tetris')} ${t('tetris.hud.mode')}: ${t(selectedMode.titleKey)}`}>
                {board.map((row, rowIndex) => (
                  row.map((cell, columnIndex) => {
                    const key = `${columnIndex}:${rowIndex}`
                    const activeType = activeCells.has(key) ? piece.type : cell

                    return (
                      <div
                        key={key}
                        className={`tet-cell ${activeType ? 'tet-cell-filled' : ''}`}
                        style={activeType ? { backgroundColor: PIECE_COLORS[activeType] } : undefined}
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
                    <button className="tet-start-button tet-primary-button" onClick={restartGame} type="button">
                      {t('btn.reset')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="tet-sidebar">
              <div className="tet-sidebar-header">
                <div className="tet-play-kicker">{t('tetris.hud.mode')}</div>
                <h2 className="tet-play-title">{t(selectedMode.titleKey)}</h2>
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