import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { useLanguage } from '../context/LanguageContext'
import './Minesweeper.css'
import FlagIcon from '../components/icons/FlagIcon'

type Cell = {
  r: number
  c: number
  isMine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

type DifficultyKey = 'easy' | 'medium' | 'hard'

type Difficulty = {
  key: DifficultyKey
  label: string
  rows: number
  cols: number
  mines: number
  cellSize: number
}

const DIFFICULTIES: Difficulty[] = [
  { key: 'easy', label: 'Easy', rows: 10, cols: 10, mines: 12, cellSize: 36 },
  { key: 'medium', label: 'Medium', rows: 16, cols: 16, mines: 40, cellSize: 28 },
  { key: 'hard', label: 'Hard', rows: 25, cols: 25, mines: 99, cellSize: 28 },
]

type LeaderboardEntry = {
  username: string
  time: number
  date: string
}

type LeaderboardData = Record<DifficultyKey, LeaderboardEntry[]>

const LEADERBOARD_STORAGE_KEY = 'minesweeper-leaderboard-v1'

const createEmptyLeaderboard = (): LeaderboardData => ({
  easy: [],
  medium: [],
  hard: [],
})

const createPlaceholderEntries = (baseTime: number, startDay: number): LeaderboardEntry[] => {
  const names = [
    'HexMiner',
    'GridGhost',
    'MineHunter',
    'PixelFlag',
    'ZeroCascade',
    'SafeClick',
    'BombProof',
    'CornerCheck',
    'FastReveal',
    'LuckyTile',
    'NoGuess',
    'TileScout',
    'FlagMaster',
    'MineSense',
    'ClearPath',
  ]

  return Array.from({ length: 15 }, (_, index) => ({
    username: names[index % names.length],
    time: Number((baseTime + index * 1.73 + (index % 3) * 0.11).toFixed(3)),
    date: new Date(Date.UTC(2026, 4, Math.max(1, startDay - index), 12, 0, 0)).toISOString(),
  }))
}

const PLACEHOLDER_LEADERBOARD: LeaderboardData = {
  easy: createPlaceholderEntries(22.4, 15),
  medium: createPlaceholderEntries(49.8, 15),
  hard: createPlaceholderEntries(118.2, 15),
}

const loadLeaderboard = (): LeaderboardData => {
  const fallback = createEmptyLeaderboard()

  const normalizeEntries = (entries: unknown): LeaderboardEntry[] => {
    if (!Array.isArray(entries)) return []

    return entries
      .filter((entry) => typeof entry === 'object' && entry !== null)
      .map((entry) => {
        const row = entry as Partial<LeaderboardEntry>
        return {
          username: typeof row.username === 'string' && row.username.trim().length > 0 ? row.username : 'You',
          time: typeof row.time === 'number' ? row.time : 0,
          date: typeof row.date === 'string' ? row.date : new Date().toISOString(),
        }
      })
      .sort((a, b) => a.time - b.time)
      .slice(0, 15)
  }

  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as Partial<LeaderboardData>
    const normalized = {
      easy: normalizeEntries(parsed.easy),
      medium: normalizeEntries(parsed.medium),
      hard: normalizeEntries(parsed.hard),
    }

    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    return fallback
  }
}

function makeBoard(rows: number, cols: number, mines: number, exclude?: Set<number>): Cell[] {
  const total = rows * cols
  const cells: Cell[] = Array.from({ length: total }, (_, i) => ({
    r: Math.floor(i / cols),
    c: i % cols,
    isMine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }))

  if (mines > 0) {
    let placed = 0
    while (placed < mines) {
      const idx = Math.floor(Math.random() * total)
      if (exclude && exclude.has(idx)) continue
      if (!cells[idx].isMine) {
        cells[idx].isMine = true
        placed++
      }
    }
  }

  const get = (r: number, c: number) => cells[r * cols + c]

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = get(r, c)
      if (cell.isMine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
            if (get(rr, cc).isMine) count++
          }
        }
      }
      cell.adjacent = count
    }
  }

  return cells
}

