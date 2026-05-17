import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './Menu.css'
import MinesweeperIcon from './icons/MinesweeperIcon'
import GridIcon from './icons/GridIcon'
import PlayIcon from './icons/PlayIcon'
import KanbanIcon from './icons/KanbanIcon'
import CloudIcon from './icons/CloudIcon'

export function Menu() {
  const navigate = useNavigate()
  const { lang } = useParams<{ lang: string }>()
  const { language, setLanguage, t } = useLanguage()
  const [hoveredGame, setHoveredGame] = useState<string | null>(null)

  const games = [
    { id: 'minesweeper', name: t('minesweeper'), Icon: MinesweeperIcon },
    { id: 'memory', name: t('memory'), Icon: GridIcon },
    { id: 'snake', name: t('snake'), Icon: PlayIcon },
    { id: 'tetris', name: t('tetris'), Icon: KanbanIcon },
    { id: 'flappybird', name: t('flappybird'), Icon: CloudIcon },
  ]

  const handleGameSelect = (gameId: string) => {
    navigate(`/${lang}/${gameId}`)
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as 'en' | 'es')
    navigate(`/${newLang}`)
  }

  return (
    <main className="menu-container">
      <div className="menu-header">
        <h1 className="menu-title">{t('menu.title')}</h1>
        <div className="menu-divider"></div>
        <div className="language-selector">
          <button
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('en')}
          >
            EN
          </button>
          <button
            className={`lang-btn ${language === 'es' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('es')}
          >
            ES
          </button>
          
        </div>
      </div>
      <div className="games-list">
        {games.map((game) => (
          <button
            key={game.id}
            className={`game-button ${hoveredGame === game.id ? 'hovered' : ''}`}
            onClick={() => handleGameSelect(game.id)}
            onMouseEnter={() => setHoveredGame(game.id)}
            onMouseLeave={() => setHoveredGame(null)}
          >
            <game.Icon className="game-icon" aria-hidden="true" />
            <span className="game-name">{game.name}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
