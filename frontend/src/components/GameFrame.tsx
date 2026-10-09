import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/language'
import { LanguageSwitch } from './LanguageSwitch'
import { UsernameInput } from './UsernameInput'
import { ArrowIcon, TrophyIcon } from './icons'
import './GameFrame.css'

interface GameFrameProps {
  gameName: string
  onBack: () => void
  leaderboardHref?: string
  children: ReactNode
}

export function GameFrame({ gameName, onBack, leaderboardHref, children }: GameFrameProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <main className="game-frame">
      <div className="game-header">
        <button className="back-button" onClick={onBack} type="button">
          <ArrowIcon direction="left" width={16} height={16} aria-hidden="true" />
          <span>{t('btn.back')}</span>
        </button>
        <h1 className="game-title">{gameName}</h1>
        <div className="game-header-tools">
          <div className="language-selector">
            <UsernameInput />
            <LanguageSwitch />
            {leaderboardHref ? (
              <button
                className="leaderboard-trophy-button"
                onClick={() => navigate(leaderboardHref)}
                type="button"
                aria-label={t('leaderboard.title')}
                title={t('leaderboard.title')}
              >
                <TrophyIcon width={16} height={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="game-content">{children}</div>
    </main>
  )
}
