import { useState } from 'react'
import { Menu } from './components/Menu'
import { GameFrame } from './components/GameFrame'
import { Placeholder } from './games/Placeholder'
import Minesweeper from './games/Minesweeper'
import './App.css'

function App() {
  const [currentGame, setCurrentGame] = useState<string | null>(null)

  const handleSelectGame = (gameId: string) => {
    setCurrentGame(gameId)
  }

  const handleBackToMenu = () => {
    setCurrentGame(null)
  }

  const gameNames: { [key: string]: string } = {
    minesweeper: 'Minesweeper',
    memory: 'Memory',
    snake: 'Snake',
    tetris: 'Tetris',
    flappybird: 'Flappy Bird',
  }

  if (!currentGame) {
    return <Menu onSelectGame={handleSelectGame} />
  }

  if (currentGame === 'minesweeper') {
    return (
      <GameFrame gameName={gameNames[currentGame]} onBack={handleBackToMenu}>
        <Minesweeper />
      </GameFrame>
    )
  }

  return (
    <GameFrame gameName={gameNames[currentGame]} onBack={handleBackToMenu}>
      <Placeholder gameName={gameNames[currentGame]} />
    </GameFrame>
  )
}

export default App