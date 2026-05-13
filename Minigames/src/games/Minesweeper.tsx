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

const ROWS = 9
const COLS = 9
const MINES = 10

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
  const [board, setBoard] = useState<Cell[]>(() => makeBoard(ROWS, COLS, MINES))
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  useEffect(() => {
    const unrevealed = board.filter((c) => !c.revealed).length
    if (!gameOver && unrevealed === MINES) setWon(true)
  }, [board, gameOver])

  const revealAllMines = () => {
    setBoard((b) => b.map((c) => (c.isMine ? { ...c, revealed: true } : c)))
  }

  const revealCell = (r: number, c: number) => {
    setBoard((prev) => {
      const b = prev.slice()
      const idx = r * COLS + c
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
              if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
                const ni = rr * COLS + cc
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
    if (gameOver) return
    setBoard((prev) => {
      const b = prev.slice()
      const idx = r * COLS + c
      const cell = b[idx]
      if (cell.revealed) return prev
      cell.flagged = !cell.flagged
      return b
    })
  }

  const reset = () => {
    setBoard(makeBoard(ROWS, COLS, MINES))
    setGameOver(false)
    setWon(false)
  }

  return (
    <div className="ms-container">
      <div className="ms-header">
        <div className="ms-info">Mines: {MINES}</div>
        <div className="ms-controls">
          <button className="ms-btn" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="ms-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 32px)` }}>
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

      {gameOver && <div className="ms-overlay">Game Over</div>}
      {won && <div className="ms-overlay success">You Win</div>}
    </div>
  )
}