export default function Minesweeper() {
  const { lang, difficulty: difficultyParam } = useParams<{ lang: string; difficulty?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [board, setBoard] = useState<Cell[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [minesPlaced, setMinesPlaced] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(loadLeaderboard)
  const [scoreRecorded, setScoreRecorded] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const flags = board.filter((cell) => cell.flagged).length
  const isLeaderboardPage = location.pathname.endsWith('/leaderboard')
  const getParentRoute = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length <= 1) return `/${lang}`
    return `/${parts.slice(0, -1).join('/')}`
  }

  // Load difficulty from URL param on mount
  useEffect(() => {
    if (difficultyParam) {
      const selectedDifficulty = DIFFICULTIES.find((d) => d.key === difficultyParam)
      if (selectedDifficulty) {
        setDifficulty(selectedDifficulty)
        // create an empty board first; place mines on first click to guarantee a safe first reveal
        setBoard(makeBoard(selectedDifficulty.rows, selectedDifficulty.cols, 0))
        setMinesPlaced(false)
        setGameOver(false)
        setWon(false)
        setStartTime(null)
        setElapsedTime(0)
        setScoreRecorded(false)
      }
    } else {
      // Clear difficulty when no param
      setDifficulty(null)
      setBoard([])
      setGameOver(false)
      setWon(false)
      setMinesPlaced(false)
      setScoreRecorded(false)
    }
  }, [difficultyParam])


  const flagAllUnflaggedMines = () => {
    setBoard((b) => b.map((c) => (c.isMine && !c.flagged ? { ...c, flagged: true } : c)))
  }

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const milliseconds = Math.floor((totalSeconds % 1) * 1000)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
  }

  const recordWinTime = (time: number) => {
    if (!difficulty || scoreRecorded || !minesPlaced) return

    const entry: LeaderboardEntry = {
      username: 'You',
      time,
      date: new Date().toISOString(),
    }

    setLeaderboard((prev) => {
      const next = {
        ...prev,
        [difficulty.key]: [...prev[difficulty.key], entry]
          .sort((a, b) => a.time - b.time)
          .slice(0, 15),
      }
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    setScoreRecorded(true)
  }

  const toggleFlagAt = (r: number, c: number) => {
    if (!difficulty) return
    if (gameOver || won) return
    setBoard((prev) => {
      const b = prev.slice()
      const idx = r * difficulty.cols + c
      const cell = b[idx]
      if (cell.revealed) return prev
      const newFlag = !cell.flagged
      b[idx] = { ...cell, flagged: newFlag }
      return b
    })
  }

  const chordReveal = (r: number, c: number) => {
    if (!difficulty) return
    if (gameOver || won) return

    setBoard((prev) => {
      const b = prev.slice()
      const idx = r * difficulty.cols + c
      const cell = b[idx]
      if (!cell.revealed || cell.adjacent === 0) return prev

      let adjacentFlags = 0
      const neighbors: number[] = []

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const rr = r + dr
          const cc = c + dc
          if (rr >= 0 && rr < difficulty.rows && cc >= 0 && cc < difficulty.cols) {
            const ni = rr * difficulty.cols + cc
            const neighbor = b[ni]
            if (neighbor.flagged) adjacentFlags++
            else if (!neighbor.revealed) neighbors.push(ni)
          }
        }
      }

      if (adjacentFlags < cell.adjacent) return prev

      for (const ni of neighbors) {
        const neighbor = b[ni]
        if (neighbor.flagged || neighbor.revealed) continue
        neighbor.revealed = true
        if (neighbor.isMine) {
          setGameOver(true)
          revealAllMines()
          return b
        }
      }

      // Flood-fill from any newly revealed empty cells
      const stack: Cell[] = []
      for (const ni of neighbors) {
        if (b[ni].adjacent === 0 && b[ni].revealed) {
          stack.push(b[ni])
        }
      }

      while (stack.length) {
        const cur = stack.pop()!
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = cur.r + dr
            const cc = cur.c + dc
            if (rr >= 0 && rr < difficulty.rows && cc >= 0 && cc < difficulty.cols) {
              const ni = rr * difficulty.cols + cc
              const ncell = b[ni]
              if (!ncell.revealed && !ncell.flagged) {
                ncell.revealed = true
                if (ncell.adjacent === 0 && !ncell.isMine) stack.push(ncell)
              }
            }
          }
        }
      }

      return b
    })
  }

  useEffect(() => {
    if (!startTime || gameOver || won) return
    const interval = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000)
    }, 50)
    return () => clearInterval(interval)
  }, [startTime, gameOver, won])

  useEffect(() => {
    if (!difficulty) return
    const unrevealedSafeCells = board.filter((c) => !c.revealed && !c.isMine).length
    if (!gameOver && !won && unrevealedSafeCells === 0 && board.length > 0) {
      recordWinTime(elapsedTime)
      setWon(true)
      // Auto-flag all unflagged mines on win
      flagAllUnflaggedMines()
    }
  }, [board, gameOver, difficulty, won, elapsedTime, minesPlaced, scoreRecorded])

  const revealAllMines = () => {
    setBoard((b) => b.map((c) => (c.isMine ? { ...c, revealed: true } : c)))
  }

  const startGame = (nextDifficulty: Difficulty) => {
     navigate(`/${lang}/minesweeper/${nextDifficulty.key}`)
  }

  const openLeaderboard = () => {
    if (!difficulty) return
    navigate(`/${lang}/minesweeper/${difficulty.key}/leaderboard`)
  }

  const backToGame = () => {
    if (!difficulty) return
    navigate(`/${lang}/minesweeper/${difficulty.key}`)
  }

  const changeDifficulty = () => {
     navigate(`/${lang}/minesweeper`)
  }

  const renderLeaderboardEntries = (entries: LeaderboardEntry[]) => {
    const displayEntries = entries.length > 0 ? entries : PLACEHOLDER_LEADERBOARD[difficulty.key]
    const podiumEntries = displayEntries.slice(0, 3)
    const listEntries = displayEntries.slice(3, 15)

    return (
      <div className="ms-leaderboard-layout">
        <div className="ms-podium" aria-label={t('leaderboard.podium')}>
          {podiumEntries.length === 0 ? (
            <div className="ms-leaderboard-empty">{t('leaderboard.empty')}</div>
          ) : (
            podiumEntries.map((entry, index) => {
              const place = index + 1
              return (
                <div
                  key={`${difficulty.key}-${entry.time}-${entry.date}`}
                  className={`ms-podium-slot ms-podium-${place}`}
                >
                  <div className="ms-podium-place">#{place}</div>
                  <div className="ms-podium-username">{entry.username}</div>
                  <div className="ms-podium-time">{formatTime(entry.time)}</div>
                  <div className="ms-podium-date">{new Date(entry.date).toLocaleDateString()}</div>
                </div>
              )
            })
          )}
        </div>

        {listEntries.length > 0 && (
          <ol className="ms-leaderboard-list">
            {listEntries.map((entry, index) => {
              const place = index + 4
              return (
                <li key={`${difficulty.key}-${entry.time}-${entry.date}`} className="ms-leaderboard-item">
                  <span className="ms-rank">#{place}</span>
                  <span className="ms-score-user">{entry.username}</span>
                  <span className="ms-score-time">{formatTime(entry.time)}</span>
                  <span className="ms-score-date">{new Date(entry.date).toLocaleDateString()}</span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    )
  }

  const revealCell = (r: number, c: number) => {
    if (!difficulty) return
    if (gameOver || won) return
    setBoard((prev) => {
      let b = prev.slice()

      // On first click, place mines while avoiding the clicked cell and its neighbors
      if (!minesPlaced) {
        const exclude = new Set<number>()
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr
            const cc = c + dc
            if (rr >= 0 && rr < difficulty.rows && cc >= 0 && cc < difficulty.cols) {
              exclude.add(rr * difficulty.cols + cc)
            }
          }
        }
        b = makeBoard(difficulty.rows, difficulty.cols, difficulty.mines, exclude)
        setMinesPlaced(true)
        setStartTime(Date.now())
      }

      const idx = r * difficulty.cols + c
      const cell = b[idx]
      if (cell.revealed || cell.flagged) return b
      cell.revealed = true
      if (cell.isMine) {
        setGameOver(true)
        revealAllMines()
        return b
      }

      if (cell.adjacent === 0) {
        const stack = [cell]
        while (stack.length) {
          const cur = stack.pop()!
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = cur.r + dr
              const cc = cur.c + dc
              if (rr >= 0 && rr < difficulty.rows && cc >= 0 && cc < difficulty.cols) {
                const ni = rr * difficulty.cols + cc
                const ncell = b[ni]
                if (!ncell.revealed && !ncell.flagged) {
                  ncell.revealed = true
                  if (ncell.adjacent === 0 && !ncell.isMine) stack.push(ncell)
                }
              }
            }
          }
        }
      }
      return b
    })
  }

  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault()
    if (!difficulty) return
    if (gameOver || won) return
    toggleFlagAt(r, c)
  }

  const reset = () => {
    if (!difficulty) return
    setBoard(makeBoard(difficulty.rows, difficulty.cols, 0))
    setMinesPlaced(false)
    setGameOver(false)
    setWon(false)
    setStartTime(null)
    setElapsedTime(0)
    setScoreRecorded(false)
  }

  if (!difficulty) {
    return (
      <GameFrame gameName={t('minesweeper')} onBack={() => navigate(`/${lang}`)}>
        <div className="ms-container ms-menu">
          <div className="ms-menu-card">
            <div className="ms-menu-title">{t('difficulty.choose')}</div>
            <div className="ms-menu-list">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.key}
                  className="ms-menu-button"
                  onClick={() => startGame(option)}
                  type="button"
                >
                  <span>{t(`difficulty.${option.key}`)}</span>
                  <span>{option.rows}x{option.cols}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GameFrame>
    )
  }

  const leaderboardEntries = leaderboard[difficulty.key]

  if (isLeaderboardPage) {
    return (
      <GameFrame gameName={t('minesweeper')} onBack={() => navigate(getParentRoute())}>
        <div className="ms-container ms-menu ms-leaderboard-page">
          <div className="ms-menu-card ms-leaderboard-card">
            <div className="ms-menu-title">
              {t('leaderboard.title')} · {t(`difficulty.${difficulty.key}`)}
            </div>
            <div className="ms-leaderboard-meta">
              {difficulty.rows}x{difficulty.cols} · {difficulty.mines} mines
            </div>
            {renderLeaderboardEntries(leaderboardEntries)}
          </div>
        </div>
      </GameFrame>
    )
  }

  const gameContent = (
    <div className="ms-container">
      <div className="ms-header">
        <div className="ms-info">{t(`difficulty.${difficulty.key}`)} · {difficulty.rows}x{difficulty.cols} · {t('btn.flag')}: {difficulty.mines - flags} · {t('btn.timer')}: <span className="ms-timer">{formatTime(elapsedTime)}</span></div>
        <div className="ms-controls">
          <button className={`ms-btn ${flagMode ? 'active' : ''}`} onClick={() => setFlagMode((f) => !f)}>{flagMode ? `${t('btn.flag')}: ${t('flag.on')}` : `${t('btn.flag')}: ${t('flag.off')}`}</button>
          <button className="ms-btn" onClick={openLeaderboard} type="button">{t('leaderboard.view')}</button>
          <button className="ms-btn" onClick={changeDifficulty}>{t('btn.difficulty')}</button>
          <button className="ms-btn" onClick={reset}>{t('btn.reset')}</button>
        </div>
      </div>

      <div className="ms-board scrollable">
        <div
          ref={gridRef}
          className="ms-grid"
          style={{
            gridTemplateColumns: `repeat(${difficulty.cols}, ${difficulty.cellSize}px)`,
          } as React.CSSProperties}
        >

          {board.map((cell) => (
            <div
              key={`${cell.r}-${cell.c}`}
              data-key={`${cell.r}-${cell.c}`}
              className={`ms-cell ${cell.revealed ? 'revealed' : ''} ${cell.flagged ? 'flagged' : ''} ${cell.isMine && cell.revealed ? 'mine' : ''}`}
              onClick={() => {
                if (won) return

                if (cell.revealed && cell.adjacent > 0) {
                  chordReveal(cell.r, cell.c)
                  return
                }

                if (flagMode) {
                  toggleFlagAt(cell.r, cell.c)
                  return
                }

                revealCell(cell.r, cell.c)
              }}
              onContextMenu={(e) => toggleFlag(e, cell.r, cell.c)}
              role="button"
              tabIndex={0}
            >
              {cell.revealed ? (
                cell.isMine ? (
                  '●'
                ) : cell.adjacent > 0 ? (
                  <span className={`num num-${cell.adjacent}`}>{cell.adjacent}</span>
                ) : (
                  ''
                )
              ) : cell.flagged ? (
                <FlagIcon className="ms-flag-icon" />
              ) : (
                ''
              )}
            </div>
          ))}
        </div>
      </div>

      {gameOver && <div className="ms-overlay">{t('game.over')}</div>}
      {won && <div className="ms-overlay success">{t('game.win')} · {formatTime(elapsedTime)}</div>}
    </div>
  )

  return (
    <GameFrame gameName={t('minesweeper')} onBack={() => navigate(getParentRoute())}>
      {gameContent}
    </GameFrame>
  )
}
