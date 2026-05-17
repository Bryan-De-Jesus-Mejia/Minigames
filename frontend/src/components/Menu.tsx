import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './Menu.css'
import MinesweeperIcon from './icons/MinesweeperIcon'

export function Menu() {
  const navigate = useNavigate()
  const { lang } = useParams<{ lang: string }>()
  const { language, setLanguage, t } = useLanguage()
  const [hoveredGame, setHoveredGame] = useState<string | null>(null)

  const games = [
    { id: 'minesweeper', name: t('minesweeper'), Icon: MinesweeperIcon },
    { id: 'memory', name: t('memory'), icon: 'grid-3x3' },
    { id: 'snake', name: t('snake'), icon: 'play' },
    { id: 'tetris', name: t('tetris'), icon: 'kanban' },
    { id: 'flappybird', name: t('flappybird'), icon: 'cloud' },
  ]

  const handleGameSelect = (gameId: string) => {
    navigate(`/${lang}/${gameId}`)
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as 'en' | 'es')
    navigate(`/${newLang}`)
  }

  return (
    <div className="menu-container">
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
