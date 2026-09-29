import { useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../context/language'
import { GAMES } from '../lib/games'
import { LanguageSwitch } from './LanguageSwitch'
import './Menu.css'

export function Menu() {
  const navigate = useNavigate()
  const { lang } = useParams<{ lang: string }>()
  const { t } = useLanguage()

  return (
    <main className="menu-container">
      <div className="menu-header">
        <h1 className="menu-title">{t('menu.title')}</h1>
        <div className="menu-divider" />
        <div className="language-selector">
          <LanguageSwitch />
        </div>
      </div>
      <div className="games-list">
        {GAMES.map(({ id, nameKey, Icon }) => (
          <button
            key={id}
            className="game-button"
            onClick={() => navigate(`/${lang}/${id}`)}
            type="button"
          >
            <Icon className="game-icon" aria-hidden="true" />
            <span className="game-name">{t(nameKey)}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
