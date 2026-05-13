import './GameFrame.css'

interface GameFrameProps {
  gameName: string
  onBack: () => void
  children: React.ReactNode
}

export function GameFrame({ gameName, onBack, children }: GameFrameProps) {
  return (
    <div className="game-frame">
      <div className="game-header">
        <button className="back-button" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true"></i>
          <span>Back</span>
        </button>
        <h1 className="game-title">{gameName}</h1>
        <div className="header-spacer"></div>
      </div>
      <div className="game-content">
        {children}
      </div>
    </div>
  )
}
