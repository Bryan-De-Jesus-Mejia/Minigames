import React, { useEffect, useState } from 'react'
import './Minesweeper.css'

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
  { key: 'hard', label: 'Hard', rows: 25, cols: 25, mines: 99, cellSize: 18 },
]

function makeBoard(rows: number, cols: number, mines: number): Cell[] {
  const total = rows * cols
  const cells: Cell[] = Array.from({ length: total }, (_, i) => ({
    r: Math.floor(i / cols),
    c: i % cols,
    isMine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }))

  let placed = 0
  while (placed < mines) {
    const idx = Math.floor(Math.random() * total)
    if (!cells[idx].isMine) {
      cells[idx].isMine = true
      placed++
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
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [board, setBoard] = useState<Cell[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  useEffect(() => {
    if (!difficulty) return
    const unrevealedSafeCells = board.filter((c) => !c.revealed && !c.isMine).length
    if (!gameOver && unrevealedSafeCells === 0 && board.length > 0) setWon(true)
  }, [board, gameOver, difficulty])

  const revealAllMines = () => {
    setBoard((b) => b.map((c) => (c.isMine ? { ...c, revealed: true } : c)))
  }

  const startGame = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty)
    setBoard(makeBoard(nextDifficulty.rows, nextDifficulty.cols, nextDifficulty.mines))
    setGameOver(false)
    setWon(false)
  }

  const changeDifficulty = () => {
    setDifficulty(null)
    setBoard([])
    setGameOver(false)
    setWon(false)
  }

  const revealCell = (r: number, c: number) => {
    if (!difficulty) return
    setBoard((prev) => {
      const b = prev.slice()
      const idx = r * difficulty.cols + c
      const cell = b[idx]
      if (cell.revealed || cell.flagged || gameOver) return prev
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
    if (gameOver) return
    setBoard((prev) => {
      const b = prev.slice()
      const idx = r * difficulty.cols + c
      const cell = b[idx]
      if (cell.revealed) return prev
      cell.flagged = !cell.flagged
      return b
    })
  }

  const reset = () => {
    if (!difficulty) return
    setBoard(makeBoard(difficulty.rows, difficulty.cols, difficulty.mines))
    setGameOver(false)
    setWon(false)
  }

  if (!difficulty) {
    return (
      <div className="ms-container ms-menu">
        <div className="ms-menu-card">
          <div className="ms-menu-title">Choose difficulty</div>
          <div className="ms-menu-list">
            {DIFFICULTIES.map((option) => (
              <button
                key={option.key}
                className="ms-menu-button"
                onClick={() => startGame(option)}
                type="button"
              >
                <span>{option.label}</span>
                <span>{option.rows}x{option.cols}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ms-container">
      <div className="ms-header">
        <div className="ms-info">{difficulty.label} · {difficulty.rows}x{difficulty.cols} · Mines: {difficulty.mines}</div>
        <div className="ms-controls">
          <button className="ms-btn" onClick={changeDifficulty}>Difficulty</button>
          <button className="ms-btn" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className={`ms-board ${difficulty.key === 'hard' ? 'scrollable' : 'compact'}`}>
        <div
          className="ms-grid"
          style={{ gridTemplateColumns: `repeat(${difficulty.cols}, ${difficulty.cellSize}px)` }}
        >
          {board.map((cell) => (
            <div
              key={`${cell.r}-${cell.c}`}
              className={`ms-cell ${cell.revealed ? 'revealed' : ''} ${cell.flagged ? 'flagged' : ''} ${cell.isMine && cell.revealed ? 'mine' : ''}`}
              onClick={() => revealCell(cell.r, cell.c)}
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
                '⚑'
              ) : (
                ''
              )}
            </div>
          ))}
        </div>
      </div>

      {gameOver && <div className="ms-overlay">Game Over</div>}
      {won && <div className="ms-overlay success">You Win</div>}
    </div>
  )
}
