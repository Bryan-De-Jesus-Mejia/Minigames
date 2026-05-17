import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'minigames-username'
const SYNC_EVENT = 'minigames-username-change'

export function useUsername() {
  const [username, setUsernameState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'Player',
  )

  useEffect(() => {
    const sync = () => setUsernameState(localStorage.getItem(STORAGE_KEY) ?? 'Player')
    window.addEventListener(SYNC_EVENT, sync)
    return () => window.removeEventListener(SYNC_EVENT, sync)
  }, [])

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 30) || 'Player'
    localStorage.setItem(STORAGE_KEY, trimmed)
    setUsernameState(trimmed)
    window.dispatchEvent(new Event(SYNC_EVENT))
  }, [])

  return { username, setUsername }
}
