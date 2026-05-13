import { useState } from 'react'
import './Menu.css'
import MinesweeperIcon from './icons/MinesweeperIcon'

interface MenuProps {
  onSelectGame: (game: string) => void
}

export function Menu({ onSelectGame }: MenuProps) {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null)

  const games = [
    { id: 'minesweeper', name: 'Minesweeper', Icon: MinesweeperIcon },
    { id: 'memory', name: 'Memory', icon: 'grid-3x3' },
    { id: 'snake', name: 'Snake', icon: 'play' },
    { id: 'tetris', name: 'Tetris', icon: 'kanban' },
    { id: 'flappybird', name: 'Flappy Bird', icon: 'cloud' },
  ]

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h1 className="menu-title">MINIGAMES</h1>
        <div className="menu-divider"></div>
      </div>
      <div className="games-list">
        {games.map((game) => (
          <button
            key={game.id}
            className={`game-button ${hoveredGame === game.id ? 'hovered' : ''}`}
            onClick={() => onSelectGame(game.id)}
            onMouseEnter={() => setHoveredGame(game.id)}
            onMouseLeave={() => setHoveredGame(null)}
          >
            {('Icon' in game && game.Icon) ? (
              <game.Icon className="game-icon" aria-hidden="true" />
            ) : (
              <i className={`bi bi-${(game as any).icon} game-icon`} />
            )}
            <span className="game-name">{game.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
