import { useState, useCallback } from 'react'

const STORAGE_KEY = 'minigames-username'

export function useUsername() {
  const [username, setUsernameState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'Player',
  )

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 30) || 'Player'
    localStorage.setItem(STORAGE_KEY, trimmed)
    setUsernameState(trimmed)
  }, [])

  return { username, setUsername }
}
