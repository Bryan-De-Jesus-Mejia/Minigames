import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from './components/GameFrame'
import { Menu } from './components/Menu'
import { DEFAULT_LANGUAGE, isLanguage } from './context/translations'
import { useLanguage } from './context/language'
import { findGame } from './lib/games'
import { Placeholder } from './games/Placeholder'

const Minesweeper = lazy(() => import('./games/Minesweeper'))
const Memory = lazy(() => import('./games/Memory'))
const Tetris = lazy(() => import('./games/Tetris'))

const HOME = `/${DEFAULT_LANGUAGE}`

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

/** Rejects paths whose first segment is not a supported language. */
function LanguageGuard() {
  const { lang } = useParams<{ lang: string }>()
  if (!isLanguage(lang)) return <Navigate to={HOME} replace />
  return <Outlet />
}

/** "Coming soon" screen for catalogue entries that have no implementation yet. */
function PlaceholderRoute() {
  const { lang, game: gameId } = useParams<{ lang: string; game: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const game = findGame(gameId)

  if (!game || game.playable) return <Navigate to={`/${lang}`} replace />

  const gameName = t(game.nameKey)
  return (
    <GameFrame gameName={gameName} onBack={() => navigate(`/${lang}`)}>
      <Placeholder gameName={gameName} />
    </GameFrame>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/:lang" element={<LanguageGuard />}>
        <Route index element={<Menu />} />

        <Route path="minesweeper" element={<Lazy><Minesweeper /></Lazy>} />
        <Route path="minesweeper/:difficulty" element={<Lazy><Minesweeper /></Lazy>} />
        <Route path="minesweeper/:difficulty/leaderboard" element={<Lazy><Minesweeper /></Lazy>} />

        <Route path="memory" element={<Lazy><Memory /></Lazy>} />
        <Route path="memory/:difficulty" element={<Lazy><Memory /></Lazy>} />
        <Route path="memory/:difficulty/leaderboard" element={<Lazy><Memory /></Lazy>} />

        <Route path="tetris" element={<Lazy><Tetris /></Lazy>} />
        <Route path="tetris/:mode" element={<Lazy><Tetris /></Lazy>} />
        <Route path="tetris/:mode/:action" element={<Lazy><Tetris /></Lazy>} />

        <Route path=":game" element={<PlaceholderRoute />} />
      </Route>
      <Route path="*" element={<Navigate to={HOME} replace />} />
    </Routes>
  )
}
