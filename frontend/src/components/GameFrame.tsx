import './GameFrame.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { UsernameInput } from './UsernameInput'

interface GameFrameProps {
  gameName: string
  onBack: () => void
  leaderboardHref?: string
  children: React.ReactNode
}

export function GameFrame({ gameName, onBack, leaderboardHref, children }: GameFrameProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, setLanguage, t } = useLanguage()

  const changeLang = (newLang: string) => {
    // replace first path segment with newLang
    const parts = location.pathname.split('/')
    parts[1] = newLang
    const next = parts.join('/') || `/${newLang}`
    setLanguage(newLang as 'en' | 'es')
    navigate(next)
  }

  const openLeaderboard = () => {
    if (!leaderboardHref) return
    navigate(leaderboardHref)
  }

  return (
    <main className="game-frame">
      <div className="game-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true"><path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
          <span>{t('btn.back')}</span>
        </button>
        <h1 className="game-title">{gameName}</h1>
        <div className="header-spacer">
          <div className="language-selector">
            <UsernameInput />
            <button className={`lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => changeLang('en')}>EN</button>
            <button className={`lang-btn ${language === 'es' ? 'active' : ''}`} onClick={() => changeLang('es')}>ES</button>
            {leaderboardHref ? (
              <button
                className="leaderboard-trophy-button"
                onClick={openLeaderboard}
                type="button"
                aria-label={t('leaderboard.title')}
                title={t('leaderboard.title')}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33.076 33.076 0 0 1 2.5.5zm.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935zm10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935z"/></svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="game-content">
        {children}
      </div>
    </main>
  )
}
