import type { ReactNode } from 'react'
import { useLanguage } from '../context/language'
import './ResultOverlay.css'

type ResultOverlayProps = {
  title: ReactNode
  /** Final time or score. */
  detail?: ReactNode
  tone?: 'neutral' | 'success'
  /** Waiting on the leaderboard response. */
  pending?: boolean
  rank?: number | null
  /** Anchor to the closest positioned ancestor rather than the viewport. */
  inset?: boolean
  /** Actions such as a restart button. */
  children?: ReactNode
}

export function ResultOverlay({
  title,
  detail,
  tone = 'neutral',
  pending = false,
  rank = null,
  inset = false,
  children,
}: ResultOverlayProps) {
  const { t } = useLanguage()

  const classNames = [
    'result-overlay',
    tone === 'success' ? 'result-overlay--success' : '',
    inset ? 'result-overlay--inset' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classNames} aria-live="polite">
      <div className="result-panel">
        <div className="result-title">{title}</div>
        {detail !== undefined ? <div className="result-detail">{detail}</div> : null}
        {pending ? (
          <div className="result-pending">
            <span className="spinner" aria-hidden="true" />
            <span>{t('leaderboard.calculatingPlace')}</span>
          </div>
        ) : rank !== null ? (
          <div className="result-rank">#{rank}</div>
        ) : null}
        {children ? <div className="result-actions">{children}</div> : null}
      </div>
    </div>
  )
}
