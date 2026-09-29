import { useState } from 'react'
import { useLanguage } from '../context/language'
import { useUsername } from '../hooks/useUsername'
import './UsernameNotice.css'

/**
 * Nudges the player to pick a name, since the API drops scores submitted under
 * the default one. Self-dismissing, so games no longer track that state.
 */
export function UsernameNotice() {
  const { t } = useLanguage()
  const { hasCustomUsername } = useUsername()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || hasCustomUsername) return null

  return (
    <div className="username-notice">
      <span>{t('username.notice')}</span>
      <button
        className="username-notice-dismiss"
        onClick={() => setDismissed(true)}
        type="button"
        aria-label={t('btn.dismiss')}
      >
        ✕
      </button>
    </div>
  )
}
