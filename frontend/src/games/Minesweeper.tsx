import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { LeaderboardPage } from '../components/Leaderboard'
import { MenuCard, MenuOptionList } from '../components/MenuCard'
import { ResultOverlay } from '../components/ResultOverlay'
import { UsernameNotice } from '../components/UsernameNotice'
import { FlagIcon } from '../components/icons'
import { useLanguage } from '../context/language'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { formatTime } from '../lib/format'
import './Minesweeper.css'

type Cell = {
  r: number
  c: number
  isMine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

type Difficulty = {
  key: 'easy' | 'medium' | 'hard'
  rows: number
  cols: number
  mines: number
  cellSize: number
}

const DIFFICULTIES: Difficulty[] = [
  { key: 'easy', rows: 10, cols: 10, mines: 12, cellSize: 36 },
  { key: 'medium', rows: 16, cols: 16, mines: 40, cellSize: 28 },
  { key: 'hard', rows: 25, cols: 25, mines: 99, cellSize: 28 },
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

  let placed = 0
  while (placed < mines) {
    const idx = Math.floor(Math.random() * total)
    if (exclude?.has(idx)) continue
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
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && get(rr, cc).isMine) count++
        }
      }
      cell.adjacent = count
    }
  }

  return cells
}

/** Reveals every empty region reachable from the already-revealed seeds. */
function floodFill(board: Cell[], difficulty: Difficulty, seeds: Cell[]) {
  const stack = seeds.slice()
  while (stack.length) {
    const cur = stack.pop()!
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = cur.r + dr
        const cc = cur.c + dc
        if (rr < 0 || rr >= difficulty.rows || cc < 0 || cc >= difficulty.cols) continue
        const neighbor = board[rr * difficulty.cols + cc]
        if (neighbor.revealed || neighbor.flagged) continue
        neighbor.revealed = true
        if (neighbor.adjacent === 0 && !neighbor.isMine) stack.push(neighbor)
      }
    }
  }
}

