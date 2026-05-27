import { useNavigate, useParams } from 'react-router-dom'
import { GameFrame } from '../components/GameFrame'
import { UsernameInput } from '../components/UsernameInput'
import { useLanguage } from '../context/LanguageContext'
import './Tetris.css'

type TetrisModeKey = 'classic' | 'marathon' | 'zen'

type TetrisMode = {
  key: TetrisModeKey
  titleKey: string
  summaryKey: string
}

const MODES: TetrisMode[] = [
  {
    key: 'classic',
    titleKey: 'tetris.mode.classic',
    summaryKey: 'tetris.mode.classic.summary',
  },
  {
    key: 'marathon',
    titleKey: 'tetris.mode.marathon',
    summaryKey: 'tetris.mode.marathon.summary',
  },
  {
    key: 'zen',
    titleKey: 'tetris.mode.zen',
    summaryKey: 'tetris.mode.zen.summary',
  },
]

const CONTROL_ROWS = [
  { labelKey: 'tetris.control.move', value: '← / →' },
  { labelKey: 'tetris.control.rotate', value: '↑ / X / Z' },
  { labelKey: 'tetris.control.drop', value: '↓ / Space' },
  { labelKey: 'tetris.control.hold', value: 'C / Shift' },
] as const

export default function Tetris() {
  const { lang, mode: modeParam } = useParams<{ lang: string; mode?: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const selectedMode = MODES.find((mode) => mode.key === modeParam) ?? null

  const goBack = () => {
    navigate(`/${lang}`)
  }

  if (!selectedMode) {
    return (
      <GameFrame gameName={t('tetris')} onBack={goBack}>
        <div className="tet-container tet-menu">
          <div className="tet-menu-card">
            <h2 className="tet-menu-title">{t('tetris.menu.title')}</h2>

            <div className="tet-menu-username">
              <span className="tet-menu-username-label">{t('username.label')}</span>
              <UsernameInput />
            </div>

            <div className="tet-mode-list">
              {MODES.map((mode) => (
                <button
                  key={mode.key}
                  className="tet-mode-button"
                  onClick={() => navigate(`/${lang}/tetris/${mode.key}`)}
                  type="button"
                >
                  <span className="tet-mode-name">{t(mode.titleKey)}</span>
                  <span className="tet-mode-summary">{t(mode.summaryKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GameFrame>
    )
  }

  return (
    <GameFrame gameName={t('tetris')} onBack={() => navigate(`/${lang}/tetris`)}>
      <div className="tet-container tet-setup">
        <div className="tet-setup-card">
          <h2 className="tet-setup-title">{t(selectedMode.titleKey)}</h2>


          <div className="tet-control-grid">
            <div className="tet-control-grid-title">{t('tetris.control.title')}</div>
            {CONTROL_ROWS.map((row) => (
              <div className="tet-control-row" key={row.labelKey}>
                <span className="tet-control-label">{t(row.labelKey)}</span>
                <span className="tet-control-value">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="tet-setup-actions">
            <button
              className="tet-start-button tet-primary-button"
              type="button"
              onClick={() => navigate(`/${lang}/tetris/${selectedMode.key}/play`)}
            >
              {t('btn.start')}
            </button>
          </div>
        </div>
      </div>
    </GameFrame>
  )
}