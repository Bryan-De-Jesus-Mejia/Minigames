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
    <div className="game-frame">
      <div className="game-header">
        <button className="back-button" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true"></i>
          <span>{t('btn.back')}</span>
        </button>
        <h1 className="game-title">{gameName}</h1>
        <div className="header-spacer">
          <div className="language-selector">
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
                <i className="bi bi-trophy-fill" aria-hidden="true"></i>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="game-content">
        {children}
      </div>
    </div>
  )
}