export default function Minesweeper() {
  const { lang, difficulty: difficultyParam } = useParams<{ lang: string; difficulty?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()

  const difficulty = DIFFICULTIES.find((d) => d.key === difficultyParam) ?? null
  const isLeaderboardPage = location.pathname.endsWith('/leaderboard')

  const [board, setBoard] = useState<Cell[]>([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [minesPlaced, setMinesPlaced] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const leaderboard = useLeaderboard({
    game: 'minesweeper',
    difficulty: difficulty?.key ?? null,
    metric: 'time',
    session: !isLeaderboardPage,
    autoLoad: isLeaderboardPage,
  })
  const { submit, startSession } = leaderboard

  const flags = board.filter((cell) => cell.flagged).length

  const resetBoard = useCallback(() => {
    setBoard(difficulty ? makeBoard(difficulty.rows, difficulty.cols, 0) : [])
    setMinesPlaced(false)
    setGameOver(false)
    setWon(false)
    setStartTime(null)
    setElapsedTime(0)
  }, [difficulty])

  useEffect(() => {
    resetBoard()
  }, [resetBoard])

  // Tick the clock while a game is in progress.
  useEffect(() => {
    if (!startTime || gameOver || won) return
    const interval = setInterval(() => setElapsedTime((Date.now() - startTime) / 1000), 50)
    return () => clearInterval(interval)
  }, [startTime, gameOver, won])

  // Win as soon as every safe cell is revealed.
  useEffect(() => {
    if (!difficulty || gameOver || won || board.length === 0) return
    if (board.some((cell) => !cell.revealed && !cell.isMine)) return

    setWon(true)
    setBoard((b) => b.map((cell) => (cell.isMine && !cell.flagged ? { ...cell, flagged: true } : cell)))
    if (minesPlaced) void submit(elapsedTime)
  }, [board, difficulty, elapsedTime, gameOver, minesPlaced, submit, won])

  /** Working copy of the board; cells are cloned so state is never mutated. */
  const cloneBoard = () => board.map((cell) => ({ ...cell }))

  const loseWith = (next: Cell[]) => {
    setBoard(next.map((cell) => (cell.isMine ? { ...cell, revealed: true } : cell)))
    setGameOver(true)
  }

  const toggleFlagAt = (r: number, c: number) => {
    if (!difficulty || gameOver || won) return
    const idx = r * difficulty.cols + c
    if (board[idx].revealed) return
    const next = cloneBoard()
    next[idx].flagged = !next[idx].flagged
    setBoard(next)
  }

  const revealCell = (r: number, c: number) => {
    if (!difficulty || gameOver || won) return

    let next = cloneBoard()

    // The first click is always safe: mines are placed around it.
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
      next = makeBoard(difficulty.rows, difficulty.cols, difficulty.mines, exclude)
      setMinesPlaced(true)
      setStartTime(Date.now())
    }

    const cell = next[r * difficulty.cols + c]
    if (cell.revealed || cell.flagged) return
    cell.revealed = true

    if (cell.isMine) {
      loseWith(next)
      return
    }

    if (cell.adjacent === 0) floodFill(next, difficulty, [cell])
    setBoard(next)
  }

  /** Reveals the unflagged neighbours of a satisfied number. */
  const chordReveal = (r: number, c: number) => {
    if (!difficulty || gameOver || won) return

    const next = cloneBoard()
    const cell = next[r * difficulty.cols + c]
    if (!cell.revealed || cell.adjacent === 0) return

    let adjacentFlags = 0
    const hidden: number[] = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const rr = r + dr
        const cc = c + dc
        if (rr < 0 || rr >= difficulty.rows || cc < 0 || cc >= difficulty.cols) continue
        const idx = rr * difficulty.cols + cc
        if (next[idx].flagged) adjacentFlags++
        else if (!next[idx].revealed) hidden.push(idx)
      }
    }

    if (adjacentFlags < cell.adjacent) return

    for (const idx of hidden) {
      next[idx].revealed = true
      if (next[idx].isMine) {
        loseWith(next)
        return
      }
    }

    floodFill(next, difficulty, hidden.map((idx) => next[idx]).filter((n) => n.adjacent === 0))
    setBoard(next)
  }

  const reset = () => {
    resetBoard()
    startSession()
  }

  if (!difficulty) {
    return (
      <GameFrame gameName={t('minesweeper')} onBack={() => navigate(`/${lang}`)}>
        <div className="game-page game-page--center">
          <MenuCard title={t('difficulty.choose')} withUsername>
            <MenuOptionList
              options={DIFFICULTIES.map((option) => ({
                key: option.key,
                label: t(`difficulty.${option.key}`),
                meta: `${option.rows}x${option.cols}`,
              }))}
              onSelect={(key) => navigate(`/${lang}/minesweeper/${key}`)}
            />
          </MenuCard>
        </div>
      </GameFrame>
    )
  }

  const leaderboardHref = `/${lang}/minesweeper/${difficulty.key}/leaderboard`

  if (isLeaderboardPage) {
    return (
      <GameFrame
        gameName={t('minesweeper')}
        onBack={() => navigate(`/${lang}/minesweeper/${difficulty.key}`)}
        leaderboardHref={leaderboardHref}
      >
        <LeaderboardPage
          title={`${t('leaderboard.title')} · ${t(`difficulty.${difficulty.key}`)}`}
          meta={`${difficulty.rows}x${difficulty.cols} · ${difficulty.mines} ${t('minesweeper.mines')}`}
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
      gameName={t('minesweeper')}
      onBack={() => navigate(`/${lang}/minesweeper`)}
      leaderboardHref={leaderboardHref}
    >
      <div className="game-page">
        <UsernameNotice />

        <div className="game-hud">
          <div className="game-hud-info">
            {t(`difficulty.${difficulty.key}`)} · {difficulty.rows}x{difficulty.cols} ·{' '}
            {t('btn.flag')}: {difficulty.mines - flags} · {t('btn.timer')}:{' '}
            <span className="timer">{formatTime(elapsedTime)}</span>
          </div>
          <div className="game-hud-actions">
            <button
              className={`btn ${flagMode ? 'is-active' : ''}`}
              onClick={() => setFlagMode((f) => !f)}
              type="button"
            >
              {t('btn.flag')}: {flagMode ? t('flag.on') : t('flag.off')}
            </button>
            <button className="btn" onClick={() => navigate(`/${lang}/minesweeper`)} type="button">
              {t('btn.difficulty')}
            </button>
            <button className="btn" onClick={reset} type="button">
              {t('btn.reset')}
            </button>
          </div>
        </div>

        <div className="ms-board">
          <div
            className="ms-grid"
            style={
              { gridTemplateColumns: `repeat(${difficulty.cols}, ${difficulty.cellSize}px)` } as CSSProperties
            }
          >
            {board.map((cell) => (
              <div
                key={`${cell.r}-${cell.c}`}
                className={`ms-cell ${cell.revealed ? 'revealed' : ''} ${cell.flagged ? 'flagged' : ''} ${
                  cell.isMine && cell.revealed ? 'mine' : ''
                }`}
                onClick={() => {
                  if (won) return
                  if (cell.revealed && cell.adjacent > 0) chordReveal(cell.r, cell.c)
                  else if (flagMode) toggleFlagAt(cell.r, cell.c)
                  else revealCell(cell.r, cell.c)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  toggleFlagAt(cell.r, cell.c)
                }}
                role="button"
                tabIndex={0}
              >
                {cell.revealed ? (
                  cell.isMine ? (
                    '●'
                  ) : cell.adjacent > 0 ? (
                    <span className={`num num-${cell.adjacent}`}>{cell.adjacent}</span>
                  ) : null
                ) : cell.flagged ? (
                  <FlagIcon className="ms-flag-icon" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {gameOver && <ResultOverlay title={t('game.over')} />}
        {won && (
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
