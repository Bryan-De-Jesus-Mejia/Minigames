import { Routes, Route, useNavigate } from 'react-router-dom'
import { Menu } from './components/Menu'
import { GameFrame } from './components/GameFrame'
import { Placeholder } from './games/Placeholder'
import Minesweeper from './games/Minesweeper'
import './App.css'

function App() {
  const navigate = useNavigate()

  const handleBackToMenu = () => {
    navigate('/')
  }

  const gameNames: { [key: string]: string } = {
    minesweeper: 'Minesweeper',
    memory: 'Memory',
    snake: 'Snake',
    tetris: 'Tetris',
    flappybird: 'Flappy Bird',
  }

  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/minesweeper" element={<Minesweeper />} />
      <Route path="/minesweeper/:difficulty" element={<Minesweeper />} />
      <Route
        path="/:game"
        element={(
          <GameFrame gameName={gameNames['memory']} onBack={handleBackToMenu}>
            <Placeholder gameName={gameNames['memory']} />
          </GameFrame>
        )}
      />
    </Routes>
  )
}

export default App