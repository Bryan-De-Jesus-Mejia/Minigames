import { useState } from 'react'
import { useLanguage } from '../context/language'
import { useUsername } from '../hooks/useUsername'
import './UsernameInput.css'

export function UsernameInput() {
  const { t } = useLanguage()
  const { username, setUsername } = useUsername()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!editing) {
    return (
      <button
        className="username-display"
        onClick={() => {
          setDraft(username)
          setEditing(true)
        }}
        title={t('username.edit')}
        type="button"
      >
        {username}
      </button>
    )
  }

  const commit = () => {
    setUsername(draft)
    setEditing(false)
  }

  return (
    <form
      className="username-form"
      onSubmit={(event) => {
        event.preventDefault()
        commit()
      }}
    >
      <input
        className="username-input"
        autoFocus
        maxLength={30}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        placeholder={t('username.placeholder')}
      />
    </form>
  )
}

/** Labelled variant used by the game menus. */
export function UsernameField() {
  const { t } = useLanguage()
  return (
    <div className="username-field">
      <span className="username-field-label">{t('username.label')}</span>
      <UsernameInput />
    </div>
  )
}
