import React from 'react'
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom'
import { Menu } from './components/Menu'
import { GameFrame } from './components/GameFrame'
import { Placeholder } from './games/Placeholder'
import Minesweeper from './games/Minesweeper'
import { useLanguage } from './context/LanguageContext'
import './App.css'

type Language = 'en' | 'es'

function ValidatedGameRoute({ children }: { children: React.ReactNode }) {
  const { game } = useParams<{ game?: string }>()
  const navigate = useNavigate()

  const allowedGames = ['memory', 'snake', 'tetris', 'flappybird']

  React.useEffect(() => {
    if (!game || !allowedGames.includes(game)) {
      navigate('/en', { replace: true })
    }
  }, [game, navigate])

  if (!game || !allowedGames.includes(game)) return null
  return children
}

function App() {
  const { setLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const lang = (location.pathname.split('/')[1] || 'en') as Language

  // If the first path segment is not a valid language, redirect to /en
  React.useEffect(() => {
    const path = location.pathname || '/'
    if (path === '/') {
      navigate('/en', { replace: true })
      return
    }
    const first = path.split('/')[1]
    if (!['en', 'es'].includes(first)) {
      navigate('/en', { replace: true })
    }
  }, [location.pathname, navigate])

  // Set language based on URL param
  React.useEffect(() => {
    if (lang && ['en', 'es'].includes(lang)) {
      setLanguage(lang as Language)
    } else {
      navigate('/en')
    }
  }, [lang, setLanguage, navigate])

  const handleBackToMenu = () => {
    navigate(`/${lang}`)
  }

  const gameNames: { [key: string]: string } = {
    minesweeper: 'Minesweeper',
    memory: 'Memory',
    snake: 'Snake',
    tetris: 'Tetris',
    flappybird: 'Flappy Bird',
  }

  if (!lang || !['en', 'es'].includes(lang)) {
    return null
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/en" replace />} />
      <Route path="/:lang" element={<Menu />} />
      <Route path="/:lang/minesweeper" element={<Minesweeper />} />
      <Route path="/:lang/minesweeper/:difficulty" element={<Minesweeper />} />
      <Route
        path="/:lang/:game"
        element={(
          <ValidatedGameRoute>
            <GameFrame gameName={gameNames['memory']} onBack={handleBackToMenu}>
              <Placeholder gameName={gameNames['memory']} />
            </GameFrame>
          </ValidatedGameRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/en" replace />} />
    </Routes>
  )
}

export default App