import { useState } from 'react'
import { useUsername } from '../hooks/useUsername'

export function UsernameInput() {
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
        title="Click to change your display name"
        type="button"
      >
        {username}
      </button>
    )
  }

  return (
    <form
      className="username-form"
      onSubmit={(e) => {
        e.preventDefault()
        setUsername(draft)
        setEditing(false)
      }}
    >
      <input
        className="username-input"
        autoFocus
        maxLength={30}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setUsername(draft)
          setEditing(false)
        }}
        placeholder="Your name"
      />
    </form>
  )
}
