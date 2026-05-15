import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  const { t } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [board, setBoard] = useState<Cell[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [minesPlaced, setMinesPlaced] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const flags = board.filter((cell) => cell.flagged).length

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
      }
    } else {
      // Clear difficulty when no param
      setDifficulty(null)
      setBoard([])
      setGameOver(false)
      setWon(false)
      setMinesPlaced(false)
    }
  }, [difficultyParam])


  const flagAllUnflaggedMines = () => {
    setBoard((b) => b.map((c) => (c.isMine && !c.flagged ? { ...c, flagged: true } : c)))
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
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
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 100)
    return () => clearInterval(interval)
  }, [startTime, gameOver, won])

  useEffect(() => {
    if (!difficulty) return
    const unrevealedSafeCells = board.filter((c) => !c.revealed && !c.isMine).length
    if (!gameOver && !won && unrevealedSafeCells === 0 && board.length > 0) {
      setWon(true)
      // Auto-flag all unflagged mines on win
      flagAllUnflaggedMines()
    }
  }, [board, gameOver, difficulty, won])

  const revealAllMines = () => {
    setBoard((b) => b.map((c) => (c.isMine ? { ...c, revealed: true } : c)))
  }

  const startGame = (nextDifficulty: Difficulty) => {
     navigate(`/${lang}/minesweeper/${nextDifficulty.key}`)
  }

  const changeDifficulty = () => {
     navigate(`/${lang}/minesweeper`)
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

  const gameContent = (
    <div className="ms-container">
      <div className="ms-header">
        <div className="ms-info">{t(`difficulty.${difficulty.key}`)} · {difficulty.rows}x{difficulty.cols} · {t('btn.flag')}: {difficulty.mines - flags}</div>
        <div className="ms-controls">
          <button className={`ms-btn ${flagMode ? 'active' : ''}`} onClick={() => setFlagMode((f) => !f)}>{flagMode ? `${t('btn.flag')}: ${t('flag.on')}` : `${t('btn.flag')}: ${t('flag.off')}`}</button>
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
    <GameFrame gameName={t('minesweeper')} onBack={() => navigate(`/${lang}`)}>
      {gameContent}
    </GameFrame>
  )
}
